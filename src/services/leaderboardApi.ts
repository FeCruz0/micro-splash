import type { LeaderboardEntry } from "../systems/leaderboard";

const DEFAULT_API_URL = "https://micro-splash-leaderboard.felipe.workers.dev";
const REQUEST_TIMEOUT_MS = 3500;
const CACHE_KEY_PREFIX = "micro_splash_online_cache_";

let customApiUrl: string | null = null;

export function setLeaderboardApiUrl(url: string | null): void {
  customApiUrl = url;
}

export function getLeaderboardApiUrl(): string {
  if (customApiUrl) return customApiUrl;
  try {
    if (typeof import.meta !== "undefined" && import.meta.env?.VITE_LEADERBOARD_API_URL) {
      return import.meta.env.VITE_LEADERBOARD_API_URL;
    }
  } catch {}
  return DEFAULT_API_URL;
}

export interface FetchLeaderboardResult {
  success: boolean;
  data: LeaderboardEntry[];
  isOffline: boolean;
  error?: string;
}

export interface SubmitScoreResult {
  success: boolean;
  isOffline: boolean;
  error?: string;
}

function getCacheKey(type: "global" | "weekly", weekKey?: string): string {
  return `${CACHE_KEY_PREFIX}${type}_${weekKey || "main"}`;
}

export function getCachedLeaderboard(type: "global" | "weekly", weekKey?: string): LeaderboardEntry[] | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(getCacheKey(type, weekKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn("Erro ao ler cache do leaderboard:", err);
  }
  return null;
}

export function saveCachedLeaderboard(type: "global" | "weekly", entries: LeaderboardEntry[], weekKey?: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(getCacheKey(type, weekKey), JSON.stringify(entries));
  } catch (err) {
    console.warn("Erro ao salvar cache do leaderboard:", err);
  }
}

export async function fetchOnlineLeaderboard(
  type: "global" | "weekly" = "global",
  weekKey?: string
): Promise<FetchLeaderboardResult> {
  const baseUrl = getLeaderboardApiUrl();
  const query = new URLSearchParams({ type });
  if (weekKey) query.append("week", weekKey);

  const url = `${baseUrl}/api/leaderboard?${query.toString()}`;

  // Se o browser estiver explicitamente offline (navigator.onLine === false)
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const cached = getCachedLeaderboard(type, weekKey);
    return {
      success: !!cached,
      data: cached || [],
      isOffline: true,
      error: "Dispositivo desconectado da internet",
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Servidor retornou status ${res.status}`);
    }

    const payload = await res.json();
    const list: LeaderboardEntry[] = Array.isArray(payload.data) ? payload.data : [];

    saveCachedLeaderboard(type, list, weekKey);

    return {
      success: true,
      data: list,
      isOffline: false,
    };
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    const cached = getCachedLeaderboard(type, weekKey);
    return {
      success: !!cached,
      data: cached || [],
      isOffline: true,
      error: err?.name === "AbortError" ? "Tempo limite de conexão excedido" : err?.message || "Falha na conexão",
    };
  }
}

export async function submitOnlineScore(
  entry: LeaderboardEntry,
  weekKey?: string
): Promise<SubmitScoreResult> {
  const baseUrl = getLeaderboardApiUrl();
  const url = `${baseUrl}/api/leaderboard`;

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      success: false,
      isOffline: true,
      error: "Dispositivo desconectado da internet",
    };
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    const payload = {
      initials: (entry.initials || "AAA").slice(0, 3).toUpperCase(),
      score: Math.max(0, Math.floor(entry.score)),
      distance: Math.max(0, Math.floor(entry.distance)),
      mode: entry.mode,
      date: entry.date,
      weekKey: weekKey || entry.weekKey,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller?.signal,
    });

    if (timeoutId) clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Falha ao registrar pontuação: status ${res.status}`);
    }

    return {
      success: true,
      isOffline: false,
    };
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    return {
      success: false,
      isOffline: true,
      error: err?.name === "AbortError" ? "Tempo limite de envio excedido" : err?.message || "Falha de rede",
    };
  }
}

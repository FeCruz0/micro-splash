import type {
  LeaderboardEntry,
  FetchLeaderboardResult,
  SubmitScoreResult,
} from "../types/leaderboard";
import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";
import { LeaderboardEntriesArraySchema } from "../schemas/storageSchemas";

export type { FetchLeaderboardResult, SubmitScoreResult };

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

function getCacheKey(type: "global" | "weekly", weekKey?: string): string {
  return `${CACHE_KEY_PREFIX}${type}_${weekKey || "main"}`;
}

export function getCachedLeaderboard(
  type: "global" | "weekly",
  weekKey?: string
): LeaderboardEntry[] | null {
  const cacheKey = getCacheKey(type, weekKey);
  return readLocalStorageWithSchema(cacheKey, LeaderboardEntriesArraySchema.nullable(), null);
}

export function saveCachedLeaderboard(
  type: "global" | "weekly",
  entries: LeaderboardEntry[],
  weekKey?: string
): void {
  const cacheKey = getCacheKey(type, weekKey);
  writeLocalStorage(cacheKey, entries);
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
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    const cached = getCachedLeaderboard(type, weekKey);
    const error = err instanceof Error ? err : undefined;
    return {
      success: !!cached,
      data: cached || [],
      isOffline: true,
      error:
        error?.name === "AbortError"
          ? "Tempo limite de conexão excedido"
          : error?.message || "Falha na conexão",
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
  } catch (err: unknown) {
    if (timeoutId) clearTimeout(timeoutId);
    const error = err instanceof Error ? err : undefined;
    return {
      success: false,
      isOffline: true,
      error:
        error?.name === "AbortError"
          ? "Tempo limite de envio excedido"
          : error?.message || "Falha de rede",
    };
  }
}

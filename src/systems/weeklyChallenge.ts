import type { LeaderboardEntry } from "./leaderboard";

export interface WeeklyChallengeInfo {
  weekKey: string;      // ex: "2026-W39"
  weekLabel: string;    // ex: "Semana 39 / 2026"
  seed: number;         // Semente determinística para proceduralObstacles
  daysLeft: number;     // Dias restantes até a virada da semana
  expiresAt: Date;      // Momento exato da expiração (próximo domingo 23:59:59)
}

/**
 * Converte uma string de chave semanal em um hash determinístico de 32 bits
 * que serve como semente estável para o gerador de números pseudoaleatórios.
 */
export function stringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const seed = (hash >>> 0) % 900000 + 100000; // Garante número de 6 dígitos
  return seed;
}

/**
 * Calcula a semana ISO-8601 (ano e número da semana)
 */
export function getIsoWeek(date: Date = new Date()): { year: number; week: number } {
  const target = new Date(date.valueOf());
  // Dia da semana: 0 (domingo) até 6 (sábado) -> converter para 1 (segunda) até 7 (domingo)
  const dayNr = (date.getDay() + 6) % 7;
  // Ajusta para quinta-feira da mesma semana ISO
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const isoYear = new Date(firstThursday).getFullYear();
  return { year: isoYear, week: weekNumber };
}

/**
 * Retorna as informações do desafio semanal atual ou de uma data de referência.
 */
export function getWeeklyChallengeInfo(now: Date = new Date()): WeeklyChallengeInfo {
  const { year, week } = getIsoWeek(now);
  const weekPad = String(week).padStart(2, "0");
  const weekKey = `${year}-W${weekPad}`;
  const weekLabel = `Semana ${week} / ${year}`;
  const seed = stringToSeed(weekKey);

  // Calcula o próximo domingo às 23:59:59
  const expiresAt = new Date(now.valueOf());
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 para segunda, 6 para domingo
  const daysUntilSunday = 6 - dayOfWeek;
  expiresAt.setDate(now.getDate() + daysUntilSunday);
  expiresAt.setHours(23, 59, 59, 999);

  const msLeft = expiresAt.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  return {
    weekKey,
    weekLabel,
    seed,
    daysLeft,
    expiresAt,
  };
}

const DEFAULT_WEEKLY_LEADERBOARD: LeaderboardEntry[] = [
  { initials: "EXP", score: 4200, distance: 30000, mode: "weekly", date: "Semanal" },
  { initials: "ROT", score: 3800, distance: 30000, mode: "weekly", date: "Semanal" },
  { initials: "MAR", score: 3400, distance: 28000, mode: "weekly", date: "Semanal" },
  { initials: "BIO", score: 3000, distance: 25000, mode: "weekly", date: "Semanal" },
  { initials: "ECO", score: 2600, distance: 22000, mode: "weekly", date: "Semanal" },
  { initials: "OCE", score: 2200, distance: 19000, mode: "weekly", date: "Semanal" },
  { initials: "KRL", score: 1800, distance: 15000, mode: "weekly", date: "Semanal" },
  { initials: "SNT", score: 1500, distance: 12000, mode: "weekly", date: "Semanal" },
  { initials: "JUB", score: 1200, distance: 9000, mode: "weekly", date: "Semanal" },
  { initials: "POL", score: 1000, distance: 6000, mode: "weekly", date: "Semanal" },
];

function getWeeklyStorageKey(weekKey?: string): string {
  const currentKey = weekKey || getWeeklyChallengeInfo().weekKey;
  return `micro_splash_weekly_top10_${currentKey}`;
}

export function getWeeklyTop10Entries(weekKey?: string): LeaderboardEntry[] {
  try {
    if (typeof localStorage === "undefined") return [...DEFAULT_WEEKLY_LEADERBOARD];
    const key = getWeeklyStorageKey(weekKey);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [...DEFAULT_WEEKLY_LEADERBOARD];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 10);
    }
  } catch (err) {
    console.warn("Erro ao ler ranking semanal do localStorage:", err);
  }
  return [...DEFAULT_WEEKLY_LEADERBOARD];
}

export function addWeeklyLeaderboardEntry(entry: LeaderboardEntry, weekKey?: string): boolean {
  const entries = getWeeklyTop10Entries(weekKey);
  const sanitizedInitials = (entry.initials || "AAA")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "A")
    .slice(0, 3)
    .padEnd(3, "A");

  const newEntry: LeaderboardEntry = {
    initials: sanitizedInitials,
    score: Math.max(0, Math.floor(entry.score)),
    distance: Math.max(0, Math.floor(entry.distance)),
    mode: "weekly",
    date: entry.date || new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    weekKey: weekKey || getWeeklyChallengeInfo().weekKey,
  };

  entries.push(newEntry);
  entries.sort((a, b) => b.score - a.score);

  const top10 = entries.slice(0, 10);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(getWeeklyStorageKey(weekKey), JSON.stringify(top10));
    }
  } catch (err) {
    console.warn("Erro ao salvar ranking semanal no localStorage:", err);
  }

  return top10.some(
    (e) =>
      e.initials === newEntry.initials &&
      e.score === newEntry.score &&
      e.distance === newEntry.distance
  );
}

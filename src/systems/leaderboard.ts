import type { GameMode } from "./state";

export interface LeaderboardEntry {
  initials: string;
  score: number;
  distance: number;
  mode: GameMode;
  date: string;
}

const STORAGE_KEY = "micro_splash_top10";

export const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { initials: "IBJ", score: 4500, distance: 30000, mode: "standard", date: "18/09" },
  { initials: "JUB", score: 4100, distance: 30000, mode: "standard", date: "18/09" },
  { initials: "BIO", score: 3700, distance: 30000, mode: "standard", date: "18/09" },
  { initials: "ECO", score: 3300, distance: 25000, mode: "standard", date: "18/09" },
  { initials: "MAR", score: 2900, distance: 22000, mode: "standard", date: "18/09" },
  { initials: "OCE", score: 2500, distance: 19000, mode: "standard", date: "18/09" },
  { initials: "ARX", score: 2100, distance: 16000, mode: "standard", date: "18/09" },
  { initials: "POL", score: 1800, distance: 13000, mode: "standard", date: "18/09" },
  { initials: "COR", score: 1500, distance: 10000, mode: "standard", date: "18/09" },
  { initials: "KRL", score: 1200, distance: 7000, mode: "standard", date: "18/09" },
];

export function getTop10Entries(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_LEADERBOARD];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 10);
    }
  } catch (err) {
    console.warn("Erro ao ler leaderboard do localStorage:", err);
  }
  return [...DEFAULT_LEADERBOARD];
}

export function isTop10Score(score: number): boolean {
  if (score <= 0) return false;
  const entries = getTop10Entries();
  if (entries.length < 10) return true;
  return score > entries[entries.length - 1].score;
}

export function addLeaderboardEntry(entry: LeaderboardEntry): boolean {
  const entries = getTop10Entries();
  const sanitizedInitials = (entry.initials || "AAA")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "A")
    .slice(0, 3)
    .padEnd(3, "A");

  const newEntry: LeaderboardEntry = {
    initials: sanitizedInitials,
    score: Math.max(0, Math.floor(entry.score)),
    distance: Math.max(0, Math.floor(entry.distance)),
    mode: entry.mode || "standard",
    date: entry.date || new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
  };

  entries.push(newEntry);
  entries.sort((a, b) => b.score - a.score);

  const top10 = entries.slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(top10));
  } catch (err) {
    console.warn("Erro ao salvar leaderboard no localStorage:", err);
  }

  return top10.some(
    (e) =>
      e.initials === newEntry.initials &&
      e.score === newEntry.score &&
      e.distance === newEntry.distance
  );
}

export function resetLeaderboard(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
  } catch {}
}

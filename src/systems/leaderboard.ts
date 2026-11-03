import { submitOnlineScore } from "../services/leaderboardApi";
import { addWeeklyLeaderboardEntry } from "./weeklyChallenge";
import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";
import { LeaderboardEntriesArraySchema } from "../schemas/storageSchemas";
import { reportWarning } from "../utils/errorReporter";
import { type LeaderboardEntry, DEFAULT_LEADERBOARD } from "../types/leaderboard";

export type { LeaderboardEntry };
export { DEFAULT_LEADERBOARD };

const STORAGE_KEY = "micro_splash_top10";

export function getTop10Entries(): LeaderboardEntry[] {
  const entries = readLocalStorageWithSchema(
    STORAGE_KEY,
    LeaderboardEntriesArraySchema,
    DEFAULT_LEADERBOARD
  );
  return entries.length > 0 ? entries.slice(0, 10) : [...DEFAULT_LEADERBOARD];
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
    date:
      entry.date || new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    weekKey: entry.weekKey,
  };

  // Se for modo semanal, insere também no leaderboard semanal dedicado
  if (newEntry.mode === "weekly") {
    addWeeklyLeaderboardEntry(newEntry, entry.weekKey);
  }

  entries.push(newEntry);
  entries.sort((a, b) => b.score - a.score);

  const top10 = entries.slice(0, 10);
  writeLocalStorage(STORAGE_KEY, top10);

  // Tenta submeter em segundo plano ao backend Cloudflare Worker (não bloqueia UI)
  try {
    submitOnlineScore(newEntry, entry.weekKey).catch((error) => {
      reportWarning("Falha silenciosa ao sincronizar pontuação online:", undefined, error);
    });
  } catch {}

  return top10.some(
    (e) =>
      e.initials === newEntry.initials &&
      e.score === newEntry.score &&
      e.distance === newEntry.distance
  );
}

export function resetLeaderboard(): void {
  writeLocalStorage(STORAGE_KEY, DEFAULT_LEADERBOARD);
}

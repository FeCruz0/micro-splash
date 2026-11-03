import type { GameMode } from "../systems/state";

export interface LeaderboardEntry {
  initials: string;
  score: number;
  distance: number;
  mode: GameMode;
  date: string;
  weekKey?: string;
}

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

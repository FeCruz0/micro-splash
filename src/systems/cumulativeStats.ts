export interface CumulativeStats {
  totalMigrationsAttempted: number;
  totalMigrationsCompleted: number;
  totalDistanceMeters: number;
  totalKrillCollected: number;
  totalTrashAvoided: number;
  totalPlayTimeSeconds: number;
  quizzesTaken: number;
  quizCorrectAnswers: number;
}

export const STATS_STORAGE_KEY = "micro_splash_cumulative_stats";

export const DEFAULT_CUMULATIVE_STATS: CumulativeStats = {
  totalMigrationsAttempted: 0,
  totalMigrationsCompleted: 0,
  totalDistanceMeters: 0,
  totalKrillCollected: 0,
  totalTrashAvoided: 0,
  totalPlayTimeSeconds: 0,
  quizzesTaken: 0,
  quizCorrectAnswers: 0,
};

export function getCumulativeStats(): CumulativeStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CUMULATIVE_STATS };
    const parsed = JSON.parse(raw);
    return {
      totalMigrationsAttempted: Number(parsed.totalMigrationsAttempted) || 0,
      totalMigrationsCompleted: Number(parsed.totalMigrationsCompleted) || 0,
      totalDistanceMeters: Number(parsed.totalDistanceMeters) || 0,
      totalKrillCollected: Number(parsed.totalKrillCollected) || 0,
      totalTrashAvoided: Number(parsed.totalTrashAvoided) || 0,
      totalPlayTimeSeconds: Number(parsed.totalPlayTimeSeconds) || 0,
      quizzesTaken: Number(parsed.quizzesTaken) || 0,
      quizCorrectAnswers: Number(parsed.quizCorrectAnswers) || 0,
    };
  } catch {
    return { ...DEFAULT_CUMULATIVE_STATS };
  }
}

export function saveCumulativeStats(stats: CumulativeStats): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function recordMigrationStart(): CumulativeStats {
  const stats = getCumulativeStats();
  stats.totalMigrationsAttempted += 1;
  saveCumulativeStats(stats);
  return stats;
}

export function recordMigrationEnd(
  distance: number,
  krill: number,
  trash: number,
  playTimeSeconds: number,
  isCompleted: boolean
): CumulativeStats {
  const stats = getCumulativeStats();
  stats.totalDistanceMeters += Math.max(0, Math.floor(distance));
  stats.totalKrillCollected += Math.max(0, krill);
  stats.totalTrashAvoided += Math.max(0, trash);
  stats.totalPlayTimeSeconds += Math.max(0, Math.floor(playTimeSeconds));
  if (isCompleted) {
    stats.totalMigrationsCompleted += 1;
  }
  saveCumulativeStats(stats);
  return stats;
}

export function recordQuizResult(correctCount: number): CumulativeStats {
  const stats = getCumulativeStats();
  stats.quizzesTaken += 1;
  stats.quizCorrectAnswers += Math.max(0, correctCount);
  saveCumulativeStats(stats);
  return stats;
}

export function resetCumulativeStats(): void {
  try {
    localStorage.removeItem(STATS_STORAGE_KEY);
  } catch {}
}

export function formatDistanceKm(meters: number): string {
  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

export function formatPlayTime(seconds: number): string {
  const totalSec = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatSuccessRate(completed: number, attempted: number): string {
  if (attempted <= 0) return "0%";
  const rate = Math.min(100, Math.round((completed / attempted) * 100));
  return `${rate}%`;
}

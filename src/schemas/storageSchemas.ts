import { z } from "zod";

/**
 * Strict Zod Schemas for local persistence (localStorage) in Micro Splash.
 * Guarantees schema validation and runtime integrity across sessions.
 */

// 1. Highscore Schema
export const HighscoreSchema = z.coerce.number().int().nonnegative();
export type StoredHighscore = z.infer<typeof HighscoreSchema>;

// 2. Cumulative Stats Schema
export const CumulativeStatsSchema = z.object({
  totalMigrationsAttempted: z.number().int().nonnegative().default(0),
  totalMigrationsCompleted: z.number().int().nonnegative().default(0),
  totalDistanceMeters: z.number().nonnegative().default(0),
  totalKrillCollected: z.number().int().nonnegative().default(0),
  totalTrashAvoided: z.number().int().nonnegative().default(0),
  totalPlayTimeSeconds: z.number().nonnegative().default(0),
  quizzesTaken: z.number().int().nonnegative().default(0),
  quizCorrectAnswers: z.number().int().nonnegative().default(0),
});
export type StoredCumulativeStats = z.infer<typeof CumulativeStatsSchema>;

// 3. Accessibility Settings Schemas
export const ColorModeSchema = z.enum(["normal", "protanopia", "deuteranopia", "high_contrast"]);
export const ReducedMotionModeSchema = z.enum(["auto", "reduced", "full"]);
export const FontScaleKeySchema = z.enum(["small", "normal", "large"]);

export const AccessibilitySettingsSchema = z.object({
  colorMode: ColorModeSchema.default("normal"),
  reducedMotion: ReducedMotionModeSchema.default("auto"),
  fontScale: FontScaleKeySchema.default("normal"),
});
export type StoredAccessibilitySettings = z.infer<typeof AccessibilitySettingsSchema>;

// 4. Haptics Feedback Schema
export const HapticsEnabledSchema = z.boolean();
export type StoredHapticsEnabled = z.infer<typeof HapticsEnabledSchema>;

// 5. Audio Settings Schema
export const SoundtrackModeSchema = z.enum(["chiptune", "ambient", "sfx_only"]);
export const AudioSettingsSchema = z.object({
  volume: z.number().min(0).max(1).default(0.7),
  musicEnabled: z.boolean().default(true),
  sfxEnabled: z.boolean().default(true),
  soundtrackMode: SoundtrackModeSchema.default("chiptune"),
});
export type StoredAudioSettings = z.infer<typeof AudioSettingsSchema>;

// 6. Game Mode & Leaderboard Schemas
export const GameModeSchema = z.enum(["standard", "serene", "quick_challenge", "weekly"]);
export const LeaderboardEntrySchema = z.object({
  initials: z.string().min(1).max(3),
  score: z.number().int().nonnegative(),
  distance: z.number().nonnegative(),
  mode: GameModeSchema,
  date: z.string(),
  weekKey: z.string().optional(),
});
export const LeaderboardEntriesArraySchema = z.array(LeaderboardEntrySchema);
export type StoredLeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

// 7. Unlocked Facts (Codex) Schema
export const UnlockedFactsArraySchema = z.array(z.string());
export type StoredUnlockedFacts = z.infer<typeof UnlockedFactsArraySchema>;

// 8. Display & Configuration Schemas
export const ResolutionKeySchema = z.string().min(1);
export const DisplayModeSchema = z.enum(["stretch", "letterbox", "pixel_perfect"]);
export const LetterboxColorSchema = z.enum(["black", "ocean_deep", "navy"]);
export const TouchControlsModeSchema = z.enum(["auto", "always_on", "disabled"]);
export const SupportedLocaleSchema = z.enum(["pt-BR", "en-US", "es-ES"]);

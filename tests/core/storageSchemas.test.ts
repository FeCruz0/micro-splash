import { describe, it, expect } from "vitest";
import {
  HighscoreSchema,
  CumulativeStatsSchema,
  ColorModeSchema,
  ReducedMotionModeSchema,
  FontScaleKeySchema,
  AccessibilitySettingsSchema,
  HapticsEnabledSchema,
  AudioSettingsSchema,
  GameModeSchema,
  LeaderboardEntrySchema,
  LeaderboardEntriesArraySchema,
  UnlockedFactsArraySchema,
  DisplayModeSchema,
  LetterboxColorSchema,
  TouchControlsModeSchema,
  SupportedLocaleSchema,
} from "../../src/schemas/storageSchemas";

describe("Validação de Schemas de Persistência Zod (Fase 37.5 / Etapa 2.1)", () => {
  describe("HighscoreSchema", () => {
    it("valida inteiros não-negativos e coerção de strings numéricas", () => {
      expect(HighscoreSchema.parse(5000)).toBe(5000);
      expect(HighscoreSchema.parse("12500")).toBe(12500);
      expect(HighscoreSchema.parse(0)).toBe(0);
    });

    it("rejeita valores negativos ou não-numéricos", () => {
      expect(HighscoreSchema.safeParse(-10).success).toBe(false);
      expect(HighscoreSchema.safeParse("invalido").success).toBe(false);
    });
  });

  describe("CumulativeStatsSchema", () => {
    it("valida objeto completo de estatísticas cumulativas", () => {
      const stats = {
        totalMigrationsAttempted: 10,
        totalMigrationsCompleted: 7,
        totalDistanceMeters: 210000,
        totalKrillCollected: 350,
        totalTrashAvoided: 120,
        totalPlayTimeSeconds: 3600,
        quizzesTaken: 15,
        quizCorrectAnswers: 12,
      };
      const result = CumulativeStatsSchema.safeParse(stats);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalMigrationsCompleted).toBe(7);
      }
    });

    it("aplica defaults para campos omitidos", () => {
      const result = CumulativeStatsSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalMigrationsAttempted).toBe(0);
        expect(result.data.totalDistanceMeters).toBe(0);
      }
    });

    it("rejeita estatísticas com valores negativos", () => {
      expect(CumulativeStatsSchema.safeParse({ totalMigrationsAttempted: -1 }).success).toBe(false);
    });
  });

  describe("AccessibilitySettingsSchema", () => {
    it("valida modos de cor, movimento reduzido e escala de fonte", () => {
      expect(ColorModeSchema.safeParse("protanopia").success).toBe(true);
      expect(ColorModeSchema.safeParse("invalido").success).toBe(false);

      expect(ReducedMotionModeSchema.safeParse("reduced").success).toBe(true);
      expect(ReducedMotionModeSchema.safeParse("invalid").success).toBe(false);

      expect(FontScaleKeySchema.safeParse("large").success).toBe(true);
      expect(FontScaleKeySchema.safeParse("huge").success).toBe(false);

      const parsed = AccessibilitySettingsSchema.safeParse({
        colorMode: "high_contrast",
        reducedMotion: "full",
        fontScale: "small",
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("HapticsEnabledSchema", () => {
    it("valida valores booleanos", () => {
      expect(HapticsEnabledSchema.safeParse(true).success).toBe(true);
      expect(HapticsEnabledSchema.safeParse(false).success).toBe(true);
      expect(HapticsEnabledSchema.safeParse("true").success).toBe(false);
    });
  });

  describe("AudioSettingsSchema", () => {
    it("valida configurações de áudio com volume entre 0 e 1", () => {
      const valid = {
        volume: 0.8,
        musicEnabled: true,
        sfxEnabled: false,
        soundtrackMode: "ambient",
      };
      expect(AudioSettingsSchema.safeParse(valid).success).toBe(true);
    });

    it("rejeita volume fora do intervalo [0, 1] ou modos de trilha inválidos", () => {
      expect(AudioSettingsSchema.safeParse({ volume: 1.5 }).success).toBe(false);
      expect(AudioSettingsSchema.safeParse({ volume: -0.2 }).success).toBe(false);
      expect(AudioSettingsSchema.safeParse({ soundtrackMode: "metal" }).success).toBe(false);
    });
  });

  describe("LeaderboardEntrySchema & LeaderboardEntriesArraySchema", () => {
    it("valida modos de jogo suportados via GameModeSchema", () => {
      expect(GameModeSchema.safeParse("standard").success).toBe(true);
      expect(GameModeSchema.safeParse("serene").success).toBe(true);
      expect(GameModeSchema.safeParse("quick_challenge").success).toBe(true);
      expect(GameModeSchema.safeParse("weekly").success).toBe(true);
      expect(GameModeSchema.safeParse("invalido").success).toBe(false);
    });

    it("valida entrada de ranking com iniciais sanitizadas e modos suportados", () => {
      const entry = {
        initials: "JUB",
        score: 4500,
        distance: 30000,
        mode: "standard",
        date: "13/10",
        weekKey: "2026-W42",
      };
      expect(LeaderboardEntrySchema.safeParse(entry).success).toBe(true);
      expect(LeaderboardEntriesArraySchema.safeParse([entry]).success).toBe(true);
    });

    it("rejeita iniciais com mais de 3 caracteres ou pontuações negativas", () => {
      expect(
        LeaderboardEntrySchema.safeParse({
          initials: "TOOLONG",
          score: 100,
          distance: 1000,
          mode: "standard",
          date: "13/10",
        }).success
      ).toBe(false);

      expect(
        LeaderboardEntrySchema.safeParse({
          initials: "JUB",
          score: -50,
          distance: 1000,
          mode: "standard",
          date: "13/10",
        }).success
      ).toBe(false);
    });
  });

  describe("Display, Touch & Locale Schemas", () => {
    it("valida opções de exibição, controles e locales suportados", () => {
      expect(DisplayModeSchema.safeParse("letterbox").success).toBe(true);
      expect(LetterboxColorSchema.safeParse("ocean_deep").success).toBe(true);
      expect(TouchControlsModeSchema.safeParse("auto").success).toBe(true);
      expect(SupportedLocaleSchema.safeParse("pt-BR").success).toBe(true);
      expect(SupportedLocaleSchema.safeParse("fr-FR").success).toBe(false);
      expect(UnlockedFactsArraySchema.safeParse(["fact1", "fact2"]).success).toBe(true);
    });
  });
});

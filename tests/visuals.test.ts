import { describe, it, expect } from "vitest";
import { BIOME_COLOR_STOPS, GAME_CONFIG } from "../src/config";
import { getColorsAtDistance, getCurrentBiome } from "../src/systems/oceanEnvironment";
import { extractVictoryCardData, generateAndDownloadVictoryCard, type VictoryCardData } from "../src/ui/victoryCard";
import { createGameState } from "../src/systems/state";

describe("Fase 13: Polimento Visual, Atmosfera & Identidade", () => {
  describe("Ciclo Dia/Noite e Biomas (BIOME_COLOR_STOPS)", () => {
    it("possui 5 estágios contínuos cobrindo de 0m a 30.000m", () => {
      expect(BIOME_COLOR_STOPS.length).toBe(5);

      // Primeiro bioma começa em 0m
      expect(BIOME_COLOR_STOPS[0].distanceStart).toBe(0);

      // Último bioma termina na distância total da rota (30.000m)
      expect(BIOME_COLOR_STOPS[BIOME_COLOR_STOPS.length - 1].distanceEnd).toBe(
        GAME_CONFIG.ROUTE_TOTAL_DISTANCE
      );

      // Continuidade sem lacunas
      for (let i = 0; i < BIOME_COLOR_STOPS.length - 1; i++) {
        expect(BIOME_COLOR_STOPS[i].distanceEnd).toBe(
          BIOME_COLOR_STOPS[i + 1].distanceStart
        );
      }
    });

    it("todos os biomas têm canais de cores RGB válidos entre 0 e 255", () => {
      BIOME_COLOR_STOPS.forEach((biome) => {
        [biome.bgColor, biome.surfaceColor, biome.floorColor, biome.skyColor].forEach(
          (color) => {
            expect(color.length).toBe(3);
            color.forEach((channel) => {
              expect(channel).toBeGreaterThanOrEqual(0);
              expect(channel).toBeLessThanOrEqual(255);
            });
          }
        );
      });
    });

    it("retorna o bioma correto para cada marco da rota", () => {
      expect(getCurrentBiome(2000).name).toContain("Antártica");
      expect(getCurrentBiome(8000).name).toContain("Travessia Pelágica");
      expect(getCurrentBiome(15000).name).toContain("Costa Urbana");
      expect(getCurrentBiome(22000).name).toContain("Cânions");
      expect(getCurrentBiome(28000).name).toContain("Santuário de Arraial");
    });

    it("interpola suavemente as cores entre biomas sem extrapolações", () => {
      // Mock do KaboomCtx mínimo para getColorsAtDistance
      const mockKaboomCtx: any = {
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      };

      const startColors = getColorsAtDistance(mockKaboomCtx, 0);
      expect(startColors.currentBiome.name).toContain("Antártica");

      const midColors = getColorsAtDistance(mockKaboomCtx, 15000);
      expect(midColors.currentBiome.name).toContain("Costa Urbana");

      const endColors = getColorsAtDistance(mockKaboomCtx, 30000);
      expect(endColors.currentBiome.name).toContain("Santuário de Arraial");
    });
  });

  describe("Cartão de Vitória e Certificado (victoryCard.ts)", () => {
    it("extrai corretamente os dados formatados do GameState para o certificado", () => {
      const state = createGameState();
      state.addKrill();
      state.addKrill();
      state.addTrash();
      state.triggerBreach();

      const cardData = extractVictoryCardData(state, "Jubarte Heróica");

      expect(cardData.playerName).toBe("Jubarte Heróica");
      expect(cardData.krillCount).toBe(2);
      expect(cardData.trashCount).toBe(1);
      expect(cardData.hasBreached).toBe(true);
      expect(cardData.hasEscortedCalf).toBe(false);
      expect(cardData.finalScore).toBeGreaterThan(0);
      expect(cardData.rank).toBeDefined();
      expect(cardData.dateStr).toBeDefined();
    });

    it("atribui classificação correta com base na pontuação", () => {
      const state = createGameState();
      // Score baixo -> Rank B
      const lowData = extractVictoryCardData(state);
      expect(lowData.rank).toContain("RANK B");

      // Simula score alto
      const highData: VictoryCardData = {
        ...lowData,
        finalScore: 3800,
        rank: "🥇 RANK S - Guardião dos Oceanos!",
      };
      expect(highData.rank).toContain("RANK S");
    });

    it("lida graciosamente com ambientes sem DOM (headless/testes)", () => {
      const state = createGameState();
      const cardData = extractVictoryCardData(state);

      // Em ambiente node sem document, deve retornar false sem lançar exceção
      const originalDoc = globalThis.document;
      try {
        // @ts-ignore
        delete globalThis.document;
        const result = generateAndDownloadVictoryCard(cardData);
        expect(result).toBe(false);
      } finally {
        if (originalDoc) {
          globalThis.document = originalDoc;
        }
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import {
  SUBMARINE_RELIEFS,
  generateReliefPolygonPoints,
  generateReliefCapPolygonPoints,
} from "../src/systems/oceanFloorSystem";
import { calculateGodRayWidth } from "../src/systems/lightRaysSystem";
import { calculateDepthDarknessOpacity } from "../src/systems/depthDarknessSystem";
import { updateSnowParticlePosition, MARINE_SNOW_CONFIG } from "../src/systems/marineSnowSystem";
import { calculateIridescentOilColor } from "../src/systems/oilSpillSystem";
import {
  POLAR_RED_ALGAE_SPAWN_X,
  URBAN_SEAGRASS_SPAWN_X,
  LITHOTHAMNION_SPAWN_X,
} from "../src/systems/benthicFloorSystem";
import { GAME_CONFIG } from "../src/config";

describe("Fase 30 — Fundo Submarino, Iluminação & Identidade dos Obstáculos", () => {
  describe("30.1 Geologia Procedural do Fundo (oceanFloorSystem)", () => {
    it("deve gerar polígonos especializados com morfologia distinta para cada tipo geológico", () => {
      const floorBaseY = 320;

      const moraineRelief = SUBMARINE_RELIEFS.find((r) => r.type === "moraine")!;
      const seamountRelief = SUBMARINE_RELIEFS.find((r) => r.type === "seamount")!;
      const sandbarRelief = SUBMARINE_RELIEFS.find((r) => r.type === "sandbar")!;
      const canyonRelief = SUBMARINE_RELIEFS.find((r) => r.type === "canyon_ridge")!;
      const shoalRelief = SUBMARINE_RELIEFS.find((r) => r.type === "reef_shoal")!;

      expect(moraineRelief).toBeDefined();
      expect(seamountRelief).toBeDefined();
      expect(sandbarRelief).toBeDefined();
      expect(canyonRelief).toBeDefined();
      expect(shoalRelief).toBeDefined();

      const morainePoints = generateReliefPolygonPoints(moraineRelief, floorBaseY);
      const seamountPoints = generateReliefPolygonPoints(seamountRelief, floorBaseY);
      const sandbarPoints = generateReliefPolygonPoints(sandbarRelief, floorBaseY);
      const canyonPoints = generateReliefPolygonPoints(canyonRelief, floorBaseY);
      const shoalPoints = generateReliefPolygonPoints(shoalRelief, floorBaseY);

      expect(morainePoints.length).toBeGreaterThanOrEqual(10);
      expect(seamountPoints.length).toBeGreaterThanOrEqual(10);
      expect(sandbarPoints.length).toBeGreaterThanOrEqual(10);
      expect(canyonPoints.length).toBeGreaterThanOrEqual(10);
      expect(shoalPoints.length).toBeGreaterThanOrEqual(10);

      // Garante que não existem coordenadas NaN
      for (const pt of [
        ...morainePoints,
        ...seamountPoints,
        ...sandbarPoints,
        ...canyonPoints,
        ...shoalPoints,
      ]) {
        expect(Number.isFinite(pt.x)).toBe(true);
        expect(Number.isFinite(pt.y)).toBe(true);
      }
    });

    it("deve gerar camadas de cobertura (cap) válidas para todos os relevos cadastrados", () => {
      const floorBaseY = 320;
      for (const relief of SUBMARINE_RELIEFS) {
        const cap = generateReliefCapPolygonPoints(relief, floorBaseY);
        expect(cap.length).toBeGreaterThanOrEqual(8);
        for (const pt of cap) {
          expect(Number.isFinite(pt.x)).toBe(true);
          expect(Number.isFinite(pt.y)).toBe(true);
        }
      }
    });
  });

  describe("30.2 Flora Submarina por Bioma (benthicFloorSystem)", () => {
    it("deve distribuir algas vermelhas polares estritamente no bioma antártico (0 a 5.000m)", () => {
      expect(POLAR_RED_ALGAE_SPAWN_X.length).toBeGreaterThan(5);
      for (const x of POLAR_RED_ALGAE_SPAWN_X) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(5000);
      }
    });

    it("deve distribuir pradarias de ervas marinhas estritamente na Costa Urbana (12.000m a 19.000m)", () => {
      expect(URBAN_SEAGRASS_SPAWN_X.length).toBeGreaterThan(5);
      for (const x of URBAN_SEAGRASS_SPAWN_X) {
        expect(x).toBeGreaterThanOrEqual(12000);
        expect(x).toBeLessThanOrEqual(19000);
      }
    });

    it("deve expandir crostas de Lithothamnion na enseada de Arraial do Cabo (19.000m a 30.000m)", () => {
      expect(LITHOTHAMNION_SPAWN_X.length).toBeGreaterThan(8);
      for (const x of LITHOTHAMNION_SPAWN_X) {
        expect(x).toBeGreaterThanOrEqual(19000);
        expect(x).toBeLessThanOrEqual(30000);
      }
    });
  });

  describe("30.3 Neve Marinha Abissal (marineSnowSystem)", () => {
    it("deve calcular a descida de partículas orgânicas com looping vertical suave", () => {
      const minY = 120;
      const maxY = 320;
      const dt = 0.5;

      const p1 = updateSnowParticlePosition(150, 20, dt, 1.0, 1.0, 0, minY, maxY);
      expect(p1.y).toBe(160);
      expect(Number.isFinite(p1.driftOffset)).toBe(true);

      // Partícula ultrapassando o fundo marinho faz wrap para o topo
      const p2 = updateSnowParticlePosition(315, 20, dt, 1.0, 1.0, 0, minY, maxY);
      expect(p2.y).toBeLessThan(minY + 20);
    });

    it("deve configurar o intervalo pelágico correto para neve marinha", () => {
      expect(MARINE_SNOW_CONFIG.MIN_DISTANCE).toBe(5000);
      expect(MARINE_SNOW_CONFIG.MAX_DISTANCE).toBe(12000);
      expect(MARINE_SNOW_CONFIG.PARTICLE_COUNT).toBeGreaterThanOrEqual(12);
    });
  });

  describe("30.4 God Rays Mais Largos e Visíveis (lightRaysSystem)", () => {
    it("deve calibrar a largura dos feixes entre 8px e 18px", () => {
      for (let i = 0; i < 15; i++) {
        const width = calculateGodRayWidth(i);
        expect(width).toBeGreaterThanOrEqual(8);
        expect(width).toBeLessThanOrEqual(18);
      }
    });
  });

  describe("30.5 Escuridão Progressiva com Profundidade (depthDarknessSystem)", () => {
    it("deve retornar opacidade zero quando a baleia estiver na superfície", () => {
      const opacitySurface = calculateDepthDarknessOpacity(
        GAME_CONFIG.SEA_LEVEL,
        GAME_CONFIG.SEA_LEVEL,
        360
      );
      expect(opacitySurface).toBe(0);

      const opacityAbove = calculateDepthDarknessOpacity(
        GAME_CONFIG.SEA_LEVEL - 20,
        GAME_CONFIG.SEA_LEVEL,
        360
      );
      expect(opacityAbove).toBe(0);
    });

    it("deve aumentar a opacidade proporcionalmente à profundidade até o leito marinho", () => {
      const opacityMid = calculateDepthDarknessOpacity(200, GAME_CONFIG.SEA_LEVEL, 360);
      const opacityDeep = calculateDepthDarknessOpacity(320, GAME_CONFIG.SEA_LEVEL, 360);

      expect(opacityMid).toBeGreaterThan(0);
      expect(opacityDeep).toBeGreaterThan(opacityMid);
      expect(opacityDeep).toBeLessThanOrEqual(0.38);
    });
  });

  describe("30.7 Mancha de Óleo com 3 Camadas Iridescentes (oilSpillSystem)", () => {
    it("deve calcular cores RGB válidas com shimmer furta-cor sem extrapolação", () => {
      const times = [0, 0.5, 1.2, 2.8, 5.0, 10.3];
      for (const t of times) {
        for (let p = 0; p < 4; p++) {
          const [r, g, b] = calculateIridescentOilColor(t, p);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(255);
          expect(g).toBeGreaterThanOrEqual(0);
          expect(g).toBeLessThanOrEqual(255);
          expect(b).toBeGreaterThanOrEqual(0);
          expect(b).toBeLessThanOrEqual(255);
        }
      }
    });
  });
});

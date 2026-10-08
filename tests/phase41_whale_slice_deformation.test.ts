import { describe, it, expect } from "vitest";
import {
  calculateWhaleSliceTransforms,
  type WhaleSliceComputationParameters,
} from "../src/entities/player/playerSliceRenderer";

function createDefaultParameters(
  partial: Partial<WhaleSliceComputationParameters> = {}
): WhaleSliceComputationParameters {
  return {
    spineCurvatureInDegrees: 0,
    pitchFlexionInDegrees: 0,
    pitchAngularVelocity: 0,
    strokeProgress: 0,
    isMuscularStroke: false,
    timeInSeconds: 0,
    horizontalSpeed: 0,
    idleBlendFactor: 0,
    isFacingRight: true,
    ...partial,
  };
}

describe("Fase 41: Deformação da Coluna por Fatiamento Segmentado (Vertical Slice Ribbon)", () => {
  describe("41.1 Mapeamento e Proporções Anatômicas das Fatias", () => {
    it("gera exatamente 4 fatias anatômicas contínuas ordenadas da cabeça à cauda", () => {
      const slices = calculateWhaleSliceTransforms(createDefaultParameters());

      expect(slices).toHaveLength(4);
      expect(slices[0].name).toBe("head");
      expect(slices[1].name).toBe("thorax");
      expect(slices[2].name).toBe("peduncle");
      expect(slices[3].name).toBe("flukes");

      // Cada fatia possui 25% (32px de 128px) de largura normalizada
      slices.forEach((slice) => {
        expect(slice.sourceNormalizedRect.width).toBeCloseTo(0.25, 3);
        expect(slice.sourceNormalizedRect.height).toBe(1.0);
      });

      // A soma das larguras cobre 100% da textura
      const totalNormalizedWidth = slices.reduce(
        (sum, slice) => sum + slice.sourceNormalizedRect.width,
        0
      );
      expect(totalNormalizedWidth).toBeCloseTo(1.0, 3);
    });

    it("mantém a cabeça estritamente rígida e imune a deformações da cauda", () => {
      const slicesWithCurvature = calculateWhaleSliceTransforms(
        createDefaultParameters({
          spineCurvatureInDegrees: 25,
          isMuscularStroke: true,
          strokeProgress: 0.25,
        })
      );

      const headSlice = slicesWithCurvature[0];
      expect(headSlice.localOffset.y).toBe(0);
      expect(headSlice.relativeAngleInDegrees).toBe(0);
      expect(headSlice.scaleFactor.x).toBe(1.0);
      expect(headSlice.scaleFactor.y).toBe(1.0);
    });

    it("aplica gradiente progressivo de curvatura da cabeça aos flukes", () => {
      const spineCurvature = 20;
      const slices = calculateWhaleSliceTransforms(
        createDefaultParameters({
          spineCurvatureInDegrees: spineCurvature,
        })
      );

      // Flexão vertical deve aumentar progressivamente em direção à cauda
      const headOffsetY = Math.abs(slices[0].localOffset.y);
      const thoraxOffsetY = Math.abs(slices[1].localOffset.y);
      const peduncleOffsetY = Math.abs(slices[2].localOffset.y);
      const flukesOffsetY = Math.abs(slices[3].localOffset.y);

      expect(headOffsetY).toBe(0);
      expect(thoraxOffsetY).toBeGreaterThan(headOffsetY);
      expect(peduncleOffsetY).toBeGreaterThan(thoraxOffsetY);
      expect(flukesOffsetY).toBeGreaterThan(peduncleOffsetY);
    });
  });

  describe("41.2 Equação de Onda Viajante de Propulsão (Traveling Wave Dynamics)", () => {
    it("propaga onda senoidal com atraso de fase da frente para trás durante batida muscular", () => {
      // No ápice inicial (strokeProgress = 0.25), sin(0.25 * 2PI) = 1.0 (máximo no tórax sem atraso)
      const slicesApex = calculateWhaleSliceTransforms(
        createDefaultParameters({
          isMuscularStroke: true,
          strokeProgress: 0.25,
        })
      );

      const thoraxOffset = slicesApex[1].localOffset.y;
      const flukesOffset = slicesApex[3].localOffset.y;

      // Devido à defasagem de fase de ~77° nos flukes, o pico da cauda não coincide perfeitamente com o tórax
      expect(Math.abs(thoraxOffset)).toBeGreaterThan(0);
      expect(Math.abs(flukesOffset)).toBeGreaterThan(0);
    });

    it("amplifica a excursão dos flukes em esforço muscular em relação ao planeio", () => {
      const muscularSlices = calculateWhaleSliceTransforms(
        createDefaultParameters({
          isMuscularStroke: true,
          strokeProgress: 0.25,
        })
      );

      const glideSlices = calculateWhaleSliceTransforms(
        createDefaultParameters({
          isMuscularStroke: false,
          horizontalSpeed: 80,
          timeInSeconds: 0.5,
        })
      );

      const muscularFlukesDisplacement = Math.abs(muscularSlices[3].localOffset.y);
      const glideFlukesDisplacement = Math.abs(glideSlices[3].localOffset.y);

      expect(muscularFlukesDisplacement).toBeGreaterThan(glideFlukesDisplacement);
    });

    it("em repouso marinho (idleBlend = 1), gera ondulação calma de maré", () => {
      const idleSlices = calculateWhaleSliceTransforms(
        createDefaultParameters({
          horizontalSpeed: 0,
          idleBlendFactor: 1.0,
          timeInSeconds: 1.0,
        })
      );

      // Flukes devem oscilar suavemente (< 2.5px) no repouso
      const idleFlukesOffset = Math.abs(idleSlices[3].localOffset.y);
      expect(idleFlukesOffset).toBeGreaterThan(0);
      expect(idleFlukesOffset).toBeLessThan(2.5);
    });
  });

  describe("41.3 Inversão e Orientação Horizontal", () => {
    it("inverte os centros horizontais e ângulos relativos quando virada para a esquerda", () => {
      const rightFacingSlices = calculateWhaleSliceTransforms(
        createDefaultParameters({
          isFacingRight: true,
          spineCurvatureInDegrees: 15,
        })
      );

      const leftFacingSlices = calculateWhaleSliceTransforms(
        createDefaultParameters({
          isFacingRight: false,
          spineCurvatureInDegrees: 15,
        })
      );

      for (let i = 0; i < 4; i++) {
        expect(leftFacingSlices[i].localOffset.x).toBe(-rightFacingSlices[i].localOffset.x);
        expect(leftFacingSlices[i].relativeAngleInDegrees).toBe(
          -rightFacingSlices[i].relativeAngleInDegrees
        );
      }
    });
  });
});

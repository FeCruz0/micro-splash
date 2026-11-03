import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateWhaleSliceTransforms,
  type WhaleSliceData,
  type WhaleSliceComputationParameters,
} from "../../src/entities/player/playerSliceRenderer";
import { ParticlePool } from "../../src/systems/particlePool";
import {
  isOceanColorDirty,
  updateOceanColors,
  resetOceanColorsCache,
} from "../../src/systems/oceanEnvironment";
import { calculateFrameTimeMetrics } from "../../src/ui/debugDistance";
import { SpatialCullingManager } from "../../src/systems/spatialCullingSystem";

describe("Fase 53: Otimização Extrema de Frame Time & Zero Frame Drops", () => {
  beforeEach(() => {
    resetOceanColorsCache();
  });

  describe("7.1 Reutilização de Buffers em playerSliceRenderer", () => {
    const baseParams: WhaleSliceComputationParameters = {
      spineCurvatureInDegrees: 0,
      pitchFlexionInDegrees: 0,
      pitchAngularVelocity: 0,
      strokeProgress: 0,
      isMuscularStroke: false,
      timeInSeconds: 1.0,
      horizontalSpeed: 80,
      idleBlendFactor: 0,
      isFacingRight: true,
      isReducedMotion: false,
    };

    it("mutates existing targetBuffer in-place without reallocating arrays", () => {
      const buffer: WhaleSliceData[] = [];
      const slices1 = calculateWhaleSliceTransforms(baseParams, buffer);

      expect(slices1).toBe(buffer);
      expect(slices1.length).toBe(4);

      const headSliceRef = slices1[0];

      // Segunda chamada com nova ondulação deve mutar os mesmos objetos em targetBuffer
      const newParams = { ...baseParams, timeInSeconds: 2.0, spineCurvatureInDegrees: 15 };
      const slices2 = calculateWhaleSliceTransforms(newParams, buffer);

      expect(slices2).toBe(buffer);
      expect(slices2[0]).toBe(headSliceRef);
      expect(slices2[0].localOffset).toBeDefined();
    });

    it("matches default return when targetBuffer is not provided", () => {
      const autoAlloc = calculateWhaleSliceTransforms(baseParams);
      const buffer: WhaleSliceData[] = [];
      const targetAlloc = calculateWhaleSliceTransforms(baseParams, buffer);

      expect(targetAlloc.length).toBe(autoAlloc.length);
      for (let i = 0; i < autoAlloc.length; i++) {
        expect(targetAlloc[i].localOffset.x).toBeCloseTo(autoAlloc[i].localOffset.x, 4);
        expect(targetAlloc[i].localOffset.y).toBeCloseTo(autoAlloc[i].localOffset.y, 4);
        expect(targetAlloc[i].relativeAngleInDegrees).toBeCloseTo(
          autoAlloc[i].relativeAngleInDegrees,
          4
        );
        expect(targetAlloc[i].scaleFactor.x).toBeCloseTo(autoAlloc[i].scaleFactor.x, 4);
        expect(targetAlloc[i].scaleFactor.y).toBeCloseTo(autoAlloc[i].scaleFactor.y, 4);
      }
    });
  });

  describe("7.2 ParticlePool Lista Ativa Densa e O(1) Stats", () => {
    function createMockKaboom() {
      const objs: any[] = [];
      return {
        add: vi.fn((props: any[]) => {
          const obj: any = {
            props,
            pos: { x: 0, y: 0 },
            opacity: 1,
            radius: 5,
            width: 10,
            height: 10,
            color: { r: 255, g: 255, b: 255 },
            z: 15,
            hidden: false,
          };
          objs.push(obj);
          return obj;
        }),
        circle: (r: number) => ({ type: "circle", r }),
        rect: (w: number, h: number) => ({ type: "rect", w, h }),
        pos: (x: number, y: number) => ({ x, y }),
        color: (r: number, g: number, b: number) => ({ r, g, b }),
        opacity: (a: number) => ({ a }),
        z: (v: number) => ({ v }),
        vec2: (x: number, y: number) => ({ x, y }),
        dt: () => 0.016,
      } as any;
    }

    it("tracks active circular and rectangular particles via dense index lists", () => {
      const mockK = createMockKaboom();
      const pool = new ParticlePool(mockK, 20, 20);

      const initialStats = pool.getStats();
      expect(initialStats.activeCircles).toBe(0);
      expect(initialStats.activeRects).toBe(0);
      expect(initialStats.totalCircles).toBe(20);
      expect(initialStats.totalRects).toBe(20);

      // Emite partículas circulares
      pool.spawnCircle({
        pos: { x: 10, y: 20 } as any,
        radius: 3,
        color: { r: 200, g: 230, b: 255 } as any,
        maxLife: 1.0,
      });
      pool.spawnCircle({
        pos: { x: 30, y: 40 } as any,
        radius: 4,
        color: { r: 200, g: 230, b: 255 } as any,
        maxLife: 0.05, // Expira rápido
      });

      expect(pool.getActiveIndices().circleIndices.length).toBe(2);
      expect(pool.getStats().activeCircles).toBe(2);

      // Atualiza com dt suficiente para expirar a segunda partícula
      pool.update(0.1);

      expect(pool.getActiveIndices().circleIndices.length).toBe(1);
      expect(pool.getStats().activeCircles).toBe(1);

      // Limpa todas
      pool.reset();
      expect(pool.getActiveIndices().circleIndices.length).toBe(0);
      expect(pool.getActiveIndices().rectIndices.length).toBe(0);
    });
  });

  describe("7.3 Throttling de Dirty-Checking em OceanEnvironment", () => {
    function createMockKaboom() {
      return {
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        setBackground: vi.fn(),
      } as any;
    }

    it("returns false for depth changes under the threshold after evaluation", () => {
      const mockK = createMockKaboom();
      updateOceanColors(mockK, 100);

      expect(isOceanColorDirty(100, 5.0)).toBe(false);
      expect(isOceanColorDirty(102, 5.0)).toBe(false);
      expect(isOceanColorDirty(104.9, 5.0)).toBe(false);
    });

    it("returns true when distance change exceeds or equals threshold", () => {
      const mockK = createMockKaboom();
      updateOceanColors(mockK, 100);

      expect(isOceanColorDirty(105.0, 5.0)).toBe(true);
      expect(isOceanColorDirty(115.0, 5.0)).toBe(true);
      expect(isOceanColorDirty(94.0, 5.0)).toBe(true);
    });
  });

  describe("7.4 Cálculo Determinístico de Métricas de Frame Time", () => {
    it("computes exact p95, p99, median, and max for latency telemetry", () => {
      const data = [16.6, 16.7, 16.6, 17.0, 16.5, 33.3, 16.6, 16.6, 16.8, 16.6];
      const metrics = calculateFrameTimeMetrics(data);

      expect(metrics.avg).toBeGreaterThanOrEqual(18.0);
      expect(metrics.median).toBe(16.6);
      expect(metrics.p95).toBe(33.3);
      expect(metrics.p99).toBe(33.3);
      expect(metrics.max).toBe(33.3);
    });
  });

  describe("7.5 Culling Espacial com Pausa Fora de Frustum e Swap-and-Pop", () => {
    function createMockKaboom(w: number = 1280) {
      return {
        width: () => w,
      } as any;
    }

    it("culls and pauses objects outside camera frustum and resumes inside", () => {
      const mockK = createMockKaboom(1280);
      const manager = new SpatialCullingManager(mockK, 200);

      const actor: any = {
        pos: { x: 2500, y: 100 },
        hidden: false,
        paused: false,
        exists: () => true,
      };

      manager.registerEntity(actor);

      // Câmera em x=500 -> ator em 2500 está fora do frustum (500 + 640 + 200 = 1340)
      const culledResult = manager.update(500);
      expect(culledResult.hiddenCount).toBe(1);
      expect(culledResult.visibleCount).toBe(0);
      expect(actor.hidden).toBe(true);
      expect(actor.paused).toBe(true);

      // Câmera move para x=2400 -> ator entra no frustum
      const visibleResult = manager.update(2400);
      expect(visibleResult.visibleCount).toBe(1);
      expect(visibleResult.hiddenCount).toBe(0);
      expect(actor.hidden).toBe(false);
      expect(actor.paused).toBe(false);
    });

    it("removes destroyed entities via swap-and-pop without mutating order index issues", () => {
      const mockK = createMockKaboom(1280);
      const manager = new SpatialCullingManager(mockK, 200);

      let alive1 = true;
      const alive2 = true;

      const obj1: any = { pos: { x: 500, y: 100 }, exists: () => alive1 };
      const obj2: any = { pos: { x: 600, y: 100 }, exists: () => alive2 };

      manager.registerEntity(obj1);
      manager.registerEntity(obj2);
      expect(manager.getRegisteredCount()).toBe(2);

      // Destrói obj1
      alive1 = false;
      manager.update(500);

      expect(manager.getRegisteredCount()).toBe(1);
      expect(manager.getStats().totalEntities).toBe(1);
    });
  });
});

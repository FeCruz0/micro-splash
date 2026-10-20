import { describe, it, expect } from "vitest";
import { getWhaleBreathColor } from "../../src/entities/player/playerBreathPalette";
import {
  executeWhaleRenderPipeline,
  type WhaleRenderPipelineParameters,
} from "../../src/entities/player/playerRenderPipeline";

describe("Fase 51: Pipeline Unificada de Renderização e Paleta de Fôlego", () => {
  describe("51.2: Paleta Centralizada por Estado de Fôlego (playerBreathPalette.ts)", () => {
    it("retorna cor branca pura para estado calmo (> 50% de oxigênio)", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.85 });
      expect(palette.urgencyState).toBe("calm");
      expect(palette.bodyColor).toEqual([255, 255, 255]);
      expect(palette.finsColor).toEqual([255, 255, 255]);
      expect(palette.suffocationIntensity).toBe(0.0);
    });

    it("retorna tonalidade de transição para estado de aviso (20% a 50% de oxigênio)", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.35 });
      expect(palette.urgencyState).toBe("warning");
      expect(palette.bodyColor[0]).toBeLessThan(255);
      expect(palette.bodyColor[1]).toBeLessThan(255);
      expect(palette.suffocationIntensity).toBeCloseTo(0.65, 2);
    });

    it("retorna alerta e escurecimento para estado crítico (< 20% de oxigênio)", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.1, timeInSeconds: 1.0 });
      expect(palette.urgencyState).toBe("critical");
      expect(palette.bodyColor[0]).toBeLessThan(180);
      expect(palette.bodyColor[1]).toBeLessThan(180);
      expect(palette.suffocationIntensity).toBeCloseTo(0.9, 2);
    });

    it("retorna cor púrpura característica quando presa em rede fantasma", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.9, isTrapped: true });
      expect(palette.urgencyState).toBe("trapped");
      expect(palette.bodyColor).toEqual([190, 90, 230]);
      expect(palette.finsColor).toEqual([175, 80, 215]);
    });

    it("retorna cor escura cianótica em estado de desmaio por anóxia", () => {
      const palette = getWhaleBreathColor({ oxygenRatio: 0.0, isFainting: true });
      expect(palette.urgencyState).toBe("fainting");
      expect(palette.bodyColor).toEqual([55, 60, 80]);
      expect(palette.finsColor).toEqual([48, 52, 70]);
      expect(palette.suffocationIntensity).toBe(1.0);
    });

    it("suporta paleta adaptada para modo de alto contraste", () => {
      const criticalHc = getWhaleBreathColor({
        oxygenRatio: 0.05,
        isHighContrast: true,
      });
      expect(criticalHc.bodyColor).toEqual([255, 60, 60]);

      const trappedHc = getWhaleBreathColor({
        oxygenRatio: 0.9,
        isTrapped: true,
        isHighContrast: true,
      });
      expect(trappedHc.bodyColor).toEqual([220, 100, 255]);
    });
  });

  describe("51.1: Pipeline Unificada de Renderização (playerRenderPipeline.ts)", () => {
    const defaultParams: WhaleRenderPipelineParameters = {
      bodyAngleInDegrees: 15,
      spineCurvatureInDegrees: 20,
      pitchFlexionInDegrees: 10,
      pitchAngularVelocity: 25,
      strokeProgress: 0.4,
      isMuscularStroke: true,
      horizontalSpeed: 110,
      verticalSpeed: -20,
      idleBlendFactor: 0.0,
      currentRoll: 0.3,
      timeInSeconds: 2.5,
      isFacingRight: true,
      oxygenRatio: 0.75,
      isTrapped: false,
      isFainting: false,
      isHighContrast: false,
      isReducedMotion: false,
    };

    it("executa as 4 etapas em ordem estrita e gera snapshot consolidado", () => {
      const snapshot = executeWhaleRenderPipeline(defaultParams);

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBe(2.5);

      // 1. Puppet Rig (4 nós esqueléticos)
      expect(snapshot.puppetRig.bones).toHaveLength(4);
      expect(snapshot.puppetRig.cranialThorax).toBeDefined();
      expect(snapshot.puppetRig.flukeBlade).toBeDefined();

      // 2. Fatias Sagitais (4 fatias anatômicas acopladas ao rig)
      expect(snapshot.slices).toHaveLength(4);
      expect(snapshot.slices[0].name).toBe("head");
      expect(snapshot.slices[3].name).toBe("flukes");

      // 3. Nadadeiras Peitorais (Near e Far)
      expect(snapshot.pectoralFins.nearFin).toBeDefined();
      expect(snapshot.pectoralFins.farFin).toBeDefined();

      // 4. Paleta de Fôlego
      expect(snapshot.palette.urgencyState).toBe("calm");
      expect(snapshot.palette.bodyColor).toEqual([255, 255, 255]);
    });

    it("propaga atenuadores de movimento reduzido para rig, fatias e peitorais", () => {
      const fullSnapshot = executeWhaleRenderPipeline({
        ...defaultParams,
        isReducedMotion: false,
      });
      const reducedSnapshot = executeWhaleRenderPipeline({
        ...defaultParams,
        isReducedMotion: true,
      });

      // Flukes e pedúnculo amortecidos
      expect(Math.abs(reducedSnapshot.puppetRig.flukeBlade.relativeAngleInDegrees)).toBeLessThan(
        Math.abs(fullSnapshot.puppetRig.flukeBlade.relativeAngleInDegrees)
      );

      // Deslocamento de fatia atenuado
      const fullFlukeSlice = fullSnapshot.slices.find((s) => s.name === "flukes")!;
      const reducedFlukeSlice = reducedSnapshot.slices.find((s) => s.name === "flukes")!;
      expect(Math.abs(reducedFlukeSlice.localOffset.y)).toBeLessThan(
        Math.abs(fullFlukeSlice.localOffset.y)
      );

      // Diedro peitoral atenuado
      expect(Math.abs(reducedSnapshot.pectoralFins.nearFin.finAngleInDegrees)).toBeLessThan(
        Math.abs(fullSnapshot.pectoralFins.nearFin.finAngleInDegrees)
      );
    });

    it("integra snapshot e paleta no PlayerController", async () => {
      const { createPlayer } = await import("../../src/entities/player");

      let registeredUpdate: (() => void) | null = null;

      const mockKaboom: any = {
        height: () => 360,
        width: () => 640,
        sprite: () => ({ anim: "glide" }),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({ area: true }),
        body: () => ({ body: true }),
        rotate: (r: number) => ({ rotate: r }),
        color: (r: number, g: number, b: number) => ({ color: { r, g, b } }),
        anchor: (_a: string) => ({ anchor: _a }),
        scale: (x: number, y: number) => ({ scale: { x, y } }),
        opacity: (o: number) => ({ opacity: o }),
        z: (z: number) => ({ z }),
        rect: (w: number, h: number) => ({ type: "rect", w, h }),
        polygon: (pts: any) => ({ pts }),
        Rect: class {
          constructor(_pos: any, _w: number, _h: number) {}
        },
        dt: () => 0.016,
        time: () => 1.5,
        vec2: (x: number, y: number) => ({
          x,
          y,
          len: () => Math.sqrt(x * x + y * y),
          unit: () => ({ x: 0, y: 0 }),
          add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
          scale: (s: number) => mockKaboom.vec2(x * s, y * s),
        }),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => ({
          pos: {
            x: 120,
            y: 200,
            add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }),
          },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: (callback: () => void) => {
            registeredUpdate = callback;
          },
          onDestroy: () => {},
        }),
      };

      const player = createPlayer(mockKaboom, 120, false);
      expect(typeof player.getRenderPipelineSnapshot).toBe("function");
      expect(typeof player.getBreathPalette).toBe("function");

      if (registeredUpdate) {
        (registeredUpdate as () => void)();
      }

      const snapshot = player.getRenderPipelineSnapshot!();
      expect(snapshot).toBeDefined();
      expect(snapshot?.slices).toHaveLength(4);
      expect(snapshot?.palette).toBeDefined();
    });
  });
});

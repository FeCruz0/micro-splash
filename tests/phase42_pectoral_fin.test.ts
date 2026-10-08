import { describe, it, expect } from "vitest";
import {
  calculatePectoralFinTransforms,
  getPectoralFinPolygonVertices,
  setupPectoralFins,
  type PectoralFinComputationParameters,
} from "../src/entities/player/playerPectoralFin";

function createDefaultFinParameters(
  partial: Partial<PectoralFinComputationParameters> = {}
): PectoralFinComputationParameters {
  return {
    bodyAngleInDegrees: 0,
    pitchAngularVelocity: 0,
    spineCurvatureInDegrees: 0,
    currentRoll: 0,
    horizontalSpeed: 0,
    strokeProgress: 0,
    isMuscularStroke: false,
    idleBlendFactor: 0,
    timeInSeconds: 0,
    isFacingRight: true,
    ...partial,
  };
}

function createMockKaboom() {
  const objects: any[] = [];
  return {
    vec2: (x: number, y: number) => ({
      x,
      y,
      add: (v: any) => ({ x: x + v.x, y: y + v.y }),
    }),
    pos: (p: any) => ({ pos: p }),
    polygon: (pts: any) => ({ pts }),
    rotate: (r: number) => ({ angle: r }),
    color: (r: number, g: number, b: number) => ({ color: { r, g, b } }),
    opacity: (o: number) => ({ opacity: o }),
    anchor: (a: string) => ({ anchor: a }),
    z: (z: number) => ({ z }),
    scale: (x: number, y: number) => ({ scale: { x, y } }),
    add: (_components: any[]) => {
      const obj: any = {
        pos: { x: 100, y: 100, add: (v: any) => ({ x: 100 + v.x, y: 100 + v.y }) },
        angle: 0,
        opacity: 1,
        scale: { x: 1, y: 1 },
        destroyed: false,
        destroy: () => {
          obj.destroyed = true;
        },
      };
      objects.push(obj);
      return obj;
    },
    objects,
  } as any;
}

describe("Fase 42: Nadadeiras Peitorais Independentes e Hidrodinâmica de Diedro", () => {
  describe("42.1 Cinemática de Diedro e Enflechamento", () => {
    it("insere as nadadeiras no tórax com coordenadas anatômicas", () => {
      const transforms = calculatePectoralFinTransforms(createDefaultFinParameters());

      expect(transforms.nearFin.baseLocalOffset.x).toBe(16);
      expect(transforms.nearFin.baseLocalOffset.y).toBe(6);
      expect(transforms.farFin.baseLocalOffset.x).toBe(16);
    });

    it("altera o ângulo diedro em resposta a manobras bruscas de arfagem", () => {
      // Subida ativa (pitchAngularVelocity < 0)
      const pitchUp = calculatePectoralFinTransforms(
        createDefaultFinParameters({ pitchAngularVelocity: -40 })
      );

      // Mergulho ativo (pitchAngularVelocity > 0)
      const pitchDown = calculatePectoralFinTransforms(
        createDefaultFinParameters({ pitchAngularVelocity: 40 })
      );

      expect(pitchUp.nearFin.finAngleInDegrees).toBeGreaterThan(0);
      expect(pitchDown.nearFin.finAngleInDegrees).toBeLessThan(0);
      expect(pitchUp.nearFin.finAngleInDegrees).toBeGreaterThan(
        pitchDown.nearFin.finAngleInDegrees
      );
    });

    it("aumenta o enflechamento (sweep angle) para trás proporcionalmente à velocidade", () => {
      const slowFin = calculatePectoralFinTransforms(
        createDefaultFinParameters({ horizontalSpeed: 0 })
      );
      const cruiseFin = calculatePectoralFinTransforms(
        createDefaultFinParameters({ horizontalSpeed: 90 })
      );
      const fastFin = calculatePectoralFinTransforms(
        createDefaultFinParameters({ horizontalSpeed: 180 })
      );

      expect(slowFin.nearFin.sweepAngleInDegrees).toBe(0);
      expect(cruiseFin.nearFin.sweepAngleInDegrees).toBeGreaterThan(0);
      expect(fastFin.nearFin.sweepAngleInDegrees).toBeGreaterThan(
        cruiseFin.nearFin.sweepAngleInDegrees
      );
      expect(fastFin.nearFin.sweepAngleInDegrees).toBeLessThanOrEqual(20);
    });

    it("abre as nadadeiras em downstroke durante batida muscular ativa", () => {
      const restingStroke = calculatePectoralFinTransforms(
        createDefaultFinParameters({ isMuscularStroke: false })
      );
      const activeDownstroke = calculatePectoralFinTransforms(
        createDefaultFinParameters({
          isMuscularStroke: true,
          strokeProgress: 0.5,
        })
      );

      expect(activeDownstroke.nearFin.finAngleInDegrees).toBeGreaterThan(
        restingStroke.nearFin.finAngleInDegrees
      );
    });

    it("inverte os offsets e ângulos horizontais quando a baleia está virada para a esquerda", () => {
      const rightFacing = calculatePectoralFinTransforms(
        createDefaultFinParameters({ isFacingRight: true, pitchAngularVelocity: -30 })
      );
      const leftFacing = calculatePectoralFinTransforms(
        createDefaultFinParameters({ isFacingRight: false, pitchAngularVelocity: -30 })
      );

      expect(leftFacing.nearFin.baseLocalOffset.x).toBe(-rightFacing.nearFin.baseLocalOffset.x);
      expect(leftFacing.nearFin.finAngleInDegrees).toBe(-rightFacing.nearFin.finAngleInDegrees);
      expect(leftFacing.nearFin.tipLocalOffset.x).toBeLessThan(0);
    });
  });

  describe("42.2 Geometria Poligonal e Montagem Visual", () => {
    it("gera o polígono anatômico em foice com 8 vértices e tubérculos", () => {
      const points = getPectoralFinPolygonVertices();
      expect(points.length).toBe(8);

      // Base em (0, 0)
      expect(points[0]).toEqual({ x: 0, y: 0 });

      // Ponta (wingtip) atinge comprimento > 30px
      const wingtip = points[4];
      const tipDistance = Math.hypot(wingtip.x, wingtip.y);
      expect(tipDistance).toBeGreaterThan(35);
    });

    it("inicializa e atualiza o sistema de nadadeiras peitorais no Kaboom com cleanup", () => {
      const k = createMockKaboom();
      const mockWhale: any = {
        pos: { x: 100, y: 150, add: (v: any) => ({ x: 100 + v.x, y: 150 + v.y }) },
        angle: 10,
      };

      const system = setupPectoralFins(k, mockWhale);
      expect(system.getNearTipWorldPos()).toBeDefined();

      const transforms = calculatePectoralFinTransforms(createDefaultFinParameters());
      expect(() => {
        system.update(transforms, true);
      }).not.toThrow();

      const tipPos = system.getNearTipWorldPos();
      expect(tipPos.x).toBeGreaterThan(0);
      expect(tipPos.y).toBeGreaterThan(0);

      // Destrói as entidades e valida cleanup
      system.destroy();
      expect(k.objects.every((o: any) => o.destroyed)).toBe(true);
    });

    it("integra o sistema de nadadeiras ao playerController com getPectoralFinTransforms", async () => {
      const { createPlayer } = await import("../src/entities/player");

      let registeredUpdate: (() => void) | null = null;
      let registeredDestroy: (() => void) | null = null;

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
          onDestroy: (callback: () => void) => {
            registeredDestroy = callback;
          },
        }),
      };

      const player = createPlayer(mockKaboom, 120, false);
      expect(typeof player.getPectoralFinTransforms).toBe("function");

      if (registeredUpdate) {
        (registeredUpdate as () => void)();
      }

      const finTransforms = player.getPectoralFinTransforms!();
      expect(finTransforms).toBeDefined();
      expect(finTransforms.nearFin).toBeDefined();
      expect(finTransforms.farFin).toBeDefined();
      expect(finTransforms.nearFin.baseLocalOffset.x).toBe(16);

      if (registeredDestroy) {
        expect(() => (registeredDestroy as () => void)()).not.toThrow();
      }
    });
  });
});

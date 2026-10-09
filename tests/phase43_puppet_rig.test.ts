import { describe, it, expect } from "vitest";
import {
  calculateWhalePuppetRig,
  calculateFlukeAngleOfAttackInDegrees,
  BONE_LENGTH_CRANIAL_THORAX,
  BONE_LENGTH_ABDOMINAL_SPINE,
  BONE_LENGTH_CAUDAL_PEDUNCLE,
  BONE_LENGTH_FLUKE_BLADE,
  type PuppetRigParameters,
} from "../src/entities/player/playerPuppetRig";

function createDefaultPuppetParameters(
  partial: Partial<PuppetRigParameters> = {}
): PuppetRigParameters {
  return {
    bodyAngleInDegrees: 0,
    spineCurvatureInDegrees: 0,
    pitchAngularVelocity: 0,
    strokeProgress: 0,
    isMuscularStroke: false,
    horizontalSpeed: 0,
    verticalSpeed: 0,
    idleBlendFactor: 0,
    timeInSeconds: 0,
    isFacingRight: true,
    ...partial,
  };
}

describe("Fase 43: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig)", () => {
  describe("43.1 Cadeia Cinemática de 4 Nós Esqueléticos", () => {
    it("mantém a conectividade contínua ponta-para-base entre todos os elos", () => {
      const rig = calculateWhalePuppetRig(
        createDefaultPuppetParameters({
          spineCurvatureInDegrees: 15,
          isMuscularStroke: true,
          strokeProgress: 0.25,
        })
      );

      expect(rig.bones.length).toBe(4);

      // Base do crânio/tórax começa no corpo
      expect(rig.cranialThorax.baseLocalOffset.x).toBe(20);
      expect(rig.cranialThorax.baseLocalOffset.y).toBe(0);

      // O abdômen começa exatamente onde o crânio termina
      expect(rig.abdominalSpine.baseLocalOffset.x).toBeCloseTo(
        rig.cranialThorax.tipLocalOffset.x,
        3
      );
      expect(rig.abdominalSpine.baseLocalOffset.y).toBeCloseTo(
        rig.cranialThorax.tipLocalOffset.y,
        3
      );

      // O pedúnculo começa exatamente onde o abdômen termina
      expect(rig.caudalPeduncle.baseLocalOffset.x).toBeCloseTo(
        rig.abdominalSpine.tipLocalOffset.x,
        3
      );
      expect(rig.caudalPeduncle.baseLocalOffset.y).toBeCloseTo(
        rig.abdominalSpine.tipLocalOffset.y,
        3
      );

      // A lâmina dos flukes começa exatamente onde o pedúnculo termina
      expect(rig.flukeBlade.baseLocalOffset.x).toBeCloseTo(rig.caudalPeduncle.tipLocalOffset.x, 3);
      expect(rig.flukeBlade.baseLocalOffset.y).toBeCloseTo(rig.caudalPeduncle.tipLocalOffset.y, 3);
    });

    it("preserva rigorosamente o comprimento físico de cada segmento ósseo", () => {
      const rig = calculateWhalePuppetRig(
        createDefaultPuppetParameters({
          spineCurvatureInDegrees: -22,
          isMuscularStroke: true,
          strokeProgress: 0.75,
        })
      );

      for (const bone of rig.bones) {
        const deltaX = bone.tipLocalOffset.x - bone.baseLocalOffset.x;
        const deltaY = bone.tipLocalOffset.y - bone.baseLocalOffset.y;
        const measuredLength = Math.hypot(deltaX, deltaY);
        expect(measuredLength).toBeCloseTo(bone.lengthInPixels, 3);
      }

      expect(rig.cranialThorax.lengthInPixels).toBe(BONE_LENGTH_CRANIAL_THORAX);
      expect(rig.abdominalSpine.lengthInPixels).toBe(BONE_LENGTH_ABDOMINAL_SPINE);
      expect(rig.caudalPeduncle.lengthInPixels).toBe(BONE_LENGTH_CAUDAL_PEDUNCLE);
      expect(rig.flukeBlade.lengthInPixels).toBe(BONE_LENGTH_FLUKE_BLADE);
    });

    it("aplica deflexão angular progressiva da cabeça em direção aos flukes", () => {
      const rig = calculateWhalePuppetRig(
        createDefaultPuppetParameters({
          spineCurvatureInDegrees: 25,
          isMuscularStroke: false,
          horizontalSpeed: 100,
        })
      );

      // A cabeça é o elo líder rígido (ângulo relativo zero)
      expect(rig.cranialThorax.relativeAngleInDegrees).toBe(0);

      // O pedúnculo e flukes sofrem mais deflexão do que o abdômen anterior
      expect(Math.abs(rig.caudalPeduncle.relativeAngleInDegrees)).toBeGreaterThan(
        Math.abs(rig.abdominalSpine.relativeAngleInDegrees)
      );
    });

    it("espelha a orientação espacial e sinais angulares ao virar para a esquerda", () => {
      const rightRig = calculateWhalePuppetRig(
        createDefaultPuppetParameters({
          isFacingRight: true,
          spineCurvatureInDegrees: 18,
          isMuscularStroke: true,
          strokeProgress: 0.2,
        })
      );

      const leftRig = calculateWhalePuppetRig(
        createDefaultPuppetParameters({
          isFacingRight: false,
          spineCurvatureInDegrees: 18,
          isMuscularStroke: true,
          strokeProgress: 0.2,
        })
      );

      expect(leftRig.cranialThorax.baseLocalOffset.x).toBe(
        -rightRig.cranialThorax.baseLocalOffset.x
      );
      expect(leftRig.flukeBlade.tipLocalOffset.x).toBe(-rightRig.flukeBlade.tipLocalOffset.x);
      expect(leftRig.cranialThorax.baseLocalOffset.y).toBe(
        rightRig.cranialThorax.baseLocalOffset.y
      );
      expect(leftRig.flukeBlade.tipLocalOffset.y).toBe(rightRig.flukeBlade.tipLocalOffset.y);
    });
  });

  describe("43.2 Hidrodinâmica da Lâmina dos Flukes e Ângulo de Ataque (AoA)", () => {
    it("inverte o ângulo de ataque entre as fases de downstroke e upstroke", () => {
      // Downstroke ativo (strokeProgress = 0.25): impulso para baixo, AoA positivo
      const downstrokeAoA = calculateFlukeAngleOfAttackInDegrees(
        createDefaultPuppetParameters({
          isMuscularStroke: true,
          strokeProgress: 0.25,
        })
      );

      // Upstroke ativo (strokeProgress = 0.75): impulso para cima, AoA negativo
      const upstrokeAoA = calculateFlukeAngleOfAttackInDegrees(
        createDefaultPuppetParameters({
          isMuscularStroke: true,
          strokeProgress: 0.75,
        })
      );

      // Inversão de fase com amplitude máxima em ~90° e ~270° de batida
      expect(downstrokeAoA).toBeCloseTo(0, 1); // Passagem pelo ponto neutro na velocidade de ponta
      expect(upstrokeAoA).toBeCloseTo(0, 1);

      const peakDownstrokeAoA = calculateFlukeAngleOfAttackInDegrees(
        createDefaultPuppetParameters({
          isMuscularStroke: true,
          strokeProgress: 0.5,
        })
      );
      const startDownstrokeAoA = calculateFlukeAngleOfAttackInDegrees(
        createDefaultPuppetParameters({
          isMuscularStroke: true,
          strokeProgress: 0.0,
        })
      );

      expect(peakDownstrokeAoA).toBeGreaterThan(0);
      expect(startDownstrokeAoA).toBeLessThan(0);
      expect(peakDownstrokeAoA).toBe(-startDownstrokeAoA);
    });

    it("amortece os flukes suavemente com complacência em repouso marinho (idle)", () => {
      const idleWave1 = calculateFlukeAngleOfAttackInDegrees(
        createDefaultPuppetParameters({
          isMuscularStroke: false,
          horizontalSpeed: 0,
          idleBlendFactor: 1.0,
          timeInSeconds: 1.0,
        })
      );

      const idleWave2 = calculateFlukeAngleOfAttackInDegrees(
        createDefaultPuppetParameters({
          isMuscularStroke: false,
          horizontalSpeed: 0,
          idleBlendFactor: 1.0,
          timeInSeconds: 3.5,
        })
      );

      expect(Math.abs(idleWave1)).toBeLessThanOrEqual(5);
      expect(Math.abs(idleWave2)).toBeLessThanOrEqual(5);
    });

    it("integra o Puppet Rig ao PlayerController via getPuppetRigTransforms", async () => {
      const { createPlayer } = await import("../src/entities/player");

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
      expect(typeof player.getPuppetRigTransforms).toBe("function");

      if (registeredUpdate) {
        (registeredUpdate as () => void)();
      }

      const rigTransforms = player.getPuppetRigTransforms!();
      expect(rigTransforms).toBeDefined();
      expect(rigTransforms.bones.length).toBe(4);
      expect(rigTransforms.cranialThorax).toBeDefined();
      expect(rigTransforms.flukeBlade).toBeDefined();
      expect(rigTransforms.flukeAngleOfAttackInDegrees).toBeDefined();
    });
  });
});

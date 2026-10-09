import { describe, it, expect } from "vitest";
import {
  determineWhaleAnimationState,
  calculateWhaleAnimationPlaybackSpeed,
  WHALE_ANIMATION_DEFINITIONS,
  type WhaleAnimationParameters,
} from "../src/entities/player/playerAnimation";

function createDefaultAnimationParameters(
  partial: Partial<WhaleAnimationParameters> = {}
): WhaleAnimationParameters {
  return {
    isMuscularStroke: false,
    strokeProgress: 0,
    horizontalSpeed: 0,
    isFeeding: false,
    isTrapped: false,
    isFrozen: false,
    isFainting: false,
    inWater: true,
    ...partial,
  };
}

describe("Fase 44: Expansão do Spritesheet de Alta Fluidez e Detalhamento Biomecânico", () => {
  describe("44.1 Integridade da Textura Expandida de 16 Quadros", () => {
    it("valida que o arquivo whale.png possui resolução exata de 2048x64 px (16 quadros)", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const spritePath = path.join(nodeProcess.cwd(), "public/sprites/whale.png");
      expect(fs.existsSync(spritePath)).toBe(true);

      const buffer = fs.readFileSync(spritePath);
      // Header PNG: Bytes 16-24 armazenam Width e Height (32-bit big endian)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);

      expect(width).toBe(2048);
      expect(height).toBe(64);

      const frameWidth = 128;
      const frameCount = width / frameWidth;
      expect(frameCount).toBe(16);
    });

    it("garante que todas as definições de animação referenciam frames válidos entre 0 e 15", () => {
      const definitions = Object.values(WHALE_ANIMATION_DEFINITIONS);
      expect(definitions.length).toBe(6);

      for (const def of definitions) {
        expect(def.startFrameIndex).toBeGreaterThanOrEqual(0);
        expect(def.startFrameIndex).toBeLessThanOrEqual(15);
        expect(def.endFrameIndex).toBeGreaterThanOrEqual(def.startFrameIndex);
        expect(def.endFrameIndex).toBeLessThanOrEqual(15);
        expect(def.basePlaybackSpeed).toBeGreaterThan(0);
      }
    });
  });

  describe("44.2 Orquestração e Interpolação Harmônica de Estados", () => {
    it("seleciona o estado feed prioritariamente durante alimentação", () => {
      const state = determineWhaleAnimationState(
        createDefaultAnimationParameters({ isFeeding: true })
      );
      expect(state).toBe("feed");
    });

    it("alterna entre stroke_down e stroke_up no ciclo muscular ativo de propulsão", () => {
      const downstrokeState = determineWhaleAnimationState(
        createDefaultAnimationParameters({
          isMuscularStroke: true,
          strokeProgress: 0.3,
        })
      );
      const upstrokeState = determineWhaleAnimationState(
        createDefaultAnimationParameters({
          isMuscularStroke: true,
          strokeProgress: 0.75,
        })
      );

      expect(downstrokeState).toBe("stroke_down");
      expect(upstrokeState).toBe("stroke_up");
    });

    it("mantém idle_swim na maré e glide quando paralisada ou fora d'água", () => {
      const idleState = determineWhaleAnimationState(
        createDefaultAnimationParameters({
          horizontalSpeed: 0,
          inWater: true,
        })
      );
      const trappedState = determineWhaleAnimationState(
        createDefaultAnimationParameters({
          isTrapped: true,
          inWater: true,
        })
      );
      const outOfWaterState = determineWhaleAnimationState(
        createDefaultAnimationParameters({
          inWater: false,
        })
      );

      expect(idleState).toBe("idle_swim");
      expect(trappedState).toBe("glide");
      expect(outOfWaterState).toBe("glide");
    });

    it("modula a taxa de reprodução de swim proporcionalmente à velocidade horizontal", () => {
      const slowSpeed = calculateWhaleAnimationPlaybackSpeed("swim", 50);
      const cruiseSpeed = calculateWhaleAnimationPlaybackSpeed("swim", 100);
      const fastSpeed = calculateWhaleAnimationPlaybackSpeed("swim", 180);

      expect(cruiseSpeed).toBeGreaterThan(slowSpeed);
      expect(fastSpeed).toBeGreaterThan(cruiseSpeed);
    });
  });

  describe("44.3 Integração com PlayerController", () => {
    it("expõe getAnimationState corretamente no ciclo do jogador", async () => {
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
      expect(typeof player.getAnimationState).toBe("function");

      if (registeredUpdate) {
        (registeredUpdate as () => void)();
      }

      const anim = player.getAnimationState!();
      expect(anim).toBeDefined();
      expect(["glide", "idle_swim", "stroke_up", "stroke_down", "swim", "feed"]).toContain(anim);
    });
  });
});

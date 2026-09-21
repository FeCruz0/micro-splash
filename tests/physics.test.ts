import { describe, it, expect } from "vitest";
import { PlayerPhysicsManager } from "../src/entities/player/playerPhysics";
import { GAME_CONFIG } from "../src/config";

function createMockKaboom() {
  return {
    vec2: (x: number, y: number) => ({
      x,
      y,
      len: () => Math.sqrt(x * x + y * y),
      unit: () => {
        const l = Math.sqrt(x * x + y * y);
        return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
      },
      add: (other: { x: number; y: number }) => createMockKaboom().vec2(x + other.x, y + other.y),
      scale: (s: number) => createMockKaboom().vec2(x * s, y * s),
    }),
    deg2rad: (deg: number) => (deg * Math.PI) / 180,
    rad2deg: (rad: number) => (rad * 180) / Math.PI,
    clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  } as any;
}

describe("PlayerPhysicsManager: Perda de Momentum e Impulso da Baleia", () => {
  it("possui batida de cauda vigorosa (impulso responsivo)", () => {
    const k = createMockKaboom();
    const physics = new PlayerPhysicsManager(k);
    const dt = 1 / 60;
    const strokeFrames = Math.round(GAME_CONFIG.MAX_STROKE_TIME / dt);

    for (let f = 0; f < strokeFrames; f++) {
      physics.applyThrust(dt, true, 0, false, GAME_CONFIG.MAX_SPEED, 1.0);
      const spd = physics.getSpeed();
      physics.setSpeed(spd.scale(GAME_CONFIG.WATER_DRAG));
    }

    const speedAfterFirstStroke = physics.getSpeed().len();
    // 1ª batida gera impulso vigoroso (> 100 px/s)
    expect(speedAfterFirstStroke).toBeGreaterThan(100);
  });

  it("desacelera rapidamente (perde momentum) a partir da velocidade máxima ao parar de nadar", () => {
    const k = createMockKaboom();
    const physics = new PlayerPhysicsManager(k);
    // Inicia na velocidade máxima (240 px/s)
    physics.setSpeed(k.vec2(GAME_CONFIG.MAX_SPEED, 0));

    // Desacelera por 0.5s sem novas batidas de cauda (30 frames)
    for (let f = 0; f < 30; f++) {
      const spd = physics.getSpeed();
      physics.setSpeed(spd.scale(GAME_CONFIG.WATER_DRAG));
    }

    const coastSpeed = physics.getSpeed().len();
    // Em apenas 0.5s sem nadar, a baleia deve ter perdido mais de 60% da velocidade máxima
    expect(coastSpeed).toBeLessThan(GAME_CONFIG.MAX_SPEED * 0.40);
  });
});

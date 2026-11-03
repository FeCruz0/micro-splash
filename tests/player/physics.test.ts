import { describe, it, expect } from "vitest";
import { PlayerPhysicsManager } from "../../src/entities/player/playerPhysics";
import { GAME_CONFIG } from "../../src/config";

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
    height: () => 720,
    width: () => 1280,
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
    // 1ª batida gera impulso orgânico e moderado (> 85 px/s)
    expect(speedAfterFirstStroke).toBeGreaterThan(85);
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
    expect(coastSpeed).toBeLessThan(GAME_CONFIG.MAX_SPEED * 0.4);
  });
});

describe("Fase 57: Física e Arrasto Hidrodinâmico Independentes de Frame Rate", () => {
  function createMockWhale(k: any, y: number = 200) {
    return {
      pos: k.vec2(100, y),
      move: (_x: number, _y: number) => {},
    } as any;
  }

  it("produz desaceleração hidrodinâmica idêntica a 60 FPS, 120 FPS e 144 FPS", () => {
    const k = createMockKaboom();

    // 1 segundo de desaceleração a 60 FPS
    const physics60 = new PlayerPhysicsManager(k);
    physics60.setSpeed(k.vec2(GAME_CONFIG.MAX_SPEED, 0));
    const whale60 = createMockWhale(k, 200);
    const dt60 = 1 / 60;
    for (let frame = 0; frame < 60; frame++) {
      physics60.updateMovement(dt60, whale60, true, 0, false);
    }
    const finalSpeed60 = physics60.getSpeed().x;

    // 1 segundo de desaceleração a 120 FPS
    const physics120 = new PlayerPhysicsManager(k);
    physics120.setSpeed(k.vec2(GAME_CONFIG.MAX_SPEED, 0));
    const whale120 = createMockWhale(k, 200);
    const dt120 = 1 / 120;
    for (let frame = 0; frame < 120; frame++) {
      physics120.updateMovement(dt120, whale120, true, 0, false);
    }
    const finalSpeed120 = physics120.getSpeed().x;

    // 1 segundo de desaceleração a 144 FPS
    const physics144 = new PlayerPhysicsManager(k);
    physics144.setSpeed(k.vec2(GAME_CONFIG.MAX_SPEED, 0));
    const whale144 = createMockWhale(k, 200);
    const dt144 = 1 / 144;
    for (let frame = 0; frame < 144; frame++) {
      physics144.updateMovement(dt144, whale144, true, 0, false);
    }
    const finalSpeed144 = physics144.getSpeed().x;

    // Tolerância menor que 0.1 px/s entre monitores de 60Hz, 120Hz e 144Hz
    expect(finalSpeed120).toBeCloseTo(finalSpeed60, 1);
    expect(finalSpeed144).toBeCloseTo(finalSpeed60, 1);
  });

  it("produz arrasto aéreo idêntico a 60 FPS e 120 FPS durante voo balístico", () => {
    const k = createMockKaboom();
    const airY = GAME_CONFIG.SEA_LEVEL - 50;

    const physics60 = new PlayerPhysicsManager(k);
    physics60.setSpeed(k.vec2(200, -100));
    const whale60 = createMockWhale(k, airY);
    const dt60 = 1 / 60;
    for (let frame = 0; frame < 30; frame++) {
      physics60.updateMovement(dt60, whale60, true, 0, false);
    }
    const airSpeedX60 = physics60.getSpeed().x;

    const physics120 = new PlayerPhysicsManager(k);
    physics120.setSpeed(k.vec2(200, -100));
    const whale120 = createMockWhale(k, airY);
    const dt120 = 1 / 120;
    for (let frame = 0; frame < 60; frame++) {
      physics120.updateMovement(dt120, whale120, true, 0, false);
    }
    const airSpeedX120 = physics120.getSpeed().x;

    expect(airSpeedX120).toBeCloseTo(airSpeedX60, 1);
  });

  it("mantém estabilidade matemática sob picos de delta time", () => {
    const k = createMockKaboom();
    const physics = new PlayerPhysicsManager(k);
    physics.setSpeed(k.vec2(GAME_CONFIG.MAX_SPEED, 50));
    const whale = createMockWhale(k, 200);

    // Simulação com delta time clamped (MAX_DELTA_TIME)
    physics.updateMovement(GAME_CONFIG.MAX_DELTA_TIME, whale, true, 0, false);
    const speed = physics.getSpeed();

    expect(Number.isFinite(speed.x)).toBe(true);
    expect(Number.isFinite(speed.y)).toBe(true);
    expect(speed.x).toBeGreaterThan(0);
    expect(speed.x).toBeLessThan(GAME_CONFIG.MAX_SPEED);
  });
});

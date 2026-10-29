import { GAME_CONFIG } from "../../config";
import { getRandomFloat, getRandomInteger } from "../../utils/random";
import { audioSystem } from "../../systems/audioSystem";
import { getParticlePool } from "../../systems/particlePool";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";

export interface PlayerParticleGameObject {
  pos: StrictPlayerVector2D | PlayerVector2D;
  radius?: number;
  opacity?: number;
  scale?: StrictPlayerVector2D | { x: number; y: number };
  onUpdate: (cb: () => void) => void;
  [key: string]: unknown;
}

export interface PlayerParticlesEngineContext {
  vec2(x: number, y: number): StrictPlayerVector2D;
  rgb(r: number, g: number, b: number): unknown;
  circle(radius: number): unknown;
  rect(w: number, h: number): unknown;
  pos(x: number | PlayerVector2D, y?: number): unknown;
  color(r: number | unknown, g?: number, b?: number): unknown;
  opacity(val: number): unknown;
  z(layer: number): unknown;
  scale(x: number, y?: number): unknown;
  anchor(anc: "center" | "bot" | "topleft" | "botleft" | string): unknown;
  add(comps: unknown[]): unknown;
  destroy(obj?: unknown): void;
  dt(): number;
  deg2rad?(deg: number): number;
}

function addVec(
  k: PlayerParticlesEngineContext,
  a: StrictPlayerVector2D | PlayerVector2D,
  b: StrictPlayerVector2D | PlayerVector2D
): StrictPlayerVector2D {
  return typeof a.add === "function"
    ? (a.add(b as PlayerVector2D) as StrictPlayerVector2D)
    : k.vec2(a.x + b.x, a.y + b.y);
}

export function spawnOilSpout(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean,
  hSpeed: number
) {
  audioSystem.playOilChoke();
  const spoutOrigin = addVec(k, pos, k.vec2(isFacingRight ? 22 : -22, -13));
  const pool = getParticlePool();

  for (let i = 0; i < 24; i++) {
    const spread = getRandomFloat(-0.175, 0.175);
    const speed = getRandomFloat(110, 200);
    const dir = k.vec2(Math.cos(-Math.PI / 2 + spread), Math.sin(-Math.PI / 2 + spread));
    const vel = dir.scale(speed);
    vel.x += hSpeed * 0.2;
    const pPos = k.vec2(spoutOrigin.x + getRandomFloat(-3, 3), spoutOrigin.y);
    const radius = getRandomFloat(1.8, 4.0);
    let life = getRandomFloat(0.55, 0.9);

    if (pool) {
      pool.spawnCircle({
        pos: pPos,
        radius,
        color: k.rgb(30, 22, 16),
        opacity: 0.9,
        z: 15,
        vel,
        gravityY: 280,
        maxLife: life,
      });
    } else {
      const p = k.add([
        k.circle(radius),
        k.pos(pPos),
        k.color(30, 22, 16), // lodo negro oleoso
        k.opacity(0.9),
        k.z(15),
      ]) as PlayerParticleGameObject;

      const maxLife = life;
      p.onUpdate(() => {
        const dt = k.dt();
        vel.y += 280 * dt;
        p.pos = addVec(k, p.pos, vel.scale(dt));
        life -= dt;
        p.opacity = Math.max(0, (life / maxLife) * 0.9);
        if (life <= 0) k.destroy(p);
      });
    }
  }
}

export function spawnPurifyBubbles(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D
) {
  const pool = getParticlePool();
  for (let i = 0; i < 35; i++) {
    const pPos = k.vec2(pos.x + getRandomFloat(-20, 20), pos.y + getRandomFloat(-10, 10));
    const radius = getRandomFloat(2.0, 4.5);
    const bLife = getRandomFloat(0.8, 1.3);
    const vy = getRandomFloat(-140, -60);

    if (pool) {
      pool.spawnCircle({
        pos: pPos,
        radius,
        color: k.rgb(180, 240, 255),
        opacity: 0.85,
        z: 16,
        vel: k.vec2(0, vy),
        fadeRate: 0.9,
        maxLife: bLife,
      });
    } else {
      const b = k.add([
        k.circle(radius),
        k.pos(pPos),
        k.color(180, 240, 255),
        k.opacity(0.85),
        k.z(16),
      ]) as PlayerParticleGameObject;
      let lifeRemaining = bLife;
      b.onUpdate(() => {
        const dt = k.dt();
        b.pos.y += vy * dt;
        lifeRemaining -= dt;
        if (typeof b.opacity === "number") {
          b.opacity -= dt * 0.9;
        }
        if (lifeRemaining <= 0 || (typeof b.opacity === "number" && b.opacity <= 0)) {
          k.destroy(b);
        }
      });
    }
  }
}

export function spawnBlowholeSpout(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean,
  hSpeed: number
) {
  audioSystem.playBlowholeSpout();

  const spoutOrigin = addVec(k, pos, k.vec2(isFacingRight ? 22 : -22, -13));
  const pool = getParticlePool();

  // Halo de luz do espiráculo ao romper a água para respirar na superfície (Fase 30.6)
  const halo = k.add([
    k.circle(30),
    k.pos(spoutOrigin.x, GAME_CONFIG.SEA_LEVEL),
    k.color(255, 255, 255),
    k.opacity(0.2),
    k.scale(1, 0.4), // Projeção horizontal elíptica na lâmina da água
    k.anchor("center"),
    k.z(14),
    "blowhole_sun_halo",
  ]) as PlayerParticleGameObject;

  let haloTimer = 0.5;
  halo.onUpdate(() => {
    const dt = k.dt();
    haloTimer -= dt;
    halo.pos.x += hSpeed * 0.25 * dt;
    if (halo.scale && "x" in halo.scale && "y" in halo.scale) {
      halo.scale.x += dt * 0.8;
      halo.scale.y += dt * 0.3;
    }
    halo.opacity = Math.max(0, (haloTimer / 0.5) * 0.2);
    if (haloTimer <= 0) {
      k.destroy(halo);
    }
  });

  // 32 partículas de condensação e vapor marinho em formato de V
  for (let i = 0; i < 32; i++) {
    const isRightPlume = i % 2 === 0;
    // Ângulos das duas plumas em V: esquerda ~ -98° (-1.71 rad), direita ~ -82° (-1.43 rad)
    const baseAngle = isRightPlume ? -1.45 : -1.69;
    const spread = getRandomFloat(-0.11, 0.11);
    const speed = getRandomFloat(190, 360);
    const dir = k.vec2(Math.cos(baseAngle + spread), Math.sin(baseAngle + spread));

    const vel = dir.scale(speed);
    vel.x += hSpeed * 0.35; // herda parte do movimento horizontal da baleia

    const pPos = k.vec2(spoutOrigin.x + getRandomFloat(-3, 3), spoutOrigin.y);
    const radius = getRandomFloat(1.8, 4.0);
    const life = getRandomFloat(0.65, 1.1);

    if (pool) {
      pool.spawnCircle({
        pos: pPos,
        radius,
        color: k.rgb(225, 242, 255),
        opacity: 0.85,
        z: 15,
        vel,
        gravityY: 240,
        growthRate: 3.2,
        maxLife: life,
        boundaryY: GAME_CONFIG.SEA_LEVEL + 35,
        boundaryYMode: "greater",
      });
    } else {
      const particle = k.add([
        k.circle(radius),
        k.pos(pPos),
        k.color(225, 242, 255),
        k.opacity(0.85),
        k.z(15),
      ]) as PlayerParticleGameObject;

      const maxLife = life;
      let curLife = life;

      particle.onUpdate(() => {
        const dt = k.dt();
        vel.y += 240 * dt; // gravidade puxando gotículas de volta ao mar
        particle.pos = addVec(k, particle.pos, vel.scale(dt));
        if (typeof particle.radius === "number") {
          particle.radius += dt * 3.2; // expansão de vapor
        }
        curLife -= dt;
        particle.opacity = Math.max(0, (curLife / maxLife) * 0.85);

        if (curLife <= 0 || particle.pos.y > GAME_CONFIG.SEA_LEVEL + 35) {
          k.destroy(particle);
        }
      });
    }
  }
}

export function spawnBaleenSuction(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean
) {
  const mouthPos = addVec(k, pos, k.vec2(isFacingRight ? 46 : -46, 2));
  const pool = getParticlePool();

  for (let i = 0; i < 12; i++) {
    const pAngle = getRandomFloat(0, Math.PI * 2);
    const dist = getRandomFloat(22, 46);
    const pPos = k.vec2(mouthPos.x + Math.cos(pAngle) * dist, mouthPos.y + Math.sin(pAngle) * dist);
    const radius = getRandomFloat(1.2, 2.7);

    if (pool) {
      pool.spawnCircle({
        pos: pPos,
        radius,
        color: k.rgb(255, 175, 145),
        opacity: 0.85,
        z: 20,
        targetPos: mouthPos,
        targetSpeed: 190,
        fadeRate: 2.4,
        maxLife: 0.6,
      });
    } else {
      const p = k.add([
        k.circle(radius),
        k.pos(pPos),
        k.color(255, 175, 145),
        k.opacity(0.85),
        k.z(20),
      ]) as PlayerParticleGameObject;

      p.onUpdate(() => {
        const toMouth =
          typeof mouthPos.sub === "function"
            ? mouthPos.sub(p.pos)
            : k.vec2(mouthPos.x - p.pos.x, mouthPos.y - p.pos.y);
        if (toMouth.len() < 6) {
          k.destroy(p);
        } else {
          p.pos = addVec(k, p.pos, toMouth.unit().scale(190 * k.dt()));
          if (typeof p.opacity === "number") {
            p.opacity -= k.dt() * 2.4;
            if (p.opacity <= 0) k.destroy(p);
          }
        }
      });
    }
  }
}

export function spawnDraftingTrail(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean
) {
  const trailX = pos.x + (isFacingRight ? -42 : 42);
  const trailY = pos.y + getRandomFloat(-9, 9);
  const pool = getParticlePool();

  if (pool) {
    pool.spawnRect({
      pos: k.vec2(trailX, trailY),
      width: getRandomFloat(16, 30),
      height: 1.5,
      color: k.rgb(140, 240, 255),
      opacity: 0.75,
      z: 12,
      vel: k.vec2(isFacingRight ? -140 : 140, 0),
      fadeRate: 2.0,
      maxLife: 0.45,
    });
  } else {
    const trail = k.add([
      k.rect(getRandomFloat(16, 30), 1.5),
      k.pos(trailX, trailY),
      k.color(140, 240, 255),
      k.opacity(0.75),
      k.z(12),
    ]) as PlayerParticleGameObject;
    trail.onUpdate(() => {
      trail.pos.x -= (isFacingRight ? 140 : -140) * k.dt();
      if (typeof trail.opacity === "number") {
        trail.opacity -= k.dt() * 2.0;
        if (trail.opacity <= 0) k.destroy(trail);
      }
    });
  }
}

/**
 * Emite ondulações orgânicas na água (water ripples) geradas pelo deslocamento
 * de massa d'água da nadadeira caudal (flukes) durante o ciclo de batida.
 * Sem efeito de 'escapamento/hélice': são ondas de pressão translúcidas que se
 * expandem suavemente no local onde a cauda empurrou a água.
 */
export function spawnTailWaterRipples(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  angleDeg: number,
  isFacingRight: boolean,
  intensity: number = 1.0
) {
  const angleRad =
    typeof k.deg2rad === "function" ? k.deg2rad(angleDeg) : (angleDeg * Math.PI) / 180;
  // Posição exata das pontas da cauda (atrás do centro da baleia)
  const tailBaseOffset = k.vec2(isFacingRight ? -48 : 48, 2);
  const rotatedOffset = k.vec2(
    tailBaseOffset.x * Math.cos(angleRad) - tailBaseOffset.y * Math.sin(angleRad),
    tailBaseOffset.x * Math.sin(angleRad) + tailBaseOffset.y * Math.cos(angleRad)
  );
  const tailPos = addVec(k, pos, rotatedOffset);
  const pool = getParticlePool();

  // Emite 1 ondulação primária e, em impulsos mais fortes, uma secundária concêntrica
  const rippleCount = intensity > 1.15 ? 2 : 1;

  for (let i = 0; i < rippleCount; i++) {
    const initialRadius = 4 + i * 3;
    const growthRate = getRandomFloat(45, 60);
    const life = 0.35 + i * 0.08;
    // O centro da ondulação fica na água onde a cauda bateu, com quase nenhum arrasto artificial
    const ripplePos = addVec(
      k,
      tailPos,
      k.vec2((isFacingRight ? -1 : 1) * (i * 4), getRandomFloat(-1.5, 1.5))
    );
    const driftVel = k.vec2((isFacingRight ? -1 : 1) * (8 + i * 4), 0);
    // Tom ciano-aquático translúcido e suave
    const color = k.rgb(160, 235, 255);
    const opacity = 0.35 - i * 0.08;

    if (pool) {
      pool.spawnCircle({
        pos: ripplePos,
        radius: initialRadius,
        color,
        opacity,
        z: 13,
        vel: driftVel,
        growthRate,
        fadeRate: 0.95,
        maxLife: life,
      });
    } else {
      const ripple = k.add([
        k.circle(initialRadius),
        k.pos(ripplePos),
        k.color(color),
        k.opacity(opacity),
        k.z(13),
      ]) as PlayerParticleGameObject;

      let curLife = life;
      let curRadius = initialRadius;
      ripple.onUpdate(() => {
        const dt = k.dt();
        curRadius += growthRate * dt;
        ripple.radius = curRadius;
        ripple.pos = addVec(k, ripple.pos, driftVel.scale(dt));
        curLife -= dt;
        ripple.opacity = Math.max(0, (curLife / life) * opacity);
        if (curLife <= 0 || (typeof ripple.opacity === "number" && ripple.opacity <= 0)) {
          k.destroy(ripple);
        }
      });
    }
  }
}

/**
 * @deprecated Mantido para compatibilidade retroativa; redireciona para spawnTailWaterRipples.
 */
export function spawnTailBubbleTrail(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  angleDeg: number,
  isFacingRight: boolean,
  speedRatio: number
) {
  spawnTailWaterRipples(k, pos, angleDeg, isFacingRight, speedRatio);
}

export interface TailStrokeBubbleData {
  radius: number;
  offsetX: number;
  offsetY: number;
  velX: number;
  velY: number;
  life: number;
  color: [number, number, number];
  opacity: number;
}

/**
 * Função pura que calcula os parâmetros físicos das micro-bolhas de esforço caudal (Fase 31.2).
 */
export function calculateTailStrokeBubbleData(
  index: number,
  isFacingRight: boolean
): TailStrokeBubbleData {
  const dirX = isFacingRight ? -1 : 1;
  const radius = 2 + (index % 3) * 0.9; // 2.0 a 3.8px
  const velY = -20 - (index % 4) * 6.5; // -20 a -39.5 px/s (sobem lentamente)
  const velX = dirX * (14 + (index % 3) * 12);
  const life = 0.65 + (index % 3) * 0.15; // 0.65 a 0.95s

  return {
    radius,
    offsetX: dirX * (50 + (index % 3) * 4),
    offsetY: 2 + ((index * 3) % 7) - 3,
    velX,
    velY,
    life,
    color: [200, 230, 255],
    opacity: 0.5,
  };
}

/**
 * Rastro de Bolhas Caudal após Batida de Cauda (Fase 31.2):
 * A cada batida muscular, emite 5–8 micro-bolhas que sobem lentamente na esteira da cauda.
 */
export function spawnTailStrokeBubbles(
  k: PlayerParticlesEngineContext,
  pos: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean
) {
  const count = getRandomInteger(5, 8); // 5 a 8 partículas
  const pool = getParticlePool();

  for (let i = 0; i < count; i++) {
    const data = calculateTailStrokeBubbleData(i, isFacingRight);
    const bubblePos = k.vec2(pos.x + data.offsetX, pos.y + data.offsetY);
    const vel = k.vec2(data.velX, data.velY);
    const col = k.rgb(data.color[0], data.color[1], data.color[2]);

    if (pool) {
      pool.spawnCircle({
        pos: bubblePos,
        radius: data.radius,
        color: col,
        opacity: data.opacity,
        z: 13,
        vel,
        fadeRate: 1.1,
        maxLife: data.life,
        boundaryY: GAME_CONFIG.SEA_LEVEL,
        boundaryYMode: "less",
      });
    } else {
      const bubble = k.add([
        k.circle(data.radius),
        k.pos(bubblePos),
        k.color(col),
        k.opacity(data.opacity),
        k.z(13),
        "tail_stroke_bubble",
      ]) as PlayerParticleGameObject;

      let curLife = data.life;
      bubble.onUpdate(() => {
        const dt = k.dt();
        bubble.pos = addVec(k, bubble.pos, vel.scale(dt));
        curLife -= dt;
        bubble.opacity = Math.max(0, (curLife / data.life) * data.opacity);
        if (curLife <= 0 || bubble.pos.y <= GAME_CONFIG.SEA_LEVEL) {
          k.destroy(bubble);
        }
      });
    }
  }
}

export interface PectoralVortexData {
  radius: number;
  offsetX: number;
  offsetY: number;
  velX: number;
  velY: number;
  life: number;
  color: [number, number, number];
  opacity: number;
}

/**
 * Calcula dados dos micro-vórtices de ponta de nadadeira peitoral (Fase 40.5).
 */
export function calculatePectoralVortexData(
  index: number,
  isFacingRight: boolean,
  angularVelocity: number
): PectoralVortexData {
  const directionSign = isFacingRight ? 1 : -1;
  const turnDirection = Math.sign(angularVelocity);
  const radius = 1.2 + (index % 2) * 0.5;
  const offsetX = directionSign * (14 + index * 4);
  const offsetY = 12 + index * 3;
  // Vórtice é deslocado no sentido de reação da rotação vertical
  const velY = -turnDirection * (18 + index * 8);
  const velX = -directionSign * (10 + Math.abs(angularVelocity) * 0.15);
  const life = 0.35 + index * 0.1;

  return {
    radius,
    offsetX,
    offsetY,
    velX,
    velY,
    life,
    color: [190, 240, 255],
    opacity: 0.45,
  };
}

/**
 * Emite micro-vórtices translúcidos nas extremidades das nadadeiras peitorais durante curvas verticais (Fase 40.5).
 */
export function spawnPectoralTipVortices(
  k: PlayerParticlesEngineContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  pitchAngleInDegrees: number,
  isFacingRight: boolean,
  angularVelocity: number,
  customTipPosition?: StrictPlayerVector2D | PlayerVector2D
): void {
  const pool = getParticlePool();
  const particleCount = 2;
  const angleInRadians = (pitchAngleInDegrees * Math.PI) / 180;
  const cosAngle = Math.cos(angleInRadians);
  const sinAngle = Math.sin(angleInRadians);

  for (let index = 0; index < particleCount; index++) {
    const data = calculatePectoralVortexData(index, isFacingRight, angularVelocity);

    let spawnPosition: StrictPlayerVector2D;
    if (customTipPosition) {
      spawnPosition = k.vec2(
        customTipPosition.x + (index === 0 ? 0 : isFacingRight ? -4 : 4),
        customTipPosition.y + (index === 0 ? 0 : 2)
      );
    } else {
      // Rotaciona o offset relativo da ponta da nadadeira pelo ângulo de inclinação
      const rotatedOffsetX = data.offsetX * cosAngle - data.offsetY * sinAngle;
      const rotatedOffsetY = data.offsetX * sinAngle + data.offsetY * cosAngle;

      spawnPosition = k.vec2(whalePosition.x + rotatedOffsetX, whalePosition.y + rotatedOffsetY);
    }
    const velocity = k.vec2(data.velX, data.velY);
    const color = k.rgb(data.color[0], data.color[1], data.color[2]);

    if (pool) {
      pool.spawnCircle({
        pos: spawnPosition,
        radius: data.radius,
        color,
        opacity: data.opacity,
        z: 14,
        vel: velocity,
        fadeRate: 1.2,
        maxLife: data.life,
        boundaryY: GAME_CONFIG.SEA_LEVEL,
        boundaryYMode: "less",
      });
    }
  }
}

import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { getParticlePool } from "../../systems/particlePool";

export function spawnOilSpout(k: KaboomCtx, pos: Vec2, isFacingRight: boolean, hSpeed: number) {
  audioSystem.playOilChoke();
  const spoutOrigin = pos.add(k.vec2(isFacingRight ? 22 : -22, -13));
  const pool = getParticlePool();

  for (let i = 0; i < 24; i++) {
    const spread = (Math.random() - 0.5) * 0.35;
    const speed = 110 + Math.random() * 90;
    const dir = k.vec2(Math.cos(-Math.PI / 2 + spread), Math.sin(-Math.PI / 2 + spread));
    let vel = dir.scale(speed);
    vel.x += hSpeed * 0.2;
    const pPos = k.vec2(spoutOrigin.x + (Math.random() - 0.5) * 6, spoutOrigin.y);
    const radius = 1.8 + Math.random() * 2.2;
    let life = 0.55 + Math.random() * 0.35;

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
      ]);

      const maxLife = life;
      p.onUpdate(() => {
        const dt = k.dt();
        vel.y += 280 * dt;
        p.pos = p.pos.add(vel.scale(dt));
        life -= dt;
        p.opacity = Math.max(0, (life / maxLife) * 0.9);
        if (life <= 0) k.destroy(p);
      });
    }
  }
}

export function spawnPurifyBubbles(k: KaboomCtx, pos: Vec2) {
  const pool = getParticlePool();
  for (let i = 0; i < 35; i++) {
    const pPos = k.vec2(pos.x + (Math.random() - 0.5) * 40, pos.y + (Math.random() - 0.5) * 20);
    const radius = 2.0 + Math.random() * 2.5;
    const bLife = 0.8 + Math.random() * 0.5;
    const vy = -60 - Math.random() * 80;

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
      ]);
      let lifeRemaining = bLife;
      b.onUpdate(() => {
        const dt = k.dt();
        b.pos.y += vy * dt;
        lifeRemaining -= dt;
        b.opacity -= dt * 0.9;
        if (lifeRemaining <= 0 || b.opacity <= 0) k.destroy(b);
      });
    }
  }
}

export function spawnBlowholeSpout(k: KaboomCtx, pos: Vec2, isFacingRight: boolean, hSpeed: number) {
  audioSystem.playBlowholeSpout();

  const spoutOrigin = pos.add(k.vec2(isFacingRight ? 22 : -22, -13));
  const pool = getParticlePool();

  // 32 partículas de condensação e vapor marinho em formato de V
  for (let i = 0; i < 32; i++) {
    const isRightPlume = i % 2 === 0;
    // Ângulos das duas plumas em V: esquerda ~ -98° (-1.71 rad), direita ~ -82° (-1.43 rad)
    const baseAngle = isRightPlume ? -1.45 : -1.69;
    const spread = (Math.random() - 0.5) * 0.22;
    const speed = 190 + Math.random() * 170;
    const dir = k.vec2(Math.cos(baseAngle + spread), Math.sin(baseAngle + spread));

    let vel = dir.scale(speed);
    vel.x += hSpeed * 0.35; // herda parte do movimento horizontal da baleia

    const pPos = k.vec2(spoutOrigin.x + (Math.random() - 0.5) * 6, spoutOrigin.y);
    const radius = 1.8 + Math.random() * 2.2;
    const life = 0.65 + Math.random() * 0.45;

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
      ]);

      const maxLife = life;
      let curLife = life;

      particle.onUpdate(() => {
        const dt = k.dt();
        vel.y += 240 * dt; // gravidade puxando gotículas de volta ao mar
        particle.pos = particle.pos.add(vel.scale(dt));
        particle.radius += dt * 3.2; // expansão de vapor
        curLife -= dt;
        particle.opacity = Math.max(0, (curLife / maxLife) * 0.85);

        if (curLife <= 0 || particle.pos.y > GAME_CONFIG.SEA_LEVEL + 35) {
          k.destroy(particle);
        }
      });
    }
  }
}

export function spawnBaleenSuction(k: KaboomCtx, pos: Vec2, isFacingRight: boolean) {
  const mouthPos = pos.add(k.vec2(isFacingRight ? 46 : -46, 2));
  const pool = getParticlePool();

  for (let i = 0; i < 12; i++) {
    const pAngle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 24;
    const pPos = k.vec2(mouthPos.x + Math.cos(pAngle) * dist, mouthPos.y + Math.sin(pAngle) * dist);
    const radius = 1.2 + Math.random() * 1.5;

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
      ]);

      p.onUpdate(() => {
        const toMouth = mouthPos.sub(p.pos);
        if (toMouth.len() < 6) {
          k.destroy(p);
        } else {
          p.pos = p.pos.add(toMouth.unit().scale(190 * k.dt()));
          p.opacity -= k.dt() * 2.4;
          if (p.opacity <= 0) k.destroy(p);
        }
      });
    }
  }
}

export function spawnDraftingTrail(k: KaboomCtx, pos: Vec2, isFacingRight: boolean) {
  const trailX = pos.x + (isFacingRight ? -42 : 42);
  const trailY = pos.y + (Math.random() - 0.5) * 18;
  const pool = getParticlePool();

  if (pool) {
    pool.spawnRect({
      pos: k.vec2(trailX, trailY),
      width: 16 + Math.random() * 14,
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
      k.rect(16 + Math.random() * 14, 1.5),
      k.pos(trailX, trailY),
      k.color(140, 240, 255),
      k.opacity(0.75),
      k.z(12),
    ]);
    trail.onUpdate(() => {
      trail.pos.x -= (isFacingRight ? 140 : -140) * k.dt();
      trail.opacity -= k.dt() * 2.0;
      if (trail.opacity <= 0) k.destroy(trail);
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
  k: KaboomCtx,
  pos: Vec2,
  angleDeg: number,
  isFacingRight: boolean,
  intensity: number = 1.0
) {
  const angleRad = k.deg2rad(angleDeg);
  // Posição exata das pontas da cauda (atrás do centro da baleia)
  const tailBaseOffset = k.vec2(isFacingRight ? -48 : 48, 2);
  const rotatedOffset = k.vec2(
    tailBaseOffset.x * Math.cos(angleRad) - tailBaseOffset.y * Math.sin(angleRad),
    tailBaseOffset.x * Math.sin(angleRad) + tailBaseOffset.y * Math.cos(angleRad)
  );
  const tailPos = pos.add(rotatedOffset);
  const pool = getParticlePool();

  // Emite 1 ondulação primária e, em impulsos mais fortes, uma secundária concêntrica
  const rippleCount = intensity > 1.15 ? 2 : 1;

  for (let i = 0; i < rippleCount; i++) {
    const initialRadius = 4 + i * 3;
    const growthRate = 45 + Math.random() * 15;
    const life = 0.35 + i * 0.08;
    // O centro da ondulação fica na água onde a cauda bateu, com quase nenhum arrasto artificial
    const ripplePos = tailPos.add(k.vec2(
      (isFacingRight ? -1 : 1) * (i * 4),
      (Math.random() - 0.5) * 3
    ));
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
      ]);

      let curLife = life;
      let curRadius = initialRadius;
      ripple.onUpdate(() => {
        const dt = k.dt();
        curRadius += growthRate * dt;
        ripple.radius = curRadius;
        ripple.pos = ripple.pos.add(driftVel.scale(dt));
        curLife -= dt;
        ripple.opacity = Math.max(0, (curLife / life) * opacity);
        if (curLife <= 0 || ripple.opacity <= 0) {
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
  k: KaboomCtx,
  pos: Vec2,
  angleDeg: number,
  isFacingRight: boolean,
  speedRatio: number
) {
  spawnTailWaterRipples(k, pos, angleDeg, isFacingRight, speedRatio);
}



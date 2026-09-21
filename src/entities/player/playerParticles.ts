import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";

export function spawnOilSpout(k: KaboomCtx, pos: Vec2, isFacingRight: boolean, hSpeed: number) {
  audioSystem.playOilChoke();
  const spoutOrigin = pos.add(k.vec2(isFacingRight ? 22 : -22, -13));

  for (let i = 0; i < 24; i++) {
    const spread = (Math.random() - 0.5) * 0.35;
    const speed = 110 + Math.random() * 90;
    const dir = k.vec2(Math.cos(-Math.PI / 2 + spread), Math.sin(-Math.PI / 2 + spread));
    let vel = dir.scale(speed);
    vel.x += hSpeed * 0.2;

    const p = k.add([
      k.circle(1.8 + Math.random() * 2.2),
      k.pos(spoutOrigin.x + (Math.random() - 0.5) * 6, spoutOrigin.y),
      k.color(30, 22, 16), // lodo negro oleoso
      k.opacity(0.9),
      k.z(15),
    ]);

    let life = 0.55 + Math.random() * 0.35;
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

export function spawnPurifyBubbles(k: KaboomCtx, pos: Vec2) {
  for (let i = 0; i < 35; i++) {
    const b = k.add([
      k.circle(2.0 + Math.random() * 2.5),
      k.pos(pos.x + (Math.random() - 0.5) * 40, pos.y + (Math.random() - 0.5) * 20),
      k.color(180, 240, 255),
      k.opacity(0.85),
      k.z(16),
    ]);
    let bLife = 0.8 + Math.random() * 0.5;
    const vy = -60 - Math.random() * 80;
    b.onUpdate(() => {
      const dt = k.dt();
      b.pos.y += vy * dt;
      bLife -= dt;
      b.opacity -= dt * 0.9;
      if (bLife <= 0 || b.opacity <= 0) k.destroy(b);
    });
  }
}

export function spawnBlowholeSpout(k: KaboomCtx, pos: Vec2, isFacingRight: boolean, hSpeed: number) {
  audioSystem.playBlowholeSpout();

  const spoutOrigin = pos.add(k.vec2(isFacingRight ? 22 : -22, -13));

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

    const particle = k.add([
      k.circle(1.8 + Math.random() * 2.2),
      k.pos(spoutOrigin.x + (Math.random() - 0.5) * 6, spoutOrigin.y),
      k.color(225, 242, 255),
      k.opacity(0.85),
      k.z(15),
    ]);

    let life = 0.65 + Math.random() * 0.45;
    const maxLife = life;

    particle.onUpdate(() => {
      const dt = k.dt();
      vel.y += 240 * dt; // gravidade puxando gotículas de volta ao mar
      particle.pos = particle.pos.add(vel.scale(dt));
      particle.radius += dt * 3.2; // expansão de vapor
      life -= dt;
      particle.opacity = Math.max(0, (life / maxLife) * 0.85);

      if (life <= 0 || particle.pos.y > GAME_CONFIG.SEA_LEVEL + 35) {
        k.destroy(particle);
      }
    });
  }
}

export function spawnBaleenSuction(k: KaboomCtx, pos: Vec2, isFacingRight: boolean) {
  const mouthPos = pos.add(k.vec2(isFacingRight ? 46 : -46, 2));
  for (let i = 0; i < 12; i++) {
    const pAngle = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 24;
    const p = k.add([
      k.circle(1.2 + Math.random() * 1.5),
      k.pos(mouthPos.x + Math.cos(pAngle) * dist, mouthPos.y + Math.sin(pAngle) * dist),
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

export function spawnDraftingTrail(k: KaboomCtx, pos: Vec2, isFacingRight: boolean) {
  const trailX = pos.x + (isFacingRight ? -42 : 42);
  const trailY = pos.y + (Math.random() - 0.5) * 18;
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

/**
 * Emite rastro de micro-bolhas dinâmicas partindo da cauda (flukes) durante a propulsão.
 * A intensidade e tamanho das bolhas são proporcionais à velocidade instantânea.
 */
export function spawnTailBubbleTrail(
  k: KaboomCtx,
  pos: Vec2,
  angleDeg: number,
  isFacingRight: boolean,
  speedRatio: number
) {
  if (speedRatio <= 0.08) return;

  const count = Math.min(4, Math.max(1, Math.round(speedRatio * 3)));
  const angleRad = k.deg2rad(angleDeg);
  // Posição da cauda (atrás do centro da baleia)
  const tailBaseOffset = k.vec2(isFacingRight ? -46 : 46, 2);
  const rotatedOffset = k.vec2(
    tailBaseOffset.x * Math.cos(angleRad) - tailBaseOffset.y * Math.sin(angleRad),
    tailBaseOffset.x * Math.sin(angleRad) + tailBaseOffset.y * Math.cos(angleRad)
  );
  const tailPos = pos.add(rotatedOffset);

  for (let i = 0; i < count; i++) {
    const radius = 1.6 + Math.random() * (1.8 * Math.min(1.2, speedRatio));
    const bubble = k.add([
      k.circle(radius),
      k.pos(
        tailPos.x + (Math.random() - 0.5) * 8,
        tailPos.y + (Math.random() - 0.5) * 10
      ),
      k.color(k.choose([k.rgb(190, 240, 255), k.rgb(220, 250, 255), k.rgb(150, 225, 245)])),
      k.opacity(0.65 + Math.random() * 0.25),
      k.z(13),
    ]);

    let life = 0.45 + Math.random() * 0.4;
    const maxLife = life;
    const driftX = (isFacingRight ? -1 : 1) * (20 + Math.random() * 35 * speedRatio);
    const riseY = -25 - Math.random() * 35;
    let sway = Math.random() * Math.PI * 2;

    bubble.onUpdate(() => {
      const dt = k.dt();
      sway += dt * 4;
      bubble.pos.x += (driftX + Math.sin(sway) * 8) * dt;
      bubble.pos.y += riseY * dt;
      life -= dt;
      bubble.opacity = Math.max(0, (life / maxLife) * 0.8);
      if (life <= 0 || bubble.opacity <= 0) {
        k.destroy(bubble);
      }
    });
  }
}


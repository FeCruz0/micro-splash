import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";

export interface MarineSnowFlake {
  obj: GameObj;
  relX: number;
  y: number;
  fallSpeed: number;
  driftSpeed: number;
  driftPhase: number;
  baseOpacity: number;
}

export const MARINE_SNOW_CONFIG = {
  MIN_DISTANCE: 5000,
  MAX_DISTANCE: 12000,
  PARTICLE_COUNT: 16,
  BASE_COLOR: [120, 140, 160] as [number, number, number],
  FALL_SPEED_MIN: 10,
  FALL_SPEED_MAX: 22,
  BASE_OPACITY: 0.32,
};

/**
 * Função pura que calcula o deslocamento vertical e oscilação horizontal
 * de uma partícula de Neve Marinha (Marine Snow).
 */
export function updateSnowParticlePosition(
  currentY: number,
  fallSpeed: number,
  dt: number,
  time: number,
  driftSpeed: number,
  driftPhase: number,
  minY: number,
  maxY: number
): { y: number; driftOffset: number } {
  let nextY = currentY + fallSpeed * dt;
  if (nextY > maxY) {
    nextY = minY + (nextY - maxY);
  }
  const driftOffset = Math.sin(time * driftSpeed + driftPhase) * 6;
  return { y: nextY, driftOffset };
}

/**
 * Sistema de Neve Marinha Abissal (Fase 30.3):
 * Gera micro-sedimentos orgânicos (Marine Snow) que precipitam lentamente
 * pelas profundezas da Travessia Pelágica (5.000m a 12.000m).
 */
export function setupMarineSnowSystem(k: KaboomCtx) {
  const particles: MarineSnowFlake[] = [];
  const screenW = k.width();
  const screenH = k.height();
  const minY = GAME_CONFIG.SEA_LEVEL + 40;
  const maxY = screenH - 45;

  for (let i = 0; i < MARINE_SNOW_CONFIG.PARTICLE_COUNT; i++) {
    const radius = 1 + (i % 2) * 0.8; // 1.0px a 1.8px
    const initialY =
      minY + (i / MARINE_SNOW_CONFIG.PARTICLE_COUNT) * (maxY - minY) + ((i * 17) % 30);
    const relX = (i / MARINE_SNOW_CONFIG.PARTICLE_COUNT) * screenW;
    const baseOpacity = 0.22 + (i % 3) * 0.05; // 0.22 a 0.32

    const obj = k.add([
      k.circle(radius),
      k.pos(0, initialY),
      k.color(
        MARINE_SNOW_CONFIG.BASE_COLOR[0],
        MARINE_SNOW_CONFIG.BASE_COLOR[1],
        MARINE_SNOW_CONFIG.BASE_COLOR[2]
      ),
      k.opacity(baseOpacity),
      k.z(-1),
      "marine_snow_particle",
    ]);

    particles.push({
      obj,
      relX,
      y: initialY,
      fallSpeed:
        MARINE_SNOW_CONFIG.FALL_SPEED_MIN +
        (i % 5) * ((MARINE_SNOW_CONFIG.FALL_SPEED_MAX - MARINE_SNOW_CONFIG.FALL_SPEED_MIN) / 4),
      driftSpeed: 0.6 + (i % 4) * 0.25,
      driftPhase: i * 0.9,
      baseOpacity,
    });
  }

  let time = 0;

  k.onUpdate(() => {
    const dt = k.dt();
    time += dt;
    const camX = k.camPos().x;
    const screenLeft = camX - screenW / 2;

    // Ativo apenas na Travessia Pelágica (5.000m a 12.000m) com transição suave nas bordas
    const isInPelagic =
      camX >= MARINE_SNOW_CONFIG.MIN_DISTANCE - 400 &&
      camX <= MARINE_SNOW_CONFIG.MAX_DISTANCE + 400;

    if (!isInPelagic) {
      particles.forEach((p) => {
        p.obj.hidden = true;
      });
      return;
    }

    // Fator de suavização (fade-in / fade-out) nas fronteiras do bioma
    let fadeFactor = 1;
    if (camX < MARINE_SNOW_CONFIG.MIN_DISTANCE) {
      fadeFactor = Math.max(0, (camX - (MARINE_SNOW_CONFIG.MIN_DISTANCE - 400)) / 400);
    } else if (camX > MARINE_SNOW_CONFIG.MAX_DISTANCE) {
      fadeFactor = Math.max(0, (MARINE_SNOW_CONFIG.MAX_DISTANCE + 400 - camX) / 400);
    }

    particles.forEach((p) => {
      p.obj.hidden = false;
      const { y, driftOffset } = updateSnowParticlePosition(
        p.y,
        p.fallSpeed,
        dt,
        time,
        p.driftSpeed,
        p.driftPhase,
        minY,
        maxY
      );
      p.y = y;
      p.obj.pos.x = screenLeft + p.relX + driftOffset;
      p.obj.pos.y = p.y;
      p.obj.opacity = p.baseOpacity * fadeFactor;
    });
  });
}

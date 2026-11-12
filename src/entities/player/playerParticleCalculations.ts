import type { PlayerVector2D, StrictPlayerVector2D } from "./types";

export interface PlayerParticleVectorHelperContext {
  vec2?(coordinateX: number, coordinateY: number): StrictPlayerVector2D;
  rgb?(redChannel: number, greenChannel: number, blueChannel: number): unknown;
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

export function resolveParticleColorValue(
  engineContext: PlayerParticleVectorHelperContext,
  redChannel: number,
  greenChannel: number,
  blueChannel: number
): unknown {
  return typeof engineContext.rgb === "function"
    ? engineContext.rgb(redChannel, greenChannel, blueChannel)
    : [redChannel, greenChannel, blueChannel];
}

export function createSafePlayerVector2D(
  engineContext: PlayerParticleVectorHelperContext,
  coordinateX: number,
  coordinateY: number
): StrictPlayerVector2D {
  if (typeof engineContext.vec2 === "function") {
    return engineContext.vec2(coordinateX, coordinateY);
  }
  return {
    x: coordinateX,
    y: coordinateY,
    add: (otherVector: PlayerVector2D) =>
      createSafePlayerVector2D(
        engineContext,
        coordinateX + otherVector.x,
        coordinateY + otherVector.y
      ),
    sub: (otherVector: PlayerVector2D) =>
      createSafePlayerVector2D(
        engineContext,
        coordinateX - otherVector.x,
        coordinateY - otherVector.y
      ),
    scale: (scaleFactor: number) =>
      createSafePlayerVector2D(engineContext, coordinateX * scaleFactor, coordinateY * scaleFactor),
    unit: () => {
      const vectorLength = Math.hypot(coordinateX, coordinateY) || 1;
      return createSafePlayerVector2D(
        engineContext,
        coordinateX / vectorLength,
        coordinateY / vectorLength
      );
    },
    dist: (otherVector: PlayerVector2D) =>
      Math.hypot(coordinateX - otherVector.x, coordinateY - otherVector.y),
    len: () => Math.hypot(coordinateX, coordinateY),
  };
}

export function addPlayerVector2D(
  engineContext: PlayerParticleVectorHelperContext,
  firstVector: StrictPlayerVector2D | PlayerVector2D,
  secondVector: StrictPlayerVector2D | PlayerVector2D
): StrictPlayerVector2D {
  return typeof firstVector.add === "function"
    ? (firstVector.add(secondVector as PlayerVector2D) as StrictPlayerVector2D)
    : createSafePlayerVector2D(
        engineContext,
        firstVector.x + secondVector.x,
        firstVector.y + secondVector.y
      );
}

/**
 * Função pura que calcula os parâmetros físicos das micro-bolhas de esforço caudal (Fase 31.2).
 */
export function calculateTailStrokeBubbleData(
  particleIndex: number,
  isFacingRight: boolean
): TailStrokeBubbleData {
  const directionSign = isFacingRight ? -1 : 1;
  const radius = 2 + (particleIndex % 3) * 0.9; // 2.0 a 3.8px
  const verticalVelocity = -20 - (particleIndex % 4) * 6.5; // -20 a -39.5 px/s (sobem lentamente)
  const horizontalVelocity = directionSign * (14 + (particleIndex % 3) * 12);
  const lifeDurationSeconds = 0.65 + (particleIndex % 3) * 0.15; // 0.65 a 0.95s

  return {
    radius,
    offsetX: directionSign * (50 + (particleIndex % 3) * 4),
    offsetY: 2 + ((particleIndex * 3) % 7) - 3,
    velX: horizontalVelocity,
    velY: verticalVelocity,
    life: lifeDurationSeconds,
    color: [200, 230, 255],
    opacity: 0.5,
  };
}

/**
 * Calcula dados dos micro-vórtices de ponta de nadadeira peitoral (Fase 40.5).
 */
export function calculatePectoralVortexData(
  particleIndex: number,
  isFacingRight: boolean,
  angularVelocity: number
): PectoralVortexData {
  const directionSign = isFacingRight ? 1 : -1;
  const turnDirection = Math.sign(angularVelocity);
  const radius = 1.2 + (particleIndex % 2) * 0.5;
  const offsetX = directionSign * (14 + particleIndex * 4);
  const offsetY = 12 + particleIndex * 3;
  // Vórtice é deslocado no sentido de reação da rotação vertical
  const verticalVelocity = -turnDirection * (18 + particleIndex * 8);
  const horizontalVelocity = -directionSign * (10 + Math.abs(angularVelocity) * 0.15);
  const lifeDurationSeconds = 0.35 + particleIndex * 0.1;

  return {
    radius,
    offsetX,
    offsetY,
    velX: horizontalVelocity,
    velY: verticalVelocity,
    life: lifeDurationSeconds,
    color: [190, 240, 255],
    opacity: 0.45,
  };
}

import { GAME_CONFIG } from "../../config";
import { getRandomFloat, getRandomInteger } from "../../utils/random";
import { getParticlePool } from "../../systems/particlePool";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";
import {
  addPlayerVector2D,
  calculatePectoralVortexData,
  calculateTailStrokeBubbleData,
  createSafePlayerVector2D,
  resolveParticleColorValue,
  type PlayerParticleVectorHelperContext,
} from "./playerParticleCalculations";
import {
  spawnNativeManagedParticleNode,
  type NativeEntityParticleContext,
} from "./playerParticleNodeSpawner";

/**
 * Emite ondulações orgânicas na água (water ripples) geradas pelo deslocamento
 * de massa d'água da nadadeira caudal (flukes) durante o ciclo de batida.
 */
export function spawnTailWaterRipples(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  angleInDegrees: number,
  isFacingRight: boolean,
  intensity: number = 1.0
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext & {
    deg2rad?(degrees: number): number;
  };
  const angleInRadians =
    typeof helperContext.deg2rad === "function"
      ? helperContext.deg2rad(angleInDegrees)
      : (angleInDegrees * Math.PI) / 180;

  const tailBaseOffset = createSafePlayerVector2D(helperContext, isFacingRight ? -48 : 48, 2);
  const rotatedOffset = createSafePlayerVector2D(
    helperContext,
    tailBaseOffset.x * Math.cos(angleInRadians) - tailBaseOffset.y * Math.sin(angleInRadians),
    tailBaseOffset.x * Math.sin(angleInRadians) + tailBaseOffset.y * Math.cos(angleInRadians)
  );
  const tailWorldPosition = addPlayerVector2D(helperContext, whalePosition, rotatedOffset);
  const particlePool = getParticlePool();

  const rippleCount = intensity > 1.15 ? 2 : 1;

  for (let rippleIndex = 0; rippleIndex < rippleCount; rippleIndex++) {
    const initialRadius = 4 + rippleIndex * 3;
    const growthRate = getRandomFloat(45, 60);
    const totalLifeSeconds = 0.35 + rippleIndex * 0.08;
    const ripplePosition = addPlayerVector2D(
      helperContext,
      tailWorldPosition,
      createSafePlayerVector2D(
        helperContext,
        (isFacingRight ? -1 : 1) * (rippleIndex * 4),
        getRandomFloat(-1.5, 1.5)
      )
    );
    const driftVelocity = createSafePlayerVector2D(
      helperContext,
      (isFacingRight ? -1 : 1) * (8 + rippleIndex * 4),
      0
    );
    const rippleColor = resolveParticleColorValue(helperContext, 160, 235, 255);
    const baseOpacity = 0.35 - rippleIndex * 0.08;

    if (particlePool) {
      particlePool.spawnCircle({
        pos: ripplePosition,
        radius: initialRadius,
        color: rippleColor,
        opacity: baseOpacity,
        z: 13,
        vel: driftVelocity,
        growthRate,
        fadeRate: 0.95,
        maxLife: totalLifeSeconds,
      });
    } else {
      let remainingLifeSeconds = totalLifeSeconds;
      let currentRadius = initialRadius;
      spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
        identifier: "player_tail_water_ripple",
        shape: "circle",
        radius: initialRadius,
        position: ripplePosition,
        rgb: [160, 235, 255],
        opacity: baseOpacity,
        zIndex: 13,
        onFrame: (rippleNode, deltaTimeInSeconds, destroySelf) => {
          currentRadius += growthRate * deltaTimeInSeconds;
          rippleNode.radius = currentRadius;
          rippleNode.pos.x += driftVelocity.x * deltaTimeInSeconds;
          rippleNode.pos.y += driftVelocity.y * deltaTimeInSeconds;
          remainingLifeSeconds -= deltaTimeInSeconds;
          rippleNode.opacity = Math.max(0, (remainingLifeSeconds / totalLifeSeconds) * baseOpacity);
          if (
            remainingLifeSeconds <= 0 ||
            (typeof rippleNode.opacity === "number" && rippleNode.opacity <= 0)
          ) {
            destroySelf();
          }
        },
      });
    }
  }
}

/**
 * @deprecated Mantido para compatibilidade retroativa; redireciona para spawnTailWaterRipples.
 */
export function spawnTailBubbleTrail(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  angleInDegrees: number,
  isFacingRight: boolean,
  speedRatio: number
): void {
  spawnTailWaterRipples(
    optimizedEntityRenderingContext,
    whalePosition,
    angleInDegrees,
    isFacingRight,
    speedRatio
  );
}

/**
 * Rastro de Bolhas Caudal após Batida de Cauda (Fase 31.2):
 * A cada batida muscular, emite 5–8 micro-bolhas que sobem lentamente na esteira da cauda.
 */
export function spawnTailStrokeBubbles(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  const bubbleCount = getRandomInteger(5, 8);
  const particlePool = getParticlePool();

  for (let bubbleIndex = 0; bubbleIndex < bubbleCount; bubbleIndex++) {
    const bubbleData = calculateTailStrokeBubbleData(bubbleIndex, isFacingRight);
    const bubblePosition = createSafePlayerVector2D(
      helperContext,
      whalePosition.x + bubbleData.offsetX,
      whalePosition.y + bubbleData.offsetY
    );
    const bubbleVelocity = createSafePlayerVector2D(
      helperContext,
      bubbleData.velX,
      bubbleData.velY
    );
    const bubbleColor = resolveParticleColorValue(
      helperContext,
      bubbleData.color[0],
      bubbleData.color[1],
      bubbleData.color[2]
    );

    if (particlePool) {
      particlePool.spawnCircle({
        pos: bubblePosition,
        radius: bubbleData.radius,
        color: bubbleColor,
        opacity: bubbleData.opacity,
        z: 13,
        vel: bubbleVelocity,
        fadeRate: 1.1,
        maxLife: bubbleData.life,
        boundaryY: GAME_CONFIG.SEA_LEVEL,
        boundaryYMode: "less",
      });
    } else {
      let remainingLifeSeconds = bubbleData.life;
      spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
        identifier: "player_tail_stroke_bubble",
        shape: "circle",
        radius: bubbleData.radius,
        position: bubblePosition,
        rgb: bubbleData.color,
        opacity: bubbleData.opacity,
        zIndex: 13,
        tags: ["tail_stroke_bubble"],
        onFrame: (bubbleNode, deltaTimeInSeconds, destroySelf) => {
          bubbleNode.pos.x += bubbleVelocity.x * deltaTimeInSeconds;
          bubbleNode.pos.y += bubbleVelocity.y * deltaTimeInSeconds;
          remainingLifeSeconds -= deltaTimeInSeconds;
          bubbleNode.opacity = Math.max(
            0,
            (remainingLifeSeconds / bubbleData.life) * bubbleData.opacity
          );
          if (remainingLifeSeconds <= 0 || bubbleNode.pos.y <= GAME_CONFIG.SEA_LEVEL) {
            destroySelf();
          }
        },
      });
    }
  }
}

/**
 * Emite micro-vórtices translúcidos nas extremidades das nadadeiras peitorais durante curvas verticais (Fase 40.5).
 */
export function spawnPectoralTipVortices(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  pitchAngleInDegrees: number,
  isFacingRight: boolean,
  angularVelocity: number,
  customTipPosition?: StrictPlayerVector2D | PlayerVector2D
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  const particlePool = getParticlePool();
  const particleCount = 2;
  const angleInRadians = (pitchAngleInDegrees * Math.PI) / 180;
  const cosineAngle = Math.cos(angleInRadians);
  const sineAngle = Math.sin(angleInRadians);

  for (let particleIndex = 0; particleIndex < particleCount; particleIndex++) {
    const vortexData = calculatePectoralVortexData(particleIndex, isFacingRight, angularVelocity);

    let spawnPosition: StrictPlayerVector2D;
    if (customTipPosition) {
      spawnPosition = createSafePlayerVector2D(
        helperContext,
        customTipPosition.x + (particleIndex === 0 ? 0 : isFacingRight ? -4 : 4),
        customTipPosition.y + (particleIndex === 0 ? 0 : 2)
      );
    } else {
      const rotatedOffsetX = vortexData.offsetX * cosineAngle - vortexData.offsetY * sineAngle;
      const rotatedOffsetY = vortexData.offsetX * sineAngle + vortexData.offsetY * cosineAngle;

      spawnPosition = createSafePlayerVector2D(
        helperContext,
        whalePosition.x + rotatedOffsetX,
        whalePosition.y + rotatedOffsetY
      );
    }
    const vortexVelocity = createSafePlayerVector2D(
      helperContext,
      vortexData.velX,
      vortexData.velY
    );
    const vortexColor = resolveParticleColorValue(
      helperContext,
      vortexData.color[0],
      vortexData.color[1],
      vortexData.color[2]
    );

    if (particlePool) {
      particlePool.spawnCircle({
        pos: spawnPosition,
        radius: vortexData.radius,
        color: vortexColor,
        opacity: vortexData.opacity,
        z: 14,
        vel: vortexVelocity,
        fadeRate: 1.2,
        maxLife: vortexData.life,
        boundaryY: GAME_CONFIG.SEA_LEVEL,
        boundaryYMode: "less",
      });
    }
  }
}

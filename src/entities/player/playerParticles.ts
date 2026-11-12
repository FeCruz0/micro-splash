import { GAME_CONFIG } from "../../config";
import { getRandomFloat } from "../../utils/random";
import { audioSystem } from "../../systems/audioSystem";
import { getParticlePool } from "../../systems/particlePool";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";
import {
  addPlayerVector2D,
  calculatePectoralVortexData,
  calculateTailStrokeBubbleData,
  createSafePlayerVector2D,
  resolveParticleColorValue,
  type PectoralVortexData,
  type PlayerParticleVectorHelperContext,
  type TailStrokeBubbleData,
} from "./playerParticleCalculations";
import {
  spawnNativeManagedParticleNode,
  type NativeEntityParticleContext,
  type PlayerParticleGameObject,
  type PlayerParticlesEngineContext,
} from "./playerParticleNodeSpawner";
import {
  spawnPectoralTipVortices,
  spawnTailBubbleTrail,
  spawnTailStrokeBubbles,
  spawnTailWaterRipples,
} from "./playerTailAndVortexParticles";

export type {
  NativeEntityParticleContext,
  PectoralVortexData,
  PlayerParticleGameObject,
  PlayerParticlesEngineContext,
  TailStrokeBubbleData,
};

export {
  calculatePectoralVortexData,
  calculateTailStrokeBubbleData,
  spawnPectoralTipVortices,
  spawnTailBubbleTrail,
  spawnTailStrokeBubbles,
  spawnTailWaterRipples,
};

export function spawnOilSpout(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean,
  horizontalSpeed: number
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  audioSystem.playOilChoke();
  const spoutOrigin = addPlayerVector2D(
    helperContext,
    whalePosition,
    createSafePlayerVector2D(helperContext, isFacingRight ? 22 : -22, -13)
  );
  const particlePool = getParticlePool();

  for (let particleIndex = 0; particleIndex < 24; particleIndex++) {
    const spreadRadians = getRandomFloat(-0.175, 0.175);
    const ejectionSpeed = getRandomFloat(110, 200);
    const ejectionDirection = createSafePlayerVector2D(
      helperContext,
      Math.cos(-Math.PI / 2 + spreadRadians),
      Math.sin(-Math.PI / 2 + spreadRadians)
    );
    const particleVelocity = ejectionDirection.scale(ejectionSpeed);
    particleVelocity.x += horizontalSpeed * 0.2;
    const spawnPosition = createSafePlayerVector2D(
      helperContext,
      spoutOrigin.x + getRandomFloat(-3, 3),
      spoutOrigin.y
    );
    const radius = getRandomFloat(1.8, 4.0);
    let remainingLifeSeconds = getRandomFloat(0.55, 0.9);

    if (particlePool) {
      particlePool.spawnCircle({
        pos: spawnPosition,
        radius,
        color: resolveParticleColorValue(helperContext, 30, 22, 16),
        opacity: 0.9,
        z: 15,
        vel: particleVelocity,
        gravityY: 280,
        maxLife: remainingLifeSeconds,
      });
    } else {
      const totalLifeSeconds = remainingLifeSeconds;
      spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
        identifier: "player_oil_spout_particle",
        shape: "circle",
        radius,
        position: spawnPosition,
        rgb: [30, 22, 16],
        opacity: 0.9,
        zIndex: 15,
        onFrame: (particleNode, deltaTimeInSeconds, destroySelf) => {
          particleVelocity.y += 280 * deltaTimeInSeconds;
          particleNode.pos.x += particleVelocity.x * deltaTimeInSeconds;
          particleNode.pos.y += particleVelocity.y * deltaTimeInSeconds;
          remainingLifeSeconds -= deltaTimeInSeconds;
          particleNode.opacity = Math.max(0, (remainingLifeSeconds / totalLifeSeconds) * 0.9);
          if (remainingLifeSeconds <= 0) destroySelf();
        },
      });
    }
  }
}

export function spawnPurifyBubbles(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  const particlePool = getParticlePool();

  for (let bubbleIndex = 0; bubbleIndex < 35; bubbleIndex++) {
    const bubblePosition = createSafePlayerVector2D(
      helperContext,
      whalePosition.x + getRandomFloat(-20, 20),
      whalePosition.y + getRandomFloat(-10, 10)
    );
    const radius = getRandomFloat(2.0, 4.5);
    const bubbleLifeSeconds = getRandomFloat(0.8, 1.3);
    const verticalVelocity = getRandomFloat(-140, -60);

    if (particlePool) {
      particlePool.spawnCircle({
        pos: bubblePosition,
        radius,
        color: resolveParticleColorValue(helperContext, 180, 240, 255),
        opacity: 0.85,
        z: 16,
        vel: createSafePlayerVector2D(helperContext, 0, verticalVelocity),
        fadeRate: 0.9,
        maxLife: bubbleLifeSeconds,
      });
    } else {
      let remainingLifeSeconds = bubbleLifeSeconds;
      spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
        identifier: "player_purify_bubble",
        shape: "circle",
        radius,
        position: bubblePosition,
        rgb: [180, 240, 255],
        opacity: 0.85,
        zIndex: 16,
        onFrame: (bubbleNode, deltaTimeInSeconds, destroySelf) => {
          bubbleNode.pos.y += verticalVelocity * deltaTimeInSeconds;
          remainingLifeSeconds -= deltaTimeInSeconds;
          if (typeof bubbleNode.opacity === "number") {
            bubbleNode.opacity -= deltaTimeInSeconds * 0.9;
          }
          if (
            remainingLifeSeconds <= 0 ||
            (typeof bubbleNode.opacity === "number" && bubbleNode.opacity <= 0)
          ) {
            destroySelf();
          }
        },
      });
    }
  }
}

export function spawnBlowholeSpout(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean,
  horizontalSpeed: number
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  audioSystem.playBlowholeSpout();

  const spoutOrigin = addPlayerVector2D(
    helperContext,
    whalePosition,
    createSafePlayerVector2D(helperContext, isFacingRight ? 22 : -22, -13)
  );
  const particlePool = getParticlePool();

  // Halo de luz do espiráculo ao romper a água para respirar na superfície (Fase 30.6)
  let remainingHaloSeconds = 0.5;
  spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
    identifier: "player_blowhole_sun_halo",
    shape: "circle",
    radius: 30,
    position: { x: spoutOrigin.x, y: GAME_CONFIG.SEA_LEVEL },
    rgb: [255, 255, 255],
    opacity: 0.2,
    scaleX: 1,
    scaleY: 0.4,
    anchorCenter: true,
    zIndex: 14,
    tags: ["blowhole_sun_halo"],
    onFrame: (haloNode, deltaTimeInSeconds, destroySelf) => {
      remainingHaloSeconds -= deltaTimeInSeconds;
      haloNode.pos.x += horizontalSpeed * 0.25 * deltaTimeInSeconds;
      if (haloNode.scale && "x" in haloNode.scale && "y" in haloNode.scale) {
        haloNode.scale.x += deltaTimeInSeconds * 0.8;
        haloNode.scale.y += deltaTimeInSeconds * 0.3;
      }
      haloNode.opacity = Math.max(0, (remainingHaloSeconds / 0.5) * 0.2);
      if (remainingHaloSeconds <= 0) {
        destroySelf();
      }
    },
  });

  // 32 partículas de condensação e vapor marinho em formato de V
  for (let vaporIndex = 0; vaporIndex < 32; vaporIndex++) {
    const isRightPlume = vaporIndex % 2 === 0;
    const baseAngleRadians = isRightPlume ? -1.45 : -1.69;
    const spreadRadians = getRandomFloat(-0.11, 0.11);
    const ejectionSpeed = getRandomFloat(190, 360);
    const ejectionDirection = createSafePlayerVector2D(
      helperContext,
      Math.cos(baseAngleRadians + spreadRadians),
      Math.sin(baseAngleRadians + spreadRadians)
    );

    const particleVelocity = ejectionDirection.scale(ejectionSpeed);
    particleVelocity.x += horizontalSpeed * 0.35;

    const spawnPosition = createSafePlayerVector2D(
      helperContext,
      spoutOrigin.x + getRandomFloat(-3, 3),
      spoutOrigin.y
    );
    const radius = getRandomFloat(1.8, 4.0);
    const totalLifeSeconds = getRandomFloat(0.65, 1.1);

    if (particlePool) {
      particlePool.spawnCircle({
        pos: spawnPosition,
        radius,
        color: resolveParticleColorValue(helperContext, 225, 242, 255),
        opacity: 0.85,
        z: 15,
        vel: particleVelocity,
        gravityY: 240,
        growthRate: 3.2,
        maxLife: totalLifeSeconds,
        boundaryY: GAME_CONFIG.SEA_LEVEL + 35,
        boundaryYMode: "greater",
      });
    } else {
      let remainingLifeSeconds = totalLifeSeconds;
      spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
        identifier: "player_blowhole_vapor_particle",
        shape: "circle",
        radius,
        position: spawnPosition,
        rgb: [225, 242, 255],
        opacity: 0.85,
        zIndex: 15,
        onFrame: (particleNode, deltaTimeInSeconds, destroySelf) => {
          particleVelocity.y += 240 * deltaTimeInSeconds;
          particleNode.pos.x += particleVelocity.x * deltaTimeInSeconds;
          particleNode.pos.y += particleVelocity.y * deltaTimeInSeconds;
          if (typeof particleNode.radius === "number") {
            particleNode.radius += deltaTimeInSeconds * 3.2;
          }
          remainingLifeSeconds -= deltaTimeInSeconds;
          particleNode.opacity = Math.max(0, (remainingLifeSeconds / totalLifeSeconds) * 0.85);
          if (remainingLifeSeconds <= 0 || particleNode.pos.y > GAME_CONFIG.SEA_LEVEL + 35) {
            destroySelf();
          }
        },
      });
    }
  }
}

export function spawnBaleenSuction(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  const mouthPosition = addPlayerVector2D(
    helperContext,
    whalePosition,
    createSafePlayerVector2D(helperContext, isFacingRight ? 46 : -46, 2)
  );
  const particlePool = getParticlePool();

  for (let suctionIndex = 0; suctionIndex < 12; suctionIndex++) {
    const radialAngle = getRandomFloat(0, Math.PI * 2);
    const spawnDistance = getRandomFloat(22, 46);
    const spawnPosition = createSafePlayerVector2D(
      helperContext,
      mouthPosition.x + Math.cos(radialAngle) * spawnDistance,
      mouthPosition.y + Math.sin(radialAngle) * spawnDistance
    );
    const radius = getRandomFloat(1.2, 2.7);

    if (particlePool) {
      particlePool.spawnCircle({
        pos: spawnPosition,
        radius,
        color: resolveParticleColorValue(helperContext, 255, 175, 145),
        opacity: 0.85,
        z: 20,
        targetPos: mouthPosition,
        targetSpeed: 190,
        fadeRate: 2.4,
        maxLife: 0.6,
      });
    } else {
      spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
        identifier: "player_baleen_suction_particle",
        shape: "circle",
        radius,
        position: spawnPosition,
        rgb: [255, 175, 145],
        opacity: 0.85,
        zIndex: 20,
        onFrame: (particleNode, deltaTimeInSeconds, destroySelf) => {
          const deltaX = mouthPosition.x - particleNode.pos.x;
          const deltaY = mouthPosition.y - particleNode.pos.y;
          const distanceSquared = deltaX * deltaX + deltaY * deltaY;
          if (distanceSquared < 36) {
            destroySelf();
            return;
          }
          const inverseDistance = 1 / Math.sqrt(distanceSquared);
          const stepDistance = 190 * deltaTimeInSeconds;
          particleNode.pos.x += deltaX * inverseDistance * stepDistance;
          particleNode.pos.y += deltaY * inverseDistance * stepDistance;
          if (typeof particleNode.opacity === "number") {
            particleNode.opacity -= deltaTimeInSeconds * 2.4;
            if (particleNode.opacity <= 0) destroySelf();
          }
        },
      });
    }
  }
}

export function spawnDraftingTrail(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  whalePosition: StrictPlayerVector2D | PlayerVector2D,
  isFacingRight: boolean
): void {
  const helperContext = optimizedEntityRenderingContext as PlayerParticleVectorHelperContext;
  const trailX = whalePosition.x + (isFacingRight ? -42 : 42);
  const trailY = whalePosition.y + getRandomFloat(-9, 9);
  const particlePool = getParticlePool();

  if (particlePool) {
    particlePool.spawnRect({
      pos: createSafePlayerVector2D(helperContext, trailX, trailY),
      width: getRandomFloat(16, 30),
      height: 1.5,
      color: resolveParticleColorValue(helperContext, 140, 240, 255),
      opacity: 0.75,
      z: 12,
      vel: createSafePlayerVector2D(helperContext, isFacingRight ? -140 : 140, 0),
      fadeRate: 2.0,
      maxLife: 0.45,
    });
  } else {
    spawnNativeManagedParticleNode(optimizedEntityRenderingContext, {
      identifier: "player_drafting_trail",
      shape: "rect",
      width: getRandomFloat(16, 30),
      height: 1.5,
      position: { x: trailX, y: trailY },
      rgb: [140, 240, 255],
      opacity: 0.75,
      zIndex: 12,
      onFrame: (trailNode, deltaTimeInSeconds, destroySelf) => {
        trailNode.pos.x -= (isFacingRight ? 140 : -140) * deltaTimeInSeconds;
        if (typeof trailNode.opacity === "number") {
          trailNode.opacity -= deltaTimeInSeconds * 2.0;
          if (trailNode.opacity <= 0) destroySelf();
        }
      },
    });
  }
}

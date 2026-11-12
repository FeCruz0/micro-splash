import { GAME_CONFIG, TAGS } from "../../config";
import { getParticlePool } from "../../systems/particlePool";
import type { IRenderEngine, IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import {
  createNativeCircleNode,
  scheduleNativeSceneDelay,
} from "../../engine/adapters/NativeRenderNodeFactory";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";

export interface RevealableTarget {
  pos?: StrictPlayerVector2D | PlayerVector2D;
  reveal?: () => void;
  exists?: () => boolean;
  is?: (tag: string) => boolean;
  [key: string]: unknown;
}

export interface SonarLegacyFallbackContext {
  rgb?(redChannel: number, greenChannel: number, blueChannel: number): unknown;
  wait?(delaySeconds: number, callback: () => void): void;
  get?(tagIdentifier: string): RevealableTarget[];
}

export type NativePlayerSonarContext = IRenderEngine | SonarLegacyFallbackContext;

const SONAR_SCAN_TAGS: readonly string[] = [
  TAGS.TRASH,
  TAGS.KRILL,
  TAGS.NET,
  "boqueirao_rock",
  "island_cliff_visual",
  "ocean_relief",
];

export function collectSonarScanTargets(
  optimizedEntityRenderingContext: NativePlayerSonarContext,
  activeSonarTargets: Set<RevealableTarget>
): RevealableTarget[] {
  const collectedTargets: RevealableTarget[] = [];
  const seenTargetsSet = new Set<RevealableTarget>();

  if (activeSonarTargets.size > 0) {
    for (const registeredTarget of activeSonarTargets) {
      if (!registeredTarget.exists || registeredTarget.exists()) {
        collectedTargets.push(registeredTarget);
        seenTargetsSet.add(registeredTarget);
      } else {
        activeSonarTargets.delete(registeredTarget);
      }
    }
  }

  const queryContext = optimizedEntityRenderingContext as SonarLegacyFallbackContext;
  if (typeof queryContext.get === "function") {
    for (let tagIndex = 0; tagIndex < SONAR_SCAN_TAGS.length; tagIndex++) {
      const taggedEntities = queryContext.get(SONAR_SCAN_TAGS[tagIndex]);
      for (let entityIndex = 0; entityIndex < taggedEntities.length; entityIndex++) {
        const candidateTarget = taggedEntities[entityIndex];
        if (!seenTargetsSet.has(candidateTarget)) {
          seenTargetsSet.add(candidateTarget);
          collectedTargets.push(candidateTarget);
        }
      }
    }
  }

  return collectedTargets;
}

export function emitNativeSonarPulseWaves(
  optimizedEntityRenderingContext: NativePlayerSonarContext,
  resolvedNativeRenderEngine: IRenderEngine,
  worldRenderContainer: IRenderNode,
  headPosition: PlayerVector2D
): void {
  const primaryPulseNode = createNativeCircleNode(
    optimizedEntityRenderingContext,
    resolvedNativeRenderEngine,
    worldRenderContainer,
    {
      identifier: "player_sonar_primary_pulse",
      radius: 15,
      positionX: headPosition.x,
      positionY: headPosition.y,
      fillColor: [0, 230, 255],
      outlineColor: [180, 255, 255],
      outlineWidth: 3,
      opacity: 0.8,
      zIndex: 20,
    }
  );

  primaryPulseNode.onUpdate((deltaTimeInSeconds: number) => {
    primaryPulseNode.radius += deltaTimeInSeconds * 520;
    primaryPulseNode.opacity -= deltaTimeInSeconds * 0.9;
    if (primaryPulseNode.opacity <= 0 || primaryPulseNode.radius >= GAME_CONFIG.SONAR_RANGE) {
      primaryPulseNode.destroy();
    }
  });

  scheduleNativeSceneDelay(
    optimizedEntityRenderingContext,
    resolvedNativeRenderEngine,
    0.08,
    () => {
      const secondaryPulseNode = createNativeCircleNode(
        optimizedEntityRenderingContext,
        resolvedNativeRenderEngine,
        worldRenderContainer,
        {
          identifier: "player_sonar_secondary_pulse",
          radius: 10,
          positionX: headPosition.x,
          positionY: headPosition.y,
          fillColor: [0, 160, 240],
          outlineColor: [120, 220, 255],
          outlineWidth: 2,
          opacity: 0.6,
          zIndex: 19,
        }
      );

      secondaryPulseNode.onUpdate((deltaTimeInSeconds: number) => {
        secondaryPulseNode.radius += deltaTimeInSeconds * 480;
        secondaryPulseNode.opacity -= deltaTimeInSeconds * 0.85;
        if (
          secondaryPulseNode.opacity <= 0 ||
          secondaryPulseNode.radius >= GAME_CONFIG.SONAR_RANGE
        ) {
          secondaryPulseNode.destroy();
        }
      });
    }
  );
}

export function emitNativeSonarEchoPing(
  optimizedEntityRenderingContext: NativePlayerSonarContext,
  resolvedNativeRenderEngine: IRenderEngine,
  worldRenderContainer: IRenderNode,
  targetPosition: PlayerVector2D,
  isKrillTarget: boolean
): void {
  if (isKrillTarget) {
    const krillEchoNode = createNativeCircleNode(
      optimizedEntityRenderingContext,
      resolvedNativeRenderEngine,
      worldRenderContainer,
      {
        identifier: "sonar_krill_echo_ping",
        radius: 12,
        positionX: targetPosition.x,
        positionY: targetPosition.y,
        fillColor: [255, 220, 80],
        outlineColor: [100, 255, 210],
        outlineWidth: 2.5,
        opacity: 0.95,
        zIndex: 22,
      }
    );
    krillEchoNode.onUpdate((deltaTimeInSeconds: number) => {
      krillEchoNode.radius += deltaTimeInSeconds * 65;
      krillEchoNode.opacity -= deltaTimeInSeconds * 2.2;
      if (krillEchoNode.opacity <= 0) {
        krillEchoNode.destroy();
      }
    });

    const particlePool = getParticlePool();
    const fallbackContext = optimizedEntityRenderingContext as SonarLegacyFallbackContext;
    const sparkColor =
      typeof fallbackContext.rgb === "function"
        ? fallbackContext.rgb(255, 235, 120)
        : [255, 235, 120];

    for (let sparkIndex = 0; sparkIndex < 4; sparkIndex++) {
      const sparkAngleRadians = (sparkIndex / 4) * Math.PI * 2 + Math.PI / 4;
      const velocityX = Math.cos(sparkAngleRadians) * 55;
      const velocityY = Math.sin(sparkAngleRadians) * 55;
      if (particlePool) {
        particlePool.spawnCircle({
          pos: targetPosition,
          radius: 2,
          color: sparkColor,
          opacity: 0.9,
          z: 23,
          vel: { x: velocityX, y: velocityY },
          fadeRate: 2.5,
          maxLife: 0.4,
        });
      } else {
        const sparkNode = createNativeCircleNode(
          optimizedEntityRenderingContext,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: "sonar_echo_spark",
            radius: 2,
            positionX: targetPosition.x,
            positionY: targetPosition.y,
            fillColor: [255, 235, 120],
            opacity: 0.9,
            zIndex: 23,
          }
        );
        sparkNode.onUpdate((deltaTimeInSeconds: number) => {
          sparkNode.pos.x += velocityX * deltaTimeInSeconds;
          sparkNode.pos.y += velocityY * deltaTimeInSeconds;
          sparkNode.opacity -= deltaTimeInSeconds * 2.5;
          if (sparkNode.opacity <= 0) {
            sparkNode.destroy();
          }
        });
      }
    }
    return;
  }

  const objectEchoNode = createNativeCircleNode(
    optimizedEntityRenderingContext,
    resolvedNativeRenderEngine,
    worldRenderContainer,
    {
      identifier: "sonar_object_echo_ping",
      radius: 8,
      positionX: targetPosition.x,
      positionY: targetPosition.y,
      fillColor: [0, 240, 255],
      outlineColor: [255, 255, 255],
      outlineWidth: 2,
      opacity: 0.9,
      zIndex: 22,
    }
  );
  objectEchoNode.onUpdate((deltaTimeInSeconds: number) => {
    objectEchoNode.radius += deltaTimeInSeconds * 45;
    objectEchoNode.opacity -= deltaTimeInSeconds * 2.8;
    if (objectEchoNode.opacity <= 0) {
      objectEchoNode.destroy();
    }
  });
}

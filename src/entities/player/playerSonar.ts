import { GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { hapticsSystem } from "../../systems/hapticsSystem";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";
import { resolveInitializedRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { scheduleNativeSceneDelay } from "../../engine/adapters/NativeRenderNodeFactory";
import {
  collectSonarScanTargets,
  emitNativeSonarEchoPing,
  emitNativeSonarPulseWaves,
  type NativePlayerSonarContext,
  type RevealableTarget,
  type SonarLegacyFallbackContext,
} from "./nativePlayerSonarModule";

export type { NativePlayerSonarContext, RevealableTarget };

export interface PlayerSonarPulseObject {
  radius: number;
  opacity: number;
  pos?: StrictPlayerVector2D | PlayerVector2D;
  onUpdate: (callback: () => void) => void;
  [key: string]: unknown;
}

export interface PlayerSonarEngineContext extends SonarLegacyFallbackContext {
  vec2?(coordinateX: number, coordinateY: number): StrictPlayerVector2D;
}

export const activeSonarTargets: Set<RevealableTarget> = new Set();

export function registerSonarTarget(target: RevealableTarget): void {
  activeSonarTargets.add(target);
}

export function unregisterSonarTarget(target: RevealableTarget): void {
  activeSonarTargets.delete(target);
}

export class PlayerSonarManager {
  private optimizedEntityRenderingContext: NativePlayerSonarContext;
  private sonarCooldownSeconds = GAME_CONFIG.SONAR_COOLDOWN;

  constructor(optimizedEntityRenderingContext: NativePlayerSonarContext) {
    this.optimizedEntityRenderingContext = optimizedEntityRenderingContext;
  }

  public updateCooldown(deltaTimeInSeconds: number): void {
    if (this.sonarCooldownSeconds > 0) {
      this.sonarCooldownSeconds -= deltaTimeInSeconds;
    }
  }

  public canTrigger(): boolean {
    return this.sonarCooldownSeconds <= 0;
  }

  public triggerSonar(
    whalePosition: StrictPlayerVector2D | PlayerVector2D,
    isFacingRight: boolean
  ): void {
    if (this.sonarCooldownSeconds > 0) return;

    this.sonarCooldownSeconds = GAME_CONFIG.SONAR_COOLDOWN;
    audioSystem.playWhaleSong(1.0, 1.0);
    hapticsSystem.triggerSonar();

    const resolvedNativeRenderEngine = resolveInitializedRenderEngine(
      this.optimizedEntityRenderingContext
    );
    const worldRenderContainer = resolvedNativeRenderEngine
      ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
      : null;

    const headOffsetX = isFacingRight ? 42 : -42;
    const headOffsetY = -4;
    const headPosition: PlayerVector2D = {
      x: whalePosition.x + headOffsetX,
      y: whalePosition.y + headOffsetY,
    };

    if (resolvedNativeRenderEngine && worldRenderContainer) {
      emitNativeSonarPulseWaves(
        this.optimizedEntityRenderingContext,
        resolvedNativeRenderEngine,
        worldRenderContainer,
        headPosition
      );
    }

    revealEntitiesInSonarRadius(
      this.optimizedEntityRenderingContext,
      headPosition,
      GAME_CONFIG.SONAR_RANGE
    );
  }
}

/**
 * Executa a varredura acústica em 360 graus, revelando entidades ocultas (krill, obstáculos, redes e relevo)
 * com anéis de reflexão sonora e partículas. Pode ser executado pelo jogador ou pela baleia-guia NPC.
 */
export function revealEntitiesInSonarRadius(
  optimizedEntityRenderingContext: NativePlayerSonarContext,
  centerPosition: StrictPlayerVector2D | PlayerVector2D,
  scanRadius: number = GAME_CONFIG.SONAR_RANGE
): number {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(
    optimizedEntityRenderingContext
  );
  const worldRenderContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;

  const targets = collectSonarScanTargets(optimizedEntityRenderingContext, activeSonarTargets);
  const fallbackContext = optimizedEntityRenderingContext as SonarLegacyFallbackContext;

  const scheduleEchoDelay = (delaySeconds: number, callback: () => void): void => {
    if (resolvedNativeRenderEngine) {
      scheduleNativeSceneDelay(
        optimizedEntityRenderingContext,
        resolvedNativeRenderEngine,
        delaySeconds,
        callback
      );
    } else if (typeof fallbackContext.wait === "function") {
      fallbackContext.wait(delaySeconds, callback);
    } else {
      callback();
    }
  };

  let revealedCount = 0;
  let echoCount = 0;
  const targetCount = targets.length;
  for (let targetIndex = 0; targetIndex < targetCount; targetIndex++) {
    const targetEntity = targets[targetIndex];
    if (!targetEntity.pos) continue;
    if (Math.abs(targetEntity.pos.x - centerPosition.x) > scanRadius) continue;

    const distanceToObject =
      typeof centerPosition.dist === "function"
        ? centerPosition.dist(targetEntity.pos)
        : Math.hypot(centerPosition.x - targetEntity.pos.x, centerPosition.y - targetEntity.pos.y);

    if (distanceToObject <= scanRadius) {
      revealedCount++;
      const travelTimeSeconds = distanceToObject / 520;
      scheduleEchoDelay(travelTimeSeconds, () => {
        if (typeof targetEntity.reveal === "function") {
          targetEntity.reveal();
        }

        const isKrillTarget = Boolean(targetEntity.is && targetEntity.is(TAGS.KRILL));
        const targetPosition = targetEntity.pos;

        if (resolvedNativeRenderEngine && worldRenderContainer && targetPosition) {
          emitNativeSonarEchoPing(
            optimizedEntityRenderingContext,
            resolvedNativeRenderEngine,
            worldRenderContainer,
            targetPosition,
            isKrillTarget
          );
        }

        if (echoCount < 4) {
          echoCount++;
          audioSystem.playSonarEcho(Math.min(280, distanceToObject * 0.35));
        }
      });
    }
  }

  return revealedCount;
}

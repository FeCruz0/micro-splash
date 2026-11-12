import { COMPANION_CONFIG, GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { getParticlePool } from "../../systems/particlePool";
import { markCompanionTutorialSeen } from "../../systems/companionTutorialSettings";
import type { RandomNumberGenerator } from "../../utils/random";
import type {
  CompanionGameObject,
  CompanionOptions,
  CompanionState,
  CompanionVector2D,
} from "./types";
import { CompanionStateMachine } from "./companionStateMachine";
import type { CompanionEngineContext, CompanionStateContext } from "./states/types";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { createNativeCircleNode } from "../../engine/adapters/NativeRenderNodeFactory";
import { createCompanionVector2D, resolveCompanionColorValue } from "./companionMathHelpers";

export * from "./states/types";
export * from "./states/concreteStates";
export * from "./companionStateMachine";

export interface CompanionStates<TGameObj = CompanionGameObject> {
  getState: () => CompanionState;
  forceState: (state: CompanionState) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  drainOxygen: (amount: number) => void;
  getKrillsEaten: () => number;
  consumeKrill: (krillObject: TGameObj) => void;
  isDeparted: () => boolean;
  isFainted: () => boolean;
  shouldStopUpdate: () => boolean;
  destroy: () => void;
  update: (
    deltaTimeInSeconds: number,
    playerX?: number,
    targetKrill?: TGameObj | null,
    targetHazard?: TGameObj | null,
    onResetVerticalSpeed?: () => void
  ) => number;
}

export interface CompanionStatesOptions<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
> {
  k: IRenderEngine | CompanionEngineContext<TDestroyable, TColor, TVec>;
  companion: CompanionGameObject;
  options: CompanionOptions<TGameObj>;
  prng: RandomNumberGenerator;
  onDestroy?: () => void;
}

export interface SteamParticleObject {
  pos: { x: number; y: number };
  opacity: number;
  onUpdate: (callback: () => void) => void;
}

/**
 * Módulo de Estados Biológicos e FSM Formal da Baleia-Guia (Fase 59 & Fase 60).
 * Utiliza o State Pattern hierárquico com contratos formais (onEnter, onUpdate, onExit),
 * ciclo biológico de oxigênio pulmonar, co-migração de longo curso e partículas com PRNG determinístico.
 */
export function createCompanionStates<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
>(
  statesOptions: CompanionStatesOptions<TDestroyable, TColor, TVec, TGameObj>
): CompanionStates<TGameObj> {
  const { k, companion, options, prng, onDestroy } = statesOptions;
  const legacyContext = k as CompanionEngineContext<TDestroyable, TColor, TVec>;

  const stateMachine = new CompanionStateMachine("INTRO", options.onStateChange);

  let stateTimer = 0;
  const maxOxygen = 100;
  let currentOxygen = 100;
  let krillsEatenCount = 0;

  let feedActionTimer = 0;
  let isDepartedFlag = false;

  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const worldRenderContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;

  const emitDoubleBlowholeSpout = (sourceX: number, sourceY: number): void => {
    const particlePool = getParticlePool();
    const particlesPerPlume = Math.floor(COMPANION_CONFIG.STEAM_PARTICLES_COUNT / 2);

    for (let plumeIndex = 0; plumeIndex < 2; plumeIndex++) {
      const plumeOffsetX = plumeIndex === 0 ? -10 : 6;
      for (let particleIndex = 0; particleIndex < particlesPerPlume; particleIndex++) {
        const particleRadius = 2.2 + prng() * 2.2;
        const horizontalDriftVelocity = (prng() - 0.5) * 20;

        if (particlePool) {
          particlePool.spawnCircle({
            pos: createCompanionVector2D(k, sourceX + plumeOffsetX, sourceY - 14),
            radius: particleRadius,
            color: resolveCompanionColorValue(k, 220, 245, 255),
            opacity: 0.9,
            vel: createCompanionVector2D(k, horizontalDriftVelocity, -(140 + prng() * 90)),
            fadeRate: 1.2,
            maxLife: 1.0,
            growthRate: 1.4,
            z: 22,
          });
        } else if (resolvedNativeRenderEngine && worldRenderContainer) {
          const steamParticleNode = createNativeCircleNode(
            k,
            resolvedNativeRenderEngine,
            worldRenderContainer,
            {
              identifier: "companion_steam_particle",
              radius: particleRadius,
              positionX: sourceX + plumeOffsetX,
              positionY: sourceY - 14,
              fillColor: [220, 245, 255],
              opacity: 0.85,
              zIndex: 22,
            }
          );
          let remainingLifeSeconds = 0.85;
          steamParticleNode.onUpdate((deltaTimeInSeconds: number) => {
            steamParticleNode.pos.y -= deltaTimeInSeconds * 150;
            steamParticleNode.pos.x += (prng() - 0.5) * deltaTimeInSeconds * 20;
            remainingLifeSeconds -= deltaTimeInSeconds;
            steamParticleNode.opacity = Math.max(0, remainingLifeSeconds);
            if (remainingLifeSeconds <= 0) {
              steamParticleNode.destroy();
            }
          });
        }
      }
    }
  };

  const drainOxygen = (amount: number): void => {
    const hasInfiniteOxygen = options.infiniteOxygen ?? COMPANION_CONFIG.INFINITE_OXYGEN;
    if (hasInfiniteOxygen) return;
    currentOxygen = Math.max(0, currentOxygen - amount);
  };

  const getContext = (onResetVerticalSpeed?: () => void): CompanionStateContext => ({
    k: k as unknown as IRenderEngine | CompanionEngineContext,
    companion,
    options: options as CompanionOptions,
    prng,
    getOxygen: () => currentOxygen,
    restoreOxygen: (amount: number) => {
      currentOxygen = Math.min(maxOxygen, currentOxygen + amount);
    },
    drainOxygen,
    getMaxOxygen: () => maxOxygen,
    getKrillsEaten: () => krillsEatenCount,
    incrementKrillsEaten: () => {
      krillsEatenCount++;
    },
    emitDoubleBlowholeSpout,
    onResetVerticalSpeed: onResetVerticalSpeed ?? (() => {}),
    stateTimer,
  });

  const consumeKrill = (krillObject: TGameObj): void => {
    const krill = krillObject as unknown as CompanionGameObject & { destroy?: () => void };
    if (krill && (!krill.exists || krill.exists())) {
      if (typeof krill.destroy === "function") {
        krill.destroy();
      } else if (typeof legacyContext.destroy === "function") {
        legacyContext.destroy(krillObject as unknown as TDestroyable);
      }
    }
    krillsEatenCount++;
    currentOxygen = Math.min(maxOxygen, currentOxygen + GAME_CONFIG.KRILL_OXYGEN_RESTORE);
    feedActionTimer = 0.75;
    if (typeof companion.play === "function") companion.play("feed");
    audioSystem.playKrillGulp(krill?.pos?.x, companion.pos.x);
  };

  const update = (
    deltaTimeInSeconds: number,
    playerX?: number,
    targetKrill: TGameObj | null = null,
    targetHazard: TGameObj | null = null,
    onResetVerticalSpeed?: () => void
  ): number => {
    stateTimer += deltaTimeInSeconds;

    const hasInfiniteOxygen = options.infiniteOxygen ?? COMPANION_CONFIG.INFINITE_OXYGEN;

    // 1. Depleção biológica de oxigênio pulmonar
    if (!hasInfiniteOxygen && stateMachine.getState() !== "SURFACE_BREATHE") {
      currentOxygen = Math.max(
        0,
        currentOxygen - deltaTimeInSeconds * (GAME_CONFIG.OXYGEN_DRAIN_RATE * 0.75)
      );
    } else if (hasInfiniteOxygen) {
      currentOxygen = maxOxygen;
    }

    const context = getContext(onResetVerticalSpeed);

    // 2. Checagem de exaustão/anóxia (mortalidade serena)
    if (
      !hasInfiniteOxygen &&
      currentOxygen <= 0 &&
      stateMachine.getState() !== "FAINTED" &&
      stateMachine.getState() !== "DEPARTED"
    ) {
      stateTimer = 0;
      context.stateTimer = 0;
      stateMachine.transitionTo("FAINTED", context);
      audioSystem.playWhaleSong(0.6, 0.8);
      return stateMachine.update(
        context,
        deltaTimeInSeconds,
        playerX,
        targetKrill as unknown as CompanionGameObject,
        targetHazard as unknown as CompanionGameObject
      );
    }

    // 3. Animação de alimentação
    if (feedActionTimer > 0) {
      feedActionTimer -= deltaTimeInSeconds;
      if (
        feedActionTimer <= 0 &&
        stateMachine.getState() !== "FAREWELL_BREACH" &&
        stateMachine.getState() !== "RESTING" &&
        stateMachine.getState() !== "FAINTED"
      ) {
        if (typeof companion.play === "function") companion.play("idle_swim");
      }
    }

    // 4. Checagem de oxigênio crítico
    const currentState = stateMachine.getState();
    if (
      !hasInfiniteOxygen &&
      currentOxygen < COMPANION_CONFIG.CRITICAL_OXYGEN &&
      currentState !== "SEEK_BREATH" &&
      currentState !== "SURFACE_BREATHE" &&
      currentState !== "FAREWELL_BREACH" &&
      currentState !== "RESTING" &&
      currentState !== "FAINTED" &&
      currentState !== "TRAPPED"
    ) {
      stateTimer = 0;
      context.stateTimer = 0;
      stateMachine.transitionTo("SEEK_BREATH", context);
    }

    // 5. Conclusão do Tutorial ao final da Antártica (~3.150m)
    const isCoMigration =
      options.isCoMigration || options.mode === "serene" || options.autonomyMode === "autonomous";
    const targetProgressX = companion.pos.x >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180;
    const playerProgressX =
      playerX !== undefined && playerX >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180;
    if (
      (targetProgressX || playerProgressX) &&
      (stateMachine.getState() === "CRUISE" || stateMachine.getState() === "INTRO")
    ) {
      stateTimer = 0;
      context.stateTimer = 0;
      markCompanionTutorialSeen();
      if (options.onDeparted) options.onDeparted();

      if (isCoMigration) {
        stateMachine.transitionTo("INDEPENDENT_CRUISE", context);
      } else {
        stateMachine.transitionTo("RESTING", context);
        audioSystem.playWhaleSong(1.0, 1.1);
      }
    }

    // 6. Atualização da FSM Formal com perigos detectados
    return stateMachine.update(
      context,
      deltaTimeInSeconds,
      playerX,
      targetKrill as unknown as CompanionGameObject,
      targetHazard as unknown as CompanionGameObject
    );
  };

  return {
    getState: () => stateMachine.getState(),
    forceState: (state: CompanionState) => {
      stateTimer = 0;
      stateMachine.transitionTo(
        state,
        getContext(() => {})
      );
    },
    getOxygen: () => currentOxygen,
    getMaxOxygen: () => maxOxygen,
    restoreOxygen: (amount: number) => {
      currentOxygen = Math.min(maxOxygen, currentOxygen + amount);
    },
    drainOxygen,
    getKrillsEaten: () => krillsEatenCount,
    consumeKrill,
    isDeparted: () => {
      const currentState = stateMachine.getState();
      return currentState === "RESTING" || currentState === "DEPARTED" || isDepartedFlag;
    },
    isFainted: () => {
      return stateMachine.getState() === "FAINTED";
    },
    shouldStopUpdate: () => {
      const currentState = stateMachine.getState();
      return isDepartedFlag || currentState === "DEPARTED";
    },
    destroy: () => {
      isDepartedFlag = true;
      onDestroy?.();
      const destroyableCompanion = companion as CompanionGameObject & { destroy?: () => void };
      if (destroyableCompanion && (!destroyableCompanion.exists || destroyableCompanion.exists())) {
        if (typeof destroyableCompanion.destroy === "function") {
          destroyableCompanion.destroy();
        } else if (typeof legacyContext.destroy === "function") {
          legacyContext.destroy(companion as unknown as TDestroyable);
        }
      }
    },
    update,
  };
}

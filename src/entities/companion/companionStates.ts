import type { GameObj, KaboomCtx } from "kaboom";
import { COMPANION_CONFIG, GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { getParticlePool } from "../../systems/particlePool";
import { markCompanionTutorialSeen } from "../../systems/companionTutorialSettings";
import type { RandomNumberGenerator } from "../../utils/random";
import type { CompanionOptions, CompanionState } from "./types";
import { CompanionStateMachine } from "./companionStateMachine";
import type { CompanionStateContext } from "./states/types";

export * from "./states/types";
export * from "./states/concreteStates";
export * from "./companionStateMachine";

export interface CompanionStates {
  getState: () => CompanionState;
  forceState: (state: CompanionState) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  drainOxygen: (amount: number) => void;
  getKrillsEaten: () => number;
  consumeKrill: (krillObj: GameObj) => void;
  isDeparted: () => boolean;
  isFainted: () => boolean;
  shouldStopUpdate: () => boolean;
  destroy: () => void;
  update: (
    deltaTime: number,
    playerX: number,
    targetKrill: GameObj | null,
    targetHazard: GameObj | null,
    onResetVerticalSpeed: () => void
  ) => number;
}

export interface CompanionStatesOptions {
  k: KaboomCtx;
  companion: GameObj;
  options: CompanionOptions;
  prng: RandomNumberGenerator;
}

/**
 * Módulo de Estados Biológicos e FSM Formal da Baleia-Guia (Fase 59 & Fase 60).
 * Utiliza o State Pattern hierárquico com contratos formais (onEnter, onUpdate, onExit),
 * ciclo biológico de oxigênio pulmonar, co-migração de longo curso e partículas com PRNG determinístico.
 */
export function createCompanionStates(statesOptions: CompanionStatesOptions): CompanionStates {
  const { k, companion, options, prng } = statesOptions;

  const stateMachine = new CompanionStateMachine("INTRO", options.onStateChange);

  let stateTimer = 0;
  const maxOxygen = 100;
  let currentOxygen = 100;
  let krillsEatenCount = 0;

  let feedActionTimer = 0;
  let isDepartedFlag = false;

  const emitDoubleBlowholeSpout = (sourceX: number, sourceY: number): void => {
    const pool = getParticlePool();
    const particlesPerPlume = Math.floor(COMPANION_CONFIG.STEAM_PARTICLES_COUNT / 2);

    for (let plumeIndex = 0; plumeIndex < 2; plumeIndex++) {
      const plumeOffsetX = plumeIndex === 0 ? -10 : 6;
      for (let particleIndex = 0; particleIndex < particlesPerPlume; particleIndex++) {
        if (pool) {
          pool.spawnCircle({
            pos: k.vec2(sourceX + plumeOffsetX, sourceY - 14),
            radius: 2.2 + prng() * 2.2,
            color: k.rgb(220, 245, 255),
            opacity: 0.9,
            vel: k.vec2((prng() - 0.5) * 20, -(140 + prng() * 90)),
            fadeRate: 1.2,
            maxLife: 1.0,
            growthRate: 1.4,
            z: 22,
          });
        } else {
          const steamParticle = k.add([
            k.circle(2.2 + prng() * 2.2),
            k.pos(sourceX + plumeOffsetX, sourceY - 14),
            k.color(220, 245, 255),
            k.opacity(0.85),
            k.z(22),
          ]);
          let lifeTime = 0.85;
          steamParticle.onUpdate(() => {
            const dt = k.dt();
            steamParticle.pos.y -= dt * 150;
            steamParticle.pos.x += (prng() - 0.5) * dt * 20;
            lifeTime -= dt;
            steamParticle.opacity = lifeTime;
            if (lifeTime <= 0) k.destroy(steamParticle);
          });
        }
      }
    }
  };

  const drainOxygen = (amount: number): void => {
    currentOxygen = Math.max(0, currentOxygen - amount);
  };

  const getContext = (onResetVerticalSpeed: () => void): CompanionStateContext => ({
    k,
    companion,
    options,
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
    onResetVerticalSpeed,
    stateTimer,
  });

  const consumeKrill = (krillObj: GameObj): void => {
    if (krillObj && (!krillObj.exists || krillObj.exists())) {
      k.destroy(krillObj);
    }
    krillsEatenCount++;
    currentOxygen = Math.min(maxOxygen, currentOxygen + GAME_CONFIG.KRILL_OXYGEN_RESTORE);
    feedActionTimer = 0.75;
    if (typeof companion.play === "function") companion.play("feed");
    audioSystem.playKrillGulp(krillObj?.pos?.x, companion.pos.x);
  };

  const update = (
    deltaTime: number,
    playerX: number,
    targetKrill: GameObj | null,
    targetHazard: GameObj | null,
    onResetVerticalSpeed: () => void
  ): number => {
    stateTimer += deltaTime;

    // 1. Depleção biológica de oxigênio pulmonar
    if (stateMachine.getState() !== "SURFACE_BREATHE") {
      currentOxygen = Math.max(
        0,
        currentOxygen - deltaTime * (GAME_CONFIG.OXYGEN_DRAIN_RATE * 0.75)
      );
    }

    const context = getContext(onResetVerticalSpeed);

    // 2. Checagem de exaustão/anóxia (mortalidade serena)
    if (
      currentOxygen <= 0 &&
      stateMachine.getState() !== "FAINTED" &&
      stateMachine.getState() !== "DEPARTED"
    ) {
      stateTimer = 0;
      context.stateTimer = 0;
      stateMachine.transitionTo("FAINTED", context);
      audioSystem.playWhaleSong(0.6, 0.8);
      return stateMachine.update(context, deltaTime, playerX, targetKrill, targetHazard);
    }

    // 3. Animação de alimentação
    if (feedActionTimer > 0) {
      feedActionTimer -= deltaTime;
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
    const isCoMigration = options.isCoMigration || options.mode === "serene";
    if (
      playerX >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180 &&
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
    return stateMachine.update(context, deltaTime, playerX, targetKrill, targetHazard);
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
      const s = stateMachine.getState();
      return s === "RESTING" || s === "DEPARTED" || isDepartedFlag;
    },
    isFainted: () => {
      return stateMachine.getState() === "FAINTED";
    },
    shouldStopUpdate: () => {
      const s = stateMachine.getState();
      return isDepartedFlag || s === "DEPARTED";
    },
    destroy: () => {
      isDepartedFlag = true;
      if (companion && (!companion.exists || companion.exists())) {
        k.destroy(companion);
      }
    },
    update,
  };
}

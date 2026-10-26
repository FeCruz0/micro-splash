import type { GameObj, KaboomCtx } from "kaboom";
import { COMPANION_CONFIG, GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { getParticlePool } from "../../systems/particlePool";
import { markCompanionTutorialSeen } from "../../systems/companionTutorialSettings";
import { isPositionInIceGap } from "../../systems/iceSurface";
import type { RandomNumberGenerator } from "../../utils/random";
import type { CompanionOptions, CompanionState } from "./types";

export interface CompanionStates {
  getState: () => CompanionState;
  forceState: (state: CompanionState) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  getKrillsEaten: () => number;
  consumeKrill: (krillObj: GameObj) => void;
  isDeparted: () => boolean;
  shouldStopUpdate: () => boolean;
  destroy: () => void;
  update: (
    deltaTime: number,
    playerX: number,
    targetKrill: GameObj | null,
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
 * Módulo de Estados Biológicos e FSM da Baleia-Guia.
 * Controla depleção/recarga de oxigênio pulmonar, borrifo duplo com PRNG,
 * e transições de comportamento (INTRO -> CRUISE -> SEEK_BREATH -> SURFACE_BREATHE -> RESTING).
 */
export function createCompanionStates(statesOptions: CompanionStatesOptions): CompanionStates {
  const { k, companion, options, prng } = statesOptions;

  let currentState: CompanionState = "INTRO";
  let stateTimer = 0;
  const maxOxygen = 100;
  let currentOxygen = 100;
  let krillsEatenCount = 0;

  let feedActionTimer = 0;
  let surfaceBreatheTimer = 0;
  let isDepartedFlag = false;

  const updateState = (nextState: CompanionState): void => {
    if (currentState === nextState) return;
    currentState = nextState;
    stateTimer = 0;
    if (options.onStateChange) {
      options.onStateChange(nextState);
    }
  };

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
    onResetVerticalSpeed: () => void
  ): number => {
    stateTimer += deltaTime;

    // 1. Depleção biológica de oxigênio
    currentOxygen = Math.max(0, currentOxygen - deltaTime * (GAME_CONFIG.OXYGEN_DRAIN_RATE * 0.75));

    // 2. Animação de alimentação
    if (feedActionTimer > 0) {
      feedActionTimer -= deltaTime;
      if (
        feedActionTimer <= 0 &&
        currentState !== "FAREWELL_BREACH" &&
        currentState !== "RESTING"
      ) {
        if (typeof companion.play === "function") companion.play("idle_swim");
      }
    }

    // 3. Checagem de oxigênio crítico
    if (
      currentOxygen < COMPANION_CONFIG.CRITICAL_OXYGEN &&
      currentState !== "SEEK_BREATH" &&
      currentState !== "SURFACE_BREATHE" &&
      currentState !== "FAREWELL_BREACH" &&
      currentState !== "RESTING"
    ) {
      updateState("SEEK_BREATH");
    }

    // 4. Conclusão do Tutorial ao final da Antártica (~3.150m)
    if (
      playerX >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180 &&
      currentState !== "RESTING" &&
      currentState !== "DEPARTED"
    ) {
      updateState("RESTING");
      audioSystem.playWhaleSong(1.0, 1.1);
      markCompanionTutorialSeen();
      if (options.onDeparted) options.onDeparted();
    }

    // 5. Cálculo de mira angular por estado
    let targetAngle = 0;
    switch (currentState) {
      case "INTRO": {
        targetAngle = 0;
        if (playerX > 40) {
          updateState("CRUISE");
        }
        break;
      }

      case "CRUISE": {
        if (targetKrill && (!targetKrill.exists || targetKrill.exists())) {
          const deltaY = targetKrill.pos.y - companion.pos.y;
          const deltaX = Math.max(40, targetKrill.pos.x - companion.pos.x);
          targetAngle = k.clamp(k.rad2deg(Math.atan2(deltaY, deltaX)), -30, 30);
        } else {
          const oceanSway = Math.sin(stateTimer * 1.4) * 12 + Math.sin(stateTimer * 0.7) * 8;
          const targetCruiseY = 195 + oceanSway;
          const deltaY = targetCruiseY - companion.pos.y;
          targetAngle = k.clamp(deltaY * 0.25, -22, 22);
        }
        break;
      }

      case "SEEK_BREATH": {
        const canBreatheHere = isPositionInIceGap(companion.pos.x);
        if (canBreatheHere) {
          targetAngle = -26;
          if (companion.pos.y <= GAME_CONFIG.SEA_LEVEL + 4) {
            updateState("SURFACE_BREATHE");
            surfaceBreatheTimer = 0;
            emitDoubleBlowholeSpout(companion.pos.x, companion.pos.y);
            audioSystem.playBlowholeSpout();
            currentOxygen = maxOxygen;
          }
        } else {
          const safeDepthY = 130;
          const deltaY = safeDepthY - companion.pos.y;
          targetAngle = k.clamp(deltaY * 0.25, -18, 18);
        }
        break;
      }

      case "SURFACE_BREATHE": {
        surfaceBreatheTimer += deltaTime;
        targetAngle = 0;
        onResetVerticalSpeed();
        if (surfaceBreatheTimer >= COMPANION_CONFIG.SURFACE_BREATHE_DURATION) {
          updateState("CRUISE");
        }
        break;
      }

      case "RESTING": {
        targetAngle = 0;
        if (typeof companion.play === "function") {
          companion.play("idle_swim");
        }
        break;
      }

      case "FAREWELL_BREACH": {
        updateState("RESTING");
        break;
      }

      case "DEPARTED":
        break;
    }

    return targetAngle;
  };

  return {
    getState: () => currentState,
    forceState: (state: CompanionState) => updateState(state),
    getOxygen: () => currentOxygen,
    getMaxOxygen: () => maxOxygen,
    restoreOxygen: (amount: number) => {
      currentOxygen = Math.min(maxOxygen, currentOxygen + amount);
    },
    getKrillsEaten: () => krillsEatenCount,
    consumeKrill,
    isDeparted: () => currentState === "RESTING" || currentState === "DEPARTED" || isDepartedFlag,
    shouldStopUpdate: () => isDepartedFlag || currentState === "DEPARTED",
    destroy: () => {
      isDepartedFlag = true;
      if (companion && (!companion.exists || companion.exists())) {
        k.destroy(companion);
      }
    },
    update,
  };
}

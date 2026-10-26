import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { COMPANION_CONFIG, GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import type { RandomNumberGenerator } from "../../utils/random";
import type { CompanionState } from "./types";

export interface CompanionLocomotion {
  getSpeed: () => Vec2;
  setSpeed: (speed: Vec2) => void;
  update: (
    deltaTime: number,
    targetAngle: number,
    playerX: number,
    playerSpeed: number,
    currentState: CompanionState
  ) => void;
  handleIceBlockCollision: (iceBlock?: GameObj) => void;
  handleObstacleBlockCollision: (obstacle?: GameObj) => void;
}

export interface CompanionLocomotionOptions {
  k: KaboomCtx;
  companion: GameObj;
  prng: RandomNumberGenerator;
}

/**
 * Módulo de Locomoção e Cinemática Hidrodinâmica da Baleia-Guia.
 * Implementa rotação vertical gradual, propulsão direcional da cauda,
 * arrasto d'água e colisões físicas com blocos de gelo.
 */
export function createCompanionLocomotion(
  options: CompanionLocomotionOptions
): CompanionLocomotion {
  const { k, companion, prng } = options;

  let currentSpeed = k.vec2(COMPANION_CONFIG.BASE_SPEED, 0);
  let strokeCycleTimer = 0;
  let strokePhase: "down" | "up" | "glide" = "glide";
  let glideDurationTarget = COMPANION_CONFIG.BASE_GLIDE_DURATION;

  const handleIceBlockCollision = (_iceBlock?: GameObj): void => {
    if (currentSpeed.y < 0) {
      currentSpeed.y = 0;
    }
    if (companion.angle < 0) {
      companion.angle = 0;
    }
    if (companion.pos.y < 92) {
      companion.pos.y = 92;
    }
  };

  const handleObstacleBlockCollision = (_obstacle?: GameObj): void => {
    currentSpeed.y = Math.abs(currentSpeed.y) + 40;
  };

  const update = (
    deltaTime: number,
    targetAngle: number,
    playerX: number,
    playerSpeed: number,
    currentState: CompanionState
  ): void => {
    // 1. Giro vertical lento (espelha controle vertical da baleia do jogador)
    const rotationSpeed = GAME_CONFIG.ROTATION_SPEED * COMPANION_CONFIG.ROTATION_SPEED_FACTOR;
    const angleDifference = targetAngle - companion.angle;
    companion.angle += k.clamp(
      angleDifference,
      -rotationSpeed * deltaTime,
      rotationSpeed * deltaTime
    );

    // 2. Propulsão direcional no ângulo virado
    if (
      currentState !== "SURFACE_BREATHE" &&
      currentState !== "RESTING" &&
      currentState !== "INTRO"
    ) {
      // Ajuste de cadência por rubber-banding
      const distanceAhead = companion.pos.x - playerX;
      let strokePacingBoost = 1.0;
      if (distanceAhead > COMPANION_CONFIG.LEAD_DISTANCE_MAX) {
        strokePacingBoost = 0.35;
      } else if (distanceAhead < COMPANION_CONFIG.LEAD_DISTANCE_MIN) {
        strokePacingBoost = 1.45;
      }
      if (playerSpeed < 20) {
        strokePacingBoost = Math.min(strokePacingBoost, 0.25);
      }

      strokeCycleTimer += deltaTime;
      const strokeDownDuration = 0.42;
      const strokeUpDuration = 0.38;
      const totalStrokeDuration = strokeDownDuration + strokeUpDuration;

      const angleRad = k.deg2rad(companion.angle);
      const thrustDirection = k.vec2(Math.cos(angleRad), Math.sin(angleRad));

      if (strokeCycleTimer < strokeDownDuration) {
        if (strokePhase !== "down") {
          strokePhase = "down";
          if (typeof companion.play === "function") companion.play("stroke_down");
          audioSystem.playStrokeThrust();
        }
        const progress = strokeCycleTimer / strokeDownDuration;
        const thrustPower =
          (GAME_CONFIG.BASE_THRUST +
            Math.sin(progress * Math.PI) * GAME_CONFIG.PEAK_THRUST * 0.65) *
          strokePacingBoost;
        currentSpeed = currentSpeed.add(thrustDirection.scale(thrustPower * deltaTime));
      } else if (strokeCycleTimer < totalStrokeDuration) {
        if (strokePhase !== "up") {
          strokePhase = "up";
          if (typeof companion.play === "function") companion.play("stroke_up");
        }
        const thrustPower = GAME_CONFIG.BASE_THRUST * 0.45 * strokePacingBoost;
        currentSpeed = currentSpeed.add(thrustDirection.scale(thrustPower * deltaTime));
      } else if (strokeCycleTimer < totalStrokeDuration + glideDurationTarget) {
        if (strokePhase !== "glide") {
          strokePhase = "glide";
          if (typeof companion.play === "function") companion.play("glide");
        }
      } else {
        strokeCycleTimer = 0;
        glideDurationTarget = COMPANION_CONFIG.BASE_GLIDE_DURATION + prng() * 1.2;
      }
    }

    // 3. Cinemática e Arrasto Hidrodinâmico
    if (currentState !== "RESTING") {
      const effectiveSink =
        currentState === "SURFACE_BREATHE" || companion.pos.y <= GAME_CONFIG.SEA_LEVEL
          ? 0
          : GAME_CONFIG.SINK_RATE;

      if (currentSpeed.len() > COMPANION_CONFIG.MAX_SPEED) {
        currentSpeed = currentSpeed.unit().scale(COMPANION_CONFIG.MAX_SPEED);
      }

      if (typeof companion.move === "function") {
        companion.move(currentSpeed.x, currentSpeed.y + effectiveSink);
      } else {
        companion.pos.x += currentSpeed.x * deltaTime;
        companion.pos.y += (currentSpeed.y + effectiveSink) * deltaTime;
      }

      const waterDragFactor = Math.pow(GAME_CONFIG.WATER_DRAG, deltaTime * 60);
      currentSpeed = currentSpeed.scale(waterDragFactor);
    } else {
      // Estado de repouso: desacelera e estabiliza no local
      currentSpeed = currentSpeed.scale(Math.max(0, 1 - deltaTime * 4.0));
      if (typeof companion.move === "function" && currentSpeed.len() > 1) {
        companion.move(currentSpeed.x, currentSpeed.y);
      }
      const neutralDecayFactor = 1 - Math.pow(1 - 0.05, deltaTime * 60);
      companion.angle = k.lerp(companion.angle, 0, neutralDecayFactor);
    }

    // Failsafe do leito marinho
    const seabedLimit = k.height ? k.height() - COMPANION_CONFIG.SEABED_OFFSET : 500;
    if (companion.pos.y > seabedLimit) {
      companion.pos.y = seabedLimit;
      if (currentSpeed.y > 0) currentSpeed.y = 0;
    }
  };

  return {
    getSpeed: () => currentSpeed,
    setSpeed: (speed: Vec2) => {
      currentSpeed = speed;
    },
    update,
    handleIceBlockCollision,
    handleObstacleBlockCollision,
  };
}

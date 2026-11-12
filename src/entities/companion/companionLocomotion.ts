import { COMPANION_CONFIG, GAME_CONFIG } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import type { RandomNumberGenerator } from "../../utils/random";
import type { CompanionGameObject, CompanionState, CompanionVector2D } from "./types";
import type { CompanionEngineContext } from "./states/types";
import {
  clampCompanionValue,
  convertCompanionDegreesToRadians,
  createCompanionVector2D,
  linearInterpolateCompanionValue,
} from "./companionMathHelpers";

export interface CompanionLocomotion<TVec extends { x: number; y: number } = CompanionVector2D> {
  getSpeed: () => TVec;
  setSpeed: (speed: TVec) => void;
  update: (
    deltaTime: number,
    targetAngle: number,
    playerX?: number,
    playerSpeed?: number,
    currentState?: CompanionState
  ) => void;
  handleIceBlockCollision: (iceBlock?: CompanionGameObject) => void;
  handleObstacleBlockCollision: (obstacle?: CompanionGameObject) => void;
  handleNetCollision: (net?: CompanionGameObject) => void;
}

export interface CompanionLocomotionOptions<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  k: IRenderEngine | CompanionEngineContext<TDestroyable, TColor, TVec>;
  companion: CompanionGameObject;
  prng: RandomNumberGenerator;
  autonomyMode?: "guided" | "autonomous";
  isCoMigration?: boolean;
}

function scaleVector<TVec extends { x: number; y: number }>(
  engineContext: unknown,
  vector: TVec,
  scaleFactor: number
): TVec {
  if (typeof (vector as unknown as { scale?: (factor: number) => TVec }).scale === "function") {
    return (vector as unknown as { scale: (factor: number) => TVec }).scale(scaleFactor);
  }
  return createCompanionVector2D<TVec>(
    engineContext,
    vector.x * scaleFactor,
    vector.y * scaleFactor
  );
}

function addVectors<TVec extends { x: number; y: number }>(
  engineContext: unknown,
  firstVector: TVec,
  secondVector: TVec
): TVec {
  if (typeof (firstVector as unknown as { add?: (other: TVec) => TVec }).add === "function") {
    return (firstVector as unknown as { add: (other: TVec) => TVec }).add(secondVector);
  }
  return createCompanionVector2D<TVec>(
    engineContext,
    firstVector.x + secondVector.x,
    firstVector.y + secondVector.y
  );
}

function getVectorLength(vector: { x: number; y: number }): number {
  return Math.hypot(vector.x, vector.y);
}

function getUnitVector<TVec extends { x: number; y: number }>(
  engineContext: unknown,
  vector: TVec
): TVec {
  const vectorLength = Math.hypot(vector.x, vector.y);
  return vectorLength === 0
    ? createCompanionVector2D<TVec>(engineContext, 0, 0)
    : createCompanionVector2D<TVec>(
        engineContext,
        vector.x / vectorLength,
        vector.y / vectorLength
      );
}

/**
 * Módulo de Locomoção e Cinemática Hidrodinâmica da Baleia-Guia.
 * Implementa rotação vertical gradual, propulsão direcional da cauda,
 * arrasto d'água e colisões físicas com blocos de gelo.
 */
export function createCompanionLocomotion<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
>(options: CompanionLocomotionOptions<TDestroyable, TColor, TVec>): CompanionLocomotion<TVec> {
  const { k, companion, prng } = options;
  const legacyContext = k as CompanionEngineContext<TDestroyable, TColor, TVec>;
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);

  let currentSpeed = createCompanionVector2D<TVec>(k, COMPANION_CONFIG.BASE_SPEED, 0);
  let strokeCycleTimer = 0;
  let strokePhase: "down" | "up" | "glide" = "glide";
  let glideDurationTarget = COMPANION_CONFIG.BASE_GLIDE_DURATION;

  const handleIceBlockCollision = (_iceBlock?: CompanionGameObject): void => {
    if (currentSpeed.y < 0) {
      currentSpeed.y = 0;
    }
    if (companion.angle !== undefined && companion.angle < 0) {
      companion.angle = 0;
    }
    if (companion.pos.y < 92) {
      companion.pos.y = 92;
    }
  };

  const handleObstacleBlockCollision = (_obstacle?: CompanionGameObject): void => {
    currentSpeed.y = Math.abs(currentSpeed.y) + 40;
  };

  const handleNetCollision = (_net?: CompanionGameObject): void => {
    currentSpeed = scaleVector(k, currentSpeed, 0.3);
  };

  const update = (
    deltaTimeInSeconds: number,
    targetAngle: number,
    playerX?: number,
    playerSpeed?: number,
    currentState?: CompanionState
  ): void => {
    // 1. Giro vertical lento (espelha controle vertical da baleia do jogador)
    const rotationSpeed = GAME_CONFIG.ROTATION_SPEED * COMPANION_CONFIG.ROTATION_SPEED_FACTOR;
    const currentAngle = companion.angle ?? 0;
    const angleDifference = targetAngle - currentAngle;
    companion.angle =
      currentAngle +
      clampCompanionValue(
        angleDifference,
        -rotationSpeed * deltaTimeInSeconds,
        rotationSpeed * deltaTimeInSeconds
      );

    // 2. Propulsão direcional no ângulo virado
    const currentCompanionState = currentState ?? "CRUISE";
    if (
      currentCompanionState !== "SURFACE_BREATHE" &&
      currentCompanionState !== "RESTING" &&
      currentCompanionState !== "INTRO" &&
      currentCompanionState !== "FAINTED" &&
      currentCompanionState !== "TRAPPED"
    ) {
      let strokePacingBoost = 1.0;
      const isAutonomous =
        options.autonomyMode === "autonomous" ||
        options.isCoMigration ||
        currentCompanionState === "INDEPENDENT_CRUISE" ||
        currentCompanionState === "AVOID_OBSTACLE" ||
        currentCompanionState === "VICTORY_BREACH";

      if (isAutonomous) {
        strokePacingBoost = COMPANION_CONFIG.AUTONOMOUS_STROKE_PACING;
      } else if (playerX !== undefined) {
        const distanceAhead = companion.pos.x - playerX;
        if (distanceAhead > COMPANION_CONFIG.LEAD_DISTANCE_MAX) {
          strokePacingBoost = 0.35;
        } else if (distanceAhead < COMPANION_CONFIG.LEAD_DISTANCE_MIN) {
          strokePacingBoost = 1.45;
        }

        if (playerSpeed !== undefined && playerSpeed < 20) {
          strokePacingBoost = Math.min(strokePacingBoost, 0.25);
        }
      }

      if (currentCompanionState === "SEEK_BREATH") {
        strokePacingBoost = Math.max(1.3, strokePacingBoost);
      }

      strokeCycleTimer += deltaTimeInSeconds;
      const strokeDownDuration = 0.42;
      const strokeUpDuration = 0.38;
      const totalStrokeDuration = strokeDownDuration + strokeUpDuration;

      const angleInRadians = convertCompanionDegreesToRadians(companion.angle ?? 0);
      const thrustDirection = createCompanionVector2D<TVec>(
        k,
        Math.cos(angleInRadians),
        Math.sin(angleInRadians)
      );

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
        currentSpeed = addVectors(
          k,
          currentSpeed,
          scaleVector(k, thrustDirection, thrustPower * deltaTimeInSeconds)
        );
      } else if (strokeCycleTimer < totalStrokeDuration) {
        if (strokePhase !== "up") {
          strokePhase = "up";
          if (typeof companion.play === "function") companion.play("stroke_up");
        }
        const thrustPower = GAME_CONFIG.BASE_THRUST * 0.45 * strokePacingBoost;
        currentSpeed = addVectors(
          k,
          currentSpeed,
          scaleVector(k, thrustDirection, thrustPower * deltaTimeInSeconds)
        );
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
    if (currentState === "FAINTED") {
      currentSpeed = scaleVector(k, currentSpeed, Math.max(0, 1 - deltaTimeInSeconds * 2.5));
      const sinkSpeed = COMPANION_CONFIG.FAINT_SINK_RATE;
      if (typeof companion.move === "function") {
        companion.move(currentSpeed.x, sinkSpeed);
      } else {
        companion.pos.x += currentSpeed.x * deltaTimeInSeconds;
        companion.pos.y += sinkSpeed * deltaTimeInSeconds;
      }
      const neutralDecayFactor = 1 - Math.pow(1 - 0.05, deltaTimeInSeconds * 60);
      companion.angle = linearInterpolateCompanionValue(
        companion.angle ?? 0,
        5,
        neutralDecayFactor
      );
    } else if (currentState === "TRAPPED") {
      currentSpeed = scaleVector(k, currentSpeed, Math.max(0, 1 - deltaTimeInSeconds * 3.5));
      if (typeof companion.move === "function" && getVectorLength(currentSpeed) > 1) {
        companion.move(currentSpeed.x, currentSpeed.y + GAME_CONFIG.SINK_RATE * 0.5);
      } else if (getVectorLength(currentSpeed) > 1) {
        companion.pos.x += currentSpeed.x * deltaTimeInSeconds;
        companion.pos.y += (currentSpeed.y + GAME_CONFIG.SINK_RATE * 0.5) * deltaTimeInSeconds;
      }
    } else if (currentState !== "RESTING") {
      const effectiveSink =
        currentState === "SURFACE_BREATHE" || companion.pos.y <= GAME_CONFIG.SEA_LEVEL
          ? 0
          : GAME_CONFIG.SINK_RATE;

      if (getVectorLength(currentSpeed) > COMPANION_CONFIG.MAX_SPEED) {
        currentSpeed = scaleVector(k, getUnitVector(k, currentSpeed), COMPANION_CONFIG.MAX_SPEED);
      }

      if (typeof companion.move === "function") {
        companion.move(currentSpeed.x, currentSpeed.y + effectiveSink);
      } else {
        companion.pos.x += currentSpeed.x * deltaTimeInSeconds;
        companion.pos.y += (currentSpeed.y + effectiveSink) * deltaTimeInSeconds;
      }

      const waterDragFactor = Math.pow(GAME_CONFIG.WATER_DRAG, deltaTimeInSeconds * 60);
      currentSpeed = scaleVector(k, currentSpeed, waterDragFactor);
    } else {
      currentSpeed = scaleVector(k, currentSpeed, Math.max(0, 1 - deltaTimeInSeconds * 4.0));
      if (typeof companion.move === "function" && getVectorLength(currentSpeed) > 1) {
        companion.move(currentSpeed.x, currentSpeed.y);
      } else if (getVectorLength(currentSpeed) > 1) {
        companion.pos.x += currentSpeed.x * deltaTimeInSeconds;
        companion.pos.y += currentSpeed.y * deltaTimeInSeconds;
      }
      const neutralDecayFactor = 1 - Math.pow(1 - 0.05, deltaTimeInSeconds * 60);
      companion.angle = linearInterpolateCompanionValue(
        companion.angle ?? 0,
        0,
        neutralDecayFactor
      );
    }

    // Failsafe do leito marinho
    const viewportHeight = resolvedNativeRenderEngine
      ? resolvedNativeRenderEngine.getDimensions().height
      : typeof legacyContext.height === "function"
        ? legacyContext.height()
        : 540;
    const seabedLimit = viewportHeight - COMPANION_CONFIG.SEABED_OFFSET;
    if (companion.pos.y > seabedLimit) {
      companion.pos.y = seabedLimit;
      if (currentSpeed.y > 0) currentSpeed.y = 0;
    }
  };

  return {
    getSpeed: () => currentSpeed,
    setSpeed: (speed: TVec) => {
      currentSpeed = speed;
    },
    update,
    handleIceBlockCollision,
    handleObstacleBlockCollision,
    handleNetCollision,
  };
}

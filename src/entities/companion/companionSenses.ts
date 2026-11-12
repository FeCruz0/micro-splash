import { COMPANION_CONFIG, GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { revealEntitiesInSonarRadius, type NativePlayerSonarContext } from "../player/playerSonar";
import type { RandomNumberGenerator } from "../../utils/random";
import type { SpatialHashGrid, SpatialAABB } from "../../systems/spatialHashGrid";
import type { CompanionGameObject, CompanionState, CompanionVector2D } from "./types";
import type { CompanionEngineContext } from "./states/types";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { createNativeCircleNode } from "../../engine/adapters/NativeRenderNodeFactory";
import { createCompanionVector2D } from "./companionMathHelpers";

export interface CompanionSenses<TGameObj = CompanionGameObject> {
  getTargetKrill: () => TGameObj | null;
  clearTargetKrill: () => void;
  getTargetHazard: () => TGameObj | null;
  clearTargetHazard: () => void;
  triggerSonar: () => void;
  update: (
    deltaTimeInSeconds: number,
    playerX?: number,
    currentOxygen?: number,
    currentState?: CompanionState
  ) => void;
}

export interface CompanionSensesOptions<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
> {
  k: IRenderEngine | CompanionEngineContext<TDestroyable, TColor, TVec>;
  companion: CompanionGameObject;
  prng: RandomNumberGenerator;
  spatialGrid?: SpatialHashGrid<TGameObj>;
  autonomyMode?: "guided" | "autonomous";
  isCoMigration?: boolean;
}

export interface SonarRingObject {
  radius?: number;
  opacity?: number;
  onUpdate: (callback: () => void) => void;
}

/**
 * Módulo de Percepção Sensorial e Biosonar da Baleia-Guia.
 * Utiliza PRNG determinístico para intervalos de sonar e grade espacial O(1) para varredura de krill e perigos.
 */
export function createCompanionSenses<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
  TGameObj = CompanionGameObject,
>(
  options: CompanionSensesOptions<TDestroyable, TColor, TVec, TGameObj>
): CompanionSenses<TGameObj> {
  const { k, companion, prng, spatialGrid } = options;
  const legacyContext = k as CompanionEngineContext<TDestroyable, TColor, TVec>;

  let perceptionCooldownTimer = 0;
  let sonarCooldownTimer = 10.0;
  let targetKrillEntity: TGameObj | null = null;
  let targetHazardEntity: TGameObj | null = null;
  const hazardBoundingBox: SpatialAABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const krillBoundingBox: SpatialAABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const emptyCandidates: TGameObj[] = [];

  const triggerSonar = (): void => {
    const headPositionX = companion.pos.x + 40;
    const headPositionY = companion.pos.y;
    audioSystem.playSonarSound();

    const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
    const worldRenderContainer = resolvedNativeRenderEngine
      ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
      : null;

    if (resolvedNativeRenderEngine && worldRenderContainer) {
      for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
        let expansionRadius = 10 + waveIndex * 12;
        let ringOpacity = 0.85;

        const sonarRingNode = createNativeCircleNode(
          k,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: `companion_sonar_ring_${waveIndex}`,
            radius: 10,
            positionX: headPositionX,
            positionY: headPositionY,
            fillColor: [100, 240, 255],
            outlineColor: [180, 250, 255],
            outlineWidth: 2,
            opacity: 0.85,
            zIndex: 21,
          }
        );

        sonarRingNode.onUpdate((deltaTimeInSeconds: number) => {
          expansionRadius += deltaTimeInSeconds * 260;
          ringOpacity -= deltaTimeInSeconds * 0.95;
          sonarRingNode.radius = expansionRadius;
          sonarRingNode.opacity = Math.max(0, ringOpacity);
          if (ringOpacity <= 0) {
            sonarRingNode.destroy();
          }
        });
      }
    }

    const headPosition = createCompanionVector2D<TVec>(k, headPositionX, headPositionY);
    revealEntitiesInSonarRadius(
      k as unknown as NativePlayerSonarContext,
      headPosition,
      GAME_CONFIG.SONAR_RANGE
    );
  };

  const update = (
    deltaTimeInSeconds: number,
    playerX?: number,
    currentOxygen?: number,
    currentState?: CompanionState
  ): void => {
    sonarCooldownTimer = Math.max(0, sonarCooldownTimer - deltaTimeInSeconds);
    perceptionCooldownTimer -= deltaTimeInSeconds;

    if (perceptionCooldownTimer > 0) return;
    perceptionCooldownTimer = COMPANION_CONFIG.RADAR_INTERVAL;

    // Disparo periódico do biosonar em águas profundas
    if (
      sonarCooldownTimer <= 0 &&
      companion.pos.x > 300 &&
      currentState !== "RESTING" &&
      currentState !== "FAINTED"
    ) {
      sonarCooldownTimer = 14.0 + prng() * 8.0;
      triggerSonar();
    }

    // 1. Detecção de Ameaças / Obstáculos à frente (Fase 60)
    if (currentState !== "RESTING" && currentState !== "DEPARTED" && currentState !== "FAINTED") {
      const hazardAheadRange = COMPANION_CONFIG.HAZARD_AVOID_RANGE;
      const hazardVerticalRange = COMPANION_CONFIG.HAZARD_VERTICAL_CLEARANCE;

      hazardBoundingBox.minX = companion.pos.x + 20;
      hazardBoundingBox.minY = companion.pos.y - hazardVerticalRange;
      hazardBoundingBox.maxX = companion.pos.x + hazardAheadRange;
      hazardBoundingBox.maxY = companion.pos.y + hazardVerticalRange;

      const candidates: TGameObj[] = spatialGrid
        ? spatialGrid.queryAABB(hazardBoundingBox)
        : typeof legacyContext.get === "function"
          ? [
              ...(legacyContext.get(TAGS.NET) as unknown as TGameObj[]),
              ...(legacyContext.get(TAGS.OBSTACLE) as unknown as TGameObj[]),
              ...(legacyContext.get(TAGS.TRASH) as unknown as TGameObj[]),
              ...(legacyContext.get("ice_block") as unknown as TGameObj[]),
            ]
          : emptyCandidates;

      let closestHazard: TGameObj | null = null;
      let shortestHazardDistance: number = hazardAheadRange;

      for (let index = 0; index < candidates.length; index++) {
        const candidateItem = candidates[index] as unknown as CompanionGameObject;
        if (!candidateItem || !candidateItem.pos) continue;
        const isHazard =
          typeof candidateItem.is === "function"
            ? candidateItem.is(TAGS.NET) ||
              candidateItem.is(TAGS.OBSTACLE) ||
              candidateItem.is(TAGS.TRASH) ||
              candidateItem.is("ice_block") ||
              candidateItem.is("navio") ||
              candidateItem.is("barco")
            : false;
        if (!isHazard) continue;

        const deltaX = candidateItem.pos.x - companion.pos.x;
        const deltaY = Math.abs(candidateItem.pos.y - companion.pos.y);
        if (deltaX > 20 && deltaX < shortestHazardDistance && deltaY < hazardVerticalRange) {
          shortestHazardDistance = deltaX;
          closestHazard = candidates[index];
        }
      }
      targetHazardEntity = closestHazard;
    } else {
      targetHazardEntity = null;
    }

    // 2. Detecção de Krill: busca cardumes à frente quando não estiver em busca de ar
    const oxygenLevel = currentOxygen ?? 100;
    if (
      oxygenLevel >= COMPANION_CONFIG.CRITICAL_OXYGEN &&
      currentState !== "FEEDING" &&
      currentState !== "FAREWELL_BREACH" &&
      currentState !== "RESTING" &&
      currentState !== "FAINTED"
    ) {
      const aheadRange = COMPANION_CONFIG.RADAR_AHEAD_RANGE;
      const verticalRange = COMPANION_CONFIG.RADAR_VERTICAL_RANGE;

      krillBoundingBox.minX = companion.pos.x + 20;
      krillBoundingBox.minY = companion.pos.y - verticalRange;
      krillBoundingBox.maxX = companion.pos.x + aheadRange;
      krillBoundingBox.maxY = companion.pos.y + verticalRange;

      const availableKrills: TGameObj[] = spatialGrid
        ? spatialGrid.queryAABB(krillBoundingBox)
        : typeof legacyContext.get === "function"
          ? (legacyContext.get(TAGS.KRILL) as unknown as TGameObj[])
          : emptyCandidates;
      let bestTarget: TGameObj | null = null;
      let shortestDistance: number = aheadRange;

      for (let index = 0; index < availableKrills.length; index++) {
        const krill = availableKrills[index] as unknown as CompanionGameObject;
        if (!krill.pos) continue;
        const deltaX = krill.pos.x - companion.pos.x;

        if (
          deltaX > 20 &&
          deltaX < shortestDistance &&
          Math.abs(krill.pos.y - companion.pos.y) < COMPANION_CONFIG.RADAR_VERTICAL_RANGE
        ) {
          const isGuidedTutorial = options.autonomyMode !== "autonomous" && !options.isCoMigration;
          if (isGuidedTutorial && playerX !== undefined) {
            const playerDistanceToKrill = Math.abs(krill.pos.x - playerX);
            if (playerDistanceToKrill <= 50) {
              continue;
            }
          }
          shortestDistance = deltaX;
          bestTarget = availableKrills[index];
        }
      }
      targetKrillEntity = bestTarget;
    }
  };

  return {
    getTargetKrill: () => targetKrillEntity,
    clearTargetKrill: () => {
      targetKrillEntity = null;
    },
    getTargetHazard: () => targetHazardEntity,
    clearTargetHazard: () => {
      targetHazardEntity = null;
    },
    triggerSonar,
    update,
  };
}

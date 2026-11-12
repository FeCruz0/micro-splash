import { COMPANION_CONFIG, GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { revealEntitiesInSonarRadius } from "../player/playerSonar";
import type { RandomNumberGenerator } from "../../utils/random";
import type { SpatialHashGrid, SpatialAABB } from "../../systems/spatialHashGrid";
import type { CompanionGameObject, CompanionState, CompanionVector2D } from "./types";
import type { CompanionEngineContext } from "./states/types";
import { resolveInitializedRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { createNativeCircleNode } from "../../engine/adapters/NativeRenderNodeFactory";

export interface CompanionSenses<TGameObj = CompanionGameObject> {
  getTargetKrill: () => TGameObj | null;
  clearTargetKrill: () => void;
  getTargetHazard: () => TGameObj | null;
  clearTargetHazard: () => void;
  triggerSonar: () => void;
  update: (
    deltaTime: number,
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
  k: CompanionEngineContext<TDestroyable, TColor, TVec>;
  companion: CompanionGameObject;
  prng: RandomNumberGenerator;
  spatialGrid?: SpatialHashGrid<TGameObj>;
  autonomyMode?: "guided" | "autonomous";
  isCoMigration?: boolean;
}

export interface SonarRingObject {
  radius?: number;
  opacity?: number;
  onUpdate: (cb: () => void) => void;
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

  let perceptionCooldownTimer = 0;
  let sonarCooldownTimer = 10.0;
  let targetKrillEntity: TGameObj | null = null;
  let targetHazardEntity: TGameObj | null = null;
  const hazardAABB: SpatialAABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const krillAABB: SpatialAABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const emptyCandidates: TGameObj[] = [];

  const triggerSonar = (): void => {
    const headX = companion.pos.x + 40;
    const headY = companion.pos.y;
    audioSystem.playSonarSound();

    const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
    const worldRenderContainer = resolvedNativeRenderEngine
      ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
      : null;

    // Ondas concêntricas visuais
    for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
      let expansionRadius = 10 + waveIndex * 12;
      let ringOpacity = 0.85;

      if (resolvedNativeRenderEngine && worldRenderContainer) {
        const ring = createNativeCircleNode(k, resolvedNativeRenderEngine, worldRenderContainer, {
          identifier: `companion_sonar_ring_${waveIndex}`,
          radius: 10,
          positionX: headX,
          positionY: headY,
          fillColor: [100, 240, 255],
          outlineColor: [180, 250, 255],
          outlineWidth: 2,
          opacity: 0.85,
          zIndex: 21,
        });

        ring.onUpdate((deltaTimeInSeconds: number) => {
          expansionRadius += deltaTimeInSeconds * 260;
          ringOpacity -= deltaTimeInSeconds * 0.95;
          ring.radius = expansionRadius;
          ring.opacity = Math.max(0, ringOpacity);
          if (ringOpacity <= 0) {
            ring.destroy();
          }
        });
      } else {
        const ringComponents: unknown[] = [
          k.circle(10),
          k.pos(headX, headY),
          k.color(100, 240, 255),
          k.opacity(0.85),
          k.z(21),
        ];
        if (k.outline) {
          ringComponents.push(k.outline(2, k.rgb(180, 250, 255)));
        }

        const ring = k.add(ringComponents) as SonarRingObject;

        ring.onUpdate(() => {
          const dt = k.dt();
          expansionRadius += dt * 260;
          ringOpacity -= dt * 0.95;
          ring.radius = expansionRadius;
          ring.opacity = Math.max(0, ringOpacity);
          if (ringOpacity <= 0) {
            k.destroy(ring as unknown as TDestroyable);
          }
        });
      }
    }

    // Varredura acústica real: revela entidades no mapa
    const headPosition =
      typeof k.vec2 === "function" ? k.vec2(headX, headY) : { x: headX, y: headY };
    if (typeof revealEntitiesInSonarRadius === "function") {
      revealEntitiesInSonarRadius(
        k as unknown as Parameters<typeof revealEntitiesInSonarRadius>[0],
        headPosition as unknown as Parameters<typeof revealEntitiesInSonarRadius>[1],
        GAME_CONFIG.SONAR_RANGE
      );
    }
  };

  const update = (
    deltaTime: number,
    playerX?: number,
    currentOxygen?: number,
    currentState?: CompanionState
  ): void => {
    sonarCooldownTimer = Math.max(0, sonarCooldownTimer - deltaTime);
    perceptionCooldownTimer -= deltaTime;

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
      const hazardVertRange = COMPANION_CONFIG.HAZARD_VERTICAL_CLEARANCE;

      hazardAABB.minX = companion.pos.x + 20;
      hazardAABB.minY = companion.pos.y - hazardVertRange;
      hazardAABB.maxX = companion.pos.x + hazardAheadRange;
      hazardAABB.maxY = companion.pos.y + hazardVertRange;

      const candidates: TGameObj[] = spatialGrid
        ? spatialGrid.queryAABB(hazardAABB)
        : typeof k.get === "function"
          ? [
              ...(k.get(TAGS.NET) as unknown as TGameObj[]),
              ...(k.get(TAGS.OBSTACLE) as unknown as TGameObj[]),
              ...(k.get(TAGS.TRASH) as unknown as TGameObj[]),
              ...(k.get("ice_block") as unknown as TGameObj[]),
            ]
          : emptyCandidates;

      let closestHazard: TGameObj | null = null;
      let shortestHazardDist: number = hazardAheadRange;

      for (let i = 0; i < candidates.length; i++) {
        const item = candidates[i] as unknown as CompanionGameObject;
        if (!item || !item.pos) continue;
        const isHazard =
          typeof item.is === "function"
            ? item.is(TAGS.NET) ||
              item.is(TAGS.OBSTACLE) ||
              item.is(TAGS.TRASH) ||
              item.is("ice_block") ||
              item.is("navio") ||
              item.is("barco")
            : false;
        if (!isHazard) continue;

        const deltaX = item.pos.x - companion.pos.x;
        const deltaY = Math.abs(item.pos.y - companion.pos.y);
        if (deltaX > 20 && deltaX < shortestHazardDist && deltaY < hazardVertRange) {
          shortestHazardDist = deltaX;
          closestHazard = candidates[i];
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
      const vertRange = COMPANION_CONFIG.RADAR_VERTICAL_RANGE;

      krillAABB.minX = companion.pos.x + 20;
      krillAABB.minY = companion.pos.y - vertRange;
      krillAABB.maxX = companion.pos.x + aheadRange;
      krillAABB.maxY = companion.pos.y + vertRange;

      const availableKrills: TGameObj[] = spatialGrid
        ? spatialGrid.queryAABB(krillAABB)
        : typeof k.get === "function"
          ? (k.get(TAGS.KRILL) as unknown as TGameObj[])
          : emptyCandidates;
      let bestTarget: TGameObj | null = null;
      let shortestDist: number = aheadRange;

      for (let i = 0; i < availableKrills.length; i++) {
        const krill = availableKrills[i] as unknown as CompanionGameObject;
        if (!krill.pos) continue;
        const deltaX = krill.pos.x - companion.pos.x;

        // Krill à frente e dentro do cone sensorial
        if (
          deltaX > 20 &&
          deltaX < shortestDist &&
          Math.abs(krill.pos.y - companion.pos.y) < COMPANION_CONFIG.RADAR_VERTICAL_RANGE
        ) {
          // No modo guiado/tutorial, a baleia-guia cede o krill se o jogador estiver muito próximo
          const isGuidedTutorial = options.autonomyMode !== "autonomous" && !options.isCoMigration;
          if (isGuidedTutorial && playerX !== undefined) {
            const playerDistToKrill = Math.abs(krill.pos.x - playerX);
            if (playerDistToKrill <= 50) {
              continue;
            }
          }
          shortestDist = deltaX;
          bestTarget = availableKrills[i];
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

import type { GameObj, KaboomCtx } from "kaboom";
import { COMPANION_CONFIG, GAME_CONFIG, TAGS } from "../../config";
import { audioSystem } from "../../systems/audioSystem";
import { revealEntitiesInSonarRadius } from "../player/playerSonar";
import type { RandomNumberGenerator } from "../../utils/random";
import type { SpatialHashGrid } from "../../systems/spatialHashGrid";
import type { CompanionState } from "./types";

export interface CompanionSenses {
  getTargetKrill: () => GameObj | null;
  clearTargetKrill: () => void;
  getTargetHazard: () => GameObj | null;
  clearTargetHazard: () => void;
  triggerSonar: () => void;
  update: (
    deltaTime: number,
    playerX: number,
    currentOxygen: number,
    currentState: CompanionState
  ) => void;
}

export interface CompanionSensesOptions {
  k: KaboomCtx;
  companion: GameObj;
  prng: RandomNumberGenerator;
  spatialGrid?: SpatialHashGrid<GameObj>;
}

/**
 * Módulo de Percepção Sensorial e Biosonar da Baleia-Guia.
 * Utiliza PRNG determinístico para intervalos de sonar e grade espacial O(1) para varredura de krill e perigos.
 */
export function createCompanionSenses(options: CompanionSensesOptions): CompanionSenses {
  const { k, companion, prng, spatialGrid } = options;

  let perceptionCooldownTimer = 0;
  let sonarCooldownTimer = 10.0;
  let targetKrillEntity: GameObj | null = null;
  let targetHazardEntity: GameObj | null = null;

  const triggerSonar = (): void => {
    const headX = companion.pos.x + 40;
    const headY = companion.pos.y;
    audioSystem.playSonarSound();

    // Ondas concêntricas visuais
    for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
      const ring = k.add([
        k.circle(10),
        k.pos(headX, headY),
        k.color(100, 240, 255),
        k.opacity(0.85),
        k.outline(2, k.rgb(180, 250, 255)),
        k.z(21),
      ]);

      let expansionRadius = 10 + waveIndex * 12;
      let ringOpacity = 0.85;
      ring.onUpdate(() => {
        const dt = k.dt();
        expansionRadius += dt * 260;
        ringOpacity -= dt * 0.95;
        ring.radius = expansionRadius;
        ring.opacity = Math.max(0, ringOpacity);
        if (ringOpacity <= 0) {
          k.destroy(ring);
        }
      });
    }

    // Varredura acústica real: revela entidades no mapa
    const headPosition = k.vec2(headX, headY);
    revealEntitiesInSonarRadius(k, headPosition, GAME_CONFIG.SONAR_RANGE);
  };

  const update = (
    deltaTime: number,
    playerX: number,
    currentOxygen: number,
    currentState: CompanionState
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

      const candidates = spatialGrid
        ? spatialGrid.queryAABB({
            minX: companion.pos.x + 20,
            minY: companion.pos.y - hazardVertRange,
            maxX: companion.pos.x + hazardAheadRange,
            maxY: companion.pos.y + hazardVertRange,
          })
        : [
            ...(typeof k.get === "function" ? k.get(TAGS.NET) : []),
            ...(typeof k.get === "function" ? k.get(TAGS.OBSTACLE) : []),
            ...(typeof k.get === "function" ? k.get(TAGS.TRASH) : []),
            ...(typeof k.get === "function" ? k.get("ice_block") : []),
          ];

      let closestHazard: GameObj | null = null;
      let shortestHazardDist: number = hazardAheadRange;

      for (let i = 0; i < candidates.length; i++) {
        const item = candidates[i];
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
          closestHazard = item;
        }
      }
      targetHazardEntity = closestHazard;
    } else {
      targetHazardEntity = null;
    }

    // 2. Detecção de Krill: busca cardumes à frente quando não estiver em busca de ar
    if (
      currentOxygen >= COMPANION_CONFIG.CRITICAL_OXYGEN &&
      currentState !== "FEEDING" &&
      currentState !== "FAREWELL_BREACH" &&
      currentState !== "RESTING" &&
      currentState !== "FAINTED"
    ) {
      const aheadRange = COMPANION_CONFIG.RADAR_AHEAD_RANGE;
      const vertRange = COMPANION_CONFIG.RADAR_VERTICAL_RANGE;

      const availableKrills = spatialGrid
        ? spatialGrid.queryAABB({
            minX: companion.pos.x + 20,
            minY: companion.pos.y - vertRange,
            maxX: companion.pos.x + aheadRange,
            maxY: companion.pos.y + vertRange,
          })
        : typeof k.get === "function"
          ? k.get(TAGS.KRILL)
          : [];
      let bestTarget: GameObj | null = null;
      let shortestDist: number = aheadRange;

      for (let i = 0; i < availableKrills.length; i++) {
        const krill = availableKrills[i];
        if (!krill.pos) continue;
        const deltaX = krill.pos.x - companion.pos.x;

        // Krill à frente e dentro do cone sensorial
        if (
          deltaX > 20 &&
          deltaX < shortestDist &&
          Math.abs(krill.pos.y - companion.pos.y) < COMPANION_CONFIG.RADAR_VERTICAL_RANGE
        ) {
          // Se o jogador estiver muito mais perto do krill, a baleia-guia deixa para ele
          const playerDistToKrill = Math.abs(krill.pos.x - playerX);
          if (playerDistToKrill > 50) {
            shortestDist = deltaX;
            bestTarget = krill;
          }
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

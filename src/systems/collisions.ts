import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import { hapticsSystem } from "./hapticsSystem";
import { accessibilitySystem } from "./accessibilitySystem";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";
import { getSereneInsightsManager } from "./sereneMigrationInsights";
import { isCompanionCollidable } from "../entities/companion/types";
import { getActiveCompanionWhaleObjects } from "../entities/companion";
import { getSpatialGrid, type SpatialAABB } from "./spatialHashGrid";
import type { SystemRunner } from "./systemRunner";

export interface CollisionVector2D {
  x: number;
  y: number;
}

export interface CollisionGameObject {
  id?: string;
  tag?: string;
  tags?: string[];
  isStatic?: boolean;
  pos?: { x?: number; y?: number };
  is?: (tag: string) => boolean;
  destroy?: () => void;
}

export interface AirVentEntity extends CollisionGameObject {
  collectAir?: () => boolean;
}

export interface IceBlockEntity extends CollisionGameObject {
  pos: { y: number; x?: number };
  breakIce?: () => void;
}

export interface CompanionCollisionGameObject extends CollisionGameObject {
  consumeKrill?: (krill: unknown) => void;
  handleIceCollision?: (iceBlock: unknown) => void;
  handleObstacleCollision?: (obstacle: unknown) => void;
  handleNetCollision?: (net: unknown) => void;
}

export interface CollisionsEngineContext<TDestroyable = unknown> {
  destroy?: (obj: TDestroyable) => void;
  time?: () => number;
  shake?: (amount: number) => void;
  onUpdate?: (cb: () => void) => unknown;
  get?: (tag: string) => unknown[];
  onCollide?: (tag1: string, tag2: string, cb: (obj1: unknown, obj2: unknown) => void) => unknown;
}

export interface CollisionSystemController {
  runCollisionPhase: () => void;
  destroy: () => void;
}

/**
 * Sistema Unificado de Resolução de Colisões via SpatialHashGrid (Fase 59 / Etapa 2.2).
 *
 * Elimina totalmente as varreduras e callbacks legados de k.onCollide, substituindo-os
 * por consultas estritas queryAABB no SpatialHashGrid ao final da fase canônica de colisão.
 */
export function setupCollisions<TDestroyable = unknown>(
  engineContext: CollisionsEngineContext<TDestroyable>,
  playerController: PlayerController,
  gameState: GameState,
  systemRunner?: SystemRunner
): CollisionSystemController {
  let lastObstacleBumpTime = 0;
  let isSystemActive = true;
  let unregisterSystemRunnerTask: (() => void) | null = null;

  const queryBoundingBox: SpatialAABB = {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  };

  const companionBoundingBox: SpatialAABB = {
    minX: 0,
    minY: 0,
    maxX: 0,
    maxY: 0,
  };

  const runCollisionPhase = (): void => {
    if (!isSystemActive || playerController.isFrozen()) return;

    const spatialGrid = getSpatialGrid();
    if (!spatialGrid) return;

    const playerGameObject = playerController.gameObj;
    if (playerGameObject && playerGameObject.pos) {
      const playerCenterX = playerGameObject.pos.x;
      const playerCenterY = playerGameObject.pos.y;

      queryBoundingBox.minX = playerCenterX - 54;
      queryBoundingBox.minY = playerCenterY - 19;
      queryBoundingBox.maxX = playerCenterX + 54;
      queryBoundingBox.maxY = playerCenterY + 19;

      const nearbyCollisionEntities = spatialGrid.queryAABB(queryBoundingBox);
      const totalCandidates = nearbyCollisionEntities.length;

      for (let candidateIndex = 0; candidateIndex < totalCandidates; candidateIndex++) {
        const candidateEntity = nearbyCollisionEntities[
          candidateIndex
        ] as CollisionGameObject | null;
        if (!candidateEntity) continue;

        // 1. LIXO PLÁSTICO (TAGS.TRASH = "lixo_plastico")
        const isTrashEntity =
          (typeof candidateEntity.is === "function" &&
            (candidateEntity.is(TAGS.TRASH) || candidateEntity.is("trash"))) ||
          candidateEntity.tag === TAGS.TRASH ||
          candidateEntity.tag === "trash" ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("trash_"));

        if (isTrashEntity) {
          if (candidateEntity.id) {
            spatialGrid.remove(candidateEntity.id);
          }
          if (typeof engineContext.destroy === "function") {
            engineContext.destroy(candidateEntity as unknown as TDestroyable);
          }
          if (typeof candidateEntity.destroy === "function") {
            candidateEntity.destroy();
          }

          gameState.addTrash();
          getSereneInsightsManager()?.trigger("ocean_trash_threat");

          audioSystem.playTrashThud(candidateEntity.pos?.x, playerCenterX);
          hapticsSystem.triggerCollision();

          const currentSpeed = playerController.getSpeed();
          playerController.setSpeed(currentSpeed.scale(GAME_CONFIG.TRASH_SLOWDOWN));
          playerController.penalizeTrash();

          accessibilitySystem.triggerShake(
            engineContext as Parameters<typeof accessibilitySystem.triggerShake>[0],
            3
          );
          continue;
        }

        // 2. BOLSÃO DE AR NATURAL (TAGS.AIR_POCKET = "bolsao_ar")
        const isAirPocketEntity =
          (typeof candidateEntity.is === "function" &&
            (candidateEntity.is(TAGS.AIR_POCKET) ||
              candidateEntity.is("air_pocket") ||
              candidateEntity.is("vent"))) ||
          candidateEntity.tag === TAGS.AIR_POCKET ||
          candidateEntity.tag === "air_pocket" ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("vent_")) ||
          typeof (candidateEntity as AirVentEntity).collectAir === "function";

        if (isAirPocketEntity) {
          const airVentEntity = candidateEntity as AirVentEntity;
          if (typeof airVentEntity.collectAir === "function" && airVentEntity.collectAir()) {
            audioSystem.playPowerupCollect(airVentEntity.pos?.x, playerCenterX);
            playerController.restoreOxygen(playerController.getMaxOxygen() * 0.35);
            accessibilitySystem.triggerShake(
              engineContext as Parameters<typeof accessibilitySystem.triggerShake>[0],
              1.5
            );
          }
          continue;
        }

        // 3. KRILL NUTRITIVO (TAGS.KRILL = "krill")
        const isKrillEntity =
          (typeof candidateEntity.is === "function" && candidateEntity.is(TAGS.KRILL)) ||
          candidateEntity.tag === TAGS.KRILL ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("krill_"));

        if (isKrillEntity) {
          if (candidateEntity.id) {
            spatialGrid.remove(candidateEntity.id);
          }
          if (typeof engineContext.destroy === "function") {
            engineContext.destroy(candidateEntity as unknown as TDestroyable);
          }
          if (typeof candidateEntity.destroy === "function") {
            candidateEntity.destroy();
          }

          gameState.addKrill();
          getSereneInsightsManager()?.trigger("krill_feeding");

          audioSystem.playKrillGulp(candidateEntity.pos?.x, playerCenterX);
          playerController.consumeKrill();
          continue;
        }

        // 4. REDE FANTASMA (TAGS.NET = "rede_fantasma")
        const isGhostNetEntity =
          (typeof candidateEntity.is === "function" &&
            (candidateEntity.is(TAGS.NET) ||
              candidateEntity.is("net") ||
              candidateEntity.is("ghost_net"))) ||
          candidateEntity.tag === TAGS.NET ||
          candidateEntity.tag === "net" ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("net_"));

        if (isGhostNetEntity) {
          if (candidateEntity.id) {
            spatialGrid.remove(candidateEntity.id);
          }
          if (typeof engineContext.destroy === "function") {
            engineContext.destroy(candidateEntity as unknown as TDestroyable);
          }
          if (typeof candidateEntity.destroy === "function") {
            candidateEntity.destroy();
          }

          getSereneInsightsManager()?.trigger("ghost_net_entanglement");
          audioSystem.playNetTangle(candidateEntity.pos?.x, playerCenterX);
          hapticsSystem.triggerCollision();

          if (!playerController.isTrapped()) {
            playerController.trapInNet(GAME_CONFIG.NET_ESCAPE_COUNT);
            accessibilitySystem.triggerShake(
              engineContext as Parameters<typeof accessibilitySystem.triggerShake>[0],
              5
            );
          } else {
            playerController.addTrapCount(3);
            accessibilitySystem.triggerShake(
              engineContext as Parameters<typeof accessibilitySystem.triggerShake>[0],
              4
            );
          }

          const rawPlayer = (playerGameObject ?? playerController.gameObj) as unknown as {
            netOverlaySprite?: {
              visible?: boolean;
              hidden?: boolean;
              opacity?: number;
              alpha?: number;
              setVisible?: (visible: boolean) => void;
              setOpacity?: (alpha: number) => void;
            };
          };
          const netOverlay = rawPlayer?.netOverlaySprite;
          if (netOverlay) {
            netOverlay.visible = true;
            netOverlay.hidden = false;
            netOverlay.opacity = 1.0;
            netOverlay.alpha = 1.0;
            if (typeof netOverlay.setVisible === "function") netOverlay.setVisible(true);
            if (typeof netOverlay.setOpacity === "function") netOverlay.setOpacity(1.0);
          }
          continue;
        }

        // 5. BLOCO DE GELO ("ice_block")
        const isIceBlockEntity =
          (typeof candidateEntity.is === "function" &&
            (candidateEntity.is("ice_block") || candidateEntity.is("ice"))) ||
          candidateEntity.tag === "ice_block" ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("ice_block")) ||
          typeof (candidateEntity as IceBlockEntity).breakIce === "function";

        if (isIceBlockEntity) {
          const iceBlock = candidateEntity as IceBlockEntity;
          const currentVelocity = playerController.getSpeed();
          const iceBlockTopY = iceBlock.pos ? iceBlock.pos.y : GAME_CONFIG.SEA_LEVEL;
          const isBreachingFromAbove = playerCenterY <= iceBlockTopY + 8 && currentVelocity.y >= 0;

          if (isBreachingFromAbove && typeof iceBlock.breakIce === "function") {
            hapticsSystem.triggerIceBreach();
            iceBlock.breakIce();
            if (candidateEntity.id) {
              spatialGrid.remove(candidateEntity.id);
            }
          }
          continue;
        }

        // 6. FORMAÇÕES ROCHOSAS E NAVIOS (TAGS.OBSTACLE = "obstaculo")
        const isObstacleOrShipEntity =
          (typeof candidateEntity.is === "function" &&
            (candidateEntity.is(TAGS.OBSTACLE) ||
              candidateEntity.is("ship") ||
              candidateEntity.is("fishing_trawler") ||
              candidateEntity.is("navio"))) ||
          candidateEntity.tag === TAGS.OBSTACLE ||
          candidateEntity.tag === "ship" ||
          candidateEntity.tag === "fishing_trawler";

        if (isObstacleOrShipEntity) {
          const currentTime =
            typeof engineContext.time === "function"
              ? engineContext.time()
              : performance.now() / 1000;
          if (currentTime - lastObstacleBumpTime > 0.35) {
            lastObstacleBumpTime = currentTime;
            audioSystem.playTrashThud();
            accessibilitySystem.triggerShake(
              engineContext as Parameters<typeof accessibilitySystem.triggerShake>[0],
              2.0
            );
          }
          continue;
        }
      }
    }

    // =========================================================================
    // COLISÕES DA BALEIA-GUIA NPC (Fase 56 & 60 via SpatialHashGrid)
    // =========================================================================
    const contextCompanionEntities =
      typeof engineContext.get === "function" ? engineContext.get("companion_whale") : [];
    const activeNativeCompanions = getActiveCompanionWhaleObjects();
    const companionEntities = Array.from(
      new Set<unknown>([...activeNativeCompanions, ...contextCompanionEntities])
    );

    for (let cIndex = 0; cIndex < companionEntities.length; cIndex++) {
      const companionObject = companionEntities[cIndex] as CompanionCollisionGameObject;
      if (
        !companionObject ||
        !companionObject.pos ||
        companionObject.pos.x === undefined ||
        companionObject.pos.y === undefined
      ) {
        continue;
      }

      companionBoundingBox.minX = companionObject.pos.x - 45;
      companionBoundingBox.minY = companionObject.pos.y - 18;
      companionBoundingBox.maxX = companionObject.pos.x + 45;
      companionBoundingBox.maxY = companionObject.pos.y + 18;

      const companionCandidates = spatialGrid.queryAABB(companionBoundingBox);
      for (let candIndex = 0; candIndex < companionCandidates.length; candIndex++) {
        const candidateEntity = companionCandidates[candIndex] as CollisionGameObject | null;
        if (!candidateEntity) continue;

        // Krill
        const isKrill =
          (typeof candidateEntity.is === "function" && candidateEntity.is(TAGS.KRILL)) ||
          candidateEntity.tag === TAGS.KRILL ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("krill_"));

        if (isKrill) {
          if (
            isCompanionCollidable(companionObject) &&
            typeof companionObject.consumeKrill === "function"
          ) {
            companionObject.consumeKrill(candidateEntity);
          } else {
            if (candidateEntity.id) {
              spatialGrid.remove(candidateEntity.id);
            }
            if (typeof engineContext.destroy === "function") {
              engineContext.destroy(candidateEntity as unknown as TDestroyable);
            }
            audioSystem.playKrillGulp(candidateEntity.pos?.x, companionObject.pos.x);
          }
          continue;
        }

        // Ice Block
        const isIce =
          (typeof candidateEntity.is === "function" &&
            (candidateEntity.is("ice_block") || candidateEntity.is("ice"))) ||
          candidateEntity.tag === "ice_block" ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("ice_block"));

        if (isIce) {
          if (
            isCompanionCollidable(companionObject) &&
            typeof companionObject.handleIceCollision === "function"
          ) {
            companionObject.handleIceCollision(candidateEntity);
          }
          continue;
        }

        // Obstacle
        const isObstacle =
          (typeof candidateEntity.is === "function" && candidateEntity.is(TAGS.OBSTACLE)) ||
          candidateEntity.tag === TAGS.OBSTACLE;

        if (isObstacle) {
          if (
            isCompanionCollidable(companionObject) &&
            typeof companionObject.handleObstacleCollision === "function"
          ) {
            companionObject.handleObstacleCollision(candidateEntity);
          }
          continue;
        }

        // Net
        const isNet =
          (typeof candidateEntity.is === "function" && candidateEntity.is(TAGS.NET)) ||
          candidateEntity.tag === TAGS.NET ||
          (typeof candidateEntity.id === "string" && candidateEntity.id.startsWith("net_"));

        if (isNet) {
          if (
            isCompanionCollidable(companionObject) &&
            typeof companionObject.handleNetCollision === "function"
          ) {
            companionObject.handleNetCollision(candidateEntity);
          }
          continue;
        }
      }
    }
  };

  if (systemRunner) {
    unregisterSystemRunnerTask = systemRunner.register(
      "collision",
      () => {
        runCollisionPhase();
      },
      { id: "spatial_hash_grid_collision_resolution", priority: 100 }
    );
  } else if (typeof engineContext.onUpdate === "function") {
    engineContext.onUpdate(() => {
      runCollisionPhase();
    });
  }

  return {
    runCollisionPhase,
    destroy: () => {
      isSystemActive = false;
      if (unregisterSystemRunnerTask) {
        unregisterSystemRunnerTask();
        unregisterSystemRunnerTask = null;
      }
    },
  };
}

/**
 * Renderizador de Icebergs Flutuantes Procedurais — Micro Splash (PixiJS 8)
 */

import { GAME_CONFIG } from "../../config";
import { audioSystem } from "../audioSystem";
import { type PlayerController, getActivePlayerObject } from "../../entities/player";
import { getParticlePool } from "../particlePool";
import { safeShake } from "../../utils/camera";
import { getRandomFloat } from "../../utils/random";
import type { IRenderEngine, IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { create16BitIceTextures } from "./ice16BitTextures";
import { getSpatialGrid } from "../spatialHashGrid";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { activeIceGaps, setActiveIceGaps } from "./iceGaps";
import {
  DEFAULT_ICEBERG_GENERATION_SEED,
  generateProceduralIcebergLayout,
  type ProceduralIcebergSpec,
} from "./proceduralIcebergGenerator";
import { createProceduralIcebergNode } from "./proceduralIcebergRenderer";
import {
  renderBoundedAntarcticGlacier,
  updateWorldBoundaryConstraint,
} from "./icebergWallRenderer";

export const ICE_HEIGHT = 40;
export const ICE_POSITION_Y = GAME_CONFIG.SEA_LEVEL - 20;
export const ICE_COLLISION_HEIGHT = 24;
export const TOTAL_ICE_DISTANCE = 5000;

interface MaterializedIceberg {
  readonly spec: ProceduralIcebergSpec;
  readonly node: IRenderNode;
  isBroken: boolean;
}

export function setupPolarIceRendering(
  engine: IRenderEngine,
  playerController?: PlayerController,
  isSystemActivePredicate?: () => boolean,
  generationSeed: number = DEFAULT_ICEBERG_GENERATION_SEED
): () => void {
  const worldContainer = resolveWorldRenderContainer(engine);
  const createdRenderNodes: IRenderNode[] = [];
  const unregisterTickerCallbacks: Array<() => void> = [];
  const materializedMap = new Map<string, MaterializedIceberg>();
  const brokenIcebergIds = new Set<string>();

  type Pool = NonNullable<ReturnType<typeof getParticlePool>>;
  type ParticlePos = Parameters<Pool["spawnRect"]>[0]["pos"];
  type ParticleColor = Parameters<Pool["spawnRect"]>[0]["color"];
  type PlayerSpeed = PlayerController extends { setSpeed: (s: infer S) => void } ? S : unknown;

  const asPos = (x: number, y: number) => ({ x, y }) as unknown as ParticlePos;
  const asColor = (r: number, g: number, b: number) => ({ r, g, b }) as unknown as ParticleColor;
  const asSpeed = (x: number, y: number) => ({ x, y }) as unknown as PlayerSpeed;

  const { icebergWallTexture } = create16BitIceTextures(engine);
  const wallNodes = renderBoundedAntarcticGlacier(engine, icebergWallTexture);
  createdRenderNodes.push(...wallNodes);

  const layout = generateProceduralIcebergLayout(
    TOTAL_ICE_DISTANCE,
    generationSeed,
    GAME_CONFIG.SEA_LEVEL
  );
  setActiveIceGaps(layout.gaps);

  function spawnIcebergBreakEffects(spec: ProceduralIcebergSpec): void {
    const pool = getParticlePool();
    for (let shardIndex = 0; shardIndex < 14; shardIndex++) {
      const shardSize = getRandomFloat(3, 8);
      const shardX = spec.x + getRandomFloat(0, spec.width);
      const shardY = GAME_CONFIG.SEA_LEVEL - getRandomFloat(0, spec.aboveWaterHeight * 0.6);
      if (pool) {
        pool.spawnRect({
          pos: asPos(shardX, shardY),
          width: shardSize,
          height: shardSize,
          color: asColor(230, 248, 255),
          opacity: 0.95,
          z: 15,
          vel: asPos(getRandomFloat(-130, 130), getRandomFloat(-250, -60)),
          fadeRate: 1.5,
          maxLife: 0.65,
        });
      }
    }

    for (let foamIndex = 0; foamIndex < 7; foamIndex++) {
      const foamRadius = getRandomFloat(3, 6);
      const foamX = spec.x + getRandomFloat(0, spec.width);
      const foamY = GAME_CONFIG.SEA_LEVEL + getRandomFloat(-4, 4);
      if (pool) {
        pool.spawnCircle({
          pos: asPos(foamX, foamY),
          radius: foamRadius,
          color: asColor(255, 255, 255),
          opacity: 0.9,
          z: 16,
          vel: asPos(getRandomFloat(-110, 110), getRandomFloat(-260, -120)),
          gravityY: 480,
          fadeRate: 1.8,
          maxLife: 0.55,
        });
      }
    }
  }

  function materializeIceberg(spec: ProceduralIcebergSpec): void {
    if (materializedMap.has(spec.id) || brokenIcebergIds.has(spec.id)) return;

    const icebergNode = createProceduralIcebergNode(engine, spec, GAME_CONFIG.SEA_LEVEL);
    worldContainer.addChild(icebergNode);

    const entry: MaterializedIceberg = { spec, node: icebergNode, isBroken: false };
    materializedMap.set(spec.id, entry);

    const spatialHashGrid = getSpatialGrid();
    const breakIce = (): void => {
      if (entry.isBroken) return;
      entry.isBroken = true;
      brokenIcebergIds.add(spec.id);

      if (spatialHashGrid) {
        spatialHashGrid.remove(spec.id);
      }

      spawnIcebergBreakEffects(spec);

      const player = playerController ? playerController.gameObj : getActivePlayerObject();
      const playerX = player ? player.pos.x : undefined;
      audioSystem.playIceCrackSound(spec.x + spec.width * 0.5, playerX);
      audioSystem.playWaterSplash(spec.x + spec.width * 0.5, playerX);
      safeShake(engine as unknown as Parameters<typeof safeShake>[0], 4.5);

      activeIceGaps.push({ start: spec.x - 5, end: spec.x + spec.width + 5 });

      if (player) {
        if (player.pos.y <= spec.collisionMinY + 18) {
          player.pos.y = Math.max(player.pos.y, spec.collisionMaxY + 8);
        }
        if (playerController) {
          const currentSpeed = playerController.getSpeed();
          playerController.setSpeed(
            asSpeed(currentSpeed.x * 0.92, Math.max(140, currentSpeed.y + 60))
          );
        }
      }

      entry.node.destroy();
      materializedMap.delete(spec.id);
    };

    if (spatialHashGrid) {
      spatialHashGrid.insert(
        spec.id,
        {
          id: spec.id,
          tag: "ice_block",
          pos: { x: spec.x, y: spec.collisionMinY },
          width: spec.width,
          height: spec.collisionMaxY - spec.collisionMinY,
          isStatic: true,
          breakIce,
        },
        {
          minX: spec.x,
          minY: spec.collisionMinY,
          maxX: spec.x + spec.width,
          maxY: spec.collisionMaxY,
        },
        true
      );
    }
  }

  function recycleIceberg(id: string, entry: MaterializedIceberg): void {
    const spatialHashGrid = getSpatialGrid();
    if (spatialHashGrid) {
      spatialHashGrid.remove(id);
    }
    entry.node.destroy();
    materializedMap.delete(id);
  }

  function syncIcebergsAroundCamera(): void {
    const dimensions = engine.getDimensions();
    const viewportWidth = Math.max(640, dimensions.width || 1280);
    const cameraPos = engine.getCameraPosition();
    const playerObj = playerController ? playerController.gameObj : getActivePlayerObject();
    const focusX = Number.isFinite(cameraPos.x)
      ? Math.max(cameraPos.x, playerObj?.pos?.x ?? 0)
      : (playerObj?.pos?.x ?? 0);

    const loadMinX = focusX - viewportWidth * 1.25;
    const loadMaxX = focusX + viewportWidth * 1.65;
    const recycleMinX = focusX - viewportWidth * 1.6;
    const recycleMaxX = focusX + viewportWidth * 2.1;

    for (const [id, entry] of materializedMap.entries()) {
      if (entry.spec.x + entry.spec.width < recycleMinX || entry.spec.x > recycleMaxX) {
        recycleIceberg(id, entry);
      }
    }

    for (const spec of layout.icebergs) {
      if (spec.x + spec.width >= loadMinX && spec.x <= loadMaxX) {
        materializeIceberg(spec);
      }
    }
  }

  function checkPlayerIcebergBreach(): void {
    const player = playerController ? playerController.gameObj : getActivePlayerObject();
    if (!player || !player.pos) return;
    const playerVelocity = playerController ? playerController.getSpeed() : { x: 0, y: 0 };

    for (const entry of materializedMap.values()) {
      if (entry.isBroken || !entry.node.isVisible()) continue;
      const withinX =
        player.pos.x >= entry.spec.x - 10 && player.pos.x <= entry.spec.x + entry.spec.width + 10;
      if (!withinX) continue;

      const isFromAbove =
        player.pos.y <= entry.spec.collisionMinY + 8 &&
        (playerVelocity.y >= 0 || player.pos.y < entry.spec.collisionMinY);

      if (isFromAbove) {
        const spatialHashGrid = getSpatialGrid();
        const candidates = spatialHashGrid?.queryAABB({
          minX: entry.spec.x,
          minY: entry.spec.collisionMinY,
          maxX: entry.spec.x + entry.spec.width,
          maxY: entry.spec.collisionMaxY,
        }) as Array<{ id?: string; breakIce?: () => void }> | undefined;
        const target = candidates?.find((item) => item.id === entry.spec.id);
        if (target && typeof target.breakIce === "function") {
          target.breakIce();
        }
        break;
      }
    }
  }

  // Materializa janela inicial imediatamente (garante cenário e SpatialHashGrid prontos no frame 0)
  syncIcebergsAroundCamera();

  const unregisterIceTicker = engine.getTicker().add(() => {
    const activeState = isSystemActivePredicate ? isSystemActivePredicate() : true;
    if (!activeState) return;
    updateWorldBoundaryConstraint(playerController);
    syncIcebergsAroundCamera();
    checkPlayerIcebergBreach();
  });
  if (typeof unregisterIceTicker === "function") {
    unregisterTickerCallbacks.push(unregisterIceTicker);
  }

  return function destroyPolarIceRendering(): void {
    for (const unregisterCallback of unregisterTickerCallbacks) {
      unregisterCallback();
    }
    unregisterTickerCallbacks.length = 0;

    const spatialHashGrid = getSpatialGrid();
    for (const [id, entry] of materializedMap.entries()) {
      if (spatialHashGrid) {
        spatialHashGrid.remove(id);
      }
      entry.node.destroy();
    }
    materializedMap.clear();

    for (const renderNode of createdRenderNodes) {
      renderNode.destroy();
    }
    createdRenderNodes.length = 0;
  };
}

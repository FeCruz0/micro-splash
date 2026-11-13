/**
 * Renderizador de Paredao de Geleira e Limite Esquerdo (Antartica) — Micro Splash
 */

import { GAME_CONFIG, TAGS } from "../../config";
import { getActivePlayerObject, type PlayerController } from "../../entities/player";
import type { IRenderEngine, IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { getSpatialGrid } from "../spatialHashGrid";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  createSubmergedGlacierCliffLayers,
  createAlpineSnowCrestLayers,
} from "./glacierCliffGeometry";

export const ANTARCTIC_WALL_MIN_WORLD_X = 64;
export const GLACIER_WALL_BACKGROUND_Z_INDEX = 5;
export const GLACIER_CLIFF_FRONT_Z_INDEX = 14;
export const GLACIER_CLIFF_SNOW_Z_INDEX = 15;

const GLACIER_WALL_START_X = -1440;
const GLACIER_WALL_WIDTH = 1440;
const GLACIER_CLIFF_COLLISION_MAX_X = 28;

/**
 * Reorganiza as profundidades de camada (z-index) para que o fundo do paredao fique
 * estritamente em zIndex = 5 e a falesia escarpada facetada ocupe o primeiro plano (zIndex = 14..15).
 */
export function reorganizeGlacierLayerDepths(
  wallBackgroundNode: IRenderNode,
  cliffFrontNode: IRenderNode,
  cliffSnowNode: IRenderNode
): void {
  wallBackgroundNode.setZIndex(GLACIER_WALL_BACKGROUND_Z_INDEX);
  cliffFrontNode.setZIndex(GLACIER_CLIFF_FRONT_Z_INDEX);
  cliffSnowNode.setZIndex(GLACIER_CLIFF_SNOW_Z_INDEX);
}

/**
 * Posiciona e anexa um no grafico ou sprite diretamente ao worldContainer na coordenada de mundo exata.
 */
export function attachWallToWorldContainer(
  worldContainer: IRenderNode,
  wallNode: IRenderNode,
  worldPositionX: number,
  worldPositionY: number,
  zIndex: number
): IRenderNode {
  wallNode.setPosition(worldPositionX, worldPositionY);
  wallNode.setZIndex(zIndex);
  worldContainer.addChild(wallNode);
  return wallNode;
}

/**
 * Impoe o limite esquerdo do mundo impedindo que a baleia atravesse o paredao de geleira.
 */
export function updateWorldBoundaryConstraint(
  playerController?: PlayerController,
  minimumWorldPositionX: number = ANTARCTIC_WALL_MIN_WORLD_X
): void {
  const playerObject = playerController ? playerController.gameObj : getActivePlayerObject();
  if (!playerObject || !playerObject.pos) {
    return;
  }

  if (playerObject.pos.x < minimumWorldPositionX) {
    playerObject.pos.x = minimumWorldPositionX;
    if (playerController && typeof playerController.getSpeed === "function") {
      const playerVelocity = playerController.getSpeed();
      if (playerVelocity.x < 0 && typeof playerController.setSpeed === "function") {
        playerController.setSpeed({
          x: 0,
          y: playerVelocity.y,
        } as Parameters<PlayerController["setSpeed"]>[0]);
      }
    }
  }
}

/**
 * Renderiza a falesia geometrica facetada visivel como a unica representacao visual do paredao de geleira (Antartica),
 * ancorada diretamente ao worldContainer com a geometria de glacierCliffGeometry.ts.
 */
export function renderVisibleFacetedGlacierCliff(
  engine: IRenderEngine,
  _icebergWallTexture?: unknown | null
): IRenderNode[] {
  const worldContainer = resolveWorldRenderContainer(engine);
  const screenHeight = engine.getDimensions().height;
  const seaLevelY = GAME_CONFIG.SEA_LEVEL;
  const snowCrestHeight = Math.max(18, Math.round(seaLevelY * 0.3));
  const createdNodes: IRenderNode[] = [];

  // 1. Falesia escarpada organica com blocos prismaticos facetados e talus abissal (zIndex = 14)
  const cliffFrontGraphics = engine.createGraphics("iceberg_cliff_front");
  const cliffLayers = createSubmergedGlacierCliffLayers(screenHeight, seaLevelY, snowCrestHeight);
  for (const cliffLayer of cliffLayers) {
    cliffFrontGraphics.drawPolygon(cliffLayer.points, {
      fill: { color: cliffLayer.color, alpha: cliffLayer.alpha },
    });
  }
  createdNodes.push(
    attachWallToWorldContainer(
      worldContainer,
      cliffFrontGraphics,
      0,
      0,
      GLACIER_CLIFF_FRONT_Z_INDEX
    )
  );

  // 2. Cornija superior de neve alinhada exatamente ao topo da geleira (zIndex = 15)
  const cliffSnowGraphics = engine.createGraphics("iceberg_cliff_snow");
  const snowLayers = createAlpineSnowCrestLayers(snowCrestHeight);
  for (const snowLayer of snowLayers) {
    cliffSnowGraphics.drawPolygon(snowLayer.points, {
      fill: { color: snowLayer.color, alpha: snowLayer.alpha },
    });
  }
  createdNodes.push(
    attachWallToWorldContainer(worldContainer, cliffSnowGraphics, 0, 0, GLACIER_CLIFF_SNOW_Z_INDEX)
  );

  const polarIceSpatialGrid = getSpatialGrid();
  if (polarIceSpatialGrid) {
    const polarIceWallEntity = {
      id: "iceberg_wall_static",
      tag: TAGS.OBSTACLE,
      pos: { x: GLACIER_WALL_START_X, y: 0 },
      width: GLACIER_WALL_WIDTH + GLACIER_CLIFF_COLLISION_MAX_X,
      height: screenHeight,
      isStatic: true,
    };
    polarIceSpatialGrid.insert(
      "iceberg_wall_static",
      polarIceWallEntity,
      {
        minX: GLACIER_WALL_START_X,
        minY: 0,
        maxX: GLACIER_CLIFF_COLLISION_MAX_X,
        maxY: screenHeight,
      },
      true
    );
  }

  return createdNodes;
}

export const renderSoleFacetedGlacierCliff = renderVisibleFacetedGlacierCliff;
export const renderBoundedAntarcticGlacier = renderVisibleFacetedGlacierCliff;
export const renderAntarcticGlacierWall = renderVisibleFacetedGlacierCliff;
export const renderIcebergWall = renderVisibleFacetedGlacierCliff;

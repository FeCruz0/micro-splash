/**
 * Renderizador de Paredao de Iceberg e Colunas Glaciais — Micro Splash
 */

import { TAGS } from "../../config";
import type { IRenderEngine, Vector2D } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { getSpatialGrid } from "../spatialHashGrid";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";

export function renderIcebergWall(engine: IRenderEngine, icebergWallTexture: unknown | null): void {
  const worldContainer = resolveWorldRenderContainer(engine);
  const screenHeight = engine.getDimensions().height;
  const wallWidth = 1100;
  const wallStartX = -1100;

  if (icebergWallTexture) {
    // Renderização modular em ladrilhos para evitar distorção horizontal na pixel art
    const tileSize = 368;
    for (let tileX = wallStartX; tileX < 0; tileX += tileSize) {
      const tileWidth = Math.min(tileSize, 0 - tileX);
      const wallSprite = engine.createSprite(icebergWallTexture, `iceberg_wall_${tileX}`);
      wallSprite.setSize(tileWidth, screenHeight);
      wallSprite.setPosition(tileX, 0);
      wallSprite.setZIndex(10);
      worldContainer.addChild(wallSprite);
    }
  } else {
    const wallG = engine.createGraphics("iceberg_wall");
    wallG.drawRect(0, 0, wallWidth, screenHeight, {
      fill: { color: [150, 195, 235], alpha: 1 },
    });
    wallG.setPosition(wallStartX, 0);
    wallG.setZIndex(10);
    worldContainer.addChild(wallG);

    // Colunas de gelo verticais
    for (let x = wallStartX; x < 0; x += 75) {
      const colWidth = 65 + Math.sin(x * 0.04) * 20;
      const bumpX = x + Math.cos(x * 0.02) * 12;

      const colG = engine.createGraphics();
      const colPts: readonly Vector2D[] = [
        { x: bumpX, y: 0 },
        { x: bumpX + colWidth, y: 0 },
        { x: bumpX + colWidth - 15, y: screenHeight },
        { x: bumpX - 20, y: screenHeight },
      ];
      colG.drawPolygon(colPts, {
        fill: { color: [180, 220, 255], alpha: 0.35 },
      });
      colG.setZIndex(11);
      worldContainer.addChild(colG);

      const ridgeG = engine.createGraphics();
      const ridgePts: readonly Vector2D[] = [
        { x: bumpX + 8, y: 0 },
        { x: bumpX + colWidth * 0.45, y: 0 },
        { x: bumpX + colWidth * 0.25, y: screenHeight },
      ];
      ridgeG.drawPolygon(ridgePts, {
        fill: { color: [230, 248, 255], alpha: 0.55 },
      });
      ridgeG.setZIndex(12);
      worldContainer.addChild(ridgeG);
    }
  }

  // Crista pontiaguda e falésia escarpada sempre renderizada na borda frontal (x = 0)
  const cliffG = engine.createGraphics("iceberg_cliff_front");
  const cliffPts: readonly Vector2D[] = [
    { x: -50, y: 0 },
    { x: 0, y: 35 },
    { x: -20, y: 95 },
    { x: 8, y: 165 },
    { x: -25, y: 235 },
    { x: 5, y: 315 },
    { x: -30, y: 385 },
    { x: 0, y: 455 },
    { x: -35, y: screenHeight },
    { x: -120, y: screenHeight },
    { x: -120, y: 0 },
  ];
  cliffG.drawPolygon(cliffPts, {
    fill: { color: [210, 240, 255], alpha: 0.98 },
    stroke: { color: [120, 180, 230], width: 3 },
  });
  cliffG.setZIndex(14);
  worldContainer.addChild(cliffG);

  // Manto superior de neve pura na crista acima da linha d'água (SEA_LEVEL)
  const cliffSnowG = engine.createGraphics("iceberg_cliff_snow");
  const snowPts: readonly Vector2D[] = [
    { x: -120, y: 0 },
    { x: 0, y: 0 },
    { x: 2, y: 32 },
    { x: -18, y: 80 },
    { x: -120, y: 80 },
  ];
  cliffSnowG.drawPolygon(snowPts, {
    fill: { color: [255, 255, 255], alpha: 1.0 },
    stroke: { color: [224, 242, 241], width: 2 },
  });
  cliffSnowG.setZIndex(15);
  worldContainer.addChild(cliffSnowG);

  const polarIceSpatialGrid = getSpatialGrid();
  if (polarIceSpatialGrid) {
    const polarIceWallEntity = {
      id: "iceberg_wall_static",
      tag: TAGS.OBSTACLE,
      pos: { x: wallStartX, y: 0 },
      width: wallWidth + 8,
      height: screenHeight,
      isStatic: true,
    };
    polarIceSpatialGrid.insert(
      "iceberg_wall_static",
      polarIceWallEntity,
      {
        minX: wallStartX,
        minY: 0,
        maxX: 8,
        maxY: screenHeight,
      },
      true
    );
  }
}

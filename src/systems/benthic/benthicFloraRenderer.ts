/**
 * Renderizador da flora submarina (Kelp, Algas Vermelhas Polares, Ervas Marinhas e Rodolitos Lithothamnion).
 */

import { calculateBiomeTransitionFactor } from "../biomeTransitionSystem";
import { getSpatialCullingManager } from "../spatialCullingSystem";
import type { IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  type BenthicRenderNode,
  type KelpPlant,
  type PolarAlgaePlant,
  type UrbanSeagrassPlant,
  createBenthicNodeProxy,
  calculateKelpSegmentColor,
  KELP_SPAWN_X,
  POLAR_RED_ALGAE_SPAWN_X,
  URBAN_SEAGRASS_SPAWN_X,
  LITHOTHAMNION_SPAWN_X,
} from "./benthicTypes";

export interface BenthicFloraElements {
  kelpForest: KelpPlant[];
  polarAlgaePlants: PolarAlgaePlant[];
  urbanSeagrassPlants: UrbanSeagrassPlant[];
}

export function setupBenthicFlora(realEngine: IRenderEngine, floorY: number): BenthicFloraElements {
  const worldContainer = resolveWorldRenderContainer(realEngine);
  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  const kelpForest: KelpPlant[] = [];
  const polarAlgaePlants: PolarAlgaePlant[] = [];
  const urbanSeagrassPlants: UrbanSeagrassPlant[] = [];

  // 1. Kelp
  KELP_SPAWN_X.forEach((xPos, plantIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 0, 5000, 300);
    const plantHeight = (120 + (plantIdx % 4) * 35) * (0.65 + 0.35 * transitionFactor);
    const segmentCount = 6;
    const segHeight = plantHeight / segmentCount;
    const segments: BenthicRenderNode[] = [];

    for (let s = 0; s < segmentCount; s++) {
      const segWidth = 14 - s * 1.4;
      const color = calculateKelpSegmentColor(realEngine, s, segmentCount);
      const colorTuple = [color.r, color.g, color.b] as const;

      const stem = realEngine.createGraphics();
      stem.drawRect(-segWidth / 2, -(segHeight + 4), segWidth, segHeight + 4, {
        fill: { color: colorTuple, alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
      });
      stem.setPosition(xPos, floorY - (s + 1) * segHeight);
      stem.setZIndex(-3);
      worldContainer.addChild(stem);
      cullingManager?.registerEntity(stem as unknown as CullingTarget, () => xPos);

      const leafSide = s % 2 === 0 ? 1 : -1;
      const leafWidth = 18 + s * 2;
      const leafHeight = 8 + s * 1.2;
      const leaf = realEngine.createGraphics();
      leaf.drawRect(-leafWidth / 2, -leafHeight / 2, leafWidth, leafHeight, {
        fill: { color: colorTuple, alpha: 0.75 * (0.4 + 0.6 * transitionFactor) },
      });
      leaf.setPosition(xPos + leafSide * (segWidth + 4), floorY - (s + 0.5) * segHeight);
      leaf.setRotation((leafSide * 25 * Math.PI) / 180);
      leaf.setZIndex(-3);
      worldContainer.addChild(leaf);
      cullingManager?.registerEntity(leaf as unknown as CullingTarget, () => xPos);

      const stemProxy = createBenthicNodeProxy(stem, xPos, floorY - (s + 1) * segHeight);
      const leafProxy = createBenthicNodeProxy(
        leaf,
        xPos + leafSide * (segWidth + 4),
        floorY - (s + 0.5) * segHeight
      );

      segments.push(stemProxy);
      segments.push(leafProxy);
    }

    kelpForest.push({
      segments,
      baseX: xPos,
      baseY: floorY,
      height: plantHeight,
      swaySpeed: 1.2 + (plantIdx % 3) * 0.4,
      swayPhase: plantIdx * 0.8,
    });
  });

  // 1.5. Polar red algae
  POLAR_RED_ALGAE_SPAWN_X.forEach((xPos, aIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 0, 5000, 300);
    const blades: BenthicRenderNode[] = [];
    const bladeColor = aIdx % 2 === 0 ? ([145, 52, 45] as const) : ([165, 88, 35] as const);
    const bladeCount = 3 + (aIdx % 3);

    for (let b = 0; b < bladeCount; b++) {
      const bladeHeight = (22 + b * 6) * (0.7 + 0.3 * transitionFactor);
      const bladeG = realEngine.createGraphics();
      bladeG.drawRect(-1.25, -bladeHeight, 2.5, bladeHeight, {
        fill: { color: bladeColor, alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
      });
      const bladeX = xPos + (b - bladeCount / 2) * 4;
      bladeG.setPosition(bladeX, floorY);
      bladeG.setRotation(((b - bladeCount / 2) * 8 * Math.PI) / 180);
      bladeG.setZIndex(-3);
      worldContainer.addChild(bladeG);

      blades.push(createBenthicNodeProxy(bladeG, bladeX, floorY));
    }

    polarAlgaePlants.push({
      blades,
      baseX: xPos,
      swaySpeed: 1.5 + (aIdx % 3) * 0.3,
      swayPhase: aIdx * 1.1,
    });
  });

  // 2. Urban seagrass
  URBAN_SEAGRASS_SPAWN_X.forEach((xPos, sIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 12000, 19000, 300);
    const blades: BenthicRenderNode[] = [];
    const grassColor = sIdx % 2 === 0 ? ([75, 95, 70] as const) : ([65, 85, 75] as const);
    const bladeCount = 4 + (sIdx % 3);

    for (let b = 0; b < bladeCount; b++) {
      const bladeH = (26 + b * 5) * (0.7 + 0.3 * transitionFactor);
      const bladeG = realEngine.createGraphics();
      bladeG.drawRect(-1.1, -bladeH, 2.2, bladeH, {
        fill: { color: grassColor, alpha: 0.82 * (0.4 + 0.6 * transitionFactor) },
      });
      const bladeX = xPos + (b - bladeCount / 2) * 4.5;
      bladeG.setPosition(bladeX, floorY);
      bladeG.setRotation(((b - bladeCount / 2) * 6 * Math.PI) / 180);
      bladeG.setZIndex(-3);
      worldContainer.addChild(bladeG);

      blades.push(createBenthicNodeProxy(bladeG, bladeX, floorY));
    }

    const trashColor =
      sIdx % 4 === 0
        ? ([230, 70, 60] as const)
        : sIdx % 4 === 1
          ? ([240, 210, 60] as const)
          : sIdx % 4 === 2
            ? ([60, 160, 230] as const)
            : ([230, 230, 230] as const);

    const wasteG = realEngine.createGraphics();
    wasteG.drawRect(-1.75, -1.75, 3.5, 3.5, {
      fill: { color: trashColor, alpha: 0.88 * (0.4 + 0.6 * transitionFactor) },
    });
    wasteG.setPosition(xPos + 3, floorY - 8 - (sIdx % 3) * 6);
    wasteG.setRotation((((sIdx * 35) % 90) * Math.PI) / 180);
    wasteG.setZIndex(-2);
    worldContainer.addChild(wasteG);

    urbanSeagrassPlants.push({
      blades,
      baseX: xPos,
      swaySpeed: 1.1 + (sIdx % 3) * 0.35,
      swayPhase: sIdx * 0.9,
    });
  });

  // 3. Lithothamnion
  LITHOTHAMNION_SPAWN_X.forEach((xPos, lIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
    const crustW = 28 + (lIdx % 4) * 8;
    const crustH = 4 + (lIdx % 3) * 1.5;
    const crustColor = [180 + (lIdx % 3) * 12, 95 + (lIdx % 4) * 8, 135 + (lIdx % 2) * 16] as const;

    const crustG = realEngine.createGraphics();
    crustG.drawRect(0, 0, crustW, crustH, {
      fill: { color: crustColor, alpha: 0.88 * (0.4 + 0.6 * transitionFactor) },
    });
    crustG.setPosition(xPos, floorY - 2 + (lIdx % 3) * 1.2);
    crustG.setZIndex(-3);
    worldContainer.addChild(crustG);

    if (lIdx % 2 === 0) {
      const noduleG = realEngine.createGraphics();
      noduleG.drawCircle(0, 0, 3.5, {
        fill: { color: [195, 110, 145], alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
      });
      noduleG.setPosition(xPos + crustW * 0.7, floorY - 3);
      noduleG.setZIndex(-3);
      worldContainer.addChild(noduleG);
    }
  });

  return { kelpForest, polarAlgaePlants, urbanSeagrassPlants };
}

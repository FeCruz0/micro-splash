/**
 * Implementacao do modo legado do sistema bentonico para compatibilidade retroativa de testes.
 */

import { calculateBiomeTransitionFactor } from "../biomeTransitionSystem";
import { getSpatialCullingManager } from "../spatialCullingSystem";
import {
  type BenthicRenderNode,
  type KelpPlant,
  type PolarAlgaePlant,
  type UrbanSeagrassPlant,
  type CoralDetail,
  type ReefFishData,
  type LegacyBenthicEngineContext,
  calculateKelpSegmentColor,
  KELP_SPAWN_X,
  POLAR_RED_ALGAE_SPAWN_X,
  URBAN_SEAGRASS_SPAWN_X,
  LITHOTHAMNION_SPAWN_X,
} from "./benthicTypes";
import { updateBenthicMotion } from "./benthicMotionUpdater";
import { spawnLegacyCorals } from "./benthicLegacyCorals";

export function setupLegacyBenthicFloor(
  legacyCtx: LegacyBenthicEngineContext,
  floorY: number
): void {
  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  const kelpForest: KelpPlant[] = [];
  const polarAlgaePlants: PolarAlgaePlant[] = [];
  const urbanSeagrassPlants: UrbanSeagrassPlant[] = [];
  const corals: CoralDetail[] = [];
  const reefFishList: ReefFishData[] = [];

  // 1. Kelp
  KELP_SPAWN_X.forEach((xPos, plantIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 0, 5000, 300);
    const plantHeight = (120 + (plantIdx % 4) * 35) * (0.65 + 0.35 * transitionFactor);
    const segmentCount = 6;
    const segHeight = plantHeight / segmentCount;
    const segments: BenthicRenderNode[] = [];

    for (let s = 0; s < segmentCount; s++) {
      const segWidth = 14 - s * 1.4;
      const segmentColor = calculateKelpSegmentColor(legacyCtx, s, segmentCount);

      const stem = legacyCtx.add([
        legacyCtx.rect(segWidth, segHeight + 4, { radius: 3 }),
        legacyCtx.pos(xPos, floorY - (s + 1) * segHeight),
        legacyCtx.color(segmentColor),
        legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.z(s % 2 === 0 ? -3 : 2),
        "kelp_segment",
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(stem as unknown as CullingTarget, () => xPos);

      const leafSide = s % 2 === 0 ? 1 : -1;
      const leafWidth = 18 + s * 2;
      const leafHeight = 8 + s * 1.2;
      const leaf = legacyCtx.add([
        legacyCtx.rect(leafWidth, leafHeight, { radius: leafHeight / 2 }),
        legacyCtx.pos(xPos + leafSide * (segWidth + 4), floorY - (s + 0.5) * segHeight),
        legacyCtx.color(segmentColor),
        legacyCtx.opacity(0.75 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("center"),
        legacyCtx.rotate(leafSide * 25),
        legacyCtx.z(-3),
        "kelp_leaf",
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(leaf as unknown as CullingTarget, () => xPos);

      segments.push(stem);
      segments.push(leaf);
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
    const bladeColor =
      aIdx % 2 === 0
        ? typeof legacyCtx.rgb === "function"
          ? legacyCtx.rgb(145, 52, 45)
          : { r: 145, g: 52, b: 45 }
        : typeof legacyCtx.rgb === "function"
          ? legacyCtx.rgb(165, 88, 35)
          : { r: 165, g: 88, b: 35 };
    const bladeCount = 3 + (aIdx % 3);

    for (let b = 0; b < bladeCount; b++) {
      const bladeHeight = (22 + b * 6) * (0.7 + 0.3 * transitionFactor);
      const blade = legacyCtx.add([
        legacyCtx.rect(2.5, bladeHeight, { radius: 1 }),
        legacyCtx.pos(xPos + (b - bladeCount / 2) * 4, floorY),
        legacyCtx.color(bladeColor),
        legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.rotate((b - bladeCount / 2) * 8),
        legacyCtx.z(-3),
        "benthic_algae",
      ]) as unknown as BenthicRenderNode;
      blades.push(blade);
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
    const grassColor =
      sIdx % 2 === 0
        ? typeof legacyCtx.rgb === "function"
          ? legacyCtx.rgb(75, 95, 70)
          : { r: 75, g: 95, b: 70 }
        : typeof legacyCtx.rgb === "function"
          ? legacyCtx.rgb(65, 85, 75)
          : { r: 65, g: 85, b: 75 };
    const bladeCount = 4 + (sIdx % 3);

    for (let b = 0; b < bladeCount; b++) {
      const bladeH = (26 + b * 5) * (0.7 + 0.3 * transitionFactor);
      const blade = legacyCtx.add([
        legacyCtx.rect(2.2, bladeH, { radius: 1 }),
        legacyCtx.pos(xPos + (b - bladeCount / 2) * 4.5, floorY),
        legacyCtx.color(grassColor),
        legacyCtx.opacity(0.82 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.rotate((b - bladeCount / 2) * 6),
        legacyCtx.z(-3),
        "benthic_seagrass",
      ]) as unknown as BenthicRenderNode;
      blades.push(blade);
    }

    const trashColor =
      sIdx % 4 === 0
        ? typeof legacyCtx.rgb === "function"
          ? legacyCtx.rgb(230, 70, 60)
          : { r: 230, g: 70, b: 60 }
        : sIdx % 4 === 1
          ? typeof legacyCtx.rgb === "function"
            ? legacyCtx.rgb(240, 210, 60)
            : { r: 240, g: 210, b: 60 }
          : sIdx % 4 === 2
            ? typeof legacyCtx.rgb === "function"
              ? legacyCtx.rgb(60, 160, 230)
              : { r: 60, g: 160, b: 230 }
            : typeof legacyCtx.rgb === "function"
              ? legacyCtx.rgb(230, 230, 230)
              : { r: 230, g: 230, b: 230 };

    legacyCtx.add([
      legacyCtx.rect(3.5, 3.5, { radius: 1 }),
      legacyCtx.pos(xPos + 3, floorY - 8 - (sIdx % 3) * 6),
      legacyCtx.color(trashColor),
      legacyCtx.opacity(0.88 * (0.4 + 0.6 * transitionFactor)),
      legacyCtx.anchor("center"),
      legacyCtx.rotate((sIdx * 35) % 90),
      legacyCtx.z(-2),
      "benthic_debris",
    ]);

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
    const crustColor =
      typeof legacyCtx.rgb === "function"
        ? legacyCtx.rgb(180 + (lIdx % 3) * 12, 95 + (lIdx % 4) * 8, 135 + (lIdx % 2) * 16)
        : {
            r: 180 + (lIdx % 3) * 12,
            g: 95 + (lIdx % 4) * 8,
            b: 135 + (lIdx % 2) * 16,
          };

    legacyCtx.add([
      legacyCtx.rect(crustW, crustH, { radius: 2 }),
      legacyCtx.pos(xPos, floorY - 2 + (lIdx % 3) * 1.2),
      legacyCtx.color(crustColor),
      legacyCtx.opacity(0.88 * (0.4 + 0.6 * transitionFactor)),
      legacyCtx.anchor("topleft"),
      legacyCtx.z(-3),
      "lithothamnion_crust",
    ]);

    if (lIdx % 2 === 0) {
      legacyCtx.add([
        legacyCtx.circle(3.5),
        legacyCtx.pos(xPos + crustW * 0.7, floorY - 3),
        legacyCtx.color(
          typeof legacyCtx.rgb === "function"
            ? legacyCtx.rgb(195, 110, 145)
            : { r: 195, g: 110, b: 145 }
        ),
        legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("center"),
        legacyCtx.z(-3),
        "lithothamnion_nodule",
      ]);
    }
  });

  // 4. Corals e peixes
  spawnLegacyCorals(legacyCtx, floorY, corals, reefFishList);

  let time = 0;
  legacyCtx.onUpdate(() => {
    const dt = legacyCtx.dt();
    time += dt;
    const camX = legacyCtx.camPos().x;
    const screenWidth = legacyCtx.width() || 1280;

    updateBenthicMotion({
      time,
      camX,
      screenWidth,
      kelpForest,
      polarAlgaePlants,
      urbanSeagrassPlants,
      corals,
      reefFishList,
    });
  });
}

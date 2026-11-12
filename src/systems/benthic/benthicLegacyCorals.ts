/**
 * Suporte legado para corais e peixes de recife em benthicLegacyFloor.
 */

import { calculateBiomeTransitionFactor } from "../biomeTransitionSystem";
import { getSpatialCullingManager } from "../spatialCullingSystem";
import {
  type BenthicRenderNode,
  type CoralDetail,
  type ReefFishData,
  type MutableVec2,
  type LegacyBenthicEngineContext,
  CORAL_SPAWN_X,
} from "./benthicTypes";

export function spawnLegacyCorals(
  legacyCtx: LegacyBenthicEngineContext,
  floorY: number,
  corals: CoralDetail[],
  reefFishList: ReefFishData[]
): void {
  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  CORAL_SPAWN_X.forEach((xPos, cIdx) => {
    const transitionFactor = calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
    const coralType = cIdx % 3 === 0 ? "brain" : cIdx % 3 === 1 ? "fan" : "anemone";

    if (coralType === "brain") {
      const baseShadow = legacyCtx.add([
        legacyCtx.rect(56, 8),
        legacyCtx.pos(xPos, floorY),
        legacyCtx.color(15, 37, 55),
        legacyCtx.opacity(0.96 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.z(-3),
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(baseShadow as unknown as CullingTarget, () => xPos);

      const coralMainCol =
        cIdx % 2 === 0 ? legacyCtx.rgb(255, 112, 67) : legacyCtx.rgb(171, 71, 188);
      const coralBorderCol =
        cIdx % 2 === 0 ? legacyCtx.rgb(191, 54, 12) : legacyCtx.rgb(92, 34, 104);
      const coralHighlightCol =
        cIdx % 2 === 0 ? legacyCtx.rgb(255, 171, 145) : legacyCtx.rgb(206, 147, 216);
      const polypCol = cIdx % 2 === 0 ? legacyCtx.rgb(255, 213, 79) : legacyCtx.rgb(128, 222, 234);

      const tubes = [
        { offX: -20, w: 10, h: 20 },
        { offX: -10, w: 12, h: 32 },
        { offX: 0, w: 12, h: 38 },
        { offX: 10, w: 12, h: 28 },
        { offX: 20, w: 10, h: 18 },
      ];

      let representativeObj: BenthicRenderNode | null = null;

      for (const tube of tubes) {
        const tubeObj = legacyCtx.add([
          legacyCtx.rect(tube.w, tube.h, { radius: 3 }),
          legacyCtx.pos(xPos + tube.offX, floorY - 4),
          legacyCtx.color(coralMainCol),
          legacyCtx.opacity(0.98 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
          "coral_brain_tube",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(tubeObj as unknown as CullingTarget, () => xPos);

        if (!representativeObj || tube.h === 38) {
          representativeObj = tubeObj;
        }

        const shadowObj = legacyCtx.add([
          legacyCtx.rect(2, tube.h - 4),
          legacyCtx.pos(xPos + tube.offX - Math.floor(tube.w / 2) + 1, floorY - 4),
          legacyCtx.color(coralBorderCol),
          legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(shadowObj as unknown as CullingTarget, () => xPos);

        const ringCount = tube.h >= 30 ? 4 : 3;
        const ringStep = Math.floor((tube.h - 10) / ringCount);
        for (let r = 0; r < ringCount; r++) {
          const ry = floorY - 4 - tube.h + 6 + r * ringStep;
          const ring = legacyCtx.add([
            legacyCtx.rect(tube.w - 2, 2),
            legacyCtx.pos(xPos + tube.offX, ry),
            legacyCtx.color(coralHighlightCol),
            legacyCtx.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
            legacyCtx.anchor("bot"),
            legacyCtx.z(-3),
          ]) as unknown as BenthicRenderNode;
          cullingManager?.registerEntity(ring as unknown as CullingTarget, () => xPos);
        }

        const opening = legacyCtx.add([
          legacyCtx.rect(tube.w - 4, 2),
          legacyCtx.pos(xPos + tube.offX, floorY - 4 - tube.h + 2),
          legacyCtx.color(15, 37, 55),
          legacyCtx.opacity(0.95 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(opening as unknown as CullingTarget, () => xPos);

        const polyp = legacyCtx.add([
          legacyCtx.rect(3, 3),
          legacyCtx.pos(xPos + tube.offX, floorY - 4 - tube.h + 8),
          legacyCtx.color(polypCol),
          legacyCtx.opacity(1.0 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("center"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(polyp as unknown as CullingTarget, () => xPos);
      }

      corals.push({
        obj: representativeObj ?? baseShadow,
        type: "brain",
        baseY: floorY - 4,
        animPhase: cIdx,
      });
    } else if (coralType === "fan") {
      const baseShadow = legacyCtx.add([
        legacyCtx.rect(24, 8),
        legacyCtx.pos(xPos, floorY),
        legacyCtx.color(15, 37, 55),
        legacyCtx.opacity(0.96 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.z(-3),
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(baseShadow as unknown as CullingTarget, () => xPos);

      const fanMainCol = cIdx % 2 === 0 ? legacyCtx.rgb(38, 198, 218) : legacyCtx.rgb(255, 112, 67);
      const fanDarkCol = cIdx % 2 === 0 ? legacyCtx.rgb(0, 131, 143) : legacyCtx.rgb(191, 54, 12);
      const tipCol = cIdx % 2 === 0 ? legacyCtx.rgb(255, 235, 59) : legacyCtx.rgb(255, 213, 79);

      const branches = [
        { offX: -18, h: 34 },
        { offX: -9, h: 46 },
        { offX: 0, h: 52 },
        { offX: 9, h: 42 },
        { offX: 18, h: 28 },
      ];

      let centralBranchObj: BenthicRenderNode | null = null;

      for (const branch of branches) {
        const segCount = Math.ceil(branch.h / 8);
        let lastSegX = xPos + branch.offX;
        let lastSegY = floorY - 8;

        for (let s = 0; s < segCount; s++) {
          const lean = Math.round((branch.offX / 18) * s * 1.5);
          const segX = xPos + branch.offX + lean;
          const segY = floorY - 8 - s * 8;

          const segment = legacyCtx.add([
            legacyCtx.rect(6, 8, { radius: 2 }),
            legacyCtx.pos(segX, segY),
            legacyCtx.color(fanMainCol),
            legacyCtx.opacity(0.98 * (0.4 + 0.6 * transitionFactor)),
            legacyCtx.anchor("bot"),
            legacyCtx.z(-3),
            "coral_fan_segment",
          ]) as unknown as BenthicRenderNode;
          cullingManager?.registerEntity(segment as unknown as CullingTarget, () => xPos);

          if (branch.offX === 0 && s === 0) {
            centralBranchObj = segment;
          }

          if (s % 2 === 0) {
            const ring = legacyCtx.add([
              legacyCtx.rect(6, 2),
              legacyCtx.pos(segX, segY - 1),
              legacyCtx.color(fanDarkCol),
              legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
              legacyCtx.anchor("bot"),
              legacyCtx.z(-3),
            ]) as unknown as BenthicRenderNode;
            cullingManager?.registerEntity(ring as unknown as CullingTarget, () => xPos);
          }

          lastSegX = segX;
          lastSegY = segY;
        }

        const tip = legacyCtx.add([
          legacyCtx.rect(3, 3),
          legacyCtx.pos(lastSegX, lastSegY - 8),
          legacyCtx.color(tipCol),
          legacyCtx.opacity(1.0 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("center"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(tip as unknown as CullingTarget, () => xPos);
      }

      corals.push({
        obj: centralBranchObj ?? baseShadow,
        type: "fan",
        baseY: floorY - 8,
        animPhase: cIdx,
      });
    } else {
      const baseShadow = legacyCtx.add([
        legacyCtx.rect(36, 6),
        legacyCtx.pos(xPos, floorY),
        legacyCtx.color(15, 37, 55),
        legacyCtx.opacity(0.96 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.z(-3),
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(baseShadow as unknown as CullingTarget, () => xPos);

      const anemone = legacyCtx.add([
        legacyCtx.rect(28, 18, { radius: 6 }),
        legacyCtx.pos(xPos, floorY - 6),
        legacyCtx.color(0, 137, 123),
        legacyCtx.opacity(0.98 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("bot"),
        legacyCtx.scale(1, 1),
        legacyCtx.z(-3),
        "coral_anemone",
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(anemone as unknown as CullingTarget, () => xPos);

      const oralDisc = legacyCtx.add([
        legacyCtx.rect(34, 4),
        legacyCtx.pos(xPos, floorY - 22),
        legacyCtx.color(255, 235, 59),
        legacyCtx.opacity(0.95),
        legacyCtx.anchor("bot"),
        legacyCtx.z(-3),
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(oralDisc as unknown as CullingTarget, () => xPos);

      const tentacles: BenthicRenderNode[] = [];
      for (let t = -3; t <= 3; t++) {
        const tentacle = legacyCtx.add([
          legacyCtx.rect(4, 18, { radius: 2 }),
          legacyCtx.pos(xPos + t * 4, floorY - 20),
          legacyCtx.color(240, 98, 146),
          legacyCtx.opacity(0.92 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.rotate(t * 7),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(tentacle as unknown as CullingTarget, () => xPos);
        tentacles.push(tentacle);
      }

      corals.push({
        obj: anemone,
        type: "anemone",
        baseY: floorY - 6,
        animPhase: cIdx,
        tentacles,
      });
    }

    if (cIdx % 2 === 0) {
      const isYellow = cIdx % 4 === 0;
      const fishBodyCol = isYellow ? legacyCtx.rgb(255, 202, 40) : legacyCtx.rgb(38, 198, 218);
      const fishFinCol = isYellow ? legacyCtx.rgb(255, 112, 67) : legacyCtx.rgb(171, 71, 188);

      const reefFish = legacyCtx.add([
        legacyCtx.polygon([
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-10, -5) : { x: -10, y: -5 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-6, -1) : { x: -6, y: -1 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-4, 0) : { x: -4, y: 0 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-6, 1) : { x: -6, y: 1 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-10, 5) : { x: -10, y: 5 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-4, 2) : { x: -4, y: 2 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(2, 4) : { x: 2, y: 4 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(8, 2) : { x: 8, y: 2 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(10, 0) : { x: 10, y: 0 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(8, -2) : { x: 8, y: -2 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(2, -4) : { x: 2, y: -4 },
          typeof legacyCtx.vec2 === "function" ? legacyCtx.vec2(-4, -2) : { x: -4, y: -2 },
        ]),
        legacyCtx.pos(xPos + 15, floorY - 45 - (cIdx % 3) * 15),
        legacyCtx.color(fishBodyCol),
        typeof legacyCtx.outline === "function" ? legacyCtx.outline(1, fishFinCol) : null,
        legacyCtx.z(-3),
        "reef_fish",
        {
          basePos:
            typeof legacyCtx.vec2 === "function"
              ? legacyCtx.vec2(xPos + 15, floorY - 45 - (cIdx % 3) * 15)
              : { x: xPos + 15, y: floorY - 45 - (cIdx % 3) * 15 },
          swimSpeed: 1.5 + (cIdx % 3) * 0.5,
          phase: cIdx * 1.7,
        },
      ]) as unknown as BenthicRenderNode & {
        basePos: MutableVec2;
        swimSpeed: number;
        phase: number;
      };

      reefFishList.push({
        obj: reefFish,
        basePos: { x: xPos + 15, y: floorY - 45 - (cIdx % 3) * 15 },
        swimSpeed: 1.5 + (cIdx % 3) * 0.5,
        phase: cIdx * 1.7,
      });
    }
  });
}

/**
 * Loop de atualizacao de fisica e animacoes dos elementos bentonicos.
 */

import {
  type KelpPlant,
  type PolarAlgaePlant,
  type UrbanSeagrassPlant,
  type CoralDetail,
  type ReefFishData,
  setBenthicNodesVisibility,
} from "./benthicTypes";

export function updateBenthicMotion(options: {
  time: number;
  camX: number;
  screenWidth: number;
  kelpForest: readonly KelpPlant[];
  polarAlgaePlants: readonly PolarAlgaePlant[];
  urbanSeagrassPlants: readonly UrbanSeagrassPlant[];
  corals: readonly CoralDetail[];
  reefFishList: readonly ReefFishData[];
}): void {
  const {
    time,
    camX,
    screenWidth,
    kelpForest,
    polarAlgaePlants,
    urbanSeagrassPlants,
    corals,
    reefFishList,
  } = options;

  const minActiveX = camX - screenWidth - 600;
  const maxActiveX = camX + screenWidth + 600;

  // Peixes de recife
  const totalFish = reefFishList.length;
  for (let f = 0; f < totalFish; f++) {
    const fish = reefFishList[f];
    const fishWidth = 60;
    const isVisible =
      fish.basePos.x + fishWidth >= minActiveX && fish.basePos.x - fishWidth <= maxActiveX;
    if (!isVisible) {
      fish.obj.hidden = true;
      continue;
    }
    fish.obj.hidden = false;

    const swimCycle = time * fish.swimSpeed * 2.2 + fish.phase;
    fish.obj.angle = Math.sin(swimCycle) * 6.5;
    fish.obj.pos.x = fish.basePos.x + Math.sin(time * fish.swimSpeed + fish.phase) * 22;
    fish.obj.pos.y = fish.basePos.y + Math.cos(swimCycle * 0.8) * 8;
    if (fish.obj.scale) {
      fish.obj.scale.x = 1.0 + Math.sin(swimCycle * 2) * 0.05;
      fish.obj.scale.y = 1.0 - Math.sin(swimCycle * 2) * 0.03;
    }
  }

  // Kelp e Algas Vermelhas
  if (camX < 5500) {
    const totalKelp = kelpForest.length;
    for (let k = 0; k < totalKelp; k++) {
      const plant = kelpForest[k];
      const plantWidth = 80;
      const isVisible =
        plant.baseX + plantWidth >= minActiveX && plant.baseX - plantWidth <= maxActiveX;
      if (!isVisible) {
        setBenthicNodesVisibility(plant.segments, false);
        continue;
      }
      setBenthicNodesVisibility(plant.segments, true);

      const baseSway = Math.sin(time * plant.swaySpeed + plant.swayPhase);
      const totalSegs = plant.segments.length;
      for (let s = 0; s < totalSegs; s++) {
        const seg = plant.segments[s];
        const segmentPairIndex = Math.floor(s / 2);
        const segProgress = (segmentPairIndex + 1) / (totalSegs / 2);
        const currentSway = baseSway * segProgress * 16;
        const isLeafNode = s % 2 === 1;
        const leafSide = segmentPairIndex % 2 === 0 ? 1 : -1;
        const segmentWidth = 14 - segmentPairIndex * 1.4;
        const horizontalLeafOffset = isLeafNode ? leafSide * (segmentWidth + 4) : 0;
        seg.pos.x = plant.baseX + horizontalLeafOffset + currentSway;
        seg.angle = baseSway * segProgress * 9 + (isLeafNode ? leafSide * 25 : 0);
      }
    }

    const totalAlgae = polarAlgaePlants.length;
    for (let a = 0; a < totalAlgae; a++) {
      const algae = polarAlgaePlants[a];
      const algaeWidth = 80;
      const isVisible =
        algae.baseX + algaeWidth >= minActiveX && algae.baseX - algaeWidth <= maxActiveX;
      if (!isVisible) {
        setBenthicNodesVisibility(algae.blades, false);
        continue;
      }
      setBenthicNodesVisibility(algae.blades, true);

      const sway = Math.sin(time * algae.swaySpeed + algae.swayPhase);
      const totalBlades = algae.blades.length;
      for (let b = 0; b < totalBlades; b++) {
        algae.blades[b].angle = (b - totalBlades / 2) * 8 + sway * 12;
      }
    }
  }

  // Ervas Marinhas
  if (camX >= 11500 && camX <= 19500) {
    const totalGrass = urbanSeagrassPlants.length;
    for (let g = 0; g < totalGrass; g++) {
      const grass = urbanSeagrassPlants[g];
      const grassWidth = 80;
      const isVisible =
        grass.baseX + grassWidth >= minActiveX && grass.baseX - grassWidth <= maxActiveX;
      if (!isVisible) {
        setBenthicNodesVisibility(grass.blades, false);
        continue;
      }
      setBenthicNodesVisibility(grass.blades, true);

      const sway = Math.sin(time * grass.swaySpeed + grass.swayPhase);
      const totalBlades = grass.blades.length;
      for (let b = 0; b < totalBlades; b++) {
        grass.blades[b].angle = (b - totalBlades / 2) * 6 + sway * 10;
      }
    }
  }

  // Respiração dos corais
  if (camX > 18500) {
    const totalCorals = corals.length;
    for (let c = 0; c < totalCorals; c++) {
      const coral = corals[c];
      const coralWidth = 120;
      const isVisible =
        coral.obj.pos.x + coralWidth >= minActiveX && coral.obj.pos.x - coralWidth <= maxActiveX;
      if (!isVisible) {
        coral.obj.hidden = true;
        if (coral.tentacles) {
          setBenthicNodesVisibility(coral.tentacles, false);
        }
        continue;
      }
      coral.obj.hidden = false;
      if (coral.tentacles) {
        setBenthicNodesVisibility(coral.tentacles, true);
      }

      if (coral.type === "fan") {
        coral.obj.angle = Math.sin(time * 1.4 + coral.animPhase) * 4;
      } else if (coral.type === "anemone") {
        const cycleTime = time * 2.5 + coral.animPhase;
        const verticalScale = 1.0 + Math.sin(cycleTime) * 0.15;
        const horizontalScale = 1.0 - Math.sin(cycleTime) * 0.08;
        if (coral.obj.scale) {
          coral.obj.scale.x = horizontalScale;
          coral.obj.scale.y = verticalScale;
        }

        if (coral.tentacles) {
          const totalTentacles = coral.tentacles.length;
          for (let t = 0; t < totalTentacles; t++) {
            const tentacle = coral.tentacles[t];
            if (!tentacle) continue;
            const baseAngle = (t - (totalTentacles - 1) / 2) * 8;
            const angleSpread = Math.sin(cycleTime) * 6 * (baseAngle >= 0 ? 1 : -1);
            tentacle.angle = baseAngle + angleSpread;
            if (tentacle.scale) {
              tentacle.scale.x = 1.0;
              tentacle.scale.y = verticalScale;
            }
          }
        }
      }
    }
  }
}

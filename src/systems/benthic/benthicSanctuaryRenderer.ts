/**
 * Renderizador de corais 16-bits e peixes de recife de Arraial do Cabo.
 */

import { calculateBiomeTransitionFactor } from "../biomeTransitionSystem";
import type { IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  type BenthicRenderNode,
  type CoralDetail,
  type ReefFishData,
  type MutableVec2,
  createBenthicNodeProxy,
  CORAL_SPAWN_X,
} from "./benthicTypes";
import {
  create16BitSanctuaryTextures,
  draw16BitBrainCoral,
  draw16BitGorgonianFan,
  draw16BitAnemone,
  draw16BitAnemoneTentacle,
  draw16BitReefFish,
  ARRAIAL_16BIT_PALETTE,
} from "./benthic16BitSanctuary";

export interface SanctuaryBenthicElements {
  corals: CoralDetail[];
  reefFishList: ReefFishData[];
}

export function setupBenthicSanctuary(
  realEngine: IRenderEngine,
  floorY: number
): SanctuaryBenthicElements {
  const worldContainer = resolveWorldRenderContainer(realEngine);
  const sanctuary16Bit = create16BitSanctuaryTextures(realEngine);
  const corals: CoralDetail[] = [];
  const reefFishList: ReefFishData[] = [];

  CORAL_SPAWN_X.forEach((xPos, cIdx) => {
    calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
    const coralType = cIdx % 3 === 0 ? "brain" : cIdx % 3 === 1 ? "fan" : "anemone";

    if (sanctuary16Bit.available) {
      if (coralType === "brain") {
        const brainTex = sanctuary16Bit.brainCorals[cIdx % sanctuary16Bit.brainCorals.length];
        const brainSprite = realEngine.createSprite(brainTex, "coral_brain_16bit");
        brainSprite.setAnchor(0.5, 1.0);
        brainSprite.setPosition(xPos, floorY);
        brainSprite.setZIndex(-3);
        worldContainer.addChild(brainSprite);
        corals.push({
          obj: createBenthicNodeProxy(brainSprite, xPos, floorY),
          type: "brain",
          baseY: floorY,
          animPhase: cIdx,
        });
      } else if (coralType === "fan") {
        const fanTex = sanctuary16Bit.seaFans[cIdx % sanctuary16Bit.seaFans.length];
        const fanSprite = realEngine.createSprite(fanTex, "coral_fan_16bit");
        fanSprite.setAnchor(0.5, 1.0);
        fanSprite.setPosition(xPos, floorY);
        fanSprite.setZIndex(-3);
        worldContainer.addChild(fanSprite);
        corals.push({
          obj: createBenthicNodeProxy(fanSprite, xPos, floorY),
          type: "fan",
          baseY: floorY,
          animPhase: cIdx,
        });
      } else {
        // Anemona 16-bits com coroa de tentaculos ondulantes
        const anemoneTex =
          sanctuary16Bit.anemones && sanctuary16Bit.anemones.length > 0
            ? sanctuary16Bit.anemones[cIdx % sanctuary16Bit.anemones.length]
            : sanctuary16Bit.sponges[cIdx % sanctuary16Bit.sponges.length];
        const anemoneSprite = realEngine.createSprite(anemoneTex, "coral_anemone_16bit");
        anemoneSprite.setAnchor(0.5, 1.0);
        anemoneSprite.setPosition(xPos, floorY);
        anemoneSprite.setZIndex(-3);
        worldContainer.addChild(anemoneSprite);

        const tentacles: BenthicRenderNode[] = [];
        if (sanctuary16Bit.anemoneTentacles && sanctuary16Bit.anemoneTentacles.length > 0) {
          const tentTex =
            sanctuary16Bit.anemoneTentacles[cIdx % sanctuary16Bit.anemoneTentacles.length];
          for (let t = -3; t <= 3; t++) {
            const tentSprite = realEngine.createSprite(tentTex, "anemone_tentacle_16bit");
            tentSprite.setAnchor(0.5, 1.0);
            const tentX = xPos + t * 4;
            const tentY = floorY - 18;
            tentSprite.setPosition(tentX, tentY);
            tentSprite.setRotation((t * 7 * Math.PI) / 180);
            tentSprite.setZIndex(-3);
            worldContainer.addChild(tentSprite);
            tentacles.push(createBenthicNodeProxy(tentSprite, tentX, tentY));
          }
        }

        corals.push({
          obj: createBenthicNodeProxy(anemoneSprite, xPos, floorY),
          type: "anemone",
          baseY: floorY,
          animPhase: cIdx,
          tentacles,
        });
      }
    } else {
      if (coralType === "brain") {
        const brainG = realEngine.createGraphics();
        draw16BitBrainCoral(
          brainG,
          cIdx % 2 === 0 ? ARRAIAL_16BIT_PALETTE.CORAL_ORANGE : ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
          cIdx % 2 === 0
            ? ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK
            : ARRAIAL_16BIT_PALETTE.REEF_PURPLE_DARK,
          cIdx % 2 === 0
            ? ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT
            : ARRAIAL_16BIT_PALETTE.REEF_PURPLE_LIGHT,
          64,
          40,
          cIdx % 2 === 0
            ? ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD
            : ARRAIAL_16BIT_PALETTE.POLYP_GLOW_CYAN
        );
        brainG.setPosition(xPos - 32, floorY - 40);
        brainG.setZIndex(-3);
        worldContainer.addChild(brainG);

        corals.push({
          obj: createBenthicNodeProxy(brainG, xPos, floorY),
          type: "brain",
          baseY: floorY,
          animPhase: cIdx,
        });
      } else if (coralType === "fan") {
        const fanG = realEngine.createGraphics();
        draw16BitGorgonianFan(
          fanG,
          cIdx % 2 === 0 ? ARRAIAL_16BIT_PALETTE.TURQUOISE : ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
          cIdx % 2 === 0
            ? ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK
            : ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
          cIdx % 2 === 0 ? ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT : ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
          60,
          64,
          cIdx % 2 === 0 ? ARRAIAL_16BIT_PALETTE.SUN_YELLOW : ARRAIAL_16BIT_PALETTE.POLYP_GLOW_CYAN
        );
        fanG.setPosition(xPos - 30, floorY - 64);
        fanG.setZIndex(-3);
        worldContainer.addChild(fanG);

        corals.push({
          obj: createBenthicNodeProxy(fanG, xPos, floorY),
          type: "fan",
          baseY: floorY,
          animPhase: cIdx,
        });
      } else {
        const anemoneG = realEngine.createGraphics();
        draw16BitAnemone(
          anemoneG,
          ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_TEAL,
          ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_DARK,
          ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_PINK,
          ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP,
          56,
          44
        );
        anemoneG.setPosition(xPos - 28, floorY - 44);
        anemoneG.setZIndex(-3);
        worldContainer.addChild(anemoneG);

        const tentacles: BenthicRenderNode[] = [];
        for (let t = -3; t <= 3; t++) {
          const tentacleG = realEngine.createGraphics();
          draw16BitAnemoneTentacle(
            tentacleG,
            ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_PINK,
            ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP,
            8,
            22
          );
          const tentacleX = xPos + t * 4;
          const tentacleY = floorY - 18;
          tentacleG.setPosition(tentacleX - 4, tentacleY - 22);
          tentacleG.setRotation((t * 7 * Math.PI) / 180);
          tentacleG.setZIndex(-3);
          worldContainer.addChild(tentacleG);
          tentacles.push(createBenthicNodeProxy(tentacleG, tentacleX, tentacleY));
        }

        corals.push({
          obj: createBenthicNodeProxy(anemoneG, xPos, floorY),
          type: "anemone",
          baseY: floorY,
          animPhase: cIdx,
          tentacles,
        });
      }
    }

    if (cIdx % 2 === 0) {
      const fishBasePos: MutableVec2 = { x: xPos + 15, y: floorY - 45 - (cIdx % 3) * 15 };
      let fishNode: BenthicRenderNode;

      if (sanctuary16Bit.available) {
        const fishTex = sanctuary16Bit.fishVariants[cIdx % sanctuary16Bit.fishVariants.length];
        const fishSprite = realEngine.createSprite(fishTex, "reef_fish_16bit");
        fishSprite.setAnchor(0.5, 0.5);
        fishSprite.setPosition(fishBasePos.x, fishBasePos.y);
        fishSprite.setZIndex(-3);
        worldContainer.addChild(fishSprite);
        fishNode = createBenthicNodeProxy(fishSprite, fishBasePos.x, fishBasePos.y);
      } else {
        const reefFishG = realEngine.createGraphics();
        draw16BitReefFish(
          reefFishG,
          cIdx % 4 === 0 ? ARRAIAL_16BIT_PALETTE.SUN_YELLOW : ARRAIAL_16BIT_PALETTE.TURQUOISE,
          cIdx % 4 === 0 ? ARRAIAL_16BIT_PALETTE.CORAL_ORANGE : ARRAIAL_16BIT_PALETTE.REEF_PURPLE,
          cIdx % 4 === 0 ? ARRAIAL_16BIT_PALETTE.TURQUOISE : ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
          cIdx % 4 === 0
            ? ARRAIAL_16BIT_PALETTE.FISH_BELLY_SHADOW
            : ARRAIAL_16BIT_PALETTE.FISH_TURQUOISE_BELLY,
          24,
          12
        );
        reefFishG.setPosition(fishBasePos.x - 12, fishBasePos.y - 6);
        reefFishG.setZIndex(-3);
        worldContainer.addChild(reefFishG);
        fishNode = createBenthicNodeProxy(reefFishG, fishBasePos.x, fishBasePos.y);
      }

      reefFishList.push({
        obj: fishNode,
        basePos: fishBasePos,
        swimSpeed: 1.5 + (cIdx % 3) * 0.5,
        phase: cIdx * 1.7,
      });
    }
  });

  return { corals, reefFishList };
}

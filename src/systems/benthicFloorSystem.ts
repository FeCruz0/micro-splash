/**
 * Sistema do Fundo Marinho Bentônico — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { calculateBiomeTransitionFactor } from "./biomeTransitionSystem";
import { getSpatialCullingManager } from "./spatialCullingSystem";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import type { IRenderEngine, IRenderNode, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";
import { getActiveRenderEngine } from "../engine/adapters/RenderEngineAdapter";
import {
  create16BitSanctuaryTextures,
  draw16BitBrainCoral,
  draw16BitGorgonianFan,
  draw16BitAnemone,
  draw16BitAnemoneTentacle,
  draw16BitReefFish,
  ARRAIAL_16BIT_PALETTE,
} from "./benthic/benthic16BitSanctuary";

export interface MutableVec2 {
  x: number;
  y: number;
}

export interface BenthicRenderNode {
  pos: MutableVec2;
  angle?: number;
  scale?: MutableVec2;
  hidden?: boolean;
}

interface KelpPlant {
  segments: BenthicRenderNode[];
  baseX: number;
  baseY: number;
  height: number;
  swaySpeed: number;
  swayPhase: number;
}

interface CoralDetail {
  obj: BenthicRenderNode;
  type: "brain" | "fan" | "anemone";
  baseY: number;
  animPhase: number;
  tentacles?: BenthicRenderNode[];
}

interface ReefFishData {
  obj: BenthicRenderNode;
  basePos: MutableVec2;
  swimSpeed: number;
  phase: number;
}

function createBenthicNodeProxy(
  node: IRenderNode,
  initialX: number,
  initialY: number
): BenthicRenderNode {
  let posX = initialX;
  let posY = initialY;
  let scaleX = 1;
  let scaleY = 1;
  let currentAngle = 0;

  const posProxy: MutableVec2 = {
    get x() {
      return posX;
    },
    set x(val: number) {
      if (Math.abs(posX - val) > 0.01) {
        posX = val;
        node.setPosition(posX, posY);
      }
    },
    get y() {
      return posY;
    },
    set y(val: number) {
      if (Math.abs(posY - val) > 0.01) {
        posY = val;
        node.setPosition(posX, posY);
      }
    },
  };

  const scaleProxy: MutableVec2 = {
    get x() {
      return scaleX;
    },
    set x(val: number) {
      if (Math.abs(scaleX - val) > 0.01) {
        scaleX = val;
        node.setScale(scaleX, scaleY);
      }
    },
    get y() {
      return scaleY;
    },
    set y(val: number) {
      if (Math.abs(scaleY - val) > 0.01) {
        scaleY = val;
        node.setScale(scaleX, scaleY);
      }
    },
  };

  return {
    pos: posProxy,
    get angle() {
      return currentAngle;
    },
    set angle(val: number | undefined) {
      const targetAngle = val ?? 0;
      if (Math.abs(currentAngle - targetAngle) > 0.05) {
        currentAngle = targetAngle;
        node.setRotation(targetAngle);
      }
    },
    get scale() {
      return scaleProxy;
    },
    set scale(val: MutableVec2 | undefined) {
      if (val) {
        scaleProxy.x = val.x;
        scaleProxy.y = val.y;
      }
    },
    get hidden() {
      return !node.isVisible();
    },
    set hidden(val: boolean | undefined) {
      node.setVisible(!val);
    },
  };
}

/**
 * Calcula a cor progressiva do segmento de kelp (Fase 35.2).
 * Interpola da base marrom-escura (55, 35, 15) para o topo dourado-esverdeado (110, 130, 40).
 */
export function calculateKelpSegmentColor(
  realEngine:
    | { rgb?: (r: number, g: number, b: number) => { r: number; g: number; b: number } }
    | IRenderEngine
    | LegacyEngineBridge,
  segmentIndex: number,
  totalSegments: number
): { r: number; g: number; b: number } {
  const progressRatio = totalSegments > 1 ? segmentIndex / (totalSegments - 1) : 0;
  const redChannel = Math.round(55 + (110 - 55) * progressRatio);
  const greenChannel = Math.round(35 + (130 - 35) * progressRatio);
  const blueChannel = Math.round(15 + (40 - 15) * progressRatio);
  if ("rgb" in realEngine && typeof realEngine.rgb === "function") {
    return realEngine.rgb(redChannel, greenChannel, blueChannel) as {
      r: number;
      g: number;
      b: number;
    };
  }
  return { r: redChannel, g: greenChannel, b: blueChannel };
}

export const KELP_SPAWN_X = [
  250, 420, 600, 780, 1100, 1350, 1600, 1950, 2200, 2550, 2850, 3100, 3450, 3800, 4200, 4550, 4850,
];

export const POLAR_RED_ALGAE_SPAWN_X = [
  150, 500, 950, 1450, 1800, 2350, 2750, 3250, 3650, 4050, 4400, 4750,
];

export const URBAN_SEAGRASS_SPAWN_X = [
  12200, 12600, 13100, 13700, 14200, 14800, 15300, 15900, 16500, 17100, 17600, 18200, 18700,
];

export const LITHOTHAMNION_SPAWN_X = [
  19400, 19900, 20700, 21500, 22300, 23100, 24000, 24900, 27400, 28300, 29200, 29800,
];

/**
 * Sistema do Fundo Marinho Bentônico: Florestas de Kelp (Antártica) e Jardins de Corais (Arraial do Cabo)
 * Enriquece o leito oceânico com ecossistemas autênticos e física suave de ondulação subaquática.
 */
export function setupBenthicFloorSystem(engineOrContext: IRenderEngine | LegacyEngineBridge): void {
  const engineCandidate = engineOrContext as { renderEngine?: unknown };
  const candidateEngine: unknown = isRenderEngine(engineOrContext)
    ? engineOrContext
    : isRenderEngine(engineCandidate?.renderEngine)
      ? engineCandidate.renderEngine
      : getActiveRenderEngine();

  let realEngine: IRenderEngine | null = isRenderEngine(candidateEngine) ? candidateEngine : null;
  let isPixi = false;

  if (realEngine) {
    const engineWithInit = realEngine as unknown as { isInitialized?: boolean };
    if (
      ("isInitialized" in engineWithInit && engineWithInit.isInitialized) ||
      !("isInitialized" in engineWithInit)
    ) {
      try {
        realEngine.getStageRoot();
        isPixi = true;
      } catch {
        isPixi = false;
        realEngine = null;
      }
    } else {
      realEngine = null;
    }
  }

  const screenH = realEngine
    ? realEngine.getDimensions().height
    : "height" in engineOrContext && typeof engineOrContext.height === "function"
      ? (engineOrContext.height as () => number)()
      : 360;

  const floorY = screenH - 40;
  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  const kelpForest: KelpPlant[] = [];
  const polarAlgaePlants: {
    blades: BenthicRenderNode[];
    baseX: number;
    swaySpeed: number;
    swayPhase: number;
  }[] = [];
  const urbanSeagrassPlants: {
    blades: BenthicRenderNode[];
    baseX: number;
    swaySpeed: number;
    swayPhase: number;
  }[] = [];
  const corals: CoralDetail[] = [];
  const reefFishList: ReefFishData[] = [];

  const coralSpawnX = [
    19250, 19600, 20100, 20450, 20900, 21350, 21650, 22100, 22450, 22950, 23400, 23750, 24150,
    24600, 25100, 25400, 27350, 27650, 28100, 28550, 29000, 29450,
  ];

  if (isPixi && realEngine) {
    const stageRoot = realEngine.getStageRoot();
    const sanctuary16Bit = create16BitSanctuaryTextures(realEngine);

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
        stem.setZIndex(s % 2 === 0 ? -3 : 2);
        stageRoot.addChild(stem);
        cullingManager?.registerEntity(stem as unknown as CullingTarget, () => xPos);

        const leafSide = s % 2 === 0 ? 1 : -1;
        const leafWidth = 18 + s * 2;
        const leafHeight = 8 + s * 1.2;
        const leaf = realEngine.createGraphics();
        leaf.drawRect(-leafWidth / 2, -leafHeight / 2, leafWidth, leafHeight, {
          fill: { color: colorTuple, alpha: 0.75 * (0.4 + 0.6 * transitionFactor) },
        });
        leaf.setPosition(xPos + leafSide * (segWidth + 4), floorY - (s + 0.5) * segHeight);
        leaf.setRotation(leafSide * 25);
        leaf.setZIndex(-3);
        stageRoot.addChild(leaf);
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
        bladeG.setRotation((b - bladeCount / 2) * 8);
        bladeG.setZIndex(-3);
        stageRoot.addChild(bladeG);

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
        bladeG.setRotation((b - bladeCount / 2) * 6);
        bladeG.setZIndex(-3);
        stageRoot.addChild(bladeG);

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
      wasteG.setRotation((sIdx * 35) % 90);
      wasteG.setZIndex(-2);
      stageRoot.addChild(wasteG);

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
      const crustColor = [
        180 + (lIdx % 3) * 12,
        95 + (lIdx % 4) * 8,
        135 + (lIdx % 2) * 16,
      ] as const;

      const crustG = realEngine.createGraphics();
      crustG.drawRect(0, 0, crustW, crustH, {
        fill: { color: crustColor, alpha: 0.88 * (0.4 + 0.6 * transitionFactor) },
      });
      crustG.setPosition(xPos, floorY - 2 + (lIdx % 3) * 1.2);
      crustG.setZIndex(-3);
      stageRoot.addChild(crustG);

      if (lIdx % 2 === 0) {
        const noduleG = realEngine.createGraphics();
        noduleG.drawCircle(0, 0, 3.5, {
          fill: { color: [195, 110, 145], alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
        });
        noduleG.setPosition(xPos + crustW * 0.7, floorY - 3);
        noduleG.setZIndex(-3);
        stageRoot.addChild(noduleG);
      }
    });

    // 4. Corals
    coralSpawnX.forEach((xPos, cIdx) => {
      calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
      const coralType = cIdx % 3 === 0 ? "brain" : cIdx % 3 === 1 ? "fan" : "anemone";

      if (sanctuary16Bit.available) {
        if (coralType === "brain") {
          const brainTex = sanctuary16Bit.brainCorals[cIdx % sanctuary16Bit.brainCorals.length];
          const brainSprite = realEngine.createSprite(brainTex, "coral_brain_16bit");
          brainSprite.setAnchor(0.5, 1.0);
          brainSprite.setPosition(xPos, floorY);
          brainSprite.setZIndex(-3);
          stageRoot.addChild(brainSprite);
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
          stageRoot.addChild(fanSprite);
          corals.push({
            obj: createBenthicNodeProxy(fanSprite, xPos, floorY),
            type: "fan",
            baseY: floorY,
            animPhase: cIdx,
          });
        } else {
          // Anêmona 16-bits com coroa de tentáculos ondulantes
          const anemoneTex =
            sanctuary16Bit.anemones && sanctuary16Bit.anemones.length > 0
              ? sanctuary16Bit.anemones[cIdx % sanctuary16Bit.anemones.length]
              : sanctuary16Bit.sponges[cIdx % sanctuary16Bit.sponges.length];
          const anemoneSprite = realEngine.createSprite(anemoneTex, "coral_anemone_16bit");
          anemoneSprite.setAnchor(0.5, 1.0);
          anemoneSprite.setPosition(xPos, floorY);
          anemoneSprite.setZIndex(-3);
          stageRoot.addChild(anemoneSprite);

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
              tentSprite.setRotation(t * 7);
              tentSprite.setZIndex(-3);
              stageRoot.addChild(tentSprite);
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
          stageRoot.addChild(brainG);

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
            cIdx % 2 === 0
              ? ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT
              : ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
            60,
            64,
            cIdx % 2 === 0
              ? ARRAIAL_16BIT_PALETTE.SUN_YELLOW
              : ARRAIAL_16BIT_PALETTE.POLYP_GLOW_CYAN
          );
          fanG.setPosition(xPos - 30, floorY - 64);
          fanG.setZIndex(-3);
          stageRoot.addChild(fanG);

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
          stageRoot.addChild(anemoneG);

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
            tentacleG.setRotation(t * 7);
            tentacleG.setZIndex(-3);
            stageRoot.addChild(tentacleG);
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
          stageRoot.addChild(fishSprite);
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
          stageRoot.addChild(reefFishG);
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

    let time = 0;
    realEngine.getTicker().add((dt: number) => {
      time += dt;
      const camX = resolveCameraX(realEngine);
      const screenWidth = realEngine.getDimensions().width || 1280;
      const minActiveX = camX - screenWidth - 600;
      const maxActiveX = camX + screenWidth + 600;

      // Peixes de recife com ondulação senoidal suave de inclinação (pitch) e impulso caudal
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
        // Ondulação senoidal suave de inclinação hidrodinâmica (pitch idêntico às orcas/baleias de fundo)
        fish.obj.angle = Math.sin(swimCycle) * 6.5;
        // Deslocamento orgânico e impulso caudal
        fish.obj.pos.x = fish.basePos.x + Math.sin(time * fish.swimSpeed + fish.phase) * 22;
        fish.obj.pos.y = fish.basePos.y + Math.cos(swimCycle * 0.8) * 8;
        if (fish.obj.scale) {
          fish.obj.scale.x = 1.0 + Math.sin(swimCycle * 2) * 0.05;
          fish.obj.scale.y = 1.0 - Math.sin(swimCycle * 2) * 0.03;
        }
      }

      // A. Ondulação do Kelp e Algas Vermelhas
      if (camX < 5500) {
        const totalKelp = kelpForest.length;
        for (let k = 0; k < totalKelp; k++) {
          const plant = kelpForest[k];
          const plantWidth = 80;
          const isVisible =
            plant.baseX + plantWidth >= minActiveX && plant.baseX - plantWidth <= maxActiveX;
          if (!isVisible) {
            if (plant.segments[0]) plant.segments[0].hidden = true;
            continue;
          }
          if (plant.segments[0]) plant.segments[0].hidden = false;

          const baseSway = Math.sin(time * plant.swaySpeed + plant.swayPhase);
          const totalSegs = plant.segments.length;
          for (let s = 0; s < totalSegs; s++) {
            const seg = plant.segments[s];
            const segProgress = (s + 1) / totalSegs;
            const currentSway = baseSway * segProgress * 16;
            seg.pos.x = plant.baseX + currentSway;
            seg.angle = baseSway * segProgress * 9;
          }
        }

        const totalAlgae = polarAlgaePlants.length;
        for (let a = 0; a < totalAlgae; a++) {
          const algae = polarAlgaePlants[a];
          const algaeWidth = 80;
          const isVisible =
            algae.baseX + algaeWidth >= minActiveX && algae.baseX - algaeWidth <= maxActiveX;
          if (!isVisible) {
            if (algae.blades[0]) algae.blades[0].hidden = true;
            continue;
          }
          if (algae.blades[0]) algae.blades[0].hidden = false;

          const sway = Math.sin(time * algae.swaySpeed + algae.swayPhase);
          const totalBlades = algae.blades.length;
          for (let b = 0; b < totalBlades; b++) {
            algae.blades[b].angle = (b - totalBlades / 2) * 8 + sway * 12;
          }
        }
      }

      // A.5. Ervas Marinhas
      if (camX >= 11500 && camX <= 19500) {
        const totalGrass = urbanSeagrassPlants.length;
        for (let g = 0; g < totalGrass; g++) {
          const grass = urbanSeagrassPlants[g];
          const grassWidth = 80;
          const isVisible =
            grass.baseX + grassWidth >= minActiveX && grass.baseX - grassWidth <= maxActiveX;
          if (!isVisible) {
            if (grass.blades[0]) grass.blades[0].hidden = true;
            continue;
          }
          if (grass.blades[0]) grass.blades[0].hidden = false;

          const sway = Math.sin(time * grass.swaySpeed + grass.swayPhase);
          const totalBlades = grass.blades.length;
          for (let b = 0; b < totalBlades; b++) {
            grass.blades[b].angle = (b - totalBlades / 2) * 6 + sway * 10;
          }
        }
      }

      // B. Respiração dos corais
      if (camX > 18500) {
        const totalCorals = corals.length;
        for (let c = 0; c < totalCorals; c++) {
          const coral = corals[c];
          const coralWidth = 120;
          const isVisible =
            coral.obj.pos.x + coralWidth >= minActiveX &&
            coral.obj.pos.x - coralWidth <= maxActiveX;
          if (!isVisible) {
            coral.obj.hidden = true;
            continue;
          }
          coral.obj.hidden = false;

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
    });
  } else {
    // Modo Legacy Kaboom Bridge
    const legacyCtx = engineOrContext as LegacyEngineBridge & {
      rect(w: number, h: number, opts?: unknown): unknown;
      circle(radius: number): unknown;
      polygon(points: unknown[]): unknown;
      pos(x: number, y: number): unknown;
      color(c: unknown): unknown;
      color(r: number, g: number, b: number): unknown;
      rgb(r: number, g: number, b: number): unknown;
      opacity(o: number): unknown;
      anchor(a: string): unknown;
      rotate(a: number): unknown;
      scale(x: number, y: number): unknown;
      z(layer: number): unknown;
      outline(w: number, col: unknown): unknown;
      vec2(x: number, y: number): MutableVec2;
      time(): number;
      dt(): number;
      camPos(): Vector2D;
      width(): number;
      height(): number;
      onUpdate(cb: () => void): void;
    };

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
      const bladeColor = aIdx % 2 === 0 ? legacyCtx.rgb(145, 52, 45) : legacyCtx.rgb(165, 88, 35);
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
          "polar_red_algae",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(blade as unknown as CullingTarget, () => xPos);
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
      const grassColor = sIdx % 2 === 0 ? legacyCtx.rgb(75, 95, 70) : legacyCtx.rgb(65, 85, 75);
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
          "urban_seagrass",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(blade as unknown as CullingTarget, () => xPos);
        blades.push(blade);
      }

      const trashColor =
        sIdx % 4 === 0
          ? legacyCtx.rgb(230, 70, 60)
          : sIdx % 4 === 1
            ? legacyCtx.rgb(240, 210, 60)
            : sIdx % 4 === 2
              ? legacyCtx.rgb(60, 160, 230)
              : legacyCtx.rgb(230, 230, 230);

      const waste = legacyCtx.add([
        legacyCtx.rect(3.5, 3.5, { radius: 1 }),
        legacyCtx.pos(xPos + 3, floorY - 8 - (sIdx % 3) * 6),
        legacyCtx.color(trashColor),
        legacyCtx.opacity(0.88 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.anchor("center"),
        legacyCtx.rotate((sIdx * 35) % 90),
        legacyCtx.z(-2),
        "entangled_plastic_waste",
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(waste as unknown as CullingTarget, () => xPos);

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
      const crustColor = legacyCtx.rgb(
        180 + (lIdx % 3) * 12,
        95 + (lIdx % 4) * 8,
        135 + (lIdx % 2) * 16
      );

      const crust = legacyCtx.add([
        legacyCtx.rect(crustW, crustH, { radius: 2 }),
        legacyCtx.pos(xPos, floorY - 2 + (lIdx % 3) * 1.2),
        legacyCtx.color(crustColor),
        legacyCtx.opacity(0.88 * (0.4 + 0.6 * transitionFactor)),
        legacyCtx.z(-3),
        "lithothamnion_crust",
      ]) as unknown as BenthicRenderNode;
      cullingManager?.registerEntity(crust as unknown as CullingTarget, () => xPos);

      if (lIdx % 2 === 0) {
        const nodule = legacyCtx.add([
          legacyCtx.circle(3.5),
          legacyCtx.pos(xPos + crustW * 0.7, floorY - 3),
          legacyCtx.color(195, 110, 145),
          legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.z(-3),
          "lithothamnion_nodule",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(nodule as unknown as CullingTarget, () => xPos);
      }
    });

    // 4. Corals
    coralSpawnX.forEach((xPos, cIdx) => {
      const transitionFactor = calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
      const coralType = cIdx % 3 === 0 ? "brain" : cIdx % 3 === 1 ? "fan" : "anemone";

      if (coralType === "brain") {
        // Base rochosa escura
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
        const polypCol =
          cIdx % 2 === 0 ? legacyCtx.rgb(255, 213, 79) : legacyCtx.rgb(128, 222, 234);

        // 5 tubos verticais agrupados (alturas 20, 32, 38, 28, 18; larguras 10 a 12px; offsets X -20, -10, 0, +10, +20)
        const tubes = [
          { offX: -20, w: 10, h: 20 },
          { offX: -10, w: 12, h: 32 },
          { offX: 0, w: 12, h: 38 },
          { offX: 10, w: 12, h: 28 },
          { offX: 20, w: 10, h: 18 },
        ];

        let representativeObj: BenthicRenderNode | null = null;

        for (const tube of tubes) {
          // Corpo principal do tubo
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

          // Sombra lateral esquerda
          const shadowObj = legacyCtx.add([
            legacyCtx.rect(2, tube.h - 4),
            legacyCtx.pos(xPos + tube.offX - Math.floor(tube.w / 2) + 1, floorY - 4),
            legacyCtx.color(coralBorderCol),
            legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
            legacyCtx.anchor("bot"),
            legacyCtx.z(-3),
          ]) as unknown as BenthicRenderNode;
          cullingManager?.registerEntity(shadowObj as unknown as CullingTarget, () => xPos);

          // Anéis horizontais frisados iluminados
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

          // Abertura escura no topo
          const opening = legacyCtx.add([
            legacyCtx.rect(tube.w - 4, 2),
            legacyCtx.pos(xPos + tube.offX, floorY - 4 - tube.h + 2),
            legacyCtx.color(15, 37, 55),
            legacyCtx.opacity(0.95 * (0.4 + 0.6 * transitionFactor)),
            legacyCtx.anchor("bot"),
            legacyCtx.z(-3),
          ]) as unknown as BenthicRenderNode;
          cullingManager?.registerEntity(opening as unknown as CullingTarget, () => xPos);

          // Pólipo 3x3px brilhante
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
        // Base rochosa de ancoragem escura no chão
        const baseShadow = legacyCtx.add([
          legacyCtx.rect(24, 8),
          legacyCtx.pos(xPos, floorY),
          legacyCtx.color(15, 37, 55),
          legacyCtx.opacity(0.96 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(baseShadow as unknown as CullingTarget, () => xPos);

        const fanMainCol =
          cIdx % 2 === 0 ? legacyCtx.rgb(38, 198, 218) : legacyCtx.rgb(255, 112, 67);
        const fanDarkCol = cIdx % 2 === 0 ? legacyCtx.rgb(0, 131, 143) : legacyCtx.rgb(191, 54, 12);
        const tipCol = cIdx % 2 === 0 ? legacyCtx.rgb(255, 235, 59) : legacyCtx.rgb(255, 213, 79);

        // 5 galhos ramificados abertos em leque (offsets X -18, -9, 0, +9, +18; alturas 34, 46, 52, 42, 28)
        // Construídos com segmentos empilhados 6x8px, fundo vazado transparente e pontas brilhantes 3x3px
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

            // Sombra e anel intercalado
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

            // Sub-ramificações laterais curtas
            if (s === 2 || s === 4) {
              const stubDir = branch.offX >= 0 ? 1 : -1;
              const stubX = segX + stubDir * 4;
              const stub = legacyCtx.add([
                legacyCtx.rect(4, 6, { radius: 2 }),
                legacyCtx.pos(stubX, segY - 2),
                legacyCtx.color(fanMainCol),
                legacyCtx.opacity(0.95 * (0.4 + 0.6 * transitionFactor)),
                legacyCtx.anchor("bot"),
                legacyCtx.z(-3),
              ]) as unknown as BenthicRenderNode;
              cullingManager?.registerEntity(stub as unknown as CullingTarget, () => xPos);

              const stubTip = legacyCtx.add([
                legacyCtx.rect(3, 3),
                legacyCtx.pos(stubX, segY - 6),
                legacyCtx.color(tipCol),
                legacyCtx.opacity(1.0 * (0.4 + 0.6 * transitionFactor)),
                legacyCtx.anchor("center"),
                legacyCtx.z(-3),
              ]) as unknown as BenthicRenderNode;
              cullingManager?.registerEntity(stubTip as unknown as CullingTarget, () => xPos);
            }

            lastSegX = segX;
            lastSegY = segY;
          }

          // Ponta brilhante 3x3px no topo do galho
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
        // Base rochosa da anêmona
        const baseShadow = legacyCtx.add([
          legacyCtx.rect(36, 6),
          legacyCtx.pos(xPos, floorY),
          legacyCtx.color(15, 37, 55),
          legacyCtx.opacity(0.96 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(baseShadow as unknown as CullingTarget, () => xPos);

        // Coluna da anêmona
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

        // Disco oral
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

        // Peixe recifal com cauda bifurcada em V, corpo fusiforme e olho anatômico
        const reefFish = legacyCtx.add([
          legacyCtx.polygon([
            // Cauda bifurcada
            legacyCtx.vec2(-10, -5),
            legacyCtx.vec2(-6, -1),
            legacyCtx.vec2(-4, 0),
            legacyCtx.vec2(-6, 1),
            legacyCtx.vec2(-10, 5),
            legacyCtx.vec2(-4, 2),
            // Dorso e cabeça
            legacyCtx.vec2(2, 4),
            legacyCtx.vec2(8, 2),
            legacyCtx.vec2(10, 0),
            // Focinho e ventre
            legacyCtx.vec2(8, -2),
            legacyCtx.vec2(2, -4),
            legacyCtx.vec2(-4, -2),
          ]),
          legacyCtx.pos(xPos + 15, floorY - 45 - (cIdx % 3) * 15),
          legacyCtx.color(fishBodyCol),
          legacyCtx.outline(1, fishFinCol),
          legacyCtx.z(-3),
          "reef_fish",
          {
            basePos: legacyCtx.vec2(xPos + 15, floorY - 45 - (cIdx % 3) * 15),
            swimSpeed: 1.5 + (cIdx % 3) * 0.5,
            phase: cIdx * 1.7,
          },
        ]) as unknown as BenthicRenderNode & {
          basePos: MutableVec2;
          swimSpeed: number;
          phase: number;
          onUpdate(cb: () => void): void;
        };
        cullingManager?.registerEntity(reefFish as unknown as CullingTarget, () => reefFish.pos.x);

        if (reefFish && typeof reefFish.onUpdate === "function") {
          reefFish.onUpdate(() => {
            if (reefFish.hidden) return;
            const t = legacyCtx.time();
            const swimCycle = t * reefFish.swimSpeed * 2.2 + reefFish.phase;
            const fishObj = reefFish as unknown as { angle?: number };
            if (typeof fishObj.angle === "number" || fishObj.angle !== undefined) {
              fishObj.angle = Math.sin(swimCycle) * 6.5;
            }
            reefFish.pos.x =
              reefFish.basePos.x + Math.sin(t * reefFish.swimSpeed + reefFish.phase) * 22;
            reefFish.pos.y = reefFish.basePos.y + Math.cos(swimCycle * 0.8) * 8;
          });
        }
      }
    });

    let time = 0;
    legacyCtx.onUpdate(() => {
      time += legacyCtx.dt();
      const camX = legacyCtx.camPos().x;
      const screenWidth = typeof legacyCtx.width === "function" ? legacyCtx.width() : 1280;
      const minActiveX = camX - screenWidth - 600;
      const maxActiveX = camX + screenWidth + 600;

      if (camX < 5500) {
        const kelpCount = kelpForest.length;
        for (let p = 0; p < kelpCount; p++) {
          const plant = kelpForest[p];
          const plantWidth = 80;
          if (plant.baseX + plantWidth < minActiveX || plant.baseX - plantWidth > maxActiveX)
            continue;
          if (plant.segments[0]?.hidden) continue;

          const baseSway = Math.sin(time * plant.swaySpeed + plant.swayPhase);
          const segCount = plant.segments.length;
          for (let s = 0; s < segCount; s++) {
            const segProgress = (s + 1) / segCount;
            const currentSway = baseSway * segProgress * 16;
            plant.segments[s].pos.x = plant.baseX + currentSway;
            plant.segments[s].angle = baseSway * segProgress * 9;
          }
        }

        const algaeCount = polarAlgaePlants.length;
        for (let a = 0; a < algaeCount; a++) {
          const algae = polarAlgaePlants[a];
          const algaeWidth = 80;
          if (algae.baseX + algaeWidth < minActiveX || algae.baseX - algaeWidth > maxActiveX)
            continue;
          if (algae.blades[0]?.hidden) continue;
          const sway = Math.sin(time * algae.swaySpeed + algae.swayPhase);
          const bladeCount = algae.blades.length;
          for (let b = 0; b < bladeCount; b++) {
            algae.blades[b].angle = (b - bladeCount / 2) * 8 + sway * 12;
          }
        }
      }

      if (camX >= 11500 && camX <= 19500) {
        const grassCount = urbanSeagrassPlants.length;
        for (let g = 0; g < grassCount; g++) {
          const grass = urbanSeagrassPlants[g];
          const grassWidth = 80;
          if (grass.baseX + grassWidth < minActiveX || grass.baseX - grassWidth > maxActiveX)
            continue;
          if (grass.blades[0]?.hidden) continue;
          const sway = Math.sin(time * grass.swaySpeed + grass.swayPhase);
          const bladeCount = grass.blades.length;
          for (let b = 0; b < bladeCount; b++) {
            grass.blades[b].angle = (b - bladeCount / 2) * 6 + sway * 10;
          }
        }
      }

      if (camX > 18500) {
        const coralCount = corals.length;
        for (let c = 0; c < coralCount; c++) {
          const coral = corals[c];
          const coralWidth = 120;
          if (
            coral.obj.pos.x + coralWidth < minActiveX ||
            coral.obj.pos.x - coralWidth > maxActiveX
          )
            continue;
          if (coral.obj.hidden) continue;

          if (coral.type === "fan") {
            coral.obj.angle = Math.sin(time * 1.4 + coral.animPhase) * 4;
          } else if (coral.type === "anemone") {
            const cycleTime = time * 2.5 + coral.animPhase;
            const verticalScale = 1.0 + Math.sin(cycleTime) * 0.15;
            const horizontalScale = 1.0 - Math.sin(cycleTime) * 0.08;
            if (coral.obj.scale) {
              coral.obj.scale.x = horizontalScale;
              coral.obj.scale.y = verticalScale;
            } else if (typeof legacyCtx.vec2 === "function") {
              coral.obj.scale = legacyCtx.vec2(horizontalScale, verticalScale);
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
                } else if (typeof legacyCtx.vec2 === "function") {
                  tentacle.scale = legacyCtx.vec2(1.0, verticalScale);
                }
              }
            }
          }
        }
      }
    });
  }

  // 5. REGISTRO NO GERENCIADOR DE CICLO DE VIDA GEOGRÁFICO
  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    let polarActive = true;
    biomeMgr.registerModule({
      id: "benthic_polar",
      name: "Bentos Polar (Kelp & Algas)",
      minX: 0,
      maxX: 5200,
      activate: () => {
        polarActive = true;
      },
      deactivate: () => {
        polarActive = false;
      },
      isActive: () => polarActive,
    });

    let urbanActive = true;
    biomeMgr.registerModule({
      id: "benthic_urban",
      name: "Bentos Urbano (Ervas & Resíduos)",
      minX: 11800,
      maxX: 19200,
      activate: () => {
        urbanActive = true;
      },
      deactivate: () => {
        urbanActive = false;
      },
      isActive: () => urbanActive,
    });

    let coralActive = true;
    biomeMgr.registerModule({
      id: "benthic_coral",
      name: "Bentos Coralino (Rodolitos & Recifes)",
      minX: 18800,
      maxX: 30200,
      activate: () => {
        coralActive = true;
      },
      deactivate: () => {
        coralActive = false;
      },
      isActive: () => coralActive,
    });
  }
}

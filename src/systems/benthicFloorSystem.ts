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

  const posProxy: MutableVec2 = {
    get x() {
      return posX;
    },
    set x(val: number) {
      posX = val;
      node.setPosition(posX, posY);
    },
    get y() {
      return posY;
    },
    set y(val: number) {
      posY = val;
      node.setPosition(posX, posY);
    },
  };

  const scaleProxy: MutableVec2 = {
    get x() {
      return scaleX;
    },
    set x(val: number) {
      scaleX = val;
      node.setScale(scaleX, scaleY);
    },
    get y() {
      return scaleY;
    },
    set y(val: number) {
      scaleY = val;
      node.setScale(scaleX, scaleY);
    },
  };

  return {
    pos: posProxy,
    get angle() {
      return node.getRotation();
    },
    set angle(val: number | undefined) {
      node.setRotation(val ?? 0);
    },
    get scale() {
      return scaleProxy;
    },
    set scale(val: MutableVec2 | undefined) {
      if (val) {
        scaleX = val.x;
        scaleY = val.y;
        node.setScale(scaleX, scaleY);
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
  engineOrContext:
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
  if ("rgb" in engineOrContext && typeof engineOrContext.rgb === "function") {
    return engineOrContext.rgb(redChannel, greenChannel, blueChannel) as {
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
  19400, 19900, 20700, 21500, 22300, 23100, 24000, 24900, 25800, 26600, 27400, 28300, 29200, 29800,
];

/**
 * Sistema do Fundo Marinho Bentônico: Florestas de Kelp (Antártica) e Jardins de Corais (Arraial do Cabo)
 * Enriquece o leito oceânico com ecossistemas autênticos e física suave de ondulação subaquática.
 */
export function setupBenthicFloorSystem(engineOrContext: IRenderEngine | LegacyEngineBridge): void {
  const isPixi = isRenderEngine(engineOrContext);
  const screenH = isPixi
    ? engineOrContext.getDimensions().height
    : typeof engineOrContext.height === "function"
      ? engineOrContext.height()
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
    24600, 25100, 25550, 26100, 26450, 26850, 27250, 27650, 28100, 28550, 29000, 29450,
  ];

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();

    // 1. Kelp
    KELP_SPAWN_X.forEach((xPos, plantIdx) => {
      const transitionFactor = calculateBiomeTransitionFactor(xPos, 0, 5000, 300);
      const plantHeight = (120 + (plantIdx % 4) * 35) * (0.65 + 0.35 * transitionFactor);
      const segmentCount = 6;
      const segHeight = plantHeight / segmentCount;
      const segments: BenthicRenderNode[] = [];

      for (let s = 0; s < segmentCount; s++) {
        const segWidth = 14 - s * 1.4;
        const color = calculateKelpSegmentColor(engineOrContext, s, segmentCount);
        const colorTuple = [color.r, color.g, color.b] as const;

        const stem = engineOrContext.createGraphics();
        stem.drawRect(-segWidth / 2, -(segHeight + 4), segWidth, segHeight + 4, {
          fill: { color: colorTuple, alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
        });
        stem.setPosition(xPos, floorY - (s + 1) * segHeight);
        stem.setZIndex(s % 2 === 0 ? -3 : 2);
        stageRoot.addChild(stem);

        const leafSide = s % 2 === 0 ? 1 : -1;
        const leafWidth = 18 + s * 2;
        const leafHeight = 8 + s * 1.2;
        const leaf = engineOrContext.createGraphics();
        leaf.drawRect(-leafWidth / 2, -leafHeight / 2, leafWidth, leafHeight, {
          fill: { color: colorTuple, alpha: 0.75 * (0.4 + 0.6 * transitionFactor) },
        });
        leaf.setPosition(xPos + leafSide * (segWidth + 4), floorY - (s + 0.5) * segHeight);
        leaf.setRotation(leafSide * 25);
        leaf.setZIndex(-3);
        stageRoot.addChild(leaf);

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
        const bladeG = engineOrContext.createGraphics();
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
        const bladeG = engineOrContext.createGraphics();
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

      const wasteG = engineOrContext.createGraphics();
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

      const crustG = engineOrContext.createGraphics();
      crustG.drawRect(0, 0, crustW, crustH, {
        fill: { color: crustColor, alpha: 0.88 * (0.4 + 0.6 * transitionFactor) },
      });
      crustG.setPosition(xPos, floorY - 2 + (lIdx % 3) * 1.2);
      crustG.setZIndex(-3);
      stageRoot.addChild(crustG);

      if (lIdx % 2 === 0) {
        const noduleG = engineOrContext.createGraphics();
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
      const transitionFactor = calculateBiomeTransitionFactor(xPos, 19000, 30000, 300);
      const coralType = cIdx % 3 === 0 ? "brain" : cIdx % 3 === 1 ? "fan" : "anemone";

      if (coralType === "brain") {
        const brainG = engineOrContext.createGraphics();
        brainG.drawRoundedRect(-32, -40, 64, 40, 18, {
          fill: { color: [240, 125, 140], alpha: 0.9 * (0.4 + 0.6 * transitionFactor) },
          stroke: { color: [190, 85, 100], width: 3 },
        });
        brainG.setPosition(xPos, floorY - 6);
        brainG.setZIndex(-3);
        stageRoot.addChild(brainG);

        const grooveG = engineOrContext.createGraphics();
        grooveG.drawCircle(0, 0, 12, {
          fill: { color: [255, 155, 165], alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
        });
        grooveG.setPosition(xPos, floorY - 14);
        grooveG.setZIndex(-3);
        stageRoot.addChild(grooveG);

        corals.push({
          obj: createBenthicNodeProxy(brainG, xPos, floorY - 6),
          type: "brain",
          baseY: floorY - 6,
          animPhase: cIdx,
        });
      } else if (coralType === "fan") {
        const fanG = engineOrContext.createGraphics();
        const fanPoints: readonly Vector2D[] = [
          { x: 0, y: 0 },
          { x: -28, y: -55 },
          { x: -10, y: -65 },
          { x: 0, y: -58 },
          { x: 14, y: -68 },
          { x: 30, y: -50 },
        ];
        fanG.drawPolygon(fanPoints, {
          fill: { color: [255, 95, 80], alpha: 0.9 * (0.4 + 0.6 * transitionFactor) },
        });
        fanG.setPosition(xPos, floorY);
        fanG.setZIndex(-3);
        stageRoot.addChild(fanG);

        corals.push({
          obj: createBenthicNodeProxy(fanG, xPos, floorY),
          type: "fan",
          baseY: floorY,
          animPhase: cIdx,
        });
      } else {
        const anemoneG = engineOrContext.createGraphics();
        anemoneG.drawRoundedRect(-22, -26, 44, 26, 11, {
          fill: { color: [65, 230, 190], alpha: 0.9 * (0.4 + 0.6 * transitionFactor) },
        });
        anemoneG.setPosition(xPos, floorY - 4);
        anemoneG.setZIndex(-3);
        stageRoot.addChild(anemoneG);

        const tentacles: BenthicRenderNode[] = [];
        for (let t = -3; t <= 3; t++) {
          const tentacleG = engineOrContext.createGraphics();
          tentacleG.drawRoundedRect(-1.5, -16, 3, 16, 2, {
            fill: { color: [110, 255, 220], alpha: 0.85 * (0.4 + 0.6 * transitionFactor) },
          });
          const tentacleX = xPos + t * 4;
          const tentacleY = floorY - 12;
          tentacleG.setPosition(tentacleX, tentacleY);
          tentacleG.setRotation(t * 8);
          tentacleG.setZIndex(-3);
          stageRoot.addChild(tentacleG);

          tentacles.push(createBenthicNodeProxy(tentacleG, tentacleX, tentacleY));
        }

        corals.push({
          obj: createBenthicNodeProxy(anemoneG, xPos, floorY - 4),
          type: "anemone",
          baseY: floorY - 4,
          animPhase: cIdx,
          tentacles,
        });
      }

      if (cIdx % 2 === 0) {
        const fishColor = cIdx % 4 === 0 ? ([255, 225, 60] as const) : ([50, 160, 255] as const);
        const reefFishG = engineOrContext.createGraphics();
        const fishPoints: readonly Vector2D[] = [
          { x: -8, y: -4 },
          { x: 6, y: 0 },
          { x: -8, y: 4 },
          { x: -12, y: 0 },
        ];
        reefFishG.drawPolygon(fishPoints, { fill: { color: fishColor, alpha: 1 } });
        const fishBasePos: MutableVec2 = { x: xPos + 15, y: floorY - 45 - (cIdx % 3) * 15 };
        reefFishG.setPosition(fishBasePos.x, fishBasePos.y);
        reefFishG.setZIndex(-3);
        stageRoot.addChild(reefFishG);

        const fishNode = createBenthicNodeProxy(reefFishG, fishBasePos.x, fishBasePos.y);

        reefFishList.push({
          obj: fishNode,
          basePos: fishBasePos,
          swimSpeed: 1.5 + (cIdx % 3) * 0.5,
          phase: cIdx * 1.7,
        });
      }
    });

    let time = 0;
    engineOrContext.getTicker().add((dt: number) => {
      time += dt;
      const camX = resolveCameraX(engineOrContext);
      const viewDist = engineOrContext.getDimensions().width + 200;

      // Peixes de recife
      reefFishList.forEach((fish) => {
        if (fish.obj.hidden) return;
        fish.obj.pos.x = fish.basePos.x + Math.sin(time * fish.swimSpeed + fish.phase) * 18;
        fish.obj.pos.y = fish.basePos.y + Math.cos(time * 1.8 + fish.phase) * 6;
      });

      // A. Ondulação do Kelp e Algas Vermelhas
      if (camX < 5500) {
        kelpForest.forEach((plant) => {
          if (Math.abs(plant.baseX - camX) > viewDist) return;
          if (plant.segments[0]?.hidden) return;
          const baseSway = Math.sin(time * plant.swaySpeed + plant.swayPhase);
          plant.segments.forEach((seg, idx) => {
            const segProgress = (idx + 1) / plant.segments.length;
            const currentSway = baseSway * segProgress * 16;
            seg.pos.x = plant.baseX + currentSway;
            seg.angle = baseSway * segProgress * 9;
          });
        });

        polarAlgaePlants.forEach((algae) => {
          if (Math.abs(algae.baseX - camX) > viewDist) return;
          if (algae.blades[0]?.hidden) return;
          const sway = Math.sin(time * algae.swaySpeed + algae.swayPhase);
          algae.blades.forEach((blade, bIdx) => {
            blade.angle = (bIdx - algae.blades.length / 2) * 8 + sway * 12;
          });
        });
      }

      // A.5. Ervas Marinhas
      if (camX >= 11500 && camX <= 19500) {
        urbanSeagrassPlants.forEach((grass) => {
          if (Math.abs(grass.baseX - camX) > viewDist) return;
          if (grass.blades[0]?.hidden) return;
          const sway = Math.sin(time * grass.swaySpeed + grass.swayPhase);
          grass.blades.forEach((blade, bIdx) => {
            blade.angle = (bIdx - grass.blades.length / 2) * 6 + sway * 10;
          });
        });
      }

      // B. Respiração dos corais
      if (camX > 18500) {
        corals.forEach((coral) => {
          if (Math.abs(coral.obj.pos.x - camX) > viewDist) return;
          if (coral.obj.hidden) return;

          if (coral.type === "fan") {
            coral.obj.angle = Math.sin(time * 1.4 + coral.animPhase) * 4;
          } else if (coral.type === "anemone") {
            const cycleTime = time * 2.5 + coral.animPhase;
            const verticalScale = 1.0 + Math.sin(cycleTime) * 0.15;
            const horizontalScale = 1.0 - Math.sin(cycleTime) * 0.08;
            coral.obj.scale = { x: horizontalScale, y: verticalScale };

            if (coral.tentacles) {
              const totalTentacles = coral.tentacles.length;
              coral.tentacles.forEach((tentacle, tentacleIndex) => {
                const baseAngle = (tentacleIndex - (totalTentacles - 1) / 2) * 8;
                const angleSpread = Math.sin(cycleTime) * 6 * (baseAngle >= 0 ? 1 : -1);
                tentacle.angle = baseAngle + angleSpread;
                tentacle.scale = { x: 1.0, y: verticalScale };
              });
            }
          }
        });
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
        const brain = legacyCtx.add([
          legacyCtx.rect(64, 40, { radius: 18 }),
          legacyCtx.pos(xPos, floorY - 6),
          legacyCtx.color(240, 125, 140),
          legacyCtx.outline(3, legacyCtx.rgb(190, 85, 100)),
          legacyCtx.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
          "coral_brain",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(brain as unknown as CullingTarget, () => xPos);

        const groove = legacyCtx.add([
          legacyCtx.circle(12),
          legacyCtx.pos(xPos, floorY - 14),
          legacyCtx.color(255, 155, 165),
          legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("center"),
          legacyCtx.z(-3),
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(groove as unknown as CullingTarget, () => xPos);

        corals.push({ obj: brain, type: "brain", baseY: floorY - 6, animPhase: cIdx });
      } else if (coralType === "fan") {
        const fan = legacyCtx.add([
          legacyCtx.polygon([
            legacyCtx.vec2(0, 0),
            legacyCtx.vec2(-28, -55),
            legacyCtx.vec2(-10, -65),
            legacyCtx.vec2(0, -58),
            legacyCtx.vec2(14, -68),
            legacyCtx.vec2(30, -50),
          ]),
          legacyCtx.pos(xPos, floorY),
          legacyCtx.color(255, 95, 80),
          legacyCtx.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.z(-3),
          "coral_fan",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(fan as unknown as CullingTarget, () => xPos);

        corals.push({ obj: fan, type: "fan", baseY: floorY, animPhase: cIdx });
      } else {
        const anemone = legacyCtx.add([
          legacyCtx.rect(44, 26, { radius: 11 }),
          legacyCtx.pos(xPos, floorY - 4),
          legacyCtx.color(65, 230, 190),
          legacyCtx.opacity(0.9 * (0.4 + 0.6 * transitionFactor)),
          legacyCtx.anchor("bot"),
          legacyCtx.scale(1, 1),
          legacyCtx.z(-3),
          "coral_anemone",
        ]) as unknown as BenthicRenderNode;
        cullingManager?.registerEntity(anemone as unknown as CullingTarget, () => xPos);

        const tentacles: BenthicRenderNode[] = [];
        for (let t = -3; t <= 3; t++) {
          const tentacle = legacyCtx.add([
            legacyCtx.rect(3, 16, { radius: 2 }),
            legacyCtx.pos(xPos + t * 4, floorY - 12),
            legacyCtx.color(110, 255, 220),
            legacyCtx.opacity(0.85 * (0.4 + 0.6 * transitionFactor)),
            legacyCtx.anchor("bot"),
            legacyCtx.rotate(t * 8),
            legacyCtx.z(-3),
          ]) as unknown as BenthicRenderNode;
          cullingManager?.registerEntity(tentacle as unknown as CullingTarget, () => xPos);
          tentacles.push(tentacle);
        }

        corals.push({
          obj: anemone,
          type: "anemone",
          baseY: floorY - 4,
          animPhase: cIdx,
          tentacles,
        });
      }

      if (cIdx % 2 === 0) {
        const fishColor =
          cIdx % 4 === 0 ? legacyCtx.rgb(255, 225, 60) : legacyCtx.rgb(50, 160, 255);
        const reefFish = legacyCtx.add([
          legacyCtx.polygon([
            legacyCtx.vec2(-8, -4),
            legacyCtx.vec2(6, 0),
            legacyCtx.vec2(-8, 4),
            legacyCtx.vec2(-12, 0),
          ]),
          legacyCtx.pos(xPos + 15, floorY - 45 - (cIdx % 3) * 15),
          legacyCtx.color(fishColor),
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
            reefFish.pos.x =
              reefFish.basePos.x + Math.sin(t * reefFish.swimSpeed + reefFish.phase) * 18;
            reefFish.pos.y = reefFish.basePos.y + Math.cos(t * 1.8 + reefFish.phase) * 6;
          });
        }
      }
    });

    let time = 0;
    legacyCtx.onUpdate(() => {
      time += legacyCtx.dt();
      const camX = legacyCtx.camPos().x;
      const viewDist = legacyCtx.width() + 200;

      if (camX < 5500) {
        kelpForest.forEach((plant) => {
          if (Math.abs(plant.baseX - camX) > viewDist) return;
          if (plant.segments[0]?.hidden) return;

          const baseSway = Math.sin(time * plant.swaySpeed + plant.swayPhase);
          plant.segments.forEach((seg, idx) => {
            const segProgress = (idx + 1) / plant.segments.length;
            const currentSway = baseSway * segProgress * 16;
            seg.pos.x = plant.baseX + currentSway;
            seg.angle = baseSway * segProgress * 9;
          });
        });

        polarAlgaePlants.forEach((algae) => {
          if (Math.abs(algae.baseX - camX) > viewDist) return;
          if (algae.blades[0]?.hidden) return;
          const sway = Math.sin(time * algae.swaySpeed + algae.swayPhase);
          algae.blades.forEach((blade, bIdx) => {
            blade.angle = (bIdx - algae.blades.length / 2) * 8 + sway * 12;
          });
        });
      }

      if (camX >= 11500 && camX <= 19500) {
        urbanSeagrassPlants.forEach((grass) => {
          if (Math.abs(grass.baseX - camX) > viewDist) return;
          if (grass.blades[0]?.hidden) return;
          const sway = Math.sin(time * grass.swaySpeed + grass.swayPhase);
          grass.blades.forEach((blade, bIdx) => {
            blade.angle = (bIdx - grass.blades.length / 2) * 6 + sway * 10;
          });
        });
      }

      if (camX > 18500) {
        corals.forEach((coral) => {
          if (Math.abs(coral.obj.pos.x - camX) > viewDist) return;
          if (coral.obj.hidden) return;

          if (coral.type === "fan") {
            coral.obj.angle = Math.sin(time * 1.4 + coral.animPhase) * 4;
          } else if (coral.type === "anemone") {
            const cycleTime = time * 2.5 + coral.animPhase;
            const verticalScale = 1.0 + Math.sin(cycleTime) * 0.15;
            const horizontalScale = 1.0 - Math.sin(cycleTime) * 0.08;
            coral.obj.scale = legacyCtx.vec2(horizontalScale, verticalScale);

            if (coral.tentacles) {
              const totalTentacles = coral.tentacles.length;
              coral.tentacles.forEach((tentacle, tentacleIndex) => {
                const baseAngle = (tentacleIndex - (totalTentacles - 1) / 2) * 8;
                const angleSpread = Math.sin(cycleTime) * 6 * (baseAngle >= 0 ? 1 : -1);
                tentacle.angle = baseAngle + angleSpread;
                tentacle.scale = legacyCtx.vec2(1.0, verticalScale);
              });
            }
          }
        });
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

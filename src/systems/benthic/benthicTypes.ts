/**
 * Tipos, interfaces e constantes de posicionamento para o sistema bentonico.
 */

import type { IRenderEngine, IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";

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

export interface KelpPlant {
  segments: BenthicRenderNode[];
  baseX: number;
  baseY: number;
  height: number;
  swaySpeed: number;
  swayPhase: number;
}

export interface PolarAlgaePlant {
  blades: BenthicRenderNode[];
  baseX: number;
  swaySpeed: number;
  swayPhase: number;
}

export interface UrbanSeagrassPlant {
  blades: BenthicRenderNode[];
  baseX: number;
  swaySpeed: number;
  swayPhase: number;
}

export interface CoralDetail {
  obj: BenthicRenderNode;
  type: "brain" | "fan" | "anemone";
  baseY: number;
  animPhase: number;
  tentacles?: BenthicRenderNode[];
}

export interface ReefFishData {
  obj: BenthicRenderNode;
  basePos: MutableVec2;
  swimSpeed: number;
  phase: number;
}

export function setBenthicNodesVisibility(
  nodes: readonly BenthicRenderNode[],
  isVisible: boolean
): void {
  const shouldHide = !isVisible;
  for (let index = 0; index < nodes.length; index++) {
    if (nodes[index].hidden !== shouldHide) {
      nodes[index].hidden = shouldHide;
    }
  }
}

export function createBenthicNodeProxy(
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
        node.setRotation((targetAngle * Math.PI) / 180);
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
    | unknown,
  segmentIndex: number,
  totalSegments: number
): { r: number; g: number; b: number } {
  const progressRatio = totalSegments > 1 ? segmentIndex / (totalSegments - 1) : 0;
  const redChannel = Math.round(55 + (110 - 55) * progressRatio);
  const greenChannel = Math.round(35 + (130 - 35) * progressRatio);
  const blueChannel = Math.round(15 + (40 - 15) * progressRatio);
  if (
    realEngine &&
    typeof realEngine === "object" &&
    "rgb" in realEngine &&
    typeof (realEngine as { rgb?: unknown }).rgb === "function"
  ) {
    return (
      realEngine as {
        rgb: (r: number, g: number, b: number) => { r: number; g: number; b: number };
      }
    ).rgb(redChannel, greenChannel, blueChannel);
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

export const CORAL_SPAWN_X = [
  19250, 19600, 20100, 20450, 20900, 21350, 21650, 22100, 22450, 22950, 23400, 23750, 24150, 24600,
  25100, 25400, 27350, 27650, 28100, 28550, 29000, 29450,
];

export interface LegacyBenthicEngineContext {
  width(): number;
  height?(): number;
  dt(): number;
  time(): number;
  add(components: unknown[]): unknown;
  onUpdate(callback: () => void): () => void;
  rgb(r: number, g: number, b: number): unknown;
  rect(w: number, h: number, opts?: unknown): unknown;
  circle(radius: number): unknown;
  polygon(pts: unknown[]): unknown;
  pos(x: number, y: number): unknown;
  color(c: unknown): unknown;
  color(r: number, g: number, b: number): unknown;
  opacity(o: number): unknown;
  anchor(a: string): unknown;
  rotate(deg: number): unknown;
  scale(x: number, y?: number): unknown;
  vec2(x: number, y: number): MutableVec2;
  outline(width: number, color?: unknown): unknown;
  z(layer: number): unknown;
  camPos(): { readonly x: number; readonly y: number };
  rand(min: number, max: number): number;
}

/**
 * Sistema de Linha d'Água Ondulada e Orgânica (Fase 29.1) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG, TAGS } from "../config";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

export type SurfaceColor =
  { r: number; g: number; b: number } | readonly [number, number, number] | number | string;

export function parseRgbColor(c: SurfaceColor): { r: number; g: number; b: number } {
  if (Array.isArray(c)) {
    return { r: c[0], g: c[1], b: c[2] };
  }
  if (typeof c === "object" && c !== null && "r" in c) {
    const rgb = c as { r: number; g: number; b: number };
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  }
  return { r: 20, g: 50, b: 120 };
}

export interface SurfaceRenderObject {
  pos: { x: number; y: number };
  color: { r: number; g: number; b: number };
  opacity: number;
  hasTag: (tag: string) => boolean;
  exists: () => boolean;
  destroy: () => void;
  updateSurfaceColor?: (c: SurfaceColor) => void;
}

export interface WaterSurfaceSystem {
  collider: SurfaceRenderObject;
  segments: SurfaceRenderObject[];
  foamSegments: SurfaceRenderObject[];
  updateColor: (color: SurfaceColor) => void;
  updatePosition: (camX: number) => void;
  destroy: () => void;
  pos: { x: number; y: number };
  color: { r: number; g: number; b: number };
}

class PixiSurfaceSegmentProxy implements SurfaceRenderObject {
  private readonly node: IGraphicsNode;
  private currentX: number;
  private currentY: number;
  private currentColor: { r: number; g: number; b: number };
  private width: number;
  private height: number;
  private radius: number;
  private tags: Set<string>;
  updateSurfaceColor?: (c: SurfaceColor) => void;

  constructor(
    node: IGraphicsNode,
    initialX: number,
    initialY: number,
    width: number,
    height: number,
    color: { r: number; g: number; b: number },
    radius: number = 0,
    initialTags: string[] = []
  ) {
    this.node = node;
    this.currentX = initialX;
    this.currentY = initialY;
    this.currentColor = color;
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.tags = new Set(initialTags);
  }

  get pos(): { x: number; y: number } {
    const nodeRef = this.node;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get x() {
        return self.currentX;
      },
      set x(val: number) {
        self.currentX = val;
        nodeRef.setPosition(val, self.currentY);
      },
      get y() {
        return self.currentY;
      },
      set y(val: number) {
        self.currentY = val;
        nodeRef.setPosition(self.currentX, val);
      },
    };
  }

  get color(): { r: number; g: number; b: number } {
    return this.currentColor;
  }
  set color(c: SurfaceColor) {
    this.currentColor = parseRgbColor(c);
    this.redraw();
  }

  get opacity(): number {
    return this.node.getOpacity();
  }
  set opacity(val: number) {
    this.node.setOpacity(val);
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  exists(): boolean {
    return this.node.isVisible();
  }

  destroy(): void {
    this.node.destroy();
  }

  redraw(): void {
    this.node.clear();
    const col: [number, number, number] = [
      this.currentColor.r,
      this.currentColor.g,
      this.currentColor.b,
    ];
    if (this.radius > 0) {
      this.node.drawRoundedRect(0, 0, this.width, this.height, this.radius, {
        fill: { color: col, alpha: 1 },
      });
    } else {
      this.node.drawRect(0, 0, this.width, this.height, {
        fill: { color: col, alpha: 1 },
      });
    }
  }
}

/**
 * Sistema de Linha d'Água Ondulada e Orgânica (Fase 29.1)
 * Substitui o retângulo monolítico rígido por uma malha de segmentos verticais
 * acoplados a ondas senoidais harmônicas e crista de espuma dinâmica translúcida.
 */
export function createWaterSurfaceSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): WaterSurfaceSystem {
  const segmentCount = 14;
  const isPixi = isRenderEngine(engineOrContext);
  const viewWidth = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;
  const segmentWidth = Math.ceil((viewWidth * 1.4) / segmentCount);

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();

    // 1. Colisor físico estável
    const colliderG = engineOrContext.createGraphics("water_surface_collider");
    colliderG.drawRect(0, 0, viewWidth * 2.2, 16, {
      fill: { color: [20, 50, 120], alpha: 1 },
    });
    colliderG.setPosition(-viewWidth / 2, GAME_CONFIG.SEA_LEVEL);
    colliderG.setOpacity(0);
    colliderG.setZIndex(1);
    stageRoot.addChild(colliderG);

    const collider = new PixiSurfaceSegmentProxy(
      colliderG,
      -viewWidth / 2,
      GAME_CONFIG.SEA_LEVEL,
      viewWidth * 2.2,
      16,
      { r: 20, g: 50, b: 120 },
      0,
      [TAGS.SURFACE, "water_surface_collider"]
    );

    // 2. Segmentos visuais
    const segments: PixiSurfaceSegmentProxy[] = [];
    const foamSegments: PixiSurfaceSegmentProxy[] = [];

    for (let i = 0; i < segmentCount; i++) {
      const segG = engineOrContext.createGraphics("water_surface_segment");
      segG.drawRect(0, 0, segmentWidth + 2, 22, {
        fill: { color: [20, 50, 120], alpha: 1 },
      });
      segG.setPosition(0, GAME_CONFIG.SEA_LEVEL);
      segG.setOpacity(0.92);
      segG.setZIndex(1);
      stageRoot.addChild(segG);

      const segProxy = new PixiSurfaceSegmentProxy(
        segG,
        0,
        GAME_CONFIG.SEA_LEVEL,
        segmentWidth + 2,
        22,
        { r: 20, g: 50, b: 120 },
        0,
        ["water_surface_segment"]
      );
      segments.push(segProxy);

      const foamG = engineOrContext.createGraphics("water_surface_foam");
      foamG.drawRoundedRect(0, 0, segmentWidth + 2, 3.5, 1, {
        fill: { color: [235, 250, 255], alpha: 1 },
      });
      foamG.setPosition(0, GAME_CONFIG.SEA_LEVEL - 1);
      foamG.setOpacity(0.38);
      foamG.setZIndex(2);
      stageRoot.addChild(foamG);

      const foamProxy = new PixiSurfaceSegmentProxy(
        foamG,
        0,
        GAME_CONFIG.SEA_LEVEL - 1,
        segmentWidth + 2,
        3.5,
        { r: 235, g: 250, b: 255 },
        1,
        ["water_surface_foam"]
      );
      foamSegments.push(foamProxy);
    }

    let time = 0;

    const updatePosition = (camX: number) => {
      collider.pos.x = camX - viewWidth * 1.1;
      const startX = camX - (viewWidth * 1.4) / 2;

      for (let i = 0; i < segmentCount; i++) {
        const segX = startX + i * segmentWidth;
        const wave = Math.sin(time * 2.4 + i * 0.7) * 2.8 + Math.cos(time * 1.3 + i * 0.4) * 1.4;
        const segY = GAME_CONFIG.SEA_LEVEL + wave;

        segments[i].pos.x = segX;
        segments[i].pos.y = segY;

        foamSegments[i].pos.x = segX;
        foamSegments[i].pos.y = segY - 1.2;
        foamSegments[i].opacity = 0.28 + Math.max(0, -wave * 0.08);
      }
    };

    const updateColor = (color: SurfaceColor) => {
      collider.color = color;
      segments.forEach((seg) => {
        seg.color = color;
      });
    };

    collider.updateSurfaceColor = updateColor;

    const unregister = engineOrContext.getTicker().add((dt: number) => {
      time += dt;
      const camX = resolveCameraX(engineOrContext);
      updatePosition(camX);
    });

    const destroy = () => {
      unregister();
      collider.destroy();
      segments.forEach((s) => s.destroy());
      foamSegments.forEach((f) => f.destroy());
    };

    return {
      collider,
      segments,
      foamSegments,
      updateColor,
      updatePosition,
      destroy,
      get pos() {
        return collider.pos;
      },
      get color(): { r: number; g: number; b: number } {
        return collider.color;
      },
      set color(c: { r: number; g: number; b: number }) {
        updateColor(c);
      },
    };
  }

  // Modo Legacy Kaboom Bridge
  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    rect(w: number, h: number, opts?: unknown): unknown;
    pos(x: number, y: number): unknown;
    color(c: unknown): unknown;
    color(r: number, g: number, b: number): unknown;
    rgb(r: number, g: number, b: number): { r: number; g: number; b: number };
    area(): unknown;
    opacity(o: number): unknown;
    z(layer: number): unknown;
    camPos?(): { x: number; y: number };
    destroy(obj: unknown): void;
  };

  const initialColor =
    typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(20, 50, 120) : { r: 20, g: 50, b: 120 };

  const collider = legacyCtx.add([
    legacyCtx.rect(viewWidth * 2.2, 16),
    legacyCtx.pos(-viewWidth / 2, GAME_CONFIG.SEA_LEVEL),
    typeof legacyCtx.area === "function" ? legacyCtx.area() : null,
    legacyCtx.opacity(0),
    legacyCtx.z(1),
    TAGS.SURFACE,
    "water_surface_collider",
    {
      color: initialColor,
      opacity: 0,
      hasTag(tag: string) {
        return tag === TAGS.SURFACE || tag === "water_surface_collider";
      },
      exists() {
        return true;
      },
      destroy() {},
    },
  ]) as unknown as SurfaceRenderObject;

  const segments: SurfaceRenderObject[] = [];
  const foamSegments: SurfaceRenderObject[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const seg = legacyCtx.add([
      legacyCtx.rect(segmentWidth + 2, 22),
      legacyCtx.pos(0, GAME_CONFIG.SEA_LEVEL),
      legacyCtx.color(20, 50, 120),
      legacyCtx.opacity(0.92),
      legacyCtx.z(1),
      "water_surface_segment",
      {
        color: initialColor,
        hasTag(tag: string) {
          return tag === "water_surface_segment";
        },
        exists() {
          return true;
        },
        destroy() {},
      },
    ]) as unknown as SurfaceRenderObject;
    segments.push(seg);

    const foam = legacyCtx.add([
      legacyCtx.rect(segmentWidth + 2, 3.5, { radius: 1 }),
      legacyCtx.pos(0, GAME_CONFIG.SEA_LEVEL - 1),
      legacyCtx.color(235, 250, 255),
      legacyCtx.opacity(0.38),
      legacyCtx.z(2),
      "water_surface_foam",
      {
        hasTag(tag: string) {
          return tag === "water_surface_foam";
        },
        exists() {
          return true;
        },
        destroy() {},
      },
    ]) as unknown as SurfaceRenderObject;
    foamSegments.push(foam);
  }

  let time = 0;

  const updatePosition = (camX: number) => {
    collider.pos.x = camX - viewWidth * 1.1;
    const startX = camX - (viewWidth * 1.4) / 2;

    for (let i = 0; i < segmentCount; i++) {
      const segX = startX + i * segmentWidth;
      const wave = Math.sin(time * 2.4 + i * 0.7) * 2.8 + Math.cos(time * 1.3 + i * 0.4) * 1.4;
      const segY = GAME_CONFIG.SEA_LEVEL + wave;

      segments[i].pos.x = segX;
      segments[i].pos.y = segY;

      foamSegments[i].pos.x = segX;
      foamSegments[i].pos.y = segY - 1.2;
      foamSegments[i].opacity = 0.28 + Math.max(0, -wave * 0.08);
    }
  };

  const updateColor = (color: SurfaceColor) => {
    const rgb = parseRgbColor(color);
    collider.color = rgb;
    segments.forEach((seg) => {
      seg.color = rgb;
    });
  };

  collider.updateSurfaceColor = updateColor;

  let cancelUpdate: unknown = null;
  if (legacyCtx.onUpdate) {
    cancelUpdate = legacyCtx.onUpdate(() => {
      time += typeof legacyCtx.dt === "function" ? legacyCtx.dt() : 0.016;
      const camX = legacyCtx.camPos ? legacyCtx.camPos().x : 0;
      updatePosition(camX);
    });
  }

  let isDestroyed = false;
  const destroy = () => {
    isDestroyed = true;
    if (cancelUpdate) {
      if (
        typeof cancelUpdate === "object" &&
        cancelUpdate !== null &&
        "cancel" in cancelUpdate &&
        typeof (cancelUpdate as { cancel: () => void }).cancel === "function"
      ) {
        (cancelUpdate as { cancel: () => void }).cancel();
      } else if (typeof cancelUpdate === "function") {
        (cancelUpdate as () => void)();
      }
    }
    if (typeof legacyCtx.destroy === "function") {
      legacyCtx.destroy(collider);
      segments.forEach((s) => legacyCtx.destroy(s));
      foamSegments.forEach((f) => legacyCtx.destroy(f));
    }
  };

  collider.exists = () => !isDestroyed;

  return {
    collider,
    segments,
    foamSegments,
    updateColor,
    updatePosition,
    destroy,
    get pos() {
      return collider.pos;
    },
    get color(): { r: number; g: number; b: number } {
      return collider.color;
    },
    set color(c: { r: number; g: number; b: number }) {
      updateColor(c);
    },
  };
}

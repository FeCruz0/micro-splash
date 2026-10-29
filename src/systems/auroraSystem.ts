/**
 * Sistema de Aurora Austral na Antártica (Fase 29.6 - Lights Australis) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

export interface AuroraRenderObject {
  opacity: number;
  pos: { x: number; y: number };
  exists?: () => boolean;
  destroy?: () => void;
}

export interface AuroraSystem {
  ribbons: AuroraRenderObject[];
  destroy: () => void;
}

class PixiAuroraRibbonProxy implements AuroraRenderObject {
  private readonly node: IGraphicsNode;
  private currentX: number;
  private currentY: number;

  constructor(node: IGraphicsNode) {
    this.node = node;
    this.currentX = 0;
    this.currentY = 0;
  }

  get opacity(): number {
    return this.node.getOpacity();
  }
  set opacity(val: number) {
    this.node.setOpacity(val);
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

  exists(): boolean {
    return this.node.isVisible();
  }

  destroy(): void {
    this.node.destroy();
  }
}

/**
 * Sistema de Aurora Austral na Antártica (Fase 29.6 - Lights Australis)
 * Renderiza cortinas ondulantes de luz atmosférica em tons de verde-esmeralda e magenta
 * no céu polar antártico (0m a 5.000m).
 */
export function setupAuroraSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): AuroraSystem {
  const isPixi = isRenderEngine(engineOrContext);
  const count = 6;
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;

  interface RibbonData {
    obj: AuroraRenderObject;
    relX: number;
    baseY: number;
    width: number;
    height: number;
    phase: number;
    speed: number;
    baseOpacity: number;
  }

  const ribbonList: RibbonData[] = [];

  const rawColors: readonly [number, number, number][] = [
    [75, 235, 165], // Verde-esmeralda elétrico
    [195, 85, 215], // Magenta cósmico
    [65, 220, 190], // Ciano ártico
    [220, 95, 205], // Púrpura polar
    [85, 245, 175], // Verde boreal/austral
    [180, 75, 225], // Violeta
  ];

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();

    for (let i = 0; i < count; i++) {
      const width = 22 + (i % 3) * 6;
      const height = 64 + (i % 2) * 8;
      const baseY = 6 + (i % 3) * 4;
      const relX = (i / count) * screenW + (i % 2) * 20;

      const g = engineOrContext.createGraphics("sky_aurora");
      g.drawRoundedRect(0, 0, width, height, 8, {
        fill: { color: rawColors[i % rawColors.length], alpha: 1 },
      });
      g.setPosition(0, baseY);
      g.setOpacity(0);
      g.setZIndex(-9);
      stageRoot.addChild(g);

      const proxy = new PixiAuroraRibbonProxy(g);

      ribbonList.push({
        obj: proxy,
        relX,
        baseY,
        width,
        height,
        phase: (i / count) * Math.PI * 2,
        speed: 0.8 + (i % 3) * 0.3,
        baseOpacity: 0.14 + (i % 2) * 0.05,
      });
    }

    let time = 0;
    const unregister = engineOrContext.getTicker().add((dt: number) => {
      time += dt;

      const camX = resolveCameraX(engineOrContext);
      const screenLeft = camX - screenW / 2;
      const polarIntensity = camX < 4400 ? 1 : camX > 5200 ? 0 : (5200 - camX) / 800;

      ribbonList.forEach((r) => {
        const waveX = Math.sin(time * r.speed + r.phase) * 14;
        const waveY = Math.cos(time * (r.speed * 0.7) + r.phase) * 3;
        const shimmer = Math.sin(time * 1.6 + r.phase) * 0.04;

        r.obj.pos.x = screenLeft + r.relX + waveX;
        r.obj.pos.y = r.baseY + waveY;
        r.obj.opacity = polarIntensity * Math.max(0, r.baseOpacity + shimmer);
      });
    });

    const destroy = () => {
      unregister();
      ribbonList.forEach((r) => r.obj.destroy && r.obj.destroy());
    };

    return {
      ribbons: ribbonList.map((r) => r.obj),
      destroy,
    };
  }

  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    rgb?(r: number, g: number, b: number): unknown;
    rect(w: number, h: number, opts?: unknown): unknown;
    pos(x: number, y: number): unknown;
    color(c: unknown): unknown;
    color(r: number, g: number, b: number): unknown;
    opacity(o: number): unknown;
    z(layer: number): unknown;
    camPos?(): { x: number; y: number };
    destroy(obj: unknown): void;
  };

  const auroraColors = rawColors.map(([r, g, b]) =>
    typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(r, g, b) : [r, g, b]
  );

  for (let i = 0; i < count; i++) {
    const width = 22 + (i % 3) * 6;
    const height = 64 + (i % 2) * 8;
    const baseY = 6 + (i % 3) * 4;
    const relX = (i / count) * screenW + (i % 2) * 20;

    const obj = legacyCtx.add([
      legacyCtx.rect(width, height, { radius: 8 }),
      legacyCtx.pos(0, baseY),
      legacyCtx.color(auroraColors[i % auroraColors.length]),
      legacyCtx.opacity(0),
      legacyCtx.z(-9),
      "sky_aurora",
    ]) as unknown as AuroraRenderObject;

    ribbonList.push({
      obj,
      relX,
      baseY,
      width,
      height,
      phase: (i / count) * Math.PI * 2,
      speed: 0.8 + (i % 3) * 0.3,
      baseOpacity: 0.14 + (i % 2) * 0.05,
    });
  }

  let time = 0;
  let cancelUpdate: unknown = null;

  if (legacyCtx.onUpdate) {
    cancelUpdate = legacyCtx.onUpdate(() => {
      const dt = typeof legacyCtx.dt === "function" ? legacyCtx.dt() : 0.016;
      time += dt;

      const camX = legacyCtx.camPos ? legacyCtx.camPos().x : 0;
      const screenLeft = camX - screenW / 2;
      const polarIntensity = camX < 4400 ? 1 : camX > 5200 ? 0 : (5200 - camX) / 800;

      ribbonList.forEach((r) => {
        const waveX = Math.sin(time * r.speed + r.phase) * 14;
        const waveY = Math.cos(time * (r.speed * 0.7) + r.phase) * 3;
        const shimmer = Math.sin(time * 1.6 + r.phase) * 0.04;

        r.obj.pos.x = screenLeft + r.relX + waveX;
        r.obj.pos.y = r.baseY + waveY;
        r.obj.opacity = polarIntensity * Math.max(0, r.baseOpacity + shimmer);
      });
    });
  }

  const destroy = () => {
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
    ribbonList.forEach((r) => {
      if (typeof r.obj.destroy === "function") {
        r.obj.destroy();
      } else if (typeof legacyCtx.destroy === "function") {
        legacyCtx.destroy(r.obj);
      }
    });
  };

  return {
    ribbons: ribbonList.map((r) => r.obj),
    destroy,
  };
}

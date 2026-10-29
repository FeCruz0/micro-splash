/**
 * Sistema de Ondas e Espuma Costeira em Arraial do Cabo (Fase 29.4) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

export interface FoamRenderObject {
  opacity: number;
  pos: { x: number; y: number };
  exists?: () => boolean;
  destroy?: () => void;
}

export interface CoastalSurfSystem {
  foamParticles: FoamRenderObject[];
  destroy: () => void;
}

class PixiFoamNodeProxy implements FoamRenderObject {
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
 * Sistema de Ondas e Espuma Costeira em Arraial do Cabo (Fase 29.4)
 * Gera partículas de rebentação e filetes de espuma flutuantes deslizando suavemente
 * pela superfície da Enseada dos Anjos (24.800m+).
 */
export function setupCoastalSurfSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): CoastalSurfSystem {
  const isPixi = isRenderEngine(engineOrContext);
  const count = 12;
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;

  interface FoamData {
    obj: FoamRenderObject;
    relX: number;
    baseY: number;
    speedX: number;
    width: number;
    phase: number;
  }

  const foamList: FoamData[] = [];

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();

    for (let i = 0; i < count; i++) {
      const width = 10 + ((i * 7) % 17);
      const relX = (i / count) * screenW;
      const baseY = GAME_CONFIG.SEA_LEVEL + ((i % 3) - 1);
      const speedX = 16 + ((i * 5) % 17);

      const g = engineOrContext.createGraphics("coastal_surf_foam");
      g.drawRoundedRect(0, 0, width, 2.2, 1, {
        fill: { color: [255, 255, 255], alpha: 1 },
      });
      g.setPosition(0, baseY);
      g.setOpacity(0);
      g.setZIndex(2);
      stageRoot.addChild(g);

      const proxy = new PixiFoamNodeProxy(g);

      foamList.push({
        obj: proxy,
        relX,
        baseY,
        speedX,
        width,
        phase: (i / count) * Math.PI * 2,
      });
    }

    let time = 0;
    const unregister = engineOrContext.getTicker().add((dt: number) => {
      time += dt;

      const camX = resolveCameraX(engineOrContext);
      const screenLeft = camX - screenW / 2;
      const coastalIntensity = camX < 24800 ? 0 : camX > 25500 ? 1 : (camX - 24800) / 700;

      foamList.forEach((f) => {
        f.relX -= f.speedX * dt;
        if (f.relX < -50) {
          f.relX = screenW + 50;
        }

        const waveSway = Math.sin(time * 2.5 + f.phase) * 1.5;
        f.obj.pos.x = screenLeft + f.relX;
        f.obj.pos.y = f.baseY + waveSway;

        const pulse = Math.sin(time * 3 + f.phase) * 0.12 + 0.38;
        f.obj.opacity = coastalIntensity * pulse;
      });
    });

    const destroy = () => {
      unregister();
      foamList.forEach((f) => f.obj.destroy && f.obj.destroy());
    };

    return {
      foamParticles: foamList.map((f) => f.obj),
      destroy,
    };
  }

  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    rand?(min: number, max: number): number;
    rect(w: number, h: number, opts?: unknown): unknown;
    pos(x: number, y: number): unknown;
    color(r: number, g: number, b: number): unknown;
    opacity(o: number): unknown;
    z(layer: number): unknown;
    camPos?(): { x: number; y: number };
    destroy(obj: unknown): void;
  };

  for (let i = 0; i < count; i++) {
    const width = typeof legacyCtx.rand === "function" ? legacyCtx.rand(10, 26) : 16;
    const relX = (i / count) * screenW;
    const baseY =
      GAME_CONFIG.SEA_LEVEL + (typeof legacyCtx.rand === "function" ? legacyCtx.rand(-1.5, 3) : 1);
    const speedX = typeof legacyCtx.rand === "function" ? legacyCtx.rand(16, 32) : 24;

    const obj = legacyCtx.add([
      legacyCtx.rect(width, 2.2, { radius: 1 }),
      legacyCtx.pos(0, baseY),
      legacyCtx.color(255, 255, 255),
      legacyCtx.opacity(0),
      legacyCtx.z(2),
      "coastal_surf_foam",
    ]) as unknown as FoamRenderObject;

    foamList.push({
      obj,
      relX,
      baseY,
      speedX,
      width,
      phase: (i / count) * Math.PI * 2,
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

      const coastalIntensity = camX < 24800 ? 0 : camX > 25500 ? 1 : (camX - 24800) / 700;

      foamList.forEach((f) => {
        f.relX -= f.speedX * dt;
        if (f.relX < -50) {
          f.relX = screenW + 50;
        }

        const waveSway = Math.sin(time * 2.5 + f.phase) * 1.5;
        f.obj.pos.x = screenLeft + f.relX;
        f.obj.pos.y = f.baseY + waveSway;

        const pulse = Math.sin(time * 3 + f.phase) * 0.12 + 0.38;
        f.obj.opacity = coastalIntensity * pulse;
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
    foamList.forEach((f) => {
      if (typeof f.obj.destroy === "function") {
        f.obj.destroy();
      } else if (typeof legacyCtx.destroy === "function") {
        legacyCtx.destroy(f.obj);
      }
    });
  };

  return {
    foamParticles: foamList.map((f) => f.obj),
    destroy,
  };
}

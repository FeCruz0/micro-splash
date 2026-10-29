/**
 * Sistema de Névoa Abissal de Profundidade (Fase 29.3) — Micro Splash
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

export interface FogRenderObject {
  opacity: number;
  pos: { x: number; y: number };
  exists?: () => boolean;
  destroy?: () => void;
}

export interface AbyssalFogSystem {
  layers: FogRenderObject[];
  destroy: () => void;
}

class PixiFogNodeProxy implements FogRenderObject {
  private readonly node: IGraphicsNode;
  private currentY: number;

  constructor(node: IGraphicsNode, initialY: number) {
    this.node = node;
    this.currentY = initialY;
  }

  get opacity(): number {
    return this.node.getOpacity();
  }
  set opacity(val: number) {
    this.node.setOpacity(val);
  }

  get pos(): { x: number; y: number } {
    const nodeRef = this.node;
    const yRef = this.currentY;
    return {
      get x() {
        return nodeRef.getPosition().x;
      },
      set x(val: number) {
        nodeRef.setPosition(val, yRef);
      },
      get y() {
        return yRef;
      },
      set y(val: number) {
        nodeRef.setPosition(nodeRef.getPosition().x, val);
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
 * Sistema de Névoa Abissal de Profundidade (Fase 29.3)
 * Projeta camadas de degradê atmosférico marinho na base inferior da tela,
 * dissolvendo o fundo oceânico nas trevas abissais e eliminando cortes geométricos secos.
 */
export function setupAbyssalFogSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): AbyssalFogSystem {
  const isPixi = isRenderEngine(engineOrContext);
  const screenH = isPixi
    ? engineOrContext.getDimensions().height
    : typeof engineOrContext.height === "function"
      ? engineOrContext.height()
      : 360;
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;

  const layerConfigs = [
    { offsetY: 72, h: 18, opacity: 0.12 },
    { offsetY: 54, h: 18, opacity: 0.24 },
    { offsetY: 36, h: 18, opacity: 0.42 },
    { offsetY: 18, h: 18, opacity: 0.7 },
  ];

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();
    const layers: FogRenderObject[] = layerConfigs.map((cfg) => {
      const g = engineOrContext.createGraphics("abyssal_fog_layer");
      g.drawRect(0, 0, screenW * 2.2, cfg.h, {
        fill: { color: [6, 12, 28], alpha: 1 },
      });
      const initialY = screenH - cfg.offsetY;
      g.setPosition(-screenW / 2, initialY);
      g.setOpacity(cfg.opacity);
      g.setZIndex(4);
      stageRoot.addChild(g);
      return new PixiFogNodeProxy(g, initialY);
    });

    const unregister = engineOrContext.getTicker().add(() => {
      const camX = resolveCameraX(engineOrContext);
      const leftX = camX - screenW * 1.1;
      layers.forEach((layer) => {
        layer.pos.x = leftX;
      });
    });

    const destroy = () => {
      unregister();
      layers.forEach((l) => l.destroy && l.destroy());
    };

    return {
      layers,
      destroy,
    };
  }

  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    rect(w: number, h: number): unknown;
    pos(x: number, y: number): unknown;
    color(r: number, g: number, b: number): unknown;
    opacity(o: number): unknown;
    z(layer: number): unknown;
    camPos?(): { x: number; y: number };
    destroy(obj: unknown): void;
  };

  const layers: FogRenderObject[] = layerConfigs.map((cfg) => {
    return legacyCtx.add([
      legacyCtx.rect(screenW * 2.2, cfg.h),
      legacyCtx.pos(-screenW / 2, screenH - cfg.offsetY),
      legacyCtx.color(6, 12, 28),
      legacyCtx.opacity(cfg.opacity),
      legacyCtx.z(4),
      "abyssal_fog_layer",
    ]) as unknown as FogRenderObject;
  });

  let cancelUpdate: unknown = null;
  if (legacyCtx.onUpdate) {
    cancelUpdate = legacyCtx.onUpdate(() => {
      const camX = legacyCtx.camPos ? legacyCtx.camPos().x : 0;
      const leftX = camX - screenW * 1.1;
      layers.forEach((layer) => {
        layer.pos.x = leftX;
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
    layers.forEach((l) => {
      if (typeof l.destroy === "function") {
        l.destroy();
      } else if (typeof legacyCtx.destroy === "function") {
        legacyCtx.destroy(l);
      }
    });
  };

  return {
    layers,
    destroy,
  };
}

/**
 * Sistema de Névoa Abissal de Profundidade (Fase 29.3) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveCameraX } from "./cameraSystem";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";

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

interface LegacyAbyssalFogEngineContext {
  height?(): number;
  width?(): number;
  rect(width: number, height: number): unknown;
  pos(coordinateX: number, coordinateY: number): unknown;
  color(red: number, green: number, blue: number): unknown;
  opacity(alpha: number): unknown;
  z(layerZIndex: number): unknown;
  camPos?(): { readonly x: number; readonly y: number };
  destroy(targetEntity: unknown): void;
  add(componentsList: unknown[]): unknown;
  onUpdate(updateCallback: () => void): () => void;
}

/**
 * Sistema de Névoa Abissal de Profundidade (Fase 29.3)
 * Projeta camadas de degradê atmosférico marinho na base inferior da tela,
 * dissolvendo o fundo oceânico nas trevas abissais e eliminando cortes geométricos secos.
 */
export function setupAbyssalFogSystem(engineOrContext: IRenderEngine | unknown): AbyssalFogSystem {
  const isPixi = isRenderEngine(engineOrContext);
  const legacyEngineContext = !isPixi
    ? (engineOrContext as LegacyAbyssalFogEngineContext)
    : undefined;
  const screenH = isPixi
    ? engineOrContext.getDimensions().height
    : typeof legacyEngineContext?.height === "function"
      ? legacyEngineContext.height()
      : 360;
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof legacyEngineContext?.width === "function"
      ? legacyEngineContext.width()
      : 640;

  const layerConfigs = [
    { offsetY: 72, h: 18, opacity: 0.12 },
    { offsetY: 54, h: 18, opacity: 0.24 },
    { offsetY: 36, h: 18, opacity: 0.42 },
    { offsetY: 18, h: 18, opacity: 0.7 },
  ];

  if (isPixi) {
    const worldContainer = resolveWorldRenderContainer(engineOrContext);
    const layers: FogRenderObject[] = layerConfigs.map((cfg) => {
      const g = engineOrContext.createGraphics("abyssal_fog_layer");
      g.drawRect(0, 0, screenW * 2.2, cfg.h, {
        fill: { color: [6, 12, 28], alpha: 1 },
      });
      const initialY = screenH - cfg.offsetY;
      g.setPosition(-screenW / 2, initialY);
      g.setOpacity(cfg.opacity);
      g.setZIndex(4);
      worldContainer.addChild(g);
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

  const legacyCtx = legacyEngineContext as LegacyAbyssalFogEngineContext;

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

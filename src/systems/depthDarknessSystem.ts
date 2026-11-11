/**
 * Sistema de Escuridão Progressiva com Profundidade (Fase 30.5) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import type { IRenderEngine, IRenderNode, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveScreenRenderContainer } from "../engine/adapters/RenderEngineAdapter";

class FallbackRenderNodeAdapter implements IRenderNode {
  readonly id: string;
  private readonly entity: {
    pos?: { x: number; y: number };
    scale?: { x: number; y: number };
    angle?: number;
    opacity?: number;
    hidden?: boolean;
    z?: number;
    destroy?(): void;
  };

  constructor(rawEntity: unknown, id: string) {
    this.entity =
      rawEntity && typeof rawEntity === "object"
        ? (rawEntity as {
            pos?: { x: number; y: number };
            scale?: { x: number; y: number };
            angle?: number;
            opacity?: number;
            hidden?: boolean;
            z?: number;
            destroy?(): void;
          })
        : {};
    this.id = id;
  }

  getPosition(): Vector2D {
    return {
      x: this.entity.pos?.x ?? 0,
      y: this.entity.pos?.y ?? 0,
    };
  }

  setPosition(x: number, y: number): void {
    if (this.entity.pos) {
      this.entity.pos.x = x;
      this.entity.pos.y = y;
    }
  }

  getScale(): Vector2D {
    return {
      x: this.entity.scale?.x ?? 1,
      y: this.entity.scale?.y ?? 1,
    };
  }

  setScale(scaleX: number, scaleY: number): void {
    if (this.entity.scale) {
      this.entity.scale.x = scaleX;
      this.entity.scale.y = scaleY;
    }
  }

  getRotation(): number {
    return this.entity.angle ? (this.entity.angle * Math.PI) / 180 : 0;
  }

  setRotation(angleInRadians: number): void {
    this.entity.angle = (angleInRadians * 180) / Math.PI;
  }

  getOpacity(): number {
    return this.entity.opacity ?? 1;
  }

  setOpacity(alpha: number): void {
    if (typeof this.entity.opacity === "number") {
      this.entity.opacity = Math.max(0, Math.min(1, alpha));
    }
  }

  getZIndex(): number {
    return this.entity.z ?? -1;
  }

  setZIndex(index: number): void {
    this.entity.z = index;
  }

  isVisible(): boolean {
    return !this.entity.hidden;
  }

  setVisible(visible: boolean): void {
    this.entity.hidden = !visible;
  }

  addChild(_child: IRenderNode): void {}

  removeChild(_child: IRenderNode): void {}

  getChildren(): readonly IRenderNode[] {
    return [];
  }

  getNativeNode<T>(): T {
    return this.entity as unknown as T;
  }

  destroy(): void {
    if (typeof this.entity.destroy === "function") {
      this.entity.destroy();
    }
  }
}

export interface DepthDarknessHandle {
  destroy: () => void;
  getOverlay: () => IRenderNode;
}

/**
 * Função pura que calcula a opacidade do filtro de escuridão com base na profundidade Y da baleia (Fase 30.5).
 * Simula a absorção física real do espectro luminoso (especialmente luz vermelha) à medida que a baleia mergulha.
 *
 * @param playerY - Posição Y da baleia no mundo
 * @param seaLevel - Nível do mar (superfície)
 * @param screenHeight - Altura da tela
 * @param maxDarkness - Opacidade máxima do overlay (padrão 0.38)
 */
export function calculateDepthDarknessOpacity(
  playerY: number,
  seaLevel: number = GAME_CONFIG.SEA_LEVEL,
  screenHeight: number = 360,
  maxDarkness: number = 0.38
): number {
  if (playerY <= seaLevel + 10) {
    return 0;
  }

  const floorY = screenHeight - 40;
  const maxMergulho = Math.max(1, floorY - seaLevel);
  const currentDepth = Math.max(0, playerY - seaLevel);
  const depthRatio = Math.min(1, currentDepth / maxMergulho);

  // Curva quadrática suave para que os primeiros metros fiquem límpidos e o fundo escureça progressivamente
  return Math.min(maxDarkness, Math.pow(depthRatio, 1.25) * maxDarkness);
}

/**
 * Sistema de Escuridão Progressiva com Profundidade (Fase 30.5):
 * Sobrepõe um filtro ótico abissal proporcional à profundidade do mergulho da jubarte.
 */
export function setupDepthDarknessSystem(
  engineOrContext: IRenderEngine | unknown,
  playerController: PlayerController
): DepthDarknessHandle {
  const isPixi = isRenderEngine(engineOrContext);

  if (isPixi) {
    const { width, height } = engineOrContext.getDimensions();
    const overlay = engineOrContext.createGraphics("depth_darkness_overlay");
    overlay.drawRect(0, 0, width, height, {
      fill: { color: [0, 10, 25], alpha: 1 },
    });
    overlay.setOpacity(0);
    overlay.setZIndex(8);
    resolveScreenRenderContainer(engineOrContext).addChild(overlay);

    const unregister = engineOrContext.getTicker().add((dt: number) => {
      const playerObj = playerController.gameObj;
      if (!playerObj) return;

      const targetOpacity = calculateDepthDarknessOpacity(
        playerObj.pos.y,
        GAME_CONFIG.SEA_LEVEL,
        height
      );

      const currentOpacity = overlay.getOpacity();
      const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * Math.min(1, dt * 5.0);
      overlay.setOpacity(newOpacity);
    });

    return {
      destroy: () => {
        unregister();
        overlay.destroy();
      },
      getOverlay: () => overlay,
    };
  }

  const legacyCtx = engineOrContext as {
    rect(w: number, h: number): unknown;
    pos(x: number, y: number): unknown;
    fixed(): unknown;
    color(r: number, g: number, b: number): unknown;
    opacity(o: number): unknown;
    z(layer: number): unknown;
    width(): number;
    height(): number;
    lerp(a: number, b: number, t: number): number;
    dt(): number;
    destroy(obj: unknown): void;
    add(components: unknown[]): unknown;
    onUpdate(callback: () => void): () => void;
  };

  const overlayObj = legacyCtx.add([
    legacyCtx.rect(legacyCtx.width(), legacyCtx.height()),
    legacyCtx.pos(0, 0),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.color(0, 10, 25),
    legacyCtx.opacity(0),
    legacyCtx.z(8),
    "depth_darkness_overlay",
  ]) as { opacity: number; destroy?: () => void };

  const unregisterUpdate = legacyCtx.onUpdate(() => {
    const playerObj = playerController.gameObj;
    if (!playerObj) return;

    const targetOpacity = calculateDepthDarknessOpacity(
      playerObj.pos.y,
      GAME_CONFIG.SEA_LEVEL,
      legacyCtx.height()
    );

    const lerpFn =
      typeof legacyCtx.lerp === "function"
        ? legacyCtx.lerp
        : (a: number, b: number, t: number) => a + (b - a) * Math.min(1, t);
    const dt = typeof legacyCtx.dt === "function" ? legacyCtx.dt() : 0.016;
    overlayObj.opacity = lerpFn(overlayObj.opacity, targetOpacity, dt * 5.0);
  });

  const adaptedOverlay = new FallbackRenderNodeAdapter(overlayObj, "depth_darkness_overlay");

  return {
    destroy: () => {
      if (typeof unregisterUpdate === "function") {
        (unregisterUpdate as () => void)();
      } else if (
        unregisterUpdate &&
        typeof (unregisterUpdate as { cancel?: () => void }).cancel === "function"
      ) {
        (unregisterUpdate as { cancel: () => void }).cancel();
      }
      if (typeof legacyCtx.destroy === "function") {
        legacyCtx.destroy(overlayObj);
      }
    },
    getOverlay: () => adaptedOverlay,
  };
}

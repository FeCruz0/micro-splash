/**
 * Sistema de Sombras Dinâmicas da Jubarte (Fase 20.4) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getCurrentBiome } from "./oceanEnvironment";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine, type LegacyEngineBridge } from "../engine/adapters/LegacyBridge";

export interface ShadowMetrics {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  isCastOnWaterSurface: boolean;
}

export interface ShadowRenderObject {
  opacity: number;
  pos: { x: number; y: number };
  angle?: number;
  scale?: { x: number; y: number };
  color?: unknown;
  destroy?: () => void;
}

export interface DynamicShadowSystem {
  destroy: () => void;
  getShadowObject: () => ShadowRenderObject;
}

class PixiShadowNodeProxy implements ShadowRenderObject {
  private readonly node: IGraphicsNode;
  private currentX: number;
  private currentY: number;
  private scaleX: number;
  private scaleY: number;

  constructor(node: IGraphicsNode) {
    this.node = node;
    this.currentX = 0;
    this.currentY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
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

  get angle(): number {
    return (this.node.getRotation() * 180) / Math.PI;
  }
  set angle(val: number) {
    this.node.setRotation((val * Math.PI) / 180);
  }

  get scale(): { x: number; y: number } {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const nodeRef = this.node;
    return {
      get x() {
        return self.scaleX;
      },
      set x(val: number) {
        self.scaleX = val;
        nodeRef.setScale(self.scaleX, self.scaleY);
      },
      get y() {
        return self.scaleY;
      },
      set y(val: number) {
        self.scaleY = val;
        nodeRef.setScale(self.scaleX, self.scaleY);
      },
    };
  }

  destroy(): void {
    this.node.destroy();
  }
}

/**
 * Função pura para cálculo da projeção da sombra da jubarte.
 * - Quando fora d'água (salto/breach): projeta sombra exclusivamente na superfície da água (SEA_LEVEL),
 *   sem qualquer mancha ou sombra flutuando no ar ao lado da baleia.
 * - Em meia-água: opacidade zero para evitar a sensação de "mancha que segue a baleia".
 * - Perto do leito marinho: projeta suavemente no chão oceânico.
 */
export function calculateShadowMetrics(
  playerXPosition: number,
  playerYPosition: number,
  playerAngleInDegrees: number,
  seaLevel: number = GAME_CONFIG.SEA_LEVEL,
  _maxShadowDepth: number = 130,
  screenHeight: number = 360
): ShadowMetrics {
  const baseWidth = 96;

  // 1. Cenário: Baleia saltando fora d'água (Breach / Salto Majestoso acima de SEA_LEVEL)
  if (playerYPosition < seaLevel) {
    const heightAboveWater = seaLevel - playerYPosition;
    const altitudeFactor = Math.max(0.35, 1 - heightAboveWater / 220);

    return {
      positionX: playerXPosition,
      positionY: seaLevel + 3,
      width: baseWidth * (0.8 + altitudeFactor * 0.25),
      height: Math.max(4, 7 * altitudeFactor),
      angle: 0,
      opacity: 0.32 * altitudeFactor,
      isCastOnWaterSurface: true,
    };
  }

  // 2. Cenário: Baleia submersa no mar
  const oceanFloorY = screenHeight - 44;
  const distanceToFloor = oceanFloorY - playerYPosition;

  if (distanceToFloor <= 75 && distanceToFloor > 0) {
    const floorProximity = 1 - distanceToFloor / 75;
    return {
      positionX: playerXPosition,
      positionY: oceanFloorY,
      width: baseWidth * (0.85 + floorProximity * 0.25),
      height: 12 * floorProximity,
      angle: playerAngleInDegrees * 0.4,
      opacity: 0.24 * floorProximity,
      isCastOnWaterSurface: false,
    };
  }

  // Em meia-água: sem mancha artificial acompanhando o corpo da baleia
  return {
    positionX: playerXPosition,
    positionY: playerYPosition,
    width: baseWidth,
    height: 16,
    angle: 0,
    opacity: 0,
    isCastOnWaterSurface: false,
  };
}

/**
 * Inicializa o sistema de Sombras Dinâmicas da Jubarte.
 */
export function setupDynamicShadowSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  playerController: PlayerController
): DynamicShadowSystem {
  const isPixi = isRenderEngine(engineOrContext);

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();
    const screenH = engineOrContext.getDimensions().height;

    // Camada 1: Penumbra externa difusa
    const penumbraHalo = engineOrContext.createGraphics("player_shadow_penumbra");
    penumbraHalo.drawRoundedRect(-57, -7, 114, 14, 7, {
      fill: { color: [6, 16, 32], alpha: 1 },
    });
    penumbraHalo.setPosition(-9999, -9999);
    penumbraHalo.setOpacity(0);
    penumbraHalo.setZIndex(1);
    stageRoot.addChild(penumbraHalo);

    // Camada 2: Umbra central
    const umbraCore = engineOrContext.createGraphics("player_dynamic_shadow");
    umbraCore.drawRoundedRect(-41, -4, 82, 8, 4, {
      fill: { color: [3, 10, 22], alpha: 1 },
    });
    umbraCore.setPosition(-9999, -9999);
    umbraCore.setOpacity(0);
    umbraCore.setZIndex(1);
    stageRoot.addChild(umbraCore);

    const penumbraProxy = new PixiShadowNodeProxy(penumbraHalo);
    const umbraProxy = new PixiShadowNodeProxy(umbraCore);

    const unregister = engineOrContext.getTicker().add((deltaTime: number) => {
      const baleia = playerController.gameObj;
      if (!baleia || !baleia.pos) return;

      if (playerController.isFainting()) {
        penumbraProxy.opacity =
          penumbraProxy.opacity + (0 - penumbraProxy.opacity) * Math.min(1, deltaTime * 4);
        umbraProxy.opacity =
          umbraProxy.opacity + (0 - umbraProxy.opacity) * Math.min(1, deltaTime * 4);
        return;
      }

      const metrics = calculateShadowMetrics(
        baleia.pos.x,
        baleia.pos.y,
        baleia.angle ?? 0,
        GAME_CONFIG.SEA_LEVEL,
        130,
        screenH
      );

      if (metrics.opacity <= 0.001) {
        umbraProxy.opacity = 0;
        penumbraProxy.opacity = 0;
        return;
      }

      if (metrics.isCastOnWaterSurface) {
        umbraProxy.pos.x = metrics.positionX;
        umbraProxy.pos.y = metrics.positionY;
        umbraProxy.angle = 0;
      } else {
        const lerpFactor = Math.min(1, deltaTime * 12);
        umbraProxy.pos.x = umbraProxy.pos.x + (metrics.positionX - umbraProxy.pos.x) * lerpFactor;
        umbraProxy.pos.y = umbraProxy.pos.y + (metrics.positionY - umbraProxy.pos.y) * lerpFactor;
        umbraProxy.angle =
          (umbraProxy.angle ?? 0) + (metrics.angle - (umbraProxy.angle ?? 0)) * lerpFactor;
      }

      penumbraProxy.pos.x = umbraProxy.pos.x;
      penumbraProxy.pos.y = umbraProxy.pos.y;
      penumbraProxy.angle = umbraProxy.angle;

      umbraProxy.opacity = metrics.opacity * 0.8;
      penumbraProxy.opacity = metrics.opacity * 0.45;

      if (umbraProxy.scale) {
        umbraProxy.scale.x = metrics.width / 82;
        umbraProxy.scale.y = metrics.height / 8;
      }
      if (penumbraProxy.scale) {
        penumbraProxy.scale.x = (metrics.width * 1.25) / 114;
        penumbraProxy.scale.y = (metrics.height * 1.5) / 14;
      }
    });

    return {
      destroy: () => {
        unregister();
        umbraProxy.destroy?.();
        penumbraProxy.destroy?.();
      },
      getShadowObject: () => umbraProxy,
    };
  }

  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    rect(w: number, h: number, opts?: unknown): unknown;
    pos(x: number, y: number): unknown;
    rotate(a: number): unknown;
    scale(x: number, y: number): unknown;
    anchor(a: string): unknown;
    color(c: unknown): unknown;
    color(r: number, g: number, b: number): unknown;
    rgb(r: number, g: number, b: number): unknown;
    opacity(o: number): unknown;
    z(layer: number): unknown;
    lerp(a: number, b: number, t: number): number;
    height(): number;
    dt(): number;
    destroy(obj: unknown): void;
  };

  const penumbraHalo = legacyCtx.add([
    legacyCtx.rect(114, 14, { radius: 7 }),
    legacyCtx.pos(-9999, -9999),
    legacyCtx.rotate(0),
    legacyCtx.scale(1, 1),
    legacyCtx.anchor("center"),
    legacyCtx.color(6, 16, 32),
    legacyCtx.opacity(0),
    legacyCtx.z(1),
    "player_shadow_penumbra",
  ]) as unknown as ShadowRenderObject;

  const umbraCore = legacyCtx.add([
    legacyCtx.rect(82, 8, { radius: 4 }),
    legacyCtx.pos(-9999, -9999),
    legacyCtx.rotate(0),
    legacyCtx.scale(1, 1),
    legacyCtx.anchor("center"),
    legacyCtx.color(3, 10, 22),
    legacyCtx.opacity(0),
    legacyCtx.z(1),
    "player_dynamic_shadow",
  ]) as unknown as ShadowRenderObject;

  const updateHandler = legacyCtx.onUpdate(() => {
    const deltaTime = typeof legacyCtx.dt === "function" ? legacyCtx.dt() : 0.016;
    const baleia = playerController.gameObj;
    if (!baleia || !baleia.pos) return;

    const lerpFn =
      typeof legacyCtx.lerp === "function"
        ? legacyCtx.lerp
        : (a: number, b: number, t: number) => a + (b - a) * Math.min(1, t);

    if (playerController.isFainting()) {
      penumbraHalo.opacity = lerpFn(penumbraHalo.opacity, 0, deltaTime * 4);
      umbraCore.opacity = lerpFn(umbraCore.opacity, 0, deltaTime * 4);
      return;
    }

    const metrics = calculateShadowMetrics(
      baleia.pos.x,
      baleia.pos.y,
      baleia.angle ?? 0,
      GAME_CONFIG.SEA_LEVEL,
      130,
      typeof legacyCtx.height === "function" ? legacyCtx.height() : 360
    );

    if (metrics.opacity <= 0.001) {
      umbraCore.opacity = 0;
      penumbraHalo.opacity = 0;
      return;
    }

    const currentBiome = getCurrentBiome(baleia.pos.x);
    const floorColor = currentBiome.floorColor || [10, 24, 38];
    const shadowR = Math.max(2, Math.round(floorColor[0] * 0.45));
    const shadowG = Math.max(6, Math.round(floorColor[1] * 0.45));
    const shadowB = Math.max(16, Math.round(floorColor[2] * 0.45));
    const shadowColor =
      typeof legacyCtx.rgb === "function"
        ? legacyCtx.rgb(shadowR, shadowG, shadowB)
        : [shadowR, shadowG, shadowB];

    if (metrics.isCastOnWaterSurface) {
      umbraCore.pos.x = metrics.positionX;
      umbraCore.pos.y = metrics.positionY;
      umbraCore.angle = 0;
    } else {
      const lerpFactor = Math.min(1, deltaTime * 12);
      umbraCore.pos.x = lerpFn(umbraCore.pos.x, metrics.positionX, lerpFactor);
      umbraCore.pos.y = lerpFn(umbraCore.pos.y, metrics.positionY, lerpFactor);
      umbraCore.angle = lerpFn(umbraCore.angle ?? 0, metrics.angle, lerpFactor);
    }

    penumbraHalo.pos.x = umbraCore.pos.x;
    penumbraHalo.pos.y = umbraCore.pos.y;
    penumbraHalo.angle = umbraCore.angle;

    umbraCore.color = shadowColor;
    penumbraHalo.color = shadowColor;

    umbraCore.opacity = metrics.opacity * 0.8;
    penumbraHalo.opacity = metrics.opacity * 0.45;

    if (umbraCore.scale) {
      umbraCore.scale.x = metrics.width / 82;
      umbraCore.scale.y = metrics.height / 8;
    }
    if (penumbraHalo.scale) {
      penumbraHalo.scale.x = (metrics.width * 1.25) / 114;
      penumbraHalo.scale.y = (metrics.height * 1.5) / 14;
    }
  });

  return {
    destroy: () => {
      if (
        updateHandler &&
        typeof updateHandler === "object" &&
        "cancel" in updateHandler &&
        typeof (updateHandler as { cancel: () => void }).cancel === "function"
      ) {
        (updateHandler as { cancel: () => void }).cancel();
      } else if (typeof updateHandler === "function") {
        (updateHandler as () => void)();
      }
      if (typeof legacyCtx.destroy === "function") {
        legacyCtx.destroy(umbraCore);
        legacyCtx.destroy(penumbraHalo);
      }
    },
    getShadowObject: () => umbraCore,
  };
}

import { GAME_CONFIG } from "../config";
import type { IRenderEngine, IRenderNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  createNativePolygonNode,
  createNativeRectNode,
} from "../engine/adapters/NativeRenderNodeFactory";
import { createTween, Easings } from "../engine/utils/Tween";
import { updateOceanColors, type OceanEnvironmentEngineContext } from "../systems/oceanEnvironment";

export interface BackdropUiNode {
  pos: { x: number; y: number };
  color?: unknown;
  opacity?: number;
  destroy?(): void;
}

export interface GameSceneBackdropEngineContext {
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  opacity(alpha: number): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  destroy(target: unknown): void;
  width(): number;
  height(): number;
  lerp?(a: number, b: number, t: number): number;
  rgb?(r: number, g: number, b: number): unknown;
}

export interface GameSceneBackdropOptions {
  readonly engineContext: GameSceneBackdropEngineContext &
    (IRenderEngine | OceanEnvironmentEngineContext);
  readonly renderEngine: IRenderEngine | null;
  readonly worldContainer: IRenderNode | null;
  readonly screenContainer: IRenderNode | null;
  readonly viewportDimensions: { readonly width: number; readonly height: number };
  readonly registerCleanup: (cleanupCallback: () => void) => void;
}

export interface GameSceneBackdropHandle {
  readonly oceanFloor: BackdropUiNode;
  readonly skyBand: BackdropUiNode;
  update(
    playerXPosition: number,
    cameraXPosition: number,
    screenWidth: number,
    screenHeight: number,
    waterSurface: Parameters<typeof updateOceanColors>[2]
  ): void;
  destroy(): void;
}

/**
 * Cria e gerencia os elementos de cenário base da cena de jogo:
 * - Overlay de fade-in na entrada da cena;
 * - Leito oceânico (`oceanFloor`) com silhueta poligonal facetada 16-bit;
 * - Faixa de céu (`skyBand`) acima da linha do mar.
 */
export function createGameSceneBackdrop(
  options: GameSceneBackdropOptions
): GameSceneBackdropHandle {
  const {
    engineContext,
    renderEngine,
    worldContainer,
    screenContainer,
    viewportDimensions,
    registerCleanup,
  } = options;

  // Overlay de Fade-In para suavizar a entrada no jogo
  const fadeOverlay: BackdropUiNode =
    renderEngine && screenContainer
      ? createNativeRectNode(engineContext, renderEngine, screenContainer, {
          identifier: "game_scene_fade_overlay",
          width: viewportDimensions.width,
          height: viewportDimensions.height,
          positionX: 0,
          positionY: 0,
          fillColor: [6, 18, 42],
          opacity: 1,
          zIndex: 100,
        })
      : (engineContext.add([
          engineContext.rect(engineContext.width(), engineContext.height()),
          engineContext.pos(0, 0),
          engineContext.color(6, 18, 42),
          engineContext.opacity(1),
          engineContext.fixed(),
          engineContext.z(100),
        ]) as BackdropUiNode);

  let isFadeOverlayDestroyed = false;
  let isBackdropDestroyed = false;

  const destroyFadeOverlayOnce = (): void => {
    if (isFadeOverlayDestroyed) {
      return;
    }
    isFadeOverlayDestroyed = true;
    if (renderEngine) {
      fadeOverlay.destroy?.();
    } else if (typeof engineContext.destroy === "function") {
      engineContext.destroy(fadeOverlay);
    } else {
      fadeOverlay.destroy?.();
    }
  };

  const fadeTweenHandle = createTween(
    1,
    0,
    0.8,
    (currentOpacity: number) => {
      fadeOverlay.opacity = currentOpacity;
    },
    Easings.easeOutQuad
  );

  fadeTweenHandle.promise.then(() => {
    if (isBackdropDestroyed) {
      return;
    }
    destroyFadeOverlayOnce();
  });

  // Limites do mar
  const oceanFloor: BackdropUiNode = (() => {
    if (renderEngine && worldContainer) {
      const floorWidth = viewportDimensions.width * 2;
      const floorAdapter = createNativeRectNode(engineContext, renderEngine, worldContainer, {
        identifier: "game_scene_ocean_floor",
        width: floorWidth,
        height: 60,
        positionX: -viewportDimensions.width / 2,
        positionY: viewportDimensions.height - 40,
        fillColor: [20, 50, 120],
        zIndex: 0,
      });

      // Silhueta poligonal facetada integrada ao topo do leito oceânico (estilo 16-bits)
      const ridgePoints: Array<{ x: number; y: number }> = [{ x: 0, y: 2 }];
      const ridgeHeights = [-8, -3, -11, -5, -13, -4, -9, -2];
      const segmentCount = Math.max(8, Math.floor(floorWidth / 80));
      const stepX = floorWidth / segmentCount;
      for (let i = 0; i <= segmentCount; i++) {
        const xPos = Math.round(i * stepX);
        const yPos = i === 0 || i === segmentCount ? 0 : ridgeHeights[i % ridgeHeights.length];
        ridgePoints.push({ x: xPos, y: yPos });
      }
      ridgePoints.push({ x: floorWidth, y: 2 });

      const floorRidge = createNativePolygonNode(
        engineContext,
        renderEngine,
        floorAdapter.getRenderNode(),
        {
          identifier: "game_scene_ocean_floor_ridge",
          points: ridgePoints,
          positionX: 0,
          positionY: 0,
          fillColor: [14, 34, 56],
          outlineColor: [38, 86, 128],
          outlineWidth: 1.5,
          opacity: 0.92,
          zIndex: 1,
        }
      );
      floorRidge.getRenderNode().freeze?.(true);

      return floorAdapter;
    }

    return engineContext.add([
      engineContext.rect(engineContext.width() * 2, 60),
      engineContext.pos(-engineContext.width() / 2, engineContext.height() - 40),
      engineContext.color(20, 50, 120),
    ]) as BackdropUiNode;
  })();

  // Área do céu acima do nível do mar (0px a 80px)
  const skyBand: BackdropUiNode =
    renderEngine && worldContainer
      ? createNativeRectNode(engineContext, renderEngine, worldContainer, {
          identifier: "game_scene_sky_band",
          width: viewportDimensions.width * 2,
          height: GAME_CONFIG.SEA_LEVEL,
          positionX: -viewportDimensions.width / 2,
          positionY: 0,
          fillColor: [120, 190, 245],
          zIndex: -10,
          tags: ["sky"],
        })
      : (engineContext.add([
          engineContext.rect(engineContext.width() * 2, GAME_CONFIG.SEA_LEVEL),
          engineContext.pos(-engineContext.width() / 2, 0),
          engineContext.color(120, 190, 245),
          engineContext.z(-10),
          "sky",
        ]) as BackdropUiNode);

  const destroy = (): void => {
    if (isBackdropDestroyed) {
      return;
    }
    isBackdropDestroyed = true;
    fadeTweenHandle.cancel();
    destroyFadeOverlayOnce();
    oceanFloor.destroy?.();
    skyBand.destroy?.();
  };

  registerCleanup(destroy);

  return {
    oceanFloor,
    skyBand,
    update(
      playerXPosition: number,
      cameraXPosition: number,
      screenWidth: number,
      screenHeight: number,
      waterSurface: Parameters<typeof updateOceanColors>[2]
    ): void {
      oceanFloor.pos.x = cameraXPosition - screenWidth;
      oceanFloor.pos.y = screenHeight - 40;
      skyBand.pos.x = cameraXPosition - screenWidth;
      updateOceanColors(engineContext, playerXPosition, waterSurface, oceanFloor, skyBand);
    },
    destroy,
  };
}

/**
 * Sistema da Camada de Gelo e Banquisa Polar (Antartica) — Micro Splash
 *
 * Desacoplado em submodulos:
 * - iceGaps.ts (Fendas de respiracao)
 * - ice16BitTextures.ts (Texturas procedurais)
 * - iceSurfaceRenderer.ts (Renderizacao nativa PixiJS v8)
 * - iceSurfaceLegacy.ts (Compatibilidade com testes legados)
 */

import { type PlayerController } from "../entities/player";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  type IceGap,
  DEFAULT_ICE_GAPS,
  ICE_GAPS,
  activeIceGaps,
  resetActiveIceGaps,
  isPositionInIceGap,
  getNearestIceGap,
} from "./ice/iceGaps";
import { setupPolarIceRendering } from "./ice/iceSurfaceRenderer";
import { setupLegacyIceSurface, type LegacyIceSurfaceEngineContext } from "./ice/iceSurfaceLegacy";
import {
  attachWallToWorldContainer,
  renderAntarcticGlacierWall,
  renderBoundedAntarcticGlacier,
  renderSoleFacetedGlacierCliff,
  renderVisibleFacetedGlacierCliff,
  updateWorldBoundaryConstraint,
} from "./ice/icebergWallRenderer";

export type { IceGap };
export {
  DEFAULT_ICE_GAPS,
  ICE_GAPS,
  activeIceGaps,
  resetActiveIceGaps,
  isPositionInIceGap,
  getNearestIceGap,
  attachWallToWorldContainer,
  renderAntarcticGlacierWall,
  renderBoundedAntarcticGlacier,
  renderSoleFacetedGlacierCliff,
  renderVisibleFacetedGlacierCliff,
  updateWorldBoundaryConstraint,
};

/**
 * Cria e orquestra a banquisa polar, paredoes de icebergs e fendas de respiracao na Antartica (0m a 5.000m).
 */
export function setupIceSurfaceSystem(
  engineOrContext: IRenderEngine | unknown,
  playerController?: PlayerController
) {
  let isSystemActive = true;
  resetActiveIceGaps();

  let destroyRenderer: (() => void) | null = null;
  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  if (resolvedRenderEngine) {
    destroyRenderer = setupPolarIceRendering(
      resolvedRenderEngine,
      playerController,
      () => isSystemActive
    );
  } else if (engineOrContext) {
    setupLegacyIceSurface(engineOrContext as LegacyIceSurfaceEngineContext, playerController);
  }

  const activate = () => {
    isSystemActive = true;
  };

  const deactivate = () => {
    isSystemActive = false;
  };

  const destroy = () => {
    isSystemActive = false;
    if (destroyRenderer) {
      destroyRenderer();
      destroyRenderer = null;
    }
  };

  const sceneLifecycle = engineOrContext as { onSceneLeave?: (cb: () => void) => unknown } | null;
  if (sceneLifecycle && typeof sceneLifecycle.onSceneLeave === "function") {
    sceneLifecycle.onSceneLeave(destroy);
  }

  const biomeManager = getBiomeLifecycleManager();
  if (biomeManager) {
    biomeManager.registerModule({
      id: "ice_surface",
      name: "Camada de Gelo (Antartica)",
      minX: -1440,
      maxX: 5400,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    destroy,
    isActive: () => isSystemActive,
  };
}

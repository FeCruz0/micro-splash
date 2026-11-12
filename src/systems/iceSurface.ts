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

export type { IceGap };
export {
  DEFAULT_ICE_GAPS,
  ICE_GAPS,
  activeIceGaps,
  resetActiveIceGaps,
  isPositionInIceGap,
  getNearestIceGap,
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

  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  if (resolvedRenderEngine) {
    setupPolarIceRendering(resolvedRenderEngine, playerController, () => isSystemActive);
  } else if (engineOrContext) {
    setupLegacyIceSurface(engineOrContext as LegacyIceSurfaceEngineContext, playerController);
  }

  const activate = () => {
    isSystemActive = true;
  };

  const deactivate = () => {
    isSystemActive = false;
  };

  const biomeManager = getBiomeLifecycleManager();
  if (biomeManager) {
    biomeManager.registerModule({
      id: "ice_surface",
      name: "Camada de Gelo (Antartica)",
      minX: -1100,
      maxX: 5400,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    isActive: () => isSystemActive,
  };
}

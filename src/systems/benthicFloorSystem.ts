/**
 * Sistema do Fundo Marinho Bentonico — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 * Dividido em submodulos coesos (< 300 linhas):
 * - benthicTypes.ts
 * - benthicFloraRenderer.ts
 * - benthicSanctuaryRenderer.ts
 * - benthicMotionUpdater.ts
 * - benthicLegacyFloor.ts
 */

import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveCameraX } from "./cameraSystem";
import { getActiveRenderEngine } from "../engine/adapters/RenderEngineAdapter";
import {
  type MutableVec2,
  type BenthicRenderNode,
  calculateKelpSegmentColor,
  KELP_SPAWN_X,
  POLAR_RED_ALGAE_SPAWN_X,
  URBAN_SEAGRASS_SPAWN_X,
  LITHOTHAMNION_SPAWN_X,
  type LegacyBenthicEngineContext,
} from "./benthic/benthicTypes";
import { setupBenthicFlora } from "./benthic/benthicFloraRenderer";
import { setupBenthicSanctuary } from "./benthic/benthicSanctuaryRenderer";
import { updateBenthicMotion } from "./benthic/benthicMotionUpdater";
import { setupLegacyBenthicFloor } from "./benthic/benthicLegacyFloor";

export type { MutableVec2, BenthicRenderNode };
export {
  calculateKelpSegmentColor,
  KELP_SPAWN_X,
  POLAR_RED_ALGAE_SPAWN_X,
  URBAN_SEAGRASS_SPAWN_X,
  LITHOTHAMNION_SPAWN_X,
};

/**
 * Sistema do Fundo Marinho Bentonico: Florestas de Kelp (Antartica) e Jardins de Corais (Arraial do Cabo)
 * Enriquece o leito oceanico com ecossistemas autenticos e fisica suave de ondulacao subaquatica.
 */
export function setupBenthicFloorSystem(engineOrContext: IRenderEngine | unknown): void {
  const engineCandidate = engineOrContext as { renderEngine?: unknown };
  const candidateEngine: unknown = isRenderEngine(engineOrContext)
    ? engineOrContext
    : isRenderEngine(engineCandidate?.renderEngine)
      ? engineCandidate.renderEngine
      : getActiveRenderEngine();

  let realEngine: IRenderEngine | null = isRenderEngine(candidateEngine) ? candidateEngine : null;
  let isPixi = false;

  if (realEngine) {
    const engineWithInit = realEngine as unknown as { isInitialized?: boolean };
    if (
      ("isInitialized" in engineWithInit && engineWithInit.isInitialized) ||
      !("isInitialized" in engineWithInit)
    ) {
      try {
        realEngine.getStageRoot();
        isPixi = true;
      } catch {
        isPixi = false;
        realEngine = null;
      }
    } else {
      realEngine = null;
    }
  }

  const screenH = realEngine
    ? realEngine.getDimensions().height
    : engineOrContext &&
        typeof engineOrContext === "object" &&
        "height" in engineOrContext &&
        typeof (engineOrContext as { height?: unknown }).height === "function"
      ? (engineOrContext as { height: () => number }).height()
      : 360;

  const floorY = screenH - 40;

  if (isPixi && realEngine) {
    const flora = setupBenthicFlora(realEngine, floorY);
    const sanctuary = setupBenthicSanctuary(realEngine, floorY);

    let time = 0;
    realEngine.getTicker().add((dt: number) => {
      time += dt;
      const camX = resolveCameraX(realEngine);
      const screenWidth = realEngine.getDimensions().width || 1280;

      updateBenthicMotion({
        time,
        camX,
        screenWidth,
        kelpForest: flora.kelpForest,
        polarAlgaePlants: flora.polarAlgaePlants,
        urbanSeagrassPlants: flora.urbanSeagrassPlants,
        corals: sanctuary.corals,
        reefFishList: sanctuary.reefFishList,
      });
    });
  } else if (engineOrContext) {
    setupLegacyBenthicFloor(engineOrContext as LegacyBenthicEngineContext, floorY);
  }

  // 5. REGISTRO NO GERENCIADOR DE CICLO DE VIDA GEOGRAFICO
  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    let polarActive = true;
    biomeMgr.registerModule({
      id: "benthic_polar",
      name: "Bentos Polar (Kelp & Algas)",
      minX: 0,
      maxX: 5200,
      activate: () => {
        polarActive = true;
      },
      deactivate: () => {
        polarActive = false;
      },
      isActive: () => polarActive,
    });

    let urbanActive = true;
    biomeMgr.registerModule({
      id: "benthic_urban",
      name: "Bentos Urbano (Ervas & Residuos)",
      minX: 11800,
      maxX: 19200,
      activate: () => {
        urbanActive = true;
      },
      deactivate: () => {
        urbanActive = false;
      },
      isActive: () => urbanActive,
    });

    let coralActive = true;
    biomeMgr.registerModule({
      id: "benthic_coral",
      name: "Bentos Coralino (Rodolitos & Recifes)",
      minX: 18800,
      maxX: 30200,
      activate: () => {
        coralActive = true;
      },
      deactivate: () => {
        coralActive = false;
      },
      isActive: () => coralActive,
    });
  }
}

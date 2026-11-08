import type { ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import type { RenderingContext, RenderingContextLifecycle } from "../engine/adapters/RenderingContextAdapter";
import { withRenderingContextLifecycle } from "../engine/adapters/RenderingContextAdapter";
import {
  registerSplashScene,
  createSplashScene,
  type SplashSceneEngineContext,
} from "./splashScene";
import { registerMenuScene, createMenuScene, type MenuSceneEngineContext } from "./menuScene";
import { registerStartScene, createStartScene, type StartSceneEngineContext } from "./startScene";
import {
  registerKioskScene,
  createKioskSceneInstance,
  type KioskSceneEngineContext,
} from "./kioskScene";
import { registerGameScene, createGameScene, type GameSceneEngineContext } from "./gameScene";
import {
  registerRescueScene,
  createRescueScene,
  type RescueSceneEngineContext,
} from "./rescueScene";
import {
  registerGameOverScene,
  createGameOverScene,
  type GameOverSceneEngineContext,
} from "./gameoverScene";

export interface AllScenesEngineContext
  extends
    SplashSceneEngineContext,
    MenuSceneEngineContext,
    StartSceneEngineContext,
    KioskSceneEngineContext,
    GameSceneEngineContext,
    RescueSceneEngineContext,
    GameOverSceneEngineContext {}

export function registerAllScenes(
  engineContext: AllScenesEngineContext | RenderingContext,
  sceneManager?: ISceneManager
): void {
  const lifecycleBoundSceneManager = bindSceneManagerToRenderingContextLifecycle(
    engineContext,
    sceneManager
  );

  registerSplashScene(engineContext as SplashSceneEngineContext, lifecycleBoundSceneManager);
  registerMenuScene(engineContext as MenuSceneEngineContext, lifecycleBoundSceneManager);
  registerStartScene(engineContext as StartSceneEngineContext, lifecycleBoundSceneManager);
  registerKioskScene(engineContext as KioskSceneEngineContext, lifecycleBoundSceneManager);
  registerGameScene(engineContext as GameSceneEngineContext, lifecycleBoundSceneManager);
  registerRescueScene(engineContext as RescueSceneEngineContext, lifecycleBoundSceneManager);
  registerGameOverScene(engineContext as GameOverSceneEngineContext, lifecycleBoundSceneManager);
}

function hasRenderingContextLifecycle(
  candidateContext: unknown
): candidateContext is Pick<RenderingContext, "lifecycle"> {
  if (typeof candidateContext !== "object" || candidateContext === null) {
    return false;
  }
  const lifecycleCandidate = (candidateContext as { lifecycle?: Partial<RenderingContextLifecycle> })
    .lifecycle;
  return (
    typeof lifecycleCandidate?.runSceneUpdateCallbacks === "function" &&
    typeof lifecycleCandidate?.flushSceneResources === "function"
  );
}

/**
 * Devolve um ISceneManager que decora cada cena registrada com o ciclo de vida do
 * RenderingContext (update aciona os callbacks de onUpdate; exit libera os recursos da cena).
 * Sem RenderingContext ou sem SceneManager, devolve o próprio sceneManager recebido.
 */
function bindSceneManagerToRenderingContextLifecycle(
  engineContext: unknown,
  sceneManager?: ISceneManager
): ISceneManager | undefined {
  if (!sceneManager || !hasRenderingContextLifecycle(engineContext)) {
    return sceneManager;
  }
  const renderContextLifecycle = engineContext.lifecycle;
  return {
    getCurrentScene: () => sceneManager.getCurrentScene(),
    registerScene: (sceneToRegister) =>
      sceneManager.registerScene(
        withRenderingContextLifecycle(sceneToRegister, renderContextLifecycle)
      ),
    loadScene: (sceneName, transitionData) => sceneManager.loadScene(sceneName, transitionData),
    update: (deltaTimeInSeconds) => sceneManager.update(deltaTimeInSeconds),
    destroy: () => sceneManager.destroy(),
  };
}

export {
  registerSplashScene,
  createSplashScene,
  registerMenuScene,
  createMenuScene,
  registerStartScene,
  createStartScene,
  registerKioskScene,
  createKioskSceneInstance,
  registerGameScene,
  createGameScene,
  registerRescueScene,
  createRescueScene,
  registerGameOverScene,
  createGameOverScene,
};

export {
  loadGameFonts,
  loadGameSprites,
  loadGameManifests,
  loadAllGameAssets,
  assetLoaderManager,
  registerAssetBundles,
} from "./assetLoader";

export type { RenderingContext } from "../engine/adapters/RenderingContextAdapter";

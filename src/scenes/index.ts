import type { ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import type { RenderingContext } from "../engine/adapters/RenderingContextAdapter";
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
  registerSplashScene(engineContext as SplashSceneEngineContext, sceneManager);
  registerMenuScene(engineContext as MenuSceneEngineContext, sceneManager);
  registerStartScene(engineContext as StartSceneEngineContext, sceneManager);
  registerKioskScene(engineContext as KioskSceneEngineContext, sceneManager);
  registerGameScene(engineContext as GameSceneEngineContext, sceneManager);
  registerRescueScene(engineContext as RescueSceneEngineContext, sceneManager);
  registerGameOverScene(engineContext as GameOverSceneEngineContext, sceneManager);
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

import { registerSplashScene, type SplashSceneEngineContext } from "./splashScene";
import { registerMenuScene, type MenuSceneEngineContext } from "./menuScene";
import { registerStartScene, type StartSceneEngineContext } from "./startScene";
import { registerKioskScene, type KioskSceneEngineContext } from "./kioskScene";
import { registerGameScene, type GameSceneEngineContext } from "./gameScene";
import { registerRescueScene, type RescueSceneEngineContext } from "./rescueScene";
import { registerGameOverScene, type GameOverSceneEngineContext } from "./gameoverScene";

export interface AllScenesEngineContext
  extends
    SplashSceneEngineContext,
    MenuSceneEngineContext,
    StartSceneEngineContext,
    KioskSceneEngineContext,
    GameSceneEngineContext,
    RescueSceneEngineContext,
    GameOverSceneEngineContext {}

export function registerAllScenes(k: AllScenesEngineContext): void {
  registerSplashScene(k);
  registerMenuScene(k);
  registerStartScene(k);
  registerKioskScene(k);
  registerGameScene(k);
  registerRescueScene(k);
  registerGameOverScene(k);
}

export {
  registerSplashScene,
  registerMenuScene,
  registerStartScene,
  registerKioskScene,
  registerGameScene,
  registerRescueScene,
  registerGameOverScene,
};

export { loadGameFonts, loadGameSprites, loadAllGameAssets } from "./assetLoader";

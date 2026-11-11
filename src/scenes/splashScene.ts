import type { IScene, ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import { createSplashScreen, type ShowSplashEngineContext } from "../ui/splashScreen";

export interface SplashSceneEngineContext extends ShowSplashEngineContext {
  scene(id: string, action: (transitionData?: unknown) => void): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function createSplashScene(
  engineContext: SplashSceneEngineContext,
  sceneManager: ISceneManager
): IScene {
  return {
    name: "splash",
    enter: () => {
      createSplashScreen(engineContext, () => {
        void sceneManager.loadScene("menu");
      });
    },
    update: () => {},
    exit: () => {},
  };
}

export function registerSplashScene(
  engineContext: SplashSceneEngineContext,
  sceneManager?: ISceneManager
): void {
  if (sceneManager) {
    sceneManager.registerScene(createSplashScene(engineContext, sceneManager));
    return;
  }

  if (typeof engineContext.scene === "function") {
    engineContext.scene("splash", () => {
      createSplashScreen(engineContext, () => {
        if (typeof engineContext.go === "function") {
          engineContext.go("menu");
        }
      });
    });
  }
}

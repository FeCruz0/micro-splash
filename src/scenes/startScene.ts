import type { IScene, ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import { registerMenuScene, type MenuSceneEngineContext } from "./menuScene";

export interface StartSceneEngineContext extends MenuSceneEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function createStartScene(
  _engineContext: StartSceneEngineContext,
  sceneManager: ISceneManager
): IScene {
  return {
    name: "start",
    enter: () => {
      void sceneManager.loadScene("menu");
    },
    update: () => {},
    exit: () => {},
  };
}

export function registerStartScene(
  engineContext: StartSceneEngineContext,
  sceneManager?: ISceneManager
): void {
  registerMenuScene(engineContext, sceneManager);

  if (sceneManager) {
    sceneManager.registerScene(createStartScene(engineContext, sceneManager));
    return;
  }

  if (typeof engineContext.scene === "function") {
    engineContext.scene("start", () => {
      if (typeof engineContext.go === "function") {
        engineContext.go("menu");
      }
    });
  }
}

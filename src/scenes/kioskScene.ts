import type { IScene, ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import { createKioskScene, type ShowKioskEngineContext } from "../systems/kioskMode";

export interface KioskSceneEngineContext extends ShowKioskEngineContext {
  scene(id: string, action: (transitionData?: unknown) => void): unknown;
}

export function createKioskSceneInstance(engineContext: KioskSceneEngineContext): IScene {
  return {
    name: "kiosk",
    enter: () => {
      createKioskScene(engineContext);
    },
    update: () => {},
    exit: () => {},
  };
}

export function registerKioskScene(
  engineContext: KioskSceneEngineContext,
  sceneManager?: ISceneManager
): void {
  if (sceneManager) {
    sceneManager.registerScene(createKioskSceneInstance(engineContext));
    return;
  }

  if (typeof engineContext.scene === "function") {
    engineContext.scene("kiosk", () => {
      createKioskScene(engineContext);
    });
  }
}

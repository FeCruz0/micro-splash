import type { IScene, ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import { showRescueScreen, type ShowRescueEngineContext } from "../ui/rescueScreen";
import type { GameState } from "../systems/state";
import { audioSystem } from "../systems/audioSystem";

export interface RescueSceneEngineContext extends ShowRescueEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function createRescueScene(
  engineContext: RescueSceneEngineContext,
  sceneManager: ISceneManager
): IScene {
  return {
    name: "rescue",
    enter: (transitionData?: unknown) => {
      const gameState = transitionData as GameState;
      showRescueScreen(engineContext, gameState, () => {
        audioSystem.stopMigrationAudio();
        void sceneManager.loadScene("menu");
      });
    },
    update: () => {},
    exit: () => {},
  };
}

export function registerRescueScene(
  engineContext: RescueSceneEngineContext,
  sceneManager?: ISceneManager
): void {
  if (sceneManager) {
    sceneManager.registerScene(createRescueScene(engineContext, sceneManager));
    return;
  }

  if (typeof engineContext.scene === "function") {
    engineContext.scene("rescue", (gameState: GameState) => {
      showRescueScreen(engineContext, gameState, () => {
        audioSystem.stopMigrationAudio();
        if (typeof engineContext.go === "function") {
          engineContext.go("menu");
        }
      });
    });
  }
}

export { showRescueScreen };

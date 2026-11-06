import type { IScene, ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  showChallengeEndScreen,
  type ShowChallengeEndEngineContext,
} from "../ui/challengeEndScreen";
import type { GameState, GameOptions } from "../systems/state";
import { audioSystem } from "../systems/audioSystem";

export interface GameOverSceneEngineContext extends ShowChallengeEndEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export interface GameOverTransitionData {
  gameState: GameState;
  options?: GameOptions;
}

export function createGameOverScene(
  engineContext: GameOverSceneEngineContext,
  sceneManager: ISceneManager
): IScene {
  return {
    name: "gameover",
    enter: (transitionData?: unknown) => {
      const data = transitionData as GameOverTransitionData;
      showChallengeEndScreen(
        engineContext,
        data.gameState,
        () => {
          void sceneManager.loadScene("game", data.options);
        },
        () => {
          audioSystem.stopMigrationAudio();
          void sceneManager.loadScene("menu");
        }
      );
    },
    update: () => {},
    exit: () => {},
  };
}

export function registerGameOverScene(
  engineContext: GameOverSceneEngineContext,
  sceneManager?: ISceneManager
): void {
  if (sceneManager) {
    sceneManager.registerScene(createGameOverScene(engineContext, sceneManager));
    return;
  }

  if (typeof engineContext.scene === "function") {
    engineContext.scene("gameover", (data: GameOverTransitionData) => {
      showChallengeEndScreen(
        engineContext,
        data.gameState,
        () => {
          if (typeof engineContext.go === "function") {
            engineContext.go("game", data.options);
          }
        },
        () => {
          audioSystem.stopMigrationAudio();
          if (typeof engineContext.go === "function") {
            engineContext.go("menu");
          }
        }
      );
    });
  }
}

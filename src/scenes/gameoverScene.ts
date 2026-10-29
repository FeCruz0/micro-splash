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

export function registerGameOverScene(k: GameOverSceneEngineContext): void {
  k.scene("gameover", (data: { gameState: GameState; options?: GameOptions }) => {
    showChallengeEndScreen(
      k,
      data.gameState,
      () => {
        k.go("game", data.options);
      },
      () => {
        audioSystem.stopMigrationAudio();
        k.go("menu");
      }
    );
  });
}

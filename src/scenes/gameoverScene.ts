import type { KaboomCtx } from "kaboom";
import { showChallengeEndScreen } from "../ui/challengeEndScreen";
import type { GameState } from "../systems/state";
import { audioSystem } from "../systems/audioSystem";

export function registerGameOverScene(k: KaboomCtx): void {
  k.scene("gameover", (data: { gameState: GameState; options?: any }) => {
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

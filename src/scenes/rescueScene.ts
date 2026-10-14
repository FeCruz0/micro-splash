import type { KaboomCtx } from "kaboom";
import { showRescueScreen } from "../ui/rescueScreen";
import type { GameState } from "../systems/state";
import { audioSystem } from "../systems/audioSystem";

export function registerRescueScene(k: KaboomCtx): void {
  k.scene("rescue", (gameState: GameState) => {
    showRescueScreen(k, gameState, () => {
      audioSystem.stopMigrationAudio();
      k.go("menu");
    });
  });
}

export { showRescueScreen };

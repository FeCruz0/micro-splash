import { showRescueScreen, type ShowRescueEngineContext } from "../ui/rescueScreen";
import type { GameState } from "../systems/state";
import { audioSystem } from "../systems/audioSystem";

export interface RescueSceneEngineContext extends ShowRescueEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function registerRescueScene(k: RescueSceneEngineContext): void {
  k.scene("rescue", (gameState: GameState) => {
    showRescueScreen(k, gameState, () => {
      audioSystem.stopMigrationAudio();
      k.go("menu");
    });
  });
}

export { showRescueScreen };

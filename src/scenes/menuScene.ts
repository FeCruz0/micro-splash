import { createMainMenu, type ShowMainMenuEngineContext } from "../ui/mainMenu";
import type { ShowModeSelectEngineContext } from "../ui/modeSelectScreen";
import type { ShowOptionsEngineContext } from "../ui/optionsScreen";
import type { ShowCodexEngineContext } from "../ui/codexScreen";
import type { ShowLeaderboardEngineContext } from "../ui/leaderboardScreen";

export interface MenuSceneEngineContext
  extends
    ShowMainMenuEngineContext,
    ShowModeSelectEngineContext,
    ShowOptionsEngineContext,
    ShowCodexEngineContext,
    ShowLeaderboardEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function registerMenuScene(k: MenuSceneEngineContext): void {
  k.scene("menu", () => {
    createMainMenu(
      k,
      // Iniciar Migração -> Abre Seletor de Modo de Jogo
      async (onClose) => {
        const { showModeSelectScreen } = await import("../ui/modeSelectScreen");
        showModeSelectScreen(
          k,
          (selectedOptions) => {
            k.go("game", selectedOptions);
          },
          onClose
        );
      },
      // Opções
      async (onClose) => {
        const { showOptionsScreen } = await import("../ui/optionsScreen");
        showOptionsScreen(k, onClose);
      },
      // Diário de Bordo (Codex)
      async (onClose) => {
        const { showCodexScreen } = await import("../ui/codexScreen");
        showCodexScreen(k, onClose);
      },
      // Ranking Top 10
      async (onClose) => {
        const { showLeaderboardScreen } = await import("../ui/leaderboardScreen");
        showLeaderboardScreen(k, onClose);
      }
    );
  });
}

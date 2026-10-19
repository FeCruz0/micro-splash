import type { KaboomCtx } from "kaboom";
import { createMainMenu } from "../ui/mainMenu";

export function registerMenuScene(k: KaboomCtx): void {
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

import type { KaboomCtx } from "kaboom";
import { createMainMenu } from "../ui/mainMenu";
import { showModeSelectScreen } from "../ui/modeSelectScreen";
import { showOptionsScreen } from "../ui/optionsScreen";
import { showCodexScreen } from "../ui/codexScreen";
import { showLeaderboardScreen } from "../ui/leaderboardScreen";

export function registerMenuScene(k: KaboomCtx): void {
  k.scene("menu", () => {
    createMainMenu(
      k,
      // Iniciar Migração -> Abre Seletor de Modo de Jogo
      (onClose) => {
        showModeSelectScreen(
          k,
          (selectedOptions) => {
            k.go("game", selectedOptions);
          },
          onClose
        );
      },
      // Opções
      (onClose) => {
        showOptionsScreen(k, onClose);
      },
      // Diário de Bordo (Codex)
      (onClose) => {
        showCodexScreen(k, onClose);
      },
      // Ranking Top 10
      (onClose) => {
        showLeaderboardScreen(k, onClose);
      }
    );
  });
}

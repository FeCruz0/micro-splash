import type { IScene, ISceneManager } from "../engine/contracts/INTERFACE_CONTRACTS";
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
  scene(id: string, action: (transitionData?: unknown) => void): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function createMenuScene(
  engineContext: MenuSceneEngineContext,
  sceneManager: ISceneManager
): IScene {
  return {
    name: "menu",
    enter: () => {
      createMainMenu(
        engineContext,
        // Iniciar Migração -> Abre Seletor de Modo de Jogo
        async (onClose) => {
          const { showModeSelectScreen } = await import("../ui/modeSelectScreen");
          showModeSelectScreen(
            engineContext,
            (selectedOptions) => {
              void sceneManager.loadScene("game", selectedOptions);
            },
            onClose
          );
        },
        // Opções
        async (onClose) => {
          const { showOptionsScreen } = await import("../ui/optionsScreen");
          showOptionsScreen(engineContext, onClose);
        },
        // Diário de Bordo (Codex)
        async (onClose) => {
          const { showCodexScreen } = await import("../ui/codexScreen");
          showCodexScreen(engineContext, onClose);
        },
        // Ranking Top 10
        async (onClose) => {
          const { showLeaderboardScreen } = await import("../ui/leaderboardScreen");
          showLeaderboardScreen(engineContext, onClose);
        }
      );
    },
    update: () => {},
    exit: () => {},
  };
}

export function registerMenuScene(
  engineContext: MenuSceneEngineContext,
  sceneManager?: ISceneManager
): void {
  if (sceneManager) {
    sceneManager.registerScene(createMenuScene(engineContext, sceneManager));
    return;
  }

  if (typeof engineContext.scene === "function") {
    engineContext.scene("menu", () => {
      createMainMenu(
        engineContext,
        // Iniciar Migração -> Abre Seletor de Modo de Jogo
        async (onClose) => {
          const { showModeSelectScreen } = await import("../ui/modeSelectScreen");
          showModeSelectScreen(
            engineContext,
            (selectedOptions) => {
              if (typeof engineContext.go === "function") {
                engineContext.go("game", selectedOptions);
              }
            },
            onClose
          );
        },
        // Opções
        async (onClose) => {
          const { showOptionsScreen } = await import("../ui/optionsScreen");
          showOptionsScreen(engineContext, onClose);
        },
        // Diário de Bordo (Codex)
        async (onClose) => {
          const { showCodexScreen } = await import("../ui/codexScreen");
          showCodexScreen(engineContext, onClose);
        },
        // Ranking Top 10
        async (onClose) => {
          const { showLeaderboardScreen } = await import("../ui/leaderboardScreen");
          showLeaderboardScreen(engineContext, onClose);
        }
      );
    });
  }
}

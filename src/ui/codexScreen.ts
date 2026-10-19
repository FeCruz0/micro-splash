import type { GameObj, KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { createGameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import { animateModalEntrance, attachButtonHoverEffect } from "./animationUtils";
import { readLocalStorageWithSchema } from "../utils/storage";
import { UnlockedFactsArraySchema } from "../schemas/storageSchemas";
import { getCodexBiomeInfo } from "./codex/codexUtils";
import type { CodexTabContext } from "./codex/codexTypes";
import { renderSpeciesTab } from "./codex/codexSpeciesTab";
import { renderRouteTab } from "./codex/codexRouteTab";
import { renderConservationTab } from "./codex/codexConservationTab";
import {
  renderCodexHeader,
  renderCodexTabs,
  renderCodexFooter,
  type CodexTabId,
} from "./codex/codexNavigation";

export { getCodexBiomeInfo };

export function showCodexScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: GameObj[] = [];
  let isClosed = false;
  let isModalOpen = false;

  // Fundo escuro semitransparente bloqueando cliques fora do modal
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(4, 14, 32),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card do Diário de Bordo (Codex) com geometria adaptativa expandida (Fase 34.1)
  const cardW = Math.min(1000, k.width() - 24);
  const cardH = Math.min(660, k.height() - 20);
  const cX = k.width() / 2;
  const cY = k.height() / 2;

  const card = renderCodexHeader(k, cX, cY, cardW, cardH, elements);
  animateModalEntrance(k, card);

  let contentElements: GameObj[] = [];
  let focusGroup: { destroy: () => void } | null = null;

  // Botão fechar [X] no canto superior direito
  const btnXPos = k.vec2(cX + cardW / 2 - 32, cY - cardH / 2 + 32);
  const btnX = k.add([
    k.rect(38, 38, { radius: 8 }),
    k.pos(btnXPos),
    k.color(22, 50, 90),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnX);

  elements.push(
    k.add([
      k.text("✕", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(btnXPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  const close = () => {
    if (isClosed || isModalOpen) return;
    isClosed = true;
    audioSystem.playUiClick();
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    contentElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    onBack();
  };

  attachButtonHoverEffect(k, btnX, {
    baseColor: [22, 50, 90],
    hoverColor: [180, 50, 50],
    baseScale: 1.0,
    hoverScale: 1.06,
    canInteract: () => !isClosed && !isModalOpen,
  });
  btnX.onClick(close);

  // Tecla ESC para fechar
  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed || isModalOpen) return;
    if (e.key === "Escape") {
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }

  // Carrega fatos já desbloqueados
  const unlockedFactIds: string[] = readLocalStorageWithSchema(
    "micro_splash_unlocked_facts",
    UnlockedFactsArraySchema,
    []
  );

  let activeTab: CodexTabId = "species";
  let routePage = 0;

  // Limites da Área de Conteúdo
  const contentBoxTop = cY - cardH / 2 + 122;
  const contentBoxBottom = cY + cardH / 2 - 66;
  const contentBoxH = contentBoxBottom - contentBoxTop;

  const navOptions = {
    k,
    cX,
    cY,
    cardW,
    cardH,
    elements,
    getActiveTab: () => activeTab,
    setActiveTab: (tab: CodexTabId) => {
      activeTab = tab;
    },
    isModalOpen: () => isModalOpen,
    setModalOpen: (open: boolean) => {
      isModalOpen = open;
    },
    onClose: close,
    onTabChanged: () => renderTabContent(),
  };

  const { tabEntities, updateTabStyles, tabW, tabH } = renderCodexTabs(navOptions);
  const footerResult = renderCodexFooter(navOptions);

  // Atualização do grupo de foco acessível
  const setupKeyboardFocus = (dynamicItems: FocusableItem[] = []) => {
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }

    const items: FocusableItem[] = [
      {
        pos: btnXPos,
        width: 32,
        height: 32,
        onActivate: close,
      },
      ...tabEntities.map((t) => ({
        pos: t.btn.pos,
        width: tabW,
        height: tabH,
        onActivate: () => {
          if (!isModalOpen) {
            audioSystem.playUiClick();
            activeTab = t.id;
            updateTabStyles();
            renderTabContent();
          }
        },
      })),
      ...dynamicItems,
      {
        pos: footerResult.btnBackPos,
        width: footerResult.bottomBtnW,
        height: footerResult.bottomBtnH,
        onActivate: close,
      },
      {
        pos: footerResult.btnTutorialPos,
        width: footerResult.bottomBtnW,
        height: footerResult.bottomBtnH,
        onActivate: async () => {
          if (!isModalOpen) {
            isModalOpen = true;
            const { showOnboardingModal } = await import("./onboardingModal");
            showOnboardingModal(k, () => {
              isModalOpen = false;
            });
          }
        },
      },
      {
        pos: footerResult.btnQuizPos,
        width: footerResult.bottomBtnW,
        height: footerResult.bottomBtnH,
        onActivate: async () => {
          if (!isModalOpen) {
            isModalOpen = true;
            const testState = createGameState();
            const { showQuizModal } = await import("./quizModal");
            showQuizModal(
              k,
              testState,
              () => {
                isModalOpen = false;
              },
              () => {
                isModalOpen = false;
              }
            );
          }
        },
      },
    ];

    focusGroup = createFocusGroup(k, {
      items,
      initialIndex: 4, // Foca no primeiro botão de ação por padrão
      isEnabled: () => !isClosed && !isModalOpen,
    });
  };

  const renderTabContent = () => {
    contentElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    contentElements = [];

    const dynamicFocusItems: FocusableItem[] = [];

    const context: CodexTabContext = {
      k,
      cX,
      cY,
      cardW,
      cardH,
      contentBoxTop,
      contentBoxBottom,
      contentBoxH,
      contentElements,
      dynamicFocusItems,
    };

    if (activeTab === "species") {
      renderSpeciesTab(context);
    } else if (activeTab === "route") {
      renderRouteTab(context, routePage, unlockedFactIds, (newPage: number) => {
        routePage = newPage;
        renderTabContent();
      });
    } else if (activeTab === "conservation") {
      renderConservationTab(context);
    }

    setupKeyboardFocus(dynamicFocusItems);
  };

  renderTabContent();
}

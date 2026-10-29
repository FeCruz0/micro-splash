import { audioSystem } from "../systems/audioSystem";
import { createGameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem, type LegacyKeyboardNavContext } from "./keyboardNav";
import {
  animateModalEntrance,
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "./animationUtils";
import { readLocalStorageWithSchema } from "../utils/storage";
import { UnlockedFactsArraySchema } from "../schemas/storageSchemas";
import { getCodexBiomeInfo } from "./codex/codexUtils";
import type {
  CodexTabContext,
  LegacyCodexEngineContext,
  ShowCodexEngineContext,
} from "./codex/codexTypes";
import { renderSpeciesTab } from "./codex/codexSpeciesTab";
import { renderRouteTab } from "./codex/codexRouteTab";
import { renderConservationTab } from "./codex/codexConservationTab";
import {
  renderCodexHeader,
  renderCodexTabs,
  renderCodexFooter,
  type CodexTabId,
} from "./codex/codexNavigation";
import type { Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";

export { getCodexBiomeInfo };
export type { ShowCodexEngineContext };

export function showCodexScreen(k: ShowCodexEngineContext, onBack: () => void) {
  const engine = k as unknown as LegacyCodexEngineContext;
  audioSystem.playUiClick();

  const elements: Array<{ destroy?: () => void } | object> = [];
  let isClosed = false;
  let isModalOpen = false;

  // Fundo escuro semitransparente bloqueando cliques fora do modal
  elements.push(
    engine.add([
      engine.rect(engine.width(), engine.height()),
      engine.pos(0, 0),
      engine.color(4, 14, 32),
      engine.opacity(0.95),
      engine.area(),
      engine.fixed(),
      engine.z(300),
    ])
  );

  // Card do Diário de Bordo (Codex) com geometria adaptativa expandida (Fase 34.1)
  const cardW = Math.min(1000, engine.width() - 24);
  const cardH = Math.min(660, engine.height() - 20);
  const cX = engine.width() / 2;
  const cY = engine.height() / 2;

  const card = renderCodexHeader(engine, cX, cY, cardW, cardH, elements);
  animateModalEntrance(
    engine as unknown as AnimationEngineContext,
    card as unknown as AnimationUiObject
  );

  let contentElements: Array<{ destroy?: () => void } | object> = [];
  let focusGroup: { destroy: () => void } | null = null;

  // Botão fechar [X] no canto superior direito
  const btnXPos = engine.vec2(cX + cardW / 2 - 32, cY - cardH / 2 + 32);
  const btnX = engine.add([
    engine.rect(38, 38, { radius: 8 }),
    engine.pos(btnXPos),
    engine.color(22, 50, 90),
    engine.outline(1, engine.rgb(100, 200, 255)),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(305),
  ]);
  elements.push(btnX);

  elements.push(
    engine.add([
      engine.text("✕", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      engine.pos(btnXPos),
      engine.color(255, 255, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(306),
    ])
  );

  const destroyAll = (list: Array<{ destroy?: () => void } | object>) => {
    list.forEach((el) => {
      try {
        engine.destroy(el);
      } catch {}
    });
  };

  const close = () => {
    if (isClosed || isModalOpen) return;
    isClosed = true;
    audioSystem.playUiClick();
    focusGroup?.destroy();
    focusGroup = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", keyHandler);
    }
    destroyAll(elements);
    destroyAll(contentElements);
    onBack();
  };

  attachButtonHoverEffect(
    engine as unknown as AnimationEngineContext,
    btnX as unknown as AnimationUiObject,
    {
      baseColor: [22, 50, 90],
      hoverColor: [180, 50, 50],
      baseScale: 1.0,
      hoverScale: 1.06,
      canInteract: () => !isClosed && !isModalOpen,
    }
  );
  btnX.onClick?.(close);

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
    k: engine,
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
    focusGroup?.destroy();
    focusGroup = null;

    const items: FocusableItem[] = [
      {
        pos: btnXPos,
        width: 32,
        height: 32,
        onActivate: close,
      },
      ...tabEntities.map((t) => ({
        pos: (t.btn as unknown as { pos: Vector2D }).pos,
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
            const onDone = () => {
              isModalOpen = false;
            };
            showOnboardingModal(
              engine as unknown as Parameters<typeof showOnboardingModal>[0],
              onDone
            );
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
            const onDone = () => {
              isModalOpen = false;
            };
            showQuizModal(
              engine as unknown as Parameters<typeof showQuizModal>[0],
              testState,
              onDone,
              onDone
            );
          }
        },
      },
    ];

    focusGroup = createFocusGroup(engine as unknown as LegacyKeyboardNavContext, {
      items,
      initialIndex: 4, // Foca no primeiro botão de ação por padrão
      isEnabled: () => !isClosed && !isModalOpen,
    });
  };

  const renderTabContent = () => {
    destroyAll(contentElements);
    contentElements = [];

    const dynamicFocusItems: FocusableItem[] = [];

    const context: CodexTabContext = {
      k: engine,
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

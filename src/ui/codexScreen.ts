import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { createGameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { showQuizModal } from "./quizModal";
import { showOnboardingModal } from "./onboardingModal";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import { animateModalEntrance, attachButtonHoverEffect } from "./animationUtils";
import { readLocalStorageWithSchema } from "../utils/storage";
import { UnlockedFactsArraySchema } from "../schemas/storageSchemas";
import { getCodexBiomeInfo } from "./codex/codexUtils";
import type { CodexTabContext } from "./codex/codexTypes";
import { renderSpeciesTab } from "./codex/codexSpeciesTab";
import { renderRouteTab } from "./codex/codexRouteTab";
import { renderConservationTab } from "./codex/codexConservationTab";

export { getCodexBiomeInfo };

export function showCodexScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
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

  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(250, 204, 21)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);
  animateModalEntrance(k, card);

  // Título Principal com destaque dourado e tamanho nítido ampliado
  elements.push(
    k.add([
      k.text("DIÁRIO DE BORDO DA EXPEDIÇÃO 📖", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      k.pos(cX, cY - cardH / 2 + 34),
      k.color(255, 225, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Subtítulo descritivo elegante de alto contraste
  elements.push(
    k.add([
      k.text("Enciclopédia de espécies marinhas, descobertas da rota migratória e preservação", {
        size: accessibilitySystem.scaleFont(15),
        font: "Inter",
      }),
      k.pos(cX, cY - cardH / 2 + 63),
      k.color(180, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  let contentElements: any[] = [];
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

  let activeTab: "species" | "route" | "conservation" = "species";
  let routePage = 0;

  // Limites da Área de Conteúdo
  const contentBoxTop = cY - cardH / 2 + 122;
  const contentBoxBottom = cY + cardH / 2 - 66;
  const contentBoxH = contentBoxBottom - contentBoxTop;

  const tabButtonsData = [
    { id: "species" as const, icon: "🐋", label: "Espécies Marinhas" },
    { id: "route" as const, icon: "🗺️", label: "Fatos da Rota" },
    { id: "conservation" as const, icon: "🌊", label: "Conservação & IBJ" },
  ];

  const tabW = Math.min(270, (cardW - 60) / 3);
  const tabH = 42;
  const tabY = cY - cardH / 2 + 94;
  const tabEntities: Array<{
    btn: any;
    label: any;
    id: "species" | "route" | "conservation";
  }> = [];

  const updateTabStyles = () => {
    tabEntities.forEach((t) => {
      const isActive = t.id === activeTab;
      t.btn.color = isActive ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60);
      t.btn.outline = {
        width: isActive ? 2 : 1,
        color: isActive ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115),
      };
      t.label.color = isActive ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235);
    });
  };

  tabButtonsData.forEach((tb, i) => {
    const tabX = cX - tabW - 14 + i * (tabW + 14);

    const btnTab = k.add([
      k.rect(tabW, tabH, { radius: 8 }),
      k.pos(tabX, tabY),
      k.color(activeTab === tb.id ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60)),
      k.outline(
        activeTab === tb.id ? 2 : 1,
        activeTab === tb.id ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115)
      ),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(btnTab);

    const lblTab = k.add([
      k.text(`${tb.icon} ${tb.label}`, {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(tabX, tabY),
      k.color(activeTab === tb.id ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235)),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ]);
    elements.push(lblTab);

    tabEntities.push({ btn: btnTab, label: lblTab, id: tb.id });

    btnTab.onHoverUpdate(() => {
      if (activeTab !== tb.id) {
        btnTab.color = k.rgb(25, 55, 95);
        btnTab.scale = k.vec2(1.02, 1.02);
      }
    });
    btnTab.onHoverEnd(() => {
      btnTab.scale = k.vec2(1, 1);
      updateTabStyles();
    });

    btnTab.onClick(() => {
      if (isModalOpen) return;
      audioSystem.playUiClick();
      activeTab = tb.id;
      updateTabStyles();
      renderTabContent();
    });
  });

  // Botões de Ação Inferiores (Footer)
  const bottomBtnY = cY + cardH / 2 - 34;
  const bottomBtnW = Math.min(280, (cardW - 60) / 3);
  const bottomBtnH = 48;

  // Botão 1: Voltar ao Menu
  const btnBackPos = k.vec2(cX - bottomBtnW - 14, bottomBtnY);
  const btnBack = k.add([
    k.rect(bottomBtnW, bottomBtnH, { radius: 10 }),
    k.pos(btnBackPos),
    k.color(20, 80, 140),
    k.outline(2, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnBack);

  elements.push(
    k.add([
      k.text("Voltar ao Menu ↩", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnBackPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnBack.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnBack.color = k.rgb(28, 110, 185);
      btnBack.scale = k.vec2(1.02, 1.02);
    }
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(20, 80, 140);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(close);

  // Botão 2: Tutorial / Guia
  const btnTutorialPos = k.vec2(cX, bottomBtnY);
  const btnTutorial = k.add([
    k.rect(bottomBtnW, bottomBtnH, { radius: 10 }),
    k.pos(btnTutorialPos),
    k.color(22, 90, 150),
    k.outline(2, k.rgb(90, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnTutorial);

  elements.push(
    k.add([
      k.text("🎓 Tutorial / Guia", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnTutorialPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnTutorial.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnTutorial.color = k.rgb(30, 125, 200);
      btnTutorial.scale = k.vec2(1.02, 1.02);
    }
  });
  btnTutorial.onHoverEnd(() => {
    btnTutorial.color = k.rgb(22, 90, 150);
    btnTutorial.scale = k.vec2(1, 1);
  });

  btnTutorial.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    showOnboardingModal(k, () => {
      isModalOpen = false;
    });
  });

  // Botão 3: Desafio Ecológico (Quiz)
  const btnQuizPos = k.vec2(cX + bottomBtnW + 14, bottomBtnY);
  const btnQuiz = k.add([
    k.rect(bottomBtnW, bottomBtnH, { radius: 10 }),
    k.pos(btnQuizPos),
    k.color(18, 125, 80),
    k.outline(2, k.rgb(52, 211, 153)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnQuiz);

  elements.push(
    k.add([
      k.text("🧪 Desafio Ecológico", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnQuizPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnQuiz.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnQuiz.color = k.rgb(25, 155, 100);
      btnQuiz.scale = k.vec2(1.02, 1.02);
    }
  });
  btnQuiz.onHoverEnd(() => {
    btnQuiz.color = k.rgb(18, 125, 80);
    btnQuiz.scale = k.vec2(1, 1);
  });

  btnQuiz.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    const testState = createGameState();
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
  });

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
        pos: btnBackPos,
        width: bottomBtnW,
        height: bottomBtnH,
        onActivate: close,
      },
      {
        pos: btnTutorialPos,
        width: bottomBtnW,
        height: bottomBtnH,
        onActivate: () => {
          if (!isModalOpen) {
            isModalOpen = true;
            showOnboardingModal(k, () => {
              isModalOpen = false;
            });
          }
        },
      },
      {
        pos: btnQuizPos,
        width: bottomBtnW,
        height: bottomBtnH,
        onActivate: () => {
          if (!isModalOpen) {
            isModalOpen = true;
            const testState = createGameState();
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

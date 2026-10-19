import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { createGameState } from "../../systems/state";

export type CodexTabId = "species" | "route" | "conservation";

export interface CodexTabEntity {
  btn: GameObj;
  label: GameObj;
  id: CodexTabId;
}

export interface CodexNavigationOptions {
  k: KaboomCtx;
  cX: number;
  cY: number;
  cardW: number;
  cardH: number;
  elements: GameObj[];
  getActiveTab: () => CodexTabId;
  setActiveTab: (tab: CodexTabId) => void;
  isModalOpen: () => boolean;
  setModalOpen: (open: boolean) => void;
  onClose: () => void;
  onTabChanged: () => void;
}

export function renderCodexHeader(
  k: KaboomCtx,
  cX: number,
  cY: number,
  cardW: number,
  cardH: number,
  elements: GameObj[]
): GameObj {
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

  return card;
}

export function renderCodexTabs(options: CodexNavigationOptions): {
  tabEntities: CodexTabEntity[];
  updateTabStyles: () => void;
  tabW: number;
  tabH: number;
} {
  const {
    k,
    cX,
    cY,
    cardW,
    cardH,
    elements,
    getActiveTab,
    setActiveTab,
    isModalOpen,
    onTabChanged,
  } = options;

  const tabButtonsData: Array<{ id: CodexTabId; icon: string; label: string }> = [
    { id: "species", icon: "🐋", label: "Espécies Marinhas" },
    { id: "route", icon: "🗺️", label: "Fatos da Rota" },
    { id: "conservation", icon: "🌊", label: "Conservação & IBJ" },
  ];

  const tabW = Math.min(270, (cardW - 60) / 3);
  const tabH = 42;
  const tabY = cY - cardH / 2 + 94;
  const tabEntities: CodexTabEntity[] = [];

  const updateTabStyles = () => {
    const currentTab = getActiveTab();
    tabEntities.forEach((t) => {
      const isActive = t.id === currentTab;
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
    const active = getActiveTab() === tb.id;

    const btnTab = k.add([
      k.rect(tabW, tabH, { radius: 8 }),
      k.pos(tabX, tabY),
      k.color(active ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60)),
      k.outline(active ? 2 : 1, active ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115)),
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
      k.color(active ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235)),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ]);
    elements.push(lblTab);

    tabEntities.push({ btn: btnTab, label: lblTab, id: tb.id });

    btnTab.onHoverUpdate(() => {
      if (getActiveTab() !== tb.id) {
        btnTab.color = k.rgb(25, 55, 95);
        btnTab.scale = k.vec2(1.02, 1.02);
      }
    });
    btnTab.onHoverEnd(() => {
      btnTab.scale = k.vec2(1, 1);
      updateTabStyles();
    });

    btnTab.onClick(() => {
      if (isModalOpen()) return;
      audioSystem.playUiClick();
      setActiveTab(tb.id);
      updateTabStyles();
      onTabChanged();
    });
  });

  return { tabEntities, updateTabStyles, tabW, tabH };
}

export interface CodexFooterResult {
  btnBackPos: Vec2;
  btnTutorialPos: Vec2;
  btnQuizPos: Vec2;
  bottomBtnW: number;
  bottomBtnH: number;
}

export function renderCodexFooter(options: CodexNavigationOptions): CodexFooterResult {
  const { k, cX, cY, cardW, cardH, elements, isModalOpen, setModalOpen, onClose } = options;

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
    if (!isModalOpen()) {
      btnBack.color = k.rgb(28, 110, 185);
      btnBack.scale = k.vec2(1.02, 1.02);
    }
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(20, 80, 140);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(onClose);

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
    if (!isModalOpen()) {
      btnTutorial.color = k.rgb(30, 125, 200);
      btnTutorial.scale = k.vec2(1.02, 1.02);
    }
  });
  btnTutorial.onHoverEnd(() => {
    btnTutorial.color = k.rgb(22, 90, 150);
    btnTutorial.scale = k.vec2(1, 1);
  });

  btnTutorial.onClick(async () => {
    if (isModalOpen()) return;
    setModalOpen(true);
    const { showOnboardingModal } = await import("../onboardingModal");
    showOnboardingModal(k, () => {
      setModalOpen(false);
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
    if (!isModalOpen()) {
      btnQuiz.color = k.rgb(25, 155, 100);
      btnQuiz.scale = k.vec2(1.02, 1.02);
    }
  });
  btnQuiz.onHoverEnd(() => {
    btnQuiz.color = k.rgb(18, 125, 80);
    btnQuiz.scale = k.vec2(1, 1);
  });

  btnQuiz.onClick(async () => {
    if (isModalOpen()) return;
    setModalOpen(true);
    const testState = createGameState();
    const { showQuizModal } = await import("../quizModal");
    showQuizModal(
      k,
      testState,
      () => {
        setModalOpen(false);
      },
      () => {
        setModalOpen(false);
      }
    );
  });

  return { btnBackPos, btnTutorialPos, btnQuizPos, bottomBtnW, bottomBtnH };
}

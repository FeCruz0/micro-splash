import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { showOnboardingModal } from "../onboardingModal";
import {
  RESOLUTION_PRESETS,
  type ResolutionKey,
  setSavedResolution,
  setSavedDisplayMode,
  setSavedLetterboxColor,
  detectNativeResolution,
  calculateAspectRatio,
  APP_VERSION,
} from "../../config";
import type { OptionsScreenContext } from "./optionsTypes";

export function renderGraphicsOptions(context: OptionsScreenContext): void {
  const {
    k,
    elements,
    focusItems,
    col0X,
    colW,
    btnH,
    rowGap,
    rowStartY,
    getCurrentResKey,
    setCurrentResKey,
    getCurrentDisplayMode,
    setCurrentDisplayMode,
    getCurrentLetterboxColor,
    setCurrentLetterboxColor,
    updateReloadHint,
  } = context;

  // --- Linha 4: Resolução do Jogo (Fase 33: Presets 16:9 Cristalinos & Auto) ---
  const row4Y = rowStartY + 4 * (btnH + rowGap);
  const resKeys: ResolutionKey[] = ["auto", "4K", "1440p", "1080p"];

  const getResLabel = (key: ResolutionKey) => {
    if (key === "auto") {
      const detected = detectNativeResolution();
      const calc = calculateAspectRatio(detected.width, detected.height);
      return `Resolução: Auto (${detected.detectedLabel} • ${calc.ratioText}) 🔍`;
    }
    const preset = RESOLUTION_PRESETS[key];
    return `Resolução: ${preset.label} (${preset.aspect}) 🖥️`;
  };

  const btnResPos = k.vec2(col0X, row4Y);
  const btnRes = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnResPos),
    k.color(24, 75, 135),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnRes);

  const resText = k.add([
    k.text(getResLabel(getCurrentResKey()), {
      size: accessibilitySystem.scaleFont(14),
      font: "Outfit",
    }),
    k.pos(btnResPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resText);

  const handleRes = () => {
    const currentKey = getCurrentResKey();
    const currentIdx = resKeys.indexOf(currentKey);
    const nextIdx = (currentIdx + 1) % resKeys.length;
    const nextKey = resKeys[nextIdx];
    setCurrentResKey(nextKey);
    setSavedResolution(nextKey);
    audioSystem.playUiClick();
    resText.text = getResLabel(nextKey);
    updateReloadHint();
  };

  btnRes.onHoverUpdate(() => {
    btnRes.scale = k.vec2(1.02, 1.02);
  });
  btnRes.onHoverEnd(() => {
    btnRes.scale = k.vec2(1, 1);
  });
  btnRes.onClick(handleRes);
  focusItems.push({
    pos: btnResPos,
    width: colW,
    height: btnH,
    onActivate: handleRes,
  });

  // --- Linha 5: Bordas & Tela Cheia (Fase 33.4) ---
  const row5Y = rowStartY + 5 * (btnH + rowGap);
  const splitGap = 8;
  const displayW = (colW - splitGap) * 0.58;
  const fsW = (colW - splitGap) * 0.42;

  const getDisplayLabel = () => {
    if (getCurrentDisplayMode() === "stretch") {
      return "Bordas: PREENCHER 🖥️✓";
    }
    return getCurrentLetterboxColor() === "ocean" ? "Bordas: OCEANO 🌊" : "Bordas: PRETO ⬛";
  };

  const btnDisplayPos = k.vec2(col0X - colW / 2 + displayW / 2, row5Y);
  const btnDisplay = k.add([
    k.rect(displayW, btnH, { radius: 8 }),
    k.pos(btnDisplayPos),
    k.color(
      getCurrentDisplayMode() === "stretch"
        ? k.rgb(18, 105, 80)
        : getCurrentLetterboxColor() === "ocean"
          ? k.rgb(14, 52, 98)
          : k.rgb(40, 48, 60)
    ),
    k.outline(1.5, k.rgb(52, 211, 153)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnDisplay);

  const displayText = k.add([
    k.text(getDisplayLabel(), {
      size: accessibilitySystem.scaleFont(14),
      font: "Outfit",
    }),
    k.pos(btnDisplayPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(displayText);

  const handleDisplay = () => {
    let mode = getCurrentDisplayMode();
    let color = getCurrentLetterboxColor();
    if (mode === "stretch") {
      mode = "letterbox";
      color = "black";
    } else if (color === "black") {
      color = "ocean";
    } else {
      mode = "stretch";
    }
    setCurrentDisplayMode(mode);
    setCurrentLetterboxColor(color);
    setSavedDisplayMode(mode);
    setSavedLetterboxColor(color);
    audioSystem.playUiClick();
    displayText.text = getDisplayLabel();
    btnDisplay.color =
      mode === "stretch"
        ? k.rgb(18, 105, 80)
        : color === "ocean"
          ? k.rgb(14, 52, 98)
          : k.rgb(40, 48, 60);
    updateReloadHint();
  };

  btnDisplay.onHoverUpdate(() => {
    btnDisplay.scale = k.vec2(1.02, 1.02);
  });
  btnDisplay.onHoverEnd(() => {
    btnDisplay.scale = k.vec2(1, 1);
  });
  btnDisplay.onClick(handleDisplay);
  focusItems.push({
    pos: btnDisplayPos,
    width: displayW,
    height: btnH,
    onActivate: handleDisplay,
  });

  const btnFsPos = k.vec2(col0X + colW / 2 - fsW / 2, row5Y);
  const btnFs = k.add([
    k.rect(fsW, btnH, { radius: 8 }),
    k.pos(btnFsPos),
    k.color(20, 75, 125),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnFs);

  const fsText = k.add([
    k.text("Tela Cheia ⛶", {
      size: accessibilitySystem.scaleFont(14.5),
      font: "Outfit",
    }),
    k.pos(btnFsPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(fsText);

  const handleFs = () => {
    audioSystem.playUiClick();
    if (typeof k.setFullscreen === "function" && typeof k.isFullscreen === "function") {
      k.setFullscreen(!k.isFullscreen());
      fsText.text = k.isFullscreen() ? "Janela 🗗" : "Tela Cheia ⛶";
    }
  };

  btnFs.onHoverUpdate(() => {
    btnFs.scale = k.vec2(1.02, 1.02);
  });
  btnFs.onHoverEnd(() => {
    btnFs.scale = k.vec2(1, 1);
  });
  btnFs.onClick(handleFs);
  focusItems.push({
    pos: btnFsPos,
    width: fsW,
    height: btnH,
    onActivate: handleFs,
  });
}

export function showLgpdConfirmationModal(context: OptionsScreenContext): void {
  const { k, cX, cY, isClosed, isModalOpen, setIsModalOpen } = context;

  if (isClosed() || isModalOpen()) return;
  setIsModalOpen(true);
  audioSystem.playUiClick();
  const confElements: Array<{ destroy?: () => void } | object> = [];

  const confBackdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(4, 10, 20),
    k.opacity(0.92),
    k.area(),
    k.fixed(),
    k.z(400),
  ]);
  confElements.push(confBackdrop);

  const confCard = k.add([
    k.rect(600, 260, { radius: 14 }),
    k.pos(cX, cY),
    k.color(28, 14, 24),
    k.outline(2.5, k.rgb(240, 80, 80)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(401),
  ]);
  confElements.push(confCard);

  confElements.push(
    k.add([
      k.text("EXCLUIR TODOS OS DADOS LOCAIS? ⚠️", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(cX, cY - 80),
      k.color(255, 120, 120),
      k.anchor("center"),
      k.fixed(),
      k.z(402),
    ])
  );

  confElements.push(
    k.add([
      k.text(
        "Esta ação removerá todos os recordes, conquistas do Diário\ne preferências salvas neste dispositivo (Artigo 18 da LGPD).\nEsta operação é definitiva e irreversível.",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          align: "center",
          lineSpacing: 4.5,
        }
      ),
      k.pos(cX, cY - 14),
      k.color(245, 225, 225),
      k.anchor("center"),
      k.fixed(),
      k.z(402),
    ])
  );

  const closeConf = () => {
    audioSystem.playUiClick();
    confElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    setIsModalOpen(false);
  };

  // Botão Cancelar
  const btnCancel = k.add([
    k.rect(160, 44, { radius: 8 }),
    k.pos(cX - 100, cY + 74),
    k.color(40, 55, 75),
    k.outline(1.5, k.rgb(150, 185, 220)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(402),
  ]);
  confElements.push(btnCancel);

  confElements.push(
    k.add([
      k.text("Cancelar ✕", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(cX - 100, cY + 74),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(403),
    ])
  );
  btnCancel.onHoverUpdate(() => {
    btnCancel.scale = k.vec2(1.03, 1.03);
  });
  btnCancel.onHoverEnd(() => {
    btnCancel.scale = k.vec2(1, 1);
  });
  btnCancel.onClick(closeConf);

  // Botão Confirmar Apagar
  const btnConfirm = k.add([
    k.rect(190, 44, { radius: 8 }),
    k.pos(cX + 100, cY + 74),
    k.color(150, 30, 30),
    k.outline(2, k.rgb(255, 100, 100)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(402),
  ]);
  confElements.push(btnConfirm);

  confElements.push(
    k.add([
      k.text("Sim, Apagar Tudo 🗑️", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(cX + 100, cY + 74),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(403),
    ])
  );

  btnConfirm.onHoverUpdate(() => {
    btnConfirm.scale = k.vec2(1.03, 1.03);
  });
  btnConfirm.onHoverEnd(() => {
    btnConfirm.scale = k.vec2(1, 1);
  });
  btnConfirm.onClick(() => {
    accessibilitySystem.clearAllUserData();
    audioSystem.playUiClick();
    closeConf();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  });
}

export function renderKioskActionButtons(context: OptionsScreenContext): void {
  const {
    k,
    elements,
    focusItems,
    cardW,
    cardTop,
    cX,
    isClosed,
    isModalOpen,
    setIsModalOpen,
    close,
  } = context;

  // --- Botões de Ação na Base: Tutorial | Apagar Dados (LGPD) | Salvar & Voltar ---
  const actionY = cardTop + 555;
  const actGap = 16;
  const actW = (cardW - 56 - actGap * 2) / 3;
  const actH = 46;

  // Botão 1: Tutorial / Guia
  const btnTutorialPos = k.vec2(cX - actW - actGap, actionY);
  const btnTutorial = k.add([
    k.rect(actW, actH, { radius: 9 }),
    k.pos(btnTutorialPos),
    k.color(22, 90, 150),
    k.outline(2, k.rgb(90, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
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
      k.z(303),
    ])
  );

  const handleTutorial = () => {
    if (isClosed() || isModalOpen()) return;
    setIsModalOpen(true);
    audioSystem.playUiClick();
    showOnboardingModal(k, () => {
      setIsModalOpen(false);
    });
  };

  btnTutorial.onHoverUpdate(() => {
    if (isClosed() || isModalOpen()) return;
    btnTutorial.color = k.rgb(28, 120, 185);
    btnTutorial.scale = k.vec2(1.02, 1.02);
  });
  btnTutorial.onHoverEnd(() => {
    if (isClosed() || isModalOpen()) return;
    btnTutorial.color = k.rgb(22, 90, 150);
    btnTutorial.scale = k.vec2(1, 1);
  });
  btnTutorial.onClick(handleTutorial);
  focusItems.push({
    pos: btnTutorialPos,
    width: actW,
    height: actH,
    onActivate: handleTutorial,
  });

  // Botão 2: Apagar Dados (LGPD)
  const btnLgpdPos = k.vec2(cX, actionY);
  const btnLgpd = k.add([
    k.rect(actW, actH, { radius: 9 }),
    k.pos(btnLgpdPos),
    k.color(100, 28, 28),
    k.outline(2, k.rgb(240, 90, 90)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnLgpd);

  elements.push(
    k.add([
      k.text("🗑️ Apagar Dados (LGPD)", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnLgpdPos),
      k.color(255, 220, 220),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnLgpd.onHoverUpdate(() => {
    if (isClosed() || isModalOpen()) return;
    btnLgpd.color = k.rgb(130, 35, 35);
    btnLgpd.scale = k.vec2(1.02, 1.02);
  });
  btnLgpd.onHoverEnd(() => {
    if (isClosed() || isModalOpen()) return;
    btnLgpd.color = k.rgb(100, 28, 28);
    btnLgpd.scale = k.vec2(1, 1);
  });
  btnLgpd.onClick(() => {
    if (isClosed() || isModalOpen()) return;
    showLgpdConfirmationModal(context);
  });
  focusItems.push({
    pos: btnLgpdPos,
    width: actW,
    height: actH,
    onActivate: () => showLgpdConfirmationModal(context),
  });

  // Botão 3: Salvar & Voltar
  const btnBackPos = k.vec2(cX + actW + actGap, actionY);
  const btnBack = k.add([
    k.rect(actW, actH, { radius: 9 }),
    k.pos(btnBackPos),
    k.color(16, 120, 180),
    k.outline(2, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnBack);

  elements.push(
    k.add([
      k.text("Salvar & Voltar ↩", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnBackPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnBack.onHoverUpdate(() => {
    if (isClosed() || isModalOpen()) return;
    btnBack.color = k.rgb(30, 150, 220);
    btnBack.scale = k.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    if (isClosed() || isModalOpen()) return;
    btnBack.color = k.rgb(16, 120, 180);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(() => {
    if (isClosed() || isModalOpen()) return;
    close();
  });
  focusItems.push({
    pos: btnBackPos,
    width: actW,
    height: actH,
    onActivate: close,
  });

  // Selo de versão e conformidade LGPD & WCAG 2.1 AA
  elements.push(
    k.add([
      k.text(`Micro Splash v${APP_VERSION} • Conformidade LGPD & WCAG 2.1 AA`, {
        size: accessibilitySystem.scaleFont(11.5),
        font: "Inter",
      }),
      k.pos(cX, cardTop + 608),
      k.color(140, 175, 215),
      k.opacity(0.75),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
}

import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { hapticsSystem } from "../systems/hapticsSystem";
import { ttsSystem } from "../systems/ttsSystem";
import { showOnboardingModal } from "./onboardingModal";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import { i18n } from "../i18n/i18n";
import {
  RESOLUTION_PRESETS,
  type ResolutionKey,
  getSavedResolution,
  setSavedResolution,
  getSavedDisplayMode,
  setSavedDisplayMode,
  type DisplayMode,
  detectNativeResolution,
  calculateAspectRatio,
  getSavedLetterboxColor,
  setSavedLetterboxColor,
  type LetterboxColor,
  APP_VERSION,
} from "../config";
import {
  animateModalEntrance,
  attachButtonHoverEffect,
  createResolutionTransitionOverlay,
} from "./animationUtils";

export function showOptionsScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;
  let isModalOpen = false;

  const initialRes = getSavedResolution();
  let currentResKey: ResolutionKey = initialRes.key;

  const initialDisplayMode = getSavedDisplayMode();
  let currentDisplayMode: DisplayMode = initialDisplayMode;

  const initialLetterboxColor = getSavedLetterboxColor();
  let currentLetterboxColor: LetterboxColor = initialLetterboxColor;

  const initialFontScale = accessibilitySystem.getFontScaleKey();
  const initialLocale = i18n.getLocale();

  // Fundo escuro semitransparente (absorve cliques e bloqueia o menu)
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 16, 36),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card do Modal de Opções com geometria ampla e adaptativa
  const cardW = Math.min(1000, k.width() - 24);
  const cardH = Math.min(650, k.height() - 20);
  const cX = k.width() / 2;
  const cY = k.height() / 2;
  const cardTop = cY - cardH / 2;

  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);
  animateModalEntrance(k, card);

  // Título Principal com destaque dourado
  elements.push(
    k.add([
      k.text("OPÇÕES & ACESSIBILIDADE ⚙️", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      k.pos(cX, cardTop + 30),
      k.color(255, 225, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Subtítulo descritivo em azul celeste nítido
  elements.push(
    k.add([
      k.text(
        "Personalize áudio, resolução gráfica, controles e recursos de acessibilidade universal",
        {
          size: accessibilitySystem.scaleFont(15.5),
          font: "Inter",
        }
      ),
      k.pos(cX, cardTop + 56),
      k.color(180, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const focusItems: FocusableItem[] = [];

  const close = () => {
    if (isClosed || isModalOpen) return;
    isClosed = true;
    audioSystem.playUiClick();
    focusGroup.destroy();
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    if (
      (currentResKey !== initialRes.key ||
        currentDisplayMode !== initialDisplayMode ||
        currentLetterboxColor !== initialLetterboxColor ||
        accessibilitySystem.getFontScaleKey() !== initialFontScale ||
        i18n.getLocale() !== initialLocale) &&
      typeof window !== "undefined"
    ) {
      createResolutionTransitionOverlay(k, () => {
        window.location.reload();
      });
      return;
    }
    onBack();
  };

  // Botão fechar [X] no topo direito
  const btnXPos = k.vec2(cX + cardW / 2 - 30, cardTop + 30);
  const btnX = k.add([
    k.rect(34, 34, { radius: 8 }),
    k.pos(btnXPos),
    k.color(22, 50, 90),
    k.outline(1.5, k.rgb(100, 200, 255)),
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
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnXPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  attachButtonHoverEffect(k, btnX, {
    baseColor: [22, 50, 90],
    hoverColor: [180, 50, 50],
    baseScale: 1.0,
    hoverScale: 1.06,
    canInteract: () => !isClosed && !isModalOpen,
  });
  btnX.onClick(() => {
    if (isClosed || isModalOpen) return;
    close();
  });
  focusItems.push({
    pos: btnXPos,
    width: 32,
    height: 32,
    onActivate: close,
  });

  // Fechar com ESC
  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed || isModalOpen) return;
    if (e.key === "Escape") {
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }

  // --- ESTRUTURA EM 2 COLUNAS HARMONIOSAS ---
  const colGap = 20;
  const colW = (cardW - 56 - colGap) / 2;
  const col0X = cX - colW / 2 - colGap / 2;
  const col1X = cX + colW / 2 + colGap / 2;
  const headerY = cardTop + 88;

  // Cabeçalho Coluna 0: ÁUDIO & VÍDEO
  elements.push(
    k.add([
      k.text("🎵 ÁUDIO & GRÁFICOS", {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }),
      k.pos(col0X, headerY),
      k.color(100, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Cabeçalho Coluna 1: ACESSIBILIDADE & SISTEMA
  elements.push(
    k.add([
      k.text("♿ ACESSIBILIDADE & SISTEMA", {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }),
      k.pos(col1X, headerY),
      k.color(100, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const rowStartY = cardTop + 124;
  const btnH = 41;
  const rowGap = 10;

  // ========================================================
  // COLUNA 0 (ESQUERDA): ÁUDIO & VÍDEO
  // ========================================================

  // --- Linha 0: Volume Geral ---
  const row0Y = rowStartY + 0 * (btnH + rowGap);
  const volBox = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(col0X, row0Y),
    k.color(16, 40, 78),
    k.outline(1.5, k.rgb(38, 78, 130)),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(volBox);

  elements.push(
    k.add([
      k.text("Volume Geral:", {
        size: accessibilitySystem.scaleFont(15),
        font: "Inter",
      }),
      k.pos(col0X - colW / 2 + 16, row0Y),
      k.color(200, 230, 255),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  const volumeText = k.add([
    k.text(`${Math.round(audioSystem.getVolume() * 100)}%`, {
      size: accessibilitySystem.scaleFont(16),
      font: "Outfit",
    }),
    k.pos(col0X + 35, row0Y),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(volumeText);

  // Botão Diminuir Volume [-]
  const btnVolDownPos = k.vec2(col0X - 18, row0Y);
  const btnVolDown = k.add([
    k.rect(36, 30, { radius: 6 }),
    k.pos(btnVolDownPos),
    k.color(22, 65, 120),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnVolDown);

  elements.push(
    k.add([
      k.text("-", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(btnVolDownPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  const handleVolDown = () => {
    const newVol = Math.max(0, audioSystem.getVolume() - 0.1);
    audioSystem.setVolume(newVol);
    audioSystem.playUiClick();
    volumeText.text = `${Math.round(newVol * 100)}%`;
  };

  btnVolDown.onHoverUpdate(() => {
    btnVolDown.color = k.rgb(35, 95, 160);
    btnVolDown.scale = k.vec2(1.05, 1.05);
  });
  btnVolDown.onHoverEnd(() => {
    btnVolDown.color = k.rgb(22, 65, 120);
    btnVolDown.scale = k.vec2(1, 1);
  });
  btnVolDown.onClick(handleVolDown);
  focusItems.push({
    pos: btnVolDownPos,
    width: 36,
    height: 30,
    onActivate: handleVolDown,
  });

  // Botão Aumentar Volume [+]
  const btnVolUpPos = k.vec2(col0X + 90, row0Y);
  const btnVolUp = k.add([
    k.rect(36, 30, { radius: 6 }),
    k.pos(btnVolUpPos),
    k.color(22, 65, 120),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnVolUp);

  elements.push(
    k.add([
      k.text("+", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(btnVolUpPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  const handleVolUp = () => {
    const newVol = Math.min(1, audioSystem.getVolume() + 0.1);
    audioSystem.setVolume(newVol);
    audioSystem.playUiClick();
    volumeText.text = `${Math.round(newVol * 100)}%`;
  };

  btnVolUp.onHoverUpdate(() => {
    btnVolUp.color = k.rgb(35, 95, 160);
    btnVolUp.scale = k.vec2(1.05, 1.05);
  });
  btnVolUp.onHoverEnd(() => {
    btnVolUp.color = k.rgb(22, 65, 120);
    btnVolUp.scale = k.vec2(1, 1);
  });
  btnVolUp.onClick(handleVolUp);
  focusItems.push({
    pos: btnVolUpPos,
    width: 36,
    height: 30,
    onActivate: handleVolUp,
  });

  // --- Linha 1: Trilha Sonora (Jukebox) ---
  const row1Y = rowStartY + 1 * (btnH + rowGap);
  const btnSoundtrackPos = k.vec2(col0X, row1Y);
  const btnSoundtrack = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnSoundtrackPos),
    k.color(20, 75, 135),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnSoundtrack);

  const soundtrackText = k.add([
    k.text(audioSystem.getSoundtrackModeLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnSoundtrackPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(soundtrackText);

  const handleSoundtrack = () => {
    audioSystem.cycleNextSoundtrackMode();
    audioSystem.playUiClick();
    soundtrackText.text = audioSystem.getSoundtrackModeLabel();
  };

  btnSoundtrack.onHoverUpdate(() => {
    btnSoundtrack.color = k.rgb(28, 100, 175);
    btnSoundtrack.scale = k.vec2(1.02, 1.02);
  });
  btnSoundtrack.onHoverEnd(() => {
    btnSoundtrack.color = k.rgb(20, 75, 135);
    btnSoundtrack.scale = k.vec2(1, 1);
  });
  btnSoundtrack.onClick(handleSoundtrack);
  focusItems.push({
    pos: btnSoundtrackPos,
    width: colW,
    height: btnH,
    onActivate: handleSoundtrack,
  });

  // --- Linha 2: Efeitos Sonoros (SFX) ---
  const row2Y = rowStartY + 2 * (btnH + rowGap);
  const btnSfxPos = k.vec2(col0X, row2Y);
  const btnSfx = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnSfxPos),
    k.color(audioSystem.isSfxEnabled() ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnSfx);

  const sfxText = k.add([
    k.text(`SFX: ${audioSystem.isSfxEnabled() ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`, {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnSfxPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(sfxText);

  const handleSfx = () => {
    const newState = !audioSystem.isSfxEnabled();
    audioSystem.setSfxEnabled(newState);
    audioSystem.playUiClick();
    btnSfx.color = newState ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75);
    sfxText.text = `SFX: ${newState ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`;
  };

  btnSfx.onHoverUpdate(() => {
    btnSfx.scale = k.vec2(1.02, 1.02);
  });
  btnSfx.onHoverEnd(() => {
    btnSfx.scale = k.vec2(1, 1);
  });
  btnSfx.onClick(handleSfx);
  focusItems.push({
    pos: btnSfxPos,
    width: colW,
    height: btnH,
    onActivate: handleSfx,
  });

  // --- Linha 3: Vibração / Feedback Háptico ---
  const row3Y = rowStartY + 3 * (btnH + rowGap);
  const getHapticsLabel = () =>
    hapticsSystem.isEnabled() ? "Vibração: LIGADA 📳" : "Vibração: DESLIGADA 📴";
  const btnHapticsPos = k.vec2(col0X, row3Y);
  const btnHaptics = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnHapticsPos),
    k.color(hapticsSystem.isEnabled() ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnHaptics);

  const hapticsText = k.add([
    k.text(getHapticsLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnHapticsPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(hapticsText);

  const handleHaptics = () => {
    const newState = hapticsSystem.toggle();
    audioSystem.playUiClick();
    btnHaptics.color = newState ? k.rgb(20, 85, 145) : k.rgb(45, 55, 75);
    hapticsText.text = getHapticsLabel();
  };

  btnHaptics.onHoverUpdate(() => {
    btnHaptics.scale = k.vec2(1.02, 1.02);
  });
  btnHaptics.onHoverEnd(() => {
    btnHaptics.scale = k.vec2(1, 1);
  });
  btnHaptics.onClick(handleHaptics);
  focusItems.push({
    pos: btnHapticsPos,
    width: colW,
    height: btnH,
    onActivate: handleHaptics,
  });

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
    k.text(getResLabel(currentResKey), {
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

  // Dica informativa de reload ao salvar
  const reloadHintY = cardTop + 424;
  const resHintText = k.add([
    k.text("", {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    k.pos(cX, reloadHintY),
    k.color(255, 220, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resHintText);

  const updateReloadHint = () => {
    if (
      currentResKey !== initialRes.key ||
      currentDisplayMode !== initialDisplayMode ||
      currentLetterboxColor !== initialLetterboxColor ||
      accessibilitySystem.getFontScaleKey() !== initialFontScale ||
      i18n.getLocale() !== initialLocale
    ) {
      resHintText.text =
        "⚠️ A tela será recarregada ao salvar para aplicar as alterações de sistema";
    } else {
      resHintText.text = "";
    }
  };

  const handleRes = () => {
    const currentIdx = resKeys.indexOf(currentResKey);
    const nextIdx = (currentIdx + 1) % resKeys.length;
    currentResKey = resKeys[nextIdx];
    setSavedResolution(currentResKey);
    audioSystem.playUiClick();
    resText.text = getResLabel(currentResKey);
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
    if (currentDisplayMode === "stretch") {
      return "Bordas: PREENCHER 🖥️✓";
    }
    return currentLetterboxColor === "ocean" ? "Bordas: OCEANO 🌊" : "Bordas: PRETO ⬛";
  };

  const btnDisplayPos = k.vec2(col0X - colW / 2 + displayW / 2, row5Y);
  const btnDisplay = k.add([
    k.rect(displayW, btnH, { radius: 8 }),
    k.pos(btnDisplayPos),
    k.color(
      currentDisplayMode === "stretch"
        ? k.rgb(18, 105, 80)
        : currentLetterboxColor === "ocean"
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
    if (currentDisplayMode === "stretch") {
      currentDisplayMode = "letterbox";
      currentLetterboxColor = "black";
    } else if (currentLetterboxColor === "black") {
      currentLetterboxColor = "ocean";
    } else {
      currentDisplayMode = "stretch";
    }
    setSavedDisplayMode(currentDisplayMode);
    setSavedLetterboxColor(currentLetterboxColor);
    audioSystem.playUiClick();
    displayText.text = getDisplayLabel();
    btnDisplay.color =
      currentDisplayMode === "stretch"
        ? k.rgb(18, 105, 80)
        : currentLetterboxColor === "ocean"
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
    k.setFullscreen(!k.isFullscreen());
    fsText.text = k.isFullscreen() ? "Janela 🗗" : "Tela Cheia ⛶";
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

  // ========================================================
  // COLUNA 1 (DIREITA): ACESSIBILIDADE & SISTEMA
  // ========================================================

  // --- Linha 0: Filtro de Cores / Daltonismo ---
  const btnAccessibilityPos = k.vec2(col1X, row0Y);
  const btnAccessibility = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnAccessibilityPos),
    k.color(accessibilitySystem.isHighContrast() ? k.rgb(30, 110, 150) : k.rgb(22, 75, 125)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnAccessibility);

  const accessibilityText = k.add([
    k.text(accessibilitySystem.getLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnAccessibilityPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(accessibilityText);

  const handleAccessibility = () => {
    accessibilitySystem.cycleNextColorMode();
    audioSystem.playUiClick();
    accessibilityText.text = accessibilitySystem.getLabel();
    btnAccessibility.color = accessibilitySystem.isHighContrast()
      ? k.rgb(30, 110, 150)
      : k.rgb(22, 75, 125);
  };

  btnAccessibility.onHoverUpdate(() => {
    btnAccessibility.scale = k.vec2(1.02, 1.02);
  });
  btnAccessibility.onHoverEnd(() => {
    btnAccessibility.scale = k.vec2(1, 1);
  });
  btnAccessibility.onClick(handleAccessibility);
  focusItems.push({
    pos: btnAccessibilityPos,
    width: colW,
    height: btnH,
    onActivate: handleAccessibility,
  });

  // --- Linha 1: Movimento de Câmera Reduzido ---
  const btnMotionPos = k.vec2(col1X, row1Y);
  const btnMotion = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnMotionPos),
    k.color(accessibilitySystem.isReducedMotion() ? k.rgb(30, 110, 140) : k.rgb(20, 75, 120)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnMotion);

  const motionText = k.add([
    k.text(accessibilitySystem.getReducedMotionLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnMotionPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(motionText);

  const handleMotion = () => {
    accessibilitySystem.cycleReducedMotion();
    audioSystem.playUiClick();
    motionText.text = accessibilitySystem.getReducedMotionLabel();
    btnMotion.color = accessibilitySystem.isReducedMotion()
      ? k.rgb(30, 110, 140)
      : k.rgb(20, 75, 120);
  };

  btnMotion.onHoverUpdate(() => {
    btnMotion.scale = k.vec2(1.02, 1.02);
  });
  btnMotion.onHoverEnd(() => {
    btnMotion.scale = k.vec2(1, 1);
  });
  btnMotion.onClick(handleMotion);
  focusItems.push({
    pos: btnMotionPos,
    width: colW,
    height: btnH,
    onActivate: handleMotion,
  });

  // --- Linha 2: Tamanho da Fonte ---
  const btnFontPos = k.vec2(col1X, row2Y);
  const btnFont = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnFontPos),
    k.color(20, 75, 120),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnFont);

  const fontText = k.add([
    k.text(accessibilitySystem.getFontScaleLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnFontPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(fontText);

  const handleFont = () => {
    accessibilitySystem.cycleFontScale();
    audioSystem.playUiClick();
    fontText.text = accessibilitySystem.getFontScaleLabel();
    updateReloadHint();
  };

  btnFont.onHoverUpdate(() => {
    btnFont.scale = k.vec2(1.02, 1.02);
  });
  btnFont.onHoverEnd(() => {
    btnFont.scale = k.vec2(1, 1);
  });
  btnFont.onClick(handleFont);
  focusItems.push({
    pos: btnFontPos,
    width: colW,
    height: btnH,
    onActivate: handleFont,
  });

  // --- Linha 3: Narração em Voz (TTS) ---
  const btnTtsPos = k.vec2(col1X, row3Y);
  const btnTts = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnTtsPos),
    k.color(ttsSystem.isEnabled() ? k.rgb(20, 100, 140) : k.rgb(45, 55, 75)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTts);

  const ttsText = k.add([
    k.text(ttsSystem.getLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnTtsPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(ttsText);

  const handleTts = () => {
    const newState = ttsSystem.toggle();
    audioSystem.playUiClick();
    btnTts.color = newState ? k.rgb(20, 100, 140) : k.rgb(45, 55, 75);
    ttsText.text = ttsSystem.getLabel();
  };

  btnTts.onHoverUpdate(() => {
    btnTts.scale = k.vec2(1.02, 1.02);
  });
  btnTts.onHoverEnd(() => {
    btnTts.scale = k.vec2(1, 1);
  });
  btnTts.onClick(handleTts);
  focusItems.push({
    pos: btnTtsPos,
    width: colW,
    height: btnH,
    onActivate: handleTts,
  });

  // --- Linha 4: Idioma / Language ---
  const btnLangPos = k.vec2(col1X, row4Y);
  const btnLang = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnLangPos),
    k.color(24, 85, 140),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnLang);

  const langText = k.add([
    k.text(i18n.getLocaleLabel(), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnLangPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(langText);

  const handleLang = () => {
    i18n.cycleNextLocale();
    audioSystem.playUiClick();
    langText.text = i18n.getLocaleLabel();
    updateReloadHint();
  };

  btnLang.onHoverUpdate(() => {
    btnLang.scale = k.vec2(1.02, 1.02);
  });
  btnLang.onHoverEnd(() => {
    btnLang.scale = k.vec2(1, 1);
  });
  btnLang.onClick(handleLang);
  focusItems.push({
    pos: btnLangPos,
    width: colW,
    height: btnH,
    onActivate: handleLang,
  });

  // --- Linha 5: Controles Touch ---
  let touchMode = localStorage.getItem("micro_splash_touch_controls") || "auto";
  const getTouchLabel = (mode: string) => {
    if (mode === "on") return "Touch: ATIVOS 📱";
    if (mode === "off") return "Touch: OFF ❌";
    return "Touch: AUTOMÁTICO 📱";
  };

  const btnTouchPos = k.vec2(col1X, row5Y);
  const btnTouch = k.add([
    k.rect(colW, btnH, { radius: 8 }),
    k.pos(btnTouchPos),
    k.color(touchMode === "off" ? k.rgb(45, 55, 75) : k.rgb(20, 90, 140)),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTouch);

  const touchText = k.add([
    k.text(getTouchLabel(touchMode), {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(btnTouchPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(touchText);

  const handleTouch = () => {
    if (touchMode === "auto") touchMode = "on";
    else if (touchMode === "on") touchMode = "off";
    else touchMode = "auto";

    localStorage.setItem("micro_splash_touch_controls", touchMode);
    audioSystem.playUiClick();
    btnTouch.color = touchMode === "off" ? k.rgb(45, 55, 75) : k.rgb(20, 90, 140);
    touchText.text = getTouchLabel(touchMode);
  };

  btnTouch.onHoverUpdate(() => {
    btnTouch.scale = k.vec2(1.02, 1.02);
  });
  btnTouch.onHoverEnd(() => {
    btnTouch.scale = k.vec2(1, 1);
  });
  btnTouch.onClick(handleTouch);
  focusItems.push({
    pos: btnTouchPos,
    width: colW,
    height: btnH,
    onActivate: handleTouch,
  });

  // ========================================================
  // SEÇÃO INFERIOR: GUIA DE CONTROLES, AÇÕES & LGPD
  // ========================================================

  // --- Guia Rápido de Controles ---
  const guideY = cardTop + 472;
  const guideBoxW = cardW - 56;
  const guideBoxH = 66;

  elements.push(
    k.add([
      k.rect(guideBoxW, guideBoxH, { radius: 10 }),
      k.pos(cX, guideY),
      k.color(8, 24, 52),
      k.outline(1.5, k.rgb(38, 80, 135)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  elements.push(
    k.add([
      k.text("🎮 GUIA RÁPIDO DE CONTROLES & NAVEGAÇÃO", {
        size: accessibilitySystem.scaleFont(13.5),
        font: "Outfit",
      }),
      k.pos(cX, guideY - 15),
      k.color(255, 215, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  const guideControlText =
    "🏊 [Setas / WASD]: Nadar e Inclinar    💨 [Espaço]: Impulso    📡 [Shift / E]: Biossonar\n" +
    "⌨️ [Tab / Setas + Enter]: Navegar por Teclado    ✕ [Esc]: Fechar";

  elements.push(
    k.add([
      k.text(guideControlText, {
        size: accessibilitySystem.scaleFont(12.5),
        font: "Inter",
        width: guideBoxW - 32,
        align: "center",
        lineSpacing: 4,
      }),
      k.pos(cX, guideY + 13),
      k.color(215, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

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
    if (isClosed || isModalOpen) return;
    isModalOpen = true;
    audioSystem.playUiClick();
    showOnboardingModal(k, () => {
      isModalOpen = false;
    });
  };

  btnTutorial.onHoverUpdate(() => {
    if (isClosed || isModalOpen) return;
    btnTutorial.color = k.rgb(28, 120, 185);
    btnTutorial.scale = k.vec2(1.02, 1.02);
  });
  btnTutorial.onHoverEnd(() => {
    if (isClosed || isModalOpen) return;
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

  // Modal de Confirmação LGPD com tipografia e contraste aprimorados
  const showLgpdConfirmation = () => {
    if (isClosed || isModalOpen) return;
    isModalOpen = true;
    audioSystem.playUiClick();
    const confElements: any[] = [];

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
      isModalOpen = false;
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
  };

  btnLgpd.onHoverUpdate(() => {
    if (isClosed || isModalOpen) return;
    btnLgpd.color = k.rgb(130, 35, 35);
    btnLgpd.scale = k.vec2(1.02, 1.02);
  });
  btnLgpd.onHoverEnd(() => {
    if (isClosed || isModalOpen) return;
    btnLgpd.color = k.rgb(100, 28, 28);
    btnLgpd.scale = k.vec2(1, 1);
  });
  btnLgpd.onClick(() => {
    if (isClosed || isModalOpen) return;
    showLgpdConfirmation();
  });
  focusItems.push({
    pos: btnLgpdPos,
    width: actW,
    height: actH,
    onActivate: showLgpdConfirmation,
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
    if (isClosed || isModalOpen) return;
    btnBack.color = k.rgb(30, 150, 220);
    btnBack.scale = k.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    if (isClosed || isModalOpen) return;
    btnBack.color = k.rgb(16, 120, 180);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(() => {
    if (isClosed || isModalOpen) return;
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

  // Inicia o grupo de foco por teclado acessível
  const focusGroup = createFocusGroup(k, {
    items: focusItems,
    onEscape: close,
    initialIndex: focusItems.length - 1, // Inicia focado em Salvar & Voltar
    ringZ: 315,
    isEnabled: () => !isClosed && !isModalOpen,
  });
}

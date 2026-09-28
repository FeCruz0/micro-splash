import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { hapticsSystem } from "../systems/hapticsSystem";
import { ttsSystem } from "../systems/ttsSystem";
import { showOnboardingModal } from "./onboardingModal";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import {
  RESOLUTION_PRESETS,
  type ResolutionKey,
  getSavedResolution,
  getSavedDisplayMode,
  setSavedDisplayMode,
  type DisplayMode,
  APP_VERSION,
} from "../config";

export function showOptionsScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;

  const initialRes = getSavedResolution();
  let currentResKey: ResolutionKey = initialRes.key;

  const initialDisplayMode = getSavedDisplayMode();
  let currentDisplayMode: DisplayMode = initialDisplayMode;

  const initialFontScale = accessibilitySystem.getFontScaleKey();

  // Fundo escuro semitransparente (absorve cliques e bloqueia o menu)
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 18, 38),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card de Opções
  const cardW = 600;
  const cardH = 580;
  const card = k.add([
    k.rect(cardW, cardH, { radius: 12 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(12, 35, 75),
    k.outline(2, k.rgb(80, 200, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);

  // Título
  elements.push(
    k.add([
      k.text("OPÇÕES & ACESSIBILIDADE ⚙️", { size: 19, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 - 258),
      k.color(255, 230, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const focusItems: FocusableItem[] = [];

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    focusGroup.destroy();
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    if (
      (currentResKey !== initialRes.key ||
        currentDisplayMode !== initialDisplayMode ||
        accessibilitySystem.getFontScaleKey() !== initialFontScale) &&
      typeof window !== "undefined"
    ) {
      window.location.reload();
      return;
    }
    onBack();
  };

  // Botão fechar [X]
  const btnXPos = k.vec2(k.width() / 2 + cardW / 2 - 26, k.height() / 2 - cardH / 2 + 26);
  const btnX = k.add([
    k.rect(32, 32, { radius: 6 }),
    k.pos(btnXPos),
    k.color(20, 45, 80),
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
      k.text("✕", { size: 16, font: "sans-serif" }),
      k.pos(btnXPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnX.onHoverUpdate(() => {
    btnX.color = k.rgb(180, 50, 50);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(20, 45, 80);
  });
  btnX.onClick(close);
  focusItems.push({
    pos: btnXPos,
    width: 32,
    height: 32,
    onActivate: close,
  });

  // --- 1. CONTROLE DE VOLUME ---
  const volY = k.height() / 2 - 222;
  elements.push(
    k.add([
      k.text("Volume Geral:", { size: 13.5, font: "sans-serif" }),
      k.pos(k.width() / 2 - 165, volY),
      k.color(200, 230, 255),
      k.anchor("left"),
      k.fixed(),
      k.z(302),
    ])
  );

  const volumeText = k.add([
    k.text(`${Math.round(audioSystem.getVolume() * 100)}%`, { size: 14.5, font: "sans-serif" }),
    k.pos(k.width() / 2 + 55, volY),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(volumeText);

  // Botão Diminuir Volume [-]
  const btnVolDownPos = k.vec2(k.width() / 2 + 5, volY);
  const btnVolDown = k.add([
    k.rect(34, 26, { radius: 6 }),
    k.pos(btnVolDownPos),
    k.color(20, 60, 110),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnVolDown);

  elements.push(
    k.add([
      k.text("-", { size: 18 }),
      k.pos(btnVolDownPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
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
  });
  btnVolDown.onHoverEnd(() => {
    btnVolDown.color = k.rgb(20, 60, 110);
  });
  btnVolDown.onClick(handleVolDown);
  focusItems.push({
    pos: btnVolDownPos,
    width: 34,
    height: 26,
    onActivate: handleVolDown,
  });

  // Botão Aumentar Volume [+]
  const btnVolUpPos = k.vec2(k.width() / 2 + 105, volY);
  const btnVolUp = k.add([
    k.rect(34, 26, { radius: 6 }),
    k.pos(btnVolUpPos),
    k.color(20, 60, 110),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnVolUp);

  elements.push(
    k.add([
      k.text("+", { size: 16 }),
      k.pos(btnVolUpPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
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
  });
  btnVolUp.onHoverEnd(() => {
    btnVolUp.color = k.rgb(20, 60, 110);
  });
  btnVolUp.onClick(handleVolUp);
  focusItems.push({
    pos: btnVolUpPos,
    width: 34,
    height: 26,
    onActivate: handleVolUp,
  });

  // --- 2. SELETOR DE TRILHA SONORA (JUKEBOX) ---
  const soundtrackY = k.height() / 2 - 184;
  const btnSoundtrackPos = k.vec2(k.width() / 2, soundtrackY);
  const btnSoundtrack = k.add([
    k.rect(350, 28, { radius: 7 }),
    k.pos(btnSoundtrackPos),
    k.color(22, 85, 140),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnSoundtrack);

  const soundtrackText = k.add([
    k.text(audioSystem.getSoundtrackModeLabel(), { size: 11.5, font: "sans-serif" }),
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
    btnSoundtrack.scale = k.vec2(1.02, 1.02);
  });
  btnSoundtrack.onHoverEnd(() => {
    btnSoundtrack.scale = k.vec2(1, 1);
  });
  btnSoundtrack.onClick(handleSoundtrack);
  focusItems.push({
    pos: btnSoundtrackPos,
    width: 350,
    height: 28,
    onActivate: handleSoundtrack,
  });

  // --- 3. SFX & FEEDBACK HÁPTICO ---
  const sfxY = k.height() / 2 - 146;
  const btnSfxPos = k.vec2(k.width() / 2 - 90, sfxY);
  const btnSfx = k.add([
    k.rect(170, 28, { radius: 7 }),
    k.pos(btnSfxPos),
    k.color(audioSystem.isSfxEnabled() ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70)),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnSfx);

  const sfxText = k.add([
    k.text(`SFX: ${audioSystem.isSfxEnabled() ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`, {
      size: 11,
      font: "sans-serif",
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
    btnSfx.color = newState ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70);
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
    width: 170,
    height: 28,
    onActivate: handleSfx,
  });

  const getHapticsLabel = () =>
    hapticsSystem.isEnabled() ? "Vibração: LIGADA 📳" : "Vibração: DESLIGADA 📴";
  const btnHapticsPos = k.vec2(k.width() / 2 + 90, sfxY);
  const btnHaptics = k.add([
    k.rect(170, 28, { radius: 7 }),
    k.pos(btnHapticsPos),
    k.color(hapticsSystem.isEnabled() ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70)),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnHaptics);

  const hapticsText = k.add([
    k.text(getHapticsLabel(), { size: 11, font: "sans-serif" }),
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
    btnHaptics.color = newState ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70);
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
    width: 170,
    height: 28,
    onActivate: handleHaptics,
  });

  // --- 4. CORES/DALTONISMO & NARRAÇÃO EM VOZ (TTS) ---
  const colorsY = k.height() / 2 - 108;
  const btnAccessibilityPos = k.vec2(k.width() / 2 - 90, colorsY);
  const btnAccessibility = k.add([
    k.rect(170, 28, { radius: 7 }),
    k.pos(btnAccessibilityPos),
    k.color(accessibilitySystem.isHighContrast() ? k.rgb(30, 110, 150) : k.rgb(22, 75, 125)),
    k.outline(1, k.rgb(100, 240, 220)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnAccessibility);

  const accessibilityText = k.add([
    k.text(accessibilitySystem.getLabel(), { size: 10.5, font: "sans-serif" }),
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
    width: 170,
    height: 28,
    onActivate: handleAccessibility,
  });

  // Botão TTS
  const btnTtsPos = k.vec2(k.width() / 2 + 90, colorsY);
  const btnTts = k.add([
    k.rect(170, 28, { radius: 7 }),
    k.pos(btnTtsPos),
    k.color(ttsSystem.isEnabled() ? k.rgb(20, 100, 140) : k.rgb(50, 60, 70)),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTts);

  const ttsText = k.add([
    k.text(ttsSystem.getLabel(), { size: 10, font: "sans-serif" }),
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
    btnTts.color = newState ? k.rgb(20, 100, 140) : k.rgb(50, 60, 70);
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
    width: 170,
    height: 28,
    onActivate: handleTts,
  });

  // --- 5. MOVIMENTO REDUZIDO (FASE 26.6) & TAMANHO DE FONTE (FASE 26.7) ---
  const a11yY = k.height() / 2 - 70;
  const btnMotionPos = k.vec2(k.width() / 2 - 90, a11yY);
  const btnMotion = k.add([
    k.rect(170, 28, { radius: 7 }),
    k.pos(btnMotionPos),
    k.color(accessibilitySystem.isReducedMotion() ? k.rgb(30, 110, 140) : k.rgb(20, 75, 120)),
    k.outline(1, k.rgb(100, 240, 220)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnMotion);

  const motionText = k.add([
    k.text(accessibilitySystem.getReducedMotionLabel(), { size: 10, font: "sans-serif" }),
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
    width: 170,
    height: 28,
    onActivate: handleMotion,
  });

  // Botão Tamanho de Fonte
  const btnFontPos = k.vec2(k.width() / 2 + 90, a11yY);
  const btnFont = k.add([
    k.rect(170, 28, { radius: 7 }),
    k.pos(btnFontPos),
    k.color(20, 75, 120),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnFont);

  const fontText = k.add([
    k.text(accessibilitySystem.getFontScaleLabel(), { size: 10.5, font: "sans-serif" }),
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
    width: 170,
    height: 28,
    onActivate: handleFont,
  });

  // --- 6. CONTROLES TOUCH NA TELA ---
  const touchY = k.height() / 2 - 32;
  let touchMode = localStorage.getItem("micro_splash_touch_controls") || "auto";
  const getTouchLabel = (mode: string) => {
    if (mode === "on") return "Controles Touch: SEMPRE ATIVOS 📱";
    if (mode === "off") return "Controles Touch: DESATIVADOS ❌";
    return "Controles Touch: AUTOMÁTICO (Auto-Detect) 📱";
  };

  const btnTouchPos = k.vec2(k.width() / 2, touchY);
  const btnTouch = k.add([
    k.rect(350, 28, { radius: 7 }),
    k.pos(btnTouchPos),
    k.color(touchMode === "off" ? k.rgb(50, 60, 70) : k.rgb(20, 90, 140)),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTouch);

  const touchText = k.add([
    k.text(getTouchLabel(touchMode), { size: 11.5, font: "sans-serif" }),
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
    btnTouch.color = touchMode === "off" ? k.rgb(50, 60, 70) : k.rgb(20, 90, 140);
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
    width: 350,
    height: 28,
    onActivate: handleTouch,
  });

  // --- 7. RESOLUÇÃO DO JOGO ---
  const resY = k.height() / 2 + 6;
  const resKeys: ResolutionKey[] = ["1080p", "720p", "540p", "450p"];
  const getResLabel = (key: ResolutionKey) => `Resolução: ${RESOLUTION_PRESETS[key].label}`;

  const btnResPos = k.vec2(k.width() / 2, resY);
  const btnRes = k.add([
    k.rect(350, 28, { radius: 7 }),
    k.pos(btnResPos),
    k.color(24, 80, 135),
    k.outline(1, k.rgb(80, 210, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnRes);

  const resText = k.add([
    k.text(getResLabel(currentResKey), { size: 11, font: "sans-serif" }),
    k.pos(btnResPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resText);

  const resHintText = k.add([
    k.text("", { size: 9.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 26),
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
      accessibilitySystem.getFontScaleKey() !== initialFontScale
    ) {
      resHintText.text = "⚠️ A tela será recarregada ao salvar para aplicar as alterações";
    } else {
      resHintText.text = "";
    }
  };

  const handleRes = () => {
    const currentIdx = resKeys.indexOf(currentResKey);
    const nextIdx = (currentIdx + 1) % resKeys.length;
    currentResKey = resKeys[nextIdx];
    localStorage.setItem("micro_splash_resolution", currentResKey);
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
    width: 350,
    height: 28,
    onActivate: handleRes,
  });

  // --- 8. PROPORÇÃO DE TELA & TELA CHEIA ---
  const displayY = k.height() / 2 + 46;
  const btnDisplayPos = k.vec2(k.width() / 2 - 72, displayY);
  const btnDisplay = k.add([
    k.rect(195, 28, { radius: 7 }),
    k.pos(btnDisplayPos),
    k.color(currentDisplayMode === "stretch" ? k.rgb(18, 105, 80) : k.rgb(50, 65, 85)),
    k.outline(1, k.rgb(100, 240, 200)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnDisplay);

  const displayText = k.add([
    k.text(currentDisplayMode === "stretch" ? "Bordas: PREENCHER 🖥️✓" : "Bordas: 16:9 FIXA 📺", {
      size: 10,
      font: "sans-serif",
    }),
    k.pos(btnDisplayPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(displayText);

  const handleDisplay = () => {
    currentDisplayMode = currentDisplayMode === "stretch" ? "letterbox" : "stretch";
    setSavedDisplayMode(currentDisplayMode);
    audioSystem.playUiClick();
    displayText.text =
      currentDisplayMode === "stretch" ? "Bordas: PREENCHER 🖥️✓" : "Bordas: 16:9 FIXA 📺";
    btnDisplay.color = currentDisplayMode === "stretch" ? k.rgb(18, 105, 80) : k.rgb(50, 65, 85);
    updateReloadHint();
  };

  btnDisplay.onClick(handleDisplay);
  focusItems.push({
    pos: btnDisplayPos,
    width: 195,
    height: 28,
    onActivate: handleDisplay,
  });

  const btnFsPos = k.vec2(k.width() / 2 + 102, displayY);
  const btnFs = k.add([
    k.rect(135, 28, { radius: 7 }),
    k.pos(btnFsPos),
    k.color(20, 75, 125),
    k.outline(1, k.rgb(100, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnFs);

  const fsText = k.add([
    k.text("Tela Cheia [F11] ⛶", { size: 10.5, font: "sans-serif" }),
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
    fsText.text = k.isFullscreen() ? "Janela 🗗" : "Tela Cheia [F11] ⛶";
  };

  btnFs.onClick(handleFs);
  focusItems.push({
    pos: btnFsPos,
    width: 135,
    height: 28,
    onActivate: handleFs,
  });

  // --- 9. GUIA RÁPIDO DE CONTROLES ---
  const guideY = k.height() / 2 + 98;
  elements.push(
    k.add([
      k.rect(490, 52, { radius: 8 }),
      k.pos(k.width() / 2, guideY),
      k.color(8, 25, 55),
      k.outline(1, k.rgb(50, 120, 180)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  elements.push(
    k.add([
      k.text("🎮 GUIA RÁPIDO DE CONTROLES & NAVEGAÇÃO:", { size: 10, font: "sans-serif" }),
      k.pos(k.width() / 2, guideY - 14),
      k.color(255, 215, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  elements.push(
    k.add([
      k.text(
        "• [Setas/WASD]: Nadar e inclinar  • [Espaço]: Impulso de nado (delay 1s)  • [Shift/E]: Biosonar\n• [Tab/Setas + Enter]: Navegar e ativar menus por teclado (Acessibilidade WCAG)",
        {
          size: 9.5,
          font: "sans-serif",
          lineSpacing: 2,
        }
      ),
      k.pos(k.width() / 2, guideY + 8),
      k.color(180, 220, 250),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  // --- 10. TUTORIAL & APAGAR DADOS (LGPD) ---
  const actionsY = k.height() / 2 + 158;
  const btnTutorialPos = k.vec2(k.width() / 2 - 105, actionsY);
  const btnTutorial = k.add([
    k.rect(190, 32, { radius: 7 }),
    k.pos(btnTutorialPos),
    k.color(20, 85, 130),
    k.outline(1.5, k.rgb(100, 240, 220)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnTutorial);

  elements.push(
    k.add([
      k.text("Tutorial / Guia 📖", { size: 11.5, font: "sans-serif" }),
      k.pos(btnTutorialPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  const handleTutorial = () => {
    audioSystem.playUiClick();
    showOnboardingModal(k, () => {});
  };

  btnTutorial.onHoverUpdate(() => {
    btnTutorial.color = k.rgb(28, 120, 175);
    btnTutorial.scale = k.vec2(1.02, 1.02);
  });
  btnTutorial.onHoverEnd(() => {
    btnTutorial.color = k.rgb(20, 85, 130);
    btnTutorial.scale = k.vec2(1, 1);
  });
  btnTutorial.onClick(handleTutorial);
  focusItems.push({
    pos: btnTutorialPos,
    width: 190,
    height: 32,
    onActivate: handleTutorial,
  });

  // Botão Apagar Dados (LGPD)
  const btnLgpdPos = k.vec2(k.width() / 2 + 105, actionsY);
  const btnLgpd = k.add([
    k.rect(190, 32, { radius: 7 }),
    k.pos(btnLgpdPos),
    k.color(90, 25, 25),
    k.outline(1.5, k.rgb(240, 100, 100)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnLgpd);

  elements.push(
    k.add([
      k.text("🗑️ Apagar Dados (LGPD)", { size: 10.5, font: "sans-serif" }),
      k.pos(btnLgpdPos),
      k.color(255, 220, 220),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  // Modal de Confirmação LGPD
  const showLgpdConfirmation = () => {
    audioSystem.playUiClick();
    const confElements: any[] = [];

    const confBackdrop = k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(0, 0, 0),
      k.opacity(0.85),
      k.area(),
      k.fixed(),
      k.z(400),
    ]);
    confElements.push(confBackdrop);

    const confCard = k.add([
      k.rect(480, 220, { radius: 10 }),
      k.pos(k.width() / 2, k.height() / 2),
      k.color(25, 15, 25),
      k.outline(2, k.rgb(240, 80, 80)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(401),
    ]);
    confElements.push(confCard);

    confElements.push(
      k.add([
        k.text("EXCLUIR TODOS OS DADOS LOCAIS? ⚠️", { size: 14, font: "sans-serif" }),
        k.pos(k.width() / 2, k.height() / 2 - 70),
        k.color(255, 120, 120),
        k.anchor("center"),
        k.fixed(),
        k.z(402),
      ])
    );

    confElements.push(
      k.add([
        k.text(
          "Esta ação removerá todos os recordes, conquistas do Diário\ne configurações salvas no navegador (Artigo 18 da LGPD).\nEsta operação é permanente e irreversível.",
          { size: 11, font: "sans-serif", align: "center", lineSpacing: 4 }
        ),
        k.pos(k.width() / 2, k.height() / 2 - 15),
        k.color(240, 220, 220),
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
    };

    // Botão Cancelar
    const btnCancel = k.add([
      k.rect(130, 32, { radius: 6 }),
      k.pos(k.width() / 2 - 80, k.height() / 2 + 55),
      k.color(40, 50, 65),
      k.outline(1, k.rgb(150, 180, 210)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(402),
    ]);
    confElements.push(btnCancel);

    confElements.push(
      k.add([
        k.text("Cancelar ✕", { size: 11.5, font: "sans-serif" }),
        k.pos(k.width() / 2 - 80, k.height() / 2 + 55),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(403),
      ])
    );
    btnCancel.onClick(closeConf);

    // Botão Confirmar Apagar
    const btnConfirm = k.add([
      k.rect(150, 32, { radius: 6 }),
      k.pos(k.width() / 2 + 80, k.height() / 2 + 55),
      k.color(140, 30, 30),
      k.outline(1.5, k.rgb(255, 100, 100)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(402),
    ]);
    confElements.push(btnConfirm);

    confElements.push(
      k.add([
        k.text("Sim, Apagar Tudo 🗑️", { size: 11, font: "sans-serif" }),
        k.pos(k.width() / 2 + 80, k.height() / 2 + 55),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(403),
      ])
    );

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
    btnLgpd.color = k.rgb(130, 35, 35);
    btnLgpd.scale = k.vec2(1.02, 1.02);
  });
  btnLgpd.onHoverEnd(() => {
    btnLgpd.color = k.rgb(90, 25, 25);
    btnLgpd.scale = k.vec2(1, 1);
  });
  btnLgpd.onClick(showLgpdConfirmation);
  focusItems.push({
    pos: btnLgpdPos,
    width: 190,
    height: 32,
    onActivate: showLgpdConfirmation,
  });

  // --- 11. SALVAR & VOLTAR ---
  const backY = k.height() / 2 + 204;
  const btnBackPos = k.vec2(k.width() / 2, backY);
  const btnBack = k.add([
    k.rect(260, 34, { radius: 8 }),
    k.pos(btnBackPos),
    k.color(16, 120, 180),
    k.outline(2, k.rgb(100, 240, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnBack);

  elements.push(
    k.add([
      k.text("Salvar & Voltar ↩️", { size: 13, font: "sans-serif" }),
      k.pos(btnBackPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnBack.onHoverUpdate(() => {
    btnBack.color = k.rgb(30, 150, 220);
    btnBack.scale = k.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(16, 120, 180);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(close);
  focusItems.push({
    pos: btnBackPos,
    width: 260,
    height: 34,
    onActivate: close,
  });

  // Selo de versão do Micro Splash
  elements.push(
    k.add([
      k.text(`Micro Splash v${APP_VERSION} • Conformidade LGPD & WCAG 2.1 AA`, {
        size: 9.5,
        font: "sans-serif",
      }),
      k.pos(k.width() / 2, k.height() / 2 + 242),
      k.color(120, 160, 200),
      k.opacity(0.65),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  // Inicia o grupo de foco por teclado
  const focusGroup = createFocusGroup(k, {
    items: focusItems,
    onEscape: close,
    initialIndex: 0,
    ringZ: 315,
  });
}

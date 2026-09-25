import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { hapticsSystem } from "../systems/hapticsSystem";
import { ttsSystem } from "../systems/ttsSystem";
import { showOnboardingModal } from "./onboardingModal";
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

  // Fundo escuro semitransparente (absorve cliques e bloqueia o menu)
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 18, 38),
    k.opacity(0.94),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card de Opções
  const cardW = 580;
  const cardH = 510;
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
      k.text("OPÇÕES ⚙️", { size: 20, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 - 215),
      k.color(255, 230, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    escListener.cancel();
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    if (
      (currentResKey !== initialRes.key || currentDisplayMode !== initialDisplayMode) &&
      typeof window !== "undefined"
    ) {
      window.location.reload();
      return;
    }
    onBack();
  };

  const escListener = k.onKeyPress("escape", close);

  // Botão fechar [X]
  const btnX = k.add([
    k.rect(32, 32, { radius: 6 }),
    k.pos(k.width() / 2 + cardW / 2 - 26, k.height() / 2 - cardH / 2 + 26),
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
      k.pos(k.width() / 2 + cardW / 2 - 26, k.height() / 2 - cardH / 2 + 26),
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

  // --- CONTROLE DE VOLUME ---
  elements.push(
    k.add([
      k.text("Volume Geral:", { size: 14, font: "sans-serif" }),
      k.pos(k.width() / 2 - 165, k.height() / 2 - 180),
      k.color(200, 230, 255),
      k.anchor("left"),
      k.fixed(),
      k.z(302),
    ])
  );

  const volumeText = k.add([
    k.text(`${Math.round(audioSystem.getVolume() * 100)}%`, { size: 15, font: "sans-serif" }),
    k.pos(k.width() / 2 + 55, k.height() / 2 - 180),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(volumeText);

  // Botão Diminuir Volume [-]
  const btnVolDown = k.add([
    k.rect(34, 28, { radius: 6 }),
    k.pos(k.width() / 2 + 5, k.height() / 2 - 180),
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
      k.pos(k.width() / 2 + 5, k.height() / 2 - 180),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnVolDown.onHoverUpdate(() => {
    btnVolDown.color = k.rgb(35, 95, 160);
  });
  btnVolDown.onHoverEnd(() => {
    btnVolDown.color = k.rgb(20, 60, 110);
  });

  btnVolDown.onClick(() => {
    const newVol = Math.max(0, audioSystem.getVolume() - 0.1);
    audioSystem.setVolume(newVol);
    audioSystem.playUiClick();
    volumeText.text = `${Math.round(newVol * 100)}%`;
  });

  // Botão Aumentar Volume [+]
  const btnVolUp = k.add([
    k.rect(34, 28, { radius: 6 }),
    k.pos(k.width() / 2 + 105, k.height() / 2 - 180),
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
      k.pos(k.width() / 2 + 105, k.height() / 2 - 180),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnVolUp.onHoverUpdate(() => {
    btnVolUp.color = k.rgb(35, 95, 160);
  });
  btnVolUp.onHoverEnd(() => {
    btnVolUp.color = k.rgb(20, 60, 110);
  });

  btnVolUp.onClick(() => {
    const newVol = Math.min(1, audioSystem.getVolume() + 0.1);
    audioSystem.setVolume(newVol);
    audioSystem.playUiClick();
    volumeText.text = `${Math.round(newVol * 100)}%`;
  });

  // --- 18.3 SELETOR DE TRILHA SONORA / JUKEBOX OCEÂNICA ---
  const btnSoundtrack = k.add([
    k.rect(350, 32, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 138),
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
    k.text(audioSystem.getSoundtrackModeLabel(), { size: 12.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 138),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(soundtrackText);

  btnSoundtrack.onHoverUpdate(() => {
    btnSoundtrack.scale = k.vec2(1.02, 1.02);
  });
  btnSoundtrack.onHoverEnd(() => {
    btnSoundtrack.scale = k.vec2(1, 1);
  });

  btnSoundtrack.onClick(() => {
    audioSystem.cycleNextSoundtrackMode();
    audioSystem.playUiClick();
    soundtrackText.text = audioSystem.getSoundtrackModeLabel();
  });

  // --- EFEITOS SONOROS (SFX) & 18.4 FEEDBACK HÁPTICO (VIBRAÇÃO TÁTIL) ---
  const btnSfx = k.add([
    k.rect(170, 32, { radius: 7 }),
    k.pos(k.width() / 2 - 90, k.height() / 2 - 96),
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
      size: 11.5,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2 - 90, k.height() / 2 - 96),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(sfxText);

  btnSfx.onHoverUpdate(() => {
    btnSfx.scale = k.vec2(1.02, 1.02);
  });
  btnSfx.onHoverEnd(() => {
    btnSfx.scale = k.vec2(1, 1);
  });

  btnSfx.onClick(() => {
    const newState = !audioSystem.isSfxEnabled();
    audioSystem.setSfxEnabled(newState);
    audioSystem.playUiClick();
    btnSfx.color = newState ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70);
    sfxText.text = `SFX: ${newState ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`;
  });

  // Botão Feedback Háptico (Vibração Tátil)
  const getHapticsLabel = () =>
    hapticsSystem.isEnabled() ? "Vibração: LIGADA 📳" : "Vibração: DESLIGADA 📴";
  const btnHaptics = k.add([
    k.rect(170, 32, { radius: 7 }),
    k.pos(k.width() / 2 + 90, k.height() / 2 - 96),
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
    k.text(getHapticsLabel(), { size: 11.5, font: "sans-serif" }),
    k.pos(k.width() / 2 + 90, k.height() / 2 - 96),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(hapticsText);

  btnHaptics.onHoverUpdate(() => {
    btnHaptics.scale = k.vec2(1.02, 1.02);
  });
  btnHaptics.onHoverEnd(() => {
    btnHaptics.scale = k.vec2(1, 1);
  });

  btnHaptics.onClick(() => {
    const newState = hapticsSystem.toggle();
    audioSystem.playUiClick();
    btnHaptics.color = newState ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70);
    hapticsText.text = getHapticsLabel();
  });

  // --- 18.2 SELETOR DE CORES / DALTONISMO & FASE 21 NARRAÇÃO EM VOZ (TTS) ---
  const btnAccessibility = k.add([
    k.rect(170, 32, { radius: 7 }),
    k.pos(k.width() / 2 - 90, k.height() / 2 - 54),
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
    k.text(accessibilitySystem.getLabel(), { size: 11, font: "sans-serif" }),
    k.pos(k.width() / 2 - 90, k.height() / 2 - 54),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(accessibilityText);

  btnAccessibility.onHoverUpdate(() => {
    btnAccessibility.scale = k.vec2(1.02, 1.02);
  });
  btnAccessibility.onHoverEnd(() => {
    btnAccessibility.scale = k.vec2(1, 1);
  });

  btnAccessibility.onClick(() => {
    accessibilitySystem.cycleNextColorMode();
    audioSystem.playUiClick();
    accessibilityText.text = accessibilitySystem.getLabel();
    btnAccessibility.color = accessibilitySystem.isHighContrast()
      ? k.rgb(30, 110, 150)
      : k.rgb(22, 75, 125);
  });

  // Botão Narração em Voz (Web Speech API / TTS)
  const btnTts = k.add([
    k.rect(170, 32, { radius: 7 }),
    k.pos(k.width() / 2 + 90, k.height() / 2 - 54),
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
    k.text(ttsSystem.getLabel(), { size: 10.5, font: "sans-serif" }),
    k.pos(k.width() / 2 + 90, k.height() / 2 - 54),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(ttsText);

  btnTts.onHoverUpdate(() => {
    btnTts.scale = k.vec2(1.02, 1.02);
  });
  btnTts.onHoverEnd(() => {
    btnTts.scale = k.vec2(1, 1);
  });

  btnTts.onClick(() => {
    const newState = ttsSystem.toggle();
    audioSystem.playUiClick();
    btnTts.color = newState ? k.rgb(20, 100, 140) : k.rgb(50, 60, 70);
    ttsText.text = ttsSystem.getLabel();
  });

  // --- TOGGLE DE CONTROLES TOUCH NA TELA ---
  let touchMode = localStorage.getItem("micro_splash_touch_controls") || "auto";
  const getTouchLabel = (mode: string) => {
    if (mode === "on") return "Controles Touch: SEMPRE ATIVOS 📱";
    if (mode === "off") return "Controles Touch: DESATIVADOS ❌";
    return "Controles Touch: AUTOMÁTICO (Auto-Detect) 📱";
  };

  const btnTouch = k.add([
    k.rect(350, 32, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 12),
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
    k.text(getTouchLabel(touchMode), { size: 12, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 12),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(touchText);

  btnTouch.onHoverUpdate(() => {
    btnTouch.scale = k.vec2(1.02, 1.02);
  });
  btnTouch.onHoverEnd(() => {
    btnTouch.scale = k.vec2(1, 1);
  });

  btnTouch.onClick(() => {
    if (touchMode === "auto") touchMode = "on";
    else if (touchMode === "on") touchMode = "off";
    else touchMode = "auto";

    localStorage.setItem("micro_splash_touch_controls", touchMode);
    audioSystem.playUiClick();
    btnTouch.color = touchMode === "off" ? k.rgb(50, 60, 70) : k.rgb(20, 90, 140);
    touchText.text = getTouchLabel(touchMode);
  });

  // --- TOGGLE DE RESOLUÇÃO DO JOGO ---
  const resKeys: ResolutionKey[] = ["1080p", "720p", "540p", "450p"];
  const getResLabel = (key: ResolutionKey) => `Resolução: ${RESOLUTION_PRESETS[key].label}`;

  const btnRes = k.add([
    k.rect(350, 30, { radius: 7 }),
    k.pos(k.width() / 2, k.height() / 2 + 28),
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
    k.text(getResLabel(currentResKey), { size: 11.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 28),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resText);

  const resHintText = k.add([
    k.text("", { size: 10, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 50),
    k.color(255, 220, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resHintText);

  const updateReloadHint = () => {
    if (currentResKey !== initialRes.key || currentDisplayMode !== initialDisplayMode) {
      resHintText.text = "⚠️ A tela será recarregada ao salvar para aplicar as alterações";
    } else {
      resHintText.text = "";
    }
  };

  btnRes.onHoverUpdate(() => {
    btnRes.scale = k.vec2(1.02, 1.02);
  });
  btnRes.onHoverEnd(() => {
    btnRes.scale = k.vec2(1, 1);
  });

  btnRes.onClick(() => {
    const currentIdx = resKeys.indexOf(currentResKey);
    const nextIdx = (currentIdx + 1) % resKeys.length;
    currentResKey = resKeys[nextIdx];
    localStorage.setItem("micro_splash_resolution", currentResKey);
    audioSystem.playUiClick();
    resText.text = getResLabel(currentResKey);
    updateReloadHint();
  });

  // --- MODO DE TELA (SEM BORDAS / PREENCHER) & TELA CHEIA (FULLSCREEN) ---
  const btnDisplay = k.add([
    k.rect(195, 30, { radius: 7 }),
    k.pos(k.width() / 2 - 72, k.height() / 2 + 70),
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
      size: 10.5,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2 - 72, k.height() / 2 + 70),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(displayText);

  btnDisplay.onClick(() => {
    currentDisplayMode = currentDisplayMode === "stretch" ? "letterbox" : "stretch";
    setSavedDisplayMode(currentDisplayMode);
    audioSystem.playUiClick();
    displayText.text =
      currentDisplayMode === "stretch" ? "Bordas: PREENCHER 🖥️✓" : "Bordas: 16:9 FIXA 📺";
    btnDisplay.color = currentDisplayMode === "stretch" ? k.rgb(18, 105, 80) : k.rgb(50, 65, 85);
    updateReloadHint();
  });

  const btnFs = k.add([
    k.rect(135, 30, { radius: 7 }),
    k.pos(k.width() / 2 + 102, k.height() / 2 + 70),
    k.color(20, 75, 125),
    k.outline(1, k.rgb(100, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnFs);

  const fsText = k.add([
    k.text("Tela Cheia [F11] ⛶", { size: 11, font: "sans-serif" }),
    k.pos(k.width() / 2 + 102, k.height() / 2 + 70),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(fsText);

  btnFs.onClick(() => {
    audioSystem.playUiClick();
    k.setFullscreen(!k.isFullscreen());
    fsText.text = k.isFullscreen() ? "Janela 🗗" : "Tela Cheia [F11] ⛶";
  });

  // --- GUIA DE CONTROLES ---
  elements.push(
    k.add([
      k.rect(480, 56, { radius: 8 }),
      k.pos(k.width() / 2, k.height() / 2 + 132),
      k.color(8, 25, 55),
      k.outline(1, k.rgb(50, 120, 180)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  elements.push(
    k.add([
      k.text("🎮 GUIA RÁPIDO DE CONTROLES:", { size: 10.5, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 + 115),
      k.color(255, 215, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  elements.push(
    k.add([
      k.text(
        "• [Setas/WASD] ou D-Pad Touch: Nadar e inclinar a baleia\n• [Espaço] ou Botão Nado Touch: Impulso de nado (delay 1s)  • [Shift/E]: Biosonar",
        {
          size: 10,
          font: "sans-serif",
          lineSpacing: 2,
        }
      ),
      k.pos(k.width() / 2, k.height() / 2 + 138),
      k.color(180, 220, 250),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  // --- BOTÕES VOLTAR & REVER TUTORIAL ---
  const btnTutorial = k.add([
    k.rect(190, 36, { radius: 8 }),
    k.pos(k.width() / 2 - 105, k.height() / 2 + 195),
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
      k.text("Tutorial / Guia 📖", { size: 12.5, font: "sans-serif" }),
      k.pos(k.width() / 2 - 105, k.height() / 2 + 195),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnTutorial.onHoverUpdate(() => {
    btnTutorial.color = k.rgb(28, 120, 175);
    btnTutorial.scale = k.vec2(1.02, 1.02);
  });
  btnTutorial.onHoverEnd(() => {
    btnTutorial.color = k.rgb(20, 85, 130);
    btnTutorial.scale = k.vec2(1, 1);
  });

  btnTutorial.onClick(() => {
    audioSystem.playUiClick();
    showOnboardingModal(k, () => {});
  });

  const btnBack = k.add([
    k.rect(190, 36, { radius: 8 }),
    k.pos(k.width() / 2 + 105, k.height() / 2 + 195),
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
      k.pos(k.width() / 2 + 105, k.height() / 2 + 195),
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

  // Selo de versão do Micro Splash (Fase 25)
  elements.push(
    k.add([
      k.text(`Micro Splash v${APP_VERSION}`, { size: 10, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 + 224),
      k.color(120, 160, 200),
      k.opacity(0.65),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
}

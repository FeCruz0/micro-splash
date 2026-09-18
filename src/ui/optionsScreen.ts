import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { RESOLUTION_PRESETS, type ResolutionKey, getSavedResolution } from "../config";

export function showOptionsScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;

  const initialRes = getSavedResolution();
  let currentResKey: ResolutionKey = initialRes.key;

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
  elements.push(k.add([
    k.text("OPÇÕES ⚙️", { size: 20, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 215),
    k.color(255, 230, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    escListener.cancel();
    elements.forEach((el) => {
      try { k.destroy(el); } catch {}
    });
    if (currentResKey !== initialRes.key && typeof window !== "undefined") {
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

  elements.push(k.add([
    k.text("✕", { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2 + cardW / 2 - 26, k.height() / 2 - cardH / 2 + 26),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(306),
  ]));

  btnX.onHoverUpdate(() => {
    btnX.color = k.rgb(180, 50, 50);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(20, 45, 80);
  });
  btnX.onClick(close);

  // --- CONTROLE DE VOLUME ---
  elements.push(k.add([
    k.text("Volume Geral:", { size: 15, font: "sans-serif" }),
    k.pos(k.width() / 2 - 160, k.height() / 2 - 165),
    k.color(200, 230, 255),
    k.anchor("left"),
    k.fixed(),
    k.z(302),
  ]));

  const volumeText = k.add([
    k.text(`${Math.round(audioSystem.getVolume() * 100)}%`, { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2 + 60, k.height() / 2 - 165),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(volumeText);

  // Botão Diminuir Volume [-]
  const btnVolDown = k.add([
    k.rect(36, 32, { radius: 6 }),
    k.pos(k.width() / 2 + 10, k.height() / 2 - 165),
    k.color(20, 60, 110),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnVolDown);

  elements.push(k.add([
    k.text("-", { size: 20 }),
    k.pos(k.width() / 2 + 10, k.height() / 2 - 165),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

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
    k.rect(36, 32, { radius: 6 }),
    k.pos(k.width() / 2 + 110, k.height() / 2 - 165),
    k.color(20, 60, 110),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnVolUp);

  elements.push(k.add([
    k.text("+", { size: 18 }),
    k.pos(k.width() / 2 + 110, k.height() / 2 - 165),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

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

  // --- TOGGLE DE MÚSICA AMBIENTE ---
  const btnMusic = k.add([
    k.rect(340, 34, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 115),
    k.color(audioSystem.isMusicEnabled() ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70)),
    k.outline(1, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnMusic);

  const musicText = k.add([
    k.text(`Música Ambiente: ${audioSystem.isMusicEnabled() ? "LIGADA 🎵" : "DESLIGADA 🔇"}`, { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 115),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(musicText);

  btnMusic.onHoverUpdate(() => {
    btnMusic.scale = k.vec2(1.02, 1.02);
  });
  btnMusic.onHoverEnd(() => {
    btnMusic.scale = k.vec2(1, 1);
  });

  btnMusic.onClick(() => {
    const newState = !audioSystem.isMusicEnabled();
    audioSystem.setMusicEnabled(newState);
    audioSystem.playUiClick();
    btnMusic.color = newState ? k.rgb(20, 90, 140) : k.rgb(50, 60, 70);
    musicText.text = `Música Ambiente: ${newState ? "LIGADA 🎵" : "DESLIGADA 🔇"}`;
  });

  // --- TOGGLE DE EFEITOS SONOROS (SFX) ---
  const btnSfx = k.add([
    k.rect(340, 34, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 68),
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
    k.text(`Efeitos Sonoros: ${audioSystem.isSfxEnabled() ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`, { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 68),
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
    sfxText.text = `Efeitos Sonoros: ${newState ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`;
  });

  // --- TOGGLE DE CONTROLES TOUCH NA TELA ---
  let touchMode = localStorage.getItem("micro_splash_touch_controls") || "auto";
  const getTouchLabel = (mode: string) => {
    if (mode === "on") return "Controles Touch: SEMPRE ATIVOS 📱";
    if (mode === "off") return "Controles Touch: DESATIVADOS ❌";
    return "Controles Touch: AUTOMÁTICO (Auto-Detect) 📱";
  };

  const btnTouch = k.add([
    k.rect(340, 34, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 20),
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
    k.pos(k.width() / 2, k.height() / 2 - 20),
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
    k.rect(340, 34, { radius: 8 }),
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
    k.text(getResLabel(currentResKey), { size: 12, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 28),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resText);

  const resHintText = k.add([
    k.text("", { size: 10, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 52),
    k.color(255, 220, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(resHintText);

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
    if (currentResKey !== initialRes.key) {
      resHintText.text = "⚠️ A tela será recarregada ao salvar para aplicar";
    } else {
      resHintText.text = "";
    }
  });

  // --- GUIA DE CONTROLES ---
  elements.push(k.add([
    k.rect(480, 80, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 115),
    k.color(8, 25, 55),
    k.outline(1, k.rgb(50, 120, 180)),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  elements.push(k.add([
    k.text("🎮 GUIA RÁPIDO DE CONTROLES:", { size: 11, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 88),
    k.color(255, 215, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  elements.push(k.add([
    k.text("• [Setas/WASD] ou D-Pad Touch: Nadar e inclinar a baleia\n• [Espaço] ou Botão Nado Touch: Impulso de nado\n• [Shift/E] ou Botão Sonar Touch: Biosonar 360°", {
      size: 11,
      font: "sans-serif",
      lineSpacing: 3,
    }),
    k.pos(k.width() / 2, k.height() / 2 + 120),
    k.color(180, 220, 250),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  // --- BOTÃO VOLTAR ---
  const btnBack = k.add([
    k.rect(220, 38, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 195),
    k.color(16, 120, 180),
    k.outline(2, k.rgb(100, 240, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnBack);

  elements.push(k.add([
    k.text("Salvar & Voltar ↩️", { size: 14, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 195),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  btnBack.onHoverUpdate(() => {
    btnBack.color = k.rgb(30, 150, 220);
    btnBack.scale = k.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(16, 120, 180);
    btnBack.scale = k.vec2(1, 1);
  });

  btnBack.onClick(close);
}

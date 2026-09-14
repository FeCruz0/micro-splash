import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";

export function showOptionsScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;

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
  const cardH = 470;
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
    k.text("OPÇÕES & CONFIGURAÇÕES ⚙️", { size: 20, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 190),
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
    k.pos(k.width() / 2 - 160, k.height() / 2 - 130),
    k.color(200, 230, 255),
    k.anchor("left"),
    k.fixed(),
    k.z(302),
  ]));

  const volumeText = k.add([
    k.text(`${Math.round(audioSystem.getVolume() * 100)}%`, { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2 + 60, k.height() / 2 - 130),
    k.color(100, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(volumeText);

  // Botão Diminuir Volume [-]
  const btnVolDown = k.add([
    k.rect(36, 32, { radius: 6 }),
    k.pos(k.width() / 2 + 10, k.height() / 2 - 130),
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
    k.pos(k.width() / 2 + 10, k.height() / 2 - 130),
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
    k.pos(k.width() / 2 + 110, k.height() / 2 - 130),
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
    k.pos(k.width() / 2 + 110, k.height() / 2 - 130),
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
    k.rect(320, 36, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 75),
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
    k.text(`Música Ambiente: ${audioSystem.isMusicEnabled() ? "LIGADA 🎵" : "DESLIGADA 🔇"}`, { size: 14, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 75),
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
    k.rect(320, 36, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 - 25),
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
    k.text(`Efeitos Sonoros: ${audioSystem.isSfxEnabled() ? "LIGADOS 🔊" : "DESLIGADOS 🔇"}`, { size: 14, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 25),
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

  // --- GUIA DE CONTROLES ---
  elements.push(k.add([
    k.rect(480, 110, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 65),
    k.color(8, 25, 55),
    k.outline(1, k.rgb(50, 120, 180)),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  elements.push(k.add([
    k.text("🎮 GUIA RÁPIDO DE CONTROLES:", { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 30),
    k.color(255, 215, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  elements.push(k.add([
    k.text("• [Setas] ou [W/A/S/D]: Nadar e inclinar a baleia\n• [Espaço]: Batida de cauda / impulso de nado\n• [Shift] ou [E]: Biosonar / ecolocalização\n• [M]: Mudo rápido instantâneo", {
      size: 12,
      font: "sans-serif",
      lineSpacing: 5,
    }),
    k.pos(k.width() / 2, k.height() / 2 + 75),
    k.color(180, 220, 250),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  // --- BOTÃO VOLTAR ---
  const btnBack = k.add([
    k.rect(220, 40, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 180),
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
    k.pos(k.width() / 2, k.height() / 2 + 180),
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

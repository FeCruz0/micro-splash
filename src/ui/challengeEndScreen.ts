import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import type { GameState } from "../systems/state";
import { isTop10Score } from "../systems/leaderboard";
import { showInitialsInputModal } from "./initialsInputModal";

export function showChallengeEndScreen(
  k: KaboomCtx,
  gameState: GameState,
  onPlayAgain: () => void,
  onReturnMenu: () => void
) {
  const score = gameState.calculateFinalScore();
  const distance = gameState.getDistance();
  const mode = gameState.getMode();

  if (isTop10Score(score)) {
    showInitialsInputModal(k, score, distance, mode, () => {
      renderChallengeEndContent(k, gameState, onPlayAgain, onReturnMenu);
    });
  } else {
    renderChallengeEndContent(k, gameState, onPlayAgain, onReturnMenu);
  }
}

function renderChallengeEndContent(
  k: KaboomCtx,
  gameState: GameState,
  onPlayAgain: () => void,
  onReturnMenu: () => void
) {
  audioSystem.playVictoryFanfare();

  const elements: any[] = [];

  // Fundo escuro com partículas douradas
  elements.push(k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 18, 38),
    k.opacity(0.94),
    k.fixed(),
    k.z(300),
  ]));

  const cardW = 580;
  const cardH = 430;
  elements.push(k.add([
    k.rect(cardW, cardH, { radius: 14 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(12, 35, 75),
    k.outline(3, k.rgb(255, 180, 50)),
    k.anchor("center"),
    k.fixed(),
    k.z(301),
  ]));

  // Título
  elements.push(k.add([
    k.text("TEMPO ESGOTADO! FIM DA RODADA! ⏱️🎉", { size: 18, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 165),
    k.color(255, 215, 60),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  elements.push(k.add([
    k.text("Migração Rápida (Desafio 60s)", { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 135),
    k.color(140, 220, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  const score = gameState.calculateFinalScore();

  // Placar e Estatísticas
  const stats = [
    `🦐 Cardumes de Krill Consumidos: ${gameState.getKrillCount()}`,
    `🌊 Distância Percorrida: ${gameState.getDistance()}m`,
    `⚠️ Lixo Plástico Colidido: ${gameState.getTrashCount()}`,
    `⭐ Eco-Pontuação da Rodada: ${score} pts`,
  ];

  stats.forEach((stat, i) => {
    elements.push(k.add([
      k.text(stat, { size: 14, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 - 80 + i * 36),
      k.color(220, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ]));
  });

  // Mensagem de encorajamento
  elements.push(k.add([
    k.text("🎉 Parabéns, biólogo(a) marinho(a)! Tente superar sua melhor pontuação!", {
      size: 12,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2, k.height() / 2 + 85),
    k.color(255, 230, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  const destroyAll = () => {
    elements.forEach((el) => k.destroy(el));
  };

  // Botão Jogar Novamente
  const btnAgain = k.add([
    k.rect(200, 40, { radius: 8 }),
    k.pos(k.width() / 2 - 120, k.height() / 2 + 150),
    k.color(20, 120, 180),
    k.outline(2, k.rgb(100, 240, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnAgain);

  elements.push(k.add([
    k.text("Jogar Novamente 🔄", { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2 - 120, k.height() / 2 + 150),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  btnAgain.onClick(() => {
    audioSystem.playUiClick();
    destroyAll();
    onPlayAgain();
  });

  // Botão Menu Principal
  const btnMenu = k.add([
    k.rect(200, 40, { radius: 8 }),
    k.pos(k.width() / 2 + 120, k.height() / 2 + 150),
    k.color(30, 60, 100),
    k.outline(2, k.rgb(120, 180, 240)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnMenu);

  elements.push(k.add([
    k.text("Menu Principal 🏠", { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2 + 120, k.height() / 2 + 150),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  btnMenu.onClick(() => {
    audioSystem.playUiClick();
    destroyAll();
    onReturnMenu();
  });
}

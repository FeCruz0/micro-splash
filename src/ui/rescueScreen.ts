import type { KaboomCtx } from "kaboom";
import type { GameState } from "../systems/state";

export function showRescueScreen(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
  const finalScore = gameState.calculateFinalScore();
  const highScore = gameState.getHighScore();

  // Fundo escuro com transparência (Fade In)
  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(10, 25, 50),
    k.opacity(0.9),
    k.fixed(),
    k.z(200),
  ]);

  // Card do Relatório
  k.add([
    k.rect(500, 360, { radius: 12 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(20, 45, 90),
    k.outline(3, k.rgb(0, 200, 255)),
    k.anchor("center"),
    k.fixed(),
    k.z(201),
  ]);

  // Título do Resgate
  k.add([
    k.text("🚨 RESGATE DA GUARDA MARÍTIMA 🚨", { size: 18 }),
    k.pos(k.width() / 2, k.height() / 2 - 140),
    k.color(255, 215, 0),
    k.anchor("center"),
    k.fixed(),
    k.z(202),
  ]);

  k.add([
    k.text("A baleia desmaiou por asfixia mas foi resgatada a tempo em Arraial do Cabo!", {
      size: 12,
      width: 440,
    }),
    k.pos(k.width() / 2, k.height() / 2 - 100),
    k.color(200, 230, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(202),
  ]);

  // Estatísticas da Viagem
  const statsText =
    `📏 Distância Navegada: ${gameState.getDistance()}m\n` +
    `⏱️ Tempo de Viagem: ${gameState.getElapsedTime()} seg\n` +
    `🦐 Krill Coletado: ${gameState.getKrillCount()}\n` +
    `🗑️ Lixo Colidido: ${gameState.getTrashCount()}\n\n` +
    `⭐ Pontuação Final: ${finalScore} pts\n` +
    `🏆 Maior Recorde: ${highScore} pts`;

  k.add([
    k.text(statsText, { size: 14, lineSpacing: 6 }),
    k.pos(k.width() / 2 - 180, k.height() / 2 - 50),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(202),
  ]);

  // Botão interativo para reiniciar (suporta toque mobile e clique)
  const restartButton = k.add([
    k.rect(320, 38, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 130),
    k.color(20, 90, 140),
    k.outline(2, k.rgb(100, 240, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(202),
  ]);

  k.add([
    k.text("Tentar Novamente (ou ENTER) 🔄", { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 130),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);

  let isRestarting = false;
  const triggerRestart = () => {
    if (isRestarting) return;
    isRestarting = true;
    cancelKeyPress.cancel();
    onRestart();
  };

  restartButton.onHoverUpdate(() => {
    restartButton.color = k.rgb(30, 140, 200);
  });
  restartButton.onHoverEnd(() => {
    restartButton.color = k.rgb(20, 90, 140);
  });
  restartButton.onClick(triggerRestart);

  // Gatilho de Reinício ao pressionar Enter (usa .cancel() no Kaboom v3000)
  const cancelKeyPress = k.onKeyPress("enter", triggerRestart);
}

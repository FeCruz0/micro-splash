import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import type { GameState } from "../systems/state";
import { isTop10Score } from "../systems/leaderboard";
import { showInitialsInputModal } from "./initialsInputModal";
import { showQuizModal } from "./quizModal";
import { showShareModal } from "./shareModal";
import { extractVictoryCardData } from "./victoryCard";

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
  let isModalOpen = false;

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

  // Placar e Estatísticas
  elements.push(k.add([
    k.text(`🦐 Cardumes de Krill Consumidos: ${gameState.getKrillCount()}`, { size: 13.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 95),
    k.color(220, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  elements.push(k.add([
    k.text(`🌊 Distância Percorrida: ${gameState.getDistance()}m`, { size: 13.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 65),
    k.color(220, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  elements.push(k.add([
    k.text(`⚠️ Lixo Plástico Colidido: ${gameState.getTrashCount()}`, { size: 13.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 35),
    k.color(220, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  const getScoreText = () => {
    const finalScore = gameState.calculateFinalScore();
    const quizBonus = gameState.getQuizScore();
    return quizBonus > 0
      ? `⭐ Eco-Pontuação: ${finalScore} pts (+${quizBonus} Bônus Quiz)`
      : `⭐ Eco-Pontuação da Rodada: ${finalScore} pts`;
  };

  const scoreTextObj = k.add([
    k.text(getScoreText(), { size: 14.5, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 5),
    k.color(255, 230, 110),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(scoreTextObj);

  // Botão 1: Desafio Ecológico (Quiz)
  let quizCompleted = gameState.getQuizScore() > 0;
  const keyListeners: any[] = [];
  let canInteract = false;
  k.wait(0.35, () => {
    canInteract = true;
  });

  const btnQuiz = k.add([
    k.rect(340, 32, { radius: 7 }),
    k.pos(k.width() / 2, k.height() / 2 + 38),
    k.color(quizCompleted ? k.rgb(18, 95, 60) : k.rgb(25, 125, 185)),
    k.outline(1.5, quizCompleted ? k.rgb(90, 240, 160) : k.rgb(110, 230, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnQuiz);

  const btnQuizLabel = k.add([
    k.text(quizCompleted ? `Quiz Concluído! (+${gameState.getQuizScore()} pts) ✓` : "🧪 Desafio Ecológico [ENTER] (+300 pts) ▶", {
      size: 12.5,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2, k.height() / 2 + 38),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(btnQuizLabel);

  btnQuiz.onHoverUpdate(() => {
    if (!quizCompleted && !isModalOpen) {
      btnQuiz.color = k.rgb(35, 150, 220);
    }
  });
  btnQuiz.onHoverEnd(() => {
    if (!quizCompleted && !isModalOpen) {
      btnQuiz.color = k.rgb(25, 125, 185);
    }
  });

  const openQuiz = () => {
    if (quizCompleted || isModalOpen) return;
    isModalOpen = true;
    showQuizModal(
      k,
      gameState,
      (scoreGained, correctCount) => {
        isModalOpen = false;
        quizCompleted = true;
        btnQuiz.color = k.rgb(18, 95, 60);
        btnQuiz.outline.color = k.rgb(90, 240, 160);
        btnQuizLabel.text = `Quiz Concluído! +${scoreGained} pts (${correctCount}/3) ✓`;
        scoreTextObj.text = getScoreText();
        btnAgainLabel.text = "Jogar Novamente [ENTER] 🔄";
      },
      () => {
        isModalOpen = false;
      }
    );
  };

  btnQuiz.onClick(openQuiz);

  // Botão 2: Compartilhar Certificado / Redes Sociais
  const btnShare = k.add([
    k.rect(340, 32, { radius: 7 }),
    k.pos(k.width() / 2, k.height() / 2 + 78),
    k.color(18, 105, 120),
    k.outline(1.5, k.rgb(90, 235, 235)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnShare);

  elements.push(
    k.add([
      k.text("📲 Compartilhar Certificado & Redes", {
        size: 12.5,
        font: "sans-serif",
      }),
      k.pos(k.width() / 2, k.height() / 2 + 78),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );

  btnShare.onHoverUpdate(() => {
    if (!isModalOpen) btnShare.color = k.rgb(25, 140, 155);
  });
  btnShare.onHoverEnd(() => {
    if (!isModalOpen) btnShare.color = k.rgb(18, 105, 120);
  });

  btnShare.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    const cardData = extractVictoryCardData(gameState, "Navegador Rápido");
    showShareModal(k, cardData, () => {
      isModalOpen = false;
    });
  });

  const destroyAll = () => {
    keyListeners.forEach((l) => {
      try { if (l && typeof l.cancel === "function") l.cancel(); } catch {}
    });
    elements.forEach((el) => k.destroy(el));
  };

  // Botão 3: Jogar Novamente
  const btnAgain = k.add([
    k.rect(190, 38, { radius: 8 }),
    k.pos(k.width() / 2 - 105, k.height() / 2 + 130),
    k.color(20, 120, 180),
    k.outline(2, k.rgb(100, 240, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnAgain);

  const btnAgainLabel = k.add([
    k.text(quizCompleted ? "Jogar Novamente [ENTER] 🔄" : "Jogar Novamente [R] 🔄", { size: 12, font: "sans-serif" }),
    k.pos(k.width() / 2 - 105, k.height() / 2 + 130),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(btnAgainLabel);

  const handlePlayAgain = () => {
    if (!canInteract || isModalOpen) return;
    audioSystem.playUiClick();
    destroyAll();
    onPlayAgain();
  };

  btnAgain.onHoverUpdate(() => {
    if (!isModalOpen) btnAgain.color = k.rgb(30, 140, 210);
  });
  btnAgain.onHoverEnd(() => {
    if (!isModalOpen) btnAgain.color = k.rgb(20, 120, 180);
  });
  btnAgain.onClick(handlePlayAgain);

  // Botão 4: Menu Principal
  const btnMenu = k.add([
    k.rect(190, 38, { radius: 8 }),
    k.pos(k.width() / 2 + 105, k.height() / 2 + 130),
    k.color(30, 60, 100),
    k.outline(2, k.rgb(120, 180, 240)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnMenu);

  elements.push(k.add([
    k.text("Menu Principal [ESC] 🏠", { size: 12, font: "sans-serif" }),
    k.pos(k.width() / 2 + 105, k.height() / 2 + 130),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  const handleReturnMenu = () => {
    if (!canInteract || isModalOpen) return;
    audioSystem.playUiClick();
    destroyAll();
    onReturnMenu();
  };

  btnMenu.onHoverUpdate(() => {
    if (!isModalOpen) btnMenu.color = k.rgb(45, 80, 130);
  });
  btnMenu.onHoverEnd(() => {
    if (!isModalOpen) btnMenu.color = k.rgb(30, 60, 100);
  });
  btnMenu.onClick(handleReturnMenu);

  const handleEnter = () => {
    if (!canInteract || isModalOpen) return;
    if (!quizCompleted) {
      openQuiz();
    } else {
      handlePlayAgain();
    }
  };

  keyListeners.push(k.onKeyPress("enter", handleEnter));
  keyListeners.push(k.onKeyPress("r", handlePlayAgain));
  keyListeners.push(k.onKeyPress("escape", handleReturnMenu));
  keyListeners.push(k.onKeyPress("m", handleReturnMenu));
}

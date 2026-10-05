import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import type { GameState } from "../systems/state";
import { isTop10Score } from "../systems/leaderboard";
import { showInitialsInputModal } from "./initialsInputModal";
import { extractVictoryCardData, generateAndDownloadVictoryCard } from "./victoryCard";
import { showQuizModal } from "./quizModal";
import { showShareModal } from "./shareModal";
import {
  animateModalEntrance,
  createOceanConfetti,
  attachButtonHoverEffect,
} from "./animationUtils";

export function showVictoryScreen(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
  // Se o jogador ainda não realizou o Quiz, convida para o Desafio Ecológico antes de consolidar o score final
  if (gameState.getQuizScore() === 0) {
    showQuizInvitationModal(k, gameState, () => {
      proceedToVictoryContent(k, gameState, onRestart);
    });
  } else {
    proceedToVictoryContent(k, gameState, onRestart);
  }
}

function proceedToVictoryContent(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
  const finalScore = gameState.calculateFinalScore();
  const distance = gameState.getDistance();
  const mode = gameState.getMode();

  if (isTop10Score(finalScore) || mode === "weekly") {
    showInitialsInputModal(
      k,
      finalScore,
      distance,
      mode,
      () => {
        renderVictoryContent(k, gameState, onRestart);
      },
      gameState.getWeekKey()
    );
  } else {
    renderVictoryContent(k, gameState, onRestart);
  }
}

function showQuizInvitationModal(k: KaboomCtx, gameState: GameState, onFinish: () => void) {
  const elements: any[] = [];
  const keyListeners: any[] = [];
  let isClosed = false;

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(720, screenW - 24);
  const cardH = Math.min(410, screenH - 20);

  audioSystem.playVictoryFanfare();

  // Fundo escuro semi-transparente
  elements.push(
    k.add([
      k.rect(screenW, screenH),
      k.pos(0, 0),
      k.color(4, 14, 32),
      k.opacity(0.95),
      k.area(),
      k.fixed(),
      k.z(350),
    ])
  );

  // Card do convite
  const card = k.add([
    k.rect(cardW, cardH, { radius: 14 }),
    k.pos(cX, cY),
    k.color(10, 30, 64),
    k.outline(2.5, k.rgb(255, 215, 80)),
    k.anchor("center"),
    k.scale(1),
    k.fixed(),
    k.z(351),
  ]);
  elements.push(card);
  animateModalEntrance(k, card);

  // Título
  elements.push(
    k.add([
      k.text("MIGRAÇÃO CONCLUÍDA COM SUCESSO! 🐋🎉", {
        size: accessibilitySystem.scaleFont(23),
        font: "Outfit",
      }),
      k.pos(cX, cY - cardH / 2 + 38),
      k.color(255, 215, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(352),
    ])
  );

  // Subtítulo
  elements.push(
    k.add([
      k.text("Você guiou a baleia ao Santuário de Arraial do Cabo!", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Inter",
      }),
      k.pos(cX, cY - cardH / 2 + 70),
      k.color(140, 220, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(352),
    ])
  );

  // Caixa de destaque do Desafio Ecológico
  const boxY = cY - 2;
  elements.push(
    k.add([
      k.rect(cardW - 60, 136, { radius: 10 }),
      k.pos(cX, boxY),
      k.color(14, 42, 85),
      k.outline(1, k.rgb(80, 170, 240)),
      k.anchor("center"),
      k.fixed(),
      k.z(352),
    ])
  );

  elements.push(
    k.add([
      k.text("🧪 DESAFIO ECOLÓGICO (+300 pts)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      k.pos(cX, boxY - 38),
      k.color(255, 225, 90),
      k.anchor("center"),
      k.fixed(),
      k.z(353),
    ])
  );

  elements.push(
    k.add([
      k.text(
        "Antes de emitir seu Certificado Oficial, responda a 3 perguntas rápidas sobre a rota para conquistar até +300 pontos de bônus no seu Eco-Score!",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          width: cardW - 100,
          align: "center",
          lineSpacing: 4.5,
        }
      ),
      k.pos(cX, boxY + 14),
      k.color(210, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(353),
    ])
  );

  let canInteract = false;
  k.wait(0.25, () => {
    canInteract = true;
  });

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;
    keyListeners.forEach((l) => {
      try {
        if (l && typeof l.cancel === "function") l.cancel();
      } catch {}
    });
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
  };

  const startQuiz = () => {
    if (!canInteract || isClosed) return;
    destroyAll();
    showQuizModal(
      k,
      gameState,
      () => {
        onFinish();
      },
      () => {
        onFinish();
      }
    );
  };

  const skipQuiz = () => {
    if (!canInteract || isClosed) return;
    destroyAll();
    onFinish();
  };

  // Botão 1: Iniciar Quiz (Destaque verde)
  const btnStart = k.add([
    k.rect(270, 46, { radius: 9 }),
    k.pos(cX - 145, cY + cardH / 2 - 36),
    k.color(20, 130, 80),
    k.outline(2, k.rgb(100, 255, 180)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(353),
  ]);
  elements.push(btnStart);

  elements.push(
    k.add([
      k.text("Fazer Quiz (ENTER) 🧪▶", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(cX - 145, cY + cardH / 2 - 36),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(354),
    ])
  );

  attachButtonHoverEffect(k, btnStart, {
    baseColor: [20, 130, 80],
    hoverColor: [28, 160, 100],
    baseScale: 1.0,
    hoverScale: 1.04,
  });
  btnStart.onClick(startQuiz);

  // Botão 2: Ver Certificado Direto
  const btnSkip = k.add([
    k.rect(250, 46, { radius: 9 }),
    k.pos(cX + 145, cY + cardH / 2 - 36),
    k.color(25, 55, 95),
    k.outline(1.5, k.rgb(80, 140, 210)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(353),
  ]);
  elements.push(btnSkip);

  elements.push(
    k.add([
      k.text("Ver Certificado (ESC) 📜", {
        size: accessibilitySystem.scaleFont(15),
        font: "Outfit",
      }),
      k.pos(cX + 145, cY + cardH / 2 - 36),
      k.color(210, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(354),
    ])
  );

  attachButtonHoverEffect(k, btnSkip, {
    baseColor: [25, 55, 95],
    hoverColor: [35, 75, 125],
    baseScale: 1.0,
    hoverScale: 1.04,
  });
  btnSkip.onClick(skipQuiz);

  // Teclas ENTER / ESPAÇO iniciam o quiz; ESC pula
  keyListeners.push(k.onKeyPress("enter", startQuiz));
  keyListeners.push(k.onKeyPress("space", startQuiz));
  keyListeners.push(k.onKeyPress("escape", skipQuiz));
}

function renderVictoryContent(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
  const highScore = gameState.getHighScore();
  const ancestralWisdom = gameState.getAncestralWisdom();

  // Toca a fanfarra triunfal da vitória
  audioSystem.playVictoryFanfare();

  // Fundo escuro com brilho azul turquesa
  k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(5, 25, 55),
    k.opacity(0.93),
    k.fixed(),
    k.z(200),
  ]);

  // Partículas de celebração no fundo (estrelas marinhas / luzes bioluminescentes)
  for (let i = 0; i < 20; i++) {
    const star = k.add([
      k.circle(k.rand(2, 4)),
      k.pos(k.rand(20, k.width() - 20), k.rand(20, k.height() - 20)),
      k.color(k.choose([k.rgb(255, 230, 120), k.rgb(100, 240, 255), k.rgb(255, 255, 255)])),
      k.opacity(k.rand(0.3, 0.8)),
      k.fixed(),
      k.z(200),
    ]);
    let starTime = k.rand(0, 10);
    star.onUpdate(() => {
      starTime += k.dt() * 3;
      star.opacity = 0.4 + Math.sin(starTime) * 0.35;
    });
  }

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;
  const cardW = Math.min(1000, screenW - 24);
  const cardH = Math.min(660, screenH - 20);

  // Card de vitória com borda dourada elegante (Fase 34.1 e 34.4)
  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(12, 45, 95),
    k.outline(3, k.rgb(255, 215, 0)), // Borda dourada
    k.anchor("center"),
    k.scale(1),
    k.fixed(),
    k.z(201),
  ]);
  animateModalEntrance(k, card);
  createOceanConfetti(k, 55);

  // Título vitória
  k.add([
    k.text("MIGRAÇÃO CONCLUÍDA COM SUCESSO! 🐋🎉", {
      size: accessibilitySystem.scaleFont(26),
      font: "Outfit",
    }),
    k.pos(cX, cY - cardH / 2 + 40),
    k.color(255, 215, 0),
    k.anchor("center"),
    k.fixed(),
    k.z(202),
  ]);

  // Subtítulo
  k.add([
    k.text("Você guiou a baleia ao Santuário Marinho de Arraial do Cabo (Ilha do Farol)!", {
      size: accessibilitySystem.scaleFont(15.5),
      width: cardW - 80,
      font: "Inter",
      align: "center",
    }),
    k.pos(cX, cY - cardH / 2 + 76),
    k.color(200, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(202),
  ]);

  const totalDistanceFormatted = GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR");

  const getRank = (score: number) => {
    if (score >= 3500) return "🥇 RANK S - Guardião dos Oceanos!";
    if (score >= 2500) return "🥈 RANK A - Protetor das Jubartes!";
    return "🥉 RANK B - Navegador Aprendiz";
  };

  const buildStatsText = () => {
    const currentScore = gameState.calculateFinalScore();
    const rank = getRank(currentScore);
    const breachText = gameState.hasBreached()
      ? "✨ Salto Majestoso (Breach): EXECUTADO (+500 pts)\n"
      : "";
    const quizText =
      gameState.getQuizScore() > 0
        ? `🧪 Desafio Ecológico: ${gameState.getQuizCorrectCount()}/3 Acertos (+${gameState.getQuizScore()} pts)\n`
        : "";

    return (
      `📏 Rota Migratória: 100% Concluída (${totalDistanceFormatted}m)\n` +
      `⏱️ Tempo de Viagem: ${gameState.getElapsedTime()} seg\n` +
      `🦐 Krill Coletado: ${gameState.getKrillCount()}\n` +
      `🗑️ Lixo Plástico Colidido: ${gameState.getTrashCount()}\n` +
      breachText +
      quizText +
      `\n📜 Sabedoria Ancestral:\n"${ancestralWisdom}"\n\n` +
      `⭐ Eco-Score Final: ${currentScore} pts  |  🏆 Recorde: ${highScore} pts\n\n` +
      `🎖️ Classificação: ${rank}`
    );
  };

  // Estatísticas na coluna esquerda
  const statsObj = k.add([
    k.text(buildStatsText(), {
      size: accessibilitySystem.scaleFont(14.5),
      font: "Inter",
      lineSpacing: 5.5,
      width: 510,
    }),
    k.pos(cX - cardW / 2 + 45, cY - cardH / 2 + 115),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(202),
  ]);

  // Coluna Direita: Painel do Desafio Ecológico (Quiz)
  const quizPanelX = cX + cardW / 2 - 200;
  const quizPanelY = cY + 5;

  k.add([
    k.rect(340, 340, { radius: 12 }),
    k.pos(quizPanelX, quizPanelY),
    k.color(16, 42, 82),
    k.outline(1.5, k.rgb(80, 180, 240)),
    k.anchor("center"),
    k.fixed(),
    k.z(202),
  ]);

  k.add([
    k.text("🧪 DESAFIO ECOLÓGICO", {
      size: accessibilitySystem.scaleFont(17.5),
      font: "Outfit",
    }),
    k.pos(quizPanelX, quizPanelY - 128),
    k.color(255, 220, 90),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);

  k.add([
    k.text(
      "Responda a 3 perguntas científicas sobre os animais, oceanografia e conservação da rota migratória e conquiste até +300 pontos de bônus!",
      {
        size: accessibilitySystem.scaleFont(14),
        width: 300,
        font: "Inter",
        align: "center",
        lineSpacing: 4.5,
      }
    ),
    k.pos(quizPanelX, quizPanelY - 45),
    k.color(200, 235, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);

  // Controle de estado modal para evitar cliques sobrepostos ou disparos indevidos de reinício
  let isModalOpen = false;
  const keyListeners: any[] = [];

  // Botão de ação do Quiz
  let quizCompleted = gameState.getQuizScore() > 0;

  const quizBtn = k.add([
    k.rect(300, 46, { radius: 9 }),
    k.pos(quizPanelX, quizPanelY + 118),
    k.color(quizCompleted ? k.rgb(18, 90, 60) : k.rgb(25, 120, 180)),
    k.outline(1.5, quizCompleted ? k.rgb(90, 240, 160) : k.rgb(110, 230, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(203),
  ]);

  const quizBtnLabel = k.add([
    k.text(
      quizCompleted
        ? `Quiz Concluído! (+${gameState.getQuizScore()} pts) ✓`
        : "Fazer Quiz [ENTER] (+300 pts) ▶",
      {
        size: accessibilitySystem.scaleFont(15),
        font: "Outfit",
      }
    ),
    k.pos(quizPanelX, quizPanelY + 118),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(204),
  ]);

  quizBtn.onHoverUpdate(() => {
    if (!quizCompleted && !isModalOpen) {
      quizBtn.color = k.rgb(35, 145, 215);
    }
  });
  quizBtn.onHoverEnd(() => {
    if (!quizCompleted && !isModalOpen) {
      quizBtn.color = k.rgb(25, 120, 180);
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
        quizBtn.color = k.rgb(18, 90, 60);
        quizBtn.outline.color = k.rgb(90, 240, 160);
        quizBtnLabel.text = `Quiz: +${scoreGained} pts (${correctCount}/3) ✓`;
        statsObj.text = buildStatsText();
        restartLabel.text = "Jogar Novamente [ENTER] 🔄";
      },
      () => {
        isModalOpen = false;
      }
    );
  };

  quizBtn.onClick(openQuiz);

  // Botões de Ação na parte inferior do modal
  const btnW = 280;
  const btnH = 46;
  const bottomY = cY + cardH / 2 - 42;

  // 1. Botão de Baixar Certificado PNG
  const downloadButton = k.add([
    k.rect(btnW, btnH, { radius: 9 }),
    k.pos(cX - 300, bottomY),
    k.color(15, 105, 75),
    k.outline(2, k.rgb(120, 255, 180)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(202),
  ]);

  const downloadLabel = k.add([
    k.text("Baixar PNG 📥", {
      size: accessibilitySystem.scaleFont(15.5),
      font: "Outfit",
    }),
    k.pos(cX - 300, bottomY),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);

  attachButtonHoverEffect(k, downloadButton, {
    baseColor: [15, 105, 75],
    hoverColor: [20, 145, 100],
    baseScale: 1.0,
    hoverScale: 1.04,
    canInteract: () => !isModalOpen,
  });
  downloadButton.onClick(() => {
    if (isModalOpen) return;
    const cardData = extractVictoryCardData(gameState);
    const success = generateAndDownloadVictoryCard(cardData);
    if (success) {
      downloadLabel.text = "Baixado! ✓";
      k.wait(2.0, () => {
        downloadLabel.text = "Baixar PNG 📥";
      });
    }
  });

  // 2. Botão de Compartilhar Certificado nas Redes Sociais
  const shareButton = k.add([
    k.rect(btnW, btnH, { radius: 9 }),
    k.pos(cX, bottomY),
    k.color(18, 105, 120),
    k.outline(2, k.rgb(90, 235, 235)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(202),
  ]);

  k.add([
    k.text("Compartilhar 📲", {
      size: accessibilitySystem.scaleFont(15.5),
      font: "Outfit",
    }),
    k.pos(cX, bottomY),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);

  attachButtonHoverEffect(k, shareButton, {
    baseColor: [18, 105, 120],
    hoverColor: [25, 140, 155],
    baseScale: 1.0,
    hoverScale: 1.04,
    canInteract: () => !isModalOpen,
  });
  shareButton.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    const cardData = extractVictoryCardData(gameState);
    showShareModal(k, cardData, () => {
      isModalOpen = false;
    });
  });

  // 3. Botão de reinício (suporta toque mobile e clique)
  const restartButton = k.add([
    k.rect(btnW, btnH, { radius: 9 }),
    k.pos(cX + 300, bottomY),
    k.color(20, 90, 140),
    k.outline(2, k.rgb(100, 240, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(202),
  ]);

  const restartLabel = k.add([
    k.text(quizCompleted ? "Jogar Novamente [ENTER] 🔄" : "Jogar Novamente [R] 🔄", {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    k.pos(cX + 300, bottomY),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);

  let isRestarting = false;
  let canRestart = false;
  k.wait(0.4, () => {
    canRestart = true;
  });

  const triggerRestart = () => {
    if (!canRestart || isRestarting || isModalOpen) return;
    isRestarting = true;
    keyListeners.forEach((l) => {
      try {
        if (l && typeof l.cancel === "function") l.cancel();
      } catch {}
    });
    onRestart();
  };

  attachButtonHoverEffect(k, restartButton, {
    baseColor: [20, 90, 140],
    hoverColor: [30, 140, 200],
    baseScale: 1.0,
    hoverScale: 1.04,
    canInteract: () => !isModalOpen && canRestart,
  });
  restartButton.onClick(triggerRestart);

  const handleEnter = () => {
    if (isModalOpen || !canRestart) return;
    if (!quizCompleted) {
      openQuiz();
    } else {
      triggerRestart();
    }
  };

  keyListeners.push(k.onKeyPress("enter", handleEnter));
  keyListeners.push(k.onKeyPress("r", triggerRestart));
}

import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import type { GameState } from "../systems/state";
import quizData from "../../data/quiz.json";

export interface QuizQuestion {
  id: string;
  factId: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function showQuizModal(
  k: KaboomCtx,
  gameState: GameState,
  onComplete: (scoreGained: number, correctCount: number) => void,
  onCancel: () => void
) {
  audioSystem.playUiClick();

  // Seleciona 3 perguntas pseudo-aleatórias com Fisher-Yates
  const shuffled = shuffleArray(quizData as QuizQuestion[]);
  const questions = shuffled.slice(0, 3);

  let currentQuestionIdx = 0;
  let correctAnswers = 0;
  let scoreGained = 0;
  let isAnswered = false;
  let canAnswer = false;
  let isClosed = false;

  let currentSelectOption: ((idx: number) => void) | null = null;
  let onAdvanceCallback: (() => void) | null = null;

  const elements: any[] = [];
  let dynamicElements: any[] = [];
  const keyListeners: any[] = [];

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  // Dimensões compactas e responsivas para nunca transbordar em 800x450 ou telas menores
  const cardW = Math.min(620, screenW - 24);
  const cardH = Math.min(410, screenH - 24);

  // Fundo escuro semi-transparente que bloqueia cliques na tela subjacente
  const backdrop = k.add([
    k.rect(screenW, screenH),
    k.pos(0, 0),
    k.color(4, 12, 28),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(500),
  ]);
  elements.push(backdrop);

  // Card do Quiz com contorno ciano
  const card = k.add([
    k.rect(cardW, cardH, { radius: 12 }),
    k.pos(cX, cY),
    k.color(10, 30, 64),
    k.outline(2.5, k.rgb(100, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(501),
  ]);
  elements.push(card);

  // Título do Quiz no topo do card
  elements.push(k.add([
    k.text("DESAFIO DE CONHECIMENTO ECOLÓGICO 🧪🐋", { size: 16, font: "sans-serif" }),
    k.pos(cX, cY - cardH / 2 + 28),
    k.color(255, 215, 80),
    k.anchor("center"),
    k.fixed(),
    k.z(502),
  ]));

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;

    keyListeners.forEach((l) => {
      try {
        if (l && typeof l.cancel === "function") l.cancel();
      } catch {}
    });

    dynamicElements.forEach((el) => {
      try { k.destroy(el); } catch {}
    });
    elements.forEach((el) => {
      try { k.destroy(el); } catch {}
    });
  };

  const doClose = () => {
    audioSystem.playUiClick();
    destroyAll();
    onCancel();
  };

  // Botão fechar (✕) no canto superior direito
  const btnClose = k.add([
    k.rect(28, 28, { radius: 6 }),
    k.pos(cX + cardW / 2 - 24, cY - cardH / 2 + 26),
    k.color(25, 45, 80),
    k.outline(1, k.rgb(100, 200, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(505),
  ]);
  elements.push(btnClose);

  elements.push(k.add([
    k.text("✕", { size: 14, font: "sans-serif" }),
    k.pos(cX + cardW / 2 - 24, cY - cardH / 2 + 26),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(506),
  ]));

  btnClose.onHoverUpdate(() => {
    btnClose.color = k.rgb(150, 40, 40);
  });
  btnClose.onHoverEnd(() => {
    btnClose.color = k.rgb(25, 45, 80);
  });
  btnClose.onClick(doClose);
  keyListeners.push(k.onKeyPress("escape", doClose));

  // Suporte a tecla Enter / Espaço para avançar após responder
  keyListeners.push(k.onKeyPress("enter", () => {
    if (isAnswered && onAdvanceCallback) {
      onAdvanceCallback();
    }
  }));
  keyListeners.push(k.onKeyPress("space", () => {
    if (isAnswered && onAdvanceCallback) {
      onAdvanceCallback();
    }
  }));

  // Registro único dos atalhos de teclado 1, 2, 3, 4 ou A, B, C, D
  const optionKeys = [
    ["1", "a"],
    ["2", "b"],
    ["3", "c"],
    ["4", "d"],
  ];

  optionKeys.forEach((keys, idx) => {
    keys.forEach((key) => {
      const handler = k.onKeyPress(key as any, () => {
        if (currentSelectOption && canAnswer && !isAnswered) {
          currentSelectOption(idx);
        }
      });
      keyListeners.push(handler);
    });
  });

  const renderQuestion = () => {
    dynamicElements.forEach((el) => {
      try { k.destroy(el); } catch {}
    });
    dynamicElements = [];
    isAnswered = false;
    canAnswer = false;
    onAdvanceCallback = null;

    // Intervalo de segurança (180ms) para evitar que o clique que abriu o modal acione a alternativa abaixo do cursor
    k.wait(0.18, () => {
      if (!isClosed && !isAnswered) {
        canAnswer = true;
      }
    });

    const q = questions[currentQuestionIdx];

    // Indicador de Progresso e Pontuação
    dynamicElements.push(k.add([
      k.text(
        `Questão ${currentQuestionIdx + 1} de ${questions.length}  •  Eco-Bônus: +${scoreGained} pts`,
        { size: 12, font: "sans-serif" }
      ),
      k.pos(cX, cY - cardH / 2 + 56),
      k.color(140, 220, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ]));

    // Pergunta em destaque
    dynamicElements.push(k.add([
      k.text(q.question, { size: 13.5, font: "sans-serif", width: cardW - 50, lineSpacing: 3, align: "center" }),
      k.pos(cX, cY - cardH / 2 + 96),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(502),
    ]));

    // 4 Botões de Alternativas
    const optionLetters = ["A", "B", "C", "D"];
    const startY = cY - cardH / 2 + 148;
    const optionSpacing = 36;
    const btnW = cardW - 50;
    const btnH = 30;

    const optionButtons: any[] = [];

    const selectOption = (optIdx: number) => {
      if (!canAnswer || isAnswered) return;
      isAnswered = true;

      const isCorrect = optIdx === q.correctIndex;
      if (isCorrect) {
        audioSystem.playPowerupCollect();
        correctAnswers++;
        scoreGained += 100;
        gameState.addQuizScore(100, true);
      } else {
        audioSystem.playTrashThud();
      }

      // Atualiza cores de todos os botões para clareza pedagógica
      optionButtons.forEach((btn, idx) => {
        if (idx === q.correctIndex) {
          // Revela a resposta correta em verde luminoso
          btn.color = k.rgb(25, 135, 75);
          btn.outline = { width: 2, color: k.rgb(90, 255, 140) };
        } else if (idx === optIdx && !isCorrect) {
          // Destaca a escolha errada em vermelho
          btn.color = k.rgb(150, 40, 40);
          btn.outline = { width: 2, color: k.rgb(255, 100, 100) };
        } else {
          // Esmaece as outras alternativas
          btn.color = k.rgb(12, 28, 52);
          btn.outline = { width: 1, color: k.rgb(40, 80, 120) };
          btn.opacity = 0.6;
        }
      });

      // Feedback explicativo sucinto
      dynamicElements.push(k.add([
        k.text(
          `${isCorrect ? "✅ Correto! (+100 pts)" : "❌ Incorreto!"} ${q.explanation}`,
          { size: 11, font: "sans-serif", width: cardW - 50, lineSpacing: 2.5, align: "center" }
        ),
        k.pos(cX, cY + cardH / 2 - 68),
        k.color(isCorrect ? k.rgb(140, 255, 180) : k.rgb(255, 190, 170)),
        k.anchor("center"),
        k.fixed(),
        k.z(504),
      ]));

      // Botão Avançar / Concluir
      const isLastQuestion = currentQuestionIdx === questions.length - 1;
      const btnNext = k.add([
        k.rect(190, 32, { radius: 6 }),
        k.pos(cX, cY + cardH / 2 - 26),
        k.color(25, 110, 180),
        k.outline(1.5, k.rgb(100, 230, 255)),
        k.anchor("center"),
        k.area(),
        k.fixed(),
        k.z(505),
      ]);
      dynamicElements.push(btnNext);

      dynamicElements.push(k.add([
        k.text(isLastQuestion ? "Ver Resultado 🏆 (ENTER)" : "Próxima Pergunta ▶ (ENTER)", {
          size: 11.5,
          font: "sans-serif",
        }),
        k.pos(cX, cY + cardH / 2 - 26),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(506),
      ]));

      btnNext.onHoverUpdate(() => {
        btnNext.color = k.rgb(35, 140, 220);
      });
      btnNext.onHoverEnd(() => {
        btnNext.color = k.rgb(25, 110, 180);
      });

      const advance = () => {
        audioSystem.playUiClick();
        if (isLastQuestion) {
          renderSummary();
        } else {
          currentQuestionIdx++;
          renderQuestion();
        }
      };

      onAdvanceCallback = advance;
      btnNext.onClick(advance);
    };

    currentSelectOption = selectOption;

    q.options.forEach((optText, optIdx) => {
      const optY = startY + optIdx * optionSpacing;

      const optBtn = k.add([
        k.rect(btnW, btnH, { radius: 6 }),
        k.pos(cX, optY),
        k.color(18, 48, 90),
        k.outline(1, k.rgb(80, 150, 220)),
        k.anchor("center"),
        k.area(),
        k.fixed(),
        k.z(503),
      ]);
      dynamicElements.push(optBtn);
      optionButtons.push(optBtn);

      const optLabel = k.add([
        k.text(`${optionLetters[optIdx]}) ${optText}`, {
          size: 11.5,
          font: "sans-serif",
          width: btnW - 20,
        }),
        k.pos(cX - btnW / 2 + 12, optY),
        k.color(230, 245, 255),
        k.anchor("left"),
        k.fixed(),
        k.z(504),
      ]);
      dynamicElements.push(optLabel);

      optBtn.onHoverUpdate(() => {
        if (canAnswer && !isAnswered) {
          optBtn.color = k.rgb(28, 75, 135);
          optBtn.outline.color = k.rgb(120, 230, 255);
        }
      });
      optBtn.onHoverEnd(() => {
        if (canAnswer && !isAnswered) {
          optBtn.color = k.rgb(18, 48, 90);
          optBtn.outline.color = k.rgb(80, 150, 220);
        }
      });

      optBtn.onClick(() => {
        if (canAnswer && !isAnswered) {
          selectOption(optIdx);
        }
      });
    });
  };

  const renderSummary = () => {
    dynamicElements.forEach((el) => {
      try { k.destroy(el); } catch {}
    });
    dynamicElements = [];
    currentSelectOption = null;
    onAdvanceCallback = null;

    audioSystem.playVictoryFanfare();

    dynamicElements.push(k.add([
      k.text("PARABÉNS PELO DESEMPENHO ECOLÓGICO! 🎉", { size: 16, font: "sans-serif" }),
      k.pos(cX, cY - 80),
      k.color(255, 215, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ]));

    dynamicElements.push(k.add([
      k.text(
        `Você acertou ${correctAnswers} de ${questions.length} perguntas!\n` +
        `Bônus Conquistado: +${scoreGained} Eco-Pontos somados à sua pontuação!`,
        { size: 13.5, font: "sans-serif", lineSpacing: 5, align: "center" }
      ),
      k.pos(cX, cY - 15),
      k.color(210, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ]));

    dynamicElements.push(k.add([
      k.text(
        "Seus conhecimentos sobre a migração e conservação marinha\n" +
        "foram registrados no seu Certificado Oficial da Expedição!",
        { size: 11.5, font: "sans-serif", lineSpacing: 3.5, align: "center" }
      ),
      k.pos(cX, cY + 48),
      k.color(160, 215, 245),
      k.anchor("center"),
      k.fixed(),
      k.z(503),
    ]));

    const btnFinish = k.add([
      k.rect(240, 36, { radius: 7 }),
      k.pos(cX, cY + 115),
      k.color(20, 130, 80),
      k.outline(2, k.rgb(100, 255, 180)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(505),
    ]);
    dynamicElements.push(btnFinish);

    dynamicElements.push(k.add([
      k.text("Concluir e Voltar 📜 (ENTER)", { size: 12.5, font: "sans-serif" }),
      k.pos(cX, cY + 115),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(506),
    ]));

    btnFinish.onHoverUpdate(() => {
      btnFinish.color = k.rgb(28, 160, 100);
    });
    btnFinish.onHoverEnd(() => {
      btnFinish.color = k.rgb(20, 130, 80);
    });

    const finish = () => {
      audioSystem.playUiClick();
      destroyAll();
      onComplete(scoreGained, correctAnswers);
    };

    onAdvanceCallback = finish;
    btnFinish.onClick(finish);
  };

  renderQuestion();
}

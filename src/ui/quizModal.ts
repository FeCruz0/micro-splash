/**
 * Modal de Quiz Ecológico (Fase 21 / WBS 2.16) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte unificado a IRenderEngine (PixiJS v8)
 * e compatibilidade reversa para contextos legados sem nenhum uso de "any".
 */

import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import type { GameState } from "../systems/state";
import { recordQuizResult } from "../systems/cumulativeStats";
import { analytics } from "../services/analytics";
import { telemetrySystem } from "../systems/telemetrySystem";
import quizData from "../../data/quiz.json";
import { getRandomInteger } from "../utils/random";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface QuizQuestion {
  id: string;
  factId: string;
  biome?: "antartica" | "pelagico" | "costa_urbana" | "canyons" | "arraial";
  difficulty?: "facil" | "medio" | "dificil";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getRandomInteger(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isWomenInScienceQuestion(question: QuizQuestion): boolean {
  return question.id.startsWith("q_mulheres_") || question.factId.startsWith("mulheres_");
}

export function selectQuizQuestions(
  allQuestions: QuizQuestion[],
  unlockedFactIds?: string[]
): QuizQuestion[] {
  const unlockedSet = new Set(unlockedFactIds || []);

  const selected: QuizQuestion[] = [];
  const selectedIds = new Set<string>();

  // Cota Especial Feira de Ciências: pelo menos 1 pergunta obrigatória sobre Mulheres na Ciência
  const womenQuestions = allQuestions.filter(isWomenInScienceQuestion);
  if (womenQuestions.length > 0) {
    const unlockedWomen = womenQuestions.filter((q) => unlockedSet.has(q.factId));
    const candidatePool = unlockedWomen.length > 0 ? unlockedWomen : womenQuestions;
    const chosenWomenQuestion = shuffleArray(candidatePool)[0];
    selected.push(chosenWomenQuestion);
    selectedIds.add(chosenWomenQuestion.id);
  }

  // Se houver outros fatos desbloqueados na rota, prioriza até 1 questão adicional relacionada
  if (unlockedSet.size > 0 && selected.length < 2) {
    const matched = shuffleArray(
      allQuestions.filter((q) => unlockedSet.has(q.factId) && !selectedIds.has(q.id))
    );
    if (matched.length > 0) {
      selected.push(matched[0]);
      selectedIds.add(matched[0].id);
    }
  }

  // Completa as 3 perguntas priorizando diversidade de dificuldade (fácil, médio, difícil)
  const difficulties: ("facil" | "medio" | "dificil")[] = ["facil", "medio", "dificil"];
  for (const diff of difficulties) {
    if (selected.length >= 3) break;
    const pool = shuffleArray(
      allQuestions.filter((q) => q.difficulty === diff && !selectedIds.has(q.id))
    );
    if (pool.length > 0) {
      selected.push(pool[0]);
      selectedIds.add(pool[0].id);
    }
  }

  // Fallback caso ainda não tenha 3 perguntas
  if (selected.length < 3) {
    const remaining = shuffleArray(allQuestions.filter((q) => !selectedIds.has(q.id)));
    for (const q of remaining) {
      if (selected.length >= 3) break;
      selected.push(q);
      selectedIds.add(q.id);
    }
  }

  return shuffleArray(selected.slice(0, 3));
}

export interface LegacyQuizModalContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center" | "left" | "topleft"): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  area?(): unknown;
  scale?(factor: number): unknown;
  text(content: string, options?: unknown): unknown;
  destroy?(target: unknown): void;
  wait?(duration: number, callback: () => void): void;
  onKeyPress?(key: string, callback: () => void): { cancel?: () => void };
  vec2?(x: number, y: number): { x: number; y: number };
}

export function showQuizModal(
  engineOrContext: IRenderEngine | LegacyQuizModalContext,
  gameState: GameState,
  onComplete: (scoreGained: number, correctCount: number) => void,
  onCancel: () => void
): void {
  audioSystem.playUiClick();

  const unlockedFacts =
    typeof gameState.getUnlockedFactIds === "function" ? gameState.getUnlockedFactIds() : [];
  const questions = selectQuizQuestions(quizData as QuizQuestion[], unlockedFacts);

  let currentQuestionIdx = 0;
  let correctAnswers = 0;
  let scoreGained = 0;
  let isAnswered = false;
  let canAnswer = false;
  let isClosed = false;

  let currentSelectOption: ((idx: number) => void) | null = null;
  let onAdvanceCallback: (() => void) | null = null;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const screenW = dimensions.width;
    const screenH = dimensions.height;
    const cX = screenW / 2;
    const cY = screenH / 2;

    const cardW = Math.min(960, screenW - 24);
    const cardH = Math.min(650, screenH - 20);

    const staticNodes: Array<IGraphicsNode | ITextNode> = [];
    let dynamicNodes: Array<IGraphicsNode | ITextNode> = [];

    const destroyAll = () => {
      if (isClosed) return;
      isClosed = true;

      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", handleKey);
      }

      dynamicNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      dynamicNodes = [];

      staticNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      staticNodes.length = 0;
    };

    const doClose = () => {
      audioSystem.playUiClick();
      destroyAll();
      onCancel();
    };

    // Fundo escuro semi-transparente
    const backdrop = engineOrContext.createGraphics("quiz-backdrop");
    backdrop.drawRect(0, 0, screenW, screenH, {
      fill: { color: [4, 12, 28], alpha: 0.95 },
    });
    backdrop.setZIndex(500);
    stageRoot.addChild(backdrop);
    staticNodes.push(backdrop);

    // Card do Quiz
    const card = engineOrContext.createGraphics("quiz-card");
    card.drawRoundedRect(cX - cardW / 2, cY - cardH / 2, cardW, cardH, 16, {
      fill: { color: [10, 28, 56], alpha: 1 },
      stroke: { color: [100, 220, 255], width: 2.5 },
    });
    card.setZIndex(501);
    stageRoot.addChild(card);
    staticNodes.push(card);

    // Título do Quiz
    const titleText = engineOrContext.createText(
      "DESAFIO DE CONHECIMENTO ECOLÓGICO 🧪🐋",
      {
        fontSize: accessibilitySystem.scaleFont(26),
        fontFamily: "Outfit",
        color: [255, 215, 80],
        align: "center",
      },
      "quiz-title"
    );
    titleText.setPosition(cX, cY - cardH / 2 + 32);
    titleText.setAlign("center");
    const nativeTitle = titleText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeTitle?.anchor?.set) nativeTitle.anchor.set(0.5, 0.5);
    titleText.setZIndex(502);
    stageRoot.addChild(titleText);
    staticNodes.push(titleText);

    // Botão Fechar (✕)
    const btnCloseX = cX + cardW / 2 - 28;
    const btnCloseY = cY - cardH / 2 + 28;
    const btnClose = engineOrContext.createGraphics("quiz-btn-close");
    const drawCloseBtn = (hovered: boolean) => {
      btnClose.clear();
      btnClose.drawRoundedRect(btnCloseX - 17, btnCloseY - 17, 34, 34, 8, {
        fill: { color: hovered ? [150, 40, 40] : [25, 45, 80], alpha: 1 },
        stroke: { color: [100, 200, 255], width: 1 },
      });
    };
    drawCloseBtn(false);
    btnClose.setZIndex(505);
    stageRoot.addChild(btnClose);
    staticNodes.push(btnClose);

    const closeText = engineOrContext.createText(
      "✕",
      {
        fontSize: accessibilitySystem.scaleFont(16),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "quiz-close-label"
    );
    closeText.setPosition(btnCloseX, btnCloseY);
    closeText.setAlign("center");
    const nativeClose = closeText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeClose?.anchor?.set) nativeClose.anchor.set(0.5, 0.5);
    closeText.setZIndex(506);
    stageRoot.addChild(closeText);
    staticNodes.push(closeText);

    const nativeCloseBtn = btnClose.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeCloseBtn?.on) {
      nativeCloseBtn.eventMode = "static";
      nativeCloseBtn.cursor = "pointer";
      nativeCloseBtn.on("pointerover", () => drawCloseBtn(true));
      nativeCloseBtn.on("pointerout", () => drawCloseBtn(false));
      nativeCloseBtn.on("pointerdown", doClose);
    }

    const handleKey = (e: KeyboardEvent) => {
      if (isClosed) return;
      if (e.key === "Escape") {
        doClose();
      } else if (e.key === "Enter" || e.key === " ") {
        if (isAnswered && onAdvanceCallback) {
          onAdvanceCallback();
        }
      } else if (canAnswer && !isAnswered && currentSelectOption) {
        if (e.key === "1" || e.key.toLowerCase() === "a") currentSelectOption(0);
        else if (e.key === "2" || e.key.toLowerCase() === "b") currentSelectOption(1);
        else if (e.key === "3" || e.key.toLowerCase() === "c") currentSelectOption(2);
        else if (e.key === "4" || e.key.toLowerCase() === "d") currentSelectOption(3);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKey);
    }

    const renderQuestion = () => {
      dynamicNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      dynamicNodes = [];
      isAnswered = false;
      canAnswer = false;
      onAdvanceCallback = null;

      setTimeout(() => {
        if (!isClosed && !isAnswered) {
          canAnswer = true;
        }
      }, 180);

      const q = questions[currentQuestionIdx];

      const biomeLabels: Record<string, string> = {
        antartica: "❄️ Antártica",
        pelagico: "🌊 Mar Aberto",
        costa_urbana: "🏭 Costa Urbana",
        canyons: "🌀 Cânions",
        arraial: "☀️ Arraial",
      };
      const diffLabels: Record<string, string> = {
        facil: "Fácil",
        medio: "Médio",
        dificil: "Desafio",
      };

      const metaParts = [
        `Questão ${currentQuestionIdx + 1}/${questions.length}`,
        q.biome ? biomeLabels[q.biome] || q.biome : "",
        q.difficulty ? `Nível ${diffLabels[q.difficulty] || q.difficulty}` : "",
        `Bônus: +${scoreGained} pts`,
      ].filter(Boolean);

      const metaText = engineOrContext.createText(
        metaParts.join("  •  "),
        {
          fontSize: accessibilitySystem.scaleFont(15),
          fontFamily: "Outfit",
          color: [140, 220, 255],
          align: "center",
        },
        "quiz-meta"
      );
      metaText.setPosition(cX, cY - cardH / 2 + 64);
      metaText.setAlign("center");
      const nativeMeta = metaText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
      if (nativeMeta?.anchor?.set) nativeMeta.anchor.set(0.5, 0.5);
      metaText.setZIndex(502);
      stageRoot.addChild(metaText);
      dynamicNodes.push(metaText);

      const questionText = engineOrContext.createText(
        q.question,
        {
          fontSize: accessibilitySystem.scaleFont(19),
          fontFamily: "Outfit",
          color: [255, 255, 255],
          align: "center",
          wordWrapWidth: cardW - 64,
          lineSpacing: 4.5,
        },
        "quiz-question"
      );
      questionText.setPosition(cX, cY - cardH / 2 + 112);
      questionText.setAlign("center");
      const nativeQ = questionText.getNativeNode<{
        anchor?: { set(x: number, y: number): void };
      }>();
      if (nativeQ?.anchor?.set) nativeQ.anchor.set(0.5, 0.5);
      questionText.setZIndex(502);
      stageRoot.addChild(questionText);
      dynamicNodes.push(questionText);

      const optionLetters = ["A", "B", "C", "D"];
      const startY = cY - cardH / 2 + 180;
      const optionSpacing = 56;
      const btnW = cardW - 64;
      const btnH = 48;

      const optionButtons: IGraphicsNode[] = [];

      const selectOption = (optIdx: number) => {
        if (!canAnswer || isAnswered) return;
        isAnswered = true;

        const isCorrect = optIdx === q.correctIndex;
        telemetrySystem.recordQuizAnswer(isCorrect);
        analytics.trackQuizTaken({
          questionId: q.id,
          isCorrect,
          biome: q.biome || "desconhecido",
        });

        if (isCorrect) {
          audioSystem.playPowerupCollect();
          correctAnswers++;
          scoreGained += 100;
          gameState.addQuizScore(100, true);
        } else {
          audioSystem.playTrashThud();
        }

        optionButtons.forEach((btn, idx) => {
          btn.clear();
          const optY = startY + idx * optionSpacing;
          if (idx === q.correctIndex) {
            btn.drawRoundedRect(cX - btnW / 2, optY - btnH / 2, btnW, btnH, 9, {
              fill: { color: [25, 135, 75], alpha: 1 },
              stroke: { color: [90, 255, 140], width: 2 },
            });
          } else if (idx === optIdx && !isCorrect) {
            btn.drawRoundedRect(cX - btnW / 2, optY - btnH / 2, btnW, btnH, 9, {
              fill: { color: [150, 40, 40], alpha: 1 },
              stroke: { color: [255, 100, 100], width: 2 },
            });
          } else {
            btn.drawRoundedRect(cX - btnW / 2, optY - btnH / 2, btnW, btnH, 9, {
              fill: { color: [12, 28, 52], alpha: 0.6 },
              stroke: { color: [40, 80, 120], width: 1 },
            });
          }
        });

        const feedbackText = engineOrContext.createText(
          `${isCorrect ? "✅ Correto! (+100 pts)" : "❌ Incorreto!"} ${q.explanation}`,
          {
            fontSize: accessibilitySystem.scaleFont(14.5),
            fontFamily: "Inter",
            color: isCorrect ? [140, 255, 180] : [255, 190, 170],
            align: "center",
            wordWrapWidth: cardW - 64,
            lineSpacing: 3.5,
          },
          "quiz-feedback"
        );
        feedbackText.setPosition(cX, cY + cardH / 2 - 76);
        feedbackText.setAlign("center");
        const nativeFb = feedbackText.getNativeNode<{
          anchor?: { set(x: number, y: number): void };
        }>();
        if (nativeFb?.anchor?.set) nativeFb.anchor.set(0.5, 0.5);
        feedbackText.setZIndex(504);
        stageRoot.addChild(feedbackText);
        dynamicNodes.push(feedbackText);

        const isLastQuestion = currentQuestionIdx === questions.length - 1;
        const btnNextY = cY + cardH / 2 - 30;
        const btnNext = engineOrContext.createGraphics("quiz-btn-next");
        const drawNextBtn = (hovered: boolean) => {
          btnNext.clear();
          btnNext.drawRoundedRect(cX - 140, btnNextY - 23, 280, 46, 9, {
            fill: { color: hovered ? [35, 140, 220] : [25, 110, 180], alpha: 1 },
            stroke: { color: [100, 230, 255], width: 1.5 },
          });
        };
        drawNextBtn(false);
        btnNext.setZIndex(505);
        stageRoot.addChild(btnNext);
        dynamicNodes.push(btnNext);

        const btnNextText = engineOrContext.createText(
          isLastQuestion ? "Ver Resultado 🏆 (ENTER)" : "Próxima Pergunta ▶ (ENTER)",
          {
            fontSize: accessibilitySystem.scaleFont(16),
            fontFamily: "Outfit",
            color: [255, 255, 255],
            align: "center",
          },
          "quiz-next-label"
        );
        btnNextText.setPosition(cX, btnNextY);
        btnNextText.setAlign("center");
        const nativeNextLabel = btnNextText.getNativeNode<{
          anchor?: { set(x: number, y: number): void };
        }>();
        if (nativeNextLabel?.anchor?.set) nativeNextLabel.anchor.set(0.5, 0.5);
        btnNextText.setZIndex(506);
        stageRoot.addChild(btnNextText);
        dynamicNodes.push(btnNextText);

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

        const nativeNext = btnNext.getNativeNode<{
          eventMode?: string;
          cursor?: string;
          on?(evt: string, fn: () => void): void;
        }>();
        if (nativeNext?.on) {
          nativeNext.eventMode = "static";
          nativeNext.cursor = "pointer";
          nativeNext.on("pointerover", () => drawNextBtn(true));
          nativeNext.on("pointerout", () => drawNextBtn(false));
          nativeNext.on("pointerdown", advance);
        }
      };

      currentSelectOption = selectOption;

      q.options.forEach((optText, optIdx) => {
        const optY = startY + optIdx * optionSpacing;
        const optBtn = engineOrContext.createGraphics(`quiz-opt-${optIdx}`);
        const drawOption = (hovered: boolean) => {
          optBtn.clear();
          optBtn.drawRoundedRect(cX - btnW / 2, optY - btnH / 2, btnW, btnH, 9, {
            fill: { color: hovered ? [28, 75, 135] : [18, 48, 90], alpha: 1 },
            stroke: { color: hovered ? [120, 230, 255] : [60, 120, 190], width: 1.5 },
          });
        };
        drawOption(false);
        optBtn.setZIndex(503);
        stageRoot.addChild(optBtn);
        dynamicNodes.push(optBtn);
        optionButtons.push(optBtn);

        const optLabel = engineOrContext.createText(
          `${optionLetters[optIdx]}) ${optText}`,
          {
            fontSize: accessibilitySystem.scaleFont(16),
            fontFamily: "Inter",
            color: [230, 245, 255],
            align: "left",
            wordWrapWidth: btnW - 28,
          },
          `quiz-opt-label-${optIdx}`
        );
        optLabel.setPosition(cX - btnW / 2 + 16, optY - 10);
        optLabel.setZIndex(504);
        stageRoot.addChild(optLabel);
        dynamicNodes.push(optLabel);

        const nativeBtn = optBtn.getNativeNode<{
          eventMode?: string;
          cursor?: string;
          on?(evt: string, fn: () => void): void;
        }>();
        if (nativeBtn?.on) {
          nativeBtn.eventMode = "static";
          nativeBtn.cursor = "pointer";
          nativeBtn.on("pointerover", () => {
            if (canAnswer && !isAnswered) drawOption(true);
          });
          nativeBtn.on("pointerout", () => {
            if (canAnswer && !isAnswered) drawOption(false);
          });
          nativeBtn.on("pointerdown", () => {
            if (canAnswer && !isAnswered) selectOption(optIdx);
          });
        }
      });
    };

    const renderSummary = () => {
      dynamicNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      dynamicNodes = [];
      currentSelectOption = null;
      onAdvanceCallback = null;

      audioSystem.playVictoryFanfare();

      const congratText = engineOrContext.createText(
        "PARABÉNS PELO DESEMPENHO ECOLÓGICO! 🎉",
        {
          fontSize: accessibilitySystem.scaleFont(26),
          fontFamily: "Outfit",
          color: [255, 215, 80],
          align: "center",
        },
        "quiz-summary-title"
      );
      congratText.setPosition(cX, cY - 95);
      congratText.setAlign("center");
      const nativeCongrat = congratText.getNativeNode<{
        anchor?: { set(x: number, y: number): void };
      }>();
      if (nativeCongrat?.anchor?.set) nativeCongrat.anchor.set(0.5, 0.5);
      congratText.setZIndex(503);
      stageRoot.addChild(congratText);
      dynamicNodes.push(congratText);

      const scoreText = engineOrContext.createText(
        `Você acertou ${correctAnswers} de ${questions.length} perguntas!\n` +
          `Bônus Conquistado: +${scoreGained} Eco-Pontos somados à sua pontuação!`,
        {
          fontSize: accessibilitySystem.scaleFont(18),
          fontFamily: "Outfit",
          color: [210, 240, 255],
          align: "center",
          lineSpacing: 6,
        },
        "quiz-summary-score"
      );
      scoreText.setPosition(cX, cY - 20);
      scoreText.setAlign("center");
      const nativeScore = scoreText.getNativeNode<{
        anchor?: { set(x: number, y: number): void };
      }>();
      if (nativeScore?.anchor?.set) nativeScore.anchor.set(0.5, 0.5);
      scoreText.setZIndex(503);
      stageRoot.addChild(scoreText);
      dynamicNodes.push(scoreText);

      const certText = engineOrContext.createText(
        "Seus conhecimentos sobre a migração e conservação marinha\n" +
          "foram registrados no seu Certificado Oficial da Expedição!",
        {
          fontSize: accessibilitySystem.scaleFont(15),
          fontFamily: "Inter",
          color: [160, 215, 245],
          align: "center",
          lineSpacing: 4.5,
        },
        "quiz-summary-cert"
      );
      certText.setPosition(cX, cY + 54);
      certText.setAlign("center");
      const nativeCert = certText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
      if (nativeCert?.anchor?.set) nativeCert.anchor.set(0.5, 0.5);
      certText.setZIndex(503);
      stageRoot.addChild(certText);
      dynamicNodes.push(certText);

      const finishBtnY = cY + 130;
      const btnFinish = engineOrContext.createGraphics("quiz-btn-finish");
      const drawFinishBtn = (hovered: boolean) => {
        btnFinish.clear();
        btnFinish.drawRoundedRect(cX - 150, finishBtnY - 25, 300, 50, 10, {
          fill: { color: hovered ? [28, 160, 100] : [20, 130, 80], alpha: 1 },
          stroke: { color: [100, 255, 180], width: 2 },
        });
      };
      drawFinishBtn(false);
      btnFinish.setZIndex(505);
      stageRoot.addChild(btnFinish);
      dynamicNodes.push(btnFinish);

      const finishLabel = engineOrContext.createText(
        "Concluir e Voltar 📜 (ENTER)",
        {
          fontSize: accessibilitySystem.scaleFont(16.5),
          fontFamily: "Outfit",
          color: [255, 255, 255],
          align: "center",
        },
        "quiz-finish-label"
      );
      finishLabel.setPosition(cX, finishBtnY);
      finishLabel.setAlign("center");
      const nativeFinish = finishLabel.getNativeNode<{
        anchor?: { set(x: number, y: number): void };
      }>();
      if (nativeFinish?.anchor?.set) nativeFinish.anchor.set(0.5, 0.5);
      finishLabel.setZIndex(506);
      stageRoot.addChild(finishLabel);
      dynamicNodes.push(finishLabel);

      const finish = () => {
        audioSystem.playUiClick();
        recordQuizResult(correctAnswers);
        destroyAll();
        onComplete(scoreGained, correctAnswers);
      };

      onAdvanceCallback = finish;

      const nativeFinishBtn = btnFinish.getNativeNode<{
        eventMode?: string;
        cursor?: string;
        on?(evt: string, fn: () => void): void;
      }>();
      if (nativeFinishBtn?.on) {
        nativeFinishBtn.eventMode = "static";
        nativeFinishBtn.cursor = "pointer";
        nativeFinishBtn.on("pointerover", () => drawFinishBtn(true));
        nativeFinishBtn.on("pointerout", () => drawFinishBtn(false));
        nativeFinishBtn.on("pointerdown", finish);
      }
    };

    renderQuestion();
    return;
  }

  // --- MODO LEGADO (COMPATIBILIDADE REVERSA) ---
  const elements: Array<{ destroy?: () => void } | object> = [];
  let dynamicElements: Array<{ destroy?: () => void } | object> = [];
  const keyListeners: Array<{ cancel?: () => void }> = [];

  const screenW = engineOrContext.width();
  const screenH = engineOrContext.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(960, screenW - 24);
  const cardH = Math.min(650, screenH - 20);

  const backdrop = engineOrContext.add([
    engineOrContext.rect(screenW, screenH),
    engineOrContext.pos(0, 0),
    engineOrContext.color(4, 12, 28),
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.95) : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(500) : undefined,
  ]);
  if (backdrop && typeof backdrop === "object") elements.push(backdrop);

  const cardOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(2.5, engineOrContext.rgb(100, 220, 255))
      : undefined;

  const card = engineOrContext.add([
    engineOrContext.rect(cardW, cardH, { radius: 16 }),
    engineOrContext.pos(cX, cY),
    engineOrContext.color(10, 28, 56),
    cardOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(501) : undefined,
  ]);
  if (card && typeof card === "object") elements.push(card);

  const titleText = engineOrContext.add([
    engineOrContext.text("DESAFIO DE CONHECIMENTO ECOLÓGICO 🧪🐋", {
      size: accessibilitySystem.scaleFont(26),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 32),
    engineOrContext.color(255, 215, 80),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (titleText && typeof titleText === "object") elements.push(titleText);

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;

    keyListeners.forEach((l) => {
      try {
        if (l && typeof l.cancel === "function") l.cancel();
      } catch {}
    });

    dynamicElements.forEach((el) => {
      try {
        if (typeof engineOrContext.destroy === "function") {
          engineOrContext.destroy(el);
        } else if (
          "destroy" in el &&
          typeof (el as { destroy?: () => void }).destroy === "function"
        ) {
          (el as { destroy: () => void }).destroy();
        }
      } catch {}
    });
    dynamicElements = [];

    elements.forEach((el) => {
      try {
        if (typeof engineOrContext.destroy === "function") {
          engineOrContext.destroy(el);
        } else if (
          "destroy" in el &&
          typeof (el as { destroy?: () => void }).destroy === "function"
        ) {
          (el as { destroy: () => void }).destroy();
        }
      } catch {}
    });
    elements.length = 0;
  };

  const doClose = () => {
    audioSystem.playUiClick();
    destroyAll();
    onCancel();
  };

  const closeOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1, engineOrContext.rgb(100, 200, 255))
      : undefined;

  const btnClose = engineOrContext.add([
    engineOrContext.rect(34, 34, { radius: 8 }),
    engineOrContext.pos(cX + cardW / 2 - 28, cY - cardH / 2 + 28),
    engineOrContext.color(25, 45, 80),
    closeOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(505) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnClose && typeof btnClose === "object") elements.push(btnClose);

  const closeLabel = engineOrContext.add([
    engineOrContext.text("✕", { size: accessibilitySystem.scaleFont(16), font: "Outfit" }),
    engineOrContext.pos(cX + cardW / 2 - 28, cY - cardH / 2 + 28),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(506) : undefined,
  ]);
  if (closeLabel && typeof closeLabel === "object") elements.push(closeLabel);

  if (typeof btnClose?.onHoverUpdate === "function") {
    btnClose.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnClose.color = engineOrContext.rgb(150, 40, 40);
    });
  }
  if (typeof btnClose?.onHoverEnd === "function") {
    btnClose.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnClose.color = engineOrContext.rgb(25, 45, 80);
    });
  }
  if (typeof btnClose?.onClick === "function") {
    btnClose.onClick(doClose);
  }

  if (typeof engineOrContext.onKeyPress === "function") {
    const escListener = engineOrContext.onKeyPress("escape", doClose);
    if (escListener) keyListeners.push(escListener);

    const enterListener = engineOrContext.onKeyPress("enter", () => {
      if (isAnswered && onAdvanceCallback) onAdvanceCallback();
    });
    if (enterListener) keyListeners.push(enterListener);

    const spaceListener = engineOrContext.onKeyPress("space", () => {
      if (isAnswered && onAdvanceCallback) onAdvanceCallback();
    });
    if (spaceListener) keyListeners.push(spaceListener);

    const optionKeys = [
      ["1", "a"],
      ["2", "b"],
      ["3", "c"],
      ["4", "d"],
    ];

    optionKeys.forEach((keys, idx) => {
      keys.forEach((key) => {
        if (typeof engineOrContext.onKeyPress === "function") {
          const handler = engineOrContext.onKeyPress(key, () => {
            if (currentSelectOption && canAnswer && !isAnswered) {
              currentSelectOption(idx);
            }
          });
          if (handler) keyListeners.push(handler);
        }
      });
    });
  }

  const renderQuestion = () => {
    dynamicElements.forEach((el) => {
      try {
        if (typeof engineOrContext.destroy === "function") {
          engineOrContext.destroy(el);
        } else if (
          "destroy" in el &&
          typeof (el as { destroy?: () => void }).destroy === "function"
        ) {
          (el as { destroy: () => void }).destroy();
        }
      } catch {}
    });
    dynamicElements = [];
    isAnswered = false;
    canAnswer = false;
    onAdvanceCallback = null;

    if (typeof engineOrContext.wait === "function") {
      engineOrContext.wait(0.18, () => {
        if (!isClosed && !isAnswered) {
          canAnswer = true;
        }
      });
    } else {
      canAnswer = true;
    }

    const q = questions[currentQuestionIdx];

    const biomeLabels: Record<string, string> = {
      antartica: "❄️ Antártica",
      pelagico: "🌊 Mar Aberto",
      costa_urbana: "🏭 Costa Urbana",
      canyons: "🌀 Cânions",
      arraial: "☀️ Arraial",
    };
    const diffLabels: Record<string, string> = {
      facil: "Fácil",
      medio: "Médio",
      dificil: "Desafio",
    };

    const metaParts = [
      `Questão ${currentQuestionIdx + 1}/${questions.length}`,
      q.biome ? biomeLabels[q.biome] || q.biome : "",
      q.difficulty ? `Nível ${diffLabels[q.difficulty] || q.difficulty}` : "",
      `Bônus: +${scoreGained} pts`,
    ].filter(Boolean);

    const metaObj = engineOrContext.add([
      engineOrContext.text(metaParts.join("  •  "), {
        size: accessibilitySystem.scaleFont(15),
        font: "Outfit",
      }),
      engineOrContext.pos(cX, cY - cardH / 2 + 64),
      engineOrContext.color(140, 220, 255),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
    ]);
    if (metaObj && typeof metaObj === "object") dynamicElements.push(metaObj);

    const qObj = engineOrContext.add([
      engineOrContext.text(q.question, {
        size: accessibilitySystem.scaleFont(19),
        font: "Outfit",
        width: cardW - 64,
        lineSpacing: 4.5,
        align: "center",
      }),
      engineOrContext.pos(cX, cY - cardH / 2 + 112),
      engineOrContext.color(255, 255, 255),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
    ]);
    if (qObj && typeof qObj === "object") dynamicElements.push(qObj);

    const optionLetters = ["A", "B", "C", "D"];
    const startY = cY - cardH / 2 + 180;
    const optionSpacing = 56;
    const btnW = cardW - 64;
    const btnH = 48;

    const optionButtons: Array<{
      color?: unknown;
      outline?: { width: number; color: unknown };
      opacity?: number;
      scale?: { x: number; y: number };
      onHoverUpdate?(cb: () => void): void;
      onHoverEnd?(cb: () => void): void;
      onClick?(cb: () => void): void;
    }> = [];

    const selectOption = (optIdx: number) => {
      if (!canAnswer || isAnswered) return;
      isAnswered = true;

      const isCorrect = optIdx === q.correctIndex;
      telemetrySystem.recordQuizAnswer(isCorrect);
      analytics.trackQuizTaken({
        questionId: q.id,
        isCorrect,
        biome: q.biome || "desconhecido",
      });
      if (isCorrect) {
        audioSystem.playPowerupCollect();
        correctAnswers++;
        scoreGained += 100;
        gameState.addQuizScore(100, true);
      } else {
        audioSystem.playTrashThud();
      }

      optionButtons.forEach((btn, idx) => {
        if (idx === q.correctIndex) {
          if (typeof engineOrContext.rgb === "function") {
            btn.color = engineOrContext.rgb(25, 135, 75);
            btn.outline = { width: 2, color: engineOrContext.rgb(90, 255, 140) };
          }
        } else if (idx === optIdx && !isCorrect) {
          if (typeof engineOrContext.rgb === "function") {
            btn.color = engineOrContext.rgb(150, 40, 40);
            btn.outline = { width: 2, color: engineOrContext.rgb(255, 100, 100) };
          }
        } else {
          if (typeof engineOrContext.rgb === "function") {
            btn.color = engineOrContext.rgb(12, 28, 52);
            btn.outline = { width: 1, color: engineOrContext.rgb(40, 80, 120) };
          }
          btn.opacity = 0.6;
        }
      });

      const fbColor =
        typeof engineOrContext.rgb === "function"
          ? isCorrect
            ? engineOrContext.rgb(140, 255, 180)
            : engineOrContext.rgb(255, 190, 170)
          : undefined;

      const fbObj = engineOrContext.add([
        engineOrContext.text(
          `${isCorrect ? "✅ Correto! (+100 pts)" : "❌ Incorreto!"} ${q.explanation}`,
          {
            size: accessibilitySystem.scaleFont(14.5),
            font: "Inter",
            width: cardW - 64,
            lineSpacing: 3.5,
            align: "center",
          }
        ),
        engineOrContext.pos(cX, cY + cardH / 2 - 76),
        fbColor ? engineOrContext.color(fbColor) : undefined,
        typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
        typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
        typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
      ]);
      if (fbObj && typeof fbObj === "object") dynamicElements.push(fbObj);

      const isLastQuestion = currentQuestionIdx === questions.length - 1;
      const nextBtnOutline =
        typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
          ? engineOrContext.outline(1.5, engineOrContext.rgb(100, 230, 255))
          : undefined;

      const btnNext = engineOrContext.add([
        engineOrContext.rect(280, 46, { radius: 9 }),
        engineOrContext.pos(cX, cY + cardH / 2 - 30),
        engineOrContext.color(25, 110, 180),
        nextBtnOutline,
        typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
        typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
        typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
        typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
        typeof engineOrContext.z === "function" ? engineOrContext.z(505) : undefined,
      ]) as {
        color?: unknown;
        scale?: { x: number; y: number };
        onHoverUpdate?(cb: () => void): void;
        onHoverEnd?(cb: () => void): void;
        onClick?(cb: () => void): void;
      };
      if (btnNext && typeof btnNext === "object") dynamicElements.push(btnNext);

      const nextLabel = engineOrContext.add([
        engineOrContext.text(
          isLastQuestion ? "Ver Resultado 🏆 (ENTER)" : "Próxima Pergunta ▶ (ENTER)",
          {
            size: accessibilitySystem.scaleFont(16),
            font: "Outfit",
          }
        ),
        engineOrContext.pos(cX, cY + cardH / 2 - 30),
        engineOrContext.color(255, 255, 255),
        typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
        typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
        typeof engineOrContext.z === "function" ? engineOrContext.z(506) : undefined,
      ]);
      if (nextLabel && typeof nextLabel === "object") dynamicElements.push(nextLabel);

      const createVec2 = (x: number, y: number): { x: number; y: number } => {
        return typeof engineOrContext.vec2 === "function" ? engineOrContext.vec2(x, y) : { x, y };
      };

      if (typeof btnNext?.onHoverUpdate === "function") {
        btnNext.onHoverUpdate(() => {
          if (typeof engineOrContext.rgb === "function")
            btnNext.color = engineOrContext.rgb(35, 140, 220);
          btnNext.scale = createVec2(1.02, 1.02);
        });
      }
      if (typeof btnNext?.onHoverEnd === "function") {
        btnNext.onHoverEnd(() => {
          if (typeof engineOrContext.rgb === "function")
            btnNext.color = engineOrContext.rgb(25, 110, 180);
          btnNext.scale = createVec2(1, 1);
        });
      }

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
      if (typeof btnNext?.onClick === "function") {
        btnNext.onClick(advance);
      }
    };

    currentSelectOption = selectOption;

    q.options.forEach((optText, optIdx) => {
      const optY = startY + optIdx * optionSpacing;
      const optOutline =
        typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
          ? engineOrContext.outline(1.5, engineOrContext.rgb(60, 120, 190))
          : undefined;

      const optBtn = engineOrContext.add([
        engineOrContext.rect(btnW, btnH, { radius: 9 }),
        engineOrContext.pos(cX, optY),
        engineOrContext.color(18, 48, 90),
        optOutline,
        typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
        typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
        typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
        typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
        typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
      ]) as {
        color?: unknown;
        outline?: { width: number; color: unknown };
        opacity?: number;
        scale?: { x: number; y: number };
        onHoverUpdate?(cb: () => void): void;
        onHoverEnd?(cb: () => void): void;
        onClick?(cb: () => void): void;
      };
      if (optBtn && typeof optBtn === "object") {
        dynamicElements.push(optBtn);
        optionButtons.push(optBtn);
      }

      const optLabel = engineOrContext.add([
        engineOrContext.text(`${optionLetters[optIdx]}) ${optText}`, {
          size: accessibilitySystem.scaleFont(16),
          font: "Inter",
          width: btnW - 28,
        }),
        engineOrContext.pos(cX - btnW / 2 + 16, optY),
        engineOrContext.color(230, 245, 255),
        typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("left") : undefined,
        typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
        typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
      ]);
      if (optLabel && typeof optLabel === "object") dynamicElements.push(optLabel);

      const createVec2 = (x: number, y: number): { x: number; y: number } => {
        return typeof engineOrContext.vec2 === "function" ? engineOrContext.vec2(x, y) : { x, y };
      };

      if (typeof optBtn?.onHoverUpdate === "function") {
        optBtn.onHoverUpdate(() => {
          if (canAnswer && !isAnswered && typeof engineOrContext.rgb === "function") {
            optBtn.color = engineOrContext.rgb(28, 75, 135);
            if (optBtn.outline) optBtn.outline.color = engineOrContext.rgb(120, 230, 255);
            optBtn.scale = createVec2(1.01, 1.01);
          }
        });
      }
      if (typeof optBtn?.onHoverEnd === "function") {
        optBtn.onHoverEnd(() => {
          if (canAnswer && !isAnswered && typeof engineOrContext.rgb === "function") {
            optBtn.color = engineOrContext.rgb(18, 48, 90);
            if (optBtn.outline) optBtn.outline.color = engineOrContext.rgb(60, 120, 190);
            optBtn.scale = createVec2(1, 1);
          }
        });
      }
      if (typeof optBtn?.onClick === "function") {
        optBtn.onClick(() => {
          if (canAnswer && !isAnswered) {
            selectOption(optIdx);
          }
        });
      }
    });
  };

  const renderSummary = () => {
    dynamicElements.forEach((el) => {
      try {
        if (typeof engineOrContext.destroy === "function") {
          engineOrContext.destroy(el);
        } else if (
          "destroy" in el &&
          typeof (el as { destroy?: () => void }).destroy === "function"
        ) {
          (el as { destroy: () => void }).destroy();
        }
      } catch {}
    });
    dynamicElements = [];
    currentSelectOption = null;
    onAdvanceCallback = null;

    audioSystem.playVictoryFanfare();

    const congrat = engineOrContext.add([
      engineOrContext.text("PARABÉNS PELO DESEMPENHO ECOLÓGICO! 🎉", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      engineOrContext.pos(cX, cY - 95),
      engineOrContext.color(255, 215, 80),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
    ]);
    if (congrat && typeof congrat === "object") dynamicElements.push(congrat);

    const scoreSummary = engineOrContext.add([
      engineOrContext.text(
        `Você acertou ${correctAnswers} de ${questions.length} perguntas!\n` +
          `Bônus Conquistado: +${scoreGained} Eco-Pontos somados à sua pontuação!`,
        {
          size: accessibilitySystem.scaleFont(18),
          font: "Outfit",
          lineSpacing: 6,
          align: "center",
        }
      ),
      engineOrContext.pos(cX, cY - 20),
      engineOrContext.color(210, 240, 255),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
    ]);
    if (scoreSummary && typeof scoreSummary === "object") dynamicElements.push(scoreSummary);

    const certSummary = engineOrContext.add([
      engineOrContext.text(
        "Seus conhecimentos sobre a migração e conservação marinha\n" +
          "foram registrados no seu Certificado Oficial da Expedição!",
        {
          size: accessibilitySystem.scaleFont(15),
          font: "Inter",
          lineSpacing: 4.5,
          align: "center",
        }
      ),
      engineOrContext.pos(cX, cY + 54),
      engineOrContext.color(160, 215, 245),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
    ]);
    if (certSummary && typeof certSummary === "object") dynamicElements.push(certSummary);

    const finishOutline =
      typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
        ? engineOrContext.outline(2, engineOrContext.rgb(100, 255, 180))
        : undefined;

    const btnFinish = engineOrContext.add([
      engineOrContext.rect(300, 50, { radius: 10 }),
      engineOrContext.pos(cX, cY + 130),
      engineOrContext.color(20, 130, 80),
      finishOutline,
      typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(505) : undefined,
    ]) as {
      color?: unknown;
      scale?: { x: number; y: number };
      onHoverUpdate?(cb: () => void): void;
      onHoverEnd?(cb: () => void): void;
      onClick?(cb: () => void): void;
    };
    if (btnFinish && typeof btnFinish === "object") dynamicElements.push(btnFinish);

    const finishLabel = engineOrContext.add([
      engineOrContext.text("Concluir e Voltar 📜 (ENTER)", {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }),
      engineOrContext.pos(cX, cY + 130),
      engineOrContext.color(255, 255, 255),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(506) : undefined,
    ]);
    if (finishLabel && typeof finishLabel === "object") dynamicElements.push(finishLabel);

    const createVec2 = (x: number, y: number): { x: number; y: number } => {
      return typeof engineOrContext.vec2 === "function" ? engineOrContext.vec2(x, y) : { x, y };
    };

    if (typeof btnFinish?.onHoverUpdate === "function") {
      btnFinish.onHoverUpdate(() => {
        if (typeof engineOrContext.rgb === "function")
          btnFinish.color = engineOrContext.rgb(28, 160, 100);
        btnFinish.scale = createVec2(1.02, 1.02);
      });
    }
    if (typeof btnFinish?.onHoverEnd === "function") {
      btnFinish.onHoverEnd(() => {
        if (typeof engineOrContext.rgb === "function")
          btnFinish.color = engineOrContext.rgb(20, 130, 80);
        btnFinish.scale = createVec2(1, 1);
      });
    }

    const finish = () => {
      audioSystem.playUiClick();
      recordQuizResult(correctAnswers);
      destroyAll();
      onComplete(scoreGained, correctAnswers);
    };

    onAdvanceCallback = finish;
    if (typeof btnFinish?.onClick === "function") {
      btnFinish.onClick(finish);
    }
  };

  renderQuestion();
}

/**
 * Contador Numérico Progressivo (Score Counter) — Micro Splash
 * Fase 65: Polimento Visual, Dinâmica Oceânica e Acessibilidade (Motion & Juice)
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Tween.
 */

import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../../engine/adapters/LegacyBridge";
import { createTween, Easings } from "../../engine/utils/Tween";

export interface ScoreCounterOptions {
  duration?: number;
  startValue?: number;
  prefix?: string;
  suffix?: string;
  isReducedMotion?: () => boolean;
  onComplete?: () => void;
  formatValue?: (value: number) => string;
}

export interface ScoreCounterHandle {
  stop: () => void;
}

export type ScoreCounterTarget =
  | {
      text?: string;
      setText?(content: string): void;
    }
  | object;

export interface LegacyScoreCounterContext {
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  easings?: {
    easeOutQuad?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Anexa a animação de contagem progressiva de pontuação numérica em um nó de texto.
 * Interpola suavemente de startValue até targetScore respeitando o modo de movimento reduzido.
 */
export function animateScoreCounter(
  engineOrContext: IRenderEngine | LegacyScoreCounterContext,
  textObj: ScoreCounterTarget,
  targetScore: number,
  options: ScoreCounterOptions = {}
): ScoreCounterHandle {
  const duration = options.duration ?? 0.8;
  const startValue = options.startValue ?? 0;
  const prefix = options.prefix ?? "";
  const suffix = options.suffix ?? "";
  const format = options.formatValue ?? ((val: number) => Math.round(val).toLocaleString("pt-BR"));

  const checkReducedMotion = () => {
    if (options.isReducedMotion) {
      return options.isReducedMotion();
    }
    return accessibilitySystem.isReducedMotion();
  };

  const updateText = (val: number) => {
    const formatted = `${prefix}${format(val)}${suffix}`;
    const target = textObj as { text?: string; setText?(content: string): void };
    if (typeof target.setText === "function") {
      target.setText(formatted);
    } else {
      try {
        target.text = formatted;
      } catch {}
    }
  };

  const setFinalText = () => {
    updateText(targetScore);
  };

  if (!textObj) {
    options.onComplete?.();
    return { stop: () => {} };
  }

  if (checkReducedMotion()) {
    setFinalText();
    options.onComplete?.();
    return { stop: () => {} };
  }

  let isCancelled = false;

  if (isRenderEngine(engineOrContext)) {
    const tween = createTween(
      startValue,
      targetScore,
      duration,
      (currentValue) => {
        if (!isCancelled) {
          updateText(currentValue);
        }
      },
      Easings.easeOutQuad,
      engineOrContext.getTicker()
    );

    tween.promise.then(() => {
      if (!isCancelled) {
        setFinalText();
        options.onComplete?.();
      }
    });

    return {
      stop: () => {
        isCancelled = true;
        tween.cancel();
        setFinalText();
      },
    };
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyScoreCounterContext;

  if (typeof legacyContext.tween !== "function") {
    setFinalText();
    options.onComplete?.();
    return { stop: () => {} };
  }

  const tweenPromise = legacyContext.tween(
    startValue,
    targetScore,
    duration,
    (currentValue: number) => {
      if (isCancelled) return;
      updateText(currentValue);
    },
    legacyContext.easings?.easeOutQuad ?? ((progress: number) => progress)
  );

  if (tweenPromise && typeof tweenPromise.then === "function") {
    tweenPromise.then(() => {
      if (!isCancelled) {
        setFinalText();
        options.onComplete?.();
      }
    });
  } else {
    setFinalText();
    options.onComplete?.();
  }

  return {
    stop: () => {
      isCancelled = true;
      setFinalText();
    },
  };
}

import type { GameObj, KaboomCtx } from "kaboom";
import { accessibilitySystem } from "../../systems/accessibilitySystem";

/**
 * Contador Numérico Progressivo (Score Counter) — Micro Splash
 * Fase 65: Polimento Visual, Dinâmica Oceânica e Acessibilidade (Motion & Juice)
 */

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

/**
 * Anima a contagem progressiva de pontuação numérica em um GameObj de texto.
 * Interpola suavemente de startValue até targetScore respeitando o modo de movimento reduzido.
 */
export function animateScoreCounter(
  k: KaboomCtx,
  textObj: GameObj,
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

  const setFinalText = () => {
    try {
      textObj.text = `${prefix}${format(targetScore)}${suffix}`;
    } catch {}
  };

  if (!textObj) {
    options.onComplete?.();
    return { stop: () => {} };
  }

  if (checkReducedMotion() || typeof k.tween !== "function") {
    setFinalText();
    options.onComplete?.();
    return { stop: () => {} };
  }

  let isCancelled = false;

  const tweenPromise = k.tween(
    startValue,
    targetScore,
    duration,
    (currentValue) => {
      if (isCancelled) return;
      try {
        textObj.text = `${prefix}${format(currentValue)}${suffix}`;
      } catch {}
    },
    k.easings?.easeOutQuad ?? ((progress: number) => progress)
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

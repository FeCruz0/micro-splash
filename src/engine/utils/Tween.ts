/**
 * Mecanismo Puro de Interpolação (Tween) e Easings — Micro Splash
 *
 * Fornece alternativa de alto desempenho e tipada para k.tween() do Kaboom.js.
 * Opera via IRenderTicker ou requestAnimationFrame sem dependências externas.
 */

import type { IRenderTicker } from "../contracts/INTERFACE_CONTRACTS";
import { getActiveRenderEngine } from "../adapters/RenderEngineAdapter";

export type EasingFunction = (progress: number) => number;

export const Easings = {
  linear: (progress: number): number => progress,

  easeInQuad: (progress: number): number => progress * progress,

  easeOutQuad: (progress: number): number => progress * (2 - progress),

  easeInOutQuad: (progress: number): number =>
    progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress,

  easeOutBack: (progress: number): number => {
    const overshootConstant = 1.70158;
    const scaledOvershoot = overshootConstant + 1;
    return (
      1 +
      scaledOvershoot * Math.pow(progress - 1, 3) +
      overshootConstant * Math.pow(progress - 1, 2)
    );
  },

  easeInOutCubic: (progress: number): number =>
    progress < 0.5
      ? 4 * progress * progress * progress
      : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1,
} as const;

export interface TweenHandle {
  readonly promise: Promise<void>;
  cancel(): void;
}

function resolveRenderTicker(explicitTicker?: IRenderTicker): IRenderTicker | undefined {
  if (explicitTicker) {
    return explicitTicker;
  }
  const activeEngine = getActiveRenderEngine();
  if (activeEngine && activeEngine.isInitialized) {
    try {
      return activeEngine.getTicker();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Executa uma interpolação numérica contínua ao longo de um período de tempo.
 *
 * @param from Valor inicial
 * @param to Valor final
 * @param durationInSeconds Duração em segundos
 * @param onUpdate Callback executado a cada frame com o valor interpolado
 * @param easingFunction Função de atenuação (padrão: easeOutQuad)
 * @param explicitTicker Instância opcional de IRenderTicker (se omitido, vincula ao PixiRenderTicker ativo)
 */
export function createTween(
  from: number,
  to: number,
  durationInSeconds: number,
  onUpdate: (currentValue: number) => void,
  easingFunction: EasingFunction = Easings.easeOutQuad,
  explicitTicker?: IRenderTicker
): TweenHandle {
  let isCancelled = false;
  let elapsedTimeInSeconds = 0;
  const duration = Math.max(0.0001, durationInSeconds);
  const totalDelta = to - from;

  let cleanupCallback: (() => void) | null = null;
  let resolvePromise: (() => void) | null = null;

  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;

    if (durationInSeconds <= 0) {
      onUpdate(to);
      resolve();
      return;
    }

    onUpdate(from);

    const step = (deltaTimeInSeconds: number): void => {
      if (isCancelled) {
        if (cleanupCallback) cleanupCallback();
        resolve();
        return;
      }

      elapsedTimeInSeconds += deltaTimeInSeconds;
      const rawProgress = Math.min(1, Math.max(0, elapsedTimeInSeconds / duration));
      const easedProgress = easingFunction(rawProgress);
      const currentValue = from + totalDelta * easedProgress;

      onUpdate(currentValue);

      if (rawProgress >= 1) {
        if (cleanupCallback) cleanupCallback();
        resolve();
      }
    };

    const activeTicker = resolveRenderTicker(explicitTicker);

    if (activeTicker) {
      cleanupCallback = activeTicker.add(step);
    } else if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      let lastTimestampInMilliseconds = performance.now();
      let animationFrameId: number;

      const frame = (currentTimestampInMilliseconds: number): void => {
        const deltaTimeInSeconds =
          (currentTimestampInMilliseconds - lastTimestampInMilliseconds) / 1000;
        lastTimestampInMilliseconds = currentTimestampInMilliseconds;
        step(Math.min(deltaTimeInSeconds, 0.1));

        if (!isCancelled && elapsedTimeInSeconds < duration) {
          animationFrameId = window.requestAnimationFrame(frame);
        }
      };

      animationFrameId = window.requestAnimationFrame(frame);
      cleanupCallback = (): void => {
        window.cancelAnimationFrame(animationFrameId);
      };
    } else {
      // Fallback para Node/Vitest
      onUpdate(to);
      resolve();
    }
  });

  return {
    promise,
    cancel(): void {
      if (!isCancelled) {
        isCancelled = true;
        if (cleanupCallback) cleanupCallback();
        if (resolvePromise) resolvePromise();
      }
    },
  };
}

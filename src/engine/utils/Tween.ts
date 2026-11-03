/**
 * Mecanismo Puro de Interpolação (Tween) e Easings — Micro Splash
 *
 * Fornece alternativa de alto desempenho e tipada para k.tween() do Kaboom.js.
 * Opera via IRenderTicker ou requestAnimationFrame sem dependências externas.
 */

import type { IRenderTicker } from "../contracts/INTERFACE_CONTRACTS";

export type EasingFunction = (progress: number) => number;

export const Easings = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,

  easeOutQuad: (t: number): number => t * (2 - t),

  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeOutBack: (t: number): number => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
} as const;

export interface TweenHandle {
  readonly promise: Promise<void>;
  cancel(): void;
}

/**
 * Executa uma interpolação numérica contínua ao longo de um período de tempo.
 *
 * @param from Valor inicial
 * @param to Valor final
 * @param durationInSeconds Duração em segundos
 * @param onUpdate Callback executado a cada frame com o valor interpolado
 * @param easing Função de atenuação (padrão: easeOutQuad)
 * @param ticker Instância opcional de IRenderTicker (se omitido, usa rAF nativo)
 */
export function createTween(
  from: number,
  to: number,
  durationInSeconds: number,
  onUpdate: (currentValue: number) => void,
  easing: EasingFunction = Easings.easeOutQuad,
  ticker?: IRenderTicker
): TweenHandle {
  let isCancelled = false;
  let elapsed = 0;
  const duration = Math.max(0.0001, durationInSeconds);
  const delta = to - from;

  let cleanup: (() => void) | null = null;

  const promise = new Promise<void>((resolve) => {
    if (durationInSeconds <= 0) {
      onUpdate(to);
      resolve();
      return;
    }

    onUpdate(from);

    const step = (deltaTime: number): void => {
      if (isCancelled) {
        if (cleanup) cleanup();
        resolve();
        return;
      }

      elapsed += deltaTime;
      const rawProgress = Math.min(1, Math.max(0, elapsed / duration));
      const easedProgress = easing(rawProgress);
      const currentValue = from + delta * easedProgress;

      onUpdate(currentValue);

      if (rawProgress >= 1) {
        if (cleanup) cleanup();
        resolve();
      }
    };

    if (ticker) {
      cleanup = ticker.add(step);
    } else if (
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
    ) {
      let lastTime = performance.now();
      let animationFrameId: number;

      const frame = (now: number): void => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        step(Math.min(dt, 0.1));

        if (!isCancelled && elapsed < duration) {
          animationFrameId = window.requestAnimationFrame(frame);
        }
      };

      animationFrameId = window.requestAnimationFrame(frame);
      cleanup = (): void => {
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
      isCancelled = true;
      if (cleanup) cleanup();
    },
  };
}

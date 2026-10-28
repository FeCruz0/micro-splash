import type { EventController, GameObj, KaboomCtx } from "kaboom";
import { accessibilitySystem } from "../../systems/accessibilitySystem";

/**
 * Utilitários de Movimento, Micro-Interações & Stagger — Micro Splash
 * Fase 65: Polimento Visual, Dinâmica Oceânica e Acessibilidade (Motion & Juice)
 */

export interface PulseEffectOptions {
  maxScale?: number;
  duration?: number;
  pauseOnHover?: boolean;
  canInteract?: () => boolean;
  isReducedMotion?: () => boolean;
}

export interface PulseEffectHandle {
  stop: () => void;
  destroy: () => void;
}

export interface StaggerEntranceOptions {
  staggerDelayMs?: number;
  duration?: number;
  startOffsetY?: number;
  isReducedMotion?: () => boolean;
  onComplete?: () => void;
}

/**
 * Anexa um efeito contínuo de pulso suave de respiração (Call-to-Action Pulse) em um botão primário.
 * Respeita preferências de movimento reduzido (WCAG 2.1 AA) e pausa durante hover do mouse.
 */
export function attachPulseEffect(
  k: KaboomCtx,
  buttonObj: GameObj,
  options: PulseEffectOptions = {}
): PulseEffectHandle {
  const maxScale = options.maxScale ?? 1.025;
  const baseScale = 1.0;
  const period = options.duration ?? 1.4;
  const pauseOnHover = options.pauseOnHover ?? true;

  let isStopped = false;
  let elapsed = 0;

  const checkReducedMotion = () => {
    if (options.isReducedMotion) {
      return options.isReducedMotion();
    }
    return accessibilitySystem.isReducedMotion();
  };

  const updateController: EventController | { cancel: () => void } | null =
    typeof buttonObj.onUpdate === "function"
      ? buttonObj.onUpdate(() => {
          if (isStopped) return;

          if (checkReducedMotion()) {
            try {
              buttonObj.scale = k.vec2(baseScale, baseScale);
            } catch {}
            return;
          }

          if (options.canInteract && !options.canInteract()) {
            return;
          }

          if (
            pauseOnHover &&
            typeof buttonObj.isHovering === "function" &&
            buttonObj.isHovering()
          ) {
            return;
          }

          const dt = typeof k.dt === "function" ? k.dt() : 0.016;
          elapsed += dt;

          const wave = (Math.sin((elapsed * Math.PI * 2) / period) + 1) / 2;
          const currentScale = baseScale + wave * (maxScale - baseScale);

          try {
            buttonObj.scale = k.vec2(currentScale, currentScale);
          } catch {}
        })
      : null;

  const stop = () => {
    isStopped = true;
    try {
      buttonObj.scale = k.vec2(baseScale, baseScale);
    } catch {}
  };

  const destroy = () => {
    stop();
    if (updateController && typeof updateController.cancel === "function") {
      updateController.cancel();
    }
  };

  return { stop, destroy };
}

/**
 * Aplica entrada escalonada (stagger) em uma lista de elementos com sutil elevação vertical e fade-in progressivo.
 * Se movimento reduzido estiver ativo, aplica as posições finais imediatamente sem atraso.
 */
export function staggerElementsEntrance(
  k: KaboomCtx,
  elements: GameObj[],
  options: StaggerEntranceOptions = {}
): void {
  const staggerDelayMs = options.staggerDelayMs ?? 45;
  const duration = options.duration ?? 0.22;
  const startOffsetY = options.startOffsetY ?? 12;

  const isReduced = options.isReducedMotion
    ? options.isReducedMotion()
    : accessibilitySystem.isReducedMotion();

  if (!elements || elements.length === 0) {
    options.onComplete?.();
    return;
  }

  // Fallback imediato se movimento reduzido ativo ou ambiente sem tween
  if (isReduced || typeof k.tween !== "function") {
    elements.forEach((el) => {
      try {
        if ("opacity" in el) el.opacity = 1;
      } catch {}
    });
    options.onComplete?.();
    return;
  }

  const validElements = elements.filter((el) => Boolean(el));
  const total = validElements.length;
  if (total === 0) {
    options.onComplete?.();
    return;
  }

  let completedCount = 0;

  validElements.forEach((el, index) => {
    const originalY = el.pos?.y ?? 0;
    const delaySeconds = (index * staggerDelayMs) / 1000;

    try {
      if (el.pos) {
        el.pos.y = originalY + startOffsetY;
      }
      if ("opacity" in el) {
        el.opacity = 0;
      }
    } catch {}

    const runEntrance = () => {
      if (typeof k.tween === "function" && k.easings?.easeOutQuad) {
        k.tween(
          0,
          1,
          duration,
          (progress) => {
            try {
              if (el.pos) {
                el.pos.y = originalY + startOffsetY * (1 - progress);
              }
              if ("opacity" in el) {
                el.opacity = progress;
              }
            } catch {}
          },
          k.easings.easeOutQuad
        ).then(() => {
          try {
            if (el.pos) el.pos.y = originalY;
            if ("opacity" in el) el.opacity = 1;
          } catch {}
          completedCount += 1;
          if (completedCount === total) {
            options.onComplete?.();
          }
        });
      } else {
        try {
          if (el.pos) el.pos.y = originalY;
          if ("opacity" in el) el.opacity = 1;
        } catch {}
        completedCount += 1;
        if (completedCount === total) {
          options.onComplete?.();
        }
      }
    };

    if (delaySeconds > 0 && typeof k.wait === "function") {
      k.wait(delaySeconds, runEntrance);
    } else {
      runEntrance();
    }
  });
}

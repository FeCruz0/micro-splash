/**
 * Utilitários de Movimento, Micro-Interações & Stagger — Micro Splash
 * Fase 65: Polimento Visual, Dinâmica Oceânica e Acessibilidade (Motion & Juice)
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Tween.
 */

import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { IRenderEngine, Vector2D } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../../engine/adapters/LegacyBridge";
import { createTween, Easings } from "../../engine/utils/Tween";

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

export interface MotionTargetObject {
  scale?: { x: number; y: number };
  pos?: { x: number; y: number };
  opacity?: number;
  onUpdate?(callback: () => void): { cancel?: () => void } | void;
  isHovering?(): boolean;
  setScale?(x: number, y: number): void;
  setPosition?(x: number, y: number): void;
  setOpacity?(alpha: number): void;
  getPosition?(): Vector2D;
  getOpacity?(): number;
}

export interface LegacyMotionContext {
  dt?(): number;
  vec2?(x: number, y: number): { x: number; y: number };
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  wait?(duration: number, callback: () => void): void;
  easings?: {
    easeOutQuad?: unknown;
    [key: string]: unknown;
  };
}

/**
 * Anexa um efeito contínuo de pulso suave de respiração (Call-to-Action Pulse) em um botão primário.
 * Respeita preferências de movimento reduzido (WCAG 2.1 AA) e pausa durante hover do mouse.
 */
export function attachPulseEffect(
  engineOrContext: IRenderEngine | LegacyMotionContext,
  buttonObj: MotionTargetObject,
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

  const applyScale = (s: number) => {
    if (typeof buttonObj.setScale === "function") {
      buttonObj.setScale(s, s);
    } else {
      const vec2Func =
        "vec2" in engineOrContext && typeof engineOrContext.vec2 === "function"
          ? engineOrContext.vec2
          : (x: number, y: number) => ({ x, y });
      try {
        buttonObj.scale = vec2Func(s, s);
      } catch {}
    }
  };

  if (isRenderEngine(engineOrContext)) {
    const unregister = engineOrContext.getTicker().add((deltaTime: number) => {
      if (isStopped) return;

      if (checkReducedMotion()) {
        applyScale(baseScale);
        return;
      }

      if (options.canInteract && !options.canInteract()) {
        return;
      }

      if (pauseOnHover && typeof buttonObj.isHovering === "function" && buttonObj.isHovering()) {
        return;
      }

      elapsed += deltaTime;
      const wave = (Math.sin((elapsed * Math.PI * 2) / period) + 1) / 2;
      const currentScale = baseScale + wave * (maxScale - baseScale);
      applyScale(currentScale);
    });

    const stop = () => {
      isStopped = true;
      applyScale(baseScale);
    };

    const destroy = () => {
      stop();
      unregister();
    };

    return { stop, destroy };
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyMotionContext;

  const updateController =
    typeof buttonObj.onUpdate === "function"
      ? buttonObj.onUpdate(() => {
          if (isStopped) return;

          if (checkReducedMotion()) {
            applyScale(baseScale);
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

          const dt = typeof legacyContext.dt === "function" ? legacyContext.dt() : 0.016;
          elapsed += dt;

          const wave = (Math.sin((elapsed * Math.PI * 2) / period) + 1) / 2;
          const currentScale = baseScale + wave * (maxScale - baseScale);
          applyScale(currentScale);
        })
      : null;

  const stop = () => {
    isStopped = true;
    applyScale(baseScale);
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
  engineOrContext: IRenderEngine | LegacyMotionContext,
  elements: MotionTargetObject[],
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

  const validElements = elements.filter((el) => Boolean(el));
  const total = validElements.length;
  if (total === 0) {
    options.onComplete?.();
    return;
  }

  // Fallback imediato se movimento reduzido ativo
  if (isReduced) {
    validElements.forEach((el) => {
      try {
        if (typeof el.setOpacity === "function") {
          el.setOpacity(1);
        } else if ("opacity" in el) {
          el.opacity = 1;
        }
      } catch {}
    });
    options.onComplete?.();
    return;
  }

  let completedCount = 0;

  if (isRenderEngine(engineOrContext)) {
    const ticker = engineOrContext.getTicker();

    validElements.forEach((el, index) => {
      const originalY =
        typeof el.getPosition === "function" ? el.getPosition().y : (el.pos?.y ?? 0);
      const delayMs = index * staggerDelayMs;

      const setY = (yVal: number) => {
        if (typeof el.setPosition === "function") {
          const currentX =
            typeof el.getPosition === "function" ? el.getPosition().x : (el.pos?.x ?? 0);
          el.setPosition(currentX, yVal);
        } else if (el.pos) {
          el.pos.y = yVal;
        }
      };

      const setAlpha = (alphaVal: number) => {
        if (typeof el.setOpacity === "function") {
          el.setOpacity(alphaVal);
        } else if ("opacity" in el) {
          el.opacity = alphaVal;
        }
      };

      setY(originalY + startOffsetY);
      setAlpha(0);

      const runEntrance = () => {
        createTween(
          0,
          1,
          duration,
          (progress) => {
            setY(originalY + startOffsetY * (1 - progress));
            setAlpha(progress);
          },
          Easings.easeOutQuad,
          ticker
        ).promise.then(() => {
          setY(originalY);
          setAlpha(1);
          completedCount += 1;
          if (completedCount === total) {
            options.onComplete?.();
          }
        });
      };

      if (delayMs > 0) {
        setTimeout(runEntrance, delayMs);
      } else {
        runEntrance();
      }
    });

    return;
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyMotionContext;

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
      if (typeof legacyContext.tween === "function" && legacyContext.easings?.easeOutQuad) {
        legacyContext
          .tween(
            0,
            1,
            duration,
            (progress: number) => {
              try {
                if (el.pos) {
                  el.pos.y = originalY + startOffsetY * (1 - progress);
                }
                if ("opacity" in el) {
                  el.opacity = progress;
                }
              } catch {}
            },
            legacyContext.easings.easeOutQuad
          )
          .then(() => {
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

    if (delaySeconds > 0 && typeof legacyContext.wait === "function") {
      legacyContext.wait(delaySeconds, runEntrance);
    } else {
      runEntrance();
    }
  });
}

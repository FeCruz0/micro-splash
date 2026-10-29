import type { PlayerController } from "../entities/player";

export interface CinematicCancelable {
  cancel: () => void;
}

export interface CinematicTweenResult {
  then: (cb: () => void) => unknown;
}

export interface CinematicCameraEngineContext<
  TVec extends { x: number; y: number } = { x: number; y: number },
> {
  onUpdate: (cb: () => void) => CinematicCancelable | unknown;
  camScale?: (scale: TVec | number) => unknown;
  vec2?: (x: number, y: number) => TVec;
  wait: (secs: number, cb: () => void) => CinematicCancelable | unknown;
  tween?: (
    from: number,
    to: number,
    duration: number,
    onUpdate: (val: number) => void,
    ease?: (t: number) => number
  ) => CinematicTweenResult;
  easings?: {
    easeInOutQuad?: (t: number) => number;
    [key: string]: unknown;
  };
}

export interface CinematicEvent {
  id: string;
  name: string;
  triggerX: number;
  triggerMargin: number;
  targetScale: number;
  zoomDuration: number;
  holdDuration: number;
  restoreDuration: number;
}

export const CINEMATIC_EVENTS: CinematicEvent[] = [
  {
    id: "dolphin_encounter",
    name: "Primeiro Encontro com Golfinhos",
    triggerX: 6500,
    triggerMargin: 80,
    targetScale: 1.22,
    zoomDuration: 0.6,
    holdDuration: 2.0,
    restoreDuration: 0.8,
  },
  {
    id: "first_ship_noise",
    name: "Cargueiro & Ruído Subaquático na Costa",
    triggerX: 13000,
    triggerMargin: 80,
    targetScale: 1.25,
    zoomDuration: 0.6,
    holdDuration: 2.2,
    restoreDuration: 0.8,
  },
  {
    id: "upwelling_surge",
    name: "Impulso Ascendente da Ressurgência",
    triggerX: 19000,
    triggerMargin: 80,
    targetScale: 1.28,
    zoomDuration: 0.5,
    holdDuration: 2.4,
    restoreDuration: 0.8,
  },
];

/**
 * Função pura para verificação de disparo de zoom cinematográfico baseado na coordenada X da baleia.
 */
export function checkCinematicEvent(
  playerXPosition: number,
  triggeredEventIds: Set<string>
): CinematicEvent | null {
  for (let index = 0; index < CINEMATIC_EVENTS.length; index++) {
    const event = CINEMATIC_EVENTS[index];
    if (!triggeredEventIds.has(event.id)) {
      if (
        playerXPosition >= event.triggerX &&
        playerXPosition <= event.triggerX + event.triggerMargin
      ) {
        return event;
      }
    }
  }
  return null;
}

/**
 * Inicializa o sistema de Zoom Cinematográfico da Câmera.
 */
export function setupCinematicCameraSystem<
  TVec extends { x: number; y: number } = { x: number; y: number },
>(
  k: CinematicCameraEngineContext<TVec>,
  playerController: PlayerController
): {
  destroy: () => void;
  triggerEventDirectly: (event: CinematicEvent) => void;
  getTriggeredEvents: () => string[];
  isZoomActive: () => boolean;
} {
  const triggeredEvents = new Set<string>();
  let isZooming = false;
  let activeHoldTimer: CinematicCancelable | null = null;

  function executeZoom(event: CinematicEvent): void {
    // Verifica preferência de redução de movimento do usuário
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      triggeredEvents.add(event.id);
      return;
    }

    if (isZooming) return;
    isZooming = true;
    triggeredEvents.add(event.id);

    const initialScale = 1.0;
    const targetScale = event.targetScale;

    const applyCameraScale = (scaleValue: number) => {
      if (typeof k.camScale === "function") {
        if (typeof k.vec2 === "function") {
          k.camScale(k.vec2(scaleValue, scaleValue));
        } else {
          (k.camScale as (s: unknown) => void)(scaleValue);
        }
      }
    };

    // Zoom In suave
    if (typeof k.tween === "function" && k.easings?.easeInOutQuad) {
      k.tween(
        initialScale,
        targetScale,
        event.zoomDuration,
        (scaleValue) => {
          applyCameraScale(scaleValue);
        },
        k.easings.easeInOutQuad
      ).then(() => {
        // Sustenta o enquadramento dramático
        activeHoldTimer = k.wait(event.holdDuration, () => {
          // Zoom Out retornando ao padrão
          if (typeof k.tween === "function" && k.easings?.easeInOutQuad) {
            k.tween(
              targetScale,
              initialScale,
              event.restoreDuration,
              (restoreValue) => {
                applyCameraScale(restoreValue);
              },
              k.easings.easeInOutQuad
            ).then(() => {
              applyCameraScale(1.0);
              isZooming = false;
            });
          } else {
            applyCameraScale(1.0);
            isZooming = false;
          }
        }) as CinematicCancelable;
      });
    } else {
      applyCameraScale(targetScale);
      activeHoldTimer = k.wait(event.holdDuration, () => {
        applyCameraScale(1.0);
        isZooming = false;
      }) as CinematicCancelable;
    }
  }

  const updateHandler = k.onUpdate(() => {
    const baleia = playerController.gameObj;
    if (!baleia || !baleia.pos) return;

    // Não aciona durante falhas/blackout
    if (playerController.isFainting()) return;

    const event = checkCinematicEvent(baleia.pos.x, triggeredEvents);
    if (event) {
      executeZoom(event);
    }
  }) as CinematicCancelable;

  return {
    destroy: () => {
      if (typeof updateHandler?.cancel === "function") {
        updateHandler.cancel();
      }
      if (activeHoldTimer && typeof activeHoldTimer.cancel === "function") {
        activeHoldTimer.cancel();
      }
      if (typeof k.camScale === "function") {
        if (typeof k.vec2 === "function") {
          k.camScale(k.vec2(1.0, 1.0));
        } else {
          (k.camScale as (s: unknown) => void)(1.0);
        }
      }
      isZooming = false;
    },
    triggerEventDirectly: (event: CinematicEvent) => {
      executeZoom(event);
    },
    getTriggeredEvents: () => Array.from(triggeredEvents),
    isZoomActive: () => isZooming,
  };
}

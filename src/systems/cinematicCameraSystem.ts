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

  const lockCameraScaleToDefault = () => {
    if (typeof k.camScale === "function") {
      if (typeof k.vec2 === "function") {
        k.camScale(k.vec2(1.0, 1.0));
      } else {
        (k.camScale as (s: unknown) => void)(1.0);
      }
    }
  };

  // Trava escala da câmera permanentemente em 1.0 (Zero Dynamic Zoom)
  lockCameraScaleToDefault();

  function executeZoom(event: CinematicEvent): void {
    triggeredEvents.add(event.id);
    lockCameraScaleToDefault();
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
      lockCameraScaleToDefault();
    },
    triggerEventDirectly: (event: CinematicEvent) => {
      executeZoom(event);
    },
    getTriggeredEvents: () => Array.from(triggeredEvents),
    isZoomActive: () => false,
  };
}

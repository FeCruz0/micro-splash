/**
 * Verificador Geométrico de Camada de Tela (Screen Layer Geometry Checker) — Micro Splash
 *
 * Responsável por testes geométricos puros (retângulos AABB e círculos) para colisão e roteamento
 * de cliques e toques nos elementos interativos de interface (UI) posicionados na camada de tela
 * (screenContainer).
 *
 * Permite desativar globalmente o monitoramento de ponteiro e hit-testing do palco nativo
 * do PixiJS (eventMode = 'none'), eliminando varreduras de árvore de cena sobre a fauna,
 * correntes e partículas do mundo oceânico.
 */

import type { Vector2D } from "./contracts/INTERFACE_CONTRACTS";

export interface ScreenLayerBoundingRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ScreenLayerBoundingCircle {
  readonly centerX: number;
  readonly centerY: number;
  readonly radius: number;
}

export interface ScreenLayerHitTarget {
  readonly id: string;
  readonly bounds:
    | ScreenLayerBoundingRectangle
    | (() => ScreenLayerBoundingRectangle);
  readonly circularBounds?: ScreenLayerBoundingCircle | (() => ScreenLayerBoundingCircle);
  readonly zIndex?: number;
  readonly enabled?: boolean;
  readonly onPointerDown?: (pointerCoordinates: Vector2D) => void;
  readonly onPointerUp?: (pointerCoordinates: Vector2D) => void;
  readonly onClick?: (pointerCoordinates: Vector2D) => void;
  readonly onPointerEnter?: (pointerCoordinates: Vector2D) => void;
  readonly onPointerLeave?: (pointerCoordinates: Vector2D) => void;
}

export interface ScreenLayerGeometryCheckerOptions {
  canvasElement?: HTMLCanvasElement | null;
  virtualWidth?: number;
  virtualHeight?: number;
}

export function isPointInsideRectangle(
  pointCoordinates: Vector2D,
  rectangleBounds: ScreenLayerBoundingRectangle
): boolean {
  return (
    pointCoordinates.x >= rectangleBounds.x &&
    pointCoordinates.x <= rectangleBounds.x + rectangleBounds.width &&
    pointCoordinates.y >= rectangleBounds.y &&
    pointCoordinates.y <= rectangleBounds.y + rectangleBounds.height
  );
}

export function isPointInsideCircle(
  pointCoordinates: Vector2D,
  circleBounds: ScreenLayerBoundingCircle
): boolean {
  const deltaX = pointCoordinates.x - circleBounds.centerX;
  const deltaY = pointCoordinates.y - circleBounds.centerY;
  return deltaX * deltaX + deltaY * deltaY <= circleBounds.radius * circleBounds.radius;
}

export class ScreenLayerGeometryChecker {
  private registeredTargetsMap: Map<string, ScreenLayerHitTarget> = new Map();
  private canvasElement: HTMLCanvasElement | null = null;
  private virtualWidth: number = 1280;
  private virtualHeight: number = 720;
  private canvasPointerDownListener: ((pointerEvent: PointerEvent) => void) | null = null;
  private canvasPointerUpListener: ((pointerEvent: PointerEvent) => void) | null = null;
  private canvasClickListener: ((mouseEvent: MouseEvent) => void) | null = null;
  private canvasPointerMoveListener: ((pointerEvent: PointerEvent) => void) | null = null;
  private hoveredTargetId: string | null = null;

  constructor(options?: ScreenLayerGeometryCheckerOptions) {
    if (options?.virtualWidth) {
      this.virtualWidth = options.virtualWidth;
    }
    if (options?.virtualHeight) {
      this.virtualHeight = options.virtualHeight;
    }
    if (options?.canvasElement) {
      this.attachCanvasListeners(options.canvasElement);
    }
  }

  public setDimensions(width: number, height: number): void {
    this.virtualWidth = width;
    this.virtualHeight = height;
  }

  public registerHitTarget(hitTarget: ScreenLayerHitTarget): () => void {
    this.registeredTargetsMap.set(hitTarget.id, hitTarget);
    return () => {
      this.unregisterHitTarget(hitTarget.id);
    };
  }

  public unregisterHitTarget(hitTargetIdentifier: string): void {
    this.registeredTargetsMap.delete(hitTargetIdentifier);
    if (this.hoveredTargetId === hitTargetIdentifier) {
      this.hoveredTargetId = null;
    }
  }

  public clearHitTargets(): void {
    this.registeredTargetsMap.clear();
    this.hoveredTargetId = null;
  }

  public getRegisteredTargets(): readonly ScreenLayerHitTarget[] {
    return Array.from(this.registeredTargetsMap.values());
  }

  public resolveTargetBounds(
    hitTarget: ScreenLayerHitTarget
  ): ScreenLayerBoundingRectangle {
    return typeof hitTarget.bounds === "function"
      ? hitTarget.bounds()
      : hitTarget.bounds;
  }

  public resolveTargetCircularBounds(
    hitTarget: ScreenLayerHitTarget
  ): ScreenLayerBoundingCircle | null {
    if (!hitTarget.circularBounds) {
      return null;
    }
    return typeof hitTarget.circularBounds === "function"
      ? hitTarget.circularBounds()
      : hitTarget.circularBounds;
  }

  public testTargetHit(
    hitTarget: ScreenLayerHitTarget,
    pointCoordinates: Vector2D
  ): boolean {
    if (hitTarget.enabled === false) {
      return false;
    }
    const circularBounds = this.resolveTargetCircularBounds(hitTarget);
    if (circularBounds) {
      return isPointInsideCircle(pointCoordinates, circularBounds);
    }
    const rectangleBounds = this.resolveTargetBounds(hitTarget);
    return isPointInsideRectangle(pointCoordinates, rectangleBounds);
  }

  public queryHitTarget(pointCoordinates: Vector2D): ScreenLayerHitTarget | null {
    const sortedTargets = Array.from(this.registeredTargetsMap.values())
      .filter((target) => target.enabled !== false)
      .sort((targetAlpha, targetBeta) => (targetBeta.zIndex ?? 0) - (targetAlpha.zIndex ?? 0));

    for (let index = 0; index < sortedTargets.length; index++) {
      const candidateTarget = sortedTargets[index];
      if (this.testTargetHit(candidateTarget, pointCoordinates)) {
        return candidateTarget;
      }
    }
    return null;
  }

  public queryAllHitTargets(pointCoordinates: Vector2D): ScreenLayerHitTarget[] {
    return Array.from(this.registeredTargetsMap.values())
      .filter((target) => target.enabled !== false && this.testTargetHit(target, pointCoordinates))
      .sort((targetAlpha, targetBeta) => (targetBeta.zIndex ?? 0) - (targetAlpha.zIndex ?? 0));
  }

  public convertWindowCoordinatesToScreenCoordinates(
    clientX: number,
    clientY: number
  ): Vector2D {
    if (!this.canvasElement) {
      return { x: clientX, y: clientY };
    }
    const canvasBoundingRectangle = this.canvasElement.getBoundingClientRect();
    if (canvasBoundingRectangle.width === 0 || canvasBoundingRectangle.height === 0) {
      return { x: clientX, y: clientY };
    }
    const relativeX = clientX - canvasBoundingRectangle.left;
    const relativeY = clientY - canvasBoundingRectangle.top;
    const scaleX = this.virtualWidth / canvasBoundingRectangle.width;
    const scaleY = this.virtualHeight / canvasBoundingRectangle.height;
    return {
      x: relativeX * scaleX,
      y: relativeY * scaleY,
    };
  }

  public dispatchPointerDown(screenCoordinates: Vector2D): ScreenLayerHitTarget | null {
    const hitTarget = this.queryHitTarget(screenCoordinates);
    if (hitTarget?.onPointerDown) {
      hitTarget.onPointerDown(screenCoordinates);
    }
    return hitTarget;
  }

  public dispatchPointerUp(screenCoordinates: Vector2D): ScreenLayerHitTarget | null {
    const hitTarget = this.queryHitTarget(screenCoordinates);
    if (hitTarget?.onPointerUp) {
      hitTarget.onPointerUp(screenCoordinates);
    }
    return hitTarget;
  }

  public dispatchClick(screenCoordinates: Vector2D): ScreenLayerHitTarget | null {
    const hitTarget = this.queryHitTarget(screenCoordinates);
    if (hitTarget?.onClick) {
      hitTarget.onClick(screenCoordinates);
    }
    return hitTarget;
  }

  public dispatchPointerMove(screenCoordinates: Vector2D): ScreenLayerHitTarget | null {
    const hitTarget = this.queryHitTarget(screenCoordinates);
    const hitTargetIdentifier = hitTarget ? hitTarget.id : null;

    if (this.hoveredTargetId !== hitTargetIdentifier) {
      if (this.hoveredTargetId) {
        const previousTarget = this.registeredTargetsMap.get(this.hoveredTargetId);
        if (previousTarget?.onPointerLeave) {
          previousTarget.onPointerLeave(screenCoordinates);
        }
      }
      if (hitTarget?.onPointerEnter) {
        hitTarget.onPointerEnter(screenCoordinates);
      }
      this.hoveredTargetId = hitTargetIdentifier;
    }

    return hitTarget;
  }

  public attachCanvasListeners(canvasElement: HTMLCanvasElement): () => void {
    this.detachCanvasListeners();
    this.canvasElement = canvasElement;

    this.canvasPointerDownListener = (pointerEvent: PointerEvent): void => {
      const screenCoordinates = this.convertWindowCoordinatesToScreenCoordinates(
        pointerEvent.clientX,
        pointerEvent.clientY
      );
      const hitTarget = this.dispatchPointerDown(screenCoordinates);
      if (hitTarget) {
        pointerEvent.stopPropagation();
      }
    };

    this.canvasPointerUpListener = (pointerEvent: PointerEvent): void => {
      const screenCoordinates = this.convertWindowCoordinatesToScreenCoordinates(
        pointerEvent.clientX,
        pointerEvent.clientY
      );
      const hitTarget = this.dispatchPointerUp(screenCoordinates);
      if (hitTarget) {
        pointerEvent.stopPropagation();
      }
    };

    this.canvasClickListener = (mouseEvent: MouseEvent): void => {
      const screenCoordinates = this.convertWindowCoordinatesToScreenCoordinates(
        mouseEvent.clientX,
        mouseEvent.clientY
      );
      const hitTarget = this.dispatchClick(screenCoordinates);
      if (hitTarget) {
        mouseEvent.stopPropagation();
      }
    };

    this.canvasPointerMoveListener = (pointerEvent: PointerEvent): void => {
      const screenCoordinates = this.convertWindowCoordinatesToScreenCoordinates(
        pointerEvent.clientX,
        pointerEvent.clientY
      );
      this.dispatchPointerMove(screenCoordinates);
    };

    canvasElement.addEventListener("pointerdown", this.canvasPointerDownListener);
    canvasElement.addEventListener("pointerup", this.canvasPointerUpListener);
    canvasElement.addEventListener("click", this.canvasClickListener);
    canvasElement.addEventListener("pointermove", this.canvasPointerMoveListener);

    return () => {
      this.detachCanvasListeners();
    };
  }

  public detachCanvasListeners(): void {
    if (this.canvasElement) {
      if (this.canvasPointerDownListener) {
        this.canvasElement.removeEventListener("pointerdown", this.canvasPointerDownListener);
        this.canvasPointerDownListener = null;
      }
      if (this.canvasPointerUpListener) {
        this.canvasElement.removeEventListener("pointerup", this.canvasPointerUpListener);
        this.canvasPointerUpListener = null;
      }
      if (this.canvasClickListener) {
        this.canvasElement.removeEventListener("click", this.canvasClickListener);
        this.canvasClickListener = null;
      }
      if (this.canvasPointerMoveListener) {
        this.canvasElement.removeEventListener("pointermove", this.canvasPointerMoveListener);
        this.canvasPointerMoveListener = null;
      }
      this.canvasElement = null;
    }
  }

  public destroy(): void {
    this.detachCanvasListeners();
    this.clearHitTargets();
  }
}

let activeScreenLayerGeometryChecker: ScreenLayerGeometryChecker | null = null;

export function getScreenLayerGeometryChecker(): ScreenLayerGeometryChecker {
  if (!activeScreenLayerGeometryChecker) {
    activeScreenLayerGeometryChecker = new ScreenLayerGeometryChecker();
  }
  return activeScreenLayerGeometryChecker;
}

export function initScreenLayerGeometryChecker(
  options?: ScreenLayerGeometryCheckerOptions
): ScreenLayerGeometryChecker {
  if (activeScreenLayerGeometryChecker) {
    activeScreenLayerGeometryChecker.destroy();
  }
  activeScreenLayerGeometryChecker = new ScreenLayerGeometryChecker(options);
  return activeScreenLayerGeometryChecker;
}

export function resetScreenLayerGeometryChecker(): void {
  if (activeScreenLayerGeometryChecker) {
    activeScreenLayerGeometryChecker.destroy();
    activeScreenLayerGeometryChecker = null;
  }
}

export const screenLayerGeometryChecker = {
  get instance(): ScreenLayerGeometryChecker {
    return getScreenLayerGeometryChecker();
  },
  registerHitTarget: (hitTarget: ScreenLayerHitTarget) =>
    getScreenLayerGeometryChecker().registerHitTarget(hitTarget),
  unregisterHitTarget: (hitTargetIdentifier: string) =>
    getScreenLayerGeometryChecker().unregisterHitTarget(hitTargetIdentifier),
  clearHitTargets: () => getScreenLayerGeometryChecker().clearHitTargets(),
  queryHitTarget: (pointCoordinates: Vector2D) =>
    getScreenLayerGeometryChecker().queryHitTarget(pointCoordinates),
  dispatchClick: (screenCoordinates: Vector2D) =>
    getScreenLayerGeometryChecker().dispatchClick(screenCoordinates),
};

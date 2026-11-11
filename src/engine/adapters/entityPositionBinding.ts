/**
 * entityPositionBinding.ts
 *
 * Provê encapsulamento do vetor posicional bidimensional de entidades do contexto de renderização.
 * Garante métodos vetoriais não-enumeráveis (add, sub, scale, len, unit, dist) e sincronização
 * transparente com o nó de renderização subjacente sem perda de referência.
 */

import type { Vector2D } from "../contracts/INTERFACE_CONTRACTS";

export interface RenderingContextVector2D {
  x: number;
  y: number;
  scale(
    scaleFactor: number | { readonly x: number; readonly y: number } | unknown,
    verticalScaleFactor?: number
  ): RenderingContextVector2D;
  add(otherVector: { readonly x: number; readonly y: number } | unknown): RenderingContextVector2D;
  sub(otherVector: { readonly x: number; readonly y: number } | unknown): RenderingContextVector2D;
  len(): number;
  unit(): RenderingContextVector2D;
  dist(otherVector: { readonly x: number; readonly y: number } | unknown): number;
}

export function createRenderingContextVector2D(
  coordinateX: number,
  coordinateY: number
): RenderingContextVector2D {
  const vectorInstance: RenderingContextVector2D = {
    x: coordinateX,
    y: coordinateY,
  } as RenderingContextVector2D;

  Object.defineProperties(vectorInstance, {
    scale: {
      value(
        this: RenderingContextVector2D,
        scaleFactor: number | { readonly x: number; readonly y: number } | unknown,
        verticalScaleFactor?: number
      ): RenderingContextVector2D {
        if (typeof scaleFactor === "number") {
          const factorY =
            typeof verticalScaleFactor === "number" ? verticalScaleFactor : scaleFactor;
          return createRenderingContextVector2D(this.x * scaleFactor, this.y * factorY);
        }
        if (
          scaleFactor !== null &&
          typeof scaleFactor === "object" &&
          "x" in scaleFactor &&
          "y" in scaleFactor &&
          typeof (scaleFactor as { x: unknown }).x === "number" &&
          typeof (scaleFactor as { y: unknown }).y === "number"
        ) {
          const vectorTarget = scaleFactor as { readonly x: number; readonly y: number };
          return createRenderingContextVector2D(this.x * vectorTarget.x, this.y * vectorTarget.y);
        }
        return createRenderingContextVector2D(this.x, this.y);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    add: {
      value(
        this: RenderingContextVector2D,
        otherVector: { readonly x: number; readonly y: number } | unknown
      ): RenderingContextVector2D {
        if (
          otherVector !== null &&
          typeof otherVector === "object" &&
          "x" in otherVector &&
          "y" in otherVector &&
          typeof (otherVector as { x: unknown }).x === "number" &&
          typeof (otherVector as { y: unknown }).y === "number"
        ) {
          const vectorTarget = otherVector as { readonly x: number; readonly y: number };
          return createRenderingContextVector2D(this.x + vectorTarget.x, this.y + vectorTarget.y);
        }
        return createRenderingContextVector2D(this.x, this.y);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    sub: {
      value(
        this: RenderingContextVector2D,
        otherVector: { readonly x: number; readonly y: number } | unknown
      ): RenderingContextVector2D {
        if (
          otherVector !== null &&
          typeof otherVector === "object" &&
          "x" in otherVector &&
          "y" in otherVector &&
          typeof (otherVector as { x: unknown }).x === "number" &&
          typeof (otherVector as { y: unknown }).y === "number"
        ) {
          const vectorTarget = otherVector as { readonly x: number; readonly y: number };
          return createRenderingContextVector2D(this.x - vectorTarget.x, this.y - vectorTarget.y);
        }
        return createRenderingContextVector2D(this.x, this.y);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    len: {
      value(this: RenderingContextVector2D): number {
        return Math.hypot(this.x, this.y);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    unit: {
      value(this: RenderingContextVector2D): RenderingContextVector2D {
        const vectorMagnitude = Math.hypot(this.x, this.y);
        if (vectorMagnitude === 0) {
          return createRenderingContextVector2D(0, 0);
        }
        return createRenderingContextVector2D(this.x / vectorMagnitude, this.y / vectorMagnitude);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    dist: {
      value(
        this: RenderingContextVector2D,
        otherVector: { readonly x: number; readonly y: number } | unknown
      ): number {
        if (
          otherVector !== null &&
          typeof otherVector === "object" &&
          "x" in otherVector &&
          "y" in otherVector &&
          typeof (otherVector as { x: unknown }).x === "number" &&
          typeof (otherVector as { y: unknown }).y === "number"
        ) {
          const vectorTarget = otherVector as { readonly x: number; readonly y: number };
          return Math.hypot(this.x - vectorTarget.x, this.y - vectorTarget.y);
        }
        return 0;
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });

  return vectorInstance;
}

export interface EntityPositionBinding extends RenderingContextVector2D {
  set(targetCoordinateX: number, targetCoordinateY: number): void;
}

export function createEntityPositionBinding(
  getOrInitialCoordinateX: number | (() => number),
  getOrInitialCoordinateY: number | (() => number),
  onPositionChangedNotification: (updatedCoordinateX: number, updatedCoordinateY: number) => void
): EntityPositionBinding {
  let internalCoordinateX =
    typeof getOrInitialCoordinateX === "number" ? getOrInitialCoordinateX : 0;
  let internalCoordinateY =
    typeof getOrInitialCoordinateY === "number" ? getOrInitialCoordinateY : 0;

  const getCoordinateX =
    typeof getOrInitialCoordinateX === "function"
      ? getOrInitialCoordinateX
      : () => internalCoordinateX;
  const getCoordinateY =
    typeof getOrInitialCoordinateY === "function"
      ? getOrInitialCoordinateY
      : () => internalCoordinateY;

  const positionBindingInstance = {} as EntityPositionBinding;

  Object.defineProperty(positionBindingInstance, "x", {
    get: getCoordinateX,
    set: (updatedCoordinateX: number): void => {
      internalCoordinateX = updatedCoordinateX;
      onPositionChangedNotification(updatedCoordinateX, getCoordinateY());
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(positionBindingInstance, "y", {
    get: getCoordinateY,
    set: (updatedCoordinateY: number): void => {
      internalCoordinateY = updatedCoordinateY;
      onPositionChangedNotification(getCoordinateX(), updatedCoordinateY);
    },
    enumerable: true,
    configurable: true,
  });

  Object.defineProperties(positionBindingInstance, {
    set: {
      value: (targetCoordinateX: number, targetCoordinateY: number): void => {
        internalCoordinateX = targetCoordinateX;
        internalCoordinateY = targetCoordinateY;
        onPositionChangedNotification(targetCoordinateX, targetCoordinateY);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    scale: {
      value: (
        scaleFactor: number | { readonly x: number; readonly y: number } | unknown,
        verticalScaleFactor?: number
      ): RenderingContextVector2D => {
        const currentX = getCoordinateX();
        const currentY = getCoordinateY();
        if (typeof scaleFactor === "number") {
          const factorY =
            typeof verticalScaleFactor === "number" ? verticalScaleFactor : scaleFactor;
          return createRenderingContextVector2D(currentX * scaleFactor, currentY * factorY);
        }
        if (
          scaleFactor !== null &&
          typeof scaleFactor === "object" &&
          "x" in scaleFactor &&
          "y" in scaleFactor &&
          typeof (scaleFactor as { x: unknown }).x === "number" &&
          typeof (scaleFactor as { y: unknown }).y === "number"
        ) {
          const vectorTarget = scaleFactor as { readonly x: number; readonly y: number };
          return createRenderingContextVector2D(
            currentX * vectorTarget.x,
            currentY * vectorTarget.y
          );
        }
        return createRenderingContextVector2D(currentX, currentY);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    add: {
      value: (
        otherVector: { readonly x: number; readonly y: number } | unknown
      ): RenderingContextVector2D => {
        const currentX = getCoordinateX();
        const currentY = getCoordinateY();
        if (
          otherVector !== null &&
          typeof otherVector === "object" &&
          "x" in otherVector &&
          "y" in otherVector &&
          typeof (otherVector as { x: unknown }).x === "number" &&
          typeof (otherVector as { y: unknown }).y === "number"
        ) {
          const vectorTarget = otherVector as { readonly x: number; readonly y: number };
          return createRenderingContextVector2D(
            currentX + vectorTarget.x,
            currentY + vectorTarget.y
          );
        }
        return createRenderingContextVector2D(currentX, currentY);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    sub: {
      value: (
        otherVector: { readonly x: number; readonly y: number } | unknown
      ): RenderingContextVector2D => {
        const currentX = getCoordinateX();
        const currentY = getCoordinateY();
        if (
          otherVector !== null &&
          typeof otherVector === "object" &&
          "x" in otherVector &&
          "y" in otherVector &&
          typeof (otherVector as { x: unknown }).x === "number" &&
          typeof (otherVector as { y: unknown }).y === "number"
        ) {
          const vectorTarget = otherVector as { readonly x: number; readonly y: number };
          return createRenderingContextVector2D(
            currentX - vectorTarget.x,
            currentY - vectorTarget.y
          );
        }
        return createRenderingContextVector2D(currentX, currentY);
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    len: {
      value: (): number => {
        return Math.hypot(getCoordinateX(), getCoordinateY());
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    unit: {
      value: (): RenderingContextVector2D => {
        const currentX = getCoordinateX();
        const currentY = getCoordinateY();
        const vectorMagnitude = Math.hypot(currentX, currentY);
        if (vectorMagnitude === 0) {
          return createRenderingContextVector2D(0, 0);
        }
        return createRenderingContextVector2D(
          currentX / vectorMagnitude,
          currentY / vectorMagnitude
        );
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
    dist: {
      value: (
        otherVector: Vector2D | { readonly x: number; readonly y: number } | unknown
      ): number => {
        const currentX = getCoordinateX();
        const currentY = getCoordinateY();
        if (
          otherVector !== null &&
          typeof otherVector === "object" &&
          "x" in otherVector &&
          "y" in otherVector &&
          typeof (otherVector as { x: unknown }).x === "number" &&
          typeof (otherVector as { y: unknown }).y === "number"
        ) {
          const vectorTarget = otherVector as { readonly x: number; readonly y: number };
          return Math.hypot(currentX - vectorTarget.x, currentY - vectorTarget.y);
        }
        return 0;
      },
      enumerable: false,
      writable: true,
      configurable: true,
    },
  });

  return positionBindingInstance;
}

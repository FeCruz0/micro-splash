import type { CompanionVector2D } from "./types";

export interface CompanionMathHelperContext<
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  vec2?: (coordinateX: number, coordinateY: number) => TVec;
  rgb?: (redChannel: number, greenChannel: number, blueChannel: number) => TColor;
  clamp?: (value: number, minimum: number, maximum: number) => number;
  deg2rad?: (degrees: number) => number;
  rad2deg?: (radians: number) => number;
  lerp?: (startValue: number, endValue: number, interpolationFactor: number) => number;
}

export function clampCompanionValue(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function convertCompanionDegreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function convertCompanionRadiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function linearInterpolateCompanionValue(
  startValue: number,
  endValue: number,
  interpolationFactor: number
): number {
  return startValue + (endValue - startValue) * interpolationFactor;
}

export function createCompanionVector2D<TVec extends { x: number; y: number } = CompanionVector2D>(
  engineContext: unknown,
  coordinateX: number,
  coordinateY: number
): TVec {
  const helperContext = engineContext as
    CompanionMathHelperContext<unknown, TVec> | null | undefined;
  if (helperContext && typeof helperContext.vec2 === "function") {
    return helperContext.vec2(coordinateX, coordinateY);
  }

  const vector: CompanionVector2D = {
    x: coordinateX,
    y: coordinateY,
    dist: (otherVector: CompanionVector2D) =>
      Math.hypot(otherVector.x - coordinateX, otherVector.y - coordinateY),
    scale: (scaleFactor: number) =>
      createCompanionVector2D<CompanionVector2D>(
        engineContext,
        coordinateX * scaleFactor,
        coordinateY * scaleFactor
      ),
    add: (otherVector: CompanionVector2D) =>
      createCompanionVector2D<CompanionVector2D>(
        engineContext,
        coordinateX + otherVector.x,
        coordinateY + otherVector.y
      ),
    len: () => Math.hypot(coordinateX, coordinateY),
    unit: () => {
      const vectorLength = Math.hypot(coordinateX, coordinateY) || 1;
      return createCompanionVector2D<CompanionVector2D>(
        engineContext,
        coordinateX / vectorLength,
        coordinateY / vectorLength
      );
    },
  };
  return vector as unknown as TVec;
}

export function resolveCompanionColorValue(
  engineContext: unknown,
  redChannel: number,
  greenChannel: number,
  blueChannel: number
): unknown {
  const helperContext = engineContext as CompanionMathHelperContext | null | undefined;
  return helperContext && typeof helperContext.rgb === "function"
    ? helperContext.rgb(redChannel, greenChannel, blueChannel)
    : [redChannel, greenChannel, blueChannel];
}

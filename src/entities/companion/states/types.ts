import type {
  CompanionOptions,
  CompanionState,
  CompanionGameObject,
  CompanionVector2D,
} from "../types";
import type { RandomNumberGenerator } from "../../../utils/random";
import type { IRenderEngine } from "../../../engine/contracts/INTERFACE_CONTRACTS";

export interface CompanionEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  circle: (radius: number) => unknown;
  pos: (coordinateX: number, coordinateY: number) => unknown;
  color: (redChannel: number | TColor, greenChannel?: number, blueChannel?: number) => unknown;
  opacity: (alpha: number) => unknown;
  outline?: (width: number, colorValue: TColor) => unknown;
  z: (layerIndex: number) => unknown;
  rgb: (redChannel: number, greenChannel: number, blueChannel: number) => TColor;
  vec2: (coordinateX: number, coordinateY: number) => TVec;
  clamp: (value: number, minimum: number, maximum: number) => number;
  rad2deg: (radians: number) => number;
  deg2rad: (degrees: number) => number;
  lerp: (startValue: number, endValue: number, interpolationFactor: number) => number;
  height?: () => number;
  get?: (tagIdentifier: string) => unknown[];
  sprite?: (name: string, options?: { anim?: string }) => unknown;
  rotate?: (angleInDegrees: number) => unknown;
  anchor?: (anchorAlignment: "center") => unknown;
  scale?: (scaleX: number, scaleY: number) => unknown;
  area?: (options?: unknown) => unknown;
  Rect?: new (position: TVec, width: number, height: number) => unknown;
}

export type NativeCompanionEngineContext = IRenderEngine | CompanionEngineContext;

export interface CompanionStateContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  k: IRenderEngine | CompanionEngineContext<TDestroyable, TColor, TVec>;
  companion: CompanionGameObject;
  options: CompanionOptions;
  prng: RandomNumberGenerator;
  getOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  drainOxygen?: (amount: number) => void;
  getMaxOxygen: () => number;
  getKrillsEaten: () => number;
  incrementKrillsEaten: () => void;
  emitDoubleBlowholeSpout: (coordinateX: number, coordinateY: number) => void;
  onResetVerticalSpeed: () => void;
  stateTimer: number;
}

export interface CompanionStateUpdateResult {
  targetAngle: number;
  nextState?: CompanionState;
}

export interface CompanionStateNode {
  readonly name: CompanionState;
  onEnter?: (context: CompanionStateContext) => void;
  onUpdate: (
    context: CompanionStateContext,
    deltaTime: number,
    playerX?: number,
    targetKrill?: unknown | null,
    targetHazard?: unknown | null
  ) => CompanionStateUpdateResult;
  onExit?: (context: CompanionStateContext) => void;
}

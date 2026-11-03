import type {
  CompanionOptions,
  CompanionState,
  CompanionGameObject,
  CompanionVector2D,
} from "../types";
import type { RandomNumberGenerator } from "../../../utils/random";

export interface CompanionEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  circle: (r: number) => unknown;
  pos: (x: number, y: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline?: (w: number, col: TColor) => unknown;
  z: (v: number) => unknown;
  rgb: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
  clamp: (val: number, min: number, max: number) => number;
  rad2deg: (rad: number) => number;
  deg2rad: (deg: number) => number;
  lerp: (a: number, b: number, t: number) => number;
  height?: () => number;
  get?: (tag: string) => unknown[];
  sprite?: (name: string, opt?: { anim?: string }) => unknown;
  rotate?: (a: number) => unknown;
  anchor?: (a: "center") => unknown;
  scale?: (x: number, y: number) => unknown;
  area?: (opt?: unknown) => unknown;
  body?: () => unknown;
  Rect?: new (pos: TVec, w: number, h: number) => unknown;
}

export interface CompanionStateContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  k: CompanionEngineContext<TDestroyable, TColor, TVec>;
  companion: CompanionGameObject;
  options: CompanionOptions;
  prng: RandomNumberGenerator;
  getOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  drainOxygen?: (amount: number) => void;
  getMaxOxygen: () => number;
  getKrillsEaten: () => number;
  incrementKrillsEaten: () => void;
  emitDoubleBlowholeSpout: (x: number, y: number) => void;
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

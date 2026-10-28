import type { GameObj, KaboomCtx } from "kaboom";
import type { CompanionOptions, CompanionState } from "../types";
import type { RandomNumberGenerator } from "../../../utils/random";

export interface CompanionStateContext {
  k: KaboomCtx;
  companion: GameObj;
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
    targetKrill?: GameObj | null,
    targetHazard?: GameObj | null
  ) => CompanionStateUpdateResult;
  onExit?: (context: CompanionStateContext) => void;
}

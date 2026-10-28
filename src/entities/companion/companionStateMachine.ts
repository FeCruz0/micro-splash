import type { GameObj } from "kaboom";
import type { CompanionState } from "./types";
import type { CompanionStateContext, CompanionStateNode } from "./states/types";
import {
  AvoidObstacleState,
  CruiseState,
  DepartedState,
  FaintedState,
  FarewellBreachState,
  IndependentCruiseState,
  IntroState,
  RestingState,
  SeekBreathState,
  SurfaceBreatheState,
  TrappedState,
  VictoryBreachState,
} from "./states/concreteStates";

export class CompanionStateMachine {
  private readonly states: Map<CompanionState, CompanionStateNode> = new Map();
  private currentStateNode: CompanionStateNode;
  private readonly onStateChangeCallback?: (state: CompanionState) => void;

  constructor(
    initialState: CompanionState = "INTRO",
    onStateChange?: (state: CompanionState) => void
  ) {
    this.onStateChangeCallback = onStateChange;

    this.registerState(new IntroState());
    this.registerState(new CruiseState());
    this.registerState(new SeekBreathState());
    this.registerState(new SurfaceBreatheState());
    this.registerState(new RestingState());
    this.registerState(new FarewellBreachState());
    this.registerState(new DepartedState());
    this.registerState(new IndependentCruiseState());
    this.registerState(new AvoidObstacleState());
    this.registerState(new TrappedState());
    this.registerState(new FaintedState());
    this.registerState(new VictoryBreachState());

    const initial = this.states.get(initialState);
    if (!initial) {
      throw new Error(`[CompanionStateMachine] Estado inicial desconhecido: ${initialState}`);
    }
    this.currentStateNode = initial;
  }

  public registerState(node: CompanionStateNode): void {
    this.states.set(node.name, node);
    if (this.currentStateNode && this.currentStateNode.name === node.name) {
      this.currentStateNode = node;
    }
  }

  public getState(): CompanionState {
    return this.currentStateNode.name;
  }

  public transitionTo(nextState: CompanionState, ctx: CompanionStateContext): void {
    if (this.currentStateNode.name === nextState) return;

    const nextNode = this.states.get(nextState);
    if (!nextNode) {
      console.warn(`[CompanionStateMachine] Transição para estado inválido ignorada: ${nextState}`);
      return;
    }

    if (this.currentStateNode.onExit) {
      this.currentStateNode.onExit(ctx);
    }

    this.currentStateNode = nextNode;

    if (this.currentStateNode.onEnter) {
      this.currentStateNode.onEnter(ctx);
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(nextState);
    }
  }

  public update(
    ctx: CompanionStateContext,
    dt: number,
    playerX?: number,
    targetKrill?: GameObj | null,
    targetHazard?: GameObj | null
  ): number {
    const result = this.currentStateNode.onUpdate(ctx, dt, playerX, targetKrill, targetHazard);

    if (result.nextState && result.nextState !== this.currentStateNode.name) {
      this.transitionTo(result.nextState, ctx);
    }

    return result.targetAngle;
  }
}

import type { KaboomCtx } from "kaboom";
import type { PlayerPhysicsManager } from "./playerPhysics";

export class PlayerTrapManager {
  private isTrappedState = false;
  private escapesNeededCount = 0;
  private isBreachingState = false;
  private isDraftingState = false;
  private isFrozenState = false;
  private physicsMgr: PlayerPhysicsManager;
  private k: KaboomCtx;

  constructor(k: KaboomCtx, physicsMgr: PlayerPhysicsManager) {
    this.k = k;
    this.physicsMgr = physicsMgr;
  }

  public trapInNet(count: number): void {
    this.isTrappedState = true;
    this.escapesNeededCount = Math.max(this.escapesNeededCount, count);
    this.physicsMgr.setSpeed(this.physicsMgr.getSpeed().scale(0.3));
  }

  public addTrapCount(count: number): void {
    this.isTrappedState = true;
    this.escapesNeededCount += count;
    this.physicsMgr.setSpeed(this.physicsMgr.getSpeed().scale(0.5));
  }

  public isTrapped(): boolean {
    return this.isTrappedState;
  }

  public setTrapped(trapped: boolean): void {
    this.isTrappedState = trapped;
    if (!trapped) {
      this.escapesNeededCount = 0;
    }
  }

  public getEscapesNeeded(): number {
    return this.escapesNeededCount;
  }

  public tryEscape(): boolean {
    this.escapesNeededCount--;
    if (this.escapesNeededCount <= 0) {
      this.isTrappedState = false;
      this.escapesNeededCount = 0;
      return true;
    }
    return false;
  }

  public startBreach(): void {
    this.isBreachingState = true;
    this.isTrappedState = false;
  }

  public isBreaching(): boolean {
    return this.isBreachingState;
  }

  public completeBreach(): void {
    this.isBreachingState = false;
    this.physicsMgr.setSpeed(this.k.vec2(120, 0));
  }

  public setDrafting(drafting: boolean): void {
    this.isDraftingState = drafting;
  }

  public isDrafting(): boolean {
    return this.isDraftingState;
  }

  public freeze(): void {
    this.isFrozenState = true;
    this.physicsMgr.setSpeed(this.k.vec2(0, 0));
  }

  public unfreeze(): void {
    this.isFrozenState = false;
  }

  public isFrozen(): boolean {
    return this.isFrozenState;
  }
}

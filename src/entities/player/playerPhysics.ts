import { GAME_CONFIG } from "../../config";
import {
  createWaterSplash,
  createBreachReentrySplash,
  type BreachSplashEngineContext,
} from "../../systems/breachSystem";
import { audioSystem } from "../../systems/audioSystem";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import type { PlayerGameObject, PlayerVector2D, StrictPlayerVector2D } from "./types";

export interface PlayerPhysicsEngineContext extends BreachSplashEngineContext<
  unknown,
  unknown,
  StrictPlayerVector2D
> {
  vec2(x: number, y: number): StrictPlayerVector2D;
  deg2rad(deg: number): number;
  rad2deg(rad: number): number;
  clamp(val: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  height?(): number;
  shake?(intensity: number): void;
}

export class PlayerPhysicsManager {
  private k: PlayerPhysicsEngineContext;
  private currentSpeed: StrictPlayerVector2D;
  private strokeTimer = 0;
  private wasInAir = false;

  constructor(k: PlayerPhysicsEngineContext) {
    this.k = k;
    this.currentSpeed = k.vec2(0, 0);
  }

  public getSpeed(): StrictPlayerVector2D {
    return this.currentSpeed;
  }

  public setSpeed(newSpeed: StrictPlayerVector2D | PlayerVector2D): void {
    if (
      typeof (newSpeed as StrictPlayerVector2D).len === "function" &&
      typeof (newSpeed as StrictPlayerVector2D).scale === "function"
    ) {
      this.currentSpeed = newSpeed as StrictPlayerVector2D;
    } else {
      this.currentSpeed = this.k.vec2(newSpeed.x, newSpeed.y);
    }
  }

  public getStrokeTimer(): number {
    return this.strokeTimer;
  }

  public resetStrokeTimer(): void {
    this.strokeTimer = 0;
  }

  public applyThrust(
    dt: number,
    facingRight: boolean,
    angle: number,
    isDrafting: boolean,
    maxSpeed: number,
    speedBoostMultiplier: number = 1.0
  ): void {
    if (this.strokeTimer < GAME_CONFIG.MAX_STROKE_TIME) {
      this.strokeTimer += dt;
      const progresso = this.strokeTimer / GAME_CONFIG.MAX_STROKE_TIME;
      const draftBoost = (isDrafting ? 1.25 : 1.0) * speedBoostMultiplier;
      const curvaForca =
        (GAME_CONFIG.BASE_THRUST + Math.sin(progresso * Math.PI) * GAME_CONFIG.PEAK_THRUST) *
        draftBoost;
      const angleInRadians = this.k.deg2rad(angle);
      const direcao = this.k.vec2(
        facingRight ? Math.cos(angleInRadians) : -Math.cos(angleInRadians),
        Math.sin(angleInRadians)
      );

      this.currentSpeed = this.currentSpeed.add(direcao.scale(curvaForca * dt));

      const currentMaxSpeed = maxSpeed * draftBoost;
      if (this.currentSpeed.len() > currentMaxSpeed) {
        this.currentSpeed = this.currentSpeed.unit().scale(currentMaxSpeed);
      }
    }
  }

  public updateMovement(
    dt: number,
    baleia: PlayerGameObject,
    facingRight: boolean,
    angle: number,
    isBreaching: boolean
  ): { inAir: boolean; newAngle: number } {
    const inAir = baleia.pos.y < GAME_CONFIG.SEA_LEVEL + 6;
    let newAngle = angle;

    if (inAir) {
      // Voo balístico majestoso pelo ar
      const gravity = isBreaching ? 620 : 340;
      this.currentSpeed.y += gravity * dt;
      const airDragFactor = Math.pow(0.998, dt * 60);
      this.currentSpeed.x = this.currentSpeed.x * airDragFactor;
      baleia.move?.(this.currentSpeed.x, this.currentSpeed.y);

      if (this.currentSpeed.len() > 20) {
        const trajectoryAngle = this.k.clamp(
          this.k.rad2deg(Math.atan2(this.currentSpeed.y, Math.abs(this.currentSpeed.x))),
          -45,
          45
        );
        const trajectoryLerpFactor = 1 - Math.pow(1 - 0.1, dt * 60);
        newAngle = this.k.lerp(newAngle, trajectoryAngle, trajectoryLerpFactor);
      }
    } else {
      if (isBreaching) {
        // Fase de propulsão ascendente do Salto Majestoso até romper a água
        if (this.currentSpeed.y > -420) {
          this.currentSpeed.y = -420;
        }
        if (this.currentSpeed.x < 260) {
          this.currentSpeed.x = 260;
        }
        baleia.move?.(this.currentSpeed.x, this.currentSpeed.y);
      } else {
        // Nado hidrodinâmico na água
        baleia.move?.(this.currentSpeed.x, this.currentSpeed.y + GAME_CONFIG.SINK_RATE);
        const waterDragFactor = Math.pow(GAME_CONFIG.WATER_DRAG, dt * 60);
        this.currentSpeed = this.currentSpeed.scale(waterDragFactor);
      }
    }

    if (baleia.pos.y < -50) {
      this.currentSpeed.y += 280 * dt;
    }

    // Splashdown ao reentrar na água (Fase 31.1)
    if (this.wasInAir && !inAir) {
      if (this.currentSpeed.y > 200 || isBreaching) {
        createBreachReentrySplash(this.k, this.k.vec2(baleia.pos.x, GAME_CONFIG.SEA_LEVEL), 20);
        accessibilitySystem.triggerShake(this.k, isBreaching ? 6.0 : 4.5);
      } else {
        createWaterSplash(this.k, this.k.vec2(baleia.pos.x, GAME_CONFIG.SEA_LEVEL), 28);
        accessibilitySystem.triggerShake(this.k, 3.0);
      }
      audioSystem.playWaterSplash();
    }
    this.wasInAir = inAir;

    this.handleSeabedAndFailSafe(baleia, facingRight);

    return { inAir, newAngle };
  }

  private handleSeabedAndFailSafe(baleia: PlayerGameObject, facingRight: boolean): void {
    const screenHeight = typeof this.k.height === "function" ? this.k.height() : 720;
    const seabedLimit = screenHeight - 55;
    if (baleia.pos.y > seabedLimit) {
      baleia.pos.y = seabedLimit;
      if (this.currentSpeed.y > 0) {
        this.currentSpeed.y = 0;
      }
    }

    if (baleia.pos.y < -250) {
      baleia.pos.y = GAME_CONFIG.SEA_LEVEL + 40;
      this.currentSpeed = this.k.vec2(facingRight ? 100 : -100, 30);
    } else if (baleia.pos.y > screenHeight + 100) {
      baleia.pos.y = seabedLimit;
      this.currentSpeed.y = 0;
    }
  }
}

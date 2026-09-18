import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG } from "../../config";
import { createWaterSplash } from "../../systems/breachSystem";
import { audioSystem } from "../../systems/audioSystem";

export class PlayerPhysicsManager {
  private k: KaboomCtx;
  private currentSpeed: Vec2;
  private strokeTimer = 0;
  private wasInAir = false;

  constructor(k: KaboomCtx) {
    this.k = k;
    this.currentSpeed = k.vec2(0, 0);
  }

  public getSpeed(): Vec2 {
    return this.currentSpeed;
  }

  public setSpeed(newSpeed: Vec2): void {
    this.currentSpeed = newSpeed;
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
    baleia: GameObj,
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
      this.currentSpeed.x = this.currentSpeed.x * 0.998;
      baleia.move(this.currentSpeed.x, this.currentSpeed.y);

      if (this.currentSpeed.len() > 20) {
        const trajectoryAngle = this.k.clamp(
          this.k.rad2deg(Math.atan2(this.currentSpeed.y, Math.abs(this.currentSpeed.x))),
          -45,
          45
        );
        newAngle = this.k.lerp(newAngle, trajectoryAngle, 0.1);
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
        baleia.move(this.currentSpeed.x, this.currentSpeed.y);
      } else {
        // Nado hidrodinâmico na água
        baleia.move(this.currentSpeed.x, this.currentSpeed.y + GAME_CONFIG.SINK_RATE);
        this.currentSpeed = this.currentSpeed.scale(GAME_CONFIG.WATER_DRAG);
      }
    }

    if (baleia.pos.y < -50) {
      this.currentSpeed.y += 280 * dt;
    }

    // Splashdown ao reentrar na água
    if (this.wasInAir && !inAir) {
      createWaterSplash(this.k, this.k.vec2(baleia.pos.x, GAME_CONFIG.SEA_LEVEL), 28);
      audioSystem.playWaterSplash();
      this.k.shake(3.0);
    }
    this.wasInAir = inAir;

    this.handleSeabedAndFailSafe(baleia, facingRight);

    return { inAir, newAngle };
  }

  private handleSeabedAndFailSafe(baleia: GameObj, facingRight: boolean): void {
    const seabedLimit = this.k.height() - 55;
    if (baleia.pos.y > seabedLimit) {
      baleia.pos.y = seabedLimit;
      if (this.currentSpeed.y > 0) {
        this.currentSpeed.y = 0;
      }
    }

    if (baleia.pos.y < -250) {
      baleia.pos.y = GAME_CONFIG.SEA_LEVEL + 40;
      this.currentSpeed = this.k.vec2(facingRight ? 100 : -100, 30);
    } else if (baleia.pos.y > this.k.height() + 100) {
      baleia.pos.y = seabedLimit;
      this.currentSpeed.y = 0;
    }
  }
}

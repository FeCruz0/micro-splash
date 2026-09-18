import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG } from "../../config";
import { isPositionInIceGap } from "../../systems/iceSurface";
import { audioSystem } from "../../systems/audioSystem";
import { spawnBlowholeSpout, spawnOilSpout, spawnPurifyBubbles } from "./playerParticles";

export class PlayerOxygenManager {
  private k: KaboomCtx;
  private oxygen = 100;
  private baseMaxOxygen = 100;
  private krillsEaten = 0;
  private blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
  private spoutCooldown = 0;
  private isOilObstructed = false;
  private oilCleanTimer = 0;
  private isFainting = false;

  constructor(k: KaboomCtx) {
    this.k = k;
  }

  public getOxygen(): number {
    return this.oxygen;
  }

  public getMaxOxygen(): number {
    return this.baseMaxOxygen + this.krillsEaten * 1;
  }

  public getKrillsEaten(): number {
    return this.krillsEaten;
  }

  public isFaintingState(): boolean {
    return this.isFainting;
  }

  public isObstructed(): boolean {
    return this.isOilObstructed;
  }

  public setOilObstructed(obstructed: boolean): void {
    if (!this.isOilObstructed && obstructed) {
      this.isOilObstructed = true;
      this.oilCleanTimer = 0;
      audioSystem.playOilChoke();
      this.k.shake(2);
    }
  }

  public consumeKrill(): void {
    this.krillsEaten++;
    const newMax = this.getMaxOxygen();
    this.oxygen = Math.min(this.oxygen + GAME_CONFIG.KRILL_OXYGEN_RESTORE, newMax);
  }

  public penalizeTrash(): void {
    this.oxygen = Math.max(0, this.oxygen - GAME_CONFIG.TRASH_OXYGEN_PENALTY);
  }

  public restoreOxygen(amount: number): void {
    const max = this.getMaxOxygen();
    this.oxygen = Math.min(max, this.oxygen + amount);
    this.blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
    this.isFainting = false;
  }

  public update(
    dt: number,
    pos: Vec2,
    currentSpeedX: number,
    facingRight: boolean,
    isDrafting: boolean,
    isSereneMode: boolean
  ): void {
    if (this.spoutCooldown > 0) {
      this.spoutCooldown -= dt;
    }

    const isAtSurface = pos.y <= GAME_CONFIG.SEA_LEVEL + 40;
    const canBreathe = isAtSurface && isPositionInIceGap(pos.x);

    // Enseada final de Arraial do Cabo (>= 29.600m): refúgio seguro da vitória
    if (pos.x >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 400) {
      if (this.oxygen < 35) {
        this.oxygen = 35;
      }
      this.blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
      this.isFainting = false;
      return;
    }

    if (isSereneMode) {
      this.oxygen = this.getMaxOxygen();
      this.isFainting = false;

      if (canBreathe && this.spoutCooldown <= 0 && pos.y <= GAME_CONFIG.SEA_LEVEL + 15) {
        this.spoutCooldown = 2.5;
        if (this.isOilObstructed) {
          spawnOilSpout(this.k, pos, facingRight, currentSpeedX);
        } else {
          spawnBlowholeSpout(this.k, pos, facingRight, currentSpeedX);
        }
      }
    } else if (!canBreathe || this.isOilObstructed) {
      const drainMult = isDrafting ? 0.60 : 1.0;
      this.oxygen = Math.max(0, this.oxygen - dt * GAME_CONFIG.OXYGEN_DRAIN_RATE * drainMult);

      if (this.isOilObstructed && pos.y <= GAME_CONFIG.SEA_LEVEL + 15 && this.spoutCooldown <= 0) {
        this.spoutCooldown = 2.0;
        spawnOilSpout(this.k, pos, facingRight, currentSpeedX);
      }

      if (this.oxygen === 0) {
        this.blackoutTimer -= dt;
        if (this.blackoutTimer <= 0) {
          this.isFainting = true;
          this.k.shake(4);
        }
      }
    } else {
      const currentMaxOx = this.getMaxOxygen();
      if (this.oxygen < currentMaxOx) {
        const hadLowOxygen = this.oxygen < GAME_CONFIG.BLOWHOLE_OXYGEN_THRESHOLD;
        this.oxygen = currentMaxOx;
        this.blackoutTimer = GAME_CONFIG.BLACKOUT_GRACE_TIME;
        this.k.shake(2);

        if (hadLowOxygen && this.spoutCooldown <= 0) {
          this.spoutCooldown = 2.0;
          spawnBlowholeSpout(this.k, pos, facingRight, currentSpeedX);
        }
      }
    }

    // Purificação por mergulho profundo
    if (this.isOilObstructed) {
      if (pos.y >= GAME_CONFIG.SEA_LEVEL + 130) {
        this.oilCleanTimer += dt;
        if (this.oilCleanTimer >= 1.8) {
          this.isOilObstructed = false;
          this.oilCleanTimer = 0;
          audioSystem.playPurifyWhoosh();
          spawnPurifyBubbles(this.k, pos);
          this.k.shake(2);
        }
      } else {
        this.oilCleanTimer = Math.max(0, this.oilCleanTimer - dt * 0.4);
      }
    }
  }
}

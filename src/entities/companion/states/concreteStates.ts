import type { GameObj } from "kaboom";
import { COMPANION_CONFIG, GAME_CONFIG } from "../../../config";
import { getNearestIceGap, isPositionInIceGap } from "../../../systems/iceSurface";
import type {
  CompanionStateContext,
  CompanionStateNode,
  CompanionStateUpdateResult,
} from "./types";

export class IntroState implements CompanionStateNode {
  public readonly name = "INTRO";

  public onUpdate(
    ctx: CompanionStateContext,
    _dt: number,
    playerX?: number
  ): CompanionStateUpdateResult {
    const isAutonomous = ctx.options.autonomyMode === "autonomous" || ctx.options.isCoMigration;

    // No modo autônomo, inicia o nado por aclimatação espontânea sem depender do jogador
    if (isAutonomous && ctx.stateTimer >= COMPANION_CONFIG.AUTONOMOUS_INTRO_DELAY) {
      return {
        targetAngle: 0,
        nextState: "INDEPENDENT_CRUISE",
      };
    }

    const shouldStartCruise = playerX !== undefined && playerX > 40;
    return {
      targetAngle: 0,
      nextState: shouldStartCruise ? "CRUISE" : undefined,
    };
  }
}

export class CruiseState implements CompanionStateNode {
  public readonly name = "CRUISE";

  public onEnter(ctx: CompanionStateContext): void {
    if (typeof ctx.companion.play === "function") {
      ctx.companion.play("idle_swim");
    }
  }

  public onUpdate(
    ctx: CompanionStateContext,
    _dt: number,
    _playerX?: number,
    targetKrill?: GameObj | null
  ): CompanionStateUpdateResult {
    const { k, companion, stateTimer } = ctx;

    if (targetKrill && (!targetKrill.exists || targetKrill.exists())) {
      const deltaY = targetKrill.pos.y - companion.pos.y;
      const deltaX = Math.max(40, targetKrill.pos.x - companion.pos.x);
      return {
        targetAngle: k.clamp(k.rad2deg(Math.atan2(deltaY, deltaX)), -30, 30),
      };
    }

    const oceanSway = Math.sin(stateTimer * 1.4) * 12 + Math.sin(stateTimer * 0.7) * 8;
    const targetCruiseY = 195 + oceanSway;
    const deltaY = targetCruiseY - companion.pos.y;
    return {
      targetAngle: k.clamp(deltaY * 0.25, -22, 22),
    };
  }
}

export class SeekBreathState implements CompanionStateNode {
  public readonly name = "SEEK_BREATH";

  public onUpdate(ctx: CompanionStateContext): CompanionStateUpdateResult {
    const { k, companion } = ctx;
    // isPositionInIceGap checa fendas polares (0 a 5.000m) e retorna true para x > 5000 (mar aberto)
    const canBreatheHere = isPositionInIceGap(companion.pos.x);
    const surfaceThreshold = GAME_CONFIG.SEA_LEVEL + COMPANION_CONFIG.SURFACE_DETECTION_TOLERANCE;

    if (canBreatheHere) {
      if (companion.pos.y <= surfaceThreshold) {
        return {
          targetAngle: -28,
          nextState: "SURFACE_BREATHE",
        };
      }
      return { targetAngle: -28 };
    }

    // Navega proativamente em direção à fenda de gelo polar mais próxima à frente
    const nearestGap = getNearestIceGap(companion.pos.x);
    const safeDepthY = 135;
    const deltaY = safeDepthY - companion.pos.y;
    const targetGapX = nearestGap ? (nearestGap.start + nearestGap.end) / 2 : companion.pos.x + 200;
    const isApproachingGap = targetGapX > companion.pos.x && targetGapX - companion.pos.x < 120;
    const travelAngle = isApproachingGap ? -15 : k.clamp(deltaY * 0.25, -15, 15);

    return {
      targetAngle: travelAngle,
    };
  }
}

export class SurfaceBreatheState implements CompanionStateNode {
  public readonly name = "SURFACE_BREATHE";
  private surfaceTimer = 0;

  public onEnter(ctx: CompanionStateContext): void {
    this.surfaceTimer = 0;
    ctx.onResetVerticalSpeed();
    ctx.emitDoubleBlowholeSpout(ctx.companion.pos.x, ctx.companion.pos.y);
    ctx.restoreOxygen(ctx.getMaxOxygen());
  }

  public onUpdate(ctx: CompanionStateContext, dt: number): CompanionStateUpdateResult {
    this.surfaceTimer += dt;
    ctx.onResetVerticalSpeed();

    if (this.surfaceTimer >= COMPANION_CONFIG.SURFACE_BREATHE_DURATION) {
      const isCoMigration = ctx.options.isCoMigration || ctx.options.mode === "serene";
      const isPostTutorial = ctx.companion.pos.x >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180;
      return {
        targetAngle: 0,
        nextState: isCoMigration && isPostTutorial ? "INDEPENDENT_CRUISE" : "CRUISE",
      };
    }

    return { targetAngle: 0 };
  }
}

export class RestingState implements CompanionStateNode {
  public readonly name = "RESTING";

  public onEnter(ctx: CompanionStateContext): void {
    if (typeof ctx.companion.play === "function") {
      ctx.companion.play("idle_swim");
    }
  }

  public onUpdate(): CompanionStateUpdateResult {
    return { targetAngle: 0 };
  }
}

export class FarewellBreachState implements CompanionStateNode {
  public readonly name = "FAREWELL_BREACH";

  public onUpdate(): CompanionStateUpdateResult {
    return {
      targetAngle: 0,
      nextState: "RESTING",
    };
  }
}

export class DepartedState implements CompanionStateNode {
  public readonly name = "DEPARTED";

  public onUpdate(): CompanionStateUpdateResult {
    return { targetAngle: 0 };
  }
}

export class IndependentCruiseState implements CompanionStateNode {
  public readonly name = "INDEPENDENT_CRUISE";

  public onEnter(ctx: CompanionStateContext): void {
    if (typeof ctx.companion.play === "function") {
      ctx.companion.play("idle_swim");
    }
  }

  public onUpdate(
    ctx: CompanionStateContext,
    _dt: number,
    _playerX?: number,
    targetKrill?: GameObj | null,
    targetHazard?: GameObj | null
  ): CompanionStateUpdateResult {
    const { k, companion, stateTimer } = ctx;

    // 1. Checagem de chegada ao santuário final (30.000m - Abrolhos)
    if (companion.pos.x >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 400) {
      return {
        targetAngle: -22,
        nextState: "VICTORY_BREACH",
      };
    }

    // 2. Evasão de perigo detectado à frente
    if (targetHazard && (!targetHazard.exists || targetHazard.exists())) {
      return {
        targetAngle: companion.pos.y < 220 ? 25 : -25,
        nextState: "AVOID_OBSTACLE",
      };
    }

    // 3. Busca por alimento (Krill)
    if (targetKrill && (!targetKrill.exists || targetKrill.exists())) {
      const deltaY = targetKrill.pos.y - companion.pos.y;
      const deltaX = Math.max(40, targetKrill.pos.x - companion.pos.x);
      return {
        targetAngle: k.clamp(k.rad2deg(Math.atan2(deltaY, deltaX)), -28, 28),
      };
    }

    // 4. Nado migratório sereno com ondulação oceânica
    const oceanSway = Math.sin(stateTimer * 1.2) * 16 + Math.sin(stateTimer * 0.5) * 10;
    const targetCruiseY = 185 + oceanSway;
    const deltaY = targetCruiseY - companion.pos.y;
    return {
      targetAngle: k.clamp(deltaY * 0.22, -20, 20),
    };
  }
}

export class AvoidObstacleState implements CompanionStateNode {
  public readonly name = "AVOID_OBSTACLE";
  private avoidanceTimer = 0;
  private avoidDirection = 1;

  public onEnter(ctx: CompanionStateContext): void {
    this.avoidanceTimer = 0;
    this.avoidDirection = ctx.companion.pos.y < 220 ? 1 : -1;
  }

  public onUpdate(
    ctx: CompanionStateContext,
    dt: number,
    _playerX?: number,
    _targetKrill?: GameObj | null,
    targetHazard?: GameObj | null
  ): CompanionStateUpdateResult {
    this.avoidanceTimer += dt;

    if (
      this.avoidanceTimer > 1.8 &&
      (!targetHazard || (targetHazard.exists && !targetHazard.exists()))
    ) {
      const isPostTutorial = ctx.companion.pos.x >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180;
      return {
        targetAngle: 0,
        nextState: isPostTutorial ? "INDEPENDENT_CRUISE" : "CRUISE",
      };
    }

    const targetAngle = this.avoidDirection > 0 ? 26 : -26;
    return { targetAngle };
  }
}

export class TrappedState implements CompanionStateNode {
  public readonly name = "TRAPPED";
  private trappedTimer = 0;

  public onEnter(ctx: CompanionStateContext): void {
    this.trappedTimer = 0;
    if (typeof ctx.companion.play === "function") {
      ctx.companion.play("stroke_down");
    }
  }

  public onUpdate(ctx: CompanionStateContext, dt: number): CompanionStateUpdateResult {
    this.trappedTimer += dt;

    if (ctx.drainOxygen) {
      ctx.drainOxygen(
        dt * GAME_CONFIG.OXYGEN_DRAIN_RATE * COMPANION_CONFIG.TRAPPED_OXYGEN_DRAIN_MULTIPLIER
      );
    }

    if (this.trappedTimer >= COMPANION_CONFIG.NET_ESCAPE_DURATION) {
      const isPostTutorial = ctx.companion.pos.x >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180;
      return {
        targetAngle: 0,
        nextState: isPostTutorial ? "INDEPENDENT_CRUISE" : "CRUISE",
      };
    }

    const struggleAngle = Math.sin(this.trappedTimer * 12) * 10;
    return { targetAngle: struggleAngle };
  }
}

export class FaintedState implements CompanionStateNode {
  public readonly name = "FAINTED";

  public onEnter(ctx: CompanionStateContext): void {
    if (typeof ctx.companion.play === "function") {
      ctx.companion.play("idle_swim");
    }
    if (ctx.options.onFainted) {
      ctx.options.onFainted();
    }
  }

  public onUpdate(): CompanionStateUpdateResult {
    return { targetAngle: 5 };
  }
}

export class VictoryBreachState implements CompanionStateNode {
  public readonly name = "VICTORY_BREACH";
  private breachTimer = 0;

  public onEnter(ctx: CompanionStateContext): void {
    this.breachTimer = 0;
    if (typeof ctx.companion.play === "function") {
      ctx.companion.play("stroke_up");
    }
    if (ctx.options.onVictoryBreach) {
      ctx.options.onVictoryBreach();
    }
  }

  public onUpdate(_ctx: CompanionStateContext, dt: number): CompanionStateUpdateResult {
    this.breachTimer += dt;
    return { targetAngle: -35 };
  }
}

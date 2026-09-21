import type { KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";
import { audioSystem } from "../systems/audioSystem";
import type { TouchControlsState } from "../ui/touchControls";
import type { PlayerController } from "./player/types";
import { PlayerOxygenManager } from "./player/playerOxygen";
import { PlayerPhysicsManager } from "./player/playerPhysics";
import { PlayerSonarManager } from "./player/playerSonar";
import { PlayerControlsManager } from "./player/playerControls";
import {
  spawnBaleenSuction,
  spawnDraftingTrail,
  spawnTailBubbleTrail,
} from "./player/playerParticles";

export type { PlayerController } from "./player/types";

export function createPlayer(
  k: KaboomCtx,
  initialX: number = 120,
  isSereneMode: boolean = false,
  touchState?: TouchControlsState
): PlayerController {
  const baleia = k.add([
    k.sprite("baleia", { anim: "glide" }),
    k.pos(initialX, 200),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 108, 38) }),
    k.body(),
    k.rotate(0),
    k.color(255, 255, 255),
    k.anchor("center"),
    TAGS.PLAYER,
  ]);

  const oxygenMgr = new PlayerOxygenManager(k);
  const physicsMgr = new PlayerPhysicsManager(k);
  const sonarMgr = new PlayerSonarManager(k);
  const controlsMgr = new PlayerControlsManager(k, touchState);

  let animState: "glide" | "stroke_up" | "stroke_down" | "feed" = "glide";
  let feedTimer = 0;

  let isTrapped = false;
  let escapesNeeded = 0;
  let isBreaching = false;
  let isDrafting = false;

  // Power-up States
  let hasBubbleShield = false;
  let bubbleShieldVisual: any = null;
  let speedBoostTimer = 0;
  let speedBoostMultiplier = 1.0;
  let bioluminescenceTimer = 0;
  let bioluminescenceVisual: any = null;
  let tailBubbleTimer = 0;

  baleia.onDestroy(() => {
    if (bubbleShieldVisual) k.destroy(bubbleShieldVisual);
    if (bioluminescenceVisual) k.destroy(bioluminescenceVisual);
  });

  baleia.onUpdate(() => {
    const dt = k.dt();

    // Atualização de Power-ups
    if (speedBoostTimer > 0) {
      speedBoostTimer = Math.max(0, speedBoostTimer - dt);
      if (Math.random() < 0.35) {
        const p = k.add([
          k.circle(k.rand(2, 4)),
          k.pos(baleia.pos.add(k.vec2(controlsMgr.isFacingRight() ? -55 : 55, k.rand(-10, 10)))),
          k.color(255, 220, 80),
          k.opacity(0.8),
          k.z(19),
        ]);
        p.onUpdate(() => {
          p.opacity -= k.dt() * 2.5;
          if (p.opacity <= 0) k.destroy(p);
        });
      }
    }

    if (bioluminescenceTimer > 0) {
      bioluminescenceTimer = Math.max(0, bioluminescenceTimer - dt);
      if (!bioluminescenceVisual) {
        bioluminescenceVisual = k.add([
          k.circle(130),
          k.pos(baleia.pos),
          k.color(100, 255, 180),
          k.opacity(0.16),
          k.anchor("center"),
          k.z(19),
        ]);
      } else {
        bioluminescenceVisual.pos = baleia.pos;
        bioluminescenceVisual.radius = 120 + Math.sin(k.time() * 6) * 12;
      }

      // Revela perigos e itens automaticamente em raio de 750px
      const targets = [
        ...k.get(TAGS.TRASH),
        ...k.get(TAGS.NET),
        ...k.get(TAGS.KRILL),
        ...k.get(TAGS.POWERUP),
        ...k.get("canyon_rock"),
      ];
      targets.forEach((target: any) => {
        if (baleia.pos.dist(target.pos) <= 750) {
          if (target.reveal) target.reveal();
          else target.opacity = 1;
        }
      });
    } else if (bioluminescenceVisual) {
      k.destroy(bioluminescenceVisual);
      bioluminescenceVisual = null;
    }

    if (hasBubbleShield) {
      if (!bubbleShieldVisual) {
        bubbleShieldVisual = k.add([
          k.circle(68),
          k.pos(baleia.pos),
          k.color(80, 220, 255),
          k.outline(2.5, k.rgb(200, 255, 255)),
          k.opacity(0.35),
          k.anchor("center"),
          k.z(21),
        ]);
      } else {
        bubbleShieldVisual.pos = baleia.pos;
        bubbleShieldVisual.radius = 65 + Math.sin(k.time() * 4) * 4;
      }
    } else if (bubbleShieldVisual) {
      k.destroy(bubbleShieldVisual);
      bubbleShieldVisual = null;
    }

    // 1. Se estiver desmaiada (blackout)
    if (oxygenMgr.isFaintingState()) {
      baleia.color = k.rgb(60, 60, 80);
      baleia.move(0, GAME_CONFIG.SINK_RATE * 2);
      return;
    }

    // 2. Estado de Salto Majestoso (Breach)
    if (isBreaching) {
      controlsMgr.setFacingRight(true);
      controlsMgr.setTargetCamOffset(200);
      baleia.flipX = false;
      if (physicsMgr.getSpeed().len() > 10) {
        const vel = physicsMgr.getSpeed();
        controlsMgr.setAngle(k.clamp(k.rad2deg(Math.atan2(vel.y, vel.x)), -45, 45));
      }
    } else if (isTrapped) {
      // 3. Presa em rede fantasma
      const isStrokePressedNow = k.isKeyPressed("space") || (touchState && touchState.strokePressed);
      if (isStrokePressedNow) {
        escapesNeeded--;
        k.shake(2);
        if (escapesNeeded <= 0) {
          isTrapped = false;
        }
      }
      controlsMgr.setAngle(k.lerp(controlsMgr.getAngle(), 0, 0.05));
    } else {
      // 4. Livre e controlável
      const inputs = controlsMgr.pollInputs(physicsMgr.getStrokeTimer());
      controlsMgr.updateOrientation(dt, baleia, inputs, isTrapped);

      if (inputs.isStrokePressed) {
        audioSystem.playStrokeThrust();
      }

      if (inputs.isStrokeDown) {
        const maxSpeed = GAME_CONFIG.MAX_SPEED * (1 + oxygenMgr.getKrillsEaten() * 0.01);
        const currentBoost = speedBoostTimer > 0 ? speedBoostMultiplier : 1.0;
        physicsMgr.applyThrust(
          dt,
          controlsMgr.isFacingRight(),
          controlsMgr.getAngle(),
          isDrafting,
          maxSpeed,
          currentBoost
        );
      }

      if (inputs.isStrokeReleased) {
        physicsMgr.resetStrokeTimer();
      }

      sonarMgr.updateCooldown(dt);
      if (inputs.isSonarTriggered && sonarMgr.canTrigger()) {
        sonarMgr.triggerSonar(baleia.pos, controlsMgr.isFacingRight());
      }
    }

    // 5. Atualização de animações orgânicas
    if (feedTimer > 0) {
      feedTimer -= dt;
      if (animState !== "feed") {
        animState = "feed";
        baleia.play("feed");
      }
    } else {
      const isStrokeActive = k.isKeyDown("space") || (touchState && touchState.strokeDown);
      if (isStrokeActive && !isTrapped && !oxygenMgr.isFaintingState()) {
        const strokePhase = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        const targetAnim = strokePhase < 0.5 ? "stroke_up" : "stroke_down";
        if (animState !== targetAnim) {
          animState = targetAnim;
          baleia.play(targetAnim);
        }
      } else if (animState !== "glide") {
        animState = "glide";
        baleia.play("glide");
      }
    }

    // 6. Oscilação orgânica da cauda em movimento
    const currentSpeed = physicsMgr.getSpeed();
    const swimSway =
      currentSpeed.len() > 20 && !oxygenMgr.isFaintingState()
        ? Math.sin(k.time() * 7) * Math.min(2.5, currentSpeed.len() / 80)
        : 0;

    baleia.angle =
      (controlsMgr.isFacingRight() ? controlsMgr.getAngle() : -controlsMgr.getAngle()) + swimSway;

    // 7. Física e movimento
    const { inAir, newAngle } = physicsMgr.updateMovement(
      dt,
      baleia,
      controlsMgr.isFacingRight(),
      controlsMgr.getAngle(),
      isBreaching
    );
    if (inAir) {
      controlsMgr.setAngle(newAngle);
    }

    // 8. Respiração e dreno de oxigênio
    oxygenMgr.update(
      dt,
      baleia.pos,
      currentSpeed.x,
      controlsMgr.isFacingRight(),
      isDrafting,
      isSereneMode
    );

    // 9. Esteira de drafting com golfinhos
    if (isDrafting && Math.random() < 0.35) {
      spawnDraftingTrail(k, baleia.pos, controlsMgr.isFacingRight());
    }

    // 10. Rastro de micro-bolhas dinâmicas da cauda em propulsão
    if (!inAir) {
      const maxSpeed = GAME_CONFIG.MAX_SPEED * (1 + oxygenMgr.getKrillsEaten() * 0.01);
      const speedRatio = Math.min(1.5, currentSpeed.len() / maxSpeed);
      tailBubbleTimer -= dt;
      const isStrokeActive = k.isKeyDown("space") || (touchState && touchState.strokeDown);
      const interval = isStrokeActive ? 0.045 : 0.10;
      if (tailBubbleTimer <= 0 && speedRatio > 0.08) {
        tailBubbleTimer = interval;
        spawnTailBubbleTrail(
          k,
          baleia.pos,
          baleia.angle,
          controlsMgr.isFacingRight(),
          speedRatio
        );
      }
    }

    // 10. Cor conforme perda de oxigênio e rede
    const maxOx = oxygenMgr.getMaxOxygen();
    const oxygenRatio = oxygenMgr.getOxygen() / maxOx;
    const r = k.lerp(60, 255, oxygenRatio);
    const g = k.lerp(80, 255, oxygenRatio);
    const b = k.lerp(120, 255, oxygenRatio);

    baleia.color = isTrapped ? k.rgb(190, 90, 230) : k.rgb(r, g, b);

    // 11. Câmera fluida
    k.camPos(
      k.lerp(k.camPos().x, baleia.pos.x + controlsMgr.getTargetCamOffset(), 0.05),
      k.camPos().y
    );
  });

  return {
    gameObj: baleia,
    getSpeed: () => physicsMgr.getSpeed(),
    setSpeed: (newSpeed: Vec2) => {
      physicsMgr.setSpeed(newSpeed);
    },
    getOxygen: () => oxygenMgr.getOxygen(),
    getMaxOxygen: () => oxygenMgr.getMaxOxygen(),
    getMaxSpeed: () => GAME_CONFIG.MAX_SPEED * (1 + oxygenMgr.getKrillsEaten() * 0.01),
    getKrillsEaten: () => oxygenMgr.getKrillsEaten(),
    isFainting: () => oxygenMgr.isFaintingState(),
    isSereneMode: () => isSereneMode,

    consumeKrill: () => {
      oxygenMgr.consumeKrill();
      physicsMgr.setSpeed(physicsMgr.getSpeed().scale(GAME_CONFIG.KRILL_BOOST));
      feedTimer = 0.55;
      animState = "feed";
      baleia.play("feed");
      spawnBaleenSuction(k, baleia.pos, controlsMgr.isFacingRight());
    },

    penalizeTrash: () => {
      oxygenMgr.penalizeTrash();
    },

    trapInNet: (count: number) => {
      isTrapped = true;
      escapesNeeded = Math.max(escapesNeeded, count);
      physicsMgr.setSpeed(physicsMgr.getSpeed().scale(0.3));
    },

    addTrapCount: (count: number) => {
      isTrapped = true;
      escapesNeeded += count;
      physicsMgr.setSpeed(physicsMgr.getSpeed().scale(0.5));
    },

    isTrapped: () => isTrapped,

    startBreach: () => {
      isBreaching = true;
      isTrapped = false;
    },

    isBreaching: () => isBreaching,

    completeBreach: () => {
      isBreaching = false;
      physicsMgr.setSpeed(k.vec2(120, 0));
    },

    setOilObstructed: (obstructed: boolean) => {
      oxygenMgr.setOilObstructed(obstructed);
    },
    isOilObstructed: () => oxygenMgr.isObstructed(),

    setDrafting: (drafting: boolean) => {
      isDrafting = drafting;
    },
    isDrafting: () => isDrafting,

    // Power-ups da Fase 12
    hasBubbleShield: () => hasBubbleShield,
    activateBubbleShield: () => {
      hasBubbleShield = true;
    },
    popBubbleShield: () => {
      if (hasBubbleShield) {
        hasBubbleShield = false;
        if (bubbleShieldVisual) {
          k.destroy(bubbleShieldVisual);
          bubbleShieldVisual = null;
        }
        for (let i = 0; i < 10; i++) {
          const bp = k.add([
            k.circle(k.rand(3, 6)),
            k.pos(baleia.pos.add(k.vec2(k.rand(-25, 25), k.rand(-15, 15)))),
            k.color(180, 240, 255),
            k.opacity(0.85),
            k.z(22),
          ]);
          const angle = Math.random() * Math.PI * 2;
          const speed = k.rand(50, 150);
          bp.onUpdate(() => {
            bp.pos.x += Math.cos(angle) * speed * k.dt();
            bp.pos.y += Math.sin(angle) * speed * k.dt();
            bp.opacity -= k.dt() * 3;
            if (bp.opacity <= 0) k.destroy(bp);
          });
        }
        return true;
      }
      return false;
    },
    applySpeedBoost: (duration: number, multiplier: number = 1.5) => {
      speedBoostTimer = duration;
      speedBoostMultiplier = multiplier;
    },
    isSpeedBoosted: () => speedBoostTimer > 0,
    getSpeedBoostTimer: () => speedBoostTimer,
    restoreOxygen: (amount: number) => {
      oxygenMgr.restoreOxygen(amount);
    },
    activateBioluminescence: (duration: number) => {
      bioluminescenceTimer = duration;
    },
    hasBioluminescence: () => bioluminescenceTimer > 0,
    getBioluminescenceTimer: () => bioluminescenceTimer,
  };
}

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
  spawnTailWaterRipples,
} from "./player/playerParticles";

export type { PlayerController } from "./player/types";

export function createPlayer(
  k: KaboomCtx,
  initialX: number = 120,
  isSereneMode: boolean = false,
  touchState?: TouchControlsState
): PlayerController {
  const comps: any[] = [
    k.sprite("baleia", { anim: "glide" }),
    k.pos(initialX, 200),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 108, 38) }),
    k.body(),
    k.rotate(0),
    k.color(255, 255, 255),
    k.anchor("center"),
    TAGS.PLAYER,
  ];
  if (typeof k.scale === "function") {
    comps.push(k.scale(1, 1));
  }
  const baleia = k.add(comps);

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
  let isFrozen = false;

  // Efeitos Ambientais
  let speedBoostTimer = 0;
  let speedBoostMultiplier = 1.0;
  let strokeRippleTriggered = false;

  baleia.onUpdate(() => {
    const dt = k.dt();

    // Se o jogador estiver congelado (fim de jogo, modal ou vitória), bloqueia movimentos e controles
    if (isFrozen) {
      physicsMgr.setSpeed(k.vec2(0, 0));
      if (animState !== "glide") {
        animState = "glide";
        baleia.play("glide");
      }
      return;
    }

    // Atualização de Impulso de Correnteza / Boost
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
      const inAir = baleia.pos.y < GAME_CONFIG.SEA_LEVEL + 6;
      const inputs = controlsMgr.pollInputs(physicsMgr.getStrokeTimer());
      controlsMgr.updateOrientation(dt, baleia, inputs, isTrapped, inAir);

      if (inputs.isStrokePressed) {
        audioSystem.playStrokeThrust();
        strokeRippleTriggered = false;
        if (!inAir) {
          const currentBoost = speedBoostTimer > 0 ? speedBoostMultiplier : 1.0;
          spawnTailWaterRipples(
            k,
            baleia.pos,
            baleia.angle,
            controlsMgr.isFacingRight(),
            currentBoost
          );
        }
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

        // Se estiver no ápice da batida descendente (downstroke), emite uma ondulação secundária
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        if (!inAir && strokeProgress >= 0.45 && !strokeRippleTriggered) {
          strokeRippleTriggered = true;
          spawnTailWaterRipples(
            k,
            baleia.pos,
            baleia.angle,
            controlsMgr.isFacingRight(),
            currentBoost * 1.15
          );
        }
      }

      if (inputs.isStrokeReleased) {
        physicsMgr.resetStrokeTimer();
        strokeRippleTriggered = false;
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

    // 6. Deformação Orgânica (Squash & Stretch) e Ondulação do Nado
    const isStrokeActive =
      (k.isKeyDown("space") || (touchState && touchState.strokeDown)) &&
      !isTrapped &&
      !isFrozen &&
      !oxygenMgr.isFaintingState();

    const currentSpeed = physicsMgr.getSpeed();
    const speedLen = currentSpeed.len();

    // Squash & Stretch muscular na batida (alongamento hidrodinâmico e relaxamento)
    if (baleia.scale) {
      let targetScaleX = 1.0;
      let targetScaleY = 1.0;

      if (isStrokeActive) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        const muscularThrust = Math.sin(strokeProgress * Math.PI) * 0.07;
        targetScaleX = 1.0 + muscularThrust;
        targetScaleY = 1.0 - muscularThrust * 0.65;
      } else if (speedLen > 40) {
        const glideBreathing = Math.sin(k.time() * 3) * 0.015;
        targetScaleX = 1.0 + glideBreathing;
        targetScaleY = 1.0 - glideBreathing;
      }

      baleia.scale.x = k.lerp(baleia.scale.x, targetScaleX, dt * 8);
      baleia.scale.y = k.lerp(baleia.scale.y, targetScaleY, dt * 8);
    }

    // Ondulação da coluna vertebral sincronizada com o ciclo de nado (substitui a rotação rígida de torpedo)
    let swimSway = 0;
    if (!oxygenMgr.isFaintingState()) {
      if (isStrokeActive) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        swimSway = Math.sin(strokeProgress * Math.PI * 2) * 3.2;
      } else if (speedLen > 30) {
        // Balanço suave e majestoso em planeio hidrodinâmico
        swimSway = Math.sin(k.time() * 3.2) * Math.min(1.2, speedLen / 100);
      }
    }

    baleia.angle =
      (controlsMgr.isFacingRight() ? controlsMgr.getAngle() : -controlsMgr.getAngle()) + swimSway;

    // 7. Física e movimento
    const movementResult = physicsMgr.updateMovement(
      dt,
      baleia,
      controlsMgr.isFacingRight(),
      controlsMgr.getAngle(),
      isBreaching
    );
    if (movementResult.inAir) {
      controlsMgr.setAngle(movementResult.newAngle);
    }

    // 8. Respiração e dreno de oxigênio
    oxygenMgr.update(
      dt,
      baleia.pos,
      currentSpeed,
      controlsMgr.isFacingRight(),
      isDrafting,
      isSereneMode
    );

    // 9. Esteira de drafting com golfinhos
    if (isDrafting && Math.random() < 0.35) {
      spawnDraftingTrail(k, baleia.pos, controlsMgr.isFacingRight());
    }

    // 10. Deslocamento sutil dorsoventral (onda vertical suave na água durante a propulsão)
    if (isStrokeActive && !movementResult.inAir && !isTrapped) {
      const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
      const dorsoventralHeave = Math.sin(strokeProgress * Math.PI * 2) * 0.7;
      baleia.pos.y += dorsoventralHeave;
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

    // Auxílios e Efeitos Ambientais
    applySpeedBoost: (duration: number, multiplier: number = 1.5) => {
      speedBoostTimer = duration;
      speedBoostMultiplier = multiplier;
    },
    isSpeedBoosted: () => speedBoostTimer > 0,
    getSpeedBoostTimer: () => speedBoostTimer,
    restoreOxygen: (amount: number) => {
      oxygenMgr.restoreOxygen(amount);
    },

    // Estado de congelamento (telas de fim de jogo, vitória e pausa)
    freeze: () => {
      isFrozen = true;
      physicsMgr.setSpeed(k.vec2(0, 0));
      if (animState !== "glide") {
        animState = "glide";
        baleia.play("glide");
      }
    },
    unfreeze: () => {
      isFrozen = false;
    },
    isFrozen: () => isFrozen,
  };
}

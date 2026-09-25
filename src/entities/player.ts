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
    k.sprite("baleia", { anim: "idle_swim" }),
    k.pos(initialX, 200),
    k.area({ shape: new k.Rect(k.vec2(-54, -19), 108, 42) }),
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

  let animState: "glide" | "idle_swim" | "stroke_up" | "stroke_down" | "swim" | "feed" =
    "idle_swim";
  let feedTimer = 0;

  let isTrapped = false;
  let escapesNeeded = 0;
  let isBreaching = false;
  let isDrafting = false;
  let isFrozen = false;

  // Fase 17: Dinâmica de Roll em Perspectiva e Cáusticos Solares Submarinos
  let currentRoll = 0;
  let strokeCooldownTimer = 0; // Cooldown de 1.0s para evitar batidas consecutivas rápidas
  let isStrokeInMotion = false; // Indica se o ciclo muscular da batida está ativo (0 a 0.5s)

  const causticsComps: any[] = [
    typeof k.rect === "function" ? k.rect(48, 10, { radius: 5 }) : {},
    k.pos(initialX, 200),
    k.rotate(0),
    k.color(180, 240, 255),
    typeof k.opacity === "function" ? k.opacity(0) : { opacity: 0 },
    k.anchor("center"),
    typeof k.z === "function" ? k.z(1) : { z: 1 },
  ];
  if (typeof k.scale === "function") {
    causticsComps.push(k.scale(1, 1));
  }
  const whaleCaustics = k.add(causticsComps);

  const ventralComps: any[] = [
    typeof k.rect === "function" ? k.rect(44, 7, { radius: 3.5 }) : {},
    k.pos(initialX, 200),
    k.rotate(0),
    k.color(240, 248, 255),
    typeof k.opacity === "function" ? k.opacity(0) : { opacity: 0 },
    k.anchor("center"),
    typeof k.z === "function" ? k.z(1) : { z: 1 },
  ];
  if (typeof k.scale === "function") {
    ventralComps.push(k.scale(1, 1));
  }
  const whaleVentralFlash = k.add(ventralComps);

  if (typeof baleia.onDestroy === "function") {
    baleia.onDestroy(() => {
      if (typeof k.destroy === "function") {
        k.destroy(whaleCaustics);
        k.destroy(whaleVentralFlash);
      }
    });
  }

  // Efeitos Ambientais
  let speedBoostTimer = 0;
  let speedBoostMultiplier = 1.0;
  let strokeRippleTriggered = false;

  baleia.onUpdate(() => {
    const dt = k.dt();

    // Se o jogador estiver congelado (fim de jogo, modal ou vitória), bloqueia movimentos e controles
    if (isFrozen) {
      physicsMgr.setSpeed(k.vec2(0, 0));
      isStrokeInMotion = false;
      if (whaleCaustics) whaleCaustics.opacity = 0;
      if (whaleVentralFlash) whaleVentralFlash.opacity = 0;
      if (animState !== "glide") {
        animState = "glide";
        baleia.play("glide");
      }
      return;
    }

    // Atualização do temporizador de recarga da batida de cauda (delay de 1s)
    if (strokeCooldownTimer > 0) {
      strokeCooldownTimer = Math.max(0, strokeCooldownTimer - dt);
      if (strokeCooldownTimer <= 0.0001) strokeCooldownTimer = 0;
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
      const isStrokePressedNow =
        k.isKeyPressed("space") || (touchState && touchState.strokePressed);
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

      // Iniciação de batida de cauda com cooldown estrito de 1 segundo (evita batidas rápidas consecutivas)
      const wantsStroke =
        inputs.isStrokePressed ||
        (inputs.isStrokeDown && !isStrokeInMotion && strokeCooldownTimer <= 0);

      if (wantsStroke && strokeCooldownTimer <= 0) {
        strokeCooldownTimer = GAME_CONFIG.STROKE_COOLDOWN;
        isStrokeInMotion = true;
        physicsMgr.resetStrokeTimer();
        strokeRippleTriggered = false;

        audioSystem.playStrokeThrust();
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

      // Durante a execução do ciclo da batida de cauda (0.0s a 0.5s)
      if (isStrokeInMotion) {
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

        // Conclui o ciclo muscular da batida ao atingir MAX_STROKE_TIME (0.5s)
        if (physicsMgr.getStrokeTimer() >= GAME_CONFIG.MAX_STROKE_TIME) {
          isStrokeInMotion = false;
        }
      }

      if (inputs.isStrokeReleased) {
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
      if (isStrokeInMotion && !isTrapped && !oxygenMgr.isFaintingState()) {
        const strokePhase = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        const targetAnim = strokePhase < 0.5 ? "stroke_up" : "stroke_down";
        if (animState !== targetAnim) {
          animState = targetAnim;
          baleia.play(targetAnim);
        }
      } else {
        const inWater = baleia.pos.y >= GAME_CONFIG.SEA_LEVEL;
        if (inWater && !isTrapped && !isFrozen && !oxygenMgr.isFaintingState()) {
          // Quando o jogador não estiver controlando com uma batida ativa, a jubarte executa
          // um movimento natural de nado calmo contínuo para se manter flutuando enquanto cai devagar
          // (idêntico ao nado gracioso das orcas e jubartes passantes)
          if (animState !== "idle_swim") {
            animState = "idle_swim";
            baleia.play("idle_swim");
          }
        } else if (animState !== "glide") {
          animState = "glide";
          baleia.play("glide");
        }
      }
    }

    // 6. Deformação Orgânica (Squash & Stretch), Roll em Perspectiva e Ondulação do Nado
    const isMuscularStroke =
      isStrokeInMotion && !isTrapped && !isFrozen && !oxygenMgr.isFaintingState();

    const currentSpeed = physicsMgr.getSpeed();
    const speedLen = currentSpeed.len();
    const inWater = baleia.pos.y >= GAME_CONFIG.SEA_LEVEL;

    // Fator de blend suave para repouso (0 quando em alta velocidade, 1 quando completamente estática)
    const idleBlend = k.clamp((35 - speedLen) / 35, 0, 1);

    // Roll em Perspectiva ao mudar bruscamente de profundidade (Fase 17.2)
    const pitchAngle = controlsMgr.getAngle();
    // Subida acentuada (-pitchAngle em Kaboom) expõe a face ventral estriada ao observador
    const targetRoll = k.clamp(-pitchAngle / 35, -1, 1);
    currentRoll = k.lerp(currentRoll, targetRoll, dt * 6);
    const rollForeshortening = 1.0 - Math.abs(currentRoll) * 0.12;

    // Squash & Stretch muscular na batida (alongamento hidrodinâmico e relaxamento) e respiração calma em repouso
    if (baleia.scale) {
      let targetScaleX = 1.0;
      let targetScaleY = 1.0;

      if (isMuscularStroke) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        const muscularThrust = Math.sin(strokeProgress * Math.PI) * 0.07;
        targetScaleX = 1.0 + muscularThrust;
        targetScaleY = 1.0 - muscularThrust * 0.65;
      } else if (speedLen > 35) {
        const glideBreathing = Math.sin(k.time() * 3) * 0.015;
        targetScaleX = 1.0 + glideBreathing;
        targetScaleY = 1.0 - glideBreathing;
      } else if (!isTrapped && !isFrozen && !oxygenMgr.isFaintingState()) {
        // Animação de repouso (idle): respiração torácica/abdominal rítmica e profunda (~0.22 Hz, ~4.5s/ciclo)
        const idleBreath = Math.sin(k.time() * 1.4) * 0.016 * idleBlend;
        targetScaleX = 1.0 - idleBreath * 0.35;
        targetScaleY = 1.0 + idleBreath;
      }

      // Aplica a compressão em perspectiva da rolagem longitudinal
      targetScaleY = targetScaleY * rollForeshortening;

      baleia.scale.x = k.lerp(baleia.scale.x, targetScaleX, dt * 8);
      baleia.scale.y = k.lerp(baleia.scale.y, targetScaleY, dt * 8);
    }

    // Ondulação da coluna vertebral sincronizada com o ciclo de nado ou com o swell oceânico
    let swimSway = 0;
    if (!oxygenMgr.isFaintingState() && !isFrozen) {
      if (isMuscularStroke) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        swimSway = Math.sin(strokeProgress * Math.PI * 2) * 3.2;
      } else if (speedLen > 30) {
        // Balanço suave e majestoso em planeio hidrodinâmico
        swimSway = Math.sin(k.time() * 3.2) * Math.min(1.2, speedLen / 100);
      } else if (!isTrapped && inWater) {
        // Balanço do mar quando estática — composto por swell oceânico longo (0.8 rad/s) e ripple de ondas (2.1 rad/s)
        const swell = Math.sin(k.time() * 0.8) * 2.2;
        const ripple = Math.sin(k.time() * 2.1) * 0.6;
        swimSway = (swell + ripple) * idleBlend;
      }
    }

    // Torção sutil de roll em perspectiva na inclinação
    const rollTilt = currentRoll * 2.2;
    baleia.angle =
      (controlsMgr.isFacingRight() ? controlsMgr.getAngle() : -controlsMgr.getAngle()) +
      swimSway +
      rollTilt;

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

    // 10. Deslocamento sutil dorsoventral (onda vertical de propulsão ou balanço do mar em repouso)
    if (isMuscularStroke && !movementResult.inAir && !isTrapped) {
      const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
      const dorsoventralHeave = Math.sin(strokeProgress * Math.PI * 2) * 0.7;
      baleia.pos.y += dorsoventralHeave;
    } else if (!movementResult.inAir && !isTrapped && !isFrozen && speedLen < 30) {
      // Balanço vertical oceânico (heave) e flutuabilidade neutra em repouso
      const oceanHeaveVel = Math.cos(k.time() * 1.0) * 4.5 * idleBlend;
      baleia.pos.y += oceanHeaveVel * dt;
    }

    // 10. Cor conforme perda de oxigênio e rede
    const maxOx = oxygenMgr.getMaxOxygen();
    const oxygenRatio = oxygenMgr.getOxygen() / maxOx;
    const r = k.lerp(60, 255, oxygenRatio);
    const g = k.lerp(80, 255, oxygenRatio);
    const b = k.lerp(120, 255, oxygenRatio);

    baleia.color = isTrapped ? k.rgb(190, 90, 230) : k.rgb(r, g, b);

    // 11. Atualização dos Cáusticos Solares e Brilho Ventral em Perspectiva (Fases 17.2 e 17.3)
    const inAirNow = baleia.pos.y < GAME_CONFIG.SEA_LEVEL;
    const rad = k.deg2rad(baleia.angle);
    const upNormal = k.vec2(Math.sin(rad), -Math.cos(rad));
    const downNormal = k.vec2(-Math.sin(rad), Math.cos(rad));

    // Cáusticos Solares no Dorso (Fase 17.3)
    if (!inAirNow && !oxygenMgr.isFaintingState() && !isFrozen) {
      const depthBelowSurface = baleia.pos.y - GAME_CONFIG.SEA_LEVEL;
      if (depthBelowSurface < 100) {
        const depthFactor = Math.max(0, 1 - depthBelowSurface / 100);
        const tNow = typeof k.time === "function" ? k.time() : 0;
        const shimmer =
          (Math.sin(tNow * 4.5 + baleia.pos.x * 0.03) * 0.5 +
            Math.cos(tNow * 3.2 + baleia.pos.x * 0.05) * 0.5 +
            1) *
          0.5;
        whaleCaustics.opacity = depthFactor * (0.1 + shimmer * 0.25);
        if (typeof k.rgb === "function") {
          const sunGlint = Math.sin(tNow * 2.5) * 20;
          whaleCaustics.color = k.rgb(180 + sunGlint, 240, 255);
        }
      } else {
        whaleCaustics.opacity = 0;
      }
    } else {
      whaleCaustics.opacity = 0;
    }

    // Brilho Ventral de Roll em Perspectiva (Fase 17.2)
    if (!oxygenMgr.isFaintingState() && !isFrozen) {
      const ventralExposure = Math.max(0, currentRoll);
      whaleVentralFlash.opacity = ventralExposure * 0.42;
    } else {
      whaleVentralFlash.opacity = 0;
    }

    // Alinhamento geométrico com o corpo da baleia
    if (whaleCaustics && whaleCaustics.pos && typeof whaleCaustics.pos.add === "function") {
      whaleCaustics.pos = baleia.pos.add(upNormal.scale(7));
      whaleCaustics.angle = baleia.angle;
      if (whaleCaustics.scale && baleia.scale) {
        whaleCaustics.scale.x = baleia.scale.x;
        whaleCaustics.scale.y = baleia.scale.y;
      }
    }

    if (
      whaleVentralFlash &&
      whaleVentralFlash.pos &&
      typeof whaleVentralFlash.pos.add === "function"
    ) {
      whaleVentralFlash.pos = baleia.pos.add(downNormal.scale(6));
      whaleVentralFlash.angle = baleia.angle;
      if (whaleVentralFlash.scale && baleia.scale) {
        whaleVentralFlash.scale.x = baleia.scale.x;
        whaleVentralFlash.scale.y = baleia.scale.y;
      }
    }

    // 12. Câmera fluida
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

    // Fase 17: Getters para validação e testes
    getRollAngle: () => currentRoll,
    getCausticOpacity: () => whaleCaustics.opacity,
    getVentralOpacity: () => whaleVentralFlash.opacity,
    getStrokeCooldown: () => strokeCooldownTimer,

    // Fase 18: Dinâmica Hidrodinâmica de Correntezas
    isFacingRight: () => controlsMgr.isFacingRight(),
    setCurrentFlowModifier: (mod: number) => {
      oxygenMgr.setCurrentFlowModifier(mod);
    },
    getCurrentFlowModifier: () => oxygenMgr.getCurrentFlowModifier(),
  };
}

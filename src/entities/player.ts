import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG, TAGS, PLAYER_ANIMATION_CONFIG } from "../config";
import { getRandomFloat } from "../utils/random";
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
  spawnTailStrokeBubbles,
  spawnPectoralTipVortices,
} from "./player/playerParticles";
import type { WhaleSliceData } from "./player/playerSliceRenderer";
import { setupPectoralFins, type DualPectoralFinsData } from "./player/playerPectoralFin";
import type { PuppetRigTransforms } from "./player/playerPuppetRig";
import type { WhaleAnimationState } from "./player/playerAnimation";
import {
  executeWhaleRenderPipeline,
  type WhaleRenderPipelineSnapshot,
} from "./player/playerRenderPipeline";
import { accessibilitySystem } from "../systems/accessibilitySystem";

import { calculateOceanIdleDrift } from "./player/playerDrift";
import { setupPlayerCaustics } from "./player/playerCaustics";
import { PlayerTrapManager } from "./player/playerCollision";

export type { PlayerController } from "./player/types";
export { calculateOceanIdleDrift };

let activePlayerObject: GameObj | null = null;

export function setActivePlayerObject(playerObject: GameObj | null): void {
  activePlayerObject = playerObject;
}

export function getActivePlayerObject(): GameObj | null {
  return activePlayerObject && (!activePlayerObject.exists || activePlayerObject.exists())
    ? activePlayerObject
    : null;
}

export function createPlayer(
  k: KaboomCtx,
  initialX: number = 120,
  isSereneMode: boolean = false,
  touchState?: TouchControlsState
): PlayerController {
  const baleia = k.add([
    k.sprite("baleia", { anim: "idle_swim" }),
    k.pos(initialX, 200),
    k.area({ shape: new k.Rect(k.vec2(-54, -19), 108, 42) }),
    k.body(),
    k.rotate(0),
    k.color(255, 255, 255),
    k.anchor("center"),
    TAGS.PLAYER,
    ...(typeof k.scale === "function" ? [k.scale(1, 1)] : []),
  ]);
  activePlayerObject = baleia;

  const oxygenMgr = new PlayerOxygenManager(k);
  const physicsMgr = new PlayerPhysicsManager(k);
  const sonarMgr = new PlayerSonarManager(k);
  const controlsMgr = new PlayerControlsManager(k, touchState);

  let animState: WhaleAnimationState = "idle_swim";
  let feedTimer = 0;

  const trapMgr = new PlayerTrapManager(k, physicsMgr);
  const causticsSystem = setupPlayerCaustics(k, initialX, 200);

  // Fase 17: Dinâmica de Roll em Perspectiva e Cáusticos Solares Submarinos
  let currentRoll = 0;
  let strokeCooldownTimer = 0; // Cooldown de 1.0s para evitar batidas consecutivas rápidas
  let isStrokeInMotion = false; // Indica se o ciclo muscular da batida está ativo (0 a 0.5s)
  let pectoralVortexTimer = 0; // Temporizador para emissão de vórtices peitorais em rotação (Fase 40.5)
  let currentSliceTransforms: WhaleSliceData[] = []; // Fatias corporais sagitais da coluna (Fase 41)
  const reusableSliceBuffer: WhaleSliceData[] = []; // Buffer pré-alocado reutilizável para zero GC por frame (Fase 53)
  let currentPectoralFinTransforms: DualPectoralFinsData | null = null; // Hidroplanos peitorais com diedro (Fase 42)
  let currentPuppetRigTransforms: PuppetRigTransforms | null = null; // Cadeia esquelética multissegmentar (Fase 43)
  let currentRenderPipelineSnapshot: WhaleRenderPipelineSnapshot | null = null; // Snapshot consolidado da pipeline (Fase 51)
  const pectoralFinsSystem = setupPectoralFins(k, baleia);

  if (typeof baleia.onDestroy === "function") {
    baleia.onDestroy(() => {
      pectoralFinsSystem.destroy();
      if (typeof k.destroy === "function") {
        k.destroy(causticsSystem.whaleCaustics);
        k.destroy(causticsSystem.whaleVentralFlash);
      }
    });
  }

  // Efeitos Ambientais
  let speedBoostTimer = 0;
  let speedBoostMultiplier = 1.0;
  let strokeRippleTriggered = false;

  baleia.onUpdate(() => {
    const rawDeltaTime = typeof k.dt === "function" ? k.dt() : 0.0166;
    const dt = Math.min(Math.max(0, rawDeltaTime), GAME_CONFIG.MAX_DELTA_TIME);

    // Se o jogador estiver congelado (fim de jogo, modal ou vitória), bloqueia movimentos e controles
    if (trapMgr.isFrozen()) {
      physicsMgr.setSpeed(k.vec2(0, 0));
      isStrokeInMotion = false;
      if (causticsSystem.whaleCaustics) causticsSystem.whaleCaustics.opacity = 0;
      if (causticsSystem.whaleVentralFlash) causticsSystem.whaleVentralFlash.opacity = 0;
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
      if (getRandomFloat(0, 1) < 0.35) {
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
    if (trapMgr.isBreaching()) {
      controlsMgr.setFacingRight(true);
      controlsMgr.setTargetCamOffset(200);
      baleia.flipX = false;
      if (physicsMgr.getSpeed().len() > 10) {
        const vel = physicsMgr.getSpeed();
        controlsMgr.setAngle(k.clamp(k.rad2deg(Math.atan2(vel.y, vel.x)), -45, 45));
      }
    } else if (trapMgr.isTrapped()) {
      // 3. Presa em rede fantasma
      const isStrokePressedNow =
        k.isKeyPressed("space") || (touchState && touchState.strokePressed);
      if (isStrokePressedNow) {
        k.shake(2);
        trapMgr.tryEscape();
      }
      controlsMgr.setAngle(k.lerp(controlsMgr.getAngle(), 0, 0.05));
    } else {
      // 4. Livre e controlável
      const inAir = baleia.pos.y < GAME_CONFIG.SEA_LEVEL + 6;
      const inputs = controlsMgr.pollInputs(physicsMgr.getStrokeTimer());
      controlsMgr.updateOrientation(dt, baleia, inputs, trapMgr.isTrapped(), inAir);

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
          // Rastro de bolhas caudais de esforço muscular (Fase 31.2)
          spawnTailStrokeBubbles(k, baleia.pos, controlsMgr.isFacingRight());
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
          trapMgr.isDrafting(),
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
      if (isStrokeInMotion && !trapMgr.isTrapped() && !oxygenMgr.isFaintingState()) {
        const strokePhase = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        const targetAnim: WhaleAnimationState =
          strokePhase <= PLAYER_ANIMATION_CONFIG.STROKE_DOWN_PHASE_THRESHOLD
            ? "stroke_down"
            : "stroke_up";
        if (animState !== targetAnim) {
          animState = targetAnim;
          baleia.play(targetAnim);
        }
      } else {
        const inWater = baleia.pos.y >= GAME_CONFIG.SEA_LEVEL;
        if (
          inWater &&
          !trapMgr.isTrapped() &&
          !trapMgr.isFrozen() &&
          !oxygenMgr.isFaintingState()
        ) {
          // Fase 40.4: Seleção dinâmica de frames por curvatura vertical / arfagem:
          // Se o jogador estiver fazendo subida ativa (pitchAngle < -14 ou spineCurvature < -5),
          // os frames 1-2 (stroke_up) representam as aletas caudais sustentando o planeio ascendente.
          const pitchAngleDeg = controlsMgr.getAngle();
          const spineCurvatureDeg = controlsMgr.getSpineCurvature();

          if (pitchAngleDeg < -14 || spineCurvatureDeg < -5) {
            if (animState !== "stroke_up") {
              animState = "stroke_up";
              baleia.play("stroke_up");
            }
          } else {
            // Quando em repouso ou planeio nivelado, a jubarte executa movimento de nado calmo contínuo
            if (animState !== "idle_swim") {
              animState = "idle_swim";
              baleia.play("idle_swim");
            }
          }
        } else if (animState !== "glide") {
          animState = "glide";
          baleia.play("glide");
        }
      }
    }

    // 6. Deformação Orgânica (Squash & Stretch), Curvatura Espinhal (Cambering) e Roll em Perspectiva
    const isMuscularStroke =
      isStrokeInMotion &&
      !trapMgr.isTrapped() &&
      !trapMgr.isFrozen() &&
      !oxygenMgr.isFaintingState();

    const currentSpeed = physicsMgr.getSpeed();
    const horizontalSpeed = Math.abs(currentSpeed.x);
    const inWater = baleia.pos.y >= GAME_CONFIG.SEA_LEVEL;

    // Fator de blend de repouso: ativado quando a baleia fica horizontalmente estática (não está nadando para frente)
    const idleBlend = isMuscularStroke ? 0 : k.clamp((35 - horizontalSpeed) / 35, 0, 1);

    // Roll em Perspectiva ao mudar bruscamente de profundidade (Fase 17.2)
    const pitchAngle = controlsMgr.getAngle();
    // Subida acentuada (-pitchAngle em Kaboom) expõe a face ventral estriada ao observador
    const targetRoll = k.clamp(-pitchAngle / 35, -1, 1);
    currentRoll = k.lerp(currentRoll, targetRoll, dt * 6);
    const rollForeshortening = 1.0 - Math.abs(currentRoll) * 0.12;

    // Biomecânica da Fase 40: Curvatura espinhal (Camber) e Inércia Caudal
    const spineCurvature = controlsMgr.getSpineCurvature();
    const pitchFlexion = controlsMgr.getPitchFlexion();
    const pitchVelocity = controlsMgr.getPitchAngularVelocity();
    const maxOx = oxygenMgr.getMaxOxygen();
    const oxygenRatio = oxygenMgr.getOxygen() / maxOx;

    // Fase 51.1: Pipeline Unificada de Renderização da Baleia (Rig -> Slices -> Fins -> Palette)
    currentRenderPipelineSnapshot = executeWhaleRenderPipeline(
      {
        bodyAngleInDegrees: baleia.angle,
        spineCurvatureInDegrees: spineCurvature,
        pitchFlexionInDegrees: pitchFlexion,
        pitchAngularVelocity: pitchVelocity,
        strokeProgress: physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME,
        isMuscularStroke,
        horizontalSpeed,
        verticalSpeed: physicsMgr.getSpeed().y,
        idleBlendFactor: idleBlend,
        currentRoll,
        timeInSeconds: k.time(),
        isFacingRight: controlsMgr.isFacingRight(),
        oxygenRatio,
        isTrapped: trapMgr.isTrapped(),
        isFainting: oxygenMgr.isFaintingState(),
        isHighContrast: accessibilitySystem.isHighContrast(),
        isReducedMotion: accessibilitySystem.isReducedMotion(),
      },
      reusableSliceBuffer
    );

    currentPuppetRigTransforms = currentRenderPipelineSnapshot.puppetRig;
    currentSliceTransforms = currentRenderPipelineSnapshot.slices;
    currentPectoralFinTransforms = currentRenderPipelineSnapshot.pectoralFins;
    pectoralFinsSystem.update(currentPectoralFinTransforms, controlsMgr.isFacingRight());

    // Squash & Stretch muscular na batida, arqueamento em curva de arfagem e respiração calma em repouso
    if (baleia.scale) {
      let targetScaleX = 1.0;
      let targetScaleY = 1.0;

      if (isMuscularStroke) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        const muscularThrust = Math.sin(strokeProgress * Math.PI) * 0.07;
        targetScaleX = 1.0 + muscularThrust;
        targetScaleY = 1.0 - muscularThrust * 0.65;
      } else if (horizontalSpeed > 35) {
        const glideBreathing = Math.sin(k.time() * 3) * 0.015;
        targetScaleX = 1.0 + glideBreathing;
        targetScaleY = 1.0 - glideBreathing;
      } else if (!trapMgr.isTrapped() && !trapMgr.isFrozen() && !oxygenMgr.isFaintingState()) {
        // Animação de repouso (idle): respiração torácica/abdominal rítmica e profunda (~0.22 Hz, ~4.5s/ciclo)
        const idleBreath = Math.sin(k.time() * 1.4) * 0.016 * idleBlend;
        targetScaleX = 1.0 - idleBreath * 0.35;
        targetScaleY = 1.0 + idleBreath;
      }

      // Modulação de Curvatura Espinhal (Cambering sagital orgânico):
      // - Ao subir (pitchFlexion < 0): expansão ventral e leve compressão longitudinal
      // - Ao descer (pitchFlexion > 0): arqueamento dorsal e afilamento de fluxo
      const camberScaleY = 1.0 + Math.abs(pitchFlexion) * 0.12;
      const camberScaleX = 1.0 - Math.abs(pitchFlexion) * 0.06;

      targetScaleX = targetScaleX * camberScaleX;
      targetScaleY = targetScaleY * camberScaleY * rollForeshortening;

      baleia.scale.x = k.lerp(baleia.scale.x, targetScaleX, dt * 8);
      baleia.scale.y = k.lerp(baleia.scale.y, targetScaleY, dt * 8);
    }

    // Ondulação da coluna vertebral sincronizada com o ciclo de nado ou com o swell oceânico
    let swimSway = 0;
    if (!oxygenMgr.isFaintingState() && !trapMgr.isFrozen()) {
      if (isMuscularStroke) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        swimSway = Math.sin(strokeProgress * Math.PI * 2) * 3.2;
      } else if (horizontalSpeed > 35) {
        // Balanço suave e majestoso em planeio hidrodinâmico
        swimSway = Math.sin(k.time() * 3.2) * Math.min(1.2, horizontalSpeed / 100);
      } else if (!trapMgr.isTrapped() && inWater) {
        // Balanço do mar quando horizontalmente estática — composto por swell oceânico longo (0.85 rad/s) e ripple de ondas (2.1 rad/s)
        const swell = Math.sin(k.time() * 0.85) * 2.4;
        const ripple = Math.sin(k.time() * 2.1) * 0.6;
        swimSway = (swell + ripple) * idleBlend;
      }
    }

    // Fase 40.2 & 40.3: Rotação composta com deflexão da espinha e pivô hidrodinâmico
    // A flexão da cauda atenua o giro rígido, fazendo a cabeça apontar primeiro e o corpo dobrar
    const spineFlexAngle = spineCurvature * 0.42;
    const baseAngle = controlsMgr.isFacingRight()
      ? controlsMgr.getAngle()
      : -controlsMgr.getAngle();
    const rollTilt = currentRoll * 2.2;

    baleia.angle =
      baseAngle -
      (controlsMgr.isFacingRight() ? spineFlexAngle : -spineFlexAngle) +
      swimSway +
      rollTilt;

    // Fase 40.5: Emissão de micro-vórtices nas aletas peitorais durante guinadas bruscas
    if (inWater && !trapMgr.isTrapped() && !trapMgr.isFrozen() && Math.abs(pitchVelocity) > 28) {
      pectoralVortexTimer -= dt;
      if (pectoralVortexTimer <= 0) {
        pectoralVortexTimer = 0.12; // taxa de 8Hz em rotações ativas
        spawnPectoralTipVortices(
          k,
          baleia.pos,
          baleia.angle,
          controlsMgr.isFacingRight(),
          pitchVelocity,
          pectoralFinsSystem.getNearTipWorldPos()
        );
      }
    } else {
      pectoralVortexTimer = Math.max(0, pectoralVortexTimer - dt);
    }

    // 7. Física e movimento
    const movementResult = physicsMgr.updateMovement(
      dt,
      baleia,
      controlsMgr.isFacingRight(),
      controlsMgr.getAngle(),
      trapMgr.isBreaching()
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
      trapMgr.isDrafting(),
      isSereneMode
    );

    // 9. Esteira de drafting com golfinhos
    if (trapMgr.isDrafting() && getRandomFloat(0, 1) < 0.35) {
      spawnDraftingTrail(k, baleia.pos, controlsMgr.isFacingRight());
    }

    // 10. Deslocamento sutil dorsoventral (onda vertical de propulsão ou balanço do mar em repouso)
    if (isMuscularStroke && !movementResult.inAir && !trapMgr.isTrapped()) {
      const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
      const dorsoventralHeave = Math.sin(strokeProgress * Math.PI * 2) * 0.7;
      baleia.pos.y += dorsoventralHeave;
    } else if (
      !movementResult.inAir &&
      !trapMgr.isTrapped() &&
      !trapMgr.isFrozen() &&
      idleBlend > 0.001
    ) {
      // Balanço oceânico em repouso (surge horizontal e heave vertical) sincronizado com a correnteza marinha
      const { surgeVelocityX, heaveVelocityY } = calculateOceanIdleDrift(k.time(), idleBlend);

      baleia.pos.x += surgeVelocityX * dt;
      baleia.pos.x = Math.max(20, baleia.pos.x);

      // Salvaguarda para não empurrar a jubarte acima da linha d'água durante o balanço em repouso
      const surfaceElevationLimit = GAME_CONFIG.SEA_LEVEL + 4;
      if (baleia.pos.y + heaveVelocityY * dt < surfaceElevationLimit) {
        baleia.pos.y = Math.max(baleia.pos.y, surfaceElevationLimit);
      } else {
        baleia.pos.y += heaveVelocityY * dt;
      }
    }

    // 10. Cor consolidada via Paleta Centralizada de Fôlego (Fase 51.2)
    if (currentRenderPipelineSnapshot) {
      const [bodyRed, bodyGreen, bodyBlue] = currentRenderPipelineSnapshot.palette.bodyColor;
      baleia.color = k.rgb(bodyRed, bodyGreen, bodyBlue);
    }

    // 11. Atualização dos Cáusticos Solares e Brilho Ventral em Perspectiva (Fases 17.2 e 17.3)
    causticsSystem.update({
      dt,
      baleia,
      isFacingRight: controlsMgr.isFacingRight(),
      currentRoll,
      pitchFlexion,
      isFainting: oxygenMgr.isFaintingState(),
      isFrozen: trapMgr.isFrozen(),
      slices: currentSliceTransforms,
    });

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
      feedTimer = PLAYER_ANIMATION_CONFIG.FEED_TIMER_DURATION;
      animState = "feed";
      baleia.play("feed");
      spawnBaleenSuction(k, baleia.pos, controlsMgr.isFacingRight());
    },

    penalizeTrash: () => {
      oxygenMgr.penalizeTrash();
    },

    trapInNet: (count: number) => {
      trapMgr.trapInNet(count);
    },

    addTrapCount: (count: number) => {
      trapMgr.addTrapCount(count);
    },

    isTrapped: () => trapMgr.isTrapped(),

    startBreach: () => {
      trapMgr.startBreach();
    },

    isBreaching: () => trapMgr.isBreaching(),

    completeBreach: () => {
      trapMgr.completeBreach();
    },

    setOilObstructed: (obstructed: boolean) => {
      oxygenMgr.setOilObstructed(obstructed);
    },
    isOilObstructed: () => oxygenMgr.isObstructed(),

    setDrafting: (drafting: boolean) => {
      trapMgr.setDrafting(drafting);
    },
    isDrafting: () => trapMgr.isDrafting(),

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
      trapMgr.freeze();
      if (animState !== "glide") {
        animState = "glide";
        baleia.play("glide");
      }
    },
    unfreeze: () => {
      trapMgr.unfreeze();
    },
    isFrozen: () => trapMgr.isFrozen(),

    // Fase 17: Getters para validação e testes
    getRollAngle: () => currentRoll,
    getCausticOpacity: () => causticsSystem.getCausticOpacity(),
    getVentralOpacity: () => causticsSystem.getVentralOpacity(),
    getStrokeCooldown: () => strokeCooldownTimer,

    // Fase 18: Dinâmica Hidrodinâmica de Correntezas
    isFacingRight: () => controlsMgr.isFacingRight(),
    setCurrentFlowModifier: (mod: number) => {
      oxygenMgr.setCurrentFlowModifier(mod);
    },
    getCurrentFlowModifier: () => oxygenMgr.getCurrentFlowModifier(),

    // Fase 41: Deformação Sagital por Fatiamento Segmentado (Vertical Slice Ribbon)
    getSliceTransforms: () => currentSliceTransforms,
    getSpineCurvature: () => controlsMgr.getSpineCurvature(),
    getPitchFlexion: () => controlsMgr.getPitchFlexion(),

    // Fase 42: Nadadeiras Peitorais Independentes e Hidrodinâmica de Diedro
    getPectoralFinTransforms: () => currentPectoralFinTransforms,

    // Fase 43: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig)
    getPuppetRigTransforms: () => currentPuppetRigTransforms,

    // Fase 44: Spritesheet Expandido de 16 Quadros e Interpolação Harmônica
    getAnimationState: () => animState,

    // Fase 51: Pipeline Unificada de Renderização e Paleta de Fôlego
    getRenderPipelineSnapshot: () => currentRenderPipelineSnapshot,
    getBreathPalette: () => currentRenderPipelineSnapshot?.palette || null,
  };
}

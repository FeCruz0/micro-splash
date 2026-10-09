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
  spawnTailStrokeBubbles,
  spawnPectoralTipVortices,
} from "./player/playerParticles";
import { calculateWhaleSliceTransforms, type WhaleSliceData } from "./player/playerSliceRenderer";
import {
  calculatePectoralFinTransforms,
  setupPectoralFins,
  type DualPectoralFinsData,
} from "./player/playerPectoralFin";
import { calculateWhalePuppetRig, type PuppetRigTransforms } from "./player/playerPuppetRig";
import type { WhaleAnimationState } from "./player/playerAnimation";

export type { PlayerController } from "./player/types";

let activePlayerObject: any = null;

export function setActivePlayerObject(playerObject: any): void {
  activePlayerObject = playerObject;
}

export function getActivePlayerObject(): any {
  return activePlayerObject && (!activePlayerObject.exists || activePlayerObject.exists())
    ? activePlayerObject
    : null;
}

/**
 * Calcula a velocidade de deriva e oscilação hidrodinâmica em repouso (swell oceânico e correnteza).
 *
 * Reproduz o comportamento natural das criaturas marinhas do jogo (orcas e jubartes passantes),
 * aplicando um movimento orbital elíptico composto por:
 * 1. Surge horizontal (indo e voltando com a correnteza): ~±16px de oscilação em repouso.
 * 2. Heave vertical (subindo e descendo com o swell): ~±9.5px de flutuabilidade.
 *
 * @param timeInSeconds - Tempo de execução atual em segundos.
 * @param idleBlendFactor - Fator de blend de repouso (0.0 a 1.0).
 * @returns Vetor com componentes de velocidade `surgeVelocityX` e `heaveVelocityY` em px/s.
 */
export function calculateOceanIdleDrift(
  timeInSeconds: number,
  idleBlendFactor: number
): { surgeVelocityX: number; heaveVelocityY: number } {
  if (idleBlendFactor <= 0) {
    return { surgeVelocityX: 0, heaveVelocityY: 0 };
  }

  const swellFrequency = 0.85;
  const rippleFrequency = 2.1;

  const surgeVelocityX =
    (Math.cos(timeInSeconds * swellFrequency) * 12.0 +
      Math.cos(timeInSeconds * rippleFrequency) * 2.5) *
    idleBlendFactor;

  const heaveVelocityY =
    (Math.sin(timeInSeconds * swellFrequency) * 5.5 +
      Math.sin(timeInSeconds * rippleFrequency) * 1.2) *
    idleBlendFactor;

  return { surgeVelocityX, heaveVelocityY };
}

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
  activePlayerObject = baleia;

  const oxygenMgr = new PlayerOxygenManager(k);
  const physicsMgr = new PlayerPhysicsManager(k);
  const sonarMgr = new PlayerSonarManager(k);
  const controlsMgr = new PlayerControlsManager(k, touchState);

  let animState: WhaleAnimationState = "idle_swim";
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
  let pectoralVortexTimer = 0; // Temporizador para emissão de vórtices peitorais em rotação (Fase 40.5)
  let currentSliceTransforms: WhaleSliceData[] = []; // Fatias corporais sagitais da coluna (Fase 41)
  let currentPectoralFinTransforms: DualPectoralFinsData | null = null; // Hidroplanos peitorais com diedro (Fase 42)
  let currentPuppetRigTransforms: PuppetRigTransforms | null = null; // Cadeia esquelética multissegmentar (Fase 43)
  const pectoralFinsSystem = setupPectoralFins(k, baleia);

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
      pectoralFinsSystem.destroy();
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
        const targetAnim: WhaleAnimationState = strokePhase <= 0.55 ? "stroke_down" : "stroke_up";
        if (animState !== targetAnim) {
          animState = targetAnim;
          baleia.play(targetAnim);
        }
      } else {
        const inWater = baleia.pos.y >= GAME_CONFIG.SEA_LEVEL;
        if (inWater && !isTrapped && !isFrozen && !oxygenMgr.isFaintingState()) {
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
      isStrokeInMotion && !isTrapped && !isFrozen && !oxygenMgr.isFaintingState();

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

    // Fase 43: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig)
    currentPuppetRigTransforms = calculateWhalePuppetRig({
      bodyAngleInDegrees: baleia.angle,
      spineCurvatureInDegrees: spineCurvature,
      pitchAngularVelocity: pitchVelocity,
      strokeProgress: physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME,
      isMuscularStroke,
      horizontalSpeed,
      verticalSpeed: physicsMgr.getSpeed().y,
      idleBlendFactor: idleBlend,
      timeInSeconds: k.time(),
      isFacingRight: controlsMgr.isFacingRight(),
    });

    // Fase 41: Deformação Sagital por Fatiamento Segmentado (Vertical Slice Ribbon)
    currentSliceTransforms = calculateWhaleSliceTransforms({
      spineCurvatureInDegrees: spineCurvature,
      pitchFlexionInDegrees: pitchFlexion,
      pitchAngularVelocity: pitchVelocity,
      strokeProgress: physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME,
      isMuscularStroke,
      timeInSeconds: k.time(),
      horizontalSpeed,
      idleBlendFactor: idleBlend,
      isFacingRight: controlsMgr.isFacingRight(),
      puppetRig: currentPuppetRigTransforms,
    });

    // Fase 42: Nadadeiras Peitorais Independentes e Hidrodinâmica de Diedro
    currentPectoralFinTransforms = calculatePectoralFinTransforms({
      bodyAngleInDegrees: baleia.angle,
      pitchAngularVelocity: pitchVelocity,
      spineCurvatureInDegrees: spineCurvature,
      currentRoll,
      horizontalSpeed,
      strokeProgress: physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME,
      isMuscularStroke,
      idleBlendFactor: idleBlend,
      timeInSeconds: k.time(),
      isFacingRight: controlsMgr.isFacingRight(),
    });
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
      } else if (!isTrapped && !isFrozen && !oxygenMgr.isFaintingState()) {
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
    if (!oxygenMgr.isFaintingState() && !isFrozen) {
      if (isMuscularStroke) {
        const strokeProgress = physicsMgr.getStrokeTimer() / GAME_CONFIG.MAX_STROKE_TIME;
        swimSway = Math.sin(strokeProgress * Math.PI * 2) * 3.2;
      } else if (horizontalSpeed > 35) {
        // Balanço suave e majestoso em planeio hidrodinâmico
        swimSway = Math.sin(k.time() * 3.2) * Math.min(1.2, horizontalSpeed / 100);
      } else if (!isTrapped && inWater) {
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
    if (inWater && !isTrapped && !isFrozen && Math.abs(pitchVelocity) > 28) {
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
    } else if (!movementResult.inAir && !isTrapped && !isFrozen && idleBlend > 0.001) {
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

    // Alinhamento geométrico com o tórax flexionado da baleia (Fase 41)
    const thoraxSlice = currentSliceTransforms[1];
    const thoraxOffset = thoraxSlice
      ? k.vec2(thoraxSlice.localOffset.x * 0.15, thoraxSlice.localOffset.y)
      : k.vec2(0, 0);
    const thoraxAngle = thoraxSlice ? thoraxSlice.relativeAngleInDegrees * 0.35 : 0;

    if (whaleCaustics && whaleCaustics.pos && typeof whaleCaustics.pos.add === "function") {
      const causticsOffset = upNormal.scale(7).add(thoraxOffset);
      whaleCaustics.pos = baleia.pos.add(causticsOffset);
      whaleCaustics.angle = baleia.angle + thoraxAngle;
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
      const ventralOffset = downNormal.scale(6 + Math.abs(pitchFlexion) * 2).add(thoraxOffset);
      whaleVentralFlash.pos = baleia.pos.add(ventralOffset);
      whaleVentralFlash.angle = baleia.angle + thoraxAngle;
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
  };
}

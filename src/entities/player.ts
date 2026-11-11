import { Sprite, Texture } from "pixi.js";
import { PixiSpriteNode } from "../engine/adapters/PixiNodes";
import { getActiveRenderEngine } from "../engine/adapters/RenderEngineAdapter";
import type { IRenderEngine, ISpriteNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { getParticlePool } from "../systems/particlePool";
import { safeShake } from "../utils/camera";
import { GAME_CONFIG, TAGS, PLAYER_ANIMATION_CONFIG, centralizedDeltaTimeClamp } from "../config";
import { getRandomFloat } from "../utils/random";
import { audioSystem } from "../systems/audioSystem";
import type { TouchControlsState } from "../ui/touchControls";
import type {
  PlayerController,
  PlayerGameObject,
  PlayerVector2D,
  StrictPlayerVector2D,
} from "./player/types";
import { PlayerOxygenManager } from "./player/playerOxygen";
import { PlayerPhysicsManager } from "./player/playerPhysics";
import { PlayerSonarManager, type RevealableTarget } from "./player/playerSonar";
import { PlayerControlsManager } from "./player/playerControls";
import { getInputStateManager, type InputStateManager } from "../systems/inputState";
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
import { setupWhaleNetOverlay } from "./player/playerNetOverlay";

export type {
  PlayerController,
  PlayerGameObject,
  PlayerVector2D,
  StrictPlayerVector2D,
} from "./player/types";
export {
  validatePlayerBuoyancyPhysics,
  type PlayerBuoyancyPhysicsResult,
} from "./player/playerPhysics";
export { calculateOceanIdleDrift };

export interface PlayerEngineContext {
  vec2(x: number, y: number): StrictPlayerVector2D;
  rgb(r: number, g: number, b: number): unknown;
  circle(radius: number): unknown;
  rect(w: number, h: number, opt?: { radius?: number }): unknown;
  pos(x: number | PlayerVector2D, y?: number): unknown;
  color(r: number | unknown, g?: number, b?: number): unknown;
  opacity(val: number): unknown;
  outline(width?: number, color?: unknown): unknown;
  z(layer: number): unknown;
  scale(x: number, y?: number): unknown;
  anchor(anc: "center" | "bot" | "topleft" | "botleft" | unknown): unknown;
  rotate(angle: number): unknown;
  sprite?(name: string, opt?: { anim?: string }): unknown;
  area?(opt?: unknown): unknown;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  Rect?: Function | { new (...args: never[]): unknown };
  add(comps: unknown[]): unknown;
  destroy(obj?: unknown): void;
  dt(): number;
  time(): number;
  camPos(x?: number | PlayerVector2D, y?: number): PlayerVector2D;
  deg2rad(deg: number): number;
  rad2deg(rad: number): number;
  clamp(val: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
  rand(min: number, max: number): number;
  shake(intensity: number): void;
  isKeyDown(
    key?:
      "left" | "right" | "up" | "down" | "space" | "a" | "d" | "w" | "s" | "shift" | "e" | string
  ): boolean;
  isKeyPressed(key?: "space" | "enter" | string): boolean;
  isKeyReleased(key?: "space" | string): boolean;
  wait(time: number, cb: () => void): void;
  get(tag: string): RevealableTarget[];
  height?(): number;
  createGraphics?(id?: string): unknown;
  generateTexture?(
    target: unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): unknown;
  createSprite?(texture: unknown, id?: string): unknown;
  getStageRoot?(): unknown;
  onUpdate?(updateHandler: (deltaTimeInSeconds?: number) => void): { cancel: () => void } | void;
}

let activePlayerObject: PlayerGameObject | null = null;
let activePlayerController: PlayerController | null = null;

export function setActivePlayerObject(playerObject: PlayerGameObject | null): void {
  activePlayerObject = playerObject;
}

export function getActivePlayerObject(): PlayerGameObject | null {
  return activePlayerObject && (!activePlayerObject.exists || activePlayerObject.exists())
    ? activePlayerObject
    : null;
}

export function setActivePlayerController(controller: PlayerController | null): void {
  activePlayerController = controller;
}

export function getActivePlayerController(): PlayerController | null {
  return activePlayerController;
}

export interface PlayerCreationParameters {
  readonly engineContext: PlayerEngineContext;
  readonly initialPositionCoordinateX?: number;
  readonly isSereneModeActive?: boolean;
  readonly touchControlsState?: TouchControlsState;
  readonly inputStateManager?: InputStateManager | null;
}

export function validatePlayerInitializationSignature(
  contextOrParameters: PlayerEngineContext | PlayerCreationParameters,
  initialPositionCoordinateX?: number,
  isSereneModeActive?: boolean,
  touchControlsState?: TouchControlsState,
  inputStateManager?: InputStateManager | null
): PlayerCreationParameters {
  if (
    typeof contextOrParameters === "object" &&
    contextOrParameters !== null &&
    "engineContext" in contextOrParameters
  ) {
    return contextOrParameters as PlayerCreationParameters;
  }

  return {
    engineContext: contextOrParameters as PlayerEngineContext,
    initialPositionCoordinateX: initialPositionCoordinateX ?? 120,
    isSereneModeActive: isSereneModeActive ?? false,
    touchControlsState,
    inputStateManager,
  };
}

export function createPlayer(
  contextOrParameters: PlayerEngineContext | PlayerCreationParameters,
  initialPositionCoordinateX: number = 120,
  isSereneModeActive: boolean = false,
  touchControlsState?: TouchControlsState,
  inputStateManager?: InputStateManager | null
): PlayerController {
  const playerCreationParameters = validatePlayerInitializationSignature(
    contextOrParameters,
    initialPositionCoordinateX,
    isSereneModeActive,
    touchControlsState,
    inputStateManager
  );

  const k = playerCreationParameters.engineContext;
  const initialX = playerCreationParameters.initialPositionCoordinateX ?? 120;
  const isSereneMode = playerCreationParameters.isSereneModeActive ?? false;
  const touchState = playerCreationParameters.touchControlsState;
  const activeInputStateManager = playerCreationParameters.inputStateManager;
  const updateCallbacks: Array<() => void> = [];
  const destroyCallbacks: Array<() => void> = [];

  const playerVectorPosition: StrictPlayerVector2D =
    typeof k.vec2 === "function"
      ? k.vec2(initialX, 200)
      : ({
          x: initialX,
          y: 200,
          scale(scaleX: number | unknown, scaleY?: number) {
            const factorX = typeof scaleX === "number" ? scaleX : 1;
            const factorY = typeof scaleY === "number" ? scaleY : factorX;
            return { ...this, x: this.x * factorX, y: this.y * factorY };
          },
          add(otherVector: PlayerVector2D) {
            return { ...this, x: this.x + otherVector.x, y: this.y + otherVector.y };
          },
          sub(otherVector: PlayerVector2D) {
            return { ...this, x: this.x - otherVector.x, y: this.y - otherVector.y };
          },
          len() {
            return Math.sqrt(this.x * this.x + this.y * this.y);
          },
          unit() {
            const length = this.len();
            return length > 0
              ? { ...this, x: this.x / length, y: this.y / length }
              : { ...this, x: 0, y: 0 };
          },
          dist(otherVector: PlayerVector2D) {
            const deltaX = this.x - otherVector.x;
            const deltaY = this.y - otherVector.y;
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          },
        } as StrictPlayerVector2D);

  const baleia: PlayerGameObject = {
    pos: playerVectorPosition,
    angle: 0,
    scale: { x: 1, y: 1 },
    flipX: false,
    color: typeof k.rgb === "function" ? k.rgb(255, 255, 255) : { r: 255, g: 255, b: 255 },
    opacity: 1,
    z: 20,
    move: (speedX: number, speedY: number) => {
      const rawDeltaTime = typeof k.dt === "function" ? k.dt() : 0.0166;
      const safeDeltaTime = centralizedDeltaTimeClamp(rawDeltaTime);
      baleia.pos.x += speedX * safeDeltaTime;
      baleia.pos.y += speedY * safeDeltaTime;
    },
    play: (animationName: string) => {
      animState = animationName as WhaleAnimationState;
    },
    onUpdate: (callback: () => void) => {
      updateCallbacks.push(callback);
    },
    onDestroy: (callback: () => void) => {
      destroyCallbacks.push(callback);
    },
    exists: () => !baleia._destroyed,
    is: (tag: string) => tag === TAGS.PLAYER,
    _triggerUpdate: () => {
      for (let callbackIndex = 0; callbackIndex < updateCallbacks.length; callbackIndex++) {
        updateCallbacks[callbackIndex]();
      }
    },
    _destroyed: false,
  };

  const activeRenderEngine = getActiveRenderEngine();
  const playerSpriteNode: ISpriteNode =
    activeRenderEngine !== null
      ? activeRenderEngine.createSprite("baleia", "player_whale_sprite")
      : new PixiSpriteNode(new Sprite(Texture.EMPTY), "baleia", "player_whale_sprite");

  playerSpriteNode.setAnchor(0.5, 0.5);
  playerSpriteNode.setPosition(initialX, 200);
  playerSpriteNode.setRotation(0);
  playerSpriteNode.setZIndex(20);

  if (activeRenderEngine !== null && activeRenderEngine.isInitialized) {
    activeRenderEngine.getWorldContainer().addChild(playerSpriteNode);
  }

  baleia.spriteNode = playerSpriteNode;
  baleia._pixiNode = playerSpriteNode;
  baleia.node = playerSpriteNode;
  baleia.getNativeNode = () => playerSpriteNode.getNativeNode();

  activePlayerObject = baleia;

  const oxygenMgr = new PlayerOxygenManager(k);
  const physicsMgr = new PlayerPhysicsManager(k);
  const sonarMgr = new PlayerSonarManager(k);
  const controlsMgr = new PlayerControlsManager(k, touchState, activeInputStateManager);

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
  const netOverlaySystem = setupWhaleNetOverlay(k, baleia);

  if (typeof baleia.onDestroy === "function") {
    baleia.onDestroy(() => {
      baleia._destroyed = true;
      playerSpriteNode.destroy();
      pectoralFinsSystem.destroy();
      netOverlaySystem.destroy();
      if (typeof k.destroy === "function") {
        k.destroy(causticsSystem.whaleCaustics);
        k.destroy(causticsSystem.whaleVentralFlash);
      }
      if (activePlayerObject === baleia) {
        activePlayerObject = null;
      }
      if (activePlayerController === controller) {
        activePlayerController = null;
      }
      for (let index = 0; index < destroyCallbacks.length; index++) {
        destroyCallbacks[index]();
      }
    });
  }

  // Efeitos Ambientais
  let speedBoostTimer = 0;
  let speedBoostMultiplier = 1.0;
  let strokeRippleTriggered = false;

  baleia.onUpdate(() => {
    const rawDeltaTime = typeof k.dt === "function" ? k.dt() : 0.0166;
    const dt = centralizedDeltaTimeClamp(rawDeltaTime);

    // Se o jogador estiver congelado (fim de jogo, modal ou vitória), bloqueia movimentos e controles
    if (trapMgr.isFrozen()) {
      physicsMgr.setSpeed(k.vec2(0, 0));
      isStrokeInMotion = false;
      if (causticsSystem.whaleCaustics) causticsSystem.whaleCaustics.opacity = 0;
      if (causticsSystem.whaleVentralFlash) causticsSystem.whaleVentralFlash.opacity = 0;
      netOverlaySystem.update(
        false,
        baleia,
        controlsMgr.isFacingRight(),
        typeof k.time === "function" ? k.time() : 0
      );
      if (animState !== "glide") {
        animState = "glide";
        baleia.play?.("glide");
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
        const particlePool = getParticlePool();
        const horizontalOffset = controlsMgr.isFacingRight() ? -55 : 55;
        const verticalOffset = getRandomFloat(-10, 10);
        const particleRadius = getRandomFloat(2, 4);
        if (particlePool !== null) {
          particlePool.spawnCircle({
            pos: {
              x: baleia.pos.x + horizontalOffset,
              y: baleia.pos.y + verticalOffset,
            },
            radius: particleRadius,
            color: { r: 255, g: 220, b: 80 },
            opacity: 0.8,
            z: 19,
            fadeRate: 2.5,
            maxLife: 0.5,
          });
        }
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
      const currentInputState = (activeInputStateManager ?? getInputStateManager())?.getState();
      const isStrokePressedNow = currentInputState
        ? currentInputState.strokePressed
        : (typeof k.isKeyPressed === "function" ? k.isKeyPressed("space") : false) ||
          Boolean(touchState && touchState.strokePressed);
      if (isStrokePressedNow) {
        const currentRenderEngine = getActiveRenderEngine();
        safeShake(currentRenderEngine ?? (k as unknown as IRenderEngine), 2);
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
        baleia.play?.("feed");
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
          baleia.play?.(targetAnim);
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
              baleia.play?.("stroke_up");
            }
          } else {
            // Quando em repouso ou planeio nivelado, a jubarte executa movimento de nado calmo contínuo
            if (animState !== "idle_swim") {
              animState = "idle_swim";
              baleia.play?.("idle_swim");
            }
          }
        } else if (animState !== "glide") {
          animState = "glide";
          baleia.play?.("glide");
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

    // Feedback Físico de Aprisionamento: Tremor de Esforço (Struggle Jitter)
    if (trapMgr.isTrapped()) {
      const struggleTime = typeof k.time === "function" ? k.time() : 0;
      baleia.angle += Math.sin(struggleTime * 32) * 1.5;
    }

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

    // 10. Cor consolidada e aplicação direta do snapshot no PixiSpriteNode (Etapa 2.1)
    if (currentRenderPipelineSnapshot !== null) {
      playerSpriteNode.setPosition(baleia.pos.x, baleia.pos.y);

      const rigAngleInDegrees =
        currentRenderPipelineSnapshot.puppetRig.cranialThorax.bodyAngleInDegrees;
      const angleInRadians = (rigAngleInDegrees * Math.PI) / 180;
      playerSpriteNode.setRotation(angleInRadians);

      const horizontalDirectionMultiplier = controlsMgr.isFacingRight() ? 1 : -1;
      const playerScaleX = (baleia.scale?.x ?? 1) * horizontalDirectionMultiplier;
      const playerScaleY = baleia.scale?.y ?? 1;
      playerSpriteNode.setScale(playerScaleX, playerScaleY);

      const playerOpacity = baleia.opacity ?? 1;
      playerSpriteNode.setOpacity(playerOpacity);
      playerSpriteNode.setVisible(playerOpacity > 0);

      const [bodyColorRed, bodyColorGreen, bodyColorBlue] =
        currentRenderPipelineSnapshot.palette.bodyColor;
      playerSpriteNode.setTint([bodyColorRed, bodyColorGreen, bodyColorBlue]);
      baleia.color =
        typeof k.rgb === "function"
          ? k.rgb(bodyColorRed, bodyColorGreen, bodyColorBlue)
          : { r: bodyColorRed, g: bodyColorGreen, b: bodyColorBlue };
    }

    // 10.5. Atualização do Overlay 16-bits de Rede de Pesca (Fase 68 / Etapa 2)
    const currentLoopTime = typeof k.time === "function" ? k.time() : 0;
    netOverlaySystem.update(
      trapMgr.isTrapped(),
      baleia,
      controlsMgr.isFacingRight(),
      currentLoopTime
    );

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
  });

  // Resolução inicial determinística da pipeline de renderização
  currentRenderPipelineSnapshot = executeWhaleRenderPipeline(
    {
      bodyAngleInDegrees: baleia.angle,
      spineCurvatureInDegrees: 0,
      pitchFlexionInDegrees: 0,
      pitchAngularVelocity: 0,
      strokeProgress: 0,
      isMuscularStroke: false,
      horizontalSpeed: 0,
      verticalSpeed: 0,
      idleBlendFactor: 1,
      currentRoll: 0,
      timeInSeconds: typeof k.time === "function" ? k.time() : 0,
      isFacingRight: controlsMgr.isFacingRight(),
      oxygenRatio: 1,
      isTrapped: false,
      isFainting: false,
      isHighContrast: accessibilitySystem.isHighContrast(),
      isReducedMotion: accessibilitySystem.isReducedMotion(),
    },
    reusableSliceBuffer
  );
  currentPuppetRigTransforms = currentRenderPipelineSnapshot.puppetRig;
  currentSliceTransforms = currentRenderPipelineSnapshot.slices;
  currentPectoralFinTransforms = currentRenderPipelineSnapshot.pectoralFins;
  pectoralFinsSystem.update(currentPectoralFinTransforms, controlsMgr.isFacingRight());

  // Aplica estado inicial no PixiSpriteNode
  playerSpriteNode.setPosition(baleia.pos.x, baleia.pos.y);
  const initialRigAngleInDegrees =
    currentRenderPipelineSnapshot.puppetRig.cranialThorax.bodyAngleInDegrees;
  const initialAngleInRadians = (initialRigAngleInDegrees * Math.PI) / 180;
  playerSpriteNode.setRotation(initialAngleInRadians);
  playerSpriteNode.setScale(1, 1);
  playerSpriteNode.setOpacity(1);
  const [initialBodyRed, initialBodyGreen, initialBodyBlue] =
    currentRenderPipelineSnapshot.palette.bodyColor;
  playerSpriteNode.setTint([initialBodyRed, initialBodyGreen, initialBodyBlue]);

  if (typeof k.onUpdate === "function") {
    k.onUpdate(() => {
      baleia._triggerUpdate?.();
    });
  }

  const controller: PlayerController = {
    gameObj: baleia,
    getSpriteNode: () => playerSpriteNode,
    update: () => {
      baleia._triggerUpdate?.();
    },
    getSpeed: () => physicsMgr.getSpeed(),
    setSpeed: (newSpeed: StrictPlayerVector2D | PlayerVector2D) => {
      physicsMgr.setSpeed(newSpeed);
    },
    getOxygen: () => oxygenMgr.getOxygen(),
    getMaxOxygen: () => oxygenMgr.getMaxOxygen(),
    getOxygenRatio: () => oxygenMgr.getOxygenRatio(),
    getOxygenUrgency: () => oxygenMgr.getUrgencyState(),
    isLowOxygen: () => oxygenMgr.isLowOxygen(),
    getMaxSpeed: () => GAME_CONFIG.MAX_SPEED * (1 + oxygenMgr.getKrillsEaten() * 0.01),
    getKrillsEaten: () => oxygenMgr.getKrillsEaten(),
    isFainting: () => oxygenMgr.isFaintingState(),
    isSereneMode: () => isSereneMode,

    consumeKrill: () => {
      oxygenMgr.consumeKrill();
      physicsMgr.setSpeed(physicsMgr.getSpeed().scale(GAME_CONFIG.KRILL_BOOST));
      feedTimer = PLAYER_ANIMATION_CONFIG.FEED_TIMER_DURATION;
      animState = "feed";
      baleia.play?.("feed");
      spawnBaleenSuction(k, baleia.pos, controlsMgr.isFacingRight());
    },

    penalizeTrash: () => {
      oxygenMgr.penalizeTrash();
    },

    trapInNet: (count: number) => {
      trapMgr.trapInNet(count);
      const overlay = (
        baleia as unknown as {
          netOverlaySprite?: {
            visible?: boolean;
            hidden?: boolean;
            opacity?: number;
            alpha?: number;
            setVisible?: (v: boolean) => void;
            setOpacity?: (a: number) => void;
          };
        }
      ).netOverlaySprite;
      if (overlay) {
        overlay.visible = true;
        overlay.hidden = false;
        overlay.opacity = 1.0;
        overlay.alpha = 1.0;
        if (typeof overlay.setVisible === "function") overlay.setVisible(true);
        if (typeof overlay.setOpacity === "function") overlay.setOpacity(1.0);
      }
    },

    addTrapCount: (count: number) => {
      trapMgr.addTrapCount(count);
      const overlay = (
        baleia as unknown as {
          netOverlaySprite?: {
            visible?: boolean;
            hidden?: boolean;
            opacity?: number;
            alpha?: number;
            setVisible?: (v: boolean) => void;
            setOpacity?: (a: number) => void;
          };
        }
      ).netOverlaySprite;
      if (overlay) {
        overlay.visible = true;
        overlay.hidden = false;
        overlay.opacity = 1.0;
        overlay.alpha = 1.0;
        if (typeof overlay.setVisible === "function") overlay.setVisible(true);
        if (typeof overlay.setOpacity === "function") overlay.setOpacity(1.0);
      }
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
        baleia.play?.("glide");
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
    getTargetCameraHorizontalOffset: () => controlsMgr.getTargetCamOffset(),
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

    // Fase 68: Overlay 16-Bits de Rede de Pesca (Zero-Overhead)
    getNetOverlaySprite: () => netOverlaySystem.netOverlaySprite,
  };
  activePlayerController = controller;
  return controller;
}

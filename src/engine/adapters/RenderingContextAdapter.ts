/**
 * Adaptador de Contexto de Renderização Unificado — Micro Splash (PixiJS v8)
 *
 * Encapsula o ciclo de vida, gerenciamento de tela/mundo e despacho de nós visuais
 * do PixiJS v8 através de contratos tipados da engine, desacoplando totalmente
 * as cenas e subsistemas da antiga fachada temporária.
 */

import { Assets } from "pixi.js";
import type {
  IRenderEngine,
  IRenderNode,
  ISpriteNode,
  IGraphicsNode,
  ITextNode,
  IScene,
  ISceneManager,
} from "../contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer, resolveScreenRenderContainer } from "./RenderEngineAdapter";
import { createTween, Easings, type EasingFunction } from "../utils/Tween";
import { getScreenLayerGeometryChecker } from "../screenLayerGeometryChecker";
import { getSpriteSheetManager, type SpriteAnimationController } from "./SpriteSheetManager";
import {
  requestDocumentFullscreen,
  exitDocumentFullscreen,
  isDocumentFullscreen,
} from "../../systems/fullscreenHandler";
import {
  getInputStateManager,
  singleFrameInputStateUpdater,
  completeSingleFrameInputCycle,
  normalizeKeyIdentifier,
} from "../../systems/inputState";
import {
  createRenderingContextVector2D,
  type RenderingContextVector2D,
  createEntityPositionBinding,
  type EntityPositionBinding,
} from "./entityPositionBinding";
import { centralizedDeltaTimeClamp } from "../../config";

function normalizeRgbColorTuple(rawColorValue: unknown): [number, number, number] | null {
  if (Array.isArray(rawColorValue) && rawColorValue.length >= 3) {
    return [
      Number(rawColorValue[0]) || 0,
      Number(rawColorValue[1]) || 0,
      Number(rawColorValue[2]) || 0,
    ];
  }
  if (rawColorValue && typeof rawColorValue === "object") {
    const colorObject = rawColorValue as { r?: unknown; g?: unknown; b?: unknown };
    if (
      typeof colorObject.r === "number" &&
      typeof colorObject.g === "number" &&
      typeof colorObject.b === "number"
    ) {
      return [colorObject.r, colorObject.g, colorObject.b];
    }
  }
  return null;
}

function isGraphicsRenderNode(renderNode: IRenderNode): renderNode is IGraphicsNode {
  return "drawRect" in renderNode || "drawCircle" in renderNode || "drawPolygon" in renderNode;
}

/**
 * Ciclo de vida do contexto de renderização exposto às cenas: executa os callbacks registrados via
 * onUpdate no contexto e libera listeners, tweens, timers e nós visuais ao sair da cena.
 */
export interface RenderingContextLifecycle {
  runSceneUpdateCallbacks(deltaTimeInSeconds: number): void;
  flushSceneResources(): void;
  setClockPaused?(pausedState: boolean): void;
  isClockPaused?(): boolean;
}

/**
 * Decora uma IScene para que update e exit também acionem o ciclo de vida do contexto.
 * O update da própria cena roda primeiro; em seguida, os callbacks de onUpdate do contexto.
 * Ao sair, o exit da própria cena roda primeiro e os recursos do contexto são sempre liberados.
 */
export function withRenderingContextLifecycle(
  sceneInstance: IScene,
  renderContextLifecycle: RenderingContextLifecycle
): IScene {
  return {
    name: sceneInstance.name,
    enter: (transitionData?: unknown) => sceneInstance.enter(transitionData),
    update: (deltaTimeInSeconds: number) => {
      try {
        sceneInstance.update(deltaTimeInSeconds);
      } finally {
        renderContextLifecycle.runSceneUpdateCallbacks(deltaTimeInSeconds);
      }
    },
    exit: async () => {
      try {
        await sceneInstance.exit();
      } finally {
        renderContextLifecycle.flushSceneResources();
      }
    },
  };
}

export {
  createRenderingContextVector2D,
  type RenderingContextVector2D,
  createEntityPositionBinding,
  type EntityPositionBinding,
};

export function updateCameraViewportPosition(
  renderEngineInstance: IRenderEngine,
  cameraPositionCoordinateX: number,
  cameraPositionCoordinateY: number
): { readonly x: number; readonly y: number } {
  if (typeof renderEngineInstance.setCameraPosition === "function") {
    renderEngineInstance.setCameraPosition(cameraPositionCoordinateX, cameraPositionCoordinateY);
  }
  return typeof renderEngineInstance.getCameraPosition === "function"
    ? renderEngineInstance.getCameraPosition()
    : { x: cameraPositionCoordinateX, y: cameraPositionCoordinateY };
}

export function synchronizePlayerCameraTracking(
  renderingContext: {
    camPos(
      cameraPositionOrCoordinateX?: number | { readonly x: number; readonly y: number },
      cameraCoordinateY?: number
    ): { readonly x: number; readonly y: number };
    lerp?(startValue: number, endValue: number, progressRatio: number): number;
  },
  playerCoordinateX: number,
  playerCoordinateY?: number,
  smoothingFactor: number = 0.05
): { readonly x: number; readonly y: number } {
  const currentCameraPosition = renderingContext.camPos();
  const targetCoordinateX =
    typeof renderingContext.lerp === "function"
      ? renderingContext.lerp(currentCameraPosition.x, playerCoordinateX, smoothingFactor)
      : currentCameraPosition.x + (playerCoordinateX - currentCameraPosition.x) * smoothingFactor;

  // Preserva a coordenada Y atual caso nenhuma coordenada vertical explícita seja fornecida
  const targetCameraCoordinateY =
    typeof playerCoordinateY === "number" ? playerCoordinateY : currentCameraPosition.y;

  return renderingContext.camPos(targetCoordinateX, targetCameraCoordinateY);
}

export function calculateOriginOffset(
  anchorAlignment: string,
  width: number,
  height: number
): { readonly originX: number; readonly originY: number } {
  switch (anchorAlignment) {
    case "center":
      return { originX: -width / 2, originY: -height / 2 };
    case "topleft":
      return { originX: 0, originY: 0 };
    case "top":
      return { originX: -width / 2, originY: 0 };
    case "topright":
      return { originX: -width, originY: 0 };
    case "left":
      return { originX: 0, originY: -height / 2 };
    case "right":
      return { originX: -width, originY: -height / 2 };
    case "botleft":
      return { originX: 0, originY: -height };
    case "bot":
    case "bottom":
      return { originX: -width / 2, originY: -height };
    case "botright":
      return { originX: -width, originY: -height };
    default:
      return { originX: 0, originY: 0 };
  }
}

export function resolveAnchorCoordinates(anchorAlignment: string): {
  readonly anchorX: number;
  readonly anchorY: number;
} {
  switch (anchorAlignment) {
    case "center":
      return { anchorX: 0.5, anchorY: 0.5 };
    case "topleft":
      return { anchorX: 0, anchorY: 0 };
    case "top":
      return { anchorX: 0.5, anchorY: 0 };
    case "topright":
      return { anchorX: 1, anchorY: 0 };
    case "left":
      return { anchorX: 0, anchorY: 0.5 };
    case "right":
      return { anchorX: 1, anchorY: 0.5 };
    case "botleft":
      return { anchorX: 0, anchorY: 1 };
    case "bot":
    case "bottom":
      return { anchorX: 0.5, anchorY: 1 };
    case "botright":
      return { anchorX: 1, anchorY: 1 };
    default:
      return { anchorX: 0, anchorY: 0 };
  }
}

export interface RenderingContextEntity {
  pos: RenderingContextVector2D;
  scale: { x: number; y: number };
  opacity: number;
  z: number;
  hidden: boolean;
  fixed: boolean;
  flipX?: boolean;
  flipY?: boolean;
  vel?: RenderingContextVector2D;
  text?: string;
  width?: number;
  height?: number;
  radius?: number;
  pts?: readonly { readonly x: number; readonly y: number }[];
  points?: readonly { readonly x: number; readonly y: number }[];
  frame?: number;
  angle?: number;
  color?: unknown;
  outline?: { color?: unknown; width?: number };
  renderNode?: IRenderNode | null;
  tag?: string;
  is?(tagToCheck: string): boolean;
  move?(speedXOrVector: number | { x: number; y: number }, speedY?: number): void;
  moveTo?(
    targetCoordinateXOrVector: number | { x: number; y: number },
    targetCoordinateYOrSpeed?: number,
    optionalSpeedValue?: number
  ): void;
  readonly children?: readonly RenderingContextEntity[];
  add(childComponentOrDescriber: unknown[] | unknown): RenderingContextEntity;
  exists(): boolean;
  onUpdate(entityUpdateHandler: (deltaTimeInSeconds?: number) => void): { cancel: () => void };
  onDestroy(entityDestroyHandler: () => void): { cancel: () => void };
  isKeyDown?(keyIdentifier: string): boolean;
  isKeyPressed?(keyIdentifier?: string): boolean;
  isKeyReleased?(keyIdentifier?: string): boolean;
  onKeyPress?(
    keyOrExecutionCallback: string | (() => void),
    maybeKeyCallback?: () => void
  ): { cancel: () => void };
  onKeyDown?(
    keyOrExecutionCallback: string | (() => void),
    maybeKeyCallback?: () => void
  ): { cancel: () => void };
  onKeyRelease?(
    keyOrExecutionCallback: string | (() => void),
    maybeKeyCallback?: () => void
  ): { cancel: () => void };
  mousePos?(): { readonly x: number; readonly y: number };
  onCollide(
    targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
    maybeCollisionHandler?: (collidedEntity: unknown) => void
  ): { cancel: () => void };
  onCollideUpdate(
    targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
    maybeCollisionHandler?: (collidedEntity: unknown) => void
  ): { cancel: () => void };
  onCollideEnd(
    targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
    maybeCollisionHandler?: (collidedEntity: unknown) => void
  ): { cancel: () => void };
  triggerCollision?(collidedEntity: unknown, collidedEntityTag?: string): void;
  triggerCollisionUpdate?(collidedEntity: unknown, collidedEntityTag?: string): void;
  triggerCollisionEnd?(collidedEntity: unknown, collidedEntityTag?: string): void;
  onClick(clickCallback: () => void): { cancel: () => void };
  onHoverUpdate(callback?: () => void): { cancel: () => void };
  onHoverEnd(callback?: () => void): { cancel: () => void };
  play(animationName?: string): void;
  curAnim?(): string | null;
  destroy(): void;
}

export interface RenderingContext {
  readonly renderEngine: IRenderEngine;
  readonly sceneManager: ISceneManager;
  readonly lifecycle: RenderingContextLifecycle;
  readonly debug: { paused: boolean };
  readonly easings: {
    readonly easeOutQuad: (progressRatio: number) => number;
    readonly easeInQuad: (progressRatio: number) => number;
  };

  loadFont(fontName: string, fontSource: string): string;
  loadSprite(spriteName: string, spriteSource: string): string;

  scene(sceneIdentifier: string, sceneAction: (transitionData?: unknown) => void): string;
  go(sceneIdentifier: string, ...transitionArguments: unknown[]): void;
  setGravity(gravityValue: number): void;

  width(): number;
  height(): number;
  dt(): number;
  time(): number;
  isPaused(): boolean;
  setPaused(pausedState: boolean): void;

  rand(minimumValue?: number, maximumValue?: number): number;
  choose<T>(choicesList: readonly T[]): T;
  clamp(valueToClamp: number, minimumBound: number, maximumBound: number): number;
  lerp(startValue: number, endValue: number, interpolationProgress: number): number;
  deg2rad(degreesValue: number): number;
  rad2deg(radiansValue: number): number;

  vec2(coordinateX: number, coordinateY: number): RenderingContextVector2D;
  rgb(redValue: number, greenValue: number, blueValue: number): readonly [number, number, number];
  setBackground?(backgroundColor: unknown): void;
  shake(intensity: number): void;

  circle(circleRadius: number): { readonly type: "circle"; readonly radius: number };
  polygon(
    polygonPointsList: readonly (
      { readonly x: number; readonly y: number } | readonly [number, number] | unknown
    )[],
    polygonOptions?: Record<string, unknown>
  ): {
    readonly type: "polygon";
    readonly pts: readonly { readonly x: number; readonly y: number }[];
    readonly points: readonly { readonly x: number; readonly y: number }[];
    readonly options?: Record<string, unknown>;
  };
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top" | "botright" | string): {
    readonly type: "anchor";
    readonly anchorPoint: string;
  };
  outline(
    outlineWidth: number,
    outlineColor?: unknown
  ): {
    readonly type: "outline";
    readonly width: number;
    readonly color?: unknown;
  };
  scale(
    scaleFactorOrVector: number | { readonly x: number; readonly y: number },
    scaleFactorY?: number
  ): {
    readonly type: "scale";
    readonly scaleX: number;
    readonly scaleY: number;
  };
  rotate(rotationDegrees: number): {
    readonly type: "rotate";
    readonly angle: number;
  };
  sprite(
    spriteIdentifier: string,
    spriteOptions?: Record<string, unknown>
  ): {
    readonly type: "sprite";
    readonly sprite: string;
    readonly options?: Record<string, unknown>;
  };

  pos(
    positionOrCoordinateX: number | { readonly x: number; readonly y: number },
    coordinateY?: number
  ): { readonly type: "pos"; readonly x: number; readonly y: number };
  rect(
    rectangleWidth: number,
    rectangleHeight: number,
    rectangleOptions?: Record<string, unknown>
  ): {
    readonly type: "rect";
    readonly width: number;
    readonly height: number;
    readonly options?: Record<string, unknown>;
  };
  color(...colorArguments: unknown[]): { readonly type: "color"; readonly args: unknown[] };
  opacity(alphaValue: number): { readonly type: "opacity"; readonly opacity: number };
  fixed(): { readonly type: "fixed" };
  z(zIndexValue: number): { readonly type: "z"; readonly z: number };
  area(areaOptions?: Record<string, unknown>): {
    readonly type: "area";
    readonly options?: Record<string, unknown>;
  };
  text(
    contentString: string,
    textOptions?: Record<string, unknown>
  ): {
    readonly type: "text";
    readonly text: string;
    readonly options?: Record<string, unknown>;
  };

  add(componentsListOrDescriber: unknown[] | unknown): RenderingContextEntity;
  destroy(targetEntity: unknown): void;

  tween(
    fromValue: number,
    toValue: number,
    durationInSeconds: number,
    valueSetter: (interpolatedValue: number) => void,
    easingMethod?: unknown
  ): { then(resolvedCallback: () => void): void };

  onSceneLeave(leaveCallback: () => void): { cancel: () => void };
  onKeyPress(
    keyOrExecutionCallback: string | (() => void),
    maybeKeyCallback?: () => void
  ): { cancel: () => void };
  onKeyDown(
    keyOrExecutionCallback: string | (() => void),
    maybeKeyCallback?: () => void
  ): { cancel: () => void };
  onKeyRelease(
    keyOrExecutionCallback: string | (() => void),
    maybeKeyCallback?: () => void
  ): { cancel: () => void };
  onMousePress(pointerPressCallback: () => void): { cancel: () => void };
  onClick(clickCallback: () => void): { cancel: () => void };
  isMousePressed(): boolean;
  isMouseDown?(): boolean;
  mousePos(): { readonly x: number; readonly y: number };
  isKeyDown(keyIdentifier: string): boolean;
  isKeyPressed(keyIdentifier?: string): boolean;
  isKeyReleased(keyIdentifier?: string): boolean;
  onUpdate(updateCallback: (deltaTimeInSeconds: number) => void): { cancel: () => void };
  wait(durationInSeconds: number, timerCompletionCallback: () => void): { cancel: () => void };

  camPos(
    cameraPositionOrCoordinateX?: number | { readonly x: number; readonly y: number },
    cameraCoordinateY?: number
  ): { readonly x: number; readonly y: number };
  camScale?(scaleFactor: number | { readonly x: number; readonly y: number }): void;
  updateCameraViewportPosition?(
    cameraPositionCoordinateX: number,
    cameraPositionCoordinateY: number
  ): { readonly x: number; readonly y: number };
  synchronizePlayerCameraTracking?(
    playerCoordinateX: number,
    playerCoordinateY?: number,
    smoothingFactor?: number
  ): { readonly x: number; readonly y: number };

  get(tagIdentifier: string): unknown[];
  onCollide(
    firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
    secondTagOrCollisionHandler?: string | ((firstEntity: unknown, secondEntity: unknown) => void),
    maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
  ): { cancel: () => void };
  onCollideUpdate(
    firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
    secondTagOrCollisionHandler?: string | ((firstEntity: unknown, secondEntity: unknown) => void),
    maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
  ): { cancel: () => void };
  onCollideEnd(
    firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
    secondTagOrCollisionHandler?: string | ((firstEntity: unknown, secondEntity: unknown) => void),
    maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
  ): { cancel: () => void };
  triggerCollision?(
    firstEntity: unknown,
    secondEntity: unknown,
    firstEntityTag?: string,
    secondEntityTag?: string
  ): void;
  triggerCollisionUpdate?(
    firstEntity: unknown,
    secondEntity: unknown,
    firstEntityTag?: string,
    secondEntityTag?: string
  ): void;
  triggerCollisionEnd?(
    firstEntity: unknown,
    secondEntity: unknown,
    firstEntityTag?: string,
    secondEntityTag?: string
  ): void;
  setFullscreen(fullscreenEnabled: boolean): void;
  isFullscreen(): boolean;
}

/**
 * Cria uma instância desacoplada e fortemente tipada do contexto de renderização
 * baseada nos contratos IRenderEngine e ISceneManager.
 */
export function createRenderingContext(
  renderEngineInstance: IRenderEngine,
  sceneManagerInstance: ISceneManager
): RenderingContext {
  interface GlobalCollisionListenerRegistration {
    readonly firstTag: string;
    readonly secondTag?: string;
    readonly collisionHandler: (firstEntity: unknown, secondEntity: unknown) => void;
  }

  const sceneLeaveCallbacksList: Array<() => void> = [];
  const sceneCleanupCallbacksList: Array<() => void> = [];
  const sceneUpdateCallbacksList: Array<(deltaTimeInSeconds: number) => void> = [];
  const globalCollisionListenersList: GlobalCollisionListenerRegistration[] = [];
  const globalCollisionUpdateListenersList: GlobalCollisionListenerRegistration[] = [];
  const globalCollisionEndListenersList: GlobalCollisionListenerRegistration[] = [];
  const taggedEntitiesMap = new Map<string, Set<unknown>>();

  const flushActiveSceneResources = (): void => {
    while (sceneLeaveCallbacksList.length > 0) {
      const activeLeaveCallback = sceneLeaveCallbacksList.pop();
      try {
        activeLeaveCallback?.();
      } catch (error) {
        console.error("[RenderingContext] Erro em callback de saída de cena:", error);
      }
    }
    while (sceneCleanupCallbacksList.length > 0) {
      const activeCleanupCallback = sceneCleanupCallbacksList.pop();
      try {
        activeCleanupCallback?.();
      } catch (error) {
        console.error("[RenderingContext] Erro em callback de limpeza de cena:", error);
      }
    }
    sceneUpdateCallbacksList.length = 0;
    globalCollisionListenersList.length = 0;
    globalCollisionUpdateListenersList.length = 0;
    globalCollisionEndListenersList.length = 0;
    taggedEntitiesMap.clear();
  };

  const matchesTag = (entity: unknown, expectedTag: string, providedTag?: string): boolean => {
    if (expectedTag === "*") {
      return true;
    }
    if (providedTag !== undefined && providedTag === expectedTag) {
      return true;
    }
    if (
      entity &&
      typeof entity === "object" &&
      "is" in entity &&
      typeof (entity as { is: (tag: string) => boolean }).is === "function"
    ) {
      return (entity as { is: (tag: string) => boolean }).is(expectedTag);
    }
    if (
      entity &&
      typeof entity === "object" &&
      "tag" in entity &&
      (entity as { tag?: string }).tag === expectedTag
    ) {
      return true;
    }
    return false;
  };

  const registerGlobalCollisionListener = (
    destinationRegistryList: GlobalCollisionListenerRegistration[],
    firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
    secondTagOrCollisionHandler?: string | ((firstEntity: unknown, secondEntity: unknown) => void),
    maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
  ): { cancel: () => void } => {
    let firstTag = "";
    let secondTag: string | undefined = undefined;
    let collisionHandler: (firstEntity: unknown, secondEntity: unknown) => void = () => {};

    if (
      typeof firstTagOrCollisionHandler === "string" &&
      typeof secondTagOrCollisionHandler === "string" &&
      typeof maybeCollisionHandler === "function"
    ) {
      firstTag = firstTagOrCollisionHandler;
      secondTag = secondTagOrCollisionHandler;
      collisionHandler = maybeCollisionHandler;
    } else if (
      typeof firstTagOrCollisionHandler === "string" &&
      typeof secondTagOrCollisionHandler === "function"
    ) {
      firstTag = firstTagOrCollisionHandler;
      secondTag = undefined;
      collisionHandler = secondTagOrCollisionHandler as (
        firstEntity: unknown,
        secondEntity: unknown
      ) => void;
    } else if (typeof firstTagOrCollisionHandler === "function") {
      firstTag = "*";
      secondTag = undefined;
      collisionHandler = firstTagOrCollisionHandler as (
        firstEntity: unknown,
        secondEntity: unknown
      ) => void;
    }

    const registrationRecord: GlobalCollisionListenerRegistration = {
      firstTag,
      secondTag,
      collisionHandler,
    };
    destinationRegistryList.push(registrationRecord);

    const cancelRegistrationListener = (): void => {
      const targetIndex = destinationRegistryList.indexOf(registrationRecord);
      if (targetIndex !== -1) {
        destinationRegistryList.splice(targetIndex, 1);
      }
    };
    sceneCleanupCallbacksList.push(cancelRegistrationListener);
    return { cancel: cancelRegistrationListener };
  };

  const dispatchGlobalCollisionEvent = (
    registryList: GlobalCollisionListenerRegistration[],
    firstEntity: unknown,
    secondEntity: unknown,
    firstEntityTag?: string,
    secondEntityTag?: string
  ): void => {
    const registrySnapshot = registryList.slice();
    for (let index = 0; index < registrySnapshot.length; index++) {
      const registration = registrySnapshot[index];
      if (registration.secondTag !== undefined) {
        if (
          matchesTag(firstEntity, registration.firstTag, firstEntityTag) &&
          matchesTag(secondEntity, registration.secondTag, secondEntityTag)
        ) {
          try {
            registration.collisionHandler(firstEntity, secondEntity);
          } catch (error) {
            console.error(
              "[RenderingContext] Error during global collision callback execution:",
              error
            );
          }
        } else if (
          matchesTag(secondEntity, registration.firstTag, secondEntityTag) &&
          matchesTag(firstEntity, registration.secondTag, firstEntityTag)
        ) {
          try {
            registration.collisionHandler(secondEntity, firstEntity);
          } catch (error) {
            console.error(
              "[RenderingContext] Error during global collision callback execution:",
              error
            );
          }
        }
      } else {
        if (matchesTag(firstEntity, registration.firstTag, firstEntityTag)) {
          try {
            registration.collisionHandler(firstEntity, secondEntity);
          } catch (error) {
            console.error(
              "[RenderingContext] Error during global single-tag collision callback execution:",
              error
            );
          }
        }
      }
    }
  };

  let accumulatedSceneTimeInSeconds: number =
    (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  let currentSceneDeltaTimeInSeconds: number = 0.0166;
  let freezeEngineClockDuringPause: boolean = false;

  const debugConfiguration = {
    get paused(): boolean {
      return freezeEngineClockDuringPause;
    },
    set paused(shouldPauseClock: boolean) {
      freezeEngineClockDuringPause = Boolean(shouldPauseClock);
    },
  };

  const isEngineClockPaused = (): boolean => {
    return freezeEngineClockDuringPause;
  };

  const runActiveSceneUpdateCallbacks = (deltaTimeInSeconds: number): void => {
    if (isEngineClockPaused()) {
      currentSceneDeltaTimeInSeconds = 0;
      const activeInputStateManager = getInputStateManager();
      if (activeInputStateManager) {
        singleFrameInputStateUpdater(activeInputStateManager);
      }
      const updateCallbacksSnapshot = sceneUpdateCallbacksList.slice();
      for (let index = 0; index < updateCallbacksSnapshot.length; index++) {
        try {
          updateCallbacksSnapshot[index](0);
        } catch (error) {
          console.error(
            "[RenderingContext] Erro em callback de update da cena ativa durante pausa:",
            error
          );
        }
      }
      completeSingleFrameInputCycle();
      return;
    }

    const safeDeltaTime = centralizedDeltaTimeClamp(deltaTimeInSeconds);
    currentSceneDeltaTimeInSeconds = safeDeltaTime;
    accumulatedSceneTimeInSeconds += safeDeltaTime;

    const activeInputStateManager = getInputStateManager();
    if (activeInputStateManager) {
      singleFrameInputStateUpdater(activeInputStateManager);
    }
    const updateCallbacksSnapshot = sceneUpdateCallbacksList.slice();
    for (let index = 0; index < updateCallbacksSnapshot.length; index++) {
      try {
        updateCallbacksSnapshot[index](safeDeltaTime);
      } catch (error) {
        console.error("[RenderingContext] Erro em callback de update da cena ativa:", error);
      }
    }
    completeSingleFrameInputCycle();
  };

  const renderContextLifecycle: RenderingContextLifecycle = {
    runSceneUpdateCallbacks: runActiveSceneUpdateCallbacks,
    flushSceneResources: flushActiveSceneResources,
    setClockPaused: (pausedState: boolean) => {
      freezeEngineClockDuringPause = Boolean(pausedState);
    },
    isClockPaused: isEngineClockPaused,
  };

  const renderingContext: RenderingContext = {
    renderEngine: renderEngineInstance,
    sceneManager: sceneManagerInstance,
    lifecycle: renderContextLifecycle,
    debug: debugConfiguration,
    easings: {
      easeOutQuad: Easings.easeOutQuad,
      easeInQuad: Easings.easeInQuad,
    },

    loadFont(fontName: string, fontSource: string): string {
      void Assets.load({ alias: fontName, src: fontSource }).catch(() => undefined);
      return fontName;
    },

    loadSprite(spriteName: string, spriteSource: string): string {
      void Assets.load({ alias: spriteName, src: spriteSource }).catch(() => undefined);
      return spriteName;
    },

    scene(sceneIdentifier: string, sceneAction: (transitionData?: unknown) => void): string {
      sceneManagerInstance.registerScene(
        withRenderingContextLifecycle(
          {
            name: sceneIdentifier,
            enter: (transitionData?: unknown) => {
              sceneAction(transitionData);
            },
            update: () => {},
            exit: () => {},
          },
          renderContextLifecycle
        )
      );
      return sceneIdentifier;
    },

    go(sceneIdentifier: string, ...transitionArguments: unknown[]): void {
      void sceneManagerInstance.loadScene(sceneIdentifier, transitionArguments[0]);
    },

    setGravity(_gravityValue: number): void {
      // Física e gravidade são coordenadas deterministicamente pelos sistemas e runner canônico
    },

    width(): number {
      return renderEngineInstance.getDimensions().width;
    },

    height(): number {
      return renderEngineInstance.getDimensions().height;
    },

    dt(): number {
      if (isEngineClockPaused()) {
        return 0;
      }
      return renderEngineInstance.isInitialized
        ? renderEngineInstance.getTicker().getDeltaTime()
        : currentSceneDeltaTimeInSeconds;
    },

    time(): number {
      return accumulatedSceneTimeInSeconds;
    },

    isPaused(): boolean {
      return isEngineClockPaused();
    },

    setPaused(pausedState: boolean): void {
      freezeEngineClockDuringPause = Boolean(pausedState);
    },

    rand(minimumValue?: number, maximumValue?: number): number {
      if (typeof minimumValue === "undefined") {
        return Math.random();
      }
      if (typeof maximumValue === "undefined") {
        return Math.random() * minimumValue;
      }
      const lowerRangeBound = Math.min(minimumValue, maximumValue);
      const upperRangeBound = Math.max(minimumValue, maximumValue);
      return lowerRangeBound + Math.random() * (upperRangeBound - lowerRangeBound);
    },

    choose<T>(choicesList: readonly T[]): T {
      if (!choicesList || choicesList.length === 0) {
        return undefined as unknown as T;
      }
      const randomChoiceIndex = Math.floor(Math.random() * choicesList.length);
      return choicesList[randomChoiceIndex];
    },

    clamp(valueToClamp: number, minimumBound: number, maximumBound: number): number {
      return Math.min(maximumBound, Math.max(minimumBound, valueToClamp));
    },

    lerp(startValue: number, endValue: number, interpolationProgress: number): number {
      return startValue + (endValue - startValue) * interpolationProgress;
    },

    deg2rad(degreesValue: number): number {
      return degreesValue * (Math.PI / 180);
    },

    rad2deg(radiansValue: number): number {
      return radiansValue * (180 / Math.PI);
    },

    vec2(coordinateX: number, coordinateY: number): RenderingContextVector2D {
      return createRenderingContextVector2D(coordinateX, coordinateY);
    },

    rgb(
      redValue: number,
      greenValue: number,
      blueValue: number
    ): readonly [number, number, number] {
      return [redValue, greenValue, blueValue] as const;
    },

    setBackground(backgroundColor: unknown): void {
      const normalizedRgb = normalizeRgbColorTuple(backgroundColor);
      if (normalizedRgb) {
        renderEngineInstance.setBackground?.(normalizedRgb);
        return;
      }
      if (typeof backgroundColor === "number" || typeof backgroundColor === "string") {
        renderEngineInstance.setBackground?.(backgroundColor);
      }
    },

    shake(intensity: number): void {
      renderEngineInstance.shake?.(intensity);
    },

    circle(circleRadius: number): { readonly type: "circle"; readonly radius: number } {
      return { type: "circle", radius: circleRadius };
    },

    polygon(
      polygonPointsList: readonly (
        { readonly x: number; readonly y: number } | readonly [number, number] | unknown
      )[],
      polygonOptions?: Record<string, unknown>
    ): {
      readonly type: "polygon";
      readonly pts: readonly { readonly x: number; readonly y: number }[];
      readonly points: readonly { readonly x: number; readonly y: number }[];
      readonly options?: Record<string, unknown>;
    } {
      const normalizedPolygonPoints = (polygonPointsList ?? []).map((rawPolygonPoint) => {
        if (Array.isArray(rawPolygonPoint) && rawPolygonPoint.length >= 2) {
          return { x: Number(rawPolygonPoint[0]), y: Number(rawPolygonPoint[1]) };
        }
        if (rawPolygonPoint && typeof rawPolygonPoint === "object") {
          const vectorPoint = rawPolygonPoint as { x?: number; y?: number };
          return {
            x: typeof vectorPoint.x === "number" ? vectorPoint.x : 0,
            y: typeof vectorPoint.y === "number" ? vectorPoint.y : 0,
          };
        }
        return { x: 0, y: 0 };
      });
      return {
        type: "polygon",
        pts: normalizedPolygonPoints,
        points: normalizedPolygonPoints,
        options: polygonOptions,
      };
    },

    anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top" | "botright" | string): {
      readonly type: "anchor";
      readonly anchorPoint: string;
    } {
      return { type: "anchor", anchorPoint };
    },

    outline(
      outlineWidth: number,
      outlineColor?: unknown
    ): {
      readonly type: "outline";
      readonly width: number;
      readonly color?: unknown;
    } {
      return { type: "outline", width: outlineWidth, color: outlineColor };
    },

    scale(
      scaleFactorOrVector: number | { readonly x: number; readonly y: number },
      scaleFactorY?: number
    ): {
      readonly type: "scale";
      readonly scaleX: number;
      readonly scaleY: number;
    } {
      if (typeof scaleFactorOrVector === "object" && scaleFactorOrVector !== null) {
        return {
          type: "scale",
          scaleX: scaleFactorOrVector.x,
          scaleY: scaleFactorOrVector.y,
        };
      }
      const scaleX = scaleFactorOrVector;
      const scaleY = typeof scaleFactorY === "number" ? scaleFactorY : scaleFactorOrVector;
      return { type: "scale", scaleX, scaleY };
    },

    rotate(rotationDegrees: number): {
      readonly type: "rotate";
      readonly angle: number;
    } {
      return { type: "rotate", angle: rotationDegrees };
    },

    sprite(
      spriteIdentifier: string,
      spriteOptions?: Record<string, unknown>
    ): {
      readonly type: "sprite";
      readonly sprite: string;
      readonly options?: Record<string, unknown>;
    } {
      return { type: "sprite", sprite: spriteIdentifier, options: spriteOptions };
    },

    pos(
      positionOrCoordinateX: number | { readonly x: number; readonly y: number },
      coordinateY?: number
    ): { readonly type: "pos"; readonly x: number; readonly y: number } {
      if (typeof positionOrCoordinateX === "object" && positionOrCoordinateX !== null) {
        return {
          type: "pos",
          x: positionOrCoordinateX.x,
          y: positionOrCoordinateX.y,
        };
      }
      return {
        type: "pos",
        x: positionOrCoordinateX,
        y: coordinateY ?? 0,
      };
    },

    rect(
      rectangleWidth: number,
      rectangleHeight: number,
      rectangleOptions?: Record<string, unknown>
    ): {
      readonly type: "rect";
      readonly width: number;
      readonly height: number;
      readonly options?: Record<string, unknown>;
    } {
      return {
        type: "rect",
        width: rectangleWidth,
        height: rectangleHeight,
        options: rectangleOptions,
      };
    },

    color(...colorArguments: unknown[]): {
      readonly type: "color";
      readonly args: unknown[];
    } {
      return { type: "color", args: colorArguments };
    },

    opacity(alphaValue: number): { readonly type: "opacity"; readonly opacity: number } {
      return { type: "opacity", opacity: alphaValue };
    },

    fixed(): { readonly type: "fixed" } {
      return { type: "fixed" };
    },

    z(zIndexValue: number): { readonly type: "z"; readonly z: number } {
      return { type: "z", z: zIndexValue };
    },

    area(areaOptions?: Record<string, unknown>): {
      readonly type: "area";
      readonly options?: Record<string, unknown>;
    } {
      return { type: "area", options: areaOptions };
    },

    text(
      contentString: string,
      textOptions?: Record<string, unknown>
    ): {
      readonly type: "text";
      readonly text: string;
      readonly options?: Record<string, unknown>;
    } {
      return { type: "text", text: contentString, options: textOptions };
    },

    add(componentsListOrDescriber: unknown[] | unknown): RenderingContextEntity {
      const buildRenderingContextEntity = (
        componentsListOrDescriptor: unknown[] | unknown,
        parentEntityVisualNode?: IRenderNode | null
      ): RenderingContextEntity => {
        const normalizedComponentsList = Array.isArray(componentsListOrDescriptor)
          ? componentsListOrDescriptor
          : componentsListOrDescriptor !== undefined && componentsListOrDescriptor !== null
            ? [componentsListOrDescriptor]
            : [];

        const entityChildList: RenderingContextEntity[] = [];
        let isFixedElement = false;
        let positionCoordinateX = 0;
        let positionCoordinateY = 0;
        let anchorAlignment: "center" | "topleft" | "left" | "right" | "top" | "botright" | string =
          "topleft";
        let entityOpacity = 1;
        let entityZIndex = 0;
        let entityTextContent: string | null = null;
        let textStyleOptionsRecord: Record<string, unknown> | null = null;
        let rectangleWidthValue: number | null = null;
        let rectangleHeightValue: number | null = null;
        let rectangleRadiusValue: number | null = null;
        let circleRadiusValue: number | null = null;
        let polygonPointsCoordinatesList: Array<{ x: number; y: number }> | null = null;
        let spriteAssetIdentifier: string | null = null;
        let spriteOptionsRecord: Record<string, unknown> | null = null;
        let spriteAnimationControllerInstance: SpriteAnimationController | null = null;
        let outlineWidthValue: number | null = null;
        let outlineColorValue: [number, number, number] = [255, 255, 255];
        let entityRgbColor: [number, number, number] = [255, 255, 255];
        let hasExplicitColorComponent = false;
        let scaleCoordinateX = 1;
        let scaleCoordinateY = 1;
        let rotationDegreesValue = 0;
        let entityVisualNode: IRenderNode | null = null;

        let isEntityDestroyed = false;
        const entityDestroyCallbacksList: Array<() => void> = [];
        const entityActiveUpdateListenersList: Array<() => void> = [];
        const entityClickCallbacksList: Array<() => void> = [];
        const entityHoverUpdateCallbacksList: Array<() => void> = [];
        const entityHoverEndCallbacksList: Array<() => void> = [];
        let isScreenHitTargetRegistered = false;
        const entityCollisionListenersList: Array<{
          readonly targetTag?: string;
          readonly collisionHandler: (collidedEntity: unknown) => void;
        }> = [];
        const entityCollisionUpdateListenersList: Array<{
          readonly targetTag?: string;
          readonly collisionUpdateHandler: (collidedEntity: unknown) => void;
        }> = [];
        const entityCollisionEndListenersList: Array<{
          readonly targetTag?: string;
          readonly collisionEndHandler: (collidedEntity: unknown) => void;
        }> = [];
        const entityTagsSet = new Set<string>();
        let primaryEntityTagIdentifier: string | undefined = undefined;
        let isEntityHidden = false;
        let isFlippedHorizontally = false;
        let isFlippedVertically = false;

        const updateEntityNodeScale = (): void => {
          if (entityVisualNode) {
            const horizontalSign = isFlippedHorizontally ? -1 : 1;
            const verticalSign = isFlippedVertically ? -1 : 1;
            entityVisualNode.setScale(
              scaleCoordinateX * horizontalSign,
              scaleCoordinateY * verticalSign
            );
          }
        };

        const redrawEntityGraphicsShape = (
          graphicsNodeInstance: IGraphicsNode,
          shouldClearBeforeDraw: boolean
        ): void => {
          if (shouldClearBeforeDraw && typeof graphicsNodeInstance.clear === "function") {
            graphicsNodeInstance.clear();
          }
          const graphicStyle = {
            fill: { color: entityRgbColor, alpha: 1 },
            ...(outlineWidthValue !== null
              ? { stroke: { width: outlineWidthValue, color: outlineColorValue, alpha: 1 } }
              : {}),
          };
          if (circleRadiusValue !== null) {
            graphicsNodeInstance.drawCircle(0, 0, Math.max(0, circleRadiusValue), graphicStyle);
          } else if (rectangleWidthValue !== null && rectangleHeightValue !== null) {
            const originOffsets = calculateOriginOffset(
              anchorAlignment,
              rectangleWidthValue,
              rectangleHeightValue
            );
            const sanitizedWidth = Math.max(0, rectangleWidthValue);
            const sanitizedHeight = Math.max(0, rectangleHeightValue);
            if (typeof rectangleRadiusValue === "number" && rectangleRadiusValue > 0) {
              graphicsNodeInstance.drawRoundedRect(
                originOffsets.originX,
                originOffsets.originY,
                sanitizedWidth,
                sanitizedHeight,
                rectangleRadiusValue,
                graphicStyle
              );
            } else {
              graphicsNodeInstance.drawRect(
                originOffsets.originX,
                originOffsets.originY,
                sanitizedWidth,
                sanitizedHeight,
                graphicStyle
              );
            }
          } else if (
            polygonPointsCoordinatesList !== null &&
            polygonPointsCoordinatesList.length >= 3 &&
            typeof graphicsNodeInstance.drawPolygon === "function"
          ) {
            graphicsNodeInstance.drawPolygon(polygonPointsCoordinatesList, graphicStyle);
          }
          if (typeof graphicsNodeInstance.setOpacity === "function") {
            graphicsNodeInstance.setOpacity(entityOpacity);
          }
        };

        const entityPositionBindingInstance = createEntityPositionBinding(
          () => positionCoordinateX,
          () => positionCoordinateY,
          (updatedCoordinateX: number, updatedCoordinateY: number) => {
            positionCoordinateX = updatedCoordinateX;
            positionCoordinateY = updatedCoordinateY;
            entityVisualNode?.setPosition(positionCoordinateX, positionCoordinateY);
          }
        );

        const velocityVectorInstance = createRenderingContextVector2D(0, 0);

        const velocityPhysicsUpdateHandler = renderingContext.onUpdate(
          (deltaTimeInSeconds: number) => {
            if (isEntityDestroyed) {
              return;
            }
            if (velocityVectorInstance.x !== 0 || velocityVectorInstance.y !== 0) {
              const safeDeltaTime = centralizedDeltaTimeClamp(deltaTimeInSeconds);
              positionCoordinateX += velocityVectorInstance.x * safeDeltaTime;
              positionCoordinateY += velocityVectorInstance.y * safeDeltaTime;
              entityVisualNode?.setPosition(positionCoordinateX, positionCoordinateY);
            }
          }
        );
        entityActiveUpdateListenersList.push(velocityPhysicsUpdateHandler.cancel);

        const ensureScreenHitTargetRegistered = (): boolean => {
          if (!isFixedElement || rectangleWidthValue === null || rectangleHeightValue === null) {
            return false;
          }
          if (isScreenHitTargetRegistered) {
            return true;
          }
          isScreenHitTargetRegistered = true;
          const activeScreenChecker =
            renderEngineInstance.isInitialized &&
            typeof renderEngineInstance.getScreenLayerGeometryChecker === "function"
              ? (renderEngineInstance.getScreenLayerGeometryChecker() as ReturnType<
                  typeof getScreenLayerGeometryChecker
                >)
              : getScreenLayerGeometryChecker();

          const cancelHitTargetRegistration = activeScreenChecker.registerHitTarget({
            id: `screen_button_${Math.random().toString(36).slice(2, 9)}`,
            bounds: () => {
              const currentWidth = rectangleWidthValue ?? 0;
              const currentHeight = rectangleHeightValue ?? 0;
              const originOffsets = calculateOriginOffset(
                anchorAlignment,
                currentWidth,
                currentHeight
              );
              return {
                x: positionCoordinateX + originOffsets.originX,
                y: positionCoordinateY + originOffsets.originY,
                width: currentWidth,
                height: currentHeight,
              };
            },
            zIndex: entityZIndex,
            onClick: () => {
              if (isEntityDestroyed || isEntityHidden) return;
              for (let index = 0; index < entityClickCallbacksList.length; index++) {
                entityClickCallbacksList[index]();
              }
            },
            onPointerEnter: () => {
              if (isEntityDestroyed || isEntityHidden) return;
              for (let index = 0; index < entityHoverUpdateCallbacksList.length; index++) {
                entityHoverUpdateCallbacksList[index]();
              }
            },
            onPointerLeave: () => {
              if (isEntityDestroyed || isEntityHidden) return;
              for (let index = 0; index < entityHoverEndCallbacksList.length; index++) {
                entityHoverEndCallbacksList[index]();
              }
            },
          });
          entityDestroyCallbacksList.push(cancelHitTargetRegistration);
          sceneCleanupCallbacksList.push(cancelHitTargetRegistration);
          return true;
        };

        const entityInstance: RenderingContextEntity = {
          pos: entityPositionBindingInstance,
          scale: { x: 1, y: 1 },
          opacity: 1,
          z: 0,
          hidden: false,
          fixed: false,
          exists: () => !isEntityDestroyed,
          move: (
            speedXOrVector: number | { readonly x: number; readonly y: number },
            maybeSpeedY?: number
          ): void => {
            if (isEntityDestroyed) {
              return;
            }
            let speedX = 0;
            let speedY = 0;
            if (typeof speedXOrVector === "number") {
              speedX = speedXOrVector;
              speedY = typeof maybeSpeedY === "number" ? maybeSpeedY : 0;
            } else if (speedXOrVector && typeof speedXOrVector === "object") {
              speedX = typeof speedXOrVector.x === "number" ? speedXOrVector.x : 0;
              speedY = typeof speedXOrVector.y === "number" ? speedXOrVector.y : 0;
            }
            const rawDeltaTime =
              typeof renderingContext.dt === "function" ? renderingContext.dt() : 0.0166;
            const safeDeltaTime = centralizedDeltaTimeClamp(rawDeltaTime);
            positionCoordinateX += speedX * safeDeltaTime;
            positionCoordinateY += speedY * safeDeltaTime;
            entityVisualNode?.setPosition(positionCoordinateX, positionCoordinateY);
          },
          moveTo: (
            targetCoordinateXOrVector: number | { readonly x: number; readonly y: number },
            targetCoordinateYOrSpeed?: number,
            optionalSpeedValue?: number
          ): void => {
            if (isEntityDestroyed) {
              return;
            }
            let targetX = 0;
            let targetY = 0;
            let speed: number | undefined;

            if (typeof targetCoordinateXOrVector === "number") {
              targetX = targetCoordinateXOrVector;
              targetY = typeof targetCoordinateYOrSpeed === "number" ? targetCoordinateYOrSpeed : 0;
              speed = optionalSpeedValue;
            } else if (targetCoordinateXOrVector && typeof targetCoordinateXOrVector === "object") {
              targetX =
                typeof targetCoordinateXOrVector.x === "number" ? targetCoordinateXOrVector.x : 0;
              targetY =
                typeof targetCoordinateXOrVector.y === "number" ? targetCoordinateXOrVector.y : 0;
              speed = targetCoordinateYOrSpeed;
            }

            if (typeof speed === "number" && speed > 0) {
              const rawDeltaTime =
                typeof renderingContext.dt === "function" ? renderingContext.dt() : 0.0166;
              const safeDeltaTime = centralizedDeltaTimeClamp(rawDeltaTime);
              const deltaX = targetX - positionCoordinateX;
              const deltaY = targetY - positionCoordinateY;
              const distanceToTarget = Math.hypot(deltaX, deltaY);
              const stepDistance = speed * safeDeltaTime;

              if (distanceToTarget <= stepDistance || distanceToTarget === 0) {
                positionCoordinateX = targetX;
                positionCoordinateY = targetY;
              } else {
                positionCoordinateX += (deltaX / distanceToTarget) * stepDistance;
                positionCoordinateY += (deltaY / distanceToTarget) * stepDistance;
              }
            } else {
              positionCoordinateX = targetX;
              positionCoordinateY = targetY;
            }
            entityVisualNode?.setPosition(positionCoordinateX, positionCoordinateY);
          },
          onUpdate: (
            entityUpdateHandler: (deltaTimeInSeconds?: number) => void
          ): { cancel: () => void } => {
            if (isEntityDestroyed) {
              return { cancel: () => {} };
            }
            const updateListenerHandle = renderingContext.onUpdate((deltaTimeInSeconds: number) => {
              if (!isEntityDestroyed) {
                entityUpdateHandler(deltaTimeInSeconds);
              }
            });
            const cancelUpdateListener = (): void => {
              updateListenerHandle.cancel();
              const targetIndex = entityActiveUpdateListenersList.indexOf(cancelUpdateListener);
              if (targetIndex !== -1) {
                entityActiveUpdateListenersList.splice(targetIndex, 1);
              }
            };
            entityActiveUpdateListenersList.push(cancelUpdateListener);
            return { cancel: cancelUpdateListener };
          },
          onDestroy: (entityDestroyHandler: () => void): { cancel: () => void } => {
            if (isEntityDestroyed) {
              return { cancel: () => {} };
            }
            entityDestroyCallbacksList.push(entityDestroyHandler);
            const cancelDestroyListener = (): void => {
              const targetIndex = entityDestroyCallbacksList.indexOf(entityDestroyHandler);
              if (targetIndex !== -1) {
                entityDestroyCallbacksList.splice(targetIndex, 1);
              }
            };
            return { cancel: cancelDestroyListener };
          },
          onCollide: (
            targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
            maybeCollisionHandler?: (collidedEntity: unknown) => void
          ): { cancel: () => void } => {
            const targetTag =
              typeof targetTagOrCollisionHandler === "string"
                ? targetTagOrCollisionHandler
                : undefined;
            const collisionHandler =
              typeof targetTagOrCollisionHandler === "function"
                ? targetTagOrCollisionHandler
                : maybeCollisionHandler;

            if (!collisionHandler) {
              return { cancel: () => {} };
            }

            const collisionRegistration = {
              targetTag,
              collisionHandler,
            };
            entityCollisionListenersList.push(collisionRegistration);

            const cancelCollisionListener = (): void => {
              const targetIndex = entityCollisionListenersList.indexOf(collisionRegistration);
              if (targetIndex !== -1) {
                entityCollisionListenersList.splice(targetIndex, 1);
              }
            };
            return { cancel: cancelCollisionListener };
          },
          onCollideUpdate: (
            targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
            maybeCollisionHandler?: (collidedEntity: unknown) => void
          ): { cancel: () => void } => {
            const targetTag =
              typeof targetTagOrCollisionHandler === "string"
                ? targetTagOrCollisionHandler
                : undefined;
            const collisionUpdateHandler =
              typeof targetTagOrCollisionHandler === "function"
                ? targetTagOrCollisionHandler
                : maybeCollisionHandler;

            if (!collisionUpdateHandler) {
              return { cancel: () => {} };
            }

            const collisionUpdateRegistration = {
              targetTag,
              collisionUpdateHandler,
            };
            entityCollisionUpdateListenersList.push(collisionUpdateRegistration);

            const cancelCollisionUpdateListener = (): void => {
              const targetIndex = entityCollisionUpdateListenersList.indexOf(
                collisionUpdateRegistration
              );
              if (targetIndex !== -1) {
                entityCollisionUpdateListenersList.splice(targetIndex, 1);
              }
            };
            return { cancel: cancelCollisionUpdateListener };
          },
          onCollideEnd: (
            targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
            maybeCollisionHandler?: (collidedEntity: unknown) => void
          ): { cancel: () => void } => {
            const targetTag =
              typeof targetTagOrCollisionHandler === "string"
                ? targetTagOrCollisionHandler
                : undefined;
            const collisionEndHandler =
              typeof targetTagOrCollisionHandler === "function"
                ? targetTagOrCollisionHandler
                : maybeCollisionHandler;

            if (!collisionEndHandler) {
              return { cancel: () => {} };
            }

            const collisionEndRegistration = {
              targetTag,
              collisionEndHandler,
            };
            entityCollisionEndListenersList.push(collisionEndRegistration);

            const cancelCollisionEndListener = (): void => {
              const targetIndex = entityCollisionEndListenersList.indexOf(collisionEndRegistration);
              if (targetIndex !== -1) {
                entityCollisionEndListenersList.splice(targetIndex, 1);
              }
            };
            return { cancel: cancelCollisionEndListener };
          },
          triggerCollision: (collidedEntity: unknown, collidedEntityTag?: string): void => {
            if (isEntityDestroyed) {
              return;
            }
            for (let index = 0; index < entityCollisionListenersList.length; index++) {
              const registration = entityCollisionListenersList[index];
              if (
                !registration.targetTag ||
                registration.targetTag === collidedEntityTag ||
                (collidedEntity &&
                  typeof collidedEntity === "object" &&
                  "is" in collidedEntity &&
                  typeof (collidedEntity as { is: (tag: string) => boolean }).is === "function" &&
                  (collidedEntity as { is: (tag: string) => boolean }).is(registration.targetTag))
              ) {
                try {
                  registration.collisionHandler(collidedEntity);
                } catch (error) {
                  console.error(
                    "[RenderingContextEntity] Error during onCollide callback execution:",
                    error
                  );
                }
              }
            }
          },
          triggerCollisionUpdate: (collidedEntity: unknown, collidedEntityTag?: string): void => {
            if (isEntityDestroyed) {
              return;
            }
            for (let index = 0; index < entityCollisionUpdateListenersList.length; index++) {
              const registration = entityCollisionUpdateListenersList[index];
              if (
                !registration.targetTag ||
                registration.targetTag === collidedEntityTag ||
                (collidedEntity &&
                  typeof collidedEntity === "object" &&
                  "is" in collidedEntity &&
                  typeof (collidedEntity as { is: (tag: string) => boolean }).is === "function" &&
                  (collidedEntity as { is: (tag: string) => boolean }).is(registration.targetTag))
              ) {
                try {
                  registration.collisionUpdateHandler(collidedEntity);
                } catch (error) {
                  console.error(
                    "[RenderingContextEntity] Error during onCollideUpdate callback execution:",
                    error
                  );
                }
              }
            }
          },
          triggerCollisionEnd: (collidedEntity: unknown, collidedEntityTag?: string): void => {
            if (isEntityDestroyed) {
              return;
            }
            for (let index = 0; index < entityCollisionEndListenersList.length; index++) {
              const registration = entityCollisionEndListenersList[index];
              if (
                !registration.targetTag ||
                registration.targetTag === collidedEntityTag ||
                (collidedEntity &&
                  typeof collidedEntity === "object" &&
                  "is" in collidedEntity &&
                  typeof (collidedEntity as { is: (tag: string) => boolean }).is === "function" &&
                  (collidedEntity as { is: (tag: string) => boolean }).is(registration.targetTag))
              ) {
                try {
                  registration.collisionEndHandler(collidedEntity);
                } catch (error) {
                  console.error(
                    "[RenderingContextEntity] Error during onCollideEnd callback execution:",
                    error
                  );
                }
              }
            }
          },
          is: (tagToCheck: string): boolean => entityTagsSet.has(tagToCheck),
          isKeyDown: (keyIdentifier: string): boolean => renderingContext.isKeyDown(keyIdentifier),
          isKeyPressed: (keyIdentifier?: string): boolean =>
            renderingContext.isKeyPressed(keyIdentifier),
          isKeyReleased: (keyIdentifier?: string): boolean =>
            renderingContext.isKeyReleased(keyIdentifier),
          onKeyPress: (
            keyOrExecutionCallback: string | (() => void),
            maybeKeyCallback?: () => void
          ) => renderingContext.onKeyPress(keyOrExecutionCallback, maybeKeyCallback),
          onKeyDown: (
            keyOrExecutionCallback: string | (() => void),
            maybeKeyCallback?: () => void
          ) => renderingContext.onKeyDown(keyOrExecutionCallback, maybeKeyCallback),
          onKeyRelease: (
            keyOrExecutionCallback: string | (() => void),
            maybeKeyCallback?: () => void
          ) => renderingContext.onKeyRelease(keyOrExecutionCallback, maybeKeyCallback),
          mousePos: (): { readonly x: number; readonly y: number } => renderingContext.mousePos(),
          onClick: (clickCallback: () => void) => {
            if (ensureScreenHitTargetRegistered()) {
              entityClickCallbacksList.push(clickCallback);
              return {
                cancel: () => {
                  const callbackIndex = entityClickCallbacksList.indexOf(clickCallback);
                  if (callbackIndex !== -1) {
                    entityClickCallbacksList.splice(callbackIndex, 1);
                  }
                },
              };
            }
            return renderingContext.onMousePress(clickCallback);
          },
          onHoverUpdate: (hoverCallback: () => void) => {
            if (ensureScreenHitTargetRegistered()) {
              entityHoverUpdateCallbacksList.push(hoverCallback);
              return {
                cancel: () => {
                  const callbackIndex = entityHoverUpdateCallbacksList.indexOf(hoverCallback);
                  if (callbackIndex !== -1) {
                    entityHoverUpdateCallbacksList.splice(callbackIndex, 1);
                  }
                },
              };
            }
            return { cancel: () => {} };
          },
          onHoverEnd: (hoverEndCallback: () => void) => {
            if (ensureScreenHitTargetRegistered()) {
              entityHoverEndCallbacksList.push(hoverEndCallback);
              return {
                cancel: () => {
                  const callbackIndex = entityHoverEndCallbacksList.indexOf(hoverEndCallback);
                  if (callbackIndex !== -1) {
                    entityHoverEndCallbacksList.splice(callbackIndex, 1);
                  }
                },
              };
            }
            return { cancel: () => {} };
          },
          play: (animationName?: string) => {
            if (animationName && spriteAnimationControllerInstance) {
              spriteAnimationControllerInstance.play(animationName);
            }
          },
          curAnim: () => {
            return spriteAnimationControllerInstance?.getCurrentAnimationName() ?? null;
          },
          add: (childComponentOrDescriber: unknown[] | unknown): RenderingContextEntity => {
            const childEntityInstance = buildRenderingContextEntity(
              childComponentOrDescriber,
              entityVisualNode
            );
            entityChildList.push(childEntityInstance);
            return childEntityInstance;
          },
          destroy: () => {
            if (isEntityDestroyed) {
              return;
            }
            isEntityDestroyed = true;

            while (entityDestroyCallbacksList.length > 0) {
              const entityDestroyHandler = entityDestroyCallbacksList.shift();
              try {
                entityDestroyHandler?.();
              } catch (error) {
                console.error(
                  "[RenderingContextEntity] Error during onDestroy callback execution:",
                  error
                );
              }
            }

            while (entityActiveUpdateListenersList.length > 0) {
              const cancelUpdateListener = entityActiveUpdateListenersList.pop();
              try {
                cancelUpdateListener?.();
              } catch (error) {
                console.error(
                  "[RenderingContextEntity] Error cancelling active update listener:",
                  error
                );
              }
            }

            entityCollisionListenersList.length = 0;
            entityCollisionUpdateListenersList.length = 0;
            entityCollisionEndListenersList.length = 0;

            while (entityChildList.length > 0) {
              const childEntity = entityChildList.pop();
              childEntity?.destroy();
            }
            if (entityVisualNode) {
              entityVisualNode.destroy();
              entityVisualNode = null;
            }
            for (const entitySet of taggedEntitiesMap.values()) {
              entitySet.delete(entityInstance);
            }
          },
        };

        Object.defineProperty(entityInstance, "tag", {
          get: (): string | undefined => {
            if (primaryEntityTagIdentifier !== undefined) {
              return primaryEntityTagIdentifier;
            }
            return entityTagsSet.size > 0 ? Array.from(entityTagsSet)[0] : undefined;
          },
          set: (updatedTagIdentifier: string | undefined): void => {
            if (typeof updatedTagIdentifier === "string" && updatedTagIdentifier.length > 0) {
              primaryEntityTagIdentifier = updatedTagIdentifier;
              entityTagsSet.add(updatedTagIdentifier);
              let targetTaggedBucket = taggedEntitiesMap.get(updatedTagIdentifier);
              if (!targetTaggedBucket) {
                targetTaggedBucket = new Set<unknown>();
                taggedEntitiesMap.set(updatedTagIdentifier, targetTaggedBucket);
              }
              targetTaggedBucket.add(entityInstance);
            } else {
              primaryEntityTagIdentifier = undefined;
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "children", {
          get: () => [...entityChildList],
          enumerable: true,
          configurable: true,
        });

        for (const rawComponent of normalizedComponentsList) {
          if (typeof rawComponent === "string") {
            entityTagsSet.add(rawComponent);
            if (primaryEntityTagIdentifier === undefined) {
              primaryEntityTagIdentifier = rawComponent;
            }
            let taggedBucket = taggedEntitiesMap.get(rawComponent);
            if (!taggedBucket) {
              taggedBucket = new Set<unknown>();
              taggedEntitiesMap.set(rawComponent, taggedBucket);
            }
            taggedBucket.add(entityInstance);
          } else if (rawComponent && typeof rawComponent === "object") {
            const componentRecord = rawComponent as Record<string, unknown>;
            if (
              componentRecord.type === "pos" &&
              typeof componentRecord.x === "number" &&
              typeof componentRecord.y === "number"
            ) {
              positionCoordinateX = componentRecord.x;
              positionCoordinateY = componentRecord.y;
            } else if (
              componentRecord.type === "opacity" &&
              typeof componentRecord.opacity === "number"
            ) {
              entityOpacity = componentRecord.opacity;
            } else if (componentRecord.type === "z" && typeof componentRecord.z === "number") {
              entityZIndex = componentRecord.z;
            } else if (componentRecord.type === "fixed") {
              isFixedElement = true;
              entityInstance.fixed = true;
            } else if (
              componentRecord.type === "anchor" &&
              typeof componentRecord.anchorPoint === "string"
            ) {
              anchorAlignment = componentRecord.anchorPoint;
            } else if (
              componentRecord.type === "text" &&
              typeof componentRecord.text === "string"
            ) {
              entityTextContent = componentRecord.text;
              textStyleOptionsRecord = (componentRecord.options as Record<string, unknown>) ?? null;
              entityInstance.text = entityTextContent;
            } else if (
              componentRecord.type === "rect" &&
              typeof componentRecord.width === "number" &&
              typeof componentRecord.height === "number"
            ) {
              rectangleWidthValue = componentRecord.width;
              rectangleHeightValue = componentRecord.height;
              if (componentRecord.options && typeof componentRecord.options === "object") {
                const rectangleOptions = componentRecord.options as Record<string, unknown>;
                if (typeof rectangleOptions.radius === "number") {
                  rectangleRadiusValue = rectangleOptions.radius;
                }
              }
            } else if (
              componentRecord.type === "circle" &&
              typeof componentRecord.radius === "number"
            ) {
              circleRadiusValue = componentRecord.radius;
            } else if (
              componentRecord.type === "polygon" &&
              (Array.isArray(componentRecord.pts) || Array.isArray(componentRecord.points))
            ) {
              const sourcePolygonPointsArray = (componentRecord.pts ??
                componentRecord.points) as unknown[];
              polygonPointsCoordinatesList = [];
              for (let index = 0; index < sourcePolygonPointsArray.length; index++) {
                const rawPolygonPoint = sourcePolygonPointsArray[index];
                if (Array.isArray(rawPolygonPoint) && rawPolygonPoint.length >= 2) {
                  polygonPointsCoordinatesList.push({
                    x: Number(rawPolygonPoint[0]),
                    y: Number(rawPolygonPoint[1]),
                  });
                } else if (rawPolygonPoint && typeof rawPolygonPoint === "object") {
                  const vectorPoint = rawPolygonPoint as { x?: number; y?: number };
                  polygonPointsCoordinatesList.push({
                    x: typeof vectorPoint.x === "number" ? vectorPoint.x : 0,
                    y: typeof vectorPoint.y === "number" ? vectorPoint.y : 0,
                  });
                }
              }
            } else if (
              componentRecord.type === "outline" &&
              typeof componentRecord.width === "number"
            ) {
              outlineWidthValue = componentRecord.width;
              const parsedOutlineColor = normalizeRgbColorTuple(componentRecord.color);
              if (parsedOutlineColor) {
                outlineColorValue = parsedOutlineColor;
              }
            } else if (componentRecord.type === "scale") {
              if (typeof componentRecord.scaleX === "number") {
                scaleCoordinateX = componentRecord.scaleX;
              }
              if (typeof componentRecord.scaleY === "number") {
                scaleCoordinateY = componentRecord.scaleY;
              }
            } else if (
              componentRecord.type === "rotate" &&
              typeof componentRecord.angle === "number"
            ) {
              rotationDegreesValue = componentRecord.angle;
            } else if (
              componentRecord.type === "sprite" &&
              typeof componentRecord.sprite === "string"
            ) {
              spriteAssetIdentifier = componentRecord.sprite;
              if (componentRecord.options && typeof componentRecord.options === "object") {
                spriteOptionsRecord = componentRecord.options as Record<string, unknown>;
                if (typeof spriteOptionsRecord.flipX === "boolean") {
                  isFlippedHorizontally = spriteOptionsRecord.flipX;
                }
                if (typeof spriteOptionsRecord.flipY === "boolean") {
                  isFlippedVertically = spriteOptionsRecord.flipY;
                }
              }
            } else if (componentRecord.type === "color" && Array.isArray(componentRecord.args)) {
              const colorArgumentsList = componentRecord.args as unknown[];
              const parsedTupleColor =
                colorArgumentsList.length === 3
                  ? normalizeRgbColorTuple(colorArgumentsList)
                  : normalizeRgbColorTuple(colorArgumentsList[0]);
              if (parsedTupleColor) {
                entityRgbColor = parsedTupleColor;
                hasExplicitColorComponent = true;
              }
            } else if (!("type" in componentRecord)) {
              if (componentRecord.tag && typeof componentRecord.tag === "string") {
                entityTagsSet.add(componentRecord.tag);
                if (primaryEntityTagIdentifier === undefined) {
                  primaryEntityTagIdentifier = componentRecord.tag;
                }
                let taggedBucket = taggedEntitiesMap.get(componentRecord.tag);
                if (!taggedBucket) {
                  taggedBucket = new Set<unknown>();
                  taggedEntitiesMap.set(componentRecord.tag, taggedBucket);
                }
                taggedBucket.add(entityInstance);
              }
              if (
                "onDestroy" in componentRecord &&
                typeof componentRecord.onDestroy === "function"
              ) {
                entityDestroyCallbacksList.push(componentRecord.onDestroy as () => void);
              }
              if ("destroy" in componentRecord && typeof componentRecord.destroy === "function") {
                entityDestroyCallbacksList.push(componentRecord.destroy as () => void);
              }
              const propertiesToAssign = { ...componentRecord };
              delete propertiesToAssign.destroy;
              delete propertiesToAssign.onDestroy;
              Object.assign(entityInstance, propertiesToAssign);
            }
          }
        }

        if (renderEngineInstance.isInitialized) {
          const targetDestinationContainer: IRenderNode = parentEntityVisualNode
            ? parentEntityVisualNode
            : isFixedElement
              ? resolveScreenRenderContainer(renderEngineInstance)
              : resolveWorldRenderContainer(renderEngineInstance);

          const hasCircleShape = circleRadiusValue !== null;
          const hasRectangleShape = rectangleWidthValue !== null && rectangleHeightValue !== null;
          const hasPolygonShape =
            polygonPointsCoordinatesList !== null && polygonPointsCoordinatesList.length >= 3;

          if (hasCircleShape || hasRectangleShape || hasPolygonShape) {
            const shapeKindPrefix = hasCircleShape
              ? "circle"
              : hasRectangleShape
                ? "rect"
                : "polygon";
            const graphicsShapeNode = renderEngineInstance.createGraphics(
              `rendered_${shapeKindPrefix}_${Math.random().toString(36).slice(2, 9)}`
            );
            redrawEntityGraphicsShape(graphicsShapeNode, false);
            graphicsShapeNode.setPosition(positionCoordinateX, positionCoordinateY);
            graphicsShapeNode.setZIndex(entityZIndex);
            graphicsShapeNode.setScale(scaleCoordinateX, scaleCoordinateY);
            if (rotationDegreesValue !== 0) {
              graphicsShapeNode.setRotation((rotationDegreesValue * Math.PI) / 180);
            }
            targetDestinationContainer.addChild(graphicsShapeNode);
            entityVisualNode = graphicsShapeNode;
            entityInstance.renderNode = graphicsShapeNode;
          } else if (spriteAssetIdentifier !== null) {
            try {
              const spriteShapeNode = renderEngineInstance.createSprite(
                spriteAssetIdentifier,
                `rendered_sprite_${Math.random().toString(36).slice(2, 9)}`
              );
              spriteShapeNode.setPosition(positionCoordinateX, positionCoordinateY);
              spriteShapeNode.setZIndex(entityZIndex);
              spriteShapeNode.setOpacity(entityOpacity);
              if (hasExplicitColorComponent && typeof spriteShapeNode.setTint === "function") {
                spriteShapeNode.setTint(entityRgbColor);
              }
              spriteShapeNode.setScale(scaleCoordinateX, scaleCoordinateY);
              if (rotationDegreesValue !== 0) {
                spriteShapeNode.setRotation((rotationDegreesValue * Math.PI) / 180);
              }
              const anchorCoordinates = resolveAnchorCoordinates(anchorAlignment);
              spriteShapeNode.setAnchor(anchorCoordinates.anchorX, anchorCoordinates.anchorY);

              const spriteSheetManager = getSpriteSheetManager();
              const initialAnimationName =
                typeof spriteOptionsRecord?.anim === "string"
                  ? spriteOptionsRecord.anim
                  : undefined;
              spriteAnimationControllerInstance = spriteSheetManager.createAnimationController(
                spriteShapeNode,
                spriteAssetIdentifier,
                initialAnimationName
              );
              if (spriteAnimationControllerInstance) {
                const cancelAnimationUpdate = renderingContext.onUpdate(
                  (deltaTimeInSeconds: number) => {
                    spriteAnimationControllerInstance?.update(deltaTimeInSeconds);
                  }
                );
                sceneCleanupCallbacksList.push(cancelAnimationUpdate.cancel);
              }

              targetDestinationContainer.addChild(spriteShapeNode);
              entityVisualNode = spriteShapeNode;
              entityInstance.renderNode = spriteShapeNode;
              updateEntityNodeScale();
            } catch {
              // Degradação segura caso o sprite ainda não esteja pronto
            }
          } else if (entityTextContent !== null) {
            const calculatedFontSize =
              typeof textStyleOptionsRecord?.size === "number" ? textStyleOptionsRecord.size : 16;
            const calculatedFontFamily =
              typeof textStyleOptionsRecord?.font === "string"
                ? textStyleOptionsRecord.font
                : "Outfit";
            const calculatedWordWrapWidth =
              typeof textStyleOptionsRecord?.width === "number"
                ? textStyleOptionsRecord.width
                : undefined;
            const calculatedLineSpacing =
              typeof textStyleOptionsRecord?.lineSpacing === "number"
                ? textStyleOptionsRecord.lineSpacing
                : undefined;
            const calculatedAlign =
              textStyleOptionsRecord?.align === "center" ||
              textStyleOptionsRecord?.align === "right" ||
              textStyleOptionsRecord?.align === "left"
                ? textStyleOptionsRecord.align
                : anchorAlignment === "center"
                  ? "center"
                  : "left";
            const textShapeNode = renderEngineInstance.createText(
              entityTextContent,
              {
                fontSize: calculatedFontSize,
                fontFamily: calculatedFontFamily,
                color: entityRgbColor,
                align: calculatedAlign,
                ...(calculatedWordWrapWidth !== undefined
                  ? { wordWrapWidth: calculatedWordWrapWidth }
                  : {}),
                ...(calculatedLineSpacing !== undefined
                  ? { lineSpacing: calculatedLineSpacing }
                  : {}),
              },
              `rendered_text_${Math.random().toString(36).slice(2, 9)}`
            );
            textShapeNode.setPosition(positionCoordinateX, positionCoordinateY);
            textShapeNode.setZIndex(entityZIndex);
            textShapeNode.setOpacity(entityOpacity);
            textShapeNode.setScale(scaleCoordinateX, scaleCoordinateY);
            if (rotationDegreesValue !== 0) {
              textShapeNode.setRotation((rotationDegreesValue * Math.PI) / 180);
            }
            const anchorCoordinates = resolveAnchorCoordinates(anchorAlignment);
            if (typeof textShapeNode.setAnchor === "function") {
              textShapeNode.setAnchor(anchorCoordinates.anchorX, anchorCoordinates.anchorY);
            }
            targetDestinationContainer.addChild(textShapeNode);
            entityVisualNode = textShapeNode;
            entityInstance.renderNode = textShapeNode;
          } else {
            // Cria um container PixiJS v8 para hospedar nós filhos ou servir de nó âncora posicional
            const entityChildContainerNode = renderEngineInstance.createContainer(
              `entity_container_${Math.random().toString(36).slice(2, 9)}`
            );
            entityChildContainerNode.setPosition(positionCoordinateX, positionCoordinateY);
            entityChildContainerNode.setZIndex(entityZIndex);
            entityChildContainerNode.setOpacity(entityOpacity);
            entityChildContainerNode.setScale(scaleCoordinateX, scaleCoordinateY);
            if (rotationDegreesValue !== 0) {
              entityChildContainerNode.setRotation((rotationDegreesValue * Math.PI) / 180);
            }
            targetDestinationContainer.addChild(entityChildContainerNode);
            entityVisualNode = entityChildContainerNode;
            entityInstance.renderNode = entityChildContainerNode;
          }
        }

        Object.defineProperty(entityInstance, "opacity", {
          get: () => entityOpacity,
          set: (updatedOpacityValue: number) => {
            entityOpacity = updatedOpacityValue;
            if (entityVisualNode) {
              entityVisualNode.setOpacity(updatedOpacityValue);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "text", {
          get: () => entityTextContent ?? "",
          set: (updatedTextValue: string) => {
            entityTextContent = updatedTextValue;
            if (entityVisualNode && "setText" in entityVisualNode) {
              (entityVisualNode as ITextNode).setText(updatedTextValue);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "width", {
          get: () => rectangleWidthValue ?? 0,
          set: (updatedWidthValue: number) => {
            rectangleWidthValue = updatedWidthValue;
            if (
              entityVisualNode &&
              "drawRect" in entityVisualNode &&
              rectangleHeightValue !== null
            ) {
              redrawEntityGraphicsShape(entityVisualNode as IGraphicsNode, true);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "radius", {
          get: () => circleRadiusValue ?? 0,
          set: (updatedRadiusValue: number) => {
            circleRadiusValue = updatedRadiusValue;
            if (entityVisualNode && "drawCircle" in entityVisualNode) {
              redrawEntityGraphicsShape(entityVisualNode as IGraphicsNode, true);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "pts", {
          get: () => polygonPointsCoordinatesList ?? undefined,
          set: (updatedPolygonPointsList: Array<{ x: number; y: number }>) => {
            polygonPointsCoordinatesList = updatedPolygonPointsList;
            if (
              entityVisualNode &&
              "drawPolygon" in entityVisualNode &&
              typeof (entityVisualNode as IGraphicsNode).drawPolygon === "function" &&
              updatedPolygonPointsList &&
              updatedPolygonPointsList.length >= 3
            ) {
              redrawEntityGraphicsShape(entityVisualNode as IGraphicsNode, true);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "points", {
          get: () => polygonPointsCoordinatesList ?? undefined,
          set: (updatedPolygonPointsList: Array<{ x: number; y: number }>) => {
            entityInstance.pts = updatedPolygonPointsList;
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "frame", {
          get: () => spriteAnimationControllerInstance?.getFrame() ?? 0,
          set: (updatedFrameIndex: number) => {
            spriteAnimationControllerInstance?.setFrame(updatedFrameIndex);
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "pos", {
          get: () => entityPositionBindingInstance,
          set: (incomingPositionValue: unknown) => {
            if (incomingPositionValue && typeof incomingPositionValue === "object") {
              const vectorRecord = incomingPositionValue as { x?: unknown; y?: unknown };
              const updatedX =
                typeof vectorRecord.x === "number" ? vectorRecord.x : positionCoordinateX;
              const updatedY =
                typeof vectorRecord.y === "number" ? vectorRecord.y : positionCoordinateY;
              positionCoordinateX = updatedX;
              positionCoordinateY = updatedY;
              entityVisualNode?.setPosition(positionCoordinateX, positionCoordinateY);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "hidden", {
          get: () => isEntityHidden,
          set: (shouldHideEntity: boolean) => {
            isEntityHidden = Boolean(shouldHideEntity);
            entityVisualNode?.setVisible(!isEntityHidden);
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "flipX", {
          get: () => isFlippedHorizontally,
          set: (shouldFlipHorizontally: boolean) => {
            isFlippedHorizontally = Boolean(shouldFlipHorizontally);
            updateEntityNodeScale();
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "flipY", {
          get: () => isFlippedVertically,
          set: (shouldFlipVertically: boolean) => {
            isFlippedVertically = Boolean(shouldFlipVertically);
            updateEntityNodeScale();
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "z", {
          get: () => entityZIndex,
          set: (updatedZIndex: number) => {
            entityZIndex = updatedZIndex;
            entityVisualNode?.setZIndex(updatedZIndex);
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "fixed", {
          get: () => isFixedElement,
          set: (shouldBeFixedToScreen: boolean) => {
            const normalizedFixedFlag = Boolean(shouldBeFixedToScreen);
            if (isFixedElement === normalizedFixedFlag) {
              return;
            }
            isFixedElement = normalizedFixedFlag;
            if (entityVisualNode && renderEngineInstance.isInitialized && !parentEntityVisualNode) {
              const currentContainer = normalizedFixedFlag
                ? renderEngineInstance.getWorldContainer()
                : renderEngineInstance.getScreenContainer();
              const targetContainer = normalizedFixedFlag
                ? renderEngineInstance.getScreenContainer()
                : renderEngineInstance.getWorldContainer();
              try {
                currentContainer.removeChild(entityVisualNode);
              } catch {
                // Nó pode já não estar no container anterior
              }
              targetContainer.addChild(entityVisualNode);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "renderNode", {
          get: () => entityVisualNode,
          set: (updatedVisualNode: IRenderNode | null) => {
            entityVisualNode = updatedVisualNode;
            if (entityVisualNode) {
              updateEntityNodeScale();
            }
          },
          configurable: true,
          enumerable: true,
        });

        const scaleCoordinateProxy = {
          get x() {
            return scaleCoordinateX;
          },
          set x(updatedScaleX: number) {
            scaleCoordinateX = updatedScaleX;
            updateEntityNodeScale();
          },
          get y() {
            return scaleCoordinateY;
          },
          set y(updatedScaleY: number) {
            scaleCoordinateY = updatedScaleY;
            updateEntityNodeScale();
          },
        };

        Object.defineProperty(entityInstance, "scale", {
          get: () => scaleCoordinateProxy,
          set: (updatedScaleValue: number | { x?: number; y?: number }) => {
            if (typeof updatedScaleValue === "number") {
              scaleCoordinateX = updatedScaleValue;
              scaleCoordinateY = updatedScaleValue;
            } else if (updatedScaleValue && typeof updatedScaleValue === "object") {
              if (typeof updatedScaleValue.x === "number") {
                scaleCoordinateX = updatedScaleValue.x;
              }
              if (typeof updatedScaleValue.y === "number") {
                scaleCoordinateY = updatedScaleValue.y;
              }
            }
            updateEntityNodeScale();
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "vel", {
          get: () => velocityVectorInstance,
          set: (incomingVelocityValue: unknown) => {
            if (incomingVelocityValue && typeof incomingVelocityValue === "object") {
              const vectorRecord = incomingVelocityValue as { x?: unknown; y?: unknown };
              const vx = typeof vectorRecord.x === "number" ? vectorRecord.x : 0;
              const vy = typeof vectorRecord.y === "number" ? vectorRecord.y : 0;
              velocityVectorInstance.x = vx;
              velocityVectorInstance.y = vy;
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "angle", {
          get: () => rotationDegreesValue,
          set: (updatedAngleInDegrees: number) => {
            rotationDegreesValue = updatedAngleInDegrees;
            if (entityVisualNode) {
              entityVisualNode.setRotation((updatedAngleInDegrees * Math.PI) / 180);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "color", {
          get: () => entityRgbColor,
          set: (updatedColorValue: unknown) => {
            const normalizedColor = normalizeRgbColorTuple(updatedColorValue);
            if (!normalizedColor) {
              return;
            }
            entityRgbColor = normalizedColor;
            hasExplicitColorComponent = true;
            if (!entityVisualNode) {
              return;
            }
            if ("setColor" in entityVisualNode) {
              (entityVisualNode as ITextNode).setColor(entityRgbColor);
            } else if (
              "setTint" in entityVisualNode &&
              typeof (entityVisualNode as ISpriteNode).setTint === "function"
            ) {
              (entityVisualNode as ISpriteNode).setTint(entityRgbColor);
            } else if (isGraphicsRenderNode(entityVisualNode)) {
              redrawEntityGraphicsShape(entityVisualNode, true);
            }
          },
          configurable: true,
          enumerable: true,
        });

        Object.defineProperty(entityInstance, "outline", {
          get: () => ({
            width: outlineWidthValue ?? 0,
            color: outlineColorValue,
          }),
          set: (updatedOutlineValue: unknown) => {
            if (updatedOutlineValue && typeof updatedOutlineValue === "object") {
              const outlineRecord = updatedOutlineValue as { width?: unknown; color?: unknown };
              if (typeof outlineRecord.width === "number") {
                outlineWidthValue = outlineRecord.width;
              }
              const parsedOutlineColor = normalizeRgbColorTuple(outlineRecord.color);
              if (parsedOutlineColor) {
                outlineColorValue = parsedOutlineColor;
              }
              if (entityVisualNode && isGraphicsRenderNode(entityVisualNode)) {
                redrawEntityGraphicsShape(entityVisualNode, true);
              }
            }
          },
          configurable: true,
          enumerable: true,
        });

        let universalTaggedBucket = taggedEntitiesMap.get("*");
        if (!universalTaggedBucket) {
          universalTaggedBucket = new Set<unknown>();
          taggedEntitiesMap.set("*", universalTaggedBucket);
        }
        universalTaggedBucket.add(entityInstance);

        if (entityVisualNode && !parentEntityVisualNode) {
          sceneCleanupCallbacksList.push(() => {
            if (entityVisualNode) {
              entityVisualNode.destroy();
              entityVisualNode = null;
            }
          });
        }

        return entityInstance;
      };

      return buildRenderingContextEntity(componentsListOrDescriber, null);
    },

    destroy(targetEntity: unknown): void {
      if (targetEntity && typeof targetEntity === "object" && "destroy" in targetEntity) {
        const destroyAction = (targetEntity as { destroy?: () => void }).destroy;
        if (typeof destroyAction === "function") {
          destroyAction.call(targetEntity);
        }
      }
      for (const taggedSet of taggedEntitiesMap.values()) {
        taggedSet.delete(targetEntity);
      }
    },

    tween(
      fromValue: number,
      toValue: number,
      durationInSeconds: number,
      valueSetter: (interpolatedValue: number) => void,
      easingMethod?: unknown
    ): { then(resolvedCallback: () => void): void } {
      const activeEasingFunction =
        typeof easingMethod === "function" ? (easingMethod as EasingFunction) : Easings.easeOutQuad;
      const renderTicker = renderEngineInstance.isInitialized
        ? renderEngineInstance.getTicker()
        : undefined;
      const tweenHandle = createTween(
        fromValue,
        toValue,
        durationInSeconds,
        valueSetter,
        activeEasingFunction,
        renderTicker
      );
      sceneCleanupCallbacksList.push(() => tweenHandle.cancel());
      return {
        then(resolvedCallback: () => void) {
          void tweenHandle.promise.then(resolvedCallback);
        },
      };
    },

    onSceneLeave(leaveCallback: () => void): { cancel: () => void } {
      sceneLeaveCallbacksList.push(leaveCallback);
      return {
        cancel: () => {
          const targetIndex = sceneLeaveCallbacksList.indexOf(leaveCallback);
          if (targetIndex !== -1) {
            sceneLeaveCallbacksList.splice(targetIndex, 1);
          }
        },
      };
    },

    onKeyPress(
      keyOrExecutionCallback: string | (() => void),
      maybeKeyCallback?: () => void
    ): { cancel: () => void } {
      if (typeof window === "undefined") {
        return { cancel: () => {} };
      }
      const keyboardPressEventHandler = (keyboardEvent: KeyboardEvent): void => {
        if (keyboardEvent.repeat) {
          return;
        }
        if (typeof keyOrExecutionCallback === "function") {
          keyOrExecutionCallback();
          return;
        }
        const normalizedTargetVariants = normalizeKeyIdentifier(keyOrExecutionCallback);
        const eventKeyVariants = [
          ...normalizeKeyIdentifier(keyboardEvent.key),
          ...normalizeKeyIdentifier(keyboardEvent.code),
        ];
        const hasMatchingKey = normalizedTargetVariants.some((targetVariant) =>
          eventKeyVariants.includes(targetVariant)
        );
        if (hasMatchingKey) {
          maybeKeyCallback?.();
        }
      };
      window.addEventListener("keydown", keyboardPressEventHandler);
      const cancelKeyboardListener = (): void => {
        window.removeEventListener("keydown", keyboardPressEventHandler);
      };
      sceneCleanupCallbacksList.push(cancelKeyboardListener);
      return { cancel: cancelKeyboardListener };
    },

    onKeyDown(
      keyOrExecutionCallback: string | (() => void),
      maybeKeyCallback?: () => void
    ): { cancel: () => void } {
      if (typeof window === "undefined") {
        return { cancel: () => {} };
      }
      const keyboardDownEventHandler = (keyboardEvent: KeyboardEvent): void => {
        if (typeof keyOrExecutionCallback === "function") {
          keyOrExecutionCallback();
          return;
        }
        const normalizedTargetVariants = normalizeKeyIdentifier(keyOrExecutionCallback);
        const eventKeyVariants = [
          ...normalizeKeyIdentifier(keyboardEvent.key),
          ...normalizeKeyIdentifier(keyboardEvent.code),
        ];
        const hasMatchingKey = normalizedTargetVariants.some((targetVariant) =>
          eventKeyVariants.includes(targetVariant)
        );
        if (hasMatchingKey) {
          maybeKeyCallback?.();
        }
      };
      window.addEventListener("keydown", keyboardDownEventHandler);
      const cancelKeyboardListener = (): void => {
        window.removeEventListener("keydown", keyboardDownEventHandler);
      };
      sceneCleanupCallbacksList.push(cancelKeyboardListener);
      return { cancel: cancelKeyboardListener };
    },

    onKeyRelease(
      keyOrExecutionCallback: string | (() => void),
      maybeKeyCallback?: () => void
    ): { cancel: () => void } {
      if (typeof window === "undefined") {
        return { cancel: () => {} };
      }
      const keyboardReleaseEventHandler = (keyboardEvent: KeyboardEvent): void => {
        if (typeof keyOrExecutionCallback === "function") {
          keyOrExecutionCallback();
          return;
        }
        const normalizedTargetVariants = normalizeKeyIdentifier(keyOrExecutionCallback);
        const eventKeyVariants = [
          ...normalizeKeyIdentifier(keyboardEvent.key),
          ...normalizeKeyIdentifier(keyboardEvent.code),
        ];
        const hasMatchingKey = normalizedTargetVariants.some((targetVariant) =>
          eventKeyVariants.includes(targetVariant)
        );
        if (hasMatchingKey) {
          maybeKeyCallback?.();
        }
      };
      window.addEventListener("keyup", keyboardReleaseEventHandler);
      const cancelKeyboardListener = (): void => {
        window.removeEventListener("keyup", keyboardReleaseEventHandler);
      };
      sceneCleanupCallbacksList.push(cancelKeyboardListener);
      return { cancel: cancelKeyboardListener };
    },

    onMousePress(pointerPressCallback: () => void): { cancel: () => void } {
      if (typeof window === "undefined") {
        return { cancel: () => {} };
      }
      const pointerEventHandler = (): void => {
        pointerPressCallback();
      };
      window.addEventListener("pointerdown", pointerEventHandler);
      const cancelPointerListener = (): void => {
        window.removeEventListener("pointerdown", pointerEventHandler);
      };
      sceneCleanupCallbacksList.push(cancelPointerListener);
      return { cancel: cancelPointerListener };
    },

    onClick(clickCallback: () => void): { cancel: () => void } {
      return renderingContext.onMousePress(clickCallback);
    },

    isMousePressed(): boolean {
      const activeInputStateManager = getInputStateManager();
      if (activeInputStateManager) {
        return (
          activeInputStateManager.getState().strokePressed ||
          activeInputStateManager.getState().anyInteractionPressed ||
          activeInputStateManager.isPointerPressed()
        );
      }
      return false;
    },

    isMouseDown(): boolean {
      const activeInputStateManager = getInputStateManager();
      if (activeInputStateManager) {
        return (
          activeInputStateManager.getState().strokeDown ||
          activeInputStateManager.isPointerPressed()
        );
      }
      return false;
    },

    mousePos(): { readonly x: number; readonly y: number } {
      const activeInputStateManager = getInputStateManager();
      const rawPointerPosition = activeInputStateManager
        ? activeInputStateManager.getPointerPosition()
        : { x: 0, y: 0 };
      const canvasElement = renderEngineInstance.getCanvas();
      if (canvasElement && typeof canvasElement.getBoundingClientRect === "function") {
        const canvasBoundingRectangle = canvasElement.getBoundingClientRect();
        return {
          x: rawPointerPosition.x - canvasBoundingRectangle.left,
          y: rawPointerPosition.y - canvasBoundingRectangle.top,
        };
      }
      return rawPointerPosition;
    },

    isKeyDown(keyIdentifier: string): boolean {
      const activeInputStateManager = getInputStateManager();
      return activeInputStateManager ? activeInputStateManager.isKeyDown(keyIdentifier) : false;
    },

    isKeyPressed(keyIdentifier?: string): boolean {
      const activeInputStateManager = getInputStateManager();
      if (!activeInputStateManager) {
        return false;
      }
      if (typeof keyIdentifier === "string") {
        return activeInputStateManager.isKeyPressed(keyIdentifier);
      }
      return activeInputStateManager.getState().anyInteractionPressed;
    },

    isKeyReleased(keyIdentifier?: string): boolean {
      const activeInputStateManager = getInputStateManager();
      if (!activeInputStateManager) {
        return false;
      }
      if (typeof keyIdentifier === "string") {
        return activeInputStateManager.isKeyReleased(keyIdentifier);
      }
      return false;
    },

    onUpdate(updateCallback: (deltaTimeInSeconds: number) => void): { cancel: () => void } {
      if (typeof updateCallback !== "function") {
        return { cancel: () => {} };
      }
      const loopUpdateHandler = (deltaTimeInSeconds: number): void => {
        updateCallback(deltaTimeInSeconds);
      };
      sceneUpdateCallbacksList.push(loopUpdateHandler);
      const cancelUpdateListener = (): void => {
        const targetIndex = sceneUpdateCallbacksList.indexOf(loopUpdateHandler);
        if (targetIndex !== -1) {
          sceneUpdateCallbacksList.splice(targetIndex, 1);
        }
      };
      sceneCleanupCallbacksList.push(cancelUpdateListener);
      return { cancel: cancelUpdateListener };
    },

    wait(durationInSeconds: number, timerCompletionCallback: () => void): { cancel: () => void } {
      const timeoutIdentifier = setTimeout(
        timerCompletionCallback,
        Math.max(0, durationInSeconds * 1000)
      );
      const cancelTimeout = (): void => {
        clearTimeout(timeoutIdentifier);
      };
      sceneCleanupCallbacksList.push(cancelTimeout);
      return { cancel: cancelTimeout };
    },

    camPos(
      cameraPositionOrCoordinateX?: number | { readonly x: number; readonly y: number },
      cameraCoordinateY?: number
    ): { readonly x: number; readonly y: number } {
      if (typeof cameraPositionOrCoordinateX === "number") {
        const currentCameraPosition =
          typeof renderEngineInstance.getCameraPosition === "function"
            ? renderEngineInstance.getCameraPosition()
            : { x: 0, y: 0 };
        const targetCoordinateY = cameraCoordinateY ?? currentCameraPosition.y;
        return updateCameraViewportPosition(
          renderEngineInstance,
          cameraPositionOrCoordinateX,
          targetCoordinateY
        );
      } else if (cameraPositionOrCoordinateX && typeof cameraPositionOrCoordinateX === "object") {
        return updateCameraViewportPosition(
          renderEngineInstance,
          cameraPositionOrCoordinateX.x,
          cameraPositionOrCoordinateX.y
        );
      }
      return typeof renderEngineInstance.getCameraPosition === "function"
        ? renderEngineInstance.getCameraPosition()
        : { x: 0, y: 0 };
    },

    updateCameraViewportPosition(
      cameraPositionCoordinateX: number,
      cameraPositionCoordinateY: number
    ): { readonly x: number; readonly y: number } {
      return updateCameraViewportPosition(
        renderEngineInstance,
        cameraPositionCoordinateX,
        cameraPositionCoordinateY
      );
    },

    synchronizePlayerCameraTracking(
      playerCoordinateX: number,
      playerCoordinateY?: number,
      smoothingFactor: number = 0.05
    ): { readonly x: number; readonly y: number } {
      return synchronizePlayerCameraTracking(
        renderingContext,
        playerCoordinateX,
        playerCoordinateY,
        smoothingFactor
      );
    },

    camScale(_scaleFactor: number | { readonly x: number; readonly y: number }): void {
      // O zoom da câmera no PixiJS v8 é gerenciado nativamente pelo worldContainer
    },

    get(tagIdentifier: string): unknown[] {
      const taggedBucket = taggedEntitiesMap.get(tagIdentifier);
      return taggedBucket ? Array.from(taggedBucket) : [];
    },

    onCollide(
      firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
      secondTagOrCollisionHandler?:
        string | ((firstEntity: unknown, secondEntity: unknown) => void),
      maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
    ): { cancel: () => void } {
      return registerGlobalCollisionListener(
        globalCollisionListenersList,
        firstTagOrCollisionHandler,
        secondTagOrCollisionHandler,
        maybeCollisionHandler
      );
    },

    onCollideUpdate(
      firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
      secondTagOrCollisionHandler?:
        string | ((firstEntity: unknown, secondEntity: unknown) => void),
      maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
    ): { cancel: () => void } {
      return registerGlobalCollisionListener(
        globalCollisionUpdateListenersList,
        firstTagOrCollisionHandler,
        secondTagOrCollisionHandler,
        maybeCollisionHandler
      );
    },

    onCollideEnd(
      firstTagOrCollisionHandler: string | ((firstEntity: unknown, secondEntity?: unknown) => void),
      secondTagOrCollisionHandler?:
        string | ((firstEntity: unknown, secondEntity: unknown) => void),
      maybeCollisionHandler?: (firstEntity: unknown, secondEntity: unknown) => void
    ): { cancel: () => void } {
      return registerGlobalCollisionListener(
        globalCollisionEndListenersList,
        firstTagOrCollisionHandler,
        secondTagOrCollisionHandler,
        maybeCollisionHandler
      );
    },

    triggerCollision(
      firstEntity: unknown,
      secondEntity: unknown,
      firstEntityTag?: string,
      secondEntityTag?: string
    ): void {
      dispatchGlobalCollisionEvent(
        globalCollisionListenersList,
        firstEntity,
        secondEntity,
        firstEntityTag,
        secondEntityTag
      );
    },

    triggerCollisionUpdate(
      firstEntity: unknown,
      secondEntity: unknown,
      firstEntityTag?: string,
      secondEntityTag?: string
    ): void {
      dispatchGlobalCollisionEvent(
        globalCollisionUpdateListenersList,
        firstEntity,
        secondEntity,
        firstEntityTag,
        secondEntityTag
      );
    },

    triggerCollisionEnd(
      firstEntity: unknown,
      secondEntity: unknown,
      firstEntityTag?: string,
      secondEntityTag?: string
    ): void {
      dispatchGlobalCollisionEvent(
        globalCollisionEndListenersList,
        firstEntity,
        secondEntity,
        firstEntityTag,
        secondEntityTag
      );
    },

    setFullscreen(fullscreenEnabled: boolean): void {
      if (fullscreenEnabled) {
        void requestDocumentFullscreen();
      } else {
        void exitDocumentFullscreen();
      }
    },

    isFullscreen(): boolean {
      return isDocumentFullscreen();
    },
  };

  return renderingContext;
}

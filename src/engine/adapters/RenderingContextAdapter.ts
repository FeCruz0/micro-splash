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
  IGraphicsNode,
  ITextNode,
  IScene,
  ISceneManager,
} from "../contracts/INTERFACE_CONTRACTS";
import { createTween, Easings, type EasingFunction } from "../utils/Tween";
import { getScreenLayerGeometryChecker } from "../screenLayerGeometryChecker";
import { getSpriteSheetManager, type SpriteAnimationController } from "./SpriteSheetManager";
import {
  requestDocumentFullscreen,
  exitDocumentFullscreen,
  isDocumentFullscreen,
} from "../../systems/fullscreenHandler";

/**
 * Ciclo de vida do contexto de renderização exposto às cenas: executa os callbacks registrados via
 * onUpdate no contexto e libera listeners, tweens, timers e nós visuais ao sair da cena.
 */
export interface RenderingContextLifecycle {
  runSceneUpdateCallbacks(deltaTimeInSeconds: number): void;
  flushSceneResources(): void;
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
  pos: { x: number; y: number };
  scale: { x: number; y: number };
  opacity: number;
  z: number;
  hidden: boolean;
  fixed: boolean;
  text?: string;
  width?: number;
  height?: number;
  radius?: number;
  frame?: number;
  angle?: number;
  color?: unknown;
  outline?: { color?: unknown; width?: number };
  renderNode?: IRenderNode | null;
  tag?: string;
  is?(tagToCheck: string): boolean;
  readonly children?: readonly RenderingContextEntity[];
  add(childComponentOrDescriber: unknown[] | unknown): RenderingContextEntity;
  exists(): boolean;
  onUpdate(entityUpdateHandler: (deltaTimeInSeconds?: number) => void): { cancel: () => void };
  onDestroy(entityDestroyHandler: () => void): { cancel: () => void };
  onCollide(
    targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
    maybeCollisionHandler?: (collidedEntity: unknown) => void
  ): { cancel: () => void };
  onCollideUpdate?(
    targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
    maybeCollisionHandler?: (collidedEntity: unknown) => void
  ): { cancel: () => void };
  onCollideEnd?(
    targetTagOrCollisionHandler: string | ((collidedEntity: unknown) => void),
    maybeCollisionHandler?: (collidedEntity: unknown) => void
  ): { cancel: () => void };
  triggerCollision?(collidedEntity: unknown, collidedEntityTag?: string): void;
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

  rand(minimumValue?: number, maximumValue?: number): number;
  choose<T>(choicesList: readonly T[]): T;
  clamp(valueToClamp: number, minimumBound: number, maximumBound: number): number;
  lerp(startValue: number, endValue: number, interpolationProgress: number): number;
  deg2rad(degreesValue: number): number;
  rad2deg(radiansValue: number): number;

  vec2(coordinateX: number, coordinateY: number): { readonly x: number; readonly y: number };
  rgb(redValue: number, greenValue: number, blueValue: number): readonly [number, number, number];
  shake(intensity: number): void;

  circle(circleRadius: number): { readonly type: "circle"; readonly radius: number };
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
  onMousePress(pointerPressCallback: () => void): { cancel: () => void };
  onClick(clickCallback: () => void): { cancel: () => void };
  isMousePressed(): boolean;
  onUpdate(updateCallback: (deltaTimeInSeconds: number) => void): { cancel: () => void };
  wait(durationInSeconds: number, timerCompletionCallback: () => void): { cancel: () => void };

  camPos(
    cameraPositionOrCoordinateX?: number | { readonly x: number; readonly y: number },
    cameraCoordinateY?: number
  ): { readonly x: number; readonly y: number };
  camScale?(scaleFactor: number | { readonly x: number; readonly y: number }): void;

  get(tagIdentifier: string): unknown[];
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
  const sceneLeaveCallbacksList: Array<() => void> = [];
  const sceneCleanupCallbacksList: Array<() => void> = [];
  const sceneUpdateCallbacksList: Array<(deltaTimeInSeconds: number) => void> = [];
  const taggedEntitiesMap = new Map<string, Set<unknown>>();
  let mousePressedState = false;

  if (typeof window !== "undefined") {
    window.addEventListener("pointerdown", () => {
      mousePressedState = true;
    });
    window.addEventListener("pointerup", () => {
      mousePressedState = false;
    });
  }

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
    taggedEntitiesMap.clear();
  };

  const runActiveSceneUpdateCallbacks = (deltaTimeInSeconds: number): void => {
    const updateCallbacksSnapshot = sceneUpdateCallbacksList.slice();
    for (let index = 0; index < updateCallbacksSnapshot.length; index++) {
      try {
        updateCallbacksSnapshot[index](deltaTimeInSeconds);
      } catch (error) {
        console.error("[RenderingContext] Erro em callback de update da cena ativa:", error);
      }
    }
  };

  const renderContextLifecycle: RenderingContextLifecycle = {
    runSceneUpdateCallbacks: runActiveSceneUpdateCallbacks,
    flushSceneResources: flushActiveSceneResources,
  };

  const renderingContext: RenderingContext = {
    renderEngine: renderEngineInstance,
    sceneManager: sceneManagerInstance,
    lifecycle: renderContextLifecycle,
    debug: { paused: false },
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
      return renderEngineInstance.isInitialized
        ? renderEngineInstance.getTicker().getDeltaTime()
        : 0.0166;
    },

    time(): number {
      return (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
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

    vec2(coordinateX: number, coordinateY: number): { readonly x: number; readonly y: number } {
      return { x: coordinateX, y: coordinateY };
    },

    rgb(
      redValue: number,
      greenValue: number,
      blueValue: number
    ): readonly [number, number, number] {
      return [redValue, greenValue, blueValue] as const;
    },

    shake(intensity: number): void {
      renderEngineInstance.shake?.(intensity);
    },

    circle(circleRadius: number): { readonly type: "circle"; readonly radius: number } {
      return { type: "circle", radius: circleRadius };
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
        let spriteAssetIdentifier: string | null = null;
        let spriteOptionsRecord: Record<string, unknown> | null = null;
        let spriteAnimationControllerInstance: SpriteAnimationController | null = null;
        let outlineWidthValue: number | null = null;
        let outlineColorValue: [number, number, number] = [255, 255, 255];
        let entityRgbColor: [number, number, number] = [255, 255, 255];
        let scaleCoordinateX = 1;
        let scaleCoordinateY = 1;
        let rotationDegreesValue = 0;
        let entityVisualNode: IRenderNode | null = null;

        let isEntityDestroyed = false;
        const entityDestroyCallbacksList: Array<() => void> = [];
        const entityActiveUpdateListenersList: Array<() => void> = [];
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

        const entityInstance: RenderingContextEntity = {
          pos: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          opacity: 1,
          z: 0,
          hidden: false,
          fixed: false,
          exists: () => !isEntityDestroyed,
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
          is: (tagToCheck: string): boolean => entityTagsSet.has(tagToCheck),
          onClick: (clickCallback: () => void) => {
            if (isFixedElement && rectangleWidthValue !== null && rectangleHeightValue !== null) {
              const activeScreenChecker =
                renderEngineInstance.isInitialized &&
                typeof renderEngineInstance.getScreenLayerGeometryChecker === "function"
                  ? (renderEngineInstance.getScreenLayerGeometryChecker() as ReturnType<
                      typeof getScreenLayerGeometryChecker
                    >)
                  : getScreenLayerGeometryChecker();

              const buttonTargetWidth = rectangleWidthValue;
              const buttonTargetHeight = rectangleHeightValue;
              const originOffsets = calculateOriginOffset(
                anchorAlignment,
                buttonTargetWidth,
                buttonTargetHeight
              );
              const cancelHitTargetRegistration = activeScreenChecker.registerHitTarget({
                id: `screen_button_${Math.random().toString(36).slice(2, 9)}`,
                bounds: () => ({
                  x: positionCoordinateX + originOffsets.originX,
                  y: positionCoordinateY + originOffsets.originY,
                  width: buttonTargetWidth,
                  height: buttonTargetHeight,
                }),
                zIndex: entityZIndex,
                onClick: () => clickCallback(),
              });
              sceneCleanupCallbacksList.push(cancelHitTargetRegistration);
              return { cancel: cancelHitTargetRegistration };
            }
            return renderingContext.onMousePress(clickCallback);
          },
          onHoverUpdate: () => ({ cancel: () => {} }),
          onHoverEnd: () => ({ cancel: () => {} }),
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
              componentRecord.type === "outline" &&
              typeof componentRecord.width === "number"
            ) {
              outlineWidthValue = componentRecord.width;
              if (Array.isArray(componentRecord.color) && componentRecord.color.length === 3) {
                outlineColorValue = componentRecord.color as [number, number, number];
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
              }
            } else if (componentRecord.type === "color" && Array.isArray(componentRecord.args)) {
              const colorArgumentsList = componentRecord.args as unknown[];
              if (colorArgumentsList.length === 3 && typeof colorArgumentsList[0] === "number") {
                entityRgbColor = [
                  colorArgumentsList[0],
                  colorArgumentsList[1] as number,
                  colorArgumentsList[2] as number,
                ];
              } else if (colorArgumentsList.length === 1 && Array.isArray(colorArgumentsList[0])) {
                entityRgbColor = colorArgumentsList[0] as [number, number, number];
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
              ? renderEngineInstance.getScreenContainer()
              : renderEngineInstance.getWorldContainer();

          const graphicStyle = {
            fill: { color: entityRgbColor, alpha: entityOpacity },
            ...(outlineWidthValue !== null
              ? { stroke: { width: outlineWidthValue, color: outlineColorValue } }
              : {}),
          };

          if (circleRadiusValue !== null) {
            const circleShapeNode = renderEngineInstance.createGraphics(
              `rendered_circle_${Math.random().toString(36).slice(2, 9)}`
            );
            circleShapeNode.drawCircle(0, 0, circleRadiusValue, graphicStyle);
            circleShapeNode.setPosition(positionCoordinateX, positionCoordinateY);
            circleShapeNode.setZIndex(entityZIndex);
            circleShapeNode.setScale(scaleCoordinateX, scaleCoordinateY);
            if (rotationDegreesValue !== 0) {
              circleShapeNode.setRotation((rotationDegreesValue * Math.PI) / 180);
            }
            targetDestinationContainer.addChild(circleShapeNode);
            entityVisualNode = circleShapeNode;
            entityInstance.renderNode = circleShapeNode;
          } else if (rectangleWidthValue !== null && rectangleHeightValue !== null) {
            const rectangleShapeNode = renderEngineInstance.createGraphics(
              `rendered_rect_${Math.random().toString(36).slice(2, 9)}`
            );
            const originOffsets = calculateOriginOffset(
              anchorAlignment,
              rectangleWidthValue,
              rectangleHeightValue
            );
            const originCoordinateX = originOffsets.originX;
            const originCoordinateY = originOffsets.originY;

            if (typeof rectangleRadiusValue === "number" && rectangleRadiusValue > 0) {
              rectangleShapeNode.drawRoundedRect(
                originCoordinateX,
                originCoordinateY,
                rectangleWidthValue,
                rectangleHeightValue,
                rectangleRadiusValue,
                graphicStyle
              );
            } else {
              rectangleShapeNode.drawRect(
                originCoordinateX,
                originCoordinateY,
                rectangleWidthValue,
                rectangleHeightValue,
                graphicStyle
              );
            }
            rectangleShapeNode.setPosition(positionCoordinateX, positionCoordinateY);
            rectangleShapeNode.setZIndex(entityZIndex);
            rectangleShapeNode.setScale(scaleCoordinateX, scaleCoordinateY);
            if (rotationDegreesValue !== 0) {
              rectangleShapeNode.setRotation((rotationDegreesValue * Math.PI) / 180);
            }
            targetDestinationContainer.addChild(rectangleShapeNode);
            entityVisualNode = rectangleShapeNode;
            entityInstance.renderNode = rectangleShapeNode;
          } else if (spriteAssetIdentifier !== null) {
            try {
              const spriteShapeNode = renderEngineInstance.createSprite(
                spriteAssetIdentifier,
                `rendered_sprite_${Math.random().toString(36).slice(2, 9)}`
              );
              spriteShapeNode.setPosition(positionCoordinateX, positionCoordinateY);
              spriteShapeNode.setZIndex(entityZIndex);
              spriteShapeNode.setOpacity(entityOpacity);
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
            const textShapeNode = renderEngineInstance.createText(
              entityTextContent,
              {
                fontSize: calculatedFontSize,
                fontFamily: calculatedFontFamily,
                color: entityRgbColor,
                ...(anchorAlignment === "center" ? { align: "center" } : {}),
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
              const graphicsNodeInstance = entityVisualNode as IGraphicsNode;
              graphicsNodeInstance.clear();
              const originOffsets = calculateOriginOffset(
                anchorAlignment,
                updatedWidthValue,
                rectangleHeightValue
              );
              const originCoordinateX = originOffsets.originX;
              const originCoordinateY = originOffsets.originY;
              const graphicStyle = {
                fill: { color: entityRgbColor, alpha: entityOpacity },
                ...(outlineWidthValue !== null
                  ? { stroke: { width: outlineWidthValue, color: outlineColorValue } }
                  : {}),
              };
              if (typeof rectangleRadiusValue === "number" && rectangleRadiusValue > 0) {
                graphicsNodeInstance.drawRoundedRect(
                  originCoordinateX,
                  originCoordinateY,
                  Math.max(0, updatedWidthValue),
                  rectangleHeightValue,
                  rectangleRadiusValue,
                  graphicStyle
                );
              } else {
                graphicsNodeInstance.drawRect(
                  originCoordinateX,
                  originCoordinateY,
                  Math.max(0, updatedWidthValue),
                  rectangleHeightValue,
                  graphicStyle
                );
              }
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
              const graphicsNodeInstance = entityVisualNode as IGraphicsNode;
              graphicsNodeInstance.clear();
              const graphicStyle = {
                fill: { color: entityRgbColor, alpha: entityOpacity },
                ...(outlineWidthValue !== null
                  ? { stroke: { width: outlineWidthValue, color: outlineColorValue } }
                  : {}),
              };
              graphicsNodeInstance.drawCircle(0, 0, Math.max(0, updatedRadiusValue), graphicStyle);
            }
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

        const positionCoordinateProxy = {
          get x() {
            return positionCoordinateX;
          },
          set x(updatedCoordinateX: number) {
            positionCoordinateX = updatedCoordinateX;
            if (entityVisualNode) {
              entityVisualNode.setPosition(positionCoordinateX, positionCoordinateY);
            }
          },
          get y() {
            return positionCoordinateY;
          },
          set y(updatedCoordinateY: number) {
            positionCoordinateY = updatedCoordinateY;
            if (entityVisualNode) {
              entityVisualNode.setPosition(positionCoordinateX, positionCoordinateY);
            }
          },
        };
        entityInstance.pos = positionCoordinateProxy;
        entityInstance.z = entityZIndex;

        const scaleCoordinateProxy = {
          get x() {
            return scaleCoordinateX;
          },
          set x(updatedScaleX: number) {
            scaleCoordinateX = updatedScaleX;
            if (entityVisualNode) {
              entityVisualNode.setScale(scaleCoordinateX, scaleCoordinateY);
            }
          },
          get y() {
            return scaleCoordinateY;
          },
          set y(updatedScaleY: number) {
            scaleCoordinateY = updatedScaleY;
            if (entityVisualNode) {
              entityVisualNode.setScale(scaleCoordinateX, scaleCoordinateY);
            }
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
            if (entityVisualNode) {
              entityVisualNode.setScale(scaleCoordinateX, scaleCoordinateY);
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
          set: (updatedColorValue: [number, number, number]) => {
            if (Array.isArray(updatedColorValue) && updatedColorValue.length === 3) {
              entityRgbColor = updatedColorValue;
              if (entityVisualNode && "setColor" in entityVisualNode) {
                (entityVisualNode as ITextNode).setColor(entityRgbColor);
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
          destroyAction();
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
      const keyboardEventHandler = (event: KeyboardEvent): void => {
        if (typeof keyOrExecutionCallback === "function") {
          keyOrExecutionCallback();
          return;
        }
        if (event.key.toLowerCase() === keyOrExecutionCallback.toLowerCase()) {
          maybeKeyCallback?.();
        }
      };
      window.addEventListener("keydown", keyboardEventHandler);
      const cancelKeyboardListener = (): void => {
        window.removeEventListener("keydown", keyboardEventHandler);
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
      return mousePressedState;
    },

    onUpdate(updateCallback: (deltaTimeInSeconds: number) => void): { cancel: () => void } {
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
        const currentCameraPosition = renderEngineInstance.getCameraPosition();
        const targetCoordinateY = cameraCoordinateY ?? currentCameraPosition.y;
        renderEngineInstance.setCameraPosition(cameraPositionOrCoordinateX, targetCoordinateY);
      } else if (cameraPositionOrCoordinateX && typeof cameraPositionOrCoordinateX === "object") {
        renderEngineInstance.setCameraPosition(
          cameraPositionOrCoordinateX.x,
          cameraPositionOrCoordinateX.y
        );
      }
      return renderEngineInstance.getCameraPosition();
    },

    camScale(_scaleFactor: number | { readonly x: number; readonly y: number }): void {
      // O zoom da câmera no PixiJS v8 é gerenciado nativamente pelo worldContainer
    },

    get(tagIdentifier: string): unknown[] {
      const taggedBucket = taggedEntitiesMap.get(tagIdentifier);
      return taggedBucket ? Array.from(taggedBucket) : [];
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

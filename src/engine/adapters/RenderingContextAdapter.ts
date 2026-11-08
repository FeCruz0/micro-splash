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
  ISceneManager,
} from "../contracts/INTERFACE_CONTRACTS";
import { createTween, Easings, type EasingFunction } from "../utils/Tween";
import { getScreenLayerGeometryChecker } from "../screenLayerGeometryChecker";
import {
  requestDocumentFullscreen,
  exitDocumentFullscreen,
  isDocumentFullscreen,
} from "../../systems/fullscreenHandler";

export interface RenderingContextEntity {
  pos: { x: number; y: number };
  scale: { x: number; y: number };
  opacity: number;
  z: number;
  hidden: boolean;
  fixed: boolean;
  text?: string;
  renderNode?: IRenderNode | null;
  exists(): boolean;
  onUpdate(callback: () => void): unknown;
  onClick(callback: () => void): { cancel: () => void };
  onHoverUpdate(): { cancel: () => void };
  onHoverEnd(): { cancel: () => void };
  play(): void;
  destroy(): void;
}

export interface RenderingContext {
  readonly renderEngine: IRenderEngine;
  readonly sceneManager: ISceneManager;
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

  vec2(coordinateX: number, coordinateY: number): { readonly x: number; readonly y: number };
  rgb(redValue: number, greenValue: number, blueValue: number): readonly [number, number, number];
  shake(intensity: number): void;

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

  add(componentsList: unknown[]): RenderingContextEntity;
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
      } catch {}
    }
    while (sceneCleanupCallbacksList.length > 0) {
      const activeCleanupCallback = sceneCleanupCallbacksList.pop();
      try {
        activeCleanupCallback?.();
      } catch {}
    }
    sceneUpdateCallbacksList.length = 0;
    taggedEntitiesMap.clear();
  };

  const renderingContext: RenderingContext = {
    renderEngine: renderEngineInstance,
    sceneManager: sceneManagerInstance,
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
      sceneManagerInstance.registerScene({
        name: sceneIdentifier,
        enter: (transitionData?: unknown) => {
          sceneAction(transitionData);
        },
        update: (deltaTimeInSeconds: number) => {
          const updateCallbacksSnapshot = sceneUpdateCallbacksList.slice();
          for (let index = 0; index < updateCallbacksSnapshot.length; index++) {
            try {
              updateCallbacksSnapshot[index](deltaTimeInSeconds);
            } catch (error) {
              console.error(
                `[SceneManager] Erro no update da cena "${sceneIdentifier}":`,
                error
              );
            }
          }
        },
        exit: () => {
          flushActiveSceneResources();
        },
      });
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

    add(componentsList: unknown[]): RenderingContextEntity {
      let isFixedElement = false;
      let positionCoordinateX = 0;
      let positionCoordinateY = 0;
      let anchorAlignment: "center" | "topleft" | "left" | "right" | "top" | "botright" =
        "topleft";
      let entityOpacity = 1;
      let entityZIndex = 0;
      let entityTextContent: string | null = null;
      let textStyleOptionsRecord: Record<string, unknown> | null = null;
      let rectangleWidthValue: number | null = null;
      let rectangleHeightValue: number | null = null;
      let entityRgbColor: [number, number, number] = [255, 255, 255];
      let entityVisualNode: IRenderNode | null = null;

      const entityInstance: RenderingContextEntity = {
        pos: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        opacity: 1,
        z: 0,
        hidden: false,
        fixed: false,
        exists: () => true,
        onUpdate: (updateCallback: () => void) => renderingContext.onUpdate(updateCallback),
        onClick: (clickCallback: () => void) => {
          if (
            isFixedElement &&
            rectangleWidthValue !== null &&
            rectangleHeightValue !== null
          ) {
            const activeScreenChecker =
              renderEngineInstance.isInitialized &&
              typeof renderEngineInstance.getScreenLayerGeometryChecker === "function"
                ? (renderEngineInstance.getScreenLayerGeometryChecker() as ReturnType<
                    typeof getScreenLayerGeometryChecker
                  >)
                : getScreenLayerGeometryChecker();

            const buttonTargetWidth = rectangleWidthValue;
            const buttonTargetHeight = rectangleHeightValue;
            const cancelHitTargetRegistration = activeScreenChecker.registerHitTarget({
              id: `screen_button_${Math.random().toString(36).slice(2, 9)}`,
              bounds: () => {
                const targetPositionX =
                  anchorAlignment === "center"
                    ? positionCoordinateX - buttonTargetWidth / 2
                    : positionCoordinateX;
                const targetPositionY =
                  anchorAlignment === "center"
                    ? positionCoordinateY - buttonTargetHeight / 2
                    : positionCoordinateY;
                return {
                  x: targetPositionX,
                  y: targetPositionY,
                  width: buttonTargetWidth,
                  height: buttonTargetHeight,
                };
              },
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
        play: () => {},
        destroy: () => {
          if (entityVisualNode) {
            entityVisualNode.destroy();
            entityVisualNode = null;
          }
          for (const entitySet of taggedEntitiesMap.values()) {
            entitySet.delete(entityInstance);
          }
        },
      };

      if (Array.isArray(componentsList)) {
        for (const rawComponent of componentsList) {
          if (typeof rawComponent === "string") {
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
            } else if (
              componentRecord.type === "z" &&
              typeof componentRecord.z === "number"
            ) {
              entityZIndex = componentRecord.z;
            } else if (componentRecord.type === "fixed") {
              isFixedElement = true;
              entityInstance.fixed = true;
            } else if (
              componentRecord.type === "anchor" &&
              typeof componentRecord.anchorPoint === "string"
            ) {
              anchorAlignment = componentRecord.anchorPoint as typeof anchorAlignment;
            } else if (
              componentRecord.type === "text" &&
              typeof componentRecord.text === "string"
            ) {
              entityTextContent = componentRecord.text;
              textStyleOptionsRecord =
                (componentRecord.options as Record<string, unknown>) ?? null;
              entityInstance.text = entityTextContent;
            } else if (
              componentRecord.type === "rect" &&
              typeof componentRecord.width === "number" &&
              typeof componentRecord.height === "number"
            ) {
              rectangleWidthValue = componentRecord.width;
              rectangleHeightValue = componentRecord.height;
            } else if (componentRecord.type === "color" && Array.isArray(componentRecord.args)) {
              const colorArgumentsList = componentRecord.args as unknown[];
              if (
                colorArgumentsList.length === 3 &&
                typeof colorArgumentsList[0] === "number"
              ) {
                entityRgbColor = [
                  colorArgumentsList[0],
                  colorArgumentsList[1] as number,
                  colorArgumentsList[2] as number,
                ];
              } else if (
                colorArgumentsList.length === 1 &&
                Array.isArray(colorArgumentsList[0])
              ) {
                entityRgbColor = colorArgumentsList[0] as [number, number, number];
              }
            }
          }
        }
      }

      if (renderEngineInstance.isInitialized) {
        const destinationContainer = isFixedElement
          ? renderEngineInstance.getScreenContainer()
          : renderEngineInstance.getWorldContainer();

        if (rectangleWidthValue !== null && rectangleHeightValue !== null) {
          const graphicsNodeInstance = renderEngineInstance.createGraphics(
            `rendered_rect_${Math.random().toString(36).slice(2, 9)}`
          );
          graphicsNodeInstance.drawRect(0, 0, rectangleWidthValue, rectangleHeightValue, {
            fill: { color: entityRgbColor, alpha: entityOpacity },
          });
          graphicsNodeInstance.setPosition(positionCoordinateX, positionCoordinateY);
          graphicsNodeInstance.setZIndex(entityZIndex);
          destinationContainer.addChild(graphicsNodeInstance);
          entityVisualNode = graphicsNodeInstance;
          entityInstance.renderNode = graphicsNodeInstance;
        } else if (entityTextContent !== null) {
          const calculatedFontSize =
            typeof textStyleOptionsRecord?.size === "number"
              ? textStyleOptionsRecord.size
              : 16;
          const calculatedFontFamily =
            typeof textStyleOptionsRecord?.font === "string"
              ? textStyleOptionsRecord.font
              : "Outfit";
          const textNodeInstance = renderEngineInstance.createText(
            entityTextContent,
            {
              fontSize: calculatedFontSize,
              fontFamily: calculatedFontFamily,
              color: entityRgbColor,
            },
            `rendered_text_${Math.random().toString(36).slice(2, 9)}`
          );
          textNodeInstance.setPosition(positionCoordinateX, positionCoordinateY);
          textNodeInstance.setZIndex(entityZIndex);
          textNodeInstance.setOpacity(entityOpacity);
          destinationContainer.addChild(textNodeInstance);
          entityVisualNode = textNodeInstance;
          entityInstance.renderNode = textNodeInstance;
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

      let universalTaggedBucket = taggedEntitiesMap.get("*");
      if (!universalTaggedBucket) {
        universalTaggedBucket = new Set<unknown>();
        taggedEntitiesMap.set("*", universalTaggedBucket);
      }
      universalTaggedBucket.add(entityInstance);

      if (entityVisualNode) {
        sceneCleanupCallbacksList.push(() => {
          if (entityVisualNode) {
            entityVisualNode.destroy();
            entityVisualNode = null;
          }
        });
      }

      return entityInstance;
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
        typeof easingMethod === "function"
          ? (easingMethod as EasingFunction)
          : Easings.easeOutQuad;
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
      } else if (
        cameraPositionOrCoordinateX &&
        typeof cameraPositionOrCoordinateX === "object"
      ) {
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

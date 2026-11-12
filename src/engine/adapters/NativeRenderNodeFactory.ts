import type {
  GraphicStyle,
  IGraphicsNode,
  IRenderEngine,
  IRenderNode,
  ISpriteNode,
  ITextNode,
  TextStyleOptions,
  Vector2D,
} from "../contracts/INTERFACE_CONTRACTS";
import { getSpriteSheetManager } from "./SpriteSheetManager";
import {
  convertToColorRepresentation,
  NativeVisualObjectAdapter,
  type NativeNodeAnchorAlignment,
  type NativeVisualNodeBaseOptions,
} from "./NativeVisualObjectAdapter";

export {
  areColorValuesEqual,
  convertToColorRepresentation,
  NativeVisualObjectAdapter,
  type NativeNodeAnchorAlignment,
  type NativeOutlineState,
  type NativeVisualNodeBaseOptions,
} from "./NativeVisualObjectAdapter";

interface LifecycleAwareContext {
  onUpdate?: (callback: (deltaTimeInSeconds?: number) => void) => { cancel?: () => void } | unknown;
  onSceneLeave?: (callback: () => void) => unknown;
  wait?: (delaySeconds: number, callback: () => void) => { cancel?: () => void } | unknown;
  dt?: () => number;
}

export interface NativeRectNodeOptions extends NativeVisualNodeBaseOptions {
  width: number;
  height: number;
  cornerRadius?: number;
  fillColor?: unknown;
  outlineColor?: unknown;
  outlineWidth?: number;
}

export interface NativeCircleNodeOptions extends NativeVisualNodeBaseOptions {
  radius: number;
  fillColor?: unknown;
  outlineColor?: unknown;
  outlineWidth?: number;
}

export interface NativePolygonNodeOptions extends NativeVisualNodeBaseOptions {
  points: readonly Vector2D[];
  fillColor?: unknown;
  outlineColor?: unknown;
  outlineWidth?: number;
}

export interface NativeSpriteNodeOptions extends NativeVisualNodeBaseOptions {
  assetAlias: string;
  animationName?: string;
  tintColor?: unknown;
}

export interface NativeTextNodeOptions extends NativeVisualNodeBaseOptions {
  content: string;
  fontFamily?: string;
  fontSize?: number;
  color?: unknown;
  align?: "left" | "center" | "right";
  wordWrapWidth?: number;
  lineSpacing?: number;
}

/**
 * Registers a per-frame update callback synced to RenderingContext scene lifecycle when available,
 * or directly on the IRenderEngine ticker with automatic scene-leave cleanup.
 */
export function registerNativeSceneUpdate(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  updateCallback: (deltaTimeInSeconds: number) => void
): () => void {
  let isDisposed = false;
  let cancelUpdateHandle: (() => void) | null = null;
  const lifecycleContext =
    engineOrContext && typeof engineOrContext === "object"
      ? (engineOrContext as LifecycleAwareContext)
      : null;

  if (lifecycleContext && typeof lifecycleContext.onUpdate === "function") {
    const registrationResult = lifecycleContext.onUpdate((deltaTimeInSeconds?: number) => {
      if (isDisposed) return;
      const resolvedDelta =
        typeof deltaTimeInSeconds === "number"
          ? deltaTimeInSeconds
          : typeof lifecycleContext.dt === "function"
            ? lifecycleContext.dt()
            : resolvedNativeRenderEngine.getTicker().getDeltaTime();
      updateCallback(resolvedDelta);
    });
    if (
      registrationResult &&
      typeof registrationResult === "object" &&
      "cancel" in registrationResult &&
      typeof (registrationResult as { cancel?: () => void }).cancel === "function"
    ) {
      cancelUpdateHandle = (registrationResult as { cancel: () => void }).cancel;
    }
  } else {
    cancelUpdateHandle = resolvedNativeRenderEngine
      .getTicker()
      .add((deltaTimeInSeconds: number) => {
        if (!isDisposed) updateCallback(deltaTimeInSeconds);
      });
  }

  const cleanupCallback = () => {
    if (isDisposed) return;
    isDisposed = true;
    if (cancelUpdateHandle) {
      try {
        cancelUpdateHandle();
      } catch {
        // Safe teardown if scene ticker already cleared
      }
      cancelUpdateHandle = null;
    }
  };

  if (lifecycleContext && typeof lifecycleContext.onSceneLeave === "function") {
    lifecycleContext.onSceneLeave(cleanupCallback);
  }
  return cleanupCallback;
}

/**
 * Schedules a one-shot delayed callback using context wait() or native engine ticker accumulation.
 */
export function scheduleNativeSceneDelay(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  delaySeconds: number,
  callback: () => void
): () => void {
  const lifecycleContext =
    engineOrContext && typeof engineOrContext === "object"
      ? (engineOrContext as LifecycleAwareContext)
      : null;

  if (lifecycleContext && typeof lifecycleContext.wait === "function") {
    const waitResult = lifecycleContext.wait(delaySeconds, callback);
    if (
      waitResult &&
      typeof waitResult === "object" &&
      "cancel" in waitResult &&
      typeof (waitResult as { cancel?: () => void }).cancel === "function"
    ) {
      return (waitResult as { cancel: () => void }).cancel;
    }
    return () => {};
  }

  let elapsedSeconds = 0;
  let hasCompleted = false;
  const unregisterTicker = registerNativeSceneUpdate(
    engineOrContext,
    resolvedNativeRenderEngine,
    (deltaTimeInSeconds: number) => {
      if (hasCompleted) return;
      elapsedSeconds += deltaTimeInSeconds;
      if (elapsedSeconds >= delaySeconds) {
        hasCompleted = true;
        unregisterTicker();
        callback();
      }
    }
  );
  return unregisterTicker;
}

function resolveNormalizedAnchor(anchor?: NativeNodeAnchorAlignment): Vector2D {
  switch (anchor) {
    case "center":
      return { x: 0.5, y: 0.5 };
    case "bot":
      return { x: 0.5, y: 1 };
    case "botleft":
      return { x: 0, y: 1 };
    case "top":
      return { x: 0.5, y: 0 };
    case "left":
      return { x: 0, y: 0.5 };
    case "right":
      return { x: 1, y: 0.5 };
    default:
      return { x: 0, y: 0 };
  }
}

function buildGraphicStyle(
  fillColorValue: unknown,
  outlineColorValue: unknown,
  outlineWidth: number
): GraphicStyle {
  const fillStyle =
    fillColorValue !== undefined
      ? { color: convertToColorRepresentation(fillColorValue), alpha: 1 }
      : undefined;
  const strokeStyle =
    outlineColorValue !== undefined && outlineWidth > 0
      ? { color: convertToColorRepresentation(outlineColorValue), width: outlineWidth, alpha: 1 }
      : undefined;
  return {
    ...(fillStyle ? { fill: fillStyle } : {}),
    ...(strokeStyle ? { stroke: strokeStyle } : {}),
  };
}

export function createNativeRectNode(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  parentContainer: IRenderNode,
  options: NativeRectNodeOptions
): NativeVisualObjectAdapter {
  const graphicsNode: IGraphicsNode = resolvedNativeRenderEngine.createGraphics(
    options.identifier ?? "native_rect"
  );
  const redrawRect = (adapter: NativeVisualObjectAdapter) => {
    const rectWidth = adapter.width;
    const rectHeight = adapter.height;
    let drawOffsetX = 0;
    let drawOffsetY = 0;
    if (options.anchor === "center") {
      drawOffsetX = -rectWidth / 2;
      drawOffsetY = -rectHeight / 2;
    } else if (options.anchor === "bot") {
      drawOffsetX = -rectWidth / 2;
      drawOffsetY = -rectHeight;
    } else if (options.anchor === "botleft") {
      drawOffsetX = 0;
      drawOffsetY = -rectHeight;
    }
    const style = buildGraphicStyle(adapter.color, adapter.outline.color, adapter.outline.width);
    graphicsNode.clear();
    if (options.cornerRadius && options.cornerRadius > 0) {
      graphicsNode.drawRoundedRect(
        drawOffsetX,
        drawOffsetY,
        rectWidth,
        rectHeight,
        options.cornerRadius,
        style
      );
    } else {
      graphicsNode.drawRect(drawOffsetX, drawOffsetY, rectWidth, rectHeight, style);
    }
  };

  const adapter = new NativeVisualObjectAdapter({
    renderNode: graphicsNode,
    resolvedNativeRenderEngine,
    options,
    width: options.width,
    height: options.height,
    color: options.fillColor,
    outlineColor: options.outlineColor,
    outlineWidth: options.outlineWidth,
    redrawCallback: redrawRect,
    updateRegistrar: (callback) =>
      registerNativeSceneUpdate(engineOrContext, resolvedNativeRenderEngine, callback),
  });
  redrawRect(adapter);
  parentContainer.addChild(graphicsNode);
  return adapter;
}

export function createNativeCircleNode(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  parentContainer: IRenderNode,
  options: NativeCircleNodeOptions
): NativeVisualObjectAdapter {
  const graphicsNode: IGraphicsNode = resolvedNativeRenderEngine.createGraphics(
    options.identifier ?? "native_circle"
  );
  const redrawCircle = (adapter: NativeVisualObjectAdapter) => {
    const style = buildGraphicStyle(adapter.color, adapter.outline.color, adapter.outline.width);
    graphicsNode.clear();
    graphicsNode.drawCircle(0, 0, Math.max(0.5, adapter.radius), style);
  };

  const adapter = new NativeVisualObjectAdapter({
    renderNode: graphicsNode,
    resolvedNativeRenderEngine,
    options,
    radius: options.radius,
    color: options.fillColor,
    outlineColor: options.outlineColor,
    outlineWidth: options.outlineWidth,
    redrawCallback: redrawCircle,
    updateRegistrar: (callback) =>
      registerNativeSceneUpdate(engineOrContext, resolvedNativeRenderEngine, callback),
  });
  redrawCircle(adapter);
  parentContainer.addChild(graphicsNode);
  return adapter;
}

export function createNativePolygonNode(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  parentContainer: IRenderNode,
  options: NativePolygonNodeOptions
): NativeVisualObjectAdapter {
  const graphicsNode: IGraphicsNode = resolvedNativeRenderEngine.createGraphics(
    options.identifier ?? "native_polygon"
  );
  const redrawPolygon = (adapter: NativeVisualObjectAdapter) => {
    const style = buildGraphicStyle(adapter.color, adapter.outline.color, adapter.outline.width);
    graphicsNode.clear();
    graphicsNode.drawPolygon(options.points, style);
  };

  const adapter = new NativeVisualObjectAdapter({
    renderNode: graphicsNode,
    resolvedNativeRenderEngine,
    options,
    color: options.fillColor,
    outlineColor: options.outlineColor,
    outlineWidth: options.outlineWidth,
    redrawCallback: redrawPolygon,
    updateRegistrar: (callback) =>
      registerNativeSceneUpdate(engineOrContext, resolvedNativeRenderEngine, callback),
  });
  redrawPolygon(adapter);
  parentContainer.addChild(graphicsNode);
  return adapter;
}

export function createNativeSpriteNode(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  parentContainer: IRenderNode,
  options: NativeSpriteNodeOptions
): NativeVisualObjectAdapter {
  const spriteNode: ISpriteNode = resolvedNativeRenderEngine.createSprite(
    options.assetAlias,
    options.identifier ?? options.assetAlias
  );
  const anchorCoordinates = resolveNormalizedAnchor(options.anchor);
  spriteNode.setAnchor(anchorCoordinates.x, anchorCoordinates.y);
  if (options.tintColor !== undefined) {
    spriteNode.setTint(convertToColorRepresentation(options.tintColor));
  }

  const adapter = new NativeVisualObjectAdapter({
    renderNode: spriteNode,
    resolvedNativeRenderEngine,
    options,
    color: options.tintColor,
    isSpriteNode: true,
    updateRegistrar: (callback) =>
      registerNativeSceneUpdate(engineOrContext, resolvedNativeRenderEngine, callback),
  });

  const animationController = getSpriteSheetManager().createAnimationController(
    spriteNode,
    options.assetAlias,
    options.animationName
  );
  if (animationController) {
    adapter.onUpdate((deltaTimeInSeconds: number) => {
      animationController.update(deltaTimeInSeconds);
    });
  }

  parentContainer.addChild(spriteNode);
  return adapter;
}

export function createNativeTextNode(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  parentContainer: IRenderNode,
  options: NativeTextNodeOptions
): NativeVisualObjectAdapter {
  const styleOptions: TextStyleOptions = {
    fontFamily: options.fontFamily ?? "Outfit",
    fontSize: options.fontSize ?? 16,
    color: convertToColorRepresentation(options.color),
    align: options.align ?? (options.anchor === "center" ? "center" : "left"),
    ...(options.wordWrapWidth !== undefined ? { wordWrapWidth: options.wordWrapWidth } : {}),
    ...(options.lineSpacing !== undefined ? { lineSpacing: options.lineSpacing } : {}),
  };
  const textNode: ITextNode = resolvedNativeRenderEngine.createText(
    options.content,
    styleOptions,
    options.identifier ?? "native_text"
  );
  if (typeof textNode.setAnchor === "function") {
    const anchorCoordinates = resolveNormalizedAnchor(options.anchor);
    textNode.setAnchor(anchorCoordinates.x, anchorCoordinates.y);
  }

  const adapter = new NativeVisualObjectAdapter({
    renderNode: textNode,
    resolvedNativeRenderEngine,
    options,
    color: options.color,
    text: options.content,
    isTextNode: true,
    updateRegistrar: (callback) =>
      registerNativeSceneUpdate(engineOrContext, resolvedNativeRenderEngine, callback),
  });
  parentContainer.addChild(textNode);
  return adapter;
}

export function createNativeContainerNode(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine,
  parentContainer: IRenderNode,
  options: NativeVisualNodeBaseOptions
): NativeVisualObjectAdapter {
  const containerNode = resolvedNativeRenderEngine.createContainer(
    options.identifier ?? "native_container"
  );
  const adapter = new NativeVisualObjectAdapter({
    renderNode: containerNode,
    resolvedNativeRenderEngine,
    options,
    updateRegistrar: (callback) =>
      registerNativeSceneUpdate(engineOrContext, resolvedNativeRenderEngine, callback),
  });
  parentContainer.addChild(containerNode);
  return adapter;
}

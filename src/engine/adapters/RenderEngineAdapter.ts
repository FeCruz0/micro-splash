/**
 * Adaptador Concreto da Engine de Renderização para PixiJS v8 — Micro Splash
 *
 * Implementa IRenderEngine desacoplando todo o ecossistema do jogo dos detalhes de baixo nível.
 * Fornece ciclo de vida seguro no DOM para o ambiente Docker/Vite e bridge de Ticker normalizado.
 */

import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import type {
  ColorRepresentation,
  IRenderEngine,
  IRenderNode,
  ISpriteNode,
  IGraphicsNode,
  ITextNode,
  IRenderTicker,
  RenderEngineInitOptions,
  TextStyleOptions,
  Vector2D,
} from "../contracts/INTERFACE_CONTRACTS";
import {
  PixiContainerNode,
  PixiSpriteNode,
  PixiGraphicsNode,
  PixiTextNode,
  parseColor,
} from "./PixiNodes";
import { getSpriteSheetManager } from "./SpriteSheetManager";
import {
  ScreenLayerGeometryChecker,
  initScreenLayerGeometryChecker,
  getScreenLayerGeometryChecker,
} from "../screenLayerGeometryChecker";
import { accessibilitySystem } from "../../systems/accessibilitySystem";

/**
 * Ticker desacoplado com injeção de deltaTime normalizado e teto de segurança.
 */
export class PixiRenderTicker implements IRenderTicker {
  private readonly callbacks = new Set<(deltaTimeInSeconds: number) => void>();
  private readonly maxDeltaTime: number;
  private currentDeltaTime: number = 0;
  private currentFps: number = 60;
  private isRunning: boolean = true;
  private tickerDisposer: (() => void) | null = null;

  constructor(app: Application, maxDeltaTime: number = 0.1) {
    this.maxDeltaTime = maxDeltaTime;
    app.ticker.maxFPS = 60;
    app.ticker.minFPS = 15;

    const onTick = (): void => {
      if (!this.isRunning) return;

      const rawDeltaInSeconds = (app.ticker.deltaMS || 16.666) / 1000;
      const safeDeltaTime = Math.min(Math.max(rawDeltaInSeconds, 0), this.maxDeltaTime);
      this.currentDeltaTime = safeDeltaTime;
      this.currentFps = app.ticker.FPS;

      for (const callback of this.callbacks) {
        try {
          callback(safeDeltaTime);
        } catch (error) {
          console.error("[PixiRenderTicker] Erro no callback do loop de renderização:", error);
        }
      }
    };

    app.ticker.add(onTick);
    this.tickerDisposer = (): void => {
      app.ticker.remove(onTick);
    };
  }

  add(callback: (deltaTimeInSeconds: number) => void): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  getFPS(): number {
    return this.currentFps;
  }

  getDeltaTime(): number {
    return this.currentDeltaTime;
  }

  destroy(): void {
    this.isRunning = false;
    this.callbacks.clear();
    if (this.tickerDisposer) {
      this.tickerDisposer();
      this.tickerDisposer = null;
    }
  }
}

let activeRenderEngineInstance: IRenderEngine | null = null;

export function getActiveRenderEngine(): IRenderEngine | null {
  return activeRenderEngineInstance;
}

export function setActiveRenderEngine(engine: IRenderEngine | null): void {
  activeRenderEngineInstance = engine;
}

/**
 * Adaptador de Renderização baseado em PixiJS v8.
 */
export class RenderEngineAdapter implements IRenderEngine {
  public static readonly MAX_DELTA_TIME = 0.1;

  private application: Application | null = null;
  private stageRoot: PixiContainerNode | null = null;
  private worldContainer: PixiContainerNode | null = null;
  private screenContainer: PixiContainerNode | null = null;
  private cameraPosition: Vector2D = { x: 400, y: 300 };
  private shakeOffset: Vector2D = { x: 0, y: 0 };
  private activeShakeIntensity: number = 0;
  private shakeDurationRemaining: number = 0;
  private shakeTotalDuration: number = 0;
  private shakeCleanupCallback: (() => void) | null = null;
  private tickerAdapter: PixiRenderTicker | null = null;
  private containerElement: HTMLElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private initialized: boolean = false;
  private viewportWidth: number = 800;
  private viewportHeight: number = 600;
  private screenLayerGeometryCheckerInstance: ScreenLayerGeometryChecker | null = null;

  constructor() {
    setActiveRenderEngine(this);
    if (typeof globalThis !== "undefined") {
      (globalThis as unknown as Record<string, unknown>).__MICRO_SPLASH_RENDER_ENGINE = this;
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  async init(options: RenderEngineInitOptions): Promise<void> {
    if (this.initialized) {
      this.destroy();
    }

    this.viewportWidth = options.width;
    this.viewportHeight = options.height;
    this.cameraPosition = { x: options.width / 2, y: options.height / 2 };

    const app = new Application();
    await app.init({
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor
        ? parseColor(options.backgroundColor).toNumber()
        : 0x051226,
      resolution:
        options.resolution ??
        (typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 1.5) : 1),
      autoDensity: options.autoDensity ?? true,
      antialias: options.antialias ?? false,
      preference: "webgl",
      eventMode: "none",
      eventFeatures: {
        move: false,
        globalMove: false,
        click: true,
        wheel: false,
      },
      webgl: {
        powerPreference: options.powerPreference ?? "high-performance",
        preferWebGLVersion: 2,
        antialias: options.antialias ?? false,
      },
    });

    this.application = app;
    this.canvasElement = app.canvas as HTMLCanvasElement;
    this.canvasElement.setAttribute("data-engine", "pixijs-v8");
    this.canvasElement.style.display = "block";
    this.canvasElement.style.position = "absolute";
    this.canvasElement.style.top = "0";
    this.canvasElement.style.left = "0";
    this.canvasElement.style.width = "100%";
    this.canvasElement.style.height = "100%";

    // Gerenciamento de ciclo de vida seguro no DOM para Docker/Vite/HMR
    if (options.containerElement) {
      this.containerElement = options.containerElement;
      const danglingCanvases = this.containerElement.querySelectorAll(
        "canvas[data-engine='pixijs-v8']"
      );
      for (let index = 0; index < danglingCanvases.length; index++) {
        const item = danglingCanvases[index];
        if (item !== this.canvasElement) {
          item.remove();
        }
      }
      this.containerElement.appendChild(this.canvasElement);
    }

    this.stageRoot = new PixiContainerNode(app.stage, "stage_root");
    this.worldContainer = new PixiContainerNode(undefined, "world_container");
    this.screenContainer = new PixiContainerNode(undefined, "screen_container");

    this.worldContainer.setZIndex(0);
    this.screenContainer.setZIndex(100);

    this.stageRoot.addChild(this.worldContainer);
    this.stageRoot.addChild(this.screenContainer);

    const stageEventMode = "none";
    const nativeStage = app.stage as unknown as {
      eventMode?: string;
      interactiveChildren?: boolean;
      sortableChildren?: boolean;
    };
    nativeStage.eventMode = stageEventMode;
    nativeStage.interactiveChildren = false;
    nativeStage.sortableChildren = false;

    this.screenLayerGeometryCheckerInstance = initScreenLayerGeometryChecker({
      canvasElement: this.canvasElement,
      virtualWidth: this.viewportWidth,
      virtualHeight: this.viewportHeight,
    });

    this.tickerAdapter = new PixiRenderTicker(app, RenderEngineAdapter.MAX_DELTA_TIME);
    this.initialized = true;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    if (this.application?.renderer) {
      this.application.renderer.resize(width, height);
    }
    if (this.screenLayerGeometryCheckerInstance) {
      this.screenLayerGeometryCheckerInstance.setDimensions(width, height);
    }
    this.updateWorldContainerPosition();
  }

  getDimensions(): { readonly width: number; readonly height: number } {
    return {
      width: this.viewportWidth,
      height: this.viewportHeight,
    };
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvasElement;
  }

  getStageRoot(): IRenderNode {
    if (!this.stageRoot) {
      throw new Error(
        "RenderEngineAdapter não inicializado. Chame init() antes de acessar stageRoot."
      );
    }
    return this.stageRoot;
  }

  getWorldContainer(): IRenderNode {
    if (!this.worldContainer) {
      throw new Error(
        "RenderEngineAdapter não inicializado. Chame init() antes de acessar worldContainer."
      );
    }
    return this.worldContainer;
  }

  getScreenContainer(): IRenderNode {
    if (!this.screenContainer) {
      throw new Error(
        "RenderEngineAdapter não inicializado. Chame init() antes de acessar screenContainer."
      );
    }
    return this.screenContainer;
  }

  getCameraPosition(): Vector2D {
    return { x: this.cameraPosition.x, y: this.cameraPosition.y };
  }

  setCameraPosition(cameraPositionX: number, cameraPositionY: number): void {
    this.cameraPosition = { x: cameraPositionX, y: cameraPositionY };
    this.updateWorldContainerPosition();
  }

  private updateWorldContainerPosition(): void {
    if (this.worldContainer) {
      const halfViewportWidth = this.viewportWidth / 2;
      const halfViewportHeight = this.viewportHeight / 2;
      this.worldContainer.setPosition(
        -(this.cameraPosition.x - halfViewportWidth) + this.shakeOffset.x,
        -(this.cameraPosition.y - halfViewportHeight) + this.shakeOffset.y
      );
    }
  }

  shake(shakeIntensityInPixels: number): void {
    if (accessibilitySystem.isReducedMotion()) {
      return;
    }
    if (shakeIntensityInPixels <= 0) {
      return;
    }

    this.activeShakeIntensity = Math.max(this.activeShakeIntensity, shakeIntensityInPixels);
    this.shakeTotalDuration = 0.2;
    this.shakeDurationRemaining = this.shakeTotalDuration;

    if (!this.shakeCleanupCallback && this.tickerAdapter) {
      this.shakeCleanupCallback = this.tickerAdapter.add((deltaTimeInSeconds: number) => {
        this.shakeDurationRemaining -= deltaTimeInSeconds;

        if (this.shakeDurationRemaining <= 0 || accessibilitySystem.isReducedMotion()) {
          this.activeShakeIntensity = 0;
          this.shakeOffset = { x: 0, y: 0 };
          this.updateWorldContainerPosition();
          if (this.shakeCleanupCallback) {
            this.shakeCleanupCallback();
            this.shakeCleanupCallback = null;
          }
          return;
        }

        const remainingRatio = this.shakeDurationRemaining / this.shakeTotalDuration;
        const currentIntensity = this.activeShakeIntensity * remainingRatio;
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDistance = (Math.random() * 0.5 + 0.5) * currentIntensity;

        this.shakeOffset = {
          x: Math.cos(randomAngle) * randomDistance,
          y: Math.sin(randomAngle) * randomDistance,
        };
        this.updateWorldContainerPosition();
      });
    }
  }

  getShakeOffset(): Vector2D {
    return { x: this.shakeOffset.x, y: this.shakeOffset.y };
  }

  addNodeToWorld(child: IRenderNode): void {
    this.getWorldContainer().addChild(child);
  }

  addNodeToScreen(child: IRenderNode): void {
    this.getScreenContainer().addChild(child);
  }

  getTicker(): IRenderTicker {
    if (!this.tickerAdapter) {
      throw new Error(
        "RenderEngineAdapter não inicializado. Chame init() antes de acessar o ticker."
      );
    }
    return this.tickerAdapter;
  }

  getRenderer(): unknown {
    return this.application?.renderer ?? null;
  }

  /**
   * Atualiza a cor de fundo do renderer do PixiJS v8 dinamicamente.
   */
  setBackground(color: ColorRepresentation): void {
    const renderer = this.application?.renderer;
    if (renderer && "background" in renderer && renderer.background) {
      renderer.background.color = parseColor(color);
    }
  }

  getStageEventMode(): string {
    return "none";
  }

  getScreenLayerGeometryChecker(): ScreenLayerGeometryChecker {
    if (!this.screenLayerGeometryCheckerInstance) {
      this.screenLayerGeometryCheckerInstance = getScreenLayerGeometryChecker();
    }
    return this.screenLayerGeometryCheckerInstance;
  }

  generateTexture(
    target: IRenderNode | unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): Texture | null {
    if (!this.application?.renderer) return null;
    const nativeTarget =
      target && typeof target === "object" && "getNativeNode" in target
        ? (target as IRenderNode).getNativeNode()
        : target;
    try {
      const tex = this.application.renderer.generateTexture({
        target: nativeTarget as Container,
        resolution: options?.resolution ?? 0.5,
        textureSourceOptions: {
          scaleMode: options?.scaleMode ?? "nearest",
        },
      });
      if (tex && tex.source && options?.scaleMode) {
        tex.source.scaleMode = options.scaleMode;
      }
      return tex;
    } catch {
      return null;
    }
  }

  createContainer(id?: string): IRenderNode {
    return new PixiContainerNode(undefined, id);
  }

  createSprite(textureOrId: string | unknown, id?: string): ISpriteNode {
    let texture: Texture;
    let textureId: string;
    if (typeof textureOrId === "string") {
      textureId = textureOrId;
      if (textureOrId === "white" || textureOrId === "Texture.WHITE") {
        texture = Texture.WHITE;
      } else {
        const spriteSheetManager = getSpriteSheetManager();
        if (spriteSheetManager.hasAtlasDescriptor(textureOrId)) {
          const frameTexture = spriteSheetManager.getFrameTexture(textureOrId, 0);
          texture = frameTexture ?? Texture.EMPTY;
        } else {
          try {
            if (Assets.cache.has(textureOrId)) {
              texture = Assets.get(textureOrId);
            } else {
              texture = Texture.from(textureOrId);
            }
          } catch {
            texture = Texture.EMPTY;
          }
        }
      }
    } else if (textureOrId instanceof Texture) {
      texture = textureOrId;
      textureId = id ?? "baked_texture";
    } else if (textureOrId && typeof textureOrId === "object" && "source" in textureOrId) {
      texture = textureOrId as Texture;
      textureId = id ?? "baked_texture";
    } else {
      texture = Texture.EMPTY;
      textureId = id ?? "empty";
    }
    const sprite = new Sprite(texture);
    sprite.roundPixels = true;
    sprite.cullable = true;
    sprite.eventMode = "none";
    return new PixiSpriteNode(sprite, textureId, id);
  }

  createGraphics(id?: string): IGraphicsNode {
    return new PixiGraphicsNode(undefined, id);
  }

  createText(content: string, style?: TextStyleOptions, id?: string): ITextNode {
    return new PixiTextNode(content, style, id);
  }

  destroy(): void {
    if (this.shakeCleanupCallback) {
      this.shakeCleanupCallback();
      this.shakeCleanupCallback = null;
    }
    this.shakeOffset = { x: 0, y: 0 };
    this.activeShakeIntensity = 0;

    if (this.screenLayerGeometryCheckerInstance) {
      this.screenLayerGeometryCheckerInstance.destroy();
      this.screenLayerGeometryCheckerInstance = null;
    }

    if (this.tickerAdapter) {
      this.tickerAdapter.destroy();
      this.tickerAdapter = null;
    }

    if (this.screenContainer) {
      this.screenContainer.destroy();
      this.screenContainer = null;
    }

    if (this.worldContainer) {
      this.worldContainer.destroy();
      this.worldContainer = null;
    }

    if (this.stageRoot) {
      this.stageRoot.destroy();
      this.stageRoot = null;
    }

    if (this.canvasElement && this.canvasElement.parentElement) {
      this.canvasElement.remove();
      this.canvasElement = null;
    }

    if (this.application) {
      try {
        this.application.destroy(
          { removeView: true, releaseGlobalResources: true },
          { children: true, texture: false }
        );
      } catch {
        // Fallback defensivo em ambientes de teste sem WebGL
      }
      this.application = null;
    }

    this.containerElement = null;
    this.initialized = false;
    if (activeRenderEngineInstance === this) {
      activeRenderEngineInstance = null;
    }
  }
}

function resolveContainerWithStageFallback(
  engine: IRenderEngine,
  containerSelector: () => IRenderNode
): IRenderNode {
  try {
    return containerSelector();
  } catch {
    return engine.getStageRoot();
  }
}

/**
 * Resolves the world-space render container, falling back to stageRoot for partial mocks.
 */
export function resolveWorldRenderContainer(engine: IRenderEngine): IRenderNode {
  if (typeof engine.getWorldContainer === "function") {
    return resolveContainerWithStageFallback(engine, () => engine.getWorldContainer());
  }
  return engine.getStageRoot();
}

/**
 * Resolves the screen-space (HUD/fixed) render container, falling back to stageRoot for partial mocks.
 */
export function resolveScreenRenderContainer(engine: IRenderEngine): IRenderNode {
  if (typeof engine.getScreenContainer === "function") {
    return resolveContainerWithStageFallback(engine, () => engine.getScreenContainer());
  }
  return engine.getStageRoot();
}

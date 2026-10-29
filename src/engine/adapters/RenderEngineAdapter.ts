/**
 * Adaptador Concreto da Engine de Renderização para PixiJS v8 — Micro Splash
 *
 * Implementa IRenderEngine desacoplando todo o ecossistema do jogo dos detalhes de baixo nível.
 * Fornece ciclo de vida seguro no DOM para o ambiente Docker/Vite e bridge de Ticker normalizado.
 */

import { Application, Sprite, Texture } from "pixi.js";
import type {
  IRenderEngine,
  IRenderNode,
  ISpriteNode,
  IGraphicsNode,
  ITextNode,
  IRenderTicker,
  RenderEngineInitOptions,
  TextStyleOptions,
} from "../contracts/INTERFACE_CONTRACTS";
import {
  PixiContainerNode,
  PixiSpriteNode,
  PixiGraphicsNode,
  PixiTextNode,
  parseColor,
} from "./PixiNodes";

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

/**
 * Adaptador de Renderização baseado em PixiJS v8.
 */
export class RenderEngineAdapter implements IRenderEngine {
  public static readonly MAX_DELTA_TIME = 0.1;

  private application: Application | null = null;
  private stageRoot: PixiContainerNode | null = null;
  private tickerAdapter: PixiRenderTicker | null = null;
  private containerElement: HTMLElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private initialized: boolean = false;
  private viewportWidth: number = 800;
  private viewportHeight: number = 600;

  get isInitialized(): boolean {
    return this.initialized;
  }

  async init(options: RenderEngineInitOptions): Promise<void> {
    if (this.initialized) {
      this.destroy();
    }

    this.viewportWidth = options.width;
    this.viewportHeight = options.height;

    const app = new Application();
    await app.init({
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor
        ? parseColor(options.backgroundColor).toNumber()
        : 0x051226,
      resolution:
        options.resolution ?? (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
      autoDensity: options.autoDensity ?? true,
      antialias: options.antialias ?? true,
    });

    this.application = app;
    this.canvasElement = app.canvas as HTMLCanvasElement;
    this.canvasElement.setAttribute("data-engine", "pixijs-v8");
    this.canvasElement.style.display = "block";

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
    this.tickerAdapter = new PixiRenderTicker(app, RenderEngineAdapter.MAX_DELTA_TIME);
    this.initialized = true;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    if (this.application?.renderer) {
      this.application.renderer.resize(width, height);
    }
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

  getTicker(): IRenderTicker {
    if (!this.tickerAdapter) {
      throw new Error(
        "RenderEngineAdapter não inicializado. Chame init() antes de acessar o ticker."
      );
    }
    return this.tickerAdapter;
  }

  createContainer(id?: string): IRenderNode {
    return new PixiContainerNode(undefined, id);
  }

  createSprite(textureId: string, id?: string): ISpriteNode {
    let texture: Texture;
    try {
      texture = Texture.from(textureId);
    } catch {
      texture = Texture.EMPTY;
    }
    return new PixiSpriteNode(new Sprite(texture), textureId, id);
  }

  createGraphics(id?: string): IGraphicsNode {
    return new PixiGraphicsNode(undefined, id);
  }

  createText(content: string, style?: TextStyleOptions, id?: string): ITextNode {
    return new PixiTextNode(content, style, id);
  }

  destroy(): void {
    if (this.tickerAdapter) {
      this.tickerAdapter.destroy();
      this.tickerAdapter = null;
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
        this.application.destroy({ removeView: true }, { children: true, texture: false });
      } catch {
        // Fallback defensivo em ambientes de teste sem WebGL
      }
      this.application = null;
    }

    this.containerElement = null;
    this.initialized = false;
  }
}

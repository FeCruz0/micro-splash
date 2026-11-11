/**
 * Gerenciador de Spritesheets, Atlas de Texturas e Animações — Micro Splash (PixiJS v8)
 *
 * Fornece particionamento determinístico de atlas e spritesheets em sub-texturas (frames),
 * eliminando a repetição em mosaico ("tiling horizontal quebrado") de texturas de fauna marinha.
 * Suporta animações em loop com controle de taxa de quadros e integração direta com o PixiRenderTicker.
 */

import { Assets, Rectangle, Texture } from "pixi.js";
import type { ISpriteNode } from "../contracts/INTERFACE_CONTRACTS";

export interface SpriteAtlasAnimationConfiguration {
  readonly frameStart?: number;
  readonly frameEnd?: number;
  readonly from?: number;
  readonly to?: number;
  readonly loop?: boolean;
  readonly speed?: number;
}

export interface SpriteAtlasDescriptorConfiguration {
  readonly assetAlias: string;
  readonly assetPath: string;
  readonly sliceCountX: number;
  readonly sliceCountY: number;
  readonly nominalFrameWidth?: number;
  readonly nominalFrameHeight?: number;
  readonly animations: Record<string, number | SpriteAtlasAnimationConfiguration>;
}

/**
 * Controlador de ciclo de vida de animação de nós de sprites PixiJS v8.
 */
export class SpriteAnimationController {
  private readonly targetSpriteNode: ISpriteNode;
  private readonly cachedFrameTextures: readonly Texture[];
  private readonly animationConfigurations: Record<
    string,
    number | SpriteAtlasAnimationConfiguration
  >;
  private activeAnimationName: string | null = null;
  private currentFrameIndex: number = 0;
  private animationElapsedTimeInSeconds: number = 0;
  private isPlaybackActive: boolean = false;

  constructor(
    targetSpriteNode: ISpriteNode,
    cachedFrameTextures: readonly Texture[],
    animationConfigurations: Record<string, number | SpriteAtlasAnimationConfiguration>,
    initialAnimationName?: string
  ) {
    this.targetSpriteNode = targetSpriteNode;
    this.cachedFrameTextures = cachedFrameTextures;
    this.animationConfigurations = animationConfigurations;

    if (initialAnimationName && initialAnimationName in this.animationConfigurations) {
      this.play(initialAnimationName);
    } else if (this.cachedFrameTextures.length > 0) {
      this.setFrame(0);
    }
  }

  public play(animationName: string): void {
    const animationConfig = this.animationConfigurations[animationName];
    if (animationConfig === undefined) {
      return;
    }

    this.activeAnimationName = animationName;
    this.animationElapsedTimeInSeconds = 0;
    this.isPlaybackActive = true;

    if (typeof animationConfig === "number") {
      this.setFrame(animationConfig);
      this.isPlaybackActive = false;
      return;
    }

    const startFrame = animationConfig.from ?? animationConfig.frameStart ?? 0;
    this.setFrame(startFrame);
  }

  public stop(): void {
    this.isPlaybackActive = false;
  }

  public getFrame(): number {
    return this.currentFrameIndex;
  }

  public setFrame(frameIndex: number): void {
    if (this.cachedFrameTextures.length === 0) {
      return;
    }

    const boundedFrameIndex = Math.max(
      0,
      Math.min(this.cachedFrameTextures.length - 1, Math.floor(frameIndex))
    );
    this.currentFrameIndex = boundedFrameIndex;

    const frameTexture = this.cachedFrameTextures[boundedFrameIndex];
    if (frameTexture && typeof this.targetSpriteNode.setTexture === "function") {
      this.targetSpriteNode.setTexture(frameTexture);
    }
  }

  public getCurrentAnimationName(): string | null {
    return this.activeAnimationName;
  }

  public update(deltaTimeInSeconds: number): void {
    if (!this.isPlaybackActive || !this.activeAnimationName) {
      return;
    }

    const animationConfig = this.animationConfigurations[this.activeAnimationName];
    if (typeof animationConfig !== "object" || animationConfig === null) {
      return;
    }

    const startFrame = animationConfig.from ?? animationConfig.frameStart ?? 0;
    const endFrame = animationConfig.to ?? animationConfig.frameEnd ?? startFrame;
    const playbackSpeed = animationConfig.speed ?? 8;
    const isLooping = animationConfig.loop !== false;
    const frameRangeCount = Math.max(1, endFrame - startFrame + 1);

    this.animationElapsedTimeInSeconds += Math.max(0, deltaTimeInSeconds);
    const accumulatedFrames = Math.floor(this.animationElapsedTimeInSeconds * playbackSpeed);

    if (isLooping) {
      const calculatedFrameOffset = accumulatedFrames % frameRangeCount;
      this.setFrame(startFrame + calculatedFrameOffset);
    } else {
      const calculatedFrameOffset = Math.min(frameRangeCount - 1, accumulatedFrames);
      this.setFrame(startFrame + calculatedFrameOffset);
      if (calculatedFrameOffset >= frameRangeCount - 1) {
        this.isPlaybackActive = false;
      }
    }
  }
}

/**
 * Gerenciador central de particionamento e cache de atlas de sprites.
 */
export class SpriteSheetManager {
  private readonly registeredDescriptorsMap = new Map<string, SpriteAtlasDescriptorConfiguration>();
  private readonly slicedAtlasFramesCache = new Map<string, Texture[]>();

  constructor() {
    this.registerDefaultFaunaDescriptors();
  }

  private registerDefaultFaunaDescriptors(): void {
    this.registerAtlasDescriptor({
      assetAlias: "baleia",
      assetPath: "/sprites/whale.png",
      sliceCountX: 16,
      sliceCountY: 1,
      nominalFrameWidth: 128,
      nominalFrameHeight: 64,
      animations: {
        glide: 0,
        idle_swim: { frameStart: 1, frameEnd: 4, from: 1, to: 4, loop: true, speed: 4 },
        stroke_down: { frameStart: 5, frameEnd: 9, from: 5, to: 9, speed: 14 },
        stroke_up: { frameStart: 10, frameEnd: 13, from: 10, to: 13, speed: 12 },
        swim: { frameStart: 5, frameEnd: 13, from: 5, to: 13, loop: true, speed: 10 },
        feed: { frameStart: 14, frameEnd: 15, from: 14, to: 15, loop: true, speed: 6 },
      },
    });

    this.registerAtlasDescriptor({
      assetAlias: "orca_bg",
      assetPath: "/sprites/orca_bg.png",
      sliceCountX: 4,
      sliceCountY: 1,
      nominalFrameWidth: 110,
      nominalFrameHeight: 55,
      animations: {
        swim: { frameStart: 0, frameEnd: 3, from: 0, to: 3, loop: true, speed: 5 },
      },
    });

    this.registerAtlasDescriptor({
      assetAlias: "jubarte_bg",
      assetPath: "/sprites/humpback_bg.png",
      sliceCountX: 4,
      sliceCountY: 1,
      nominalFrameWidth: 128,
      nominalFrameHeight: 64,
      animations: {
        swim: { frameStart: 0, frameEnd: 3, from: 0, to: 3, loop: true, speed: 3.2 },
      },
    });

    this.registerAtlasDescriptor({
      assetAlias: "cachalote_bg",
      assetPath: "/sprites/cachalote_bg.png",
      sliceCountX: 4,
      sliceCountY: 1,
      nominalFrameWidth: 130,
      nominalFrameHeight: 65,
      animations: {
        swim: { frameStart: 0, frameEnd: 3, from: 0, to: 3, loop: true, speed: 2.4 },
      },
    });
  }

  public registerAtlasDescriptor(descriptor: SpriteAtlasDescriptorConfiguration): void {
    this.registeredDescriptorsMap.set(descriptor.assetAlias, descriptor);
  }

  public hasAtlasDescriptor(assetAlias: string): boolean {
    return this.registeredDescriptorsMap.has(assetAlias);
  }

  public getAtlasDescriptor(assetAlias: string): SpriteAtlasDescriptorConfiguration | undefined {
    return this.registeredDescriptorsMap.get(assetAlias);
  }

  public sliceAtlasTexture(assetAlias: string, baseTexture: Texture): Texture[] {
    const sourcePixelWidth = baseTexture.source?.width ?? 0;
    const sourcePixelHeight = baseTexture.source?.height ?? 0;

    const cachedFrames = this.slicedAtlasFramesCache.get(assetAlias);
    if (cachedFrames && cachedFrames.length > 0) {
      const firstFrame = cachedFrames[0];
      const isProvisional =
        firstFrame.frame.width <= 1 || (sourcePixelWidth > 1 && firstFrame.source.width <= 1);
      if (!isProvisional) {
        return cachedFrames;
      }
    }

    const descriptor = this.registeredDescriptorsMap.get(assetAlias);
    if (!descriptor) {
      return [baseTexture];
    }

    const sliceCountX = Math.max(1, descriptor.sliceCountX);
    const sliceCountY = Math.max(1, descriptor.sliceCountY);
    const totalFrameCount = sliceCountX * sliceCountY;

    const framePixelWidth =
      sourcePixelWidth > 1 ? sourcePixelWidth / sliceCountX : (descriptor.nominalFrameWidth ?? 128);
    const framePixelHeight =
      sourcePixelHeight > 1
        ? sourcePixelHeight / sliceCountY
        : (descriptor.nominalFrameHeight ?? 64);

    const generatedFrameTextures: Texture[] = [];

    for (let frameIndex = 0; frameIndex < totalFrameCount; frameIndex++) {
      const columnCoordinate = frameIndex % sliceCountX;
      const rowCoordinate = Math.floor(frameIndex / sliceCountX);

      const frameRectangle = new Rectangle(
        columnCoordinate * framePixelWidth,
        rowCoordinate * framePixelHeight,
        framePixelWidth,
        framePixelHeight
      );

      try {
        const individualFrameTexture = new Texture({
          source: baseTexture.source,
          frame: frameRectangle,
        });
        generatedFrameTextures.push(individualFrameTexture);
      } catch {
        generatedFrameTextures.push(baseTexture);
      }
    }

    if (sourcePixelWidth <= 1 && baseTexture.source) {
      const textureSourceEventEmitter = baseTexture.source as unknown as {
        once?: (eventName: string, eventCallback: () => void) => void;
      };
      if (typeof textureSourceEventEmitter.once === "function") {
        textureSourceEventEmitter.once("update", () => {
          this.slicedAtlasFramesCache.delete(assetAlias);
          this.sliceAtlasTexture(assetAlias, baseTexture);
        });
      }
    }

    this.slicedAtlasFramesCache.set(assetAlias, generatedFrameTextures);
    return generatedFrameTextures;
  }

  public getFrameTexture(assetAlias: string, frameIndex: number = 0): Texture | null {
    const cachedFrames = this.slicedAtlasFramesCache.get(assetAlias);
    if (cachedFrames && cachedFrames.length > 0) {
      const firstFrame = cachedFrames[0];
      if (firstFrame.frame.width > 1) {
        const clampedIndex = Math.max(0, Math.min(cachedFrames.length - 1, frameIndex));
        return cachedFrames[clampedIndex] ?? null;
      }
    }

    if (!this.hasAtlasDescriptor(assetAlias)) {
      return null;
    }

    try {
      let baseTexture: Texture | null = null;
      if (Assets.cache.has(assetAlias)) {
        baseTexture = Assets.get(assetAlias);
      }
      if (!baseTexture) {
        baseTexture = Texture.from(assetAlias);
      }
      const newlySlicedFrames = this.sliceAtlasTexture(assetAlias, baseTexture);
      const clampedIndex = Math.max(0, Math.min(newlySlicedFrames.length - 1, frameIndex));
      return newlySlicedFrames[clampedIndex] ?? null;
    } catch {
      return null;
    }
  }

  public createAnimationController(
    targetSpriteNode: ISpriteNode,
    assetAlias: string,
    initialAnimationName?: string
  ): SpriteAnimationController | null {
    const descriptor = this.registeredDescriptorsMap.get(assetAlias);
    if (!descriptor) {
      return null;
    }

    let frames = this.slicedAtlasFramesCache.get(assetAlias);
    if (!frames || frames.length === 0 || frames[0].frame.width <= 1) {
      try {
        let baseTexture: Texture | null = null;
        if (Assets.cache.has(assetAlias)) {
          baseTexture = Assets.get(assetAlias);
        }
        if (!baseTexture) {
          baseTexture = Texture.from(assetAlias);
        }
        frames = this.sliceAtlasTexture(assetAlias, baseTexture);
      } catch {
        frames = [];
      }
    }

    return new SpriteAnimationController(
      targetSpriteNode,
      frames,
      descriptor.animations,
      initialAnimationName
    );
  }

  public clearCache(): void {
    this.slicedAtlasFramesCache.clear();
  }
}

let activeSpriteSheetManagerInstance: SpriteSheetManager | null = null;

export function getSpriteSheetManager(): SpriteSheetManager {
  if (!activeSpriteSheetManagerInstance) {
    activeSpriteSheetManagerInstance = new SpriteSheetManager();
  }
  return activeSpriteSheetManagerInstance;
}

export function setSpriteSheetManager(managerInstance: SpriteSheetManager | null): void {
  activeSpriteSheetManagerInstance = managerInstance;
}

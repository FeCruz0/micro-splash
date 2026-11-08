/**
 * Carregador Unificado de Recursos e Texturas — Micro Splash (PixiJS v8)
 *
 * Substitui os callbacks legados de loadSprite pelo pipeline moderno de Assets do PixiJS v8.
 * Gerencia o ciclo assíncrono de carregamento determinístico de fontes, manifestos e atlas de fauna,
 * com cache de texturas e monitoramento de progresso unificado.
 */

import { Assets, type Texture } from "pixi.js";
import { getSpriteSheetManager } from "../engine/adapters/SpriteSheetManager";

export interface FontLoadOptions {
  readonly fontSize?: number;
  readonly textureFilter?: "linear" | "nearest" | string;
  readonly size?: number;
  readonly filter?: "linear" | "nearest" | string;
}

export interface SpriteAnimationDescriptor {
  readonly frameStart?: number;
  readonly frameEnd?: number;
  readonly from?: number;
  readonly to?: number;
  readonly loop?: boolean;
  readonly speed?: number;
}

export interface SpriteAtlasDescriptor {
  readonly assetAlias: string;
  readonly assetPath: string;
  readonly sliceCountX: number;
  readonly sliceCountY: number;
  readonly animations: Record<string, number | SpriteAnimationDescriptor>;
}

export type SpriteAnimOptions = SpriteAnimationDescriptor;

export interface SpriteLoadOptions {
  readonly sliceCountX?: number;
  readonly sliceCountY?: number;
  readonly sliceX?: number;
  readonly sliceY?: number;
  readonly animations?: Record<string, number | SpriteAnimationDescriptor>;
  readonly anims?: Record<string, number | SpriteAnimationDescriptor>;
}

export interface AssetLoaderEngineContext {
  loadFont?(fontName: string, fontSource: string, options?: FontLoadOptions): unknown;
  loadSprite?(spriteName: string, spriteSource: string, options?: SpriteLoadOptions): unknown;
}

export function getAssetPath(relativePath: string): string {
  const baseDirectory =
    typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : "/";
  const sanitizedBaseDirectory = baseDirectory.endsWith("/") ? baseDirectory : `${baseDirectory}/`;
  const sanitizedRelativePath = relativePath.startsWith("/")
    ? relativePath.slice(1)
    : relativePath;
  return `${sanitizedBaseDirectory}${sanitizedRelativePath}`;
}

/**
 * Descritores determinísticos de sprites e atlas de fauna marinha.
 */
export const FAUNA_SPRITE_DESCRIPTORS: Record<string, SpriteAtlasDescriptor> = {
  baleia: {
    assetAlias: "baleia",
    assetPath: getAssetPath("/sprites/whale.png"),
    sliceCountX: 16,
    sliceCountY: 1,
    animations: {
      glide: 0,
      idle_swim: { frameStart: 1, frameEnd: 4, from: 1, to: 4, loop: true, speed: 4 },
      stroke_down: { frameStart: 5, frameEnd: 9, from: 5, to: 9, speed: 14 },
      stroke_up: { frameStart: 10, frameEnd: 13, from: 10, to: 13, speed: 12 },
      swim: { frameStart: 5, frameEnd: 13, from: 5, to: 13, loop: true, speed: 10 },
      feed: { frameStart: 14, frameEnd: 15, from: 14, to: 15, loop: true, speed: 6 },
    },
  },
  orca_bg: {
    assetAlias: "orca_bg",
    assetPath: getAssetPath("/sprites/orca_bg.png"),
    sliceCountX: 4,
    sliceCountY: 1,
    animations: {
      swim: { frameStart: 0, frameEnd: 3, from: 0, to: 3, loop: true, speed: 5 },
    },
  },
  jubarte_bg: {
    assetAlias: "jubarte_bg",
    assetPath: getAssetPath("/sprites/humpback_bg.png"),
    sliceCountX: 4,
    sliceCountY: 1,
    animations: {
      swim: { frameStart: 0, frameEnd: 3, from: 0, to: 3, loop: true, speed: 3.2 },
    },
  },
  cachalote_bg: {
    assetAlias: "cachalote_bg",
    assetPath: getAssetPath("/sprites/cachalote_bg.png"),
    sliceCountX: 4,
    sliceCountY: 1,
    animations: {
      swim: { frameStart: 0, frameEnd: 3, from: 0, to: 3, loop: true, speed: 2.4 },
    },
  },
};

/**
 * Gerenciador centralizado de recursos PixiJS v8.
 */
export class AssetLoaderManager {
  private readonly textureAssetCache: Map<string, Texture> = new Map<string, Texture>();
  private readonly loadingProgressRatios: Map<string, number> = new Map<string, number>();
  private isBundleRegistrationCompleted: boolean = false;

  public registerAssetBundles(): void {
    if (this.isBundleRegistrationCompleted) {
      return;
    }

    Assets.addBundle("fonts", {
      Inter: getAssetPath("/fonts/Inter-SemiBold.ttf"),
      Outfit: getAssetPath("/fonts/Outfit-Bold.ttf"),
      Orbitron: getAssetPath("/fonts/Orbitron-Bold.ttf"),
    });

    Assets.addBundle("sprites", {
      baleia: getAssetPath("/sprites/whale.png"),
      orca_bg: getAssetPath("/sprites/orca_bg.png"),
      jubarte_bg: getAssetPath("/sprites/humpback_bg.png"),
      cachalote_bg: getAssetPath("/sprites/cachalote_bg.png"),
    });

    Assets.addBundle("manifests", {
      fauna_manifest: getAssetPath("/sprites/fauna_manifest.json"),
      facts: getAssetPath("/data/facts.json"),
      quiz: getAssetPath("/data/quiz.json"),
    });

    this.isBundleRegistrationCompleted = true;
  }

  public async loadAssetBundle(
    bundleIdentifier: string,
    onProgress?: (loadingProgressRatio: number) => void
  ): Promise<Record<string, unknown>> {
    this.registerAssetBundles();

    try {
      const loadedAssets = await Assets.loadBundle(
        bundleIdentifier,
        (progressRatio: number) => {
          this.loadingProgressRatios.set(bundleIdentifier, progressRatio);
          onProgress?.(progressRatio);
        }
      );

      if (loadedAssets && typeof loadedAssets === "object") {
        for (const [assetAlias, assetValue] of Object.entries(loadedAssets)) {
          if (assetValue && typeof assetValue === "object" && "source" in assetValue) {
            this.textureAssetCache.set(assetAlias, assetValue as Texture);
          }
        }
      }

      this.loadingProgressRatios.set(bundleIdentifier, 1);
      return (loadedAssets as Record<string, unknown>) ?? {};
    } catch {
      // Degradação segura para ambientes de testes sem suporte a fetch ou WebGL
      return {};
    }
  }

  public async loadIndividualAsset<T = unknown>(
    assetAlias: string,
    assetSource: string,
    onProgress?: (loadingProgressRatio: number) => void
  ): Promise<T | undefined> {
    try {
      const loadedAsset = (await Assets.load(
        { alias: assetAlias, src: assetSource },
        onProgress
      )) as T;

      if (loadedAsset && typeof loadedAsset === "object" && "source" in loadedAsset) {
        this.textureAssetCache.set(assetAlias, loadedAsset as unknown as Texture);
      }

      return loadedAsset;
    } catch {
      return undefined;
    }
  }

  public async loadFontsBundle(
    engineContext?: AssetLoaderEngineContext,
    onProgress?: (loadingProgressRatio: number) => void
  ): Promise<void> {
    this.registerAssetBundles();

    if (engineContext && typeof engineContext.loadFont === "function") {
      engineContext.loadFont("Inter", getAssetPath("/fonts/Inter-SemiBold.ttf"), {
        size: 64,
        filter: "linear",
      });
      engineContext.loadFont("Outfit", getAssetPath("/fonts/Outfit-Bold.ttf"), {
        size: 64,
        filter: "linear",
      });
      engineContext.loadFont("Orbitron", getAssetPath("/fonts/Orbitron-Bold.ttf"), {
        size: 64,
        filter: "linear",
      });
    }

    await this.loadAssetBundle("fonts", onProgress);
  }

  public async loadSpritesBundle(
    engineContext?: AssetLoaderEngineContext,
    onProgress?: (loadingProgressRatio: number) => void
  ): Promise<void> {
    this.registerAssetBundles();

    if (engineContext && typeof engineContext.loadSprite === "function") {
      for (const descriptor of Object.values(FAUNA_SPRITE_DESCRIPTORS)) {
        engineContext.loadSprite(descriptor.assetAlias, descriptor.assetPath, {
          sliceX: descriptor.sliceCountX,
          sliceY: descriptor.sliceCountY,
          anims: descriptor.animations,
        });
      }
    }

    await this.loadAssetBundle("sprites", onProgress);

    const spriteSheetManager = getSpriteSheetManager();
    for (const descriptor of Object.values(FAUNA_SPRITE_DESCRIPTORS)) {
      const loadedTexture = this.getLoadedTexture(descriptor.assetAlias);
      if (loadedTexture) {
        spriteSheetManager.sliceAtlasTexture(descriptor.assetAlias, loadedTexture);
      }
    }
  }

  public async loadManifestsBundle(
    onProgress?: (loadingProgressRatio: number) => void
  ): Promise<Record<string, unknown>> {
    return this.loadAssetBundle("manifests", onProgress);
  }

  public async loadAllGameAssets(
    engineContext?: AssetLoaderEngineContext,
    onProgress?: (loadingProgressRatio: number) => void
  ): Promise<void> {
    this.registerAssetBundles();

    let completedBundlesCount = 0;
    const totalBundlesCount = 3;

    const reportAggregatedProgress = (bundleProgressRatio: number) => {
      const overallRatio = (completedBundlesCount + bundleProgressRatio) / totalBundlesCount;
      onProgress?.(Math.min(1, Math.max(0, overallRatio)));
    };

    await this.loadManifestsBundle((progressRatio) => reportAggregatedProgress(progressRatio));
    completedBundlesCount = 1;

    await this.loadFontsBundle(engineContext, (progressRatio) =>
      reportAggregatedProgress(progressRatio)
    );
    completedBundlesCount = 2;

    await this.loadSpritesBundle(engineContext, (progressRatio) =>
      reportAggregatedProgress(progressRatio)
    );
    completedBundlesCount = 3;

    onProgress?.(1);
  }

  public getLoadedTexture(assetAlias: string): Texture | undefined {
    if (this.textureAssetCache.has(assetAlias)) {
      return this.textureAssetCache.get(assetAlias);
    }
    if (Assets.cache.has(assetAlias)) {
      return Assets.cache.get(assetAlias) as Texture;
    }
    return undefined;
  }

  public hasLoadedTexture(assetAlias: string): boolean {
    return this.textureAssetCache.has(assetAlias) || Assets.cache.has(assetAlias);
  }

  public getLoadingProgressRatio(bundleIdentifier?: string): number {
    if (bundleIdentifier) {
      return this.loadingProgressRatios.get(bundleIdentifier) ?? 0;
    }
    if (this.loadingProgressRatios.size === 0) {
      return 0;
    }
    let totalProgressSum = 0;
    for (const progressRatio of this.loadingProgressRatios.values()) {
      totalProgressSum += progressRatio;
    }
    return totalProgressSum / this.loadingProgressRatios.size;
  }

  public clearCache(): void {
    this.textureAssetCache.clear();
    this.loadingProgressRatios.clear();
  }
}

export const assetLoaderManager: AssetLoaderManager = new AssetLoaderManager();

export function registerAssetBundles(): void {
  assetLoaderManager.registerAssetBundles();
}

export function loadGameFonts(
  engineContext?: AssetLoaderEngineContext,
  onProgress?: (loadingProgressRatio: number) => void
): Promise<void> {
  return assetLoaderManager.loadFontsBundle(engineContext, onProgress);
}

export function loadGameSprites(
  engineContext?: AssetLoaderEngineContext,
  onProgress?: (loadingProgressRatio: number) => void
): Promise<void> {
  return assetLoaderManager.loadSpritesBundle(engineContext, onProgress);
}

export function loadGameManifests(
  onProgress?: (loadingProgressRatio: number) => void
): Promise<Record<string, unknown>> {
  return assetLoaderManager.loadManifestsBundle(onProgress);
}

export function loadAllGameAssets(
  engineContext?: AssetLoaderEngineContext,
  onProgress?: (loadingProgressRatio: number) => void
): Promise<void> {
  return assetLoaderManager.loadAllGameAssets(engineContext, onProgress);
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Assets } from "pixi.js";
import {
  assetLoaderManager,
  loadAllGameAssets,
  loadGameFonts,
  loadGameSprites,
  loadGameManifests,
  FAUNA_SPRITE_DESCRIPTORS,
  getAssetPath,
} from "../../src/scenes/assetLoader";

describe("Fase 5.2: Carregador Unificado de Recursos e Texturas (PixiJS v8)", () => {
  beforeEach(() => {
    assetLoaderManager.clearCache();
    vi.restoreAllMocks();
  });

  describe("5.2.1 — Registro e Resolução de Caminhos de Assets", () => {
    it("resolve caminhos relativos sanitizando barras duplicadas", () => {
      const pathA = getAssetPath("/sprites/whale.png");
      const pathB = getAssetPath("sprites/whale.png");

      expect(pathA).toBe(pathB);
      expect(pathA.endsWith("sprites/whale.png")).toBe(true);
    });

    it("contém descritores determinísticos de fauna com fatiamento e animações válidas", () => {
      expect(FAUNA_SPRITE_DESCRIPTORS).toHaveProperty("baleia");
      expect(FAUNA_SPRITE_DESCRIPTORS).toHaveProperty("orca_bg");
      expect(FAUNA_SPRITE_DESCRIPTORS).toHaveProperty("jubarte_bg");
      expect(FAUNA_SPRITE_DESCRIPTORS).toHaveProperty("cachalote_bg");

      const whaleDescriptor = FAUNA_SPRITE_DESCRIPTORS.baleia;
      expect(whaleDescriptor.sliceCountX).toBe(16);
      expect(whaleDescriptor.sliceCountY).toBe(1);
      expect(whaleDescriptor.animations).toHaveProperty("idle_swim");
      expect(whaleDescriptor.animations).toHaveProperty("swim");
    });
  });

  describe("5.2.2 — Integração com PIXI.Assets e Bundles Assíncronos", () => {
    it("registra os bundles de fontes, sprites e manifestos no PixiJS Assets", () => {
      const addBundleSpy = vi.spyOn(Assets, "addBundle");

      assetLoaderManager.registerAssetBundles();

      expect(addBundleSpy).toHaveBeenCalledWith("fonts", expect.any(Object));
      expect(addBundleSpy).toHaveBeenCalledWith("sprites", expect.any(Object));
      expect(addBundleSpy).toHaveBeenCalledWith("manifests", expect.any(Object));
    });

    it("executa loadAssetBundle e propaga o progresso para o callback fornecido", async () => {
      const progressSteps: number[] = [];
      const mockBundleResult = {
        test_texture: { source: {} },
      };

      vi.spyOn(Assets, "loadBundle").mockImplementation(
        async (_bundleIds: string | string[], onProgress?: (ratio: number) => void) => {
          onProgress?.(0.5);
          onProgress?.(1.0);
          return mockBundleResult as any;
        }
      );

      const result = await assetLoaderManager.loadAssetBundle("test_bundle", (progressRatio) => {
        progressSteps.push(progressRatio);
      });

      expect(result).toEqual(mockBundleResult);
      expect(progressSteps).toContain(0.5);
      expect(progressSteps).toContain(1.0);
      expect(assetLoaderManager.getLoadingProgressRatio("test_bundle")).toBe(1);
    });

    it("armazena texturas carregadas no cache determinístico e as expõe via getLoadedTexture", async () => {
      const mockWhaleTexture = { source: { label: "whale_source" } };

      vi.spyOn(Assets, "loadBundle").mockResolvedValue({
        baleia: mockWhaleTexture,
      } as any);

      await assetLoaderManager.loadAssetBundle("sprites");

      expect(assetLoaderManager.hasLoadedTexture("baleia")).toBe(true);
      expect(assetLoaderManager.getLoadedTexture("baleia")).toBe(mockWhaleTexture as any);
    });
  });

  describe("5.2.3 — Funções de Carregamento Modular de Jogo", () => {
    it("loadGameFonts executa o bundle de fontes e suporta chamadas legadas com engineContext", async () => {
      const mockEngineContext = {
        loadFont: vi.fn(),
      };

      vi.spyOn(Assets, "loadBundle").mockResolvedValue({});

      await loadGameFonts(mockEngineContext);

      expect(mockEngineContext.loadFont).toHaveBeenCalledWith("Inter", expect.any(String), expect.any(Object));
      expect(mockEngineContext.loadFont).toHaveBeenCalledWith("Outfit", expect.any(String), expect.any(Object));
      expect(mockEngineContext.loadFont).toHaveBeenCalledWith("Orbitron", expect.any(String), expect.any(Object));
    });

    it("loadGameSprites executa o bundle de sprites e despacha descritores para o engineContext", async () => {
      const mockEngineContext = {
        loadSprite: vi.fn(),
      };

      vi.spyOn(Assets, "loadBundle").mockResolvedValue({});

      await loadGameSprites(mockEngineContext);

      expect(mockEngineContext.loadSprite).toHaveBeenCalledWith("baleia", expect.any(String), expect.any(Object));
      expect(mockEngineContext.loadSprite).toHaveBeenCalledWith("orca_bg", expect.any(String), expect.any(Object));
      expect(mockEngineContext.loadSprite).toHaveBeenCalledWith("jubarte_bg", expect.any(String), expect.any(Object));
      expect(mockEngineContext.loadSprite).toHaveBeenCalledWith("cachalote_bg", expect.any(String), expect.any(Object));
    });

    it("loadGameManifests carrega e retorna os manifestos de fauna, fatos e quiz", async () => {
      const mockManifests = {
        fauna_manifest: { orca_bg: { sliceX: 4 } },
        facts: [{ id: 1 }],
        quiz: [{ id: "q1" }],
      };

      vi.spyOn(Assets, "loadBundle").mockResolvedValue(mockManifests as any);

      const result = await loadGameManifests();

      expect(result).toEqual(mockManifests);
    });

    it("loadAllGameAssets orquestra o carregamento de todos os bundles agregando o progresso total até 1.0", async () => {
      const aggregatedProgressSteps: number[] = [];

      vi.spyOn(Assets, "loadBundle").mockImplementation(
        async (_bundleIds: string | string[], onProgress?: (ratio: number) => void) => {
          onProgress?.(1.0);
          return {};
        }
      );

      await loadAllGameAssets(undefined, (overallProgressRatio) => {
        aggregatedProgressSteps.push(overallProgressRatio);
      });

      expect(aggregatedProgressSteps.length).toBeGreaterThanOrEqual(3);
      expect(aggregatedProgressSteps[aggregatedProgressSteps.length - 1]).toBe(1.0);
    });
  });
});

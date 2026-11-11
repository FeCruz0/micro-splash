import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "pixi.js";
import {
  PixiContainerNode,
  PixiGraphicsNode,
  PixiSpriteNode,
  PixiTextNode,
} from "../../src/engine/adapters/PixiNodes";
import {
  resolveScreenRenderContainer,
  resolveWorldRenderContainer,
} from "../../src/engine/adapters/RenderEngineAdapter";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { SpriteSheetManager } from "../../src/engine/adapters/SpriteSheetManager";
import { SceneManager } from "../../src/engine/SceneManager";
import type {
  ColorRepresentation,
  IRenderEngine,
  IRenderNode,
  IRenderTicker,
  TextStyleOptions,
  Vector2D,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import { setupBenthicFloorSystem } from "../../src/systems/benthicFloorSystem";

function createTestRenderEngineHarness() {
  const stageRoot = new PixiContainerNode(undefined, "stage_root");
  const worldContainer = new PixiContainerNode(undefined, "world_container");
  const screenContainer = new PixiContainerNode(undefined, "screen_container");
  stageRoot.addChild(worldContainer);
  stageRoot.addChild(screenContainer);

  const tickerListeners: Array<(deltaTimeInSeconds: number) => void> = [];
  let cameraPosition: Vector2D = { x: 640, y: 360 };
  const setBackgroundSpy = vi.fn();

  const renderTicker: IRenderTicker = {
    add(callback: (deltaTimeInSeconds: number) => void): () => void {
      tickerListeners.push(callback);
      return () => {
        const index = tickerListeners.indexOf(callback);
        if (index !== -1) {
          tickerListeners.splice(index, 1);
        }
      };
    },
    start: vi.fn(),
    stop: vi.fn(),
    getFPS: () => 60,
    getDeltaTime: () => 1 / 60,
  };

  const createdGraphicsNodes: PixiGraphicsNode[] = [];
  const createdSpriteNodes: PixiSpriteNode[] = [];
  const createdTextNodes: PixiTextNode[] = [];

  const renderEngine: IRenderEngine = {
    isInitialized: true,
    init: async () => undefined,
    destroy: () => undefined,
    resize: () => undefined,
    getDimensions: () => ({ width: 1280, height: 720 }),
    getCanvas: () => null,
    getStageRoot: () => stageRoot,
    getWorldContainer: () => worldContainer,
    getScreenContainer: () => screenContainer,
    getCameraPosition: () => cameraPosition,
    setCameraPosition: (cameraPositionX: number, cameraPositionY: number) => {
      cameraPosition = { x: cameraPositionX, y: cameraPositionY };
    },
    setBackground: (color: ColorRepresentation) => {
      setBackgroundSpy(color);
    },
    shake: () => undefined,
    getTicker: () => renderTicker,
    createContainer: (identifier?: string) => new PixiContainerNode(undefined, identifier),
    createSprite: (_textureOrIdentifier: string | unknown, identifier?: string) => {
      const spriteNode = new PixiSpriteNode(undefined, "white", identifier);
      createdSpriteNodes.push(spriteNode);
      return spriteNode;
    },
    createGraphics: (identifier?: string) => {
      const graphicsNode = new PixiGraphicsNode(undefined, identifier);
      createdGraphicsNodes.push(graphicsNode);
      return graphicsNode;
    },
    createText: (content: string, style?: TextStyleOptions, identifier?: string) => {
      const textNode = new PixiTextNode(content, style, identifier);
      createdTextNodes.push(textNode);
      return textNode;
    },
  };

  return {
    renderEngine,
    stageRoot,
    worldContainer,
    screenContainer,
    setBackgroundSpy,
    createdGraphicsNodes,
    createdSpriteNodes,
    createdTextNodes,
    stepTicker: (deltaTimeInSeconds: number) => {
      for (const listener of [...tickerListeners]) {
        listener(deltaTimeInSeconds);
      }
    },
  };
}

describe("Fases 3, 4 e 5: Hierarquia Z, RenderingContext (Opacity/Color/Background), Bento & Proporções", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("PixiContainerNode.addChild ordena filhos por zIndex quando setZIndex ocorre antes de addChild", () => {
    const parentContainer = new PixiContainerNode(undefined, "world_container");
    const foregroundIce = new PixiContainerNode(undefined, "ice_block");
    const backgroundCloud = new PixiContainerNode(undefined, "sky_cloud");

    foregroundIce.setZIndex(10);
    backgroundCloud.setZIndex(-8);

    parentContainer.addChild(foregroundIce);
    parentContainer.addChild(backgroundCloud);

    const nativeChildren = parentContainer.getNativeNode<Container>().children;
    expect(nativeChildren[0]).toBe(backgroundCloud.getNativeNode());
    expect(nativeChildren[1]).toBe(foregroundIce.getNativeNode());
  });

  it("RenderingContext preserva gráficos de opacity(0) visíveis ao subir opacidade depois e aplica color/tint dinamicamente", () => {
    const harness = createTestRenderEngineHarness();
    const sceneManager = new SceneManager();
    const renderingContext = createRenderingContext(harness.renderEngine, sceneManager);

    const fadeableRect = renderingContext.add([
      renderingContext.rect(100, 40),
      renderingContext.pos(20, 30),
      renderingContext.color(10, 20, 30),
      renderingContext.opacity(0),
      renderingContext.z(-5),
    ]) as {
      opacity: number;
      color: [number, number, number];
      renderNode?: PixiGraphicsNode;
    };

    const rectGraphicsNode = harness.createdGraphicsNodes[0];
    expect(rectGraphicsNode).toBeDefined();
    expect(rectGraphicsNode.getOpacity()).toBe(0);

    // Subir opacidade depois deve tornar o Graphics realmente opaco (alpha de preenchimento = 1)
    fadeableRect.opacity = 0.8;
    expect(rectGraphicsNode.getOpacity()).toBeCloseTo(0.8, 3);

    // Alterar cor em tempo real dispara redesenho no IGraphicsNode com nova cor (ex.: skyBand/oceanFloor)
    const drawRectSpy = vi.spyOn(rectGraphicsNode, "drawRect");
    fadeableRect.color = renderingContext.rgb(255, 140, 80) as unknown as [number, number, number];
    expect(drawRectSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Number),
      100,
      40,
      expect.objectContaining({
        fill: expect.objectContaining({ color: [255, 140, 80], alpha: 1 }),
      })
    );

    // Sprites com color() inicial (ex.: companionWhale) e atribuição dinâmica recebem setTint()
    const tintedSpriteEntity = renderingContext.add([
      renderingContext.sprite("baleia"),
      renderingContext.pos(50, 50),
      renderingContext.color(renderingContext.rgb(160, 215, 255)),
    ]) as { color: unknown };

    const spriteNode = harness.createdSpriteNodes[0];
    expect(spriteNode.getTint()).toEqual([160, 215, 255]);

    tintedSpriteEntity.color = { r: 200, g: 220, b: 255 };
    expect(spriteNode.getTint()).toEqual([200, 220, 255]);

    // setBackground aceita tuplas e objetos { r, g, b }
    renderingContext.setBackground?.([18, 44, 92]);
    renderingContext.setBackground?.({ r: 30, g: 60, b: 110 });
    expect(harness.setBackgroundSpy).toHaveBeenNthCalledWith(1, [18, 44, 92]);
    expect(harness.setBackgroundSpy).toHaveBeenNthCalledWith(2, [30, 60, 110]);
  });

  it("benthicFloorSystem usa worldContainer (nunca stageRoot), converte graus para radianos e faz culling completo dos nós", () => {
    const harness = createTestRenderEngineHarness();
    setupBenthicFloorSystem(harness.renderEngine);

    // Nenhum elemento bento novo deve ir direto ao stageRoot (além de worldContainer e screenContainer)
    expect(harness.stageRoot.getChildren().length).toBe(2);
    expect(harness.worldContainer.getChildren().length).toBeGreaterThan(0);

    // Primeira kelp (baseX = 250) cria 6 pares (caule + folha) = 12 nós iniciais
    const firstPlantNodes = harness.createdGraphicsNodes.slice(0, 12);
    const firstStem = firstPlantNodes[0];
    const firstLeaf = firstPlantNodes[1];
    expect(firstStem.getZIndex()).toBe(-3);
    expect(harness.createdGraphicsNodes[2].getZIndex()).toBe(-3);
    expect(firstLeaf.getZIndex()).toBe(-3);
    // Folha inicial tem 25 graus (~0.436 rad), jamais ~25 radianos
    expect(firstLeaf.getRotation()).toBeCloseTo((25 * Math.PI) / 180, 4);

    // Simula frame dentro do frustum (câmera próxima de x=300) e verifica preservação do offset da folha e ângulo em radianos
    harness.renderEngine.setCameraPosition(300, 360);
    harness.stepTicker(0.016);
    expect(Math.abs(firstLeaf.getPosition().x - 250)).toBeGreaterThan(5);
    expect(Math.abs(firstLeaf.getRotation())).toBeLessThan(1.0);

    // Move câmera para x=4000 (ainda < 5500, porém kelp em x=250 fica fora do frustum: 4000-1880=2120) -> todos os 12 nós ocultos
    harness.renderEngine.setCameraPosition(4000, 360);
    harness.stepTicker(0.016);
    for (const node of firstPlantNodes) {
      expect(node.isVisible()).toBe(false);
    }

    // Retorna câmera para perto de x=300 -> todos os 12 nós voltam a ficar visíveis
    harness.renderEngine.setCameraPosition(300, 360);
    harness.stepTicker(0.016);
    for (const node of firstPlantNodes) {
      expect(node.isVisible()).toBe(true);
    }
  });

  it("resolveWorldRenderContainer e resolveScreenRenderContainer fazem fallback para stageRoot em mocks parciais", () => {
    const fallbackStageRoot = new PixiContainerNode(undefined, "mock_stage") as IRenderNode;
    const partialMockEngine = {
      getStageRoot: () => fallbackStageRoot,
    } as unknown as IRenderEngine;

    expect(resolveWorldRenderContainer(partialMockEngine)).toBe(fallbackStageRoot);
    expect(resolveScreenRenderContainer(partialMockEngine)).toBe(fallbackStageRoot);
  });

  it("SpriteSheetManager define dimensões nominais alinhadas aos spritesheets reais (Phase 4)", () => {
    const spriteSheetManager = new SpriteSheetManager();
    expect(spriteSheetManager.getAtlasDescriptor("orca_bg")).toMatchObject({
      nominalFrameWidth: 96,
      nominalFrameHeight: 40,
    });
    expect(spriteSheetManager.getAtlasDescriptor("jubarte_bg")).toMatchObject({
      nominalFrameWidth: 144,
      nominalFrameHeight: 56,
    });
    expect(spriteSheetManager.getAtlasDescriptor("cachalote_bg")).toMatchObject({
      nominalFrameWidth: 192,
      nominalFrameHeight: 64,
    });
  });
});

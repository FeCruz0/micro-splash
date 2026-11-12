import { describe, expect, it, vi } from "vitest";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { createNativePolygonNode } from "../../src/engine/adapters/NativeRenderNodeFactory";
import { SceneManager } from "../../src/engine/SceneManager";
import {
  type IGraphicsNode,
  type IRenderEngine,
  type IRenderNode,
  type IRenderTicker,
  type ISpriteNode,
  type ITextNode,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import { createGameScene, type GameSceneEngineContext } from "../../src/scenes/gameScene";
import { setupBackgroundFaunaSystem } from "../../src/systems/backgroundFauna";
import { setupPenguinFlockSystem } from "../../src/systems/penguinFlockSystem";
import { setupDolphinDraftingSystem } from "../../src/systems/dolphinDraftingSystem";
import { setupOceanCurrentsSystem } from "../../src/systems/oceanCurrentsSystem";
import { createUpwellingStream } from "../../src/systems/upwellingSystem";
import { setupOilSpillSystem } from "../../src/systems/oilSpillSystem";
import { setupCanyonGeometry } from "../../src/systems/canyon/canyonGeometry";
import { createWaterSplash } from "../../src/systems/breachSystem";
import { PresentationModeManager } from "../../src/systems/presentationMode";
import type { PlayerController } from "../../src/entities/player";
import { GAME_CONFIG } from "../../src/config";

interface MockRenderEngineHarness {
  renderEngine: IRenderEngine;
  worldContainer: IRenderNode;
  screenContainer: IRenderNode;
  createdGraphicsNodes: IGraphicsNode[];
  createdSpriteNodes: ISpriteNode[];
  createdTextNodes: ITextNode[];
  createdContainerNodes: IRenderNode[];
  advanceTicker: (deltaTimeInSeconds: number) => void;
}

function createMockNode(identifier: string): IRenderNode {
  const children: IRenderNode[] = [];
  let visibleFlag = true;
  let opacityValue = 1;
  let zIndexValue = 0;
  let rotationRadians = 0;
  let position = { x: 0, y: 0 };
  let scale = { x: 1, y: 1 };

  const node: IRenderNode = {
    id: identifier,
    getPosition: () => position,
    setPosition: vi.fn((x: number, y: number) => {
      position = { x, y };
    }),
    getScale: () => scale,
    setScale: vi.fn((x: number, y: number) => {
      scale = { x, y };
    }),
    getRotation: () => rotationRadians,
    setRotation: vi.fn((angle: number) => {
      rotationRadians = angle;
    }),
    getOpacity: () => opacityValue,
    setOpacity: vi.fn((alpha: number) => {
      opacityValue = alpha;
    }),
    getZIndex: () => zIndexValue,
    setZIndex: vi.fn((index: number) => {
      zIndexValue = index;
    }),
    isVisible: () => visibleFlag,
    setVisible: vi.fn((visible: boolean) => {
      visibleFlag = visible;
    }),
    addChild: vi.fn((child: IRenderNode) => {
      children.push(child);
    }),
    removeChild: vi.fn((child: IRenderNode) => {
      const targetIndex = children.indexOf(child);
      if (targetIndex !== -1) {
        children.splice(targetIndex, 1);
      }
    }),
    getChildren: () => children,
    destroy: vi.fn(),
    getNativeNode: <T = unknown>() => ({}) as T,
  };
  return node;
}

function createMockRenderEngineHarness(): MockRenderEngineHarness {
  const worldContainer = createMockNode("world_container");
  const screenContainer = createMockNode("screen_container");
  const stageRoot = createMockNode("stage_root");
  const tickerListeners: Array<(deltaTimeInSeconds: number) => void> = [];

  const createdGraphicsNodes: IGraphicsNode[] = [];
  const createdSpriteNodes: ISpriteNode[] = [];
  const createdTextNodes: ITextNode[] = [];
  const createdContainerNodes: IRenderNode[] = [];

  const renderTicker: IRenderTicker = {
    add: vi.fn((callback: (deltaTimeInSeconds: number) => void) => {
      tickerListeners.push(callback);
      return () => {
        const index = tickerListeners.indexOf(callback);
        if (index !== -1) {
          tickerListeners.splice(index, 1);
        }
      };
    }),
    start: vi.fn(),
    stop: vi.fn(),
    getFPS: () => 60,
    getDeltaTime: () => 0.016,
  };

  let cameraX = 0;
  let cameraY = 0;

  const renderEngine: IRenderEngine = {
    isInitialized: true,
    init: vi.fn(async () => {}),
    resize: vi.fn(),
    getDimensions: () => ({ width: 1280, height: 720 }),
    getCanvas: () => null,
    getStageRoot: () => stageRoot,
    getWorldContainer: () => worldContainer,
    getScreenContainer: () => screenContainer,
    getCameraPosition: () => ({ x: cameraX, y: cameraY }),
    setCameraPosition: vi.fn((x: number, y: number) => {
      cameraX = x;
      cameraY = y;
    }),
    shake: vi.fn(),
    getTicker: () => renderTicker,
    createContainer: vi.fn((identifier?: string) => {
      const containerNode = createMockNode(identifier ?? "container");
      createdContainerNodes.push(containerNode);
      return containerNode;
    }),
    createSprite: vi.fn((texture: unknown, identifier?: string) => {
      const baseNode = createMockNode(identifier ?? "sprite");
      let textureId = typeof texture === "string" ? texture : "texture";
      let tint: [number, number, number] = [255, 255, 255];
      let anchor = { x: 0, y: 0 };
      const spriteNode: ISpriteNode = {
        ...baseNode,
        getTextureId: () => textureId,
        setTextureId: vi.fn((nextId: string) => {
          textureId = nextId;
        }),
        getAnchor: () => anchor,
        setAnchor: vi.fn((x: number, y: number) => {
          anchor = { x, y };
        }),
        getTint: () => tint,
        setTint: vi.fn((nextTint: unknown) => {
          if (Array.isArray(nextTint) && nextTint.length >= 3) {
            tint = [Number(nextTint[0]), Number(nextTint[1]), Number(nextTint[2])];
          }
        }),
        getWidth: () => 64,
        getHeight: () => 32,
        setSize: vi.fn(),
      };
      createdSpriteNodes.push(spriteNode);
      return spriteNode;
    }),
    createGraphics: vi.fn((identifier?: string) => {
      const baseNode = createMockNode(identifier ?? "graphics");
      const graphicsNode: IGraphicsNode = {
        ...baseNode,
        clear: vi.fn(),
        drawRect: vi.fn(),
        drawRoundedRect: vi.fn(),
        drawCircle: vi.fn(),
        drawPolygon: vi.fn(),
        drawLine: vi.fn(),
      };
      createdGraphicsNodes.push(graphicsNode);
      return graphicsNode;
    }),
    createText: vi.fn((content: string, _style?: unknown, identifier?: string) => {
      let currentText = content;
      const baseNode = createMockNode(identifier ?? "text");
      const textNode: ITextNode = {
        ...baseNode,
        getText: () => currentText,
        setText: vi.fn((updatedContent: string) => {
          currentText = updatedContent;
        }),
        getFontFamily: () => "Outfit",
        setFontFamily: vi.fn(),
        getFontSize: () => 16,
        setFontSize: vi.fn(),
        getColor: () => [255, 255, 255],
        setColor: vi.fn(),
        getAlign: () => "left",
        setAlign: vi.fn(),
        setShadow: vi.fn(),
        setAnchor: vi.fn(),
      };
      createdTextNodes.push(textNode);
      return textNode;
    }),
    destroy: vi.fn(),
  };

  return {
    renderEngine,
    worldContainer,
    screenContainer,
    createdGraphicsNodes,
    createdSpriteNodes,
    createdTextNodes,
    createdContainerNodes,
    advanceTicker: (deltaTimeInSeconds: number) => {
      for (const listener of [...tickerListeners]) {
        listener(deltaTimeInSeconds);
      }
    },
  };
}

function createMockPlayerController(initialX = 120, initialY = 180): PlayerController {
  return {
    gameObj: {
      pos: { x: initialX, y: initialY },
    },
    getSpeed: () => ({
      x: 120,
      y: 0,
      len: () => 120,
      scale: (f: number) => ({ x: 120 * f, y: 0 }),
    }),
    setSpeed: vi.fn(),
    isFainting: () => false,
    isFrozen: () => false,
    isFacingRight: () => true,
    setDrafting: vi.fn(),
    setCurrentFlowModifier: vi.fn(),
    getCurrentFlowModifier: () => 1.0,
    setOilObstructed: vi.fn(),
    getTargetCameraHorizontalOffset: () => 200,
    freeze: vi.fn(),
    startBreach: vi.fn(),
    completeBreach: vi.fn(),
  } as unknown as PlayerController;
}

describe("Fase 2: Pipeline Nativo PixiJS v8 em gameScene e Sistemas da Categoria 2", () => {
  it("gameScene cria fadeOverlay, oceanFloor, skyBand, timerUI e badge de modo como nós nativos PixiJS v8", async () => {
    const harness = createMockRenderEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const gameScene = createGameScene(renderingContext as unknown as GameSceneEngineContext);

    await gameScene.enter({ mode: "quick_challenge", timeLimit: 45 });

    const screenChildIds = harness.screenContainer.getChildren().map((child) => child.id);
    const worldChildIds = harness.worldContainer.getChildren().map((child) => child.id);

    expect(screenChildIds).toContain("game_scene_fade_overlay");
    expect(screenChildIds).toContain("game_scene_mode_timer");
    expect(worldChildIds).toContain("game_scene_ocean_floor");
    expect(worldChildIds).toContain("game_scene_sky_band");

    const timerNode = harness.createdTextNodes.find((node) => node.id === "game_scene_mode_timer");
    expect(timerNode).toBeDefined();

    gameScene.update(0.016);
    expect(timerNode?.setText).toHaveBeenCalled();

    await gameScene.exit();
  });

  it("gameScene cria badge de modo Migração Serena nativo no screenContainer", async () => {
    const harness = createMockRenderEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const gameScene = createGameScene(renderingContext as unknown as GameSceneEngineContext);

    await gameScene.enter({ mode: "serene" });
    const sereneScreenIds = harness.screenContainer.getChildren().map((child) => child.id);
    expect(sereneScreenIds).toContain("game_scene_mode_serene");
    await gameScene.exit();
  });

  it("evita redesenho redundante de polígono no NativeVisualObjectAdapter quando RGB de outline não muda", () => {
    const harness = createMockRenderEngineHarness();
    const polygonAdapter = createNativePolygonNode(
      harness.renderEngine,
      harness.renderEngine,
      harness.worldContainer,
      {
        identifier: "sonar_test_polygon",
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 0 },
          { x: 50, y: 50 },
        ],
        fillColor: [127, 140, 141],
        outlineColor: [60, 80, 100],
        outlineWidth: 2,
      }
    );

    const nativeGraphics = polygonAdapter.renderNode as IGraphicsNode;
    const drawPolygonSpy = vi.mocked(nativeGraphics.drawPolygon);
    const initialCalls = drawPolygonSpy.mock.calls.length;

    // Nova instância de array com os mesmos valores RGB não deve redesenhar
    polygonAdapter.outline.color = [60, 80, 100];
    expect(drawPolygonSpy.mock.calls.length).toBe(initialCalls);

    // Cor realmente alterada deve disparar redesenho
    polygonAdapter.outline.color = [0, 230, 255];
    expect(drawPolygonSpy.mock.calls.length).toBe(initialCalls + 1);
  });

  it("sistemas da Categoria 2 ativam nós nativos PixiJS v8 sem recorrer a renderingContext.add()", () => {
    const harness = createMockRenderEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const legacyAddSpy = vi.spyOn(renderingContext, "add");
    const mockPlayerController = createMockPlayerController(6000, 190);

    setupBackgroundFaunaSystem(renderingContext);
    expect(harness.createdSpriteNodes.some((node) => node.id.includes("orca_bg"))).toBe(true);
    expect(harness.createdSpriteNodes.some((node) => node.id.includes("jubarte_bg"))).toBe(true);
    expect(harness.createdSpriteNodes.some((node) => node.id.includes("cachalote_bg"))).toBe(true);

    const penguinSystem = setupPenguinFlockSystem(renderingContext);
    expect(harness.createdContainerNodes.some((node) => node.id === "penguin_body_container")).toBe(
      true
    );

    const dolphinSystem = setupDolphinDraftingSystem(renderingContext, mockPlayerController);
    expect(harness.createdContainerNodes.some((node) => node.id === "dolphin_body_container")).toBe(
      true
    );

    setupOceanCurrentsSystem(renderingContext, mockPlayerController);
    expect(harness.createdContainerNodes.some((node) => node.id.startsWith("ocean_current_"))).toBe(
      true
    );

    const upwellingStream = createUpwellingStream(renderingContext, 20000, 400);
    expect(
      harness.createdContainerNodes.some((node) => node.id === "upwelling_stream_parent")
    ).toBe(true);
    expect(upwellingStream.strands.length).toBe(18);

    const oilSpillSystem = setupOilSpillSystem(renderingContext, mockPlayerController);
    expect(harness.createdGraphicsNodes.some((node) => node.id === "oil_spill_buoy")).toBe(true);

    const canyonResult = setupCanyonGeometry(renderingContext, {
      surfaceY: GAME_CONFIG.SEA_LEVEL,
      deepFloorY: 680,
      shallowRockTopY: 270,
      seabedThickness: 550,
      boqueiraoStartX: 25400,
      rampUpEndX: 25800,
      plateauEndX: 26900,
      boqueiraoEndX: 27300,
      lighthouseX: 26350,
    });
    expect(canyonResult.plateauObj).toBeDefined();
    expect(harness.createdGraphicsNodes.some((node) => node.id === "lighthouse_beam")).toBe(true);

    createWaterSplash(renderingContext, { x: 26800, y: GAME_CONFIG.SEA_LEVEL }, 8);
    expect(harness.createdGraphicsNodes.some((node) => node.id === "breach_splash_drop")).toBe(
      true
    );

    const presentationManager = new PresentationModeManager(renderingContext, mockPlayerController);
    presentationManager.open();
    expect(harness.createdContainerNodes.some((node) => node.id === "presentation_mode_root")).toBe(
      true
    );
    expect(harness.createdTextNodes.some((node) => node.id === "presentation_biome_label")).toBe(
      true
    );

    expect(legacyAddSpy).not.toHaveBeenCalled();

    penguinSystem.destroy?.();
    dolphinSystem.destroy?.();
    oilSpillSystem.destroy?.();
    presentationManager.destroy();
  });
});

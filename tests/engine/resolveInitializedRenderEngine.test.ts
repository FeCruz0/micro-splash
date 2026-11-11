import { describe, expect, it, vi } from "vitest";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import {
  resolveInitializedRenderEngine,
  type IGraphicsNode,
  type IRenderEngine,
  type IRenderNode,
  type IRenderTicker,
  type ISpriteNode,
  type ITextNode,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import { setupAuroraSystem } from "../../src/systems/auroraSystem";
import { createKeyBadge } from "../../src/ui/keyBadge";

function createMockNode(identifier: string): IRenderNode {
  const children: IRenderNode[] = [];
  return {
    id: identifier,
    getPosition: () => ({ x: 0, y: 0 }),
    setPosition: vi.fn(),
    getScale: () => ({ x: 1, y: 1 }),
    setScale: vi.fn(),
    getRotation: () => 0,
    setRotation: vi.fn(),
    getOpacity: () => 1,
    setOpacity: vi.fn(),
    getZIndex: () => 0,
    setZIndex: vi.fn(),
    isVisible: () => true,
    setVisible: vi.fn(),
    addChild: vi.fn((childNode: IRenderNode) => {
      children.push(childNode);
    }),
    removeChild: vi.fn(),
    getChildren: () => children,
    destroy: vi.fn(),
    getNativeNode: <T = unknown>() => ({}) as T,
  };
}

function createMockRenderEngine(options?: { isInitializedValue?: boolean }): IRenderEngine {
  const worldContainer = createMockNode("world_container");
  const screenContainer = createMockNode("screen_container");
  const stageRoot = createMockNode("stage_root");

  const renderTicker: IRenderTicker = {
    add: vi.fn(() => () => {}),
    start: vi.fn(),
    stop: vi.fn(),
    getFPS: () => 60,
    getDeltaTime: () => 0.016,
  };

  return {
    isInitialized: options?.isInitializedValue ?? true,
    init: vi.fn(async () => {}),
    resize: vi.fn(),
    getDimensions: () => ({ width: 1280, height: 720 }),
    getCanvas: () => null,
    getStageRoot: () => stageRoot,
    getWorldContainer: () => worldContainer,
    getScreenContainer: () => screenContainer,
    getCameraPosition: () => ({ x: 0, y: 0 }),
    setCameraPosition: vi.fn(),
    shake: vi.fn(),
    getTicker: () => renderTicker,
    createContainer: vi.fn((identifier?: string) => createMockNode(identifier ?? "container")),
    createSprite: vi.fn(
      (_texture: unknown, identifier?: string) =>
        createMockNode(identifier ?? "sprite") as ISpriteNode
    ),
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
      };
      return textNode;
    }),
    destroy: vi.fn(),
  };
}

function createLightweightMockRenderEngineWithoutFlag(): Omit<IRenderEngine, "isInitialized"> {
  const { isInitialized: _omittedInitializationFlag, ...engineWithoutInitializationFlag } =
    createMockRenderEngine();
  void _omittedInitializationFlag;
  return engineWithoutInitializationFlag;
}

describe("resolveInitializedRenderEngine", () => {
  it("retorna null para valores nulos, primitivos e mocks legados sem IRenderEngine", () => {
    expect(resolveInitializedRenderEngine(null)).toBeNull();
    expect(resolveInitializedRenderEngine(undefined)).toBeNull();
    expect(resolveInitializedRenderEngine("invalid")).toBeNull();
    expect(resolveInitializedRenderEngine({ add: vi.fn(), width: () => 1280 })).toBeNull();
    expect(
      resolveInitializedRenderEngine({
        renderEngine: { invalid: true },
      })
    ).toBeNull();
  });

  it("aceita diretamente IRenderEngine inicializado ou mock leve sem flag isInitialized", () => {
    const mockWithoutFlag = createLightweightMockRenderEngineWithoutFlag();
    const mockInitialized = createMockRenderEngine({
      isInitializedValue: true,
    });

    expect(resolveInitializedRenderEngine(mockWithoutFlag)).toBe(mockWithoutFlag);
    expect(resolveInitializedRenderEngine(mockInitialized)).toBe(mockInitialized);
  });

  it("rejeita RenderEngineAdapter ou IRenderEngine explicitamente nao inicializado", () => {
    const uninitializedMock = createMockRenderEngine({
      isInitializedValue: false,
    });
    const uninitializedAdapter = new RenderEngineAdapter();
    const wrappedContext = createRenderingContext(uninitializedAdapter, new SceneManager());

    expect(resolveInitializedRenderEngine(uninitializedMock)).toBeNull();
    expect(resolveInitializedRenderEngine(uninitializedAdapter)).toBeNull();
    expect(resolveInitializedRenderEngine(wrappedContext)).toBeNull();
  });

  it("desembrulha renderingContext.renderEngine quando o motor Pixi esta pronto para uso", () => {
    const initializedMock = createMockRenderEngine({
      isInitializedValue: true,
    });
    const renderingContextInstance = createRenderingContext(initializedMock, new SceneManager());

    expect(resolveInitializedRenderEngine(renderingContextInstance)).toBe(initializedMock);
  });

  it("ativa pipelines nativos PixiJS v8 em sistemas e UI ao receber RenderingContext encapsulado", () => {
    const initializedMock = createMockRenderEngine({
      isInitializedValue: true,
    });
    const renderingContextInstance = createRenderingContext(initializedMock, new SceneManager());
    const legacyAddSpy = vi.spyOn(renderingContextInstance, "add");

    const auroraHandle = setupAuroraSystem(renderingContextInstance);
    expect(auroraHandle.ribbons.length).toBeGreaterThan(0);
    expect(initializedMock.createGraphics).toHaveBeenCalled();
    expect(initializedMock.getTicker().add).toHaveBeenCalled();
    expect(legacyAddSpy).not.toHaveBeenCalled();
    auroraHandle.destroy();

    const keyBadgeHandle = createKeyBadge(renderingContextInstance, {
      pos: { x: 100, y: 120 },
      keyLabel: "SPACE",
    });
    expect(keyBadgeHandle.elements.length).toBe(3);
    expect(initializedMock.createText).toHaveBeenCalled();
    expect(legacyAddSpy).not.toHaveBeenCalled();
    keyBadgeHandle.destroy();
  });
});

import { vi } from "vitest";
import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
  ISpriteNode,
  ITextNode,
  IRenderTicker,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";

export interface MockRenderEngineHarness {
  readonly renderEngine: IRenderEngine;
  readonly worldContainer: IRenderNode;
  readonly screenContainer: IRenderNode;
  readonly stageRoot: IRenderNode;
  readonly createdGraphicsNodes: IGraphicsNode[];
  readonly createdSpriteNodes: ISpriteNode[];
  readonly createdTextNodes: ITextNode[];
  readonly createdContainerNodes: IRenderNode[];
  advanceTicker: (deltaTimeInSeconds: number) => void;
}

export function createMockRenderNode(identifier: string): IRenderNode {
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
    getChildren: () => children as readonly IRenderNode[],
    destroy: vi.fn(),
    getNativeNode: <T = unknown>() => ({}) as T,
  };

  return node;
}

export function createMockRenderEngineHarness(
  dimensions: { width: number; height: number } = { width: 1280, height: 720 }
): MockRenderEngineHarness {
  const worldContainer = createMockRenderNode("world_container");
  const screenContainer = createMockRenderNode("screen_container");
  const stageRoot = createMockRenderNode("stage_root");
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
    getDimensions: () => dimensions,
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
      const containerNode = createMockRenderNode(identifier ?? "container");
      createdContainerNodes.push(containerNode);
      return containerNode;
    }),
    createSprite: vi.fn((texture: unknown, identifier?: string) => {
      const baseNode = createMockRenderNode(identifier ?? "sprite");
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
      const baseNode = createMockRenderNode(identifier ?? "graphics");
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
      const baseNode = createMockRenderNode(identifier ?? "text");
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
    stageRoot,
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

export function createMockRenderEngine(dimensions?: {
  width: number;
  height: number;
}): IRenderEngine {
  return createMockRenderEngineHarness(dimensions).renderEngine;
}

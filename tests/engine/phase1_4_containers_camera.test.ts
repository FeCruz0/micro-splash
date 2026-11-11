import { describe, it, expect, beforeEach, vi } from "vitest";
import { PixiContainerNode, PixiGraphicsNode } from "../../src/engine/adapters/PixiNodes";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import { setupLetterboxBorders } from "../../src/systems/letterboxSystem";
import { CameraSystem } from "../../src/systems/cameraSystem";
import type {
  IRenderEngine,
  IRenderNode,
  Vector2D,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("Etapa 1.4: Containers de Mundo/Tela, Câmera e Letterbox", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Separação de Containers de Mundo e Tela", () => {
    it("deve separar explicitamente worldContainer e screenContainer com z-index distintos", () => {
      const stageRoot = new PixiContainerNode(undefined, "stage_root");
      const worldContainer = new PixiContainerNode(undefined, "world_container");
      const screenContainer = new PixiContainerNode(undefined, "screen_container");

      worldContainer.setZIndex(0);
      screenContainer.setZIndex(100);

      stageRoot.addChild(worldContainer);
      stageRoot.addChild(screenContainer);

      expect(worldContainer.id).toBe("world_container");
      expect(screenContainer.id).toBe("screen_container");

      const stageChildren = stageRoot.getChildren();
      expect(stageChildren).toContain(worldContainer);
      expect(stageChildren).toContain(screenContainer);
      expect(worldContainer.getZIndex()).toBe(0);
      expect(screenContainer.getZIndex()).toBe(100);
    });

    it("deve permitir anexar elementos de mundo no worldContainer e elementos fixos no screenContainer", () => {
      const worldContainer = new PixiContainerNode(undefined, "world_container");
      const screenContainer = new PixiContainerNode(undefined, "screen_container");

      const worldElement = new PixiGraphicsNode(undefined, "world_whale");
      const fixedHudElement = new PixiGraphicsNode(undefined, "fixed_hud");

      worldContainer.addChild(worldElement);
      screenContainer.addChild(fixedHudElement);

      expect(worldContainer.getChildren()).toContain(worldElement);
      expect(screenContainer.getChildren()).toContain(fixedHudElement);
    });
  });

  describe("Movimentação da Câmera Afeta Exclusivamente o worldContainer", () => {
    it("deve posicionar o worldContainer com coordenadas negativas mantendo screenContainer intacto", () => {
      const stageRoot = new PixiContainerNode(undefined, "stage_root");
      const worldContainer = new PixiContainerNode(undefined, "world_container");
      const screenContainer = new PixiContainerNode(undefined, "screen_container");

      stageRoot.addChild(worldContainer);
      stageRoot.addChild(screenContainer);

      let currentCameraPosition: Vector2D = { x: 0, y: 0 };
      const setCameraPosition = (cameraPositionX: number, cameraPositionY: number): void => {
        currentCameraPosition = { x: cameraPositionX, y: cameraPositionY };
        worldContainer.setPosition(-cameraPositionX, -cameraPositionY);
      };

      setCameraPosition(650, 420);

      expect(currentCameraPosition).toEqual({ x: 650, y: 420 });
      expect(worldContainer.getPosition()).toEqual({ x: -650, y: -420 });
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it("deve gerenciar deslocamento da câmera com lerp através do CameraSystem", () => {
      let cameraPosition: Vector2D = { x: 0, y: 0 };
      const worldContainer = new PixiContainerNode(undefined, "world_container");
      const screenContainer = new PixiContainerNode(undefined, "screen_container");

      const mockEngine: IRenderEngine = {
        isInitialized: true,
        init: vi.fn(),
        resize: vi.fn(),
        getDimensions: () => ({ width: 1280, height: 720 }),
        getCanvas: () => null,
        getStageRoot: () => new PixiContainerNode(undefined, "stage"),
        getWorldContainer: () => worldContainer,
        getScreenContainer: () => screenContainer,
        getCameraPosition: () => cameraPosition,
        setCameraPosition: (cameraPositionX: number, cameraPositionY: number) => {
          cameraPosition = { x: cameraPositionX, y: cameraPositionY };
          worldContainer.setPosition(-cameraPositionX, -cameraPositionY);
        },
        getTicker: vi.fn() as any,
        createContainer: vi.fn((id) => new PixiContainerNode(undefined, id)),
        createSprite: vi.fn() as any,
        createGraphics: vi.fn((id) => new PixiGraphicsNode(undefined, id)),
        createText: vi.fn() as any,
        destroy: vi.fn(),
      };

      const camera = new CameraSystem(mockEngine);
      camera.setCameraPosition(0, 0);

      const targetPosition = camera.followTarget(1000, 500, {
        smoothingFactor: 0.1,
        offsetX: 100,
        offsetY: 50,
      });

      // Target = (1100, 550). 10% interpolation = (110, 55)
      expect(targetPosition.x).toBeCloseTo(110, 1);
      expect(targetPosition.y).toBeCloseTo(55, 1);
      expect(worldContainer.getPosition().x).toBeCloseTo(-110, 1);
      expect(worldContainer.getPosition().y).toBeCloseTo(-55, 1);
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it("deve posicionar o ponto focado no centro da tela ao utilizar RenderEngineAdapter", () => {
      const adapter = new RenderEngineAdapter();
      const worldContainer = new PixiContainerNode(undefined, "world_container");
      const screenContainer = new PixiContainerNode(undefined, "screen_container");
      (adapter as any).worldContainer = worldContainer;
      (adapter as any).screenContainer = screenContainer;

      // Viewport padrão 800x600, centro em (400, 300)
      adapter.setCameraPosition(1200, 500);

      expect(adapter.getCameraPosition()).toEqual({ x: 1200, y: 500 });
      expect(worldContainer.getPosition()).toEqual({ x: -800, y: -200 });
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });
    });
  });

  describe("Letterbox Restrito a Graphics no ScreenContainer", () => {
    it("deve renderizar bordas de letterbox utilizando nós Graphics adicionados ao screenContainer", () => {
      localStorage.setItem("micro_splash_display_mode", "letterbox");

      const screenContainer = new PixiContainerNode(undefined, "screen_container");
      const createdGraphics: IRenderNode[] = [];

      const mockEngine: IRenderEngine = {
        isInitialized: true,
        init: vi.fn(),
        resize: vi.fn(),
        getDimensions: () => ({ width: 1280, height: 720 }),
        getCanvas: () => null,
        getStageRoot: () => screenContainer,
        getWorldContainer: () => new PixiContainerNode(undefined, "world_container"),
        getScreenContainer: () => screenContainer,
        getCameraPosition: () => ({ x: 0, y: 0 }),
        setCameraPosition: vi.fn(),
        getTicker: vi.fn() as any,
        createContainer: vi.fn((id) => new PixiContainerNode(undefined, id)),
        createSprite: vi.fn() as any,
        createGraphics: vi.fn((id) => {
          const gfx = new PixiGraphicsNode(undefined, id);
          createdGraphics.push(gfx);
          return gfx;
        }),
        createText: vi.fn() as any,
        destroy: vi.fn(),
      };

      const handle = setupLetterboxBorders(mockEngine);

      expect(createdGraphics.length).toBe(4);
      expect(screenContainer.getChildren().length).toBe(4);

      for (const bar of screenContainer.getChildren()) {
        expect(bar.getZIndex()).toBe(999);
      }

      handle.destroy();
    });
  });
});

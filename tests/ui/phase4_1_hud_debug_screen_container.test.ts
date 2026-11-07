import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupHudSystem, getOxygenUrgencyState } from "../../src/ui/hudSystem";
import { createDebugDistanceUI } from "../../src/ui/debugDistance";
import {
  PixiContainerNode,
  PixiGraphicsNode,
  PixiTextNode,
} from "../../src/engine/adapters/PixiNodes";
import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
  ITextNode,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("Etapa 4.1: HUD e Debug Telemetry no screenContainer com Dirty-Checking", () => {
  let worldContainer: PixiContainerNode;
  let screenContainer: PixiContainerNode;
  let stageRoot: PixiContainerNode;
  let mockEngine: IRenderEngine;
  let createdNodes: (IRenderNode | IGraphicsNode | ITextNode)[];
  let tickerCallbacks: ((dt: number) => void)[];

  beforeEach(() => {
    createdNodes = [];
    tickerCallbacks = [];
    stageRoot = new PixiContainerNode(undefined, "stage_root");
    worldContainer = new PixiContainerNode(undefined, "world_container");
    screenContainer = new PixiContainerNode(undefined, "screen_container");

    stageRoot.addChild(worldContainer);
    stageRoot.addChild(screenContainer);

    mockEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => stageRoot,
      getWorldContainer: () => worldContainer,
      getScreenContainer: () => screenContainer,
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: (x: number, y: number) => {
        worldContainer.setPosition(-x, -y);
      },
      getTicker: () => ({
        add: (cb: (dt: number) => void) => {
          tickerCallbacks.push(cb);
          return () => {
            const idx = tickerCallbacks.indexOf(cb);
            if (idx !== -1) tickerCallbacks.splice(idx, 1);
          };
        },
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      }),
      createContainer: (id?: string) => {
        const containerNode = new PixiContainerNode(undefined, id);
        createdNodes.push(containerNode);
        return containerNode;
      },
      createSprite: vi.fn() as any,
      createGraphics: (id?: string) => {
        const graphicsNode = new PixiGraphicsNode(undefined, id);
        createdNodes.push(graphicsNode);
        return graphicsNode;
      },
      createText: (content: string, style?: any, id?: string) => {
        const textNode = new PixiTextNode(content, style, id);
        createdNodes.push(textNode);
        return textNode;
      },
      destroy: vi.fn(),
    };
  });

  describe("1. hudSystem com PixiJS v8 no screenContainer", () => {
    it("deve anexar todos os elementos do HUD exclusivamente ao screenContainer, nunca ao stageRoot ou worldContainer", () => {
      const mockPlayerController = {
        getOxygen: () => 100,
        getMaxOxygen: () => 100,
        gameObj: { pos: { x: 500, y: 200 } },
      } as any;

      const mockGameState = {
        getDistance: () => 14000,
      } as any;

      const hudHandle = setupHudSystem(mockEngine, mockPlayerController, mockGameState);

      // screenContainer deve conter os elementos de HUD
      const screenChildren = screenContainer.getChildren();
      expect(screenChildren.length).toBeGreaterThanOrEqual(5);

      // worldContainer e stageRoot (direto além de world e screen) não devem conter elementos do HUD
      expect(worldContainer.getChildren().length).toBe(0);
      expect(stageRoot.getChildren()).toEqual([worldContainer, screenContainer]);

      // Move a câmera no mundo: screenContainer não é afetado
      mockEngine.setCameraPosition(2500, 400);
      expect(worldContainer.getPosition()).toEqual({ x: -2500, y: -400 });
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });

      hudHandle.destroy();
      expect(screenContainer.getChildren().length).toBe(0);
    });

    it("deve aplicar dirty-checking rigoroso nas strings de texto evitando reatribuições redundantes", () => {
      const mockPlayerController = {
        getOxygen: () => 90,
        getMaxOxygen: () => 100,
        gameObj: { pos: { x: 15000, y: 200 } },
      } as any;

      let currentDistance = 15000;
      const mockGameState = {
        getDistance: () => currentDistance,
      } as any;

      const hudHandle = setupHudSystem(mockEngine, mockPlayerController, mockGameState);

      // Localiza o nó de texto de bioma
      const biomeTextNode = createdNodes.find(
        (node) => node.id === "hud_biome_text"
      ) as PixiTextNode;
      expect(biomeTextNode).toBeDefined();

      const setTextSpy = vi.spyOn(biomeTextNode, "setText");

      // Atualiza o HUD com a mesma distância (mesmo bioma)
      hudHandle.update();
      hudHandle.update();
      hudHandle.update();

      // setText só deve ter sido chamado se o conteúdo textual mudou
      // Como o bioma permaneceu "Costa Urbana", as chamadas redundantes foram suprimidas
      const textCalls = setTextSpy.mock.calls.map((call) => call[0]);
      const uniqueCalls = Array.from(new Set(textCalls));
      expect(uniqueCalls.length).toBe(textCalls.length);

      // Altera para novo bioma (Cânions & Ressurgência a 22000m)
      currentDistance = 22000;
      hudHandle.update();

      expect(biomeTextNode.getText()).toContain("Cânions & Ressurgência");
      hudHandle.destroy();
    });

    it("deve sincronizar estados de urgência de oxigênio (calm, warning, critical)", () => {
      expect(getOxygenUrgencyState(0.8)).toBe("calm");
      expect(getOxygenUrgencyState(0.35)).toBe("warning");
      expect(getOxygenUrgencyState(0.12)).toBe("critical");
    });
  });

  describe("2. debugDistanceUI com PixiJS v8 no screenContainer", () => {
    it("deve anexar o container de telemetria exclusivamente ao screenContainer", () => {
      const mockPlayer = {
        isSereneMode: () => false,
        getOxygen: () => 100,
        getSpeed: () => ({ x: 120, y: 0 }),
      } as any;

      const debugUI = createDebugDistanceUI(mockEngine, mockPlayer);

      expect(screenContainer.getChildren().length).toBe(1);
      expect(worldContainer.getChildren().length).toBe(0);

      const telemetryContainer = screenContainer.getChildren()[0];
      expect(telemetryContainer.id).toBe("dev_debug_telemetry_container");

      // Câmera no mundo não afeta tela
      mockEngine.setCameraPosition(8000, 300);
      expect(screenContainer.getPosition()).toEqual({ x: 0, y: 0 });

      debugUI.destroy();
      expect(screenContainer.getChildren().length).toBe(0);
    });

    it("deve aplicar dirty-checking em todos os textos da telemetria durante o update", () => {
      const mockPlayer = {
        isSereneMode: () => false,
        getOxygen: () => 80,
        getMaxSpeed: () => 200,
        getSpeed: () => ({ x: 100, y: 0 }),
      } as any;

      const debugUI = createDebugDistanceUI(mockEngine, mockPlayer);
      debugUI.setVisible(true);

      const fpsNode = createdNodes.find((n) => n.id === "debug-fps-label") as PixiTextNode;
      const routeNode = createdNodes.find((n) => n.id === "debug-route") as PixiTextNode;
      const speedNode = createdNodes.find((n) => n.id === "debug-speed") as PixiTextNode;
      const statusNode = createdNodes.find((n) => n.id === "debug-status") as PixiTextNode;

      expect(fpsNode).toBeDefined();
      expect(routeNode).toBeDefined();
      expect(speedNode).toBeDefined();
      expect(statusNode).toBeDefined();

      const fpsSetTextSpy = vi.spyOn(fpsNode, "setText");
      const routeSetTextSpy = vi.spyOn(routeNode, "setText");

      // Primeiro update a 60 FPS e 1000m
      debugUI.update(1000, { fps: 60 });
      expect(fpsNode.getText()).toBe("60 FPS");
      expect(debugUI.getFpsText()).toBe("60 FPS");

      const initialFpsCalls = fpsSetTextSpy.mock.calls.length;
      const initialRouteCalls = routeSetTextSpy.mock.calls.length;

      // Três updates subsequentes com EXATAMENTE os mesmos parâmetros
      debugUI.update(1000, { fps: 60 });
      debugUI.update(1000, { fps: 60 });
      debugUI.update(1000, { fps: 60 });

      // Dirty-checking suprime re-renderização de texto se a string não mudou
      expect(fpsSetTextSpy.mock.calls.length).toBe(initialFpsCalls);
      expect(routeSetTextSpy.mock.calls.length).toBe(initialRouteCalls);

      // Altera o FPS: deve atualizar dirty-checking
      debugUI.update(1000, { fps: 48 });
      expect(fpsNode.getText()).toBe("48 FPS");
      expect(debugUI.getFpsText()).toBe("48 FPS");
      expect(fpsSetTextSpy.mock.calls.length).toBe(initialFpsCalls + 1);

      debugUI.destroy();
    });

    it("deve alternar visibilidade corretamente via toggle() e setVisible()", () => {
      const debugUI = createDebugDistanceUI(mockEngine);

      expect(debugUI.isVisible()).toBe(false);
      expect(debugUI.toggle()).toBe(true);
      expect(debugUI.isVisible()).toBe(true);

      debugUI.setVisible(false);
      expect(debugUI.isVisible()).toBe(false);

      debugUI.destroy();
    });
  });
});

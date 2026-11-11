import { describe, it, expect, vi } from "vitest";
import { GAME_CONFIG, centralizedDeltaTimeClamp } from "../../src/config";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import type { IRenderNode } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("Plano de Correção de Movimento, Clamp Centralizado e Congelamento de Relógio (PixiJS v8)", () => {
  describe("centralizedDeltaTimeClamp", () => {
    it("preserva delta times válidos e normais dentro do orçamento de quadros", () => {
      expect(centralizedDeltaTimeClamp(0.0166)).toBeCloseTo(0.0166, 4);
      expect(centralizedDeltaTimeClamp(0.0333)).toBeCloseTo(0.0333, 4);
      expect(centralizedDeltaTimeClamp(0.05)).toBeCloseTo(0.05, 4);
    });

    it("limita delta times excessivos ao teto máximo GAME_CONFIG.MAX_DELTA_TIME", () => {
      expect(centralizedDeltaTimeClamp(0.15)).toBe(GAME_CONFIG.MAX_DELTA_TIME);
      expect(centralizedDeltaTimeClamp(1.0)).toBe(GAME_CONFIG.MAX_DELTA_TIME);
      expect(centralizedDeltaTimeClamp(5.0)).toBe(GAME_CONFIG.MAX_DELTA_TIME);
    });

    it("descarta deltas negativos ou valores inválidos/NaN retornando 0", () => {
      expect(centralizedDeltaTimeClamp(-0.016)).toBe(0);
      expect(centralizedDeltaTimeClamp(-10)).toBe(0);
      expect(centralizedDeltaTimeClamp(Number.NaN)).toBe(0);
      expect(centralizedDeltaTimeClamp(undefined as unknown as number)).toBe(0);
    });
  });

  describe("Congelamento do Relógio e Delta Time durante Pausas (freezeEngineClockDuringPause)", () => {
    it("congela dt() e time() quando o jogo entra em pausa e retoma normalmente ao despausar", () => {
      const renderEngineAdapterInstance = new RenderEngineAdapter();
      const sceneManagerInstance = new SceneManager();
      const renderingContextInstance = createRenderingContext(
        renderEngineAdapterInstance,
        sceneManagerInstance
      );

      // Simula tempo inicial
      const initialTime = renderingContextInstance.time();
      expect(renderingContextInstance.isPaused()).toBe(false);

      // Avança 3 frames normais (0.016s cada)
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);

      const timeAfterThreeFrames = renderingContextInstance.time();
      expect(timeAfterThreeFrames).toBeGreaterThan(initialTime);
      expect(renderingContextInstance.dt()).toBeGreaterThan(0);

      // Ativa pausa do jogo via setPaused(true)
      renderingContextInstance.setPaused(true);
      expect(renderingContextInstance.isPaused()).toBe(true);
      expect(renderingContextInstance.debug.paused).toBe(true);

      const frozenTimeAtPause = renderingContextInstance.time();
      expect(renderingContextInstance.dt()).toBe(0);

      // Tenta avançar 5 frames com o jogo pausado
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);

      // O tempo acumulado time() e o delta dt() devem permanecer estritamente congelados
      expect(renderingContextInstance.time()).toBe(frozenTimeAtPause);
      expect(renderingContextInstance.dt()).toBe(0);

      // Despausa o jogo via debug.paused = false
      renderingContextInstance.debug.paused = false;
      expect(renderingContextInstance.isPaused()).toBe(false);

      // Avança mais 1 frame despausado
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      expect(renderingContextInstance.time()).toBeGreaterThan(frozenTimeAtPause);
      expect(renderingContextInstance.dt()).toBeGreaterThan(0);
    });

    it("passa delta time 0 para callbacks de update de cena e entidades quando em pausa", () => {
      const renderEngineAdapterInstance = new RenderEngineAdapter();
      const sceneManagerInstance = new SceneManager();
      const renderingContextInstance = createRenderingContext(
        renderEngineAdapterInstance,
        sceneManagerInstance
      );

      const receivedDeltaTimes: number[] = [];
      renderingContextInstance.onUpdate((deltaTimeInSeconds: number) => {
        receivedDeltaTimes.push(deltaTimeInSeconds);
      });

      // Frame ativo
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      expect(receivedDeltaTimes[0]).toBeCloseTo(0.016, 3);

      // Frame pausado
      renderingContextInstance.setPaused(true);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
      expect(receivedDeltaTimes[1]).toBe(0);

      // Frame retomado
      renderingContextInstance.setPaused(false);
      renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.032);
      expect(receivedDeltaTimes[2]).toBeCloseTo(0.032, 3);
    });
  });

  describe("Comportamento Dinâmico de 'fixed' e Transição entre Containers", () => {
    it("move o nó visual entre worldContainer e screenContainer quando 'fixed' é alterado em runtime", () => {
      const renderEngineAdapterInstance = new RenderEngineAdapter();

      const worldChildrenList: IRenderNode[] = [];
      const screenChildrenList: IRenderNode[] = [];

      const createMockContainer = (id: string, childrenStorage: IRenderNode[]): IRenderNode => ({
        id,
        setPosition: () => {},
        getPosition: () => ({ x: 0, y: 0 }),
        setZIndex: () => {},
        getZIndex: () => 0,
        setOpacity: () => {},
        getOpacity: () => 1,
        setScale: () => {},
        getScale: () => ({ x: 1, y: 1 }),
        setRotation: () => {},
        getRotation: () => 0,
        setVisible: () => {},
        isVisible: () => true,
        destroy: () => {},
        getNativeNode: <T = unknown>() => ({}) as T,
        addChild: (childNode: IRenderNode) => {
          childrenStorage.push(childNode);
        },
        removeChild: (childNode: IRenderNode) => {
          const index = childrenStorage.indexOf(childNode);
          if (index !== -1) childrenStorage.splice(index, 1);
        },
        getChildren: () => childrenStorage,
      });

      const mockWorld = createMockContainer("world", worldChildrenList);
      const mockScreen = createMockContainer("screen", screenChildrenList);

      Object.defineProperty(renderEngineAdapterInstance, "isInitialized", {
        get: () => true,
      });
      renderEngineAdapterInstance.getWorldContainer = () => mockWorld;
      renderEngineAdapterInstance.getScreenContainer = () => mockScreen;
      renderEngineAdapterInstance.createGraphics = (id?: string) => {
        const node = createMockContainer(id ?? "graphics", []);
        (node as unknown as { drawRect: () => void; clear: () => void }).drawRect = () => {};
        (node as unknown as { drawRect: () => void; clear: () => void }).clear = () => {};
        return node as unknown as ReturnType<RenderEngineAdapter["createGraphics"]>;
      };

      const sceneManagerInstance = new SceneManager();
      const renderingContextInstance = createRenderingContext(
        renderEngineAdapterInstance,
        sceneManagerInstance
      );

      // Entidade criada inicialmente no mundo
      const dynamicEntity = renderingContextInstance.add([
        renderingContextInstance.pos(50, 50),
        renderingContextInstance.rect(20, 20),
      ]);

      expect(dynamicEntity.fixed).toBe(false);
      expect(worldChildrenList).toContain(dynamicEntity.renderNode);
      expect(screenChildrenList).not.toContain(dynamicEntity.renderNode);

      // Transiciona para fixed = true (HUD / ScreenContainer)
      dynamicEntity.fixed = true;
      expect(dynamicEntity.fixed).toBe(true);
      expect(worldChildrenList).not.toContain(dynamicEntity.renderNode);
      expect(screenChildrenList).toContain(dynamicEntity.renderNode);

      // Retorna para fixed = false (Mundo)
      dynamicEntity.fixed = false;
      expect(dynamicEntity.fixed).toBe(false);
      expect(worldChildrenList).toContain(dynamicEntity.renderNode);
      expect(screenChildrenList).not.toContain(dynamicEntity.renderNode);
    });
  });

  describe("Escala e Espelhamento de Sprites (flipX / flipY)", () => {
    it("aplica a composição de escala e espelhamento horizontal e vertical", () => {
      const renderEngineAdapterInstance = new RenderEngineAdapter();
      const sceneManagerInstance = new SceneManager();
      const renderingContextInstance = createRenderingContext(
        renderEngineAdapterInstance,
        sceneManagerInstance
      );

      let visualNodeScaleX = 1;
      let visualNodeScaleY = 1;

      const mockVisualNode = {
        setScale: vi.fn((sx: number, sy: number) => {
          visualNodeScaleX = sx;
          visualNodeScaleY = sy;
        }),
      } as unknown as IRenderNode;

      const testEntity = renderingContextInstance.add([
        renderingContextInstance.pos(0, 0),
        renderingContextInstance.scale(2, 3),
      ]);
      testEntity.renderNode = mockVisualNode;

      testEntity.flipX = true;
      expect(testEntity.flipX).toBe(true);
      expect(testEntity.scale.x).toBe(2);
      expect(visualNodeScaleX).toBe(-2);

      testEntity.flipY = true;
      expect(testEntity.flipY).toBe(true);
      expect(testEntity.scale.y).toBe(3);
      expect(visualNodeScaleY).toBe(-3);
    });
  });
});

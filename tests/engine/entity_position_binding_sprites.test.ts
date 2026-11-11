import { describe, it, expect, vi } from "vitest";
import { Container } from "pixi.js";
import { createEntityPositionBinding } from "../../src/engine/adapters/entityPositionBinding";
import {
  createRenderingContext,
  resolveAnchorCoordinates,
} from "../../src/engine/adapters/RenderingContextAdapter";
import type { IRenderEngine, IRenderNode } from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import { PixiContainerNode } from "../../src/engine/adapters/PixiNodes";
import { setEntityVisibilityRecursively } from "../../src/systems/spatialCullingSystem";

describe("EntityPositionBinding e Sincronização de Sprites", () => {
  it("deve sincronizar alterações de x e y através do binding posicional sem quebrar referências", () => {
    let internalCoordinateX = 100;
    let internalCoordinateY = 200;
    const positionNotificationSpy = vi.fn((x: number, y: number) => {
      internalCoordinateX = x;
      internalCoordinateY = y;
    });

    const positionBinding = createEntityPositionBinding(
      () => internalCoordinateX,
      () => internalCoordinateY,
      positionNotificationSpy
    );

    expect(positionBinding.x).toBe(100);
    expect(positionBinding.y).toBe(200);

    positionBinding.x = 150;
    expect(positionNotificationSpy).toHaveBeenCalledWith(150, 200);
    expect(positionBinding.x).toBe(150);

    positionBinding.y = 280;
    expect(positionNotificationSpy).toHaveBeenCalledWith(150, 280);
    expect(positionBinding.y).toBe(280);

    positionBinding.set(300, 400);
    expect(positionNotificationSpy).toHaveBeenCalledWith(300, 400);
    expect(positionBinding.x).toBe(300);
    expect(positionBinding.y).toBe(400);
  });

  it("deve fornecer métodos vetoriais funcionais e não-enumeráveis (add, sub, scale, len, unit, dist)", () => {
    const positionBinding = createEntityPositionBinding(30, 40, vi.fn());

    // Não-enumerabilidade garante que toEqual({ x: 30, y: 40 }) passe sem detectar métodos
    expect(Object.keys(positionBinding)).toEqual(["x", "y"]);
    expect(positionBinding.len()).toBe(50);
    expect(positionBinding.unit()).toEqual({ x: 0.6, y: 0.8 });
    expect(positionBinding.scale(2)).toEqual({ x: 60, y: 80 });
    expect(positionBinding.add({ x: 10, y: 20 })).toEqual({ x: 40, y: 60 });
    expect(positionBinding.sub({ x: 10, y: 20 })).toEqual({ x: 20, y: 20 });
    expect(positionBinding.dist({ x: 30, y: 40 })).toBe(0);
    expect(positionBinding.dist({ x: 60, y: 80 })).toBe(50);
  });

  it("atribuição de entity.pos = { x, y } deve copiar valores e atualizar o nó sem substituir a referência do binding", () => {
    const mockNode: IRenderNode = {
      id: "mock_sprite",
      setPosition: vi.fn(),
      setScale: vi.fn(),
      setRotation: vi.fn(),
      setOpacity: vi.fn(),
      setZIndex: vi.fn(),
      setVisible: vi.fn(),
      getPosition: () => ({ x: 0, y: 0 }),
      getScale: () => ({ x: 1, y: 1 }),
      getRotation: () => 0,
      getOpacity: () => 1,
      getZIndex: () => 0,
      isVisible: () => true,
      destroy: vi.fn(),
      addChild: vi.fn(),
      removeChild: vi.fn(),
      getChildren: () => [],
      getNativeNode: <T>() => new Container() as unknown as T,
    };

    const mockEngine: IRenderEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => new PixiContainerNode(undefined, "stage"),
      getWorldContainer: () => new PixiContainerNode(undefined, "world"),
      getScreenContainer: () => new PixiContainerNode(undefined, "screen"),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      getTicker: () => ({
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      }),
      createContainer: vi.fn(() => mockNode as any),
      createSprite: vi.fn(() => mockNode as any),
      createGraphics: vi.fn(() => mockNode as any),
      createText: vi.fn(() => mockNode as any),
      destroy: vi.fn(),
    };

    const renderingContext = createRenderingContext(mockEngine, {
      loadScene: vi.fn(),
      getCurrentSceneName: () => "test",
    } as any);

    const clusterEntity = renderingContext.add([renderingContext.pos(100, 200)]);
    const haloEntity = renderingContext.add([renderingContext.pos(0, 0)]);

    const originalHaloPosReference = haloEntity.pos;

    // Atribuição direta por objeto
    haloEntity.pos = clusterEntity.pos;

    // Garante cópia sem aliasing
    expect(haloEntity.pos.x).toBe(100);
    expect(haloEntity.pos.y).toBe(200);
    expect(haloEntity.pos).toBe(originalHaloPosReference);

    // Modificar cluster não deve afetar halo (não são o mesmo objeto referencial)
    clusterEntity.pos.x = 555;
    expect(haloEntity.pos.x).toBe(100);
  });

  it("deve propagar hidden e flipX/flipY diretamente para a visibilidade e escala do nó visual", () => {
    let isVisible = true;
    let currentScale = { x: 1, y: 1 };

    const mockNode: IRenderNode = {
      id: "mock_flip_node",
      setPosition: vi.fn(),
      setScale: vi.fn((x: number, y: number) => {
        currentScale = { x, y };
      }),
      setRotation: vi.fn(),
      setOpacity: vi.fn(),
      setZIndex: vi.fn(),
      setVisible: vi.fn((visible: boolean) => {
        isVisible = visible;
      }),
      getPosition: () => ({ x: 0, y: 0 }),
      getScale: () => currentScale,
      getRotation: () => 0,
      getOpacity: () => 1,
      getZIndex: () => 0,
      isVisible: () => isVisible,
      destroy: vi.fn(),
      addChild: vi.fn(),
      removeChild: vi.fn(),
      getChildren: () => [],
      getNativeNode: <T>() => new Container() as unknown as T,
    };

    const mockEngine: IRenderEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => new PixiContainerNode(undefined, "stage"),
      getWorldContainer: () => new PixiContainerNode(undefined, "world"),
      getScreenContainer: () => new PixiContainerNode(undefined, "screen"),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      getTicker: () => ({
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      }),
      createContainer: vi.fn(() => mockNode as any),
      createSprite: vi.fn(() => mockNode as any),
      createGraphics: vi.fn(() => mockNode as any),
      createText: vi.fn(() => mockNode as any),
      destroy: vi.fn(),
    };

    const renderingContext = createRenderingContext(mockEngine, {
      loadScene: vi.fn(),
      getCurrentSceneName: () => "test",
    } as any);

    const testEntity = renderingContext.add([renderingContext.pos(10, 10)]);

    // Teste de ocultação (hidden -> setVisible)
    testEntity.hidden = true;
    expect(mockNode.setVisible).toHaveBeenCalledWith(false);
    expect(isVisible).toBe(false);

    testEntity.hidden = false;
    expect(mockNode.setVisible).toHaveBeenCalledWith(true);
    expect(isVisible).toBe(true);

    // Teste de flip horizontal (flipX)
    testEntity.scale = { x: 2, y: 3 };
    testEntity.flipX = true;
    expect(mockNode.setScale).toHaveBeenCalledWith(-2, 3);

    testEntity.flipX = false;
    expect(mockNode.setScale).toHaveBeenCalledWith(2, 3);

    // Teste de flip vertical (flipY)
    testEntity.flipY = true;
    expect(mockNode.setScale).toHaveBeenCalledWith(2, -3);
  });

  it("deve suportar chamadas move(vector) e moveTo(target, speed) de forma compatível com o Kaboom", () => {
    const mockNode: IRenderNode = {
      id: "mock_movement_node",
      setPosition: vi.fn(),
      setScale: vi.fn(),
      setRotation: vi.fn(),
      setOpacity: vi.fn(),
      setZIndex: vi.fn(),
      setVisible: vi.fn(),
      getPosition: () => ({ x: 0, y: 0 }),
      getScale: () => ({ x: 1, y: 1 }),
      getRotation: () => 0,
      getOpacity: () => 1,
      getZIndex: () => 0,
      isVisible: () => true,
      destroy: vi.fn(),
      addChild: vi.fn(),
      removeChild: vi.fn(),
      getChildren: () => [],
      getNativeNode: <T>() => new Container() as unknown as T,
    };

    const mockEngine: IRenderEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => new PixiContainerNode(undefined, "stage"),
      getWorldContainer: () => new PixiContainerNode(undefined, "world"),
      getScreenContainer: () => new PixiContainerNode(undefined, "screen"),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      getTicker: () => ({
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.05, // dt = 0.05s
      }),
      createContainer: vi.fn(() => mockNode as any),
      createSprite: vi.fn(() => mockNode as any),
      createGraphics: vi.fn(() => mockNode as any),
      createText: vi.fn(() => mockNode as any),
      destroy: vi.fn(),
    };

    const renderingContext = createRenderingContext(mockEngine, {
      loadScene: vi.fn(),
      getCurrentSceneName: () => "test",
    } as any);

    const testEntity = renderingContext.add([renderingContext.pos(100, 100)]);

    // move(speedVector)
    testEntity.move?.({ x: 200, y: -100 });
    // 100 + 200 * 0.05 = 110, 100 + (-100) * 0.05 = 95
    expect(testEntity.pos.x).toBeCloseTo(110, 2);
    expect(testEntity.pos.y).toBeCloseTo(95, 2);

    // moveTo com velocidade
    testEntity.moveTo?.({ x: 200, y: 95 }, 100);
    // deltaX = 90, deltaY = 0, dist = 90, step = 100 * 0.05 = 5 -> posX = 115
    expect(testEntity.pos.x).toBeCloseTo(115, 2);
    expect(testEntity.pos.y).toBeCloseTo(95, 2);

    // moveTo instantâneo (sem velocidade)
    testEntity.moveTo?.(500, 300);
    expect(testEntity.pos.x).toBe(500);
    expect(testEntity.pos.y).toBe(300);
  });

  it("deve integrar velocidade vel automaticamente a cada quadro respeitando o delta time", () => {
    const mockNode: IRenderNode = {
      id: "mock_vel_node",
      setPosition: vi.fn(),
      setScale: vi.fn(),
      setRotation: vi.fn(),
      setOpacity: vi.fn(),
      setZIndex: vi.fn(),
      setVisible: vi.fn(),
      getPosition: () => ({ x: 0, y: 0 }),
      getScale: () => ({ x: 1, y: 1 }),
      getRotation: () => 0,
      getOpacity: () => 1,
      getZIndex: () => 0,
      isVisible: () => true,
      destroy: vi.fn(),
      addChild: vi.fn(),
      removeChild: vi.fn(),
      getChildren: () => [],
      getNativeNode: <T>() => new Container() as unknown as T,
    };

    const mockEngine: IRenderEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => new PixiContainerNode(undefined, "stage"),
      getWorldContainer: () => new PixiContainerNode(undefined, "world"),
      getScreenContainer: () => new PixiContainerNode(undefined, "screen"),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      getTicker: () => ({
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.05,
      }),
      createContainer: vi.fn(() => mockNode as any),
      createSprite: vi.fn(() => mockNode as any),
      createGraphics: vi.fn(() => mockNode as any),
      createText: vi.fn(() => mockNode as any),
      destroy: vi.fn(),
    };

    const renderingContext = createRenderingContext(mockEngine, {
      loadScene: vi.fn(),
      getCurrentSceneName: () => "test",
    } as any);

    const testEntity = renderingContext.add([renderingContext.pos(100, 200)]);
    testEntity.vel = { x: 50, y: -20 } as any;

    expect(testEntity.vel?.x).toBe(50);
    expect(testEntity.vel?.y).toBe(-20);

    // Simula um tick de 0.05s no loop do contexto
    renderingContext.lifecycle.runSceneUpdateCallbacks(0.05);

    // 100 + 50 * 0.05 = 102.5, 200 - 20 * 0.05 = 199
    expect(testEntity.pos.x).toBeCloseTo(102.5, 2);
    expect(testEntity.pos.y).toBeCloseTo(199, 2);
    expect(mockNode.setPosition).toHaveBeenCalledWith(102.5, 199);
  });

  it("deve ocultar o nó visual do PixiJS ao aplicar o culling espacial recursivo", () => {
    let nodeVisibility = true;
    const mockNode: IRenderNode = {
      id: "mock_cull_node",
      setPosition: vi.fn(),
      setScale: vi.fn(),
      setRotation: vi.fn(),
      setOpacity: vi.fn(),
      setZIndex: vi.fn(),
      setVisible: vi.fn((visible: boolean) => {
        nodeVisibility = visible;
      }),
      getPosition: () => ({ x: 0, y: 0 }),
      getScale: () => ({ x: 1, y: 1 }),
      getRotation: () => 0,
      getOpacity: () => 1,
      getZIndex: () => 0,
      isVisible: () => nodeVisibility,
      destroy: vi.fn(),
      addChild: vi.fn(),
      removeChild: vi.fn(),
      getChildren: () => [],
      getNativeNode: <T>() => new Container() as unknown as T,
    };

    const mockEngine: IRenderEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => new PixiContainerNode(undefined, "stage"),
      getWorldContainer: () => new PixiContainerNode(undefined, "world"),
      getScreenContainer: () => new PixiContainerNode(undefined, "screen"),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      getTicker: () => ({
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      }),
      createContainer: vi.fn(() => mockNode as any),
      createSprite: vi.fn(() => mockNode as any),
      createGraphics: vi.fn(() => mockNode as any),
      createText: vi.fn(() => mockNode as any),
      destroy: vi.fn(),
    };

    const renderingContext = createRenderingContext(mockEngine, {
      loadScene: vi.fn(),
      getCurrentSceneName: () => "test",
    } as any);

    const testEntity = renderingContext.add([renderingContext.pos(500, 300)]);
    expect(mockNode.isVisible()).toBe(true);

    // Executa culling
    setEntityVisibilityRecursively(testEntity as any, true);
    expect(testEntity.hidden).toBe(true);
    expect(mockNode.setVisible).toHaveBeenCalledWith(false);
    expect(mockNode.isVisible()).toBe(false);

    // Reativa visibilidade
    setEntityVisibilityRecursively(testEntity as any, false);
    expect(testEntity.hidden).toBe(false);
    expect(mockNode.setVisible).toHaveBeenCalledWith(true);
    expect(mockNode.isVisible()).toBe(true);
  });

  it("deve mapear corretamente todas as variantes de alinhamento em resolveAnchorCoordinates", () => {
    const tableCases: Array<{ alignment: string; expectedX: number; expectedY: number }> = [
      { alignment: "center", expectedX: 0.5, expectedY: 0.5 },
      { alignment: "topleft", expectedX: 0, expectedY: 0 },
      { alignment: "top", expectedX: 0.5, expectedY: 0 },
      { alignment: "topright", expectedX: 1, expectedY: 0 },
      { alignment: "left", expectedX: 0, expectedY: 0.5 },
      { alignment: "right", expectedX: 1, expectedY: 0.5 },
      { alignment: "botleft", expectedX: 0, expectedY: 1 },
      { alignment: "bot", expectedX: 0.5, expectedY: 1 },
      { alignment: "bottom", expectedX: 0.5, expectedY: 1 },
      { alignment: "botright", expectedX: 1, expectedY: 1 },
      { alignment: "unknown_alignment", expectedX: 0, expectedY: 0 },
    ];

    for (const testCase of tableCases) {
      const resolved = resolveAnchorCoordinates(testCase.alignment);
      expect(resolved.anchorX).toBe(testCase.expectedX);
      expect(resolved.anchorY).toBe(testCase.expectedY);
    }
  });

  it("deve acumular o tempo através do relógio único de quadros com congelamento na pausa", () => {
    const mockEngine: IRenderEngine = {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => new PixiContainerNode(undefined, "stage"),
      getWorldContainer: () => new PixiContainerNode(undefined, "world"),
      getScreenContainer: () => new PixiContainerNode(undefined, "screen"),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      getTicker: () => ({
        add: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      }),
      createContainer: vi.fn(() => new PixiContainerNode(undefined, "c") as any),
      createSprite: vi.fn(() => new PixiContainerNode(undefined, "s") as any),
      createGraphics: vi.fn(() => new PixiContainerNode(undefined, "g") as any),
      createText: vi.fn(() => new PixiContainerNode(undefined, "t") as any),
      destroy: vi.fn(),
    };

    const renderingContext = createRenderingContext(mockEngine, {
      loadScene: vi.fn(),
      getCurrentSceneName: () => "test",
    } as any);

    const initialTime = renderingContext.time();
    expect(initialTime).toBeGreaterThan(0);

    // Simula 3 quadros de 0.02s
    renderingContext.lifecycle.runSceneUpdateCallbacks(0.02);
    expect(renderingContext.time()).toBeCloseTo(initialTime + 0.02, 3);
    renderingContext.lifecycle.runSceneUpdateCallbacks(0.02);
    expect(renderingContext.time()).toBeCloseTo(initialTime + 0.04, 3);
    renderingContext.lifecycle.runSceneUpdateCallbacks(0.02);
    expect(renderingContext.time()).toBeCloseTo(initialTime + 0.06, 3);
  });
});

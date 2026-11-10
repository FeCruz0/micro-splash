import { describe, it, expect } from "vitest";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import type { IRenderNode } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("RenderingContextEntity .add() encadeado e hierarquia de nós PixiJS v8", () => {
  it("permite que uma entidade pai anexe entidades filhas via .add()", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const parentEntity = renderingContextInstance.add([
      renderingContextInstance.pos(100, 200),
      renderingContextInstance.rect(50, 50),
      "parentTag",
    ]);

    expect(parentEntity).toBeDefined();
    expect(parentEntity.pos.x).toBe(100);
    expect(parentEntity.pos.y).toBe(200);
    expect(parentEntity.children).toBeDefined();
    expect(parentEntity.children?.length).toBe(0);

    const childEntity = parentEntity.add([
      renderingContextInstance.pos(10, 20),
      renderingContextInstance.rect(20, 20),
      "childTag",
    ]);

    expect(childEntity).toBeDefined();
    expect(childEntity.pos.x).toBe(10);
    expect(childEntity.pos.y).toBe(20);
    expect(parentEntity.children?.length).toBe(1);
    expect(parentEntity.children?.[0]).toBe(childEntity);
  });

  it("permite múltiplos níveis de encadeamento hierárquico (parent -> child -> grandChild)", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const rootEntity = renderingContextInstance.add([renderingContextInstance.pos(0, 0)]);

    const childEntity = rootEntity.add([renderingContextInstance.pos(5, 5)]);

    const grandChildEntity = childEntity.add([renderingContextInstance.pos(2, 2)]);

    expect(rootEntity.children?.length).toBe(1);
    expect(rootEntity.children?.[0]).toBe(childEntity);

    expect(childEntity.children?.length).toBe(1);
    expect(childEntity.children?.[0]).toBe(grandChildEntity);

    expect(grandChildEntity.children?.length).toBe(0);
  });

  it("destrói recursivamente os filhos ao destruir a entidade pai", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    let childDestroyCount = 0;
    const parentEntity = renderingContextInstance.add([renderingContextInstance.pos(10, 10)]);

    const childEntity = parentEntity.add([
      renderingContextInstance.pos(5, 5),
      {
        customCleanUp() {
          childDestroyCount++;
        },
      },
    ]);
    expect(childEntity).toBeDefined();

    expect(parentEntity.children?.length).toBe(1);
    parentEntity.destroy();

    expect(parentEntity.children?.length).toBe(0);
  });

  it("incorpora métodos e propriedades de componentes customizados não descritores", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    let wasRevealed = false;
    const entityWithCustomMethods = renderingContextInstance.add([
      renderingContextInstance.pos(10, 10),
      {
        reveal() {
          wasRevealed = true;
        },
      },
    ]);

    expect(typeof (entityWithCustomMethods as unknown as { reveal?: () => void }).reveal).toBe(
      "function"
    );
    (entityWithCustomMethods as unknown as { reveal: () => void }).reveal();
    expect(wasRevealed).toBe(true);
  });

  it("anexa o nó visual do filho diretamente ao nó visual do pai quando a engine estiver inicializada", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();

    const addedChildNodesList: IRenderNode[] = [];
    const mockParentRenderNode: IRenderNode = {
      id: "parent_node",
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
      addChild: (childNode: IRenderNode) => {
        addedChildNodesList.push(childNode);
      },
      removeChild: () => {},
      getChildren: () => addedChildNodesList,
      getNativeNode: () => ({}) as any,
    };

    // Forçamos renderEngineAdapterInstance a estar inicializado com mock de nós
    Object.defineProperty(renderEngineAdapterInstance, "isInitialized", {
      get: () => true,
    });
    renderEngineAdapterInstance.getWorldContainer = () => mockParentRenderNode;
    renderEngineAdapterInstance.createGraphics = (id: string) => {
      const graphicsNode: IRenderNode = {
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
        addChild: (c: IRenderNode) => {
          addedChildNodesList.push(c);
        },
        removeChild: () => {},
        getChildren: () => [],
        getNativeNode: () => ({}) as any,
      };
      (graphicsNode as unknown as { drawRect: () => void; clear: () => void }).drawRect = () => {};
      (graphicsNode as unknown as { drawRect: () => void; clear: () => void }).clear = () => {};
      return graphicsNode as unknown as ReturnType<RenderEngineAdapter["createGraphics"]>;
    };

    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const parentEntity = renderingContextInstance.add([
      renderingContextInstance.pos(100, 100),
      renderingContextInstance.rect(40, 40),
    ]);

    expect(parentEntity.renderNode).toBeDefined();

    const childEntity = parentEntity.add([
      renderingContextInstance.pos(10, 10),
      renderingContextInstance.rect(10, 10),
    ]);

    expect(childEntity.renderNode).toBeDefined();
    // O filho deve ter sido adicionado à lista de nós filhos do pai
    expect(addedChildNodesList).toContain(childEntity.renderNode);
  });

  it("suporta registro e execução do ciclo de vida onDestroy na entidade", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    let firstDestroyCallbackExecuted = false;
    let secondDestroyCallbackExecuted = false;
    let cancelledDestroyCallbackExecuted = false;

    const testEntity = renderingContextInstance.add([
      renderingContextInstance.pos(50, 50),
      "destructibleEntity",
    ]);

    expect(testEntity.exists()).toBe(true);

    testEntity.onDestroy(() => {
      firstDestroyCallbackExecuted = true;
    });

    testEntity.onDestroy(() => {
      secondDestroyCallbackExecuted = true;
    });

    const cancellableHandle = testEntity.onDestroy(() => {
      cancelledDestroyCallbackExecuted = true;
    });
    cancellableHandle.cancel();

    testEntity.destroy();

    expect(firstDestroyCallbackExecuted).toBe(true);
    expect(secondDestroyCallbackExecuted).toBe(true);
    expect(cancelledDestroyCallbackExecuted).toBe(false);
    expect(testEntity.exists()).toBe(false);
  });

  it("despacha onUpdate pelo ciclo do contexto e cancela automaticamente ao destruir", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    let updateTicksCount = 0;
    let receivedDeltaTime = 0;

    const testEntity = renderingContextInstance.add([renderingContextInstance.pos(10, 10)]);

    testEntity.onUpdate((deltaTimeInSeconds?: number) => {
      updateTicksCount++;
      receivedDeltaTime = deltaTimeInSeconds ?? 0;
    });

    renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
    expect(updateTicksCount).toBe(1);
    expect(receivedDeltaTime).toBe(0.016);

    testEntity.destroy();

    renderingContextInstance.lifecycle.runSceneUpdateCallbacks(0.016);
    expect(updateTicksCount).toBe(1);
  });

  it("suporta registro e cancelamento de eventos de colisão onCollide e verificação com is()", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const testEntity = renderingContextInstance.add([
      renderingContextInstance.pos(0, 0),
      "playerWhale",
    ]);

    expect(testEntity.is?.("playerWhale")).toBe(true);
    expect(testEntity.is?.("enemyShark")).toBe(false);
    expect(testEntity.tag).toBe("playerWhale");

    let specificCollisionDetected = false;
    let genericCollisionDetected = false;
    let cancelledCollisionDetected = false;

    testEntity.onCollide("krill", (collidedEntity: unknown) => {
      specificCollisionDetected = true;
      expect((collidedEntity as { tag?: string }).tag).toBe("krill");
    });

    testEntity.onCollide((collidedEntity: unknown) => {
      genericCollisionDetected = true;
      expect(collidedEntity).toBeDefined();
    });

    const cancellableCollisionHandle = testEntity.onCollide("obstacle", () => {
      cancelledCollisionDetected = true;
    });
    cancellableCollisionHandle.cancel();

    const mockKrillEntity = {
      tag: "krill",
      is: (tag: string) => tag === "krill",
    };

    testEntity.triggerCollision?.(mockKrillEntity, "krill");

    expect(specificCollisionDetected).toBe(true);
    expect(genericCollisionDetected).toBe(true);
    expect(cancelledCollisionDetected).toBe(false);
  });

  it("permite leitura e escrita dinâmica na propriedade tag sem disparar TypeError", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const testEntity = renderingContextInstance.add([
      renderingContextInstance.pos(0, 0),
      "tagOriginal",
    ]);

    expect(testEntity.tag).toBe("tagOriginal");
    expect(testEntity.is?.("tagOriginal")).toBe(true);

    expect(() => {
      testEntity.tag = "nova-tag-dinamica";
    }).not.toThrow();

    expect(testEntity.tag).toBe("nova-tag-dinamica");
    expect(testEntity.is?.("nova-tag-dinamica")).toBe(true);

    const taggedEntitiesList = renderingContextInstance.get("nova-tag-dinamica");
    expect(taggedEntitiesList).toContain(testEntity);
  });

  it("suporta criação e renderização de formas poligonais via polygon() no PixiJS v8", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const trianglePoints = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
    ];

    const polygonDescriptor = renderingContextInstance.polygon(trianglePoints);
    expect(polygonDescriptor.type).toBe("polygon");
    expect(polygonDescriptor.pts).toEqual(trianglePoints);
    expect(polygonDescriptor.points).toEqual(trianglePoints);

    const polygonEntity = renderingContextInstance.add([
      renderingContextInstance.pos(20, 30),
      polygonDescriptor,
      renderingContextInstance.color(200, 230, 255),
      renderingContextInstance.outline(2, [100, 150, 200]),
      renderingContextInstance.opacity(0.8),
    ]);

    expect(polygonEntity).toBeDefined();
    expect(polygonEntity.pts).toEqual(trianglePoints);
    expect(polygonEntity.points).toEqual(trianglePoints);

    const updatedPoints = [
      { x: 10, y: 10 },
      { x: 120, y: 10 },
      { x: 60, y: 90 },
    ];
    polygonEntity.pts = updatedPoints;
    expect(polygonEntity.pts).toEqual(updatedPoints);
  });

  it("suporta registro e despacho de onCollideUpdate e onCollideEnd nas entidades", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    const playerEntity = renderingContextInstance.add([
      renderingContextInstance.pos(0, 0),
      "playerWhale",
    ]);

    let collisionUpdateTriggerCount = 0;
    let collisionEndTriggerCount = 0;

    const cancelUpdateHandle = playerEntity.onCollideUpdate("currentZone", () => {
      collisionUpdateTriggerCount++;
    });

    const cancelEndHandle = playerEntity.onCollideEnd("currentZone", () => {
      collisionEndTriggerCount++;
    });

    const currentZoneEntity = {
      tag: "currentZone",
      is: (tag: string) => tag === "currentZone",
    };

    playerEntity.triggerCollisionUpdate?.(currentZoneEntity, "currentZone");
    playerEntity.triggerCollisionEnd?.(currentZoneEntity, "currentZone");

    expect(collisionUpdateTriggerCount).toBe(1);
    expect(collisionEndTriggerCount).toBe(1);

    cancelUpdateHandle.cancel();
    cancelEndHandle.cancel();

    playerEntity.triggerCollisionUpdate?.(currentZoneEntity, "currentZone");
    playerEntity.triggerCollisionEnd?.(currentZoneEntity, "currentZone");

    expect(collisionUpdateTriggerCount).toBe(1);
    expect(collisionEndTriggerCount).toBe(1);
  });

  it("suporta registro e despacho global de onCollideUpdate e onCollideEnd no contexto", () => {
    const renderEngineAdapterInstance = new RenderEngineAdapter();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      renderEngineAdapterInstance,
      sceneManagerInstance
    );

    let globalUpdateCalledWithPlayer: unknown = null;
    let globalUpdateCalledWithStream: unknown = null;
    let globalEndCalledWithPlayer: unknown = null;
    let globalEndCalledWithStream: unknown = null;

    const cancelGlobalUpdate = renderingContextInstance.onCollideUpdate(
      "player",
      "upwelling",
      (playerObject, streamObject) => {
        globalUpdateCalledWithPlayer = playerObject;
        globalUpdateCalledWithStream = streamObject;
      }
    );

    const cancelGlobalEnd = renderingContextInstance.onCollideEnd(
      "player",
      "upwelling",
      (playerObject, streamObject) => {
        globalEndCalledWithPlayer = playerObject;
        globalEndCalledWithStream = streamObject;
      }
    );

    const mockPlayer = { tag: "player", is: (tag: string) => tag === "player" };
    const mockStream = { tag: "upwelling", is: (tag: string) => tag === "upwelling" };

    renderingContextInstance.triggerCollisionUpdate?.(
      mockPlayer,
      mockStream,
      "player",
      "upwelling"
    );
    expect(globalUpdateCalledWithPlayer).toBe(mockPlayer);
    expect(globalUpdateCalledWithStream).toBe(mockStream);

    renderingContextInstance.triggerCollisionEnd?.(mockPlayer, mockStream, "player", "upwelling");
    expect(globalEndCalledWithPlayer).toBe(mockPlayer);
    expect(globalEndCalledWithStream).toBe(mockStream);

    cancelGlobalUpdate.cancel();
    cancelGlobalEnd.cancel();

    globalUpdateCalledWithPlayer = null;
    globalEndCalledWithPlayer = null;

    renderingContextInstance.triggerCollisionUpdate?.(
      mockPlayer,
      mockStream,
      "player",
      "upwelling"
    );
    renderingContextInstance.triggerCollisionEnd?.(mockPlayer, mockStream, "player", "upwelling");

    expect(globalUpdateCalledWithPlayer).toBeNull();
    expect(globalEndCalledWithPlayer).toBeNull();
  });
});

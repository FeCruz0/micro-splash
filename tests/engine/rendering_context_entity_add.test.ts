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
});

import { describe, it, expect, vi } from "vitest";
import {
  createRenderingContext,
  type RenderingContext,
} from "../../src/engine/adapters/RenderingContextAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import { registerAllScenes } from "../../src/scenes";
import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
  ITextNode,
  IRenderTicker,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import mainSourceCode from "../../src/main.ts?raw";

describe("Etapa 5.1b — Remoção definitiva de createPixiBridgeContext e migração para RenderingContext", () => {
  it("src/main.ts não possui mais a função legada createPixiBridgeContext nem referências a engineBridge", () => {
    expect(mainSourceCode).not.toContain("function createPixiBridgeContext");
    expect(mainSourceCode).not.toContain("createPixiBridgeContext(");
    expect(mainSourceCode).not.toContain("const engineBridge =");
    expect(mainSourceCode).not.toContain("engineBridge");
  });

  it("src/main.ts exporta renderingContext tipado e orquestra o bootstrap via contratos da engine", () => {
    expect(mainSourceCode).toContain("export const renderingContext");
    expect(mainSourceCode).toMatch(/createRenderingContext\s*\(\s*renderEngine,\s*sceneManager\s*\)/);
    expect(mainSourceCode).toContain("registerAllScenes(renderingContext, sceneManager)");
    expect(mainSourceCode).toContain("await loadGameAssetsWithTimeout()");
    expect(mainSourceCode).not.toContain("await loadAllGameAssets()");
  });

  function createMockRenderEngine(): IRenderEngine {
    const createdNodesList: IRenderNode[] = [];
    const worldContainerMock: IRenderNode = {
      id: "world_container",
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
      addChild: vi.fn((node: IRenderNode) => createdNodesList.push(node)),
      removeChild: vi.fn(),
      getChildren: () => createdNodesList,
      destroy: vi.fn(),
      getNativeNode: () => ({}) as any,
    };

    const screenContainerMock: IRenderNode = {
      id: "screen_container",
      getPosition: () => ({ x: 0, y: 0 }),
      setPosition: vi.fn(),
      getScale: () => ({ x: 1, y: 1 }),
      setScale: vi.fn(),
      getRotation: () => 0,
      setRotation: vi.fn(),
      getOpacity: () => 1,
      setOpacity: vi.fn(),
      getZIndex: () => 100,
      setZIndex: vi.fn(),
      isVisible: () => true,
      setVisible: vi.fn(),
      addChild: vi.fn((node: IRenderNode) => createdNodesList.push(node)),
      removeChild: vi.fn(),
      getChildren: () => createdNodesList,
      destroy: vi.fn(),
      getNativeNode: () => ({}) as any,
    };

    const stageRootMock: IRenderNode = {
      id: "stage_root",
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
      addChild: vi.fn(),
      removeChild: vi.fn(),
      getChildren: () => [worldContainerMock, screenContainerMock],
      destroy: vi.fn(),
      getNativeNode: () => ({}) as any,
    };

    const tickerMock: IRenderTicker = {
      add: vi.fn(() => () => {}),
      start: vi.fn(),
      stop: vi.fn(),
      getFPS: () => 60,
      getDeltaTime: () => 0.0166,
    };

    let cameraCoordinateX = 0;
    let cameraCoordinateY = 0;

    return {
      isInitialized: true,
      init: vi.fn(),
      resize: vi.fn(),
      getDimensions: () => ({ width: 1280, height: 720 }),
      getCanvas: () => null,
      getStageRoot: () => stageRootMock,
      getWorldContainer: () => worldContainerMock,
      getScreenContainer: () => screenContainerMock,
      getCameraPosition: () => ({ x: cameraCoordinateX, y: cameraCoordinateY }),
      setCameraPosition: vi.fn((x: number, y: number) => {
        cameraCoordinateX = x;
        cameraCoordinateY = y;
      }),
      shake: vi.fn(),
      getTicker: () => tickerMock,
      createContainer: vi.fn(() => worldContainerMock),
      createSprite: vi.fn(),
      createGraphics: vi.fn((id?: string) => {
        const graphicsNode: IGraphicsNode = {
          id: id ?? "mock_graphics",
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
          addChild: vi.fn(),
          removeChild: vi.fn(),
          getChildren: () => [],
          destroy: vi.fn(),
          getNativeNode: () => ({}) as any,
          clear: vi.fn(),
          drawRect: vi.fn(),
          drawRoundedRect: vi.fn(),
          drawCircle: vi.fn(),
          drawPolygon: vi.fn(),
          drawLine: vi.fn(),
        };
        return graphicsNode;
      }),
      createText: vi.fn((content: string, _style?: unknown, id?: string) => {
        let textValue = content;
        const textNode: ITextNode = {
          id: id ?? "mock_text",
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
          addChild: vi.fn(),
          removeChild: vi.fn(),
          getChildren: () => [],
          destroy: vi.fn(),
          getNativeNode: () => ({}) as any,
          getText: () => textValue,
          setText: vi.fn((val: string) => {
            textValue = val;
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

  it("createRenderingContext gerencia propriedades, dimensões e delegação de cenas para SceneManager", () => {
    const mockEngine = createMockRenderEngine();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance: RenderingContext = createRenderingContext(
      mockEngine,
      sceneManagerInstance
    );

    expect(renderingContextInstance.width()).toBe(1280);
    expect(renderingContextInstance.height()).toBe(720);
    expect(renderingContextInstance.dt()).toBeCloseTo(0.0166, 3);
    expect(renderingContextInstance.vec2(100, 200)).toEqual({ x: 100, y: 200 });
    expect(renderingContextInstance.rgb(255, 128, 0)).toEqual([255, 128, 0]);

    renderingContextInstance.shake(8);
    expect(mockEngine.shake).toHaveBeenCalledWith(8);

    renderingContextInstance.camPos(450, 220);
    expect(mockEngine.setCameraPosition).toHaveBeenCalledWith(450, 220);
  });

  it("registerAllScenes registra todas as cenas canônicas utilizando o renderingContext tipado", () => {
    const mockEngine = createMockRenderEngine();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance: RenderingContext = createRenderingContext(
      mockEngine,
      sceneManagerInstance
    );

    registerAllScenes(renderingContextInstance, sceneManagerInstance);

    const registeredSceneNames = [
      "splash",
      "menu",
      "start",
      "kiosk",
      "game",
      "rescue",
      "gameover",
    ];

    for (const sceneIdentifier of registeredSceneNames) {
      expect(sceneManagerInstance.hasScene(sceneIdentifier)).toBe(true);
    }
  });

  it("renderingContext.add cria entidades com nós gráficos de tela ou mundo", () => {
    const mockEngine = createMockRenderEngine();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      mockEngine,
      sceneManagerInstance
    );

    const rectangleEntity = renderingContextInstance.add([
      renderingContextInstance.rect(200, 100),
      renderingContextInstance.pos(50, 60),
      renderingContextInstance.color(10, 20, 30),
      renderingContextInstance.fixed(),
      renderingContextInstance.z(10),
    ]);

    expect(rectangleEntity.fixed).toBe(true);
    expect(mockEngine.createGraphics).toHaveBeenCalled();

    const textEntity = renderingContextInstance.add([
      renderingContextInstance.text("Texto de Teste", { size: 18, font: "Outfit" }),
      renderingContextInstance.pos(100, 120),
      renderingContextInstance.opacity(0.8),
    ]);

    expect(textEntity.text).toBe("Texto de Teste");
    expect(mockEngine.createText).toHaveBeenCalled();

    textEntity.destroy();
    rectangleEntity.destroy();
  });

  it("implementa utilitários matemáticos e de desenho necessários para a tela splash sem lançar TypeError", () => {
    const mockEngine = createMockRenderEngine();
    const sceneManagerInstance = new SceneManager();
    const renderingContextInstance = createRenderingContext(
      mockEngine,
      sceneManagerInstance
    );

    // Math utilities
    const randomRangeValue = renderingContextInstance.rand(10, 20);
    expect(randomRangeValue).toBeGreaterThanOrEqual(10);
    expect(randomRangeValue).toBeLessThanOrEqual(20);

    const chosenOption = renderingContextInstance.choose(["alpha", "beta", "gamma"]);
    expect(["alpha", "beta", "gamma"]).toContain(chosenOption);

    expect(renderingContextInstance.clamp(5, 10, 20)).toBe(10);
    expect(renderingContextInstance.clamp(25, 10, 20)).toBe(20);
    expect(renderingContextInstance.clamp(15, 10, 20)).toBe(15);

    expect(renderingContextInstance.lerp(10, 20, 0.5)).toBe(15);
    expect(renderingContextInstance.deg2rad(180)).toBeCloseTo(Math.PI);
    expect(renderingContextInstance.rad2deg(Math.PI)).toBeCloseTo(180);
    expect(renderingContextInstance.time()).toBeGreaterThan(0);

    // Geometry / Component creation
    const circleComponent = renderingContextInstance.circle(25);
    expect(circleComponent).toEqual({ type: "circle", radius: 25 });

    const anchorComponent = renderingContextInstance.anchor("center");
    expect(anchorComponent).toEqual({ type: "anchor", anchorPoint: "center" });

    const outlineComponent = renderingContextInstance.outline(2, [255, 0, 0]);
    expect(outlineComponent).toEqual({ type: "outline", width: 2, color: [255, 0, 0] });

    const scaleComponent = renderingContextInstance.scale(1.5);
    expect(scaleComponent).toEqual({ type: "scale", scaleX: 1.5, scaleY: 1.5 });

    const rotateComponent = renderingContextInstance.rotate(45);
    expect(rotateComponent).toEqual({ type: "rotate", angle: 45 });

    const spriteComponent = renderingContextInstance.sprite("baleia", { anim: "swim" });
    expect(spriteComponent).toEqual({
      type: "sprite",
      sprite: "baleia",
      options: { anim: "swim" },
    });

    // Test adding a circle entity
    const circleEntity = renderingContextInstance.add([
      renderingContextInstance.circle(12),
      renderingContextInstance.pos(30, 40),
      renderingContextInstance.color(140, 225, 255),
      renderingContextInstance.opacity(0.5),
      renderingContextInstance.z(2),
    ]);
    expect(circleEntity).toBeDefined();
    expect(circleEntity.pos.x).toBe(30);
    expect(circleEntity.pos.y).toBe(40);
    expect(circleEntity.opacity).toBe(0.5);
    expect(mockEngine.createGraphics).toHaveBeenCalled();
    circleEntity.destroy();

    // Test onClick
    const clickHandler = vi.fn();
    const clickListener = renderingContextInstance.onClick(clickHandler);
    expect(clickListener).toHaveProperty("cancel");
    clickListener.cancel();
  });
});

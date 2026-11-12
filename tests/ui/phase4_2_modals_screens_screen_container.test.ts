import { describe, it, expect, vi, beforeEach } from "vitest";
import { createModalShell } from "../../src/ui/shared/modalShell";
import { createCardButton } from "../../src/ui/shared/cardButton";
import { createTabBar } from "../../src/ui/shared/tabBar";
import { showQuizModal } from "../../src/ui/quizModal";
import { showInitialsInputModal } from "../../src/ui/initialsInputModal";
import { showStatsModal } from "../../src/ui/statsModal";
import { showPwaInstallModal } from "../../src/ui/pwaInstallModal";
import { addShadowedText } from "../../src/ui/textUtils";
import {
  getScreenLayerGeometryChecker,
  resetScreenLayerGeometryChecker,
} from "../../src/engine/screenLayerGeometryChecker";
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

describe("Etapa 4.2: Migração de Modais e Telas para screenContainer e Foco Geométrico", () => {
  let worldContainer: PixiContainerNode;
  let screenContainer: PixiContainerNode;
  let stageRoot: PixiContainerNode;
  let mockEngine: IRenderEngine;
  let createdNodes: (IRenderNode | IGraphicsNode | ITextNode)[];
  let tickerCallbacks: ((deltaTimeInSeconds: number) => void)[];

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
        add: (callback: (deltaTimeInSeconds: number) => void) => {
          tickerCallbacks.push(callback);
          return () => {
            const index = tickerCallbacks.indexOf(callback);
            if (index !== -1) tickerCallbacks.splice(index, 1);
          };
        },
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      }),
      createContainer: (id?: string) => {
        const node = new PixiContainerNode(undefined, id);
        createdNodes.push(node);
        return node;
      },
      createGraphics: (id?: string) => {
        const node = new PixiGraphicsNode(undefined, id);
        createdNodes.push(node);
        return node;
      },
      createText: (text: string, options?: unknown, id?: string) => {
        const node = new PixiTextNode(text, undefined, id);
        node.setText(text);
        if (options && typeof options === "object") {
          const opts = options as { color?: [number, number, number] };
          if (opts.color) node.setColor(opts.color);
        }
        createdNodes.push(node);
        return node;
      },
      createSprite: () => {
        throw new Error("Não utilizado");
      },
      destroy: vi.fn(),
    };
  });

  it("modalShell anexa seus elementos diretamente ao screenContainer (não ao worldContainer nem ao stageRoot)", () => {
    const shell = createModalShell(mockEngine, {
      title: "TESTE MODAL",
      customWidth: 800,
      customHeight: 500,
      onClose: vi.fn(),
    });

    const screenChildren = screenContainer.getChildren();
    const worldChildren = worldContainer.getChildren();

    expect(screenChildren.length).toBeGreaterThan(0);
    expect(worldChildren.length).toBe(0);

    // Todos os elementos criados no shell estão em screenContainer
    shell.elements.forEach((element) => {
      const renderNode = element as unknown as IRenderNode;
      expect(screenChildren).toContain(renderNode);
    });

    // Possui retângulo de foco geométrico para navegação acessível
    expect(shell.focusItems.length).toBeGreaterThan(0);
    const closeFocus = shell.focusItems[0];
    expect(closeFocus.width).toBe(38);
    expect(closeFocus.height).toBe(38);
    expect(typeof closeFocus.onActivate).toBe("function");

    shell.close();
    expect(screenContainer.getChildren().length).toBe(0);
  });

  it("cardButton anexa elementos visuais ao screenContainer e fornece FocusableItem sem acoplamento a broadphase", () => {
    const onClick = vi.fn();
    const buttonHandle = createCardButton(mockEngine, {
      label: "INICIAR JOGO",
      pos: { x: 640, y: 360 },
      width: 220,
      height: 48,
      variant: "primary",
      onClick,
    });

    const screenChildren = screenContainer.getChildren();
    expect(screenChildren.length).toBe(2); // btnNode e txtNode
    expect(worldContainer.getChildren().length).toBe(0);

    // O focusItem gerado possui propriedades de AABB geométrico puro
    expect(buttonHandle.focusItem.pos).toEqual({ x: 640, y: 360 });
    expect(buttonHandle.focusItem.width).toBe(220);
    expect(buttonHandle.focusItem.height).toBe(48);

    // Ao ativar o foco, chama a ação do botão
    buttonHandle.focusItem.onActivate();
    expect(onClick).toHaveBeenCalledTimes(1);

    buttonHandle.destroy();
    expect(screenContainer.getChildren().length).toBe(0);
  });

  it("tabBar anexa todas as abas no screenContainer e expõe focusItems geométricos", () => {
    const onTabChange = vi.fn();
    const tabBarHandle = createTabBar(mockEngine, {
      tabs: [
        { id: "geral", label: "Geral" },
        { id: "audio", label: "Áudio" },
      ],
      activeTab: "geral",
      centerX: 640,
      posY: 100,
      containerWidth: 600,
      onTabChange,
    });

    const screenChildren = screenContainer.getChildren();
    expect(screenChildren.length).toBe(4); // 2 botões + 2 rótulos
    expect(worldContainer.getChildren().length).toBe(0);

    expect(tabBarHandle.focusItems.length).toBe(2);
    expect(tabBarHandle.focusItems[0].width).toBeGreaterThan(0);
    expect(tabBarHandle.focusItems[0].height).toBe(42);

    tabBarHandle.focusItems[1].onActivate();
    expect(tabBarHandle.getActiveTab()).toBe("audio");
    expect(onTabChange).toHaveBeenCalledWith("audio");

    tabBarHandle.destroy();
    expect(screenContainer.getChildren().length).toBe(0);
  });

  it("quizModal monta todos os seus elementos estáticos e dinâmicos no screenContainer", () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const mockGameState = {
      getUnlockedFactIds: () => ["antartica_krill_swarms"],
      getMode: () => "standard",
      getQuizScore: () => 0,
    } as unknown as Parameters<typeof showQuizModal>[1];

    showQuizModal(mockEngine, mockGameState, onComplete, onCancel);

    const screenChildren = screenContainer.getChildren();
    expect(screenChildren.length).toBeGreaterThan(3); // backdrop, card, title, btnClose, etc.
    expect(worldContainer.getChildren().length).toBe(0);
  });

  it("initialsInputModal monta backdrop, card e botões no screenContainer", () => {
    showInitialsInputModal(mockEngine, 1500, 1200, "standard", vi.fn());

    const screenChildren = screenContainer.getChildren();
    expect(screenChildren.length).toBeGreaterThan(4);
    expect(worldContainer.getChildren().length).toBe(0);
  });

  it("statsModal monta métricas e botões no screenContainer", () => {
    showStatsModal(mockEngine, vi.fn());

    const screenChildren = screenContainer.getChildren();
    expect(screenChildren.length).toBeGreaterThan(5);
    expect(worldContainer.getChildren().length).toBe(0);
  });

  it("pwaInstallModal monta overlay e botões no screenContainer", () => {
    showPwaInstallModal(mockEngine, {
      onClose: vi.fn(),
      onInstalled: vi.fn(),
    });

    const screenChildren = screenContainer.getChildren();
    expect(screenChildren.length).toBeGreaterThan(3);
    expect(worldContainer.getChildren().length).toBe(0);
  });

  it("addShadowedText aplica anchor center e cor personalizada no pipeline nativo Pixi", () => {
    const handle = addShadowedText(mockEngine, "TÍTULO CENTRALIZADO", {
      pos: { x: 640, y: 120 },
      size: 26,
      color: [255, 225, 100],
      anchor: "center",
      z: 303,
    });

    const mainNode = (handle.main as unknown as { getNode: () => ITextNode }).getNode();
    const shadowNode = (handle.shadow as unknown as { getNode: () => ITextNode }).getNode();

    expect(mainNode.getAnchor?.()).toEqual({ x: 0.5, y: 0.5 });
    expect(shadowNode.getAnchor?.()).toEqual({ x: 0.5, y: 0.5 });
    expect(mainNode.getColor()).toEqual([255, 225, 100]);

    handle.destroy();
    expect(screenContainer.getChildren().length).toBe(0);
  });

  it("tabBar e cardButton centralizam âncora de texto e limpam hit targets ao destruir", () => {
    resetScreenLayerGeometryChecker();
    const checker = getScreenLayerGeometryChecker();
    const onTabChange = vi.fn();
    const onButtonClick = vi.fn();

    const tabBarHandle = createTabBar(mockEngine, {
      tabs: [
        { id: "global", label: "Global Online" },
        { id: "local", label: "Local / Totem" },
      ],
      activeTab: "global",
      posY: 140,
      containerWidth: 800,
      centerX: 640,
      onTabChange,
    });

    const buttonHandle = createCardButton(mockEngine, {
      label: "Fechar (ESC) ✕",
      pos: { x: 640, y: 500 },
      width: 280,
      height: 46,
      onClick: onButtonClick,
    });

    const textNodes = createdNodes.filter((node): node is ITextNode => "getAnchor" in node);
    expect(textNodes.length).toBe(3);
    textNodes.forEach((textNode) => {
      expect(textNode.getAnchor?.()).toEqual({ x: 0.5, y: 0.5 });
    });

    expect(checker.getRegisteredTargets().length).toBe(3);
    checker.dispatchClick({ x: 640, y: 500 });
    expect(onButtonClick).toHaveBeenCalledTimes(1);

    tabBarHandle.destroy();
    buttonHandle.destroy();
    expect(checker.getRegisteredTargets().length).toBe(0);
    resetScreenLayerGeometryChecker();
  });
});

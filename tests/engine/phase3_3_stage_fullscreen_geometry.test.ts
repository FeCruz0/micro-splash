import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  fullscreenHandler,
  handleFullscreenKeyboardEvent,
  initializeFullscreenHandler,
  isDocumentFullscreen,
  requestDocumentFullscreen,
  exitDocumentFullscreen,
  toggleDocumentFullscreen,
} from "../../src/systems/fullscreenHandler";
import {
  ScreenLayerGeometryChecker,
  initScreenLayerGeometryChecker,
  getScreenLayerGeometryChecker,
  resetScreenLayerGeometryChecker,
  isPointInsideRectangle,
  isPointInsideCircle,
  type ScreenLayerHitTarget,
} from "../../src/engine/screenLayerGeometryChecker";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";

describe("Etapa 3.3: Fullscreen API nativa (F11), stage eventMode none e ScreenLayerGeometryChecker", () => {
  interface MockElement {
    tagName: string;
    requestFullscreen: ReturnType<typeof vi.fn>;
    getBoundingClientRect: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  }

  let mockDocument: {
    fullscreenElement: MockElement | null;
    documentElement: { requestFullscreen: ReturnType<typeof vi.fn> };
    exitFullscreen: ReturnType<typeof vi.fn>;
    createElement: (tag: string) => MockElement;
  };

  let mockWindow: {
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockDocument = {
      fullscreenElement: null,
      documentElement: {
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
      },
      exitFullscreen: vi.fn().mockResolvedValue(undefined),
      createElement: (tag: string): MockElement => ({
        tagName: tag.toUpperCase(),
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
        getBoundingClientRect: vi.fn().mockReturnValue({
          left: 100,
          top: 50,
          width: 640,
          height: 360,
        }),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    };

    mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    vi.stubGlobal("document", mockDocument);
    vi.stubGlobal("window", mockWindow);
    resetScreenLayerGeometryChecker();
  });

  afterEach(() => {
    resetScreenLayerGeometryChecker();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("1. Fullscreen Handler e atalho F11", () => {
    it("deve detectar estado de tela cheia a partir de document.fullscreenElement e fallbacks", () => {
      mockDocument.fullscreenElement = null;
      expect(isDocumentFullscreen()).toBe(false);

      mockDocument.fullscreenElement = mockDocument.createElement("div");
      expect(isDocumentFullscreen()).toBe(true);
    });

    it("deve solicitar tela cheia chamando requestFullscreen nativo no elemento", async () => {
      const mockElement = mockDocument.createElement("div");

      await requestDocumentFullscreen(mockElement as unknown as HTMLElement);
      expect(mockElement.requestFullscreen).toHaveBeenCalled();
    });

    it("deve sair de tela cheia chamando exitFullscreen nativo no documento", async () => {
      await exitDocumentFullscreen();
      expect(mockDocument.exitFullscreen).toHaveBeenCalled();
    });

    it("deve alternar entre janela e tela cheia via toggleDocumentFullscreen", async () => {
      const mockElement = mockDocument.createElement("div");

      // Quando não está em tela cheia -> solicita
      mockDocument.fullscreenElement = null;
      await toggleDocumentFullscreen(mockElement as unknown as HTMLElement);
      expect(mockElement.requestFullscreen).toHaveBeenCalled();

      // Quando está em tela cheia -> sai
      mockDocument.fullscreenElement = mockElement;
      await toggleDocumentFullscreen(mockElement as unknown as HTMLElement);
      expect(mockDocument.exitFullscreen).toHaveBeenCalled();
    });

    it("deve interceptar tecla F11 prevenindo comportamento padrão e acionando fullscreen", () => {
      const mockEvent = {
        key: "F11",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;

      const handled = handleFullscreenKeyboardEvent(mockEvent);
      expect(handled).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();

      const ignoredEvent = {
        key: "Space",
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent;
      expect(handleFullscreenKeyboardEvent(ignoredEvent)).toBe(false);
      expect(ignoredEvent.preventDefault).not.toHaveBeenCalled();
    });

    it("deve registrar e remover ouvinte global de F11 via initializeFullscreenHandler", () => {
      const unsubscribe = initializeFullscreenHandler(mockWindow as unknown as Window);
      expect(mockWindow.addEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));

      unsubscribe();
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    });

    it("deve expor utilitários através do objeto fullscreenHandler", () => {
      expect(typeof fullscreenHandler.isFullscreen).toBe("function");
      expect(typeof fullscreenHandler.requestFullscreen).toBe("function");
      expect(typeof fullscreenHandler.exitFullscreen).toBe("function");
      expect(typeof fullscreenHandler.toggleFullscreen).toBe("function");
      expect(typeof fullscreenHandler.handleKeyboardEvent).toBe("function");
      expect(typeof fullscreenHandler.initialize).toBe("function");
    });
  });

  describe("2. Testes Geométricos e ScreenLayerGeometryChecker", () => {
    it("deve validar colisões pontuais contra retângulos AABB", () => {
      const bounds = { x: 100, y: 100, width: 200, height: 50 };

      expect(isPointInsideRectangle({ x: 150, y: 120 }, bounds)).toBe(true);
      expect(isPointInsideRectangle({ x: 100, y: 100 }, bounds)).toBe(true);
      expect(isPointInsideRectangle({ x: 300, y: 150 }, bounds)).toBe(true);
      expect(isPointInsideRectangle({ x: 99, y: 120 }, bounds)).toBe(false);
      expect(isPointInsideRectangle({ x: 301, y: 120 }, bounds)).toBe(false);
      expect(isPointInsideRectangle({ x: 150, y: 99 }, bounds)).toBe(false);
      expect(isPointInsideRectangle({ x: 150, y: 151 }, bounds)).toBe(false);
    });

    it("deve validar colisões pontuais contra círculos", () => {
      const circle = { centerX: 200, centerY: 200, radius: 50 };

      expect(isPointInsideCircle({ x: 200, y: 200 }, circle)).toBe(true);
      expect(isPointInsideCircle({ x: 250, y: 200 }, circle)).toBe(true);
      expect(isPointInsideCircle({ x: 200, y: 250 }, circle)).toBe(true);
      expect(isPointInsideCircle({ x: 235, y: 235 }, circle)).toBe(true); // ~49.5px
      expect(isPointInsideCircle({ x: 251, y: 200 }, circle)).toBe(false);
      expect(isPointInsideCircle({ x: 240, y: 240 }, circle)).toBe(false); // ~56.5px
    });

    it("deve priorizar elementos com maior zIndex na camada de tela", () => {
      const checker = new ScreenLayerGeometryChecker({ virtualWidth: 1280, virtualHeight: 720 });

      const backgroundPanel: ScreenLayerHitTarget = {
        id: "background_panel",
        bounds: { x: 0, y: 0, width: 500, height: 500 },
        zIndex: 10,
      };

      const topButton: ScreenLayerHitTarget = {
        id: "top_button",
        bounds: { x: 100, y: 100, width: 200, height: 60 },
        zIndex: 50,
      };

      checker.registerHitTarget(backgroundPanel);
      checker.registerHitTarget(topButton);

      // Ponto sobreposto: deve retornar o botão de maior z-index
      const hitTarget = checker.queryHitTarget({ x: 150, y: 120 });
      expect(hitTarget?.id).toBe("top_button");

      // Ponto fora do botão mas dentro do painel
      const backgroundHit = checker.queryHitTarget({ x: 400, y: 400 });
      expect(backgroundHit?.id).toBe("background_panel");

      // Ponto fora de ambos
      const missedHit = checker.queryHitTarget({ x: 600, y: 600 });
      expect(missedHit).toBeNull();
    });

    it("deve suportar limites dinâmicos via getter funcional", () => {
      const checker = new ScreenLayerGeometryChecker();
      let currentX = 100;

      checker.registerHitTarget({
        id: "dynamic_target",
        bounds: () => ({ x: currentX, y: 100, width: 80, height: 40 }),
      });

      expect(checker.queryHitTarget({ x: 120, y: 120 })?.id).toBe("dynamic_target");
      expect(checker.queryHitTarget({ x: 220, y: 120 })).toBeNull();

      currentX = 200;
      expect(checker.queryHitTarget({ x: 120, y: 120 })).toBeNull();
      expect(checker.queryHitTarget({ x: 220, y: 120 })?.id).toBe("dynamic_target");
    });

    it("deve rotear clique disparando callback onClick registrado", () => {
      const checker = new ScreenLayerGeometryChecker();
      const clickSpy = vi.fn();

      checker.registerHitTarget({
        id: "action_button",
        bounds: { x: 50, y: 50, width: 100, height: 40 },
        onClick: clickSpy,
      });

      checker.dispatchClick({ x: 80, y: 70 });
      expect(clickSpy).toHaveBeenCalledWith({ x: 80, y: 70 });

      checker.dispatchClick({ x: 200, y: 200 });
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it("deve converter coordenadas de janela para resolução virtual do canvas", () => {
      const checker = new ScreenLayerGeometryChecker({
        virtualWidth: 1280,
        virtualHeight: 720,
      });

      const mockCanvas = mockDocument.createElement("canvas");
      mockCanvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 640,
        height: 360,
      });

      checker.attachCanvasListeners(mockCanvas as unknown as HTMLCanvasElement);

      // Ponto no centro do canvas (clientX = 100 + 320 = 420, clientY = 50 + 180 = 230)
      const virtualPosition = checker.convertWindowCoordinatesToScreenCoordinates(420, 230);
      expect(virtualPosition.x).toBeCloseTo(640);
      expect(virtualPosition.y).toBeCloseTo(360);
    });

    it("deve gerenciar eventos de hover (onPointerEnter e onPointerLeave)", () => {
      const checker = new ScreenLayerGeometryChecker();
      const enterSpy = vi.fn();
      const leaveSpy = vi.fn();

      checker.registerHitTarget({
        id: "hoverable_button",
        bounds: { x: 50, y: 50, width: 100, height: 40 },
        onPointerEnter: enterSpy,
        onPointerLeave: leaveSpy,
      });

      // Move para dentro do botão
      checker.dispatchPointerMove({ x: 80, y: 70 });
      expect(enterSpy).toHaveBeenCalledWith({ x: 80, y: 70 });
      expect(leaveSpy).not.toHaveBeenCalled();

      // Move para fora do botão
      checker.dispatchPointerMove({ x: 200, y: 200 });
      expect(leaveSpy).toHaveBeenCalledWith({ x: 200, y: 200 });
    });
  });

  describe("3. Configuração do RenderEngineAdapter e eventMode do Stage", () => {
    it("deve expor eventMode 'none' no stage nativo e através de getStageEventMode", () => {
      const adapter = new RenderEngineAdapter();
      expect(adapter.getStageEventMode()).toBe("none");
    });

    it("deve instanciar e expor ScreenLayerGeometryChecker integrado ao RenderEngineAdapter", () => {
      const globalChecker = getScreenLayerGeometryChecker();
      expect(globalChecker).toBeInstanceOf(ScreenLayerGeometryChecker);

      const initializedChecker = initScreenLayerGeometryChecker({ virtualWidth: 1024, virtualHeight: 768 });
      expect(initializedChecker).toBeInstanceOf(ScreenLayerGeometryChecker);

      const adapter = new RenderEngineAdapter();
      const checker = adapter.getScreenLayerGeometryChecker();

      expect(checker).toBeInstanceOf(ScreenLayerGeometryChecker);

      // Redimensionamento sincroniza dimensões do checker
      adapter.resize(1920, 1080);
      expect(adapter.getDimensions()).toEqual({ width: 1920, height: 1080 });
    });
  });
});

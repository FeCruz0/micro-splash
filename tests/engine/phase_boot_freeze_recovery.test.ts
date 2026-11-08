import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SceneManager } from "../../src/engine/SceneManager";
import {
  withRenderingContextLifecycle,
  type RenderingContextLifecycle,
} from "../../src/engine/adapters/RenderingContextAdapter";
import type { IScene } from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import gameSceneSourceCode from "../../src/scenes/gameScene.ts?raw";
import mainSourceCode from "../../src/main.ts?raw";

function createSceneStub(sceneName: string, overrides: Partial<IScene> = {}): IScene {
  return {
    name: sceneName,
    enter: vi.fn(),
    update: vi.fn(),
    exit: vi.fn(),
    ...overrides,
  };
}

describe("Boot freeze — recuperação do SceneManager e ciclo de vida do contexto", () => {
  let sceneManagerInstance: SceneManager;

  beforeEach(() => {
    sceneManagerInstance = new SceneManager();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("SceneManager — falha em enter() não congela o loop", () => {
    it("descarta a cena que falhou, executa o exit seguro e notifica o handler de erro", async () => {
      const enterError = new Error("engine.rand is not a function");
      const failingScene = createSceneStub("splash", {
        enter: vi.fn(() => {
          throw enterError;
        }),
      });
      sceneManagerInstance.registerScene(failingScene);

      const transitionErrorHandler = vi.fn();
      sceneManagerInstance.setTransitionErrorHandler(transitionErrorHandler);

      await expect(sceneManagerInstance.loadScene("splash")).rejects.toThrow(enterError);

      expect(failingScene.exit).toHaveBeenCalledTimes(1);
      expect(sceneManagerInstance.getCurrentScene()).toBeNull();
      expect(sceneManagerInstance.getLastTransitionFailure()).toMatchObject({
        sceneName: "splash",
        phase: "ENTERING",
        error: enterError,
      });
      expect(transitionErrorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ sceneName: "splash", phase: "ENTERING" })
      );
    });

    it("permite carregar outra cena depois de uma falha e volta ao estado IDLE", async () => {
      sceneManagerInstance.registerScene(
        createSceneStub("splash", {
          enter: vi.fn(() => {
            throw new Error("falha de enter");
          }),
        })
      );
      const healthyScene = createSceneStub("menu");
      sceneManagerInstance.registerScene(healthyScene);

      await expect(sceneManagerInstance.loadScene("splash")).rejects.toThrow("falha de enter");
      expect(sceneManagerInstance.getTransitionState()).toBe("ERROR");

      await sceneManagerInstance.loadScene("menu");
      expect(sceneManagerInstance.getTransitionState()).toBe("IDLE");
      expect(sceneManagerInstance.getCurrentScene()?.name).toBe("menu");
      expect(sceneManagerInstance.getLastTransitionFailure()).toBeNull();

      sceneManagerInstance.update(0.016);
      expect(healthyScene.update).toHaveBeenCalledWith(0.016);
    });

    it("continua despachando update em ERROR quando a cena ativa está íntegra (cena inexistente)", async () => {
      const activeScene = createSceneStub("game");
      sceneManagerInstance.registerScene(activeScene);
      await sceneManagerInstance.loadScene("game");

      await expect(sceneManagerInstance.loadScene("non_existent")).rejects.toThrow(
        'Cena "non_existent" não encontrada'
      );
      expect(sceneManagerInstance.getTransitionState()).toBe("ERROR");

      sceneManagerInstance.update(0.02);
      expect(activeScene.update).toHaveBeenCalledWith(0.02);
    });

    it("não propaga exceção do próprio handler de erro e ainda relança a falha original", async () => {
      sceneManagerInstance.registerScene(
        createSceneStub("splash", {
          enter: vi.fn(() => {
            throw new Error("falha original");
          }),
        })
      );
      sceneManagerInstance.setTransitionErrorHandler(() => {
        throw new Error("falha no handler");
      });

      await expect(sceneManagerInstance.loadScene("splash")).rejects.toThrow("falha original");
      expect(sceneManagerInstance.getCurrentScene()).toBeNull();
    });

    it("tolera exit() que também falha durante a recuperação", async () => {
      sceneManagerInstance.registerScene(
        createSceneStub("splash", {
          enter: vi.fn(() => {
            throw new Error("falha de enter");
          }),
          exit: vi.fn(() => {
            throw new Error("falha de exit");
          }),
        })
      );

      await expect(sceneManagerInstance.loadScene("splash")).rejects.toThrow("falha de enter");
      expect(sceneManagerInstance.getCurrentScene()).toBeNull();
    });
  });

  describe("withRenderingContextLifecycle — update e exit chegam ao contexto", () => {
    function createLifecycleSpy(): RenderingContextLifecycle {
      return {
        runSceneUpdateCallbacks: vi.fn(),
        flushSceneResources: vi.fn(),
      };
    }

    it("aciona os callbacks de onUpdate do contexto após o update da própria cena", () => {
      const callOrder: string[] = [];
      const lifecycleSpy: RenderingContextLifecycle = {
        runSceneUpdateCallbacks: vi.fn(() => callOrder.push("context")),
        flushSceneResources: vi.fn(),
      };
      const decoratedScene = withRenderingContextLifecycle(
        createSceneStub("splash", { update: vi.fn(() => callOrder.push("scene")) }),
        lifecycleSpy
      );

      decoratedScene.update(0.016);

      expect(callOrder).toEqual(["scene", "context"]);
      expect(lifecycleSpy.runSceneUpdateCallbacks).toHaveBeenCalledWith(0.016);
    });

    it("libera os recursos do contexto no exit, mesmo se o exit da cena falhar", async () => {
      const lifecycleSpy = createLifecycleSpy();
      const decoratedScene = withRenderingContextLifecycle(
        createSceneStub("menu", {
          exit: vi.fn(() => {
            throw new Error("falha de exit");
          }),
        }),
        lifecycleSpy
      );

      await expect(decoratedScene.exit()).rejects.toThrow("falha de exit");
      expect(lifecycleSpy.flushSceneResources).toHaveBeenCalledTimes(1);
    });

    it("preserva nome e repassa os dados de transição no enter", () => {
      const sceneStub = createSceneStub("game");
      const decoratedScene = withRenderingContextLifecycle(sceneStub, createLifecycleSpy());

      decoratedScene.enter({ mode: "standard" });

      expect(decoratedScene.name).toBe("game");
      expect(sceneStub.enter).toHaveBeenCalledWith({ mode: "standard" });
    });

    it("o SceneManager executa o ciclo de vida do contexto ao trocar de cena", async () => {
      const lifecycleSpy = createLifecycleSpy();
      sceneManagerInstance.registerScene(
        withRenderingContextLifecycle(createSceneStub("splash"), lifecycleSpy)
      );
      sceneManagerInstance.registerScene(
        withRenderingContextLifecycle(createSceneStub("menu"), lifecycleSpy)
      );

      await sceneManagerInstance.loadScene("splash");
      sceneManagerInstance.update(0.016);
      expect(lifecycleSpy.runSceneUpdateCallbacks).toHaveBeenCalledTimes(1);

      await sceneManagerInstance.loadScene("menu");
      expect(lifecycleSpy.flushSceneResources).toHaveBeenCalledTimes(1);
    });
  });

  describe("gameScene — sem loop duplicado", () => {
    it("não registra k.onUpdate para o loop principal do jogo", () => {
      expect(gameSceneSourceCode).not.toMatch(/k\.onUpdate\(\s*\(passedDeltaTime/);
      expect(gameSceneSourceCode).toContain("restoreOriginalSceneLeaveRegistration");
    });
  });

  describe("main.ts — boot resiliente", () => {
    it("limita o carregamento de assets por tempo e reporta falhas de boot de forma visível", () => {
      expect(mainSourceCode).toContain("ASSET_LOADING_TIMEOUT_IN_MILLISECONDS");
      expect(mainSourceCode).toContain("loadGameAssetsWithTimeout");
      expect(mainSourceCode).toContain("setTransitionErrorHandler");
      expect(mainSourceCode).toContain("showBootErrorOverlay");
      expect(mainSourceCode).toMatch(/catch \(bootError\)/);
    });
  });
});

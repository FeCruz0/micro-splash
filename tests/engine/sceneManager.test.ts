import { describe, it, expect, vi, beforeEach } from "vitest";
import { SceneManager } from "../../src/engine/SceneManager";
import type { IScene } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("SceneManager (FSM & Transições Suaves)", () => {
  let manager: SceneManager;

  beforeEach(() => {
    manager = new SceneManager();
  });

  it("inicializa sem cena ativa e com estado IDLE", () => {
    expect(manager.getCurrentScene()).toBeNull();
    expect(manager.getTransitionState()).toBe("IDLE");
  });

  it("registra e desregistra cenas corretamente", () => {
    const mockScene: IScene = {
      name: "splash",
      enter: vi.fn(),
      update: vi.fn(),
      exit: vi.fn(),
    };

    manager.registerScene(mockScene);
    expect(manager.hasScene("splash")).toBe(true);
    expect(manager.getRegisteredSceneNames()).toEqual(["splash"]);

    const removed = manager.unregisterScene("splash");
    expect(removed).toBe(true);
    expect(manager.hasScene("splash")).toBe(false);
  });

  it("executa ciclo formal de transição (exit anterior -> enter nova)", async () => {
    const exitEvents: string[] = [];

    const sceneA: IScene = {
      name: "sceneA",
      enter: vi.fn().mockImplementation(() => {
        exitEvents.push("enterA");
      }),
      update: vi.fn(),
      exit: vi.fn().mockImplementation(() => {
        exitEvents.push("exitA");
      }),
    };

    const sceneB: IScene = {
      name: "sceneB",
      enter: vi.fn().mockImplementation((data: unknown) => {
        exitEvents.push(`enterB:${JSON.stringify(data)}`);
      }),
      update: vi.fn(),
      exit: vi.fn().mockImplementation(() => {
        exitEvents.push("exitB");
      }),
    };

    manager.registerScene(sceneA);
    manager.registerScene(sceneB);

    await manager.loadScene("sceneA");
    expect(manager.getCurrentScene()?.name).toBe("sceneA");
    expect(exitEvents).toEqual(["enterA"]);

    await manager.loadScene("sceneB", { level: 2 });
    expect(manager.getCurrentScene()?.name).toBe("sceneB");
    expect(exitEvents).toEqual(["enterA", "exitA", 'enterB:{"level":2}']);
    expect(manager.getTransitionState()).toBe("IDLE");
  });

  it("rejeita transição para cena inexistente mantendo integridade", async () => {
    await expect(manager.loadScene("non_existent")).rejects.toThrow(
      'Cena "non_existent" não encontrada'
    );
    expect(manager.getTransitionState()).toBe("ERROR");
  });

  it("propaga tick de update para a cena ativa somente quando não estiver bloqueada", async () => {
    const mockScene: IScene = {
      name: "game",
      enter: vi.fn(),
      update: vi.fn(),
      exit: vi.fn(),
    };

    manager.registerScene(mockScene);
    await manager.loadScene("game");

    manager.update(0.016);
    expect(mockScene.update).toHaveBeenCalledWith(0.016);
  });

  it("enfileira transições concorrentes e as processa sequencialmente", async () => {
    const order: string[] = [];

    const scene1: IScene = {
      name: "s1",
      enter: vi.fn().mockImplementation(() => order.push("s1_enter")),
      update: vi.fn(),
      exit: vi.fn().mockImplementation(() => order.push("s1_exit")),
    };

    const scene2: IScene = {
      name: "s2",
      enter: vi.fn().mockImplementation(() => order.push("s2_enter")),
      update: vi.fn(),
      exit: vi.fn().mockImplementation(() => order.push("s2_exit")),
    };

    const scene3: IScene = {
      name: "s3",
      enter: vi.fn().mockImplementation(() => order.push("s3_enter")),
      update: vi.fn(),
      exit: vi.fn().mockImplementation(() => order.push("s3_exit")),
    };

    manager.registerScene(scene1);
    manager.registerScene(scene2);
    manager.registerScene(scene3);

    const promise1 = manager.loadScene("s1");
    const promise2 = manager.loadScene("s2");
    const promise3 = manager.loadScene("s3");

    await Promise.all([promise1, promise2, promise3]);
    expect(manager.getCurrentScene()?.name).toBe("s3");
    expect(order).toContain("s1_enter");
    expect(order).toContain("s3_enter");
  });

  it("limpa todas as cenas e encerra cena ativa no destroy()", async () => {
    const mockScene: IScene = {
      name: "menu",
      enter: vi.fn(),
      update: vi.fn(),
      exit: vi.fn(),
    };

    manager.registerScene(mockScene);
    await manager.loadScene("menu");

    manager.destroy();
    expect(mockScene.exit).toHaveBeenCalled();
    expect(manager.getCurrentScene()).toBeNull();
    expect(manager.hasScene("menu")).toBe(false);
  });
});

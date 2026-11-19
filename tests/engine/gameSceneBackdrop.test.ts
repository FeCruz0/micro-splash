import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createGameSceneBackdrop,
  type GameSceneBackdropEngineContext,
} from "../../src/scenes/gameSceneBackdrop";
import * as TweenModule from "../../src/engine/utils/Tween";
import * as NativeRenderNodeFactory from "../../src/engine/adapters/NativeRenderNodeFactory";
import type { IRenderEngine, IRenderNode } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

function createLegacyEngineMock() {
  const createdNodes: Array<{
    pos: { x: number; y: number };
    opacity: number;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];

  const destroyFn = vi.fn((target: unknown) => {
    const node = target as { destroy?: () => void } | null;
    if (node && typeof node.destroy === "function") {
      node.destroy();
    }
  });

  const engineContext: GameSceneBackdropEngineContext = {
    add: vi.fn(() => {
      const node = {
        pos: { x: 0, y: 0 },
        opacity: 1,
        destroy: vi.fn(),
      };
      createdNodes.push(node);
      return node;
    }),
    rect: vi.fn(() => ({})),
    pos: vi.fn(() => ({})),
    color: vi.fn(() => ({})),
    opacity: vi.fn(() => ({})),
    fixed: vi.fn(() => ({})),
    z: vi.fn(() => ({})),
    destroy: destroyFn,
    width: () => 1280,
    height: () => 720,
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
  };

  return { engineContext, createdNodes, destroyFn };
}

function createControlledTweenSpy() {
  let resolvePromise: (() => void) | null = null;
  let cancelFn = vi.fn();

  const spy = vi.spyOn(TweenModule, "createTween").mockImplementation(() => {
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    cancelFn = vi.fn(() => {
      resolvePromise?.();
    });
    return {
      promise,
      cancel: cancelFn,
    };
  });

  return {
    spy,
    completeTween: async () => {
      resolvePromise?.();
      await Promise.resolve();
      await Promise.resolve();
    },
    flushMicrotasks: async () => {
      await Promise.resolve();
      await Promise.resolve();
    },
    getCancelSpy: () => cancelFn,
  };
}

describe("gameSceneBackdrop — lifecycle idempotente do fadeOverlay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("caminho legado: destrói fadeOverlay exatamente uma vez na conclusão normal do tween e ignora saída posterior", async () => {
    const { engineContext, createdNodes, destroyFn } = createLegacyEngineMock();
    const tweenCtrl = createControlledTweenSpy();
    const cleanupCallbacks: Array<() => void> = [];

    const backdrop = createGameSceneBackdrop({
      engineContext,
      renderEngine: null,
      worldContainer: null,
      screenContainer: null,
      viewportDimensions: { width: 1280, height: 720 },
      registerCleanup: (cb) => {
        cleanupCallbacks.push(cb);
      },
    });

    const fadeOverlayNode = createdNodes[0];
    expect(destroyFn).not.toHaveBeenCalled();

    // 1. Conclusão normal do tween
    await tweenCtrl.completeTween();
    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(fadeOverlayNode);
    expect(fadeOverlayNode.destroy).toHaveBeenCalledTimes(1);

    // 2. Saída posterior da cena não deve destruir fadeOverlay novamente
    cleanupCallbacks.forEach((cb) => cb());
    backdrop.destroy();
    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(fadeOverlayNode.destroy).toHaveBeenCalledTimes(1);
    expect(createdNodes[1].destroy).toHaveBeenCalledTimes(1); // oceanFloor
    expect(createdNodes[2].destroy).toHaveBeenCalledTimes(1); // skyBand
  });

  it("caminho legado: cancela o tween na saída antecipada da cena e não executa destruição redundante no .then()", async () => {
    const { engineContext, createdNodes, destroyFn } = createLegacyEngineMock();
    const tweenCtrl = createControlledTweenSpy();
    const cleanupCallbacks: Array<() => void> = [];

    createGameSceneBackdrop({
      engineContext,
      renderEngine: null,
      worldContainer: null,
      screenContainer: null,
      viewportDimensions: { width: 1280, height: 720 },
      registerCleanup: (cb) => {
        cleanupCallbacks.push(cb);
      },
    });

    const fadeOverlayNode = createdNodes[0];

    // Saída antecipada antes da conclusão do tween
    cleanupCallbacks.forEach((cb) => cb());
    expect(tweenCtrl.getCancelSpy()).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(destroyFn).toHaveBeenCalledWith(fadeOverlayNode);
    expect(fadeOverlayNode.destroy).toHaveBeenCalledTimes(1);

    // Microtask do .then() agendado pelo cancel()
    await tweenCtrl.flushMicrotasks();
    expect(destroyFn).toHaveBeenCalledTimes(1);
    expect(fadeOverlayNode.destroy).toHaveBeenCalledTimes(1);
  });

  it("caminho nativo: destrói fadeOverlay exatamente uma vez tanto na conclusão normal quanto na saída antecipada", async () => {
    const tweenCtrl = createControlledTweenSpy();
    const nativeDestroySpies: Array<ReturnType<typeof vi.fn>> = [];

    vi.spyOn(NativeRenderNodeFactory, "createNativeRectNode").mockImplementation(() => {
      const destroySpy = vi.fn();
      nativeDestroySpies.push(destroySpy);
      const fakeRenderNode = { freeze: vi.fn() } as unknown as IRenderNode;
      return {
        pos: { x: 0, y: 0 },
        opacity: 1,
        destroy: destroySpy,
        getRenderNode: () => fakeRenderNode,
      } as unknown as ReturnType<typeof NativeRenderNodeFactory.createNativeRectNode>;
    });

    vi.spyOn(NativeRenderNodeFactory, "createNativePolygonNode").mockImplementation(() => {
      const fakeRenderNode = { freeze: vi.fn() } as unknown as IRenderNode;
      return {
        getRenderNode: () => fakeRenderNode,
      } as unknown as ReturnType<typeof NativeRenderNodeFactory.createNativePolygonNode>;
    });

    const { engineContext } = createLegacyEngineMock();
    const fakeRenderEngine = {} as IRenderEngine;
    const fakeWorld = {} as IRenderNode;
    const fakeScreen = {} as IRenderNode;

    // Cenário A: conclusão normal do tween seguida de saída da cena
    const cleanupA: Array<() => void> = [];
    createGameSceneBackdrop({
      engineContext,
      renderEngine: fakeRenderEngine,
      worldContainer: fakeWorld,
      screenContainer: fakeScreen,
      viewportDimensions: { width: 1280, height: 720 },
      registerCleanup: (cb) => {
        cleanupA.push(cb);
      },
    });
    const fadeOverlayDestroyA = nativeDestroySpies[0];

    await tweenCtrl.completeTween();
    expect(fadeOverlayDestroyA).toHaveBeenCalledTimes(1);
    cleanupA.forEach((cb) => cb());
    expect(fadeOverlayDestroyA).toHaveBeenCalledTimes(1);

    // Cenário B: saída antecipada da cena seguida da microtask do .then()
    const cleanupB: Array<() => void> = [];
    createGameSceneBackdrop({
      engineContext,
      renderEngine: fakeRenderEngine,
      worldContainer: fakeWorld,
      screenContainer: fakeScreen,
      viewportDimensions: { width: 1280, height: 720 },
      registerCleanup: (cb) => {
        cleanupB.push(cb);
      },
    });
    const fadeOverlayDestroyB = nativeDestroySpies[3];

    cleanupB.forEach((cb) => cb());
    expect(tweenCtrl.getCancelSpy()).toHaveBeenCalledTimes(1);
    expect(fadeOverlayDestroyB).toHaveBeenCalledTimes(1);

    await tweenCtrl.flushMicrotasks();
    expect(fadeOverlayDestroyB).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTween, Easings } from "../../src/engine/utils/Tween";
import { setActiveRenderEngine } from "../../src/engine/adapters/RenderEngineAdapter";
import type { IRenderTicker, IRenderEngine } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("Etapa 4.3: Migração de k.tween para createTween vinculado ao PixiRenderTicker", () => {
  let mockEngine: IRenderEngine;
  let activeTickerCallbacks: Array<(deltaTimeInSeconds: number) => void>;

  beforeEach(() => {
    activeTickerCallbacks = [];

    const mockTicker: IRenderTicker = {
      add: vi.fn((callback: (deltaTimeInSeconds: number) => void) => {
        activeTickerCallbacks.push(callback);
        return () => {
          const index = activeTickerCallbacks.indexOf(callback);
          if (index !== -1) {
            activeTickerCallbacks.splice(index, 1);
          }
        };
      }),
      start: vi.fn(),
      stop: vi.fn(),
      getFPS: () => 60,
      getDeltaTime: () => 0.0166,
    };

    mockEngine = {
      isInitialized: true,
      getTicker: () => mockTicker,
      getDimensions: () => ({ width: 800, height: 600 }),
      createGraphics: vi.fn(),
      createText: vi.fn(),
      createSprite: vi.fn(),
      createContainer: vi.fn(),
      getStageRoot: vi.fn(),
      getWorldContainer: vi.fn(),
      getScreenContainer: vi.fn(),
      getCameraPosition: () => ({ x: 0, y: 0 }),
      setCameraPosition: vi.fn(),
      addNodeToWorld: vi.fn(),
      addNodeToScreen: vi.fn(),
      getCanvas: () => null,
      resize: vi.fn(),
      destroy: vi.fn(),
    } as unknown as IRenderEngine;

    setActiveRenderEngine(mockEngine);
  });

  afterEach(() => {
    setActiveRenderEngine(null);
  });

  it("vincula automaticamente o tween ao ticker da engine ativa quando ticker não é passado explicitamente", async () => {
    const recordedValues: number[] = [];
    const tweenHandle = createTween(
      0,
      100,
      0.5,
      (currentValue) => recordedValues.push(currentValue),
      Easings.linear
    );

    expect(mockEngine.getTicker().add).toHaveBeenCalledTimes(1);
    expect(activeTickerCallbacks.length).toBe(1);
    expect(recordedValues[0]).toBe(0);

    // Avança 250ms (metade de 500ms)
    activeTickerCallbacks[0](0.25);
    expect(recordedValues[recordedValues.length - 1]).toBeCloseTo(50, 1);

    // Avança mais 250ms (completa 500ms)
    activeTickerCallbacks[0](0.25);
    expect(recordedValues[recordedValues.length - 1]).toBe(100);

    await tweenHandle.promise;
    expect(activeTickerCallbacks.length).toBe(0); // Ticker removido no término
  });

  it("cancela a animação e desvincula do ticker imediatamente ao chamar cancel()", async () => {
    const recordedValues: number[] = [];
    const tweenHandle = createTween(
      0,
      200,
      1.0,
      (currentValue) => recordedValues.push(currentValue),
      Easings.easeOutQuad
    );

    expect(activeTickerCallbacks.length).toBe(1);

    // Passo de 200ms
    activeTickerCallbacks[0](0.2);
    expect(recordedValues.length).toBeGreaterThan(1);
    const valueBeforeCancel = recordedValues[recordedValues.length - 1];

    tweenHandle.cancel();
    expect(activeTickerCallbacks.length).toBe(0); // Callback removido

    await tweenHandle.promise;
    expect(recordedValues[recordedValues.length - 1]).toBe(valueBeforeCancel);
  });

  it("executa interpolação instantânea sem erro quando a duração é zero ou negativa", async () => {
    const recordedValues: number[] = [];
    const tweenHandle = createTween(
      10,
      50,
      0,
      (currentValue) => recordedValues.push(currentValue),
      Easings.linear
    );

    expect(recordedValues).toEqual([50]);
    await tweenHandle.promise;
    expect(activeTickerCallbacks.length).toBe(0);
  });

  it("aplica as curvas de atenuação (linear, easeInQuad, easeOutQuad, easeOutBack, easeInOutQuad, easeInOutCubic)", () => {
    expect(Easings.linear(0.5)).toBe(0.5);
    expect(Easings.easeInQuad(0.5)).toBe(0.25);
    expect(Easings.easeOutQuad(0.5)).toBe(0.75);
    expect(Easings.easeInOutQuad(0.25)).toBeCloseTo(0.125, 3);
    expect(Easings.easeInOutQuad(0.75)).toBeCloseTo(0.875, 3);
    expect(Easings.easeOutBack(0)).toBeCloseTo(0, 3);
    expect(Easings.easeOutBack(1)).toBe(1);
    expect(Easings.easeInOutCubic(0)).toBe(0);
    expect(Easings.easeInOutCubic(1)).toBe(1);
  });
});

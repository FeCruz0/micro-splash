import { describe, it, expect, vi } from "vitest";
import { createTween, Easings } from "../../src/engine/utils/Tween";
import type { IRenderTicker } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("Tween Utility & Easings", () => {
  it("interpola valores com precisão usando IRenderTicker simulado", async () => {
    let tickCallback: ((dt: number) => void) | null = null;

    const mockTicker: IRenderTicker = {
      add: vi.fn().mockImplementation((cb: (dt: number) => void) => {
        tickCallback = cb;
        return () => {
          tickCallback = null;
        };
      }),
      start: vi.fn(),
      stop: vi.fn(),
      getFPS: () => 60,
      getDeltaTime: () => 0.016,
    };

    const recordedValues: number[] = [];
    const handle = createTween(
      0,
      100,
      0.1,
      (val) => recordedValues.push(val),
      Easings.linear,
      mockTicker
    );

    expect(recordedValues[0]).toBe(0);

    // Passo de 50ms (metade de 100ms)
    tickCallback!(0.05);
    expect(recordedValues[recordedValues.length - 1]).toBeCloseTo(50, 1);

    // Passo de mais 50ms (completa 100ms)
    tickCallback!(0.05);
    expect(recordedValues[recordedValues.length - 1]).toBe(100);

    await handle.promise;
  });

  it("permite cancelamento imediato interrompendo updates", async () => {
    let tickCallback: ((dt: number) => void) | null = null;

    const mockTicker: IRenderTicker = {
      add: vi.fn().mockImplementation((cb: (dt: number) => void) => {
        tickCallback = cb;
        return () => {
          tickCallback = null;
        };
      }),
      start: vi.fn(),
      stop: vi.fn(),
      getFPS: () => 60,
      getDeltaTime: () => 0.016,
    };

    const recordedValues: number[] = [];
    const handle = createTween(
      0,
      50,
      0.2,
      (val) => recordedValues.push(val),
      Easings.linear,
      mockTicker
    );

    tickCallback!(0.1);
    expect(recordedValues.length).toBeGreaterThan(1);

    const capturedCallback = tickCallback as ((dt: number) => void) | null;
    handle.cancel();
    const countAfterCancel = recordedValues.length;

    // Verifica que o ticker foi desregistrado
    expect(tickCallback).toBeNull();

    // Se chamado defensivamente após cancelamento, não deve registrar novos valores
    if (capturedCallback) {
      capturedCallback(0.1);
    }
    expect(recordedValues.length).toBe(countAfterCancel);

    await handle.promise;
  });

  it("calcula curvas de atenuação (easings) corretamente entre 0 e 1", () => {
    expect(Easings.linear(0)).toBe(0);
    expect(Easings.linear(1)).toBe(1);

    expect(Easings.easeInQuad(0)).toBe(0);
    expect(Easings.easeInQuad(0.5)).toBe(0.25);
    expect(Easings.easeInQuad(1)).toBe(1);

    expect(Easings.easeOutQuad(0)).toBe(0);
    expect(Easings.easeOutQuad(0.5)).toBe(0.75);
    expect(Easings.easeOutQuad(1)).toBe(1);

    expect(Easings.easeInOutQuad(0)).toBe(0);
    expect(Easings.easeInOutQuad(0.5)).toBe(0.5);
    expect(Easings.easeInOutQuad(1)).toBe(1);
  });
});

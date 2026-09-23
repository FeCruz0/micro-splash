import { describe, it, expect, beforeEach, vi } from "vitest";
import { hapticsSystem } from "../src/systems/hapticsSystem";

describe("Fase 18.4: Sistema de Feedback Háptico para Dispositivos Móveis", () => {
  let mockVibrate: any;

  beforeEach(() => {
    localStorage.clear();
    mockVibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, "navigator", {
      value: {
        vibrate: mockVibrate,
      },
      writable: true,
      configurable: true,
    });
    hapticsSystem.setEnabled(true);
  });

  it("detecta suporte da API navigator.vibrate", () => {
    expect(hapticsSystem.isSupported()).toBe(true);
    expect(hapticsSystem.isEnabled()).toBe(true);
  });

  it("aciona vibrações táteis com padrões específicos para cada evento", () => {
    // 1. Quebra de gelo polar no salto
    hapticsSystem.triggerIceBreach();
    expect(mockVibrate).toHaveBeenCalledWith([40, 30, 90]);

    // 2. Colisão com obstáculo (lixo ou rede)
    hapticsSystem.triggerCollision();
    expect(mockVibrate).toHaveBeenCalledWith([30, 25, 60]);

    // 3. Emissão de Biosonar 360°
    hapticsSystem.triggerSonar();
    expect(mockVibrate).toHaveBeenCalledWith(25);

    // 4. Impulso hidrodinâmico
    hapticsSystem.triggerSpeedBoost();
    expect(mockVibrate).toHaveBeenCalledWith([15, 20, 30]);
  });

  it("não vibra quando o feedback háptico estiver desativado pelo jogador", () => {
    hapticsSystem.setEnabled(false);
    expect(hapticsSystem.isEnabled()).toBe(false);

    hapticsSystem.triggerCollision();
    hapticsSystem.triggerSonar();
    expect(mockVibrate).not.toHaveBeenCalled();
  });

  it("permite alternar estado com toggle() e persiste no localStorage", () => {
    hapticsSystem.setEnabled(true);

    const toggledOff = hapticsSystem.toggle();
    expect(toggledOff).toBe(false);
    expect(localStorage.getItem("micro_splash_haptics_enabled")).toBe("false");

    const toggledOn = hapticsSystem.toggle();
    expect(toggledOn).toBe(true);
    expect(localStorage.getItem("micro_splash_haptics_enabled")).toBe("true");
  });

  it("funciona em modo seguro caso navigator.vibrate lance exceção", () => {
    mockVibrate.mockImplementation(() => {
      throw new Error("SecurityError: blocked by user gesture policy");
    });

    expect(() => {
      hapticsSystem.triggerCollision();
      hapticsSystem.triggerSonar();
    }).not.toThrow();
  });
});

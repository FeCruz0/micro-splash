import { describe, it, expect, beforeEach, vi } from "vitest";
import { GamepadSystem } from "../src/systems/gamepadSystem";

describe("Gamepad System (Fase 23.2)", () => {
  let gamepadSystem: GamepadSystem;

  beforeEach(() => {
    vi.restoreAllMocks();
    gamepadSystem = new GamepadSystem();
  });

  it("retorna estado inativo quando não há gamepad conectado", () => {
    vi.stubGlobal("navigator", {
      getGamepads: () => [null, null, null, null],
    });

    const state = gamepadSystem.pollGamepadState();
    expect(state.connected).toBe(false);
    expect(state.strokeDown).toBe(false);
    expect(state.strokePressed).toBe(false);
    expect(state.sonarPressed).toBe(false);
    expect(state.up).toBe(false);
    expect(state.down).toBe(false);
    expect(state.pausePressed).toBe(false);
  });

  it("detecta botão A como batida de cauda e B/X como biosonar", () => {
    const mockPad = {
      connected: true,
      id: "Xbox Wireless Controller (STANDARD GAMEPAD)",
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 0, value: i === 0 ? 1 : 0 })), // Botão 0 pressionado (A)
      axes: [0, 0, 0, 0],
    };

    vi.stubGlobal("navigator", {
      getGamepads: () => [mockPad],
    });

    const state = gamepadSystem.pollGamepadState();
    expect(state.connected).toBe(true);
    expect(state.strokeDown).toBe(true);
    expect(state.strokePressed).toBe(true);
    expect(state.sonarPressed).toBe(false);

    // No segundo frame segurando o botão, strokeDown é true mas strokePressed (edge) é false
    const state2 = gamepadSystem.pollGamepadState();
    expect(state2.strokeDown).toBe(true);
    expect(state2.strokePressed).toBe(false);
  });

  it("filtra eixos analógicos abaixo da deadzone de 0.22", () => {
    const mockPad = {
      connected: true,
      id: "Standard Gamepad",
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
      axes: [0.15, -0.18], // Dentro da deadzone (< 0.22)
    };

    vi.stubGlobal("navigator", {
      getGamepads: () => [mockPad],
    });

    const state = gamepadSystem.pollGamepadState();
    expect(state.up).toBe(false);
    expect(state.right).toBe(false);
    expect(state.axisX).toBe(0);
    expect(state.axisY).toBe(0);
  });

  it("reconhece inclinação vertical e horizontal acima da deadzone", () => {
    const mockPad = {
      connected: true,
      id: "Standard Gamepad",
      buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
      axes: [0.85, -0.75], // Acima da deadzone
    };

    vi.stubGlobal("navigator", {
      getGamepads: () => [mockPad],
    });

    const state = gamepadSystem.pollGamepadState();
    expect(state.right).toBe(true);
    expect(state.up).toBe(true);
    expect(state.down).toBe(false);
    expect(state.left).toBe(false);
  });

  it("detecta botão Start (índice 9) para pausar o jogo", () => {
    const mockPad = {
      connected: true,
      id: "Standard Gamepad",
      buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 9, value: i === 9 ? 1 : 0 })),
      axes: [0, 0],
    };

    vi.stubGlobal("navigator", {
      getGamepads: () => [mockPad],
    });

    const state = gamepadSystem.pollGamepadState();
    expect(state.pausePressed).toBe(true);
  });
});

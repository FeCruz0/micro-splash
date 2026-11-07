import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  InputStateManager,
  initInputStateManager,
  getInputStateManager,
  resetInputStateManager,
} from "../../src/systems/inputState";
import { gamepadSystem } from "../../src/systems/gamepadSystem";
import type { TouchControlsState } from "../../src/ui/touchControls";
import { PlayerControlsManager } from "../../src/entities/player/playerControls";

describe("Etapas 3.1 & 3.2: InputState Unificado & Desacoplamento de Periféricos", () => {
  let inputStateManager: InputStateManager;

  beforeEach(() => {
    resetInputStateManager();
    inputStateManager = new InputStateManager();
  });

  afterEach(() => {
    inputStateManager.destroy();
    resetInputStateManager();
    vi.restoreAllMocks();
  });

  it("deve inicializar com estado neutro imutável", () => {
    const state = inputStateManager.getState();
    expect(state.moveUp).toBe(false);
    expect(state.moveDown).toBe(false);
    expect(state.moveLeft).toBe(false);
    expect(state.moveRight).toBe(false);
    expect(state.horizontalAxis).toBe(0);
    expect(state.verticalAxis).toBe(0);
    expect(state.strokePressed).toBe(false);
    expect(state.strokeDown).toBe(false);
    expect(state.strokeReleased).toBe(false);
    expect(state.sonarPressed).toBe(false);
    expect(state.sonarDown).toBe(false);
    expect(state.pausePressed).toBe(false);
    expect(state.toggleMutePressed).toBe(false);
    expect(state.toggleDebugTelemetryPressed).toBe(false);
  });

  it("deve capturar teclas do teclado e normalizar setas e WASD", () => {
    // Pressiona 'ArrowRight' / 'd'
    inputStateManager.simulateKeyDown("ArrowRight");
    let state = inputStateManager.update();
    expect(state.moveRight).toBe(true);
    expect(state.horizontalAxis).toBe(1);

    // Solta a tecla
    inputStateManager.simulateKeyUp("ArrowRight");
    state = inputStateManager.update();
    expect(state.moveRight).toBe(false);
    expect(state.horizontalAxis).toBe(0);

    // Pressiona 'w' para cima
    inputStateManager.simulateKeyDown("w");
    state = inputStateManager.update();
    expect(state.moveUp).toBe(true);
    expect(state.verticalAxis).toBe(-1);

    inputStateManager.simulateKeyUp("w");
    state = inputStateManager.update();
    expect(state.moveUp).toBe(false);
  });

  it("deve detectar borda de subida (strokePressed) e borda de descida (strokeReleased) para a barra de espaço", () => {
    // 1. Pressiona espaço
    inputStateManager.simulateKeyDown("Space");
    let state = inputStateManager.update();
    expect(state.strokePressed).toBe(true);
    expect(state.strokeDown).toBe(true);
    expect(state.strokeReleased).toBe(false);

    // 2. Mantém espaço pressionado no próximo frame
    state = inputStateManager.update();
    expect(state.strokePressed).toBe(false); // apenas no primeiro frame
    expect(state.strokeDown).toBe(true);
    expect(state.strokeReleased).toBe(false);

    // 3. Solta espaço
    inputStateManager.simulateKeyUp("Space");
    state = inputStateManager.update();
    expect(state.strokePressed).toBe(false);
    expect(state.strokeDown).toBe(false);
    expect(state.strokeReleased).toBe(true); // disparado no frame da soltura
  });

  it("deve fundir entradas de gamepad no mesmo InputState", () => {
    vi.spyOn(gamepadSystem, "pollGamepadState").mockReturnValue({
      connected: true,
      id: "Mock Controller",
      strokePressed: true,
      strokeDown: true,
      sonarPressed: false,
      up: false,
      down: true,
      left: false,
      right: true,
      pausePressed: false,
      axisX: 0.85,
      axisY: 0.9,
    });

    const state = inputStateManager.update();
    expect(state.strokePressed).toBe(true);
    expect(state.strokeDown).toBe(true);
    expect(state.moveDown).toBe(true);
    expect(state.moveRight).toBe(true);
    expect(state.horizontalAxis).toBe(0.85);
    expect(state.verticalAxis).toBe(0.9);
  });

  it("deve fundir controles táteis (TouchControlsState) no mesmo InputState", () => {
    const mockTouchState: TouchControlsState = {
      up: false,
      down: false,
      left: true,
      right: false,
      strokePressed: true,
      strokeDown: true,
      sonarPressed: true,
      active: true,
    };

    inputStateManager.setTouchControlsSource(mockTouchState);
    const state = inputStateManager.update();

    expect(state.moveLeft).toBe(true);
    expect(state.horizontalAxis).toBe(-1);
    expect(state.strokePressed).toBe(true);
    expect(state.strokeDown).toBe(true);
    expect(state.sonarPressed).toBe(true);
    expect(state.sonarDown).toBe(true);
  });

  it("deve detectar atalhos de sistema (Mute, Debug, Pause, Sonar Insight)", () => {
    // Tecla M
    inputStateManager.simulateKeyDown("m");
    let state = inputStateManager.update();
    expect(state.toggleMutePressed).toBe(true);
    inputStateManager.simulateKeyUp("m");

    // Tecla F8
    inputStateManager.simulateKeyDown("F8");
    state = inputStateManager.update();
    expect(state.toggleDebugTelemetryPressed).toBe(true);
    inputStateManager.simulateKeyUp("F8");

    // Tecla Escape
    inputStateManager.simulateKeyDown("Escape");
    state = inputStateManager.update();
    expect(state.pausePressed).toBe(true);
    inputStateManager.simulateKeyUp("Escape");

    // Tecla E (Insight pedagógico de sonar)
    inputStateManager.simulateKeyDown("e");
    state = inputStateManager.update();
    expect(state.sonarInsightTriggered).toBe(true);
    inputStateManager.simulateKeyUp("e");
  });

  it("PlayerControlsManager deve ler do InputState unificado com prioridade sobre periféricos diretos", () => {
    const mockEngineContext = {
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    };

    const controlsManager = new PlayerControlsManager(mockEngineContext, undefined, inputStateManager);

    // Simula teclas no InputStateManager
    inputStateManager.simulateKeyDown("ArrowLeft");
    inputStateManager.simulateKeyDown("Space");
    inputStateManager.update();

    const snapshot = controlsManager.pollInputs(0);
    expect(snapshot.isLeftDown).toBe(true);
    expect(snapshot.isRightDown).toBe(false);
    expect(snapshot.isStrokePressed).toBe(true);
    expect(snapshot.isStrokeDown).toBe(true);
  });

  it("singleton initInputStateManager e getInputStateManager devem fornecer instância global única", () => {
    const globalManager = initInputStateManager();
    expect(getInputStateManager()).toBe(globalManager);

    globalManager.destroy();
    resetInputStateManager();
    expect(getInputStateManager()).toBeNull();
  });
});

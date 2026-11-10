/**
 * Sistema Unificado de Estado de Entradas (InputState) — Micro Splash
 *
 * Desacoplado da renderização, centraliza e consolida todas as fontes de entrada
 * (teclado via window, controle gamepad e controles táteis touchControls).
 *
 * O estado é computado e lido EXCLUSIVAMENTE na fase 'input' do SystemRunner,
 * eliminando varreduras de periféricos e ouvintes avulsos fora do ciclo canônico.
 */

import { gamepadSystem, type GamepadSnapshot } from "./gamepadSystem";
import type { TouchControlsState } from "../ui/touchControls";

export interface UnifiedInputState {
  /** Movimento Direcional Horizontal e Vertical */
  readonly moveUp: boolean;
  readonly moveDown: boolean;
  readonly moveLeft: boolean;
  readonly moveRight: boolean;

  /** Eixos Analógicos Normalizados de -1.0 a 1.0 */
  readonly horizontalAxis: number;
  readonly verticalAxis: number;

  /** Ação de Propulsão / Batida de Cauda */
  readonly strokePressed: boolean;
  readonly strokeDown: boolean;
  readonly strokeReleased: boolean;

  /** Ação de Biosonar 360° */
  readonly sonarPressed: boolean;
  readonly sonarDown: boolean;

  /** Controle de Pausa */
  readonly pausePressed: boolean;

  /** Atalhos Globais de Sistema e Acessibilidade */
  readonly toggleMutePressed: boolean;
  readonly toggleDebugTelemetryPressed: boolean;
  readonly sonarInsightTriggered: boolean;

  /** Sinaliza qualquer interação para despertar o AudioContext */
  readonly anyInteractionPressed: boolean;
}

export const INITIAL_UNIFIED_INPUT_STATE: UnifiedInputState = Object.freeze({
  moveUp: false,
  moveDown: false,
  moveLeft: false,
  moveRight: false,
  horizontalAxis: 0,
  verticalAxis: 0,
  strokePressed: false,
  strokeDown: false,
  strokeReleased: false,
  sonarPressed: false,
  sonarDown: false,
  pausePressed: false,
  toggleMutePressed: false,
  toggleDebugTelemetryPressed: false,
  sonarInsightTriggered: false,
  anyInteractionPressed: false,
});

export function normalizeKeyIdentifier(rawKey: string): string[] {
  const lowercasedKey = rawKey.toLowerCase();
  const normalizedIdentifiers: string[] = [lowercasedKey];

  if (lowercasedKey.startsWith("key")) {
    normalizedIdentifiers.push(lowercasedKey.slice(3));
  }

  switch (lowercasedKey) {
    case "arrowup":
    case "keyw":
    case "w":
      normalizedIdentifiers.push("up", "w");
      break;
    case "arrowdown":
    case "keys":
    case "s":
      normalizedIdentifiers.push("down", "s");
      break;
    case "arrowleft":
    case "keya":
    case "a":
      normalizedIdentifiers.push("left", "a");
      break;
    case "arrowright":
    case "keyd":
    case "d":
      normalizedIdentifiers.push("right", "d");
      break;
    case " ":
    case "space":
      normalizedIdentifiers.push("space");
      break;
    case "shiftleft":
    case "shiftright":
    case "shift":
      normalizedIdentifiers.push("shift");
      break;
    case "escape":
      normalizedIdentifiers.push("escape");
      break;
    case "enter":
      normalizedIdentifiers.push("enter");
      break;
    case "keym":
    case "m":
      normalizedIdentifiers.push("m");
      break;
    case "keye":
    case "e":
      normalizedIdentifiers.push("e");
      break;
    case "f8":
      normalizedIdentifiers.push("f8");
      break;
    case "f3":
      normalizedIdentifiers.push("f3");
      break;
  }

  return normalizedIdentifiers;
}

export class InputStateManager {
  private activeKeysSet: Set<string> = new Set();
  private pendingPressedKeysSet: Set<string> = new Set();
  private pendingReleasedKeysSet: Set<string> = new Set();
  private currentFramePressedKeysSet: Set<string> = new Set();
  private currentFrameReleasedKeysSet: Set<string> = new Set();

  private anyInteractionPending: boolean = false;
  private previousStrokeDownState: boolean = false;

  private pointerPositionCoordinateX: number = 0;
  private pointerPositionCoordinateY: number = 0;
  private pointerPressedState: boolean = false;

  private currentInputState: UnifiedInputState = INITIAL_UNIFIED_INPUT_STATE;
  private touchControlsSource: TouchControlsState | null = null;

  private keyboardKeyDownListener: ((keyboardEvent: KeyboardEvent) => void) | null = null;
  private keyboardKeyUpListener: ((keyboardEvent: KeyboardEvent) => void) | null = null;
  private windowPointerDownListener:
    ((pointerEvent: PointerEvent | MouseEvent | TouchEvent) => void) | null = null;
  private windowPointerUpListener:
    ((pointerEvent: PointerEvent | MouseEvent | TouchEvent) => void) | null = null;
  private windowPointerMoveListener:
    ((pointerEvent: PointerEvent | MouseEvent | TouchEvent) => void) | null = null;

  private mockStateOverride: Partial<UnifiedInputState> | null = null;

  constructor() {
    this.setupWindowListeners();
  }

  private setupWindowListeners(): void {
    if (typeof window === "undefined") {
      return;
    }

    this.keyboardKeyDownListener = (keyboardEvent: KeyboardEvent) => {
      const keyVariants = [
        ...normalizeKeyIdentifier(keyboardEvent.key),
        ...normalizeKeyIdentifier(keyboardEvent.code),
      ];

      for (let index = 0; index < keyVariants.length; index++) {
        const keyVariant = keyVariants[index];
        this.activeKeysSet.add(keyVariant);
        if (!keyboardEvent.repeat) {
          this.pendingPressedKeysSet.add(keyVariant);
        }
      }

      this.anyInteractionPending = true;
    };

    this.keyboardKeyUpListener = (keyboardEvent: KeyboardEvent) => {
      const keyVariants = [
        ...normalizeKeyIdentifier(keyboardEvent.key),
        ...normalizeKeyIdentifier(keyboardEvent.code),
      ];

      for (let index = 0; index < keyVariants.length; index++) {
        const keyVariant = keyVariants[index];
        this.activeKeysSet.delete(keyVariant);
        this.pendingReleasedKeysSet.add(keyVariant);
      }
    };

    this.windowPointerDownListener = (pointerEvent: PointerEvent | MouseEvent | TouchEvent) => {
      this.anyInteractionPending = true;
      this.pointerPressedState = true;
      if ("clientX" in pointerEvent && typeof pointerEvent.clientX === "number") {
        this.pointerPositionCoordinateX = pointerEvent.clientX;
        this.pointerPositionCoordinateY = pointerEvent.clientY;
      }
    };

    this.windowPointerUpListener = (pointerEvent: PointerEvent | MouseEvent | TouchEvent) => {
      this.pointerPressedState = false;
      if ("clientX" in pointerEvent && typeof pointerEvent.clientX === "number") {
        this.pointerPositionCoordinateX = pointerEvent.clientX;
        this.pointerPositionCoordinateY = pointerEvent.clientY;
      }
    };

    this.windowPointerMoveListener = (pointerEvent: PointerEvent | MouseEvent | TouchEvent) => {
      if ("clientX" in pointerEvent && typeof pointerEvent.clientX === "number") {
        this.pointerPositionCoordinateX = pointerEvent.clientX;
        this.pointerPositionCoordinateY = pointerEvent.clientY;
      }
    };

    window.addEventListener("keydown", this.keyboardKeyDownListener);
    window.addEventListener("keyup", this.keyboardKeyUpListener);
    window.addEventListener("pointerdown", this.windowPointerDownListener, { passive: true });
    window.addEventListener("pointerup", this.windowPointerUpListener, { passive: true });
    window.addEventListener("pointermove", this.windowPointerMoveListener, { passive: true });
  }

  public setTouchControlsSource(touchControlsState: TouchControlsState | null): void {
    this.touchControlsSource = touchControlsState;
  }

  public setMockStateOverride(mockState: Partial<UnifiedInputState> | null): void {
    this.mockStateOverride = mockState;
  }

  public simulateKeyDown(rawKey: string): void {
    const keyVariants = normalizeKeyIdentifier(rawKey);
    for (let index = 0; index < keyVariants.length; index++) {
      this.activeKeysSet.add(keyVariants[index]);
      this.pendingPressedKeysSet.add(keyVariants[index]);
    }
    this.anyInteractionPending = true;
  }

  public simulateKeyUp(rawKey: string): void {
    const keyVariants = normalizeKeyIdentifier(rawKey);
    for (let index = 0; index < keyVariants.length; index++) {
      this.activeKeysSet.delete(keyVariants[index]);
      this.pendingReleasedKeysSet.add(keyVariants[index]);
    }
  }

  public isKeyDown(rawKey: string): boolean {
    const keyVariants = normalizeKeyIdentifier(rawKey);
    for (let index = 0; index < keyVariants.length; index++) {
      if (this.activeKeysSet.has(keyVariants[index])) {
        return true;
      }
    }
    return false;
  }

  public isKeyPressed(rawKey: string): boolean {
    const keyVariants = normalizeKeyIdentifier(rawKey);
    for (let index = 0; index < keyVariants.length; index++) {
      if (this.currentFramePressedKeysSet.has(keyVariants[index])) {
        return true;
      }
    }
    return false;
  }

  public isKeyReleased(rawKey: string): boolean {
    const keyVariants = normalizeKeyIdentifier(rawKey);
    for (let index = 0; index < keyVariants.length; index++) {
      if (this.currentFrameReleasedKeysSet.has(keyVariants[index])) {
        return true;
      }
    }
    return false;
  }

  public getPointerPosition(): { readonly x: number; readonly y: number } {
    return {
      x: this.pointerPositionCoordinateX,
      y: this.pointerPositionCoordinateY,
    };
  }

  public isPointerPressed(): boolean {
    return this.pointerPressedState;
  }

  /**
   * Atualização executada exclusivamente durante a fase 'input' do SystemRunner.
   * Consolida teclado, gamepad e touch em um único snapshot imutável para o quadro.
   */
  public update(): UnifiedInputState {
    this.currentFramePressedKeysSet = new Set(this.pendingPressedKeysSet);
    this.currentFrameReleasedKeysSet = new Set(this.pendingReleasedKeysSet);
    this.pendingPressedKeysSet.clear();
    this.pendingReleasedKeysSet.clear();

    const gamepadSnapshot: GamepadSnapshot = gamepadSystem.pollGamepadState();
    const touchControls: TouchControlsState | null = this.touchControlsSource;

    // 1. Teclado
    const keyboardUp = this.isKeyDown("up");
    const keyboardDown = this.isKeyDown("down");
    const keyboardLeft = this.isKeyDown("left");
    const keyboardRight = this.isKeyDown("right");

    const keyboardStrokePressed = this.isKeyPressed("space");
    const keyboardStrokeDown = this.isKeyDown("space");
    const keyboardStrokeReleased = this.isKeyReleased("space");

    const keyboardSonarPressed = this.isKeyPressed("shift") || this.isKeyPressed("e");
    const keyboardSonarDown = this.isKeyDown("shift") || this.isKeyDown("e");

    const keyboardPausePressed = this.isKeyPressed("escape") || this.isKeyPressed("p");
    const keyboardMutePressed = this.isKeyPressed("m");
    const keyboardDebugPressed = this.isKeyPressed("f8") || this.isKeyPressed("f3");
    const keyboardSonarInsight = this.isKeyPressed("e");

    // 2. Toque em tela
    const touchUp = Boolean(touchControls && touchControls.up);
    const touchDown = Boolean(touchControls && touchControls.down);
    const touchLeft = Boolean(touchControls && touchControls.left);
    const touchRight = Boolean(touchControls && touchControls.right);
    const touchStrokePressed = Boolean(touchControls && touchControls.strokePressed);
    const touchStrokeDown = Boolean(touchControls && touchControls.strokeDown);
    const touchSonarPressed = Boolean(touchControls && touchControls.sonarPressed);

    // 3. Gamepad
    const gamepadUp = gamepadSnapshot.up;
    const gamepadDown = gamepadSnapshot.down;
    const gamepadLeft = gamepadSnapshot.left;
    const gamepadRight = gamepadSnapshot.right;
    const gamepadStrokePressed = gamepadSnapshot.strokePressed;
    const gamepadStrokeDown = gamepadSnapshot.strokeDown;
    const gamepadSonarPressed = gamepadSnapshot.sonarPressed;
    const gamepadPausePressed = gamepadSnapshot.pausePressed;

    // 4. Fusão Unificada
    const moveUp = keyboardUp || touchUp || gamepadUp;
    const moveDown = keyboardDown || touchDown || gamepadDown;
    const moveLeft = keyboardLeft || touchLeft || gamepadLeft;
    const moveRight = keyboardRight || touchRight || gamepadRight;

    let horizontalAxis = gamepadSnapshot.axisX;
    if (horizontalAxis === 0) {
      horizontalAxis = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
    }

    let verticalAxis = gamepadSnapshot.axisY;
    if (verticalAxis === 0) {
      verticalAxis = (moveDown ? 1 : 0) - (moveUp ? 1 : 0);
    }

    const strokePressed = keyboardStrokePressed || touchStrokePressed || gamepadStrokePressed;
    const strokeDown = keyboardStrokeDown || touchStrokeDown || gamepadStrokeDown;

    const strokeReleased = keyboardStrokeReleased || (!strokeDown && this.previousStrokeDownState);

    const sonarPressed = keyboardSonarPressed || touchSonarPressed || gamepadSonarPressed;
    const sonarDown = keyboardSonarDown || touchSonarPressed || gamepadSonarPressed;

    const pausePressed = keyboardPausePressed || gamepadPausePressed;
    const toggleMutePressed = keyboardMutePressed;
    const toggleDebugTelemetryPressed = keyboardDebugPressed;
    const sonarInsightTriggered = keyboardSonarInsight || touchSonarPressed || gamepadSonarPressed;

    const anyInteractionPressed =
      this.anyInteractionPending ||
      this.currentFramePressedKeysSet.size > 0 ||
      touchStrokePressed ||
      touchSonarPressed ||
      gamepadStrokePressed ||
      gamepadSonarPressed;

    this.anyInteractionPending = false;
    this.previousStrokeDownState = strokeDown;

    let computedState: UnifiedInputState = {
      moveUp,
      moveDown,
      moveLeft,
      moveRight,
      horizontalAxis,
      verticalAxis,
      strokePressed,
      strokeDown,
      strokeReleased,
      sonarPressed,
      sonarDown,
      pausePressed,
      toggleMutePressed,
      toggleDebugTelemetryPressed,
      sonarInsightTriggered,
      anyInteractionPressed,
    };

    if (this.mockStateOverride) {
      computedState = {
        ...computedState,
        ...this.mockStateOverride,
      };
    }

    this.currentInputState = Object.freeze(computedState);
    return this.currentInputState;
  }

  public getState(): UnifiedInputState {
    return this.currentInputState;
  }

  public reset(): void {
    this.activeKeysSet.clear();
    this.pendingPressedKeysSet.clear();
    this.pendingReleasedKeysSet.clear();
    this.currentFramePressedKeysSet.clear();
    this.currentFrameReleasedKeysSet.clear();
    this.anyInteractionPending = false;
    this.previousStrokeDownState = false;
    this.pointerPressedState = false;
    this.pointerPositionCoordinateX = 0;
    this.pointerPositionCoordinateY = 0;
    this.currentInputState = INITIAL_UNIFIED_INPUT_STATE;
    this.mockStateOverride = null;
  }

  public destroy(): void {
    if (typeof window !== "undefined") {
      if (this.keyboardKeyDownListener) {
        window.removeEventListener("keydown", this.keyboardKeyDownListener);
        this.keyboardKeyDownListener = null;
      }
      if (this.keyboardKeyUpListener) {
        window.removeEventListener("keyup", this.keyboardKeyUpListener);
        this.keyboardKeyUpListener = null;
      }
      if (this.windowPointerDownListener) {
        window.removeEventListener("pointerdown", this.windowPointerDownListener);
        this.windowPointerDownListener = null;
      }
      if (this.windowPointerUpListener) {
        window.removeEventListener("pointerup", this.windowPointerUpListener);
        this.windowPointerUpListener = null;
      }
      if (this.windowPointerMoveListener) {
        window.removeEventListener("pointermove", this.windowPointerMoveListener);
        this.windowPointerMoveListener = null;
      }
    }
    this.reset();
  }
}

let activeInputStateManagerInstance: InputStateManager | null = null;

export function initInputStateManager(): InputStateManager {
  if (activeInputStateManagerInstance) {
    activeInputStateManagerInstance.destroy();
  }
  activeInputStateManagerInstance = new InputStateManager();
  return activeInputStateManagerInstance;
}

export function getInputStateManager(): InputStateManager | null {
  return activeInputStateManagerInstance;
}

export function resetInputStateManager(): void {
  if (activeInputStateManagerInstance) {
    activeInputStateManagerInstance.destroy();
    activeInputStateManagerInstance = null;
  }
}

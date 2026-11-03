import { reportInformation } from "../utils/errorReporter";

/**
 * Sistema de Entrada para Gamepad / Joystick (W3C Gamepad API)
 *
 * Mapeia controles físicos USB, Bluetooth, joysticks arcade e controles de museus/totens:
 * - Botão A / Cruz (0): Batida de cauda (impulso de nado)
 * - Botão B / Círculo (1) ou Botão X / Quadrado (2): Biosonar
 * - Botão Start / Menu (9): Pausa
 * - Analógico Esquerdo Y (Eixo 1) + D-pad Cima/Baixo (12, 13): Direção vertical
 * - Analógico Esquerdo X (Eixo 0) + D-pad Esquerda/Direita (14, 15): Direção horizontal
 */

export interface GamepadSnapshot {
  connected: boolean;
  id: string;
  strokePressed: boolean;
  strokeDown: boolean;
  sonarPressed: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  pausePressed: boolean;
  axisX: number;
  axisY: number;
}

export class GamepadSystem {
  private deadzone: number = 0.22;
  private prevButtonStates: boolean[] = [];
  private isConnected: boolean = false;
  private gamepadName: string = "";

  private onConnectedHandler: ((event: Event) => void) | null = null;
  private onDisconnectedHandler: (() => void) | null = null;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === "undefined") return;

    this.onConnectedHandler = (event: Event) => {
      const gamepadEvent = event as GamepadEvent;
      this.isConnected = true;
      this.gamepadName = gamepadEvent.gamepad?.id || "Gamepad Conectado";
      reportInformation(`Gamepad detectado: ${this.gamepadName}`);
    };

    this.onDisconnectedHandler = () => {
      this.isConnected = false;
      this.gamepadName = "";
      this.prevButtonStates = [];
      reportInformation("Gamepad desconectado.");
    };

    window.addEventListener("gamepadconnected", this.onConnectedHandler);
    window.addEventListener("gamepaddisconnected", this.onDisconnectedHandler);
  }

  public cleanup() {
    if (typeof window === "undefined") return;
    if (this.onConnectedHandler) {
      window.removeEventListener("gamepadconnected", this.onConnectedHandler);
      this.onConnectedHandler = null;
    }
    if (this.onDisconnectedHandler) {
      window.removeEventListener("gamepaddisconnected", this.onDisconnectedHandler);
      this.onDisconnectedHandler = null;
    }
  }

  public getActiveGamepad(): Gamepad | null {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return null;
    }
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      if (pad && pad.connected) {
        return pad;
      }
    }
    return null;
  }

  public isGamepadConnected(): boolean {
    return this.isConnected || Boolean(this.getActiveGamepad());
  }

  public getGamepadName(): string {
    return this.getActiveGamepad()?.id || this.gamepadName || "Nenhum controle";
  }

  public pollGamepadState(): GamepadSnapshot {
    const pad = this.getActiveGamepad();
    if (!pad) {
      this.prevButtonStates = [];
      return {
        connected: false,
        id: "",
        strokePressed: false,
        strokeDown: false,
        sonarPressed: false,
        up: false,
        down: false,
        left: false,
        right: false,
        pausePressed: false,
        axisX: 0,
        axisY: 0,
      };
    }

    const isButtonDown = (buttonIndex: number): boolean => {
      const button = pad.buttons[buttonIndex];
      return Boolean(button && (button.pressed || button.value > 0.4));
    };

    const isButtonJustPressed = (buttonIndex: number): boolean => {
      const down = isButtonDown(buttonIndex);
      const wasDown = Boolean(this.prevButtonStates[buttonIndex]);
      return down && !wasDown;
    };

    // Botões principais
    // 0: A (Xbox) / X (PlayStation)
    // 1: B (Xbox) / Círculo (PlayStation)
    // 2: X (Xbox) / Quadrado (PlayStation)
    // 8: Back / Select
    // 9: Start / Options
    const strokeDown = isButtonDown(0);
    const strokePressed = isButtonJustPressed(0);
    const sonarPressed = isButtonDown(1) || isButtonDown(2);
    const pausePressed = isButtonJustPressed(9) || isButtonJustPressed(8);

    // D-Pad
    const dpadUp = isButtonDown(12);
    const dpadDown = isButtonDown(13);
    const dpadLeft = isButtonDown(14);
    const dpadRight = isButtonDown(15);

    // Eixos Analógicos com Deadzone
    const rawAxisX = pad.axes[0] ?? 0;
    const rawAxisY = pad.axes[1] ?? 0;

    const axisX = Math.abs(rawAxisX) > this.deadzone ? rawAxisX : 0;
    const axisY = Math.abs(rawAxisY) > this.deadzone ? rawAxisY : 0;

    const up = dpadUp || axisY < -this.deadzone;
    const down = dpadDown || axisY > this.deadzone;
    const left = dpadLeft || axisX < -this.deadzone;
    const right = dpadRight || axisX > this.deadzone;

    // Atualiza histórico de botões para detecção de borda no próximo frame
    for (let buttonIndex = 0; buttonIndex < pad.buttons.length; buttonIndex++) {
      this.prevButtonStates[buttonIndex] = isButtonDown(buttonIndex);
    }

    return {
      connected: true,
      id: pad.id,
      strokePressed,
      strokeDown,
      sonarPressed,
      up,
      down,
      left,
      right,
      pausePressed,
      axisX,
      axisY,
    };
  }
}

export const gamepadSystem = new GamepadSystem();

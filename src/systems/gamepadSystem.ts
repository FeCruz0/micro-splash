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

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === "undefined") return;

    window.addEventListener("gamepadconnected", (e: any) => {
      this.isConnected = true;
      this.gamepadName = e.gamepad?.id || "Gamepad Conectado";
      console.log(`🎮 Gamepad detectado: ${this.gamepadName}`);
    });

    window.addEventListener("gamepaddisconnected", () => {
      this.isConnected = false;
      this.gamepadName = "";
      this.prevButtonStates = [];
      console.log("🎮 Gamepad desconectado.");
    });
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

    const isBtnDown = (idx: number): boolean => {
      const btn = pad.buttons[idx];
      return Boolean(btn && (btn.pressed || btn.value > 0.4));
    };

    const isBtnJustPressed = (idx: number): boolean => {
      const down = isBtnDown(idx);
      const wasDown = Boolean(this.prevButtonStates[idx]);
      return down && !wasDown;
    };

    // Botões principais
    // 0: A (Xbox) / X (PlayStation)
    // 1: B (Xbox) / Círculo (PlayStation)
    // 2: X (Xbox) / Quadrado (PlayStation)
    // 8: Back / Select
    // 9: Start / Options
    const strokeDown = isBtnDown(0);
    const strokePressed = isBtnJustPressed(0);
    const sonarPressed = isBtnDown(1) || isBtnDown(2);
    const pausePressed = isBtnJustPressed(9) || isBtnJustPressed(8);

    // D-Pad
    const dpadUp = isBtnDown(12);
    const dpadDown = isBtnDown(13);
    const dpadLeft = isBtnDown(14);
    const dpadRight = isBtnDown(15);

    // Eixos Analógicos com Deadzone
    let rawAxisX = pad.axes[0] ?? 0;
    let rawAxisY = pad.axes[1] ?? 0;

    let axisX = Math.abs(rawAxisX) > this.deadzone ? rawAxisX : 0;
    let axisY = Math.abs(rawAxisY) > this.deadzone ? rawAxisY : 0;

    const up = dpadUp || axisY < -this.deadzone;
    const down = dpadDown || axisY > this.deadzone;
    const left = dpadLeft || axisX < -this.deadzone;
    const right = dpadRight || axisX > this.deadzone;

    // Atualiza histórico de botões para detecção de borda no próximo frame
    for (let i = 0; i < pad.buttons.length; i++) {
      this.prevButtonStates[i] = isBtnDown(i);
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

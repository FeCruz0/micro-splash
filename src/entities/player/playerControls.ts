import type { GameObj, KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../../config";
import type { TouchControlsState } from "../../ui/touchControls";
import { gamepadSystem } from "../../systems/gamepadSystem";

export interface PlayerInputSnapshot {
  isStrokePressed: boolean;
  isStrokeDown: boolean;
  isStrokeReleased: boolean;
  isSonarTriggered: boolean;
  isLeftDown: boolean;
  isRightDown: boolean;
  isUpDown: boolean;
  isDownDown: boolean;
}

export class PlayerControlsManager {
  private k: KaboomCtx;
  private touchState?: TouchControlsState;
  private facingRight = true;
  private targetCamOffset = 200;
  private angle = 0;
  private tailAngle = 0;
  private pitchAngularVelocity = 0;
  private spineCurvature = 0;

  constructor(k: KaboomCtx, touchState?: TouchControlsState) {
    this.k = k;
    this.touchState = touchState;
  }

  public isFacingRight(): boolean {
    return this.facingRight;
  }

  public setFacingRight(facing: boolean): void {
    this.facingRight = facing;
  }

  public getTargetCamOffset(): number {
    return this.targetCamOffset;
  }

  public setTargetCamOffset(offset: number): void {
    this.targetCamOffset = offset;
  }

  public getAngle(): number {
    return this.angle;
  }

  public setAngle(angle: number): void {
    this.angle = angle;
  }

  public getTailAngle(): number {
    return this.tailAngle;
  }

  public getPitchAngularVelocity(): number {
    return this.pitchAngularVelocity;
  }

  public getSpineCurvature(): number {
    return this.spineCurvature;
  }

  public getPitchFlexion(): number {
    return this.k.clamp(this.spineCurvature / 15, -1, 1);
  }

  public resetPitchDynamics(targetAngle: number = this.angle): void {
    this.angle = targetAngle;
    this.tailAngle = targetAngle;
    this.pitchAngularVelocity = 0;
    this.spineCurvature = 0;
  }

  public pollInputs(strokeTimer: number): PlayerInputSnapshot {
    const k = this.k;
    const touch = this.touchState;
    const pad = gamepadSystem.pollGamepadState();

    const isLeftDown = Boolean(
      k.isKeyDown("left") || k.isKeyDown("a") || (touch && touch.left) || pad.left
    );
    const isRightDown = Boolean(
      k.isKeyDown("right") || k.isKeyDown("d") || (touch && touch.right) || pad.right
    );
    const isUpDown = Boolean(
      k.isKeyDown("up") || k.isKeyDown("w") || (touch && touch.up) || pad.up
    );
    const isDownDown = Boolean(
      k.isKeyDown("down") || k.isKeyDown("s") || (touch && touch.down) || pad.down
    );

    const isStrokePressed = Boolean(
      k.isKeyPressed("space") || (touch && touch.strokePressed) || pad.strokePressed
    );
    const isStrokeDown = Boolean(
      k.isKeyDown("space") || (touch && touch.strokeDown) || pad.strokeDown
    );
    const isStrokeReleased = Boolean(
      k.isKeyReleased("space") ||
      (touch && !touch.strokeDown && strokeTimer > 0 && !k.isKeyDown("space") && !pad.strokeDown)
    );

    const isSonarTriggered = Boolean(
      k.isKeyDown("shift") || k.isKeyDown("e") || (touch && touch.sonarPressed) || pad.sonarPressed
    );

    return {
      isStrokePressed,
      isStrokeDown,
      isStrokeReleased,
      isSonarTriggered,
      isLeftDown,
      isRightDown,
      isUpDown,
      isDownDown,
    };
  }

  public updateOrientation(
    dt: number,
    baleia: GameObj,
    inputs: PlayerInputSnapshot,
    isTrapped: boolean,
    inAir: boolean = false
  ): void {
    const previousAngle = this.angle;

    // A baleia não pode virar horizontalmente enquanto estiver no ar (fora d'água)
    if (!inAir) {
      if (inputs.isLeftDown) {
        this.facingRight = false;
        this.targetCamOffset = -200;
        baleia.flipX = true;
      }
      if (inputs.isRightDown) {
        this.facingRight = true;
        this.targetCamOffset = 200;
        baleia.flipX = false;
      }
    }

    if (isTrapped) {
      this.angle = this.k.lerp(this.angle, 0, 0.05);
      this.tailAngle = this.k.lerp(this.tailAngle, this.angle, Math.min(1, dt * 6));
      this.spineCurvature = this.angle - this.tailAngle;
      this.pitchAngularVelocity = dt > 0.0001 ? (this.angle - previousAngle) / dt : 0;
      return;
    }

    // Se estiver no ar, a arfagem segue a balística da trajetória
    if (inAir) {
      this.tailAngle = this.k.lerp(this.tailAngle, this.angle, Math.min(1, dt * 7));
      this.spineCurvature = this.angle - this.tailAngle;
      this.pitchAngularVelocity = dt > 0.0001 ? (this.angle - previousAngle) / dt : 0;
      return;
    }

    const velocidadeRotacao = GAME_CONFIG.ROTATION_SPEED * dt;
    if (inputs.isUpDown) {
      this.angle = this.k.clamp(this.angle - velocidadeRotacao, -45, 45);
    } else if (inputs.isDownDown) {
      this.angle = this.k.clamp(this.angle + velocidadeRotacao, -45, 45);
    } else {
      this.angle = this.k.lerp(this.angle, 0, 0.05);
    }

    // Dinâmica de Arfagem e Inércia Elástica Caudal
    const instantVelocity = dt > 0.0001 ? (this.angle - previousAngle) / dt : 0;
    this.pitchAngularVelocity = this.k.lerp(
      this.pitchAngularVelocity,
      instantVelocity,
      Math.min(1, dt * 10)
    );

    // Amortecimento de 2ª ordem para a cauda acompanhar a cabeça com arrasto hidrodinâmico
    const tailStiffness = 8.5;
    this.tailAngle = this.k.lerp(this.tailAngle, this.angle, Math.min(1, dt * tailStiffness));
    this.spineCurvature = this.angle - this.tailAngle;
  }
}

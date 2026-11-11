/**
 * Sistema Canônico de Gerenciamento da Câmera — Micro Splash
 *
 * Controla a posição da câmera afetando exclusivamente o worldContainer no RenderEngineAdapter,
 * mantendo elementos estáticos e interface de usuário no screenContainer completamente desacoplados.
 */

import type { IRenderEngine, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import { getActiveRenderEngine } from "../engine/adapters/RenderEngineAdapter";
import { safeShake } from "../utils/camera";

export interface CameraFollowOptions {
  readonly smoothingFactor?: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
}

export class CameraSystem {
  private cameraPosition: Vector2D = { x: 0, y: 0 };
  private renderEngineInstance: IRenderEngine | null = null;

  constructor(renderEngine?: IRenderEngine) {
    this.renderEngineInstance = renderEngine ?? getActiveRenderEngine();
  }

  public setRenderEngine(renderEngine: IRenderEngine): void {
    this.renderEngineInstance = renderEngine;
  }

  public getCameraPosition(): Vector2D {
    const activeEngine = this.renderEngineInstance ?? getActiveRenderEngine();
    if (activeEngine) {
      return activeEngine.getCameraPosition();
    }
    return { x: this.cameraPosition.x, y: this.cameraPosition.y };
  }

  public setCameraPosition(cameraPositionX: number, cameraPositionY: number): void {
    this.cameraPosition = { x: cameraPositionX, y: cameraPositionY };
    const activeEngine = this.renderEngineInstance ?? getActiveRenderEngine();
    if (activeEngine) {
      activeEngine.setCameraPosition(cameraPositionX, cameraPositionY);
    }
  }

  public followTarget(
    targetPositionX: number,
    targetPositionY: number,
    options?: CameraFollowOptions
  ): Vector2D {
    const smoothingFactor = options?.smoothingFactor ?? 0.05;
    const offsetX = options?.offsetX ?? 0;
    const offsetY = options?.offsetY ?? 0;

    const currentPosition = this.getCameraPosition();
    const destinationX = targetPositionX + offsetX;
    const destinationY = targetPositionY + offsetY;

    const interpolatedX = currentPosition.x + (destinationX - currentPosition.x) * smoothingFactor;
    const interpolatedY = currentPosition.y + (destinationY - currentPosition.y) * smoothingFactor;

    this.setCameraPosition(interpolatedX, interpolatedY);
    return { x: interpolatedX, y: interpolatedY };
  }

  public triggerShake(shakeIntensityInPixels: number): void {
    const activeEngine = this.renderEngineInstance ?? getActiveRenderEngine();
    if (activeEngine) {
      safeShake(activeEngine, shakeIntensityInPixels);
    }
  }

  public reset(): void {
    const activeEngine = this.renderEngineInstance ?? getActiveRenderEngine();
    if (activeEngine && typeof activeEngine.getDimensions === "function") {
      const dimensions = activeEngine.getDimensions();
      this.setCameraPosition(dimensions.width / 2, dimensions.height / 2);
    } else {
      this.setCameraPosition(400, 300);
    }
  }
}

export const cameraSystem = new CameraSystem();

/**
 * Resolve a posição horizontal (X) da câmera ativa no mundo de forma resiliente.
 */
export function resolveCameraX(engineOrContext?: IRenderEngine | unknown): number {
  if (
    engineOrContext &&
    typeof (engineOrContext as IRenderEngine).getCameraPosition === "function"
  ) {
    return (engineOrContext as IRenderEngine).getCameraPosition().x;
  }
  if (
    engineOrContext &&
    typeof (engineOrContext as { camPos?: () => { x: number } }).camPos === "function"
  ) {
    const position = (engineOrContext as { camPos: () => { x: number } }).camPos();
    if (position && typeof position.x === "number") {
      return position.x;
    }
  }
  return cameraSystem.getCameraPosition().x;
}

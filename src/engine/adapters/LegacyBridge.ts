/**
 * Ponte de Interoperabilidade e Coexistência (Legacy Engine Bridge) — Micro Splash
 *
 * Permite que subsistemas refatorados operem via IRenderEngine (PixiJS v8)
 * e mantenham compatibilidade estrutural reversa com chamadas legadas em transição.
 * Zero imports de "kaboom", zero uso de "any".
 */

import type { IRenderEngine, IRenderNode, Vector2D } from "../contracts/INTERFACE_CONTRACTS";

export interface LegacyEntityStructure {
  pos?: { x: number; y: number };
  scale?: { x: number; y: number };
  angle?: number;
  opacity?: number;
  hidden?: boolean;
  z?: number;
  destroy?(): void;
}

export interface LegacyEngineBridge {
  width(): number;
  height(): number;
  dt(): number;
  camPos?(): { x: number; y: number };
  camRot?(): number;
  add(components?: unknown): unknown;
  circle(radius: number): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  polygon(points: readonly unknown[]): unknown;
  pos(x: number, y: number): unknown;
  color(red: number, green: number, blue: number): unknown;
  opacity(alpha: number): unknown;
  z(zIndex: number): unknown;
  onUpdate(...args: unknown[]): unknown;
  destroy?(obj: unknown): void;
}

export class LegacyRenderNodeAdapter implements IRenderNode {
  readonly id: string;
  private readonly entity: LegacyEntityStructure;

  constructor(rawEntity: unknown, id: string) {
    this.entity =
      rawEntity && typeof rawEntity === "object" ? (rawEntity as LegacyEntityStructure) : {};
    this.id = id;
  }

  getPosition(): Vector2D {
    return {
      x: this.entity.pos?.x ?? 0,
      y: this.entity.pos?.y ?? 0,
    };
  }

  setPosition(x: number, y: number): void {
    if (this.entity.pos) {
      this.entity.pos.x = x;
      this.entity.pos.y = y;
    }
  }

  getScale(): Vector2D {
    return {
      x: this.entity.scale?.x ?? 1,
      y: this.entity.scale?.y ?? 1,
    };
  }

  setScale(scaleX: number, scaleY: number): void {
    if (this.entity.scale) {
      this.entity.scale.x = scaleX;
      this.entity.scale.y = scaleY;
    }
  }

  getRotation(): number {
    return this.entity.angle ? (this.entity.angle * Math.PI) / 180 : 0;
  }

  setRotation(angleInRadians: number): void {
    this.entity.angle = (angleInRadians * 180) / Math.PI;
  }

  getOpacity(): number {
    return this.entity.opacity ?? 1;
  }

  setOpacity(alpha: number): void {
    if (typeof this.entity.opacity === "number") {
      this.entity.opacity = Math.max(0, Math.min(1, alpha));
    }
  }

  getZIndex(): number {
    return this.entity.z ?? -1;
  }

  setZIndex(index: number): void {
    this.entity.z = index;
  }

  isVisible(): boolean {
    return !this.entity.hidden;
  }

  setVisible(visible: boolean): void {
    this.entity.hidden = !visible;
  }

  addChild(_child: IRenderNode): void {}

  removeChild(_child: IRenderNode): void {}

  getChildren(): readonly IRenderNode[] {
    return [];
  }

  destroy(): void {
    if (typeof this.entity.destroy === "function") {
      this.entity.destroy();
    }
  }

  getNativeNode<T>(): T {
    return this.entity as unknown as T;
  }
}

export function isRenderEngine(target: unknown): target is IRenderEngine {
  return (
    typeof target === "object" &&
    target !== null &&
    "createGraphics" in target &&
    "getTicker" in target &&
    "getDimensions" in target
  );
}

export function resolveCameraX(engineOrContext: IRenderEngine | LegacyEngineBridge): number {
  if (
    "camPos" in engineOrContext &&
    typeof (engineOrContext as { camPos?: () => { x: number } }).camPos === "function"
  ) {
    const position = (engineOrContext as { camPos: () => { x: number } }).camPos();
    if (position && typeof position.x === "number") {
      return position.x;
    }
  }
  return 0;
}

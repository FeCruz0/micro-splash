/**
 * Proxy de renderizacao nativo PixiJS para objetos do ceu.
 */

import type { IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import type { SkyRenderObject } from "./skyTypes";

export class PixiSkyNodeProxy implements SkyRenderObject {
  readonly pos: { x: number; y: number };
  comps: unknown[];
  private readonly node: IRenderNode;
  private readonly tagSet: Set<string>;
  private isDestroyed = false;
  private currentAngle = 0;
  private currentColor: unknown = [255, 255, 255];
  private currentX: number;
  private currentY: number;
  private currentOpacity: number;

  constructor(
    node: IRenderNode,
    tags: readonly string[] = [],
    comps: unknown[] = [],
    initialX: number = 0,
    initialY: number = 0,
    initialOpacity: number = 1
  ) {
    this.node = node;
    this.tagSet = new Set(tags);
    this.comps = comps;
    this.currentX = initialX;
    this.currentY = initialY;
    this.currentOpacity = initialOpacity;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.pos = {
      get x(): number {
        return self.currentX;
      },
      set x(value: number) {
        if (Math.abs(self.currentX - value) > 0.01) {
          self.currentX = value;
          self.node.setPosition(self.currentX, self.currentY);
        }
      },
      get y(): number {
        return self.currentY;
      },
      set y(value: number) {
        if (Math.abs(self.currentY - value) > 0.01) {
          self.currentY = value;
          self.node.setPosition(self.currentX, self.currentY);
        }
      },
    };
  }

  get opacity(): number {
    return this.currentOpacity;
  }

  set opacity(val: number) {
    if (Math.abs(this.currentOpacity - val) > 0.005) {
      this.currentOpacity = val;
      this.node.setOpacity(val);
    }
  }

  get angle(): number {
    return this.currentAngle;
  }

  set angle(val: number) {
    if (Math.abs(this.currentAngle - val) > 0.05) {
      this.currentAngle = val;
      this.node.setRotation((val * Math.PI) / 180);
    }
  }

  get color(): unknown {
    return this.currentColor;
  }

  set color(val: unknown) {
    this.currentColor = val;
    const native = this.node.getNativeNode<{ tint?: number }>();
    if (native && typeof native === "object" && "tint" in native) {
      if (Array.isArray(val) && val.length >= 3) {
        const nextTint = ((val[0] & 0xff) << 16) | ((val[1] & 0xff) << 8) | (val[2] & 0xff);
        if (native.tint !== nextTint) native.tint = nextTint;
      } else if (
        typeof val === "object" &&
        val !== null &&
        "r" in val &&
        "g" in val &&
        "b" in val
      ) {
        const rgb = val as { r: number; g: number; b: number };
        const nextTint = ((rgb.r & 0xff) << 16) | ((rgb.g & 0xff) << 8) | (rgb.b & 0xff);
        if (native.tint !== nextTint) native.tint = nextTint;
      }
    }
  }

  hasTag(tag: string): boolean {
    return this.tagSet.has(tag);
  }

  exists(): boolean {
    return !this.isDestroyed;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.node.destroy();
  }
}

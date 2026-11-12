import type {
  ColorRepresentation,
  ColorRgbTuple,
  IRenderEngine,
  IRenderNode,
  ISpriteNode,
  ITextNode,
  Vector2D,
} from "../contracts/INTERFACE_CONTRACTS";

export type NativeNodeAnchorAlignment =
  "topleft" | "center" | "bot" | "botleft" | "left" | "right" | "top";

export interface NativeOutlineState {
  color: unknown;
  width: number;
}

export interface NativeVisualNodeBaseOptions {
  identifier?: string;
  positionX?: number;
  positionY?: number;
  scaleX?: number;
  scaleY?: number;
  rotationDegrees?: number;
  opacity?: number;
  zIndex?: number;
  visible?: boolean;
  anchor?: NativeNodeAnchorAlignment;
  tags?: readonly string[];
  onReveal?: () => void;
}

/**
 * Normalizes tuple, object `{ r, g, b }`, hex number, or CSS color strings into ColorRepresentation.
 */
export function convertToColorRepresentation(
  colorInput: unknown,
  fallbackColor: ColorRepresentation = [255, 255, 255]
): ColorRepresentation {
  if (typeof colorInput === "number" || typeof colorInput === "string") {
    return colorInput;
  }
  if (Array.isArray(colorInput) && colorInput.length >= 3) {
    const rgbTuple: ColorRgbTuple = [
      Number(colorInput[0]) || 0,
      Number(colorInput[1]) || 0,
      Number(colorInput[2]) || 0,
    ];
    return rgbTuple;
  }
  if (
    colorInput &&
    typeof colorInput === "object" &&
    "r" in colorInput &&
    "g" in colorInput &&
    "b" in colorInput
  ) {
    const colorRecord = colorInput as { r: number; g: number; b: number };
    return [Number(colorRecord.r) || 0, Number(colorRecord.g) || 0, Number(colorRecord.b) || 0];
  }
  return fallbackColor;
}

/**
 * Compares two color values structurally to avoid redundant GPU redraws on fresh RGB allocations.
 */
export function areColorValuesEqual(firstColor: unknown, secondColor: unknown): boolean {
  if (firstColor === secondColor) {
    return true;
  }
  if (firstColor === undefined || secondColor === undefined) {
    return false;
  }
  const normalizedFirst = convertToColorRepresentation(firstColor, "");
  const normalizedSecond = convertToColorRepresentation(secondColor, "");
  if (Array.isArray(normalizedFirst) && Array.isArray(normalizedSecond)) {
    return (
      normalizedFirst[0] === normalizedSecond[0] &&
      normalizedFirst[1] === normalizedSecond[1] &&
      normalizedFirst[2] === normalizedSecond[2]
    );
  }
  return normalizedFirst === normalizedSecond;
}

export class NativeVisualObjectAdapter {
  public readonly renderNode: IRenderNode;
  private readonly cleanupCallbacks: Array<() => void> = [];
  private readonly tagsSet: Set<string>;
  private readonly revealCallback?: () => void;
  private readonly redrawCallback?: () => void;
  private readonly updateRegistrar?: (
    updateCallback: (deltaTimeInSeconds: number) => void
  ) => () => void;
  private readonly isTextNode: boolean;
  private readonly isSpriteNode: boolean;

  private positionX: number;
  private positionY: number;
  private currentScaleX: number;
  private currentScaleY: number;
  private angleDegrees: number;
  private currentOpacity: number;
  private hiddenFlag: boolean;
  private currentWidth: number;
  private currentHeight: number;
  private currentRadius: number;
  private currentColorValue: unknown;
  private currentOutlineColorValue: unknown;
  private currentOutlineWidthValue: number;
  private currentTextValue: string;
  private isNodeDestroyed = false;

  public id?: string | number;
  public isStatic?: boolean;
  private assignedTag?: string;
  public readonly pos: { x: number; y: number; dist: (other: { x: number; y: number }) => number };
  private readonly scaleAccessorObject: { x: number; y: number };
  public readonly outline: NativeOutlineState;

  constructor(params: {
    renderNode: IRenderNode;
    resolvedNativeRenderEngine: IRenderEngine;
    options?: NativeVisualNodeBaseOptions;
    width?: number;
    height?: number;
    radius?: number;
    color?: unknown;
    outlineColor?: unknown;
    outlineWidth?: number;
    text?: string;
    isTextNode?: boolean;
    isSpriteNode?: boolean;
    redrawCallback?: (adapter: NativeVisualObjectAdapter) => void;
    updateRegistrar?: (updateCallback: (deltaTimeInSeconds: number) => void) => () => void;
  }) {
    this.renderNode = params.renderNode;
    void params.resolvedNativeRenderEngine;
    this.tagsSet = new Set(params.options?.tags ?? []);
    this.revealCallback = params.options?.onReveal;
    this.updateRegistrar = params.updateRegistrar;
    this.isTextNode = Boolean(params.isTextNode);
    this.isSpriteNode = Boolean(params.isSpriteNode);

    this.positionX = params.options?.positionX ?? 0;
    this.positionY = params.options?.positionY ?? 0;
    this.currentScaleX = params.options?.scaleX ?? 1;
    this.currentScaleY = params.options?.scaleY ?? 1;
    this.angleDegrees = params.options?.rotationDegrees ?? 0;
    this.currentOpacity = params.options?.opacity ?? 1;
    this.hiddenFlag = params.options?.visible === false;
    this.currentWidth = params.width ?? 0;
    this.currentHeight = params.height ?? 0;
    this.currentRadius = params.radius ?? 0;
    this.currentColorValue = params.color;
    this.currentOutlineColorValue = params.outlineColor;
    this.currentOutlineWidthValue = params.outlineWidth ?? 0;
    this.currentTextValue = params.text ?? "";

    const externalRedraw = params.redrawCallback;
    this.redrawCallback = externalRedraw ? () => externalRedraw(this) : undefined;

    this.renderNode.setPosition(this.positionX, this.positionY);
    this.renderNode.setScale(this.currentScaleX, this.currentScaleY);
    this.renderNode.setRotation((this.angleDegrees * Math.PI) / 180);
    this.renderNode.setOpacity(this.currentOpacity);
    this.renderNode.setVisible(!this.hiddenFlag);
    if (params.options?.zIndex !== undefined) {
      this.renderNode.setZIndex(params.options.zIndex);
    }

    const getPositionX = () => this.positionX;
    const setPositionX = (nextX: number) => {
      if (this.positionX !== nextX) {
        this.positionX = nextX;
        this.renderNode.setPosition(nextX, this.positionY);
      }
    };
    const getPositionY = () => this.positionY;
    const setPositionY = (nextY: number) => {
      if (this.positionY !== nextY) {
        this.positionY = nextY;
        this.renderNode.setPosition(this.positionX, nextY);
      }
    };
    this.pos = {
      get x(): number {
        return getPositionX();
      },
      set x(nextX: number) {
        setPositionX(nextX);
      },
      get y(): number {
        return getPositionY();
      },
      set y(nextY: number) {
        setPositionY(nextY);
      },
      dist(other: { x: number; y: number }): number {
        return Math.hypot(getPositionX() - other.x, getPositionY() - other.y);
      },
    };

    const getScaleX = () => this.currentScaleX;
    const setScaleX = (nextScaleX: number) => {
      if (this.currentScaleX !== nextScaleX) {
        this.currentScaleX = nextScaleX;
        this.renderNode.setScale(nextScaleX, this.currentScaleY);
      }
    };
    const getScaleY = () => this.currentScaleY;
    const setScaleY = (nextScaleY: number) => {
      if (this.currentScaleY !== nextScaleY) {
        this.currentScaleY = nextScaleY;
        this.renderNode.setScale(this.currentScaleX, nextScaleY);
      }
    };
    this.scaleAccessorObject = {
      get x(): number {
        return getScaleX();
      },
      set x(nextScaleX: number) {
        setScaleX(nextScaleX);
      },
      get y(): number {
        return getScaleY();
      },
      set y(nextScaleY: number) {
        setScaleY(nextScaleY);
      },
    };

    const getOutlineColor = () => this.currentOutlineColorValue;
    const setOutlineColor = (nextOutlineColor: unknown) => {
      if (!areColorValuesEqual(this.currentOutlineColorValue, nextOutlineColor)) {
        this.currentOutlineColorValue = nextOutlineColor;
        this.redrawCallback?.();
      }
    };
    const getOutlineWidth = () => this.currentOutlineWidthValue;
    const setOutlineWidth = (nextOutlineWidth: number) => {
      if (this.currentOutlineWidthValue !== nextOutlineWidth) {
        this.currentOutlineWidthValue = nextOutlineWidth;
        this.redrawCallback?.();
      }
    };
    this.outline = {
      get color(): unknown {
        return getOutlineColor();
      },
      set color(nextOutlineColor: unknown) {
        setOutlineColor(nextOutlineColor);
      },
      get width(): number {
        return getOutlineWidth();
      },
      set width(nextOutlineWidth: number) {
        setOutlineWidth(nextOutlineWidth);
      },
    };
  }

  public get scale(): { x: number; y: number } {
    return this.scaleAccessorObject;
  }

  public set scale(nextScale: { x: number; y: number } | number) {
    if (typeof nextScale === "number") {
      if (this.currentScaleX !== nextScale || this.currentScaleY !== nextScale) {
        this.currentScaleX = nextScale;
        this.currentScaleY = nextScale;
        this.renderNode.setScale(nextScale, nextScale);
      }
      return;
    }
    if (nextScale && (this.currentScaleX !== nextScale.x || this.currentScaleY !== nextScale.y)) {
      this.currentScaleX = nextScale.x;
      this.currentScaleY = nextScale.y;
      this.renderNode.setScale(nextScale.x, nextScale.y);
    }
  }

  public get angle(): number {
    return this.angleDegrees;
  }

  public set angle(nextAngleDegrees: number) {
    if (this.angleDegrees !== nextAngleDegrees) {
      this.angleDegrees = nextAngleDegrees;
      this.renderNode.setRotation((nextAngleDegrees * Math.PI) / 180);
    }
  }

  public get opacity(): number {
    return this.currentOpacity;
  }

  public set opacity(nextOpacity: number) {
    if (this.currentOpacity !== nextOpacity) {
      this.currentOpacity = nextOpacity;
      this.renderNode.setOpacity(nextOpacity);
    }
  }

  public get hidden(): boolean {
    return this.hiddenFlag;
  }

  public set hidden(shouldHide: boolean) {
    if (this.hiddenFlag !== shouldHide) {
      this.hiddenFlag = shouldHide;
      this.renderNode.setVisible(!shouldHide);
    }
  }

  public get width(): number {
    return this.currentWidth;
  }

  public set width(nextWidth: number) {
    if (this.currentWidth !== nextWidth) {
      this.currentWidth = nextWidth;
      this.redrawCallback?.();
    }
  }

  public get height(): number {
    return this.currentHeight;
  }

  public set height(nextHeight: number) {
    if (this.currentHeight !== nextHeight) {
      this.currentHeight = nextHeight;
      this.redrawCallback?.();
    }
  }

  public get radius(): number {
    return this.currentRadius;
  }

  public set radius(nextRadius: number) {
    if (this.currentRadius !== nextRadius) {
      this.currentRadius = nextRadius;
      this.redrawCallback?.();
    }
  }

  public get color(): unknown {
    return this.currentColorValue;
  }

  public set color(nextColor: unknown) {
    if (!areColorValuesEqual(this.currentColorValue, nextColor)) {
      this.currentColorValue = nextColor;
      if (this.isTextNode) {
        (this.renderNode as ITextNode).setColor(convertToColorRepresentation(nextColor));
      } else if (this.isSpriteNode) {
        (this.renderNode as ISpriteNode).setTint(convertToColorRepresentation(nextColor));
      } else {
        this.redrawCallback?.();
      }
    }
  }

  public get text(): string {
    return this.currentTextValue;
  }

  public set text(nextText: string) {
    if (this.currentTextValue !== nextText) {
      this.currentTextValue = nextText;
      if (this.isTextNode) {
        (this.renderNode as ITextNode).setText(nextText);
      }
    }
  }

  public get tag(): string | undefined {
    if (this.assignedTag !== undefined) {
      return this.assignedTag;
    }
    const firstIterator = this.tagsSet.values().next();
    return firstIterator.done ? undefined : firstIterator.value;
  }

  public set tag(nextTag: string | undefined) {
    this.assignedTag = nextTag;
    if (typeof nextTag === "string" && nextTag.length > 0) {
      this.tagsSet.add(nextTag);
    }
  }

  public get tags(): string[] {
    return Array.from(this.tagsSet);
  }

  public is(tagName: string): boolean {
    return this.tagsSet.has(tagName);
  }

  public hasTag(tagName: string): boolean {
    return this.tagsSet.has(tagName);
  }

  public exists(): boolean {
    return !this.isNodeDestroyed;
  }

  public setVisible(visible: boolean): void {
    this.hidden = !visible;
  }

  public getPosition(): Vector2D {
    return { x: this.positionX, y: this.positionY };
  }

  public reveal(): void {
    this.revealCallback?.();
  }

  public getRenderNode(): IRenderNode {
    return this.renderNode;
  }

  public registerCleanup(cleanupCallback: () => void): void {
    this.cleanupCallbacks.push(cleanupCallback);
  }

  public onDestroy(destroyCallback: () => void): void {
    if (this.isNodeDestroyed) {
      destroyCallback();
      return;
    }
    this.cleanupCallbacks.push(destroyCallback);
  }

  public onUpdate(updateCallback: (deltaTimeInSeconds: number) => void): () => void {
    if (!this.updateRegistrar) {
      return () => {};
    }
    const unregister = this.updateRegistrar((deltaTimeInSeconds: number) => {
      if (!this.isNodeDestroyed) {
        updateCallback(deltaTimeInSeconds);
      }
    });
    this.cleanupCallbacks.push(unregister);
    return unregister;
  }

  public destroy(): void {
    if (this.isNodeDestroyed) return;
    this.isNodeDestroyed = true;
    for (let index = 0; index < this.cleanupCallbacks.length; index++) {
      this.cleanupCallbacks[index]();
    }
    this.cleanupCallbacks.length = 0;
    try {
      this.renderNode.destroy();
    } catch {
      // Safe destroy guard
    }
  }
}

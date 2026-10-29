/**
 * Adaptadores de Nós de Renderização para PixiJS v8 — Micro Splash
 *
 * Implementação concreta de IRenderNode, ISpriteNode, IGraphicsNode e ITextNode.
 * Encapsula objetos nativos da API PixiJS v8 garantindo isolamento arquitetural.
 */

import { Container, Sprite, Graphics, Text, Texture, Color } from "pixi.js";
import type {
  Vector2D,
  ColorRepresentation,
  GraphicStyle,
  LineStyle,
  TextStyleOptions,
  TextShadowOptions,
  IRenderNode,
  ISpriteNode,
  IGraphicsNode,
  ITextNode,
} from "../contracts/INTERFACE_CONTRACTS";

/**
 * Utilitário de normalização de cor para o modelo interno do PixiJS.
 * Suporta tuplas [red, green, blue], números hexadecimais e strings CSS.
 */
export function parseColor(color: ColorRepresentation): Color {
  if (typeof color === "number" || typeof color === "string") {
    return new Color(color);
  }
  if (Array.isArray(color)) {
    const [red, green, blue] = color;
    if (red > 1 || green > 1 || blue > 1) {
      return new Color([red / 255, green / 255, blue / 255]);
    }
    return new Color([red, green, blue]);
  }
  return new Color(0xffffff);
}

/**
 * Nó base que encapsula a árvore hierárquica do PixiJS Container.
 */
export class PixiContainerNode implements IRenderNode {
  readonly id: string;
  protected readonly container: Container;
  protected readonly childrenList: IRenderNode[] = [];

  constructor(container?: Container, id?: string) {
    this.container = container ?? new Container();
    this.id = id ?? `node_${Math.random().toString(36).slice(2, 9)}`;
  }

  getPosition(): Vector2D {
    return { x: this.container.position.x, y: this.container.position.y };
  }

  setPosition(x: number, y: number): void {
    this.container.position.set(x, y);
  }

  getScale(): Vector2D {
    return { x: this.container.scale.x, y: this.container.scale.y };
  }

  setScale(scaleX: number, scaleY: number): void {
    this.container.scale.set(scaleX, scaleY);
  }

  getRotation(): number {
    return this.container.rotation;
  }

  setRotation(angleInRadians: number): void {
    this.container.rotation = angleInRadians;
  }

  getOpacity(): number {
    return this.container.alpha;
  }

  setOpacity(alpha: number): void {
    this.container.alpha = Math.max(0, Math.min(1, alpha));
  }

  getZIndex(): number {
    return this.container.zIndex;
  }

  setZIndex(index: number): void {
    this.container.zIndex = index;
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  addChild(child: IRenderNode): void {
    const nativeChild = child.getNativeNode<Container>();
    this.container.addChild(nativeChild);
    if (!this.childrenList.includes(child)) {
      this.childrenList.push(child);
    }
  }

  removeChild(child: IRenderNode): void {
    const nativeChild = child.getNativeNode<Container>();
    this.container.removeChild(nativeChild);
    const index = this.childrenList.indexOf(child);
    if (index !== -1) {
      this.childrenList.splice(index, 1);
    }
  }

  getChildren(): readonly IRenderNode[] {
    return [...this.childrenList];
  }

  destroy(): void {
    for (const child of this.childrenList) {
      child.destroy();
    }
    this.childrenList.length = 0;
    this.container.destroy({ children: true });
  }

  getNativeNode<T>(): T {
    return this.container as unknown as T;
  }
}

/**
 * Nó de renderização de sprites e texturas 2D via PixiJS Sprite.
 */
export class PixiSpriteNode extends PixiContainerNode implements ISpriteNode {
  protected readonly sprite: Sprite;
  private textureId: string;
  private tintColor: ColorRepresentation = 0xffffff;

  constructor(sprite: Sprite, textureId: string, id?: string) {
    super(sprite, id);
    this.sprite = sprite;
    this.textureId = textureId;
  }

  getTextureId(): string {
    return this.textureId;
  }

  setTextureId(textureId: string): void {
    this.textureId = textureId;
    try {
      this.sprite.texture = Texture.from(textureId);
    } catch {
      this.sprite.texture = Texture.EMPTY;
    }
  }

  getAnchor(): Vector2D {
    return { x: this.sprite.anchor.x, y: this.sprite.anchor.y };
  }

  setAnchor(anchorX: number, anchorY: number): void {
    this.sprite.anchor.set(anchorX, anchorY);
  }

  getTint(): ColorRepresentation {
    return this.tintColor;
  }

  setTint(tint: ColorRepresentation): void {
    this.tintColor = tint;
    this.sprite.tint = parseColor(tint).toNumber();
  }

  getWidth(): number {
    return this.sprite.width;
  }

  getHeight(): number {
    return this.sprite.height;
  }

  setSize(width: number, height: number): void {
    this.sprite.width = width;
    this.sprite.height = height;
  }
}

/**
 * Nó de desenho vetorial procedural via PixiJS Graphics (v8 API).
 */
export class PixiGraphicsNode extends PixiContainerNode implements IGraphicsNode {
  protected readonly graphics: Graphics;

  constructor(graphics?: Graphics, id?: string) {
    const nativeGraphics = graphics ?? new Graphics();
    super(nativeGraphics, id);
    this.graphics = nativeGraphics;
  }

  clear(): void {
    this.graphics.clear();
  }

  drawRect(x: number, y: number, width: number, height: number, style?: GraphicStyle): void {
    this.graphics.rect(x, y, width, height);
    this.applyStyle(style);
  }

  drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    style?: GraphicStyle
  ): void {
    this.graphics.roundRect(x, y, width, height, radius);
    this.applyStyle(style);
  }

  drawCircle(x: number, y: number, radius: number, style?: GraphicStyle): void {
    this.graphics.circle(x, y, radius);
    this.applyStyle(style);
  }

  drawPolygon(points: readonly Vector2D[], style?: GraphicStyle): void {
    if (points.length < 3) return;
    const flatPoints: number[] = [];
    for (let index = 0; index < points.length; index++) {
      flatPoints.push(points[index].x, points[index].y);
    }
    this.graphics.poly(flatPoints);
    this.applyStyle(style);
  }

  drawLine(points: readonly Vector2D[], style?: LineStyle): void {
    if (points.length < 2) return;
    this.graphics.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) {
      this.graphics.lineTo(points[index].x, points[index].y);
    }
    this.graphics.stroke({
      color: style?.color ? parseColor(style.color) : 0xffffff,
      width: style?.width ?? 1,
      alpha: style?.alpha ?? 1,
      cap: style?.cap ?? "round",
      join: style?.join ?? "round",
    });
  }

  private applyStyle(style?: GraphicStyle): void {
    if (!style) {
      this.graphics.fill({ color: 0xffffff, alpha: 1 });
      return;
    }
    if (style.fill) {
      this.graphics.fill({
        color: parseColor(style.fill.color),
        alpha: style.fill.alpha ?? 1,
      });
    }
    if (style.stroke) {
      this.graphics.stroke({
        color: parseColor(style.stroke.color),
        width: style.stroke.width,
        alpha: style.stroke.alpha ?? 1,
      });
    }
  }
}

/**
 * Nó tipográfico estilizado com suporte a sombreamento de contraste via PixiJS Text (v8 API).
 */
export class PixiTextNode extends PixiContainerNode implements ITextNode {
  protected readonly textNode: Text;
  private currentColor: ColorRepresentation;

  constructor(content: string, style?: TextStyleOptions, id?: string) {
    const initialColor = style?.color ?? 0xffffff;
    const initialFamily = style?.fontFamily ?? "Outfit, Inter, sans-serif";
    const initialSize = style?.fontSize ?? 16;
    const initialAlign = style?.align ?? "left";

    const textStyleConfig: Record<string, unknown> = {
      fontFamily: initialFamily,
      fontSize: initialSize,
      fill: parseColor(initialColor).toNumber(),
      align: initialAlign,
      wordWrap: style?.wordWrapWidth !== undefined,
      wordWrapWidth: style?.wordWrapWidth ?? 100,
    };

    if (style?.lineSpacing !== undefined) {
      textStyleConfig.lineHeight = initialSize + style.lineSpacing;
    }

    if (style?.shadow) {
      const distance = Math.hypot(style.shadow.offsetX, style.shadow.offsetY);
      const angle = Math.atan2(style.shadow.offsetY, style.shadow.offsetX);
      textStyleConfig.dropShadow = {
        color: parseColor(style.shadow.color).toNumber(),
        alpha: style.shadow.alpha ?? 1,
        angle,
        blur: style.shadow.blur ?? 0,
        distance,
      };
    }

    const nativeText = new Text({
      text: content,
      style: textStyleConfig,
    });

    super(nativeText, id);
    this.textNode = nativeText;
    this.currentColor = initialColor;
  }

  getText(): string {
    return this.textNode.text;
  }

  setText(content: string): void {
    this.textNode.text = content;
  }

  getFontFamily(): string {
    return this.textNode.style.fontFamily as string;
  }

  setFontFamily(family: string): void {
    this.textNode.style.fontFamily = family;
  }

  getFontSize(): number {
    return Number(this.textNode.style.fontSize);
  }

  setFontSize(sizeInPixels: number): void {
    this.textNode.style.fontSize = sizeInPixels;
  }

  getColor(): ColorRepresentation {
    return this.currentColor;
  }

  setColor(color: ColorRepresentation): void {
    this.currentColor = color;
    this.textNode.style.fill = parseColor(color).toNumber();
  }

  getAlign(): "left" | "center" | "right" {
    return this.textNode.style.align as "left" | "center" | "right";
  }

  setAlign(alignment: "left" | "center" | "right"): void {
    this.textNode.style.align = alignment;
  }

  setShadow(shadow: TextShadowOptions | null): void {
    if (!shadow) {
      this.textNode.style.dropShadow = false;
      return;
    }
    const distance = Math.hypot(shadow.offsetX, shadow.offsetY);
    const angle = Math.atan2(shadow.offsetY, shadow.offsetX);
    this.textNode.style.dropShadow = {
      color: parseColor(shadow.color).toNumber(),
      alpha: shadow.alpha ?? 1,
      angle,
      blur: shadow.blur ?? 0,
      distance,
    };
  }
}

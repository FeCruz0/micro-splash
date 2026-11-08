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

const colorCache = new Map<string | number, Color>();

/**
 * Utilitário de normalização de cor para o modelo interno do PixiJS.
 * Suporta tuplas [red, green, blue], números hexadecimais e strings CSS.
 * Utiliza cache para prevenir alocações contínuas de instâncias Color no GC.
 */
export function parseColor(color: ColorRepresentation): Color {
  if (typeof color === "number" || typeof color === "string") {
    let cached = colorCache.get(color);
    if (!cached) {
      cached = new Color(color);
      if (colorCache.size < 512) {
        colorCache.set(color, cached);
      }
    }
    return cached;
  }
  if (Array.isArray(color)) {
    const [red, green, blue] = color;
    const cacheKey = `${red},${green},${blue}`;
    let cached = colorCache.get(cacheKey);
    if (!cached) {
      if (red > 1 || green > 1 || blue > 1) {
        cached = new Color([red / 255, green / 255, blue / 255]);
      } else {
        cached = new Color([red, green, blue]);
      }
      if (colorCache.size < 512) {
        colorCache.set(cacheKey, cached);
      }
    }
    return cached;
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
    const target = this.container as unknown as {
      eventMode?: string;
      interactiveChildren?: boolean;
      cullable?: boolean;
    };
    target.eventMode = "none";
    target.interactiveChildren = false;
    target.cullable = true;
  }

  getPosition(): Vector2D {
    return { x: this.container.position.x, y: this.container.position.y };
  }

  setPosition(x: number, y: number): void {
    if (
      Math.abs(this.container.position.x - x) < 0.01 &&
      Math.abs(this.container.position.y - y) < 0.01
    ) {
      return;
    }
    this.container.position.set(x, y);
  }

  getScale(): Vector2D {
    return { x: this.container.scale.x, y: this.container.scale.y };
  }

  setScale(scaleX: number, scaleY: number): void {
    if (
      Math.abs(this.container.scale.x - scaleX) < 0.01 &&
      Math.abs(this.container.scale.y - scaleY) < 0.01
    ) {
      return;
    }
    this.container.scale.set(scaleX, scaleY);
  }

  getRotation(): number {
    return this.container.rotation;
  }

  setRotation(angleInRadians: number): void {
    if (Math.abs(this.container.rotation - angleInRadians) < 0.005) {
      return;
    }
    this.container.rotation = angleInRadians;
  }

  getOpacity(): number {
    return this.container.alpha;
  }

  setOpacity(alpha: number): void {
    const clampedAlpha = Math.max(0, Math.min(1, alpha));
    if (Math.abs(this.container.alpha - clampedAlpha) < 0.005) {
      return;
    }
    this.container.alpha = clampedAlpha;
  }

  getZIndex(): number {
    return this.container.zIndex;
  }

  setZIndex(index: number): void {
    if (this.container.zIndex !== index) {
      this.container.zIndex = index;
      if (this.container.parent) {
        this.container.parent.sortChildren(); // Ordena só no frame que alterar, não eternamente
      }
    }
  }

  isVisible(): boolean {
    return this.container.visible;
  }

  get hidden(): boolean {
    return !this.container.visible;
  }

  set hidden(value: boolean) {
    this.setVisible(!value);
  }

  setVisible(visible: boolean): void {
    if (this.container.visible !== visible) {
      this.container.visible = visible;
      this.container.renderable = visible; // Corta o objeto no WebGL pipeline
    }
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

  removeAllChildren(): void {
    const childrenToDestroy = [...this.childrenList];
    for (let index = 0; index < childrenToDestroy.length; index++) {
      childrenToDestroy[index].destroy();
    }
    this.childrenList.length = 0;
    this.container.removeChildren();
  }

  destroy(): void {
    for (const child of this.childrenList) {
      child.destroy();
    }
    this.childrenList.length = 0;
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }

  freeze(enabled: boolean = true): void {
    const target = this.container as unknown as {
      cacheAsTexture?: (val: boolean) => void;
      cacheAsBitmap?: boolean;
    };
    if (typeof target.cacheAsTexture === "function") {
      target.cacheAsTexture(enabled);
    } else if ("cacheAsBitmap" in target) {
      target.cacheAsBitmap = enabled;
    }
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

  constructor(sprite?: Sprite, textureId?: string, id?: string) {
    const nativeSprite = sprite ?? new Sprite(Texture.EMPTY);
    super(nativeSprite, id);
    this.sprite = nativeSprite;
    this.textureId = textureId ?? "empty";
    this.sprite.blendMode = "normal";
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

  getTexture(): Texture {
    return this.sprite.texture;
  }

  setTexture(texture: Texture): void {
    this.sprite.texture = texture;
  }

  getAnchor(): Vector2D {
    return { x: this.sprite.anchor.x, y: this.sprite.anchor.y };
  }

  setAnchor(anchorX: number, anchorY: number): void {
    if (
      Math.abs(this.sprite.anchor.x - anchorX) > 0.005 ||
      Math.abs(this.sprite.anchor.y - anchorY) > 0.005
    ) {
      this.sprite.anchor.set(anchorX, anchorY);
    }
  }

  getTint(): ColorRepresentation {
    return this.tintColor;
  }

  setTint(tint: ColorRepresentation): void {
    if (this.tintColor === tint) return;
    this.tintColor = tint;
    const parsedColor = parseColor(tint).toNumber();
    if (this.sprite.tint !== parsedColor) {
      this.sprite.tint = parsedColor;
    }
  }

  getWidth(): number {
    return this.sprite.width;
  }

  getHeight(): number {
    return this.sprite.height;
  }

  setSize(width: number, height: number): void {
    if (
      Math.abs(this.sprite.width - width) > 0.01 ||
      Math.abs(this.sprite.height - height) > 0.01
    ) {
      this.sprite.width = width;
      this.sprite.height = height;
    }
  }
}

/**
 * Nó de desenho vetorial procedural via PixiJS Graphics (v8 API).
 */
export class PixiGraphicsNode extends PixiContainerNode implements IGraphicsNode {
  protected readonly graphics: Graphics;
  private static readonly sharedPolygonBuffer: number[] = [];

  constructor(graphics?: Graphics, id?: string) {
    const nativeGraphics = graphics ?? new Graphics();
    super(nativeGraphics, id);
    this.graphics = nativeGraphics;
    this.graphics.blendMode = "normal";
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
    const flatPoints = PixiGraphicsNode.sharedPolygonBuffer;
    flatPoints.length = 0;
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

  get text(): string {
    return this.textNode.text;
  }

  set text(content: string) {
    this.setText(content);
  }

  getText(): string {
    return this.textNode.text;
  }

  setText(content: string): void {
    if (this.textNode.text === content) return;
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
    if (Number(this.textNode.style.fontSize) === sizeInPixels) return;
    this.textNode.style.fontSize = sizeInPixels;
  }

  getColor(): ColorRepresentation {
    return this.currentColor;
  }

  setColor(color: ColorRepresentation): void {
    if (this.currentColor === color) return;
    this.currentColor = color;
    const parsedColor = parseColor(color).toNumber();
    if (this.textNode.style.fill !== parsedColor) {
      this.textNode.style.fill = parsedColor;
    }
  }

  getAlign(): "left" | "center" | "right" {
    return this.textNode.style.align as "left" | "center" | "right";
  }

  setAlign(alignment: "left" | "center" | "right"): void {
    if (this.textNode.style.align === alignment) return;
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

  getAnchor(): Vector2D {
    return { x: this.textNode.anchor.x, y: this.textNode.anchor.y };
  }

  setAnchor(anchorX: number, anchorY: number): void {
    if (
      Math.abs(this.textNode.anchor.x - anchorX) > 0.005 ||
      Math.abs(this.textNode.anchor.y - anchorY) > 0.005
    ) {
      this.textNode.anchor.set(anchorX, anchorY);
    }
  }
}

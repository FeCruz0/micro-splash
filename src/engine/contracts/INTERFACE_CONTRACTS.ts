/**
 * Contratos de Interface Fundacionais da Camada de Renderização — Micro Splash
 *
 * Módulo puro em TypeScript (zero dependências externas de Kaboom ou PixiJS).
 * Estabelece as assinaturas canônicas para o Adapter Pattern (Fase de Migração para PixiJS v8).
 */

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export type ColorRgbTuple = readonly [red: number, green: number, blue: number];
export type ColorRepresentation = ColorRgbTuple | number | string;

export interface GraphicFillStyle {
  readonly color: ColorRepresentation;
  readonly alpha?: number;
}

export interface GraphicStrokeStyle {
  readonly color: ColorRepresentation;
  readonly width: number;
  readonly alpha?: number;
}

export interface GraphicStyle {
  readonly fill?: GraphicFillStyle;
  readonly stroke?: GraphicStrokeStyle;
}

export interface LineStyle {
  readonly color: ColorRepresentation;
  readonly width: number;
  readonly alpha?: number;
  readonly cap?: "butt" | "round" | "square";
  readonly join?: "miter" | "round" | "bevel";
}

export interface TextShadowOptions {
  readonly color: ColorRepresentation;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur?: number;
  readonly alpha?: number;
}

export interface TextStyleOptions {
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly color?: ColorRepresentation;
  readonly align?: "left" | "center" | "right";
  readonly wordWrapWidth?: number;
  readonly lineSpacing?: number;
  readonly shadow?: TextShadowOptions;
}

export interface RenderEngineInitOptions {
  readonly width: number;
  readonly height: number;
  readonly backgroundColor?: ColorRepresentation;
  readonly resolution?: number;
  readonly antialias?: boolean;
  readonly containerElement?: HTMLElement;
  readonly autoDensity?: boolean;
}

/**
 * Nó base de renderização na árvore de cena.
 */
export interface IRenderNode {
  readonly id: string;

  getPosition(): Vector2D;
  setPosition(x: number, y: number): void;

  getScale(): Vector2D;
  setScale(scaleX: number, scaleY: number): void;

  getRotation(): number;
  setRotation(angleInRadians: number): void;

  getOpacity(): number;
  setOpacity(alpha: number): void;

  getZIndex(): number;
  setZIndex(index: number): void;

  isVisible(): boolean;
  setVisible(visible: boolean): void;

  addChild(child: IRenderNode): void;
  removeChild(child: IRenderNode): void;
  getChildren(): readonly IRenderNode[];

  destroy(): void;
  getNativeNode<T>(): T;
}

/**
 * Nó especializado para renderização de sprites e texturas 2D.
 */
export interface ISpriteNode extends IRenderNode {
  getTextureId(): string;
  setTextureId(textureId: string): void;

  getAnchor(): Vector2D;
  setAnchor(anchorX: number, anchorY: number): void;

  getTint(): ColorRepresentation;
  setTint(tint: ColorRepresentation): void;

  getWidth(): number;
  getHeight(): number;
  setSize(width: number, height: number): void;
}

/**
 * Nó especializado para desenho vetorial procedural (linhas, polígonos e primitivas geométricas).
 */
export interface IGraphicsNode extends IRenderNode {
  clear(): void;
  drawRect(x: number, y: number, width: number, height: number, style?: GraphicStyle): void;
  drawRoundedRect(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    style?: GraphicStyle
  ): void;
  drawCircle(x: number, y: number, radius: number, style?: GraphicStyle): void;
  drawPolygon(points: readonly Vector2D[], style?: GraphicStyle): void;
  drawLine(points: readonly Vector2D[], style?: LineStyle): void;
}

/**
 * Nó especializado para renderização tipográfica e texto estilizado com sombra de contraste.
 */
export interface ITextNode extends IRenderNode {
  getText(): string;
  setText(content: string): void;

  getFontFamily(): string;
  setFontFamily(family: string): void;

  getFontSize(): number;
  setFontSize(sizeInPixels: number): void;

  getColor(): ColorRepresentation;
  setColor(color: ColorRepresentation): void;

  getAlign(): "left" | "center" | "right";
  setAlign(alignment: "left" | "center" | "right"): void;

  setShadow(shadow: TextShadowOptions | null): void;
}

/**
 * Controlador de tempo e tick do loop de renderização.
 */
export interface IRenderTicker {
  add(callback: (deltaTimeInSeconds: number) => void): () => void;
  start(): void;
  stop(): void;
  getFPS(): number;
  getDeltaTime(): number;
}

/**
 * Contrato unificado para a Engine de Renderização via Adapter Pattern.
 */
export interface IRenderEngine {
  readonly isInitialized: boolean;

  init(options: RenderEngineInitOptions): Promise<void> | void;
  resize(width: number, height: number): void;
  getDimensions(): { readonly width: number; readonly height: number };
  getCanvas(): HTMLCanvasElement | null;
  getStageRoot(): IRenderNode;
  getTicker(): IRenderTicker;

  createContainer(id?: string): IRenderNode;
  createSprite(textureId: string, id?: string): ISpriteNode;
  createGraphics(id?: string): IGraphicsNode;
  createText(content: string, style?: TextStyleOptions, id?: string): ITextNode;

  destroy(): void;
}

/**
 * Contrato de ciclo de vida de cenas modulares.
 */
export interface IScene {
  readonly name: string;
  enter(data?: unknown): Promise<void> | void;
  update(deltaTimeInSeconds: number): void;
  exit(): Promise<void> | void;
}

/**
 * Gerenciador de Cenas com transições suaves e FSM formal.
 */
export interface ISceneManager {
  getCurrentScene(): IScene | null;
  registerScene(scene: IScene): void;
  loadScene(sceneName: string, transitionData?: unknown): Promise<void>;
  update(deltaTimeInSeconds: number): void;
  destroy(): void;
}

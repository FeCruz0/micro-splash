/**
 * Utilitários de Tipografia & Texto com Sombra de Legibilidade (Fase 32.3) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { FONT_BODY } from "../config";
import type {
  IRenderEngine,
  ITextNode,
  Vector2D,
  ColorRepresentation,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export type TextAnchor =
  "topleft" | "top" | "topright" | "left" | "center" | "right" | "botleft" | "bot" | "botright";

export interface ShadowedTextOptions {
  pos: Vector2D;
  size: number;
  font?: string;
  color?: ColorRepresentation | unknown;
  shadowColor?: ColorRepresentation | unknown;
  shadowOffset?: { x: number; y: number };
  opacity?: number;
  shadowOpacity?: number;
  anchor?: TextAnchor;
  z?: number;
  fixed?: boolean;
  width?: number;
  align?: "left" | "center" | "right";
  lineSpacing?: number;
  tag?: string;
}

export interface ShadowedTextHandle<TObj = LegacyTextRenderObject> {
  main: TObj;
  shadow: TObj;
  setText: (newText: string) => void;
  destroy: () => void;
}

export interface LegacyTextRenderObject {
  text?: string;
}

export interface LegacyShadowedTextContext {
  add(components?: unknown): unknown;
  text(content: string, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  anchor?(anchorPoint: TextAnchor): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  opacity?(alpha: number): unknown;
  z?(zIndex: number): unknown;
  fixed?(): unknown;
  destroy?(target: unknown): void;
}

class PixiTextNodeProxy {
  private readonly textNode: ITextNode;

  constructor(textNode: ITextNode) {
    this.textNode = textNode;
  }

  get text(): string {
    return this.textNode.getText();
  }

  set text(value: string) {
    this.textNode.setText(value);
  }

  getNode(): ITextNode {
    return this.textNode;
  }
}

/**
 * Utilitário de Texto com Sombra de Legibilidade (Fase 32.3).
 * Adiciona um texto principal sobreposto a uma sombra escura sutil (offset 1–2px),
 * garantindo legibilidade perfeita sobre fundos oceânicos dinâmicos ou claros.
 */
export function addShadowedText<
  TEngine extends IRenderEngine | LegacyShadowedTextContext =
    IRenderEngine | LegacyShadowedTextContext,
  TObj = TEngine extends { add(...args: unknown[]): infer R }
    ? unknown extends R
      ? LegacyTextRenderObject
      : R
    : LegacyTextRenderObject,
>(engineOrContext: TEngine, content: string, opts: ShadowedTextOptions): ShadowedTextHandle<TObj> {
  const zBase = opts.z ?? 10;
  const shadowZ = Math.max(0, zBase - 1);
  const offset = opts.shadowOffset ?? { x: 1.5, y: 1.5 };
  const fontName = opts.font ?? FONT_BODY;
  const anchor = opts.anchor ?? "topleft";

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();

    const shadowNode = engineOrContext.createText(
      content,
      {
        fontFamily: fontName,
        fontSize: opts.size,
        color: [6, 16, 36],
        align: opts.align,
        wordWrapWidth: opts.width,
        lineSpacing: opts.lineSpacing,
      },
      "shadowed_text_shadow"
    );
    shadowNode.setPosition(opts.pos.x + offset.x, opts.pos.y + offset.y);
    shadowNode.setOpacity(opts.shadowOpacity ?? 0.75);
    shadowNode.setZIndex(shadowZ);
    stageRoot.addChild(shadowNode);

    const mainNode = engineOrContext.createText(
      content,
      {
        fontFamily: fontName,
        fontSize: opts.size,
        color: [255, 255, 255],
        align: opts.align,
        wordWrapWidth: opts.width,
        lineSpacing: opts.lineSpacing,
      },
      "shadowed_text_main"
    );
    mainNode.setPosition(opts.pos.x, opts.pos.y);
    if (opts.opacity !== undefined) {
      mainNode.setOpacity(opts.opacity);
    }
    mainNode.setZIndex(zBase);
    stageRoot.addChild(mainNode);

    const shadowProxy = new PixiTextNodeProxy(shadowNode);
    const mainProxy = new PixiTextNodeProxy(mainNode);

    return {
      main: mainProxy,
      shadow: shadowProxy,
      setText: (newText: string) => {
        mainNode.setText(newText);
        shadowNode.setText(newText);
      },
      destroy: () => {
        try {
          stageRoot.removeChild(mainNode);
          stageRoot.removeChild(shadowNode);
          mainNode.destroy();
          shadowNode.destroy();
        } catch {}
      },
    } as unknown as ShadowedTextHandle<TObj>;
  }

  // Fallback e interoperabilidade para contexto legado
  const legacyContext = engineOrContext as LegacyShadowedTextContext;

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const shadowColor = opts.shadowColor ?? resolveRgb(6, 16, 36);
  const mainColor = opts.color ?? resolveRgb(255, 255, 255);

  const fixedComponent =
    opts.fixed !== false && typeof legacyContext.fixed === "function"
      ? [legacyContext.fixed()]
      : [];

  const shadowObj = legacyContext.add([
    legacyContext.text(content, {
      size: opts.size,
      font: fontName,
      width: opts.width,
      align: opts.align,
      lineSpacing: opts.lineSpacing,
    }),
    legacyContext.pos(opts.pos.x + offset.x, opts.pos.y + offset.y),
    typeof legacyContext.anchor === "function" ? legacyContext.anchor(anchor) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(shadowColor) : undefined,
    typeof legacyContext.opacity === "function"
      ? legacyContext.opacity(opts.shadowOpacity ?? 0.75)
      : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(shadowZ) : undefined,
    ...fixedComponent,
  ]) as LegacyTextRenderObject;

  const mainObj = legacyContext.add([
    legacyContext.text(content, {
      size: opts.size,
      font: fontName,
      width: opts.width,
      align: opts.align,
      lineSpacing: opts.lineSpacing,
    }),
    legacyContext.pos(opts.pos.x, opts.pos.y),
    typeof legacyContext.anchor === "function" ? legacyContext.anchor(anchor) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(mainColor) : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(zBase) : undefined,
    ...(opts.opacity !== undefined && typeof legacyContext.opacity === "function"
      ? [legacyContext.opacity(opts.opacity)]
      : []),
    ...fixedComponent,
    ...(opts.tag ? [opts.tag] : []),
  ]) as LegacyTextRenderObject;

  return {
    main: mainObj,
    shadow: shadowObj,
    setText: (newText: string) => {
      mainObj.text = newText;
      shadowObj.text = newText;
    },
    destroy: () => {
      try {
        if (typeof legacyContext.destroy === "function") {
          legacyContext.destroy(mainObj);
          legacyContext.destroy(shadowObj);
        }
      } catch {}
    },
  } as unknown as ShadowedTextHandle<TObj>;
}

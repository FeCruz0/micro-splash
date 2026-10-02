import type { KaboomCtx, Vec2, Color, Anchor } from "kaboom";
import { FONT_BODY } from "../config";

export interface ShadowedTextOptions {
  pos: Vec2;
  size: number;
  font?: string;
  color?: Color;
  shadowColor?: Color;
  shadowOffset?: { x: number; y: number };
  opacity?: number;
  shadowOpacity?: number;
  anchor?: Anchor;
  z?: number;
  fixed?: boolean;
  width?: number;
  align?: "left" | "center" | "right";
  lineSpacing?: number;
  tag?: string;
}

export interface ShadowedTextHandle {
  main: any;
  shadow: any;
  setText: (newText: string) => void;
  destroy: () => void;
}

/**
 * Utilitário de Texto com Sombra de Legibilidade (Fase 32.3).
 * Adiciona um texto principal sobreposto a uma sombra escura sutil (offset 1–2px),
 * garantindo legibilidade perfeita sobre fundos oceânicos dinâmicos ou claros.
 */
export function addShadowedText(
  k: KaboomCtx,
  content: string,
  opts: ShadowedTextOptions
): ShadowedTextHandle {
  const zBase = opts.z ?? 10;
  const shadowZ = Math.max(0, zBase - 1);
  const offset = opts.shadowOffset ?? { x: 1.5, y: 1.5 };
  const shadowColor = opts.shadowColor ?? k.rgb(6, 16, 36);
  const mainColor = opts.color ?? k.rgb(255, 255, 255);
  const fontName = opts.font ?? FONT_BODY;
  const anchor = opts.anchor ?? "topleft";

  const shadowComponents: any[] = [
    k.text(content, {
      size: opts.size,
      font: fontName,
      width: opts.width,
      align: opts.align,
      lineSpacing: opts.lineSpacing,
    }),
    k.pos(opts.pos.x + offset.x, opts.pos.y + offset.y),
    k.anchor(anchor),
    k.color(shadowColor),
    k.opacity(opts.shadowOpacity ?? 0.75),
    k.z(shadowZ),
  ];

  if (opts.fixed !== false) {
    shadowComponents.push(k.fixed());
  }

  const shadowObj = k.add(shadowComponents);

  const mainComponents: any[] = [
    k.text(content, {
      size: opts.size,
      font: fontName,
      width: opts.width,
      align: opts.align,
      lineSpacing: opts.lineSpacing,
    }),
    k.pos(opts.pos.x, opts.pos.y),
    k.anchor(anchor),
    k.color(mainColor),
    k.z(zBase),
  ];

  if (opts.opacity !== undefined) {
    mainComponents.push(k.opacity(opts.opacity));
  }

  if (opts.fixed !== false) {
    mainComponents.push(k.fixed());
  }

  if (opts.tag) {
    mainComponents.push(opts.tag);
  }

  const mainObj = k.add(mainComponents);

  return {
    main: mainObj,
    shadow: shadowObj,
    setText: (newText: string) => {
      mainObj.text = newText;
      shadowObj.text = newText;
    },
    destroy: () => {
      try {
        k.destroy(mainObj);
        k.destroy(shadowObj);
      } catch {}
    },
  };
}

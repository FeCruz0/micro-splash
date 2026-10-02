import type { KaboomCtx, Vec2 } from "kaboom";
import { FONT_TITLE, TEXT_SIZE_CAPTION } from "../config";

export interface KeyBadgeOptions {
  pos: Vec2;
  keyLabel: string;
  z?: number;
  fontSize?: number;
  minWidth?: number;
  fixed?: boolean;
}

export interface KeyBadgeHandle {
  elements: any[];
  width: number;
  height: number;
  destroy: () => void;
}

/**
 * Cria a representação visual de uma tecla física mecânica de controle (Fase 32.8).
 * Renderiza chanfro 3D, contorno e texto centralizado de tecla, substituindo
 * instruções textuais genéricas por identificadores visuais táteis reconhecíveis.
 */
export function createKeyBadge(k: KaboomCtx, opts: KeyBadgeOptions): KeyBadgeHandle {
  const elements: any[] = [];
  const z = opts.z ?? 100;
  const fontSize = opts.fontSize ?? TEXT_SIZE_CAPTION + 1; // ~12px
  const isFixed = opts.fixed !== false;

  // Calcula largura adaptativa da tecla baseada no comprimento do texto
  const textLen = opts.keyLabel.length;
  const paddingX = 14;
  const calculatedW = Math.max(opts.minWidth ?? 26, textLen * 8.5 + paddingX);
  const badgeH = 22;

  // 1. Sombra / Chanfro inferior 3D da tecla mecânica
  const baseShadow = k.add([
    k.rect(calculatedW, badgeH, { radius: 5 }),
    k.pos(opts.pos.x, opts.pos.y + 2),
    k.anchor("center"),
    k.color(8, 18, 36),
    k.opacity(0.9),
    k.z(z - 1),
    ...(isFixed ? [k.fixed()] : []),
  ]);
  elements.push(baseShadow);

  // 2. Face superior da tecla
  const keyCap = k.add([
    k.rect(calculatedW, badgeH, { radius: 4 }),
    k.pos(opts.pos.x, opts.pos.y),
    k.anchor("center"),
    k.color(24, 46, 78),
    k.outline(1.5, k.rgb(70, 150, 220)),
    k.z(z),
    ...(isFixed ? [k.fixed()] : []),
  ]);
  elements.push(keyCap);

  // 3. Rótulo centralizado com leve brilho
  const keyText = k.add([
    k.text(opts.keyLabel, {
      size: fontSize,
      font: FONT_TITLE,
    }),
    k.pos(opts.pos.x, opts.pos.y),
    k.anchor("center"),
    k.color(230, 248, 255),
    k.z(z + 1),
    ...(isFixed ? [k.fixed()] : []),
  ]);
  elements.push(keyText);

  return {
    elements,
    width: calculatedW,
    height: badgeH + 2,
    destroy: () => {
      elements.forEach((el) => {
        try {
          k.destroy(el);
        } catch {}
      });
    },
  };
}

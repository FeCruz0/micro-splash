/**
 * Componente Visual de Tecla Física de Controle (Fase 32.8) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { FONT_TITLE, TEXT_SIZE_CAPTION } from "../config";
import type { IRenderEngine, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface KeyBadgeOptions {
  pos: Vector2D;
  keyLabel: string;
  z?: number;
  fontSize?: number;
  minWidth?: number;
  fixed?: boolean;
}

export interface KeyBadgeHandle<TElement = unknown> {
  elements: TElement[];
  width: number;
  height: number;
  destroy: () => void;
}

export interface LegacyKeyBadgeEngine {
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  text(content: string, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  z?(zIndex: number): unknown;
  fixed?(): unknown;
  destroy?(element: unknown): void;
}

/**
 * Cria a representação visual de uma tecla física mecânica de controle (Fase 32.8).
 * Renderiza chanfro 3D, contorno e texto centralizado de tecla, substituindo
 * instruções textuais genéricas por identificadores visuais táteis reconhecíveis.
 */
export function createKeyBadge(
  engineOrContext: IRenderEngine | LegacyKeyBadgeEngine,
  opts: KeyBadgeOptions
): KeyBadgeHandle {
  const z = opts.z ?? 100;
  const fontSize = opts.fontSize ?? TEXT_SIZE_CAPTION + 1; // ~12px
  const isFixed = opts.fixed !== false;

  // Calcula largura adaptativa da tecla baseada no comprimento do texto
  const textLength = opts.keyLabel.length;
  const paddingHorizontal = 14;
  const calculatedWidth = Math.max(opts.minWidth ?? 26, textLength * 8.5 + paddingHorizontal);
  const badgeHeight = 22;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();

    // 1. Sombra / Chanfro inferior 3D da tecla
    const baseShadow = engineOrContext.createGraphics("key_badge_shadow");
    baseShadow.drawRoundedRect(
      opts.pos.x - calculatedWidth / 2,
      opts.pos.y + 2 - badgeHeight / 2,
      calculatedWidth,
      badgeHeight,
      5,
      { fill: { color: [8, 18, 36], alpha: 0.9 } }
    );
    baseShadow.setZIndex(z - 1);
    stageRoot.addChild(baseShadow);

    // 2. Face superior da tecla
    const keyCap = engineOrContext.createGraphics("key_badge_cap");
    keyCap.drawRoundedRect(
      opts.pos.x - calculatedWidth / 2,
      opts.pos.y - badgeHeight / 2,
      calculatedWidth,
      badgeHeight,
      4,
      {
        fill: { color: [24, 46, 78], alpha: 1 },
        stroke: { width: 1.5, color: [70, 150, 220], alpha: 1 },
      }
    );
    keyCap.setZIndex(z);
    stageRoot.addChild(keyCap);

    // 3. Rótulo centralizado
    const keyText = engineOrContext.createText(
      opts.keyLabel,
      {
        fontFamily: FONT_TITLE,
        fontSize,
        color: [230, 248, 255],
        align: "center",
      },
      "key_badge_text"
    );
    keyText.setPosition(opts.pos.x, opts.pos.y);
    keyText.setZIndex(z + 1);
    stageRoot.addChild(keyText);

    const elements = [baseShadow, keyCap, keyText];

    return {
      elements,
      width: calculatedWidth,
      height: badgeHeight + 2,
      destroy: () => {
        elements.forEach((element) => {
          try {
            stageRoot.removeChild(element);
            element.destroy();
          } catch {}
        });
      },
    };
  }

  // Fallback e interoperabilidade para contexto legado
  const elements: unknown[] = [];

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof engineOrContext.rgb === "function") {
      return engineOrContext.rgb(red, green, blue);
    }
    return engineOrContext.color(red, green, blue);
  };

  const fixedComponent =
    isFixed && typeof engineOrContext.fixed === "function" ? [engineOrContext.fixed()] : [];

  // 1. Sombra / Chanfro inferior 3D da tecla mecânica
  const baseShadow = engineOrContext.add([
    engineOrContext.rect(calculatedWidth, badgeHeight, { radius: 5 }),
    engineOrContext.pos(opts.pos.x, opts.pos.y + 2),
    typeof engineOrContext.anchor === "function"
      ? engineOrContext.anchor("center")
      : { anchor: "center" },
    engineOrContext.color(8, 18, 36),
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.9) : { opacity: 0.9 },
    typeof engineOrContext.z === "function" ? engineOrContext.z(z - 1) : { z: z - 1 },
    ...fixedComponent,
  ]);
  elements.push(baseShadow);

  // 2. Face superior da tecla
  const outlineComponent =
    typeof engineOrContext.outline === "function"
      ? [engineOrContext.outline(1.5, resolveRgb(70, 150, 220))]
      : [];

  const keyCap = engineOrContext.add([
    engineOrContext.rect(calculatedWidth, badgeHeight, { radius: 4 }),
    engineOrContext.pos(opts.pos.x, opts.pos.y),
    typeof engineOrContext.anchor === "function"
      ? engineOrContext.anchor("center")
      : { anchor: "center" },
    engineOrContext.color(24, 46, 78),
    ...outlineComponent,
    typeof engineOrContext.z === "function" ? engineOrContext.z(z) : { z },
    ...fixedComponent,
  ]);
  elements.push(keyCap);

  // 3. Rótulo centralizado com leve brilho
  const keyText = engineOrContext.add([
    engineOrContext.text(opts.keyLabel, {
      size: fontSize,
      font: FONT_TITLE,
    }),
    engineOrContext.pos(opts.pos.x, opts.pos.y),
    typeof engineOrContext.anchor === "function"
      ? engineOrContext.anchor("center")
      : { anchor: "center" },
    engineOrContext.color(230, 248, 255),
    typeof engineOrContext.z === "function" ? engineOrContext.z(z + 1) : { z: z + 1 },
    ...fixedComponent,
  ]);
  elements.push(keyText);

  return {
    elements,
    width: calculatedWidth,
    height: badgeHeight + 2,
    destroy: () => {
      elements.forEach((element) => {
        try {
          if (typeof engineOrContext.destroy === "function") {
            engineOrContext.destroy(element);
          }
        } catch {}
      });
    },
  };
}

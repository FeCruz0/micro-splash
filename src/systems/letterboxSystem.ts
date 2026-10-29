/**
 * Sistema de Barras Protetoras de Letterbox (Fase 33.4) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { getSavedDisplayMode, getSavedLetterboxColor, type LetterboxColor } from "../config";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine, type LegacyEngineBridge } from "../engine/adapters/LegacyBridge";

export interface LetterboxHandle {
  update: () => void;
  setColor: (color: LetterboxColor) => void;
  destroy: () => void;
}

interface LetterboxBorderElement {
  color?: unknown;
  pos: { x: number; y: number };
  destroy?: () => void;
}

/**
 * Sistema de Barras Protetoras de Letterbox (Fase 33.4).
 * Renderiza barras opacas nas margens com z: 999 cobrindo qualquer overflow de conteúdo
 * quando a tela estiver em modo letterbox, com suporte a cores preto (#000000) ou azul oceânico (#06122a).
 */
export function setupLetterboxBorders(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): LetterboxHandle {
  const displayMode = getSavedDisplayMode();
  if (displayMode !== "letterbox") {
    return {
      update: () => {},
      setColor: () => {},
      destroy: () => {},
    };
  }

  let currentColor = getSavedLetterboxColor();
  const borderThickness = 120;

  // Sincroniza cor de fundo do body e canvas no DOM
  if (typeof document !== "undefined") {
    const hex = currentColor === "ocean" ? "#06122a" : "#000000";
    if (document.body) {
      document.body.style.backgroundColor = hex;
    }
  }

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const { width: screenW, height: screenH } = engineOrContext.getDimensions();

    const getPixiColor = (c: LetterboxColor): readonly [number, number, number] =>
      c === "ocean" ? [6, 18, 42] : [0, 0, 0];

    const topBar = engineOrContext.createGraphics("letterbox_border_top");
    const bottomBar = engineOrContext.createGraphics("letterbox_border_bottom");
    const leftBar = engineOrContext.createGraphics("letterbox_border_left");
    const rightBar = engineOrContext.createGraphics("letterbox_border_right");

    const bars: IGraphicsNode[] = [topBar, bottomBar, leftBar, rightBar];
    bars.forEach((bar) => {
      bar.setZIndex(999);
      stageRoot.addChild(bar);
    });

    const redrawBars = (color: LetterboxColor, curW: number, curH: number) => {
      const col = getPixiColor(color);

      topBar.clear();
      topBar.drawRect(0, 0, curW + borderThickness * 4, borderThickness, {
        fill: { color: col, alpha: 1 },
      });
      topBar.setPosition(-borderThickness * 2, -borderThickness);

      bottomBar.clear();
      bottomBar.drawRect(0, 0, curW + borderThickness * 4, borderThickness, {
        fill: { color: col, alpha: 1 },
      });
      bottomBar.setPosition(-borderThickness * 2, curH);

      leftBar.clear();
      leftBar.drawRect(0, 0, borderThickness, curH + borderThickness * 4, {
        fill: { color: col, alpha: 1 },
      });
      leftBar.setPosition(-borderThickness, -borderThickness * 2);

      rightBar.clear();
      rightBar.drawRect(0, 0, borderThickness, curH + borderThickness * 4, {
        fill: { color: col, alpha: 1 },
      });
      rightBar.setPosition(curW, -borderThickness * 2);
    };

    redrawBars(currentColor, screenW, screenH);

    return {
      update: () => {
        const { width: w, height: h } = engineOrContext.getDimensions();
        redrawBars(currentColor, w, h);
      },
      setColor: (color: LetterboxColor) => {
        currentColor = color;
        const { width: w, height: h } = engineOrContext.getDimensions();
        redrawBars(color, w, h);
        if (typeof document !== "undefined" && document.body) {
          document.body.style.backgroundColor = color === "ocean" ? "#06122a" : "#000000";
        }
      },
      destroy: () => {
        bars.forEach((bar) => bar.destroy());
      },
    };
  }

  // Modo Legacy Kaboom Bridge
  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    rect(w: number, h: number): unknown;
    pos(x: number, y: number): unknown;
    color(c: unknown): unknown;
    rgb(r: number, g: number, b: number): unknown;
    fixed(): unknown;
    z(layer: number): unknown;
    width(): number;
    height(): number;
    destroy(obj: unknown): void;
  };

  const getRgbColor = (c: LetterboxColor) =>
    typeof legacyCtx.rgb === "function"
      ? legacyCtx.rgb(c === "ocean" ? 6 : 0, c === "ocean" ? 18 : 0, c === "ocean" ? 42 : 0)
      : c === "ocean"
        ? [6, 18, 42]
        : [0, 0, 0];

  const elements: LetterboxBorderElement[] = [];

  // Barra Superior
  const topBar = legacyCtx.add([
    legacyCtx.rect(legacyCtx.width() + borderThickness * 4, borderThickness),
    legacyCtx.pos(-borderThickness * 2, -borderThickness),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(topBar);

  // Barra Inferior
  const bottomBar = legacyCtx.add([
    legacyCtx.rect(legacyCtx.width() + borderThickness * 4, borderThickness),
    legacyCtx.pos(-borderThickness * 2, legacyCtx.height()),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(bottomBar);

  // Barra Esquerda
  const leftBar = legacyCtx.add([
    legacyCtx.rect(borderThickness, legacyCtx.height() + borderThickness * 4),
    legacyCtx.pos(-borderThickness, -borderThickness * 2),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(leftBar);

  // Barra Direita
  const rightBar = legacyCtx.add([
    legacyCtx.rect(borderThickness, legacyCtx.height() + borderThickness * 4),
    legacyCtx.pos(legacyCtx.width(), -borderThickness * 2),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(rightBar);

  const applyColor = (color: LetterboxColor) => {
    currentColor = color;
    const rgb = getRgbColor(color);
    elements.forEach((el) => {
      try {
        el.color = rgb;
      } catch {}
    });
    if (typeof document !== "undefined" && document.body) {
      document.body.style.backgroundColor = color === "ocean" ? "#06122a" : "#000000";
    }
  };

  return {
    update: () => {
      bottomBar.pos.y = legacyCtx.height();
      rightBar.pos.x = legacyCtx.width();
    },
    setColor: applyColor,
    destroy: () => {
      elements.forEach((el) => {
        try {
          if (typeof el.destroy === "function") {
            el.destroy();
          } else if (typeof legacyCtx.destroy === "function") {
            legacyCtx.destroy(el);
          }
        } catch {}
      });
    },
  };
}

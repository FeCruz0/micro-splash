/**
 * Sistema de Barras Protetoras de Letterbox — Micro Splash
 *
 * Mantém a renderização de letterbox restrita à aplicação de Graphics no screenContainer,
 * com fallback estrutural para a ponte legada durante a transição de testes.
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
 * Sistema de Barras Protetoras de Letterbox.
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
  if (typeof document !== "undefined" && document.body) {
    const backgroundHex = currentColor === "ocean" ? "#06122a" : "#000000";
    document.body.style.backgroundColor = backgroundHex;
  }

  if (isRenderEngine(engineOrContext)) {
    const targetContainer =
      typeof engineOrContext.getScreenContainer === "function"
        ? engineOrContext.getScreenContainer()
        : engineOrContext.getStageRoot();

    const { width: currentScreenWidth, height: currentScreenHeight } =
      engineOrContext.getDimensions();

    const getPixiColor = (color: LetterboxColor): readonly [number, number, number] =>
      color === "ocean" ? [6, 18, 42] : [0, 0, 0];

    const topBar = engineOrContext.createGraphics("letterbox_border_top");
    const bottomBar = engineOrContext.createGraphics("letterbox_border_bottom");
    const leftBar = engineOrContext.createGraphics("letterbox_border_left");
    const rightBar = engineOrContext.createGraphics("letterbox_border_right");

    const bars: IGraphicsNode[] = [topBar, bottomBar, leftBar, rightBar];
    bars.forEach((bar) => {
      bar.setZIndex(999);
      targetContainer.addChild(bar);
    });

    const redrawBars = (
      color: LetterboxColor,
      screenWidth: number,
      screenHeight: number
    ): void => {
      const colorTuple = getPixiColor(color);

      topBar.clear();
      topBar.drawRect(0, 0, screenWidth + borderThickness * 4, borderThickness, {
        fill: { color: colorTuple, alpha: 1 },
      });
      topBar.setPosition(-borderThickness * 2, -borderThickness);

      bottomBar.clear();
      bottomBar.drawRect(0, 0, screenWidth + borderThickness * 4, borderThickness, {
        fill: { color: colorTuple, alpha: 1 },
      });
      bottomBar.setPosition(-borderThickness * 2, screenHeight);

      leftBar.clear();
      leftBar.drawRect(0, 0, borderThickness, screenHeight + borderThickness * 4, {
        fill: { color: colorTuple, alpha: 1 },
      });
      leftBar.setPosition(-borderThickness, -borderThickness * 2);

      rightBar.clear();
      rightBar.drawRect(0, 0, borderThickness, screenHeight + borderThickness * 4, {
        fill: { color: colorTuple, alpha: 1 },
      });
      rightBar.setPosition(screenWidth, -borderThickness * 2);
    };

    redrawBars(currentColor, currentScreenWidth, currentScreenHeight);

    return {
      update: () => {
        const { width: updatedWidth, height: updatedHeight } = engineOrContext.getDimensions();
        redrawBars(currentColor, updatedWidth, updatedHeight);
      },
      setColor: (color: LetterboxColor) => {
        currentColor = color;
        const { width: updatedWidth, height: updatedHeight } = engineOrContext.getDimensions();
        redrawBars(color, updatedWidth, updatedHeight);
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
    rect(width: number, height: number): unknown;
    pos(x: number, y: number): unknown;
    color(colorValue: unknown): unknown;
    rgb(red: number, green: number, blue: number): unknown;
    fixed(): unknown;
    z(layer: number): unknown;
    width(): number;
    height(): number;
    destroy(targetObject: unknown): void;
  };

  const getRgbColor = (color: LetterboxColor) =>
    typeof legacyCtx.rgb === "function"
      ? legacyCtx.rgb(
          color === "ocean" ? 6 : 0,
          color === "ocean" ? 18 : 0,
          color === "ocean" ? 42 : 0
        )
      : color === "ocean"
        ? [6, 18, 42]
        : [0, 0, 0];

  const elements: LetterboxBorderElement[] = [];

  const topBar = legacyCtx.add([
    legacyCtx.rect(legacyCtx.width() + borderThickness * 4, borderThickness),
    legacyCtx.pos(-borderThickness * 2, -borderThickness),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(topBar);

  const bottomBar = legacyCtx.add([
    legacyCtx.rect(legacyCtx.width() + borderThickness * 4, borderThickness),
    legacyCtx.pos(-borderThickness * 2, legacyCtx.height()),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(bottomBar);

  const leftBar = legacyCtx.add([
    legacyCtx.rect(borderThickness, legacyCtx.height() + borderThickness * 4),
    legacyCtx.pos(-borderThickness, -borderThickness * 2),
    legacyCtx.color(getRgbColor(currentColor)),
    typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
    legacyCtx.z(999),
    "letterbox_border",
  ]) as LetterboxBorderElement;
  elements.push(leftBar);

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
    elements.forEach((element) => {
      try {
        element.color = rgb;
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
      elements.forEach((element) => {
        try {
          if (typeof element.destroy === "function") {
            element.destroy();
          } else if (typeof legacyCtx.destroy === "function") {
            legacyCtx.destroy(element);
          }
        } catch {}
      });
    },
  };
}

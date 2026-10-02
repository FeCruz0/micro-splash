import type { KaboomCtx } from "kaboom";
import { getSavedDisplayMode, getSavedLetterboxColor, type LetterboxColor } from "../config";

export interface LetterboxHandle {
  update: () => void;
  setColor: (color: LetterboxColor) => void;
  destroy: () => void;
}

/**
 * Sistema de Barras Protetoras de Letterbox (Fase 33.4).
 * Renderiza barras opacas nas margens com z: 999 cobrindo qualquer overflow de conteúdo
 * quando a tela estiver em modo letterbox, com suporte a cores preto (#000000) ou azul oceânico (#06122a).
 */
export function setupLetterboxBorders(k: KaboomCtx): LetterboxHandle {
  const displayMode = getSavedDisplayMode();
  if (displayMode !== "letterbox") {
    return {
      update: () => {},
      setColor: () => {},
      destroy: () => {},
    };
  }

  let currentColor = getSavedLetterboxColor();
  const getRgbColor = (c: LetterboxColor) => (c === "ocean" ? k.rgb(6, 18, 42) : k.rgb(0, 0, 0));

  // Sincroniza cor de fundo do body e canvas no DOM
  if (typeof document !== "undefined") {
    const hex = currentColor === "ocean" ? "#06122a" : "#000000";
    if (document.body) {
      document.body.style.backgroundColor = hex;
    }
  }

  const elements: any[] = [];
  const borderThickness = 120; // Espessura generosa para cobrir qualquer overflow

  // Barra Superior
  const topBar = k.add([
    k.rect(k.width() + borderThickness * 4, borderThickness),
    k.pos(-borderThickness * 2, -borderThickness),
    k.color(getRgbColor(currentColor)),
    k.fixed(),
    k.z(999),
    "letterbox_border",
  ]);
  elements.push(topBar);

  // Barra Inferior
  const bottomBar = k.add([
    k.rect(k.width() + borderThickness * 4, borderThickness),
    k.pos(-borderThickness * 2, k.height()),
    k.color(getRgbColor(currentColor)),
    k.fixed(),
    k.z(999),
    "letterbox_border",
  ]);
  elements.push(bottomBar);

  // Barra Esquerda
  const leftBar = k.add([
    k.rect(borderThickness, k.height() + borderThickness * 4),
    k.pos(-borderThickness, -borderThickness * 2),
    k.color(getRgbColor(currentColor)),
    k.fixed(),
    k.z(999),
    "letterbox_border",
  ]);
  elements.push(leftBar);

  // Barra Direita
  const rightBar = k.add([
    k.rect(borderThickness, k.height() + borderThickness * 4),
    k.pos(k.width(), -borderThickness * 2),
    k.color(getRgbColor(currentColor)),
    k.fixed(),
    k.z(999),
    "letterbox_border",
  ]);
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
      // Reposiciona caso haja resize dinâmico do viewport
      bottomBar.pos.y = k.height();
      rightBar.pos.x = k.width();
    },
    setColor: applyColor,
    destroy: () => {
      elements.forEach((el) => {
        try {
          k.destroy(el);
        } catch {}
      });
    },
  };
}

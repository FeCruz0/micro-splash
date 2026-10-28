/**
 * Design System Oceânico & Tokens Semânticos de UI — Micro Splash
 * Fase 64: Camada Fundacional de UI, Paleta Tipada e Dimensionamento Canônico
 */

export const UI_COLORS = {
  background: [4, 14, 32] as const,
  backdrop: [4, 14, 32] as const,
  backdropOpacity: 0.95,
  panel: [10, 28, 56] as const,
  panelSurface: [14, 36, 72] as const,
  panelDeep: [8, 22, 46] as const,
  panelHeader: [18, 48, 95] as const,

  border: [56, 189, 248] as const,
  borderSubtle: [45, 75, 115] as const,
  borderGold: [250, 204, 21] as const,

  textPrimary: [255, 255, 255] as const,
  textSecondary: [180, 225, 255] as const,
  textMuted: [140, 175, 215] as const,
  textGold: [255, 225, 100] as const,

  modes: {
    serene: {
      accent: [52, 211, 153] as const,
      text: [140, 255, 200] as const,
      surface: [16, 50, 40] as const,
    },
    difficult: {
      accent: [244, 63, 94] as const,
      text: [255, 120, 140] as const,
      surface: [45, 20, 30] as const,
    },
    quick: {
      accent: [249, 115, 22] as const,
      text: [255, 190, 110] as const,
      surface: [45, 26, 14] as const,
    },
  },

  button: {
    primary: {
      base: [200, 95, 15] as const,
      hover: [230, 120, 25] as const,
      outline: [255, 210, 100] as const,
    },
    secondary: {
      base: [20, 80, 140] as const,
      hover: [28, 110, 185] as const,
      outline: [56, 189, 248] as const,
    },
    danger: {
      base: [180, 50, 50] as const,
      hover: [210, 60, 60] as const,
      outline: [244, 63, 94] as const,
    },
    tabActive: {
      base: [20, 100, 165] as const,
      outline: [56, 189, 248] as const,
      text: [255, 255, 255] as const,
    },
    tabInactive: {
      base: [14, 32, 60] as const,
      outline: [45, 75, 115] as const,
      text: [175, 205, 235] as const,
    },
  },
} as const;

export const UI_RADII = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const UI_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  modalMargin: 24,
  cardPadding: 24,
} as const;

export const UI_Z_INDEX = {
  backdrop: 300,
  modalCard: 301,
  modalContent: 302,
  modalControls: 303,
  modalForeground: 304,
  modalOverlay: 305,
  modalCloseBtn: 306,
  focusRing: 315,
} as const;

export type ModalVariant = "standard" | "compact" | "tall";

export interface ModalDimensions {
  cardW: number;
  cardH: number;
  cX: number;
  cY: number;
  contentW: number;
  top: number;
  bottom: number;
}

/**
 * Calcula dimensões e coordenadas de ancoragem de modais para manter consistência responsiva
 * em qualquer resolução (4K, 1440p, 1080p, 720p ou totens compactos).
 */
export function getModalDimensions(
  screenW: number,
  screenH: number,
  variant: ModalVariant = "standard"
): ModalDimensions {
  const maxW = variant === "compact" ? 840 : 1000;
  const maxH = variant === "compact" ? 520 : variant === "tall" ? 660 : 580;

  const cardW = Math.min(maxW, screenW - 24);
  const cardH = Math.min(maxH, screenH - 20);
  const cX = screenW / 2;
  const cY = screenH / 2;

  return {
    cardW,
    cardH,
    cX,
    cY,
    contentW: cardW - 48,
    top: cY - cardH / 2,
    bottom: cY + cardH / 2,
  };
}

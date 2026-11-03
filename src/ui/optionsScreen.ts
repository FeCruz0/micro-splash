import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem, type LegacyKeyboardNavContext } from "./keyboardNav";
import { i18n } from "../i18n/i18n";
import {
  type ResolutionKey,
  getSavedResolution,
  getSavedDisplayMode,
  type DisplayMode,
  getSavedLetterboxColor,
  type LetterboxColor,
} from "../config";
import {
  animateModalEntrance,
  createResolutionTransitionOverlay,
  type AnimationEngineContext,
} from "./animationUtils";
import type { LegacyOptionsEngineContext, OptionsScreenContext } from "./options/optionsTypes";
import { renderAudioOptions } from "./options/audioOptionsTab";
import { renderAccessibilityOptions } from "./options/accessibilityOptionsTab";
import { renderControlsOptions, renderControlsGuide } from "./options/controlsOptionsTab";
import { renderGraphicsOptions, renderKioskActionButtons } from "./options/kioskOptionsTab";
import { renderOptionsHeader, renderColumnTitles } from "./options/optionsNavigation";

export interface ShowOptionsEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export function showOptionsScreen(k: ShowOptionsEngineContext, onBack: () => void) {
  const engine = k as unknown as LegacyOptionsEngineContext;
  audioSystem.playUiClick();

  const elements: Array<{ destroy?: () => void } | object> = [];
  let isClosed = false;
  let isModalOpen = false;

  const initialRes = getSavedResolution();
  let currentResKey: ResolutionKey = initialRes.key;

  const initialDisplayMode = getSavedDisplayMode();
  let currentDisplayMode: DisplayMode = initialDisplayMode;

  const initialLetterboxColor = getSavedLetterboxColor();
  let currentLetterboxColor: LetterboxColor = initialLetterboxColor;

  const initialFontScale = accessibilitySystem.getFontScaleKey();
  const initialLocale = i18n.getLocale();

  // Fundo escuro semitransparente (absorve cliques e bloqueia o menu)
  const backdrop = engine.add([
    engine.rect(engine.width(), engine.height()),
    engine.pos(0, 0),
    engine.color(6, 16, 36),
    engine.opacity(0.95),
    engine.area(),
    engine.fixed(),
    engine.z(300),
  ]);
  elements.push(backdrop);

  // Card do Modal de Opções com geometria ampla e adaptativa
  const cardW = Math.min(1000, engine.width() - 24);
  const cardH = Math.min(650, engine.height() - 20);
  const cX = engine.width() / 2;
  const cY = engine.height() / 2;
  const cardTop = cY - cardH / 2;

  const focusItems: FocusableItem[] = [];
  let focusGroup: { destroy: () => void } | null = null;

  const close = () => {
    if (isClosed || isModalOpen) return;
    isClosed = true;
    audioSystem.playUiClick();
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        engine.destroy(el);
      } catch {}
    });
    if (
      (currentResKey !== initialRes.key ||
        currentDisplayMode !== initialDisplayMode ||
        currentLetterboxColor !== initialLetterboxColor ||
        accessibilitySystem.getFontScaleKey() !== initialFontScale ||
        i18n.getLocale() !== initialLocale) &&
      typeof window !== "undefined"
    ) {
      createResolutionTransitionOverlay(engine as unknown as AnimationEngineContext, () => {
        window.location.reload();
      });
      return;
    }
    onBack();
  };

  const { card, closeBtnFocusItem } = renderOptionsHeader(
    engine,
    cX,
    cardTop,
    cardW,
    cardH,
    elements,
    close,
    () => !isClosed && !isModalOpen
  );
  animateModalEntrance(engine as unknown as AnimationEngineContext, card);
  focusItems.push(closeBtnFocusItem);

  // Fechar com ESC
  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed || isModalOpen) return;
    if (e.key === "Escape") {
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }

  // --- ESTRUTURA EM 2 COLUNAS HARMONIOSAS ---
  const colGap = 20;
  const colW = (cardW - 56 - colGap) / 2;
  const col0X = cX - colW / 2 - colGap / 2;
  const col1X = cX + colW / 2 + colGap / 2;
  const headerY = cardTop + 88;

  renderColumnTitles(engine, col0X, col1X, headerY, elements);

  const rowStartY = cardTop + 124;
  const btnH = 41;
  const rowGap = 10;

  // Dica informativa de reload ao salvar
  const reloadHintY = cardTop + 424;
  const resHintText = engine.add([
    engine.text("", {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    engine.pos(cX, reloadHintY),
    engine.color(255, 220, 100),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(303),
  ]);
  elements.push(resHintText);

  const updateReloadHint = () => {
    if (
      currentResKey !== initialRes.key ||
      currentDisplayMode !== initialDisplayMode ||
      currentLetterboxColor !== initialLetterboxColor ||
      accessibilitySystem.getFontScaleKey() !== initialFontScale ||
      i18n.getLocale() !== initialLocale
    ) {
      resHintText.text =
        "⚠️ A tela será recarregada ao salvar para aplicar as alterações de sistema";
    } else {
      resHintText.text = "";
    }
  };

  const context: OptionsScreenContext = {
    k: engine,
    elements,
    focusItems,
    col0X,
    col1X,
    colW,
    btnH,
    rowGap,
    rowStartY,
    cardTop,
    cardW,
    cX,
    cY,
    getCurrentResKey: () => currentResKey,
    setCurrentResKey: (key: ResolutionKey) => {
      currentResKey = key;
    },
    getCurrentDisplayMode: () => currentDisplayMode,
    setCurrentDisplayMode: (mode: DisplayMode) => {
      currentDisplayMode = mode;
    },
    getCurrentLetterboxColor: () => currentLetterboxColor,
    setCurrentLetterboxColor: (color: LetterboxColor) => {
      currentLetterboxColor = color;
    },
    updateReloadHint,
    isClosed: () => isClosed,
    isModalOpen: () => isModalOpen,
    setIsModalOpen: (open: boolean) => {
      isModalOpen = open;
    },
    close,
  };

  // ========================================================
  // COLUNA 0 (ESQUERDA): ÁUDIO & VÍDEO
  // ========================================================
  renderAudioOptions(context);
  renderGraphicsOptions(context);

  // ========================================================
  // COLUNA 1 (DIREITA): ACESSIBILIDADE & SISTEMA
  // ========================================================

  renderAccessibilityOptions(context);
  renderControlsOptions(context);

  // ========================================================
  // SEÇÃO INFERIOR: GUIA DE CONTROLES, AÇÕES & LGPD
  // ========================================================
  renderControlsGuide(context);
  renderKioskActionButtons(context);

  // Inicia o grupo de foco por teclado acessível
  focusGroup = createFocusGroup(engine as unknown as LegacyKeyboardNavContext, {
    items: focusItems,
    onEscape: close,
    initialIndex: focusItems.length - 1, // Inicia focado em Salvar & Voltar
    ringZ: 315,
    isEnabled: () => !isClosed && !isModalOpen,
  });
}

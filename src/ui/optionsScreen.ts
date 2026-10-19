import type { GameObj, KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import { i18n } from "../i18n/i18n";
import {
  type ResolutionKey,
  getSavedResolution,
  getSavedDisplayMode,
  type DisplayMode,
  getSavedLetterboxColor,
  type LetterboxColor,
} from "../config";
import { animateModalEntrance, createResolutionTransitionOverlay } from "./animationUtils";
import type { OptionsScreenContext } from "./options/optionsTypes";
import { renderAudioOptions } from "./options/audioOptionsTab";
import { renderAccessibilityOptions } from "./options/accessibilityOptionsTab";
import { renderControlsOptions, renderControlsGuide } from "./options/controlsOptionsTab";
import { renderGraphicsOptions, renderKioskActionButtons } from "./options/kioskOptionsTab";
import { renderOptionsHeader, renderColumnTitles } from "./options/optionsNavigation";

export function showOptionsScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: GameObj[] = [];
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
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 16, 36),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card do Modal de Opções com geometria ampla e adaptativa
  const cardW = Math.min(1000, k.width() - 24);
  const cardH = Math.min(650, k.height() - 20);
  const cX = k.width() / 2;
  const cY = k.height() / 2;
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
        k.destroy(el);
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
      createResolutionTransitionOverlay(k, () => {
        window.location.reload();
      });
      return;
    }
    onBack();
  };

  const { card, closeBtnFocusItem } = renderOptionsHeader(
    k,
    cX,
    cardTop,
    cardW,
    cardH,
    elements,
    close,
    () => !isClosed && !isModalOpen
  );
  animateModalEntrance(k, card);
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

  renderColumnTitles(k, col0X, col1X, headerY, elements);

  const rowStartY = cardTop + 124;
  const btnH = 41;
  const rowGap = 10;

  // Dica informativa de reload ao salvar
  const reloadHintY = cardTop + 424;
  const resHintText = k.add([
    k.text("", {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    k.pos(cX, reloadHintY),
    k.color(255, 220, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
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
    k,
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
  focusGroup = createFocusGroup(k, {
    items: focusItems,
    onEscape: close,
    initialIndex: focusItems.length - 1, // Inicia focado em Salvar & Voltar
    ringZ: 315,
    isEnabled: () => !isClosed && !isModalOpen,
  });
}

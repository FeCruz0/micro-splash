import type { KaboomCtx } from "kaboom";
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
import {
  animateModalEntrance,
  attachButtonHoverEffect,
  createResolutionTransitionOverlay,
} from "./animationUtils";
import type { OptionsScreenContext } from "./options/optionsTypes";
import { renderAudioOptions } from "./options/audioOptionsTab";
import { renderAccessibilityOptions } from "./options/accessibilityOptionsTab";
import { renderControlsOptions, renderControlsGuide } from "./options/controlsOptionsTab";
import { renderGraphicsOptions, renderKioskActionButtons } from "./options/kioskOptionsTab";

export function showOptionsScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
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

  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);
  animateModalEntrance(k, card);

  // Título Principal com destaque dourado
  elements.push(
    k.add([
      k.text("OPÇÕES & ACESSIBILIDADE ⚙️", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      k.pos(cX, cardTop + 30),
      k.color(255, 225, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Subtítulo descritivo em azul celeste nítido
  elements.push(
    k.add([
      k.text(
        "Personalize áudio, resolução gráfica, controles e recursos de acessibilidade universal",
        {
          size: accessibilitySystem.scaleFont(15.5),
          font: "Inter",
        }
      ),
      k.pos(cX, cardTop + 56),
      k.color(180, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

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

  // Botão fechar [X] no topo direito
  const btnXPos = k.vec2(cX + cardW / 2 - 30, cardTop + 30);
  const btnX = k.add([
    k.rect(34, 34, { radius: 8 }),
    k.pos(btnXPos),
    k.color(22, 50, 90),
    k.outline(1.5, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnX);

  elements.push(
    k.add([
      k.text("✕", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnXPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  attachButtonHoverEffect(k, btnX, {
    baseColor: [22, 50, 90],
    hoverColor: [180, 50, 50],
    baseScale: 1.0,
    hoverScale: 1.06,
    canInteract: () => !isClosed && !isModalOpen,
  });
  btnX.onClick(() => {
    if (isClosed || isModalOpen) return;
    close();
  });
  focusItems.push({
    pos: btnXPos,
    width: 32,
    height: 32,
    onActivate: close,
  });

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

  // Cabeçalho Coluna 0: ÁUDIO & VÍDEO
  elements.push(
    k.add([
      k.text("🎵 ÁUDIO & GRÁFICOS", {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }),
      k.pos(col0X, headerY),
      k.color(100, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Cabeçalho Coluna 1: ACESSIBILIDADE & SISTEMA
  elements.push(
    k.add([
      k.text("♿ ACESSIBILIDADE & SISTEMA", {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }),
      k.pos(col1X, headerY),
      k.color(100, 240, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

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

import type { GameObj, KaboomCtx } from "kaboom";
import {
  UI_COLORS,
  UI_RADII,
  UI_Z_INDEX,
  getModalDimensions,
  type ModalDimensions,
  type ModalVariant,
} from "../theme";
import { animateModalEntrance, animateModalExit, attachButtonHoverEffect } from "../animationUtils";
import { addShadowedText } from "../textUtils";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { audioSystem } from "../../systems/audioSystem";
import { createFocusGroup, type FocusableItem, type FocusGroup } from "../keyboardNav";
import { FONT_TITLE, FONT_BODY, TEXT_SIZE_H1, TEXT_SIZE_BODY } from "../../config";

export interface ModalShellOptions {
  title: string;
  subtitle?: string;
  titleColor?: readonly [number, number, number];
  borderColor?: readonly [number, number, number];
  borderWidth?: number;
  variant?: ModalVariant;
  customWidth?: number;
  customHeight?: number;
  zBase?: number;
  showCloseButton?: boolean;
  onClose: () => void;
  canInteract?: () => boolean;
}

export interface ModalShellHandle {
  card: GameObj;
  backdrop: GameObj;
  closeBtn?: GameObj;
  dimensions: ModalDimensions;
  elements: GameObj[];
  focusItems: FocusableItem[];
  close: () => void;
  isClosed: () => boolean;
  addFocusItem: (item: FocusableItem) => void;
  createFocusGroup: (initialIndex?: number) => FocusGroup;
}

/**
 * Cria a casca estrutural padronizada de um modal (backdrop, card, título com sombra,
 * botão fechar [X] e atalho ESC), com transições suaves de entrada e saída.
 */
export function createModalShell(k: KaboomCtx, options: ModalShellOptions): ModalShellHandle {
  const elements: GameObj[] = [];
  const focusItems: FocusableItem[] = [];
  let focusGroup: FocusGroup | null = null;
  let closed = false;

  const canInteract = options.canInteract ?? (() => true);
  const zBase = options.zBase ?? UI_Z_INDEX.backdrop;
  const screenW = k.width();
  const screenH = k.height();

  // Dimensões calculadas
  const baseDims = getModalDimensions(screenW, screenH, options.variant ?? "standard");
  const cardW = options.customWidth ?? baseDims.cardW;
  const cardH = options.customHeight ?? baseDims.cardH;
  const cX = screenW / 2;
  const cY = screenH / 2;
  const dimensions: ModalDimensions = {
    cardW,
    cardH,
    cX,
    cY,
    contentW: cardW - 48,
    top: cY - cardH / 2,
    bottom: cY + cardH / 2,
  };

  // 1. Fundo escuro semitransparente (interceptor de cliques)
  const backdrop = k.add([
    k.rect(screenW, screenH),
    k.pos(0, 0),
    k.color(UI_COLORS.backdrop[0], UI_COLORS.backdrop[1], UI_COLORS.backdrop[2]),
    k.opacity(UI_COLORS.backdropOpacity),
    k.area(),
    k.fixed(),
    k.z(zBase),
  ]);
  elements.push(backdrop);

  // 2. Card Modal Principal
  const borderColor = options.borderColor ?? UI_COLORS.border;
  const card = k.add([
    k.rect(cardW, cardH, { radius: UI_RADII.xl }),
    k.pos(cX, cY),
    k.color(UI_COLORS.panel[0], UI_COLORS.panel[1], UI_COLORS.panel[2]),
    k.outline(options.borderWidth ?? 2, k.rgb(borderColor[0], borderColor[1], borderColor[2])),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(zBase + 1),
  ]);
  elements.push(card);

  animateModalEntrance(k, card);

  // 3. Título Principal com Sombra de Leitura Universal
  const titleColor = options.titleColor ?? UI_COLORS.textGold;
  const titleHandle = addShadowedText(k, options.title, {
    pos: k.vec2(cX, dimensions.top + 32),
    size: accessibilitySystem.scaleFont(TEXT_SIZE_H1 + 2),
    font: FONT_TITLE,
    color: k.rgb(titleColor[0], titleColor[1], titleColor[2]),
    shadowColor: k.rgb(UI_COLORS.background[0], UI_COLORS.background[1], UI_COLORS.background[2]),
    anchor: "center",
    z: zBase + 3,
  });
  elements.push(titleHandle.main, titleHandle.shadow);

  // 4. Subtítulo opcional
  if (options.subtitle) {
    elements.push(
      k.add([
        k.text(options.subtitle, {
          size: accessibilitySystem.scaleFont(TEXT_SIZE_BODY),
          font: FONT_BODY,
        }),
        k.pos(cX, dimensions.top + 58),
        k.color(UI_COLORS.textSecondary[0], UI_COLORS.textSecondary[1], UI_COLORS.textSecondary[2]),
        k.anchor("center"),
        k.fixed(),
        k.z(zBase + 2),
      ])
    );
  }

  // Limpeza e encerramento
  let keyHandler: ((event: KeyboardEvent) => void) | null = null;

  const destroyElements = () => {
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    if (typeof window !== "undefined" && keyHandler) {
      window.removeEventListener("keydown", keyHandler);
      keyHandler = null;
    }
    elements.forEach((el) => {
      try {
        if ("destroy" in el && typeof el.destroy === "function") {
          el.destroy();
        } else if (typeof k.destroy === "function") {
          k.destroy(el);
        }
      } catch {}
    });
  };

  const close = () => {
    if (closed) return;
    closed = true;
    audioSystem.playUiClick();

    animateModalExit(k, card, {
      onComplete: () => {
        destroyElements();
        options.onClose();
      },
    });
  };

  // 5. Botão fechar [X] no canto superior direito
  let closeBtn: GameObj | undefined;
  if (options.showCloseButton !== false) {
    const btnXPos = k.vec2(cX + cardW / 2 - 32, dimensions.top + 32);
    closeBtn = k.add([
      k.rect(38, 38, { radius: UI_RADII.md }),
      k.pos(btnXPos),
      k.color(22, 50, 90),
      k.outline(1.5, k.rgb(100, 200, 255)),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(zBase + 5),
    ]);
    elements.push(closeBtn);

    elements.push(
      k.add([
        k.text("✕", {
          size: accessibilitySystem.scaleFont(20),
          font: "Outfit",
        }),
        k.pos(btnXPos),
        k.color(UI_COLORS.textPrimary[0], UI_COLORS.textPrimary[1], UI_COLORS.textPrimary[2]),
        k.anchor("center"),
        k.fixed(),
        k.z(zBase + 6),
      ])
    );

    attachButtonHoverEffect(k, closeBtn, {
      baseColor: [22, 50, 90],
      hoverColor: [180, 50, 50],
      baseScale: 1.0,
      hoverScale: 1.05,
      canInteract,
    });

    closeBtn.onClick(() => {
      if (!canInteract()) return;
      close();
    });

    focusItems.push({
      pos: btnXPos,
      width: 38,
      height: 38,
      onActivate: () => {
        if (!canInteract()) return;
        close();
      },
    });
  }

  // Listener da tecla Escape
  keyHandler = (event: KeyboardEvent) => {
    if (closed) return;
    if (event.key === "Escape") {
      if (!canInteract()) return;
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }

  return {
    card,
    backdrop,
    closeBtn,
    dimensions,
    elements,
    focusItems,
    close,
    isClosed: () => closed,
    addFocusItem: (item: FocusableItem) => {
      focusItems.push(item);
    },
    createFocusGroup: (initialIndex?: number) => {
      focusGroup = createFocusGroup(k, {
        items: focusItems,
        initialIndex: initialIndex ?? (focusItems.length > 0 ? focusItems.length - 1 : 0),
        ringZ: zBase + 15,
      });
      return focusGroup;
    },
  };
}

/**
 * Shell Estrutural Universal de Modais (Fase 64.3) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import {
  UI_COLORS,
  UI_RADII,
  UI_Z_INDEX,
  getModalDimensions,
  type ModalDimensions,
  type ModalVariant,
} from "../theme";
import {
  animateModalEntrance,
  animateModalExit,
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "../animationUtils";
import { addShadowedText } from "../textUtils";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { audioSystem } from "../../systems/audioSystem";
import { createFocusGroup, type FocusableItem, type FocusGroup } from "../keyboardNav";
import { FONT_TITLE, FONT_BODY, TEXT_SIZE_H1, TEXT_SIZE_BODY } from "../../config";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../../engine/adapters/LegacyBridge";

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

export interface ModalShellHandle<TObj = unknown> {
  card: TObj;
  backdrop: TObj;
  closeBtn?: TObj;
  dimensions: ModalDimensions;
  elements: TObj[];
  focusItems: FocusableItem[];
  close: () => void;
  isClosed: () => boolean;
  addFocusItem: (item: FocusableItem) => void;
  createFocusGroup: (initialIndex?: number) => FocusGroup;
}

export interface LegacyModalShellContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number | { x: number; y: number }, y?: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  scale?(scale: number): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  area?(): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  vec2?(x: number, y: number): { x: number; y: number };
  destroy?(target: unknown): void;
}

/**
 * Cria a casca estrutural padronizada de um modal (backdrop, card, título com sombra,
 * botão fechar [X] e atalho ESC), com transições suaves de entrada e saída.
 */
export function createModalShell<
  TEngine extends IRenderEngine | LegacyModalShellContext = IRenderEngine | LegacyModalShellContext,
  TObj = TEngine extends { add(...args: unknown[]): infer R }
    ? unknown extends R
      ? unknown
      : R
    : unknown,
>(engineOrContext: TEngine, options: ModalShellOptions): ModalShellHandle<TObj> {
  const focusItems: FocusableItem[] = [];
  let focusGroup: FocusGroup | null = null;
  let closed = false;

  const canInteract = options.canInteract ?? (() => true);
  const zBase = options.zBase ?? UI_Z_INDEX.backdrop;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensionsEngine = engineOrContext.getDimensions();
    const screenW = dimensionsEngine.width;
    const screenH = dimensionsEngine.height;

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

    const elements: Array<IGraphicsNode | ITextNode> = [];

    // 1. Backdrop
    const backdropNode = engineOrContext.createGraphics("modal_backdrop");
    backdropNode.drawRect(0, 0, screenW, screenH, {
      fill: {
        color: [UI_COLORS.backdrop[0], UI_COLORS.backdrop[1], UI_COLORS.backdrop[2]],
        alpha: UI_COLORS.backdropOpacity,
      },
    });
    backdropNode.setZIndex(zBase);
    stageRoot.addChild(backdropNode);
    elements.push(backdropNode);

    // 2. Card
    const borderColor = options.borderColor ?? UI_COLORS.border;
    const cardNode = engineOrContext.createGraphics("modal_card");
    cardNode.drawRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, UI_RADII.xl, {
      fill: {
        color: [UI_COLORS.panel[0], UI_COLORS.panel[1], UI_COLORS.panel[2]],
        alpha: 1,
      },
      stroke: {
        width: options.borderWidth ?? 2,
        color: [borderColor[0], borderColor[1], borderColor[2]],
        alpha: 1,
      },
    });
    cardNode.setPosition(cX, cY);
    cardNode.setZIndex(zBase + 1);
    stageRoot.addChild(cardNode);
    elements.push(cardNode);

    // 3. Título com sombra
    const titleHandle = addShadowedText(engineOrContext, options.title, {
      pos: { x: cX, y: dimensions.top + 32 },
      size: accessibilitySystem.scaleFont(TEXT_SIZE_H1 + 2),
      font: FONT_TITLE,
      anchor: "center",
      z: zBase + 3,
    });

    // 4. Subtítulo opcional
    if (options.subtitle) {
      const subtitleNode = engineOrContext.createText(
        options.subtitle,
        {
          fontFamily: FONT_BODY,
          fontSize: accessibilitySystem.scaleFont(TEXT_SIZE_BODY),
          color: [
            UI_COLORS.textSecondary[0],
            UI_COLORS.textSecondary[1],
            UI_COLORS.textSecondary[2],
          ],
          align: "center",
        },
        "modal_subtitle"
      );
      subtitleNode.setPosition(cX, dimensions.top + 58);
      subtitleNode.setZIndex(zBase + 2);
      stageRoot.addChild(subtitleNode);
      elements.push(subtitleNode);
    }

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
      titleHandle.destroy();
      elements.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
    };

    const close = () => {
      if (closed) return;
      closed = true;
      audioSystem.playUiClick();
      destroyElements();
      options.onClose();
    };

    let closeBtnNode: IGraphicsNode | undefined;
    if (options.showCloseButton !== false) {
      const btnXPos = cX + cardW / 2 - 32;
      const btnYPos = dimensions.top + 32;

      closeBtnNode = engineOrContext.createGraphics("modal_close_btn");
      closeBtnNode.drawRoundedRect(-19, -19, 38, 38, UI_RADII.md, {
        fill: { color: [22, 50, 90], alpha: 1 },
        stroke: { width: 1.5, color: [100, 200, 255], alpha: 1 },
      });
      closeBtnNode.setPosition(btnXPos, btnYPos);
      closeBtnNode.setZIndex(zBase + 5);
      stageRoot.addChild(closeBtnNode);
      elements.push(closeBtnNode);

      const closeLabel = engineOrContext.createText(
        "✕",
        {
          fontFamily: "Outfit",
          fontSize: accessibilitySystem.scaleFont(20),
          color: [UI_COLORS.textPrimary[0], UI_COLORS.textPrimary[1], UI_COLORS.textPrimary[2]],
          align: "center",
        },
        "modal_close_label"
      );
      closeLabel.setPosition(btnXPos, btnYPos);
      closeLabel.setZIndex(zBase + 6);
      stageRoot.addChild(closeLabel);
      elements.push(closeLabel);

      const nativeClose = closeBtnNode.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (event: string, callback: () => void) => void;
      }>();
      if (nativeClose && typeof nativeClose.on === "function") {
        nativeClose.interactive = true;
        nativeClose.cursor = "pointer";
        nativeClose.on("pointertap", () => {
          if (!canInteract()) return;
          close();
        });
      }

      focusItems.push({
        pos: { x: btnXPos, y: btnYPos },
        width: 38,
        height: 38,
        onActivate: () => {
          if (!canInteract()) return;
          close();
        },
      });
    }

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
      card: cardNode as unknown as TObj,
      backdrop: backdropNode as unknown as TObj,
      closeBtn: closeBtnNode as unknown as TObj | undefined,
      dimensions,
      elements: elements as unknown as TObj[],
      focusItems,
      close,
      isClosed: () => closed,
      addFocusItem: (item: FocusableItem) => {
        focusItems.push(item);
      },
      createFocusGroup: (initialIndex?: number) => {
        focusGroup = createFocusGroup(engineOrContext, {
          items: focusItems,
          initialIndex: initialIndex ?? (focusItems.length > 0 ? focusItems.length - 1 : 0),
          ringZ: zBase + 15,
        });
        return focusGroup;
      },
    };
  }

  // Fallback e interoperabilidade para contexto legado
  const legacyContext = engineOrContext as LegacyModalShellContext;
  const elements: unknown[] = [];

  const screenW = legacyContext.width();
  const screenH = legacyContext.height();

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

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof legacyContext.vec2 === "function" ? legacyContext.vec2(x, y) : { x, y };
  };

  // 1. Fundo escuro semitransparente
  const backdrop = legacyContext.add([
    typeof legacyContext.rect === "function" ? legacyContext.rect(screenW, screenH) : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(0, 0) : undefined,
    typeof legacyContext.color === "function"
      ? legacyContext.color(UI_COLORS.backdrop[0], UI_COLORS.backdrop[1], UI_COLORS.backdrop[2])
      : undefined,
    typeof legacyContext.opacity === "function"
      ? legacyContext.opacity(UI_COLORS.backdropOpacity)
      : undefined,
    typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(zBase) : undefined,
  ]);
  elements.push(backdrop);

  // 2. Card Modal Principal
  const borderColor = options.borderColor ?? UI_COLORS.border;
  const card = legacyContext.add([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(cardW, cardH, { radius: UI_RADII.xl })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(cX, cY) : undefined,
    typeof legacyContext.color === "function"
      ? legacyContext.color(UI_COLORS.panel[0], UI_COLORS.panel[1], UI_COLORS.panel[2])
      : undefined,
    typeof legacyContext.outline === "function"
      ? legacyContext.outline(
          options.borderWidth ?? 2,
          resolveRgb(borderColor[0], borderColor[1], borderColor[2])
        )
      : undefined,
    typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
    typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
    typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(zBase + 1) : undefined,
  ]);
  elements.push(card);

  animateModalEntrance(
    legacyContext as unknown as AnimationEngineContext,
    card as unknown as AnimationUiObject
  );

  // 3. Título Principal
  const titleColor = options.titleColor ?? UI_COLORS.textGold;
  const titleHandle = addShadowedText(
    legacyContext as unknown as Parameters<typeof addShadowedText>[0],
    options.title,
    {
      pos: createVector2(cX, dimensions.top + 32),
      size: accessibilitySystem.scaleFont(TEXT_SIZE_H1 + 2),
      font: FONT_TITLE,
      color: resolveRgb(titleColor[0], titleColor[1], titleColor[2]),
      shadowColor: resolveRgb(
        UI_COLORS.background[0],
        UI_COLORS.background[1],
        UI_COLORS.background[2]
      ),
      anchor: "center",
      z: zBase + 3,
    }
  );
  elements.push(titleHandle.main, titleHandle.shadow);

  // 4. Subtítulo opcional
  if (options.subtitle) {
    elements.push(
      legacyContext.add([
        typeof legacyContext.text === "function"
          ? legacyContext.text(options.subtitle, {
              size: accessibilitySystem.scaleFont(TEXT_SIZE_BODY),
              font: FONT_BODY,
            })
          : undefined,
        typeof legacyContext.pos === "function"
          ? legacyContext.pos(cX, dimensions.top + 58)
          : undefined,
        typeof legacyContext.color === "function"
          ? legacyContext.color(
              UI_COLORS.textSecondary[0],
              UI_COLORS.textSecondary[1],
              UI_COLORS.textSecondary[2]
            )
          : undefined,
        typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(zBase + 2) : undefined,
      ])
    );
  }

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
        if (
          el &&
          typeof el === "object" &&
          "destroy" in el &&
          typeof (el as { destroy: () => void }).destroy === "function"
        ) {
          (el as { destroy: () => void }).destroy();
        } else if (typeof legacyContext.destroy === "function") {
          legacyContext.destroy(el);
        }
      } catch {}
    });
  };

  const close = () => {
    if (closed) return;
    closed = true;
    audioSystem.playUiClick();

    animateModalExit(
      legacyContext as unknown as AnimationEngineContext,
      card as unknown as AnimationUiObject,
      {
        onComplete: () => {
          destroyElements();
          options.onClose();
        },
      }
    );
  };

  let closeBtn: unknown = undefined;
  if (options.showCloseButton !== false) {
    const btnXPos = createVector2(cX + cardW / 2 - 32, dimensions.top + 32);
    closeBtn = legacyContext.add([
      typeof legacyContext.rect === "function"
        ? legacyContext.rect(38, 38, { radius: UI_RADII.md })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(btnXPos.x, btnXPos.y) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(22, 50, 90) : undefined,
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(1.5, resolveRgb(100, 200, 255))
        : undefined,
      typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(zBase + 5) : undefined,
    ]);
    elements.push(closeBtn);

    elements.push(
      legacyContext.add([
        typeof legacyContext.text === "function"
          ? legacyContext.text("✕", {
              size: accessibilitySystem.scaleFont(20),
              font: "Outfit",
            })
          : undefined,
        typeof legacyContext.pos === "function"
          ? legacyContext.pos(btnXPos.x, btnXPos.y)
          : undefined,
        typeof legacyContext.color === "function"
          ? legacyContext.color(
              UI_COLORS.textPrimary[0],
              UI_COLORS.textPrimary[1],
              UI_COLORS.textPrimary[2]
            )
          : undefined,
        typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(zBase + 6) : undefined,
      ])
    );

    attachButtonHoverEffect(
      legacyContext as unknown as AnimationEngineContext,
      closeBtn as unknown as AnimationUiObject,
      {
        baseColor: [22, 50, 90],
        hoverColor: [180, 50, 50],
        baseScale: 1.0,
        hoverScale: 1.05,
        canInteract,
      }
    );

    const closeBtnObj = closeBtn as { onClick?: (cb: () => void) => void };
    if (typeof closeBtnObj.onClick === "function") {
      closeBtnObj.onClick(() => {
        if (!canInteract()) return;
        close();
      });
    }

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
    card: card as TObj,
    backdrop: backdrop as TObj,
    closeBtn: closeBtn as TObj | undefined,
    dimensions,
    elements: elements as TObj[],
    focusItems,
    close,
    isClosed: () => closed,
    addFocusItem: (item: FocusableItem) => {
      focusItems.push(item);
    },
    createFocusGroup: (initialIndex?: number) => {
      focusGroup = createFocusGroup(
        legacyContext as unknown as Parameters<typeof createFocusGroup>[0],
        {
          items: focusItems,
          initialIndex: initialIndex ?? (focusItems.length > 0 ? focusItems.length - 1 : 0),
          ringZ: zBase + 15,
        }
      );
      return focusGroup;
    },
  };
}

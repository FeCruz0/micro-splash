/**
 * Botão Card Padronizado com Design System e Variantes Semânticas (Fase 64.4) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { UI_COLORS, UI_RADII, UI_Z_INDEX } from "../theme";
import { attachButtonHoverEffect } from "../animationUtils";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { audioSystem } from "../../systems/audioSystem";
import type { FocusableItem } from "../keyboardNav";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
  Vector2D,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../../engine/adapters/LegacyBridge";

export type CardButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface CardButtonOptions {
  label: string;
  pos: Vector2D;
  width: number;
  height: number;
  variant?: CardButtonVariant;
  customBaseColor?: readonly [number, number, number];
  customHoverColor?: readonly [number, number, number];
  customOutlineColor?: readonly [number, number, number];
  fontSize?: number;
  fontFamily?: string;
  radius?: number;
  zBase?: number;
  onClick: () => void;
  canInteract?: () => boolean;
}

export interface CardButtonHandle<TObj = unknown> {
  btn: TObj;
  txt: TObj;
  elements: TObj[];
  focusItem: FocusableItem;
  destroy: () => void;
}

export interface LegacyCardButtonContext {
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  scale?(scale: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  area?(): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  vec2?(x: number, y: number): { x: number; y: number };
  destroy?(target: unknown): void;
}

/**
 * Cria um botão estilizado com suporte a variantes semânticas, hover elástico e
 * navegação acessível por teclado (WCAG 2.1 AA).
 */
export function createCardButton<
  TEngine extends IRenderEngine | LegacyCardButtonContext = IRenderEngine | LegacyCardButtonContext,
  TObj = TEngine extends { add(...args: unknown[]): infer R }
    ? unknown extends R
      ? unknown
      : R
    : unknown,
>(engineOrContext: TEngine, options: CardButtonOptions): CardButtonHandle<TObj> {
  const canInteract = options.canInteract ?? (() => true);
  const zBase = options.zBase ?? UI_Z_INDEX.modalControls;
  const variant = options.variant ?? "secondary";

  let baseColor: [number, number, number];
  let hoverColor: [number, number, number];
  let outlineColor: [number, number, number];

  switch (variant) {
    case "primary":
      baseColor = [...UI_COLORS.button.primary.base];
      hoverColor = [...UI_COLORS.button.primary.hover];
      outlineColor = [...UI_COLORS.button.primary.outline];
      break;
    case "danger":
      baseColor = [...UI_COLORS.button.danger.base];
      hoverColor = [...UI_COLORS.button.danger.hover];
      outlineColor = [...UI_COLORS.button.danger.outline];
      break;
    case "ghost":
      baseColor = [14, 32, 60];
      hoverColor = [20, 48, 85];
      outlineColor = [56, 100, 155];
      break;
    case "secondary":
    default:
      baseColor = [...UI_COLORS.button.secondary.base];
      hoverColor = [...UI_COLORS.button.secondary.hover];
      outlineColor = [...UI_COLORS.button.secondary.outline];
      break;
  }

  if (options.customBaseColor) baseColor = [...options.customBaseColor];
  if (options.customHoverColor) hoverColor = [...options.customHoverColor];
  if (options.customOutlineColor) outlineColor = [...options.customOutlineColor];

  const trigger = () => {
    if (!canInteract()) return;
    audioSystem.playUiClick();
    options.onClick();
  };

  const focusItem: FocusableItem = {
    pos: { x: options.pos.x, y: options.pos.y },
    width: options.width,
    height: options.height,
    onActivate: trigger,
  };

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const btnNode: IGraphicsNode = engineOrContext.createGraphics("card_button_bg");
    const radius = options.radius ?? UI_RADII.md;

    const drawButton = (isHover: boolean) => {
      btnNode.clear();
      btnNode.drawRoundedRect(
        -options.width / 2,
        -options.height / 2,
        options.width,
        options.height,
        radius,
        {
          fill: { color: isHover ? hoverColor : baseColor, alpha: 1 },
          stroke: { width: 1.5, color: outlineColor, alpha: 1 },
        }
      );
    };
    drawButton(false);
    btnNode.setPosition(options.pos.x, options.pos.y);
    btnNode.setZIndex(zBase);
    stageRoot.addChild(btnNode);

    const txtNode: ITextNode = engineOrContext.createText(
      options.label,
      {
        fontFamily: options.fontFamily ?? "Outfit",
        fontSize: accessibilitySystem.scaleFont(options.fontSize ?? 15.5),
        color: [UI_COLORS.textPrimary[0], UI_COLORS.textPrimary[1], UI_COLORS.textPrimary[2]],
        align: "center",
      },
      "card_button_text"
    );
    txtNode.setPosition(options.pos.x, options.pos.y);
    txtNode.setZIndex(zBase + 1);
    stageRoot.addChild(txtNode);

    const nativeBtn = btnNode.getNativeNode<{
      interactive?: boolean;
      cursor?: string;
      on?: (event: string, callback: () => void) => void;
    }>();

    if (nativeBtn && typeof nativeBtn.on === "function") {
      nativeBtn.interactive = true;
      nativeBtn.cursor = "pointer";
      nativeBtn.on("pointerover", () => {
        if (!canInteract()) return;
        drawButton(true);
        btnNode.setScale(1.025, 1.025);
      });
      nativeBtn.on("pointerout", () => {
        drawButton(false);
        btnNode.setScale(1.0, 1.0);
      });
      nativeBtn.on("pointertap", trigger);
    }

    const elements = [btnNode, txtNode];

    return {
      btn: btnNode as unknown as TObj,
      txt: txtNode as unknown as TObj,
      elements: elements as unknown as TObj[],
      focusItem,
      destroy: () => {
        elements.forEach((node) => {
          try {
            stageRoot.removeChild(node);
            node.destroy();
          } catch {}
        });
      },
    };
  }

  // Fallback e interoperabilidade para contexto legado
  const legacyContext = engineOrContext as LegacyCardButtonContext;
  const elements: unknown[] = [];

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

  const btn = legacyContext.add([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(options.width, options.height, { radius: options.radius ?? UI_RADII.md })
      : undefined,
    typeof legacyContext.pos === "function"
      ? legacyContext.pos(options.pos.x, options.pos.y)
      : undefined,
    typeof legacyContext.color === "function"
      ? legacyContext.color(baseColor[0], baseColor[1], baseColor[2])
      : undefined,
    typeof legacyContext.outline === "function"
      ? legacyContext.outline(1.5, resolveRgb(outlineColor[0], outlineColor[1], outlineColor[2]))
      : undefined,
    typeof legacyContext.scale === "function" ? legacyContext.scale(1) : undefined,
    typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
    typeof legacyContext.area === "function" ? legacyContext.area() : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(zBase) : undefined,
  ]);
  elements.push(btn);

  const txt = legacyContext.add([
    typeof legacyContext.text === "function"
      ? legacyContext.text(options.label, {
          size: accessibilitySystem.scaleFont(options.fontSize ?? 15.5),
          font: options.fontFamily ?? "Outfit",
        })
      : undefined,
    typeof legacyContext.pos === "function"
      ? legacyContext.pos(options.pos.x, options.pos.y)
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
    typeof legacyContext.z === "function" ? legacyContext.z(zBase + 1) : undefined,
  ]);
  elements.push(txt);

  attachButtonHoverEffect(
    legacyContext as unknown as Parameters<typeof attachButtonHoverEffect>[0],
    btn as unknown as Parameters<typeof attachButtonHoverEffect>[1],
    {
      baseColor,
      hoverColor,
      baseScale: 1.0,
      hoverScale: 1.025,
      canInteract,
    }
  );

  const btnObj = btn as { onClick?: (cb: () => void) => void };
  if (typeof btnObj.onClick === "function") {
    btnObj.onClick(trigger);
  }

  const legacyFocusItem: FocusableItem = {
    pos: createVector2(options.pos.x, options.pos.y),
    width: options.width,
    height: options.height,
    onActivate: trigger,
  };

  return {
    btn: btn as TObj,
    txt: txt as TObj,
    elements: elements as TObj[],
    focusItem: legacyFocusItem,
    destroy: () => {
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
    },
  };
}

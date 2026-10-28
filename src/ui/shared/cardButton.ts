import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { UI_COLORS, UI_RADII, UI_Z_INDEX } from "../theme";
import { attachButtonHoverEffect } from "../animationUtils";
import { accessibilitySystem } from "../../systems/accessibilitySystem";
import { audioSystem } from "../../systems/audioSystem";
import type { FocusableItem } from "../keyboardNav";

export type CardButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export interface CardButtonOptions {
  label: string;
  pos: Vec2 | { x: number; y: number };
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

export interface CardButtonHandle {
  btn: GameObj;
  txt: GameObj;
  elements: GameObj[];
  focusItem: FocusableItem;
  destroy: () => void;
}

/**
 * Cria um botão estilizado com suporte a variantes semânticas, hover elástico e
 * navegação acessível por teclado (WCAG 2.1 AA).
 */
export function createCardButton(k: KaboomCtx, options: CardButtonOptions): CardButtonHandle {
  const elements: GameObj[] = [];
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

  const btn = k.add([
    k.rect(options.width, options.height, { radius: options.radius ?? UI_RADII.md }),
    k.pos(options.pos.x, options.pos.y),
    k.color(baseColor[0], baseColor[1], baseColor[2]),
    k.outline(1.5, k.rgb(outlineColor[0], outlineColor[1], outlineColor[2])),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(zBase),
  ]);
  elements.push(btn);

  const txt = k.add([
    k.text(options.label, {
      size: accessibilitySystem.scaleFont(options.fontSize ?? 15.5),
      font: options.fontFamily ?? "Outfit",
    }),
    k.pos(options.pos.x, options.pos.y),
    k.color(UI_COLORS.textPrimary[0], UI_COLORS.textPrimary[1], UI_COLORS.textPrimary[2]),
    k.anchor("center"),
    k.fixed(),
    k.z(zBase + 1),
  ]);
  elements.push(txt);

  attachButtonHoverEffect(k, btn, {
    baseColor,
    hoverColor,
    baseScale: 1.0,
    hoverScale: 1.025,
    canInteract,
  });

  const trigger = () => {
    if (!canInteract()) return;
    audioSystem.playUiClick();
    options.onClick();
  };

  btn.onClick(trigger);

  const focusItem: FocusableItem = {
    pos: k.vec2(options.pos.x, options.pos.y),
    width: options.width,
    height: options.height,
    onActivate: trigger,
  };

  return {
    btn,
    txt,
    elements,
    focusItem,
    destroy: () => {
      elements.forEach((el) => {
        try {
          if ("destroy" in el && typeof el.destroy === "function") {
            el.destroy();
          } else if (typeof k.destroy === "function") {
            k.destroy(el);
          }
        } catch {}
      });
    },
  };
}

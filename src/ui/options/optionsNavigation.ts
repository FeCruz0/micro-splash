/**
 * Navegação e Cabeçalhos do Menu de Opções (WBS 2.21) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com tipagem estrita e zero any.
 */

import { accessibilitySystem } from "../../systems/accessibilitySystem";
import {
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "../animationUtils";
import type { FocusableItem } from "../keyboardNav";
import type { LegacyOptionsEngineContext, LegacyOptionsUiObject } from "./optionsTypes";

export interface OptionsHeaderResult {
  card: AnimationUiObject;
  closeBtnFocusItem: FocusableItem;
}

export function renderOptionsHeader(
  k: LegacyOptionsEngineContext,
  cX: number,
  cardTop: number,
  cardW: number,
  cardH: number,
  elements: Array<{ destroy?: () => void } | object>,
  onClose: () => void,
  canInteract: () => boolean
): OptionsHeaderResult {
  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cardTop + cardH / 2),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);

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

  attachButtonHoverEffect(
    k as unknown as AnimationEngineContext,
    btnX as unknown as AnimationUiObject,
    {
      baseColor: [22, 50, 90],
      hoverColor: [180, 50, 50],
      baseScale: 1.0,
      hoverScale: 1.06,
      canInteract,
    }
  );

  if (typeof (btnX as LegacyOptionsUiObject).onClick === "function") {
    (btnX as LegacyOptionsUiObject).onClick(() => {
      if (canInteract()) {
        onClose();
      }
    });
  }

  const closeBtnFocusItem: FocusableItem = {
    pos: btnXPos,
    width: 32,
    height: 32,
    onActivate: onClose,
  };

  return { card: card as unknown as AnimationUiObject, closeBtnFocusItem };
}

export function renderColumnTitles(
  k: LegacyOptionsEngineContext,
  col0X: number,
  col1X: number,
  headerY: number,
  elements: Array<{ destroy?: () => void } | object>
): void {
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
}

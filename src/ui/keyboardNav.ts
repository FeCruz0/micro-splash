import type { KaboomCtx, Vec2 } from "kaboom";
import { audioSystem } from "../systems/audioSystem";

export interface FocusableItem {
  id?: string;
  pos: Vec2 | { x: number; y: number };
  width?: number;
  height?: number;
  anchor?: "center" | "topleft";
  onActivate: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface FocusGroupOptions {
  items: FocusableItem[];
  onEscape?: () => void;
  initialIndex?: number;
  ringZ?: number;
  isEnabled?: () => boolean;
}

export interface FocusGroup {
  focusNext: () => void;
  focusPrev: () => void;
  focusIndex: (index: number) => void;
  activateCurrent: () => void;
  getCurrentIndex: () => number;
  destroy: () => void;
}

/**
 * Cria um grupo de navegação por teclado acessível (WCAG 2.1 AA) para modais e menus do Kaboom.js.
 * Suporta Tab, Shift+Tab, Setas direcionais, Enter/Espaço para ativação e Escape para fechar.
 */
export function createFocusGroup(k: KaboomCtx, options: FocusGroupOptions): FocusGroup {
  const { items, onEscape, initialIndex = -1, ringZ = 350 } = options;
  let currentIndex = initialIndex;
  const eventCleanups: Array<() => void> = [];

  // Anel indicador visual de foco (retângulo de alto contraste)
  const focusRing = k.add([
    k.rect(40, 40, { radius: 8 }),
    k.pos(-9999, -9999),
    k.outline(3, k.rgb(255, 230, 80)),
    k.color(255, 230, 80),
    k.opacity(0),
    k.anchor("center"),
    k.fixed(),
    k.z(ringZ),
  ]);

  let ringAnimTime = 0;
  const ringUpdate = focusRing.onUpdate(() => {
    if (options.isEnabled && !options.isEnabled()) {
      focusRing.opacity = 0;
      return;
    }
    if (currentIndex >= 0 && currentIndex < items.length) {
      ringAnimTime += k.dt();
      const pulse = 0.25 + Math.sin(ringAnimTime * 8) * 0.12;
      focusRing.opacity = pulse;
    } else {
      focusRing.opacity = 0;
    }
  });

  const updateRingPosition = (item: FocusableItem) => {
    const w = (item.width || 180) + 12;
    const h = (item.height || 36) + 10;
    focusRing.width = w;
    focusRing.height = h;

    const posX = item.pos.x;
    const posY = item.pos.y;

    if (item.anchor === "topleft") {
      focusRing.pos = k.vec2(posX + (item.width || 180) / 2, posY + (item.height || 36) / 2);
    } else {
      focusRing.pos = k.vec2(posX, posY);
    }
  };

  const setFocus = (newIndex: number) => {
    if (items.length === 0) return;

    if (currentIndex >= 0 && currentIndex < items.length) {
      try {
        items[currentIndex].onBlur?.();
      } catch {}
    }

    currentIndex = (newIndex + items.length) % items.length;
    const item = items[currentIndex];
    updateRingPosition(item);

    try {
      item.onFocus?.();
    } catch {}
  };

  const focusNext = () => {
    if (options.isEnabled && !options.isEnabled()) return;
    setFocus(currentIndex < 0 ? 0 : currentIndex + 1);
  };

  const focusPrev = () => {
    if (options.isEnabled && !options.isEnabled()) return;
    setFocus(currentIndex < 0 ? items.length - 1 : currentIndex - 1);
  };

  const activateCurrent = () => {
    if (options.isEnabled && !options.isEnabled()) return;
    if (currentIndex >= 0 && currentIndex < items.length) {
      audioSystem.playUiClick();
      items[currentIndex].onActivate();
    }
  };

  // Teclas direcionais e Tab
  const tabListener = k.onKeyPress("tab", () => {
    if (k.isKeyDown("shift")) {
      focusPrev();
    } else {
      focusNext();
    }
  });
  eventCleanups.push(() => tabListener.cancel());

  const downListener = k.onKeyPress("down", focusNext);
  eventCleanups.push(() => downListener.cancel());

  const rightListener = k.onKeyPress("right", focusNext);
  eventCleanups.push(() => rightListener.cancel());

  const upListener = k.onKeyPress("up", focusPrev);
  eventCleanups.push(() => upListener.cancel());

  const leftListener = k.onKeyPress("left", focusPrev);
  eventCleanups.push(() => leftListener.cancel());

  const enterListener = k.onKeyPress("enter", activateCurrent);
  eventCleanups.push(() => enterListener.cancel());

  const spaceListener = k.onKeyPress("space", activateCurrent);
  eventCleanups.push(() => spaceListener.cancel());

  if (onEscape) {
    const escListener = k.onKeyPress("escape", onEscape);
    eventCleanups.push(() => escListener.cancel());
  }

  // Se initialIndex for fornecido
  if (initialIndex >= 0 && initialIndex < items.length) {
    setFocus(initialIndex);
  }

  const destroy = () => {
    eventCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });
    try {
      ringUpdate.cancel();
      k.destroy(focusRing);
    } catch {}
  };

  return {
    focusNext,
    focusPrev,
    focusIndex: setFocus,
    activateCurrent,
    getCurrentIndex: () => currentIndex,
    destroy,
  };
}

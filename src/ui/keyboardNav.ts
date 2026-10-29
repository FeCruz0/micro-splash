/**
 * Gerenciador de Navegação por Teclado e Foco Acessível (WCAG 2.1 AA) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { audioSystem } from "../systems/audioSystem";
import type {
  IRenderEngine,
  IGraphicsNode,
  Vector2D,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface FocusableItem {
  id?: string;
  pos: Vector2D;
  width?: number;
  height?: number;
  anchor?: "center" | "topleft";
  onActivate: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface FocusSnapshot {
  groupId?: string;
  index: number;
  onRestore?: () => void;
}

const focusStack: FocusSnapshot[] = [];

export function pushFocusSnapshot(snapshot: FocusSnapshot): void {
  focusStack.push(snapshot);
}

export function popFocusSnapshot(): FocusSnapshot | undefined {
  return focusStack.pop();
}

export function clearFocusStack(): void {
  focusStack.length = 0;
}

export function getFocusStackDepth(): number {
  return focusStack.length;
}

export interface FocusGroupOptions {
  items: FocusableItem[];
  onEscape?: () => void;
  initialIndex?: number;
  ringZ?: number;
  isEnabled?: () => boolean;
  groupId?: string;
  restoreFocusOnDestroy?: boolean;
}

export interface FocusGroup {
  focusNext: () => void;
  focusPrev: () => void;
  focusIndex: (index: number) => void;
  activateCurrent: () => void;
  getCurrentIndex: () => number;
  destroy: () => void;
}

export interface LegacyKeyboardNavObject {
  pos?: { x: number; y: number };
  width?: number;
  height?: number;
  opacity?: number;
  onUpdate?(callback: () => void): { cancel?: () => void } | void;
}

export interface LegacyKeyboardNavContext {
  add(components?: unknown): unknown;
  destroy?(target: unknown): void;
  vec2?(x: number, y: number): { x: number; y: number };
  rgb?(red: number, green: number, blue: number): unknown;
  rect?(width: number, height: number, options?: unknown): unknown;
  pos?(x: number, y: number): unknown;
  outline?(width: number, color: unknown): unknown;
  color?(...args: unknown[]): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  onKeyPress?(
    key: "tab" | "down" | "right" | "up" | "left" | "enter" | "space" | "escape",
    callback: () => void
  ): { cancel: () => void };
  isKeyDown?(key: "shift"): boolean;
  dt?(): number;
}

/**
 * Cria um grupo de navegação por teclado acessível (WCAG 2.1 AA) para modais e menus.
 * Suporta Tab, Shift+Tab, Setas direcionais, Enter/Espaço para ativação e Escape para fechar.
 */
export function createFocusGroup(
  engineOrContext: IRenderEngine | LegacyKeyboardNavContext,
  options: FocusGroupOptions
): FocusGroup {
  const { items, onEscape, initialIndex = -1, ringZ = 350 } = options;
  let currentIndex = initialIndex;
  const eventCleanups: Array<() => void> = [];

  const updateItemPosition = (
    item: FocusableItem,
    setPositionCallback: (centerX: number, centerY: number, width: number, height: number) => void
  ) => {
    const itemWidth = (item.width || 180) + 12;
    const itemHeight = (item.height || 36) + 10;
    const posX = item.pos.x;
    const posY = item.pos.y;

    if (item.anchor === "topleft") {
      const centerX = posX + (item.width || 180) / 2;
      const centerY = posY + (item.height || 36) / 2;
      setPositionCallback(centerX, centerY, itemWidth, itemHeight);
    } else {
      setPositionCallback(posX, posY, itemWidth, itemHeight);
    }
  };

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const focusRingNode: IGraphicsNode = engineOrContext.createGraphics("keyboard_focus_ring");
    focusRingNode.setZIndex(ringZ);
    focusRingNode.setOpacity(0);
    stageRoot.addChild(focusRingNode);

    let ringWidth = 40;
    let ringHeight = 40;
    let ringCenterX = -9999;
    let ringCenterY = -9999;

    const redrawRing = () => {
      focusRingNode.clear();
      focusRingNode.drawRoundedRect(-ringWidth / 2, -ringHeight / 2, ringWidth, ringHeight, 8, {
        fill: { color: [255, 230, 80], alpha: 0.15 },
        stroke: { width: 3, color: [255, 230, 80], alpha: 1 },
      });
    };
    redrawRing();

    let ringAnimTime = 0;
    const tickerCleanup = engineOrContext.getTicker().add((deltaTime: number) => {
      if (options.isEnabled && !options.isEnabled()) {
        focusRingNode.setOpacity(0);
        return;
      }
      if (currentIndex >= 0 && currentIndex < items.length) {
        ringAnimTime += deltaTime;
        const pulse = 0.4 + Math.sin(ringAnimTime * 8) * 0.2;
        focusRingNode.setOpacity(pulse);
      } else {
        focusRingNode.setOpacity(0);
      }
    });

    const updateRingPosition = (item: FocusableItem) => {
      updateItemPosition(item, (centerX, centerY, width, height) => {
        ringWidth = width;
        ringHeight = height;
        ringCenterX = centerX;
        ringCenterY = centerY;
        focusRingNode.setPosition(ringCenterX, ringCenterY);
        redrawRing();
      });
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

    // Suporte a eventos de teclado do DOM no ambiente PixiJS
    if (typeof window !== "undefined") {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Tab") {
          event.preventDefault();
          if (event.shiftKey) {
            focusPrev();
          } else {
            focusNext();
          }
        } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
          event.preventDefault();
          focusNext();
        } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
          event.preventDefault();
          focusPrev();
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateCurrent();
        } else if (event.key === "Escape" && onEscape) {
          event.preventDefault();
          onEscape();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      eventCleanups.push(() => window.removeEventListener("keydown", handleKeyDown));
    }

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
        tickerCleanup();
        stageRoot.removeChild(focusRingNode);
        focusRingNode.destroy();
      } catch {}

      if (options.restoreFocusOnDestroy) {
        const snapshot = popFocusSnapshot();
        snapshot?.onRestore?.();
      }
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

  // Fallback e interoperabilidade para contexto legado (Kaboom / Mocks de Teste)
  const legacyContext = engineOrContext as LegacyKeyboardNavContext;

  const createVector2 = (x: number, y: number): { x: number; y: number } => {
    return typeof legacyContext.vec2 === "function" ? legacyContext.vec2(x, y) : { x, y };
  };

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const focusRing = legacyContext.add([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(40, 40, { radius: 8 })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(-9999, -9999) : undefined,
    typeof legacyContext.outline === "function"
      ? legacyContext.outline(3, resolveRgb(255, 230, 80))
      : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(255, 230, 80) : undefined,
    typeof legacyContext.opacity === "function" ? legacyContext.opacity(0) : undefined,
    typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(ringZ) : undefined,
  ]) as LegacyKeyboardNavObject;

  let ringAnimTime = 0;
  let updateCancelHandle: { cancel?: () => void } | void = undefined;
  if (typeof focusRing.onUpdate === "function") {
    updateCancelHandle = focusRing.onUpdate(() => {
      if (options.isEnabled && !options.isEnabled()) {
        focusRing.opacity = 0;
        return;
      }
      if (currentIndex >= 0 && currentIndex < items.length) {
        const deltaTime = typeof legacyContext.dt === "function" ? legacyContext.dt() : 0.016;
        ringAnimTime += deltaTime;
        const pulse = 0.25 + Math.sin(ringAnimTime * 8) * 0.12;
        focusRing.opacity = pulse;
      } else {
        focusRing.opacity = 0;
      }
    });
  }

  const updateRingPosition = (item: FocusableItem) => {
    updateItemPosition(item, (centerX, centerY, width, height) => {
      focusRing.width = width;
      focusRing.height = height;
      focusRing.pos = createVector2(centerX, centerY);
    });
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

  if (typeof legacyContext.onKeyPress === "function") {
    const tabListener = legacyContext.onKeyPress("tab", () => {
      if (typeof legacyContext.isKeyDown === "function" && legacyContext.isKeyDown("shift")) {
        focusPrev();
      } else {
        focusNext();
      }
    });
    if (tabListener?.cancel) eventCleanups.push(() => tabListener.cancel());

    const downListener = legacyContext.onKeyPress("down", focusNext);
    if (downListener?.cancel) eventCleanups.push(() => downListener.cancel());

    const rightListener = legacyContext.onKeyPress("right", focusNext);
    if (rightListener?.cancel) eventCleanups.push(() => rightListener.cancel());

    const upListener = legacyContext.onKeyPress("up", focusPrev);
    if (upListener?.cancel) eventCleanups.push(() => upListener.cancel());

    const leftListener = legacyContext.onKeyPress("left", focusPrev);
    if (leftListener?.cancel) eventCleanups.push(() => leftListener.cancel());

    const enterListener = legacyContext.onKeyPress("enter", activateCurrent);
    if (enterListener?.cancel) eventCleanups.push(() => enterListener.cancel());

    const spaceListener = legacyContext.onKeyPress("space", activateCurrent);
    if (spaceListener?.cancel) eventCleanups.push(() => spaceListener.cancel());

    if (onEscape) {
      const escListener = legacyContext.onKeyPress("escape", onEscape);
      if (escListener?.cancel) eventCleanups.push(() => escListener.cancel());
    }
  }

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
      if (updateCancelHandle && typeof updateCancelHandle.cancel === "function") {
        updateCancelHandle.cancel();
      }
      if (typeof legacyContext.destroy === "function") {
        legacyContext.destroy(focusRing);
      }
    } catch {}

    if (options.restoreFocusOnDestroy) {
      const snapshot = popFocusSnapshot();
      snapshot?.onRestore?.();
    }
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

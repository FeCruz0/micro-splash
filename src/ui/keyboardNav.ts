/**
 * Gerenciador de Navegação por Teclado e Foco Acessível (WCAG 2.1 AA) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { audioSystem } from "../systems/audioSystem";
import type { IRenderEngine, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";

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
  updateItems: (items: FocusableItem[], newIndex?: number) => void;
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
  let items = options.items;
  const { onEscape, initialIndex = -1 } = options;
  let currentIndex = initialIndex;
  const eventCleanups: Array<() => void> = [];

  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  if (resolvedRenderEngine) {
    const setFocus = (newIndex: number) => {
      if (items.length === 0) return;

      if (currentIndex >= 0 && currentIndex < items.length) {
        try {
          items[currentIndex].onBlur?.();
        } catch {}
      }

      currentIndex = (newIndex + items.length) % items.length;
      const item = items[currentIndex];

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
      if (currentIndex >= 0 && currentIndex < items.length) {
        try {
          items[currentIndex].onBlur?.();
        } catch {}
      }
      eventCleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch {}
      });

      if (options.restoreFocusOnDestroy) {
        const snapshot = popFocusSnapshot();
        snapshot?.onRestore?.();
      }
    };

    const updateItems = (newItems: FocusableItem[], newIndex?: number) => {
      items = newItems;
      if (items.length === 0) {
        currentIndex = -1;
        return;
      }
      const targetIndex =
        typeof newIndex === "number"
          ? newIndex
          : currentIndex >= items.length
            ? items.length - 1
            : Math.max(0, currentIndex);
      setFocus(targetIndex);
    };

    return {
      focusNext,
      focusPrev,
      focusIndex: setFocus,
      activateCurrent,
      getCurrentIndex: () => currentIndex,
      updateItems,
      destroy,
    };
  }

  // Fallback e interoperabilidade para contexto legado (sem moldura amarela externa)
  const legacyContext = engineOrContext as LegacyKeyboardNavContext;

  const setFocus = (newIndex: number) => {
    if (items.length === 0) return;

    if (currentIndex >= 0 && currentIndex < items.length) {
      try {
        items[currentIndex].onBlur?.();
      } catch {}
    }

    currentIndex = (newIndex + items.length) % items.length;
    const item = items[currentIndex];

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
    if (currentIndex >= 0 && currentIndex < items.length) {
      try {
        items[currentIndex].onBlur?.();
      } catch {}
    }
    eventCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {}
    });

    if (options.restoreFocusOnDestroy) {
      const snapshot = popFocusSnapshot();
      snapshot?.onRestore?.();
    }
  };

  const updateItems = (newItems: FocusableItem[], newIndex?: number) => {
    items = newItems;
    if (items.length === 0) {
      currentIndex = -1;
      return;
    }
    const targetIndex =
      typeof newIndex === "number"
        ? newIndex
        : currentIndex >= items.length
          ? items.length - 1
          : Math.max(0, currentIndex);
    setFocus(targetIndex);
  };

  return {
    focusNext,
    focusPrev,
    focusIndex: setFocus,
    activateCurrent,
    getCurrentIndex: () => currentIndex,
    updateItems,
    destroy,
  };
}

/**
 * Tipagens e Contratos para o Códice Oceânico (WBS 2.24) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com tipagem estrita e zero any.
 */

import type { FocusableItem } from "../keyboardNav";

export type CodexTabId = "species" | "route" | "conservation";

export interface ShowCodexEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyCodexUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  destroy?(): void;
  onHoverUpdate(callback: () => void): unknown;
  onHoverEnd(callback: () => void): unknown;
  onClick(callback: () => void): unknown;
}

export interface LegacyCodexEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): LegacyCodexUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  circle(radius: number): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top"): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  area(): unknown;
  scale(factor: number): unknown;
  scale(factor: { x: number; y: number }): unknown;
  text(content: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  vec2(x: number, y: number): { x: number; y: number };
  rand?(min: number, max: number): number;
  dt?(): number;
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  wait?(duration: number, callback: () => void): void;
  easings?: {
    easeOutBack?: unknown;
    easeInQuad?: unknown;
    easeOutQuad?: unknown;
    [key: string]: unknown;
  };
}

export interface CodexTabContext {
  k: LegacyCodexEngineContext;
  cX: number;
  cY: number;
  cardW: number;
  cardH: number;
  contentBoxTop: number;
  contentBoxBottom: number;
  contentBoxH: number;
  contentElements: Array<{ destroy?: () => void } | object>;
  dynamicFocusItems: FocusableItem[];
}

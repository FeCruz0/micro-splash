/**
 * Tipagens e Contratos para a Camada de Opções (WBS 2.20) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte a IRenderEngine e contextos legados.
 * Pureza de tipos com zero any.
 */

import type { FocusableItem } from "../keyboardNav";
import type { ResolutionKey, DisplayMode, LetterboxColor } from "../../config";
import type { IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";

export interface LegacyOptionsUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  destroy?(): void;
  onHoverUpdate(callback: () => void): unknown;
  onHoverEnd(callback: () => void): unknown;
  onClick(callback: () => void): unknown;
}

export interface LegacyOptionsEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): LegacyOptionsUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  circle(radius: number): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right"): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  area(): unknown;
  scale(factor: number): unknown;
  scale(factor: { x: number; y: number }): unknown;
  text(content: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  wait?(duration: number, callback: () => void): void;
  vec2(x: number, y: number): { x: number; y: number };
  isFullscreen(): boolean;
  setFullscreen(enable?: boolean): void;
  isKeyDown?(key: "shift"): boolean;
  dt?(): number;
  onKeyPress(
    key: "left" | "right" | "escape" | "enter" | "tab" | "space" | "up" | "down" | string,
    callback: () => void
  ): { cancel: () => void };
}

export interface OptionsScreenContext<
  TEngine = LegacyOptionsEngineContext,
  TObj = { destroy?: () => void } | object,
> {
  k: TEngine;
  elements: TObj[];
  focusItems: FocusableItem[];
  col0X: number;
  col1X: number;
  colW: number;
  btnH: number;
  rowGap: number;
  rowStartY: number;
  cardTop: number;
  cardW: number;
  cX: number;
  cY: number;
  getCurrentResKey: () => ResolutionKey;
  setCurrentResKey: (key: ResolutionKey) => void;
  getCurrentDisplayMode: () => DisplayMode;
  setCurrentDisplayMode: (mode: DisplayMode) => void;
  getCurrentLetterboxColor: () => LetterboxColor;
  setCurrentLetterboxColor: (color: LetterboxColor) => void;
  updateReloadHint: () => void;
  isClosed: () => boolean;
  isModalOpen: () => boolean;
  setIsModalOpen: (open: boolean) => void;
  close: () => void;
}

export type AnyOptionsContext = OptionsScreenContext<
  IRenderEngine | LegacyOptionsEngineContext,
  { destroy?: () => void } | object
>;

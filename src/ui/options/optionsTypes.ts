import type { KaboomCtx } from "kaboom";
import type { FocusableItem } from "../keyboardNav";
import type { ResolutionKey, DisplayMode, LetterboxColor } from "../../config";

export interface OptionsScreenContext {
  k: KaboomCtx;
  elements: any[];
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

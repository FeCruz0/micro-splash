import type { KaboomCtx } from "kaboom";
import type { FocusableItem } from "../keyboardNav";

export type CodexTabId = "species" | "route" | "conservation";

export interface CodexTabContext {
  k: KaboomCtx;
  cX: number;
  cY: number;
  cardW: number;
  cardH: number;
  contentBoxTop: number;
  contentBoxBottom: number;
  contentBoxH: number;
  contentElements: any[];
  dynamicFocusItems: FocusableItem[];
}

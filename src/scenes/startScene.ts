import type { KaboomCtx } from "kaboom";
import { registerMenuScene } from "./menuScene";

export function registerStartScene(k: KaboomCtx): void {
  registerMenuScene(k);
  k.scene("start", () => {
    k.go("menu");
  });
}

import type { KaboomCtx } from "kaboom";
import { createKioskScene } from "../systems/kioskMode";

export function registerKioskScene(k: KaboomCtx): void {
  k.scene("kiosk", () => {
    createKioskScene(k);
  });
}

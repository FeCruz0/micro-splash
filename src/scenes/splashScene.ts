import type { KaboomCtx } from "kaboom";
import { createSplashScreen } from "../ui/splashScreen";

export function registerSplashScene(k: KaboomCtx): void {
  k.scene("splash", () => {
    createSplashScreen(k, () => {
      k.go("menu");
    });
  });
}

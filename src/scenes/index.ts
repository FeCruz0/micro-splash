import type { KaboomCtx } from "kaboom";
import { registerSplashScene } from "./splashScene";
import { registerMenuScene } from "./menuScene";
import { registerStartScene } from "./startScene";
import { registerKioskScene } from "./kioskScene";
import { registerGameScene } from "./gameScene";
import { registerRescueScene } from "./rescueScene";
import { registerGameOverScene } from "./gameoverScene";

export function registerAllScenes(k: KaboomCtx): void {
  registerSplashScene(k);
  registerMenuScene(k);
  registerStartScene(k);
  registerKioskScene(k);
  registerGameScene(k);
  registerRescueScene(k);
  registerGameOverScene(k);
}

export {
  registerSplashScene,
  registerMenuScene,
  registerStartScene,
  registerKioskScene,
  registerGameScene,
  registerRescueScene,
  registerGameOverScene,
};

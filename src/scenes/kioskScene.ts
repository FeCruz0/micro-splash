import { createKioskScene, type ShowKioskEngineContext } from "../systems/kioskMode";

export interface KioskSceneEngineContext extends ShowKioskEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
}

export function registerKioskScene(k: KioskSceneEngineContext): void {
  k.scene("kiosk", () => {
    createKioskScene(k);
  });
}

import { registerMenuScene, type MenuSceneEngineContext } from "./menuScene";

export interface StartSceneEngineContext extends MenuSceneEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function registerStartScene(k: StartSceneEngineContext): void {
  registerMenuScene(k);
  k.scene("start", () => {
    k.go("menu");
  });
}

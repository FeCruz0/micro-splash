import { createSplashScreen, type ShowSplashEngineContext } from "../ui/splashScreen";

export interface SplashSceneEngineContext extends ShowSplashEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  go(id: string, ...args: unknown[]): unknown;
}

export function registerSplashScene(k: SplashSceneEngineContext): void {
  k.scene("splash", () => {
    createSplashScreen(k, () => {
      k.go("menu");
    });
  });
}

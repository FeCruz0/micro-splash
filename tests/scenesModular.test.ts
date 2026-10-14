import { describe, it, expect, vi } from "vitest";
import {
  registerAllScenes,
  registerSplashScene,
  registerMenuScene,
  registerStartScene,
  registerKioskScene,
  registerGameScene,
  registerRescueScene,
  registerGameOverScene,
} from "../src/scenes";

describe("Decomposição Modular de Cenas (Fase 37.7 - Etapa 4.5)", () => {
  function createMockKaboom() {
    const scenes = new Map<string, Function>();
    return {
      scenes,
      scene: vi.fn((name: string, handler: Function) => {
        scenes.set(name, handler);
      }),
      go: vi.fn(),
      setGravity: vi.fn(),
      width: () => 640,
      height: () => 360,
      add: vi.fn(() => ({
        pos: { x: 0, y: 0 },
        opacity: 1,
      })),
      rect: vi.fn(),
      polygon: vi.fn(),
      circle: vi.fn(),
      pos: vi.fn(),
      color: vi.fn(),
      opacity: vi.fn(),
      fixed: vi.fn(),
      z: vi.fn(),
      area: vi.fn(),
      body: vi.fn(),
      text: vi.fn(),
      tween: vi.fn(() => Promise.resolve()),
      easings: { easeOutQuad: () => {} },
      onSceneLeave: vi.fn(),
      onKeyPress: vi.fn(),
      onMousePress: vi.fn(),
      onUpdate: vi.fn(),
      wait: vi.fn(),
      destroy: vi.fn(),
      camPos: () => ({ x: 0, y: 0 }),
      dt: () => 0.016,
      get: vi.fn(() => []),
    } as any;
  }

  it("registra individualmente cada cena do jogo com identificadores corretos", () => {
    const mockK = createMockKaboom();

    registerSplashScene(mockK);
    expect(mockK.scenes.has("splash")).toBe(true);

    registerMenuScene(mockK);
    expect(mockK.scenes.has("menu")).toBe(true);

    registerStartScene(mockK);
    expect(mockK.scenes.has("start")).toBe(true);

    registerKioskScene(mockK);
    expect(mockK.scenes.has("kiosk")).toBe(true);

    registerGameScene(mockK);
    expect(mockK.scenes.has("game")).toBe(true);

    registerRescueScene(mockK);
    expect(mockK.scenes.has("rescue")).toBe(true);

    registerGameOverScene(mockK);
    expect(mockK.scenes.has("gameover")).toBe(true);
  });

  it("registerAllScenes registra todas as cenas de uma vez", () => {
    const mockK = createMockKaboom();
    registerAllScenes(mockK);

    expect(mockK.scenes.has("splash")).toBe(true);
    expect(mockK.scenes.has("menu")).toBe(true);
    expect(mockK.scenes.has("start")).toBe(true);
    expect(mockK.scenes.has("kiosk")).toBe(true);
    expect(mockK.scenes.has("game")).toBe(true);
    expect(mockK.scenes.has("rescue")).toBe(true);
    expect(mockK.scenes.has("gameover")).toBe(true);
  });

  it("cena start redireciona para menu", () => {
    const mockK = createMockKaboom();
    registerStartScene(mockK);

    const startHandler = mockK.scenes.get("start");
    expect(startHandler).toBeDefined();
    startHandler!();
    expect(mockK.go).toHaveBeenCalledWith("menu");
  });
});

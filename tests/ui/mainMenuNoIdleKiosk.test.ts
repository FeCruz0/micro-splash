import { beforeEach, describe, expect, it, vi } from "vitest";

describe("mainMenu — remoção do modo descanso / demonstração automática", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("micro_splash_onboarding_done", "true");
    localStorage.setItem("micro_splash_highscore", "32395");
  });

  it("permanece aberto indefinidamente após > 60s de inatividade sem chamar go('kiosk')", async () => {
    const { createMainMenu } = await import("../../src/ui/mainMenu");

    const updateCallbacks: Array<() => void> = [];
    const createdNodes: Array<{
      onUpdate: ReturnType<typeof vi.fn>;
      onClick: ReturnType<typeof vi.fn>;
      onHoverUpdate: ReturnType<typeof vi.fn>;
      onHoverEnd: ReturnType<typeof vi.fn>;
    }> = [];
    const cancelSpy = vi.fn();

    const mockK: any = {
      width: () => 1280,
      height: () => 720,
      vec2: (x: number, y: number) => ({ x, y }),
      rgb: (r: number, g: number, b: number) => [r, g, b],
      rect: vi.fn((w, h, opt) => ({ type: "rect", w, h, opt })),
      circle: vi.fn(() => ({ type: "circle" })),
      pos: vi.fn((x, y) => ({ pos: { x, y } })),
      color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
      outline: vi.fn((w, c) => ({ outline: { w, c } })),
      opacity: vi.fn((op) => ({ opacity: op })),
      anchor: vi.fn((a) => ({ anchor: a })),
      fixed: vi.fn(() => ({ fixed: true })),
      scale: vi.fn((s) => ({ scale: s })),
      z: vi.fn((z) => ({ z })),
      text: vi.fn((t, opt) => ({ text: t, opt })),
      area: vi.fn(() => ({ area: true })),
      dt: () => 1.0,
      rand: () => 0.5,
      go: vi.fn(),
      add: vi.fn((obj) => {
        const node = {
          ...obj,
          onUpdate: vi.fn((cb: () => void) => {
            updateCallbacks.push(cb);
            return { cancel: cancelSpy };
          }),
          onClick: vi.fn(),
          onHoverUpdate: vi.fn(),
          onHoverEnd: vi.fn(),
          destroy: vi.fn(),
        };
        createdNodes.push(node);
        return node;
      }),
      onKeyPress: vi.fn(() => ({ cancel: cancelSpy })),
      onMousePress: vi.fn(() => ({ cancel: cancelSpy })),
      onMouseMove: vi.fn(() => ({ cancel: cancelSpy })),
      onGamepadButtonPress: vi.fn(() => ({ cancel: cancelSpy })),
      onUpdate: vi.fn((cb: () => void) => {
        updateCallbacks.push(cb);
        return { cancel: cancelSpy };
      }),
    };

    const onStartMigration = vi.fn();
    const onOptions = vi.fn();
    const onCodex = vi.fn();
    const onLeaderboard = vi.fn();

    const destroyMenu = createMainMenu(mockK, onStartMigration, onOptions, onCodex, onLeaderboard);

    // Simula 65 segundos de inatividade (acima do antigo timeout de 45s)
    for (let sec = 0; sec < 65; sec++) {
      for (const cb of updateCallbacks) {
        cb();
      }
    }

    expect(mockK.go).not.toHaveBeenCalled();
    expect(mockK.onMouseMove).not.toHaveBeenCalled();

    // Verifica que botões continuam registrando interações manuais normalmente
    const clickableNodes = createdNodes.filter((n) => n.onClick.mock.calls.length > 0);
    expect(clickableNodes.length).toBeGreaterThanOrEqual(5);

    const firstButtonClick = clickableNodes[0].onClick.mock.calls[0][0] as () => void;
    firstButtonClick();
    expect(onStartMigration).toHaveBeenCalledTimes(1);

    destroyMenu();
    expect(cancelSpy).toHaveBeenCalled();
  });
});

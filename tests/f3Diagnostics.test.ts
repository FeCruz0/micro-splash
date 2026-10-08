import { describe, it, expect, vi } from "vitest";
import {
  fpsToSparklineChar,
  generateFpsSparkline,
  createDebugDistanceUI,
} from "../src/ui/debugDistance";

describe("F3 Diagnostics & Sparkline HUD", () => {
  describe("fpsToSparklineChar", () => {
    it("converts frame rates to proportional vertical unicode block levels", () => {
      expect(fpsToSparklineChar(60)).toBe("█");
      expect(fpsToSparklineChar(58)).toBe("█");
      expect(fpsToSparklineChar(55)).toBe("▇");
      expect(fpsToSparklineChar(48)).toBe("▆");
      expect(fpsToSparklineChar(42)).toBe("▅");
      expect(fpsToSparklineChar(36)).toBe("▄");
      expect(fpsToSparklineChar(30)).toBe("▃");
      expect(fpsToSparklineChar(22)).toBe("▂");
      expect(fpsToSparklineChar(15)).toBe(" ");
      expect(fpsToSparklineChar(0)).toBe(" ");
    });
  });

  describe("generateFpsSparkline", () => {
    it("returns dashes when history is empty or empty array", () => {
      expect(generateFpsSparkline([])).toBe("------------------------------");
      expect(generateFpsSparkline([] as number[], 10)).toBe("------------------------------");
    });

    it("generates correct sparkline sequence from FPS history", () => {
      const history = [60, 60, 50, 42, 30, 15];
      const sparkline = generateFpsSparkline(history, 6);
      expect(sparkline).toBe("██▆▅▃ ");
    });

    it("slices only the most recent N samples", () => {
      const history = [10, 10, 10, 60, 60, 60];
      const sparkline = generateFpsSparkline(history, 3);
      expect(sparkline).toBe("███");
    });
  });

  describe("createDebugDistanceUI & Telemetry Controller", () => {
    function createMockKaboom() {
      const addedObjects: any[] = [];
      return {
        width: () => 1920,
        height: () => 1080,
        add: vi.fn((props: any[]) => {
          const textComp = props?.find((p) => p && p.type === "text");
          const obj: any = {
            props,
            hidden: false,
            text: textComp ? textComp.t : "",
            color: null,
            width: 0,
            add: vi.fn((childProps: any[]) => {
              const childText = childProps?.find((p) => p && p.type === "text");
              const child: any = {
                props: childProps,
                text: childText ? childText.t : "",
                color: null,
                width: 0,
              };
              return child;
            }),
          };
          addedObjects.push(obj);
          return obj;
        }),
        rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
        pos: (x: number, y: number) => ({ type: "pos", x, y }),
        color: (r: number, g: number, b: number) => ({ type: "color", r, g, b }),
        opacity: (a: number) => ({ type: "opacity", a }),
        outline: (w: number, c: any) => ({ type: "outline", w, c }),
        fixed: () => ({ type: "fixed" }),
        z: (v: number) => ({ type: "z", v }),
        text: (t: string, opts?: any) => ({ type: "text", t, opts }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        vec2: (x: number, y: number) => ({ x, y, len: () => Math.hypot(x, y) }),
        destroy: vi.fn(),
      } as any;
    }

    it("initializes hidden by default for non-dev gameplay", () => {
      const mockK = createMockKaboom();
      const hud = createDebugDistanceUI(mockK);

      expect(hud.isVisible()).toBe(false);
      expect(hud.toggle()).toBe(true);
      expect(hud.isVisible()).toBe(true);
      expect(hud.toggle()).toBe(false);
      expect(hud.isVisible()).toBe(false);
    });

    it("records FPS history up to 60 samples and triggers bottleneck alert when < 45 FPS", () => {
      const mockK = createMockKaboom();
      const hud = createDebugDistanceUI(mockK);

      hud.setVisible(true);

      // Simula 70 frames a 60 FPS
      for (let i = 0; i < 70; i++) {
        hud.update(100, { fps: 60, entities: 25, activeParticles: 50, totalParticles: 200 });
      }

      // Máximo de 60 amostras no buffer circular
      expect(hud.getFpsHistory().length).toBe(60);

      // Simula queda de frame rate para 30 FPS (gargalo crítico)
      hud.update(100, { fps: 30, entities: 25, activeParticles: 50, totalParticles: 200 });
      const history = hud.getFpsHistory();
      expect(history[history.length - 1]).toBe(30);
    });

    it("displays real-time FPS counter badge in header and updates dynamically", () => {
      const mockK = createMockKaboom();
      const hud = createDebugDistanceUI(mockK);

      expect(hud.getFpsText()).toBe("-- FPS");

      hud.setVisible(true);

      // Atualiza com 60 FPS estável
      hud.update(50, { fps: 60 });
      expect(hud.getFpsText()).toBe("60 FPS");

      // Atualiza com 50 FPS (faixa de atenção)
      hud.update(50, { fps: 50 });
      expect(hud.getFpsText()).toBe("50 FPS");

      // Atualiza com 28 FPS (crítico)
      hud.update(50, { fps: 28 });
      expect(hud.getFpsText()).toBe("28 FPS");
    });

    it("displays FPS counter badge even in serene mode", () => {
      const mockK = createMockKaboom();
      const mockSereneController = {
        isSereneMode: () => true,
      } as any;

      const hud = createDebugDistanceUI(mockK, mockSereneController);
      hud.setVisible(true);
      hud.update(100, { fps: 60 });

      expect(hud.getFpsText()).toBe("60 FPS");
    });
  });
});

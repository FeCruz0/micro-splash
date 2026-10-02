import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  RESOLUTION_PRESETS,
  getSavedResolution,
  setSavedResolution,
  getDeviceResolutionStorageKey,
  detectNativeResolution,
  calculateAspectRatio,
  getSavedLetterboxColor,
  setSavedLetterboxColor,
} from "../src/config";
import { setupLetterboxBorders } from "../src/systems/letterboxSystem";
import { formatResolutionInfo } from "../src/ui/debugDistance";

describe("Fase 33: Sistema de Resoluções, Modos de Tela & Responsividade", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("33.1 — Presets de Alta Resolução 16:9 sem Distorção", () => {
    it("inclui presets de alta definição 4K, 1440p (2K) e 1080p", () => {
      expect(RESOLUTION_PRESETS["4K"]).toBeDefined();
      expect(RESOLUTION_PRESETS["4K"].width).toBe(3840);
      expect(RESOLUTION_PRESETS["4K"].height).toBe(2160);
      expect(RESOLUTION_PRESETS["4K"].aspect).toBe("16:9");

      expect(RESOLUTION_PRESETS["1440p"]).toBeDefined();
      expect(RESOLUTION_PRESETS["1440p"].width).toBe(2560);
      expect(RESOLUTION_PRESETS["1440p"].height).toBe(1440);
      expect(RESOLUTION_PRESETS["1440p"].aspect).toBe("16:9");

      expect(RESOLUTION_PRESETS["1080p"]).toBeDefined();
      expect(RESOLUTION_PRESETS["1080p"].width).toBe(1920);
      expect(RESOLUTION_PRESETS["1080p"].height).toBe(1080);
      expect(RESOLUTION_PRESETS["1080p"].aspect).toBe("16:9");

      expect((RESOLUTION_PRESETS as any)["720p"]).toBeUndefined();
    });

    it("garante proporção 16:9 matemática estrita em todos os presets selecionados", () => {
      Object.keys(RESOLUTION_PRESETS).forEach((k) => {
        const p = RESOLUTION_PRESETS[k as keyof typeof RESOLUTION_PRESETS];
        const ratio = p.width / p.height;
        expect(ratio).toBeCloseTo(16 / 9, 2);
      });
    });
  });

  describe("33.2 — Detecção Automática (Preset 'auto')", () => {
    it("detecta a resolução da tela nativa com formato numérico e textual", () => {
      const detected = detectNativeResolution();
      expect(detected.width).toBeGreaterThan(0);
      expect(detected.height).toBeGreaterThan(0);
      expect(detected.detectedLabel).toContain("×");
    });

    it("retorna resolução dinâmica quando o usuário seleciona 'auto'", () => {
      setSavedResolution("auto");
      const res = getSavedResolution();
      expect(res.key).toBe("auto");
      expect(res.label).toContain("Auto (Detectado:");
      expect(res.label).toContain("🔍");
      expect(res.width).toBeGreaterThan(0);
      expect(res.height).toBeGreaterThan(0);
    });
  });

  describe("33.6 — Persistência de Resolução por Dispositivo", () => {
    it("gera chave de storage individualizada por dimensões de tela", () => {
      const key = getDeviceResolutionStorageKey();
      expect(key).toMatch(/^micro_splash_resolution/);
    });

    it("persiste a resolução tanto na chave do dispositivo quanto na chave global de fallback", () => {
      const deviceKey = getDeviceResolutionStorageKey();
      setSavedResolution("1440p");

      expect(localStorage.getItem(deviceKey)).toBe("1440p");
      expect(localStorage.getItem("micro_splash_resolution")).toBe("1440p");

      const saved = getSavedResolution();
      expect(saved.key).toBe("1440p");
      expect(saved.width).toBe(2560);
      expect(saved.height).toBe(1440);
    });
  });

  describe("33.7 — Cálculo de Proporção para Mini-Preview", () => {
    it("identifica corretamente proporções comuns de monitores e telas", () => {
      expect(calculateAspectRatio(1920, 1080).ratioText).toBe("16:9");
      expect(calculateAspectRatio(2560, 1440).ratioText).toBe("16:9");
      expect(calculateAspectRatio(3840, 2160).ratioText).toBe("16:9");
      expect(calculateAspectRatio(3440, 1440).ratioText).toBe("21:9");
      expect(calculateAspectRatio(5120, 1440).ratioText).toBe("32:9");
      expect(calculateAspectRatio(768, 1024).ratioText).toBe("3:4");
    });
  });

  describe("33.4 — Modo Letterbox com Cores Customizadas", () => {
    it("gerencia a cor da borda de letterbox com padrão preto e suporte a azul oceânico", () => {
      expect(getSavedLetterboxColor()).toBe("black");

      setSavedLetterboxColor("ocean");
      expect(getSavedLetterboxColor()).toBe("ocean");

      setSavedLetterboxColor("black");
      expect(getSavedLetterboxColor()).toBe("black");
    });

    it("cria e atualiza retângulos de borda de letterbox quando ativado", () => {
      localStorage.setItem("micro_splash_display_mode", "letterbox");
      const addedObjs: any[] = [];
      const destroyedObjs: any[] = [];

      const mockKaboom: any = {
        width: () => 1280,
        height: () => 720,
        rect: vi.fn((w, h) => ({ type: "rect", w, h })),
        pos: vi.fn((x, y) => ({ type: "pos", x, y })),
        color: vi.fn((c) => ({ type: "color", c })),
        rgb: vi.fn((r, g, b) => ({ r, g, b })),
        fixed: vi.fn(() => ({ type: "fixed" })),
        z: vi.fn((z) => ({ type: "z", z })),
        add: vi.fn((comps) => {
          const obj = { comps, color: null, pos: { x: 0, y: 0 } };
          addedObjs.push(obj);
          return obj;
        }),
        destroy: vi.fn((obj) => {
          destroyedObjs.push(obj);
        }),
      };

      const handle = setupLetterboxBorders(mockKaboom);
      expect(addedObjs.length).toBe(4); // Top, Bottom, Left, Right borders

      handle.setColor("ocean");
      handle.update();
      handle.destroy();
      expect(destroyedObjs.length).toBe(4);
    });
  });

  describe("33.8 — Indicador de Resolução no HUD F3", () => {
    it("formata a resolução e o modo de tela de forma concisa e legível", () => {
      const mockKaboom: any = {
        width: () => 1920,
        height: () => 1080,
      };

      localStorage.setItem("micro_splash_display_mode", "stretch");
      expect(formatResolutionInfo(mockKaboom)).toBe("1920×1080 (Preencher)");

      localStorage.setItem("micro_splash_display_mode", "letterbox");
      expect(formatResolutionInfo(mockKaboom)).toBe("1920×1080 (Bordas)");
    });
  });
});

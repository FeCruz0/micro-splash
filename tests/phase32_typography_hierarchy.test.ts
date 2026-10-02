import { describe, it, expect, vi } from "vitest";
import {
  FONT_TITLE,
  FONT_BODY,
  TEXT_SIZE_DISPLAY,
  TEXT_SIZE_H1,
  TEXT_SIZE_H2,
  TEXT_SIZE_BODY,
  TEXT_SIZE_CAPTION,
  BIOME_COLOR_STOPS,
} from "../src/config";
import {
  METERS_PER_NAUTICAL_MILE,
  toNauticalMiles,
  formatDualDistance,
  toNauticalMilesValue,
} from "../src/utils/navigation";
import { getBiomeHudInfo } from "../src/ui/hudSystem";
import { addShadowedText } from "../src/ui/textUtils";
import { createKeyBadge } from "../src/ui/keyBadge";

describe("Fase 32: Tipografia, Texto & Hierarquia Visual", () => {
  describe("32.1 & 32.2 — Design Tokens Tipográficos e Escala Visual", () => {
    it("define as fontes Orbitron e Inter como tokens centrais", () => {
      expect(FONT_TITLE).toBe("Orbitron");
      expect(FONT_BODY).toBe("Inter");
    });

    it("respeita a escala tipográfica hierárquica estrita", () => {
      expect(TEXT_SIZE_DISPLAY).toBe(44);
      expect(TEXT_SIZE_H1).toBe(24);
      expect(TEXT_SIZE_H2).toBe(18);
      expect(TEXT_SIZE_BODY).toBe(14);
      expect(TEXT_SIZE_CAPTION).toBe(11);

      // Hierarquia estrita do maior para o menor
      expect(TEXT_SIZE_DISPLAY).toBeGreaterThan(TEXT_SIZE_H1);
      expect(TEXT_SIZE_H1).toBeGreaterThan(TEXT_SIZE_H2);
      expect(TEXT_SIZE_H2).toBeGreaterThan(TEXT_SIZE_BODY);
      expect(TEXT_SIZE_BODY).toBeGreaterThan(TEXT_SIZE_CAPTION);
    });
  });

  describe("32.5 — Formatação de Medidas em Milhas Náuticas", () => {
    it("utiliza a constante oficial internacional de 1.852 metros por milha náutica", () => {
      expect(METERS_PER_NAUTICAL_MILE).toBe(1852);
    });

    it("converte metros para milhas náuticas com precisão decimal no padrão pt-BR", () => {
      expect(toNauticalMiles(0)).toBe("0,0 mn");
      expect(toNauticalMiles(1852)).toBe("1,0 mn");
      expect(toNauticalMiles(3704)).toBe("2,0 mn");
      expect(toNauticalMiles(14238)).toBe("7,7 mn");
    });

    it("fornece valor numérico de milhas náuticas seguro", () => {
      expect(toNauticalMilesValue(1852)).toBe(1.0);
      expect(toNauticalMilesValue(0)).toBe(0);
      expect(toNauticalMilesValue(-500)).toBe(0);
      expect(toNauticalMilesValue(14238)).toBe(7.7);
    });

    it("formata distância dupla em metros e milhas náuticas em paralelo", () => {
      expect(formatDualDistance(0)).toBe("0m • 0,0 mn");
      expect(formatDualDistance(14238)).toBe("14.238m • 7,7 mn");
      expect(formatDualDistance(30000)).toBe("30.000m • 16,2 mn");
    });
  });

  describe("32.6 — Consistência de Nomes e Indicadores de Biomas no HUD", () => {
    it("retorna biomas com nomes harmonizados e emojis correspondentes", () => {
      const antartica = getBiomeHudInfo(2500);
      expect(antartica.name).toBe("Oceano Antártico");
      expect(antartica.emoji).toBe("❄️");

      const pelagica = getBiomeHudInfo(8000);
      expect(pelagica.name).toBe("Travessia Pelágica");
      expect(pelagica.emoji).toBe("🌊");

      const costa = getBiomeHudInfo(15000);
      expect(costa.name).toBe("Costa Urbana");
      expect(costa.emoji).toBe("🏭");

      const canyons = getBiomeHudInfo(22000);
      expect(canyons.name).toBe("Cânions & Ressurgência");
      expect(canyons.emoji).toBe("🌀");

      const arraial = getBiomeHudInfo(28000);
      expect(arraial.name).toBe("Santuário de Arraial");
      expect(arraial.emoji).toBe("☀️");
    });

    it("calcula percentual de progresso entre 0% e 100%", () => {
      expect(getBiomeHudInfo(0).progressPercent).toBe(0);
      expect(getBiomeHudInfo(15000).progressPercent).toBe(50);
      expect(getBiomeHudInfo(30000).progressPercent).toBe(100);
      expect(getBiomeHudInfo(35000).progressPercent).toBe(100);
    });

    it("alinha-se com as faixas de distância de BIOME_COLOR_STOPS", () => {
      expect(BIOME_COLOR_STOPS.length).toBe(5);
      expect(BIOME_COLOR_STOPS[0].distanceStart).toBe(0);
      expect(BIOME_COLOR_STOPS[4].distanceEnd).toBe(30000);
    });
  });

  describe("32.3 — Utilitário de Sombra de Legibilidade (addShadowedText)", () => {
    it("adiciona texto principal e sombra de legibilidade com z offset e cores distintas", () => {
      const addedObjs: any[] = [];
      const destroyedObjs: any[] = [];

      const mockKaboom: any = {
        text: vi.fn((txt, opts) => ({ type: "text", txt, opts })),
        pos: vi.fn((x, y) => ({ type: "pos", x, y })),
        anchor: vi.fn((a) => ({ type: "anchor", a })),
        color: vi.fn((c) => ({ type: "color", c })),
        opacity: vi.fn((o) => ({ type: "opacity", o })),
        z: vi.fn((z) => ({ type: "z", z })),
        fixed: vi.fn(() => ({ type: "fixed" })),
        rgb: vi.fn((r, g, b) => ({ r, g, b })),
        add: vi.fn((comps) => {
          const obj = { comps, text: comps[0].txt, exists: () => true };
          addedObjs.push(obj);
          return obj;
        }),
        destroy: vi.fn((obj) => {
          destroyedObjs.push(obj);
        }),
      };

      const handle = addShadowedText(mockKaboom, "TESTE TÍTULO", {
        pos: { x: 100, y: 50 } as any,
        size: 24,
        font: FONT_TITLE,
        z: 20,
      });

      expect(addedObjs.length).toBe(2); // Sombra + Texto Principal
      expect(handle.main).toBeDefined();
      expect(handle.shadow).toBeDefined();

      // Atualização de texto sincronizada
      handle.setText("NOVO TÍTULO");
      expect(handle.main.text).toBe("NOVO TÍTULO");
      expect(handle.shadow.text).toBe("NOVO TÍTULO");

      // Destruição de ambos os objetos
      handle.destroy();
      expect(destroyedObjs.length).toBe(2);
    });
  });

  describe("32.8 — Componente Visual de Tecla Física (createKeyBadge)", () => {
    it("cria estrutura visual de tecla com sombra 3D, contorno e rótulo centralizado", () => {
      const addedObjs: any[] = [];
      const destroyedObjs: any[] = [];

      const mockKaboom: any = {
        rect: vi.fn((w, h, opts) => ({ type: "rect", w, h, opts })),
        text: vi.fn((txt, opts) => ({ type: "text", txt, opts })),
        pos: vi.fn((x, y) => ({ type: "pos", x, y })),
        anchor: vi.fn((a) => ({ type: "anchor", a })),
        color: vi.fn((c) => ({ type: "color", c })),
        outline: vi.fn((w, c) => ({ type: "outline", w, c })),
        opacity: vi.fn((o) => ({ type: "opacity", o })),
        z: vi.fn((z) => ({ type: "z", z })),
        fixed: vi.fn(() => ({ type: "fixed" })),
        rgb: vi.fn((r, g, b) => ({ r, g, b })),
        add: vi.fn((comps) => {
          const obj = { comps, exists: () => true };
          addedObjs.push(obj);
          return obj;
        }),
        destroy: vi.fn((obj) => {
          destroyedObjs.push(obj);
        }),
      };

      const badge = createKeyBadge(mockKaboom, {
        pos: { x: 200, y: 150 } as any,
        keyLabel: "ESPAÇO",
        fontSize: 12,
        z: 15,
      });

      expect(badge.elements.length).toBe(3); // baseShadow + keyCap + keyText
      expect(badge.width).toBeGreaterThanOrEqual(50);
      expect(badge.height).toBeGreaterThan(20);

      badge.destroy();
      expect(destroyedObjs.length).toBe(3);
    });
  });
});

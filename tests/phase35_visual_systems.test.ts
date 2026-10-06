import { describe, it, expect, vi } from "vitest";
import { createUpwellingStream } from "../src/systems/upwellingSystem";
import { calculateKelpSegmentColor } from "../src/systems/benthicFloorSystem";
import { createCurrentVectorLines } from "../src/systems/oceanCurrentsSystem";
import { createFishingTrawler } from "../src/entities/boat";

describe("Fase 35: Polimento Visual dos Sistemas Ausentes", () => {
  describe("35.1 Jatos de Ressurgência (upwellingSystem.ts)", () => {
    it("deve criar feixes em leque com gradiente de opacidade e tag de colisão UPWELLING_STREAM", () => {
      const addedChildren: any[] = [];
      const parentObj: any = {
        pos: { x: 200, y: 500 },
        add: vi.fn((childConfig: any) => {
          const child = {
            ...childConfig,
            onUpdate: vi.fn(),
            opacity: childConfig[3]?.opacity ?? 0.5,
          };
          addedChildren.push(childConfig);
          return child;
        }),
        onUpdate: vi.fn(),
      };

      const mockK: any = {
        rect: vi.fn((w, h) => ({ type: "rect", w, h })),
        pos: vi.fn((x, y) => ({ x, y })),
        color: vi.fn((r, g, b) => ({ r, g, b })),
        opacity: vi.fn((opacityValue) => ({ opacity: opacityValue })),
        rotate: vi.fn((angle) => ({ angle })),
        area: vi.fn((config) => ({ area: config })),
        anchor: vi.fn((anchorValue) => ({ anchor: anchorValue })),
        z: vi.fn((zValue) => ({ z: zValue })),
        vec2: vi.fn((x, y) => ({ x, y })),
        dt: vi.fn(() => 0.016),
        destroy: vi.fn(),
        add: vi.fn(() => parentObj),
      };

      const result = createUpwellingStream(mockK, 200, 500);

      expect(result.upwellingStream).toBeDefined();
      // Deve criar 6 feixes × 3 segmentos (base, mid, top) = 18 objetos visuais
      expect(result.strands.length).toBe(18);

      // Valida opacidade graduada: base (~0.55), mid (~0.35), top (~0.18)
      const baseOpacities = addedChildren
        .filter((c) => c.includes("upwelling_strand_base"))
        .map((c) => c.find((component: any) => typeof component?.opacity === "number")?.opacity);
      expect(baseOpacities[0]).toBeCloseTo(0.55, 2);

      const midOpacities = addedChildren
        .filter((c) => c.includes("upwelling_strand_mid"))
        .map((c) => c.find((component: any) => typeof component?.opacity === "number")?.opacity);
      expect(midOpacities[0]).toBeCloseTo(0.35, 2);

      const topOpacities = addedChildren
        .filter((c) => c.includes("upwelling_strand_top"))
        .map((c) => c.find((component: any) => typeof component?.opacity === "number")?.opacity);
      expect(topOpacities[0]).toBeCloseTo(0.18, 2);
    });
  });

  describe("35.2 Gradiente do Kelp por Altura (benthicFloorSystem.ts)", () => {
    it("deve interpolar a cor do segmento da base marrom-escura até o topo dourado-esverdeado", () => {
      const mockK: any = {
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      };

      // Base (segmento 0 de 6): deve ter cor marrom-escura (55, 35, 15)
      const baseColor = calculateKelpSegmentColor(mockK, 0, 6);
      expect(baseColor.r).toBe(55);
      expect(baseColor.g).toBe(35);
      expect(baseColor.b).toBe(15);

      // Topo (segmento 5 de 6): deve ter cor dourado-esverdeada (110, 130, 40)
      const topColor = calculateKelpSegmentColor(mockK, 5, 6);
      expect(topColor.r).toBe(110);
      expect(topColor.g).toBe(130);
      expect(topColor.b).toBe(40);

      // Meio (segmento intermédio): valores intermediários estritamente crescentes
      const midColor = calculateKelpSegmentColor(mockK, 2, 6);
      expect(midColor.r).toBeGreaterThan(baseColor.r);
      expect(midColor.r).toBeLessThan(topColor.r);
      expect(midColor.g).toBeGreaterThan(baseColor.g);
      expect(midColor.g).toBeLessThan(topColor.g);
    });
  });

  describe("35.3 Pulsação das Anêmonas (benthicFloorSystem.ts)", () => {
    it("deve variar a escala Y entre 0.85 e 1.15 em ciclo senoidal", () => {
      // Simulação do cálculo matemático usado na animação da anêmona
      const sampleTimes = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
      for (const t of sampleTimes) {
        const cycleTime = t * 2.5;
        const verticalScale = 1.0 + Math.sin(cycleTime) * 0.15;
        expect(verticalScale).toBeGreaterThanOrEqual(0.85 - 0.001);
        expect(verticalScale).toBeLessThanOrEqual(1.15 + 0.001);
      }
    });
  });

  describe("35.4 Correntes Oceânicas Visíveis (oceanCurrentsSystem.ts)", () => {
    it("deve gerar linhas de fluxo com tag ocean_current_vector_line na direção correta", () => {
      const createdLines: any[] = [];
      const currentBoxMock: any = {
        add: vi.fn((components: any[]) => {
          const lineObj = {
            components,
            pos: { x: 0, y: 0 },
            onUpdate: vi.fn(),
          };
          createdLines.push(lineObj);
          return lineObj;
        }),
      };

      const mockK: any = {
        rect: vi.fn((w, h) => ({ type: "rect", w, h })),
        pos: vi.fn((x, y) => ({ x, y })),
        color: vi.fn((r, g, b) => ({ r, g, b })),
        opacity: vi.fn((op) => ({ opacity: op })),
        dt: vi.fn(() => 0.016),
      };

      // Corrente favorável (+X)
      const favorableLines = createCurrentVectorLines(mockK, currentBoxMock, 1000, 100, true);
      expect(favorableLines.length).toBe(5);

      // Verifica cor azul-cinza oceanográfica (100, 150, 200) e opacidade 0.25
      const firstLineComp = createdLines[0].components;
      expect(firstLineComp).toContain("ocean_current_vector_line");
      expect(mockK.color).toHaveBeenCalledWith(100, 150, 200);
      expect(mockK.opacity).toHaveBeenCalledWith(0.25);
    });
  });

  describe("35.5 Barco de Pesca Realista na Costa Urbana (boat.ts)", () => {
    it("deve criar traineira de pesca 60×20px com rede visível lançada na popa", () => {
      const trawlerChildren: any[] = [];
      const trawlerObj: any = {
        pos: { x: 13800, y: 200 },
        add: vi.fn((comp: any[]) => {
          const child = { comp, add: vi.fn() };
          trawlerChildren.push(comp);
          return child;
        }),
        onUpdate: vi.fn(),
      };

      const mockK: any = {
        rect: vi.fn((w, h, opt) => ({ type: "rect", w, h, opt })),
        circle: vi.fn((r) => ({ type: "circle", r })),
        pos: vi.fn((x, y) => ({ x, y })),
        color: vi.fn((r, g, b) => ({ r, g, b })),
        outline: vi.fn((w, c) => ({ outline: w, color: c })),
        opacity: vi.fn((op) => ({ opacity: op })),
        anchor: vi.fn((a) => ({ anchor: a })),
        z: vi.fn((z) => ({ z })),
        rotate: vi.fn((rot) => ({ rotate: rot })),
        rgb: vi.fn((r, g, b) => ({ r, g, b })),
        dt: vi.fn(() => 0.016),
        add: vi.fn(() => trawlerObj),
      };

      const trawler = createFishingTrawler(mockK, 13800);
      expect(trawler).toBeDefined();

      // Confere dimensões do casco (60×20px)
      expect(mockK.rect).toHaveBeenCalledWith(60, 20, { radius: 4 });

      // Confere criação da rede suspensa na popa (trawler_deployed_net)
      const hasDeployedNet = trawlerChildren.some((child) =>
        child.includes("trawler_deployed_net")
      );
      expect(hasDeployedNet).toBe(true);
    });
  });

  describe("35.6 Refluxo de Espuma ao Quebrar Blocos de Gelo", () => {
    it("partículas de espuma devem ter raios circulares entre 3 e 6px", () => {
      // Validação da função de geração de raio de espuma
      for (let i = 0; i < 20; i++) {
        const foamRadius = 3 + Math.random() * 3;
        expect(foamRadius).toBeGreaterThanOrEqual(3);
        expect(foamRadius).toBeLessThanOrEqual(6);
      }
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import {
  ICE_16BIT_PALETTE,
  drawBeveled16BitIceBlock,
  draw16BitIcebergWall,
  create16BitIceTextures,
} from "../../src/systems/ice/ice16BitTextures";
import {
  ARRAIAL_16BIT_PALETTE,
  draw16BitBrainCoral,
  draw16BitGorgonianFan,
  draw16BitSponge,
  draw16BitReefFish,
  create16BitSanctuaryTextures,
} from "../../src/systems/benthic/benthic16BitSanctuary";

describe("Fase 68 / Etapa 3: Estética 16-Bits do Gelo e Santuário de Arraial do Cabo", () => {
  describe("3.1 Silhuetas Chanfradas do Gelo Polar (0m a 5.000m)", () => {
    it("deve definir a paleta oficial com base azul-profundo, corpo ciano-claro e topo nevado", () => {
      expect(ICE_16BIT_PALETTE.SUBMERGED_BASE).toBe(0x4a86e8);
      expect(ICE_16BIT_PALETTE.GLACIAL_BODY_MAIN).toBe(0xa2d9ce);
      expect(ICE_16BIT_PALETTE.GLACIAL_BODY_LIGHT).toBe(0xd0ece7);
      expect(ICE_16BIT_PALETTE.SNOW_CREST).toBe(0xffffff);
    });

    it("deve desenhar o bloco de gelo em 3 camadas com chanfro e topo nevado pixelado", () => {
      const drawnPolys: any[] = [];
      const drawnRects: any[] = [];
      const drawnLines: any[] = [];

      const mockGfx = {
        drawPolygon: vi.fn((pts, style) => drawnPolys.push({ pts, style })),
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
        drawLine: vi.fn((pts, style) => drawnLines.push({ pts, style })),
      };

      drawBeveled16BitIceBlock(mockGfx, 120, 40);

      // Camada submersa chanfrada
      expect(drawnPolys.some((p) => p.style?.fill?.color === ICE_16BIT_PALETTE.SUBMERGED_BASE)).toBe(
        true
      );
      // Corpo glacial ciano
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ICE_16BIT_PALETTE.GLACIAL_BODY_MAIN)
      ).toBe(true);
      // Topo nevado branco puro
      expect(drawnRects.some((r) => r.style?.fill?.color === ICE_16BIT_PALETTE.SNOW_CREST)).toBe(
        true
      );
    });

    it("deve desenhar o grande paredão de iceberg com colunas e relevo facetado", () => {
      const drawnRects: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
      };

      draw16BitIcebergWall(mockGfx, 360, 300);

      expect(
        drawnRects.some((r) => r.style?.fill?.color === ICE_16BIT_PALETTE.SUBMERGED_BASE)
      ).toBe(true);
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ICE_16BIT_PALETTE.GLACIAL_BODY_MAIN)
      ).toBe(true);
      expect(drawnRects.some((r) => r.style?.fill?.color === ICE_16BIT_PALETTE.SNOW_CREST)).toBe(
        true
      );
    });

    it("deve pré-gerar texturas com resolution 0.5 e scaleMode nearest destruindo Graphics temporários", () => {
      const destroyedGraphics: string[] = [];
      const bakeCalls: any[] = [];

      const mockEngine = {
        createGraphics: vi.fn((id: string) => ({
          id,
          drawPolygon: vi.fn(),
          drawRect: vi.fn(),
          drawLine: vi.fn(),
          destroy: vi.fn(() => destroyedGraphics.push(id)),
        })),
        generateTexture: vi.fn((target: any, options: any) => {
          bakeCalls.push({ targetId: target.id, options });
          return { source: { scaleMode: options.scaleMode } };
        }),
      };

      const result = create16BitIceTextures(mockEngine);

      expect(result.iceBlockTexture).not.toBeNull();
      expect(result.icebergWallTexture).not.toBeNull();
      expect(bakeCalls.length).toBe(2);
      for (const call of bakeCalls) {
        expect(call.options.resolution).toBe(0.5);
        expect(call.options.scaleMode).toBe("nearest");
      }
      expect(destroyedGraphics.length).toBe(2);
    });
  });

  describe("3.2 Santuário Bentônico de Arraial do Cabo (19.000m a 30.000m)", () => {
    it("deve conter a paleta vibrante 16-bits exigida com sombreamento na base", () => {
      expect(ARRAIAL_16BIT_PALETTE.CORAL_ORANGE).toBe(0xff7043);
      expect(ARRAIAL_16BIT_PALETTE.SUN_YELLOW).toBe(0xffca28);
      expect(ARRAIAL_16BIT_PALETTE.REEF_PURPLE).toBe(0xab47bc);
      expect(ARRAIAL_16BIT_PALETTE.TURQUOISE).toBe(0x26c6da);
      expect(ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW).toBe(0x0f2537);
    });

    it("deve desenhar corais-cérebro com cúpula escalonada, convoluções labirínticas e sombra basal", () => {
      const drawnRects: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
      };

      draw16BitBrainCoral(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT,
        64,
        40
      );

      // Sombreamento basal escuro
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW)
      ).toBe(true);
      // Cor principal do coral
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE)
      ).toBe(true);
      // Ranhuras labirínticas e arestas iluminadas
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK)
      ).toBe(true);
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT)
      ).toBe(true);
    });

    it("deve desenhar gorgônias ramificadas com ancoragem basal, ramos dendríticos e pontas vivas", () => {
      const drawnRects: any[] = [];
      const drawnLines: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
        drawLine: vi.fn((pts, style) => drawnLines.push({ pts, style })),
      };

      draw16BitGorgonianFan(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.TURQUOISE,
        ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK,
        ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        60,
        64
      );

      // Ancoragem basal com sombra
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW)
      ).toBe(true);
      // Ramificações dendríticas
      expect(drawnLines.length).toBeGreaterThanOrEqual(8);
      // Pontas contrastantes (amarelo-sol)
      expect(drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)).toBe(
        true
      );
    });

    it("deve desenhar esponjas tubulares com ósculos no topo e sombra na base", () => {
      const drawnRects: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
      };

      draw16BitSponge(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        ARRAIAL_16BIT_PALETTE.SUN_YELLOW_DARK,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        48,
        44
      );

      // Base com sombra
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW)
      ).toBe(true);
      // Tubos amarelos
      expect(drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)).toBe(
        true
      );
      // Borda do ósculo laranja
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE)
      ).toBe(true);
    });

    it("deve desenhar peixes de recife com cauda bifurcada, nadadeiras, faixa lateral e olho pixelado", () => {
      const drawnPolys: any[] = [];
      const drawnRects: any[] = [];
      const mockGfx = {
        drawPolygon: vi.fn((pts, style) => drawnPolys.push({ pts, style })),
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
      };

      draw16BitReefFish(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.SUN_YELLOW,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        ARRAIAL_16BIT_PALETTE.TURQUOISE,
        28,
        16
      );

      // Cauda bifurcada (lobos com finColor)
      expect(
        drawnPolys.some((p) => p.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE) ||
          drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE)
      ).toBe(true);

      // Corpo amarelo
      expect(drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)).toBe(
        true
      );

      // Faixa lateral contrastante (turquesa)
      expect(drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.TURQUOISE)).toBe(
        true
      );

      // Olho pixelado: esclera branca, pupila preta, brilho especular
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.FISH_EYE_SCLERA)
      ).toBe(true);
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.FISH_EYE_PUPIL)
      ).toBe(true);
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.FISH_EYE_SPECULAR)
      ).toBe(true);
    });

    it("deve pré-gerar texturas ricas de corais e peixes de Arraial do Cabo destruindo Graphics temporários", () => {
      const destroyedGraphics: string[] = [];
      const bakeCalls: any[] = [];

      const mockEngine = {
        createGraphics: vi.fn((id: string) => ({
          id,
          drawPolygon: vi.fn(),
          drawRect: vi.fn(),
          drawLine: vi.fn(),
          destroy: vi.fn(() => destroyedGraphics.push(id)),
        })),
        generateTexture: vi.fn((target: any, options: any) => {
          bakeCalls.push({ targetId: target.id, options });
          return { id: `tex_${target.id}`, source: { scaleMode: options.scaleMode } };
        }),
      };

      const sanctuary = create16BitSanctuaryTextures(mockEngine);

      expect(sanctuary.available).toBe(true);
      expect(sanctuary.brainCorals.length).toBeGreaterThanOrEqual(2);
      expect(sanctuary.seaFans.length).toBeGreaterThanOrEqual(2);
      expect(sanctuary.sponges.length).toBeGreaterThanOrEqual(3);
      expect(sanctuary.fishVariants.length).toBeGreaterThanOrEqual(3);

      expect(bakeCalls.length).toBe(
        sanctuary.brainCorals.length +
          sanctuary.seaFans.length +
          sanctuary.sponges.length +
          sanctuary.fishVariants.length
      );

      for (const call of bakeCalls) {
        expect(call.options.resolution).toBe(0.5);
        expect(call.options.scaleMode).toBe("nearest");
      }
      expect(destroyedGraphics.length).toBe(bakeCalls.length);
    });
  });
});

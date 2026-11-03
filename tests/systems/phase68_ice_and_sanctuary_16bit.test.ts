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
  draw16BitAnemone,
  draw16BitAnemoneTentacle,
  draw16BitSponge,
  draw16BitReefFish,
  create16BitSanctuaryTextures,
} from "../../src/systems/benthic/benthic16BitSanctuary";
import { setupBenthicFloorSystem } from "../../src/systems/benthicFloorSystem";
import { setActiveRenderEngine } from "../../src/engine/adapters/RenderEngineAdapter";

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
      expect(
        drawnPolys.some((p) => p.style?.fill?.color === ICE_16BIT_PALETTE.SUBMERGED_BASE)
      ).toBe(true);
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

    it("deve desenhar colônia tubular com 5 tubos, anéis frisados, abertura escura e base rochosa", () => {
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

      // 5 tubos verticais escalonados com alturas variadas (sem cápsula única achatada)
      const tubeXs = [8, 18, 28, 38, 48];
      for (const tx of tubeXs) {
        expect(
          drawnRects.some(
            (r) => r.x === tx && r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE
          )
        ).toBe(true);
      }
      const tubeHeights = drawnRects
        .filter(
          (r) => tubeXs.includes(r.x) && r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE
        )
        .map((r) => r.h);
      expect(new Set(tubeHeights).size).toBeGreaterThanOrEqual(4);
      expect(drawnRects.some((r) => r.w >= 60 && r.h >= 20)).toBe(false);

      // Anéis frisados iluminados (3 a 4 por tubo)
      const rings = drawnRects.filter(
        (r) =>
          r.h === 2 && r.w >= 8 && r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT
      );
      expect(rings.length).toBeGreaterThanOrEqual(15);

      // Pólipos 3x3 brilhantes
      expect(
        drawnRects.filter(
          (r) =>
            r.w === 3 && r.h === 3 && r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD
        ).length
      ).toBeGreaterThanOrEqual(5);
    });

    it("deve desenhar coral ramificado com 5 galhos segmentados, fundo vazado e pontas vivas", () => {
      const drawnRects: any[] = [];
      const drawnPolys: any[] = [];
      const drawnRounded: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
        drawRoundedRect: vi.fn((x, y, w, h, radius, style) =>
          drawnRounded.push({ x, y, w, h, radius, style })
        ),
        drawPolygon: vi.fn((pts, style) => drawnPolys.push({ pts, style })),
      };

      draw16BitGorgonianFan(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.TURQUOISE,
        ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK,
        ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT,
        60,
        64,
        ARRAIAL_16BIT_PALETTE.SUN_YELLOW
      );

      // Fundo 100% vazado: nenhum polígono sólido losango/triângulo
      expect(drawnPolys.length).toBe(0);

      // Base rochosa escura 24x8
      expect(
        drawnRects.some(
          (r) =>
            r.w === 24 &&
            r.h === 8 &&
            r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW
        )
      ).toBe(true);

      // Segmentos empilhados 6x8 (galhos ascendentes)
      const segments = drawnRounded.filter(
        (s) => s.w === 6 && s.h === 8 && s.style?.fill?.color === ARRAIAL_16BIT_PALETTE.TURQUOISE
      );
      expect(segments.length).toBeGreaterThanOrEqual(5 * 4);

      // 5 galhos: base dos galhos em offsets -18, -9, 0, +9, +18 do centro (x = 30)
      const baseSegX = segments.filter((s) => s.y === 64 - 8 - 8).map((s) => s.x + 3);
      for (const off of [-18, -9, 0, 9, 18]) {
        expect(baseSegX).toContain(30 + off);
      }

      // Anéis de sombra intercalados
      expect(
        drawnRects.some(
          (r) =>
            r.w === 6 && r.h === 2 && r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK
        )
      ).toBe(true);

      // Alturas variadas (28px a 52px) -> topo mais alto do galho central
      const minY = Math.min(...segments.map((s) => s.y));
      expect(64 - 8 - minY).toBeGreaterThanOrEqual(48);

      // Pontas arredondadas brilhantes (accent) e pólipos (amarelo-sol)
      expect(
        drawnRects.filter((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT)
          .length
      ).toBeGreaterThanOrEqual(5);
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)
      ).toBe(true);
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
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)
      ).toBe(true);
      // Borda do ósculo laranja
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE)
      ).toBe(true);
    });

    it("deve desenhar corais com pólipos contrastantes no coral-cérebro e na gorgônia", () => {
      const drawnBrainRects: any[] = [];
      const mockBrainGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnBrainRects.push({ x, y, w, h, style })),
      };

      draw16BitBrainCoral(
        mockBrainGfx,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_DARK,
        ARRAIAL_16BIT_PALETTE.CORAL_ORANGE_LIGHT,
        64,
        40,
        ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD
      );

      // Pólipos contrastantes com brilho dourado
      expect(
        drawnBrainRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.POLYP_GLOW_GOLD)
      ).toBe(true);

      const drawnFanRects: any[] = [];
      const drawnFanLines: any[] = [];
      const mockFanGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnFanRects.push({ x, y, w, h, style })),
        drawLine: vi.fn((pts, style) => drawnFanLines.push({ pts, style })),
      };

      draw16BitGorgonianFan(
        mockFanGfx,
        ARRAIAL_16BIT_PALETTE.TURQUOISE,
        ARRAIAL_16BIT_PALETTE.TURQUOISE_DARK,
        ARRAIAL_16BIT_PALETTE.TURQUOISE_LIGHT,
        60,
        64,
        ARRAIAL_16BIT_PALETTE.SUN_YELLOW
      );

      // Pólipos nas ramificações
      expect(
        drawnFanRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)
      ).toBe(true);
    });

    it("deve desenhar anêmonas 16-bits com coluna carnosa, tentáculos radiados e pontas luminosas", () => {
      const drawnRects: any[] = [];
      const drawnLines: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
        drawLine: vi.fn((pts, style) => drawnLines.push({ pts, style })),
      };

      draw16BitAnemone(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_TEAL,
        ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_DARK,
        ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_PINK,
        ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP,
        56,
        44
      );

      // Base rochosa com sombra
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.BASE_BEDROCK_SHADOW)
      ).toBe(true);
      // Coluna carnosa verde-azulada
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.ANEMONE_BODY_TEAL)
      ).toBe(true);
      // Disco oral e pontas dos tentáculos luminosos
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP)
      ).toBe(true);
      // Tentáculos radiados
      expect(drawnLines.length).toBeGreaterThanOrEqual(6);
    });

    it("deve desenhar tentáculos individuais 16-bits com base alargada e ponta com bulbo luminoso", () => {
      const drawnRects: any[] = [];
      const mockGfx = {
        drawRect: vi.fn((x, y, w, h, style) => drawnRects.push({ x, y, w, h, style })),
      };

      draw16BitAnemoneTentacle(
        mockGfx,
        ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_PINK,
        ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP,
        8,
        22
      );

      // Haste rosa do tentáculo
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_PINK)
      ).toBe(true);
      // Bulbo luminoso terminal
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.ANEMONE_TENTACLE_TIP)
      ).toBe(true);
      // Ponto de luz especular branco
      expect(drawnRects.some((r) => r.style?.fill?.color === 0xffffff)).toBe(true);
    });

    it("deve desenhar peixes de recife com cauda bifurcada, nadadeiras, contra-sombreamento e olho pixelado", () => {
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
        ARRAIAL_16BIT_PALETTE.FISH_BELLY_SHADOW,
        24,
        12
      );

      // Cauda bifurcada (lobos com finColor)
      expect(
        drawnPolys.some((p) => p.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE) ||
          drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.CORAL_ORANGE)
      ).toBe(true);

      // Corpo amarelo
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.SUN_YELLOW)
      ).toBe(true);

      // Faixa lateral / marcações contrastantes (turquesa)
      expect(drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.TURQUOISE)).toBe(
        true
      );

      // Barriga iluminada / contra-sombreamento ventral (estilo orcas/jubartes)
      expect(
        drawnRects.some((r) => r.style?.fill?.color === ARRAIAL_16BIT_PALETTE.FISH_BELLY_SHADOW)
      ).toBe(true);

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
      expect(sanctuary.anemones.length).toBeGreaterThanOrEqual(2);
      expect(sanctuary.anemoneTentacles.length).toBeGreaterThanOrEqual(2);
      expect(sanctuary.sponges.length).toBeGreaterThanOrEqual(3);
      expect(sanctuary.fishVariants.length).toBeGreaterThanOrEqual(3);

      expect(bakeCalls.length).toBe(
        sanctuary.brainCorals.length +
          sanctuary.seaFans.length +
          sanctuary.anemones.length +
          sanctuary.anemoneTentacles.length +
          sanctuary.sponges.length +
          sanctuary.fishVariants.length
      );

      for (const call of bakeCalls) {
        expect(call.options.resolution).toBe(0.5);
        expect(call.options.scaleMode).toBe("nearest");
      }
      expect(destroyedGraphics.length).toBe(bakeCalls.length);
    });

    it("deve animar peixes de recife com inclinação (pitch) e impulso sem alocar nós Graphics vivos no loop", () => {
      let createdGraphicsCount = 0;
      const mockEngine = {
        createGraphics: vi.fn(() => {
          createdGraphicsCount++;
          return {};
        }),
      };
      void mockEngine;

      // Simulação do loop de 60 frames da animação de nado dos peixes de recife
      const fish = {
        angle: 0,
        pos: { x: 19500, y: 350 },
        scale: { x: 1.0, y: 1.0 },
        basePos: { x: 19500, y: 350 },
        swimSpeed: 2.0,
        phase: 1.7,
      };

      const initialGraphicsCount = createdGraphicsCount;

      for (let frame = 0; frame < 60; frame++) {
        const time = frame * 0.016;
        const swimCycle = time * fish.swimSpeed * 2.2 + fish.phase;
        // Pitch hidrodinâmico (arfagem idêntica às baleias/orcas)
        fish.angle = Math.sin(swimCycle) * 6.5;
        // Deslocamento e impulso caudal
        fish.pos.x = fish.basePos.x + Math.sin(time * fish.swimSpeed + fish.phase) * 22;
        fish.pos.y = fish.basePos.y + Math.cos(swimCycle * 0.8) * 8;
        fish.scale.x = 1.0 + Math.sin(swimCycle * 2) * 0.05;
        fish.scale.y = 1.0 - Math.sin(swimCycle * 2) * 0.03;

        // O ângulo deve oscilar organicamente entre -6.5° e +6.5°
        expect(fish.angle).toBeGreaterThanOrEqual(-6.51);
        expect(fish.angle).toBeLessThanOrEqual(6.51);
      }

      // Zero Graphics instanciados dentro do loop de frame
      expect(createdGraphicsCount).toBe(initialGraphicsCount);
      expect(createdGraphicsCount).toBe(0);
    });

    it("deve conectar o RenderEngineAdapter real quando setupBenthicFloorSystem é chamado via ponte Kaboom", () => {
      const addedSprites: string[] = [];
      const stageChildren: any[] = [];

      const mockStageRoot = {
        addChild: vi.fn((child: any) => stageChildren.push(child)),
      };

      const mockTicker = {
        add: vi.fn(),
      };

      const mockRealEngine = {
        getDimensions: vi.fn(() => ({ width: 1280, height: 720 })),
        getStageRoot: vi.fn(() => mockStageRoot),
        getTicker: vi.fn(() => mockTicker),
        createGraphics: vi.fn(() => ({
          drawRect: vi.fn(),
          drawRoundedRect: vi.fn(),
          drawCircle: vi.fn(),
          drawPolygon: vi.fn(),
          drawLine: vi.fn(),
          clear: vi.fn(),
          setPosition: vi.fn(),
          setZIndex: vi.fn(),
          setRotation: vi.fn(),
          setScale: vi.fn(),
          setVisible: vi.fn(),
          isVisible: vi.fn(() => true),
          destroy: vi.fn(),
        })),
        createSprite: vi.fn((_tex: any, tag: string) => {
          addedSprites.push(tag);
          return {
            tag,
            setAnchor: vi.fn(),
            setPosition: vi.fn(),
            setZIndex: vi.fn(),
            setRotation: vi.fn(),
            setScale: vi.fn(),
            setVisible: vi.fn(),
            isVisible: vi.fn(() => true),
            getPosition: vi.fn(() => ({ x: 0, y: 0 })),
          };
        }),
        generateTexture: vi.fn((_g: any, _opts: any) => ({
          width: 64,
          height: 64,
        })),
      };

      // Simula k (Kaboom context) com k.renderEngine acoplado
      const mockKaboomCtx = {
        renderEngine: mockRealEngine,
        width: vi.fn(() => 1280),
        height: vi.fn(() => 720),
        dt: vi.fn(() => 0.016),
        camPos: vi.fn(() => ({ x: 20000, y: 360 })),
        add: vi.fn(),
      };

      setupBenthicFloorSystem(mockKaboomCtx as any);

      // Deve renderizar sprites de corais 16-bits usando as texturas pré-geradas do motor real
      expect(addedSprites).toContain("coral_brain_16bit");
      expect(addedSprites).toContain("coral_fan_16bit");
      expect(addedSprites).toContain("coral_anemone_16bit");
      expect(addedSprites).toContain("reef_fish_16bit");
      expect(stageChildren.length).toBeGreaterThan(0);
      expect(mockKaboomCtx.add).not.toHaveBeenCalled();
    });

    it("deve resolver o motor real via getActiveRenderEngine() quando k não possui renderEngine embutido", () => {
      const addedSprites: string[] = [];

      const mockRealEngine = {
        getDimensions: vi.fn(() => ({ width: 1280, height: 720 })),
        getStageRoot: vi.fn(() => ({ addChild: vi.fn() })),
        getTicker: vi.fn(() => ({ add: vi.fn() })),
        createGraphics: vi.fn(() => ({
          drawRect: vi.fn(),
          drawRoundedRect: vi.fn(),
          drawCircle: vi.fn(),
          drawPolygon: vi.fn(),
          drawLine: vi.fn(),
          clear: vi.fn(),
          setPosition: vi.fn(),
          setZIndex: vi.fn(),
          setRotation: vi.fn(),
          setScale: vi.fn(),
          setVisible: vi.fn(),
          isVisible: vi.fn(() => true),
          destroy: vi.fn(),
        })),
        createSprite: vi.fn((_tex: any, tag: string) => {
          addedSprites.push(tag);
          return {
            setAnchor: vi.fn(),
            setPosition: vi.fn(),
            setZIndex: vi.fn(),
            setRotation: vi.fn(),
            setScale: vi.fn(),
            setVisible: vi.fn(),
            isVisible: vi.fn(() => true),
            getPosition: vi.fn(() => ({ x: 0, y: 0 })),
          };
        }),
        generateTexture: vi.fn(() => ({ width: 64, height: 64 })),
      };

      setActiveRenderEngine(mockRealEngine as any);

      const mockKaboomCtxWithoutEngine = {
        width: vi.fn(() => 1280),
        height: vi.fn(() => 720),
        dt: vi.fn(() => 0.016),
        camPos: vi.fn(() => ({ x: 20000, y: 360 })),
        add: vi.fn(),
      };

      setupBenthicFloorSystem(mockKaboomCtxWithoutEngine as any);

      expect(addedSprites).toContain("coral_brain_16bit");
      expect(addedSprites).toContain("coral_fan_16bit");
      expect(mockKaboomCtxWithoutEngine.add).not.toHaveBeenCalled();

      // Reset
      setActiveRenderEngine(null);
    });

    it("deve renderizar os 5 tubos e 5 galhos no fallback legado se nenhum motor real estiver ativo", () => {
      setActiveRenderEngine(null);

      const addedObjects: any[] = [];
      const mockLegacyCtx = {
        width: vi.fn(() => 1280),
        height: vi.fn(() => 720),
        dt: vi.fn(() => 0.016),
        time: vi.fn(() => 0),
        camPos: vi.fn(() => ({ x: 20000, y: 360 })),
        rect: vi.fn((w, h, opts) => ({ type: "rect", w, h, opts })),
        circle: vi.fn((r) => ({ type: "circle", r })),
        polygon: vi.fn((pts) => ({ type: "polygon", pts })),
        pos: vi.fn((x, y) => ({ type: "pos", x, y })),
        color: vi.fn((r, g, b) => ({ type: "color", r, g, b })),
        rgb: vi.fn((r, g, b) => ({ r, g, b })),
        opacity: vi.fn((o) => ({ type: "opacity", o })),
        anchor: vi.fn((a) => ({ type: "anchor", a })),
        rotate: vi.fn((rot) => ({ type: "rotate", rot })),
        scale: vi.fn((sx, sy) => ({ type: "scale", sx, sy })),
        z: vi.fn((layer) => ({ type: "z", layer })),
        outline: vi.fn((w, col) => ({ type: "outline", w, col })),
        vec2: vi.fn((x, y) => ({ x, y })),
        onUpdate: vi.fn(),
        add: vi.fn((components: any[]) => {
          const obj = {
            pos: { x: 0, y: 0 },
            components,
          };
          addedObjects.push(obj);
          return obj;
        }),
      };

      setupBenthicFloorSystem(mockLegacyCtx as any);

      // Valida que o fallback legado NÃO usa mais o retângulo achatado 64x34 nem o polígono do leque
      const hasFlatCapsule = addedObjects.some((o) =>
        o.components.some(
          (c: any) => c.type === "rect" && c.w === 64 && c.h === 34 && c.opts?.radius === 12
        )
      );
      expect(hasFlatCapsule).toBe(false);

      const hasLegacyPolygonFan = addedObjects.some(
        (o) =>
          o.components.includes("coral_fan") && o.components.some((c: any) => c.type === "polygon")
      );
      expect(hasLegacyPolygonFan).toBe(false);

      // Valida a presença dos tubos verticais do brain coral (alturas 20, 32, 38, 28, 18)
      const tubeHeights = [20, 32, 38, 28, 18];
      for (const h of tubeHeights) {
        const foundTube = addedObjects.some((o) =>
          o.components.some(
            (c: any) => c.type === "rect" && c.h === h && (c.w === 10 || c.w === 12)
          )
        );
        expect(foundTube).toBe(true);
      }

      // Valida a presença dos segmentos de galhos do leque (6x8)
      const foundFanSegments = addedObjects.filter((o) =>
        o.components.some((c: any) => c.type === "rect" && c.w === 6 && c.h === 8)
      );
      expect(foundFanSegments.length).toBeGreaterThanOrEqual(5);
    });

    it("deve abortar rota Pixi e acionar fallback Kaboom com segurança se RenderEngineAdapter não foi inicializado", () => {
      const uninitializedEngine = {
        isInitialized: false,
        getDimensions: vi.fn(() => ({ width: 1280, height: 720 })),
        getTicker: vi.fn(() => ({ add: vi.fn() })),
        createGraphics: vi.fn(),
        getStageRoot: vi.fn(() => {
          throw new Error(
            "RenderEngineAdapter não inicializado. Chame init() antes de acessar stageRoot."
          );
        }),
      };

      setActiveRenderEngine(uninitializedEngine as any);

      const addedObjects: any[] = [];
      const mockKaboomCtx = {
        width: vi.fn(() => 1280),
        height: vi.fn(() => 720),
        dt: vi.fn(() => 0.016),
        time: vi.fn(() => 0),
        camPos: vi.fn(() => ({ x: 20000, y: 360 })),
        rect: vi.fn((w, h, opts) => ({ type: "rect", w, h, opts })),
        circle: vi.fn((r) => ({ type: "circle", r })),
        polygon: vi.fn((pts) => ({ type: "polygon", pts })),
        pos: vi.fn((x, y) => ({ type: "pos", x, y })),
        color: vi.fn((r, g, b) => ({ type: "color", r, g, b })),
        rgb: vi.fn((r, g, b) => ({ r, g, b })),
        opacity: vi.fn((o) => ({ type: "opacity", o })),
        anchor: vi.fn((a) => ({ type: "anchor", a })),
        rotate: vi.fn((rot) => ({ type: "rotate", rot })),
        scale: vi.fn((sx, sy) => ({ type: "scale", sx, sy })),
        z: vi.fn((layer) => ({ type: "z", layer })),
        outline: vi.fn((w, col) => ({ type: "outline", w, col })),
        vec2: vi.fn((x, y) => ({ x, y })),
        onUpdate: vi.fn(),
        add: vi.fn((components: any[]) => {
          const obj = { pos: { x: 0, y: 0 }, components };
          addedObjects.push(obj);
          return obj;
        }),
      };

      // Não deve lançar erro
      expect(() => setupBenthicFloorSystem(mockKaboomCtx as any)).not.toThrow();
      expect(mockKaboomCtx.add).toHaveBeenCalled();

      // Reset
      setActiveRenderEngine(null);
    });
  });
});

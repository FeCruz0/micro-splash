import { describe, it, expect, vi } from "vitest";
import {
  createVolumetricRayProfile,
  getRaySegmentPolygonVertices,
  resolveBiomeLightColor,
} from "../../src/utils/volumetricRayGeometry";
import { calculateGodRayWidth, setupLightRaysSystem } from "../../src/systems/lightRaysSystem";
import type {
  IRenderEngine,
  IGraphicsNode,
  IRenderTicker,
  IRenderNode,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import type { LegacyEngineBridge } from "../../src/engine/adapters/LegacyBridge";

describe("Fase 67: Volumetric God Rays & Cross-Browser Atmospheric Normalization", () => {
  describe("67.1 Perfil Volumétrico e Atenuação com Profundidade (Beer-Lambert)", () => {
    it("deve criar 4 segmentos de profundidade contíguos atingindo mais de 700px", () => {
      const profile = createVolumetricRayProfile(12);

      expect(profile.segments).toHaveLength(4);
      expect(profile.totalLength).toBeGreaterThanOrEqual(700);

      expect(profile.segments[0].topY).toBe(0);
      for (let i = 0; i < profile.segments.length - 1; i++) {
        expect(profile.segments[i].bottomY).toBe(profile.segments[i + 1].topY);
      }
      expect(profile.segments[3].bottomY).toBe(profile.totalLength);
    });

    it("deve alargar a largura do feixe à medida que penetra na água (dispersão cônica)", () => {
      const profile = createVolumetricRayProfile(14);

      for (const segment of profile.segments) {
        expect(segment.bottomWidth).toBeGreaterThan(segment.topWidth);
      }

      for (let i = 0; i < profile.segments.length - 1; i++) {
        expect(profile.segments[i + 1].topWidth).toBe(profile.segments[i].bottomWidth);
      }

      expect(profile.segments[0].topWidth).toBeLessThan(14);
      expect(profile.segments[3].bottomWidth).toBeGreaterThan(14 * 3.5);
    });

    it("deve atenuar a opacidade relativa progressivamente até quase zero no abismo", () => {
      const profile = createVolumetricRayProfile(10);

      expect(profile.segments[0].relativeAlpha).toBe(1.0);
      expect(profile.segments[1].relativeAlpha).toBeLessThan(profile.segments[0].relativeAlpha);
      expect(profile.segments[2].relativeAlpha).toBeLessThan(profile.segments[1].relativeAlpha);
      expect(profile.segments[3].relativeAlpha).toBeLessThanOrEqual(0.05);
      expect(profile.segments[3].relativeAlpha).toBeGreaterThan(0);
    });

    it("deve gerar 4 vértices trapezoidais simétricos em torno de x=0 para cada segmento", () => {
      const profile = createVolumetricRayProfile(16);
      const segment = profile.segments[0];
      const vertices = getRaySegmentPolygonVertices(segment);

      expect(vertices).toHaveLength(4);
      expect(vertices[0]).toEqual({ x: -segment.topWidth / 2, y: segment.topY });
      expect(vertices[1]).toEqual({ x: segment.topWidth / 2, y: segment.topY });
      expect(vertices[2]).toEqual({ x: segment.bottomWidth / 2, y: segment.bottomY });
      expect(vertices[3]).toEqual({ x: -segment.bottomWidth / 2, y: segment.bottomY });
    });
  });

  describe("67.2 Harmonização de Cor e Luminância por Bioma (Chrome vs Firefox)", () => {
    it("deve calibrar cores oceânicas ricas evitando estouro de canal RGB > 240 em todos os biomas", () => {
      const cameraCheckpoints = [1000, 7500, 15000, 22000];

      for (const camX of cameraCheckpoints) {
        const atmospheric = resolveBiomeLightColor(camX);
        const [r, g, b] = atmospheric.rayColor;

        expect(r).toBeGreaterThanOrEqual(100);
        expect(r).toBeLessThanOrEqual(235);
        expect(g).toBeGreaterThanOrEqual(180);
        expect(g).toBeLessThanOrEqual(245);
        expect(b).toBeGreaterThanOrEqual(180);
        expect(b).toBeLessThanOrEqual(245);

        expect(atmospheric.lightFactor).toBeGreaterThan(0.02);
        expect(atmospheric.lightFactor).toBeLessThanOrEqual(0.08);
      }
    });

    it("deve retornar ciano glacial na Antártica e luz solar dourada em Arraial", () => {
      const antartica = resolveBiomeLightColor(2500);
      expect(antartica.rayColor).toEqual([120, 195, 235]);

      const arraial = resolveBiomeLightColor(24000);
      expect(arraial.rayColor).toEqual([215, 230, 190]);
    });
  });

  describe("67.3 Execução no Adaptador PixiJS v8 (Adapter Pattern)", () => {
    it("deve instanciar 15 feixes e 10 cáusticos via IGraphicsNode sem gerar retângulos rígidos", () => {
      const drawnPolygons: unknown[] = [];
      const drawnRoundedRects: unknown[] = [];
      let tickerCallback: ((dt: number) => void) | null = null;

      const mockGraphics = (): IGraphicsNode => {
        let opacity = 1;
        let posX = 0;
        let posY = 0;
        let rot = 0;
        let vis = true;

        return {
          id: "mock_g",
          getPosition: () => ({ x: posX, y: posY }),
          setPosition: (x: number, y: number) => {
            posX = x;
            posY = y;
          },
          getScale: () => ({ x: 1, y: 1 }),
          setScale: vi.fn(),
          getRotation: () => rot,
          setRotation: (r: number) => {
            rot = r;
          },
          getOpacity: () => opacity,
          setOpacity: (o: number) => {
            opacity = o;
          },
          getZIndex: () => 0,
          setZIndex: vi.fn(),
          isVisible: () => vis,
          setVisible: (v: boolean) => {
            vis = v;
          },
          addChild: vi.fn(),
          removeChild: vi.fn(),
          getChildren: () => [],
          destroy: vi.fn(),
          getNativeNode: () => ({}) as unknown as any,
          clear: vi.fn(),
          drawRect: vi.fn(),
          drawRoundedRect: vi.fn((x, y, w, h, r, style) => {
            drawnRoundedRects.push({ x, y, w, h, r, style });
          }),
          drawCircle: vi.fn(),
          drawPolygon: vi.fn((points, style) => {
            drawnPolygons.push({ points, style });
          }),
          drawLine: vi.fn(),
        };
      };

      const mockStageRoot: IRenderNode = {
        id: "stage_root",
        getPosition: () => ({ x: 0, y: 0 }),
        setPosition: vi.fn(),
        getScale: () => ({ x: 1, y: 1 }),
        setScale: vi.fn(),
        getRotation: () => 0,
        setRotation: vi.fn(),
        getOpacity: () => 1,
        setOpacity: vi.fn(),
        getZIndex: () => 0,
        setZIndex: vi.fn(),
        isVisible: () => true,
        setVisible: vi.fn(),
        addChild: vi.fn(),
        removeChild: vi.fn(),
        getChildren: () => [],
        destroy: vi.fn(),
        getNativeNode: () => ({}) as unknown as any,
      };

      const mockTicker: IRenderTicker = {
        add: vi.fn((cb) => {
          tickerCallback = cb;
          return () => {};
        }),
        start: vi.fn(),
        stop: vi.fn(),
        getFPS: () => 60,
        getDeltaTime: () => 0.016,
      };

      const mockEngine: IRenderEngine = {
        isInitialized: true,
        init: vi.fn(),
        resize: vi.fn(),
        getDimensions: () => ({ width: 800, height: 600 }),
        getCanvas: () => null,
        getStageRoot: () => mockStageRoot,
        getTicker: () => mockTicker,
        createContainer: vi.fn(),
        createSprite: vi.fn(),
        createGraphics: vi.fn(() => mockGraphics()),
        createText: vi.fn(),
        destroy: vi.fn(),
      };

      setupLightRaysSystem(mockEngine);

      // 15 feixes x 4 segmentos trapezoidais = 60 polígonos desenhados
      expect(drawnPolygons.length).toBe(15 * 4);
      expect(drawnRoundedRects.length).toBe(10);
      expect(mockEngine.createGraphics).toHaveBeenCalledTimes(25);
      expect(tickerCallback).not.toBeNull();

      // Executa frame do ticker
      if (tickerCallback) {
        expect(() => (tickerCallback as (dt: number) => void)(0.016)).not.toThrow();
      }
    });
  });

  describe("67.4 Execução no Adaptador Legacy Kaboom Bridge", () => {
    it("deve criar feixes formados por polígonos multi-segmentados e atualizar via onUpdate", () => {
      const addedObjects: any[] = [];
      let updateCallback: (() => void) | null = null;

      const mockLegacyBridge: LegacyEngineBridge = {
        width: () => 640,
        height: () => 360,
        dt: () => 0.016,
        camPos: () => ({ x: 1200, y: 180 }),
        add: vi.fn((components: any) => {
          const entity = {
            pos: { x: 0, y: 0 },
            angle: 0,
            opacity: 1,
            color: [255, 255, 255],
            hidden: false,
            components,
          };
          addedObjects.push(entity);
          return entity;
        }),
        circle: vi.fn(),
        rect: vi.fn((w, h) => ({ type: "rect", w, h })),
        polygon: vi.fn((pts) => ({ type: "polygon", pts })),
        pos: vi.fn((x, y) => ({ type: "pos", x, y })),
        color: vi.fn((r, g, b) => ({ type: "color", r, g, b })),
        opacity: vi.fn((o) => ({ type: "opacity", o })),
        z: vi.fn((z) => ({ type: "z", z })),
        onUpdate: vi.fn((cb: () => void) => {
          updateCallback = cb;
        }),
        vec2: vi.fn((x, y) => ({ x, y })),
        rgb: vi.fn((r, g, b) => [r, g, b]),
      };

      setupLightRaysSystem(mockLegacyBridge);

      // 15 feixes x 4 segmentos = 60 objetos de raio + 10 cáusticos = 70 objetos
      expect(addedObjects.length).toBe(60 + 10);
      expect(mockLegacyBridge.polygon).toHaveBeenCalledTimes(60);
      expect(updateCallback).not.toBeNull();

      if (updateCallback) {
        expect(() => (updateCallback as () => void)()).not.toThrow();

        // Valida que os segmentos de raio receberam opacidade calibrada
        const firstRaySegment = addedObjects[0];
        expect(firstRaySegment.pos.y).toBe(80); // SEA_LEVEL
        expect(firstRaySegment.opacity).toBeLessThanOrEqual(0.06);
        expect(firstRaySegment.opacity).toBeGreaterThan(0);
      }
    });

    it("mantém a largura base entre 8px e 18px", () => {
      for (let i = 0; i < 15; i++) {
        const width = calculateGodRayWidth(i);
        expect(width).toBeGreaterThanOrEqual(8);
        expect(width).toBeLessThanOrEqual(18);
      }
    });
  });
});

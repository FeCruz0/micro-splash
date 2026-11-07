import { describe, it, expect, vi } from "vitest";
import {
  drawRetro16BitNetMesh,
  create16BitNetTexture,
  setupWhaleNetOverlay,
  getWhaleBodyBounds,
  NET_16BIT_PALETTE,
  type NetOverlayEngineContext,
} from "../../src/entities/player/playerNetOverlay";
import { createPlayer } from "../../src/entities/player";
import { getWhaleBreathColor } from "../../src/entities/player/playerBreathPalette";
import { RenderEngineAdapter } from "../../src/engine/adapters/RenderEngineAdapter";
import { PixiGraphicsNode } from "../../src/engine/adapters/PixiNodes";

describe("Fase 68: Overlay 16-Bits de Rede de Pesca (Ghost Net de Alto Contraste)", () => {
  describe("68.1: Contorno Anatômico da Baleia e Malha Losangular 16-Bits", () => {
    it("calcula o contorno anatômico fusiforme da baleia com estrangulamento caudal e dorso arqueado (getWhaleBodyBounds)", () => {
      // 1. Torso central (offsetX = 0): dorso arqueado (~ -17) e ventre (~ +16), altura ~ 33px
      const boundsTorso = getWhaleBodyBounds(0);
      expect(boundsTorso.topY).toBeCloseTo(-16.7, 1);
      expect(boundsTorso.bottomY).toBeCloseTo(15.8, 1);
      const heightTorso = boundsTorso.bottomY - boundsTorso.topY;
      expect(heightTorso).toBeGreaterThanOrEqual(30);

      // 2. Pedúnculo da cauda (offsetX = -28): estrangulamento forte, altura estritamente menor que no torso
      const boundsPeduncle = getWhaleBodyBounds(-28);
      const heightPeduncle = boundsPeduncle.bottomY - boundsPeduncle.topY;
      expect(heightPeduncle).toBeLessThan(heightTorso);
      expect(heightPeduncle).toBeLessThan(20);
      expect(boundsPeduncle.topY).toBeGreaterThan(boundsTorso.topY); // dorso mais baixo que no ápice
      expect(boundsPeduncle.bottomY).toBeLessThan(boundsTorso.bottomY); // ventre mais alto que no torso

      // 3. Estrangulamento máximo (offsetX = -36): rede aperta a cauda (topY = -6, bottomY = +6)
      const boundsTailCinch = getWhaleBodyBounds(-36);
      expect(boundsTailCinch.topY).toBeCloseTo(-6, 1);
      expect(boundsTailCinch.bottomY).toBeCloseTo(6, 1);
      expect(boundsTailCinch.bottomY - boundsTailCinch.topY).toBeCloseTo(12, 1);

      // 4. Cabeça (offsetX = 44): afunilamento suave (topY = -7, bottomY = +8)
      const boundsHead = getWhaleBodyBounds(44);
      expect(boundsHead.topY).toBeCloseTo(-7, 1);
      expect(boundsHead.bottomY).toBeCloseTo(8, 1);
      expect(boundsHead.bottomY - boundsHead.topY).toBeCloseTo(15, 1);

      // 5. Rabicho traseiro (offsetX = -54): abertura leve sobre a nadadeira caudal (topY = -10, bottomY = +10)
      const boundsFlukes = getWhaleBodyBounds(-54);
      expect(boundsFlukes.topY).toBeCloseTo(-10, 1);
      expect(boundsFlukes.bottomY).toBeCloseTo(10, 1);
    });

    it("desenha malha losangular em X e laços anatômicos curvos sem qualquer retângulo de preenchimento total", () => {
      const drawnPolygons: Array<{ points: any[]; style: any }> = [];
      const drawnRects: Array<{ x: number; y: number; w: number; h: number; style: any }> = [];

      const mockGfx = {
        drawPolygon: (points: any[], style: any) => {
          drawnPolygons.push({ points, style });
        },
        drawRect: (x: number, y: number, w: number, h: number, style: any) => {
          drawnRects.push({ x, y, w, h, style });
        },
      };

      drawRetro16BitNetMesh(mockGfx);

      // Garante ausência total de drawLine
      expect((mockGfx as any).drawLine).toBeUndefined();

      // Nenhum retângulo de preenchimento total (width >= 100 && height >= 35) deve existir
      const fullFillRects = drawnRects.filter((r) => r.w >= 100 && r.h >= 35);
      expect(fullFillRects).toHaveLength(0);

      // Malha losangular em X, laços 3D, cabos longitudinais e pontas de corda desenhados via polígonos
      expect(drawnPolygons.length).toBeGreaterThan(20);
      for (const poly of drawnPolygons) {
        expect(poly.points.length).toBe(4);
        for (const pt of poly.points) {
          expect(pt.x).toBeGreaterThanOrEqual(0);
          expect(pt.x).toBeLessThanOrEqual(136);
          expect(pt.y).toBeGreaterThanOrEqual(0);
          expect(pt.y).toBeLessThanOrEqual(54);
        }
      }
    });

    it("funciona perfeitamente sobre uma instância real de PixiGraphicsNode do RenderEngineAdapter", () => {
      const realGfx = new PixiGraphicsNode(undefined, "test_real_net_mesh");
      expect(() => drawRetro16BitNetMesh(realGfx)).not.toThrow();
      expect(realGfx.id).toBe("test_real_net_mesh");
    });

    it("posiciona 5 boias flutuadoras acompanhando o contorno dorsal e 4 chumbos na curva ventral", () => {
      const rects: Array<{ x: number; y: number; w: number; h: number; style: any }> = [];
      const mockGfx = {
        drawPolygon: () => {},
        drawRect: (x: number, y: number, w: number, h: number, style: any) => {
          rects.push({ x, y, w, h, style });
        },
      };

      drawRetro16BitNetMesh(mockGfx);

      // 5 boias laranja-vivo no contorno superior (8x4 px com centro amarelo 4x2 px)
      const orangeFloats = rects.filter(
        (r) => r.w === 8 && r.h === 4 && r.style?.fill?.color === NET_16BIT_PALETTE.FLOAT_ORANGE
      );
      const yellowCenters = rects.filter(
        (r) => r.w === 4 && r.h === 2 && r.style?.fill?.color === NET_16BIT_PALETTE.FLOAT_YELLOW
      );
      expect(orangeFloats).toHaveLength(5);
      expect(yellowCenters).toHaveLength(5);

      // O eixo Y das boias NÃO é plano constante (ex: y = -22 constante): acompanha o arco dorsal
      const floatYCoords = orangeFloats.map((f) => f.y);
      const minFloatY = Math.min(...floatYCoords);
      const maxFloatY = Math.max(...floatYCoords);
      expect(maxFloatY - minFloatY).toBeGreaterThanOrEqual(4); // Variação nítida acompanhando a anatomia

      // 4 pesos de chumbo na curva ventral sob o corpo e cauda (5x5 px)
      const leadSinkers = rects.filter(
        (r) => r.w === 5 && r.h === 5 && r.style?.fill?.color === NET_16BIT_PALETTE.LEAD_SINKER
      );
      expect(leadSinkers).toHaveLength(4);
    });

    it("desenha nós escuros com miolo claro nos cruzamentos da malha e pontas de corda arrebentadas na cauda", () => {
      const polygons: Array<{ points: any[]; style: any }> = [];
      const rects: Array<{ x: number; y: number; w: number; h: number; style: any }> = [];

      const mockGfx = {
        drawPolygon: (points: any[], style: any) => {
          polygons.push({ points, style });
        },
        drawRect: (x: number, y: number, w: number, h: number, style: any) => {
          rects.push({ x, y, w, h, style });
        },
      };

      drawRetro16BitNetMesh(mockGfx);

      // Nós escuros 3x3px em SHADOW_DARK com centro 1x1px em ROPE_LIGHT
      const darkKnots = rects.filter(
        (r) => r.w === 3 && r.h === 3 && r.style?.fill?.color === NET_16BIT_PALETTE.SHADOW_DARK
      );
      const lightCenters = rects.filter(
        (r) => r.w === 1 && r.h === 1 && r.style?.fill?.color === NET_16BIT_PALETTE.ROPE_LIGHT
      );
      expect(darkKnots.length).toBeGreaterThanOrEqual(10);
      expect(lightCenters.length).toBeGreaterThanOrEqual(10);

      // Pontas de corda arrebentadas se estendem atrás da cauda (x <= 34)
      const trailingRopePolygons = polygons.filter((p) => p.points.some((pt: any) => pt.x <= 34));
      expect(trailingRopePolygons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("68.2: Pre-Bake e Resolução Real do Motor (create16BitNetTexture e RenderEngineAdapter)", () => {
    it("integra com RenderEngineAdapter real gerando gráficos e descarregando adequadamente", () => {
      const engine = new RenderEngineAdapter();
      const mockTexture = { id: "baked_tex" };
      engine.generateTexture = vi.fn(() => mockTexture as any);

      const texture = create16BitNetTexture(engine);
      expect(texture).toBe(mockTexture);
      expect(engine.generateTexture).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ resolution: 0.5, scaleMode: "nearest" })
      );
    });
  });

  describe("68.3: Hierarquia, Dimensão, Âncora e Espelhamento Horizontal (setupWhaleNetOverlay)", () => {
    it("garante alpha = 1.0, zIndex = 999, sortableChildren = true e não sobrescreve escala com setSize", () => {
      const setAnchor = vi.fn();
      const setZIndex = vi.fn();
      const setSize = vi.fn();
      const setOpacity = vi.fn();

      const mockSpriteNode = {
        visible: false,
        alpha: 0,
        opacity: 0,
        zIndex: 0,
        setVisible: vi.fn(),
        setAnchor,
        setZIndex,
        setSize,
        setOpacity,
        setPosition: vi.fn(),
        setRotation: vi.fn(),
        setScale: vi.fn(),
        destroy: vi.fn(),
        getNativeNode: () => ({ zIndex: 0 }),
      };

      const mockEngine: NetOverlayEngineContext = {
        createGraphics: () => new PixiGraphicsNode(undefined, "test_gfx"),
        generateTexture: () => ({ id: "tex" }),
        createSprite: () => mockSpriteNode,
      };

      const nativeContainer = {
        sortableChildren: false,
        addChild: vi.fn(),
      };

      const mockBaleia: any = {
        pos: { x: 100, y: 200 },
        angle: 0,
        scale: { x: 1, y: 1 },
        node: nativeContainer,
      };

      setupWhaleNetOverlay(mockEngine, mockBaleia);

      expect(setAnchor).toHaveBeenCalledWith(0.5, 0.5);
      expect(setZIndex).toHaveBeenCalledWith(999);
      // Não deve chamar setSize junto com setScale para não sobrescrever a escala da textura
      expect(setSize).not.toHaveBeenCalled();
      expect(setOpacity).toHaveBeenCalledWith(1.0);
      expect(mockSpriteNode.alpha).toBe(1.0);
      expect(mockSpriteNode.zIndex).toBe(999);
      expect(nativeContainer.sortableChildren).toBe(true);
      expect(nativeContainer.addChild).toHaveBeenCalled();
    });

    it("posiciona a âncora sobre tronco e cauda com espelhamento horizontal (scale.x)", () => {
      const setPosition = vi.fn();
      const setScale = vi.fn();

      const mockSpriteNode = {
        visible: false,
        setVisible: vi.fn(),
        setAnchor: vi.fn(),
        setZIndex: vi.fn(),
        setPosition,
        setRotation: vi.fn(),
        setScale,
        destroy: vi.fn(),
      };

      const mockEngine: NetOverlayEngineContext = {
        createGraphics: () => new PixiGraphicsNode(undefined, "test_gfx"),
        generateTexture: () => ({ id: "tex" }),
        createSprite: () => mockSpriteNode,
      };

      const mockBaleia: any = {
        pos: { x: 300, y: 150 },
        angle: 0,
        scale: { x: 1.0, y: 1.0 },
      };

      const overlayController = setupWhaleNetOverlay(mockEngine, mockBaleia);

      // 1. Virada para a direita (isFacingRight = true): offset -20px sobre tronco/cauda, scale.x positivo
      overlayController.update(true, mockBaleia, true, 0);
      expect(setPosition).toHaveBeenCalledWith(300 - 20, 150);
      expect(setScale).toHaveBeenCalledWith(1.0, 1.0);

      // 2. Virada para a esquerda (isFacingRight = false): offset +20px sobre tronco/cauda, scale.x negativo
      overlayController.update(true, mockBaleia, false, 0);
      expect(setPosition).toHaveBeenCalledWith(300 + 20, 150);
      expect(setScale).toHaveBeenCalledWith(-1.0, 1.0);
    });
  });

  describe("68.4: Integração com createPlayer e Preservação da Cor Natural", () => {
    it("ignora isTrapped na paleta de cores retornando o padrão normal de nado e nunca [255, 255, 255] em fôlego crítico", () => {
      // 1. Estado calmo: retorna o padrão normal de nado e marca urgencyState como trapped
      const paletteNormal = getWhaleBreathColor({ oxygenRatio: 0.9, isTrapped: true });
      const untrappedNormal = getWhaleBreathColor({ oxygenRatio: 0.9, isTrapped: false });
      expect(paletteNormal.bodyColor).toEqual(untrappedNormal.bodyColor);
      expect(paletteNormal.finsColor).toEqual(untrappedNormal.finsColor);
      expect(paletteNormal.urgencyState).toBe("trapped");

      // 2. Estado crítico: retorna tom normal de urgência/escurecimento e NUNCA [255, 255, 255]
      const paletteCritical = getWhaleBreathColor({ oxygenRatio: 0.05, isTrapped: true });
      const untrappedCritical = getWhaleBreathColor({ oxygenRatio: 0.05, isTrapped: false });
      expect(paletteCritical.bodyColor).toEqual(untrappedCritical.bodyColor);
      expect(paletteCritical.finsColor).toEqual(untrappedCritical.finsColor);
      expect(paletteCritical.bodyColor).not.toEqual([255, 255, 255]);
      expect(paletteCritical.finsColor).not.toEqual([255, 255, 255]);
      expect(paletteCritical.urgencyState).toBe("trapped");
    });

    it("garante que nenhum retângulo de preenchimento total (width >= 100 e height >= 35) seja acoplado e valida envoltório anatômico", () => {
      const createdRects: Array<{ w: number; h: number }> = [];
      const mockKaboom: any = {
        rect: (w: number, h: number) => {
          createdRects.push({ w, h });
          return { w, h };
        },
        pos: () => ({}),
        anchor: () => ({}),
        color: () => ({}),
        z: () => ({}),
        outline: () => ({}),
        rgb: () => ({}),
      };

      const addedChildren: any[] = [];
      const mockBaleia: any = {
        pos: { x: 100, y: 200 },
        angle: 0,
        scale: { x: 1, y: 1 },
        add: (comps: any[]) => {
          const child = { comps, hidden: false, opacity: 1 };
          addedChildren.push(child);
          return child;
        },
      };

      setupWhaleNetOverlay(mockKaboom, mockBaleia);

      // Nenhum retângulo criado deve ter preenchimento total sólido cobrindo o corpo da baleia
      const fullFillRects = createdRects.filter((r) => r.w >= 100 && r.h >= 35);
      expect(fullFillRects).toHaveLength(0);

      // Tiras dos laços (w = 2 ou w = 4)
      const loopsW2 = createdRects.filter((r) => r.w === 2 && r.h >= 8);
      expect(loopsW2.length).toBeGreaterThanOrEqual(6);

      // A altura mínima dos laços (no pedúnculo da cauda) é estritamente menor que a altura máxima (no torso)
      const loopHeights = loopsW2.map((l) => l.h);
      const minLoopH = Math.min(...loopHeights);
      const maxLoopH = Math.max(...loopHeights);
      expect(minLoopH).toBeLessThan(maxLoopH);
      expect(minLoopH).toBeLessThanOrEqual(16);
      expect(maxLoopH).toBeGreaterThanOrEqual(30);

      // Garante que todas as tiras individuais são finas (largura <= 20px ou altura <= 5px)
      for (const r of createdRects) {
        const isThinStripOrPart = r.w <= 20 || r.h <= 5;
        expect(isThinStripOrPart).toBe(true);
      }
    });

    it("ao chamar trapInNet no controlador real, força visibilidade do overlay e aplica struggle jitter", () => {
      let registeredUpdate: (() => void) | null = null;
      let mockTime = 0;

      const mockKaboom: any = {
        vec2: (x: number, y: number) => ({
          x,
          y,
          scale: () => ({ x, y }),
          add: (v: any) => ({ x: x + v.x, y: y + v.y }),
        }),
        pos: (x: any, y: any) => ({ x, y }),
        scale: (x: number, y: number) => ({ x, y }),
        area: () => ({}),
        body: () => ({}),
        rotate: () => ({}),
        color: (r: number, g: number, b: number) => ({ r, g, b }),
        anchor: () => ({}),
        sprite: () => ({}),
        dt: () => 0.016,
        time: () => mockTime,
        Rect: class {},
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
        deg2rad: (deg: number) => (deg * Math.PI) / 180,
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
        rand: (min: number) => min,
        camPos: () => ({ x: 0, y: 0 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        shake: () => {},
        add: () => ({
          pos: {
            x: 120,
            y: 200,
            add: (v: any) => ({ x: 120 + v.x, y: 200 + v.y }),
          },
          angle: 0,
          scale: { x: 1, y: 1 },
          opacity: 1,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: (callback: () => void) => {
            registeredUpdate = callback;
          },
          onDestroy: () => {},
          add: () => ({ hidden: true, opacity: 1.0 }),
        }),
      };

      const player = createPlayer(mockKaboom, 120, false);
      expect(player.isTrapped()).toBe(false);

      player.trapInNet(3);
      expect(player.isTrapped()).toBe(true);

      // Overlay da baleia deve ter visibilidade forçada
      const overlay = (player.gameObj as any).netOverlaySprite;
      expect(overlay).toBeDefined();
      expect(overlay.visible).toBe(true);
      expect(overlay.opacity).toBe(1.0);

      // Pico do struggle jitter: time = Math.PI / 64 -> jitter = 1.5 graus
      mockTime = Math.PI / 64;
      const updateFn = (registeredUpdate ?? player.update) as (() => void) | undefined;
      updateFn?.();
      expect(player.gameObj.angle).toBeCloseTo(1.5, 1);
    });
  });
});

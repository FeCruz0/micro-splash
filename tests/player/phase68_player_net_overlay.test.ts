import { describe, it, expect, vi } from "vitest";
import {
  drawRetro16BitNetMesh,
  create16BitNetTexture,
  setupWhaleNetOverlay,
  NET_16BIT_PALETTE,
  type NetOverlayEngineContext,
} from "../../src/entities/player/playerNetOverlay";
import { createPlayer } from "../../src/entities/player";
import { getWhaleBreathColor } from "../../src/entities/player/playerBreathPalette";

describe("Fase 68: Overlay 16-Bits de Rede de Pesca (Zero-Overhead)", () => {
  describe("68.1: Desenho Procedural da Trama 16-bits (drawRetro16BitNetMesh)", () => {
    it("desenha linhas diagonais cruzadas nos tons de nylon/corda 0x8B7355 e 0xD2B48C", () => {
      const drawnLines: Array<{ points: any; style: any }> = [];
      const mockGfx = {
        drawLine: (points: any, style: any) => {
          drawnLines.push({ points, style });
        },
        drawCircle: () => {},
        drawRect: () => {},
        drawRoundedRect: () => {},
      };

      drawRetro16BitNetMesh(mockGfx);

      expect(drawnLines.length).toBeGreaterThan(10);
      const colors = drawnLines.map((line) => line.style.color);
      expect(colors).toContain(NET_16BIT_PALETTE.NYLON_DARK); // 0x8B7355
      expect(colors).toContain(NET_16BIT_PALETTE.NYLON_LIGHT); // 0xD2B48C
    });

    it("desenha pequenos nós nos cruzamentos das diagonais", () => {
      const circles: Array<{ x: number; y: number; r: number; style: any }> = [];
      const rects: Array<{ x: number; y: number; w: number; h: number; style: any }> = [];

      const mockGfx = {
        drawLine: () => {},
        drawCircle: (x: number, y: number, r: number, style: any) => {
          circles.push({ x, y, r, style });
        },
        drawRect: (x: number, y: number, w: number, h: number, style: any) => {
          rects.push({ x, y, w, h, style });
        },
        drawRoundedRect: () => {},
      };

      drawRetro16BitNetMesh(mockGfx);

      expect(circles.length).toBeGreaterThan(0);
      expect(rects.length).toBeGreaterThan(0);
    });

    it("desenha boias na borda superior e chumbos na borda inferior", () => {
      const upperFloats: any[] = [];
      const lowerSinkers: any[] = [];

      const mockGfx = {
        drawLine: () => {},
        drawCircle: (x: number, y: number, r: number, style: any) => {
          if (y > 15) lowerSinkers.push({ x, y, r, style });
        },
        drawRect: () => {},
        drawRoundedRect: (x: number, y: number, w: number, h: number, style: any) => {
          if (y < -15) upperFloats.push({ x, y, w, h, style });
        },
      };

      drawRetro16BitNetMesh(mockGfx);

      expect(upperFloats.length).toBe(6);
      expect(lowerSinkers.length).toBe(10); // 5 chumbos com círculo base + specular
    });
  });

  describe("68.2: Pre-bake Zero-Overhead e Descarte de Graphics (create16BitNetTexture)", () => {
    it("faz o pre-bake com resolution 0.5 e scaleMode nearest, destruindo o Graphics temporário imediatamente", () => {
      let isGfxDestroyed = false;
      let generateOptionsUsed: any = null;

      const mockGfx = {
        drawLine: vi.fn(),
        drawCircle: vi.fn(),
        drawRect: vi.fn(),
        drawRoundedRect: vi.fn(),
        destroy: vi.fn(() => {
          isGfxDestroyed = true;
        }),
      };

      const mockEngineContext: NetOverlayEngineContext = {
        createGraphics: vi.fn(() => mockGfx),
        generateTexture: vi.fn((_target: unknown, options?: any) => {
          generateOptionsUsed = options;
          return { id: "baked_net_texture_16bit" };
        }),
      };

      const texture = create16BitNetTexture(mockEngineContext);

      expect(texture).toEqual({ id: "baked_net_texture_16bit" });
      expect(mockEngineContext.createGraphics).toHaveBeenCalledWith("whale_net_mesh_bake");
      expect(generateOptionsUsed).toEqual({
        resolution: 0.5,
        scaleMode: "nearest",
      });
      expect(isGfxDestroyed).toBe(true);
    });
  });

  describe("68.3: Ciclo de Vida do netOverlaySprite Acoplado à Baleia (setupWhaleNetOverlay)", () => {
    it("inicializa inicialmente invisível e ativa visibilidade apenas enquanto isTrapped for verdadeiro", () => {
      const setVisibleFn = vi.fn();

      const mockSpriteNode = {
        visible: false,
        setVisible: setVisibleFn,
        setAnchor: vi.fn(),
        setZIndex: vi.fn(),
        setPosition: vi.fn(),
        setRotation: vi.fn(),
        setScale: vi.fn(),
        destroy: vi.fn(),
      };

      const mockEngine: NetOverlayEngineContext = {
        createGraphics: () => ({
          drawLine: () => {},
          drawCircle: () => {},
          drawRect: () => {},
          drawRoundedRect: () => {},
          destroy: () => {},
        }),
        generateTexture: () => ({ id: "tex" }),
        createSprite: () => mockSpriteNode,
      };

      const mockBaleia: any = {
        pos: { x: 100, y: 200 },
        angle: 15,
        scale: { x: 1, y: 1 },
      };

      const overlayController = setupWhaleNetOverlay(mockEngine, mockBaleia);

      expect(mockSpriteNode.setAnchor).toHaveBeenCalledWith(0.5, 0.5);
      expect(mockSpriteNode.visible).toBe(false);

      // Estado 1: Baleia livre (isTrapped = false)
      overlayController.update(false, mockBaleia, true);
      expect(mockSpriteNode.visible).toBe(false);

      // Estado 2: Baleia presa em rede fantasma (isTrapped = true)
      overlayController.update(true, mockBaleia, true);
      expect(mockSpriteNode.visible).toBe(true);

      // Estado 3: Baleia se liberta da rede (isTrapped = false)
      overlayController.update(false, mockBaleia, true);
      expect(mockSpriteNode.visible).toBe(false);

      overlayController.destroy();
      expect(mockSpriteNode.destroy).toHaveBeenCalled();
    });

    it("sincroniza posição, ângulo e espelhamento horizontal com a orientação da baleia", () => {
      const setPosition = vi.fn();
      const setRotation = vi.fn();
      const setScale = vi.fn();

      const mockSpriteNode = {
        visible: false,
        setVisible: vi.fn(),
        setAnchor: vi.fn(),
        setZIndex: vi.fn(),
        setPosition,
        setRotation,
        setScale,
        destroy: vi.fn(),
      };

      const mockEngine: NetOverlayEngineContext = {
        createGraphics: () => ({
          drawLine: () => {},
          drawCircle: () => {},
          drawRect: () => {},
          drawRoundedRect: () => {},
          destroy: () => {},
        }),
        generateTexture: () => ({ id: "tex" }),
        createSprite: () => mockSpriteNode,
      };

      const mockBaleia: any = {
        pos: { x: 350, y: 220 },
        angle: 25,
        scale: { x: 1.1, y: 0.9 },
      };

      const overlayController = setupWhaleNetOverlay(mockEngine, mockBaleia);

      // Atualiza virada para a esquerda (isFacingRight = false)
      overlayController.update(true, mockBaleia, false);

      expect(setPosition).toHaveBeenCalledWith(350, 220);
      expect(setRotation).toHaveBeenCalledWith((25 * Math.PI) / 180);
      expect(setScale).toHaveBeenCalledWith(-1.1, 0.9);
    });
  });

  describe("68.4: Integração de Cor Natural sem Mutação Rosa", () => {
    it("mantém a cor branca pura da baleia saudável mesmo quando presa em rede fantasma", () => {
      const trappedPalette = getWhaleBreathColor({ oxygenRatio: 0.8, isTrapped: true });
      expect(trappedPalette.urgencyState).toBe("trapped");
      expect(trappedPalette.bodyColor).toEqual([255, 255, 255]);
      expect(trappedPalette.finsColor).toEqual([255, 255, 255]);
    });

    it("integra netOverlaySprite e preserva cor natural no controlador do jogador", () => {
      let registeredUpdate: (() => void) | null = null;
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
        time: () => 1.0,
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
        }),
      };

      const player = createPlayer(mockKaboom, 120, false);
      expect(player.isTrapped()).toBe(false);

      player.trapInNet(3);
      expect(player.isTrapped()).toBe(true);

      if (registeredUpdate) {
        (registeredUpdate as () => void)();
      }

      // Valida que o sprite de rede existe e está ativo
      const netSprite = player.getNetOverlaySprite?.() as any;
      expect(netSprite).toBeDefined();
      expect(netSprite.visible).toBe(true);

      // Valida que a cor da baleia NÃO é rosa e mantém a paleta respiratória natural
      const palette = player.getBreathPalette?.();
      expect(palette?.bodyColor).toEqual([255, 255, 255]);
    });
  });
});

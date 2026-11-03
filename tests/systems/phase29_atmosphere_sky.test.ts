import { describe, it, expect, vi } from "vitest";
import { createWaterSurfaceSystem } from "../../src/systems/waterSurfaceSystem";
import { setupAbyssalFogSystem } from "../../src/systems/abyssalFogSystem";
import { setupCoastalSurfSystem } from "../../src/systems/coastalSurfSystem";
import { setupAuroraSystem } from "../../src/systems/auroraSystem";
import { setupParallaxSkySystem } from "../../src/systems/parallaxSkySystem";
import { GAME_CONFIG, TAGS } from "../../src/config";

function createMockKaboom() {
  const addedObjs: any[] = [];
  let updateCallback: (() => void) | null = null;
  const camPosition = { x: 0, y: 0 };
  let currentDt = 0.016;

  const k: any = {
    width: vi.fn(() => 640),
    height: vi.fn(() => 360),
    dt: vi.fn(() => currentDt),
    camPos: vi.fn(() => camPosition),
    setCamX: (x: number) => {
      camPosition.x = x;
    },
    triggerUpdate: (dt = 0.016) => {
      currentDt = dt;
      if (updateCallback) updateCallback();
    },
    onUpdate: vi.fn((cb) => {
      updateCallback = cb;
      return () => {
        updateCallback = null;
      };
    }),
    pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
    rect: vi.fn((w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts })),
    circle: vi.fn((r: number) => ({ type: "circle", r })),
    polygon: vi.fn((pts: any[]) => ({ type: "polygon", pts })),
    color: vi.fn((r: any, g?: number, b?: number) => ({ type: "color", r, g, b })),
    opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
    z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
    area: vi.fn(() => ({ type: "area" })),
    anchor: vi.fn((a: string) => ({ type: "anchor", a })),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    vec2: (x: number, y: number) => ({ x, y }),
    rand: (min: number, max: number) => (min + max) / 2,
    destroy: vi.fn((obj: any) => {
      obj._destroyed = true;
    }),
    add: vi.fn((comps: any[]) => {
      const obj: any = {
        comps,
        pos: { x: 0, y: 0 },
        color: { r: 255, g: 255, b: 255 },
        opacity: 1,
        angle: 0,
        hasTag: (tag: string) => comps.some((c) => c === tag),
        exists: () => !obj._destroyed,
      };

      const posComp = comps.find((c) => c && c.type === "pos");
      if (posComp) {
        obj.pos = { x: posComp.x, y: posComp.y };
      }

      const opComp = comps.find((c) => c && c.type === "opacity");
      if (opComp) {
        obj.opacity = opComp.opacity;
      }

      const colComp = comps.find((c) => c && c.type === "color");
      if (colComp) {
        obj.color = { r: colComp.r, g: colComp.g, b: colComp.b };
      }

      addedObjs.push(obj);
      return obj;
    }),
  };

  return { k, addedObjs };
}

describe("FASE 29: Superfície, Céu & Atmosfera", () => {
  // =========================================================================
  // 29.1: Linha d'Água Ondulada e Orgânica
  // =========================================================================
  it("29.1: cria superfície ondulada com colisor contínuo, múltiplos segmentos e crista de espuma", () => {
    const { k } = createMockKaboom();
    const surface = createWaterSurfaceSystem(k);

    expect(surface).toBeDefined();
    expect(surface.collider.hasTag(TAGS.SURFACE)).toBe(true);
    expect(surface.segments.length).toBe(14);
    expect(surface.foamSegments.length).toBe(14);

    // O colisor é invisível para integridade física sem blocos rígidos
    expect(surface.collider.opacity).toBe(0);

    // Atualiza cor dinâmica e posições com a câmera
    surface.updateColor(k.rgb(30, 90, 180));
    expect(surface.collider.color.r).toBe(30);
    expect(surface.segments[0].color.r).toBe(30);

    // Ondulação varia a altura Y dos segmentos
    k.setCamX(500);
    k.triggerUpdate(0.1);
    expect(Math.abs(surface.segments[0].pos.y - GAME_CONFIG.SEA_LEVEL)).toBeLessThanOrEqual(5);

    surface.destroy();
    expect(surface.collider.exists()).toBe(false);
  });

  // =========================================================================
  // 29.2: Reflexo Lunar na Costa Urbana Noturna
  // =========================================================================
  it("29.2: renderiza disco lunar e reflexos aquáticos exclusivamente na Costa Urbana noturna", () => {
    const { k } = createMockKaboom();
    const sky = setupParallaxSkySystem(k);

    expect(sky.moon.disk).toBeDefined();
    expect(sky.moon.halo).toBeDefined();
    expect(sky.moon.reflections.length).toBe(5);

    // Em 2.000m (Antártica/Dia), a lua e reflexos são invisíveis
    k.setCamX(2000);
    k.triggerUpdate(0.016);
    expect(sky.moon.disk.opacity).toBe(0);
    expect(sky.moon.reflections[0].opacity).toBe(0);

    // Em 15.000m (Costa Urbana noturna), a lua e os reflexos aquáticos brilham
    k.setCamX(15000);
    k.triggerUpdate(0.016);
    expect(sky.moon.disk.opacity).toBeGreaterThan(0.7);
    expect(sky.moon.halo.opacity).toBeGreaterThan(0.1);
    expect(sky.moon.reflections[0].opacity).toBeGreaterThan(0.2);

    sky.destroy();
  });

  // =========================================================================
  // 29.3: Névoa de Profundidade no Horizonte Inferior
  // =========================================================================
  it("29.3: cria 4 camadas graduais de névoa abissal ancoradas na base inferior da tela", () => {
    const { k } = createMockKaboom();
    const fog = setupAbyssalFogSystem(k);

    expect(fog.layers.length).toBe(4);
    // As 4 camadas possuem opacidade crescente em direção ao fundo
    const opacities = fog.layers.map((l) => l.opacity);
    expect(opacities).toEqual([0.12, 0.24, 0.42, 0.7]);

    // Todas as camadas se deslocam horizontalmente com a câmera
    k.setCamX(1200);
    k.triggerUpdate(0.016);
    fog.layers.forEach((l) => {
      expect(l.pos.x).toBeLessThan(1200);
    });

    fog.destroy();
  });

  // =========================================================================
  // 29.4: Ondas e Espuma Costeira em Arraial do Cabo
  // =========================================================================
  it("29.4: ativa rebentação e espuma costeira ao atingir a aproximação de Arraial do Cabo (>= 24.800m)", () => {
    const { k } = createMockKaboom();
    const surf = setupCoastalSurfSystem(k);

    expect(surf.foamParticles.length).toBe(12);

    // Fora de Arraial (ex: 10.000m), espuma está inativa (opacidade zero)
    k.setCamX(10000);
    k.triggerUpdate(0.016);
    expect(surf.foamParticles[0].opacity).toBe(0);

    // Em Arraial do Cabo (26.000m), a espuma costeira torna-se visível e deriva
    k.setCamX(26000);
    k.triggerUpdate(0.016);
    expect(surf.foamParticles[0].opacity).toBeGreaterThan(0.2);

    surf.destroy();
  });

  // =========================================================================
  // 29.5: Nuvens em Paralaxe
  // =========================================================================
  it("29.5: mantém nuvens suaves em paralaxe com formato clássico arredondado e deriva do vento", () => {
    const { k } = createMockKaboom();
    const sky = setupParallaxSkySystem(k);

    expect(sky.clouds.length).toBe(7);

    // Cada nuvem possui o objeto principal com tag sky_cloud e dimensões arredondadas (sem pontas quadradas)
    sky.clouds.forEach((cloud) => {
      expect(cloud.obj.hasTag("sky_cloud")).toBe(true);
      expect(cloud.width).toBeGreaterThanOrEqual(80);
      expect(cloud.speed).toBeGreaterThan(0);

      const rectComp = cloud.obj.comps.find((c: any) => c && c.type === "rect") as any;
      expect(rectComp).toBeDefined();
      expect(rectComp.opts?.radius).toBeGreaterThanOrEqual(9);
    });

    // Atualiza posição com a deriva do vento e paralaxe da câmera
    k.setCamX(3000);
    k.triggerUpdate(0.1);
    expect(sky.clouds[0].obj.pos.x).toBeDefined();

    sky.destroy();

    // Verificação na Camada PixiJS v8 / IRenderEngine (eliminação total de bordas quadradas)
    const cloudGraphicsNodes: any[] = [];
    const mockEngine: any = {
      getDimensions: () => ({ width: 640, height: 360 }),
      getStageRoot: () => ({ addChild: vi.fn() }),
      getTicker: () => ({ add: vi.fn(() => vi.fn()) }),
      getCamera: () => ({ getPosition: () => ({ x: 0, y: 0 }) }),
      createGraphics: vi.fn((tag: string) => {
        const gfx: any = {
          tag,
          drawRect: vi.fn(),
          drawRoundedRect: vi.fn(),
          drawCircle: vi.fn(),
          drawPolygon: vi.fn(),
          setPosition: vi.fn(),
          setZIndex: vi.fn(),
          setOpacity: vi.fn(),
          getPosition: () => ({ x: 0, y: 0 }),
          getOpacity: () => 1,
          setRotation: vi.fn(),
          destroy: vi.fn(),
          getNativeNode: () => ({ tint: 0xffffff }),
        };
        if (tag === "sky_cloud") {
          cloudGraphicsNodes.push(gfx);
        }
        return gfx;
      }),
    };

    const pixiSky = setupParallaxSkySystem(mockEngine);
    expect(pixiSky.clouds.length).toBe(7);
    expect(cloudGraphicsNodes.length).toBe(7);

    cloudGraphicsNodes.forEach((gfx) => {
      // Nuvens usam silhueta 16-bits em duas camadas: base sombreada celeste e topo iluminado
      expect(gfx.drawRect).not.toHaveBeenCalled();
      expect(gfx.drawRoundedRect).toHaveBeenCalledTimes(2);
      const roundedCallArgs = gfx.drawRoundedRect.mock.calls[0];
      expect(roundedCallArgs[4]).toBeGreaterThan(0); // radius da base
      expect(gfx.drawCircle.mock.calls.length).toBeGreaterThanOrEqual(6); // cúpulas cumuliformes em 2 camadas
    });

    pixiSky.destroy();

    // Verificação de Bake de Textura Estática e Sprites Leves (SKILL.md / Zero-Overhead)
    const bakedTextures: any[] = [];
    const spriteNativeProps: any[] = [];
    const mockBakeEngine: any = {
      getDimensions: () => ({ width: 640, height: 360 }),
      getStageRoot: () => ({ addChild: vi.fn() }),
      getTicker: () => ({ add: vi.fn(() => vi.fn()) }),
      getCamera: () => ({ getPosition: () => ({ x: 0, y: 0 }) }),
      createGraphics: vi.fn((tag: string) => ({
        tag,
        drawRect: vi.fn(),
        drawRoundedRect: vi.fn(),
        drawCircle: vi.fn(),
        drawPolygon: vi.fn(),
        setPosition: vi.fn(),
        setZIndex: vi.fn(),
        setOpacity: vi.fn(),
        destroy: vi.fn(),
        getNativeNode: () => ({}),
      })),
      generateTexture: vi.fn((_gfx: any, opts: any) => {
        expect(opts).toEqual({ resolution: 0.5, scaleMode: "nearest" });
        const tex = { id: `tex_${bakedTextures.length}`, destroy: vi.fn() };
        bakedTextures.push(tex);
        return tex;
      }),
      createSprite: vi.fn((texture: any, tag: string) => {
        const nativeSprite = {
          roundPixels: false,
          cullable: false,
          eventMode: "auto",
        };
        spriteNativeProps.push(nativeSprite);
        return {
          tag,
          texture,
          setPosition: vi.fn(),
          setZIndex: vi.fn(),
          setOpacity: vi.fn(),
          setSize: vi.fn(),
          setTint: vi.fn(),
          getPosition: () => ({ x: 0, y: 0 }),
          destroy: vi.fn(),
          getNativeNode: () => nativeSprite,
        };
      }),
    };

    const bakedSky = setupParallaxSkySystem(mockBakeEngine);
    expect(bakedSky.clouds.length).toBe(7);
    expect(mockBakeEngine.generateTexture).toHaveBeenCalled();
    expect(mockBakeEngine.createSprite.mock.calls.length).toBeGreaterThanOrEqual(7);

    // Todos os sprites foram configurados para zero overhead
    spriteNativeProps.forEach((props) => {
      expect(props.roundPixels).toBe(true);
      expect(props.cullable).toBe(true);
      expect(props.eventMode).toBe("none");
    });

    // Ao destruir, texturas em cache devem ser liberadas
    bakedSky.destroy();
    bakedTextures.forEach((tex) => {
      expect(tex.destroy).toHaveBeenCalledWith(true);
    });
  });

  // =========================================================================
  // 29.6: Aurora Austral na Antártica (Lights Australis)
  // =========================================================================
  it("29.6: exibe cortinas de luz da Aurora Austral em tons esmeralda e magenta estritamente na Antártica", () => {
    const { k } = createMockKaboom();
    const aurora = setupAuroraSystem(k);

    expect(aurora.ribbons.length).toBe(6);

    // Na Antártica (2.000m), a aurora polar está ativa e ondulando
    k.setCamX(2000);
    k.triggerUpdate(0.016);
    expect(aurora.ribbons[0].opacity).toBeGreaterThan(0.08);

    // Na Travessia Pelágica (8.000m), a aurora polar desapareceu completamente
    k.setCamX(8000);
    k.triggerUpdate(0.016);
    expect(aurora.ribbons[0].opacity).toBe(0);

    aurora.destroy();
  });

  // =========================================================================
  // 29.7: Pôr do Sol em Camadas na Travessia Pelágica
  // =========================================================================
  it("29.7: interpola 5 faixas de gradiente crepuscular no pôr do sol da Travessia Pelágica", () => {
    const { k } = createMockKaboom();
    const sky = setupParallaxSkySystem(k);

    expect(sky.sunsetBands.length).toBe(5);

    // Na Antártica (1.000m), o pôr do sol pelágico é nulo
    k.setCamX(1000);
    k.triggerUpdate(0.016);
    expect(sky.sunsetBands[0].opacity).toBe(0);

    // No coração da Travessia Pelágica (8.000m), as 5 faixas de pôr do sol atingem intensidade plena
    k.setCamX(8000);
    k.triggerUpdate(0.016);
    expect(sky.sunsetBands[0].opacity).toBeGreaterThan(0.7);
    expect(sky.sunsetBands[4].opacity).toBeGreaterThan(0.7);

    sky.destroy();
  });

  // =========================================================================
  // 29.8: Aves Marinhas com Identidade de Espécie
  // =========================================================================
  it("29.8: modela albatrozes com asas longas, fragatas com cauda em tesoura e garças com pernas pendentes", () => {
    const { k } = createMockKaboom();
    const sky = setupParallaxSkySystem(k);

    const albatross = sky.birds.find((b) => b.flightType === "albatross");
    const frigate = sky.birds.find((b) => b.flightType === "frigatebird");
    const egret = sky.birds.find((b) => b.flightType === "egret");

    expect(albatross).toBeDefined();
    expect(frigate).toBeDefined();
    expect(egret).toBeDefined();

    // Albatroz possui envergadura de asa de 22px
    const albatrossWingComp = albatross?.wingLeft.comps.find(
      (c: any) => c && c.type === "rect" && c.w === 22
    );
    expect(albatrossWingComp).toBeDefined();

    // Fragata possui componente extra com a cauda bifurcada
    expect(frigate?.extra?.hasTag("sky_bird_tail")).toBe(true);

    // Garça possui pernas pendentes
    expect(egret?.extra?.hasTag("sky_bird_legs")).toBe(true);

    sky.destroy();
  });
});

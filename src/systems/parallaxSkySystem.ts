/**
 * Sistema de Céu em Paralaxe, Atmosfera e Fauna Aérea — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import { getRandomFloat } from "../utils/random";
import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

export interface SkyRenderObject {
  pos: { x: number; y: number };
  opacity: number;
  color?: unknown;
  angle?: number;
  comps: unknown[];
  hasTag(tag: string): boolean;
  exists(): boolean;
  destroy(): void;
}

interface CloudData {
  obj: SkyRenderObject;
  baseX: number;
  baseY: number;
  speed: number;
  parallaxFactor: number;
  width: number;
}

export type BirdSpecies = "albatross" | "frigatebird" | "egret";

export interface BirdData {
  body: SkyRenderObject;
  wingLeft: SkyRenderObject;
  wingRight: SkyRenderObject;
  extra?: SkyRenderObject;
  worldX: number;
  worldY: number;
  speedX: number;
  flightType: BirdSpecies;
  animOffset: number;
}

interface StarData {
  obj: SkyRenderObject;
  baseX: number;
  baseY: number;
  blinkPhase: number;
}

export interface ParallaxSkySystem {
  clouds: CloudData[];
  stars: StarData[];
  birds: BirdData[];
  moon: {
    disk: SkyRenderObject;
    halo: SkyRenderObject;
    reflections: SkyRenderObject[];
  };
  sunsetBands: SkyRenderObject[];
  destroy: () => void;
}

class PixiSkyNodeProxy implements SkyRenderObject {
  readonly pos: { x: number; y: number };
  comps: unknown[];
  private readonly node: IRenderNode;
  private readonly tagSet: Set<string>;
  private isDestroyed = false;
  private currentAngle = 0;
  private currentColor: unknown = [255, 255, 255];
  private currentX: number;
  private currentY: number;
  private currentOpacity: number;

  constructor(
    node: IRenderNode,
    tags: readonly string[] = [],
    comps: unknown[] = [],
    initialX: number = 0,
    initialY: number = 0,
    initialOpacity: number = 1
  ) {
    this.node = node;
    this.tagSet = new Set(tags);
    this.comps = comps;
    this.currentX = initialX;
    this.currentY = initialY;
    this.currentOpacity = initialOpacity;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.pos = {
      get x(): number {
        return self.currentX;
      },
      set x(value: number) {
        if (Math.abs(self.currentX - value) > 0.01) {
          self.currentX = value;
          self.node.setPosition(self.currentX, self.currentY);
        }
      },
      get y(): number {
        return self.currentY;
      },
      set y(value: number) {
        if (Math.abs(self.currentY - value) > 0.01) {
          self.currentY = value;
          self.node.setPosition(self.currentX, self.currentY);
        }
      },
    };
  }

  get opacity(): number {
    return this.currentOpacity;
  }

  set opacity(val: number) {
    if (Math.abs(this.currentOpacity - val) > 0.005) {
      this.currentOpacity = val;
      this.node.setOpacity(val);
    }
  }

  get angle(): number {
    return this.currentAngle;
  }

  set angle(val: number) {
    if (Math.abs(this.currentAngle - val) > 0.05) {
      this.currentAngle = val;
      this.node.setRotation((val * Math.PI) / 180);
    }
  }

  get color(): unknown {
    return this.currentColor;
  }

  set color(val: unknown) {
    this.currentColor = val;
    const native = this.node.getNativeNode<{ tint?: number }>();
    if (native && typeof native === "object" && "tint" in native) {
      if (Array.isArray(val) && val.length >= 3) {
        const nextTint = ((val[0] & 0xff) << 16) | ((val[1] & 0xff) << 8) | (val[2] & 0xff);
        if (native.tint !== nextTint) native.tint = nextTint;
      } else if (
        typeof val === "object" &&
        val !== null &&
        "r" in val &&
        "g" in val &&
        "b" in val
      ) {
        const rgb = val as { r: number; g: number; b: number };
        const nextTint = ((rgb.r & 0xff) << 16) | ((rgb.g & 0xff) << 8) | (rgb.b & 0xff);
        if (native.tint !== nextTint) native.tint = nextTint;
      }
    }
  }

  hasTag(tag: string): boolean {
    return this.tagSet.has(tag);
  }

  exists(): boolean {
    return !this.isDestroyed;
  }

  destroy(): void {
    this.isDestroyed = true;
    this.node.destroy();
  }
}

// Paleta 16-bits canônica para nuvens oceânicas (SKILL.md)
const CLOUD_PALETTE_BASE_HEX = 0xcfe2f3; // Base sombreada celeste (0xCFE2F3)
const CLOUD_PALETTE_TOP_HEX = 0xffffff; // Topo iluminado solar (0xFFFFFF)
const CLOUD_PALETTE_BASE_RGB: [number, number, number] = [207, 226, 243];
const CLOUD_PALETTE_TOP_RGB: [number, number, number] = [255, 255, 255];

function drawRetro16BitCloud(
  gfx: IGraphicsNode,
  width: number,
  height: number,
  puffs: number
): void {
  const baseHeight = height * 0.65;
  const baseOffset = height * 0.35;
  const baseRadius = baseHeight / 2;

  // 1. Camada Base Sombreada Celeste (0xCFE2F3) - volume e base plana arredondada
  gfx.drawRoundedRect(0, baseOffset, width, baseHeight, baseRadius, {
    fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
  });

  if (puffs === 4) {
    gfx.drawCircle(width * 0.20, height * 0.48, height * 0.42, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.42, height * 0.34, height * 0.54, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.66, height * 0.38, height * 0.48, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.82, height * 0.52, height * 0.38, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
  } else {
    gfx.drawCircle(width * 0.26, height * 0.48, height * 0.44, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.52, height * 0.35, height * 0.54, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.76, height * 0.50, height * 0.42, {
      fill: { color: CLOUD_PALETTE_BASE_HEX, alpha: 1 },
    });
  }

  // 2. Camada Topo Iluminado (0xFFFFFF) - volume iluminado pela luz solar superior
  const topHeight = height * 0.48;
  const topOffset = height * 0.22;
  const topInset = height * 0.10;
  gfx.drawRoundedRect(topInset, topOffset, width - topInset * 2, topHeight, topHeight / 2, {
    fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
  });

  if (puffs === 4) {
    gfx.drawCircle(width * 0.20, height * 0.42, height * 0.36, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.42, height * 0.28, height * 0.48, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.66, height * 0.32, height * 0.42, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.82, height * 0.46, height * 0.32, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
  } else {
    gfx.drawCircle(width * 0.26, height * 0.42, height * 0.38, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.52, height * 0.29, height * 0.48, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
    gfx.drawCircle(width * 0.76, height * 0.44, height * 0.36, {
      fill: { color: CLOUD_PALETTE_TOP_HEX, alpha: 1 },
    });
  }
}

function createCloudObject(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  options: {
    width: number;
    height: number;
    baseY: number;
    puffs: number;
    textureCache: Map<string, unknown>;
  }
): SkyRenderObject {
  if (isRenderEngine(engineOrContext)) {
    const { width, height, baseY, puffs, textureCache } = options;
    const cacheKey = `${width}_${height}_${puffs}`;

    const gfx = engineOrContext.createGraphics("sky_cloud");
    drawRetro16BitCloud(gfx, width, height, puffs);

    let bakedTexture: unknown = textureCache.get(cacheKey) ?? null;
    if (!bakedTexture) {
      if (typeof engineOrContext.generateTexture === "function") {
        bakedTexture = engineOrContext.generateTexture(gfx, {
          resolution: 0.5,
          scaleMode: "nearest",
        });
      } else {
        const renderer =
          typeof engineOrContext.getRenderer === "function"
            ? (engineOrContext.getRenderer() as { generateTexture?: (opts: unknown) => unknown })
            : null;
        if (renderer && typeof renderer.generateTexture === "function") {
          const nativeGfx =
            typeof gfx.getNativeNode === "function" ? gfx.getNativeNode() : gfx;
          try {
            bakedTexture = renderer.generateTexture({
              target: nativeGfx,
              resolution: 0.5,
              scaleMode: "nearest",
            });
          } catch {
            bakedTexture = null;
          }
        }
      }
      if (bakedTexture) {
        textureCache.set(cacheKey, bakedTexture);
      }
    }

    let renderNode: IRenderNode = gfx;
    if (bakedTexture && typeof engineOrContext.createSprite === "function") {
      try {
        const spriteNode = engineOrContext.createSprite(bakedTexture, "sky_cloud");
        const nativeSprite = spriteNode.getNativeNode<{
          roundPixels?: boolean;
          cullable?: boolean;
          eventMode?: string;
        }>();
        if (nativeSprite) {
          nativeSprite.roundPixels = true;
          nativeSprite.cullable = true;
          nativeSprite.eventMode = "none";
        }
        renderNode = spriteNode;
        gfx.destroy();
      } catch {
        renderNode = gfx;
      }
    }

    renderNode.setPosition(0, baseY);
    renderNode.setZIndex(-8);
    renderNode.setOpacity(1);
    engineOrContext.getStageRoot().addChild(renderNode);

    const comps: unknown[] = [
      "sky_cloud",
      {
        type: "rect",
        w: width,
        h: height,
        opts: { radius: height / 2 },
      },
    ];

    return new PixiSkyNodeProxy(renderNode, ["sky_cloud"], comps);
  }

  // Legacy Kaboom engine: silhueta blocada em 2 camadas (base celeste + topo iluminado)
  const rawCloud = engineOrContext.add([
    engineOrContext.rect(options.width, options.height, { radius: options.height / 2 }),
    engineOrContext.pos(0, options.baseY),
    engineOrContext.color(CLOUD_PALETTE_BASE_RGB[0], CLOUD_PALETTE_BASE_RGB[1], CLOUD_PALETTE_BASE_RGB[2]),
    engineOrContext.opacity(1),
    engineOrContext.z(-8),
    "sky_cloud",
  ]) as SkyRenderObject;

  if (typeof (rawCloud as any).add === "function") {
    (rawCloud as any).add([
      engineOrContext.rect(options.width - 6, options.height * 0.55, { radius: (options.height * 0.55) / 2 }),
      engineOrContext.pos(3, 0),
      engineOrContext.color(CLOUD_PALETTE_TOP_RGB[0], CLOUD_PALETTE_TOP_RGB[1], CLOUD_PALETTE_TOP_RGB[2]),
      engineOrContext.opacity(1),
      engineOrContext.z(-7.9),
    ]);
  }

  return rawCloud;
}

function createSkyObject(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  options: {
    tag: string;
    type: "rect" | "circle" | "polygon";
    x: number;
    y: number;
    zIndex: number;
    color: [number, number, number];
    opacity: number;
    width?: number;
    height?: number;
    radius?: number;
    points?: readonly { x: number; y: number }[];
    textureCache?: Map<string, unknown>;
  }
): SkyRenderObject {
  if (isRenderEngine(engineOrContext)) {
    const isPlainRect =
      options.type === "rect" &&
      (!options.radius || options.radius <= 0) &&
      options.width !== undefined &&
      options.height !== undefined;

    // A. Retângulos planos (faixas de pôr do sol, estrelas, reflexos da lua, partes de aves): instanciar como Sprite com zero overhead
    if (isPlainRect && typeof engineOrContext.createSprite === "function") {
      const sprite = engineOrContext.createSprite("white", options.tag);
      sprite.setPosition(options.x, options.y);
      if (typeof sprite.setSize === "function") {
        sprite.setSize(options.width ?? 1, options.height ?? 1);
      }
      sprite.setZIndex(options.zIndex);
      sprite.setOpacity(options.opacity);
      const colorNum =
        ((options.color[0] & 0xff) << 16) |
        ((options.color[1] & 0xff) << 8) |
        (options.color[2] & 0xff);
      if (typeof sprite.setTint === "function") {
        sprite.setTint(colorNum);
      }

      const nativeSprite = sprite.getNativeNode<{
        roundPixels?: boolean;
        cullable?: boolean;
        eventMode?: string;
      }>();
      if (nativeSprite) {
        nativeSprite.roundPixels = true;
        nativeSprite.cullable = true;
        nativeSprite.eventMode = "none";
      }

      engineOrContext.getStageRoot().addChild(sprite);

      const comps: unknown[] = [
        options.tag,
        {
          type: "rect",
          w: options.width,
          h: options.height,
        },
      ];
      return new PixiSkyNodeProxy(
        sprite,
        [options.tag],
        comps,
        options.x,
        options.y,
        options.opacity
      );
    }

    // B. Círculos, retângulos arredondados e polígonos: bake estático de textura
    const cacheKey = `${options.tag}_${options.type}_${options.radius ?? 0}_${options.width ?? 0}_${options.height ?? 0}`;
    let bakedTexture: unknown = options.textureCache?.get(cacheKey) ?? null;

    const gfx = engineOrContext.createGraphics(options.tag);
    if (options.type === "circle" && options.radius !== undefined) {
      gfx.drawCircle(0, 0, options.radius, {
        fill: { color: options.color, alpha: 1 },
      });
    } else if (
      options.type === "rect" &&
      options.width !== undefined &&
      options.height !== undefined
    ) {
      if (options.radius !== undefined && options.radius > 0) {
        gfx.drawRoundedRect(0, 0, options.width, options.height, options.radius, {
          fill: { color: options.color, alpha: 1 },
        });
      } else {
        gfx.drawRect(0, 0, options.width, options.height, {
          fill: { color: options.color, alpha: 1 },
        });
      }
    } else if (options.type === "polygon" && options.points) {
      gfx.drawPolygon(options.points, {
        fill: { color: options.color, alpha: 1 },
      });
    }

    if (!bakedTexture && options.textureCache) {
      if (typeof engineOrContext.generateTexture === "function") {
        bakedTexture = engineOrContext.generateTexture(gfx, {
          resolution: 0.5,
          scaleMode: "nearest",
        });
      } else {
        const renderer =
          typeof engineOrContext.getRenderer === "function"
            ? (engineOrContext.getRenderer() as { generateTexture?: (opts: unknown) => unknown })
            : null;
        if (renderer && typeof renderer.generateTexture === "function") {
          const nativeGfx =
            typeof gfx.getNativeNode === "function" ? gfx.getNativeNode() : gfx;
          try {
            bakedTexture = renderer.generateTexture({
              target: nativeGfx,
              resolution: 0.5,
              scaleMode: "nearest",
            });
          } catch {
            bakedTexture = null;
          }
        }
      }
      if (bakedTexture) {
        options.textureCache.set(cacheKey, bakedTexture);
      }
    }

    let renderNode: IRenderNode = gfx;
    if (bakedTexture && typeof engineOrContext.createSprite === "function") {
      try {
        const sprite = engineOrContext.createSprite(bakedTexture, options.tag);
        const nativeSprite = sprite.getNativeNode<{
          roundPixels?: boolean;
          cullable?: boolean;
          eventMode?: string;
        }>();
        if (nativeSprite) {
          nativeSprite.roundPixels = true;
          nativeSprite.cullable = true;
          nativeSprite.eventMode = "none";
        }
        renderNode = sprite;
        gfx.destroy();
      } catch {
        renderNode = gfx;
      }
    }

    renderNode.setPosition(options.x, options.y);
    renderNode.setZIndex(options.zIndex);
    renderNode.setOpacity(options.opacity);
    engineOrContext.getStageRoot().addChild(renderNode);

    const comps: unknown[] = [
      options.tag,
      options.type === "rect"
        ? {
            type: "rect",
            w: options.width,
            h: options.height,
            opts: {
              radius: options.radius ?? (options.height ? options.height / 2 : undefined),
            },
          }
        : null,
      options.type === "circle" ? { type: "circle", r: options.radius } : null,
      options.type === "polygon" ? { type: "polygon", pts: options.points } : null,
    ].filter(Boolean);

    return new PixiSkyNodeProxy(
      renderNode,
      [options.tag],
      comps,
      options.x,
      options.y,
      options.opacity
    );
  }

  // Legacy Kaboom engine
  const comps: unknown[] = [
    options.type === "circle" ? engineOrContext.circle(options.radius ?? 1) : null,
    options.type === "rect"
      ? engineOrContext.rect(
          options.width ?? 10,
          options.height ?? 10,
          options.radius !== undefined
            ? { radius: options.radius ?? (options.height ? options.height / 2 : undefined) }
            : undefined
        )
      : null,
    options.type === "polygon" && options.points ? engineOrContext.polygon(options.points) : null,
    engineOrContext.pos(options.x, options.y),
    engineOrContext.color(options.color[0], options.color[1], options.color[2]),
    engineOrContext.opacity(options.opacity),
    engineOrContext.z(options.zIndex),
    options.tag,
  ].filter(Boolean);

  const rawObj = engineOrContext.add(comps) as SkyRenderObject;
  return rawObj;
}

/**
 * Sistema de Céu em Paralaxe, Atmosfera e Fauna Aérea (Fase 29)
 * - Nuvens cumuliformes com morfologia realista em pixel art (29.5)
 * - Lua e coluna de reflexos ondulantes na Costa Urbana (29.2)
 * - Pôr do sol estratificado em 5 camadas na Travessia Pelágica (29.7)
 * - Aves marinhas autênticas por bioma: Albatroz, Fragata e Garça (29.8)
 */
export function setupParallaxSkySystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): ParallaxSkySystem {
  const isPixi = isRenderEngine(engineOrContext);
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;

  const bakedTextureCache = new Map<string, unknown>();

  // 1. PÔR DO SOL ESTRATIFICADO NA TRAVESSIA PELÁGICA (29.7: 5.000m - 12.000m)
  const sunsetConfigs: { y: number; h: number; col: [number, number, number] }[] = [
    { y: 0, h: 18, col: [45, 55, 95] },
    { y: 18, h: 18, col: [135, 80, 125] },
    { y: 36, h: 16, col: [210, 95, 105] },
    { y: 52, h: 16, col: [240, 145, 85] },
    { y: 68, h: 12, col: [255, 205, 115] },
  ];

  const sunsetBands: SkyRenderObject[] = sunsetConfigs.map((cfg) => {
    return createSkyObject(engineOrContext, {
      tag: "sky_sunset_band",
      type: "rect",
      x: -screenW / 2,
      y: cfg.y,
      width: screenW * 2.2,
      height: cfg.h,
      color: cfg.col,
      opacity: 0,
      zIndex: -9.5,
      textureCache: bakedTextureCache,
    });
  });

  // 2. NUVENS EM PARALAXE COM TEXTURAS ESTÁTICAS E ESTÉTICA 16-BITS (SKILL.md)
  const cloudCount = 7;
  const clouds: CloudData[] = [];

  for (let index = 0; index < cloudCount; index++) {
    const width = 80 + (index % 4) * 35;
    const height = 18 + (index % 3) * 6;
    const baseY = 10 + (index % 4) * 12;
    const parallaxFactor = 0.18 + (index % 3) * 0.1;
    const speed = 6 + (index % 3) * 4;
    const puffs = index % 2 === 0 ? 3 : 4;

    const cloudObj = createCloudObject(engineOrContext, {
      width,
      height,
      baseY,
      puffs,
      textureCache: bakedTextureCache,
    });

    clouds.push({
      obj: cloudObj,
      baseX: index * ((screenW / cloudCount) * 1.3),
      baseY,
      speed,
      parallaxFactor,
      width,
    });
  }


  // 3. ESTRELAS CINTILANTES NA COSTA URBANA (12.000m - 19.000m)
  const starCount = 28;
  const stars: StarData[] = [];

  for (let index = 0; index < starCount; index++) {
    const starY = 8 + (index % 6) * 11;
    stars.push({
      obj: createSkyObject(engineOrContext, {
        tag: "sky_star",
        type: "rect",
        x: 0,
        y: starY,
        width: 1.5,
        height: 1.5,
        color: [240, 245, 255],
        opacity: 0,
        zIndex: -9,
        textureCache: bakedTextureCache,
      }),
      baseX: index * ((screenW / starCount) * 1.4),
      baseY: starY,
      blinkPhase: getRandomFloat(0, Math.PI * 2),
    });
  }

  // 4. LUA E REFLEXO AQUÁTICO NA COSTA URBANA (29.2: 12.000m - 19.000m)
  const moonDisk = createSkyObject(engineOrContext, {
    tag: "sky_moon",
    type: "circle",
    x: 0,
    y: 22,
    radius: 16,
    color: [248, 242, 215],
    opacity: 0,
    zIndex: -9,
    textureCache: bakedTextureCache,
  });

  const moonHalo = createSkyObject(engineOrContext, {
    tag: "sky_moon_halo",
    type: "circle",
    x: 0,
    y: 22,
    radius: 26,
    color: [248, 242, 215],
    opacity: 0,
    zIndex: -9.2,
    textureCache: bakedTextureCache,
  });

  const reflectionConfigs = [
    { offY: 4, w: 22, baseAlpha: 0.32 },
    { offY: 12, w: 17, baseAlpha: 0.24 },
    { offY: 22, w: 13, baseAlpha: 0.17 },
    { offY: 34, w: 9, baseAlpha: 0.11 },
    { offY: 48, w: 6, baseAlpha: 0.05 },
  ];

  const moonReflections: SkyRenderObject[] = reflectionConfigs.map((rc) => {
    return createSkyObject(engineOrContext, {
      tag: "sky_moon_reflection",
      type: "rect",
      x: 0,
      y: GAME_CONFIG.SEA_LEVEL + rc.offY,
      width: rc.w,
      height: 2.5,
      color: [248, 242, 215],
      opacity: 0,
      zIndex: 2,
      textureCache: bakedTextureCache,
    });
  });

  // 5. AVES MARINHAS COM IDENTIDADE DE ESPÉCIE (29.8)
  const birds: BirdData[] = [];
  const birdSpawnPoints = [
    { x: 900, y: 35, type: "albatross" as const, speed: 72 },
    { x: 2600, y: 24, type: "albatross" as const, speed: 80 },
    { x: 4300, y: 38, type: "albatross" as const, speed: 68 },
    { x: 7200, y: 28, type: "albatross" as const, speed: 75 },
    { x: 10400, y: 25, type: "frigatebird" as const, speed: 82 },
    { x: 13600, y: 30, type: "frigatebird" as const, speed: 78 },
    { x: 16900, y: 20, type: "frigatebird" as const, speed: 85 },
    { x: 21500, y: 34, type: "egret" as const, speed: 58 },
    { x: 24200, y: 26, type: "egret" as const, speed: 52 },
    { x: 26400, y: 18, type: "egret" as const, speed: 48 },
  ];

  birdSpawnPoints.forEach((b, idx) => {
    let bodyColor: [number, number, number];
    let wingColor: [number, number, number];
    let wingLength: number;
    let bodyWidth: number;
    let extraObj: SkyRenderObject | undefined = undefined;

    if (b.type === "albatross") {
      bodyColor = [240, 245, 255];
      wingColor = [55, 65, 75];
      wingLength = 22;
      bodyWidth = 13;
    } else if (b.type === "frigatebird") {
      bodyColor = [25, 25, 30];
      wingColor = [35, 35, 42];
      wingLength = 16;
      bodyWidth = 11;

      extraObj = createSkyObject(engineOrContext, {
        tag: "sky_bird_tail",
        type: "polygon",
        x: b.x - 5,
        y: b.y,
        points: [
          { x: 0, y: 0 },
          { x: -7, y: -3.5 },
          { x: -3, y: 0 },
          { x: -7, y: 3.5 },
        ],
        color: [25, 25, 30],
        opacity: 1,
        zIndex: -7,
        textureCache: bakedTextureCache,
      });
    } else {
      bodyColor = [255, 255, 255];
      wingColor = [235, 240, 245];
      wingLength = 13;
      bodyWidth = 9;

      extraObj = createSkyObject(engineOrContext, {
        tag: "sky_bird_legs",
        type: "rect",
        x: b.x - 6,
        y: b.y + 2,
        width: 6,
        height: 1.2,
        color: [30, 30, 35],
        opacity: 1,
        zIndex: -7,
        textureCache: bakedTextureCache,
      });
    }

    const body = createSkyObject(engineOrContext, {
      tag: "sky_bird",
      type: "rect",
      x: b.x,
      y: b.y,
      width: bodyWidth,
      height: 3,
      color: bodyColor,
      opacity: 1,
      zIndex: -7,
      textureCache: bakedTextureCache,
    });

    const wingLeft = createSkyObject(engineOrContext, {
      tag: "sky_bird_wing_left",
      type: "rect",
      x: b.x - 2,
      y: b.y,
      width: wingLength,
      height: 2.2,
      color: wingColor,
      opacity: 1,
      zIndex: -7,
      textureCache: bakedTextureCache,
    });

    const wingRight = createSkyObject(engineOrContext, {
      tag: "sky_bird_wing_right",
      type: "rect",
      x: b.x + 2,
      y: b.y,
      width: wingLength,
      height: 2.2,
      color: wingColor,
      opacity: 1,
      zIndex: -7,
      textureCache: bakedTextureCache,
    });

    birds.push({
      body,
      wingLeft,
      wingRight,
      extra: extraObj,
      worldX: b.x,
      worldY: b.y,
      speedX: b.speed,
      flightType: b.type,
      animOffset: idx * 1.3,
    });
  });

  let time = 0;

  const stepUpdate = (deltaTime: number): void => {
    time += deltaTime;
    const camX = resolveCameraX(engineOrContext);
    const screenLeft = camX - screenW / 2;

    // A. Pôr do Sol
    const sunsetIntensity =
      camX < 4800
        ? 0
        : camX < 5800
          ? (camX - 4800) / 1000
          : camX > 12200
            ? 0
            : camX > 11200
              ? (12200 - camX) / 1000
              : 1.0;

    const bandCount = sunsetBands.length;
    for (let i = 0; i < bandCount; i++) {
      const band = sunsetBands[i];
      band.pos.x = screenLeft - screenW * 0.1;
      band.opacity = sunsetIntensity * 0.88;
    }

    // B. Nuvens em Paralaxe (movimento horizontal in-place com reciclagem/wrapping — SKILL.md)
    const wrapWidth = screenW * 1.5;
    const cloudCountLen = clouds.length;
    for (let i = 0; i < cloudCountLen; i++) {
      const c = clouds[i];
      const drift = time * c.speed;
      const effectivePos = (c.baseX + drift + camX * c.parallaxFactor) % wrapWidth;
      c.obj.pos.x = screenLeft - 100 + effectivePos;
    }

    // C. Noite Urbana: Estrelas, Lua e Reflexos
    const nightIntensity =
      camX >= 11500 && camX <= 19500
        ? camX < 13000
          ? (camX - 11500) / 1500
          : camX > 18000
            ? (19500 - camX) / 1500
            : 1.0
        : 0;

    const starCountLen = stars.length;
    const starWrap = screenW * 1.4;
    for (let i = 0; i < starCountLen; i++) {
      const s = stars[i];
      const effPos = (s.baseX + camX * 0.05) % starWrap;
      s.obj.pos.x = screenLeft - 50 + effPos;
      const twinkle = Math.sin(time * 3.5 + s.blinkPhase) * 0.35 + 0.65;
      s.obj.opacity = nightIntensity * twinkle * 0.9;
    }

    const moonX = screenLeft + screenW * 0.68;
    moonDisk.pos.x = moonX;
    moonHalo.pos.x = moonX;
    moonDisk.opacity = nightIntensity * 0.92;
    moonHalo.opacity = nightIntensity * 0.18;

    const reflCount = moonReflections.length;
    for (let i = 0; i < reflCount; i++) {
      const waveSway = Math.sin(time * 3.2 + i * 0.85) * (4 + i * 2.2);
      moonReflections[i].pos.x = moonX + waveSway;
      moonReflections[i].opacity = nightIntensity * reflectionConfigs[i].baseAlpha;
    }

    // D. Aves Marinhas
    const birdCount = birds.length;
    for (let i = 0; i < birdCount; i++) {
      const b = birds[i];
      b.worldX += b.speedX * deltaTime;

      let flapSpeed: number;
      let flapAmplitude: number;

      if (b.flightType === "albatross") {
        flapSpeed = 3.4;
        flapAmplitude = 18;
      } else if (b.flightType === "frigatebird") {
        flapSpeed = 6.2;
        flapAmplitude = 26;
      } else {
        flapSpeed = 7.2;
        flapAmplitude = 22;
      }

      const wingAngle = Math.sin(time * flapSpeed + b.animOffset) * flapAmplitude;
      const altSway = Math.cos(time * 2.0 + b.animOffset) * 4;
      const currentY = b.worldY + altSway;

      b.body.pos.x = b.worldX;
      b.body.pos.y = currentY;

      b.wingLeft.pos.x = b.worldX - 2;
      b.wingLeft.pos.y = currentY;
      b.wingLeft.angle = -wingAngle;

      b.wingRight.pos.x = b.worldX + 2;
      b.wingRight.pos.y = currentY;
      b.wingRight.angle = wingAngle;

      if (b.extra && typeof b.extra.exists === "function" && b.extra.exists()) {
        b.extra.pos.x = b.worldX - 5;
        b.extra.pos.y = currentY + (b.flightType === "egret" ? 2 : 0);
      }
    }
  };

  let unregisterTicker: () => void;

  if (isPixi) {
    unregisterTicker = engineOrContext.getTicker().add((deltaTime) => {
      stepUpdate(deltaTime);
    });
  } else {
    const handle = engineOrContext.onUpdate(() => {
      stepUpdate(engineOrContext.dt());
    });
    unregisterTicker = () => {
      if (typeof handle === "function") {
        handle();
      } else if (
        handle &&
        typeof handle === "object" &&
        "cancel" in handle &&
        typeof (handle as { cancel: () => void }).cancel === "function"
      ) {
        (handle as { cancel: () => void }).cancel();
      }
    };
  }

  const destroy = (): void => {
    unregisterTicker();
    bakedTextureCache.forEach((tex: unknown) => {
      if (tex && typeof (tex as { destroy?: (destroyBase?: boolean) => void }).destroy === "function") {
        (tex as { destroy: (destroyBase?: boolean) => void }).destroy(true);
      }
    });
    bakedTextureCache.clear();
    sunsetBands.forEach((sb) => sb.destroy && sb.destroy());
    clouds.forEach((c) => c.obj.destroy && c.obj.destroy());
    stars.forEach((s) => s.obj.destroy && s.obj.destroy());
    if (moonDisk.destroy) moonDisk.destroy();
    if (moonHalo.destroy) moonHalo.destroy();
    moonReflections.forEach((mr) => mr.destroy && mr.destroy());
    birds.forEach((b) => {
      if (b.body.destroy) b.body.destroy();
      if (b.wingLeft.destroy) b.wingLeft.destroy();
      if (b.wingRight.destroy) b.wingRight.destroy();
      if (b.extra && b.extra.destroy) b.extra.destroy();
    });
  };

  return {
    clouds,
    stars,
    birds,
    moon: {
      disk: moonDisk,
      halo: moonHalo,
      reflections: moonReflections,
    },
    sunsetBands,
    destroy,
  };
}

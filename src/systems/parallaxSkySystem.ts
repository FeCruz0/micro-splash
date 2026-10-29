/**
 * Sistema de Céu em Paralaxe, Atmosfera e Fauna Aérea — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import { getRandomFloat } from "../utils/random";
import type { IRenderEngine, IRenderNode } from "../engine/contracts/INTERFACE_CONTRACTS";
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

  constructor(node: IRenderNode, tags: readonly string[] = [], comps: unknown[] = []) {
    this.node = node;
    this.tagSet = new Set(tags);
    this.comps = comps;

    this.pos = {
      get x(): number {
        return node.getPosition().x;
      },
      set x(value: number) {
        node.setPosition(value, node.getPosition().y);
      },
      get y(): number {
        return node.getPosition().y;
      },
      set y(value: number) {
        node.setPosition(node.getPosition().x, value);
      },
    };
  }

  get opacity(): number {
    return this.node.getOpacity();
  }

  set opacity(val: number) {
    this.node.setOpacity(val);
  }

  get angle(): number {
    return this.currentAngle;
  }

  set angle(val: number) {
    this.currentAngle = val;
    this.node.setRotation((val * Math.PI) / 180);
  }

  get color(): unknown {
    return this.currentColor;
  }

  set color(val: unknown) {
    this.currentColor = val;
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
  }
): SkyRenderObject {
  if (isRenderEngine(engineOrContext)) {
    const gfx = engineOrContext.createGraphics(options.tag);
    if (options.type === "circle" && options.radius !== undefined) {
      gfx.drawCircle(0, 0, options.radius, {
        fill: { color: options.color, alpha: options.opacity },
      });
    } else if (
      options.type === "rect" &&
      options.width !== undefined &&
      options.height !== undefined
    ) {
      gfx.drawRect(0, 0, options.width, options.height, {
        fill: { color: options.color, alpha: options.opacity },
      });
    } else if (options.type === "polygon" && options.points) {
      gfx.drawPolygon(options.points, {
        fill: { color: options.color, alpha: options.opacity },
      });
    }

    gfx.setPosition(options.x, options.y);
    gfx.setZIndex(options.zIndex);
    gfx.setOpacity(options.opacity);
    engineOrContext.getStageRoot().addChild(gfx);

    const comps: unknown[] = [
      options.tag,
      options.type === "rect" ? { type: "rect", w: options.width, h: options.height } : null,
      options.type === "circle" ? { type: "circle", r: options.radius } : null,
      options.type === "polygon" ? { type: "polygon", pts: options.points } : null,
    ].filter(Boolean);

    return new PixiSkyNodeProxy(gfx, [options.tag], comps);
  }

  // Legacy Kaboom engine
  const comps: unknown[] = [
    options.type === "circle" ? engineOrContext.circle(options.radius ?? 1) : null,
    options.type === "rect"
      ? engineOrContext.rect(options.width ?? 10, options.height ?? 10)
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
    });
  });

  // 2. NUVENS EM PARALAXE
  const cloudCount = 7;
  const clouds: CloudData[] = [];

  for (let index = 0; index < cloudCount; index++) {
    const width = 80 + (index % 4) * 35;
    const height = 18 + (index % 3) * 6;
    const baseY = 10 + (index % 4) * 12;
    const parallaxFactor = 0.18 + (index % 3) * 0.1;
    const speed = 6 + (index % 3) * 4;

    const cloudObj = createSkyObject(engineOrContext, {
      tag: "sky_cloud",
      type: "rect",
      x: 0,
      y: baseY,
      width,
      height,
      color: [255, 255, 255],
      opacity: 0.45 + (index % 3) * 0.15,
      zIndex: -8,
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
    const starObj = createSkyObject(engineOrContext, {
      tag: "sky_star",
      type: "rect",
      x: 0,
      y: starY,
      width: 1.5,
      height: 1.5,
      color: [240, 245, 255],
      opacity: 0,
      zIndex: -9,
    });

    stars.push({
      obj: starObj,
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

    sunsetBands.forEach((band) => {
      band.pos.x = screenLeft - screenW * 0.1;
      band.opacity = sunsetIntensity * 0.88;
    });

    // B. Nuvens em Paralaxe
    clouds.forEach((c) => {
      const drift = time * c.speed;
      const effectivePos = (c.baseX + drift + camX * c.parallaxFactor) % (screenW * 1.5);
      c.obj.pos.x = screenLeft - 100 + effectivePos;

      if (camX < 5000) {
        c.obj.opacity = 0.55;
      } else if (camX < 12000) {
        c.obj.opacity = 0.65;
      } else if (camX < 19000) {
        c.obj.opacity = 0.4;
      } else if (camX < 25000) {
        c.obj.opacity = 0.55;
      } else {
        c.obj.opacity = 0.6;
      }
    });

    // C. Noite Urbana: Estrelas, Lua e Reflexos
    const nightIntensity =
      camX >= 11500 && camX <= 19500
        ? camX < 13000
          ? (camX - 11500) / 1500
          : camX > 18000
            ? (19500 - camX) / 1500
            : 1.0
        : 0;

    stars.forEach((s) => {
      const effPos = (s.baseX + camX * 0.05) % (screenW * 1.4);
      s.obj.pos.x = screenLeft - 50 + effPos;
      const twinkle = Math.sin(time * 3.5 + s.blinkPhase) * 0.35 + 0.65;
      s.obj.opacity = nightIntensity * twinkle * 0.9;
    });

    const moonX = screenLeft + screenW * 0.68;
    moonDisk.pos.x = moonX;
    moonHalo.pos.x = moonX;
    moonDisk.opacity = nightIntensity * 0.92;
    moonHalo.opacity = nightIntensity * 0.18;

    moonReflections.forEach((ref, idx) => {
      const waveSway = Math.sin(time * 3.2 + idx * 0.85) * (4 + idx * 2.2);
      ref.pos.x = moonX + waveSway;
      ref.opacity = nightIntensity * reflectionConfigs[idx].baseAlpha;
    });

    // D. Aves Marinhas
    birds.forEach((b) => {
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
    });
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

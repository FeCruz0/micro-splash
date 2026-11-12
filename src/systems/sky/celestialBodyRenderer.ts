/**
 * Gerenciador e renderizador de corpos celestes (sol, estrelas, lua e reflexos).
 */

import { GAME_CONFIG } from "../../config";
import type { IRenderEngine } from "../../engine/contracts/INTERFACE_CONTRACTS";
import type { SkyRenderObject, StarData } from "./skyTypes";
import { createSkyObject } from "./skyObjectRenderer";

export interface CelestialSystemElements {
  sunsetBands: SkyRenderObject[];
  stars: StarData[];
  moon: {
    disk: SkyRenderObject;
    halo: SkyRenderObject;
    reflections: SkyRenderObject[];
  };
}

export const MOON_REFLECTION_CONFIGS = [
  { offY: 4, w: 22, baseAlpha: 0.32 },
  { offY: 12, w: 17, baseAlpha: 0.24 },
  { offY: 22, w: 13, baseAlpha: 0.17 },
  { offY: 34, w: 9, baseAlpha: 0.11 },
  { offY: 48, w: 6, baseAlpha: 0.05 },
];

export function createCelestialElements(
  engineOrContext: IRenderEngine | unknown,
  screenW: number,
  textureCache: Map<string, unknown>
): CelestialSystemElements {
  // Pôr do Sol
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
      textureCache,
    });
  });

  // Estrelas Cintilantes
  const starCount = 28;
  const stars: StarData[] = [];

  for (let index = 0; index < starCount; index++) {
    const starY = 8 + (index % 6) * 11;
    stars.push({
      obj: createSkyObject(engineOrContext, {
        tag: "sky_star",
        type: "rect",
        x: index * (screenW / starCount),
        y: starY,
        width: 1.8,
        height: 1.8,
        color: [240, 248, 255],
        opacity: 0,
        zIndex: -9,
        textureCache,
      }),
      baseX: index * (screenW / starCount),
      baseY: starY,
      blinkPhase: (index * 1.7) % (Math.PI * 2),
    });
  }

  // Lua e Halo
  const moonDisk = createSkyObject(engineOrContext, {
    tag: "sky_moon_disk",
    type: "circle",
    x: 0,
    y: 22,
    radius: 14,
    color: [255, 252, 235],
    opacity: 0,
    zIndex: -9,
    textureCache,
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
    textureCache,
  });

  const moonReflections: SkyRenderObject[] = MOON_REFLECTION_CONFIGS.map((rc) => {
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
      textureCache,
    });
  });

  return {
    sunsetBands,
    stars,
    moon: {
      disk: moonDisk,
      halo: moonHalo,
      reflections: moonReflections,
    },
  };
}

export function updateCelestialElements(
  elements: CelestialSystemElements,
  camX: number,
  screenLeft: number,
  screenW: number,
  time: number
): void {
  // A. Por do Sol
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

  const bandCount = elements.sunsetBands.length;
  for (let i = 0; i < bandCount; i++) {
    const band = elements.sunsetBands[i];
    band.pos.x = screenLeft - screenW * 0.1;
    band.opacity = sunsetIntensity * 0.88;
  }

  // B. Noite Urbana: Estrelas, Lua e Reflexos
  const nightIntensity =
    camX >= 11500 && camX <= 19500
      ? camX < 13000
        ? (camX - 11500) / 1500
        : camX > 18000
          ? (19500 - camX) / 1500
          : 1.0
      : 0;

  const starCountLen = elements.stars.length;
  const starWrap = screenW * 1.4;
  for (let i = 0; i < starCountLen; i++) {
    const s = elements.stars[i];
    const effPos = (s.baseX + camX * 0.05) % starWrap;
    s.obj.pos.x = screenLeft - 50 + effPos;
    const twinkle = Math.sin(time * 3.5 + s.blinkPhase) * 0.35 + 0.65;
    s.obj.opacity = nightIntensity * twinkle * 0.9;
  }

  const moonX = screenLeft + screenW * 0.68;
  elements.moon.disk.pos.x = moonX;
  elements.moon.halo.pos.x = moonX;
  elements.moon.disk.opacity = nightIntensity * 0.92;
  elements.moon.halo.opacity = nightIntensity * 0.18;

  const reflCount = elements.moon.reflections.length;
  for (let i = 0; i < reflCount; i++) {
    const waveSway = Math.sin(time * 3.2 + i * 0.85) * (4 + i * 2.2);
    elements.moon.reflections[i].pos.x = moonX + waveSway;
    elements.moon.reflections[i].opacity = nightIntensity * MOON_REFLECTION_CONFIGS[i].baseAlpha;
  }
}

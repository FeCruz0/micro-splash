/**
 * Sistema de Ceu em Paralaxe, Atmosfera e Fauna Aerea — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado em submodulos coesos (< 300 linhas):
 * - skyTypes.ts
 * - pixiSkyNodeProxy.ts
 * - cloudLayerRenderer.ts
 * - skyObjectRenderer.ts
 * - celestialBodyRenderer.ts
 * - skyFaunaRenderer.ts
 */

import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveCameraX } from "./cameraSystem";
import type {
  SkyRenderObject,
  CloudData,
  BirdSpecies,
  BirdData,
  StarData,
  ParallaxSkySystem,
  LegacyParallaxSkyEngineContext,
} from "./sky/skyTypes";
import { createCloudObject } from "./sky/cloudLayerRenderer";
import { createCelestialElements, updateCelestialElements } from "./sky/celestialBodyRenderer";
import { createSkyBirds, updateSkyBirds } from "./sky/skyFaunaRenderer";

export type { SkyRenderObject, CloudData, BirdSpecies, BirdData, StarData, ParallaxSkySystem };

/**
 * Sistema de Ceu em Paralaxe, Atmosfera e Fauna Aerea (Fase 29)
 * - Nuvens cumuliformes com morfologia realista em pixel art (29.5)
 * - Lua e coluna de reflexos ondulantes na Costa Urbana (29.2)
 * - Por do sol estratificado em 5 camadas na Travessia Pelagica (29.7)
 * - Aves marinhas autenticas por bioma: Albatroz, Fragata e Garca (29.8)
 */
export function setupParallaxSkySystem(
  engineOrContext: IRenderEngine | unknown
): ParallaxSkySystem {
  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  const legacyEngineContext = !resolvedRenderEngine
    ? (engineOrContext as LegacyParallaxSkyEngineContext)
    : undefined;
  const screenW = resolvedRenderEngine
    ? resolvedRenderEngine.getDimensions().width
    : typeof legacyEngineContext?.width === "function"
      ? legacyEngineContext.width()
      : 640;

  const bakedTextureCache = new Map<string, unknown>();

  // 1. Pôr do sol, estrelas e lua
  const celestial = createCelestialElements(engineOrContext, screenW, bakedTextureCache);

  // 2. Nuvens em paralaxe
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

  // 3. Aves marinhas
  const birds = createSkyBirds(engineOrContext, bakedTextureCache);

  let time = 0;

  const stepUpdate = (deltaTime: number): void => {
    time += deltaTime;
    const camX = resolveCameraX(resolvedRenderEngine ?? engineOrContext);
    const screenLeft = camX - screenW / 2;

    // Atualiza corpos celestes
    updateCelestialElements(celestial, camX, screenLeft, screenW, time);

    // Nuvens em paralaxe
    const wrapWidth = screenW * 1.5;
    const cloudCountLen = clouds.length;
    for (let i = 0; i < cloudCountLen; i++) {
      const c = clouds[i];
      const drift = time * c.speed;
      const effectivePos = (c.baseX + drift + camX * c.parallaxFactor) % wrapWidth;
      c.obj.pos.x = screenLeft - 100 + effectivePos;
    }

    // Aves marinhas
    updateSkyBirds(birds, deltaTime, time);
  };

  let unregisterTicker: () => void;

  if (resolvedRenderEngine) {
    unregisterTicker = resolvedRenderEngine.getTicker().add((deltaTime) => {
      stepUpdate(deltaTime);
    });
  } else if (legacyEngineContext) {
    const handle = legacyEngineContext.onUpdate(() => {
      stepUpdate(legacyEngineContext.dt());
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
      if (
        tex &&
        typeof (tex as { destroy?: (destroyBase?: boolean) => void }).destroy === "function"
      ) {
        (tex as { destroy: (destroyBase?: boolean) => void }).destroy(true);
      }
    });
    bakedTextureCache.clear();
    celestial.sunsetBands.forEach((sb) => sb.destroy && sb.destroy());
    clouds.forEach((c) => c.obj.destroy && c.obj.destroy());
    celestial.stars.forEach((s) => s.obj.destroy && s.obj.destroy());
    if (celestial.moon.disk.destroy) celestial.moon.disk.destroy();
    if (celestial.moon.halo.destroy) celestial.moon.halo.destroy();
    celestial.moon.reflections.forEach((mr) => mr.destroy && mr.destroy());
    birds.forEach((b) => {
      if (b.body.destroy) b.body.destroy();
      if (b.wingLeft.destroy) b.wingLeft.destroy();
      if (b.wingRight.destroy) b.wingRight.destroy();
      if (b.extra && b.extra.destroy) b.extra.destroy();
    });
  };

  return {
    clouds,
    stars: celestial.stars,
    birds,
    moon: celestial.moon,
    sunsetBands: celestial.sunsetBands,
    destroy,
  };
}

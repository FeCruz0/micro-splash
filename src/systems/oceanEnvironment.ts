/**
 * Sistema de Ambiente Oceânico e Ciclo Cromático dos Biomas — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { BIOME_COLOR_STOPS, GAME_CONFIG, type BiomeColorStop } from "../config";
import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";

/**
 * Retorna o bioma atual com base na distância percorrida.
 */
export function getCurrentBiome(distance: number): BiomeColorStop {
  const clampedDistance = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);

  return (
    BIOME_COLOR_STOPS.find(
      (stop) => clampedDistance >= stop.distanceStart && clampedDistance <= stop.distanceEnd
    ) || BIOME_COLOR_STOPS[BIOME_COLOR_STOPS.length - 1]
  );
}

export interface OceanColorsResult<TColor = unknown> {
  bgColor: TColor;
  surfaceColor: TColor;
  floorColor: TColor;
  skyColor: TColor;
  currentBiome: BiomeColorStop;
}

export interface OceanEnvironmentEngineContext {
  lerp?: (a: number, b: number, t: number) => number;
  rgb?: (r: number, g: number, b: number) => unknown;
  setBackground?: (color: unknown) => void;
}

/**
 * Calcula as cores interpoladas (background, superfície e chão) para uma dada distância.
 */
export function getColorsAtDistance(
  engineOrContext: IRenderEngine | OceanEnvironmentEngineContext,
  distance: number
): OceanColorsResult {
  const clampedDistance = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);
  const currentStop = getCurrentBiome(clampedDistance);

  let sourceStop: BiomeColorStop = currentStop;
  let targetStop: BiomeColorStop = currentStop;
  let lerpFactor = 0;

  for (let i = 0; i < BIOME_COLOR_STOPS.length - 1; i++) {
    const stop = BIOME_COLOR_STOPS[i];
    const transition = stop.transitionOut;
    if (
      transition &&
      clampedDistance >= transition.startDistance &&
      clampedDistance <= transition.endDistance
    ) {
      sourceStop = stop;
      targetStop = BIOME_COLOR_STOPS[i + 1];
      const range = transition.endDistance - transition.startDistance;
      const rawProgress = range > 0 ? (clampedDistance - transition.startDistance) / range : 0;
      const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);
      // Smoothstep para entrada e saída contínuas sem degraus cromáticos
      lerpFactor = clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
      break;
    }
  }

  const lerpFn =
    "lerp" in engineOrContext && typeof engineOrContext.lerp === "function"
      ? engineOrContext.lerp
      : (a: number, b: number, t: number) => a + (b - a) * t;

  const rgbFn =
    "rgb" in engineOrContext && typeof engineOrContext.rgb === "function"
      ? (r: number, g: number, b: number) =>
          (engineOrContext.rgb as (r: number, g: number, b: number) => unknown)(r, g, b)
      : (r: number, g: number, b: number) => ({
          r: Math.round(r),
          g: Math.round(g),
          b: Math.round(b),
        });

  // Interpolação RGB para Fundo
  const bgR = lerpFn(sourceStop.bgColor[0], targetStop.bgColor[0], lerpFactor);
  const bgG = lerpFn(sourceStop.bgColor[1], targetStop.bgColor[1], lerpFactor);
  const bgB = lerpFn(sourceStop.bgColor[2], targetStop.bgColor[2], lerpFactor);

  // Interpolação RGB para Superfície
  const sfR = lerpFn(sourceStop.surfaceColor[0], targetStop.surfaceColor[0], lerpFactor);
  const sfG = lerpFn(sourceStop.surfaceColor[1], targetStop.surfaceColor[1], lerpFactor);
  const sfB = lerpFn(sourceStop.surfaceColor[2], targetStop.surfaceColor[2], lerpFactor);

  // Interpolação RGB para Chão
  const flR = lerpFn(sourceStop.floorColor[0], targetStop.floorColor[0], lerpFactor);
  const flG = lerpFn(sourceStop.floorColor[1], targetStop.floorColor[1], lerpFactor);
  const flB = lerpFn(sourceStop.floorColor[2], targetStop.floorColor[2], lerpFactor);

  // Interpolação RGB para o Céu
  const skR = lerpFn(sourceStop.skyColor[0], targetStop.skyColor[0], lerpFactor);
  const skG = lerpFn(sourceStop.skyColor[1], targetStop.skyColor[1], lerpFactor);
  const skB = lerpFn(sourceStop.skyColor[2], targetStop.skyColor[2], lerpFactor);

  return {
    bgColor: rgbFn(bgR, bgG, bgB),
    surfaceColor: rgbFn(sfR, sfG, sfB),
    floorColor: rgbFn(flR, flG, flB),
    skyColor: rgbFn(skR, skG, skB),
    currentBiome: currentStop,
  };
}

let lastEvaluatedDistance = -999999;
let cachedOceanColors: OceanColorsResult | null = null;

/**
 * Reseta o cache de cores do oceano (útil entre transições de cena e em testes).
 */
export function resetOceanColorsCache(): void {
  lastEvaluatedDistance = -999999;
  cachedOceanColors = null;
}

/**
 * Verifica se a distância atual ultrapassou o limiar de dirty-check para recalcular cores.
 */
export function isOceanColorDirty(distance: number, thresholdInMeters: number = 5): boolean {
  return (
    Math.abs(distance - lastEvaluatedDistance) >= thresholdInMeters || cachedOceanColors === null
  );
}

/**
 * Atualiza o ambiente marítimo e o céu aplicando dirty-checking para evitar
 * interpolações e alocações repetidas de cores a cada quadro.
 */
export function updateOceanColors(
  engineOrContext: IRenderEngine | OceanEnvironmentEngineContext,
  distance: number,
  surfaceObj?: unknown,
  floorObj?: unknown,
  skyObj?: unknown,
  forceUpdate: boolean = false
): void {
  const isDirty = forceUpdate || isOceanColorDirty(distance, 5);

  if (isDirty || !cachedOceanColors) {
    cachedOceanColors = getColorsAtDistance(engineOrContext, distance);
    lastEvaluatedDistance = distance;

    if (
      "setBackground" in engineOrContext &&
      typeof (engineOrContext as { setBackground?: (c: unknown) => void }).setBackground ===
        "function"
    ) {
      (engineOrContext as { setBackground: (c: unknown) => void }).setBackground(
        cachedOceanColors.bgColor
      );
    }

    if (surfaceObj && typeof surfaceObj === "object") {
      if (
        "updateColor" in surfaceObj &&
        typeof (surfaceObj as { updateColor: (c: unknown) => void }).updateColor === "function"
      ) {
        (surfaceObj as { updateColor: (c: unknown) => void }).updateColor(
          cachedOceanColors.surfaceColor
        );
      } else if (
        "updateSurfaceColor" in surfaceObj &&
        typeof (surfaceObj as { updateSurfaceColor: (c: unknown) => void }).updateSurfaceColor ===
          "function"
      ) {
        (surfaceObj as { updateSurfaceColor: (c: unknown) => void }).updateSurfaceColor(
          cachedOceanColors.surfaceColor
        );
      } else if ("color" in surfaceObj) {
        (surfaceObj as { color: unknown }).color = cachedOceanColors.surfaceColor;
      }
    }

    if (floorObj && typeof floorObj === "object" && "color" in floorObj) {
      (floorObj as { color: unknown }).color = cachedOceanColors.floorColor;
    }

    if (skyObj && typeof skyObj === "object" && "color" in skyObj) {
      (skyObj as { color: unknown }).color = cachedOceanColors.skyColor;
    }
  }
}

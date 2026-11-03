/**
 * Sistema de Ambiente Oceânico e Ciclo Cromático dos Biomas — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { BIOME_COLOR_STOPS, GAME_CONFIG, type BiomeColorStop } from "../config";
import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import type { LegacyEngineBridge } from "../engine/adapters/LegacyBridge";

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

/**
 * Calcula as cores interpoladas (background, superfície e chão) para uma dada distância.
 */
export function getColorsAtDistance(
  engineOrContext:
    | IRenderEngine
    | LegacyEngineBridge
    | {
        lerp?: (a: number, b: number, t: number) => number;
        rgb?: (r: number, g: number, b: number) => unknown;
      },
  distance: number
): OceanColorsResult {
  const clampedDistance = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);

  let currentStop: BiomeColorStop = BIOME_COLOR_STOPS[0];
  let nextStop: BiomeColorStop = BIOME_COLOR_STOPS[0];
  let lerpFactor = 0;

  for (let i = 0; i < BIOME_COLOR_STOPS.length; i++) {
    const stop = BIOME_COLOR_STOPS[i];
    if (clampedDistance >= stop.distanceStart && clampedDistance <= stop.distanceEnd) {
      currentStop = stop;
      if (i < BIOME_COLOR_STOPS.length - 1) {
        nextStop = BIOME_COLOR_STOPS[i + 1];
        const range = stop.distanceEnd - stop.distanceStart;
        lerpFactor = range > 0 ? (clampedDistance - stop.distanceStart) / range : 0;
      } else {
        nextStop = stop;
        lerpFactor = 0;
      }
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
  const bgR = lerpFn(currentStop.bgColor[0], nextStop.bgColor[0], lerpFactor);
  const bgG = lerpFn(currentStop.bgColor[1], nextStop.bgColor[1], lerpFactor);
  const bgB = lerpFn(currentStop.bgColor[2], nextStop.bgColor[2], lerpFactor);

  // Interpolação RGB para Superfície
  const sfR = lerpFn(currentStop.surfaceColor[0], nextStop.surfaceColor[0], lerpFactor);
  const sfG = lerpFn(currentStop.surfaceColor[1], nextStop.surfaceColor[1], lerpFactor);
  const sfB = lerpFn(currentStop.surfaceColor[2], nextStop.surfaceColor[2], lerpFactor);

  // Interpolação RGB para Chão
  const flR = lerpFn(currentStop.floorColor[0], nextStop.floorColor[0], lerpFactor);
  const flG = lerpFn(currentStop.floorColor[1], nextStop.floorColor[1], lerpFactor);
  const flB = lerpFn(currentStop.floorColor[2], nextStop.floorColor[2], lerpFactor);

  // Interpolação RGB para o Céu
  const skR = lerpFn(currentStop.skyColor[0], nextStop.skyColor[0], lerpFactor);
  const skG = lerpFn(currentStop.skyColor[1], nextStop.skyColor[1], lerpFactor);
  const skB = lerpFn(currentStop.skyColor[2], nextStop.skyColor[2], lerpFactor);

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
  engineOrContext:
    | IRenderEngine
    | LegacyEngineBridge
    | {
        setBackground?: (c: unknown) => void;
        lerp?: (a: number, b: number, t: number) => number;
        rgb?: (r: number, g: number, b: number) => unknown;
      },
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

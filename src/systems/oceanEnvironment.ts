import kaboom, { type GameObj } from "kaboom";
import { BIOME_COLOR_STOPS, GAME_CONFIG, type BiomeColorStop } from "../config";
import type { WaterSurfaceSystem } from "./waterSurfaceSystem";

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

/**
 * Calcula as cores interpoladas (background, superfície e chão) para uma dada distância.
 */
export function getColorsAtDistance(k: ReturnType<typeof kaboom>, distance: number) {
  // Evita extrapolação além de 0m ou 27.000m
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

  // Interpolação RGB para Fundo
  const bgR = k.lerp(currentStop.bgColor[0], nextStop.bgColor[0], lerpFactor);
  const bgG = k.lerp(currentStop.bgColor[1], nextStop.bgColor[1], lerpFactor);
  const bgB = k.lerp(currentStop.bgColor[2], nextStop.bgColor[2], lerpFactor);

  // Interpolação RGB para Superfície
  const sfR = k.lerp(currentStop.surfaceColor[0], nextStop.surfaceColor[0], lerpFactor);
  const sfG = k.lerp(currentStop.surfaceColor[1], nextStop.surfaceColor[1], lerpFactor);
  const sfB = k.lerp(currentStop.surfaceColor[2], nextStop.surfaceColor[2], lerpFactor);

  // Interpolação RGB para Chão
  const flR = k.lerp(currentStop.floorColor[0], nextStop.floorColor[0], lerpFactor);
  const flG = k.lerp(currentStop.floorColor[1], nextStop.floorColor[1], lerpFactor);
  const flB = k.lerp(currentStop.floorColor[2], nextStop.floorColor[2], lerpFactor);

  // Interpolação RGB para o Céu (acima do nível do mar)
  const skR = k.lerp(currentStop.skyColor[0], nextStop.skyColor[0], lerpFactor);
  const skG = k.lerp(currentStop.skyColor[1], nextStop.skyColor[1], lerpFactor);
  const skB = k.lerp(currentStop.skyColor[2], nextStop.skyColor[2], lerpFactor);

  return {
    bgColor: k.rgb(bgR, bgG, bgB),
    surfaceColor: k.rgb(sfR, sfG, sfB),
    floorColor: k.rgb(flR, flG, flB),
    skyColor: k.rgb(skR, skG, skB),
    currentBiome: currentStop,
  };
}

let lastEvaluatedDistance = -999999;
let cachedOceanColors: ReturnType<typeof getColorsAtDistance> | null = null;

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
  k: ReturnType<typeof kaboom>,
  distance: number,
  surfaceObj?: GameObj | WaterSurfaceSystem,
  floorObj?: GameObj,
  skyObj?: GameObj,
  forceUpdate: boolean = false
) {
  const isDirty = forceUpdate || isOceanColorDirty(distance, 5);

  if (isDirty || !cachedOceanColors) {
    cachedOceanColors = getColorsAtDistance(k, distance);
    lastEvaluatedDistance = distance;

    k.setBackground(cachedOceanColors.bgColor);

    if (surfaceObj) {
      if ("updateColor" in surfaceObj && typeof surfaceObj.updateColor === "function") {
        surfaceObj.updateColor(cachedOceanColors.surfaceColor);
      } else if (
        "updateSurfaceColor" in surfaceObj &&
        typeof (surfaceObj as unknown as { updateSurfaceColor?: (c: unknown) => void })
          .updateSurfaceColor === "function"
      ) {
        (surfaceObj as unknown as { updateSurfaceColor: (c: unknown) => void }).updateSurfaceColor(
          cachedOceanColors.surfaceColor
        );
      } else {
        surfaceObj.color = cachedOceanColors.surfaceColor;
      }
    }

    if (floorObj) {
      floorObj.color = cachedOceanColors.floorColor;
    }

    if (skyObj) {
      skyObj.color = cachedOceanColors.skyColor;
    }
  }
}

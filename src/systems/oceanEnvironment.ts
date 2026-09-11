import kaboom, { type GameObj } from "kaboom";
import { BIOME_COLOR_STOPS, GAME_CONFIG, type BiomeColorStop } from "../config";

/**
 * Retorna o bioma atual com base na distância percorrida.
 */
export function getCurrentBiome(distance: number): BiomeColorStop {
  const clampedDistance = Math.min(
    Math.max(distance, 0),
    GAME_CONFIG.ROUTE_TOTAL_DISTANCE
  );

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
  const clampedDistance = Math.min(
    Math.max(distance, 0),
    GAME_CONFIG.ROUTE_TOTAL_DISTANCE
  );

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

/**
 * Atualiza o ambiente marítimo e o céu sem realizar consultas custosas na árvore do Kaboom.
 */
export function updateOceanColors(
  k: ReturnType<typeof kaboom>,
  distance: number,
  surfaceObj?: GameObj,
  floorObj?: GameObj,
  skyObj?: GameObj
) {
  const { bgColor, surfaceColor, floorColor, skyColor } = getColorsAtDistance(k, distance);
  
  k.setBackground(bgColor);

  if (surfaceObj) {
    surfaceObj.color = surfaceColor;
  }

  if (floorObj) {
    floorObj.color = floorColor;
  }

  if (skyObj) {
    skyObj.color = skyColor;
  }
}

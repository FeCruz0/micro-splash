import kaboom from "kaboom";
import { GAME_CONFIG } from "../config";
import { getCurrentBiome } from "../systems/oceanEnvironment";

export function createDebugDistanceUI(k: ReturnType<typeof kaboom>) {
  const containerWidth = 280;
  const containerHeight = 64;
  const padding = 12;

  // Fundo translúcido do painel HUD
  k.add([
    k.rect(containerWidth, containerHeight, { radius: 8 }),
    k.pos(padding, padding),
    k.color(10, 20, 35),
    k.opacity(0.75),
    k.outline(1, k.rgb(60, 100, 140)),
    k.fixed(),
    k.z(90),
  ]);

  // Texto com as métricas de distância e bioma
  const debugText = k.add([
    k.text("Distância: 0m / 27.000m (0%)\nBioma: Trópicos", {
      size: 13,
      lineSpacing: 4,
    }),
    k.pos(padding + 10, padding + 8),
    k.color(220, 235, 255),
    k.fixed(),
    k.z(92),
  ]);

  // Fundo da barra de progresso
  k.add([
    k.rect(containerWidth - 20, 6, { radius: 3 }),
    k.pos(padding + 10, padding + 48),
    k.color(30, 45, 65),
    k.fixed(),
    k.z(91),
  ]);

  // Preenchimento da barra de progresso
  const progressBarFill = k.add([
    k.rect(0, 6, { radius: 3 }),
    k.pos(padding + 10, padding + 48),
    k.color(0, 180, 255),
    k.fixed(),
    k.z(92),
  ]);

  return {
    update: (distance: number) => {
      const clampedDist = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);
      const percent = Math.floor((clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * 100);
      const biome = getCurrentBiome(clampedDist);
      const maxBarWidth = containerWidth - 20;

      debugText.text = `📍 Distância: ${Math.floor(clampedDist)}m / ${GAME_CONFIG.ROUTE_TOTAL_DISTANCE}m (${percent}%)\n🌊 Bioma: ${biome.name}`;
      progressBarFill.width = (clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * maxBarWidth;

      // Cor da barra de progresso muda de acordo com o tom da superfície do bioma
      progressBarFill.color = k.rgb(biome.surfaceColor[0], biome.surfaceColor[1], biome.surfaceColor[2]);
    },
  };
}

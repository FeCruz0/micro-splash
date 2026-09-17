import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { getCurrentBiome } from "../systems/oceanEnvironment";

export function createDebugDistanceUI(k: KaboomCtx, playerController?: any) {
  // Proporções adaptativas com base na resolução virtual
  const isHighRes = k.width() >= 1920;
  const isMediumRes = k.width() >= 1280;

  const scale = isHighRes ? 1.3 : isMediumRes ? 1.0 : 0.85;
  const containerWidth = Math.round(330 * scale);
  const containerHeight = Math.round(76 * scale);
  const padding = Math.round(14 * scale);

  const fontSizePrimary = Math.round(13 * scale);
  const fontSizeSecondary = Math.round(11 * scale);

  // Fundo translúcido estilizado com efeito de vidro aquático
  k.add([
    k.rect(containerWidth, containerHeight, { radius: 10 }),
    k.pos(padding, padding),
    k.color(8, 22, 44),
    k.opacity(0.85),
    k.outline(1.5, k.rgb(70, 140, 210)),
    k.fixed(),
    k.z(90),
  ]);

  // Texto de Distância & Bioma (Renderizado em fonte sans-serif nativa limpa e nítida)
  const routeText = k.add([
    k.text("Distância: 0m / 27.000m (0%)\nBioma: Trópicos", {
      size: fontSizePrimary,
      font: "sans-serif",
      lineSpacing: 3,
    }),
    k.pos(padding + Math.round(10 * scale), padding + Math.round(8 * scale)),
    k.color(225, 240, 255),
    k.fixed(),
    k.z(92),
  ]);

  // Texto de Fôlego e Nutrição (em substituição ao antigo log pixelado que poluía o rodapé)
  const statusText = k.add([
    k.text("Fôlego: 100% | Nutrição: 0%", {
      size: fontSizeSecondary,
      font: "sans-serif",
    }),
    k.pos(padding + Math.round(10 * scale), padding + Math.round(44 * scale)),
    k.color(140, 220, 255),
    k.fixed(),
    k.z(92),
  ]);

  // Fundo da barra de progresso da migração
  const barY = padding + containerHeight - Math.round(10 * scale);
  const barWidth = containerWidth - Math.round(20 * scale);
  const barHeight = Math.round(5 * scale);

  k.add([
    k.rect(barWidth, barHeight, { radius: 2 }),
    k.pos(padding + Math.round(10 * scale), barY),
    k.color(20, 40, 65),
    k.fixed(),
    k.z(91),
  ]);

  // Preenchimento da barra de progresso
  const progressBarFill = k.add([
    k.rect(0, barHeight, { radius: 2 }),
    k.pos(padding + Math.round(10 * scale), barY),
    k.color(0, 200, 255),
    k.fixed(),
    k.z(92),
  ]);

  return {
    update: (distance: number) => {
      const clampedDist = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);
      const percent = Math.floor((clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * 100);
      const biome = getCurrentBiome(clampedDist);

      routeText.text = `📍 Distância: ${Math.floor(clampedDist)}m / ${GAME_CONFIG.ROUTE_TOTAL_DISTANCE}m (${percent}%)\n🌊 Bioma: ${biome.name}`;
      progressBarFill.width = (clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * barWidth;
      progressBarFill.color = k.rgb(biome.surfaceColor[0], biome.surfaceColor[1], biome.surfaceColor[2]);

      // Atualiza fôlego e status se o playerController foi fornecido
      if (playerController) {
        const isSerene = playerController.isSereneMode?.() ?? false;
        const krills = playerController.getKrillsEaten?.() ?? 0;
        const drafting = playerController.isDrafting?.() ? " | 🐬 Vácuo (+25%)" : "";
        const oil = playerController.isOilObstructed?.() ? " | ⚠️ Óleo!" : "";

        if (isSerene) {
          statusText.text = `🌸 Fôlego: ∞ | Nutrição: +${krills}%${drafting}${oil}`;
          statusText.color = k.rgb(160, 255, 210);
        } else {
          const oxygen = Math.floor(playerController.getOxygen?.() ?? 100);
          statusText.text = `🫁 Fôlego: ${oxygen}% | 🦐 Nutrição: +${krills}%${drafting}${oil}`;
          if (oxygen <= 25) {
            statusText.color = k.rgb(255, 90, 90);
          } else if (oxygen <= 50) {
            statusText.color = k.rgb(255, 200, 90);
          } else {
            statusText.color = k.rgb(140, 220, 255);
          }
        }
      }
    },
  };
}

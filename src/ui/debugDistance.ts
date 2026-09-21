import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { getCurrentBiome } from "../systems/oceanEnvironment";
import type { PlayerController } from "../entities/player";

export function createDebugDistanceUI(k: KaboomCtx, playerController?: PlayerController) {
  // Proporções adaptativas com base na resolução virtual
  const isHighRes = k.width() >= 1920;
  const isMediumRes = k.width() >= 1280;

  const scale = isHighRes ? 1.3 : isMediumRes ? 1.0 : 0.85;
  const containerWidth = Math.round(340 * scale);
  const containerHeight = Math.round(118 * scale);
  const padding = Math.round(14 * scale);

  const fontSizePrimary = Math.round(13 * scale);
  const fontSizeSecondary = Math.round(11 * scale);

  // Fundo translúcido estilizado com efeito de vidro aquático
  k.add([
    k.rect(containerWidth, containerHeight, { radius: 10 }),
    k.pos(padding, padding),
    k.color(8, 22, 44),
    k.opacity(0.88),
    k.outline(1.5, k.rgb(70, 140, 210)),
    k.fixed(),
    k.z(90),
  ]);

  // Texto de Distância & Bioma
  const totalFormatted = GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR");
  const routeText = k.add([
    k.text(`Distância: 0m / ${totalFormatted}m (0%)\nBioma: Trópicos`, {
      size: fontSizePrimary,
      font: "sans-serif",
      lineSpacing: 3,
    }),
    k.pos(padding + Math.round(10 * scale), padding + Math.round(8 * scale)),
    k.color(225, 240, 255),
    k.fixed(),
    k.z(92),
  ]);

  // Texto de Fôlego e Nutrição
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

  // Velocímetro em Tempo Real para Debug
  const speedText = k.add([
    k.text(`⚡ Velocidade: 0 / ${GAME_CONFIG.MAX_SPEED} px/s (0%)`, {
      size: fontSizeSecondary,
      font: "sans-serif",
    }),
    k.pos(padding + Math.round(10 * scale), padding + Math.round(59 * scale)),
    k.color(180, 235, 255),
    k.fixed(),
    k.z(92),
  ]);

  // Mini-barra de medição da velocidade instantânea
  const speedBarY = padding + Math.round(74 * scale);
  const barWidth = containerWidth - Math.round(20 * scale);
  const speedBarHeight = Math.round(3 * scale);

  k.add([
    k.rect(barWidth, speedBarHeight, { radius: 1.5 }),
    k.pos(padding + Math.round(10 * scale), speedBarY),
    k.color(18, 36, 58),
    k.fixed(),
    k.z(91),
  ]);

  const speedBarFill = k.add([
    k.rect(0, speedBarHeight, { radius: 1.5 }),
    k.pos(padding + Math.round(10 * scale), speedBarY),
    k.color(100, 240, 255),
    k.fixed(),
    k.z(92),
  ]);

  // Linha de Power-ups Ativos (Fase 12)
  const powerupText = k.add([
    k.text("", {
      size: fontSizeSecondary,
      font: "sans-serif",
    }),
    k.pos(padding + Math.round(10 * scale), padding + Math.round(82 * scale)),
    k.color(255, 235, 120),
    k.fixed(),
    k.z(92),
  ]);

  // Fundo da barra de progresso da migração
  const barY = padding + containerHeight - Math.round(8 * scale);
  const barHeight = Math.round(4 * scale);

  k.add([
    k.rect(barWidth, barHeight, { radius: 2 }),
    k.pos(padding + Math.round(10 * scale), barY),
    k.color(20, 40, 65),
    k.fixed(),
    k.z(91),
  ]);

  // Preenchimento da barra de progresso da migração
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

      // Atualiza fôlego, velocidade e status se o playerController foi fornecido
      if (playerController) {
        // Velocímetro em tempo real
        const vel = playerController.getSpeed?.() ?? k.vec2(0, 0);
        const speedLen = Math.round(vel.len());
        const maxSpd = Math.round(playerController.getMaxSpeed?.() ?? GAME_CONFIG.MAX_SPEED);
        const ratio = maxSpd > 0 ? speedLen / maxSpd : 0;
        const speedPercent = Math.round(ratio * 100);

        speedText.text = `⚡ Velocidade: ${speedLen} / ${maxSpd} px/s (${speedPercent}%) [vx:${Math.round(vel.x)} vy:${Math.round(vel.y)}]`;
        speedBarFill.width = Math.min(barWidth, ratio * barWidth);

        if (ratio >= 1.0) {
          speedBarFill.color = k.rgb(255, 95, 75); // Vermelho/Laranja: pico/boost
          speedText.color = k.rgb(255, 125, 95);
        } else if (ratio >= 0.65) {
          speedBarFill.color = k.rgb(255, 215, 80); // Dourado: propulsão forte
          speedText.color = k.rgb(255, 225, 120);
        } else {
          speedBarFill.color = k.rgb(100, 240, 255); // Ciano suave: cruzeiro
          speedText.color = k.rgb(180, 235, 255);
        }

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

        // Badges dos Efeitos Ambientais Ativos
        const badges: string[] = [];
        if (playerController.isSpeedBoosted?.()) {
          const t = playerController.getSpeedBoostTimer?.().toFixed(1);
          badges.push(`🌊 Correnteza ${t}s`);
        }
        powerupText.text = badges.length > 0 ? `✨ ${badges.join(" | ")}` : "";
      }
    },
  };
}

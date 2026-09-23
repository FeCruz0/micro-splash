import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";
import { getCurrentBiome } from "../systems/oceanEnvironment";
import type { PlayerController } from "../entities/player";

export interface PerformanceStats {
  fps?: number;
  entities?: number;
  activeParticles?: number;
  totalParticles?: number;
  activeModules?: string;
}

export function createDebugDistanceUI(k: KaboomCtx, playerController?: PlayerController) {
  // Proporções adaptativas com base na resolução virtual
  const isHighRes = k.width() >= 1920;
  const isMediumRes = k.width() >= 1280;

  const scale = isHighRes ? 1.25 : isMediumRes ? 1.0 : 0.85;
  const containerWidth = Math.round(350 * scale);
  const containerHeight = Math.round(152 * scale);
  const padding = Math.round(14 * scale);

  const fontSizeTitle = Math.round(10.5 * scale);
  const fontSizePrimary = Math.round(11.5 * scale);
  const fontSizeSecondary = Math.round(10 * scale);

  // Container principal: OCULTO POR PADRÃO durante a gameplay comum!
  // Ativado exclusivamente via tecla F3.
  const container = k.add([
    k.rect(containerWidth, containerHeight, { radius: 10 }),
    k.pos(padding, padding),
    k.color(6, 16, 32),
    k.opacity(0.92),
    k.outline(1.8, k.rgb(0, 230, 255)),
    k.fixed(),
    k.z(300),
    "dev_debug_telemetry_container",
  ]);
  container.hidden = true; // Invisível por padrão!

  // Cabeçalho de desenvolvedor
  container.add([
    k.text("⚡ [F3] TELEMETRIA & DIAGNÓSTICO (DEV)", {
      size: fontSizeTitle,
      font: "monospace",
    }),
    k.pos(Math.round(10 * scale), Math.round(8 * scale)),
    k.color(0, 230, 255),
  ]);

  // Linha de diagnóstico de hardware/performance
  const perfText = container.add([
    k.text("Taxa: -- FPS | Entidades: -- | Pool: --", {
      size: fontSizeSecondary,
      font: "monospace",
    }),
    k.pos(Math.round(10 * scale), Math.round(24 * scale)),
    k.color(180, 240, 255),
  ]);

  // Texto de Distância & Bioma
  const totalFormatted = GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR");
  const routeText = container.add([
    k.text(`📍 Distância: 0m / ${totalFormatted}m (0%)\n🌊 Bioma: --`, {
      size: fontSizePrimary,
      font: "sans-serif",
      lineSpacing: 2.5,
    }),
    k.pos(Math.round(10 * scale), Math.round(40 * scale)),
    k.color(225, 240, 255),
  ]);

  // Texto de Fôlego e Nutrição
  const statusText = container.add([
    k.text("🫁 Fôlego: 100% | 🦐 Nutrição: 0%", {
      size: fontSizeSecondary,
      font: "sans-serif",
    }),
    k.pos(Math.round(10 * scale), Math.round(76 * scale)),
    k.color(140, 220, 255),
  ]);

  // Velocímetro em Tempo Real para Debug
  const speedText = container.add([
    k.text(`⚡ Velocidade: 0 / ${GAME_CONFIG.MAX_SPEED} px/s (0%)`, {
      size: fontSizeSecondary,
      font: "sans-serif",
    }),
    k.pos(Math.round(10 * scale), Math.round(92 * scale)),
    k.color(180, 235, 255),
  ]);

  // Mini-barra de medição da velocidade instantânea
  const speedBarY = Math.round(108 * scale);
  const barWidth = containerWidth - Math.round(20 * scale);
  const speedBarHeight = Math.round(3.5 * scale);

  container.add([
    k.rect(barWidth, speedBarHeight, { radius: 1.5 }),
    k.pos(Math.round(10 * scale), speedBarY),
    k.color(18, 36, 58),
  ]);

  const speedBarFill = container.add([
    k.rect(0, speedBarHeight, { radius: 1.5 }),
    k.pos(Math.round(10 * scale), speedBarY),
    k.color(100, 240, 255),
  ]);

  // Linha de Power-ups & Badges Ativos
  const powerupText = container.add([
    k.text("", {
      size: fontSizeSecondary,
      font: "sans-serif",
    }),
    k.pos(Math.round(10 * scale), Math.round(116 * scale)),
    k.color(255, 235, 120),
  ]);

  // Fundo da barra de progresso da migração
  const barY = containerHeight - Math.round(10 * scale);
  const barHeight = Math.round(4 * scale);

  container.add([
    k.rect(barWidth, barHeight, { radius: 2 }),
    k.pos(Math.round(10 * scale), barY),
    k.color(20, 40, 65),
  ]);

  // Preenchimento da barra de progresso da migração
  const progressBarFill = container.add([
    k.rect(0, barHeight, { radius: 2 }),
    k.pos(Math.round(10 * scale), barY),
    k.color(0, 200, 255),
  ]);

  return {
    getContainer: (): GameObj => container,
    isVisible: (): boolean => !container.hidden,
    setVisible: (visible: boolean): void => {
      container.hidden = !visible;
    },
    toggle: (): boolean => {
      container.hidden = !container.hidden;
      return !container.hidden;
    },
    destroy: (): void => {
      if (typeof k.destroy === "function") {
        k.destroy(container);
      }
    },
    update: (distance: number, perfStats?: PerformanceStats) => {
      // Se estiver oculto, não gasta ciclos de processamento de texto/canvas
      if (container.hidden) {
        return;
      }

      // Atualiza métricas de hardware se fornecidas
      if (perfStats) {
        const fpsStr = perfStats.fps !== undefined ? `${perfStats.fps} FPS` : "--";
        const entStr = perfStats.entities !== undefined ? `${perfStats.entities} obj` : "--";
        const poolStr =
          perfStats.activeParticles !== undefined && perfStats.totalParticles !== undefined
            ? `${perfStats.activeParticles}/${perfStats.totalParticles} part`
            : "--";
        const modStr = perfStats.activeModules ? ` | ${perfStats.activeModules}` : "";
        perfText.text = `Taxa: ${fpsStr} | Entidades: ${entStr} | Pool: ${poolStr}${modStr}`;
      }

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
        const speedLen = Math.round(
          typeof vel?.len === "function"
            ? vel.len()
            : Math.sqrt((vel?.x || 0) * (vel?.x || 0) + (vel?.y || 0) * (vel?.y || 0))
        );
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

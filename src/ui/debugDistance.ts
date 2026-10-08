import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG, getSavedDisplayMode } from "../config";
import { getCurrentBiome } from "../systems/oceanEnvironment";
import type { PlayerController } from "../entities/player";

export interface PerformanceStats {
  fps?: number;
  entities?: number;
  activeParticles?: number;
  totalParticles?: number;
  activeModules?: string;
}

/**
 * Converte um valor numérico de taxa de quadros (FPS) para um caractere unicode
 * proporcional de barra vertical.
 */
export function fpsToSparklineChar(fps: number): string {
  if (fps >= 58) return "█";
  if (fps >= 52) return "▇";
  if (fps >= 46) return "▆";
  if (fps >= 40) return "▅";
  if (fps >= 34) return "▄";
  if (fps >= 28) return "▃";
  if (fps >= 20) return "▂";
  return " ";
}

/**
 * Gera uma string sparkline de barras a partir do histórico de amostras de FPS.
 */
export function generateFpsSparkline(history: number[], sampleCount: number = 30): string {
  if (!history || history.length === 0) return "------------------------------";
  const slice = history.slice(-sampleCount);
  return slice.map(fpsToSparklineChar).join("");
}

/**
 * Retorna o diagnóstico da resolução e modo de tela ativos (Fase 33.8).
 */
export function formatResolutionInfo(k: KaboomCtx): string {
  const w = typeof k.width === "function" ? k.width() : 1280;
  const h = typeof k.height === "function" ? k.height() : 720;
  const displayMode = getSavedDisplayMode();
  const modeStr = displayMode === "letterbox" ? "Bordas" : "Preencher";
  return `${w}×${h} (${modeStr})`;
}

export function createDebugDistanceUI(k: KaboomCtx, playerController?: PlayerController) {
  const isHighRes = k.width() >= 1920;
  const isMediumRes = k.width() >= 1280;

  // Escala nunca inferior a 1.0 para manter a nitidez e legibilidade dos glifos TTF
  const scale = isHighRes ? 1.3 : isMediumRes ? 1.15 : 1.0;
  const isSerene = playerController?.isSereneMode?.() ?? false;

  const containerWidth = Math.round(350 * scale);
  const containerHeight = isSerene ? Math.round(154 * scale) : Math.round(218 * scale);
  const padding = Math.round(12 * scale);

  const fontSizeTitle = Math.round(13.5 * scale);
  const fontSizePrimary = Math.round(13.5 * scale);
  const fontSizeSecondary = Math.round(12.5 * scale);
  const fontSizeTech = Math.round(11 * scale);

  const fpsHistory: number[] = [];
  const barWidth = containerWidth - Math.round(24 * scale);

  // 1. Container Principal com Glassmorphism Oceânico
  const container = k.add([
    k.rect(containerWidth, containerHeight, { radius: 12 }),
    k.pos(padding, padding),
    k.color(7, 18, 36),
    k.opacity(0.95),
    k.outline(1.8, isSerene ? k.rgb(52, 211, 153) : k.rgb(56, 189, 248)),
    k.fixed(),
    k.z(300),
    "dev_debug_telemetry_container",
  ]);
  container.hidden = true;

  // Reflexo superior de vidro translúcido
  container.add([
    k.rect(containerWidth - Math.round(24 * scale), 1.5, { radius: 1 }),
    k.pos(Math.round(12 * scale), 2),
    k.color(140, 220, 255),
    k.opacity(0.35),
  ]);

  // 2. Cabeçalho de Identidade & Status
  const modePillWidth = isSerene ? Math.round(185 * scale) : Math.round(170 * scale);
  const modePillHeight = Math.round(24 * scale);
  container.add([
    k.rect(modePillWidth, modePillHeight, { radius: 6 }),
    k.pos(Math.round(12 * scale), Math.round(10 * scale)),
    k.color(12, 28, 54),
    k.outline(1.2, isSerene ? k.rgb(40, 160, 115) : k.rgb(35, 120, 180)),
  ]);

  // LED indicador nativo de status ao vivo
  const ledSize = Math.max(5, Math.round(7 * scale));
  container.add([
    k.rect(ledSize, ledSize, { radius: ledSize / 2 }),
    k.pos(Math.round(20 * scale), Math.round(18 * scale)),
    k.color(isSerene ? k.rgb(52, 211, 153) : k.rgb(56, 189, 248)),
  ]);

  container.add([
    k.text(isSerene ? "MIGRAÇÃO SERENA" : "TELEMETRIA DEV", {
      size: fontSizeTitle,
      font: "Outfit",
    }),
    k.pos(Math.round(32 * scale), Math.round(13 * scale)),
    k.color(isSerene ? k.rgb(110, 255, 195) : k.rgb(180, 235, 255)),
  ]);

  // Badge da tecla [F8]
  const f8BadgeWidth = Math.round(42 * scale);
  container.add([
    k.rect(f8BadgeWidth, modePillHeight, { radius: 6 }),
    k.pos(containerWidth - Math.round(12 * scale) - f8BadgeWidth, Math.round(10 * scale)),
    k.color(14, 30, 56),
    k.outline(1.2, k.rgb(38, 75, 125)),
  ]);

  container.add([
    k.text("[F8]", {
      size: fontSizeTitle,
      font: "Outfit",
    }),
    k.pos(
      containerWidth - Math.round(12 * scale) - f8BadgeWidth + Math.round(8 * scale),
      Math.round(13 * scale)
    ),
    k.color(160, 215, 255),
  ]);

  // Badge de Taxa de Quadros (FPS) em tempo real com coloração adaptativa
  const fpsBadgeWidth = Math.round(62 * scale);
  const fpsBadgeX =
    containerWidth - Math.round(12 * scale) - f8BadgeWidth - Math.round(6 * scale) - fpsBadgeWidth;

  const fpsBadgeBg = container.add([
    k.rect(fpsBadgeWidth, modePillHeight, { radius: 6 }),
    k.pos(fpsBadgeX, Math.round(10 * scale)),
    k.color(10, 26, 48),
    k.outline(1.2, k.rgb(74, 222, 128)),
  ]);

  const fpsBadgeText = container.add([
    k.text("-- FPS", {
      size: fontSizeTech,
      font: "Outfit",
    }),
    k.pos(fpsBadgeX + Math.round(8 * scale), Math.round(14 * scale)),
    k.color(74, 222, 128),
  ]);

  // 3. Card Interno de Bioma & Distância
  const insetCardHeight = Math.round(52 * scale);
  container.add([
    k.rect(barWidth, insetCardHeight, { radius: 8 }),
    k.pos(Math.round(12 * scale), Math.round(40 * scale)),
    k.color(12, 28, 56),
    k.outline(1.2, k.rgb(35, 70, 120)),
  ]);

  const totalFormatted = GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR");
  const routeText = container.add([
    k.text(`Bioma: --\nDistância: 0m / ${totalFormatted}m (0%)`, {
      size: fontSizePrimary,
      font: "Outfit",
      lineSpacing: 4,
    }),
    k.pos(Math.round(20 * scale), Math.round(46 * scale)),
    k.color(255, 255, 255),
  ]);

  // 4. Barra de Progresso da Rota
  const progressBarY = Math.round(98 * scale);
  const progressBarHeight = Math.round(4.5 * scale);

  container.add([
    k.rect(barWidth, progressBarHeight, { radius: 2.5 }),
    k.pos(Math.round(12 * scale), progressBarY),
    k.color(16, 34, 62),
  ]);

  const progressBarFill = container.add([
    k.rect(0, progressBarHeight, { radius: 2.5 }),
    k.pos(Math.round(12 * scale), progressBarY),
    k.color(0, 220, 255),
  ]);

  // 5. Linha de Sinais Vitais (Fôlego e Nutrição)
  const statusText = container.add([
    k.text("Fôlego: 100%   •   Nutrição: +0%", {
      size: fontSizeSecondary,
      font: "Inter",
    }),
    k.pos(Math.round(14 * scale), Math.round(108 * scale)),
    k.color(210, 240, 255),
  ]);

  const powerupText = container.add([
    k.text("", {
      size: fontSizeSecondary - 1,
      font: "Inter",
    }),
    k.pos(Math.round(14 * scale), Math.round(122 * scale)),
    k.color(255, 225, 110),
  ]);

  // 6. Linha e Barra de Velocidade Instantânea
  const speedText = container.add([
    k.text(`Velocidade: 0 / ${GAME_CONFIG.MAX_SPEED} px/s (0%)`, {
      size: fontSizeSecondary,
      font: "Inter",
    }),
    k.pos(Math.round(14 * scale), Math.round(126 * scale)),
    k.color(190, 235, 255),
  ]);

  const speedBarY = Math.round(142 * scale);
  const speedBarHeight = Math.round(3.5 * scale);

  container.add([
    k.rect(barWidth, speedBarHeight, { radius: 1.5 }),
    k.pos(Math.round(12 * scale), speedBarY),
    k.color(16, 34, 62),
  ]);

  const speedBarFill = container.add([
    k.rect(0, speedBarHeight, { radius: 1.5 }),
    k.pos(Math.round(12 * scale), speedBarY),
    k.color(100, 240, 255),
  ]);

  // 7. Rodapé Técnico de Desenvolvedor (Oculto na Migração Serena para evitar poluição visual)
  const techDividerY = Math.round(152 * scale);
  const techDivider = container.add([
    k.rect(barWidth, 1),
    k.pos(Math.round(12 * scale), techDividerY),
    k.color(28, 56, 92),
    k.opacity(0.8),
  ]);
  techDivider.hidden = isSerene;

  const perfText = container.add([
    k.text("Taxa: -- FPS   •   Objetos: --   •   Pool: --", {
      size: fontSizeTech,
      font: "Inter",
    }),
    k.pos(Math.round(14 * scale), Math.round(159 * scale)),
    k.color(175, 225, 250),
  ]);
  perfText.hidden = isSerene;

  const sparklineText = container.add([
    k.text("Desempenho Estável: 60 FPS", {
      size: fontSizeTech,
      font: "Inter",
    }),
    k.pos(Math.round(14 * scale), Math.round(177 * scale)),
    k.color(130, 245, 190),
  ]);
  sparklineText.hidden = isSerene;

  // Linha 8: Indicador de Resolução & Modo de Tela Ativo (Fase 33.8)
  const resInfoText = container.add([
    k.text(`Tela: ${formatResolutionInfo(k)}`, {
      size: fontSizeTech,
      font: "Inter",
    }),
    k.pos(Math.round(14 * scale), Math.round(195 * scale)),
    k.color(140, 210, 255),
  ]);
  resInfoText.hidden = isSerene;

  return {
    getContainer: (): GameObj => container,
    isVisible: (): boolean => !container.hidden,
    getFpsHistory: (): number[] => [...fpsHistory],
    getFpsText: (): string => fpsBadgeText.text,
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
      if (container.hidden) {
        return;
      }

      // Determina FPS instantâneo e atualiza o badge do cabeçalho
      let curFps = 60;
      if (perfStats && perfStats.fps !== undefined) {
        curFps = Math.round(perfStats.fps);
      } else if (typeof k.dt === "function") {
        const dt = k.dt();
        curFps = dt > 0 ? Math.round(1 / dt) : 60;
      }

      fpsBadgeText.text = `${curFps} FPS`;
      if (curFps >= 55) {
        fpsBadgeText.color = k.rgb(74, 222, 128);
        if (fpsBadgeBg.outline && typeof fpsBadgeBg.outline === "object") {
          fpsBadgeBg.outline.color = k.rgb(34, 197, 94);
        }
      } else if (curFps >= 45) {
        fpsBadgeText.color = k.rgb(250, 204, 21);
        if (fpsBadgeBg.outline && typeof fpsBadgeBg.outline === "object") {
          fpsBadgeBg.outline.color = k.rgb(234, 179, 8);
        }
      } else {
        fpsBadgeText.color = k.rgb(248, 113, 113);
        if (fpsBadgeBg.outline && typeof fpsBadgeBg.outline === "object") {
          fpsBadgeBg.outline.color = k.rgb(239, 68, 68);
        }
      }

      // Atualiza métricas de hardware se fornecidas
      if (perfStats) {
        fpsHistory.push(curFps);
        if (fpsHistory.length > 60) {
          fpsHistory.shift();
        }

        const minFps = Math.min(...fpsHistory);
        const maxFps = Math.max(...fpsHistory);
        const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);

        const fpsStr = perfStats.fps !== undefined ? `${perfStats.fps} FPS` : "--";
        const entStr = perfStats.entities !== undefined ? `${perfStats.entities} obj` : "--";
        const poolStr =
          perfStats.activeParticles !== undefined && perfStats.totalParticles !== undefined
            ? `${perfStats.activeParticles}/${perfStats.totalParticles} part`
            : "--";

        // Sem concatenar strings longas de activeModules para não estourar horizontalmente a tela
        perfText.text = `Taxa: ${fpsStr}   •   Objetos: ${entStr}   •   Pool: ${poolStr}`;

        // Alerta de taxa crítica (< 45 FPS) em texto legível sem caracteres quebrados
        const isCritical = curFps < 45 || avgFps < 45;

        if (isCritical) {
          sparklineText.text = `⚠️ Alerta de Queda: ${curFps} FPS (Mín: ${minFps} | Méd: ${avgFps})`;
          sparklineText.color = k.rgb(255, 110, 90);
        } else {
          sparklineText.text = `Desempenho Estável: Mín ${minFps} | Méd ${avgFps} | Máx ${maxFps} FPS`;
          sparklineText.color = k.rgb(130, 245, 190);
        }
      }

      const clampedDist = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);
      const percent = Math.floor((clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * 100);
      const biome = getCurrentBiome(clampedDist);
      const distFormatted = Math.floor(clampedDist).toLocaleString("pt-BR");

      routeText.text = `Bioma: ${biome.name}\nDistância: ${distFormatted}m / ${totalFormatted}m (${percent}%)`;
      progressBarFill.width = (clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * barWidth;
      progressBarFill.color = k.rgb(
        biome.surfaceColor[0],
        biome.surfaceColor[1],
        biome.surfaceColor[2]
      );

      // Atualiza fôlego, velocidade e status se o playerController foi fornecido
      if (playerController) {
        const vel =
          playerController.getSpeed?.() ??
          (typeof k.vec2 === "function" ? k.vec2(0, 0) : { x: 0, y: 0, len: () => 0 });
        const speedLen = Math.round(
          typeof vel?.len === "function"
            ? vel.len()
            : Math.sqrt((vel?.x || 0) * (vel?.x || 0) + (vel?.y || 0) * (vel?.y || 0))
        );
        const maxSpd = Math.round(playerController.getMaxSpeed?.() ?? GAME_CONFIG.MAX_SPEED);
        const ratio = maxSpd > 0 ? speedLen / maxSpd : 0;
        const speedPercent = Math.round(ratio * 100);

        speedText.text = `Velocidade: ${speedLen} / ${maxSpd} px/s (${speedPercent}%)`;
        speedBarFill.width = Math.min(barWidth, ratio * barWidth);

        if (ratio >= 1.0) {
          speedBarFill.color = k.rgb(255, 95, 75);
          speedText.color = k.rgb(255, 125, 95);
        } else if (ratio >= 0.65) {
          speedBarFill.color = k.rgb(255, 215, 80);
          speedText.color = k.rgb(255, 225, 120);
        } else {
          speedBarFill.color = k.rgb(100, 240, 255);
          speedText.color = k.rgb(190, 235, 255);
        }

        const krills = playerController.getKrillsEaten?.() ?? 0;
        const drafting = playerController.isDrafting?.() ? " • Vácuo (+25%)" : "";
        const oil = playerController.isOilObstructed?.() ? " • Óleo!" : "";

        if (isSerene) {
          statusText.text = `Fôlego: ∞ (Infinito)   •   Nutrição: +${krills}%${drafting}${oil}`;
          statusText.color = k.rgb(110, 255, 195);
        } else {
          const oxygen = Math.floor(playerController.getOxygen?.() ?? 100);
          statusText.text = `Fôlego: ${oxygen}%   •   Nutrição: +${krills}%${drafting}${oil}`;
          if (oxygen <= 25) {
            statusText.color = k.rgb(255, 90, 90);
          } else if (oxygen <= 50) {
            statusText.color = k.rgb(255, 205, 90);
          } else {
            statusText.color = k.rgb(210, 240, 255);
          }
        }

        const badges: string[] = [];
        if (playerController.isSpeedBoosted?.()) {
          const t = playerController.getSpeedBoostTimer?.().toFixed(1);
          badges.push(`Correnteza ${t}s`);
        }
        powerupText.text = badges.length > 0 ? `★ ${badges.join(" | ")}` : "";
      }
    },
  };
}

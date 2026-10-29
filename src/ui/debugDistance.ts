/**
 * Painel de Diagnóstico F3 / Telemetria em Tempo Real (Fase 33 / Fase 53 / WBS 2.19) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte nativo a IRenderEngine (PixiJS v8)
 * e compatibilidade reversa para contextos legados sem nenhum uso de "any".
 */

import { GAME_CONFIG, getSavedDisplayMode } from "../config";
import { getCurrentBiome } from "../systems/oceanEnvironment";
import type { PlayerController } from "../entities/player";
import type { IRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface PerformanceStats {
  fps?: number;
  entities?: number;
  activeParticles?: number;
  totalParticles?: number;
  activeModules?: string;
  frameTimeMs?: number;
  visibleEntities?: number;
  culledEntities?: number;
  budgetStatus?: string;
  phaseBreakdown?: string;
}

export interface FrameTimeMetrics {
  avg: number;
  median: number;
  p95: number;
  p99: number;
  max: number;
}

/**
 * Função pura que calcula métricas estatísticas determinísticas de tempo de quadro (Frame Time em ms).
 */
export function calculateFrameTimeMetrics(history: number[]): FrameTimeMetrics {
  if (!history || history.length === 0) {
    return { avg: 0, median: 0, p95: 0, p99: 0, max: 0 };
  }
  const sorted = [...history].sort((a, b) => a - b);
  const len = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avg = Number((sum / len).toFixed(1));
  const median = Number(sorted[Math.floor(len * 0.5)].toFixed(1));
  const p95 = Number(sorted[Math.min(len - 1, Math.floor(len * 0.95))].toFixed(1));
  const p99 = Number(sorted[Math.min(len - 1, Math.floor(len * 0.99))].toFixed(1));
  const max = Number(sorted[len - 1].toFixed(1));

  return { avg, median, p95, p99, max };
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

export interface LegacyDebugDistanceContext {
  width?(): number;
  height?(): number;
  dt?(): number;
  add?(components?: unknown): unknown;
  rect?(width: number, height: number, options?: unknown): unknown;
  pos?(x: number, y: number): unknown;
  color?(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text?(content: string, options?: unknown): unknown;
  destroy?(target: unknown): void;
  vec2?(x: number, y: number): { x: number; y: number; len?(): number };
}

export interface DebugDistanceUIHandle {
  getContainer(): { hidden?: boolean; [key: string]: unknown };
  isVisible(): boolean;
  getFpsHistory(): number[];
  getFrameTimeHistory(): number[];
  getFrameTimeMetrics(): FrameTimeMetrics;
  getFpsText(): string;
  setVisible(visible: boolean): void;
  toggle(): boolean;
  destroy(): void;
  update(distance: number, perfStats?: PerformanceStats): void;
}

/**
 * Retorna o diagnóstico da resolução e modo de tela ativos (Fase 33.8).
 */
export function formatResolutionInfo(
  engineOrContext?: IRenderEngine | LegacyDebugDistanceContext
): string {
  let w = 1280;
  let h = 720;
  if (engineOrContext) {
    if (isRenderEngine(engineOrContext)) {
      const dims = engineOrContext.getDimensions();
      w = dims.width;
      h = dims.height;
    } else if (
      typeof engineOrContext.width === "function" &&
      typeof engineOrContext.height === "function"
    ) {
      w = engineOrContext.width();
      h = engineOrContext.height();
    }
  }
  const displayMode = getSavedDisplayMode();
  const modeStr = displayMode === "letterbox" ? "Bordas" : "Preencher";
  return `${w}×${h} (${modeStr})`;
}

export function createDebugDistanceUI(
  engineOrContext: IRenderEngine | LegacyDebugDistanceContext,
  playerController?: PlayerController
): DebugDistanceUIHandle {
  const fpsHistory: number[] = [];
  const frameTimeHistory: number[] = [];
  const totalFormatted = GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR");
  const isSerene = playerController?.isSereneMode?.() ?? false;

  if (isRenderEngine(engineOrContext)) {
    const dimensions = engineOrContext.getDimensions();
    const screenW = dimensions.width;
    const isHighRes = screenW >= 1920;
    const isMediumRes = screenW >= 1280;
    const scale = isHighRes ? 1.3 : isMediumRes ? 1.15 : 1.0;

    const containerWidth = Math.round(350 * scale);
    const containerHeight = isSerene ? Math.round(154 * scale) : Math.round(236 * scale);
    const padding = Math.round(12 * scale);
    const barWidth = containerWidth - Math.round(24 * scale);

    const fontSizeTitle = Math.round(13.5 * scale);
    const fontSizePrimary = Math.round(13.5 * scale);
    const fontSizeSecondary = Math.round(12.5 * scale);
    const fontSizeTech = Math.round(11 * scale);

    const container = engineOrContext.createContainer("dev_debug_telemetry_container");
    container.setPosition(padding, padding);
    container.setZIndex(300);
    container.setVisible(false);
    engineOrContext.getStageRoot().addChild(container);

    const bg = engineOrContext.createGraphics("debug-bg");
    bg.drawRoundedRect(0, 0, containerWidth, containerHeight, 12, {
      fill: { color: [7, 18, 36], alpha: 0.95 },
      stroke: { color: isSerene ? [52, 211, 153] : [56, 189, 248], width: 1.8 },
    });
    // Reflexo superior
    bg.drawRoundedRect(Math.round(12 * scale), 2, containerWidth - Math.round(24 * scale), 1.5, 1, {
      fill: { color: [140, 220, 255], alpha: 0.35 },
    });
    // Pill de modo
    const modePillWidth = isSerene ? Math.round(185 * scale) : Math.round(170 * scale);
    const modePillHeight = Math.round(24 * scale);
    bg.drawRoundedRect(
      Math.round(12 * scale),
      Math.round(10 * scale),
      modePillWidth,
      modePillHeight,
      6,
      {
        fill: { color: [12, 28, 54], alpha: 1 },
        stroke: { color: isSerene ? [40, 160, 115] : [35, 120, 180], width: 1.2 },
      }
    );
    // LED
    const ledSize = Math.max(5, Math.round(7 * scale));
    bg.drawRoundedRect(
      Math.round(20 * scale),
      Math.round(18 * scale),
      ledSize,
      ledSize,
      ledSize / 2,
      {
        fill: { color: isSerene ? [52, 211, 153] : [56, 189, 248], alpha: 1 },
      }
    );
    // F8 Badge
    const f8BadgeWidth = Math.round(42 * scale);
    bg.drawRoundedRect(
      containerWidth - Math.round(12 * scale) - f8BadgeWidth,
      Math.round(10 * scale),
      f8BadgeWidth,
      modePillHeight,
      6,
      {
        fill: { color: [14, 30, 56], alpha: 1 },
        stroke: { color: [38, 75, 125], width: 1.2 },
      }
    );
    // Inset card
    const insetCardHeight = Math.round(52 * scale);
    bg.drawRoundedRect(
      Math.round(12 * scale),
      Math.round(40 * scale),
      barWidth,
      insetCardHeight,
      8,
      {
        fill: { color: [12, 28, 56], alpha: 1 },
        stroke: { color: [35, 70, 120], width: 1.2 },
      }
    );
    // Background bar rota
    const progressBarY = Math.round(98 * scale);
    const progressBarHeight = Math.round(4.5 * scale);
    bg.drawRoundedRect(Math.round(12 * scale), progressBarY, barWidth, progressBarHeight, 2.5, {
      fill: { color: [16, 34, 62], alpha: 1 },
    });
    // Background bar velocidade
    const speedBarY = Math.round(142 * scale);
    const speedBarHeight = Math.round(3.5 * scale);
    bg.drawRoundedRect(Math.round(12 * scale), speedBarY, barWidth, speedBarHeight, 1.5, {
      fill: { color: [16, 34, 62], alpha: 1 },
    });
    // Linha divisória técnica
    if (!isSerene) {
      bg.drawRect(Math.round(12 * scale), Math.round(152 * scale), barWidth, 1, {
        fill: { color: [28, 56, 92], alpha: 0.8 },
      });
    }
    container.addChild(bg);

    const titleText = engineOrContext.createText(
      isSerene ? "MIGRAÇÃO SERENA" : "TELEMETRIA DEV",
      {
        fontSize: fontSizeTitle,
        fontFamily: "Outfit",
        color: isSerene ? [110, 255, 195] : [180, 235, 255],
      },
      "debug-title"
    );
    titleText.setPosition(Math.round(32 * scale), Math.round(13 * scale));
    container.addChild(titleText);

    const f8Text = engineOrContext.createText(
      "[F8]",
      { fontSize: fontSizeTitle, fontFamily: "Outfit", color: [160, 215, 255] },
      "debug-f8"
    );
    f8Text.setPosition(
      containerWidth - Math.round(12 * scale) - f8BadgeWidth + Math.round(8 * scale),
      Math.round(13 * scale)
    );
    container.addChild(f8Text);

    const fpsBadgeWidth = Math.round(62 * scale);
    const fpsBadgeX =
      containerWidth -
      Math.round(12 * scale) -
      f8BadgeWidth -
      Math.round(6 * scale) -
      fpsBadgeWidth;

    const fpsBadgeBg = engineOrContext.createGraphics("debug-fps-bg");
    fpsBadgeBg.drawRoundedRect(
      fpsBadgeX,
      Math.round(10 * scale),
      fpsBadgeWidth,
      modePillHeight,
      6,
      {
        fill: { color: [10, 26, 48], alpha: 1 },
        stroke: { color: [74, 222, 128], width: 1.2 },
      }
    );
    container.addChild(fpsBadgeBg);

    const fpsBadgeText = engineOrContext.createText(
      "-- FPS",
      { fontSize: fontSizeTech, fontFamily: "Outfit", color: [74, 222, 128] },
      "debug-fps-label"
    );
    fpsBadgeText.setPosition(fpsBadgeX + Math.round(8 * scale), Math.round(14 * scale));
    container.addChild(fpsBadgeText);

    const routeText = engineOrContext.createText(
      `Bioma: --\nDistância: 0m / ${totalFormatted}m (0%)`,
      { fontSize: fontSizePrimary, fontFamily: "Outfit", color: [255, 255, 255], lineSpacing: 4 },
      "debug-route"
    );
    routeText.setPosition(Math.round(20 * scale), Math.round(46 * scale));
    container.addChild(routeText);

    const progressBarFill = engineOrContext.createGraphics("debug-prog-fill");
    container.addChild(progressBarFill);

    const statusText = engineOrContext.createText(
      "Fôlego: 100%   •   Nutrição: +0%",
      { fontSize: fontSizeSecondary, fontFamily: "Inter", color: [210, 240, 255] },
      "debug-status"
    );
    statusText.setPosition(Math.round(14 * scale), Math.round(108 * scale));
    container.addChild(statusText);

    const powerupText = engineOrContext.createText(
      "",
      { fontSize: fontSizeSecondary - 1, fontFamily: "Inter", color: [255, 225, 110] },
      "debug-powerup"
    );
    powerupText.setPosition(Math.round(14 * scale), Math.round(122 * scale));
    container.addChild(powerupText);

    const speedText = engineOrContext.createText(
      `Velocidade: 0 / ${GAME_CONFIG.MAX_SPEED} px/s (0%)`,
      { fontSize: fontSizeSecondary, fontFamily: "Inter", color: [190, 235, 255] },
      "debug-speed"
    );
    speedText.setPosition(Math.round(14 * scale), Math.round(126 * scale));
    container.addChild(speedText);

    const speedBarFill = engineOrContext.createGraphics("debug-speed-fill");
    container.addChild(speedBarFill);

    const perfText = engineOrContext.createText(
      "Taxa: -- FPS   •   Objetos: --   •   Pool: --",
      { fontSize: fontSizeTech, fontFamily: "Inter", color: [175, 225, 250] },
      "debug-perf"
    );
    perfText.setPosition(Math.round(14 * scale), Math.round(159 * scale));
    perfText.setVisible(!isSerene);
    container.addChild(perfText);

    const sparklineText = engineOrContext.createText(
      "Desempenho Estável: 60 FPS",
      { fontSize: fontSizeTech, fontFamily: "Inter", color: [130, 245, 190] },
      "debug-sparkline"
    );
    sparklineText.setPosition(Math.round(14 * scale), Math.round(177 * scale));
    sparklineText.setVisible(!isSerene);
    container.addChild(sparklineText);

    const frameTimeText = engineOrContext.createText(
      "Latência: -- ms (p95: -- | p99: --)",
      { fontSize: fontSizeTech, fontFamily: "Inter", color: [165, 215, 255] },
      "debug-latency"
    );
    frameTimeText.setPosition(Math.round(14 * scale), Math.round(195 * scale));
    frameTimeText.setVisible(!isSerene);
    container.addChild(frameTimeText);

    const resInfoText = engineOrContext.createText(
      `Tela: ${formatResolutionInfo(engineOrContext)}`,
      { fontSize: fontSizeTech, fontFamily: "Inter", color: [140, 210, 255] },
      "debug-res"
    );
    resInfoText.setPosition(Math.round(14 * scale), Math.round(213 * scale));
    resInfoText.setVisible(!isSerene);
    container.addChild(resInfoText);

    let cachedFpsText = "-- FPS";

    return {
      getContainer: (): { hidden?: boolean; [key: string]: unknown } =>
        container as unknown as { hidden?: boolean; [key: string]: unknown },
      isVisible: (): boolean => container.isVisible(),
      getFpsHistory: (): number[] => [...fpsHistory],
      getFrameTimeHistory: (): number[] => [...frameTimeHistory],
      getFrameTimeMetrics: (): FrameTimeMetrics => calculateFrameTimeMetrics(frameTimeHistory),
      getFpsText: (): string => cachedFpsText,
      setVisible: (visible: boolean): void => {
        container.setVisible(visible);
      },
      toggle: (): boolean => {
        const next = !container.isVisible();
        container.setVisible(next);
        return next;
      },
      destroy: (): void => {
        try {
          engineOrContext.getStageRoot().removeChild(container);
          container.destroy();
        } catch {}
      },
      update: (distance: number, perfStats?: PerformanceStats): void => {
        if (!container.isVisible()) return;

        let curFps: number;
        if (perfStats && perfStats.fps !== undefined) {
          curFps = Math.round(perfStats.fps);
        } else {
          const dt = engineOrContext.getTicker().getDeltaTime();
          curFps = dt > 0 ? Math.round(1 / dt) : 60;
        }

        cachedFpsText = `${curFps} FPS`;
        fpsBadgeText.setText(cachedFpsText);

        fpsBadgeBg.clear();
        let strokeColor: [number, number, number];
        let textColor: [number, number, number];
        if (curFps >= 55) {
          textColor = [74, 222, 128];
          strokeColor = [34, 197, 94];
        } else if (curFps >= 45) {
          textColor = [250, 204, 21];
          strokeColor = [234, 179, 8];
        } else {
          textColor = [248, 113, 113];
          strokeColor = [239, 68, 68];
        }
        fpsBadgeText.setColor(textColor);
        fpsBadgeBg.drawRoundedRect(
          fpsBadgeX,
          Math.round(10 * scale),
          fpsBadgeWidth,
          modePillHeight,
          6,
          {
            fill: { color: [10, 26, 48], alpha: 1 },
            stroke: { color: strokeColor, width: 1.2 },
          }
        );

        if (perfStats) {
          fpsHistory.push(curFps);
          if (fpsHistory.length > 60) fpsHistory.shift();

          const sampleFrameTime =
            perfStats.frameTimeMs !== undefined
              ? perfStats.frameTimeMs
              : curFps > 0
                ? 1000 / curFps
                : 16.6;

          frameTimeHistory.push(sampleFrameTime);
          if (frameTimeHistory.length > 120) frameTimeHistory.shift();

          const metrics = calculateFrameTimeMetrics(frameTimeHistory);
          const minFps = Math.min(...fpsHistory);
          const maxFps = Math.max(...fpsHistory);
          const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);

          const fpsStr = perfStats.fps !== undefined ? `${perfStats.fps} FPS` : "--";
          const culledCount = perfStats.culledEntities ?? 0;
          const visibleCount = perfStats.visibleEntities ?? perfStats.entities;
          const entStr =
            visibleCount !== undefined
              ? culledCount > 0
                ? `${visibleCount} (${culledCount} ocultos)`
                : `${visibleCount} obj`
              : "--";
          const poolStr =
            perfStats.activeParticles !== undefined && perfStats.totalParticles !== undefined
              ? `${perfStats.activeParticles}/${perfStats.totalParticles} part`
              : "--";

          perfText.setText(`Taxa: ${fpsStr}   •   Objetos: ${entStr}   •   Pool: ${poolStr}`);
          if (perfStats.budgetStatus) {
            frameTimeText.setText(
              `Latência: Méd ${metrics.avg}ms • p95 ${metrics.p95}ms • ${perfStats.budgetStatus}`
            );
          } else {
            frameTimeText.setText(
              `Latência: Méd ${metrics.avg}ms • p95 ${metrics.p95}ms • p99 ${metrics.p99}ms`
            );
          }

          const isCritical = curFps < 45 || avgFps < 45 || metrics.p95 > 22.0;
          if (isCritical) {
            sparklineText.setText(
              `⚠️ Alerta de Queda: ${curFps} FPS (Mín: ${minFps} | Méd: ${avgFps})`
            );
            sparklineText.setColor([255, 110, 90]);
          } else {
            sparklineText.setText(
              `Desempenho Estável: Mín ${minFps} | Méd ${avgFps} | Máx ${maxFps} FPS`
            );
            sparklineText.setColor([130, 245, 190]);
          }
        }

        const clampedDist = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);
        const percent = Math.floor((clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * 100);
        const biome = getCurrentBiome(clampedDist);
        const distFormatted = Math.floor(clampedDist).toLocaleString("pt-BR");

        routeText.setText(
          `Bioma: ${biome.name}\nDistância: ${distFormatted}m / ${totalFormatted}m (${percent}%)`
        );

        const progressWidth = (clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * barWidth;
        progressBarFill.clear();
        if (progressWidth > 0) {
          progressBarFill.drawRoundedRect(
            Math.round(12 * scale),
            progressBarY,
            progressWidth,
            progressBarHeight,
            2.5,
            {
              fill: {
                color: [biome.surfaceColor[0], biome.surfaceColor[1], biome.surfaceColor[2]],
                alpha: 1,
              },
            }
          );
        }

        if (playerController) {
          const vel = playerController.getSpeed?.() ?? { x: 0, y: 0 };
          const speedLen = Math.round(
            typeof (vel as { len?: () => number }).len === "function"
              ? (vel as { len: () => number }).len()
              : Math.sqrt(vel.x * vel.x + vel.y * vel.y)
          );
          const maxSpd = Math.round(playerController.getMaxSpeed?.() ?? GAME_CONFIG.MAX_SPEED);
          const ratio = maxSpd > 0 ? speedLen / maxSpd : 0;
          const speedPercent = Math.round(ratio * 100);

          speedText.setText(`Velocidade: ${speedLen} / ${maxSpd} px/s (${speedPercent}%)`);

          const currentSpeedBarWidth = Math.min(barWidth, ratio * barWidth);
          speedBarFill.clear();
          let speedColor: [number, number, number];
          if (ratio >= 1.0) {
            speedColor = [255, 95, 75];
            speedText.setColor([255, 125, 95]);
          } else if (ratio >= 0.65) {
            speedColor = [255, 215, 80];
            speedText.setColor([255, 225, 120]);
          } else {
            speedColor = [100, 240, 255];
            speedText.setColor([190, 235, 255]);
          }

          if (currentSpeedBarWidth > 0) {
            speedBarFill.drawRoundedRect(
              Math.round(12 * scale),
              speedBarY,
              currentSpeedBarWidth,
              speedBarHeight,
              1.5,
              { fill: { color: speedColor, alpha: 1 } }
            );
          }

          const krills = playerController.getKrillsEaten?.() ?? 0;
          const drafting = playerController.isDrafting?.() ? " • Vácuo (+25%)" : "";
          const oil = playerController.isOilObstructed?.() ? " • Óleo!" : "";

          if (isSerene) {
            statusText.setText(`Fôlego: ∞ (Infinito)   •   Nutrição: +${krills}%${drafting}${oil}`);
            statusText.setColor([110, 255, 195]);
          } else {
            const oxygen = Math.floor(playerController.getOxygen?.() ?? 100);
            statusText.setText(`Fôlego: ${oxygen}%   •   Nutrição: +${krills}%${drafting}${oil}`);
            if (oxygen <= 25) {
              statusText.setColor([255, 90, 90]);
            } else if (oxygen <= 50) {
              statusText.setColor([255, 205, 90]);
            } else {
              statusText.setColor([210, 240, 255]);
            }
          }

          const badges: string[] = [];
          if (playerController.isSpeedBoosted?.()) {
            const t = playerController.getSpeedBoostTimer?.().toFixed(1);
            badges.push(`Correnteza ${t}s`);
          }
          powerupText.setText(badges.length > 0 ? `★ ${badges.join(" | ")}` : "");
        }
      },
    };
  }

  // --- MODO LEGADO (COMPATIBILIDADE REVERSA) ---
  const widthFn = typeof engineOrContext.width === "function" ? engineOrContext.width : () => 1280;
  const screenW = widthFn();
  const isHighRes = screenW >= 1920;
  const isMediumRes = screenW >= 1280;
  const scale = isHighRes ? 1.3 : isMediumRes ? 1.15 : 1.0;

  const containerWidth = Math.round(350 * scale);
  const containerHeight = isSerene ? Math.round(154 * scale) : Math.round(236 * scale);
  const padding = Math.round(12 * scale);

  const fontSizeTitle = Math.round(13.5 * scale);
  const fontSizePrimary = Math.round(13.5 * scale);
  const fontSizeSecondary = Math.round(12.5 * scale);
  const fontSizeTech = Math.round(11 * scale);
  const barWidth = containerWidth - Math.round(24 * scale);

  interface LegacyContainerEntity {
    hidden?: boolean;
    add?(childProps: unknown): unknown;
    destroy?(): void;
  }

  interface LegacyTextEntity {
    text?: string;
    color?: unknown;
  }

  interface LegacyFillEntity {
    width?: number;
    color?: unknown;
  }

  interface LegacyOutlineEntity {
    outline?: { color?: unknown; width?: number };
  }

  const containerOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(
          1.8,
          isSerene ? engineOrContext.rgb(52, 211, 153) : engineOrContext.rgb(56, 189, 248)
        )
      : undefined;

  const container = (
    typeof engineOrContext.add === "function"
      ? engineOrContext.add([
          typeof engineOrContext.rect === "function"
            ? engineOrContext.rect(containerWidth, containerHeight, { radius: 12 })
            : undefined,
          typeof engineOrContext.pos === "function"
            ? engineOrContext.pos(padding, padding)
            : undefined,
          typeof engineOrContext.color === "function"
            ? engineOrContext.color(7, 18, 36)
            : undefined,
          typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.95) : undefined,
          containerOutline,
          typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
          typeof engineOrContext.z === "function" ? engineOrContext.z(300) : undefined,
          "dev_debug_telemetry_container",
        ])
      : { hidden: true }
  ) as LegacyContainerEntity;

  container.hidden = true;

  const addNode = (props: unknown): unknown => {
    if (typeof container.add === "function") {
      return container.add(props);
    }
    if (typeof engineOrContext.add === "function") {
      return engineOrContext.add(props);
    }
    return {};
  };

  // Reflexo superior
  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(containerWidth - Math.round(24 * scale), 1.5, { radius: 1 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), 2)
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(140, 220, 255) : undefined,
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.35) : undefined,
  ]);

  // Pill de modo
  const modePillWidth = isSerene ? Math.round(185 * scale) : Math.round(170 * scale);
  const modePillHeight = Math.round(24 * scale);
  const modeOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(
          1.2,
          isSerene ? engineOrContext.rgb(40, 160, 115) : engineOrContext.rgb(35, 120, 180)
        )
      : undefined;

  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(modePillWidth, modePillHeight, { radius: 6 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), Math.round(10 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(12, 28, 54) : undefined,
    modeOutline,
  ]);

  // LED
  const ledSize = Math.max(5, Math.round(7 * scale));
  const ledColor =
    typeof engineOrContext.rgb === "function"
      ? isSerene
        ? engineOrContext.rgb(52, 211, 153)
        : engineOrContext.rgb(56, 189, 248)
      : undefined;

  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(ledSize, ledSize, { radius: ledSize / 2 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(20 * scale), Math.round(18 * scale))
      : undefined,
    ledColor
      ? typeof engineOrContext.color === "function"
        ? engineOrContext.color(ledColor)
        : undefined
      : undefined,
  ]);

  const titleColor =
    typeof engineOrContext.rgb === "function"
      ? isSerene
        ? engineOrContext.rgb(110, 255, 195)
        : engineOrContext.rgb(180, 235, 255)
      : undefined;

  addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text(isSerene ? "MIGRAÇÃO SERENA" : "TELEMETRIA DEV", {
          size: fontSizeTitle,
          font: "Outfit",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(32 * scale), Math.round(13 * scale))
      : undefined,
    titleColor
      ? typeof engineOrContext.color === "function"
        ? engineOrContext.color(titleColor)
        : undefined
      : undefined,
  ]);

  const f8BadgeWidth = Math.round(42 * scale);
  const f8Outline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.2, engineOrContext.rgb(38, 75, 125))
      : undefined;

  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(f8BadgeWidth, modePillHeight, { radius: 6 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(
          containerWidth - Math.round(12 * scale) - f8BadgeWidth,
          Math.round(10 * scale)
        )
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(14, 30, 56) : undefined,
    f8Outline,
  ]);

  addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("[F8]", { size: fontSizeTitle, font: "Outfit" })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(
          containerWidth - Math.round(12 * scale) - f8BadgeWidth + Math.round(8 * scale),
          Math.round(13 * scale)
        )
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(160, 215, 255) : undefined,
  ]);

  const fpsBadgeWidth = Math.round(62 * scale);
  const fpsBadgeX =
    containerWidth - Math.round(12 * scale) - f8BadgeWidth - Math.round(6 * scale) - fpsBadgeWidth;

  const fpsOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.2, engineOrContext.rgb(74, 222, 128))
      : undefined;

  const fpsBadgeBg = addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(fpsBadgeWidth, modePillHeight, { radius: 6 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(fpsBadgeX, Math.round(10 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(10, 26, 48) : undefined,
    fpsOutline,
  ]) as LegacyOutlineEntity;

  const fpsBadgeText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("-- FPS", { size: fontSizeTech, font: "Outfit" })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(fpsBadgeX + Math.round(8 * scale), Math.round(14 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(74, 222, 128) : undefined,
  ]) as LegacyTextEntity;

  const insetCardHeight = Math.round(52 * scale);
  const insetOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.2, engineOrContext.rgb(35, 70, 120))
      : undefined;

  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(barWidth, insetCardHeight, { radius: 8 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), Math.round(40 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(12, 28, 56) : undefined,
    insetOutline,
  ]);

  const routeText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text(`Bioma: --\nDistância: 0m / ${totalFormatted}m (0%)`, {
          size: fontSizePrimary,
          font: "Outfit",
          lineSpacing: 4,
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(20 * scale), Math.round(46 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(255, 255, 255) : undefined,
  ]) as LegacyTextEntity;

  const progressBarY = Math.round(98 * scale);
  const progressBarHeight = Math.round(4.5 * scale);

  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(barWidth, progressBarHeight, { radius: 2.5 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), progressBarY)
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(16, 34, 62) : undefined,
  ]);

  const progressBarFill = addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(0, progressBarHeight, { radius: 2.5 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), progressBarY)
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(0, 220, 255) : undefined,
  ]) as LegacyFillEntity;

  const statusText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("Fôlego: 100%   •   Nutrição: +0%", {
          size: fontSizeSecondary,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(108 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(210, 240, 255) : undefined,
  ]) as LegacyTextEntity;

  const powerupText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("", {
          size: fontSizeSecondary - 1,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(122 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(255, 225, 110) : undefined,
  ]) as LegacyTextEntity;

  const speedText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text(`Velocidade: 0 / ${GAME_CONFIG.MAX_SPEED} px/s (0%)`, {
          size: fontSizeSecondary,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(126 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(190, 235, 255) : undefined,
  ]) as LegacyTextEntity;

  const speedBarY = Math.round(142 * scale);
  const speedBarHeight = Math.round(3.5 * scale);

  addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(barWidth, speedBarHeight, { radius: 1.5 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), speedBarY)
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(16, 34, 62) : undefined,
  ]);

  const speedBarFill = addNode([
    typeof engineOrContext.rect === "function"
      ? engineOrContext.rect(0, speedBarHeight, { radius: 1.5 })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), speedBarY)
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(100, 240, 255) : undefined,
  ]) as LegacyFillEntity;

  const techDivider = addNode([
    typeof engineOrContext.rect === "function" ? engineOrContext.rect(barWidth, 1) : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(12 * scale), Math.round(152 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(28, 56, 92) : undefined,
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.8) : undefined,
  ]) as { hidden?: boolean };
  techDivider.hidden = isSerene;

  const perfText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("Taxa: -- FPS   •   Objetos: --   •   Pool: --", {
          size: fontSizeTech,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(159 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(175, 225, 250) : undefined,
  ]) as LegacyTextEntity & { hidden?: boolean };
  perfText.hidden = isSerene;

  const sparklineText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("Desempenho Estável: 60 FPS", {
          size: fontSizeTech,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(177 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(130, 245, 190) : undefined,
  ]) as LegacyTextEntity & { hidden?: boolean };
  sparklineText.hidden = isSerene;

  const frameTimeText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text("Latência: -- ms (p95: -- | p99: --)", {
          size: fontSizeTech,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(195 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(165, 215, 255) : undefined,
  ]) as LegacyTextEntity & { hidden?: boolean };
  frameTimeText.hidden = isSerene;

  const resInfoText = addNode([
    typeof engineOrContext.text === "function"
      ? engineOrContext.text(`Tela: ${formatResolutionInfo(engineOrContext)}`, {
          size: fontSizeTech,
          font: "Inter",
        })
      : undefined,
    typeof engineOrContext.pos === "function"
      ? engineOrContext.pos(Math.round(14 * scale), Math.round(213 * scale))
      : undefined,
    typeof engineOrContext.color === "function" ? engineOrContext.color(140, 210, 255) : undefined,
  ]) as LegacyTextEntity & { hidden?: boolean };
  resInfoText.hidden = isSerene;

  return {
    getContainer: (): { hidden?: boolean; [key: string]: unknown } =>
      container as { hidden?: boolean; [key: string]: unknown },
    isVisible: (): boolean => !container.hidden,
    getFpsHistory: (): number[] => [...fpsHistory],
    getFrameTimeHistory: (): number[] => [...frameTimeHistory],
    getFrameTimeMetrics: (): FrameTimeMetrics => calculateFrameTimeMetrics(frameTimeHistory),
    getFpsText: (): string => fpsBadgeText.text ?? "-- FPS",
    setVisible: (visible: boolean): void => {
      container.hidden = !visible;
    },
    toggle: (): boolean => {
      container.hidden = !container.hidden;
      return !container.hidden;
    },
    destroy: (): void => {
      if (typeof engineOrContext.destroy === "function") {
        engineOrContext.destroy(container);
      }
    },
    update: (distance: number, perfStats?: PerformanceStats): void => {
      if (container.hidden) return;

      let curFps = 60;
      if (perfStats && perfStats.fps !== undefined) {
        curFps = Math.round(perfStats.fps);
      } else if (typeof engineOrContext.dt === "function") {
        const dt = engineOrContext.dt();
        curFps = dt > 0 ? Math.round(1 / dt) : 60;
      }

      fpsBadgeText.text = `${curFps} FPS`;
      if (typeof engineOrContext.rgb === "function") {
        if (curFps >= 55) {
          fpsBadgeText.color = engineOrContext.rgb(74, 222, 128);
          if (fpsBadgeBg.outline) fpsBadgeBg.outline.color = engineOrContext.rgb(34, 197, 94);
        } else if (curFps >= 45) {
          fpsBadgeText.color = engineOrContext.rgb(250, 204, 21);
          if (fpsBadgeBg.outline) fpsBadgeBg.outline.color = engineOrContext.rgb(234, 179, 8);
        } else {
          fpsBadgeText.color = engineOrContext.rgb(248, 113, 113);
          if (fpsBadgeBg.outline) fpsBadgeBg.outline.color = engineOrContext.rgb(239, 68, 68);
        }
      }

      if (perfStats) {
        fpsHistory.push(curFps);
        if (fpsHistory.length > 60) fpsHistory.shift();

        const sampleFrameTime =
          perfStats.frameTimeMs !== undefined
            ? perfStats.frameTimeMs
            : curFps > 0
              ? 1000 / curFps
              : 16.6;

        frameTimeHistory.push(sampleFrameTime);
        if (frameTimeHistory.length > 120) frameTimeHistory.shift();

        const metrics = calculateFrameTimeMetrics(frameTimeHistory);
        const minFps = Math.min(...fpsHistory);
        const maxFps = Math.max(...fpsHistory);
        const avgFps = Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length);

        const fpsStr = perfStats.fps !== undefined ? `${perfStats.fps} FPS` : "--";
        const culledCount = perfStats.culledEntities ?? 0;
        const visibleCount = perfStats.visibleEntities ?? perfStats.entities;
        const entStr =
          visibleCount !== undefined
            ? culledCount > 0
              ? `${visibleCount} (${culledCount} ocultos)`
              : `${visibleCount} obj`
            : "--";
        const poolStr =
          perfStats.activeParticles !== undefined && perfStats.totalParticles !== undefined
            ? `${perfStats.activeParticles}/${perfStats.totalParticles} part`
            : "--";

        perfText.text = `Taxa: ${fpsStr}   •   Objetos: ${entStr}   •   Pool: ${poolStr}`;
        if (perfStats.budgetStatus) {
          frameTimeText.text = `Latência: Méd ${metrics.avg}ms • p95 ${metrics.p95}ms • ${perfStats.budgetStatus}`;
        } else {
          frameTimeText.text = `Latência: Méd ${metrics.avg}ms • p95 ${metrics.p95}ms • p99 ${metrics.p99}ms`;
        }

        const isCritical = curFps < 45 || avgFps < 45 || metrics.p95 > 22.0;
        if (isCritical) {
          sparklineText.text = `⚠️ Alerta de Queda: ${curFps} FPS (Mín: ${minFps} | Méd: ${avgFps})`;
          if (typeof engineOrContext.rgb === "function") {
            sparklineText.color = engineOrContext.rgb(255, 110, 90);
          }
        } else {
          sparklineText.text = `Desempenho Estável: Mín ${minFps} | Méd ${avgFps} | Máx ${maxFps} FPS`;
          if (typeof engineOrContext.rgb === "function") {
            sparklineText.color = engineOrContext.rgb(130, 245, 190);
          }
        }
      }

      const clampedDist = Math.min(Math.max(distance, 0), GAME_CONFIG.ROUTE_TOTAL_DISTANCE);
      const percent = Math.floor((clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * 100);
      const biome = getCurrentBiome(clampedDist);
      const distFormatted = Math.floor(clampedDist).toLocaleString("pt-BR");

      routeText.text = `Bioma: ${biome.name}\nDistância: ${distFormatted}m / ${totalFormatted}m (${percent}%)`;
      progressBarFill.width = (clampedDist / GAME_CONFIG.ROUTE_TOTAL_DISTANCE) * barWidth;
      if (typeof engineOrContext.rgb === "function") {
        progressBarFill.color = engineOrContext.rgb(
          biome.surfaceColor[0],
          biome.surfaceColor[1],
          biome.surfaceColor[2]
        );
      }

      if (playerController) {
        const vel =
          playerController.getSpeed?.() ??
          (typeof engineOrContext.vec2 === "function"
            ? engineOrContext.vec2(0, 0)
            : { x: 0, y: 0, len: () => 0 });
        const speedLen = Math.round(
          typeof (vel as { len?: () => number }).len === "function"
            ? (vel as { len: () => number }).len()
            : Math.sqrt((vel?.x || 0) * (vel?.x || 0) + (vel?.y || 0) * (vel?.y || 0))
        );
        const maxSpd = Math.round(playerController.getMaxSpeed?.() ?? GAME_CONFIG.MAX_SPEED);
        const ratio = maxSpd > 0 ? speedLen / maxSpd : 0;
        const speedPercent = Math.round(ratio * 100);

        speedText.text = `Velocidade: ${speedLen} / ${maxSpd} px/s (${speedPercent}%)`;
        speedBarFill.width = Math.min(barWidth, ratio * barWidth);

        if (typeof engineOrContext.rgb === "function") {
          if (ratio >= 1.0) {
            speedBarFill.color = engineOrContext.rgb(255, 95, 75);
            speedText.color = engineOrContext.rgb(255, 125, 95);
          } else if (ratio >= 0.65) {
            speedBarFill.color = engineOrContext.rgb(255, 215, 80);
            speedText.color = engineOrContext.rgb(255, 225, 120);
          } else {
            speedBarFill.color = engineOrContext.rgb(100, 240, 255);
            speedText.color = engineOrContext.rgb(190, 235, 255);
          }
        }

        const krills = playerController.getKrillsEaten?.() ?? 0;
        const drafting = playerController.isDrafting?.() ? " • Vácuo (+25%)" : "";
        const oil = playerController.isOilObstructed?.() ? " • Óleo!" : "";

        if (isSerene) {
          statusText.text = `Fôlego: ∞ (Infinito)   •   Nutrição: +${krills}%${drafting}${oil}`;
          if (typeof engineOrContext.rgb === "function") {
            statusText.color = engineOrContext.rgb(110, 255, 195);
          }
        } else {
          const oxygen = Math.floor(playerController.getOxygen?.() ?? 100);
          statusText.text = `Fôlego: ${oxygen}%   •   Nutrição: +${krills}%${drafting}${oil}`;
          if (typeof engineOrContext.rgb === "function") {
            if (oxygen <= 25) {
              statusText.color = engineOrContext.rgb(255, 90, 90);
            } else if (oxygen <= 50) {
              statusText.color = engineOrContext.rgb(255, 205, 90);
            } else {
              statusText.color = engineOrContext.rgb(210, 240, 255);
            }
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

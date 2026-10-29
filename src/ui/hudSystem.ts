/**
 * Sistema de HUD in-game (Barra de Oxigênio, Distância & Bioma) (Fase 31.7 e 31.8) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IGraphicsNode.
 */

import type { PlayerController } from "../entities/player";
import type { GameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { FONT_TITLE, FONT_BODY } from "../config";
import { formatDualDistance } from "../utils/navigation";
import { getRandomFloat } from "../utils/random";
import { i18n } from "../i18n/i18n";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export type OxygenUrgencyState = "calm" | "warning" | "critical";

export interface BiomeHudInfo {
  emoji: string;
  name: string;
  progressPercent: number;
}

export interface LegacyHudContext {
  width?(): number;
  height?(): number;
  add(components?: unknown): {
    hidden?: boolean;
    opacity?: number;
    pos?: { x: number; y: number };
    width?: number;
    color?: unknown;
    text?: string;
    add?(components?: unknown): {
      pos?: { x: number; y: number };
      text?: string;
      color?: unknown;
      width?: number;
    };
  };
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  opacity?(alpha: number): unknown;
  outline?(width: number, color: unknown): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  dt?(): number;
  destroy?(target: unknown): void;
  onUpdate(callback: () => void): { cancel?: () => void };
}

/**
 * Retorna as informações formatadas do bioma e progresso de migração (Fase 31.7 e 32.6).
 */
export function getBiomeHudInfo(distance: number): BiomeHudInfo {
  const dist = Math.max(0, distance);
  const progressPercent = Math.min(100, Math.floor((dist / 30000) * 100));

  if (dist < 5000) {
    return { emoji: "❄️", name: "Oceano Antártico", progressPercent };
  }
  if (dist < 12000) {
    return { emoji: "🌊", name: "Travessia Pelágica", progressPercent };
  }
  if (dist < 19000) {
    return { emoji: "🏭", name: "Costa Urbana", progressPercent };
  }
  if (dist < 25000) {
    return { emoji: "🌀", name: "Cânions & Ressurgência", progressPercent };
  }
  return { emoji: "☀️", name: "Santuário de Arraial", progressPercent };
}

/**
 * Determina o estado visual de urgência de oxigênio da jubarte (Fase 31.8).
 * - > 50%: 'calm' (azul sereno)
 * - 20% a 50%: 'warning' (âmbar pulsante com leve tremor)
 * - < 20%: 'critical' (vermelho de emergência + vinheta periférica)
 */
export function getOxygenUrgencyState(oxygenRatio: number): OxygenUrgencyState {
  if (oxygenRatio > 0.5) return "calm";
  if (oxygenRatio >= 0.2) return "warning";
  return "critical";
}

/**
 * Calcula deterministicamente a cor RGB da barra de oxigênio conforme a urgência e tempo.
 */
export function getOxygenColor(
  state: OxygenUrgencyState,
  time: number,
  isHighContrast = false
): [number, number, number] {
  if (isHighContrast) {
    if (state === "critical") return [255, 40, 40];
    if (state === "warning") return [255, 230, 40];
    return [0, 230, 255];
  }

  if (state === "critical") {
    const pulse = Math.sin(time * 12) * 35;
    return [255, Math.max(0, Math.min(255, Math.round(51 + pulse))), 102];
  }

  if (state === "warning") {
    const pulse = Math.sin(time * 6) * 30;
    return [255, Math.max(120, Math.min(240, Math.round(183 + pulse))), 10];
  }

  // calm: azul ciano sereno constante
  return [0, 229, 255];
}

/**
 * Formata distância com separador de milhar no padrão cultural do idioma ativo (ex: 14.238m ou 14,238m).
 */
export function formatHudDistance(meters: number): string {
  const rounded = Math.max(0, Math.floor(meters));
  return `${i18n.formatNumber(rounded)}m`;
}

/**
 * Inicializa o HUD de Distância e Barra de Oxigênio (Fase 31.7 e 31.8).
 */
export function setupHudSystem(
  engineOrContext: IRenderEngine | LegacyHudContext,
  playerController: PlayerController,
  gameState: GameState
): {
  update: () => void;
  destroy: () => void;
  getUrgencyState: () => OxygenUrgencyState;
} {
  const isHighContrast = accessibilitySystem.isHighContrast();

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const screenW = dimensions.width;
    const screenH = dimensions.height;

    // 1. Vinheta periférica de emergência
    const vignetteNode: IGraphicsNode = engineOrContext.createGraphics("hud_vignette");
    vignetteNode.drawRect(0, 0, screenW, screenH, {
      fill: { color: [180, 10, 30], alpha: 1 },
    });
    vignetteNode.setOpacity(0);
    vignetteNode.setZIndex(109);
    vignetteNode.setVisible(false);
    stageRoot.addChild(vignetteNode);

    // 2. Card Container
    const cardW = 236;
    const cardH = 62;
    const cardNode: IGraphicsNode = engineOrContext.createGraphics("hud_card");
    const outlineColor: [number, number, number] = isHighContrast ? [255, 255, 255] : [30, 80, 140];
    cardNode.drawRoundedRect(0, 0, cardW, cardH, 8, {
      fill: { color: [6, 18, 42], alpha: 0.85 },
      stroke: { width: 1.5, color: outlineColor, alpha: 1 },
    });
    cardNode.setPosition(14, 14);
    cardNode.setZIndex(110);
    stageRoot.addChild(cardNode);

    // Linha 1: Distância dupla
    const distanceText: ITextNode = engineOrContext.createText(
      "0m • 0,0 mn • 0%",
      {
        fontFamily: FONT_TITLE,
        fontSize: 11.5,
        color: [225, 245, 255],
      },
      "hud_distance_text"
    );
    distanceText.setPosition(24, 21);
    distanceText.setZIndex(111);
    stageRoot.addChild(distanceText);

    // Linha 2: Bioma
    const biomeText: ITextNode = engineOrContext.createText(
      "❄️ Oceano Antártico",
      {
        fontFamily: FONT_BODY,
        fontSize: 11,
        color: [150, 210, 245],
      },
      "hud_biome_text"
    );
    biomeText.setPosition(24, 40);
    biomeText.setZIndex(111);
    stageRoot.addChild(biomeText);

    // Linha 3: Barra de Oxigênio
    const barMaxW = cardW - 20; // 216px
    const barH = 7;

    const barBgNode: IGraphicsNode = engineOrContext.createGraphics("hud_oxygen_bg");
    barBgNode.drawRoundedRect(0, 0, barMaxW, barH, 3, {
      fill: { color: [12, 28, 55], alpha: 0.95 },
    });
    barBgNode.setPosition(24, 59);
    barBgNode.setZIndex(111);
    stageRoot.addChild(barBgNode);

    const oxygenBarFill: IGraphicsNode = engineOrContext.createGraphics("hud_oxygen_fill");
    oxygenBarFill.setPosition(24, 59);
    oxygenBarFill.setZIndex(112);
    stageRoot.addChild(oxygenBarFill);

    let totalTime = 0;
    let currentUrgency: OxygenUrgencyState = "calm";

    const updateHud = () => {
      const dt = engineOrContext.getTicker().getDeltaTime();
      totalTime += dt;

      const currentDistance =
        typeof gameState?.getDistance === "function"
          ? gameState.getDistance()
          : Math.max(0, playerController.gameObj?.pos?.x || 0);

      const biomeInfo = getBiomeHudInfo(currentDistance);
      distanceText.setText(
        `${formatDualDistance(currentDistance)} • ${biomeInfo.progressPercent}%`
      );
      biomeText.setText(`${biomeInfo.emoji} ${biomeInfo.name}`);

      const currentOx =
        typeof playerController.getOxygen === "function" ? playerController.getOxygen() : 100;
      const maxOx =
        typeof playerController.getMaxOxygen === "function" ? playerController.getMaxOxygen() : 100;
      const oxygenRatio = Math.max(0, Math.min(1, currentOx / Math.max(1, maxOx)));

      currentUrgency = getOxygenUrgencyState(oxygenRatio);

      const fillWidth = Math.max(0, barMaxW * oxygenRatio);
      const [r, g, b] = getOxygenColor(currentUrgency, totalTime, isHighContrast);

      oxygenBarFill.clear();
      if (fillWidth > 0) {
        oxygenBarFill.drawRoundedRect(0, 0, fillWidth, barH, 3, {
          fill: { color: [r, g, b], alpha: 1 },
        });
      }

      if (currentUrgency === "critical") {
        const tremorX = getRandomFloat(-0.8, 0.8);
        const tremorY = getRandomFloat(-0.8, 0.8);
        cardNode.setPosition(14 + tremorX, 14 + tremorY);
        distanceText.setPosition(24 + tremorX, 21 + tremorY);
        biomeText.setPosition(24 + tremorX, 40 + tremorY);
        barBgNode.setPosition(24 + tremorX, 59 + tremorY);
        oxygenBarFill.setPosition(24 + tremorX, 59 + tremorY);

        vignetteNode.setVisible(true);
        const vignettePulse = 0.22 + Math.sin(totalTime * 9) * 0.16;
        vignetteNode.setOpacity(Math.max(0.08, Math.min(0.45, vignettePulse)));
      } else if (currentUrgency === "warning") {
        const tremorX = getRandomFloat(-0.3, 0.3);
        cardNode.setPosition(14 + tremorX, 14);
        distanceText.setPosition(24 + tremorX, 21);
        biomeText.setPosition(24 + tremorX, 40);
        barBgNode.setPosition(24 + tremorX, 59);
        oxygenBarFill.setPosition(24 + tremorX, 59);
        vignetteNode.setVisible(false);
        vignetteNode.setOpacity(0);
      } else {
        cardNode.setPosition(14, 14);
        distanceText.setPosition(24, 21);
        biomeText.setPosition(24, 40);
        barBgNode.setPosition(24, 59);
        oxygenBarFill.setPosition(24, 59);
        vignetteNode.setVisible(false);
        vignetteNode.setOpacity(0);
      }
    };

    const unregisterTicker = engineOrContext.getTicker().add(updateHud);

    return {
      update: updateHud,
      destroy: () => {
        unregisterTicker();
        try {
          stageRoot.removeChild(cardNode);
          stageRoot.removeChild(distanceText);
          stageRoot.removeChild(biomeText);
          stageRoot.removeChild(barBgNode);
          stageRoot.removeChild(oxygenBarFill);
          stageRoot.removeChild(vignetteNode);

          cardNode.destroy();
          distanceText.destroy();
          biomeText.destroy();
          barBgNode.destroy();
          oxygenBarFill.destroy();
          vignetteNode.destroy();
        } catch {}
      },
      getUrgencyState: () => currentUrgency,
    };
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyHudContext;
  const screenW = typeof legacyContext.width === "function" ? legacyContext.width() : 640;
  const screenH = typeof legacyContext.height === "function" ? legacyContext.height() : 360;

  const vignetteOverlay = legacyContext.add([
    typeof legacyContext.rect === "function" ? legacyContext.rect(screenW, screenH) : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(0, 0) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(180, 10, 30) : undefined,
    typeof legacyContext.opacity === "function" ? legacyContext.opacity(0) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(109) : undefined,
    "hud_vignette",
  ]);
  vignetteOverlay.hidden = true;

  const cardW = 236;
  const cardH = 62;

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const hudContainer = legacyContext.add([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(cardW, cardH, { radius: 8 })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(14, 14) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(6, 18, 42) : undefined,
    typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.85) : undefined,
    typeof legacyContext.outline === "function"
      ? legacyContext.outline(
          1.5,
          isHighContrast ? resolveRgb(255, 255, 255) : resolveRgb(30, 80, 140)
        )
      : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(110) : undefined,
    "hud_card",
  ]);

  const addSub = (compList: unknown[]) => {
    if (typeof hudContainer.add === "function") {
      return hudContainer.add(compList);
    }
    return legacyContext.add(compList);
  };

  const distanceText = addSub([
    typeof legacyContext.text === "function"
      ? legacyContext.text("0m • 0,0 mn • 0%", { size: 11.5, font: FONT_TITLE })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(10, 7) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(225, 245, 255) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
  ]);

  const biomeText = addSub([
    typeof legacyContext.text === "function"
      ? legacyContext.text("❄️ Oceano Antártico", { size: 11, font: FONT_BODY })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(10, 26) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(150, 210, 245) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
  ]);

  const barMaxW = cardW - 20;
  const barH = 7;

  addSub([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(barMaxW, barH, { radius: 3 })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(10, 45) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(12, 28, 55) : undefined,
    typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.95) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
  ]);

  const oxygenBarFill = addSub([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(barMaxW, barH, { radius: 3 })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(10, 45) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(0, 229, 255) : undefined,
    typeof legacyContext.opacity === "function" ? legacyContext.opacity(1) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
  ]);

  let totalTime = 0;
  let currentUrgency: OxygenUrgencyState = "calm";

  const updateHud = () => {
    const dt = typeof legacyContext.dt === "function" ? legacyContext.dt() : 0.016;
    totalTime += dt;

    const currentDistance =
      typeof gameState?.getDistance === "function"
        ? gameState.getDistance()
        : Math.max(0, playerController.gameObj?.pos?.x || 0);

    const biomeInfo = getBiomeHudInfo(currentDistance);
    distanceText.text = `${formatDualDistance(currentDistance)} • ${biomeInfo.progressPercent}%`;
    biomeText.text = `${biomeInfo.emoji} ${biomeInfo.name}`;

    const currentOx =
      typeof playerController.getOxygen === "function" ? playerController.getOxygen() : 100;
    const maxOx =
      typeof playerController.getMaxOxygen === "function" ? playerController.getMaxOxygen() : 100;
    const oxygenRatio = Math.max(0, Math.min(1, currentOx / Math.max(1, maxOx)));

    currentUrgency = getOxygenUrgencyState(oxygenRatio);

    const fillWidth = Math.max(0, barMaxW * oxygenRatio);
    oxygenBarFill.width = fillWidth;

    const [r, g, b] = getOxygenColor(currentUrgency, totalTime, isHighContrast);
    oxygenBarFill.color = resolveRgb(r, g, b);

    if (currentUrgency === "critical") {
      const tremorX = getRandomFloat(-0.8, 0.8);
      const tremorY = getRandomFloat(-0.8, 0.8);
      if (hudContainer.pos) {
        hudContainer.pos.x = 14 + tremorX;
        hudContainer.pos.y = 14 + tremorY;
      }

      vignetteOverlay.hidden = false;
      const vignettePulse = 0.22 + Math.sin(totalTime * 9) * 0.16;
      vignetteOverlay.opacity = Math.max(0.08, Math.min(0.45, vignettePulse));
    } else if (currentUrgency === "warning") {
      const tremorX = getRandomFloat(-0.3, 0.3);
      if (hudContainer.pos) {
        hudContainer.pos.x = 14 + tremorX;
        hudContainer.pos.y = 14;
      }
      vignetteOverlay.hidden = true;
      vignetteOverlay.opacity = 0;
    } else {
      if (hudContainer.pos) {
        hudContainer.pos.x = 14;
        hudContainer.pos.y = 14;
      }
      vignetteOverlay.hidden = true;
      vignetteOverlay.opacity = 0;
    }
  };

  const updateHandler = legacyContext.onUpdate(updateHud);

  return {
    update: updateHud,
    destroy: () => {
      if (typeof updateHandler?.cancel === "function") {
        updateHandler.cancel();
      }
      if (typeof legacyContext.destroy === "function") {
        legacyContext.destroy(hudContainer);
        legacyContext.destroy(vignetteOverlay);
      }
    },
    getUrgencyState: () => currentUrgency,
  };
}

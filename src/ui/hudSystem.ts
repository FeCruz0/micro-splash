import type { KaboomCtx } from "kaboom";
import type { PlayerController } from "../entities/player";
import { accessibilitySystem } from "../systems/accessibilitySystem";

export type OxygenUrgencyState = "calm" | "warning" | "critical";

export interface BiomeHudInfo {
  emoji: string;
  name: string;
  progressPercent: number;
}

/**
 * Retorna as informações formatadas do bioma e progresso de migração (Fase 31.7).
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
    return { emoji: "🌀", name: "Cânions de Cabo Frio", progressPercent };
  }
  return { emoji: "☀️", name: "Enseada de Arraial do Cabo", progressPercent };
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
 * Formata distância com separador de milhar no padrão pt-BR (ex: 14.238m).
 */
export function formatHudDistance(meters: number): string {
  const rounded = Math.max(0, Math.floor(meters));
  return `${rounded.toLocaleString("pt-BR")}m`;
}

/**
 * Inicializa o HUD de Distância e Barra de Oxigênio (Fase 31.7 e 31.8).
 */
export function setupHudSystem(
  k: KaboomCtx,
  playerController: PlayerController,
  gameState: any
): {
  update: () => void;
  destroy: () => void;
  getUrgencyState: () => OxygenUrgencyState;
} {
  const isHighContrast = accessibilitySystem.isHighContrast();
  const screenW = typeof k.width === "function" ? k.width() : 640;
  const screenH = typeof k.height === "function" ? k.height() : 360;

  // 1. Vinheta periférica avermelhada de emergência ao mergulhar fundo com fôlego crítico (<20%)
  const vignetteOverlay = k.add([
    k.rect(screenW, screenH),
    k.pos(0, 0),
    k.color(180, 10, 30),
    k.opacity(0),
    k.fixed(),
    k.z(109),
    "hud_vignette",
  ]);
  vignetteOverlay.hidden = true;

  // 2. Container Card elegante translúcido no topo esquerdo
  const cardW = 210;
  const cardH = 58;
  const hudContainer = k.add([
    k.rect(cardW, cardH, { radius: 8 }),
    k.pos(14, 14),
    k.color(6, 18, 42),
    k.opacity(0.85),
    k.outline(1.5, isHighContrast ? k.rgb(255, 255, 255) : k.rgb(30, 80, 140)),
    k.fixed(),
    k.z(110),
    "hud_card",
  ]);

  // Linha 1: Distância formatada + Porcentagem total
  const distanceText = hudContainer.add([
    k.text("0m • 0%", { size: 13.5, font: "Outfit" }),
    k.pos(10, 8),
    k.color(225, 245, 255),
    k.fixed(),
  ]);

  // Linha 2: Bioma com Emoji
  const biomeText = hudContainer.add([
    k.text("❄️ Oceano Antártico", { size: 10.5, font: "Inter" }),
    k.pos(10, 25),
    k.color(150, 210, 245),
    k.fixed(),
  ]);

  // Linha 3: Barra de Fôlego / Oxigênio
  const barMaxW = cardW - 20; // 190px
  const barH = 7;

  // Trilho / Fundo escuro da barra
  hudContainer.add([
    k.rect(barMaxW, barH, { radius: 3 }),
    k.pos(10, 42),
    k.color(12, 28, 55),
    k.opacity(0.95),
    k.fixed(),
  ]);

  // Barra de preenchimento dinâmico
  const oxygenBarFill = hudContainer.add([
    k.rect(barMaxW, barH, { radius: 3 }),
    k.pos(10, 42),
    k.color(0, 229, 255),
    k.opacity(1),
    k.fixed(),
  ]);

  let totalTime = 0;
  let currentUrgency: OxygenUrgencyState = "calm";

  const updateHud = () => {
    const dt = typeof k.dt === "function" ? k.dt() : 0.016;
    totalTime += dt;

    // Obtém distância atual
    const currentDistance =
      typeof gameState?.getDistance === "function"
        ? gameState.getDistance()
        : Math.max(0, playerController.gameObj?.pos?.x || 0);

    const biomeInfo = getBiomeHudInfo(currentDistance);
    distanceText.text = `${formatHudDistance(currentDistance)} • ${biomeInfo.progressPercent}%`;
    biomeText.text = `${biomeInfo.emoji} ${biomeInfo.name}`;

    // Obtém oxigênio atual
    const currentOx =
      typeof playerController.getOxygen === "function" ? playerController.getOxygen() : 100;
    const maxOx =
      typeof playerController.getMaxOxygen === "function" ? playerController.getMaxOxygen() : 100;
    const oxygenRatio = Math.max(0, Math.min(1, currentOx / Math.max(1, maxOx)));

    currentUrgency = getOxygenUrgencyState(oxygenRatio);

    // Atualiza largura da barra
    const fillWidth = Math.max(0, barMaxW * oxygenRatio);
    oxygenBarFill.width = fillWidth;

    // Atualiza cor da barra de acordo com urgência
    const [r, g, b] = getOxygenColor(currentUrgency, totalTime, isHighContrast);
    oxygenBarFill.color = k.rgb(r, g, b);

    // Efeito de tremor (tremor leve no aviso e tremor maior no crítico)
    if (currentUrgency === "critical") {
      const tremorX = (Math.random() - 0.5) * 1.6;
      const tremorY = (Math.random() - 0.5) * 1.6;
      hudContainer.pos.x = 14 + tremorX;
      hudContainer.pos.y = 14 + tremorY;

      // Vinheta periférica avermelhada pulsante
      vignetteOverlay.hidden = false;
      const vignettePulse = 0.22 + Math.sin(totalTime * 9) * 0.16;
      vignetteOverlay.opacity = Math.max(0.08, Math.min(0.45, vignettePulse));
    } else if (currentUrgency === "warning") {
      const tremorX = (Math.random() - 0.5) * 0.6;
      hudContainer.pos.x = 14 + tremorX;
      hudContainer.pos.y = 14;
      vignetteOverlay.hidden = true;
      vignetteOverlay.opacity = 0;
    } else {
      hudContainer.pos.x = 14;
      hudContainer.pos.y = 14;
      vignetteOverlay.hidden = true;
      vignetteOverlay.opacity = 0;
    }
  };

  const updateHandler = k.onUpdate(updateHud);

  return {
    update: updateHud,
    destroy: () => {
      if (typeof updateHandler?.cancel === "function") {
        updateHandler.cancel();
      }
      if (typeof k.destroy === "function") {
        k.destroy(hudContainer);
        k.destroy(vignetteOverlay);
      }
    },
    getUrgencyState: () => currentUrgency,
  };
}

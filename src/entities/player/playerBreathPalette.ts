/**
 * Paleta Centralizada por Estado de Fôlego e Oxigênio da Baleia (Fase 51.2).
 *
 * Unifica a colorimetria do corpo, fatias anatômicas e nadadeiras peitorais
 * conforme o suprimento de oxigênio, asfixia, desmaio e retenção em redes.
 */

export type WhaleUrgencyState = "calm" | "warning" | "critical" | "trapped" | "fainting";

export interface BreathPaletteParameters {
  /** Razão instantânea de oxigênio entre 0.0 e 1.0 */
  oxygenRatio: number;
  /** Indica se a baleia está enroscada em rede de pesca */
  isTrapped?: boolean;
  /** Indica se a baleia está em estado de desmaio/blackout por anóxia */
  isFainting?: boolean;
  /** Modo de alto contraste para acessibilidade visual */
  isHighContrast?: boolean;
  /** Tempo total decorrido em segundos para pulso de urgência */
  timeInSeconds?: number;
}

export interface WhaleColorPalette {
  /** Cor RGB normalizada para o corpo principal e fatias da baleia */
  bodyColor: [number, number, number];
  /** Cor RGB normalizada para as nadadeiras peitorais */
  finsColor: [number, number, number];
  /** Estado semântico de urgência do fôlego */
  urgencyState: WhaleUrgencyState;
  /** Fator de escurecimento normalizado (0.0 = íntegro, 1.0 = colapso) */
  suffocationIntensity: number;
}

/**
 * Função de interpolação linear pura e segura.
 */
function linearInterpolate(startValue: number, endValue: number, ratio: number): number {
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return startValue + (endValue - startValue) * clampedRatio;
}

/**
 * Resolve deterministicamente a paleta cromática da baleia conforme o estado respiratório.
 */
export function getWhaleBreathColor(parameters: BreathPaletteParameters): WhaleColorPalette {
  const {
    oxygenRatio,
    isTrapped = false,
    isFainting = false,
    isHighContrast = false,
    timeInSeconds = 0,
  } = parameters;

  const clampedRatio = Math.max(0, Math.min(1, oxygenRatio));

  // 1. Estado de Aprisionamento em Rede Fantasma (Matiz púrpura-violeta)
  if (isTrapped) {
    if (isHighContrast) {
      return {
        bodyColor: [220, 100, 255],
        finsColor: [240, 140, 255],
        urgencyState: "trapped",
        suffocationIntensity: 0.8,
      };
    }
    return {
      bodyColor: [190, 90, 230],
      finsColor: [175, 80, 215],
      urgencyState: "trapped",
      suffocationIntensity: 0.75,
    };
  }

  // 2. Estado de Desmaio / Blackout por Asfixia (Cianose profunda acinzentada)
  if (isFainting || clampedRatio <= 0) {
    if (isHighContrast) {
      return {
        bodyColor: [80, 80, 100],
        finsColor: [70, 70, 90],
        urgencyState: "fainting",
        suffocationIntensity: 1.0,
      };
    }
    return {
      bodyColor: [55, 60, 80],
      finsColor: [48, 52, 70],
      urgencyState: "fainting",
      suffocationIntensity: 1.0,
    };
  }

  // 3. Estado Crítico (< 20% de Fôlego - Alerta pulsante de emergência)
  if (clampedRatio < 0.2) {
    const pulsePhase = Math.sin(timeInSeconds * 10) * 15;
    const normalizedCritical = clampedRatio / 0.2; // 0.0 a 1.0 dentro da faixa crítica

    const redChannel = Math.round(
      Math.min(255, Math.max(0, linearInterpolate(65, 140, normalizedCritical) + pulsePhase))
    );
    const greenChannel = Math.round(
      Math.min(255, Math.max(0, linearInterpolate(70, 160, normalizedCritical) + pulsePhase * 0.5))
    );
    const blueChannel = Math.round(
      Math.min(255, Math.max(0, linearInterpolate(95, 200, normalizedCritical)))
    );

    const bodyRgb: [number, number, number] = isHighContrast
      ? [255, 60, 60]
      : [redChannel, greenChannel, blueChannel];

    const finsRgb: [number, number, number] = isHighContrast
      ? [255, 90, 90]
      : [
          Math.max(0, redChannel - 10),
          Math.max(0, greenChannel - 10),
          Math.max(0, blueChannel - 10),
        ];

    return {
      bodyColor: bodyRgb,
      finsColor: finsRgb,
      urgencyState: "critical",
      suffocationIntensity: 1.0 - clampedRatio,
    };
  }

  // 4. Estado de Aviso (20% a 50% de Fôlego - Sutil perda de brilho e tom âmbar)
  if (clampedRatio <= 0.5) {
    const normalizedWarning = (clampedRatio - 0.2) / 0.3; // 0.0 a 1.0 dentro da faixa warning
    const redChannel = Math.round(linearInterpolate(140, 245, normalizedWarning));
    const greenChannel = Math.round(linearInterpolate(160, 245, normalizedWarning));
    const blueChannel = Math.round(linearInterpolate(200, 255, normalizedWarning));

    const bodyRgb: [number, number, number] = [redChannel, greenChannel, blueChannel];
    const finsRgb: [number, number, number] = [
      Math.max(0, redChannel - 10),
      Math.max(0, greenChannel - 10),
      Math.max(0, blueChannel - 10),
    ];

    return {
      bodyColor: bodyRgb,
      finsColor: finsRgb,
      urgencyState: "warning",
      suffocationIntensity: 1.0 - clampedRatio,
    };
  }

  // 5. Estado Calmo (> 50% de Fôlego - Textura natural com brilho integral)
  return {
    bodyColor: [255, 255, 255],
    finsColor: [255, 255, 255],
    urgencyState: "calm",
    suffocationIntensity: 0.0,
  };
}

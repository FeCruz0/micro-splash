/**
 * Módulo de Orquestração e Interpolação Harmônica de Animação da Jubarte (Fase 44).
 *
 * Gerencia as transições biomecânicas entre os 16 quadros expandidos do spritesheet:
 * - Quadro 0: glide (neutro)
 * - Quadros 1..4: idle_swim (ondulação pendular de maré)
 * - Quadros 5..9: stroke_down (batida propulsora de potência)
 * - Quadros 10..13: stroke_up (recuperação elástica ascendente)
 * - Quadros 14..15: feed (abertura gular e filtração por barbas)
 */

export type WhaleAnimationState =
  "glide" | "idle_swim" | "stroke_up" | "stroke_down" | "swim" | "feed";

export interface WhaleAnimationParameters {
  /** Indica se está em ciclo muscular ativo de propulsão caudal */
  isMuscularStroke: boolean;
  /** Progresso normalizado do ciclo muscular (0.0 a 1.0) */
  strokeProgress: number;
  /** Velocidade horizontal em pixels por segundo */
  horizontalSpeed: number;
  /** Indica se a baleia está ativamente capturando krill (alimentação) */
  isFeeding: boolean;
  /** Indica se a baleia está presa em rede de pesca */
  isTrapped: boolean;
  /** Indica se o jogo está em pausa ou tela de fim */
  isFrozen: boolean;
  /** Indica se o oxigênio está zerado */
  isFainting: boolean;
  /** Indica se a baleia está submersa na água */
  inWater: boolean;
}

export interface WhaleAnimationDefinition {
  /** Nome identificador do estado */
  state: WhaleAnimationState;
  /** Índice inicial do frame no spritesheet de 16 quadros */
  startFrameIndex: number;
  /** Índice final do frame no spritesheet de 16 quadros */
  endFrameIndex: number;
  /** Velocidade base em quadros por segundo */
  basePlaybackSpeed: number;
  /** Indica se o ciclo deve se repetir em loop */
  isLooping: boolean;
}

/** Tabela estática de configuração dos 16 quadros */
export const WHALE_ANIMATION_DEFINITIONS: Record<WhaleAnimationState, WhaleAnimationDefinition> = {
  glide: {
    state: "glide",
    startFrameIndex: 0,
    endFrameIndex: 0,
    basePlaybackSpeed: 1,
    isLooping: false,
  },
  idle_swim: {
    state: "idle_swim",
    startFrameIndex: 1,
    endFrameIndex: 4,
    basePlaybackSpeed: 4,
    isLooping: true,
  },
  stroke_down: {
    state: "stroke_down",
    startFrameIndex: 5,
    endFrameIndex: 9,
    basePlaybackSpeed: 14,
    isLooping: false,
  },
  stroke_up: {
    state: "stroke_up",
    startFrameIndex: 10,
    endFrameIndex: 13,
    basePlaybackSpeed: 12,
    isLooping: false,
  },
  swim: {
    state: "swim",
    startFrameIndex: 5,
    endFrameIndex: 13,
    basePlaybackSpeed: 10,
    isLooping: true,
  },
  feed: {
    state: "feed",
    startFrameIndex: 14,
    endFrameIndex: 15,
    basePlaybackSpeed: 6,
    isLooping: true,
  },
};

/**
 * Determina o estado de animação biomecânico da jubarte com base em suas variáveis de movimento.
 *
 * @param parameters - Parâmetros biomecânicos e de ambiente.
 * @returns O estado de animação correspondente na folha de 16 quadros.
 */
export function determineWhaleAnimationState(
  parameters: WhaleAnimationParameters
): WhaleAnimationState {
  const {
    isFeeding,
    isTrapped,
    isFrozen,
    isFainting,
    isMuscularStroke,
    strokeProgress,
    horizontalSpeed,
    inWater,
  } = parameters;

  if (isFeeding) {
    return "feed";
  }

  if (isTrapped || isFrozen || isFainting) {
    return "glide";
  }

  if (isMuscularStroke) {
    return strokeProgress <= 0.55 ? "stroke_down" : "stroke_up";
  }

  if (horizontalSpeed > 35) {
    return "glide";
  }

  if (inWater) {
    return "idle_swim";
  }

  return "glide";
}

/**
 * Modula dinamicamente a velocidade de reprodução dos quadros conforme a hidrodinâmica.
 *
 * @param animState - Estado atual de animação.
 * @param horizontalSpeed - Velocidade de deslocamento em pixels por segundo.
 * @returns Velocidade final em quadros por segundo.
 */
export function calculateWhaleAnimationPlaybackSpeed(
  animState: WhaleAnimationState,
  horizontalSpeed: number
): number {
  const definition = WHALE_ANIMATION_DEFINITIONS[animState];
  if (!definition) {
    return 1;
  }

  if (animState === "idle_swim") {
    return definition.basePlaybackSpeed;
  }

  if (animState === "stroke_down" || animState === "stroke_up") {
    return definition.basePlaybackSpeed;
  }

  if (animState === "swim") {
    const speedRatio = Math.min(2.0, Math.max(0.7, horizontalSpeed / 100));
    return definition.basePlaybackSpeed * speedRatio;
  }

  return definition.basePlaybackSpeed;
}

import type { GameObj, Vec2 } from "kaboom";

export interface PlayerController {
  gameObj: GameObj;
  getSpeed: () => Vec2;
  setSpeed: (newSpeed: Vec2) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  getMaxSpeed: () => number;
  getKrillsEaten: () => number;
  isFainting: () => boolean;
  isSereneMode: () => boolean;
  consumeKrill: () => void;
  penalizeTrash: () => void;
  trapInNet: (count: number) => void;
  addTrapCount: (count: number) => void;
  isTrapped: () => boolean;
  startBreach: () => void;
  isBreaching: () => boolean;
  completeBreach: () => void;
  setOilObstructed: (obstructed: boolean) => void;
  isOilObstructed: () => boolean;
  setDrafting: (drafting: boolean) => void;
  isDrafting: () => boolean;

  // Auxílios e Efeitos Ambientais
  applySpeedBoost: (duration: number, multiplier?: number) => void;
  isSpeedBoosted: () => boolean;
  getSpeedBoostTimer: () => number;
  restoreOxygen: (amount: number) => void;

  // Estado de congelamento (telas de fim de jogo, vitória e pausa)
  freeze: () => void;
  unfreeze: () => void;
  isFrozen: () => boolean;

  // Fase 17: Dinâmica Visual de Roll, Cáusticos e Cooldown de Nado
  getRollAngle?: () => number;
  getCausticOpacity?: () => number;
  getVentralOpacity?: () => number;
  getStrokeCooldown?: () => number;

  // Fase 18: Dinâmica Hidrodinâmica de Correntezas (A favor vs. Contra o Fluxo)
  isFacingRight?: () => boolean;
  setCurrentFlowModifier?: (modifier: number) => void;
  getCurrentFlowModifier?: () => number;
}

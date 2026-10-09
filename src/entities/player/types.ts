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

  // Fase 41: Deformação Sagital por Fatiamento Segmentado (Vertical Slice Ribbon)
  getSliceTransforms?: () => any[];
  getSpineCurvature?: () => number;
  getPitchFlexion?: () => number;

  // Fase 42: Nadadeiras Peitorais Independentes e Hidrodinâmica de Diedro
  getPectoralFinTransforms?: () => any;

  // Fase 43: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig)
  getPuppetRigTransforms?: () => any;

  // Fase 44: Spritesheet Expandido de 16 Quadros e Interpolação Harmônica
  getAnimationState?: () => string;
}

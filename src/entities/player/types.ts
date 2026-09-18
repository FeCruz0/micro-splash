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

  // Power-ups da Fase 12
  hasBubbleShield: () => boolean;
  activateBubbleShield: () => void;
  popBubbleShield: () => boolean;
  applySpeedBoost: (duration: number, multiplier?: number) => void;
  isSpeedBoosted: () => boolean;
  getSpeedBoostTimer: () => number;
  restoreOxygen: (amount: number) => void;
  activateBioluminescence: (duration: number) => void;
  hasBioluminescence: () => boolean;
  getBioluminescenceTimer: () => number;
}

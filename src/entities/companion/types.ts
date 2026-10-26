import type { GameObj, Vec2 } from "kaboom";
import type { RandomNumberGenerator } from "../../utils/random";

export type CompanionState =
  | "INTRO"
  | "CRUISE"
  | "FEEDING"
  | "SEEK_BREATH"
  | "SURFACE_BREATHE"
  | "FAREWELL_BREACH"
  | "RESTING"
  | "DEPARTED";

export interface CompanionOptions {
  initialX?: number;
  initialY?: number;
  seed?: number;
  prng?: RandomNumberGenerator;
  onStateChange?: (state: CompanionState) => void;
  onDeparted?: () => void;
}

export interface CompanionWhaleController {
  gameObj: GameObj;
  getState: () => CompanionState;
  forceState: (state: CompanionState) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  getKrillsEaten: () => number;
  consumeKrill: (krill: GameObj) => void;
  triggerSonar: () => void;
  getSpeed: () => Vec2;
  isDeparted: () => boolean;
  destroy: () => void;
}

export interface CompanionCollidable {
  consumeKrill: (krill: GameObj) => void;
  handleIceCollision: (iceBlock: GameObj) => void;
  handleObstacleCollision: (obstacle: GameObj) => void;
}

export function isCompanionCollidable(entity: unknown): entity is GameObj & CompanionCollidable {
  if (!entity || typeof entity !== "object") return false;
  const candidate = entity as Partial<CompanionCollidable>;
  return (
    typeof candidate.consumeKrill === "function" ||
    typeof candidate.handleIceCollision === "function" ||
    typeof candidate.handleObstacleCollision === "function"
  );
}

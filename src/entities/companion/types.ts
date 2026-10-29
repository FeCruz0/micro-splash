import type { RandomNumberGenerator } from "../../utils/random";
import type { SpatialHashGrid } from "../../systems/spatialHashGrid";

export type CompanionState =
  | "INTRO"
  | "CRUISE"
  | "FEEDING"
  | "SEEK_BREATH"
  | "SURFACE_BREATHE"
  | "FAREWELL_BREACH"
  | "RESTING"
  | "DEPARTED"
  | "INDEPENDENT_CRUISE"
  | "AVOID_OBSTACLE"
  | "TRAPPED"
  | "FAINTED"
  | "VICTORY_BREACH";

export type CompanionAutonomyMode = "guided" | "autonomous";

export interface CompanionVector2D {
  x: number;
  y: number;
  scale?: (factor: number) => CompanionVector2D;
  add?: (other: CompanionVector2D) => CompanionVector2D;
  unit?: () => CompanionVector2D;
  len: () => number;
}

export interface CompanionGameObject {
  pos: CompanionVector2D;
  angle: number;
  comps: Array<{ type?: string; [key: string]: unknown }>;
  _triggerUpdate: () => void;
  _destroyed?: boolean;
  play?: (anim: string) => void;
  move?: (x: number, y: number) => void;
  exists?: () => boolean;
  onUpdate?: (cb: () => void) => void;
  is?: (tag: string) => boolean;
}

export interface CompanionOptions<TGameObj = unknown> {
  initialX?: number;
  initialY?: number;
  seed?: number;
  prng?: RandomNumberGenerator;
  spatialGrid?: SpatialHashGrid<TGameObj>;
  mode?: string;
  isCoMigration?: boolean;
  autonomyMode?: CompanionAutonomyMode;
  infiniteOxygen?: boolean;
  onStateChange?: (state: CompanionState) => void;
  onDeparted?: () => void;
  onFainted?: () => void;
  onVictoryBreach?: () => void;
}

export interface CompanionWhaleController<
  TGameObj = CompanionGameObject,
  TVec extends { x: number; y: number } = CompanionVector2D,
> {
  gameObj: TGameObj;
  getState: () => CompanionState;
  forceState: (state: CompanionState) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  getKrillsEaten: () => number;
  consumeKrill: (krill: TGameObj) => void;
  triggerSonar: () => void;
  getSpeed: () => TVec;
  isDeparted: () => boolean;
  isFainted: () => boolean;
  destroy: () => void;
}

export interface CompanionCollidable<TGameObj = unknown> {
  consumeKrill: (krill: TGameObj) => void;
  handleIceCollision: (iceBlock: TGameObj) => void;
  handleObstacleCollision: (obstacle: TGameObj) => void;
  handleNetCollision?: (net: TGameObj) => void;
  pos?: { x?: number; y?: number };
}

export function isCompanionCollidable(entity: unknown): entity is CompanionCollidable {
  if (!entity || typeof entity !== "object") return false;
  const candidate = entity as Partial<CompanionCollidable>;
  return (
    typeof candidate.consumeKrill === "function" ||
    typeof candidate.handleIceCollision === "function" ||
    typeof candidate.handleObstacleCollision === "function" ||
    typeof candidate.handleNetCollision === "function"
  );
}

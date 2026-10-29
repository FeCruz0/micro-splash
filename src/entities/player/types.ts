import type { WhaleSliceData } from "./playerSliceRenderer";
import type { DualPectoralFinsData } from "./playerPectoralFin";
import type { PuppetRigTransforms } from "./playerPuppetRig";
import type { WhaleAnimationState } from "./playerAnimation";
import type { WhaleRenderPipelineSnapshot } from "./playerRenderPipeline";
import type { WhaleColorPalette } from "./playerBreathPalette";

export interface PlayerVector2D {
  x: number;
  y: number;
  scale?(s: number, sy?: number): PlayerVector2D;
  scale?(p: unknown): PlayerVector2D;
  add?(v: PlayerVector2D): PlayerVector2D;
  sub?(v: PlayerVector2D): PlayerVector2D;
  len?(): number;
  unit?(): PlayerVector2D;
  dist?(v: PlayerVector2D): number;
}

export interface StrictPlayerVector2D extends PlayerVector2D {
  scale(s: number, sy?: number): StrictPlayerVector2D;
  scale(p: unknown): StrictPlayerVector2D;
  add(v: StrictPlayerVector2D | PlayerVector2D): StrictPlayerVector2D;
  sub(v: StrictPlayerVector2D | PlayerVector2D): StrictPlayerVector2D;
  len(): number;
  unit(): StrictPlayerVector2D;
  dist(v: StrictPlayerVector2D | PlayerVector2D): number;
}

export interface PlayerGameObject {
  pos: StrictPlayerVector2D;
  angle: number;
  scale?: PlayerVector2D | { x: number; y: number };
  flipX?: boolean;
  color?: unknown;
  opacity?: number;
  z?: number;
  move: (x: number, y: number) => void;
  play?: (anim: string) => void;
  onUpdate: (cb: () => void) => void;
  onDestroy?: (cb: () => void) => void;
  exists?: () => boolean;
  is?: (tag: string) => boolean;
  comps?: unknown[];
  _triggerUpdate?: () => void;
  _destroyed?: boolean;
  [key: string]: unknown;
}

export interface PlayerController<TGameObj = PlayerGameObject, TVector2 = StrictPlayerVector2D> {
  gameObj: TGameObj;
  getSpeed: () => TVector2;
  setSpeed: (newSpeed: TVector2) => void;
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
  getSliceTransforms?: () => WhaleSliceData[];
  getSpineCurvature?: () => number;
  getPitchFlexion?: () => number;

  // Fase 42: Nadadeiras Peitorais Independentes e Hidrodinâmica de Diedro
  getPectoralFinTransforms?: () => DualPectoralFinsData | null;

  // Fase 43: Articulação Multissegmentar de Cauda e Flukes (Multi-Part Puppet Rig)
  getPuppetRigTransforms?: () => PuppetRigTransforms | null;

  // Fase 44: Spritesheet Expandido de 16 Quadros e Interpolação Harmônica
  getAnimationState?: () => WhaleAnimationState | string;

  // Fase 51: Pipeline Unificada de Renderização e Paleta de Fôlego
  getRenderPipelineSnapshot?: () => WhaleRenderPipelineSnapshot | null;
  getBreathPalette?: () => WhaleColorPalette | null;
}

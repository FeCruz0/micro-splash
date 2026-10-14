import type { GameObj } from "kaboom";

export interface CanyonConfig {
  surfaceY: number;
  deepFloorY: number;
  shallowRockTopY: number;
  seabedThickness: number;
  boqueiraoStartX: number;
  rampUpEndX: number;
  plateauEndX: number;
  boqueiraoEndX: number;
  lighthouseX: number;
}

export interface AnemoneItem {
  obj: GameObj;
  baseAngle: number;
  phase: number;
}

export interface CanyonFoamParticle {
  obj: GameObj;
  baseX: number;
  speed: number;
  phase: number;
}

export interface CanyonGeometryResult {
  plateauObj: GameObj;
  rampUpShape: GameObj;
  rampDownShape: GameObj;
  cliffObj: GameObj;
  lighthouseBeam: GameObj;
  lanternGlow: GameObj;
  reflectionSegments: GameObj[];
  foamParticles: CanyonFoamParticle[];
  setRevealTimer: (duration: number) => void;
  getRevealTimer: () => number;
}

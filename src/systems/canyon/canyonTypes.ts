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
  obj: any;
  baseAngle: number;
  phase: number;
}

export interface CanyonFoamParticle {
  obj: any;
  baseX: number;
  speed: number;
  phase: number;
}

export interface CanyonGeometryResult {
  plateauObj: any;
  rampUpShape: any;
  rampDownShape: any;
  cliffObj: any;
  lighthouseBeam: any;
  lanternGlow: any;
  reflectionSegments: any[];
  foamParticles: CanyonFoamParticle[];
  setRevealTimer: (duration: number) => void;
  getRevealTimer: () => number;
}

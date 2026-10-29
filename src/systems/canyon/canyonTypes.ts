export interface CanyonVector2D {
  x: number;
  y: number;
}

export interface CanyonOutline<TColor = unknown> {
  color: TColor;
  width: number;
}

export interface CanyonGameObject<TColor = unknown> {
  pos: CanyonVector2D;
  opacity?: number;
  angle?: number;
  outline?: CanyonOutline<TColor>;
  hidden?: boolean;
}

export interface CanyonOutlinedGameObject<TColor = unknown> {
  pos: CanyonVector2D;
  opacity?: number;
  angle?: number;
  outline: CanyonOutline<TColor>;
  hidden?: boolean;
}

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

export interface AnemoneItem<TColor = unknown> {
  obj: CanyonGameObject<TColor>;
  baseAngle: number;
  phase: number;
}

export interface CanyonFoamParticle<TColor = unknown> {
  obj: CanyonGameObject<TColor>;
  baseX: number;
  speed: number;
  phase: number;
}

export interface CanyonGeometryResult<TColor = unknown> {
  plateauObj: CanyonOutlinedGameObject<TColor>;
  rampUpShape: CanyonOutlinedGameObject<TColor>;
  rampDownShape: CanyonOutlinedGameObject<TColor>;
  cliffObj: CanyonOutlinedGameObject<TColor>;
  lighthouseBeam: CanyonGameObject<TColor>;
  lanternGlow: CanyonGameObject<TColor>;
  reflectionSegments: CanyonGameObject<TColor>[];
  foamParticles: CanyonFoamParticle<TColor>[];
  setRevealTimer: (duration: number) => void;
  getRevealTimer: () => number;
}

export interface CanyonEngineContext<
  TColor = unknown,
  TVec extends { x: number; y: number } = CanyonVector2D,
> {
  add: (components: unknown[]) => unknown;
  height: () => number;
  dt: () => number;
  polygon: (pts: TVec[]) => unknown;
  vec2: (x: number, y: number) => TVec;
  pos: (x: number, y: number) => unknown;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  rotate: (a: number) => unknown;
  anchor: (a: "center" | "bot") => unknown;
  area: () => unknown;
  body: (opt?: { isStatic?: boolean }) => unknown;
  z: (v: number) => unknown;
  rgb: (r: number, g: number, b: number) => TColor;
  onUpdate: (cb: () => void) => void;
  camPos?: () => TVec;
}

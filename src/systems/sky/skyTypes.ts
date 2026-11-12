/**
 * Tipos e interfaces compartilhadas para o sistema de ceu e atmosfera.
 */

export interface SkyRenderObject {
  pos: { x: number; y: number };
  opacity: number;
  color?: unknown;
  angle?: number;
  comps: unknown[];
  hasTag(tag: string): boolean;
  exists(): boolean;
  destroy(): void;
}

export interface CloudData {
  obj: SkyRenderObject;
  baseX: number;
  baseY: number;
  speed: number;
  parallaxFactor: number;
  width: number;
}

export type BirdSpecies = "albatross" | "frigatebird" | "egret";

export interface BirdData {
  body: SkyRenderObject;
  wingLeft: SkyRenderObject;
  wingRight: SkyRenderObject;
  extra?: SkyRenderObject;
  worldX: number;
  worldY: number;
  speedX: number;
  flightType: BirdSpecies;
  animOffset: number;
}

export interface StarData {
  obj: SkyRenderObject;
  baseX: number;
  baseY: number;
  blinkPhase: number;
}

export interface ParallaxSkySystem {
  clouds: CloudData[];
  stars: StarData[];
  birds: BirdData[];
  moon: {
    disk: SkyRenderObject;
    halo: SkyRenderObject;
    reflections: SkyRenderObject[];
  };
  sunsetBands: SkyRenderObject[];
  destroy: () => void;
}

export interface LegacyParallaxSkyEngineContext {
  width?(): number;
  height?(): number;
  dt(): number;
  camPos?(): { readonly x: number; readonly y: number };
  add(components: unknown[]): unknown;
  circle(radius: number): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  polygon(points: readonly { x: number; y: number }[]): unknown;
  pos(x: number, y: number): unknown;
  color(r: number, g: number, b: number): unknown;
  opacity(alpha: number): unknown;
  z(layer: number): unknown;
  onUpdate(callback: () => void): (() => void) | { cancel: () => void };
}

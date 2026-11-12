import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeRectNode,
  type NativeVisualObjectAdapter,
} from "../../engine/adapters/NativeRenderNodeFactory";
import type { PlayerVector2D, StrictPlayerVector2D } from "./types";

export interface PlayerParticleGameObject {
  pos: StrictPlayerVector2D | PlayerVector2D;
  radius?: number;
  opacity?: number;
  scale?: StrictPlayerVector2D | { x: number; y: number };
  onUpdate: (callback: () => void) => void;
  [key: string]: unknown;
}

export interface PlayerParticlesEngineContext {
  vec2?(coordinateX: number, coordinateY: number): StrictPlayerVector2D;
  rgb?(redChannel: number, greenChannel: number, blueChannel: number): unknown;
  deg2rad?(degrees: number): number;
  dt?(): number;
}

export type NativeEntityParticleContext = IRenderEngine | PlayerParticlesEngineContext;

export interface ManagedParticleOptions {
  identifier: string;
  shape: "circle" | "rect";
  radius?: number;
  width?: number;
  height?: number;
  position: PlayerVector2D;
  rgb: readonly [number, number, number];
  opacity: number;
  zIndex: number;
  scaleX?: number;
  scaleY?: number;
  anchorCenter?: boolean;
  tags?: readonly string[];
  onFrame: (
    particle: PlayerParticleGameObject,
    deltaTimeInSeconds: number,
    destroySelf: () => void
  ) => void;
}

export function spawnNativeManagedParticleNode(
  optimizedEntityRenderingContext: NativeEntityParticleContext,
  options: ManagedParticleOptions
): void {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(
    optimizedEntityRenderingContext
  );
  if (!resolvedNativeRenderEngine) {
    return;
  }

  const worldRenderContainer = resolveWorldRenderContainer(resolvedNativeRenderEngine);
  const nativeParticleAdapter: NativeVisualObjectAdapter =
    options.shape === "rect"
      ? createNativeRectNode(
          optimizedEntityRenderingContext,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: options.identifier,
            width: options.width ?? 8,
            height: options.height ?? 2,
            positionX: options.position.x,
            positionY: options.position.y,
            fillColor: options.rgb,
            opacity: options.opacity,
            scaleX: options.scaleX,
            scaleY: options.scaleY,
            anchor: options.anchorCenter ? "center" : "topleft",
            zIndex: options.zIndex,
            tags: options.tags,
          }
        )
      : createNativeCircleNode(
          optimizedEntityRenderingContext,
          resolvedNativeRenderEngine,
          worldRenderContainer,
          {
            identifier: options.identifier,
            radius: options.radius ?? 2,
            positionX: options.position.x,
            positionY: options.position.y,
            fillColor: options.rgb,
            opacity: options.opacity,
            scaleX: options.scaleX,
            scaleY: options.scaleY,
            anchor: options.anchorCenter ? "center" : "topleft",
            zIndex: options.zIndex,
            tags: options.tags,
          }
        );

  const particleProxy = nativeParticleAdapter as unknown as PlayerParticleGameObject;
  nativeParticleAdapter.onUpdate((deltaTimeInSeconds: number) => {
    options.onFrame(particleProxy, deltaTimeInSeconds, () => nativeParticleAdapter.destroy());
  });
}

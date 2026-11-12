/**
 * Sistema de Cáusticos Solares e Brilho Ventral do Jogador — Micro Splash
 *
 * Simula reflexos cáusticos de luz solar no dorso da baleia em águas rasas
 * e brilho ventral em perspectiva durante manobras de roll.
 * Desacoplado do Kaboom.js com tipagem estrita e pipeline nativo PixiJS v8.
 */

import { GAME_CONFIG } from "../../config";
import type { WhaleSliceData } from "./playerSliceRenderer";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  createNativeRectNode,
  type NativeVisualObjectAdapter,
} from "../../engine/adapters/NativeRenderNodeFactory";

export interface CausticVisualObject {
  pos?: {
    x: number;
    y: number;
    add?(...args: unknown[]): unknown;
    [key: string]: unknown;
  };
  angle?: number;
  opacity?: number;
  color?: unknown;
  scale?: { x: number; y: number };
  destroy?: () => void;
  [key: string]: unknown;
}

export interface PlayerCausticsContext<TObj = CausticVisualObject> {
  add?(components?: unknown): TObj;
  deg2rad?(degrees: number): number;
  time?(): number;
  dt?(): number;
  onSceneLeave?(callback: () => void): unknown;
}

export interface PlayerCausticsTargetWhale {
  pos: {
    x: number;
    y: number;
    add?(...args: unknown[]): unknown;
  };
  angle: number;
  scale?: { x: number; y: number };
}

export interface PlayerCausticsUpdateOptions {
  dt: number;
  baleia: PlayerCausticsTargetWhale;
  isFacingRight: boolean;
  currentRoll: number;
  pitchFlexion: number;
  isFainting: boolean;
  isFrozen: boolean;
  slices: WhaleSliceData[];
}

export interface PlayerCausticsSystem<TObj = CausticVisualObject> {
  whaleCaustics: TObj & CausticVisualObject;
  whaleVentralFlash: TObj & CausticVisualObject;
  update: (options: PlayerCausticsUpdateOptions) => void;
  getCausticOpacity: () => number;
  getVentralOpacity: () => number;
  destroy: () => void;
}

function createHeadlessCausticStub(
  initialPositionX: number,
  initialPositionY: number,
  initialColor: readonly [number, number, number]
): CausticVisualObject {
  return {
    pos: { x: initialPositionX, y: initialPositionY },
    angle: 0,
    opacity: 0,
    color: [...initialColor],
    scale: { x: 1, y: 1 },
    destroy: () => {},
  };
}

export function setupPlayerCaustics<TObj = CausticVisualObject>(
  optimizedEntityRenderingContext: IRenderEngine | PlayerCausticsContext<TObj>,
  initialPositionX: number,
  initialPositionY: number = 200
): PlayerCausticsSystem<TObj> {
  const lifecycleContext = optimizedEntityRenderingContext as PlayerCausticsContext<TObj>;
  const convertDegreesToRadians =
    typeof lifecycleContext.deg2rad === "function"
      ? lifecycleContext.deg2rad
      : (degrees: number): number => (degrees * Math.PI) / 180;

  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(
    optimizedEntityRenderingContext
  );
  let nativeCausticsAdapter: NativeVisualObjectAdapter | null = null;
  let nativeVentralAdapter: NativeVisualObjectAdapter | null = null;

  if (resolvedNativeRenderEngine) {
    const worldRenderContainer = resolveWorldRenderContainer(resolvedNativeRenderEngine);
    nativeCausticsAdapter = createNativeRectNode(
      optimizedEntityRenderingContext,
      resolvedNativeRenderEngine,
      worldRenderContainer,
      {
        identifier: "player_dorsal_caustics",
        width: 48,
        height: 10,
        cornerRadius: 5,
        positionX: initialPositionX,
        positionY: initialPositionY,
        fillColor: [180, 240, 255],
        opacity: 0,
        anchor: "center",
        zIndex: 1,
      }
    );
    nativeVentralAdapter = createNativeRectNode(
      optimizedEntityRenderingContext,
      resolvedNativeRenderEngine,
      worldRenderContainer,
      {
        identifier: "player_ventral_flash",
        width: 44,
        height: 7,
        cornerRadius: 3.5,
        positionX: initialPositionX,
        positionY: initialPositionY,
        fillColor: [240, 248, 255],
        opacity: 0,
        anchor: "center",
        zIndex: 1,
      }
    );

    if (typeof lifecycleContext.onSceneLeave === "function") {
      lifecycleContext.onSceneLeave(() => {
        nativeCausticsAdapter?.destroy();
        nativeVentralAdapter?.destroy();
      });
    }
  }

  const causticsProxy: CausticVisualObject = nativeCausticsAdapter
    ? (nativeCausticsAdapter as unknown as CausticVisualObject)
    : createHeadlessCausticStub(initialPositionX, initialPositionY, [180, 240, 255]);
  const ventralProxy: CausticVisualObject = nativeVentralAdapter
    ? (nativeVentralAdapter as unknown as CausticVisualObject)
    : createHeadlessCausticStub(initialPositionX, initialPositionY, [240, 248, 255]);

  let elapsedCausticsSeconds = 0;

  const update = ({
    dt: frameDeltaSeconds,
    baleia,
    currentRoll,
    pitchFlexion,
    isFainting,
    isFrozen,
    slices,
  }: PlayerCausticsUpdateOptions): void => {
    const stepDeltaSeconds =
      typeof lifecycleContext.dt === "function" ? lifecycleContext.dt() : frameDeltaSeconds;
    elapsedCausticsSeconds += stepDeltaSeconds;

    const inAirNow = baleia.pos.y < GAME_CONFIG.SEA_LEVEL;
    const angleInRadians = convertDegreesToRadians(baleia.angle);
    const upNormalX = Math.sin(angleInRadians);
    const upNormalY = -Math.cos(angleInRadians);
    const downNormalX = -upNormalX;
    const downNormalY = -upNormalY;

    // Cáusticos Solares no Dorso (Fase 17.3)
    if (!inAirNow && !isFainting && !isFrozen) {
      const depthBelowSurface = baleia.pos.y - GAME_CONFIG.SEA_LEVEL;
      if (depthBelowSurface < 100) {
        const depthFactor = Math.max(0, 1 - depthBelowSurface / 100);
        const timeNow =
          typeof lifecycleContext.time === "function"
            ? lifecycleContext.time()
            : elapsedCausticsSeconds;
        const shimmer =
          (Math.sin(timeNow * 4.5 + baleia.pos.x * 0.03) * 0.5 +
            Math.cos(timeNow * 3.2 + baleia.pos.x * 0.05) * 0.5 +
            1) *
          0.5;
        causticsProxy.opacity = depthFactor * (0.1 + shimmer * 0.25);
        const sunGlint = Math.sin(timeNow * 2.5) * 20;
        causticsProxy.color = [180 + sunGlint, 240, 255];
      } else {
        causticsProxy.opacity = 0;
      }
    } else {
      causticsProxy.opacity = 0;
    }

    // Brilho Ventral de Roll em Perspectiva (Fase 17.2)
    if (!isFainting && !isFrozen) {
      const ventralExposure = Math.max(0, currentRoll);
      ventralProxy.opacity = ventralExposure * 0.42;
    } else {
      ventralProxy.opacity = 0;
    }

    // Alinhamento geométrico com o tórax flexionado da baleia (Fase 41)
    const thoraxSlice = slices[1];
    const thoraxOffsetX = thoraxSlice ? thoraxSlice.localOffset.x * 0.15 : 0;
    const thoraxOffsetY = thoraxSlice ? thoraxSlice.localOffset.y : 0;
    const thoraxAngle = thoraxSlice ? thoraxSlice.relativeAngleInDegrees * 0.35 : 0;

    if (causticsProxy.pos) {
      causticsProxy.pos.x = baleia.pos.x + upNormalX * 7 + thoraxOffsetX;
      causticsProxy.pos.y = baleia.pos.y + upNormalY * 7 + thoraxOffsetY;
      causticsProxy.angle = baleia.angle + thoraxAngle;
      if (causticsProxy.scale && baleia.scale) {
        causticsProxy.scale.x = baleia.scale.x;
        causticsProxy.scale.y = baleia.scale.y;
      }
    }

    if (ventralProxy.pos) {
      const ventralScaleFactor = 6 + Math.abs(pitchFlexion) * 2;
      ventralProxy.pos.x = baleia.pos.x + downNormalX * ventralScaleFactor + thoraxOffsetX;
      ventralProxy.pos.y = baleia.pos.y + downNormalY * ventralScaleFactor + thoraxOffsetY;
      ventralProxy.angle = baleia.angle + thoraxAngle;
      if (ventralProxy.scale && baleia.scale) {
        ventralProxy.scale.x = baleia.scale.x;
        ventralProxy.scale.y = baleia.scale.y;
      }
    }
  };

  const destroy = (): void => {
    nativeCausticsAdapter?.destroy();
    nativeVentralAdapter?.destroy();
  };

  return {
    whaleCaustics: causticsProxy as TObj & CausticVisualObject,
    whaleVentralFlash: ventralProxy as TObj & CausticVisualObject,
    update,
    getCausticOpacity: (): number => causticsProxy.opacity ?? 0,
    getVentralOpacity: (): number => ventralProxy.opacity ?? 0,
    destroy,
  };
}

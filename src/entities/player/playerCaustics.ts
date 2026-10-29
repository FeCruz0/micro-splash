/**
 * Sistema de Cáusticos Solares e Brilho Ventral do Jogador — Micro Splash
 *
 * Simula reflexos cáusticos de luz solar no dorso da baleia em águas rasas
 * e brilho ventral em perspectiva durante manobras de roll.
 * Desacoplado do Kaboom.js com tipagem estrita e zero any.
 */

import { GAME_CONFIG } from "../../config";
import type { WhaleSliceData } from "./playerSliceRenderer";

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
  [key: string]: unknown;
}

export interface PlayerCausticsContext<TObj = CausticVisualObject> {
  add(components?: unknown): TObj;
  rect?(width: number, height: number, options?: unknown): unknown;
  pos?(x: number, y: number): unknown;
  rotate?(angle: number): unknown;
  color?(red: number, green: number, blue: number): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  z?(layerIndex: number): unknown;
  scale?(x: number, y: number): unknown;
  deg2rad?(degrees: number): number;
  vec2?(x: number, y: number): unknown;
  time?(): number;
  rgb?(red: number, green: number, blue: number): unknown;
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
}

interface InternalVector2D {
  x: number;
  y: number;
  add?(other: { x: number; y: number }): InternalVector2D;
  scale?(factor: number): InternalVector2D;
}

export function setupPlayerCaustics<TObj = CausticVisualObject>(
  engineContext: PlayerCausticsContext<TObj>,
  initialX: number,
  initialY: number = 200
): PlayerCausticsSystem<TObj> {
  const createVec2 = (x: number, y: number): InternalVector2D => {
    if (typeof engineContext.vec2 === "function") {
      return engineContext.vec2(x, y) as InternalVector2D;
    }
    return {
      x,
      y,
      add(other: { x: number; y: number }): InternalVector2D {
        return createVec2(x + other.x, y + other.y);
      },
      scale(factor: number): InternalVector2D {
        return createVec2(x * factor, y * factor);
      },
    };
  };

  const addVec2 = (
    baseVector: InternalVector2D,
    offsetVector: { x: number; y: number }
  ): InternalVector2D => {
    if (typeof baseVector.add === "function") {
      return baseVector.add(offsetVector);
    }
    return createVec2(baseVector.x + offsetVector.x, baseVector.y + offsetVector.y);
  };

  const scaleVec2 = (baseVector: InternalVector2D, factor: number): InternalVector2D => {
    if (typeof baseVector.scale === "function") {
      return baseVector.scale(factor);
    }
    return createVec2(baseVector.x * factor, baseVector.y * factor);
  };

  const deg2rad =
    typeof engineContext.deg2rad === "function"
      ? engineContext.deg2rad
      : (degrees: number): number => (degrees * Math.PI) / 180;

  const rectComp =
    typeof engineContext.rect === "function" ? engineContext.rect(48, 10, { radius: 5 }) : {};
  const posComp =
    typeof engineContext.pos === "function"
      ? engineContext.pos(initialX, initialY)
      : { x: initialX, y: initialY };
  const rotateComp =
    typeof engineContext.rotate === "function" ? engineContext.rotate(0) : { angle: 0 };
  const colorComp =
    typeof engineContext.color === "function"
      ? engineContext.color(180, 240, 255)
      : { r: 180, g: 240, b: 255 };
  const opacityComp =
    typeof engineContext.opacity === "function" ? engineContext.opacity(0) : { opacity: 0 };
  const anchorComp =
    typeof engineContext.anchor === "function"
      ? engineContext.anchor("center")
      : { anchor: "center" };
  const zComp = typeof engineContext.z === "function" ? engineContext.z(1) : { z: 1 };
  const scaleComp =
    typeof engineContext.scale === "function" ? engineContext.scale(1, 1) : { x: 1, y: 1 };

  const whaleCaustics = engineContext.add([
    rectComp,
    posComp,
    rotateComp,
    colorComp,
    opacityComp,
    anchorComp,
    zComp,
    scaleComp,
  ]);

  const ventralRectComp =
    typeof engineContext.rect === "function" ? engineContext.rect(44, 7, { radius: 3.5 }) : {};
  const ventralColorComp =
    typeof engineContext.color === "function"
      ? engineContext.color(240, 248, 255)
      : { r: 240, g: 248, b: 255 };

  const whaleVentralFlash = engineContext.add([
    ventralRectComp,
    posComp,
    rotateComp,
    ventralColorComp,
    opacityComp,
    anchorComp,
    zComp,
    scaleComp,
  ]);

  const causticsProxy = whaleCaustics as unknown as CausticVisualObject;
  const ventralProxy = whaleVentralFlash as unknown as CausticVisualObject;

  const update = ({
    baleia,
    currentRoll,
    pitchFlexion,
    isFainting,
    isFrozen,
    slices,
  }: PlayerCausticsUpdateOptions): void => {
    const inAirNow = baleia.pos.y < GAME_CONFIG.SEA_LEVEL;
    const angleInRadians = deg2rad(baleia.angle);
    const upNormal: InternalVector2D = createVec2(
      Math.sin(angleInRadians),
      -Math.cos(angleInRadians)
    );
    const downNormal: InternalVector2D = createVec2(
      -Math.sin(angleInRadians),
      Math.cos(angleInRadians)
    );

    // Cáusticos Solares no Dorso (Fase 17.3)
    if (!inAirNow && !isFainting && !isFrozen) {
      const depthBelowSurface = baleia.pos.y - GAME_CONFIG.SEA_LEVEL;
      if (depthBelowSurface < 100) {
        const depthFactor = Math.max(0, 1 - depthBelowSurface / 100);
        const timeNow = typeof engineContext.time === "function" ? engineContext.time() : 0;
        const shimmer =
          (Math.sin(timeNow * 4.5 + baleia.pos.x * 0.03) * 0.5 +
            Math.cos(timeNow * 3.2 + baleia.pos.x * 0.05) * 0.5 +
            1) *
          0.5;
        causticsProxy.opacity = depthFactor * (0.1 + shimmer * 0.25);
        if (typeof engineContext.rgb === "function") {
          const sunGlint = Math.sin(timeNow * 2.5) * 20;
          causticsProxy.color = engineContext.rgb(180 + sunGlint, 240, 255);
        }
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
    const thoraxOffset = thoraxSlice
      ? createVec2(thoraxSlice.localOffset.x * 0.15, thoraxSlice.localOffset.y)
      : createVec2(0, 0);
    const thoraxAngle = thoraxSlice ? thoraxSlice.relativeAngleInDegrees * 0.35 : 0;

    if (causticsProxy && causticsProxy.pos) {
      const causticsOffset = addVec2(scaleVec2(upNormal, 7), thoraxOffset);
      if (typeof baleia.pos.add === "function") {
        causticsProxy.pos = (baleia.pos.add(causticsOffset) as {
          x: number;
          y: number;
        }) ?? {
          x: baleia.pos.x + causticsOffset.x,
          y: baleia.pos.y + causticsOffset.y,
        };
      } else {
        causticsProxy.pos = {
          x: baleia.pos.x + causticsOffset.x,
          y: baleia.pos.y + causticsOffset.y,
        };
      }
      causticsProxy.angle = baleia.angle + thoraxAngle;
      if (causticsProxy.scale && baleia.scale) {
        causticsProxy.scale.x = baleia.scale.x;
        causticsProxy.scale.y = baleia.scale.y;
      }
    }

    if (ventralProxy && ventralProxy.pos) {
      const ventralOffset = addVec2(
        scaleVec2(downNormal, 6 + Math.abs(pitchFlexion) * 2),
        thoraxOffset
      );
      if (typeof baleia.pos.add === "function") {
        ventralProxy.pos = (baleia.pos.add(ventralOffset) as {
          x: number;
          y: number;
        }) ?? {
          x: baleia.pos.x + ventralOffset.x,
          y: baleia.pos.y + ventralOffset.y,
        };
      } else {
        ventralProxy.pos = {
          x: baleia.pos.x + ventralOffset.x,
          y: baleia.pos.y + ventralOffset.y,
        };
      }
      ventralProxy.angle = baleia.angle + thoraxAngle;
      if (ventralProxy.scale && baleia.scale) {
        ventralProxy.scale.x = baleia.scale.x;
        ventralProxy.scale.y = baleia.scale.y;
      }
    }
  };

  return {
    whaleCaustics: whaleCaustics as TObj & CausticVisualObject,
    whaleVentralFlash: whaleVentralFlash as TObj & CausticVisualObject,
    update,
    getCausticOpacity: (): number => causticsProxy.opacity ?? 0,
    getVentralOpacity: (): number => ventralProxy.opacity ?? 0,
  };
}

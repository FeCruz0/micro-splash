import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { GAME_CONFIG } from "../../config";
import type { WhaleSliceData } from "./playerSliceRenderer";

export interface PlayerCausticsSystem {
  whaleCaustics: GameObj;
  whaleVentralFlash: GameObj;
  update: (options: {
    dt: number;
    baleia: GameObj;
    isFacingRight: boolean;
    currentRoll: number;
    pitchFlexion: number;
    isFainting: boolean;
    isFrozen: boolean;
    slices: WhaleSliceData[];
  }) => void;
  getCausticOpacity: () => number;
  getVentralOpacity: () => number;
}

export function setupPlayerCaustics(
  k: KaboomCtx,
  initialX: number,
  initialY: number = 200
): PlayerCausticsSystem {
  const whaleCaustics = k.add([
    typeof k.rect === "function" ? k.rect(48, 10, { radius: 5 }) : {},
    k.pos(initialX, initialY),
    k.rotate(0),
    k.color(180, 240, 255),
    typeof k.opacity === "function" ? k.opacity(0) : { opacity: 0 },
    k.anchor("center"),
    typeof k.z === "function" ? k.z(1) : { z: 1 },
    ...(typeof k.scale === "function" ? [k.scale(1, 1)] : []),
  ]);

  const whaleVentralFlash = k.add([
    typeof k.rect === "function" ? k.rect(44, 7, { radius: 3.5 }) : {},
    k.pos(initialX, initialY),
    k.rotate(0),
    k.color(240, 248, 255),
    typeof k.opacity === "function" ? k.opacity(0) : { opacity: 0 },
    k.anchor("center"),
    typeof k.z === "function" ? k.z(1) : { z: 1 },
    ...(typeof k.scale === "function" ? [k.scale(1, 1)] : []),
  ]);

  const update = ({
    baleia,
    currentRoll,
    pitchFlexion,
    isFainting,
    isFrozen,
    slices,
  }: {
    dt: number;
    baleia: GameObj;
    isFacingRight: boolean;
    currentRoll: number;
    pitchFlexion: number;
    isFainting: boolean;
    isFrozen: boolean;
    slices: WhaleSliceData[];
  }) => {
    const inAirNow = baleia.pos.y < GAME_CONFIG.SEA_LEVEL;
    const rad = k.deg2rad(baleia.angle);
    const upNormal: Vec2 = k.vec2(Math.sin(rad), -Math.cos(rad));
    const downNormal: Vec2 = k.vec2(-Math.sin(rad), Math.cos(rad));

    // Cáusticos Solares no Dorso (Fase 17.3)
    if (!inAirNow && !isFainting && !isFrozen) {
      const depthBelowSurface = baleia.pos.y - GAME_CONFIG.SEA_LEVEL;
      if (depthBelowSurface < 100) {
        const depthFactor = Math.max(0, 1 - depthBelowSurface / 100);
        const tNow = typeof k.time === "function" ? k.time() : 0;
        const shimmer =
          (Math.sin(tNow * 4.5 + baleia.pos.x * 0.03) * 0.5 +
            Math.cos(tNow * 3.2 + baleia.pos.x * 0.05) * 0.5 +
            1) *
          0.5;
        whaleCaustics.opacity = depthFactor * (0.1 + shimmer * 0.25);
        if (typeof k.rgb === "function") {
          const sunGlint = Math.sin(tNow * 2.5) * 20;
          whaleCaustics.color = k.rgb(180 + sunGlint, 240, 255);
        }
      } else {
        whaleCaustics.opacity = 0;
      }
    } else {
      whaleCaustics.opacity = 0;
    }

    // Brilho Ventral de Roll em Perspectiva (Fase 17.2)
    if (!isFainting && !isFrozen) {
      const ventralExposure = Math.max(0, currentRoll);
      whaleVentralFlash.opacity = ventralExposure * 0.42;
    } else {
      whaleVentralFlash.opacity = 0;
    }

    // Alinhamento geométrico com o tórax flexionado da baleia (Fase 41)
    const thoraxSlice = slices[1];
    const thoraxOffset = thoraxSlice
      ? k.vec2(thoraxSlice.localOffset.x * 0.15, thoraxSlice.localOffset.y)
      : k.vec2(0, 0);
    const thoraxAngle = thoraxSlice ? thoraxSlice.relativeAngleInDegrees * 0.35 : 0;

    if (whaleCaustics && whaleCaustics.pos && typeof whaleCaustics.pos.add === "function") {
      const causticsOffset = upNormal.scale(7).add(thoraxOffset);
      whaleCaustics.pos = baleia.pos.add(causticsOffset);
      whaleCaustics.angle = baleia.angle + thoraxAngle;
      if (whaleCaustics.scale && baleia.scale) {
        whaleCaustics.scale.x = baleia.scale.x;
        whaleCaustics.scale.y = baleia.scale.y;
      }
    }

    if (
      whaleVentralFlash &&
      whaleVentralFlash.pos &&
      typeof whaleVentralFlash.pos.add === "function"
    ) {
      const ventralOffset = downNormal.scale(6 + Math.abs(pitchFlexion) * 2).add(thoraxOffset);
      whaleVentralFlash.pos = baleia.pos.add(ventralOffset);
      whaleVentralFlash.angle = baleia.angle + thoraxAngle;
      if (whaleVentralFlash.scale && baleia.scale) {
        whaleVentralFlash.scale.x = baleia.scale.x;
        whaleVentralFlash.scale.y = baleia.scale.y;
      }
    }
  };

  return {
    whaleCaustics,
    whaleVentralFlash,
    update,
    getCausticOpacity: () => whaleCaustics.opacity ?? 0,
    getVentralOpacity: () => whaleVentralFlash.opacity ?? 0,
  };
}

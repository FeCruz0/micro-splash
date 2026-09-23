import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getCurrentBiome } from "./oceanEnvironment";

export interface ShadowMetrics {
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  isCastOnWaterSurface: boolean;
}

/**
 * Função pura para cálculo da projeção da sombra da jubarte.
 * - Quando fora d'água (salto/breach): projeta sombra exclusivamente na superfície da água (SEA_LEVEL),
 *   sem qualquer mancha ou sombra flutuando no ar ao lado da baleia.
 * - Em meia-água: opacidade zero para evitar a sensação de "mancha que segue a baleia".
 * - Perto do leito marinho: projeta suavemente no chão oceânico.
 */
export function calculateShadowMetrics(
  playerXPosition: number,
  playerYPosition: number,
  playerAngleInDegrees: number,
  seaLevel: number = GAME_CONFIG.SEA_LEVEL,
  _maxShadowDepth: number = 130,
  screenHeight: number = 360
): ShadowMetrics {
  const baseWidth = 96;

  // 1. Cenário: Baleia saltando fora d'água (Breach / Salto Majestoso acima de SEA_LEVEL)
  if (playerYPosition < seaLevel) {
    const heightAboveWater = seaLevel - playerYPosition;
    // Atenuação suave por altitude no ar
    const altitudeFactor = Math.max(0.35, 1 - heightAboveWater / 220);

    return {
      positionX: playerXPosition,
      positionY: seaLevel + 3, // Fixada estritamente na lâmina d'água da superfície
      width: baseWidth * (0.8 + altitudeFactor * 0.25),
      height: Math.max(4, 7 * altitudeFactor), // Lâmina fina horizontal na água, sem mancha ao lado da baleia
      angle: 0, // Alinhamento horizontal na linha do mar
      opacity: 0.32 * altitudeFactor,
      isCastOnWaterSurface: true,
    };
  }

  // 2. Cenário: Baleia submersa no mar
  // Evita a 'mancha que segue a baleia' na coluna de água.
  // Apenas projeta sombra se estiver próxima ao leito bentônico do fundo.
  const oceanFloorY = screenHeight - 44;
  const distanceToFloor = oceanFloorY - playerYPosition;

  if (distanceToFloor <= 75 && distanceToFloor > 0) {
    const floorProximity = 1 - distanceToFloor / 75;
    return {
      positionX: playerXPosition,
      positionY: oceanFloorY,
      width: baseWidth * (0.85 + floorProximity * 0.25),
      height: 12 * floorProximity,
      angle: playerAngleInDegrees * 0.4,
      opacity: 0.24 * floorProximity,
      isCastOnWaterSurface: false,
    };
  }

  // Em meia-água: sem mancha artificial acompanhando o corpo da baleia
  return {
    positionX: playerXPosition,
    positionY: playerYPosition,
    width: baseWidth,
    height: 16,
    angle: 0,
    opacity: 0,
    isCastOnWaterSurface: false,
  };
}

/**
 * Inicializa o sistema de Sombras Dinâmicas da Jubarte.
 */
export function setupDynamicShadowSystem(
  k: KaboomCtx,
  playerController: PlayerController
): {
  destroy: () => void;
  getShadowObject: () => GameObj;
} {
  // Camada 1: Penumbra externa difusa (halo suave na superfície/fundo)
  const penumbraHalo = k.add([
    k.rect(114, 14, { radius: 7 }),
    k.pos(-9999, -9999),
    k.rotate(0),
    k.scale(1, 1),
    k.anchor("center"),
    k.color(6, 16, 32),
    k.opacity(0),
    k.z(1), // Na linha da água/fundo, atrás da baleia e respingos
    "player_shadow_penumbra",
  ]);

  // Camada 2: Umbra central (núcleo na lâmina d'água)
  const umbraCore = k.add([
    k.rect(82, 8, { radius: 4 }),
    k.pos(-9999, -9999),
    k.rotate(0),
    k.scale(1, 1),
    k.anchor("center"),
    k.color(3, 10, 22),
    k.opacity(0),
    k.z(1),
    "player_dynamic_shadow",
  ]);

  const updateHandler = k.onUpdate(() => {
    const deltaTime = k.dt();
    const baleia = playerController.gameObj;
    if (!baleia || !baleia.pos) return;

    // Se estiver desmaiada ou em blackout, desvanece suavemente
    if (playerController.isFainting()) {
      penumbraHalo.opacity = k.lerp(penumbraHalo.opacity, 0, deltaTime * 4);
      umbraCore.opacity = k.lerp(umbraCore.opacity, 0, deltaTime * 4);
      return;
    }

    const metrics = calculateShadowMetrics(
      baleia.pos.x,
      baleia.pos.y,
      baleia.angle,
      GAME_CONFIG.SEA_LEVEL,
      130,
      k.height()
    );

    // Se a sombra estiver com opacidade 0 (meia-água), oculta imediatamente sem manchas
    if (metrics.opacity <= 0.001) {
      umbraCore.opacity = 0;
      penumbraHalo.opacity = 0;
      return;
    }

    // Harmoniza o tom da sombra com o bioma atual
    const currentBiome = getCurrentBiome(baleia.pos.x);
    const floorColor = currentBiome.floorColor || [10, 24, 38];
    const shadowR = Math.max(2, Math.round(floorColor[0] * 0.45));
    const shadowG = Math.max(6, Math.round(floorColor[1] * 0.45));
    const shadowB = Math.max(16, Math.round(floorColor[2] * 0.45));
    const shadowColor = k.rgb(shadowR, shadowG, shadowB);

    // Quando na superfície d'água durante salto, posiciona imediatamente em Y para não flutuar no ar
    if (metrics.isCastOnWaterSurface) {
      umbraCore.pos.x = metrics.positionX;
      umbraCore.pos.y = metrics.positionY;
      umbraCore.angle = 0;
    } else {
      const lerpFactor = Math.min(1, deltaTime * 12);
      umbraCore.pos.x = k.lerp(umbraCore.pos.x, metrics.positionX, lerpFactor);
      umbraCore.pos.y = k.lerp(umbraCore.pos.y, metrics.positionY, lerpFactor);
      umbraCore.angle = k.lerp(umbraCore.angle, metrics.angle, lerpFactor);
    }

    penumbraHalo.pos.x = umbraCore.pos.x;
    penumbraHalo.pos.y = umbraCore.pos.y;
    penumbraHalo.angle = umbraCore.angle;

    umbraCore.color = shadowColor;
    penumbraHalo.color = shadowColor;

    umbraCore.opacity = metrics.opacity * 0.8;
    penumbraHalo.opacity = metrics.opacity * 0.45;

    if (umbraCore.scale) {
      umbraCore.scale.x = metrics.width / 82;
      umbraCore.scale.y = metrics.height / 8;
    }
    if (penumbraHalo.scale) {
      penumbraHalo.scale.x = (metrics.width * 1.25) / 114;
      penumbraHalo.scale.y = (metrics.height * 1.5) / 14;
    }
  });

  return {
    destroy: () => {
      if (typeof updateHandler?.cancel === "function") {
        updateHandler.cancel();
      }
      if (typeof k.destroy === "function") {
        k.destroy(umbraCore);
        k.destroy(penumbraHalo);
      }
    },
    getShadowObject: () => umbraCore,
  };
}

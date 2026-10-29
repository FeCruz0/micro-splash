/**
 * Sistema da Camada de Gelo e Banquisa Polar (Antártica) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import { type PlayerController, getActivePlayerObject } from "../entities/player";
import { getParticlePool } from "./particlePool";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import { getSpatialCullingManager } from "./spatialCullingSystem";
import { safeShake } from "../utils/camera";
import { getRandomFloat } from "../utils/random";
import type { IRenderEngine, Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine, type LegacyEngineBridge } from "../engine/adapters/LegacyBridge";

/**
 * Representa uma fenda de respiração (polínia natural) na camada de gelo polar.
 */
export interface IceGap {
  /** Início da abertura em metros horizontais */
  start: number;
  /** Término da abertura em metros horizontais */
  end: number;
}

// Fendas de respiração pré-definidas na camada de gelo (0m a 5.000m) - Modelo Imutável
export const DEFAULT_ICE_GAPS: IceGap[] = [
  { start: 60, end: 240 }, // Fenda inicial de respiração e salto no ponto de largada (120m)
  { start: 600, end: 750 },
  { start: 1400, end: 1550 },
  { start: 2200, end: 2350 },
  { start: 3100, end: 3250 },
  { start: 4000, end: 4150 },
  { start: 4700, end: 4850 },
];

export const ICE_GAPS = DEFAULT_ICE_GAPS;

// Fendas ativas da partida em execução (resetadas a cada reinício de partida)
export let activeIceGaps: IceGap[] = [];

/**
 * Checa se uma coordenada X no Oceano Antártico (0 a 5.000m) localiza-se dentro de uma fenda de ar livre.
 *
 * @param x - Posição horizontal no mundo em metros.
 * @returns `true` se o ar estiver livre para respiração (ou fora da Antártica); `false` se houver teto de gelo.
 */
export function isPositionInIceGap(x: number): boolean {
  if (x < 0 || x > 5000) return true; // Fora do gelo antártico, ar sempre livre
  const gapsToCheck = activeIceGaps.length > 0 ? activeIceGaps : DEFAULT_ICE_GAPS;
  return gapsToCheck.some((gap) => x >= gap.start && x <= gap.end);
}

/**
 * Retorna a fenda de gelo antártica mais próxima da coordenada X para respiração de emergência.
 */
export function getNearestIceGap(x: number): IceGap | null {
  const gapsToCheck = activeIceGaps.length > 0 ? activeIceGaps : DEFAULT_ICE_GAPS;
  let nearestGap: IceGap | null = null;
  let minDistance = Infinity;
  for (let i = 0; i < gapsToCheck.length; i++) {
    const gap = gapsToCheck[i];
    const center = (gap.start + gap.end) / 2;
    const distance = Math.abs(center - x);
    if (distance < minDistance) {
      minDistance = distance;
      nearestGap = gap;
    }
  }
  return nearestGap;
}

/**
 * Cria e orquestra a banquisa polar, paredões de icebergs e fendas de respiração na Antártica (0m a 5.000m).
 */
export function setupIceSurfaceSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  playerController?: PlayerController
) {
  let isSystemActive = true;
  activeIceGaps = DEFAULT_ICE_GAPS.map((gap) => ({ ...gap }));

  const iceHeight = 40;
  const icePosY = GAME_CONFIG.SEA_LEVEL - 20;
  const iceCollisionHeight = 24;
  const totalDistance = 5000;
  let currentX = 0;

  type Pool = NonNullable<ReturnType<typeof getParticlePool>>;
  type ParticlePos = Parameters<Pool["spawnRect"]>[0]["pos"];
  type ParticleColor = Parameters<Pool["spawnRect"]>[0]["color"];
  type PlayerSpeed = PlayerController extends { setSpeed: (s: infer S) => void } ? S : unknown;

  const asPos = (x: number, y: number) => ({ x, y }) as unknown as ParticlePos;
  const asColor = (r: number, g: number, b: number) => ({ r, g, b }) as unknown as ParticleColor;
  const asSpeed = (x: number, y: number) => ({ x, y }) as unknown as PlayerSpeed;

  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  if (isRenderEngine(engineOrContext)) {
    const engine = engineOrContext;
    const stageRoot = engine.getStageRoot();
    const screenH = engine.getDimensions().height;

    function spawnIceSegment(x: number, width: number) {
      let isBroken = false;

      const segment = engine.createGraphics("ice_block");
      segment.drawRect(0, 0, width + 0.5, iceHeight, {
        fill: { color: [210, 235, 255], alpha: 0.96 },
      });

      // Bordas superior e inferior translúcidas
      segment.drawRect(0, 0, width, 3, {
        fill: { color: [240, 252, 255], alpha: 0.4 },
      });
      segment.drawRect(0, iceHeight - 3, width, 3, {
        fill: { color: [180, 215, 255], alpha: 0.4 },
      });

      // Faixas internas de estratificação cristalina
      segment.drawRect(0, 5, width, 7, {
        fill: { color: [230, 248, 255], alpha: 0.35 },
      });
      segment.drawRect(0, 16, width, 9, {
        fill: { color: [180, 215, 255], alpha: 0.28 },
      });
      segment.drawRect(0, 28, width, 7, {
        fill: { color: [215, 240, 255], alpha: 0.3 },
      });

      // Veios glaciais diagonais
      const veinCount = 3 + Math.floor((width / 75) % 2);
      for (let v = 0; v < veinCount; v++) {
        const veinRelX = (width / (veinCount + 1)) * (v + 1);
        segment.drawRect(veinRelX, iceHeight * 0.12, 1.5, iceHeight * 0.76, {
          fill: { color: [30, 80, 140], alpha: 0.15 },
        });
      }

      segment.setPosition(x, icePosY);
      segment.setZIndex(10);
      stageRoot.addChild(segment);

      function breakIce() {
        if (isBroken) return;
        isBroken = true;

        const pool = getParticlePool();
        for (let shardIndex = 0; shardIndex < 14; shardIndex++) {
          const shardSize = getRandomFloat(3, 8);
          const shardX = x + getRandomFloat(0, width);
          const shardY = icePosY + getRandomFloat(0, iceHeight);
          const shardVelocity = {
            x: getRandomFloat(-130, 130),
            y: getRandomFloat(-250, -60),
          };

          if (pool) {
            pool.spawnRect({
              pos: asPos(shardX, shardY),
              width: shardSize,
              height: shardSize,
              color: asColor(230, 248, 255),
              opacity: 0.95,
              z: 15,
              vel: asPos(shardVelocity.x, shardVelocity.y),
              fadeRate: 1.5,
              maxLife: 0.65,
            });
          }
        }

        const foamCount = 7;
        for (let foamIndex = 0; foamIndex < foamCount; foamIndex++) {
          const foamRadius = getRandomFloat(3, 6);
          const foamX = x + getRandomFloat(0, width);
          const foamY = icePosY + iceHeight * 0.5 + getRandomFloat(-4, 4);
          const foamVelocity = {
            x: getRandomFloat(-110, 110),
            y: getRandomFloat(-260, -120),
          };

          if (pool) {
            pool.spawnCircle({
              pos: asPos(foamX, foamY),
              radius: foamRadius,
              color: asColor(255, 255, 255),
              opacity: 0.9,
              z: 16,
              vel: asPos(foamVelocity.x, foamVelocity.y),
              gravityY: 480,
              fadeRate: 1.8,
              maxLife: 0.55,
            });
          }
        }

        const player = playerController ? playerController.gameObj : getActivePlayerObject();
        const playerX = player ? player.pos.x : undefined;
        audioSystem.playIceCrackSound(x + width * 0.5, playerX);
        audioSystem.playWaterSplash(x + width * 0.5, playerX);
        safeShake(engine as unknown as Parameters<typeof safeShake>[0], 4.5);

        activeIceGaps.push({ start: x - 5, end: x + width + 5 });

        if (player) {
          if (player.pos.y <= icePosY + 15) {
            player.pos.y = Math.max(player.pos.y, icePosY + 22);
          }
          if (playerController) {
            const curSpeed = playerController.getSpeed();
            playerController.setSpeed(asSpeed(curSpeed.x * 0.92, Math.max(140, curSpeed.y + 60)));
          }
        }

        segment.destroy();
      }

      engine.getTicker().add(() => {
        if (isBroken || !isSystemActive || !segment.isVisible()) return;
        const player = playerController ? playerController.gameObj : getActivePlayerObject();
        if (player) {
          const withinX = player.pos.x >= x - 10 && player.pos.x <= x + width + 10;
          if (!withinX) return;

          const vel = playerController ? playerController.getSpeed() : { x: 0, y: 0 };
          const isFromAbove = player.pos.y <= icePosY + 8 && (vel.y >= 0 || player.pos.y < icePosY);

          if (isFromAbove) {
            breakIce();
          }
        }
      });
    }

    function createModularIceSpan(fromX: number, toX: number) {
      const spanWidth = toX - fromX;
      if (spanWidth <= 0) return;

      const chunkSize = 120;
      const numChunks = Math.max(1, Math.round(spanWidth / chunkSize));
      const actualChunkWidth = spanWidth / numChunks;

      for (let c = 0; c < numChunks; c++) {
        spawnIceSegment(fromX + c * actualChunkWidth, actualChunkWidth);
      }
    }

    // 1. Grande Paredão de Iceberg de x = -1100m até x = 0m
    const wallWidth = 1100;
    const wallStartX = -1100;

    const wallG = engine.createGraphics("iceberg_wall");
    wallG.drawRect(0, 0, wallWidth, screenH, {
      fill: { color: [150, 195, 235], alpha: 0.95 },
    });
    wallG.setPosition(wallStartX, 0);
    wallG.setZIndex(10);
    stageRoot.addChild(wallG);

    // Colunas de gelo verticais
    for (let x = wallStartX; x < 0; x += 75) {
      const colWidth = 65 + Math.sin(x * 0.04) * 20;
      const bumpX = x + Math.cos(x * 0.02) * 12;

      const colG = engine.createGraphics();
      const colPts: readonly Vector2D[] = [
        { x: bumpX, y: 0 },
        { x: bumpX + colWidth, y: 0 },
        { x: bumpX + colWidth - 15, y: screenH },
        { x: bumpX - 20, y: screenH },
      ];
      colG.drawPolygon(colPts, {
        fill: { color: [180, 220, 255], alpha: 0.35 },
      });
      colG.setZIndex(11);
      stageRoot.addChild(colG);

      const ridgeG = engine.createGraphics();
      const ridgePts: readonly Vector2D[] = [
        { x: bumpX + 8, y: 0 },
        { x: bumpX + colWidth * 0.45, y: 0 },
        { x: bumpX + colWidth * 0.25, y: screenH },
      ];
      ridgeG.drawPolygon(ridgePts, {
        fill: { color: [230, 248, 255], alpha: 0.55 },
      });
      ridgeG.setZIndex(12);
      stageRoot.addChild(ridgeG);
    }

    // Crista pontiaguda na borda frontal
    const cliffG = engine.createGraphics();
    const cliffPts: readonly Vector2D[] = [
      { x: -50, y: 0 },
      { x: 0, y: 35 },
      { x: -20, y: 95 },
      { x: 8, y: 165 },
      { x: -25, y: 235 },
      { x: 5, y: 315 },
      { x: -30, y: 385 },
      { x: 0, y: 455 },
      { x: -35, y: screenH },
      { x: -120, y: screenH },
      { x: -120, y: 0 },
    ];
    cliffG.drawPolygon(cliffPts, {
      fill: { color: [210, 240, 255], alpha: 0.98 },
      stroke: { color: [120, 180, 230], width: 3 },
    });
    cliffG.setZIndex(14);
    stageRoot.addChild(cliffG);

    DEFAULT_ICE_GAPS.forEach((gap) => {
      if (gap.start > currentX) {
        createModularIceSpan(currentX, gap.start);
      }
      currentX = gap.end;
    });

    if (currentX < totalDistance) {
      createModularIceSpan(currentX, totalDistance);
    }
  } else {
    // Modo Legacy Kaboom Bridge
    const legacyCtx = engineOrContext as LegacyEngineBridge & {
      Rect?: new (pos: unknown, w: number, h: number) => unknown;
      rect(w: number, h: number, opts?: unknown): unknown;
      pos(x: number, y: number): unknown;
      area(opts?: unknown): unknown;
      body(opts?: unknown): unknown;
      color(r: number, g: number, b: number): unknown;
      rgb(r: number, g: number, b: number): unknown;
      opacity(o: number): unknown;
      z(layer: number): unknown;
      rotate(a: number): unknown;
      polygon(pts: readonly unknown[]): unknown;
      outline(w: number, col: unknown): unknown;
      vec2(x: number, y: number): unknown;
      height(): number;
      dt(): number;
      destroy(obj: unknown): void;
    };

    function spawnIceSegment(x: number, width: number) {
      let isBroken = false;

      const segment = legacyCtx.add([
        legacyCtx.rect(width + 0.5, iceHeight),
        legacyCtx.pos(x, icePosY),
        ...(typeof legacyCtx.Rect === "function"
          ? [
              legacyCtx.area({
                shape: new legacyCtx.Rect(legacyCtx.vec2(0, 0), width + 0.5, iceCollisionHeight),
              }),
            ]
          : [typeof legacyCtx.area === "function" ? legacyCtx.area() : null]),
        typeof legacyCtx.body === "function" ? legacyCtx.body({ isStatic: true }) : null,
        legacyCtx.color(210, 235, 255),
        legacyCtx.opacity(0.96),
        legacyCtx.z(10),
        "ice_block",
        TAGS.OBSTACLE,
        {
          breakIce() {
            if (isBroken) return;
            isBroken = true;

            const pool = getParticlePool();
            for (let shardIndex = 0; shardIndex < 14; shardIndex++) {
              const shardSize = getRandomFloat(3, 8);
              const shardX = x + getRandomFloat(0, width);
              const shardY = icePosY + getRandomFloat(0, iceHeight);
              const shardVelocity =
                typeof legacyCtx.vec2 === "function"
                  ? (legacyCtx.vec2(
                      getRandomFloat(-130, 130),
                      getRandomFloat(-250, -60)
                    ) as unknown as ParticlePos)
                  : asPos(getRandomFloat(-130, 130), getRandomFloat(-250, -60));

              if (pool) {
                pool.spawnRect({
                  pos:
                    typeof legacyCtx.vec2 === "function"
                      ? (legacyCtx.vec2(shardX, shardY) as unknown as ParticlePos)
                      : asPos(shardX, shardY),
                  width: shardSize,
                  height: shardSize,
                  color:
                    typeof legacyCtx.rgb === "function"
                      ? (legacyCtx.rgb(230, 248, 255) as unknown as ParticleColor)
                      : asColor(230, 248, 255),
                  opacity: 0.95,
                  z: 15,
                  vel: shardVelocity,
                  fadeRate: 1.5,
                  maxLife: 0.65,
                });
              }
            }

            const foamCount = 7;
            for (let foamIndex = 0; foamIndex < foamCount; foamIndex++) {
              const foamRadius = getRandomFloat(3, 6);
              const foamX = x + getRandomFloat(0, width);
              const foamY = icePosY + iceHeight * 0.5 + getRandomFloat(-4, 4);
              const foamVelocity =
                typeof legacyCtx.vec2 === "function"
                  ? (legacyCtx.vec2(
                      getRandomFloat(-110, 110),
                      getRandomFloat(-260, -120)
                    ) as unknown as ParticlePos)
                  : asPos(getRandomFloat(-110, 110), getRandomFloat(-260, -120));

              if (pool) {
                pool.spawnCircle({
                  pos:
                    typeof legacyCtx.vec2 === "function"
                      ? (legacyCtx.vec2(foamX, foamY) as unknown as ParticlePos)
                      : asPos(foamX, foamY),
                  radius: foamRadius,
                  color:
                    typeof legacyCtx.rgb === "function"
                      ? (legacyCtx.rgb(255, 255, 255) as unknown as ParticleColor)
                      : asColor(255, 255, 255),
                  opacity: 0.9,
                  z: 16,
                  vel: foamVelocity,
                  gravityY: 480,
                  fadeRate: 1.8,
                  maxLife: 0.55,
                });
              }
            }

            const player = playerController ? playerController.gameObj : getActivePlayerObject();
            const playerX = player ? player.pos.x : undefined;
            audioSystem.playIceCrackSound(x + width * 0.5, playerX);
            audioSystem.playWaterSplash(x + width * 0.5, playerX);
            safeShake(legacyCtx as unknown as Parameters<typeof safeShake>[0], 4.5);

            activeIceGaps.push({ start: x - 5, end: x + width + 5 });

            if (player) {
              if (player.pos.y <= icePosY + 15) {
                player.pos.y = Math.max(player.pos.y, icePosY + 22);
              }
              if (playerController) {
                const curSpeed = playerController.getSpeed();
                playerController.setSpeed(
                  typeof legacyCtx.vec2 === "function"
                    ? (legacyCtx.vec2(
                        curSpeed.x * 0.92,
                        Math.max(140, curSpeed.y + 60)
                      ) as unknown as PlayerSpeed)
                    : asSpeed(curSpeed.x * 0.92, Math.max(140, curSpeed.y + 60))
                );
              }
            }

            if (typeof legacyCtx.destroy === "function") {
              legacyCtx.destroy(segment);
            }
          },
        },
      ]) as {
        hidden?: boolean;
        add(comps: unknown[]): unknown;
        breakIce(): void;
        onUpdate(cb: () => void): void;
      };

      if (segment && typeof segment.add === "function") {
        segment.add([
          legacyCtx.rect(width, 3),
          legacyCtx.pos(0, 0),
          legacyCtx.color(240, 252, 255),
          legacyCtx.opacity(0.4),
          legacyCtx.z(11),
        ]);
        segment.add([
          legacyCtx.rect(width, 3),
          legacyCtx.pos(0, iceHeight - 3),
          legacyCtx.color(180, 215, 255),
          legacyCtx.opacity(0.4),
          legacyCtx.z(11),
        ]);
        segment.add([
          legacyCtx.rect(width, 7),
          legacyCtx.pos(0, 5),
          legacyCtx.color(230, 248, 255),
          legacyCtx.opacity(0.35),
          legacyCtx.z(11),
        ]);
        segment.add([
          legacyCtx.rect(width, 9),
          legacyCtx.pos(0, 16),
          legacyCtx.color(180, 215, 255),
          legacyCtx.opacity(0.28),
          legacyCtx.z(11),
        ]);
        segment.add([
          legacyCtx.rect(width, 7),
          legacyCtx.pos(0, 28),
          legacyCtx.color(215, 240, 255),
          legacyCtx.opacity(0.3),
          legacyCtx.z(11),
        ]);

        const veinCount = 3 + Math.floor((width / 75) % 2);
        for (let v = 0; v < veinCount; v++) {
          const veinRelX = (width / (veinCount + 1)) * (v + 1);
          segment.add([
            legacyCtx.rect(1.5, iceHeight * 0.76),
            legacyCtx.pos(veinRelX, iceHeight * 0.12),
            legacyCtx.color(30, 80, 140),
            legacyCtx.opacity(0.15),
            legacyCtx.rotate(-15 + v * 9),
            legacyCtx.z(12),
          ]);
        }
      }

      cullingManager?.registerEntity(segment as unknown as CullingTarget, () => x);

      if (segment && typeof segment.onUpdate === "function") {
        segment.onUpdate(() => {
          if (isBroken || !isSystemActive || segment.hidden) return;
          const player = playerController ? playerController.gameObj : getActivePlayerObject();
          if (player) {
            const withinX = player.pos.x >= x - 10 && player.pos.x <= x + width + 10;
            if (!withinX) return;

            const vel = playerController ? playerController.getSpeed() : { x: 0, y: 0 };
            const isFromAbove =
              player.pos.y <= icePosY + 8 && (vel.y >= 0 || player.pos.y < icePosY);

            if (isFromAbove) {
              segment.breakIce();
            }
          }
        });
      }

      return segment;
    }

    function createModularIceSpan(fromX: number, toX: number) {
      const spanWidth = toX - fromX;
      if (spanWidth <= 0) return;

      const chunkSize = 120;
      const numChunks = Math.max(1, Math.round(spanWidth / chunkSize));
      const actualChunkWidth = spanWidth / numChunks;

      for (let c = 0; c < numChunks; c++) {
        spawnIceSegment(fromX + c * actualChunkWidth, actualChunkWidth);
      }
    }

    // 1. Grande Paredão de Iceberg
    const wallWidth = 1100;
    const wallStartX = -1100;

    legacyCtx.add([
      legacyCtx.rect(wallWidth, legacyCtx.height()),
      legacyCtx.pos(wallStartX, 0),
      typeof legacyCtx.area === "function" ? legacyCtx.area() : null,
      typeof legacyCtx.body === "function" ? legacyCtx.body({ isStatic: true }) : null,
      legacyCtx.color(150, 195, 235),
      legacyCtx.opacity(0.95),
      legacyCtx.z(10),
      "iceberg_wall",
      TAGS.OBSTACLE,
    ]);

    for (let x = wallStartX; x < 0; x += 75) {
      const colWidth = 65 + Math.sin(x * 0.04) * 20;
      const bumpX = x + Math.cos(x * 0.02) * 12;

      legacyCtx.add([
        legacyCtx.polygon([
          legacyCtx.vec2(bumpX, 0),
          legacyCtx.vec2(bumpX + colWidth, 0),
          legacyCtx.vec2(bumpX + colWidth - 15, legacyCtx.height()),
          legacyCtx.vec2(bumpX - 20, legacyCtx.height()),
        ]),
        legacyCtx.color(180, 220, 255),
        legacyCtx.opacity(0.35),
        legacyCtx.z(11),
      ]);

      legacyCtx.add([
        legacyCtx.polygon([
          legacyCtx.vec2(bumpX + 8, 0),
          legacyCtx.vec2(bumpX + colWidth * 0.45, 0),
          legacyCtx.vec2(bumpX + colWidth * 0.25, legacyCtx.height()),
        ]),
        legacyCtx.color(230, 248, 255),
        legacyCtx.opacity(0.55),
        legacyCtx.z(12),
      ]);
    }

    const outlineCol =
      typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(120, 180, 230) : [120, 180, 230];

    const cliffFacePts = [
      legacyCtx.vec2(-50, 0),
      legacyCtx.vec2(0, 35),
      legacyCtx.vec2(-20, 95),
      legacyCtx.vec2(8, 165),
      legacyCtx.vec2(-25, 235),
      legacyCtx.vec2(5, 315),
      legacyCtx.vec2(-30, 385),
      legacyCtx.vec2(0, 455),
      legacyCtx.vec2(-35, legacyCtx.height()),
      legacyCtx.vec2(-120, legacyCtx.height()),
      legacyCtx.vec2(-120, 0),
    ];

    legacyCtx.add([
      legacyCtx.polygon(cliffFacePts),
      legacyCtx.color(210, 240, 255),
      typeof legacyCtx.outline === "function" ? legacyCtx.outline(3, outlineCol) : null,
      legacyCtx.opacity(0.98),
      legacyCtx.z(14),
    ]);

    DEFAULT_ICE_GAPS.forEach((gap) => {
      if (gap.start > currentX) {
        createModularIceSpan(currentX, gap.start);
      }
      currentX = gap.end;
    });

    if (currentX < totalDistance) {
      createModularIceSpan(currentX, totalDistance);
    }
  }

  const activate = () => {
    isSystemActive = true;
  };

  const deactivate = () => {
    isSystemActive = false;
  };

  const biomeMgr = getBiomeLifecycleManager();
  if (biomeMgr) {
    biomeMgr.registerModule({
      id: "ice_surface",
      name: "Camada de Gelo (Antártica)",
      minX: -1100,
      maxX: 5400,
      activate,
      deactivate,
      isActive: () => isSystemActive,
    });
  }

  return {
    activate,
    deactivate,
    isActive: () => isSystemActive,
  };
}

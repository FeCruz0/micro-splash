/**
 * Suporte a execucao legado/Kaboom context para compatibilidade de testes em iceSurface.
 */

import { TAGS, GAME_CONFIG } from "../../config";
import { audioSystem } from "../audioSystem";
import { type PlayerController, getActivePlayerObject } from "../../entities/player";
import { getParticlePool } from "../particlePool";
import { safeShake } from "../../utils/camera";
import { getRandomFloat } from "../../utils/random";
import { getSpatialGrid } from "../spatialHashGrid";
import { DEFAULT_ICE_GAPS, activeIceGaps } from "./iceGaps";

export interface LegacyIceSurfaceEngineContext {
  height(): number;
  add(components: unknown[]): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  area(options?: unknown): unknown;
  Rect?: new (pos: unknown, width: number, height: number) => unknown;
  vec2(x: number, y: number): unknown;
  color(r: number, g: number, b: number): unknown;
  rgb(r: number, g: number, b: number): unknown;
  opacity(alpha: number): unknown;
  z(layer: number): unknown;
  rotate(degrees: number): unknown;
  rand(min: number, max: number): number;
  destroy(targetEntity: unknown): void;
  polygon(points: unknown[]): unknown;
  outline(width: number, color: unknown): unknown;
}

export function setupLegacyIceSurface(
  legacyCtx: LegacyIceSurfaceEngineContext,
  playerController?: PlayerController
): void {
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

  function spawnIceSegment(x: number, width: number): void {
    let isBroken = false;
    const fallbackIceBlockIdentifier = `ice_block_legacy_${Math.round(x)}_${Math.round(icePosY)}`;
    const fallbackSpatialGrid = getSpatialGrid();

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
      legacyCtx.color(210, 235, 255),
      legacyCtx.opacity(0.96),
      legacyCtx.z(10),
      "ice_block",
      TAGS.OBSTACLE,
      {
        breakIce() {
          if (isBroken) return;
          isBroken = true;

          if (fallbackSpatialGrid) {
            fallbackSpatialGrid.remove(fallbackIceBlockIdentifier);
          }

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
                vel:
                  typeof legacyCtx.vec2 === "function"
                    ? (legacyCtx.vec2(shardVelocity.x, shardVelocity.y) as unknown as ParticlePos)
                    : asPos(shardVelocity.x, shardVelocity.y),
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
              x:
                typeof legacyCtx.rand === "function"
                  ? legacyCtx.rand(-110, 110)
                  : getRandomFloat(-110, 110),
              y:
                typeof legacyCtx.rand === "function"
                  ? legacyCtx.rand(-260, -120)
                  : getRandomFloat(-260, -120),
            };

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
    ]);

    if (fallbackSpatialGrid) {
      fallbackSpatialGrid.insert(
        fallbackIceBlockIdentifier,
        {
          id: fallbackIceBlockIdentifier,
          tag: "ice_block",
          pos: { x, y: icePosY },
          width,
          height: iceCollisionHeight,
          isStatic: true,
          breakIce: () => {
            const seg = segment as { breakIce?: () => void };
            if (seg && typeof seg.breakIce === "function") {
              seg.breakIce();
            }
          },
        },
        {
          minX: x,
          minY: icePosY,
          maxX: x + width,
          maxY: icePosY + iceCollisionHeight,
        },
        true
      );
    }
  }

  function createModularIceSpan(fromX: number, toX: number): void {
    const spanWidth = toX - fromX;
    if (spanWidth <= 0) return;

    const chunkSize = 120;
    const numChunks = Math.max(1, Math.round(spanWidth / chunkSize));
    const actualChunkWidth = spanWidth / numChunks;

    for (let c = 0; c < numChunks; c++) {
      spawnIceSegment(fromX + c * actualChunkWidth, actualChunkWidth);
    }
  }

  const wallWidth = 1100;
  const wallStartX = -1100;

  legacyCtx.add([
    legacyCtx.rect(wallWidth, legacyCtx.height()),
    legacyCtx.pos(wallStartX, 0),
    legacyCtx.color(150, 195, 235),
    legacyCtx.opacity(1),
    legacyCtx.z(10),
    "iceberg_wall",
    TAGS.OBSTACLE,
  ]);

  const polarIceSpatialGrid = getSpatialGrid();
  if (polarIceSpatialGrid) {
    const polarIceWallEntity = {
      id: "iceberg_wall_static",
      tag: TAGS.OBSTACLE,
      pos: { x: wallStartX, y: 0 },
      width: wallWidth,
      height: legacyCtx.height(),
      isStatic: true,
    };
    polarIceSpatialGrid.insert(
      "iceberg_wall_static",
      polarIceWallEntity,
      {
        minX: wallStartX,
        minY: 0,
        maxX: wallStartX + wallWidth,
        maxY: legacyCtx.height(),
      },
      true
    );
  }

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

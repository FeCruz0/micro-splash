/**
 * Renderizador de Blocos de Gelo Polar — Micro Splash
 */

import { GAME_CONFIG } from "../../config";
import { audioSystem } from "../audioSystem";
import { type PlayerController, getActivePlayerObject } from "../../entities/player";
import { getParticlePool } from "../particlePool";
import { getSpatialCullingManager } from "../spatialCullingSystem";
import { safeShake } from "../../utils/camera";
import { getRandomFloat } from "../../utils/random";
import type { IRenderEngine, IRenderNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import { create16BitIceTextures } from "./ice16BitTextures";
import { getSpatialGrid } from "../spatialHashGrid";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import { DEFAULT_ICE_GAPS, activeIceGaps } from "./iceGaps";
import { renderIcebergWall } from "./icebergWallRenderer";

export const ICE_HEIGHT = 40;
export const ICE_POSITION_Y = GAME_CONFIG.SEA_LEVEL - 20;
export const ICE_COLLISION_HEIGHT = 24;
export const TOTAL_ICE_DISTANCE = 5000;

export function setupPolarIceRendering(
  engine: IRenderEngine,
  playerController?: PlayerController,
  isSystemActivePredicate?: () => boolean
): void {
  const worldContainer = resolveWorldRenderContainer(engine);
  const cullingManager = getSpatialCullingManager();
  type CullingTarget = Parameters<NonNullable<typeof cullingManager>["registerEntity"]>[0];

  type Pool = NonNullable<ReturnType<typeof getParticlePool>>;
  type ParticlePos = Parameters<Pool["spawnRect"]>[0]["pos"];
  type ParticleColor = Parameters<Pool["spawnRect"]>[0]["color"];
  type PlayerSpeed = PlayerController extends { setSpeed: (s: infer S) => void } ? S : unknown;

  const asPos = (x: number, y: number) => ({ x, y }) as unknown as ParticlePos;
  const asColor = (r: number, g: number, b: number) => ({ r, g, b }) as unknown as ParticleColor;
  const asSpeed = (x: number, y: number) => ({ x, y }) as unknown as PlayerSpeed;

  const { iceBlockTexture, icebergWallTexture } = create16BitIceTextures(engine);

  function spawnIceSegment(x: number, width: number): void {
    let isBroken = false;

    let segment: IRenderNode;
    if (iceBlockTexture) {
      const sprite = engine.createSprite(iceBlockTexture, "ice_block");
      sprite.setSize(width + 0.5, ICE_HEIGHT);
      segment = sprite;
    } else {
      const gfx = engine.createGraphics("ice_block");
      gfx.drawRect(0, 0, width + 0.5, ICE_HEIGHT, {
        fill: { color: [210, 235, 255], alpha: 0.96 },
      });

      // Bordas superior e inferior translucidas
      gfx.drawRect(0, 0, width, 3, {
        fill: { color: [240, 252, 255], alpha: 0.4 },
      });
      gfx.drawRect(0, ICE_HEIGHT - 3, width, 3, {
        fill: { color: [180, 215, 255], alpha: 0.4 },
      });

      // Faixas internas de estratificacao cristalina
      gfx.drawRect(0, 5, width, 7, {
        fill: { color: [230, 248, 255], alpha: 0.35 },
      });
      gfx.drawRect(0, 16, width, 9, {
        fill: { color: [180, 215, 255], alpha: 0.28 },
      });
      gfx.drawRect(0, 28, width, 7, {
        fill: { color: [215, 240, 255], alpha: 0.3 },
      });

      // Veios glaciais diagonais
      const veinCount = 3 + Math.floor((width / 75) % 2);
      for (let v = 0; v < veinCount; v++) {
        const veinRelX = (width / (veinCount + 1)) * (v + 1);
        gfx.drawRect(veinRelX, ICE_HEIGHT * 0.12, 1.5, ICE_HEIGHT * 0.76, {
          fill: { color: [30, 80, 140], alpha: 0.15 },
        });
      }
      segment = gfx;
    }

    segment.setPosition(x, ICE_POSITION_Y);
    segment.setZIndex(10);
    worldContainer.addChild(segment);
    cullingManager?.registerEntity(segment as unknown as CullingTarget, () => x, width);

    const iceBlockIdentifier = `ice_block_${Math.round(x)}_${Math.round(ICE_POSITION_Y)}`;
    const spatialHashGrid = getSpatialGrid();

    function breakIce(): void {
      if (isBroken) return;
      isBroken = true;

      if (spatialHashGrid) {
        spatialHashGrid.remove(iceBlockIdentifier);
      }

      const pool = getParticlePool();
      for (let shardIndex = 0; shardIndex < 14; shardIndex++) {
        const shardSize = getRandomFloat(3, 8);
        const shardX = x + getRandomFloat(0, width);
        const shardY = ICE_POSITION_Y + getRandomFloat(0, ICE_HEIGHT);
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
        const foamY = ICE_POSITION_Y + ICE_HEIGHT * 0.5 + getRandomFloat(-4, 4);
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
        if (player.pos.y <= ICE_POSITION_Y + 15) {
          player.pos.y = Math.max(player.pos.y, ICE_POSITION_Y + 22);
        }
        if (playerController) {
          const curSpeed = playerController.getSpeed();
          playerController.setSpeed(asSpeed(curSpeed.x * 0.92, Math.max(140, curSpeed.y + 60)));
        }
      }

      segment.destroy();
    }

    if (spatialHashGrid) {
      spatialHashGrid.insert(
        iceBlockIdentifier,
        {
          id: iceBlockIdentifier,
          tag: "ice_block",
          pos: { x, y: ICE_POSITION_Y },
          width,
          height: ICE_COLLISION_HEIGHT,
          isStatic: true,
          breakIce,
        },
        {
          minX: x,
          minY: ICE_POSITION_Y,
          maxX: x + width,
          maxY: ICE_POSITION_Y + ICE_COLLISION_HEIGHT,
        },
        true
      );
    }

    engine.getTicker().add(() => {
      const activeState = isSystemActivePredicate ? isSystemActivePredicate() : true;
      if (isBroken || !activeState || !segment.isVisible()) return;
      const player = playerController ? playerController.gameObj : getActivePlayerObject();
      if (player) {
        const withinX = player.pos.x >= x - 10 && player.pos.x <= x + width + 10;
        if (!withinX) return;

        const vel = playerController ? playerController.getSpeed() : { x: 0, y: 0 };
        const isFromAbove =
          player.pos.y <= ICE_POSITION_Y + 8 && (vel.y >= 0 || player.pos.y < ICE_POSITION_Y);

        if (isFromAbove) {
          breakIce();
        }
      }
    });
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

  renderIcebergWall(engine, icebergWallTexture);

  let currentX = 0;
  DEFAULT_ICE_GAPS.forEach((gap) => {
    if (gap.start > currentX) {
      createModularIceSpan(currentX, gap.start);
    }
    currentX = gap.end;
  });

  if (currentX < TOTAL_ICE_DISTANCE) {
    createModularIceSpan(currentX, TOTAL_ICE_DISTANCE);
  }
}

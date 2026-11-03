/**
 * Sistema de Neve Marinha Abissal (Marine Snow) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import type { IRenderEngine, IRenderNode } from "../engine/contracts/INTERFACE_CONTRACTS";

export interface MarineSnowFlake {
  readonly node: IRenderNode;
  readonly relX: number;
  y: number;
  readonly fallSpeed: number;
  readonly driftSpeed: number;
  readonly driftPhase: number;
  readonly baseOpacity: number;
}

export const MARINE_SNOW_CONFIG = {
  MIN_DISTANCE: 5000,
  MAX_DISTANCE: 12000,
  PARTICLE_COUNT: 16,
  BASE_COLOR: [120, 140, 160] as const,
  FALL_SPEED_MIN: 10,
  FALL_SPEED_MAX: 22,
  BASE_OPACITY: 0.32,
};

const reusableSnowResult = { y: 0, driftOffset: 0 };

/**
 * Função pura que calcula o deslocamento vertical e oscilação horizontal
 * de uma partícula de Neve Marinha (Marine Snow) reaproveitando buffer de retorno (Fase 53).
 */
export function updateSnowParticlePosition(
  currentY: number,
  fallSpeed: number,
  deltaTime: number,
  time: number,
  driftSpeed: number,
  driftPhase: number,
  minY: number,
  maxY: number
): { y: number; driftOffset: number } {
  let nextY = currentY + fallSpeed * deltaTime;
  if (nextY > maxY) {
    nextY = minY + (nextY - maxY);
  }
  reusableSnowResult.y = nextY;
  reusableSnowResult.driftOffset = Math.sin(time * driftSpeed + driftPhase) * 6;
  return reusableSnowResult;
}

import {
  isRenderEngine,
  resolveCameraX,
  LegacyRenderNodeAdapter,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

/**
 * Sistema de Neve Marinha Abissal (Fase 30.3, 53 & Migração PixiJS v8):
 * Gera micro-sedimentos orgânicos que precipitam lentamente pelas profundezas da Travessia Pelágica.
 */
export function setupMarineSnowSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge
): () => void {
  const particles: MarineSnowFlake[] = [];

  const screenDimensions = isRenderEngine(engineOrContext)
    ? engineOrContext.getDimensions()
    : { width: engineOrContext.width(), height: engineOrContext.height() };

  const screenWidth = screenDimensions.width;
  const screenHeight = screenDimensions.height;
  const minY = GAME_CONFIG.SEA_LEVEL + 40;
  const maxY = screenHeight - 45;

  for (let index = 0; index < MARINE_SNOW_CONFIG.PARTICLE_COUNT; index++) {
    const radius = 1 + (index % 2) * 0.8;
    const initialY =
      minY + (index / MARINE_SNOW_CONFIG.PARTICLE_COUNT) * (maxY - minY) + ((index * 17) % 30);
    const relX = (index / MARINE_SNOW_CONFIG.PARTICLE_COUNT) * screenWidth;
    const baseOpacity = 0.22 + (index % 3) * 0.05;

    let node: IRenderNode;

    if (isRenderEngine(engineOrContext)) {
      const graphicsNode = engineOrContext.createGraphics(`marine_snow_${index}`);
      graphicsNode.drawCircle(0, 0, radius, {
        fill: {
          color: MARINE_SNOW_CONFIG.BASE_COLOR,
          alpha: baseOpacity,
        },
      });
      graphicsNode.setPosition(0, initialY);
      graphicsNode.setZIndex(-1);
      engineOrContext.getStageRoot().addChild(graphicsNode);
      node = graphicsNode;
    } else {
      const legacyObject = engineOrContext.add([
        engineOrContext.circle(radius),
        engineOrContext.pos(0, initialY),
        engineOrContext.color(
          MARINE_SNOW_CONFIG.BASE_COLOR[0],
          MARINE_SNOW_CONFIG.BASE_COLOR[1],
          MARINE_SNOW_CONFIG.BASE_COLOR[2]
        ),
        engineOrContext.opacity(baseOpacity),
        engineOrContext.z(-1),
        "marine_snow_particle",
      ]);
      node = new LegacyRenderNodeAdapter(legacyObject, `marine_snow_legacy_${index}`);
    }

    particles.push({
      node,
      relX,
      y: initialY,
      fallSpeed:
        MARINE_SNOW_CONFIG.FALL_SPEED_MIN +
        (index % 5) * ((MARINE_SNOW_CONFIG.FALL_SPEED_MAX - MARINE_SNOW_CONFIG.FALL_SPEED_MIN) / 4),
      driftSpeed: 0.6 + (index % 4) * 0.25,
      driftPhase: index * 0.9,
      baseOpacity,
    });
  }

  let timeAccumulator = 0;
  let isSystemActive = true;

  const biomeManager = getBiomeLifecycleManager();
  if (biomeManager) {
    biomeManager.registerModule({
      id: "marine_snow_system",
      name: "Neve Marinha Pelágica",
      minX: MARINE_SNOW_CONFIG.MIN_DISTANCE,
      maxX: MARINE_SNOW_CONFIG.MAX_DISTANCE,
      activate: () => {
        isSystemActive = true;
      },
      deactivate: () => {
        isSystemActive = false;
        for (let index = 0; index < particles.length; index++) {
          particles[index].node.setVisible(false);
        }
      },
      isActive: () => isSystemActive,
    });
  }

  const stepUpdate = (deltaTime: number): void => {
    if (!isSystemActive) return;

    timeAccumulator += deltaTime;
    const cameraX = resolveCameraX(engineOrContext);
    const screenLeft = cameraX - screenWidth / 2;

    const isInPelagic =
      cameraX >= MARINE_SNOW_CONFIG.MIN_DISTANCE - 400 &&
      cameraX <= MARINE_SNOW_CONFIG.MAX_DISTANCE + 400;

    if (!isInPelagic) {
      for (let index = 0; index < particles.length; index++) {
        particles[index].node.setVisible(false);
      }
      return;
    }

    let fadeFactor = 1;
    if (cameraX < MARINE_SNOW_CONFIG.MIN_DISTANCE) {
      fadeFactor = Math.max(0, (cameraX - (MARINE_SNOW_CONFIG.MIN_DISTANCE - 400)) / 400);
    } else if (cameraX > MARINE_SNOW_CONFIG.MAX_DISTANCE) {
      fadeFactor = Math.max(0, (MARINE_SNOW_CONFIG.MAX_DISTANCE + 400 - cameraX) / 400);
    }

    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      particle.node.setVisible(true);
      const positionResult = updateSnowParticlePosition(
        particle.y,
        particle.fallSpeed,
        deltaTime,
        timeAccumulator,
        particle.driftSpeed,
        particle.driftPhase,
        minY,
        maxY
      );
      particle.y = positionResult.y;
      particle.node.setPosition(
        screenLeft + particle.relX + positionResult.driftOffset,
        particle.y
      );
      particle.node.setOpacity(particle.baseOpacity * fadeFactor);
    }
  };

  let unregisterTicker: () => void;

  if (isRenderEngine(engineOrContext)) {
    unregisterTicker = engineOrContext.getTicker().add((deltaTime) => {
      stepUpdate(deltaTime);
    });
  } else {
    const handle = engineOrContext.onUpdate(() => {
      stepUpdate(engineOrContext.dt());
    });
    unregisterTicker = () => {
      if (typeof handle === "function") {
        handle();
      } else if (
        handle &&
        typeof handle === "object" &&
        "cancel" in handle &&
        typeof (handle as { cancel: () => void }).cancel === "function"
      ) {
        (handle as { cancel: () => void }).cancel();
      }
    };
  }

  return () => {
    unregisterTicker();
    for (let index = 0; index < particles.length; index++) {
      particles[index].node.destroy();
    }
    particles.length = 0;
  };
}

/**
 * Sistema de Bioluminescência Procedural (Noctiluca scintillans) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";
import { getRandomFloat } from "../utils/random";
import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  LegacyRenderNodeAdapter,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

export interface BioluminescentParticle {
  gameObj?: unknown;
  node: IRenderNode;
  size: number;
  active: boolean;
  life: number;
  maxLife: number;
  initialOpacity: number;
  velocity: { x: number; y: number };
  driftSpeed: number;
  swayFrequency: number;
  swayTimer: number;
}

export interface AmbientPlanktonParticle {
  gameObj?: unknown;
  node: IRenderNode;
  relX: number;
  relY: number;
  phase: number;
  baseOpacity: number;
}

/**
 * Determina se as condições para ativação da esteira bioluminescente são atendidas:
 * 1. Posição dentro da Costa Urbana (12.000m a 19.000m)
 * 2. Baleia submersa no mar (Y >= SEA_LEVEL)
 * 3. Movimento ativo através da coluna d'água (velocidade > 15)
 */
export function isBioluminescenceActive(
  playerXPosition: number,
  playerYPosition: number,
  speedMagnitude: number
): boolean {
  const isWithinCostaUrbana = playerXPosition >= 12000 && playerXPosition <= 19000;
  const isSubmerged = playerYPosition >= GAME_CONFIG.SEA_LEVEL;
  const isMoving = speedMagnitude > 15;

  return isWithinCostaUrbana && isSubmerged && isMoving;
}

/**
 * Determina se as condições para ativação do plâncton estático ambiente são atendidas
 * (entre a Costa Urbana e os Cânions de Cabo Frio, 12.000m a 25.000m).
 */
export function isAmbientPlanktonActive(playerXPosition: number): boolean {
  return playerXPosition >= 12000 && playerXPosition <= 25000;
}

/**
 * Calcula a opacidade pulsante orgânica de um ponto discreto de dinoflagelado ambiente.
 */
export function calculateAmbientPlanktonOpacity(
  time: number,
  phase: number,
  baseOpacity = 0.35
): number {
  const pulse = Math.sin(time + phase) * 0.4;
  return Math.max(0.05, Math.min(1.0, baseOpacity + pulse));
}

/**
 * Calcula a paleta de cores azul-esverdeada característica de plânctons bioluminescentes
 * (Noctiluca scintillans / Dinoflagelados).
 */
export function calculateBioluminescentColor(phase: number): [number, number, number] {
  const normalizedSin = Math.sin(phase) * 0.5 + 0.5;
  const redChannel = Math.round(20 + normalizedSin * 30);
  const greenChannel = Math.round(210 + normalizedSin * 40);
  const blueChannel = Math.round(220 + (1 - normalizedSin) * 35);

  return [redChannel, greenChannel, blueChannel];
}

/**
 * Inicializa a esteira de bioluminescência procedural na Costa Urbana.
 */
export function setupBioluminescenceSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  playerController: PlayerController
): {
  destroy: () => void;
  getActiveParticleCount: () => number;
} {
  const particleCount = 36;
  const particles: BioluminescentParticle[] = [];
  let isModuleActive = false;
  let spawnCooldownTimer = 0;
  let colorCyclePhase = 0;

  const isPixi = isRenderEngine(engineOrContext);

  // Pré-aloca o pool de partículas para manter 60 FPS sem alocação contínua
  for (let index = 0; index < particleCount; index++) {
    const size = getRandomFloat(1.5, 3.2);
    let node: IRenderNode;
    let legacyRaw: unknown = undefined;

    if (isPixi) {
      const gfx = engineOrContext.createGraphics(`biolum_particle_${index}`);
      gfx.drawCircle(0, 0, size, { fill: { color: [40, 240, 210], alpha: 0 } });
      gfx.setPosition(-9999, -9999);
      gfx.setZIndex(14);
      gfx.setVisible(false);
      engineOrContext.getStageRoot().addChild(gfx);
      node = gfx;
    } else {
      const rawObj = engineOrContext.add([
        engineOrContext.circle(size),
        engineOrContext.pos(-9999, -9999),
        engineOrContext.color(40, 240, 210),
        engineOrContext.opacity(0),
        engineOrContext.z(14),
        "bioluminescence_particle",
      ]);
      legacyRaw = rawObj;
      node = new LegacyRenderNodeAdapter(rawObj, `biolum_particle_${index}`);
      node.setVisible(false);
    }

    particles.push({
      gameObj: legacyRaw,
      node,
      size,
      active: false,
      life: 0,
      maxLife: 2.5,
      initialOpacity: 0.8,
      velocity: { x: 0, y: 0 },
      driftSpeed: 10,
      swayFrequency: 2.5,
      swayTimer: index * 0.4,
    });
  }

  // Pré-aloca 24 pontos discretos de dinoflagelados de ambiente
  const ambientCount = 24;
  const ambientPlankton: AmbientPlanktonParticle[] = [];

  const screenDimensions = isPixi
    ? engineOrContext.getDimensions()
    : { width: engineOrContext.width(), height: engineOrContext.height() };

  const screenW = screenDimensions.width || 640;
  const screenH = screenDimensions.height || 360;
  let totalAmbientTime = 0;

  for (let index = 0; index < ambientCount; index++) {
    const size = getRandomFloat(1.2, 2.2);
    let node: IRenderNode;
    let legacyRaw: unknown = undefined;

    if (isPixi) {
      const gfx = engineOrContext.createGraphics(`ambient_plankton_${index}`);
      gfx.drawCircle(0, 0, size, { fill: { color: [60, 230, 215], alpha: 0 } });
      gfx.setPosition(-9999, -9999);
      gfx.setZIndex(13);
      gfx.setVisible(false);
      engineOrContext.getStageRoot().addChild(gfx);
      node = gfx;
    } else {
      const rawObj = engineOrContext.add([
        engineOrContext.circle(size),
        engineOrContext.pos(-9999, -9999),
        engineOrContext.color(60, 230, 215),
        engineOrContext.opacity(0),
        engineOrContext.z(13),
        "ambient_plankton",
      ]);
      legacyRaw = rawObj;
      node = new LegacyRenderNodeAdapter(rawObj, `ambient_plankton_${index}`);
      node.setVisible(false);
    }

    ambientPlankton.push({
      gameObj: legacyRaw,
      node,
      relX: getRandomFloat(0, screenW),
      relY:
        GAME_CONFIG.SEA_LEVEL +
        25 +
        getRandomFloat(0, Math.max(80, screenH - GAME_CONFIG.SEA_LEVEL - 50)),
      phase: getRandomFloat(0, Math.PI * 2),
      baseOpacity: getRandomFloat(0.25, 0.45),
    });
  }

  // Registra no BiomeLifecycleManager se disponível
  const biomeManager = getBiomeLifecycleManager();
  if (biomeManager) {
    biomeManager.registerModule({
      id: "bioluminescence_trail",
      name: "Esteira de Bioluminescência",
      minX: 12000,
      maxX: 19000,
      activate: () => {
        isModuleActive = true;
      },
      deactivate: () => {
        isModuleActive = false;
        for (let index = 0; index < particles.length; index++) {
          const particle = particles[index];
          if (particle.active) {
            particle.active = false;
            particle.node.setVisible(false);
            particle.node.setOpacity(0);
          }
        }
      },
      isActive: () => isModuleActive,
    });
  }

  function spawnParticle(
    spawnPosition: { x: number; y: number },
    whaleVelocity: { x: number; y: number }
  ): void {
    let chosenParticle: BioluminescentParticle | null = null;
    for (let index = 0; index < particles.length; index++) {
      if (!particles[index].active) {
        chosenParticle = particles[index];
        break;
      }
    }

    if (!chosenParticle) return;

    colorCyclePhase += 0.35;
    const [r, g, b] = calculateBioluminescentColor(colorCyclePhase);

    chosenParticle.active = true;
    chosenParticle.node.setVisible(true);
    chosenParticle.life = getRandomFloat(2.0, 3.0);
    chosenParticle.maxLife = chosenParticle.life;
    chosenParticle.initialOpacity = getRandomFloat(0.65, 0.95);
    chosenParticle.node.setOpacity(chosenParticle.initialOpacity);

    // Atualiza a cor se for um IGraphicsNode
    if (
      "clear" in chosenParticle.node &&
      typeof (chosenParticle.node as IGraphicsNode).clear === "function"
    ) {
      const gfx = chosenParticle.node as IGraphicsNode;
      gfx.clear();
      gfx.drawCircle(0, 0, chosenParticle.size, {
        fill: { color: [r, g, b], alpha: chosenParticle.initialOpacity },
      });
    }

    const spreadX = getRandomFloat(-8, 8);
    const spreadY = getRandomFloat(-10, 10);
    chosenParticle.node.setPosition(spawnPosition.x + spreadX, spawnPosition.y + spreadY);

    chosenParticle.velocity = {
      x: -whaleVelocity.x * 0.12 + getRandomFloat(-15, 15),
      y: -whaleVelocity.y * 0.12 + getRandomFloat(-8, 8),
    };
    chosenParticle.swayFrequency = getRandomFloat(2.0, 4.0);
  }

  const stepUpdate = (deltaTime: number): void => {
    const baleia = playerController?.gameObj as
      { pos?: { x: number; y: number }; angle?: number } | undefined;
    if (!baleia || !baleia.pos) return;

    const whaleSpeed =
      typeof playerController.getSpeed === "function"
        ? playerController.getSpeed()
        : { x: 0, y: 0 };
    const speedMagnitude = Math.sqrt(whaleSpeed.x * whaleSpeed.x + whaleSpeed.y * whaleSpeed.y);
    const isActive = isBioluminescenceActive(baleia.pos.x, baleia.pos.y, speedMagnitude);

    if (isActive) {
      spawnCooldownTimer -= deltaTime;
      const spawnInterval = Math.max(0.04, 0.12 - (speedMagnitude / GAME_CONFIG.MAX_SPEED) * 0.08);

      if (spawnCooldownTimer <= 0) {
        spawnCooldownTimer = spawnInterval;

        const isFacingRight =
          typeof playerController.isFacingRight === "function"
            ? playerController.isFacingRight()
            : true;

        const tailOffsetX = isFacingRight ? -52 : 52;
        const tailAngleInRadians =
          typeof baleia.angle === "number" ? (baleia.angle * Math.PI) / 180 : 0;
        const rotatedOffsetX = tailOffsetX * Math.cos(tailAngleInRadians);
        const rotatedOffsetY = tailOffsetX * Math.sin(tailAngleInRadians);

        const tailPosition = {
          x: baleia.pos.x + rotatedOffsetX,
          y: baleia.pos.y + rotatedOffsetY,
        };

        spawnParticle(tailPosition, whaleSpeed);
      }
    }

    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      if (!particle.active) continue;

      particle.life -= deltaTime;
      if (particle.life <= 0) {
        particle.active = false;
        particle.node.setVisible(false);
        particle.node.setOpacity(0);
        particle.node.setPosition(-9999, -9999);
        continue;
      }

      particle.swayTimer += deltaTime * particle.swayFrequency;
      const swayOffset = Math.sin(particle.swayTimer) * 8 * deltaTime;

      const currentPos = particle.node.getPosition();
      particle.node.setPosition(
        currentPos.x + particle.velocity.x * deltaTime,
        currentPos.y + particle.velocity.y * deltaTime + swayOffset
      );

      const lifeProgress = particle.life / particle.maxLife;
      particle.node.setOpacity(particle.initialOpacity * lifeProgress);
    }

    totalAmbientTime += deltaTime;
    const ambientActive = isAmbientPlanktonActive(baleia.pos.x);
    const camX = resolveCameraX(engineOrContext) || baleia.pos.x || 0;

    for (let index = 0; index < ambientPlankton.length; index++) {
      const p = ambientPlankton[index];
      if (!ambientActive) {
        if (p.node.isVisible()) {
          p.node.setVisible(false);
          p.node.setOpacity(0);
        }
        continue;
      }

      const worldX = camX - screenW / 2 + p.relX;
      p.node.setPosition(worldX, p.relY);

      p.relX = (p.relX + 2.5 * deltaTime) % screenW;

      const op = calculateAmbientPlanktonOpacity(totalAmbientTime, p.phase, p.baseOpacity);
      p.node.setOpacity(op);
      p.node.setVisible(true);
    }
  };

  let unregisterTicker: () => void;

  if (isPixi) {
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

  return {
    destroy: () => {
      unregisterTicker();
      for (let index = 0; index < particles.length; index++) {
        particles[index].node.destroy();
      }
      for (let index = 0; index < ambientPlankton.length; index++) {
        ambientPlankton[index].node.destroy();
      }
    },
    getActiveParticleCount: () => {
      let activeCount = 0;
      for (let index = 0; index < particles.length; index++) {
        if (particles[index].active) activeCount++;
      }
      return activeCount;
    },
  };
}

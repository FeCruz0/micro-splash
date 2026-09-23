import type { KaboomCtx, GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { getBiomeLifecycleManager } from "./biomeLifecycleManager";

export interface BioluminescentParticle {
  gameObj: GameObj;
  active: boolean;
  life: number;
  maxLife: number;
  initialOpacity: number;
  velocity: { x: number; y: number };
  driftSpeed: number;
  swayFrequency: number;
  swayTimer: number;
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
  k: KaboomCtx,
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

  // Pre-aloca o pool de partículas para manter 60 FPS estáveis sem alocação contínua
  for (let index = 0; index < particleCount; index++) {
    const size = typeof k.rand === "function" ? k.rand(1.5, 3.2) : 2.5;
    const gameObj = k.add([
      k.circle(size),
      k.pos(-9999, -9999),
      k.color(40, 240, 210),
      k.opacity(0),
      k.z(14), // Logo atrás da baleia (z: 15-20)
      "bioluminescence_particle",
    ]);
    gameObj.hidden = true;

    particles.push({
      gameObj,
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
        // Desativa partículas suavemente ao deixar a Costa Urbana
        for (let index = 0; index < particles.length; index++) {
          const particle = particles[index];
          if (particle.active) {
            particle.active = false;
            particle.gameObj.hidden = true;
            particle.gameObj.opacity = 0;
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
    // Procura a primeira partícula inativa disponível no pool
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
    chosenParticle.gameObj.hidden = false;
    chosenParticle.life = typeof k.rand === "function" ? k.rand(2.0, 3.0) : 2.5;
    chosenParticle.maxLife = chosenParticle.life;
    chosenParticle.initialOpacity = typeof k.rand === "function" ? k.rand(0.65, 0.95) : 0.8;
    chosenParticle.gameObj.opacity = chosenParticle.initialOpacity;
    chosenParticle.gameObj.color = k.rgb(r, g, b);

    // Variação orgânica no ponto de emissão da cauda
    const spreadX = typeof k.rand === "function" ? k.rand(-8, 8) : 0;
    const spreadY = typeof k.rand === "function" ? k.rand(-10, 10) : 0;
    chosenParticle.gameObj.pos.x = spawnPosition.x + spreadX;
    chosenParticle.gameObj.pos.y = spawnPosition.y + spreadY;

    // Velocidade de inércia reversa (deriva suave após a passagem da cauda)
    chosenParticle.velocity = {
      x: -whaleVelocity.x * 0.12 + (typeof k.rand === "function" ? k.rand(-15, 15) : 0),
      y: -whaleVelocity.y * 0.12 + (typeof k.rand === "function" ? k.rand(-8, 8) : 0),
    };
    chosenParticle.swayFrequency = typeof k.rand === "function" ? k.rand(2.0, 4.0) : 3.0;
  }

  const updateHandler = k.onUpdate(() => {
    const deltaTime = k.dt();
    const baleia = playerController.gameObj;
    if (!baleia || !baleia.pos) return;

    const whaleSpeed = playerController.getSpeed();
    const speedMagnitude = Math.sqrt(whaleSpeed.x * whaleSpeed.x + whaleSpeed.y * whaleSpeed.y);
    const isActive = isBioluminescenceActive(baleia.pos.x, baleia.pos.y, speedMagnitude);

    // Emissão contínua de partículas bioluminescentes ao nadar
    if (isActive) {
      spawnCooldownTimer -= deltaTime;
      const spawnInterval = Math.max(0.04, 0.12 - (speedMagnitude / GAME_CONFIG.MAX_SPEED) * 0.08);

      if (spawnCooldownTimer <= 0) {
        spawnCooldownTimer = spawnInterval;

        const isFacingRight =
          typeof playerController.isFacingRight === "function"
            ? playerController.isFacingRight()
            : true;

        // Posição de emissão alinhada à cauda da jubarte
        const tailOffsetX = isFacingRight ? -52 : 52;
        const tailAngleInRadians = typeof k.deg2rad === "function" ? k.deg2rad(baleia.angle) : 0;
        const rotatedOffsetX = tailOffsetX * Math.cos(tailAngleInRadians);
        const rotatedOffsetY = tailOffsetX * Math.sin(tailAngleInRadians);

        const tailPosition = {
          x: baleia.pos.x + rotatedOffsetX,
          y: baleia.pos.y + rotatedOffsetY,
        };

        spawnParticle(tailPosition, whaleSpeed);
      }
    }

    // Atualiza partículas ativas (movimento, ondulação e fade-out persistente de 2-3s)
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      if (!particle.active) continue;

      particle.life -= deltaTime;
      if (particle.life <= 0) {
        particle.active = false;
        particle.gameObj.hidden = true;
        particle.gameObj.opacity = 0;
        particle.gameObj.pos.x = -9999;
        particle.gameObj.pos.y = -9999;
        continue;
      }

      particle.swayTimer += deltaTime * particle.swayFrequency;
      const swayOffset = Math.sin(particle.swayTimer) * 8 * deltaTime;

      particle.gameObj.pos.x += particle.velocity.x * deltaTime;
      particle.gameObj.pos.y += particle.velocity.y * deltaTime + swayOffset;

      // Desvanecimento suave ao longo de 2 a 3 segundos
      const lifeProgress = particle.life / particle.maxLife;
      particle.gameObj.opacity = particle.initialOpacity * lifeProgress;
    }
  });

  return {
    destroy: () => {
      if (typeof updateHandler?.cancel === "function") {
        updateHandler.cancel();
      }
      for (let index = 0; index < particles.length; index++) {
        if (typeof k.destroy === "function") {
          k.destroy(particles[index].gameObj);
        }
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

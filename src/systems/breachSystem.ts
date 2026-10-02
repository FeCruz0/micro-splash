import kaboom from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import { analytics } from "../services/analytics";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";

/**
 * Configuração de inicialização para o sistema do Salto Majestoso (Breach).
 */
export interface BreachSystemConfig {
  /** Instância do motor Kaboom.js */
  k: ReturnType<typeof kaboom>;
  /** Controlador físico da baleia do jogador */
  playerController: PlayerController;
  /** Estado reativo do jogo (distância, pontuação, etc.) */
  gameState: GameState;
  /** Callback acionado após a conclusão cinematográfica do salto e reentrada na água */
  onBreachComplete: () => void;
  /** Se deve exibir banner/prompt de texto na tela (desativado na Migração Difícil) */
  showPrompt?: boolean;
}

/**
 * Sistema do Salto Majestoso (Breach) no Santuário de Arraial do Cabo.
 *
 * Reproduz o clímax da migração das baleias-jubarte:
 * 1. Ao se aproximar da Ilha do Farol, exibe um banner de incentivo para o salto triunfal.
 * 2. Ao pressionar Espaço/toque, aplica um impulso vertical balístico que rompe a superfície marinha.
 * 3. Simula rotação aérea orgânica e splashdown com partículas de espuma, gotas e ondas.
 * 4. Transiciona suavemente para a tela de vitória ao término do evento.
 *
 * @param config - Objeto de configuração contendo o motor, jogador, estado e callback.
 */
export function setupBreachSystem(config: BreachSystemConfig) {
  const { k, playerController, gameState, onBreachComplete, showPrompt = true } = config;

  let promptBanner: any = null;
  let isBreachTriggered = false;
  let hasLeftWater = false;
  let isBreachFinished = false;
  let bannerAnimTime = 0;
  let breachTimer = 0;

  const triggerDistance = GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 300; // 26.700m

  k.onUpdate(() => {
    if (isBreachFinished) return;

    const playerPos = playerController.gameObj.pos;

    // 1. Exibição do Convite Visual ao se aproximar da Ilha do Farol
    if (playerPos.x >= triggerDistance && !isBreachTriggered) {
      if (showPrompt) {
        if (!promptBanner) {
          promptBanner = k.add([
            k.text(
              "ÁGUAS CALMAS DE ARRAIAL! 🐋\nPRESSIONE [ESPAÇO] OU TOQUE PARA O SALTO MAJESTOSO!",
              {
                size: 16,
                font: "Outfit",
                align: "center",
                lineSpacing: 6,
              }
            ),
            k.pos(k.width() / 2, 60),
            k.color(255, 220, 100),
            k.outline(3, k.rgb(10, 30, 60)),
            k.anchor("center"),
            k.fixed(),
            k.z(150),
            k.opacity(1),
          ]);
        }

        bannerAnimTime += k.dt() * 4;
        promptBanner.opacity = 0.7 + Math.sin(bannerAnimTime) * 0.3;
      }

      // Dispara o salto se o jogador pressionar Espaço, Enter, Toque/Clique OU se cruzar a linha de 27.000m
      const isInputTriggered =
        k.isKeyPressed("space") ||
        k.isKeyPressed("enter") ||
        k.isMousePressed() ||
        (k.isTouchStarted && k.isTouchStarted());

      if (isInputTriggered || playerPos.x >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE) {
        startBreachSequence();
      }
    }

    // 2. Monitoramento da Trajetória Aérea durante o Salto
    if (isBreachTriggered && !isBreachFinished) {
      breachTimer += k.dt();

      // Verifica se a baleia rompeu a superfície para o céu
      if (playerPos.y < GAME_CONFIG.SEA_LEVEL) {
        hasLeftWater = true;

        // Partículas douradas e de vapor reluzente na trilha aérea da baleia
        if (Math.random() < 0.6) {
          const sparkle = k.add([
            k.circle(k.rand(2, 4)),
            k.pos(playerPos.x - k.rand(10, 25), playerPos.y + k.rand(-10, 10)),
            k.color(255, 235, 140),
            k.opacity(0.85),
            k.z(15),
          ]);
          sparkle.onUpdate(() => {
            sparkle.opacity -= k.dt() * 1.8;
            sparkle.pos.y += k.dt() * 15;
            if (sparkle.opacity <= 0) k.destroy(sparkle);
          });
        }
      }

      // 3. Reentrada triunfal na água (Splashdown) OU Failsafe de tempo (2.5s)
      const didSplashdown = hasLeftWater && playerPos.y >= GAME_CONFIG.SEA_LEVEL;
      const isTimeout = breachTimer >= 2.5;

      if (didSplashdown || isTimeout) {
        isBreachFinished = true;
        playerController.completeBreach();

        // Grande estrondo de água e tremor
        audioSystem.playWaterSplash();
        k.shake(8);

        // Explosão majestosa de reentrada (Splashdown) em arco simétrico (Fase 31.1)
        createBreachReentrySplash(k, k.vec2(playerPos.x, GAME_CONFIG.SEA_LEVEL), 24);

        // Remove banner se ainda existir
        if (promptBanner) {
          k.destroy(promptBanner);
          promptBanner = null;
        }

        // Aguarda a água acalmar e chama a tela de vitória
        k.wait(0.6, () => {
          onBreachComplete();
        });
      }
    }
  });

  function startBreachSequence() {
    if (isBreachTriggered) return;
    isBreachTriggered = true;

    // Registra o salto no estado para conceder o bônus de 500 pts e a Sabedoria Ancestral
    gameState.triggerBreach();
    analytics.trackBreachTriggered({ distance: gameState.getDistance(), speed: 280 });

    // Ativa estado de salto no jogador
    playerController.startBreach();

    // Som de decolagem majestosa
    audioSystem.playBreachLaunch();

    // Impulso acrobático para cima e para a frente
    playerController.setSpeed(k.vec2(280, -480));

    // Primeiro splash ao romper a água
    const playerPos = playerController.gameObj.pos;
    createWaterSplash(k, k.vec2(playerPos.x, GAME_CONFIG.SEA_LEVEL), 20);

    if (promptBanner) {
      promptBanner.text = "SALTO MAJESTOSO EXECUTADO! ✨ +500 PTS";
      promptBanner.color = k.rgb(100, 255, 200);
      k.tween(1, 0, 1.2, (val) => {
        if (promptBanner) promptBanner.opacity = val;
      }).then(() => {
        if (promptBanner) {
          k.destroy(promptBanner);
          promptBanner = null;
        }
      });
    }
  }
}

/**
 * Cria partículas de espuma, borrifos balísticos e ondulações 16-bits no impacto do mergulho ou rompimento.
 *
 * Gera três camadas de efeitos visuais:
 * 1. Gotas de spray balístico com gravidade simulada e fade-out.
 * 2. Ondas de espuma bidirecionais expandindo na superfície d'água.
 * 3. Micro-bolhas submersas que afundam pelo impacto e retornam à superfície.
 *
 * @param k - Instância do contexto Kaboom.js.
 * @param pos - Posição do ponto de contato na linha d'água (x, y).
 * @param particleCount - Quantidade de gotículas balísticas geradas (padrão: 26).
 */
export function createWaterSplash(
  k: ReturnType<typeof kaboom>,
  pos: any,
  particleCount: number = 26
) {
  // 1. Gotículas de spray em pixel art 16-bits (quadrados angulares com paleta aquática retrô)
  for (let i = 0; i < particleCount; i++) {
    const angle = k.rand(-155, -25);
    const rad = k.deg2rad(angle);
    const speed = k.rand(140, 360);
    const velX = Math.cos(rad) * speed;
    const velY = Math.sin(rad) * speed;
    const size = k.rand(3, 6);

    const colors = [k.rgb(255, 255, 255), k.rgb(190, 240, 255), k.rgb(120, 215, 255)];
    const dropColor = colors[Math.floor(Math.random() * colors.length)];

    const drop = k.add([
      k.rect(size, size),
      k.pos(pos.x + k.rand(-18, 18), pos.y - 2),
      k.color(dropColor),
      k.outline(1, k.rgb(60, 140, 210)),
      k.opacity(0.95),
      k.z(20),
    ]);

    let dropVelY = velY;
    drop.onUpdate(() => {
      drop.pos.x += velX * k.dt();
      drop.pos.y += dropVelY * k.dt();
      dropVelY += 560 * k.dt(); // Gravidade sobre a gota
      drop.opacity -= k.dt() * 1.5;

      if (drop.opacity <= 0 || drop.pos.y > pos.y + 40) {
        k.destroy(drop);
      }
    });
  }

  // 2. Ondas de espuma 16-bits expandindo na superfície para esquerda e direita
  [-1, 1].forEach((dir) => {
    const foam = k.add([
      k.rect(12, 4),
      k.pos(pos.x + dir * 8, pos.y - 1),
      k.color(240, 252, 255),
      k.outline(1, k.rgb(100, 180, 240)),
      k.opacity(0.9),
      k.z(19),
    ]);

    let foamWidth = 12;
    foam.onUpdate(() => {
      foam.pos.x += dir * 140 * k.dt();
      foamWidth += 45 * k.dt();
      foam.width = foamWidth;
      foam.opacity -= k.dt() * 2.2;
      if (foam.opacity <= 0) k.destroy(foam);
    });
  });

  // 3. Coluna de micro-bolhas submersas afundando e emergindo
  for (let b = 0; b < 8; b++) {
    const bubble = k.add([
      k.rect(2, 2),
      k.pos(pos.x + k.rand(-16, 16), pos.y + k.rand(4, 22)),
      k.color(210, 245, 255),
      k.opacity(0.85),
      k.z(18),
    ]);

    const bVelY = k.rand(20, 60);
    bubble.onUpdate(() => {
      bubble.pos.y += bVelY * k.dt() - 25 * k.dt(); // Afunda pelo choque e sobe de volta
      bubble.opacity -= k.dt() * 1.8;
      if (bubble.opacity <= 0) k.destroy(bubble);
    });
  }
}

export interface BreachSplashParticleData {
  dir: number; // -1 (esquerda) ou 1 (direita)
  velX: number;
  velY: number;
  width: number;
  height: number;
  gravityY: number;
}

/**
 * Função pura que calcula as propriedades cinemáticas simétricas em arco
 * para o splash de reentrada após o breach (Fase 31.1).
 */
export function calculateBreachReentryParticleData(
  index: number,
  total: number = 24
): BreachSplashParticleData {
  const isLeft = index % 2 === 0;
  const dir = isLeft ? -1 : 1;
  const pairIndex = Math.floor(index / 2);
  const pairsTotal = Math.max(1, Math.ceil(total / 2));
  const spreadProgress = (pairIndex + 0.5) / pairsTotal; // 0.1 a 0.9

  // Arco simétrico balístico: ângulos de 35° a 75° em relação à horizontal
  const angleDeg = 35 + spreadProgress * 40;
  const rad = (angleDeg * Math.PI) / 180;
  const speed = 190 + (pairIndex % 3) * 60; // 190 a 310 px/s

  const velX = dir * Math.cos(rad) * speed;
  const velY = -Math.sin(rad) * speed; // impulso para cima

  return {
    dir,
    velX,
    velY,
    width: 3,
    height: 8,
    gravityY: 620,
  };
}

/**
 * Splash de Reentrada da Baleia após o Breach (Fase 31.1):
 * Dispara 16–24 partículas de respingo em arco simétrico (rect 3×8px brancos com gravidade),
 * metade para a esquerda e metade para a direita, acompanhadas de cristas de choque na superfície.
 */
export function createBreachReentrySplash(
  k: ReturnType<typeof kaboom>,
  pos: any,
  particleCount: number = 24
) {
  // 1. Partículas retangulares brancas de respingo em arco balístico simétrico (Fase 31.1)
  for (let i = 0; i < particleCount; i++) {
    const data = calculateBreachReentryParticleData(i, particleCount);
    const curVelX = data.velX;
    let curVelY = data.velY;

    const splashShard = k.add([
      k.rect(data.width, data.height, { radius: 1 }),
      k.pos(pos.x + k.rand(-12, 12), pos.y - 2),
      k.color(255, 255, 255),
      k.outline(1, k.rgb(180, 240, 255)),
      k.opacity(0.95),
      k.rotate(Math.atan2(curVelY, curVelX) * (180 / Math.PI) + 90),
      k.anchor("center"),
      k.z(21),
      "breach_reentry_splash",
    ]);

    splashShard.onUpdate(() => {
      const dt = k.dt();
      curVelY += data.gravityY * dt;
      splashShard.pos.x += curVelX * dt;
      splashShard.pos.y += curVelY * dt;
      splashShard.angle = Math.atan2(curVelY, curVelX) * (180 / Math.PI) + 90;
      splashShard.opacity -= dt * 1.4;

      if (splashShard.opacity <= 0 || splashShard.pos.y > pos.y + 35) {
        k.destroy(splashShard);
      }
    });
  }

  // 2. Ondas de crista de choque de alta velocidade expandindo para ambos os lados
  [-1, 1].forEach((dir) => {
    const shockWave = k.add([
      k.rect(16, 4.5, { radius: 2 }),
      k.pos(pos.x + dir * 10, pos.y - 1),
      k.color(240, 252, 255),
      k.outline(1.5, k.rgb(120, 210, 255)),
      k.opacity(0.92),
      k.z(20),
    ]);

    let waveWidth = 16;
    shockWave.onUpdate(() => {
      const dt = k.dt();
      shockWave.pos.x += dir * 210 * dt;
      waveWidth += 65 * dt;
      shockWave.width = waveWidth;
      shockWave.opacity -= dt * 2.0;
      if (shockWave.opacity <= 0) k.destroy(shockWave);
    });
  });

  // 3. Spray de micro-gotas circulares no epicentro do impacto
  for (let g = 0; g < 12; g++) {
    const drop = k.add([
      k.circle(k.rand(2, 4.5)),
      k.pos(pos.x + k.rand(-25, 25), pos.y - k.rand(2, 10)),
      k.color(220, 245, 255),
      k.opacity(0.85),
      k.z(20),
    ]);
    const dVelX = k.rand(-120, 120);
    let dVelY = k.rand(-180, -90);

    drop.onUpdate(() => {
      const dt = k.dt();
      dVelY += 520 * dt;
      drop.pos.x += dVelX * dt;
      drop.pos.y += dVelY * dt;
      drop.opacity -= dt * 1.6;
      if (drop.opacity <= 0 || drop.pos.y > pos.y + 25) {
        k.destroy(drop);
      }
    });
  }
}

import kaboom from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";

export interface BreachSystemConfig {
  k: ReturnType<typeof kaboom>;
  playerController: PlayerController;
  gameState: GameState;
  onBreachComplete: () => void;
}

/**
 * Sistema do Salto Majestoso (Breach) no Santuário de Arraial do Cabo (Ilha do Farol).
 * Convida o jogador a executar o salto da vitória com a tecla Espaço entre 26.800m e 27.000m.
 */
export function setupBreachSystem(config: BreachSystemConfig) {
  const { k, playerController, gameState, onBreachComplete } = config;

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
      if (!promptBanner) {
        promptBanner = k.add([
          k.text(
            "ÁGUAS CALMAS DE ARRAIAL! 🐋\nPRESSIONE [ESPAÇO] OU TOQUE PARA O SALTO MAJESTOSO!",
            {
              size: 15,
              font: "sans-serif",
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

        // Explosão de gotas e espuma na superfície
        createWaterSplash(k, k.vec2(playerPos.x, GAME_CONFIG.SEA_LEVEL), 40);

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
 * Cria partículas de espuma, borrifos e ondulações 16-bits no impacto do mergulho ou rompimento.
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

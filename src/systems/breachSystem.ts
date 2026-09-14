import kaboom from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";

export interface BreachSystemConfig {
  k: ReturnType<typeof kaboom>;
  playerController: any;
  gameState: any;
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

  const triggerDistance = GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 300; // 26.700m

  k.onUpdate(() => {
    if (isBreachFinished) return;

    const playerPos = playerController.gameObj.pos;

    // 1. Exibição do Convite Visual ao se aproximar da Ilha do Farol
    if (playerPos.x >= triggerDistance && !isBreachTriggered) {
      if (!promptBanner) {
        promptBanner = k.add([
          k.text("ÁGUAS CALMAS DE ARRAIAL! 🐋\nPRESSIONE [ESPAÇO] PARA O SALTO MAJESTOSO!", {
            size: 15,
            font: "sans-serif",
            align: "center",
            lineSpacing: 6,
          }),
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

      // Dispara o salto se o jogador pressionar Espaço OU se cruzar a linha final de 27.000m
      if (k.isKeyPressed("space") || playerPos.x >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE) {
        startBreachSequence();
      }
    }

    // 2. Monitoramento da Trajetória Aérea durante o Salto
    if (isBreachTriggered && !isBreachFinished) {
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

      // 3. Reentrada triunfal na água (Splashdown)
      if (hasLeftWater && playerPos.y >= GAME_CONFIG.SEA_LEVEL) {
        isBreachFinished = true;

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

        // Aguarda a água acalmar (~1s) e chama a tela de vitória
        k.wait(1.0, () => {
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
 * Cria partículas de espuma e borrifos de água no impacto ou rompimento da superfície.
 */
export function createWaterSplash(k: ReturnType<typeof kaboom>, pos: any, particleCount: number = 25) {
  for (let i = 0; i < particleCount; i++) {
    const angle = k.rand(-160, -20);
    const rad = k.deg2rad(angle);
    const speed = k.rand(120, 320);
    const velX = Math.cos(rad) * speed;
    const velY = Math.sin(rad) * speed;
    const size = k.rand(3, 7);

    const drop = k.add([
      k.circle(size),
      k.pos(pos.x + k.rand(-20, 20), pos.y),
      k.color(220, 245, 255),
      k.opacity(0.9),
      k.z(20),
    ]);

    let dropVelY = velY;
    drop.onUpdate(() => {
      drop.pos.x += velX * k.dt();
      drop.pos.y += dropVelY * k.dt();
      dropVelY += 450 * k.dt(); // Gravidade sobre a gota
      drop.opacity -= k.dt() * 1.4;

      if (drop.opacity <= 0 || drop.pos.y > pos.y + 40) {
        k.destroy(drop);
      }
    });
  }
}

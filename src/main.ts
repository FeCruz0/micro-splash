import kaboom from "kaboom";
import { GAME_CONFIG, TAGS } from "./config";
import { createPlayer } from "./entities/player";
import { createTrash } from "./entities/trash";
import { createKrill } from "./entities/krill";
import { createRescueBoat } from "./entities/boat";
import { setupCollisions } from "./systems/collisions";
import { createGameState } from "./systems/state";
import { showRescueScreen } from "./ui/rescueScreen";
import { createGhostNet } from "./entities/net";
import { setupUpwellingSystem } from "./systems/upwellingSystem";
import { showVictoryScreen } from "./ui/victoryScreen";
import { updateOceanColors } from "./systems/oceanEnvironment";
import { createDebugDistanceUI } from "./ui/debugDistance";
import { showFactPopup } from "./ui/factPopup";
import { setupIceSurfaceSystem } from "./systems/iceSurface";
import { setupBackgroundFaunaSystem } from "./systems/backgroundFauna";
import { setupShipNoiseSystem } from "./systems/shipNoiseSystem";
import { setupCanyonSystem } from "./systems/canyonSystem";

const k = kaboom({
  background: [8, 16, 32],
});

k.loadSprite("baleia", "https://kaboomjs.com/sprites/bean.png");

// Define a cena do jogo principal
k.scene("game", () => {
  let isGameFinished = false;
  k.setGravity(GAME_CONFIG.GRAVITY);

  // Overlay de Fade-In para suavizar a entrada no jogo
  const fadeOverlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(8, 16, 32),
    k.opacity(1),
    k.fixed(),
    k.z(100),
  ]);

  k.tween(1, 0, 0.8, (val) => {
    fadeOverlay.opacity = val;
  }, k.easings.easeOutQuad).then(() => {
    k.destroy(fadeOverlay);
  });

  // Limites do mar
  const oceanFloor = k.add([
    k.rect(k.width(), 40),
    k.pos(0, k.height() - 40),
    k.area(),
    k.body({ isStatic: true }),
    k.color(20, 50, 120),
  ]);

  // Tag da superfície usando TAGS.SURFACE:
  const waterSurface = k.add([
    k.rect(k.width(), 40),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(20, 50, 120),
    TAGS.SURFACE,
  ]);

  // 1. Instancia Estado, Jogador e UI de Debug
  const gameState = createGameState();
  const playerController = createPlayer(k);
  const debugDistanceUI = createDebugDistanceUI(k);

  // 2. Inicializa os Sistemas dos 5 Biomas (Fase 2)
  setupIceSurfaceSystem(k);
  setupBackgroundFaunaSystem(k);
  setupShipNoiseSystem(k, playerController);
  setupCanyonSystem(k);

  // 3. Instancia objetos no caminho (Lixo, Krill na Antártida, Redes)
  createTrash(k, k.vec2(13000, 250));
  createTrash(k, k.vec2(15000, 300));
  createTrash(k, k.vec2(17000, 200));

  // Cardumes de Krill - Banquete Polar Antártico (25 cardumes entre 300m e 4.800m)
  const antarcticKrillPositions = [
    // Primeiro banquete próximo ao início (300m - 1.000m)
    k.vec2(350, 180),
    k.vec2(420, 240),
    k.vec2(500, 160),
    k.vec2(650, 220),
    k.vec2(800, 300),
    k.vec2(950, 180),

    // Segundo aglomerado (1.100m - 2.000m)
    k.vec2(1150, 260),
    k.vec2(1280, 190),
    k.vec2(1450, 320),
    k.vec2(1600, 210),
    k.vec2(1750, 280),
    k.vec2(1900, 170),

    // Terceiro aglomerado (2.100m - 3.200m)
    k.vec2(2150, 230),
    k.vec2(2300, 310),
    k.vec2(2450, 180),
    k.vec2(2650, 260),
    k.vec2(2850, 200),
    k.vec2(3050, 330),

    // Quarto aglomerado (3.300m - 4.200m)
    k.vec2(3300, 220),
    k.vec2(3500, 170),
    k.vec2(3700, 290),
    k.vec2(3900, 240),
    k.vec2(4100, 190),

    // Última reserva antes do alto mar (4.300m - 4.800m)
    k.vec2(4350, 270),
    k.vec2(4650, 210),
  ];

  antarcticKrillPositions.forEach((pos) => {
    createKrill(k, pos);
  });

  // Redes fantasmas (Costa Urbana 12000m - 18000m)
  createGhostNet(k, k.vec2(13500, 250));
  createGhostNet(k, k.vec2(15800, 250));
  createGhostNet(k, k.vec2(17500, 250));  

  // 4. Ativa colisões e ressurgência
  setupCollisions(k, playerController, gameState);
  setupUpwellingSystem(k, playerController);

  let isRescueSequenceStarted = false;

  // 4. Loop Principal
  k.onUpdate(() => {
    const playerXPosition = playerController.gameObj.pos.x;
    
    // checagem de vitória (27000m)
    if (playerXPosition >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE && !isGameFinished) {
      isGameFinished = true;
      k.shake(4);
      showVictoryScreen(k, gameState, () => {
        k.go("game"); // reinicia nova partida
      });
      return;
    }

    // Se a baleia não desmaiou, atualiza distância e verifica gatilhos pedagógicos
    if (!isGameFinished && !playerController.isFainting()) {
      gameState.update(k.dt(), playerXPosition);
      gameState.checkFacts(playerXPosition, (fact) => {
        showFactPopup(k, fact);
      });
    } else if (playerController.isFainting() && !isRescueSequenceStarted && !isGameFinished) {
      // SE A BALEIA DESMAIOU: Inicia a sequência de resgate da Guarda Marítima!
      isRescueSequenceStarted = true;

      // Spawna o barco da Guarda Marítima na superfície acima da baleia
      createRescueBoat(k, playerController.gameObj.pos);

      // Espera 3.5 segundos (tempo do barco chegar) e exibe o relatório
      k.wait(3.5, () => {
        showRescueScreen(k, gameState, () => {
          k.go("game"); // Reinicia a cena limpa!
        });
      });
    }

    oceanFloor.pos.x = k.camPos().x - k.width() / 2;
    waterSurface.pos.x = k.camPos().x - k.width() / 2;
    
    // Update ocean colors and debug UI based on distance
    updateOceanColors(k, playerXPosition, waterSurface, oceanFloor);
    debugDistanceUI.update(playerXPosition);
  });
});

// Inicia a cena do jogo
k.go("game");

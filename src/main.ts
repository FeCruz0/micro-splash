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
import { setupOceanCurrentsSystem } from "./systems/oceanCurrentsSystem";
import { audioSystem } from "./systems/audioSystem";
import { setupBreachSystem } from "./systems/breachSystem";

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

  // Teto do céu para impedir que a baleia saia da tela por cima
  const skyCeiling = k.add([
    k.rect(k.width(), 10),
    k.pos(0, -10),
    k.area(),
    k.body({ isStatic: true }),
  ]);

  // Área do céu acima do nível do mar (0px a 80px - área dobrada para céu/nuvens)
  const skyBand = k.add([
    k.rect(k.width(), GAME_CONFIG.SEA_LEVEL),
    k.pos(0, 0),
    k.color(120, 190, 245),
    k.z(-10),
    "sky",
  ]);

  // Tag da superfície posicionada no nível do mar (80px):
  const waterSurface = k.add([
    k.rect(k.width(), 14),
    k.pos(0, GAME_CONFIG.SEA_LEVEL),
    k.area(),
    k.color(20, 50, 120),
    k.z(1),
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
  setupOceanCurrentsSystem(k, playerController);
  setupCanyonSystem(k);

  // 3. Instancia objetos no caminho (Lixo plástico, Krill na Antártida, Redes fantasmas)
  // Lixo plástico (Costa Urbana e Área dos Navios: 12.000m - 19.000m)
  const urbanTrashPositions = [
    k.vec2(12300, 200),
    k.vec2(12700, 310),
    k.vec2(13100, 160),
    k.vec2(13600, 280),
    k.vec2(14100, 220),
    k.vec2(14600, 330),
    k.vec2(15100, 180),
    k.vec2(15600, 290),
    k.vec2(16200, 240),
    k.vec2(16800, 320),
    k.vec2(17300, 190),
    k.vec2(17900, 270),
    k.vec2(18400, 210),
    k.vec2(18800, 300),
  ];
  urbanTrashPositions.forEach((pos) => {
    createTrash(k, pos);
  });

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

  // Redes fantasmas (Costa Urbana e Área dos Navios: 12.000m - 19.000m)
  const ghostNetPositions = [
    k.vec2(12500, 260),
    k.vec2(13300, 220),
    k.vec2(14300, 280),
    k.vec2(15300, 240),
    k.vec2(16400, 300),
    k.vec2(17100, 210),
    k.vec2(17700, 290),
    k.vec2(18600, 250),
  ];
  ghostNetPositions.forEach((pos) => {
    createGhostNet(k, pos);
  });  

  // Lixo plástico (elevado mais 55 pixels)
  const floorTrashY = k.height() - 220;
  const oceanFloorTrashPositions = [
    // Área dos Navios / Costa Urbana (12.000m - 19.000m)
    k.vec2(12400, floorTrashY),
    k.vec2(12850, floorTrashY),
    k.vec2(13400, floorTrashY),
    k.vec2(13850, floorTrashY),
    k.vec2(14400, floorTrashY),
    k.vec2(14900, floorTrashY),
    k.vec2(15450, floorTrashY),
    k.vec2(16100, floorTrashY),
    k.vec2(16650, floorTrashY),
    k.vec2(17250, floorTrashY),
    k.vec2(17800, floorTrashY),
    k.vec2(18350, floorTrashY),
    k.vec2(18900, floorTrashY),

    // Faixa de Cânions e Sedimentos (19.500m - 24.500m)
    k.vec2(19600, floorTrashY),
    k.vec2(20300, floorTrashY),
    k.vec2(21300, floorTrashY),
    k.vec2(22400, floorTrashY),
    k.vec2(23600, floorTrashY),
    k.vec2(24400, floorTrashY),
  ];
  oceanFloorTrashPositions.forEach((pos) => {
    createTrash(k, pos);
  });

  // Redes fantasmas (posicionadas 55 pixels acima dos lixos)
  const floorNetY = floorTrashY - 55;
  const oceanFloorNetPositions = [
    // Área dos Navios / Costa Urbana (12.000m - 19.000m)
    k.vec2(12650, floorNetY),
    k.vec2(13600, floorNetY),
    k.vec2(14750, floorNetY),
    k.vec2(15900, floorNetY),
    k.vec2(17050, floorNetY),
    k.vec2(18150, floorNetY),
    k.vec2(18750, floorNetY),

    // Faixa de Cânions e Costões (19.500m - 24.500m)
    k.vec2(20100, floorNetY),
    k.vec2(21500, floorNetY),
    k.vec2(22800, floorNetY),
    k.vec2(24100, floorNetY),
  ];
  oceanFloorNetPositions.forEach((pos) => {
    createGhostNet(k, pos);
  });  

  // 4. Inicializa o Áudio Procedural na primeira interação do jogador
  let audioStarted = false;
  const startAudioOnInteraction = () => {
    if (!audioStarted) {
      audioStarted = true;
      audioSystem.init();
    }
    audioSystem.resumeIfSuspended();
  };

  k.onKeyPress(startAudioOnInteraction);
  k.onMousePress(startAudioOnInteraction);

  // Tecla 'M': Silenciar / Ativar Som
  k.onKeyPress("m", () => {
    startAudioOnInteraction();
    audioSystem.toggleMute();
  });

  // 5. Ativa colisões, ressurgência e o clímax do Salto Majestoso (Breach)
  setupCollisions(k, playerController, gameState);
  setupUpwellingSystem(k, playerController);

  setupBreachSystem({
    k,
    playerController,
    gameState,
    onBreachComplete: () => {
      if (!isGameFinished) {
        isGameFinished = true;
        audioSystem.pauseAmbient();
        showVictoryScreen(k, gameState, () => {
          audioSystem.resumeAmbient();
          k.go("game");
        });
      }
    },
  });

  let isRescueSequenceStarted = false;

  // 6. Loop Principal
  k.onUpdate(() => {
    const playerXPosition = playerController.gameObj.pos.x;
    
    // Fallback de segurança para conclusão caso ultrapasse a rota
    if (playerXPosition >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE + 200 && !isGameFinished) {
      isGameFinished = true;
      audioSystem.pauseAmbient();
      showVictoryScreen(k, gameState, () => {
        audioSystem.resumeAmbient();
        k.go("game");
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

      // Interrompe imediatamente os sons ambientes e cantos de baleia ao morrer/desmaiar
      audioSystem.pauseAmbient();

      // Spawna o barco da Guarda Marítima na superfície acima da baleia
      createRescueBoat(k, playerController.gameObj.pos);

      // Espera 3.5 segundos (tempo do barco chegar) e exibe o relatório
      k.wait(3.5, () => {
        showRescueScreen(k, gameState, () => {
          audioSystem.resumeAmbient();
          k.go("game"); // Reinicia a cena limpa!
        });
      });
    }

    oceanFloor.pos.x = k.camPos().x - k.width() / 2;
    waterSurface.pos.x = k.camPos().x - k.width() / 2;
    skyBand.pos.x = k.camPos().x - k.width() / 2;
    skyCeiling.pos.x = k.camPos().x - k.width() / 2;
    
    // Update ocean colors and debug UI based on distance
    updateOceanColors(k, playerXPosition, waterSurface, oceanFloor, skyBand);
    debugDistanceUI.update(playerXPosition);
  });
});

// Inicia a cena do jogo
k.go("game");

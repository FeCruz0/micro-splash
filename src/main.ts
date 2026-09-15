import kaboom from "kaboom";
import { GAME_CONFIG, TAGS } from "./config";
import { createPlayer } from "./entities/player";
import { createTrash } from "./entities/trash";
import { createKrill } from "./entities/krill";
import { createRescueBoat } from "./entities/boat";
import { setupCollisions } from "./systems/collisions";
import { createGameState, type GameOptions } from "./systems/state";
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

// Interfaces da Fase 6: Menu Principal, Seleção de Modo, Opções e Codex
import { createMainMenu } from "./ui/mainMenu";
import { showModeSelectScreen } from "./ui/modeSelectScreen";
import { showOptionsScreen } from "./ui/optionsScreen";
import { showCodexScreen } from "./ui/codexScreen";
import { showChallengeEndScreen } from "./ui/challengeEndScreen";

const k = kaboom({
  background: [6, 18, 42],
});

k.loadSprite("baleia", "/sprites/whale.png", {
  sliceX: 4,
  sliceY: 1,
  anims: {
    glide: 0,
    stroke_up: 1,
    stroke_down: 2,
    swim: { from: 1, to: 2, loop: true, speed: 6 },
    feed: 3,
  },
});

// =============================================================================
// CENA DO MENU PRINCIPAL (Fase 6)
// =============================================================================
k.scene("menu", () => {
  createMainMenu(
    k,
    // Iniciar Migração -> Abre Seletor de Modo de Jogo
    (onClose) => {
      showModeSelectScreen(
        k,
        (selectedOptions) => {
          k.go("game", selectedOptions);
        },
        onClose
      );
    },
    // Opções de Áudio
    (onClose) => {
      showOptionsScreen(k, onClose);
    },
    // Diário de Bordo (Codex)
    (onClose) => {
      showCodexScreen(k, onClose);
    }
  );
});

// =============================================================================
// CENA DO JOGO PRINCIPAL (Fase 1 a 6)
// =============================================================================
k.scene("game", (options: GameOptions = { mode: "standard" }) => {
  let isGameFinished = false;
  k.setGravity(GAME_CONFIG.GRAVITY);

  // Posição inicial no mapa com base no modo selecionado
  let initialX = 120;
  if (options.mode === "quick_challenge") {
    if (options.startBiome === 2) initialX = 12200; // Costa Urbana
    else if (options.startBiome === 3) initialX = 19200; // Arraial do Cabo
    else initialX = 120; // Antártica
  }

  // Overlay de Fade-In para suavizar a entrada no jogo
  const fadeOverlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 18, 42),
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

  // Área do céu acima do nível do mar (0px a 80px)
  const skyBand = k.add([
    k.rect(k.width(), GAME_CONFIG.SEA_LEVEL),
    k.pos(0, 0),
    k.color(120, 190, 245),
    k.z(-10),
    "sky",
  ]);

  // Tag da superfície posicionada no nível do mar (80px)
  const waterSurface = k.add([
    k.rect(k.width(), 14),
    k.pos(0, GAME_CONFIG.SEA_LEVEL),
    k.area(),
    k.color(20, 50, 120),
    k.z(1),
    TAGS.SURFACE,
  ]);

  // 1. Instancia Estado, Jogador e UI de Debug
  const gameState = createGameState(options);
  const playerController = createPlayer(k, initialX, options.mode === "serene");
  const debugDistanceUI = createDebugDistanceUI(k);

  // HUD adicional de modo no topo direito
  let timerUI: any = null;
  if (options.mode === "quick_challenge") {
    timerUI = k.add([
      k.text("⏱️ 60s", { size: 16, font: "sans-serif" }),
      k.pos(k.width() - 110, 18),
      k.color(255, 220, 80),
      k.fixed(),
      k.z(150),
    ]);
  } else if (options.mode === "serene") {
    k.add([
      k.text("🌸 Migração Serena (∞)", { size: 14, font: "sans-serif" }),
      k.pos(k.width() - 190, 18),
      k.color(140, 255, 200),
      k.fixed(),
      k.z(150),
    ]);
  }

  // 2. Inicializa os Sistemas dos 5 Biomas
  setupIceSurfaceSystem(k);
  setupBackgroundFaunaSystem(k);
  setupShipNoiseSystem(k, playerController);
  setupOceanCurrentsSystem(k, playerController);
  setupCanyonSystem(k);

  // 3. Instancia objetos no caminho (Lixo plástico, Krill, Redes fantasmas)
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
    k.vec2(16700, 350),
    k.vec2(17200, 190),
    k.vec2(17800, 270),
    k.vec2(18300, 320),
    k.vec2(18800, 210),
  ];
  urbanTrashPositions.forEach((pos) => {
    createTrash(k, pos);
  });

  const antarcticKrillPositions = [
    k.vec2(400, 220),
    k.vec2(900, 310),
    k.vec2(1400, 180),
    k.vec2(1900, 260),
    k.vec2(2400, 340),
    k.vec2(2900, 200),
    k.vec2(3400, 280),
    k.vec2(3900, 160),
    k.vec2(4400, 320),
    k.vec2(4800, 240),
  ];
  antarcticKrillPositions.forEach((pos) => {
    createKrill(k, pos);
  });

  const floorNetY = k.height() - 40 - 24;
  const oceanFloorNetPositions = [
    k.vec2(6000, floorNetY),
    k.vec2(8500, floorNetY),
    k.vec2(10500, floorNetY),
    k.vec2(12800, floorNetY),
    k.vec2(14500, floorNetY),
    k.vec2(16500, floorNetY),
    k.vec2(18200, floorNetY),
    k.vec2(20100, floorNetY),
    k.vec2(21500, floorNetY),
    k.vec2(22800, floorNetY),
    k.vec2(24100, floorNetY),
  ];
  oceanFloorNetPositions.forEach((pos) => {
    createGhostNet(k, pos);
  });  

  // 4. Inicializa áudio da migração e atalhos
  audioSystem.startMigrationAudio(initialX);

  const resumeAudioOnInteraction = () => {
    audioSystem.resumeIfSuspended();
  };

  k.onKeyPress(resumeAudioOnInteraction);
  k.onMousePress(resumeAudioOnInteraction);

  // Tecla 'M': Silenciar / Ativar Som
  k.onKeyPress("m", () => {
    resumeAudioOnInteraction();
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
          audioSystem.stopMigrationAudio();
          k.go("menu");
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
        audioSystem.stopMigrationAudio();
        k.go("menu");
      });
      return;
    }

    // Atualiza o cronômetro do Desafio de 1 Minuto da Feira
    if (timerUI && options.mode === "quick_challenge") {
      const remaining = gameState.getTimeRemaining();
      timerUI.text = `⏱️ ${remaining}s`;
      if (remaining <= 10) {
        timerUI.color = k.rgb(255, 80, 80);
      }
    }

    // Verifica término do desafio de 1 minuto
    if (options.mode === "quick_challenge" && gameState.isTimeUp() && !isGameFinished) {
      isGameFinished = true;
      audioSystem.pauseAmbient();
      showChallengeEndScreen(
        k,
        gameState,
        () => {
          k.go("game", options);
        },
        () => {
          audioSystem.stopMigrationAudio();
          k.go("menu");
        }
      );
      return;
    }

    // Se a baleia não desmaiou, atualiza distância e verifica gatilhos pedagógicos
    if (!isGameFinished && !playerController.isFainting()) {
      gameState.update(k.dt(), playerXPosition);
      gameState.checkFacts(playerXPosition, (fact) => {
        showFactPopup(k, fact);
      });
      // Sincroniza a trilha sonora adaptativa 16-bit com o bioma atual
      audioSystem.updateBiomeTrack(playerXPosition);
    } else if (playerController.isFainting() && !isRescueSequenceStarted && !isGameFinished) {
      // SE A BALEIA DESMAIOU: Inicia a sequência de resgate da Guarda Marítima
      isRescueSequenceStarted = true;

      // Interrompe imediatamente os sons ambientes e cantos de baleia ao morrer/desmaiar
      audioSystem.pauseAmbient();

      // Spawna o barco da Guarda Marítima na superfície acima da baleia
      createRescueBoat(k, playerController.gameObj.pos);

      // Espera 3.5 segundos (tempo do barco chegar) e exibe o relatório
      k.wait(3.5, () => {
        showRescueScreen(k, gameState, () => {
          audioSystem.stopMigrationAudio();
          k.go("menu");
        });
      });
    }

    oceanFloor.pos.x = k.camPos().x - k.width() / 2;
    waterSurface.pos.x = k.camPos().x - k.width() / 2;
    skyBand.pos.x = k.camPos().x - k.width() / 2;
    skyCeiling.pos.x = k.camPos().x - k.width() / 2;
    
    // Atualiza cores do oceano e UI de distância
    updateOceanColors(k, playerXPosition, waterSurface, oceanFloor, skyBand);
    debugDistanceUI.update(playerXPosition);
  });
});

// Inicia o jogo no Menu Principal (Fase 6)
k.go("menu");

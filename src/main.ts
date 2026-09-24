import kaboom from "kaboom";
import { GAME_CONFIG, TAGS, getSavedResolution, getSavedDisplayMode } from "./config";
import { createPlayer } from "./entities/player";
import { createRescueBoat } from "./entities/boat";
import { setupCollisions } from "./systems/collisions";
import { createGameState, type GameOptions } from "./systems/state";
import { showRescueScreen } from "./ui/rescueScreen";
import { loadLevelLayout } from "./systems/levelLoader";
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
import { setupLightRaysSystem } from "./systems/lightRaysSystem";
import { setupParallaxSkySystem } from "./systems/parallaxSkySystem";
import { setupBenthicFloorSystem } from "./systems/benthicFloorSystem";
import { setupOceanFloorSystem } from "./systems/oceanFloorSystem";
import { setupOilSpillSystem } from "./systems/oilSpillSystem";
import { setupDolphinDraftingSystem } from "./systems/dolphinDraftingSystem";
import { setupPenguinFlockSystem } from "./systems/penguinFlockSystem";
import { setupWeatherSystem } from "./systems/weatherSystem";
import { setupBioluminescenceSystem } from "./systems/bioluminescenceSystem";
import { setupBiomeVignetteSystem } from "./systems/biomeVignetteSystem";
import { setupCinematicCameraSystem } from "./systems/cinematicCameraSystem";
import { setupDynamicShadowSystem } from "./systems/dynamicShadowSystem";
import { createKioskScene } from "./systems/kioskMode";
import { setupTouchControls } from "./ui/touchControls";
import { initParticlePool } from "./systems/particlePool";
import { initBiomeLifecycleManager } from "./systems/biomeLifecycleManager";
import { recordMigrationStart, recordMigrationEnd } from "./systems/cumulativeStats";
import { initPresentationMode } from "./systems/presentationMode";
import { accessibilitySystem } from "./systems/accessibilitySystem";
import { gamepadSystem } from "./systems/gamepadSystem";

// Interfaces da Fase 6: Menu Principal, Seleção de Modo, Opções e Codex
import { createMainMenu } from "./ui/mainMenu";
import { showModeSelectScreen } from "./ui/modeSelectScreen";
import { showOptionsScreen } from "./ui/optionsScreen";
import { showCodexScreen } from "./ui/codexScreen";
import { showChallengeEndScreen } from "./ui/challengeEndScreen";
import { showLeaderboardScreen } from "./ui/leaderboardScreen";
import { createSplashScreen } from "./ui/splashScreen";
import { hasSeenOnboarding, showOnboardingModal } from "./ui/onboardingModal";

const resolution = getSavedResolution();
const displayMode = getSavedDisplayMode();
const isLetterbox = displayMode === "letterbox";

const k = kaboom({
  width: resolution.width,
  height: resolution.height,
  letterbox: isLetterbox,
  stretch: !isLetterbox,
  background: [6, 18, 42],
});

accessibilitySystem.init();

// Suporte global para alternar Tela Cheia com F11
k.onKeyPress("f11", () => {
  k.setFullscreen(!k.isFullscreen());
});

k.loadSprite("baleia", "/sprites/whale.png", {
  sliceX: 8,
  sliceY: 1,
  anims: {
    glide: 0,
    stroke_up: { from: 1, to: 2, speed: 10 },
    stroke_down: { from: 3, to: 6, speed: 12 },
    swim: { from: 1, to: 6, loop: true, speed: 8 },
    feed: 7,
  },
});

// =============================================================================
// CENA DE SPLASH SCREEN / INTRODUÇÃO ANIMADA (Fase 13)
// =============================================================================
k.scene("splash", () => {
  createSplashScreen(k, () => {
    k.go("menu");
  });
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
    // Opções
    (onClose) => {
      showOptionsScreen(k, onClose);
    },
    // Diário de Bordo (Codex)
    (onClose) => {
      showCodexScreen(k, onClose);
    },
    // Ranking Top 10
    (onClose) => {
      showLeaderboardScreen(k, onClose);
    }
  );

  // Fase 21: Se for a primeira inicialização do jogo (totens ou novos jogadores), exibe o onboarding contextual
  if (!hasSeenOnboarding()) {
    showOnboardingModal(k, () => {});
  }
});

// =============================================================================
// CENA DO MODO KIOSK (Fase 10: Attract Mode / Demonstração Autônoma)
// =============================================================================
k.scene("kiosk", () => {
  createKioskScene(k);
});

// =============================================================================
// CENA DO JOGO PRINCIPAL (Fase 1 a 10)
// =============================================================================
k.scene("game", (options: GameOptions = { mode: "standard" }) => {
  let isGameFinished = false;
  k.setGravity(GAME_CONFIG.GRAVITY);

  // Posição inicial no mapa com base no modo selecionado
  let initialX = 120;
  if (options.mode === "quick_challenge") {
    if (options.startBiome === 2)
      initialX = 12200; // Costa Urbana
    else if (options.startBiome === 3)
      initialX = 19200; // Arraial do Cabo
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

  k.tween(
    1,
    0,
    0.8,
    (val) => {
      fadeOverlay.opacity = val;
    },
    k.easings.easeOutQuad
  ).then(() => {
    k.destroy(fadeOverlay);
  });

  // Limites do mar
  const oceanFloor = k.add([
    k.rect(k.width() * 2, 60),
    k.pos(-k.width() / 2, k.height() - 40),
    k.area(),
    k.body({ isStatic: true }),
    k.color(20, 50, 120),
  ]);

  // Área do céu acima do nível do mar (0px a 80px)
  const skyBand = k.add([
    k.rect(k.width() * 2, GAME_CONFIG.SEA_LEVEL),
    k.pos(-k.width() / 2, 0),
    k.color(120, 190, 245),
    k.z(-10),
    "sky",
  ]);

  // Tag da superfície posicionada no nível do mar (80px)
  const waterSurface = k.add([
    k.rect(k.width() * 2, 14),
    k.pos(-k.width() / 2, GAME_CONFIG.SEA_LEVEL),
    k.area(),
    k.color(20, 50, 120),
    k.z(1),
    TAGS.SURFACE,
  ]);

  // 1. Instancia Controles Touch, Estado, Jogador e UI de Debug
  const touchControls = setupTouchControls(k);
  k.onSceneLeave(() => {
    touchControls.destroy();
  });
  const gameState = createGameState(options);
  const playerController = createPlayer(
    k,
    initialX,
    options.mode === "serene",
    touchControls.state
  );
  const debugDistanceUI = createDebugDistanceUI(k, playerController);

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
  } else if (options.mode === "weekly") {
    k.add([
      k.text(`📅 Desafio Semanal (#${options.seed || "Semanal"})`, {
        size: 14,
        font: "sans-serif",
      }),
      k.pos(k.width() - 260, 18),
      k.color(255, 220, 80),
      k.fixed(),
      k.z(150),
    ]);
  }

  // 1.5. Registra Início da Jornada no Dashboard Coletivo (Fase 16)
  recordMigrationStart();
  let isStatsRecorded = false;
  const recordEndOnce = (completed: boolean) => {
    if (isStatsRecorded) return;
    isStatsRecorded = true;
    recordMigrationEnd(
      gameState.getDistance(),
      gameState.getKrillCount(),
      gameState.getTrashCount(),
      gameState.getElapsedTime(),
      completed
    );
  };

  // 2. Instancia obstáculos, krill, redes e bolsões de ar procedurais (com semente determinística caso informada)
  const obstacleData = loadLevelLayout(k, true, options.seed);

  // 2.5. Inicializa Núcleo de Otimização & Performance (Fase 15) e Apresentação (Fase 16)
  const particlePool = initParticlePool(k);
  const biomeManager = initBiomeLifecycleManager(k);
  const presentationMode = initPresentationMode(k, playerController);

  // 3. Inicializa os Sistemas dos 5 Biomas e Correntezas Oceânicas Procedurais
  setupIceSurfaceSystem(k, playerController);
  setupBackgroundFaunaSystem(k);
  setupShipNoiseSystem(k, playerController);
  setupOceanCurrentsSystem(k, playerController, obstacleData?.currentZones);
  setupCanyonSystem(k);
  setupOceanFloorSystem(k);
  setupLightRaysSystem(k);
  setupParallaxSkySystem(k);
  setupBenthicFloorSystem(k);
  setupOilSpillSystem(k, playerController);
  setupDolphinDraftingSystem(k, playerController);
  setupPenguinFlockSystem(k);
  setupWeatherSystem(k, playerController);

  // Fase 20: Imersão Visual Avançada
  setupDynamicShadowSystem(k, playerController);
  setupBioluminescenceSystem(k, playerController);
  setupBiomeVignetteSystem(k, playerController);
  setupCinematicCameraSystem(k, playerController);

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

  // Tecla 'F3': Alterna o Painel de Telemetria e Diagnóstico de Desenvolvedor (Fôlego, Distância, Velocidade, FPS, etc.)
  k.onKeyPress("f3", () => {
    debugDistanceUI.toggle();
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
        recordEndOnce(true);
        presentationMode.destroy();
        playerController.freeze();
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
    if (isGameFinished) {
      return;
    }

    const pad = gamepadSystem.pollGamepadState();
    if (pad.pausePressed) {
      presentationMode.togglePause();
    }

    // Se estiver em Pausa Didática (Modo Apresentação F16), congela física e atualiza o painel
    if (presentationMode.isDidacticPaused()) {
      presentationMode.update();
      return;
    }
    presentationMode.update();

    const dt = k.dt();
    const playerXPosition = playerController.gameObj.pos.x;

    // Atualização dos Sistemas de Performance de Baixo Nível (Fase 15)
    particlePool.update(dt);
    biomeManager.update(playerXPosition);

    if (debugDistanceUI.isVisible()) {
      const stats = particlePool.getStats();
      const instantFps = Math.round(1 / Math.max(0.001, dt));
      const activeMods = biomeManager.getActiveModules();
      const modsText = activeMods.length > 0 ? activeMods.join(", ") : "Transição";

      debugDistanceUI.update(playerXPosition, {
        fps: instantFps,
        entities: k.get("*").length,
        activeParticles: stats.activeCircles + stats.activeRects,
        totalParticles: stats.totalCircles + stats.totalRects,
        activeModules: modsText,
      });
    }

    // Fallback de segurança para conclusão caso alcance ou ultrapasse a rota
    if (playerXPosition >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE) {
      isGameFinished = true;
      recordEndOnce(true);
      presentationMode.destroy();
      playerController.freeze();
      audioSystem.pauseAmbient();
      showVictoryScreen(k, gameState, () => {
        audioSystem.stopMigrationAudio();
        k.go("menu");
      });
      return;
    }

    // Atualiza o cronômetro do Desafio Rápido de 1 Minuto
    if (timerUI && options.mode === "quick_challenge") {
      const remaining = gameState.getTimeRemaining();
      timerUI.text = `⏱️ ${remaining}s`;
      if (remaining <= 10) {
        timerUI.color = k.rgb(255, 80, 80);
      }
    }

    // Verifica término do desafio de 1 minuto
    if (options.mode === "quick_challenge" && gameState.isTimeUp()) {
      isGameFinished = true;
      recordEndOnce(false);
      presentationMode.destroy();
      playerController.freeze();
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
      // Se a baleia já alcançou a enseada final (>= 29.600m) ou está saltando no breach, não inicia resgate de derrota
      if (
        playerXPosition >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 400 ||
        playerController.isBreaching()
      ) {
        return;
      }

      // SE A BALEIA DESMAIOU: Inicia a sequência de resgate da Guarda Marítima
      isRescueSequenceStarted = true;

      // Interrompe imediatamente os sons ambientes e cantos de baleia ao morrer/desmaiar
      audioSystem.pauseAmbient();

      // Spawna o barco da Guarda Marítima na superfície acima da baleia
      createRescueBoat(k, playerController.gameObj.pos);

      // Espera 3.5 segundos (tempo do barco chegar) e exibe o relatório
      k.wait(3.5, () => {
        recordEndOnce(false);
        presentationMode.destroy();
        playerController.freeze();
        showRescueScreen(k, gameState, () => {
          audioSystem.stopMigrationAudio();
          k.go("menu");
        });
      });
    }

    oceanFloor.pos.x = k.camPos().x - k.width();
    oceanFloor.pos.y = k.height() - 40;
    waterSurface.pos.x = k.camPos().x - k.width();
    skyBand.pos.x = k.camPos().x - k.width();

    // Atualiza cores do oceano
    updateOceanColors(k, playerXPosition, waterSurface, oceanFloor, skyBand);
  });
});

// Inicia o jogo na Splash Screen Animada (Fase 13)
k.go("splash");

// Registro do PWA Service Worker Offline-First para Totens e Tablets (Fase 19.2)
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(`[PWA] Micro Splash Service Worker ativo (Escopo: ${registration.scope})`);
      })
      .catch((err) => {
        console.warn("[PWA] Falha no registro do Service Worker:", err);
      });
  });
}

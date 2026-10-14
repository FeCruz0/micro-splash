import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { createPlayer } from "../entities/player";
import { createRescueBoat } from "../entities/boat";
import { setupCollisions } from "../systems/collisions";
import { createGameState, type GameOptions } from "../systems/state";
import { showRescueScreen } from "../ui/rescueScreen";
import { loadLevelLayout } from "../systems/levelLoader";
import { setupUpwellingSystem } from "../systems/upwellingSystem";
import { showVictoryScreen } from "../ui/victoryScreen";
import { updateOceanColors } from "../systems/oceanEnvironment";
import { createDebugDistanceUI } from "../ui/debugDistance";
import { showFactPopup } from "../ui/factPopup";
import { setupIceSurfaceSystem } from "../systems/iceSurface";
import { setupBackgroundFaunaSystem } from "../systems/backgroundFauna";
import { setupShipNoiseSystem } from "../systems/shipNoiseSystem";
import { setupCanyonSystem } from "../systems/canyonSystem";
import { setupOceanCurrentsSystem } from "../systems/oceanCurrentsSystem";
import { audioSystem } from "../systems/audioSystem";
import { setupBreachSystem } from "../systems/breachSystem";
import { setupLightRaysSystem } from "../systems/lightRaysSystem";
import { setupParallaxSkySystem } from "../systems/parallaxSkySystem";
import { setupBenthicFloorSystem } from "../systems/benthicFloorSystem";
import { setupOceanFloorSystem } from "../systems/oceanFloorSystem";
import { setupOilSpillSystem } from "../systems/oilSpillSystem";
import { setupDolphinDraftingSystem } from "../systems/dolphinDraftingSystem";
import { setupPenguinFlockSystem } from "../systems/penguinFlockSystem";
import { setupWeatherSystem } from "../systems/weatherSystem";
import { setupBioluminescenceSystem } from "../systems/bioluminescenceSystem";
import { setupBiomeVignetteSystem } from "../systems/biomeVignetteSystem";
import { setupCinematicCameraSystem } from "../systems/cinematicCameraSystem";
import { setupDynamicShadowSystem } from "../systems/dynamicShadowSystem";
import { createWaterSurfaceSystem } from "../systems/waterSurfaceSystem";
import { setupAuroraSystem } from "../systems/auroraSystem";
import { setupAbyssalFogSystem } from "../systems/abyssalFogSystem";
import { setupCoastalSurfSystem } from "../systems/coastalSurfSystem";
import { setupMarineSnowSystem } from "../systems/marineSnowSystem";
import { setupDepthDarknessSystem } from "../systems/depthDarknessSystem";
import { setupTouchControls } from "../ui/touchControls";
import { initParticlePool } from "../systems/particlePool";
import { initBiomeLifecycleManager } from "../systems/biomeLifecycleManager";
import { initSpatialCullingManager } from "../systems/spatialCullingSystem";
import { recordMigrationStart, recordMigrationEnd } from "../systems/cumulativeStats";
import { initPresentationMode } from "../systems/presentationMode";
import { gamepadSystem } from "../systems/gamepadSystem";
import { analytics } from "../services/analytics";
import { showChallengeEndScreen } from "../ui/challengeEndScreen";

export function registerGameScene(k: KaboomCtx): void {
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

    // Tag da superfície posicionada no nível do mar (80px) - Sistema Ondulado Orgânico (Fase 29.1)
    const waterSurface = createWaterSurfaceSystem(k);
    k.onSceneLeave(() => {
      waterSurface.destroy();
    });

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
    k.onSceneLeave(() => {
      debugDistanceUI.destroy();
    });

    // Na Migração Serena, o HUD exibido é o Debug HUD com telemetria completa, ativo por padrão.
    // Na Migração Difícil, a tela começa sem HUD, podendo ser ativado pelo jogador a qualquer momento com F8.
    if (options.mode === "serene") {
      debugDistanceUI.setVisible(true);
    }

    // HUD adicional de modo no topo direito
    let timerUI: any = null;
    if (options.mode === "quick_challenge") {
      timerUI = k.add([
        k.text("⏱️ 60s", { size: 16.5, font: "Outfit" }),
        k.pos(k.width() - 110, 18),
        k.color(255, 220, 80),
        k.fixed(),
        k.z(150),
      ]);
    } else if (options.mode === "serene") {
      k.add([
        k.text("🌸 Migração Serena (∞)", { size: 14.5, font: "Outfit" }),
        k.pos(k.width() - 190, 18),
        k.color(140, 255, 200),
        k.fixed(),
        k.z(150),
      ]);
    } else if (options.mode === "weekly") {
      k.add([
        k.text(`📅 Desafio Semanal (#${options.seed || "Semanal"})`, {
          size: 14.5,
          font: "Outfit",
        }),
        k.pos(k.width() - 260, 18),
        k.color(255, 220, 80),
        k.fixed(),
        k.z(150),
      ]);
    }

    // 1.5. Registra Início da Jornada no Dashboard Coletivo (Fase 16) e Analytics (Fase 27)
    recordMigrationStart();
    analytics.trackGameStarted(options.mode, audioSystem.getSoundtrackMode());
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
      if (completed) {
        analytics.trackMigrationCompleted({
          score: gameState.getScore(),
          distance: gameState.getDistance(),
          timeSeconds: gameState.getElapsedTime(),
          biomesPassed: 5,
        });
      } else {
        analytics.trackMigrationAbandoned({
          distance: gameState.getDistance(),
          cause: "oxygen",
          biome: gameState.getCurrentBiome(),
        });
      }
    };

    // 2.5. Inicializa Núcleo de Otimização & Performance (Fase 15 & 39) e Apresentação (Fase 16)
    const particlePool = initParticlePool(k);
    const biomeManager = initBiomeLifecycleManager(k);
    const spatialCulling = initSpatialCullingManager(k);
    const presentationMode = initPresentationMode(k, playerController);

    // 2. Instancia obstáculos, krill, redes e bolsões de ar procedurais (com semente determinística caso informada)
    const obstacleData = loadLevelLayout(k, true, options.seed);

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
    // Vinhetas de localização e marcos geográficos exclusivas da Migração Serena
    if (options.mode === "serene") {
      setupBiomeVignetteSystem(k, playerController);
    }
    setupCinematicCameraSystem(k, playerController);

    // Fase 29: Superfície, Céu & Atmosfera
    setupAuroraSystem(k);
    setupAbyssalFogSystem(k);
    setupCoastalSurfSystem(k);

    // Fase 30: Fundo Submarino, Iluminação & Identidade dos Obstáculos
    setupMarineSnowSystem(k);
    setupDepthDarknessSystem(k, playerController);

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

    // Teclas 'F8' e 'F3': Alterna o Painel de Telemetria e Diagnóstico de Desenvolvedor
    const toggleDebugMenu = () => {
      if (k.debug) {
        k.debug.paused = false;
      }
      debugDistanceUI.toggle();
    };

    k.onKeyPress("f8", toggleDebugMenu);
    k.onKeyPress("f3", toggleDebugMenu);

    // 5. Ativa colisões, ressurgência e o clímax do Salto Majestoso (Breach)
    setupCollisions(k, playerController, gameState);
    setupUpwellingSystem(k, playerController);

    setupBreachSystem({
      k,
      playerController,
      gameState,
      showPrompt: options.mode === "serene",
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
    let cachedEntityCount = 0;
    let entityCountThrottleTimer = 0;

    // 6. Loop Principal
    k.onUpdate(() => {
      if (k.debug && k.debug.paused) {
        k.debug.paused = false;
      }

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

      // Atualização dos Sistemas de Performance de Baixo Nível (Fase 15 & 39)
      particlePool.update(dt);
      biomeManager.update(playerXPosition);
      spatialCulling.update(k.camPos ? k.camPos().x : playerXPosition);

      if (debugDistanceUI.isVisible()) {
        entityCountThrottleTimer += dt;
        if (entityCountThrottleTimer >= 0.5 || cachedEntityCount === 0) {
          entityCountThrottleTimer = 0;
          cachedEntityCount = k.get("*").length;
        }

        const stats = particlePool.getStats();
        const instantFps = Math.round(1 / Math.max(0.001, dt));
        const activeMods = biomeManager.getActiveModules();
        const modsText = activeMods.length > 0 ? activeMods.join(", ") : "Transição";

        debugDistanceUI.update(playerXPosition, {
          fps: instantFps,
          entities: cachedEntityCount,
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
        if (options.mode === "serene") {
          gameState.checkFacts(playerXPosition, (fact) => {
            showFactPopup(k, fact);
          });
        }
        // Sincroniza a trilha sonora adaptativa 16-bit com o bioma atual
        audioSystem.updateBiomeTrack(playerXPosition);
        // Atualiza a acústica subaquática e ressonância de acordo com a profundidade da baleia
        audioSystem.updateDepthAcoustics(playerController.gameObj.pos.y);
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
      waterSurface.updatePosition(k.camPos().x);
      skyBand.pos.x = k.camPos().x - k.width();

      // Atualiza cores do oceano
      updateOceanColors(k, playerXPosition, waterSurface, oceanFloor, skyBand);
    });
  });
}

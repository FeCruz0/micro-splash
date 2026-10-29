import { GAME_CONFIG, TAGS } from "../config";
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
import { setupSereneInsightsSystem } from "../systems/sereneMigrationInsights";
import { createCompanionWhale } from "../entities/companionWhale";
import { shouldSpawnCompanionWhale } from "../systems/companionTutorialSettings";
import { SystemRunner } from "../systems/systemRunner";
import { SpatialHashGrid } from "../systems/spatialHashGrid";
import { FrameBudgetMonitor } from "../systems/frameBudgetMonitor";

export interface GameSceneUiObject {
  pos: { x: number; y: number };
  color?: unknown;
  text?: string;
  opacity?: number;
  destroy?(): void;
}

export interface GameSceneEngineContext {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  scene(id: string, action: Function): unknown;
  setGravity(gravity: number): unknown;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  opacity(alpha: number): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  tween(
    from: number,
    to: number,
    duration: number,
    setter: (val: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  easings: {
    easeOutQuad?: unknown;
    easeInQuad?: unknown;
  };
  destroy(target: unknown): void;
  area(options?: unknown): unknown;
  body(options?: unknown): unknown;
  onSceneLeave(callback: () => void): unknown;
  text(content: string, options?: unknown): unknown;
  onKeyPress(callback: () => void): unknown;
  onKeyPress(key: string, callback: () => void): unknown;
  onMousePress(callback: () => void): unknown;
  isMousePressed(): boolean;
  onUpdate(callback: () => void): unknown;
  wait(duration: number, callback: () => void): unknown;
  camPos(): { x: number; y: number };
  vec2(x: number, y: number): { x: number; y: number };
  width(): number;
  height(): number;
  rgb(r: number, g: number, b: number): unknown;
  go(scene: string, ...args: unknown[]): unknown;
  get(tag: string): unknown[];
  dt?(): number;
  debug?: { paused?: boolean };
}

type GameSceneSubsystemEngine = Parameters<typeof createPlayer>[0] &
  Parameters<typeof createRescueBoat>[0] &
  Parameters<typeof setupCollisions>[0] &
  Parameters<typeof setupUpwellingSystem>[0] &
  Parameters<typeof loadLevelLayout>[0] &
  Parameters<typeof showVictoryScreen>[0] &
  Parameters<typeof showRescueScreen>[0] &
  Parameters<typeof showChallengeEndScreen>[0] &
  Parameters<typeof updateOceanColors>[0] &
  Parameters<typeof createDebugDistanceUI>[0] &
  Parameters<typeof showFactPopup>[0] &
  Parameters<typeof setupIceSurfaceSystem>[0] &
  Parameters<typeof setupBackgroundFaunaSystem>[0] &
  Parameters<typeof setupShipNoiseSystem>[0] &
  Parameters<typeof setupCanyonSystem>[0] &
  Parameters<typeof setupOceanCurrentsSystem>[0] &
  Parameters<typeof setupLightRaysSystem>[0] &
  Parameters<typeof setupParallaxSkySystem>[0] &
  Parameters<typeof setupBenthicFloorSystem>[0] &
  Parameters<typeof setupOceanFloorSystem>[0] &
  Parameters<typeof setupOilSpillSystem>[0] &
  Parameters<typeof setupDolphinDraftingSystem>[0] &
  Parameters<typeof setupPenguinFlockSystem>[0] &
  Parameters<typeof setupWeatherSystem>[0] &
  Parameters<typeof setupBioluminescenceSystem>[0] &
  Parameters<typeof setupBiomeVignetteSystem>[0] &
  Parameters<typeof setupCinematicCameraSystem>[0] &
  Parameters<typeof setupDynamicShadowSystem>[0] &
  Parameters<typeof createWaterSurfaceSystem>[0] &
  Parameters<typeof setupAuroraSystem>[0] &
  Parameters<typeof setupAbyssalFogSystem>[0] &
  Parameters<typeof setupCoastalSurfSystem>[0] &
  Parameters<typeof setupMarineSnowSystem>[0] &
  Parameters<typeof setupDepthDarknessSystem>[0] &
  Parameters<typeof setupTouchControls>[0] &
  Parameters<typeof initParticlePool>[0] &
  Parameters<typeof initPresentationMode>[0] &
  Parameters<typeof setupSereneInsightsSystem>[0] &
  Parameters<typeof createCompanionWhale>[0] &
  GameSceneEngineContext;

export function registerGameScene(rawK: GameSceneEngineContext): void {
  const k = rawK as unknown as GameSceneSubsystemEngine;
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
    ]) as GameSceneUiObject;

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
    ]) as GameSceneUiObject;

    // Área do céu acima do nível do mar (0px a 80px)
    const skyBand = k.add([
      k.rect(k.width() * 2, GAME_CONFIG.SEA_LEVEL),
      k.pos(-k.width() / 2, 0),
      k.color(120, 190, 245),
      k.z(-10),
      "sky",
    ]) as GameSceneUiObject;

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
    let timerUI: GameSceneUiObject | null = null;
    if (options.mode === "quick_challenge") {
      timerUI = k.add([
        k.text("⏱️ 60s", { size: 16.5, font: "Outfit" }),
        k.pos(k.width() - 110, 18),
        k.color(255, 220, 80),
        k.fixed(),
        k.z(150),
      ]) as GameSceneUiObject;
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
    const spatialGrid = new SpatialHashGrid<unknown>({ cellSize: 200 });
    k.onSceneLeave(() => {
      spatialGrid.clear();
    });

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
    const sereneInsights = setupSereneInsightsSystem(k, options.mode === "serene");

    // Fase 56 & 60: Baleia-Guia / Co-Migrante - Tutorial Mimético e Co-Migração Serena
    const isCoMigrationMode = options.mode === "serene";
    if ((initialX < 3200 || isCoMigrationMode) && shouldSpawnCompanionWhale(options.mode)) {
      const companionWhale = createCompanionWhale(k, playerController, {
        spatialGrid,
        mode: options.mode,
        isCoMigration: isCoMigrationMode,
        autonomyMode: isCoMigrationMode ? "autonomous" : "guided",
        infiniteOxygen: true,
      });
      k.onSceneLeave(() => {
        companionWhale.destroy();
      });
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

    // Tecla 'E': Sonar acústico (aciona insight pedagógico no modo sereno)
    k.onKeyPress("e", () => {
      if (options.mode === "serene") {
        sereneInsights?.trigger("sonar_communication");
      }
    });

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
      k: k as unknown as Parameters<typeof setupBreachSystem>[0]["k"],
      playerController,
      gameState,
      showPrompt: options.mode === "serene",
      onBreachComplete: () => {
        if (!isGameFinished) {
          isGameFinished = true;
          recordEndOnce(true);
          presentationMode.destroy();
          sereneInsights?.destroy();
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

    // 6. Orquestrador Central de Fases & Profiling (Fase 58 & 59)
    const systemRunner = new SystemRunner();
    const frameBudgetMonitor = new FrameBudgetMonitor();
    systemRunner.setProfiler((phase, ms) => frameBudgetMonitor.recordPhaseDuration(phase, ms));

    k.onSceneLeave(() => {
      systemRunner.clear();
      frameBudgetMonitor.reset();
    });

    // Fase 1: INPUT
    systemRunner.register(
      "input",
      () => {
        const pad = gamepadSystem.pollGamepadState();
        if (pad.pausePressed) {
          presentationMode.togglePause();
        }
      },
      { id: "gamepad_input" }
    );

    // Fase 2: PHYSICS
    let spatialGridSyncTimer = 0;
    systemRunner.register(
      "physics",
      (dt) => {
        particlePool.update(dt);

        spatialGridSyncTimer += dt;
        if (spatialGridSyncTimer >= 0.5) {
          spatialGridSyncTimer = 0;
          spatialGrid.clear();
          const krills = typeof k.get === "function" ? k.get(TAGS.KRILL) : [];
          for (let i = 0; i < krills.length; i++) {
            const krill = krills[i];
            if (krill && krill.pos) {
              spatialGrid.insert(`krill_${krill.id ?? i}`, krill, {
                minX: krill.pos.x - 8,
                minY: krill.pos.y - 8,
                maxX: krill.pos.x + 8,
                maxY: krill.pos.y + 8,
              });
            }
          }
        }
      },
      { id: "particle_simulation" }
    );

    // Fase 3: AI & Pedagogy
    systemRunner.register(
      "ai",
      (dt) => {
        if (isGameFinished || playerController.isFainting()) return;
        const playerXPosition = playerController.gameObj.pos.x;
        gameState.update(dt, playerXPosition);

        if (options.mode === "serene") {
          sereneInsights?.update(dt);

          gameState.checkFacts(playerXPosition, (fact) => {
            showFactPopup(k, fact);
          });

          // Gatilhos pedagógicos dinâmicos da Migração Serena
          if (playerController.gameObj.pos.y <= GAME_CONFIG.SEA_LEVEL + 6) {
            sereneInsights?.trigger("surface_breathing");
          }
          if (playerController.getSpeed().len() > 80) {
            sereneInsights?.trigger("tail_propulsion");
          }
          if (playerXPosition >= 180 && playerXPosition <= 500) {
            sereneInsights?.trigger("ice_gap_breathing");
          }
          if (playerXPosition >= 7000 && playerXPosition <= 11000) {
            sereneInsights?.trigger("dolphin_drafting");
          }
          if (playerXPosition >= 19500 && playerXPosition <= 24000) {
            sereneInsights?.trigger("upwelling_currents");
          }
          if (playerXPosition >= 26500) {
            sereneInsights?.trigger("nursery_sanctuary");
          }
        }
      },
      { id: "ai_and_pedagogy" }
    );

    // Fase 4: COLLISION & Conditions
    systemRunner.register(
      "collision",
      () => {
        if (isGameFinished) return;
        const playerXPosition = playerController.gameObj.pos.x;

        // Fallback de segurança para conclusão caso alcance ou ultrapasse a rota
        if (playerXPosition >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE) {
          isGameFinished = true;
          recordEndOnce(true);
          presentationMode.destroy();
          sereneInsights?.destroy();
          playerController.freeze();
          audioSystem.pauseAmbient();
          showVictoryScreen(k, gameState, () => {
            audioSystem.stopMigrationAudio();
            k.go("menu");
          });
          return;
        }

        // Checagem de resgate caso a baleia tenha desmaiado
        if (playerController.isFainting() && !isRescueSequenceStarted && !isGameFinished) {
          if (
            playerXPosition >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 400 ||
            playerController.isBreaching()
          ) {
            return;
          }

          isRescueSequenceStarted = true;
          audioSystem.pauseAmbient();
          createRescueBoat(k, playerController.gameObj.pos);

          k.wait(3.5, () => {
            recordEndOnce(false);
            presentationMode.destroy();
            sereneInsights?.destroy();
            playerController.freeze();
            showRescueScreen(k, gameState, () => {
              audioSystem.stopMigrationAudio();
              k.go("menu");
            });
          });
        }
      },
      { id: "collision_and_endings" }
    );

    // Fase 5: CULLING & Lifecycle
    systemRunner.register(
      "culling",
      () => {
        const playerXPosition = playerController.gameObj.pos.x;
        const currentCameraPosition = typeof k.camPos === "function" ? k.camPos() : k.vec2(0, 0);
        biomeManager.update(playerXPosition);
        spatialCulling.update(currentCameraPosition.x);
      },
      { id: "spatial_and_biome_culling" }
    );

    // Fase 6: RENDER & UI
    systemRunner.register(
      "render",
      (dt) => {
        if (isGameFinished) return;

        const playerXPosition = playerController.gameObj.pos.x;
        const currentCameraPosition = typeof k.camPos === "function" ? k.camPos() : k.vec2(0, 0);
        const currentScreenWidth = typeof k.width === "function" ? k.width() : 1280;
        const currentScreenHeight = typeof k.height === "function" ? k.height() : 720;

        // Atualiza o cronômetro do Desafio Rápido de 1 Minuto
        if (timerUI && options.mode === "quick_challenge") {
          const remaining = gameState.getTimeRemaining();
          timerUI.text = `⏱️ ${remaining}s`;
          if (remaining <= 10) {
            timerUI.color = k.rgb(255, 80, 80);
          }

          if (gameState.isTimeUp() && !isGameFinished) {
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
        }

        // Telemetria do Debug HUD
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
          const cullingStats = spatialCulling.getStats();
          const snapshot = frameBudgetMonitor.getSnapshot(dt * 1000);
          const budgetStatus = snapshot.isBudgetExceeded ? "⚠️ Overrun" : "Budget OK";

          debugDistanceUI.update(playerXPosition, {
            fps: instantFps,
            entities: cachedEntityCount,
            activeParticles: stats.activeCircles + stats.activeRects,
            totalParticles: stats.totalCircles + stats.totalRects,
            activeModules: modsText,
            frameTimeMs: dt * 1000,
            visibleEntities: cullingStats.visibleEntities,
            culledEntities: cullingStats.culledEntities,
            budgetStatus,
          });
        }

        // Atualização de Trilha e Ressonância Acústica Subaquática
        if (!playerController.isFainting()) {
          audioSystem.updateBiomeTrack(playerXPosition);
          audioSystem.updateDepthAcoustics(playerController.gameObj.pos.y);
        }

        // Posicionamento de limites e cores do oceano
        oceanFloor.pos.x = currentCameraPosition.x - currentScreenWidth;
        oceanFloor.pos.y = currentScreenHeight - 40;
        waterSurface.updatePosition(currentCameraPosition.x);
        skyBand.pos.x = currentCameraPosition.x - currentScreenWidth;
        updateOceanColors(k, playerXPosition, waterSurface, oceanFloor, skyBand);
      },
      { id: "render_and_ui" }
    );

    // 7. Loop Principal do Kaboom
    k.onUpdate(() => {
      if (k.debug && k.debug.paused) {
        k.debug.paused = false;
      }

      if (isGameFinished) {
        return;
      }

      // Se estiver em Pausa Didática (Modo Apresentação F16), congela física e atualiza o painel
      if (presentationMode.isDidacticPaused()) {
        presentationMode.update();
        return;
      }
      presentationMode.update();

      const rawDeltaTime = typeof k.dt === "function" ? k.dt() : 0.0166;
      const dt = Math.min(Math.max(0, rawDeltaTime), GAME_CONFIG.MAX_DELTA_TIME);

      // Despacho determinístico de todas as fases canônicas
      systemRunner.run(dt);
    });
  });
}

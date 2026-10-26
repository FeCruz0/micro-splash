import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { COMPANION_CONFIG, GAME_CONFIG, TAGS } from "../config";
import { audioSystem } from "../systems/audioSystem";
import { getParticlePool } from "../systems/particlePool";
import { markCompanionTutorialSeen } from "../systems/companionTutorialSettings";
import { isPositionInIceGap } from "../systems/iceSurface";
import { revealEntitiesInSonarRadius } from "./player/playerSonar";
import type { PlayerController } from "./player/types";

export type CompanionState =
  | "INTRO"
  | "CRUISE"
  | "FEEDING"
  | "SEEK_BREATH"
  | "SURFACE_BREATHE"
  | "FAREWELL_BREACH"
  | "RESTING"
  | "DEPARTED";

export interface CompanionOptions {
  initialX?: number;
  initialY?: number;
  onStateChange?: (state: CompanionState) => void;
  onDeparted?: () => void;
}

export interface CompanionWhaleController {
  gameObj: GameObj;
  getState: () => CompanionState;
  forceState: (state: CompanionState) => void;
  getOxygen: () => number;
  getMaxOxygen: () => number;
  restoreOxygen: (amount: number) => void;
  getKrillsEaten: () => number;
  consumeKrill: (krill: GameObj) => void;
  triggerSonar: () => void;
  getSpeed: () => Vec2;
  isDeparted: () => boolean;
  destroy: () => void;
}

/**
 * Cria a Baleia-Guia autônoma e ecológica (Mãe-Guia Antártica).
 * Espelha as mecânicas do jogador:
 * - Movimentação hidrodinâmica idêntica (giro vertical lento e impulso na direção virada).
 * - Colisão física sólida com blocos de gelo (k.body() e move()).
 * - Coleta de krill real, biosonar funcional e ciclo pulmonar de oxigênio em fendas polares.
 * - Repouso estacionário sereno após conclusão do tutorial (sem sumir do nada).
 */
export function createCompanionWhale(
  k: KaboomCtx,
  playerController: PlayerController,
  options: CompanionOptions = {}
): CompanionWhaleController {
  const startX = options.initialX ?? playerController.gameObj.pos.x + 140;
  const startY = options.initialY ?? 200;

  // Dimensões do colisor proporcionais à escala 0.85x
  const colliderWidth = 91.8;
  const colliderHeight = 35.7;

  const companion = k.add([
    k.sprite("baleia", { anim: "idle_swim" }),
    k.pos(startX, startY),
    k.rotate(0),
    k.color(140, 165, 195), // Tom azul-ardósia escurecido para diferenciação nítida
    k.anchor("center"),
    k.z(19),
    "companion_whale",
    ...(typeof k.scale === "function"
      ? [k.scale(COMPANION_CONFIG.SCALE, COMPANION_CONFIG.SCALE)]
      : []),
    ...(typeof k.area === "function"
      ? [
          typeof k.Rect === "function"
            ? k.area({
                shape: new k.Rect(
                  k.vec2(-colliderWidth / 2, -colliderHeight / 2),
                  colliderWidth,
                  colliderHeight
                ),
              })
            : k.area(),
        ]
      : []),
    ...(typeof k.body === "function" ? [k.body()] : []),
  ]);

  let currentState: CompanionState = "INTRO";
  let stateTimer = 0;
  let strokeCycleTimer = 0;
  let strokePhase: "down" | "up" | "glide" = "glide";
  let glideDurationTarget = 1.6; // Duração estocástica do planeio para nado não-repetitivo

  // Vetor de Velocidade Hidrodinâmica & Orientação Angular (Espelho da física do jogador)
  let currentSpeed = k.vec2(COMPANION_CONFIG.BASE_SPEED, 0);
  let targetAngle = 0;

  // Sistema de Oxigênio Biológico
  const maxOxygen = 100;
  let currentOxygen = 100;
  let krillsEatenCount = 0;

  // Temporizadores de Percepção & Decisão da IA
  let perceptionCooldownTimer = 0;
  let sonarCooldownTimer = 10.0;
  let feedActionTimer = 0;
  let surfaceBreatheTimer = 0;
  let targetKrillEntity: GameObj | null = null;
  let isDepartedFlag = false;

  const updateState = (nextState: CompanionState) => {
    if (currentState === nextState) return;
    currentState = nextState;
    stateTimer = 0;
    if (options.onStateChange) {
      options.onStateChange(nextState);
    }
  };

  // Disparo funcional do biosonar: ondas visuais + revelação de entidades no mapa
  const triggerCompanionSonar = () => {
    const headX = companion.pos.x + 40;
    const headY = companion.pos.y;
    audioSystem.playSonarSound();

    // Ondas concêntricas visuais
    for (let waveIndex = 0; waveIndex < 3; waveIndex++) {
      const ring = k.add([
        k.circle(10),
        k.pos(headX, headY),
        k.color(100, 240, 255),
        k.opacity(0.85),
        k.outline(2, k.rgb(180, 250, 255)),
        k.z(21),
      ]);

      let expansionRadius = 10 + waveIndex * 12;
      let ringOpacity = 0.85;
      ring.onUpdate(() => {
        const dt = k.dt();
        expansionRadius += dt * 260;
        ringOpacity -= dt * 0.95;
        ring.radius = expansionRadius;
        ring.opacity = Math.max(0, ringOpacity);
        if (ringOpacity <= 0) {
          k.destroy(ring);
        }
      });
    }

    // Varredura acústica real: ilumina e revela itens para o jogador
    const headPosition = k.vec2(headX, headY);
    revealEntitiesInSonarRadius(k, headPosition, GAME_CONFIG.SONAR_RANGE);
  };

  // Emite borrifo duplo ao romper a superfície d'água
  const emitDoubleBlowholeSpout = (sourceX: number, sourceY: number) => {
    const pool = getParticlePool();
    for (let plumeIndex = 0; plumeIndex < 2; plumeIndex++) {
      const plumeOffsetX = plumeIndex === 0 ? -10 : 6;
      for (let particleIndex = 0; particleIndex < 12; particleIndex++) {
        if (pool) {
          pool.spawnCircle({
            pos: k.vec2(sourceX + plumeOffsetX, sourceY - 14),
            radius: 2.2 + Math.random() * 2.2,
            color: k.rgb(220, 245, 255),
            opacity: 0.9,
            vel: k.vec2((Math.random() - 0.5) * 20, -(140 + Math.random() * 90)),
            fadeRate: 1.2,
            maxLife: 1.0,
            growthRate: 1.4,
            z: 22,
          });
        } else {
          const steamParticle = k.add([
            k.circle(3),
            k.pos(sourceX + plumeOffsetX, sourceY - 14),
            k.color(220, 245, 255),
            k.opacity(0.85),
            k.z(22),
          ]);
          let lifeTime = 0.85;
          steamParticle.onUpdate(() => {
            const dt = k.dt();
            steamParticle.pos.y -= dt * 150;
            steamParticle.pos.x += (Math.random() - 0.5) * dt * 20;
            lifeTime -= dt;
            steamParticle.opacity = lifeTime;
            if (lifeTime <= 0) k.destroy(steamParticle);
          });
        }
      }
    }
  };

  // Método chamado pelo sistema de colisão ao tocar em um krill real
  const handleConsumeKrill = (krillObj: GameObj) => {
    if (krillObj && (!krillObj.exists || krillObj.exists())) {
      k.destroy(krillObj);
    }
    krillsEatenCount++;
    currentOxygen = Math.min(maxOxygen, currentOxygen + GAME_CONFIG.KRILL_OXYGEN_RESTORE);
    feedActionTimer = 0.75;
    if (typeof companion.play === "function") companion.play("feed");
    audioSystem.playKrillGulp(krillObj?.pos?.x, companion.pos.x);
    targetKrillEntity = null;
  };

  // Reação física contra calota sólida de gelo da banquisa polar
  const handleIceBlockCollision = (_iceBlock: GameObj) => {
    // Interrompe velocidade ascendente e desvia focinho suavemente para a horizontal
    if (currentSpeed.y < 0) {
      currentSpeed.y = 0;
    }
    if (companion.angle < 0) {
      companion.angle = 0;
    }
    if (companion.pos.y < 92) {
      companion.pos.y = 92;
    }
  };

  // Reação contra obstáculos rochosos
  const handleObstacleBlockCollision = (_obstacle: GameObj) => {
    // Desvia impulso vertical para evitar prender na rocha
    currentSpeed.y = Math.abs(currentSpeed.y) + 40;
  };

  // Vincula métodos públicos ao objeto Kaboom para os callbacks de colisão
  (companion as unknown as { consumeKrill: (krill: GameObj) => void }).consumeKrill =
    handleConsumeKrill;
  (companion as unknown as { handleIceCollision: (b: GameObj) => void }).handleIceCollision =
    handleIceBlockCollision;
  (
    companion as unknown as { handleObstacleCollision: (o: GameObj) => void }
  ).handleObstacleCollision = handleObstacleBlockCollision;

  // Loop de atualização contínua
  companion.onUpdate(() => {
    if (isDepartedFlag) return;

    const deltaTime = k.dt();
    stateTimer += deltaTime;

    const playerObj = playerController.gameObj;
    if (!playerObj || (typeof playerObj.exists === "function" && !playerObj.exists())) {
      return;
    }

    const playerX = playerObj.pos.x;
    const playerSpeed = playerController.getSpeed
      ? playerController.getSpeed().x
      : COMPANION_CONFIG.BASE_SPEED;

    // 1. Depleção biológica de oxigênio pulmonar
    currentOxygen = Math.max(0, currentOxygen - deltaTime * (GAME_CONFIG.OXYGEN_DRAIN_RATE * 0.75));

    // 2. Temporizadores de Sonar e Alimentação
    sonarCooldownTimer = Math.max(0, sonarCooldownTimer - deltaTime);
    if (feedActionTimer > 0) {
      feedActionTimer -= deltaTime;
      if (
        feedActionTimer <= 0 &&
        currentState !== "FAREWELL_BREACH" &&
        currentState !== "RESTING"
      ) {
        if (typeof companion.play === "function") companion.play("idle_swim");
      }
    }

    // 3. Percepção Sensorial e Tomada de Decisão (Radar Local a cada 0.35s)
    perceptionCooldownTimer -= deltaTime;
    if (perceptionCooldownTimer <= 0) {
      perceptionCooldownTimer = 0.35;

      // Gatilho do Sonar: dispara se avistar obstáculo à frente ou periodicamente em águas profundas
      if (sonarCooldownTimer <= 0 && companion.pos.x > 300 && currentState !== "RESTING") {
        sonarCooldownTimer = 14.0 + Math.random() * 8.0;
        triggerCompanionSonar();
      }

      // Detecção de Krill: busca cardumes reais à frente caso não esteja buscando ar
      if (
        currentOxygen >= 40 &&
        currentState !== "FEEDING" &&
        currentState !== "FAREWELL_BREACH" &&
        currentState !== "RESTING"
      ) {
        const availableKrills = typeof k.get === "function" ? k.get(TAGS.KRILL) : [];
        let bestTarget: GameObj | null = null;
        let shortestDist = 340;

        for (let i = 0; i < availableKrills.length; i++) {
          const krill = availableKrills[i];
          if (!krill.pos) continue;
          const deltaX = krill.pos.x - companion.pos.x;
          // Krill à frente (entre 20px e 320px) e acessível
          if (
            deltaX > 20 &&
            deltaX < shortestDist &&
            Math.abs(krill.pos.y - companion.pos.y) < 140
          ) {
            // Se o jogador estiver muito mais perto do krill, a mãe deixa para o filhote
            const playerDistToKrill = Math.abs(krill.pos.x - playerX);
            if (playerDistToKrill > 50) {
              shortestDist = deltaX;
              bestTarget = krill;
            }
          }
        }
        targetKrillEntity = bestTarget;
      }
    }

    // 4. Checagem de Emergência de Ar (Oxigênio < 38%)
    if (
      currentOxygen < 38 &&
      currentState !== "SEEK_BREATH" &&
      currentState !== "SURFACE_BREATHE" &&
      currentState !== "FAREWELL_BREACH" &&
      currentState !== "RESTING"
    ) {
      updateState("SEEK_BREATH");
    }

    // 5. Conclusão do Tutorial ao final da Antártica (~3.150m): Transiciona para RESTING (permanece parada)
    if (
      playerX >= COMPANION_CONFIG.FAREWELL_TARGET_X - 180 &&
      currentState !== "RESTING" &&
      currentState !== "DEPARTED"
    ) {
      updateState("RESTING");
      audioSystem.playWhaleSong(1.0, 1.1);
      markCompanionTutorialSeen();
      if (options.onDeparted) options.onDeparted();
    }

    // --- CÁLCULO DE MIRA ANGULAR E COMPORTAMENTO POR ESTADO ---
    switch (currentState) {
      case "INTRO": {
        targetAngle = 0;
        currentSpeed.x = COMPANION_CONFIG.BASE_SPEED;
        if (playerX > 40) {
          updateState("CRUISE");
        }
        break;
      }

      case "CRUISE": {
        // Se houver um krill selecionado, calcula mira angular em direção a ele
        if (targetKrillEntity && (!targetKrillEntity.exists || targetKrillEntity.exists())) {
          const deltaY = targetKrillEntity.pos.y - companion.pos.y;
          const deltaX = Math.max(40, targetKrillEntity.pos.x - companion.pos.x);
          targetAngle = k.clamp(k.rad2deg(Math.atan2(deltaY, deltaX)), -30, 30);
        } else {
          // Oscilação senoidal marinha orgânica de profundidade
          const oceanSway = Math.sin(stateTimer * 1.4) * 12 + Math.sin(stateTimer * 0.7) * 8;
          const targetCruiseY = 195 + oceanSway;
          const deltaY = targetCruiseY - companion.pos.y;
          targetAngle = k.clamp(deltaY * 0.25, -22, 22);
        }
        break;
      }

      case "SEEK_BREATH": {
        // Busca a fenda polar mais próxima ou ascende se já estiver sob água livre
        const canBreatheHere = isPositionInIceGap(companion.pos.x);

        if (canBreatheHere) {
          // Aponta focinho suavemente para cima em direção à abertura
          targetAngle = -26;

          if (companion.pos.y <= GAME_CONFIG.SEA_LEVEL + 4) {
            updateState("SURFACE_BREATHE");
            surfaceBreatheTimer = 0;
            emitDoubleBlowholeSpout(companion.pos.x, companion.pos.y);
            audioSystem.playBlowholeSpout();
            currentOxygen = maxOxygen;
          }
        } else {
          // Mantém profundidade segura abaixo da banquisa (y=130) até encontrar a fenda
          const safeDepthY = 130;
          const deltaY = safeDepthY - companion.pos.y;
          targetAngle = k.clamp(deltaY * 0.25, -18, 18);
        }
        break;
      }

      case "SURFACE_BREATHE": {
        surfaceBreatheTimer += deltaTime;
        targetAngle = 0;
        currentSpeed.y = 0;

        if (surfaceBreatheTimer >= 1.2) {
          updateState("CRUISE");
        }
        break;
      }

      case "RESTING": {
        // A baleia-guia concluiu o acompanhamento e permanece serena nas águas polares
        // Desacelera suavemente até ficar parada sem sumir da cena
        targetAngle = 0;
        currentSpeed = currentSpeed.scale(Math.max(0, 1 - deltaTime * 3.0));
        if (typeof companion.play === "function") {
          companion.play("idle_swim");
        }
        break;
      }

      case "FAREWELL_BREACH": {
        // Mantido para compatibilidade: transiciona suavemente para RESTING
        updateState("RESTING");
        break;
      }

      case "DEPARTED":
        return;
    }

    // --- GIRO VERTICAL LENTO (Igual ao controle vertical da baleia do jogador) ---
    const rotationSpeed = GAME_CONFIG.ROTATION_SPEED * 0.75; // ~90 graus por segundo
    const angleDifference = targetAngle - companion.angle;
    companion.angle += k.clamp(
      angleDifference,
      -rotationSpeed * deltaTime,
      rotationSpeed * deltaTime
    );

    // --- PROPULSÃO DIRETA NO ÂNGULO VIRADO (Sem deslizar de lado) ---
    if (
      currentState !== "SURFACE_BREATHE" &&
      currentState !== "RESTING" &&
      currentState !== "INTRO"
    ) {
      // Ajuste de cadência por Rubber-Banding com o jogador
      const distanceAhead = companion.pos.x - playerX;
      let strokePacingBoost = 1.0;
      if (distanceAhead > COMPANION_CONFIG.LEAD_DISTANCE_MAX) {
        strokePacingBoost = 0.35; // Desacelera batidas para aguardar o filhote
      } else if (distanceAhead < COMPANION_CONFIG.LEAD_DISTANCE_MIN) {
        strokePacingBoost = 1.45; // Acelera batidas para guiar
      }
      if (playerSpeed < 20) {
        strokePacingBoost = Math.min(strokePacingBoost, 0.25);
      }

      strokeCycleTimer += deltaTime;
      const strokeDownDuration = 0.42;
      const strokeUpDuration = 0.38;
      const totalStrokeDuration = strokeDownDuration + strokeUpDuration;

      const angleRad = k.deg2rad(companion.angle);
      const thrustDirection = k.vec2(Math.cos(angleRad), Math.sin(angleRad));

      if (strokeCycleTimer < strokeDownDuration) {
        if (strokePhase !== "down") {
          strokePhase = "down";
          if (typeof companion.play === "function") companion.play("stroke_down");
          audioSystem.playStrokeThrust();
        }
        // Batida para baixo: arco de força máxima na direção em que estiver virada
        const progress = strokeCycleTimer / strokeDownDuration;
        const thrustPower =
          (GAME_CONFIG.BASE_THRUST +
            Math.sin(progress * Math.PI) * GAME_CONFIG.PEAK_THRUST * 0.65) *
          strokePacingBoost;
        currentSpeed = currentSpeed.add(thrustDirection.scale(thrustPower * deltaTime));
      } else if (strokeCycleTimer < totalStrokeDuration) {
        if (strokePhase !== "up") {
          strokePhase = "up";
          if (typeof companion.play === "function") companion.play("stroke_up");
        }
        // Batida para cima: impulso secundário na direção em que estiver virada
        const thrustPower = GAME_CONFIG.BASE_THRUST * 0.45 * strokePacingBoost;
        currentSpeed = currentSpeed.add(thrustDirection.scale(thrustPower * deltaTime));
      } else if (strokeCycleTimer < totalStrokeDuration + glideDurationTarget) {
        if (strokePhase !== "glide") {
          strokePhase = "glide";
          if (typeof companion.play === "function") companion.play("glide");
        }
        // Fase de planeio: NENHUM impulso é aplicado, move-se puramente por inércia hidrodinâmica!
      } else {
        strokeCycleTimer = 0;
        glideDurationTarget = 1.2 + Math.random() * 1.2;
      }
    }

    // --- FÍSICA HIDRODINÂMICA: MOVIMENTO E ARRASTO (Respeita colisões com blocos de gelo) ---
    if (currentState !== "RESTING") {
      const effectiveSink =
        currentState === "SURFACE_BREATHE" || companion.pos.y <= GAME_CONFIG.SEA_LEVEL
          ? 0
          : GAME_CONFIG.SINK_RATE;

      const currentMaxSpeed = 280;
      if (currentSpeed.len() > currentMaxSpeed) {
        currentSpeed = currentSpeed.unit().scale(currentMaxSpeed);
      }

      if (typeof companion.move === "function") {
        companion.move(currentSpeed.x, currentSpeed.y + effectiveSink);
      } else {
        companion.pos.x += currentSpeed.x * deltaTime;
        companion.pos.y += (currentSpeed.y + effectiveSink) * deltaTime;
      }

      const waterDragFactor = Math.pow(GAME_CONFIG.WATER_DRAG, deltaTime * 60);
      currentSpeed = currentSpeed.scale(waterDragFactor);
    } else {
      // Estado de repouso: desacelera e permanece suavemente no lugar
      currentSpeed = currentSpeed.scale(Math.max(0, 1 - deltaTime * 4.0));
      if (typeof companion.move === "function" && currentSpeed.len() > 1) {
        companion.move(currentSpeed.x, currentSpeed.y);
      }
      const neutralDecayFactor = 1 - Math.pow(1 - 0.05, deltaTime * 60);
      companion.angle = k.lerp(companion.angle, 0, neutralDecayFactor);
    }

    // Failsafe do leito marinho
    const seabedLimit = k.height ? k.height() - 55 : 500;
    if (companion.pos.y > seabedLimit) {
      companion.pos.y = seabedLimit;
      if (currentSpeed.y > 0) currentSpeed.y = 0;
    }
  });

  return {
    gameObj: companion,
    getState: () => currentState,
    forceState: (state: CompanionState) => updateState(state),
    getOxygen: () => currentOxygen,
    getMaxOxygen: () => maxOxygen,
    restoreOxygen: (amount: number) => {
      currentOxygen = Math.min(maxOxygen, currentOxygen + amount);
    },
    getKrillsEaten: () => krillsEatenCount,
    consumeKrill: handleConsumeKrill,
    triggerSonar: triggerCompanionSonar,
    getSpeed: () => currentSpeed,
    isDeparted: () => currentState === "RESTING" || currentState === "DEPARTED" || isDepartedFlag,
    destroy: () => {
      isDepartedFlag = true;
      if (companion && (!companion.exists || companion.exists())) {
        k.destroy(companion);
      }
    },
  };
}

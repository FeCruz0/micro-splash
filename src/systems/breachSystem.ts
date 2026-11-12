import { GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";
import { analytics } from "../services/analytics";
import { safeShake } from "../utils/camera";
import { getRandomFloat, getRandomChoice } from "../utils/random";
import { getParticlePool } from "./particlePool";
import type { PlayerController } from "../entities/player";
import type { GameState } from "./state";
import { createTween, Easings } from "../engine/utils/Tween";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  resolveScreenRenderContainer,
  resolveWorldRenderContainer,
} from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeRectNode,
  createNativeTextNode,
  NativeVisualObjectAdapter,
  registerNativeSceneUpdate,
  scheduleNativeSceneDelay,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface BreachVector2D {
  x: number;
  y: number;
}

export interface BreachGameObject<TColor = unknown> {
  pos: BreachVector2D;
  opacity?: number;
  width?: number;
  angle?: number;
  text?: string;
  color?: TColor;
  onUpdate: (cb: () => void) => void;
  destroy?: () => void;
}

export interface BreachTweenResult {
  then: (cb: () => void) => unknown;
}

export interface BreachSplashEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BreachVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  pos: (x: number, y: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  z: (v: number) => unknown;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  rotate: (a: number) => unknown;
  anchor: (a: "center") => unknown;
  rand: (min: number, max: number) => number;
  rgb: (r: number, g: number, b: number) => TColor;
  deg2rad: (deg: number) => number;
  vec2: (x: number, y: number) => TVec;
  shake?: (amount: number) => void;
  onSceneLeave?: (callback: () => void) => unknown;
}

export interface BreachEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BreachVector2D,
> extends BreachSplashEngineContext<TDestroyable, TColor, TVec> {
  onUpdate: (cb: () => void) => void;
  width: () => number;
  text: (
    content: string,
    opt?: {
      size?: number;
      font?: string;
      align?: "left" | "center" | "right";
      lineSpacing?: number;
    }
  ) => unknown;
  fixed: () => unknown;
  isKeyPressed: (key: "space" | "enter") => boolean;
  isMousePressed: () => boolean;
  isTouchStarted?: () => boolean;
  wait: (secs: number, cb: () => void) => unknown;
  tween?: (
    from: number,
    to: number,
    duration: number,
    onUpdate: (val: number) => void
  ) => BreachTweenResult;
}

/**
 * Configuração de inicialização para o sistema do Salto Majestoso (Breach).
 */
export interface BreachSystemConfig<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BreachVector2D,
> {
  /** Instância do contexto agnóstico do motor */
  k: IRenderEngine | BreachEngineContext<TDestroyable, TColor, TVec>;
  /** Controlador físico da baleia do jogador */
  playerController: PlayerController;
  /** Estado reativo do jogo (distância, pontuação, etc.) */
  gameState: GameState;
  /** Callback acionado após a conclusão cinematográfica do salto e reentrada na água */
  onBreachComplete: () => void;
  /** Se deve exibir banner/prompt de texto na tela (desativado na Migração Difícil) */
  showPrompt?: boolean;
}

function resolveDeltaTime(
  engineOrContext: unknown,
  resolvedNativeRenderEngine: IRenderEngine | null
): number {
  const ctx = engineOrContext as { dt?: () => number } | null;
  if (ctx && typeof ctx.dt === "function") {
    return ctx.dt();
  }
  return resolvedNativeRenderEngine ? resolvedNativeRenderEngine.getTicker().getDeltaTime() : 0.016;
}

function resolveRandomRange(engineOrContext: unknown, min: number, max: number): number {
  const ctx = engineOrContext as { rand?: (a: number, b: number) => number } | null;
  if (ctx && typeof ctx.rand === "function") {
    return ctx.rand(min, max);
  }
  return getRandomFloat(min, max);
}

function resolveColorTuple<TColor>(
  engineOrContext: unknown,
  red: number,
  green: number,
  blue: number
): TColor {
  const ctx = engineOrContext as { rgb?: (r: number, g: number, b: number) => TColor } | null;
  if (ctx && typeof ctx.rgb === "function") {
    return ctx.rgb(red, green, blue);
  }
  return [red, green, blue] as unknown as TColor;
}

function resolveVector2<TVec extends { x: number; y: number }>(
  engineOrContext: unknown,
  x: number,
  y: number
): TVec {
  const ctx = engineOrContext as { vec2?: (vx: number, vy: number) => TVec } | null;
  if (ctx && typeof ctx.vec2 === "function") {
    return ctx.vec2(x, y);
  }
  return {
    x,
    y,
    len: () => Math.hypot(x, y),
    scale: (factor: number) => resolveVector2(engineOrContext, x * factor, y * factor),
  } as unknown as TVec;
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
export function setupBreachSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BreachVector2D,
>(config: BreachSystemConfig<TDestroyable, TColor, TVec>) {
  const { k, playerController, gameState, onBreachComplete, showPrompt = true } = config;
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const nativeScreenContainer = resolvedNativeRenderEngine
    ? resolveScreenRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as BreachEngineContext<TDestroyable, TColor, TVec>;

  let promptBanner: BreachGameObject<TColor> | null = null;
  let isBreachTriggered = false;
  let hasLeftWater = false;
  let isBreachFinished = false;
  let bannerAnimTime = 0;
  let breachTimer = 0;

  const triggerDistance = GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 300; // 26.700m

  const destroyBanner = () => {
    if (!promptBanner) return;
    if (resolvedNativeRenderEngine && typeof promptBanner.destroy === "function") {
      promptBanner.destroy();
    } else {
      legacyContext.destroy(promptBanner as unknown as TDestroyable);
    }
    promptBanner = null;
  };

  const updateBreachFrame = (deltaTime: number) => {
    if (isBreachFinished) return;

    const playerPos = playerController.gameObj.pos;

    // 1. Exibição do Convite Visual ao se aproximar da Ilha do Farol
    if (playerPos.x >= triggerDistance && !isBreachTriggered) {
      if (showPrompt) {
        if (!promptBanner) {
          const viewportWidth = resolvedNativeRenderEngine
            ? resolvedNativeRenderEngine.getDimensions().width
            : legacyContext.width();
          if (resolvedNativeRenderEngine && nativeScreenContainer) {
            promptBanner = createNativeTextNode(
              k,
              resolvedNativeRenderEngine,
              nativeScreenContainer,
              {
                identifier: "breach_prompt_banner",
                content:
                  "ÁGUAS CALMAS DE ARRAIAL! 🐋\nPRESSIONE [ESPAÇO] OU TOQUE PARA O SALTO MAJESTOSO!",
                fontSize: 16,
                fontFamily: "Outfit",
                align: "center",
                lineSpacing: 6,
                positionX: viewportWidth / 2,
                positionY: 60,
                color: [255, 220, 100],
                anchor: "center",
                zIndex: 150,
                opacity: 1,
              }
            ) as unknown as BreachGameObject<TColor>;
          } else {
            promptBanner = legacyContext.add([
              legacyContext.text(
                "ÁGUAS CALMAS DE ARRAIAL! 🐋\nPRESSIONE [ESPAÇO] OU TOQUE PARA O SALTO MAJESTOSO!",
                {
                  size: 16,
                  font: "Outfit",
                  align: "center",
                  lineSpacing: 6,
                }
              ),
              legacyContext.pos(viewportWidth / 2, 60),
              legacyContext.color(255, 220, 100),
              legacyContext.outline(3, legacyContext.rgb(10, 30, 60)),
              legacyContext.anchor("center"),
              legacyContext.fixed(),
              legacyContext.z(150),
              legacyContext.opacity(1),
            ]) as BreachGameObject<TColor>;
          }
        }

        bannerAnimTime += deltaTime * 4;
        promptBanner.opacity = 0.7 + Math.sin(bannerAnimTime) * 0.3;
      }

      // Dispara o salto se o jogador pressionar Espaço, Enter, Toque/Clique OU se cruzar a linha de 27.000m
      const isInputTriggered =
        (typeof legacyContext.isKeyPressed === "function" &&
          (legacyContext.isKeyPressed("space") || legacyContext.isKeyPressed("enter"))) ||
        (typeof legacyContext.isMousePressed === "function" && legacyContext.isMousePressed()) ||
        (typeof legacyContext.isTouchStarted === "function" && legacyContext.isTouchStarted());

      if (isInputTriggered || playerPos.x >= GAME_CONFIG.ROUTE_TOTAL_DISTANCE) {
        startBreachSequence();
      }
    }

    // 2. Monitoramento da Trajetória Aérea durante o Salto
    if (isBreachTriggered && !isBreachFinished) {
      breachTimer += deltaTime;

      // Verifica se a baleia rompeu a superfície para o céu
      if (playerPos.y < GAME_CONFIG.SEA_LEVEL) {
        hasLeftWater = true;

        // Partículas douradas e de vapor reluzente na trilha aérea da baleia
        if (getRandomFloat(0, 1) < 0.6) {
          const pool = getParticlePool();
          const pPos = resolveVector2<TVec>(
            k,
            playerPos.x - resolveRandomRange(k, 10, 25),
            playerPos.y + resolveRandomRange(k, -10, 10)
          );
          const pRadius = resolveRandomRange(k, 2, 4);
          if (pool) {
            pool.spawnCircle({
              pos: pPos,
              radius: pRadius,
              color: resolveColorTuple<TColor>(k, 255, 235, 140),
              opacity: 0.85,
              z: 15,
              vel: resolveVector2<TVec>(k, 0, 15),
              fadeRate: 1.8,
              maxLife: 0.55,
            });
          } else if (resolvedNativeRenderEngine && nativeWorldContainer) {
            const sparkle = createNativeCircleNode(
              k,
              resolvedNativeRenderEngine,
              nativeWorldContainer,
              {
                identifier: "breach_air_sparkle",
                radius: pRadius,
                positionX: pPos.x,
                positionY: pPos.y,
                fillColor: [255, 235, 140],
                opacity: 0.85,
                zIndex: 15,
              }
            );
            sparkle.onUpdate((stepDelta) => {
              sparkle.opacity -= stepDelta * 1.8;
              sparkle.pos.y += stepDelta * 15;
              if (sparkle.opacity <= 0) sparkle.destroy();
            });
          } else {
            const sparkle = legacyContext.add([
              legacyContext.circle(pRadius),
              legacyContext.pos(pPos.x, pPos.y),
              legacyContext.color(255, 235, 140),
              legacyContext.opacity(0.85),
              legacyContext.z(15),
            ]) as BreachGameObject<TColor>;
            sparkle.onUpdate(() => {
              if (sparkle.opacity !== undefined) {
                sparkle.opacity -= resolveDeltaTime(k, null) * 1.8;
                sparkle.pos.y += resolveDeltaTime(k, null) * 15;
                if (sparkle.opacity <= 0) legacyContext.destroy(sparkle as unknown as TDestroyable);
              }
            });
          }
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
        safeShake(legacyContext, 8);

        // Explosão majestosa de reentrada (Splashdown) em arco simétrico (Fase 31.1)
        createBreachReentrySplash(
          k,
          resolveVector2<TVec>(k, playerPos.x, GAME_CONFIG.SEA_LEVEL),
          24
        );

        destroyBanner();

        // Aguarda a água acalmar e chama a tela de vitória
        if (resolvedNativeRenderEngine) {
          scheduleNativeSceneDelay(k, resolvedNativeRenderEngine, 0.6, onBreachComplete);
        } else {
          legacyContext.wait(0.6, () => {
            onBreachComplete();
          });
        }
      }
    }
  };

  if (resolvedNativeRenderEngine) {
    registerNativeSceneUpdate(k, resolvedNativeRenderEngine, updateBreachFrame);
    if (typeof legacyContext.onSceneLeave === "function") {
      legacyContext.onSceneLeave(destroyBanner);
    }
  } else {
    legacyContext.onUpdate(() => {
      updateBreachFrame(resolveDeltaTime(k, null));
    });
  }

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
    playerController.setSpeed(
      resolveVector2<TVec>(k, 280, -480) as unknown as Parameters<PlayerController["setSpeed"]>[0]
    );

    // Primeiro splash ao romper a água
    const playerPos = playerController.gameObj.pos;
    createWaterSplash(k, resolveVector2<TVec>(k, playerPos.x, GAME_CONFIG.SEA_LEVEL), 20);

    if (promptBanner) {
      promptBanner.text = "SALTO MAJESTOSO EXECUTADO! ✨ +500 PTS";
      promptBanner.color = resolveColorTuple<TColor>(k, 100, 255, 200);
      const bannerTweenHandle = createTween(
        1,
        0,
        1.2,
        (currentOpacity: number) => {
          if (promptBanner) promptBanner.opacity = currentOpacity;
        },
        Easings.easeOutQuad
      );
      bannerTweenHandle.promise.then(() => {
        destroyBanner();
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
 * @param k - Instância do contexto agnóstico do motor.
 * @param pos - Posição do ponto de contato na linha d'água (x, y).
 * @param particleCount - Quantidade de gotículas balísticas geradas (padrão: 26).
 */
export function createWaterSplash<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BreachVector2D,
>(
  k: IRenderEngine | BreachSplashEngineContext<TDestroyable, TColor, TVec>,
  pos: TVec | { x: number; y: number },
  particleCount: number = 26
) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as BreachSplashEngineContext<TDestroyable, TColor, TVec>;

  // 1. Gotículas de spray em pixel art 16-bits (quadrados angulares com paleta aquática retrô)
  const dropTuples: [number, number, number][] = [
    [255, 255, 255],
    [190, 240, 255],
    [120, 215, 255],
  ];

  for (let i = 0; i < particleCount; i++) {
    const angle = resolveRandomRange(k, -155, -25);
    const angleInRadians =
      typeof legacyContext.deg2rad === "function"
        ? legacyContext.deg2rad(angle)
        : (angle * Math.PI) / 180;
    const speed = resolveRandomRange(k, 140, 360);
    const velX = Math.cos(angleInRadians) * speed;
    const velY = Math.sin(angleInRadians) * speed;
    const size = resolveRandomRange(k, 3, 6);

    let dropVelY = velY;
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const chosenTuple = getRandomChoice(dropTuples) ?? dropTuples[0];
      const drop = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "breach_splash_drop",
        width: size,
        height: size,
        positionX: pos.x + resolveRandomRange(k, -18, 18),
        positionY: pos.y - 2,
        fillColor: chosenTuple,
        outlineColor: [60, 140, 210],
        outlineWidth: 1,
        opacity: 0.95,
        zIndex: 20,
      });
      drop.onUpdate((deltaTime) => {
        drop.pos.x += velX * deltaTime;
        drop.pos.y += dropVelY * deltaTime;
        dropVelY += 560 * deltaTime;
        drop.opacity -= deltaTime * 1.5;
        if (drop.opacity <= 0 || drop.pos.y > pos.y + 40) {
          drop.destroy();
        }
      });
    } else {
      const colors = [
        legacyContext.rgb(255, 255, 255),
        legacyContext.rgb(190, 240, 255),
        legacyContext.rgb(120, 215, 255),
      ];
      const dropColor = getRandomChoice(colors) ?? colors[0];
      const drop = legacyContext.add([
        legacyContext.rect(size, size),
        legacyContext.pos(pos.x + legacyContext.rand(-18, 18), pos.y - 2),
        legacyContext.color(dropColor),
        legacyContext.outline(1, legacyContext.rgb(60, 140, 210)),
        legacyContext.opacity(0.95),
        legacyContext.z(20),
      ]) as BreachGameObject<TColor>;

      drop.onUpdate(() => {
        const dt = legacyContext.dt();
        drop.pos.x += velX * dt;
        drop.pos.y += dropVelY * dt;
        dropVelY += 560 * dt; // Gravidade sobre a gota
        if (drop.opacity !== undefined) {
          drop.opacity -= dt * 1.5;
          if (drop.opacity <= 0 || drop.pos.y > pos.y + 40) {
            legacyContext.destroy(drop as unknown as TDestroyable);
          }
        }
      });
    }
  }

  // 2. Ondas de espuma 16-bits expandindo na superfície para esquerda e direita
  [-1, 1].forEach((dir) => {
    let foamWidth = 12;
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const foam = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "breach_splash_foam",
        width: 12,
        height: 4,
        positionX: pos.x + dir * 8,
        positionY: pos.y - 1,
        fillColor: [240, 252, 255],
        outlineColor: [100, 180, 240],
        outlineWidth: 1,
        opacity: 0.9,
        zIndex: 19,
      });
      foam.onUpdate((deltaTime) => {
        foam.pos.x += dir * 140 * deltaTime;
        foamWidth += 45 * deltaTime;
        foam.width = foamWidth;
        foam.opacity -= deltaTime * 2.2;
        if (foam.opacity <= 0) foam.destroy();
      });
    } else {
      const foam = legacyContext.add([
        legacyContext.rect(12, 4),
        legacyContext.pos(pos.x + dir * 8, pos.y - 1),
        legacyContext.color(240, 252, 255),
        legacyContext.outline(1, legacyContext.rgb(100, 180, 240)),
        legacyContext.opacity(0.9),
        legacyContext.z(19),
      ]) as BreachGameObject<TColor>;

      foam.onUpdate(() => {
        const dt = legacyContext.dt();
        foam.pos.x += dir * 140 * dt;
        foamWidth += 45 * dt;
        foam.width = foamWidth;
        if (foam.opacity !== undefined) {
          foam.opacity -= dt * 2.2;
          if (foam.opacity <= 0) legacyContext.destroy(foam as unknown as TDestroyable);
        }
      });
    }
  });

  // 3. Coluna de micro-bolhas submersas afundando e emergindo
  const pool = getParticlePool();
  for (let b = 0; b < 8; b++) {
    const bPos = resolveVector2<TVec>(
      k,
      pos.x + resolveRandomRange(k, -16, 16),
      pos.y + resolveRandomRange(k, 4, 22)
    );
    const bVelY = resolveRandomRange(k, 20, 60) - 25;
    if (pool) {
      pool.spawnRect({
        pos: bPos,
        width: 2,
        height: 2,
        color: resolveColorTuple<TColor>(k, 210, 245, 255),
        opacity: 0.85,
        z: 18,
        vel: resolveVector2<TVec>(k, 0, bVelY),
        fadeRate: 1.8,
        maxLife: 0.5,
      });
    } else if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const bubble = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "breach_submerged_bubble",
        width: 2,
        height: 2,
        positionX: bPos.x,
        positionY: bPos.y,
        fillColor: [210, 245, 255],
        opacity: 0.85,
        zIndex: 18,
      });
      bubble.onUpdate((deltaTime) => {
        bubble.pos.y += bVelY * deltaTime;
        bubble.opacity -= deltaTime * 1.8;
        if (bubble.opacity <= 0) bubble.destroy();
      });
    } else {
      const bubble = legacyContext.add([
        legacyContext.rect(2, 2),
        legacyContext.pos(bPos.x, bPos.y),
        legacyContext.color(210, 245, 255),
        legacyContext.opacity(0.85),
        legacyContext.z(18),
      ]) as BreachGameObject<TColor>;

      bubble.onUpdate(() => {
        const dt = legacyContext.dt();
        bubble.pos.y += bVelY * dt;
        if (bubble.opacity !== undefined) {
          bubble.opacity -= dt * 1.8;
          if (bubble.opacity <= 0) legacyContext.destroy(bubble as unknown as TDestroyable);
        }
      });
    }
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
  const angleInRadians = (angleDeg * Math.PI) / 180;
  const speed = 190 + (pairIndex % 3) * 60; // 190 a 310 px/s

  const velX = dir * Math.cos(angleInRadians) * speed;
  const velY = -Math.sin(angleInRadians) * speed; // impulso para cima

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
export function createBreachReentrySplash<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = BreachVector2D,
>(
  k: IRenderEngine | BreachSplashEngineContext<TDestroyable, TColor, TVec>,
  pos: TVec | { x: number; y: number },
  particleCount: number = 24
) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as BreachSplashEngineContext<TDestroyable, TColor, TVec>;

  // 1. Partículas retangulares brancas de respingo em arco balístico simétrico (Fase 31.1)
  for (let i = 0; i < particleCount; i++) {
    const data = calculateBreachReentryParticleData(i, particleCount);
    const curVelX = data.velX;
    let curVelY = data.velY;

    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const splashShard = createNativeRectNode(
        k,
        resolvedNativeRenderEngine,
        nativeWorldContainer,
        {
          identifier: "breach_reentry_splash",
          width: data.width,
          height: data.height,
          cornerRadius: 1,
          positionX: pos.x + resolveRandomRange(k, -12, 12),
          positionY: pos.y - 2,
          fillColor: [255, 255, 255],
          outlineColor: [180, 240, 255],
          outlineWidth: 1,
          opacity: 0.95,
          rotationDegrees: Math.atan2(curVelY, curVelX) * (180 / Math.PI) + 90,
          anchor: "center",
          zIndex: 21,
          tags: ["breach_reentry_splash"],
        }
      );
      splashShard.onUpdate((deltaTime) => {
        curVelY += data.gravityY * deltaTime;
        splashShard.pos.x += curVelX * deltaTime;
        splashShard.pos.y += curVelY * deltaTime;
        splashShard.angle = Math.atan2(curVelY, curVelX) * (180 / Math.PI) + 90;
        splashShard.opacity -= deltaTime * 1.4;
        if (splashShard.opacity <= 0 || splashShard.pos.y > pos.y + 35) {
          splashShard.destroy();
        }
      });
    } else {
      const splashShard = legacyContext.add([
        legacyContext.rect(data.width, data.height, { radius: 1 }),
        legacyContext.pos(pos.x + legacyContext.rand(-12, 12), pos.y - 2),
        legacyContext.color(255, 255, 255),
        legacyContext.outline(1, legacyContext.rgb(180, 240, 255)),
        legacyContext.opacity(0.95),
        legacyContext.rotate(Math.atan2(curVelY, curVelX) * (180 / Math.PI) + 90),
        legacyContext.anchor("center"),
        legacyContext.z(21),
        "breach_reentry_splash",
      ]) as BreachGameObject<TColor>;

      splashShard.onUpdate(() => {
        const dt = legacyContext.dt();
        curVelY += data.gravityY * dt;
        splashShard.pos.x += curVelX * dt;
        splashShard.pos.y += curVelY * dt;
        splashShard.angle = Math.atan2(curVelY, curVelX) * (180 / Math.PI) + 90;
        if (splashShard.opacity !== undefined) {
          splashShard.opacity -= dt * 1.4;
          if (splashShard.opacity <= 0 || splashShard.pos.y > pos.y + 35) {
            legacyContext.destroy(splashShard as unknown as TDestroyable);
          }
        }
      });
    }
  }

  // 2. Ondas de crista de choque de alta velocidade expandindo para ambos os lados
  [-1, 1].forEach((dir) => {
    let waveWidth = 16;
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const shockWave = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "breach_shockwave",
        width: 16,
        height: 4.5,
        cornerRadius: 2,
        positionX: pos.x + dir * 10,
        positionY: pos.y - 1,
        fillColor: [240, 252, 255],
        outlineColor: [120, 210, 255],
        outlineWidth: 1.5,
        opacity: 0.92,
        zIndex: 20,
      });
      shockWave.onUpdate((deltaTime) => {
        shockWave.pos.x += dir * 210 * deltaTime;
        waveWidth += 65 * deltaTime;
        shockWave.width = waveWidth;
        shockWave.opacity -= deltaTime * 2.0;
        if (shockWave.opacity <= 0) shockWave.destroy();
      });
    } else {
      const shockWave = legacyContext.add([
        legacyContext.rect(16, 4.5, { radius: 2 }),
        legacyContext.pos(pos.x + dir * 10, pos.y - 1),
        legacyContext.color(240, 252, 255),
        legacyContext.outline(1.5, legacyContext.rgb(120, 210, 255)),
        legacyContext.opacity(0.92),
        legacyContext.z(20),
      ]) as BreachGameObject<TColor>;

      shockWave.onUpdate(() => {
        const dt = legacyContext.dt();
        shockWave.pos.x += dir * 210 * dt;
        waveWidth += 65 * dt;
        shockWave.width = waveWidth;
        if (shockWave.opacity !== undefined) {
          shockWave.opacity -= dt * 2.0;
          if (shockWave.opacity <= 0) legacyContext.destroy(shockWave as unknown as TDestroyable);
        }
      });
    }
  });

  // 3. Spray de micro-gotas circulares no epicentro do impacto
  const reentryPool = getParticlePool();
  for (let g = 0; g < 12; g++) {
    const dPos = resolveVector2<TVec>(
      k,
      pos.x + resolveRandomRange(k, -25, 25),
      pos.y - resolveRandomRange(k, 2, 10)
    );
    const dVelX = resolveRandomRange(k, -120, 120);
    const dVelY = resolveRandomRange(k, -180, -90);
    const dRadius = resolveRandomRange(k, 2, 4.5);

    if (reentryPool) {
      reentryPool.spawnCircle({
        pos: dPos,
        radius: dRadius,
        color: resolveColorTuple<TColor>(k, 220, 245, 255),
        opacity: 0.85,
        z: 20,
        vel: resolveVector2<TVec>(k, dVelX, dVelY),
        gravityY: 520,
        fadeRate: 1.6,
        maxLife: 0.65,
        boundaryY: pos.y + 25,
        boundaryYMode: "greater",
      });
    } else if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const drop = createNativeCircleNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: "breach_reentry_microdrop",
        radius: dRadius,
        positionX: dPos.x,
        positionY: dPos.y,
        fillColor: [220, 245, 255],
        opacity: 0.85,
        zIndex: 20,
      });
      let curDVelY = dVelY;
      drop.onUpdate((deltaTime) => {
        curDVelY += 520 * deltaTime;
        drop.pos.x += dVelX * deltaTime;
        drop.pos.y += curDVelY * deltaTime;
        drop.opacity -= deltaTime * 1.6;
        if (drop.opacity <= 0 || drop.pos.y > pos.y + 25) {
          drop.destroy();
        }
      });
    } else {
      const drop = legacyContext.add([
        legacyContext.circle(dRadius),
        legacyContext.pos(dPos.x, dPos.y),
        legacyContext.color(220, 245, 255),
        legacyContext.opacity(0.85),
        legacyContext.z(20),
      ]) as BreachGameObject<TColor>;
      let curDVelY = dVelY;

      drop.onUpdate(() => {
        const dt = legacyContext.dt();
        curDVelY += 520 * dt;
        drop.pos.x += dVelX * dt;
        drop.pos.y += curDVelY * dt;
        if (drop.opacity !== undefined) {
          drop.opacity -= dt * 1.6;
          if (drop.opacity <= 0 || drop.pos.y > pos.y + 25) {
            legacyContext.destroy(drop as unknown as TDestroyable);
          }
        }
      });
    }
  }
}

export type BreachNativeNodeRef = NativeVisualObjectAdapter;

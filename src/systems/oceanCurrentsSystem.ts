import { TAGS } from "../config";
import type { PlayerController } from "../entities/player";
import { audioSystem } from "./audioSystem";
import { safeShake } from "../utils/camera";
import { getRandomChoice, getRandomFloat } from "../utils/random";
import { getSpatialCullingManager, type CullableTargetObject } from "./spatialCullingSystem";
import { getParticlePool } from "./particlePool";
import { getEntityFamilyTicker } from "./entityFamilyTicker";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeContainerNode,
  createNativeRectNode,
  NativeVisualObjectAdapter,
  registerNativeSceneUpdate,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface OceanCurrentVector2D {
  x: number;
  y: number;
}

export interface OceanCurrentGameObject {
  pos: OceanCurrentVector2D;
  opacity?: number;
  hidden?: boolean;
  add: (components: unknown[]) => OceanCurrentGameObject;
  onUpdate: (cb: () => void) => void;
  destroy?: () => void;
}

export interface OceanCurrentsEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = OceanCurrentVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  time: () => number;
  width?: () => number;
  onUpdate: (cb: () => void) => void;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  pos: (x: number, y: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline?: (w: number, col: TColor) => unknown;
  z: (v: number) => unknown;
  rand: (min: number, max: number) => number;
  choose: <T>(arr: T[]) => T;
  rgb: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
  shake?: (amount: number) => void;
  lifespan?: (time: number, opt?: { fade?: number }) => unknown;
  onSceneLeave?: (callback: () => void) => unknown;
}

/**
 * Interface que modela uma zona delimitada de correnteza oceânica.
 */
export interface CurrentZone {
  /** Coordenada horizontal de início da zona (em metros de migração) */
  startX: number;
  /** Coordenada horizontal de término da zona (em metros de migração) */
  endX: number;
  /** Coordenada vertical do topo da camada de correnteza (em pixels) */
  y: number;
  /** Espessura vertical da lâmina d'água da correnteza (em pixels) */
  height: number;
  /** Intensidade do vetor de empuxo hidrodinâmico em px/s² */
  force: number;
  /** Classificação do vetor de fluxo: contra a migração ('opposing') ou a favor ('favorable') */
  type: "opposing" | "favorable";
}

export const DEFAULT_OCEAN_CURRENTS: CurrentZone[] = [
  // 1. Correnteza Contrária 1 (Travessia inicial - meia água)
  { startX: 5800, endX: 7400, y: 180, height: 115, force: 170, type: "opposing" },
  // 2. Correnteza Favorável 1 (Travessia média - canal veloz de superfície)
  { startX: 7800, endX: 9400, y: 130, height: 110, force: 190, type: "favorable" },
  // 3. Correnteza Contrária 2 (Travessia profunda - fundo do mar)
  { startX: 9800, endX: 11400, y: 280, height: 125, force: 185, type: "opposing" },
  // 4. Correnteza do Estreito do Boqueirão (Arraial do Cabo - vão livre do canal submarino)
  { startX: 25800, endX: 26900, y: 80, height: 260, force: 140, type: "favorable" },
];

/**
 * Cria linhas de traço horizontais indicando a direção do fluxo vetorial (Fase 35.4).
 * Semelhante a setas de correntes em cartas náuticas oceanográficas.
 */
export function createCurrentVectorLines<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = OceanCurrentVector2D,
>(
  k: IRenderEngine | OceanCurrentsEngineContext<TDestroyable, TColor, TVec>,
  currentBox: OceanCurrentGameObject,
  zoneWidth: number,
  zoneHeight: number,
  isFavorable: boolean
): OceanCurrentGameObject[] {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const legacyContext = k as OceanCurrentsEngineContext<TDestroyable, TColor, TVec>;
  const lineCount = 5;
  const vectorLines: OceanCurrentGameObject[] = [];
  const lineSpacing = zoneHeight / (lineCount + 1);
  const nativeBoxAdapter = currentBox instanceof NativeVisualObjectAdapter ? currentBox : null;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const verticalPosition = lineSpacing * (lineIndex + 1);
    const dashLength = 40;
    const dashHeight = 2;
    const horizontalOffset = getRandomFloat(0, zoneWidth);

    let vectorDash: OceanCurrentGameObject;
    if (resolvedNativeRenderEngine && nativeBoxAdapter) {
      vectorDash = createNativeRectNode(
        k,
        resolvedNativeRenderEngine,
        nativeBoxAdapter.renderNode,
        {
          identifier: "ocean_current_vector_line",
          width: dashLength,
          height: dashHeight,
          cornerRadius: 1,
          positionX: horizontalOffset,
          positionY: verticalPosition,
          fillColor: [100, 150, 200],
          opacity: 0.25,
          tags: ["ocean_current_vector_line"],
        }
      ) as unknown as OceanCurrentGameObject;
    } else {
      vectorDash = currentBox.add([
        legacyContext.rect(dashLength, dashHeight, { radius: 1 }),
        legacyContext.pos(horizontalOffset, verticalPosition),
        legacyContext.color(100, 150, 200),
        legacyContext.opacity(0.25),
        "ocean_current_vector_line",
      ]);
    }

    // Direção da corrente: favorável move para a direita (+X), contrária move para a esquerda (-X)
    const flowSpeed = isFavorable ? 220 : -180;
    const familyTicker = getEntityFamilyTicker();
    if (!familyTicker) {
      if (vectorDash instanceof NativeVisualObjectAdapter) {
        vectorDash.onUpdate((deltaTime: number) => {
          if (currentBox.hidden) return;
          vectorDash.pos.x += flowSpeed * deltaTime;
          if (isFavorable && vectorDash.pos.x > zoneWidth + 20) {
            vectorDash.pos.x = -dashLength;
          } else if (!isFavorable && vectorDash.pos.x < -dashLength - 20) {
            vectorDash.pos.x = zoneWidth + 20;
          }
        });
      } else {
        vectorDash.onUpdate(() => {
          if (currentBox.hidden) return;
          const deltaTime = legacyContext.dt();
          vectorDash.pos.x += flowSpeed * deltaTime;
          if (isFavorable && vectorDash.pos.x > zoneWidth + 20) {
            vectorDash.pos.x = -dashLength;
          } else if (!isFavorable && vectorDash.pos.x < -dashLength - 20) {
            vectorDash.pos.x = zoneWidth + 20;
          }
        });
      }
    }

    vectorLines.push(vectorDash);
  }

  return vectorLines;
}

/**
 * Sistema Unificado de Correntezas Oceânicas (Favoráveis e Contrárias).
 *
 * Simula os corredores hidrodinâmicos da grande migração pelágica (Fases 15 e 18.1):
 * - Filamentos dinâmicos e vórtices translúcidos que deslizam na direção do fluxo marinho.
 * - Aplicação contínua de força hidrodinâmica ao jogador conforme alinhamento vetorial.
 * - Modulação do consumo de oxigênio (Fase 18.1): nadar contra o fluxo intensifica o esforço (+35% dreno),
 *   enquanto nadar a favor da esteira hidrodinâmâmica alivia a respiração (-35% dreno).
 *
 * @param k - Instância do contexto agnóstico do motor.
 * @param playerController - Controlador físico da baleia-jubarte.
 * @param zones - Vetor de zonas de correnteza a serem geradas no mundo.
 */
export function setupOceanCurrentsSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = OceanCurrentVector2D,
>(
  k: IRenderEngine | OceanCurrentsEngineContext<TDestroyable, TColor, TVec>,
  playerController: PlayerController,
  zones: CurrentZone[] = DEFAULT_OCEAN_CURRENTS
) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as OceanCurrentsEngineContext<TDestroyable, TColor, TVec>;
  const createdNativeNodes: Array<{ destroy(): void }> = [];
  const cleanupHandles: Array<() => void> = [];

  const getDeltaTime = (): number => {
    if (typeof legacyContext.dt === "function") {
      return legacyContext.dt();
    }
    return resolvedNativeRenderEngine
      ? resolvedNativeRenderEngine.getTicker().getDeltaTime()
      : 0.016;
  };

  let fallbackElapsedTime = 0;
  const getCurrentTime = (deltaTime: number): number => {
    fallbackElapsedTime += deltaTime;
    return typeof legacyContext.time === "function" ? legacyContext.time() : fallbackElapsedTime;
  };

  const resolveRandomFloat = (min: number, max: number): number => {
    return typeof legacyContext.rand === "function"
      ? legacyContext.rand(min, max)
      : getRandomFloat(min, max);
  };

  const resolveRgbColor = (red: number, green: number, blue: number): TColor => {
    return typeof legacyContext.rgb === "function"
      ? legacyContext.rgb(red, green, blue)
      : ([red, green, blue] as unknown as TColor);
  };

  const createVelocityVector = (
    x: number,
    y: number
  ): Parameters<PlayerController["setSpeed"]>[0] => {
    if (typeof legacyContext.vec2 === "function") {
      return legacyContext.vec2(x, y) as unknown as Parameters<PlayerController["setSpeed"]>[0];
    }
    return {
      x,
      y,
      len: () => Math.hypot(x, y),
      scale: (factor: number) => createVelocityVector(x * factor, y * factor),
    } as unknown as Parameters<PlayerController["setSpeed"]>[0];
  };

  let lastFavorableAudioTime = 0;

  const totalZones = zones.length;
  for (let z = 0; z < totalZones; z++) {
    const zone = zones[z];
    const width = zone.endX - zone.startX;
    const isFavorable = zone.type === "favorable";

    // 1. Âncora da correnteza (100% natural, sem contorno e sem cor diferente do fundo)
    let currentBox: OceanCurrentGameObject;
    let nativeCurrentBox: NativeVisualObjectAdapter | null = null;
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      nativeCurrentBox = createNativeContainerNode(
        k,
        resolvedNativeRenderEngine,
        nativeWorldContainer,
        {
          identifier: `ocean_current_${z}`,
          positionX: zone.startX,
          positionY: zone.y,
          zIndex: 2,
          tags: [isFavorable ? TAGS.FAVORABLE_CURRENT : TAGS.OPPOSING_CURRENT, "ocean_current"],
        }
      );
      createdNativeNodes.push(nativeCurrentBox);
      currentBox = nativeCurrentBox as unknown as OceanCurrentGameObject;
    } else {
      currentBox = legacyContext.add([
        legacyContext.pos(zone.startX, zone.y),
        legacyContext.z(2),
        isFavorable ? TAGS.FAVORABLE_CURRENT : TAGS.OPPOSING_CURRENT,
        "ocean_current",
      ]) as OceanCurrentGameObject;
    }

    const cullingManager = getSpatialCullingManager();
    cullingManager?.registerEntity(
      currentBox as unknown as CullableTargetObject,
      () => zone.startX + width / 2,
      width / 2
    );

    const familyTicker = getEntityFamilyTicker();

    // 2. Linhas vetoriais oceanográficas de fluxo visível (Fase 35.4)
    const vectorLines = createCurrentVectorLines(k, currentBox, width, zone.height, isFavorable);

    // 3. Filamentos e esteiras aquáticas dinâmicas
    const filamentCount = Math.max(6, Math.min(16, Math.round(width / 180)));
    const streamFilaments: Array<{
      streamLine: OceanCurrentGameObject;
      filamentWidth: number;
      streamSpeed: number;
      offsetY: number;
      sway: number;
    }> = [];

    for (let i = 0; i < filamentCount; i++) {
      const filamentWidth = resolveRandomFloat(40, 95);
      const filamentHeight = resolveRandomFloat(2.0, 3.5);
      const offsetX = getRandomFloat(0, width);
      const offsetY = getRandomFloat(8, zone.height - 8);

      const favorableColors: [number, number, number][] = [
        [140, 245, 255],
        [255, 230, 140],
        [200, 255, 255],
      ];
      const opposingColors: [number, number, number][] = [
        [215, 230, 250],
        [175, 195, 225],
        [240, 245, 255],
      ];
      const chosenTuple = getRandomChoice(isFavorable ? favorableColors : opposingColors) ?? [
        200, 240, 255,
      ];

      let streamLine: OceanCurrentGameObject;
      if (resolvedNativeRenderEngine && nativeCurrentBox) {
        streamLine = createNativeRectNode(
          k,
          resolvedNativeRenderEngine,
          nativeCurrentBox.renderNode,
          {
            identifier: "ocean_current_filament",
            width: filamentWidth,
            height: filamentHeight,
            cornerRadius: filamentHeight / 2,
            positionX: offsetX,
            positionY: offsetY,
            fillColor: chosenTuple,
            opacity: resolveRandomFloat(0.45, 0.75),
          }
        ) as unknown as OceanCurrentGameObject;
      } else {
        const streamColor = isFavorable
          ? legacyContext.choose([
              legacyContext.rgb(140, 245, 255),
              legacyContext.rgb(255, 230, 140),
              legacyContext.rgb(200, 255, 255),
            ])
          : legacyContext.choose([
              legacyContext.rgb(215, 230, 250),
              legacyContext.rgb(175, 195, 225),
              legacyContext.rgb(240, 245, 255),
            ]);

        streamLine = currentBox.add([
          legacyContext.rect(filamentWidth, filamentHeight, { radius: filamentHeight / 2 }),
          legacyContext.pos(offsetX, offsetY),
          legacyContext.color(streamColor),
          legacyContext.opacity(legacyContext.rand(0.45, 0.75)),
        ]);
      }

      const streamSpeed = isFavorable ? resolveRandomFloat(200, 320) : resolveRandomFloat(150, 230);
      const sway = getRandomFloat(0, Math.PI * 2);

      streamFilaments.push({
        streamLine,
        filamentWidth,
        streamSpeed,
        offsetY,
        sway,
      });

      if (!familyTicker) {
        let filamentSway = sway;
        if (streamLine instanceof NativeVisualObjectAdapter) {
          streamLine.onUpdate((deltaTime: number) => {
            if (currentBox.hidden) return;
            filamentSway += deltaTime * 3;
            if (isFavorable) {
              streamLine.pos.x += deltaTime * streamSpeed;
              if (streamLine.pos.x > width + 40) streamLine.pos.x = -filamentWidth;
            } else {
              streamLine.pos.x -= deltaTime * streamSpeed;
              if (streamLine.pos.x < -filamentWidth - 20) streamLine.pos.x = width + 20;
            }
            streamLine.pos.y = offsetY + Math.sin(filamentSway) * 2;
          });
        } else {
          streamLine.onUpdate(() => {
            if (currentBox.hidden) return;
            const deltaTime = legacyContext.dt();
            filamentSway += deltaTime * 3;

            if (isFavorable) {
              streamLine.pos.x += deltaTime * streamSpeed;
              if (streamLine.pos.x > width + 40) {
                streamLine.pos.x = -filamentWidth;
              }
            } else {
              streamLine.pos.x -= deltaTime * streamSpeed;
              if (streamLine.pos.x < -filamentWidth - 20) {
                streamLine.pos.x = width + 20;
              }
            }

            // Leve ondulação vertical do filamento
            streamLine.pos.y = offsetY + Math.sin(filamentSway) * 2;
          });
        }
      }
    }

    // 4. Vórtices e redemoinhos sutis (para correntes contrárias)
    const vortexList: Array<{ vortex: OceanCurrentGameObject; angle: number }> = [];
    if (!isFavorable) {
      const vortexCount = Math.max(2, Math.round(width / 600));
      for (let v = 0; v < vortexCount; v++) {
        const vortexX = (v + 0.5) * (width / vortexCount);
        const vortexY = zone.height * 0.5 + getRandomFloat(-12.5, 12.5);

        let vortex: OceanCurrentGameObject;
        if (resolvedNativeRenderEngine && nativeCurrentBox) {
          vortex = createNativeCircleNode(
            k,
            resolvedNativeRenderEngine,
            nativeCurrentBox.renderNode,
            {
              identifier: "ocean_current_vortex",
              radius: resolveRandomFloat(6, 12),
              positionX: vortexX,
              positionY: vortexY,
              fillColor: [180, 210, 245],
              outlineColor: [230, 240, 255],
              outlineWidth: 1.5,
              opacity: 0.25,
            }
          ) as unknown as OceanCurrentGameObject;
        } else {
          const vortexComponents: unknown[] = [
            legacyContext.circle(legacyContext.rand(6, 12)),
            legacyContext.pos(vortexX, vortexY),
            legacyContext.color(180, 210, 245),
            legacyContext.opacity(0.25),
          ];
          if (legacyContext.outline) {
            vortexComponents.push(legacyContext.outline(1.5, legacyContext.rgb(230, 240, 255)));
          }
          vortex = currentBox.add(vortexComponents);
        }

        const vortexAngle = getRandomFloat(0, 10);
        vortexList.push({ vortex, angle: vortexAngle });

        if (!familyTicker) {
          let currentAngle = vortexAngle;
          if (vortex instanceof NativeVisualObjectAdapter) {
            vortex.onUpdate((deltaTime: number) => {
              if (currentBox.hidden) return;
              currentAngle -= deltaTime * 4;
              vortex.opacity = 0.18 + Math.sin(currentAngle) * 0.12;
            });
          } else {
            vortex.onUpdate(() => {
              if (currentBox.hidden) return;
              currentAngle -= legacyContext.dt() * 4;
              vortex.opacity = 0.18 + Math.sin(currentAngle) * 0.12;
            });
          }
        }
      }
    }

    const updateCurrentZone = (deltaTime: number) => {
      // 1. Linhas vetoriais de fluxo
      const dashLength = 40;
      const flowSpeed = isFavorable ? 220 : -180;
      for (let i = 0; i < vectorLines.length; i++) {
        const line = vectorLines[i];
        line.pos.x += flowSpeed * deltaTime;
        if (isFavorable && line.pos.x > width + 20) {
          line.pos.x = -dashLength;
        } else if (!isFavorable && line.pos.x < -dashLength - 20) {
          line.pos.x = width + 20;
        }
      }

      // 2. Filamentos aquáticos
      for (let i = 0; i < streamFilaments.length; i++) {
        const item = streamFilaments[i];
        item.sway += deltaTime * 3;
        if (isFavorable) {
          item.streamLine.pos.x += deltaTime * item.streamSpeed;
          if (item.streamLine.pos.x > width + 40) {
            item.streamLine.pos.x = -item.filamentWidth;
          }
        } else {
          item.streamLine.pos.x -= deltaTime * item.streamSpeed;
          if (item.streamLine.pos.x < -item.filamentWidth - 20) {
            item.streamLine.pos.x = width + 20;
          }
        }
        item.streamLine.pos.y = item.offsetY + Math.sin(item.sway) * 2;
      }

      // 3. Vórtices
      for (let i = 0; i < vortexList.length; i++) {
        const item = vortexList[i];
        item.angle -= deltaTime * 4;
        item.vortex.opacity = 0.18 + Math.sin(item.angle) * 0.12;
      }

      // 4. Interação física contínua com a baleia e cálculo de dinâmica de fôlego
      const playerPos = playerController.gameObj.pos;

      const isInX = playerPos.x >= zone.startX && playerPos.x <= zone.endX;
      const isInY = playerPos.y >= zone.y && playerPos.y <= zone.y + zone.height;

      if (isInX && isInY) {
        const currentSpeed = playerController.getSpeed();
        const facingRight = playerController.isFacingRight
          ? playerController.isFacingRight()
          : true;

        // Sentido da correnteza (+1 para favorável/leste, -1 para contrária/oeste)
        const currentDir = isFavorable ? 1 : -1;
        const whaleDir = facingRight ? 1 : -1;
        const isAlignedWithFlow = currentDir === whaleDir;

        // Fase 18.1: A favor do fluxo = -35% de dreno (0.65x); Contra o fluxo = +35% de dreno (1.35x)
        const flowModifier = isAlignedWithFlow ? 0.65 : 1.35;
        if (playerController.setCurrentFlowModifier) {
          playerController.setCurrentFlowModifier(flowModifier);
        }

        if (isFavorable) {
          // Acelera a jubarte para a frente (+X) com empuxo hidrodinâmico
          playerController.setSpeed(
            createVelocityVector(currentSpeed.x + zone.force * deltaTime, currentSpeed.y)
          );

          // Áudio de impulso favorável com debounce
          const now = getCurrentTime(deltaTime);
          if (now - lastFavorableAudioTime > 2.0) {
            lastFavorableAudioTime = now;
            audioSystem.playSpeedBoost();
          }

          // Partículas douradas de fluxo favorável na baleia via ParticlePool
          const normalizedDeltaTime = deltaTime * 60;
          if (getRandomFloat(0, 1) < 0.125 * normalizedDeltaTime) {
            const particlePool = getParticlePool();
            if (particlePool) {
              particlePool.spawnRect({
                pos: {
                  x: playerPos.x + getRandomFloat(-25, 25),
                  y: playerPos.y + getRandomFloat(-10, 10),
                },
                width: 3,
                height: 3,
                color: resolveRgbColor(255, 235, 140),
                opacity: 0.8,
                z: 15,
                vel: { x: 180, y: 0 },
                fadeRate: 2.8,
                maxLife: 0.8,
              });
            } else if (resolvedNativeRenderEngine && nativeWorldContainer) {
              const particle = createNativeRectNode(
                k,
                resolvedNativeRenderEngine,
                nativeWorldContainer,
                {
                  identifier: "ocean_current_boost_particle",
                  width: 3,
                  height: 3,
                  cornerRadius: 1,
                  positionX: playerPos.x + resolveRandomFloat(-25, 25),
                  positionY: playerPos.y + resolveRandomFloat(-10, 10),
                  fillColor: [255, 235, 140],
                  opacity: 0.8,
                  zIndex: 15,
                }
              );
              particle.onUpdate((stepDelta) => {
                particle.pos.x += 180 * stepDelta;
                particle.opacity -= stepDelta * 2.8;
                if (particle.opacity <= 0) particle.destroy();
              });
            } else {
              const particleComponents: unknown[] = [
                legacyContext.rect(3, 3, { radius: 1 }),
                legacyContext.pos(
                  playerPos.x + legacyContext.rand(-25, 25),
                  playerPos.y + legacyContext.rand(-10, 10)
                ),
                legacyContext.color(255, 235, 140),
                legacyContext.opacity(0.8),
                legacyContext.z(15),
              ];
              if (typeof legacyContext.lifespan === "function") {
                particleComponents.push(legacyContext.lifespan(2.5, { fade: 0.5 }));
              }
              const particle = legacyContext.add(particleComponents) as OceanCurrentGameObject;
              particle.onUpdate(() => {
                particle.pos.x += 180 * legacyContext.dt();
                if (
                  typeof legacyContext.lifespan !== "function" &&
                  particle.opacity !== undefined
                ) {
                  particle.opacity -= legacyContext.dt() * 2.8;
                  if (particle.opacity <= 0)
                    legacyContext.destroy(particle as unknown as TDestroyable);
                }
              });
            }
          }
        } else {
          // Empurra a jubarte para trás (-X)
          playerController.setSpeed(
            createVelocityVector(currentSpeed.x - zone.force * deltaTime, currentSpeed.y)
          );

          // Leve turbulência visual na tela com guarda de movimento reduzido
          const normalizedDeltaTime = deltaTime * 60;
          if (getRandomFloat(0, 1) < 0.15 * normalizedDeltaTime) {
            safeShake(legacyContext, 1.0);
          }
        }

        // Micro-bolhas de esforço/resistência ao nadar contra a correnteza via ParticlePool
        const normalizedDeltaTime = deltaTime * 60;
        if (!isAlignedWithFlow && getRandomFloat(0, 1) < 0.11 * normalizedDeltaTime) {
          const particlePool = getParticlePool();
          if (particlePool) {
            particlePool.spawnRect({
              pos: {
                x: playerPos.x + (facingRight ? 40 : -40),
                y: playerPos.y + getRandomFloat(-8, 8),
              },
              width: 3,
              height: 3,
              color: resolveRgbColor(200, 230, 255),
              opacity: 0.65,
              z: 14,
              vel: { x: -currentDir * 110, y: -20 },
              fadeRate: 2.2,
              maxLife: 1.0,
            });
          } else if (resolvedNativeRenderEngine && nativeWorldContainer) {
            const bubble = createNativeRectNode(
              k,
              resolvedNativeRenderEngine,
              nativeWorldContainer,
              {
                identifier: "ocean_current_drag_bubble",
                width: 3,
                height: 3,
                cornerRadius: 1,
                positionX: playerPos.x + (facingRight ? 40 : -40),
                positionY: playerPos.y + resolveRandomFloat(-8, 8),
                fillColor: [200, 230, 255],
                opacity: 0.65,
                zIndex: 14,
              }
            );
            bubble.onUpdate((stepDelta) => {
              bubble.pos.x -= currentDir * 110 * stepDelta;
              bubble.pos.y -= 20 * stepDelta;
              bubble.opacity -= stepDelta * 2.2;
              if (bubble.opacity <= 0) bubble.destroy();
            });
          } else {
            const bubbleComponents: unknown[] = [
              legacyContext.rect(3, 3, { radius: 1 }),
              legacyContext.pos(
                playerPos.x + (facingRight ? 40 : -40),
                playerPos.y + legacyContext.rand(-8, 8)
              ),
              legacyContext.color(200, 230, 255),
              legacyContext.opacity(0.65),
              legacyContext.z(14),
            ];
            if (typeof legacyContext.lifespan === "function") {
              bubbleComponents.push(legacyContext.lifespan(2.5, { fade: 0.5 }));
            }
            const bubble = legacyContext.add(bubbleComponents) as OceanCurrentGameObject;
            bubble.onUpdate(() => {
              bubble.pos.x -= currentDir * 110 * legacyContext.dt();
              bubble.pos.y -= 20 * legacyContext.dt();
              if (typeof legacyContext.lifespan !== "function" && bubble.opacity !== undefined) {
                bubble.opacity -= legacyContext.dt() * 2.2;
                if (bubble.opacity <= 0) legacyContext.destroy(bubble as unknown as TDestroyable);
              }
            });
          }
        }
      }
    };

    if (familyTicker) {
      familyTicker.registerEntity({
        id: `ocean_current_${z}_${zone.startX}`,
        family: "current",
        getXPosition: () => zone.startX + width / 2,
        width: width / 2,
        targetObject: currentBox,
        update: updateCurrentZone,
      });
    } else if (resolvedNativeRenderEngine && nativeCurrentBox) {
      nativeCurrentBox.onUpdate(updateCurrentZone);
    } else {
      currentBox.onUpdate(() => {
        updateCurrentZone(getDeltaTime());
      });
    }
  }

  // Reset do modificador quando a baleia não estiver dentro de nenhuma zona
  const resetModifierTick = () => {
    if (!playerController.gameObj || !playerController.gameObj.pos) return;
    const playerPos = playerController.gameObj.pos;
    const inAny = zones.some(
      (z) =>
        playerPos.x >= z.startX &&
        playerPos.x <= z.endX &&
        playerPos.y >= z.y &&
        playerPos.y <= z.y + z.height
    );
    if (!inAny && playerController.setCurrentFlowModifier) {
      if (
        playerController.getCurrentFlowModifier &&
        playerController.getCurrentFlowModifier() !== 1.0
      ) {
        playerController.setCurrentFlowModifier(1.0);
      }
    }
  };

  if (resolvedNativeRenderEngine) {
    cleanupHandles.push(
      registerNativeSceneUpdate(k, resolvedNativeRenderEngine, resetModifierTick)
    );
    if (typeof legacyContext.onSceneLeave === "function") {
      legacyContext.onSceneLeave(() => {
        for (let index = 0; index < cleanupHandles.length; index++) {
          cleanupHandles[index]();
        }
        cleanupHandles.length = 0;
        for (let index = 0; index < createdNativeNodes.length; index++) {
          createdNativeNodes[index].destroy();
        }
        createdNativeNodes.length = 0;
      });
    }
  } else {
    legacyContext.onUpdate(resetModifierTick);
  }
}

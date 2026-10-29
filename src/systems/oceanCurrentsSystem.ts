import { TAGS } from "../config";
import type { PlayerController } from "../entities/player";
import { audioSystem } from "./audioSystem";
import { safeShake } from "../utils/camera";
import { getRandomFloat } from "../utils/random";

export interface OceanCurrentVector2D {
  x: number;
  y: number;
}

export interface OceanCurrentGameObject {
  pos: OceanCurrentVector2D;
  opacity?: number;
  add: (components: unknown[]) => OceanCurrentGameObject;
  onUpdate: (cb: () => void) => void;
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
  k: OceanCurrentsEngineContext<TDestroyable, TColor, TVec>,
  currentBox: OceanCurrentGameObject,
  zoneWidth: number,
  zoneHeight: number,
  isFavorable: boolean
): OceanCurrentGameObject[] {
  const lineCount = 5;
  const vectorLines: OceanCurrentGameObject[] = [];
  const lineSpacing = zoneHeight / (lineCount + 1);

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
    const verticalPosition = lineSpacing * (lineIndex + 1);
    const dashLength = 40;
    const dashHeight = 2;
    const horizontalOffset = getRandomFloat(0, zoneWidth);

    const vectorDash = currentBox.add([
      k.rect(dashLength, dashHeight, { radius: 1 }),
      k.pos(horizontalOffset, verticalPosition),
      k.color(100, 150, 200),
      k.opacity(0.25),
      "ocean_current_vector_line",
    ]) as OceanCurrentGameObject;

    // Direção da corrente: favorável move para a direita (+X), contrária move para a esquerda (-X)
    const flowSpeed = isFavorable ? 220 : -180;
    vectorDash.onUpdate(() => {
      const deltaTime = k.dt();
      vectorDash.pos.x += flowSpeed * deltaTime;
      if (isFavorable && vectorDash.pos.x > zoneWidth + 20) {
        vectorDash.pos.x = -dashLength;
      } else if (!isFavorable && vectorDash.pos.x < -dashLength - 20) {
        vectorDash.pos.x = zoneWidth + 20;
      }
    });

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
 *   enquanto nadar a favor da esteira hidrodinâmica alivia a respiração (-35% dreno).
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
  k: OceanCurrentsEngineContext<TDestroyable, TColor, TVec>,
  playerController: PlayerController,
  zones: CurrentZone[] = DEFAULT_OCEAN_CURRENTS
) {
  let lastFavorableAudioTime = 0;

  zones.forEach((zone) => {
    const width = zone.endX - zone.startX;
    const isFavorable = zone.type === "favorable";

    // 1. Âncora da correnteza (100% natural, sem contorno e sem cor diferente do fundo)
    const currentBox = k.add([
      k.pos(zone.startX, zone.y),
      k.z(2),
      isFavorable ? TAGS.FAVORABLE_CURRENT : TAGS.OPPOSING_CURRENT,
      "ocean_current",
    ]) as OceanCurrentGameObject;

    // 2. Linhas vetoriais oceanográficas de fluxo visível (Fase 35.4)
    createCurrentVectorLines(k, currentBox, width, zone.height, isFavorable);

    // 3. Filamentos e esteiras aquáticas dinâmicas
    const filamentCount = Math.max(6, Math.min(16, Math.round(width / 180)));
    for (let i = 0; i < filamentCount; i++) {
      const filamentWidth = k.rand(40, 95);
      const filamentHeight = k.rand(2.0, 3.5);
      const offsetX = getRandomFloat(0, width);
      const offsetY = getRandomFloat(8, zone.height - 8);

      const streamColor = isFavorable
        ? k.choose([k.rgb(140, 245, 255), k.rgb(255, 230, 140), k.rgb(200, 255, 255)])
        : k.choose([k.rgb(215, 230, 250), k.rgb(175, 195, 225), k.rgb(240, 245, 255)]);

      const streamLine = currentBox.add([
        k.rect(filamentWidth, filamentHeight, { radius: filamentHeight / 2 }),
        k.pos(offsetX, offsetY),
        k.color(streamColor),
        k.opacity(k.rand(0.45, 0.75)),
      ]);

      const streamSpeed = isFavorable ? k.rand(200, 320) : k.rand(150, 230);
      let sway = getRandomFloat(0, Math.PI * 2);

      streamLine.onUpdate(() => {
        const deltaTime = k.dt();
        sway += deltaTime * 3;

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
        streamLine.pos.y = offsetY + Math.sin(sway) * 2;
      });
    }

    // 4. Vórtices e redemoinhos sutis (para correntes contrárias)
    if (!isFavorable) {
      const vortexCount = Math.max(2, Math.round(width / 600));
      for (let v = 0; v < vortexCount; v++) {
        const vortexX = (v + 0.5) * (width / vortexCount);
        const vortexY = zone.height * 0.5 + getRandomFloat(-12.5, 12.5);

        const vortexComponents: unknown[] = [
          k.circle(k.rand(6, 12)),
          k.pos(vortexX, vortexY),
          k.color(180, 210, 245),
          k.opacity(0.25),
        ];
        if (k.outline) {
          vortexComponents.push(k.outline(1.5, k.rgb(230, 240, 255)));
        }
        const vortex = currentBox.add(vortexComponents) as OceanCurrentGameObject;

        let vortexAngle = getRandomFloat(0, 10);
        vortex.onUpdate(() => {
          vortexAngle -= k.dt() * 4;
          vortex.opacity = 0.18 + Math.sin(vortexAngle) * 0.12;
        });
      }
    }

    // 4. Interação física contínua com a baleia e cálculo de dinâmica de fôlego
    currentBox.onUpdate(() => {
      const playerPos = playerController.gameObj.pos;

      const isInX = playerPos.x >= zone.startX && playerPos.x <= zone.endX;
      const isInY = playerPos.y >= zone.y && playerPos.y <= zone.y + zone.height;

      if (isInX && isInY) {
        const dt = k.dt();
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
            k.vec2(currentSpeed.x + zone.force * dt, currentSpeed.y) as unknown as Parameters<
              PlayerController["setSpeed"]
            >[0]
          );

          // Áudio de impulso favorável com debounce
          const now = k.time();
          if (now - lastFavorableAudioTime > 2.0) {
            lastFavorableAudioTime = now;
            audioSystem.playSpeedBoost();
          }

          // Partículas douradas de fluxo favorável na baleia (normalizado por deltaTime)
          const normalizedDeltaTime = dt * 60;
          if (getRandomFloat(0, 1) < 0.25 * normalizedDeltaTime) {
            const particle = k.add([
              k.circle(k.rand(2, 3.5)),
              k.pos(playerPos.x + k.rand(-25, 25), playerPos.y + k.rand(-10, 10)),
              k.color(255, 235, 140),
              k.opacity(0.8),
              k.z(15),
            ]) as OceanCurrentGameObject;
            particle.onUpdate(() => {
              particle.pos.x += 180 * k.dt();
              if (particle.opacity !== undefined) {
                particle.opacity -= k.dt() * 2.8;
                if (particle.opacity <= 0) k.destroy(particle as unknown as TDestroyable);
              }
            });
          }
        } else {
          // Empurra a jubarte para trás (-X)
          playerController.setSpeed(
            k.vec2(currentSpeed.x - zone.force * dt, currentSpeed.y) as unknown as Parameters<
              PlayerController["setSpeed"]
            >[0]
          );

          // Leve turbulência visual na tela com guarda de movimento reduzido
          const normalizedDeltaTime = dt * 60;
          if (getRandomFloat(0, 1) < 0.15 * normalizedDeltaTime) {
            safeShake(k, 1.0);
          }
        }

        // Micro-bolhas de esforço/resistência ao nadar contra a correnteza (normalizado por deltaTime)
        const normalizedDeltaTime = dt * 60;
        if (!isAlignedWithFlow && getRandomFloat(0, 1) < 0.22 * normalizedDeltaTime) {
          const bubble = k.add([
            k.circle(k.rand(1.5, 3)),
            k.pos(playerPos.x + (facingRight ? 40 : -40), playerPos.y + k.rand(-8, 8)),
            k.color(200, 230, 255),
            k.opacity(0.65),
            k.z(14),
          ]) as OceanCurrentGameObject;
          bubble.onUpdate(() => {
            bubble.pos.x -= currentDir * 110 * k.dt();
            bubble.pos.y -= 20 * k.dt();
            if (bubble.opacity !== undefined) {
              bubble.opacity -= k.dt() * 2.2;
              if (bubble.opacity <= 0) k.destroy(bubble as unknown as TDestroyable);
            }
          });
        }
      }
    });
  });

  // Reset do modificador quando a baleia não estiver dentro de nenhuma zona
  k.onUpdate(() => {
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
  });
}

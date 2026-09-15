import kaboom from "kaboom";
import { TAGS, GAME_CONFIG } from "../config";
import { audioSystem } from "./audioSystem";

export interface IceGap {
  start: number;
  end: number;
}

// Fendas de respiração pré-definidas na camada de gelo (0m a 5.000m) - Modelo Imutável
export const DEFAULT_ICE_GAPS: IceGap[] = [
  { start: 60, end: 240 },   // Fenda inicial de respiração e salto no ponto de largada (120m)
  { start: 600, end: 750 },
  { start: 1400, end: 1550 },
  { start: 2200, end: 2350 },
  { start: 3100, end: 3250 },
  { start: 4000, end: 4150 },
  { start: 4700, end: 4850 },
];

export const ICE_GAPS = DEFAULT_ICE_GAPS;

// Fendas ativas da partida em execução (resetadas a cada reinício de partida)
export let activeIceGaps: IceGap[] = [];

/**
 * Checa se uma posição X na Antártida (0-5000m) está em uma fenda de ar livre.
 */
export function isPositionInIceGap(x: number): boolean {
  if (x < 0 || x > 5000) return true; // Fora do gelo antártico, ar sempre livre
  const gapsToCheck = activeIceGaps.length > 0 ? activeIceGaps : DEFAULT_ICE_GAPS;
  return gapsToCheck.some((gap) => x >= gap.start && x <= gap.end);
}

/**
 * Cria a camada de gelo, o iceberg de parede inicial e as aberturas de respiração no bioma Antártico (0m - 5000m).
 */
export function setupIceSurfaceSystem(k: ReturnType<typeof kaboom>, playerController?: any) {
  // Reseta as fendas ativas para a configuração padrão limpa ao iniciar/reiniciar o jogo
  activeIceGaps = DEFAULT_ICE_GAPS.map((gap) => ({ ...gap }));

  const iceHeight = 40;
  const icePosY = GAME_CONFIG.SEA_LEVEL - 20; // Flutua sobre a linha do mar (80px)
  const totalDistance = 5000;
  let currentX = 0;

  // Função auxiliar para gerar um bloco modular de gelo quebrável (sem linhas de divisão)
  function spawnIceSegment(x: number, width: number) {
    let isBroken = false;

    // width + 0.5 sem outline e sem radius para formar uma camada contínua e sem linhas de separação
    const segment = k.add([
      k.rect(width + 0.5, iceHeight),
      k.pos(x, icePosY),
      k.area(),
      k.body({ isStatic: true }),
      k.color(210, 235, 255),
      k.opacity(0.96),
      k.z(10),
      "ice_block",
      TAGS.OBSTACLE,
      {
        breakIce() {
          if (isBroken) return;
          isBroken = true;

          // 1. Estilhaços de gelo cristalinos com física e gravidade
          for (let p = 0; p < 14; p++) {
            const shardSize = 3 + Math.random() * 5;
            const shard = k.add([
              k.rect(shardSize, shardSize),
              k.pos(x + width * Math.random(), icePosY + iceHeight * Math.random()),
              k.color(230, 248, 255),
              k.opacity(0.95),
              k.z(15),
            ]);

            const shardVel = k.vec2(
              (Math.random() - 0.5) * 260,
              -60 - Math.random() * 190
            );

            shard.onUpdate(() => {
              shardVel.y += 680 * k.dt(); // Gravidade nos estilhaços
              shard.pos = shard.pos.add(shardVel.scale(k.dt()));
              shard.opacity -= k.dt() * 1.5;
              if (shard.opacity <= 0) k.destroy(shard);
            });
          }

          // 2. Efeitos Sonoros e Tremor
          audioSystem.playIceCrackSound();
          audioSystem.playWaterSplash();
          k.shake(4.5);

          // 3. Registra nova fenda dinâmica para respirar livremente durante a partida
          activeIceGaps.push({ start: x - 5, end: x + width + 5 });

          // 4. Se a baleia estiver em cima do bloco, empurra para o mar e assegura mergulho
          const player = k.get(TAGS.PLAYER)[0];
          if (player) {
            if (player.pos.y <= icePosY + 15) {
              player.pos.y = Math.max(player.pos.y, icePosY + 22);
            }
            if (playerController) {
              const curSpeed = playerController.getSpeed();
              playerController.setSpeed(k.vec2(curSpeed.x * 0.92, Math.max(140, curSpeed.y + 60)));
            }
          }

          // 5. Destrói o bloco quebrado
          k.destroy(segment);
        },
      },
    ]);

    // Detecção Contínua: 
    // Quebra APENAS por cima: a baleia deve estar no ar ou caindo sobre o topo do bloco de gelo
    segment.onUpdate(() => {
      if (isBroken) return;
      const player = k.get(TAGS.PLAYER)[0];
      if (player) {
        const withinX = player.pos.x >= x - 10 && player.pos.x <= x + width + 10;
        if (!withinX) return;

        const vel = playerController ? playerController.getSpeed() : k.vec2(0, 0);
        // Exclusivamente por cima: centro da baleia no topo/acima do bloco e velocidade de descida
        const isFromAbove = player.pos.y <= icePosY + 8 && (vel.y >= 0 || player.pos.y < icePosY);

        if (isFromAbove) {
          segment.breakIce();
        }
      }
    });

    return segment;
  }

  // Divide uma extensão contínua de gelo em blocos modulares de ~120px
  function createModularIceSpan(fromX: number, toX: number) {
    const spanWidth = toX - fromX;
    if (spanWidth <= 0) return;

    const chunkSize = 120;
    const numChunks = Math.max(1, Math.round(spanWidth / chunkSize));
    const actualChunkWidth = spanWidth / numChunks;

    for (let c = 0; c < numChunks; c++) {
      spawnIceSegment(fromX + c * actualChunkWidth, actualChunkWidth);
    }
  }

  // 1. Grande Paredão e Massivo de Iceberg estendido de x = -1100m até x = 0m
  const wallWidth = 1100;
  const wallStartX = -1100;

  // Corpo rígido principal de colisão cobrindo os 1100m à esquerda
  k.add([
    k.rect(wallWidth, k.height()),
    k.pos(wallStartX, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(150, 195, 235),
    k.opacity(0.95),
    k.z(10),
    "iceberg_wall",
    TAGS.OBSTACLE,
  ]);

  // Camada de relevo visual: Colunas de gelo verticais e facetas cristalinas (x = -1000m até x = 0m)
  for (let x = wallStartX; x < 0; x += 75) {
    const colWidth = 65 + Math.sin(x * 0.04) * 20;
    const bumpX = x + Math.cos(x * 0.02) * 12;

    // Colunas de gelo em relevo com variação de profundidade
    k.add([
      k.polygon([
        k.vec2(bumpX, 0),
        k.vec2(bumpX + colWidth, 0),
        k.vec2(bumpX + colWidth - 15, k.height()),
        k.vec2(bumpX - 20, k.height()),
      ]),
      k.color(180, 220, 255),
      k.opacity(0.35),
      k.z(11),
    ]);

    // Ridges / Linhas de fratura em brilho de cristal branco-ciano
    k.add([
      k.polygon([
        k.vec2(bumpX + 8, 0),
        k.vec2(bumpX + colWidth * 0.45, 0),
        k.vec2(bumpX + colWidth * 0.25, k.height()),
      ]),
      k.color(230, 248, 255),
      k.opacity(0.55),
      k.z(12),
    ]);
  }

  // Crista pontiaguda e irregular na borda frontal de contato com o mar (x = -50m a x = 0m)
  const cliffFacePts = [
    k.vec2(-50, 0),
    k.vec2(0, 35),
    k.vec2(-20, 95),
    k.vec2(8, 165),
    k.vec2(-25, 235),
    k.vec2(5, 315),
    k.vec2(-30, 385),
    k.vec2(0, 455),
    k.vec2(-35, k.height()),
    k.vec2(-120, k.height()),
    k.vec2(-120, 0),
  ];

  k.add([
    k.polygon(cliffFacePts),
    k.color(210, 240, 255),
    k.outline(3, k.rgb(120, 180, 230)),
    k.opacity(0.98),
    k.z(14),
  ]);

  DEFAULT_ICE_GAPS.forEach((gap) => {
    // Blocos de gelo modulares quebráveis antes da fenda
    if (gap.start > currentX) {
      createModularIceSpan(currentX, gap.start);
    }

    currentX = gap.end;
  });

  // Blocos de gelo modulares finais entre a última fenda e os 5.000m
  if (currentX < totalDistance) {
    createModularIceSpan(currentX, totalDistance);
  }
}

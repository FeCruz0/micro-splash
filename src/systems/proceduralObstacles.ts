import type { KaboomCtx } from "kaboom";
import { createTrash } from "../entities/trash";
import { createKrill } from "../entities/krill";
import { createGhostNet } from "../entities/net";
import { createPowerUp, type PowerUpType } from "../entities/powerup";

export interface ProceduralObstacleData {
  trashPositions: Array<{ x: number; y: number }>;
  krillPositions: Array<{ x: number; y: number }>;
  netPositions: Array<{ x: number; y: number }>;
  powerupPositions: Array<{ x: number; y: number; type: PowerUpType }>;
}

export function createRNG(seed: number = 42) {
  let s = Math.abs(seed) % 2147483647;
  if (s === 0) s = 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateProceduralLayout(
  seed: number = Date.now(),
  worldHeight: number = 720
): ProceduralObstacleData {
  const rand = createRNG(seed);

  const trashPositions: Array<{ x: number; y: number }> = [];
  const krillPositions: Array<{ x: number; y: number }> = [];
  const netPositions: Array<{ x: number; y: number }> = [];
  const powerupPositions: Array<{ x: number; y: number; type: PowerUpType }> = [];

  // Margem segura da superfície (SEA_LEVEL = 80 + 40 = 120) e do leito marinho
  const minY = 120;
  const maxY = Math.max(minY + 120, worldHeight - 75);
  const usableHeight = maxY - minY;

  // 4 Camadas de profundidade bem distribuídas para as redes:
  // 1. Sub-superfície / Rasa (topo)
  // 2. Meia-água Superior
  // 3. Meia-água Profunda
  // 4. Fundo do Mar (rente ao leito marinho)
  const shallowNetY = Math.round(minY + usableHeight * 0.12);
  const midNetY1 = Math.round(minY + usableHeight * 0.38);
  const midNetY2 = Math.round(minY + usableHeight * 0.66);
  const floorNetY = Math.round(maxY - 10);

  // =========================================================================
  // 1. BIOMA 1: ANTÁRTICA (0m - 5.000m)
  // =========================================================================
  // Berçário polar de krill nutritivo bem espalhado por toda a coluna d'água
  const antarcticKrillCount = 12 + Math.floor(rand() * 4); // 12 a 15
  const krillStep = 4600 / antarcticKrillCount;
  for (let i = 0; i < antarcticKrillCount; i++) {
    const x = Math.round(350 + i * krillStep + (rand() - 0.5) * 120);
    const y = Math.round(minY + 15 + rand() * (usableHeight - 30));
    krillPositions.push({ x, y });
  }

  // =========================================================================
  // 2. BIOMA 2: TRAVESSIA OCEÂNICA (5.000m - 12.000m)
  // =========================================================================
  // Redes fantasmas alternando entre superfície, meia-água e abismo
  const oceanNetCount = 6 + Math.floor(rand() * 2); // 6 a 7 redes
  const oceanNetStep = 6400 / oceanNetCount;
  const oceanNetLayers = [shallowNetY, floorNetY, midNetY1, midNetY2, shallowNetY, floorNetY, midNetY2];
  for (let i = 0; i < oceanNetCount; i++) {
    const x = Math.round(5500 + i * oceanNetStep + (rand() - 0.5) * 150);
    const y = oceanNetLayers[i % oceanNetLayers.length];
    netPositions.push({ x, y });
  }

  // Cardumes raros na travessia em profundidades variadas
  krillPositions.push({ x: 6800 + Math.round(rand() * 200), y: midNetY2 });
  krillPositions.push({ x: 9200 + Math.round(rand() * 200), y: midNetY1 });

  // Power-ups da Travessia
  powerupPositions.push({
    x: Math.round(7200 + rand() * 300),
    y: midNetY1,
    type: "tailwind",
  });
  powerupPositions.push({
    x: Math.round(10100 + rand() * 300),
    y: midNetY2,
    type: "bioluminescence",
  });

  // =========================================================================
  // 3. BIOMA 3: COSTA URBANA (12.000m - 19.000m)
  // =========================================================================
  // Alta densidade de poluição plástica (24 a 30 itens) amplamente distribuída
  // por toda a profundidade: superfície (flutuante), meia-água e fundo oceânico
  const urbanTrashCount = 24 + Math.floor(rand() * 6);
  const trashStep = 6400 / urbanTrashCount;
  for (let i = 0; i < urbanTrashCount; i++) {
    const x = Math.round(12200 + i * trashStep + (rand() - 0.5) * 80);
    // Distribuição balanceada nas 3 faixas de profundidade:
    const zone = i % 3;
    let y = 0;
    if (zone === 0) {
      // Zona Rasa / Sub-superfície
      y = Math.round(minY + usableHeight * 0.05 + rand() * (usableHeight * 0.28));
    } else if (zone === 1) {
      // Zona de Meia-água
      y = Math.round(minY + usableHeight * 0.35 + rand() * (usableHeight * 0.32));
    } else {
      // Zona Profunda / Próxima ao leito
      y = Math.round(minY + usableHeight * 0.70 + rand() * (usableHeight * 0.28));
    }
    trashPositions.push({ x, y });
  }

  // Redes urbanas estrategicamente posicionadas em todas as faixas
  const urbanNetXs = [13000, 14400, 15800, 17200, 18500];
  const urbanNetLayers = [shallowNetY, floorNetY, midNetY1, midNetY2, floorNetY];
  urbanNetXs.forEach((baseX, idx) => {
    const x = Math.round(baseX + (rand() - 0.5) * 100);
    const y = urbanNetLayers[idx % urbanNetLayers.length];
    netPositions.push({ x, y });
  });

  // Power-ups da Costa Urbana (Escudos de Bolhas em diferentes profundidades)
  powerupPositions.push({
    x: Math.round(13500 + rand() * 200),
    y: Math.round(minY + usableHeight * 0.25),
    type: "bubble_shield",
  });
  powerupPositions.push({
    x: Math.round(16600 + rand() * 200),
    y: Math.round(minY + usableHeight * 0.65),
    type: "bubble_shield",
  });

  // =========================================================================
  // 4. BIOMA 4: CÂNIONS DE RESSURGÊNCIA (19.000m - 25.000m)
  // =========================================================================
  // Redes distribuídas entre os paredões rochosos do Boqueirão e o fundo abissal
  const canyonNetXs = [19800, 21200, 22600, 23900];
  const canyonNetLayers = [floorNetY, shallowNetY, midNetY2, midNetY1];
  canyonNetXs.forEach((baseX, idx) => {
    const x = Math.round(baseX + (rand() - 0.5) * 120);
    const y = canyonNetLayers[idx % canyonNetLayers.length];
    netPositions.push({ x, y });
  });

  // Bolsões de ar profundo para recarregar o fôlego nos cânions sem subir à superfície
  powerupPositions.push({
    x: Math.round(20700 + rand() * 200),
    y: midNetY2,
    type: "air_pocket",
  });
  powerupPositions.push({
    x: Math.round(23300 + rand() * 200),
    y: Math.round(floorNetY - 25),
    type: "air_pocket",
  });

  // =========================================================================
  // 5. BIOMA 5: BERÇÁRIO DE ARRAIAL — ESCOLTA DO FILHOTE (25.000m - 29.500m)
  // =========================================================================
  // Desafios de proteção do filhote: redes residuais, lixo flutuante e escudos protetores
  const nurseryNetXs = [25400, 26300, 27100, 27900, 28700, 29300];
  const nurseryNetLayers = [midNetY1, shallowNetY, floorNetY, midNetY2, shallowNetY, floorNetY];
  nurseryNetXs.forEach((baseX, idx) => {
    const x = Math.round(baseX + (rand() - 0.5) * 100);
    const y = nurseryNetLayers[idx % nurseryNetLayers.length];
    netPositions.push({ x, y });
  });

  const nurseryTrashCount = 14 + Math.floor(rand() * 3);
  const nurseryTrashStep = 4100 / nurseryTrashCount;
  for (let i = 0; i < nurseryTrashCount; i++) {
    const x = Math.round(25200 + i * nurseryTrashStep + (rand() - 0.5) * 80);
    const zone = i % 3;
    let y = 0;
    if (zone === 0) {
      y = Math.round(minY + usableHeight * 0.08 + rand() * (usableHeight * 0.25));
    } else if (zone === 1) {
      y = Math.round(minY + usableHeight * 0.35 + rand() * (usableHeight * 0.30));
    } else {
      y = Math.round(minY + usableHeight * 0.68 + rand() * (usableHeight * 0.28));
    }
    trashPositions.push({ x, y });
  }

  // Cardumes de Krill nutritivo no berçário
  krillPositions.push({ x: Math.round(26000 + rand() * 200), y: midNetY1 });
  krillPositions.push({ x: Math.round(27700 + rand() * 200), y: midNetY2 });
  krillPositions.push({ x: Math.round(29100 + rand() * 200), y: Math.round(minY + usableHeight * 0.2) });

  // Escudos de Bolha e Bolsão de Ar no Berçário para proteger a dupla
  powerupPositions.push({
    x: Math.round(26700 + rand() * 200),
    y: Math.round(minY + usableHeight * 0.35),
    type: "bubble_shield",
  });
  powerupPositions.push({
    x: Math.round(28400 + rand() * 200),
    y: midNetY2,
    type: "bubble_shield",
  });
  powerupPositions.push({
    x: Math.round(27300 + rand() * 200),
    y: floorNetY,
    type: "air_pocket",
  });

  return {
    trashPositions,
    krillPositions,
    netPositions,
    powerupPositions,
  };
}

export function spawnProceduralLevel(k: KaboomCtx, seed?: number): ProceduralObstacleData {
  const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
  const layout = generateProceduralLayout(actualSeed, k.height());

  // Instancia Lixos Plásticos
  layout.trashPositions.forEach((pos) => {
    createTrash(k, k.vec2(pos.x, pos.y));
  });

  // Instancia Krills
  layout.krillPositions.forEach((pos) => {
    createKrill(k, k.vec2(pos.x, pos.y));
  });

  // Instancia Redes Fantasmas
  layout.netPositions.forEach((pos) => {
    createGhostNet(k, k.vec2(pos.x, pos.y));
  });

  // Instancia Power-ups
  layout.powerupPositions.forEach((pos) => {
    createPowerUp(k, k.vec2(pos.x, pos.y), pos.type);
  });

  return layout;
}

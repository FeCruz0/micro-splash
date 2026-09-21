import type { KaboomCtx } from "kaboom";
import { createTrash } from "../entities/trash";
import { createKrill } from "../entities/krill";
import { createGhostNet } from "../entities/net";
import { createBubbleVent } from "../entities/bubbleVent";
import type { CurrentZone } from "./oceanCurrentsSystem";

export interface ProceduralObstacleData {
  trashPositions: Array<{ x: number; y: number }>;
  krillPositions: Array<{ x: number; y: number }>;
  netPositions: Array<{ x: number; y: number }>;
  bubbleVentPositions: Array<{ x: number; y: number; height?: number }>;
  currentZones: CurrentZone[];
  // Mantido para compatibilidade de tipagem
  powerupPositions: Array<{ x: number; y: number; type: "air_pocket" | "tailwind" }>;
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
  const bubbleVentPositions: Array<{ x: number; y: number; height?: number }> = [];
  const currentZones: CurrentZone[] = [];
  const powerupPositions: Array<{ x: number; y: number; type: "air_pocket" | "tailwind" }> = [];

  // Margem segura da superfície (SEA_LEVEL = 80 + 40 = 120) e do leito marinho
  const minY = 120;
  const maxY = Math.max(minY + 120, worldHeight - 75);
  const usableHeight = maxY - minY;

  // 4 Camadas verticais de profundidade bem distribuídas:
  const shallowNetY = Math.round(minY + usableHeight * 0.12);
  const midNetY1 = Math.round(minY + usableHeight * 0.38);
  const midNetY2 = Math.round(minY + usableHeight * 0.66);
  const floorNetY = Math.round(maxY - 10);

  // =========================================================================
  // 1. BIOMA 1: ANTÁRTICA (0m - 5.000m)
  // =========================================================================
  const antarcticKrillCount = 12 + Math.floor(rand() * 4); // 12 a 15
  const krillStep = 4600 / antarcticKrillCount;
  for (let i = 0; i < antarcticKrillCount; i++) {
    const x = Math.round(350 + i * krillStep + (rand() - 0.5) * 120);
    const y = Math.round(minY + 15 + rand() * (usableHeight - 30));
    krillPositions.push({ x, y });
  }

  // Bolsões de Ar polares em fendas rochosas sob o gelo
  bubbleVentPositions.push({ x: Math.round(2200 + rand() * 200), y: floorNetY, height: 210 });
  bubbleVentPositions.push({ x: Math.round(4100 + rand() * 200), y: floorNetY, height: 220 });


  // =========================================================================
  // 2. BIOMA 2: TRAVESSIA PELÁGICA (5.000m - 12.000m)
  // =========================================================================
  const oceanNetCount = 6 + Math.floor(rand() * 2); // 6 a 7 redes
  const oceanNetStep = 6400 / oceanNetCount;
  const oceanNetLayers = [shallowNetY, floorNetY, midNetY1, midNetY2, shallowNetY, floorNetY, midNetY2];
  for (let i = 0; i < oceanNetCount; i++) {
    const x = Math.round(5500 + i * oceanNetStep + (rand() - 0.5) * 150);
    const y = oceanNetLayers[i % oceanNetLayers.length];
    netPositions.push({ x, y });
  }

  krillPositions.push({ x: 6800 + Math.round(rand() * 200), y: midNetY2 });
  krillPositions.push({ x: 9200 + Math.round(rand() * 200), y: midNetY1 });

  // Correntes procedurais na travessia (alternando contrárias e favoráveis)
  currentZones.push({
    startX: Math.round(5700 + (rand() - 0.5) * 150),
    endX: Math.round(7300 + (rand() - 0.5) * 150),
    y: midNetY1,
    height: 115,
    force: 170,
    type: "opposing",
  });
  currentZones.push({
    startX: Math.round(7700 + (rand() - 0.5) * 150),
    endX: Math.round(9300 + (rand() - 0.5) * 150),
    y: shallowNetY + 15,
    height: 110,
    force: 195,
    type: "favorable",
  });
  currentZones.push({
    startX: Math.round(9700 + (rand() - 0.5) * 150),
    endX: Math.round(11400 + (rand() - 0.5) * 150),
    y: floorNetY - 60,
    height: 125,
    force: 185,
    type: "opposing",
  });

  // Bolsões de ar em fendas do oceano aberto
  bubbleVentPositions.push({ x: Math.round(7100 + rand() * 200), y: floorNetY, height: 230 });
  bubbleVentPositions.push({ x: Math.round(10300 + rand() * 200), y: midNetY2, height: 180 });

  // =========================================================================
  // 3. BIOMA 3: COSTA URBANA (12.000m - 19.000m)
  // =========================================================================
  const urbanTrashCount = 24 + Math.floor(rand() * 6);
  const trashStep = 6400 / urbanTrashCount;
  for (let i = 0; i < urbanTrashCount; i++) {
    const x = Math.round(12200 + i * trashStep + (rand() - 0.5) * 80);
    const zone = i % 3;
    let y = 0;
    if (zone === 0) {
      y = Math.round(minY + usableHeight * 0.05 + rand() * (usableHeight * 0.28));
    } else if (zone === 1) {
      y = Math.round(minY + usableHeight * 0.35 + rand() * (usableHeight * 0.32));
    } else {
      y = Math.round(minY + usableHeight * 0.70 + rand() * (usableHeight * 0.28));
    }
    trashPositions.push({ x, y });
  }

  const urbanNetXs = [13000, 14400, 15800, 17200, 18500];
  const urbanNetLayers = [shallowNetY, floorNetY, midNetY1, midNetY2, floorNetY];
  urbanNetXs.forEach((baseX, idx) => {
    const x = Math.round(baseX + (rand() - 0.5) * 100);
    const y = urbanNetLayers[idx % urbanNetLayers.length];
    netPositions.push({ x, y });
  });

  // Correntes na Costa Urbana
  currentZones.push({
    startX: Math.round(16600 + (rand() - 0.5) * 150),
    endX: Math.round(18200 + (rand() - 0.5) * 150),
    y: midNetY2,
    height: 120,
    force: 175,
    type: "opposing",
  });

  // Bolsões de ar profundos para evitar subir na poluição flutuante
  bubbleVentPositions.push({ x: Math.round(13600 + rand() * 200), y: floorNetY, height: 230 });
  bubbleVentPositions.push({ x: Math.round(16900 + rand() * 200), y: floorNetY, height: 220 });

  // =========================================================================
  // 4. BIOMA 4: CÂNIONS DE RESSURGÊNCIA (19.000m - 25.000m)
  // =========================================================================
  const canyonNetXs = [19800, 21200, 22600, 23900];
  const canyonNetLayers = [floorNetY, shallowNetY, midNetY2, midNetY1];
  canyonNetXs.forEach((baseX, idx) => {
    const x = Math.round(baseX + (rand() - 0.5) * 120);
    const y = canyonNetLayers[idx % canyonNetLayers.length];
    netPositions.push({ x, y });
  });

  // Fendas ativas emanando colunas de bolhas de ar nos cânions
  bubbleVentPositions.push({ x: Math.round(20400 + rand() * 200), y: midNetY2, height: 190 });
  bubbleVentPositions.push({ x: Math.round(22500 + rand() * 200), y: floorNetY, height: 240 });
  bubbleVentPositions.push({ x: Math.round(24100 + rand() * 200), y: midNetY1, height: 180 });

  // Correntezas nos desfiladeiros dos Cânions
  currentZones.push({
    startX: Math.round(19500 + (rand() - 0.5) * 150),
    endX: Math.round(20900 + (rand() - 0.5) * 150),
    y: midNetY1,
    height: 110,
    force: 180,
    type: "opposing",
  });

  // =========================================================================
  // 5. BIOMA 5: SANTUÁRIO DE ARRAIAL DO CABO (25.000m - 29.500m)
  // =========================================================================
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
    // No canal raso do Boqueirão da Ilha do Farol (25.600m a 26.900m), o lixo fica na lâmina d'água superior
    if (x >= 25600 && x <= 26900) {
      y = Math.min(y, shallowNetY + 10);
    }
    trashPositions.push({ x, y });
  }

  // Cardumes de Krill nutritivo no berçário (no Boqueirão, flutua rente à superfície)
  krillPositions.push({ x: Math.round(26000 + rand() * 200), y: shallowNetY });
  krillPositions.push({ x: Math.round(27700 + rand() * 200), y: midNetY2 });
  krillPositions.push({ x: Math.round(29100 + rand() * 200), y: Math.round(minY + usableHeight * 0.2) });

  // Bolsão de Ar sereno no berçário
  bubbleVentPositions.push({ x: Math.round(27200 + rand() * 200), y: floorNetY, height: 230 });

  // Única correnteza favorável no berçário para a aproximação suave da enseada (na superfície do Boqueirão)
  currentZones.push({
    startX: Math.round(26200 + (rand() - 0.5) * 150),
    endX: Math.round(28200 + (rand() - 0.5) * 150),
    y: shallowNetY + 10,
    height: 110,
    force: 180,
    type: "favorable",
  });

  // Preenche powerupPositions com referências para manter compatibilidade
  bubbleVentPositions.forEach((v) => {
    powerupPositions.push({ x: v.x, y: v.y, type: "air_pocket" });
  });
  currentZones
    .filter((c) => c.type === "favorable")
    .forEach((c) => {
      powerupPositions.push({ x: (c.startX + c.endX) / 2, y: c.y, type: "tailwind" });
    });

  return {
    trashPositions,
    krillPositions,
    netPositions,
    bubbleVentPositions,
    currentZones,
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

  // Instancia Colunas de Bolhas Naturais (Bolsões de Ar)
  layout.bubbleVentPositions.forEach((vent) => {
    createBubbleVent(k, k.vec2(vent.x, vent.y), vent.height ?? 220);
  });

  return layout;
}

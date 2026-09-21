import type { KaboomCtx } from "kaboom";
import levelLayout from "../../data/level_layout.json";
import { createTrash } from "../entities/trash";
import { createKrill } from "../entities/krill";
import { createGhostNet } from "../entities/net";
import { spawnProceduralLevel } from "./proceduralObstacles";

export interface LevelLayoutData {
  urbanTrash: Array<{ x: number; y: number }>;
  antarcticKrill: Array<{ x: number; y: number }>;
  ghostNets: Array<{ x: number; layer: "floor" | "mid1" | "mid2" }>;
}

export function loadStaticLevelLayout(k: KaboomCtx): void {
  const data = levelLayout as LevelLayoutData;

  const minY = 120;
  const maxY = Math.max(minY + 120, k.height() - 75);
  const usableHeight = maxY - minY;

  // 1. Lixo Plástico na Costa Urbana distribuído por toda a profundidade
  data.urbanTrash.forEach((item) => {
    const normalizedY = (item.y - 150) / (280 - 150);
    const scaledY = Math.round(minY + normalizedY * usableHeight);
    createTrash(k, k.vec2(item.x, scaledY));
  });

  // 2. Krill Polar na Antártica
  data.antarcticKrill.forEach((item) => {
    const normalizedY = (item.y - 150) / (280 - 150);
    const scaledY = Math.round(minY + normalizedY * usableHeight);
    createKrill(k, k.vec2(item.x, scaledY));
  });

  // 3. Redes Fantasmas
  const floorNetY = Math.round(maxY - 10);
  const midNetY1 = Math.round(minY + usableHeight * 0.38);
  const midNetY2 = Math.round(minY + usableHeight * 0.68);

  data.ghostNets.forEach((net) => {
    let y = floorNetY;
    if (net.layer === "mid1") {
      y = midNetY1;
    } else if (net.layer === "mid2") {
      y = midNetY2;
    }
    createGhostNet(k, k.vec2(net.x, y));
  });
}

import type { ProceduralObstacleData } from "./proceduralObstacles";

export function loadLevelLayout(k: KaboomCtx, useProcedural: boolean = true, seed?: number): ProceduralObstacleData | void {
  if (useProcedural) {
    return spawnProceduralLevel(k, seed);
  } else {
    loadStaticLevelLayout(k);
  }
}

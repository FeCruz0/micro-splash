import type { KaboomCtx } from "kaboom";
import levelLayout from "../../data/level_layout.json";
import { createTrash } from "../entities/trash";
import { createKrill } from "../entities/krill";
import { createGhostNet } from "../entities/net";

export interface LevelLayoutData {
  urbanTrash: Array<{ x: number; y: number }>;
  antarcticKrill: Array<{ x: number; y: number }>;
  ghostNets: Array<{ x: number; layer: "floor" | "mid1" | "mid2" }>;
}

export function loadLevelLayout(k: KaboomCtx): void {
  const data = levelLayout as LevelLayoutData;

  // 1. Lixo Plástico na Costa Urbana
  data.urbanTrash.forEach((item) => {
    createTrash(k, k.vec2(item.x, item.y));
  });

  // 2. Krill Polar na Antártica
  data.antarcticKrill.forEach((item) => {
    createKrill(k, k.vec2(item.x, item.y));
  });

  // 3. Redes Fantasmas
  const floorNetY = Math.max(280, k.height() - 40 - 32);
  const midNetY1 = 200;
  const midNetY2 = 270;

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

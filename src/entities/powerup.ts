import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { createBubbleVent } from "./bubbleVent";

export type PowerUpType = "air_pocket" | "tailwind";

export interface PowerUpData {
  type: PowerUpType;
  name: string;
  color: [number, number, number];
  outlineColor: [number, number, number];
  icon: string;
}

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpData> = {
  air_pocket: {
    type: "air_pocket",
    name: "Bolsão de Ar Natural",
    color: [180, 240, 255],
    outlineColor: [255, 255, 255],
    icon: "🫧",
  },
  tailwind: {
    type: "tailwind",
    name: "Corrente Favorável",
    color: [140, 245, 255],
    outlineColor: [255, 235, 140],
    icon: "🌊",
  },
};

/**
 * Cria elemento ambiental benéfico (Bolsão de Ar natural ou Correnteza)
 */
export function createPowerUp(k: KaboomCtx, pos: Vec2, type: PowerUpType): GameObj {
  if (type === "air_pocket") {
    return createBubbleVent(k, pos, 220);
  }

  // Fallback para corrente favorável pontual
  return createBubbleVent(k, pos, 220);
}

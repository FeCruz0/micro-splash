import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";

export type PowerUpType = "bubble_shield" | "tailwind" | "air_pocket" | "bioluminescence";

export interface PowerUpData {
  type: PowerUpType;
  name: string;
  color: [number, number, number];
  outlineColor: [number, number, number];
  icon: string;
}

export const POWERUP_CONFIGS: Record<PowerUpType, PowerUpData> = {
  bubble_shield: {
    type: "bubble_shield",
    name: "Escudo de Bolhas",
    color: [60, 220, 255],
    outlineColor: [220, 255, 255],
    icon: "🛡️",
  },
  tailwind: {
    type: "tailwind",
    name: "Corrente Favorável",
    color: [255, 215, 60],
    outlineColor: [255, 245, 180],
    icon: "⚡",
  },
  air_pocket: {
    type: "air_pocket",
    name: "Bolsão de Ar",
    color: [180, 240, 255],
    outlineColor: [255, 255, 255],
    icon: "🫁",
  },
  bioluminescence: {
    type: "bioluminescence",
    name: "Bioluminescência",
    color: [80, 255, 170],
    outlineColor: [180, 255, 220],
    icon: "🔦",
  },
};

export function createPowerUp(k: KaboomCtx, pos: Vec2, type: PowerUpType): GameObj {
  const conf = POWERUP_CONFIGS[type];
  const baseY = pos.y;
  const animOffset = Math.random() * Math.PI * 2;

  // Orbe central do power-up
  const powerup = k.add([
    k.circle(13),
    k.pos(pos.x, pos.y),
    k.color(conf.color[0], conf.color[1], conf.color[2]),
    k.outline(2.5, k.rgb(conf.outlineColor[0], conf.outlineColor[1], conf.outlineColor[2])),
    k.area({ shape: new k.Rect(k.vec2(0, 0), 28, 28) }),
    k.anchor("center"),
    k.opacity(0.92),
    k.z(18),
    TAGS.POWERUP,
    {
      powerupType: type,
      reveal: () => {
        powerup.opacity = 1.0;
        aura.opacity = 0.8;
      },
    },
  ]);

  // Anel externo pulsante
  const aura = k.add([
    k.circle(18),
    k.pos(pos.x, pos.y),
    k.color(conf.color[0], conf.color[1], conf.color[2]),
    k.outline(1.5, k.rgb(conf.outlineColor[0], conf.outlineColor[1], conf.outlineColor[2])),
    k.anchor("center"),
    k.opacity(0.4),
    k.z(17),
  ]);

  // Pequeno ícone ou detalhe luminoso interno
  const innerSpark = k.add([
    k.circle(4),
    k.pos(pos.x, pos.y),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.opacity(0.95),
    k.z(19),
  ]);

  // Animação de flutuação senoidal suave e pulso de luz
  powerup.onUpdate(() => {
    const t = k.time() * 3 + animOffset;
    const currentY = baseY + Math.sin(t) * 6;

    powerup.pos.y = currentY;
    aura.pos.x = powerup.pos.x;
    aura.pos.y = currentY;
    innerSpark.pos.x = powerup.pos.x;
    innerSpark.pos.y = currentY;

    // Pulsação suave da aura
    const pulse = 18 + Math.sin(t * 1.5) * 4;
    aura.radius = pulse;
    aura.opacity = 0.35 + Math.sin(t * 1.5) * 0.15;
  });

  // Limpeza de nós associados ao ser consumido/destruído
  powerup.onDestroy(() => {
    k.destroy(aura);
    k.destroy(innerSpark);
  });

  return powerup;
}

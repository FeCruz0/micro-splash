import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { TAGS } from "../config";
import { spawnPurifyBubbles } from "./player/playerParticles";

export interface BubbleVentController {
  gameObj: GameObj;
  triggerRecharge: () => boolean;
}

/**
 * Cria uma coluna natural de micro-bolhas de ar submersas (Bolsão de Ar)
 * emanando de fissuras no leito oceânico ou relevos rochosos.
 * Permite à baleia respirar e reabastecer fôlego nas profundezas.
 */
export function createBubbleVent(
  k: KaboomCtx,
  position: Vec2,
  columnHeight: number = 220
): GameObj {
  const ventWidth = 42;
  const baseY = position.y;
  let cooldownTimer = 0;

  // 1. Núcleo físico com colisor invisível (sem caixa ou borda artificial)
  const ventCore = k.add([
    k.rect(ventWidth, columnHeight),
    k.pos(position.x - ventWidth / 2, baseY - columnHeight / 2),
    k.opacity(0), // Completamente invisível, preserva cor natural do fundo
    k.area(),
    k.anchor("center"),
    k.z(10),
    TAGS.AIR_POCKET,
    TAGS.POWERUP,
    "bubble_vent",
    {
      powerupType: "air_pocket",
      canRecharge() {
        return cooldownTimer <= 0;
      },
      collectAir() {
        if (cooldownTimer > 0) return false;
        cooldownTimer = 4.0; // Recarga de 4 segundos antes de poder ser absorvido de novo
        spawnPurifyBubbles(k, ventCore.pos);
        return true;
      },
      reveal() {
        // Elemento 100% natural, sem caixa retangular para revelar
      },
    },
  ]);

  // 3. Sistema contínuo de micro-bolhas ascendentes
  const bubbleCount = 14;
  const bubbles: Array<{
    obj: GameObj;
    relX: number;
    relY: number;
    speedY: number;
    swaySpeed: number;
    swayAmp: number;
    swayPhase: number;
    radius: number;
  }> = [];

  for (let i = 0; i < bubbleCount; i++) {
    const radius = k.rand(1.8, 3.8);
    const relX = (Math.random() - 0.5) * (ventWidth - 12);
    const relY = Math.random() * columnHeight;

    const bObj = k.add([
      k.circle(radius),
      k.pos(position.x + relX, baseY + columnHeight / 2 - relY),
      k.color(k.choose([k.rgb(180, 240, 255), k.rgb(215, 250, 255), k.rgb(140, 225, 250)])),
      k.opacity(k.rand(0.5, 0.85)),
      k.z(12),
    ]);

    bubbles.push({
      obj: bObj,
      relX,
      relY,
      speedY: k.rand(55, 95),
      swaySpeed: k.rand(2.0, 4.0),
      swayAmp: k.rand(3, 8),
      swayPhase: Math.random() * Math.PI * 2,
      radius,
    });
  }

  // 4. Loop de animação das bolhas e cooldown
  ventCore.onUpdate(() => {
    const dt = k.dt();

    if (cooldownTimer > 0) {
      cooldownTimer -= dt;
    }

    bubbles.forEach((b) => {
      b.relY += b.speedY * dt;
      b.swayPhase += b.swaySpeed * dt;

      // Reseta ao atingir o topo da coluna
      if (b.relY > columnHeight) {
        b.relY = 0;
        b.relX = (Math.random() - 0.5) * (ventWidth - 12);
      }

      const currentX = position.x + b.relX + Math.sin(b.swayPhase) * b.swayAmp;
      const currentY = baseY + columnHeight / 2 - b.relY;

      b.obj.pos.x = currentX;
      b.obj.pos.y = currentY;

      // Emerge do nada na base (fade-in suave) e dissipa no topo (fade-out suave)
      const progress = b.relY / columnHeight;
      let alpha = 0.8;
      if (progress < 0.15) {
        alpha = (progress / 0.15) * 0.8; // Emerge do nada sem buraco na base
      } else if (progress > 0.82) {
        alpha = ((1 - progress) / 0.18) * 0.8; // Dissipa organicamente
      }

      b.obj.opacity = Math.max(0, alpha * (cooldownTimer > 0 ? 0.35 : 1.0));
    });
  });

  // Limpeza
  ventCore.onDestroy(() => {
    bubbles.forEach((b) => {
      if (b.obj.exists()) k.destroy(b.obj);
    });
  });

  return ventCore;
}

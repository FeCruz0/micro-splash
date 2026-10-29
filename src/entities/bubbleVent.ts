/**
 * Entidade de Bolsão de Ar Submerso (Bubble Vent) — Micro Splash
 *
 * Coluna natural de micro-bolhas de ar submersas emanando de fissuras oceânicas.
 * Desacoplado do Kaboom.js, com tipagem estrita e compatibilidade retroativa.
 */

import { TAGS } from "../config";
import { getRandomFloat } from "../utils/random";
import { spawnPurifyBubbles } from "./player/playerParticles";
import type { Vector2D } from "../engine/contracts/INTERFACE_CONTRACTS";

export interface BubbleVentObj {
  pos: { x: number; y: number };
  opacity?: number;
  components?: unknown[];
  powerupType?: string;
  canRecharge?: () => boolean;
  collectAir?: () => boolean;
  reveal?: () => void;
  onUpdate?: (callback: () => void) => unknown;
  onDestroy?: (callback: () => void) => unknown;
  exists?: () => boolean;
  [key: string]: unknown;
}

export interface BubbleVentController {
  gameObj: BubbleVentObj;
  triggerRecharge: () => boolean;
}

export interface BubbleVentEngineContext<TObj = BubbleVentObj> {
  rect?(width: number, height: number): unknown;
  circle?(radius: number): unknown;
  pos?(x: number, y: number): unknown;
  opacity?(alpha: number): unknown;
  area?(): unknown;
  anchor?(anchorPoint: "center"): unknown;
  z?(layerIndex: number): unknown;
  color?(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  vec2?(x: number, y: number): unknown;
  choose?<T>(items: T[]): T;
  rand?(min: number, max: number): number;
  dt?(): number;
  add(components?: unknown): TObj;
  destroy?(targetObject: unknown): void;
}

/**
 * Cria uma coluna natural de micro-bolhas de ar submersas (Bolsão de Ar)
 * emanando de fissuras no leito oceânico ou relevos rochosos.
 * Permite à baleia respirar e reabastecer fôlego nas profundezas.
 */
export function createBubbleVent<TObj = BubbleVentObj>(
  engineContext: BubbleVentEngineContext<TObj>,
  position: Vector2D | { x: number; y: number },
  columnHeight: number = 220
): TObj {
  const ventWidth = 42;
  const baseY = position.y;
  let cooldownTimer = 0;

  const rectComp =
    typeof engineContext.rect === "function"
      ? engineContext.rect(ventWidth, columnHeight)
      : { type: "rect", w: ventWidth, h: columnHeight };

  const posComp =
    typeof engineContext.pos === "function"
      ? engineContext.pos(position.x - ventWidth / 2, baseY - columnHeight / 2)
      : { x: position.x - ventWidth / 2, y: baseY - columnHeight / 2 };

  const opacityComp =
    typeof engineContext.opacity === "function" ? engineContext.opacity(0) : { opacity: 0 };

  const areaComp =
    typeof engineContext.area === "function" ? engineContext.area() : { type: "area" };

  const anchorComp =
    typeof engineContext.anchor === "function"
      ? engineContext.anchor("center")
      : { type: "anchor", anchor: "center" };

  const zComp = typeof engineContext.z === "function" ? engineContext.z(10) : { type: "z", z: 10 };

  // 1. Núcleo físico com colisor invisível (sem caixa ou borda artificial)
  const ventCore = engineContext.add([
    rectComp,
    posComp,
    opacityComp,
    areaComp,
    anchorComp,
    zComp,
    TAGS.AIR_POCKET,
    TAGS.POWERUP,
    "bubble_vent",
    {
      powerupType: "air_pocket",
      canRecharge(): boolean {
        return cooldownTimer <= 0;
      },
      collectAir(): boolean {
        if (cooldownTimer > 0) return false;
        cooldownTimer = 4.0;
        if (typeof spawnPurifyBubbles === "function") {
          spawnPurifyBubbles(
            engineContext as unknown as Parameters<typeof spawnPurifyBubbles>[0],
            (ventCore as unknown as BubbleVentObj).pos as unknown as Parameters<
              typeof spawnPurifyBubbles
            >[1]
          );
        }
        return true;
      },
      reveal(): void {
        // Elemento 100% natural, sem caixa retangular para revelar
      },
    },
  ]);

  const ventCoreObj = ventCore as unknown as BubbleVentObj;

  // 2. Sistema contínuo de micro-bolhas ascendentes (coluna natural de oxigênio)
  const bubbleCount = 18;
  const bubbles: Array<{
    obj: BubbleVentObj;
    relX: number;
    relY: number;
    speedY: number;
    swaySpeed: number;
    swayAmp: number;
    swayPhase: number;
    radius: number;
  }> = [];

  const halfVentWidth = (ventWidth - 10) / 2;
  for (let index = 0; index < bubbleCount; index++) {
    const radius =
      typeof engineContext.rand === "function"
        ? engineContext.rand(1.5, 3.8)
        : getRandomFloat(1.5, 3.8);
    const relX = getRandomFloat(-halfVentWidth, halfVentWidth);
    const relY = getRandomFloat(0, columnHeight);

    const circleComp =
      typeof engineContext.circle === "function"
        ? engineContext.circle(radius)
        : { type: "circle", r: radius };

    const bubblePosComp =
      typeof engineContext.pos === "function"
        ? engineContext.pos(position.x + relX, baseY + columnHeight / 2 - relY)
        : { x: position.x + relX, y: baseY + columnHeight / 2 - relY };

    let colorComp: unknown = null;
    if (
      typeof engineContext.choose === "function" &&
      typeof engineContext.rgb === "function" &&
      typeof engineContext.color === "function"
    ) {
      colorComp = engineContext.color(
        engineContext.choose([
          engineContext.rgb(180, 240, 255),
          engineContext.rgb(215, 250, 255),
          engineContext.rgb(140, 225, 250),
        ])
      );
    }

    const bubbleOpacityComp =
      typeof engineContext.opacity === "function"
        ? engineContext.opacity(
            typeof engineContext.rand === "function" ? engineContext.rand(0.5, 0.85) : 0.7
          )
        : { opacity: 0.7 };

    const bubbleZComp =
      typeof engineContext.z === "function" ? engineContext.z(12) : { type: "z", z: 12 };

    const componentList: unknown[] = [circleComp, bubblePosComp, bubbleOpacityComp, bubbleZComp];
    if (colorComp) {
      componentList.push(colorComp);
    }

    const bObj = engineContext.add(componentList) as unknown as BubbleVentObj;

    bubbles.push({
      obj: bObj,
      relX,
      relY,
      speedY:
        typeof engineContext.rand === "function"
          ? engineContext.rand(55, 95)
          : getRandomFloat(55, 95),
      swaySpeed:
        typeof engineContext.rand === "function"
          ? engineContext.rand(2.0, 4.0)
          : getRandomFloat(2.0, 4.0),
      swayAmp:
        typeof engineContext.rand === "function" ? engineContext.rand(3, 8) : getRandomFloat(3, 8),
      swayPhase: getRandomFloat(0, Math.PI * 2),
      radius,
    });
  }

  // 3. Loop de animação das bolhas e cooldown
  if (typeof ventCoreObj.onUpdate === "function") {
    ventCoreObj.onUpdate(() => {
      const dt = typeof engineContext.dt === "function" ? engineContext.dt() : 0.016;

      if (cooldownTimer > 0) {
        cooldownTimer -= dt;
      }

      bubbles.forEach((b) => {
        b.relY += b.speedY * dt;
        b.swayPhase += b.swaySpeed * dt;

        // Reseta ao atingir o topo da coluna
        if (b.relY > columnHeight) {
          b.relY = 0;
          b.relX = getRandomFloat(-halfVentWidth, halfVentWidth);
        }

        const currentX = position.x + b.relX + Math.sin(b.swayPhase) * b.swayAmp;
        const currentY = baseY + columnHeight / 2 - b.relY;

        if (b.obj.pos) {
          b.obj.pos.x = currentX;
          b.obj.pos.y = currentY;
        }

        // Emerge da fissura na base (fade-in suave) e dissipa no topo (fade-out suave)
        const progress = b.relY / columnHeight;
        let alpha = 0.8;
        if (progress < 0.15) {
          alpha = (progress / 0.15) * 0.8;
        } else if (progress > 0.82) {
          alpha = ((1 - progress) / 0.18) * 0.8;
        }

        b.obj.opacity = Math.max(0, alpha * (cooldownTimer > 0 ? 0.35 : 1.0));
      });
    });
  }

  // Limpeza
  if (typeof ventCoreObj.onDestroy === "function") {
    ventCoreObj.onDestroy(() => {
      bubbles.forEach((b) => {
        if (typeof b.obj.exists === "function") {
          if (b.obj.exists() && typeof engineContext.destroy === "function") {
            engineContext.destroy(b.obj);
          }
        } else if (typeof engineContext.destroy === "function") {
          engineContext.destroy(b.obj);
        }
      });
    });
  }

  return ventCore;
}

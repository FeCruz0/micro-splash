import type { Color, GameObj, KaboomCtx } from "kaboom";
import { GAME_CONFIG, TAGS } from "../config";

export interface WaterSurfaceSystem {
  collider: GameObj;
  segments: GameObj[];
  foamSegments: GameObj[];
  updateColor: (color: Color) => void;
  updatePosition: (camX: number) => void;
  destroy: () => void;
  pos?: any;
  color?: any;
}

/**
 * Sistema de Linha d'Água Ondulada e Orgânica (Fase 29.1)
 * Substitui o retângulo monolítico rígido por uma malha de segmentos verticais
 * acoplados a ondas senoidais harmônicas e crista de espuma dinâmica translúcida.
 */
export function createWaterSurfaceSystem(k: KaboomCtx): WaterSurfaceSystem {
  const segmentCount = 14;
  const viewWidth = k.width ? k.width() : 640;
  const segmentWidth = Math.ceil((viewWidth * 1.4) / segmentCount);

  // 1. Colisor físico estável com TAGS.SURFACE (invisível para não criar blocos rígidos)
  const collider = k.add([
    k.rect(viewWidth * 2.2, 16),
    k.pos(-viewWidth / 2, GAME_CONFIG.SEA_LEVEL),
    k.area(),
    k.opacity(0),
    k.z(1),
    TAGS.SURFACE,
    "water_surface_collider",
    {
      color: k.rgb(20, 50, 120),
    },
  ]);

  // 2. Segmentos visuais da coluna d'água ondulada
  const segments: GameObj[] = [];
  const foamSegments: GameObj[] = [];

  for (let i = 0; i < segmentCount; i++) {
    // Corpo d'água do segmento (com sobreposição de 2px para evitar frestas)
    const seg = k.add([
      k.rect(segmentWidth + 2, 22),
      k.pos(0, GAME_CONFIG.SEA_LEVEL),
      k.color(20, 50, 120),
      k.opacity(0.92),
      k.z(1),
      "water_surface_segment",
    ]);
    segments.push(seg);

    // Faixa superior de crista de espuma
    const foam = k.add([
      k.rect(segmentWidth + 2, 3.5, { radius: 1 }),
      k.pos(0, GAME_CONFIG.SEA_LEVEL - 1),
      k.color(235, 250, 255),
      k.opacity(0.38),
      k.z(2),
      "water_surface_foam",
    ]);
    foamSegments.push(foam);
  }

  let time = 0;

  const updatePosition = (camX: number) => {
    // Alinha colisor físico à visão atual da câmera
    collider.pos.x = camX - viewWidth * 1.1;

    const startX = camX - (viewWidth * 1.4) / 2;

    for (let i = 0; i < segmentCount; i++) {
      const segX = startX + i * segmentWidth;
      // Ondulação harmônica combinando duas frequências desfasadas
      const wave = Math.sin(time * 2.4 + i * 0.7) * 2.8 + Math.cos(time * 1.3 + i * 0.4) * 1.4;
      const segY = GAME_CONFIG.SEA_LEVEL + wave;

      segments[i].pos.x = segX;
      segments[i].pos.y = segY;

      foamSegments[i].pos.x = segX;
      foamSegments[i].pos.y = segY - 1.2;
      // Espuma mais evidente nos picos superiores da onda
      foamSegments[i].opacity = 0.28 + Math.max(0, -wave * 0.08);
    }
  };

  const updateColor = (color: Color) => {
    collider.color = color;
    segments.forEach((seg) => {
      seg.color = color;
    });
  };

  // Permite que updateOceanColors atualize as cores diretamente na interface do Kaboom
  (collider as any).updateSurfaceColor = updateColor;

  let cancelUpdate: any = null;
  if (k.onUpdate) {
    cancelUpdate = k.onUpdate(() => {
      time += k.dt ? k.dt() : 0.016;
      const camX = k.camPos ? k.camPos().x : 0;
      updatePosition(camX);
    });
  }

  const destroy = () => {
    if (cancelUpdate) {
      if (typeof cancelUpdate === "function") cancelUpdate();
      else if (cancelUpdate.cancel) cancelUpdate.cancel();
    }
    if (collider.exists && collider.exists()) k.destroy(collider);
    segments.forEach((s) => s.exists && s.exists() && k.destroy(s));
    foamSegments.forEach((f) => f.exists && f.exists() && k.destroy(f));
  };

  return {
    collider,
    segments,
    foamSegments,
    updateColor,
    updatePosition,
    destroy,
    get pos() {
      return collider.pos;
    },
    get color() {
      return collider.color;
    },
    set color(c: Color) {
      updateColor(c);
    },
  };
}

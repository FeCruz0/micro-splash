import type { GameObj, KaboomCtx } from "kaboom";

export interface AuroraSystem {
  ribbons: GameObj[];
  destroy: () => void;
}

/**
 * Sistema de Aurora Austral na Antártica (Fase 29.6 - Lights Australis)
 * Renderiza cortinas ondulantes de luz atmosférica em tons de verde-esmeralda e magenta
 * no céu polar antártico (0m a 5.000m).
 */
export function setupAuroraSystem(k: KaboomCtx): AuroraSystem {
  const count = 6;
  const screenW = k.width ? k.width() : 640;

  interface RibbonData {
    obj: GameObj;
    relX: number;
    baseY: number;
    width: number;
    height: number;
    phase: number;
    speed: number;
    baseOpacity: number;
  }

  const ribbonList: RibbonData[] = [];

  const auroraColors = [
    k.rgb(75, 235, 165), // Verde-esmeralda elétrico
    k.rgb(195, 85, 215), // Magenta cósmico
    k.rgb(65, 220, 190), // Ciano ártico
    k.rgb(220, 95, 205), // Púrpura polar
    k.rgb(85, 245, 175), // Verde boreal/austral
    k.rgb(180, 75, 225), // Violeta
  ];

  for (let i = 0; i < count; i++) {
    const width = 22 + (i % 3) * 6;
    const height = 64 + (i % 2) * 8;
    const baseY = 6 + (i % 3) * 4;
    const relX = (i / count) * screenW + (i % 2) * 20;

    const obj = k.add([
      k.rect(width, height, { radius: 8 }),
      k.pos(0, baseY),
      k.color(auroraColors[i % auroraColors.length]),
      k.opacity(0),
      k.z(-9),
      "sky_aurora",
    ]);

    ribbonList.push({
      obj,
      relX,
      baseY,
      width,
      height,
      phase: (i / count) * Math.PI * 2,
      speed: 0.8 + (i % 3) * 0.3,
      baseOpacity: 0.14 + (i % 2) * 0.05,
    });
  }

  let time = 0;
  let cancelUpdate: any = null;

  if (k.onUpdate) {
    cancelUpdate = k.onUpdate(() => {
      const dt = k.dt ? k.dt() : 0.016;
      time += dt;

      const camX = k.camPos ? k.camPos().x : 0;
      const screenLeft = camX - screenW / 2;

      // Intensidade exclusiva do bioma polar antártico (fade-out entre 4.400m e 5.200m)
      const polarIntensity = camX < 4400 ? 1 : camX > 5200 ? 0 : (5200 - camX) / 800;

      ribbonList.forEach((r) => {
        // Ondulação sinusoidal e respiração luminosa da cortina
        const waveX = Math.sin(time * r.speed + r.phase) * 14;
        const waveY = Math.cos(time * (r.speed * 0.7) + r.phase) * 3;
        const shimmer = Math.sin(time * 1.6 + r.phase) * 0.04;

        r.obj.pos.x = screenLeft + r.relX + waveX;
        r.obj.pos.y = r.baseY + waveY;

        r.obj.opacity = polarIntensity * Math.max(0, r.baseOpacity + shimmer);
      });
    });
  }

  const destroy = () => {
    if (cancelUpdate) {
      if (typeof cancelUpdate === "function") cancelUpdate();
      else if (cancelUpdate.cancel) cancelUpdate.cancel();
    }
    ribbonList.forEach((r) => r.obj.exists && r.obj.exists() && k.destroy(r.obj));
  };

  return {
    ribbons: ribbonList.map((r) => r.obj),
    destroy,
  };
}

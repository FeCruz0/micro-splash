import type { GameObj, KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";

export interface CoastalSurfSystem {
  foamParticles: GameObj[];
  destroy: () => void;
}

/**
 * Sistema de Ondas e Espuma Costeira em Arraial do Cabo (Fase 29.4)
 * Gera partículas de rebentação e filetes de espuma flutuantes deslizando suavemente
 * pela superfície da Enseada dos Anjos (24.800m+).
 */
export function setupCoastalSurfSystem(k: KaboomCtx): CoastalSurfSystem {
  const count = 12;
  const screenW = k.width ? k.width() : 640;

  interface FoamData {
    obj: GameObj;
    relX: number;
    baseY: number;
    speedX: number;
    width: number;
    phase: number;
  }

  const foamList: FoamData[] = [];

  for (let i = 0; i < count; i++) {
    const width = k.rand ? k.rand(10, 26) : 16;
    const relX = (i / count) * screenW;
    const baseY = GAME_CONFIG.SEA_LEVEL + (k.rand ? k.rand(-1.5, 3) : 1);
    const speedX = k.rand ? k.rand(16, 32) : 24;

    const obj = k.add([
      k.rect(width, 2.2, { radius: 1 }),
      k.pos(0, baseY),
      k.color(255, 255, 255),
      k.opacity(0),
      k.z(2),
      "coastal_surf_foam",
    ]);

    foamList.push({
      obj,
      relX,
      baseY,
      speedX,
      width,
      phase: (i / count) * Math.PI * 2,
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

      // Intensidade de entrada no bioma de Arraial do Cabo (24.800m - 25.500m)
      const coastalIntensity = camX < 24800 ? 0 : camX > 25500 ? 1 : (camX - 24800) / 700;

      foamList.forEach((f) => {
        // Deslocamento para a esquerda (deriva das marés de Arraial)
        f.relX -= f.speedX * dt;
        if (f.relX < -50) {
          f.relX = screenW + 50;
        }

        const waveSway = Math.sin(time * 2.5 + f.phase) * 1.5;
        f.obj.pos.x = screenLeft + f.relX;
        f.obj.pos.y = f.baseY + waveSway;

        // Pulsação suave na opacidade
        const pulse = Math.sin(time * 3 + f.phase) * 0.12 + 0.38;
        f.obj.opacity = coastalIntensity * pulse;
      });
    });
  }

  const destroy = () => {
    if (cancelUpdate) {
      if (typeof cancelUpdate === "function") cancelUpdate();
      else if (cancelUpdate.cancel) cancelUpdate.cancel();
    }
    foamList.forEach((f) => f.obj.exists && f.obj.exists() && k.destroy(f.obj));
  };

  return {
    foamParticles: foamList.map((f) => f.obj),
    destroy,
  };
}

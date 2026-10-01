import type { GameObj, KaboomCtx } from "kaboom";

export interface AbyssalFogSystem {
  layers: GameObj[];
  destroy: () => void;
}

/**
 * Sistema de Névoa Abissal de Profundidade (Fase 29.3)
 * Projeta camadas de degradê atmosférico marinho na base inferior da tela,
 * dissolvendo o fundo oceânico nas trevas abissais e eliminando cortes geométricos secos.
 */
export function setupAbyssalFogSystem(k: KaboomCtx): AbyssalFogSystem {
  const screenH = k.height ? k.height() : 360;
  const screenW = k.width ? k.width() : 640;

  const layerConfigs = [
    { offsetY: 72, h: 18, opacity: 0.12 },
    { offsetY: 54, h: 18, opacity: 0.24 },
    { offsetY: 36, h: 18, opacity: 0.42 },
    { offsetY: 18, h: 18, opacity: 0.7 },
  ];

  const layers: GameObj[] = layerConfigs.map((cfg) => {
    return k.add([
      k.rect(screenW * 2.2, cfg.h),
      k.pos(-screenW / 2, screenH - cfg.offsetY),
      k.color(6, 12, 28),
      k.opacity(cfg.opacity),
      k.z(4),
      "abyssal_fog_layer",
    ]);
  });

  let cancelUpdate: any = null;
  if (k.onUpdate) {
    cancelUpdate = k.onUpdate(() => {
      const camX = k.camPos ? k.camPos().x : 0;
      const leftX = camX - screenW * 1.1;
      layers.forEach((layer) => {
        layer.pos.x = leftX;
      });
    });
  }

  const destroy = () => {
    if (cancelUpdate) {
      if (typeof cancelUpdate === "function") cancelUpdate();
      else if (cancelUpdate.cancel) cancelUpdate.cancel();
    }
    layers.forEach((l) => l.exists && l.exists() && k.destroy(l));
  };

  return {
    layers,
    destroy,
  };
}

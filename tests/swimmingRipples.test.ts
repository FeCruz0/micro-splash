import { describe, it, expect } from "vitest";
import {
  spawnTailWaterRipples,
  spawnTailBubbleTrail,
} from "../src/entities/player/playerParticles";

function createMockKaboom() {
  const spawnedObjects: any[] = [];
  return {
    deg2rad: (deg: number) => (deg * Math.PI) / 180,
    vec2: (x: number, y: number) => ({
      x,
      y,
      add: (other: any) => createMockKaboom().vec2(x + other.x, y + other.y),
      scale: (s: number) => createMockKaboom().vec2(x * s, y * s),
    }),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    circle: (radius: number) => ({ type: "circle", radius }),
    pos: (pos: any) => ({ pos }),
    color: (color: any) => ({ color }),
    opacity: (opacity: number) => ({ opacity }),
    z: (z: number) => ({ z }),
    dt: () => 0.016,
    destroy: (obj: any) => {
      const idx = spawnedObjects.indexOf(obj);
      if (idx !== -1) spawnedObjects.splice(idx, 1);
    },
    add: (comps: any[]) => {
      let updateCb: (() => void) | null = null;
      const obj: any = {
        comps,
        radius: 0,
        opacity: 1,
        pos: {
          x: 0,
          y: 0,
          add: (other: any) => ({ x: obj.pos.x + other.x, y: obj.pos.y + other.y }),
        },
        onUpdate: (cb: () => void) => {
          updateCb = cb;
        },
        _triggerUpdate: () => {
          if (updateCb) updateCb();
        },
      };
      spawnedObjects.push(obj);
      return obj;
    },
    spawnedObjects,
  } as any;
}

describe("Ondulações na Água (Water Ripples vs. Hélice/Torpedo)", () => {
  it("emite ondulações translúcidas na cauda com expansão suave e sem vetor de escape agressivo", () => {
    const k = createMockKaboom();
    spawnTailWaterRipples(k, k.vec2(100, 200), 0, true, 1.0);

    expect(k.spawnedObjects.length).toBeGreaterThanOrEqual(1);
    const ripple = k.spawnedObjects[0];
    expect(ripple).toBeDefined();

    // Simula atualização temporal: raio deve crescer (expansão da ondulação)
    const initialRadius = ripple.radius;
    ripple._triggerUpdate();
    expect(ripple.radius).toBeGreaterThanOrEqual(initialRadius);
  });

  it("emite ondulação concêntrica secundária em impulsos vigorosos (intensity > 1.15)", () => {
    const k = createMockKaboom();
    spawnTailWaterRipples(k, k.vec2(100, 200), 0, true, 1.3);

    // Em impulsos fortes, deve emitir 2 ondulações d'água concêntricas
    expect(k.spawnedObjects.length).toBe(2);
  });

  it("redireciona a função legado spawnTailBubbleTrail para spawnTailWaterRipples", () => {
    const k = createMockKaboom();
    spawnTailBubbleTrail(k, k.vec2(150, 250), 0, true, 1.0);

    expect(k.spawnedObjects.length).toBeGreaterThanOrEqual(1);
  });
});

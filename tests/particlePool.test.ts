import { describe, it, expect } from "vitest";
import { ParticlePool } from "../src/systems/particlePool";

function createMockKaboom() {
  const createdObjects: any[] = [];
  return {
    add: (comps: any[]) => {
      const obj: any = {
        comps,
        pos: { x: 0, y: 0 },
        hidden: false,
        radius: 0,
        width: 0,
        height: 0,
        color: null,
        opacity: 1,
        z: 0,
      };
      // Aplica pos inicial se tiver
      const posComp = comps.find((c) => c && typeof c === "object" && "x" in c && "y" in c);
      if (posComp) {
        obj.pos.x = posComp.x;
        obj.pos.y = posComp.y;
      }
      createdObjects.push(obj);
      return obj;
    },
    circle: (r: number) => ({ type: "circle", r }),
    rect: (w: number, h: number) => ({ type: "rect", w, h }),
    pos: (x: number, y: number) => ({ x, y }),
    color: (r: number, g: number, b: number) => ({ r, g, b }),
    opacity: (o: number) => ({ opacity: o }),
    z: (z: number) => ({ z }),
    vec2: (x: number, y: number) => ({
      x,
      y,
      scale: (s: number) => ({ x: x * s, y: y * s }),
      sub: (other: any) => ({
        x: x - other.x,
        y: y - other.y,
        len: () => Math.sqrt((x - other.x) ** 2 + (y - other.y) ** 2),
        unit: () => {
          const l = Math.sqrt((x - other.x) ** 2 + (y - other.y) ** 2) || 1;
          return { x: (x - other.x) / l, y: (y - other.y) / l, scale: (s: number) => ({ x: ((x - other.x) / l) * s, y: ((y - other.y) / l) * s }) };
        },
      }),
      add: (other: any) => ({ x: x + other.x, y: y + other.y }),
    }),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    createdObjects,
  } as any;
}

describe("ParticlePool (Object Pooling)", () => {
  it("pré-aloca exatamente o número requisitado de círculos e retângulos", () => {
    const mockK = createMockKaboom();
    const pool = new ParticlePool(mockK, 50, 10);

    const stats = pool.getStats();
    expect(stats.totalCircles).toBe(50);
    expect(stats.totalRects).toBe(10);
    expect(stats.activeCircles).toBe(0);
    expect(stats.activeRects).toBe(0);

    expect(mockK.createdObjects.length).toBe(60);
    mockK.createdObjects.forEach((obj: any) => {
      expect(obj.hidden).toBe(true);
    });
  });

  it("ativa partículas sem invocar mockK.add durante spawn", () => {
    const mockK = createMockKaboom();
    const pool = new ParticlePool(mockK, 10, 5);

    const initialAllocations = mockK.createdObjects.length;

    const p = pool.spawnCircle({
      pos: mockK.vec2(100, 200),
      radius: 4,
      color: mockK.rgb(255, 255, 255),
      opacity: 0.8,
      vel: mockK.vec2(10, -20),
      maxLife: 1.0,
    });

    expect(p).toBeDefined();
    expect(p?.hidden).toBe(false);
    expect(p?.pos.x).toBe(100);
    expect(p?.pos.y).toBe(200);
    expect(p?.radius).toBe(4);

    // Nenhuma entidade adicional foi alocada
    expect(mockK.createdObjects.length).toBe(initialAllocations);
    expect(pool.getStats().activeCircles).toBe(1);
  });

  it("desativa e recicla partícula após o término de sua vida útil (life <= 0)", () => {
    const mockK = createMockKaboom();
    const pool = new ParticlePool(mockK, 10, 5);

    const p = pool.spawnCircle({
      pos: mockK.vec2(50, 50),
      radius: 2,
      color: mockK.rgb(200, 200, 200),
      vel: mockK.vec2(0, -10),
      maxLife: 0.5,
    });

    expect(pool.getStats().activeCircles).toBe(1);

    // Simula 0.3s
    pool.update(0.3);
    expect(pool.getStats().activeCircles).toBe(1);
    expect(p?.hidden).toBe(false);

    // Simula mais 0.3s (total 0.6s > 0.5s maxLife)
    pool.update(0.3);
    expect(pool.getStats().activeCircles).toBe(0);
    expect(p?.hidden).toBe(true);
    expect(p?.pos.x).toBe(-9999);
  });

  it("reutiliza partículas mais antigas (Ring Buffer / LRU) quando a capacidade é esgotada", () => {
    const mockK = createMockKaboom();
    const pool = new ParticlePool(mockK, 3, 2);

    const p1 = pool.spawnCircle({ pos: mockK.vec2(1, 1), radius: 1, color: mockK.rgb(1, 1, 1), maxLife: 10 });
    const p2 = pool.spawnCircle({ pos: mockK.vec2(2, 2), radius: 2, color: mockK.rgb(2, 2, 2), maxLife: 10 });
    const p3 = pool.spawnCircle({ pos: mockK.vec2(3, 3), radius: 3, color: mockK.rgb(3, 3, 3), maxLife: 10 });

    expect(p2).toBeDefined();
    expect(p3).toBeDefined();

    expect(pool.getStats().activeCircles).toBe(3);

    // 4º spawn quando o limite é 3 -> reutiliza o primeiro da fila sem erro
    const p4 = pool.spawnCircle({ pos: mockK.vec2(4, 4), radius: 4, color: mockK.rgb(4, 4, 4), maxLife: 10 });

    expect(p4).toBe(p1);
    expect(p4?.pos.x).toBe(4);
    expect(pool.getStats().activeCircles).toBe(3);
    expect(mockK.createdObjects.length).toBe(5); // 3 circles + 2 rects pré-alocados, 0 alocações novas
  });

  it("suporta partículas retangulares para esteiras e fluxos", () => {
    const mockK = createMockKaboom();
    const pool = new ParticlePool(mockK, 5, 5);

    const r = pool.spawnRect({
      pos: mockK.vec2(10, 20),
      width: 15,
      height: 2,
      color: mockK.rgb(140, 240, 255),
      vel: mockK.vec2(-100, 0),
      maxLife: 0.5,
    });

    expect(r).toBeDefined();
    expect(r?.hidden).toBe(false);
    expect(r?.width).toBe(15);
    expect(pool.getStats().activeRects).toBe(1);

    pool.update(0.6);
    expect(pool.getStats().activeRects).toBe(0);
    expect(r?.hidden).toBe(true);
  });
});

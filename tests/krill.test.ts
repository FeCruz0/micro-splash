import { describe, it, expect } from "vitest";
import { createKrill } from "../src/entities/krill";
import { TAGS } from "../src/config";

describe("Entidade Krill e Destaque por Biosonar", () => {
  function createMockKaboom() {
    const createdObjs: any[] = [];

    const mockK: any = {
      dt: () => 0.1,
      rect: (w: number, h: number, opt?: any) => ({ type: "rect", w, h, opt }),
      circle: (r: number) => ({ type: "circle", r }),
      text: (t: string, opt?: any) => ({ type: "text", t, opt }),
      pos: (x: any, y?: any) => {
        if (typeof x === "object") return { type: "pos", ...x };
        return { type: "pos", x, y };
      },
      color: (r: number, g: number, b: number) => ({ type: "color", r, g, b }),
      outline: (w: number, col: any) => ({ type: "outline", w, col }),
      opacity: (o: number) => ({ type: "opacity", value: o }),
      rotate: (a: number) => ({ type: "rotate", angle: a }),
      scale: (s: number) => ({ type: "scale", value: s }),
      anchor: (a: string) => ({ type: "anchor", value: a }),
      area: () => ({ type: "area" }),
      z: (v: number) => ({ type: "z", value: v }),
      rgb: (r: number, g: number, b: number) => ({
        r,
        g,
        b,
        lerp: (other: any, t: number) => ({
          r: r + (other.r - r) * t,
          g: g + (other.g - g) * t,
          b: b + (other.b - b) * t,
        }),
      }),
      vec2: (x: number, y: number) => ({
        x,
        y,
        add: (v: any) => mockK.vec2(x + v.x, y + v.y),
        sub: (v: any) => mockK.vec2(x - v.x, y - v.y),
        scale: (s: number) => mockK.vec2(x * s, y * s),
        unit: () => {
          const mag = Math.hypot(x, y) || 1;
          return mockK.vec2(x / mag, y / mag);
        },
        dist: (v: any) => Math.hypot(x - v.x, y - v.y),
        lerp: (v: any, t: number) => mockK.vec2(x + (v.x - x) * t, y + (v.y - y) * t),
      }),
      rand: (min: number, max: number) => min + Math.random() * (max - min),
      choose: (arr: any[]) => arr[0],
      get: () => [],
      add: (components: any[]) => {
        const obj: any = {
          components,
          pos: { x: 0, y: 0 },
          color: { r: 255, g: 255, b: 255 },
          opacity: 1,
          radius: 0,
          scale: { x: 1, y: 1 },
          exists: () => true,
          _updateHandlers: [] as Function[],
          _destroyHandlers: [] as Function[],
          onUpdate(fn: Function) {
            this._updateHandlers.push(fn);
          },
          onDestroy(fn: Function) {
            this._destroyHandlers.push(fn);
          },
          is: (tag: string) => components.includes(tag),
        };

        components.forEach((c) => {
          if (c && typeof c === "object") {
            if (c.type === "pos") obj.pos = { x: c.x, y: c.y };
            if (c.type === "opacity") obj.opacity = c.value;
            if (c.reveal) obj.reveal = c.reveal;
            if (c.isRevealed) obj.isRevealed = c.isRevealed;
          }
        });

        createdObjs.push(obj);
        return obj;
      },
      destroy: (obj: any) => {
        if (obj && obj._destroyHandlers) {
          obj._destroyHandlers.forEach((fn: Function) => fn());
        }
      },
    };

    return { mockK, createdObjs };
  }

  it("cria o cardume de krill com tags e métodos de revelação pelo sonar", () => {
    const { mockK, createdObjs } = createMockKaboom();
    const krill = createKrill(mockK, mockK.vec2(500, 250));

    expect(krill.is(TAGS.KRILL)).toBe(true);
    expect(krill.is("krill_swarm")).toBe(true);
    expect(typeof krill.reveal).toBe("function");
    expect(typeof krill.isRevealed).toBe("function");
    expect(krill.isRevealed()).toBe(false);

    // O colisor central inicia invisível
    expect(krill.opacity).toBe(0);

    // Boids filhos devem ter sido adicionados
    expect(createdObjs.length).toBeGreaterThanOrEqual(10);
  });

  it("ativa o estado de revelação ao ser atingido pelo sonar", () => {
    const { mockK } = createMockKaboom();
    const krill = createKrill(mockK, mockK.vec2(800, 300));

    expect(krill.isRevealed()).toBe(false);
    krill.reveal();
    expect(krill.isRevealed()).toBe(true);
  });

  it("destrói o cardume e seus boids filhos sem erro", () => {
    const { mockK } = createMockKaboom();
    const krill = createKrill(mockK, mockK.vec2(1200, 200));

    expect(() => {
      mockK.destroy(krill);
    }).not.toThrow();
  });
});

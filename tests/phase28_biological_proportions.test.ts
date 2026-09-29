import { describe, it, expect, vi } from "vitest";
import { setupPenguinFlockSystem } from "../src/systems/penguinFlockSystem";
import { setupDolphinDraftingSystem } from "../src/systems/dolphinDraftingSystem";
import { setupBackgroundFaunaSystem } from "../src/systems/backgroundFauna";
import { setupShipNoiseSystem } from "../src/systems/shipNoiseSystem";
import { createTrash } from "../src/entities/trash";
import { createGhostNet } from "../src/entities/net";
import { createBubbleVent } from "../src/entities/bubbleVent";

describe("FASE 28: Proporcionalidade Biológica & Redesenho de Entidades", () => {
  // =========================================================================
  // 28.1: Pinguins-de-Magalhães (Spheniscus magellanicus)
  // =========================================================================
  it("28.1: pinguins possuem escala biológica 14x5px, barriga branca e bando compacto", () => {
    const rectCalls: any[] = [];
    const polygonCalls: any[] = [];
    const mockK: any = {
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      rect: vi.fn((w: number, h: number, opts?: any) => {
        rectCalls.push({ w, h, opts });
        return { type: "rect", w, h, opts };
      }),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      polygon: vi.fn((pts: any[]) => {
        polygonCalls.push(pts);
        return { type: "polygon", pts };
      }),
      color: vi.fn((r: number, g: number, b: number) => ({ type: "color", r, g, b })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      anchor: vi.fn((a: string) => ({ type: "anchor", anchor: a })),
      rotate: vi.fn((ang: number) => ({ type: "rotate", angle: ang })),
      scale: vi.fn((s: any) => ({ type: "scale", scale: s })),
      z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
      vec2: (x: number, y: number) => ({ x, y }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      dt: vi.fn(() => 0.016),
      onUpdate: vi.fn(),
      add: vi.fn((_components: any[]) => {
        const obj: any = {
          add: vi.fn((childComps: any[]) => {
            return { childComps };
          }),
          pos: { x: 400, y: 150 },
          angle: 0,
          onUpdate: vi.fn(),
        };
        return obj;
      }),
      height: vi.fn(() => 720),
    };

    setupPenguinFlockSystem(mockK);

    // 17 corpos de pinguim de 14x5px distribuídos em 4 colônias
    const bodyRects = rectCalls.filter((r) => r.w === 14 && r.h === 5);
    expect(bodyRects.length).toBe(17);

    // 17 barrigas brancas ventrais de 10x2.5px
    const bellyRects = rectCalls.filter((r) => r.w === 10 && r.h === 2.5);
    expect(bellyRects.length).toBe(17);

    // 17 bicos pretos estreitos de 3x1.5px
    const beakRects = rectCalls.filter((r) => r.w === 3 && r.h === 1.5);
    expect(beakRects.length).toBe(17);

    // Nadadeiras em polígono
    expect(polygonCalls.length).toBeGreaterThanOrEqual(17);
  });

  // =========================================================================
  // 28.2: Golfinhos-Rotadores (Stenella longirostris)
  // =========================================================================
  it("28.2: golfinhos-rotadores possuem escala de 28x9px, barbatana falcada e formação em escalão", () => {
    const rectCalls: any[] = [];
    const polygonCalls: any[] = [];
    const mockK: any = {
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      rect: vi.fn((w: number, h: number, opts?: any) => {
        rectCalls.push({ w, h, opts });
        return { type: "rect", w, h, opts };
      }),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      polygon: vi.fn((pts: any[]) => {
        polygonCalls.push(pts);
        return { type: "polygon", pts };
      }),
      color: vi.fn((r: number, g: number, b: number) => ({ type: "color", r, g, b })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      anchor: vi.fn((a: string) => ({ type: "anchor", anchor: a })),
      rotate: vi.fn((ang: number) => ({ type: "rotate", angle: ang })),
      scale: vi.fn((s: any) => ({ type: "scale", scale: s })),
      z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
      vec2: (x: number, y: number) => ({ x, y }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      dt: vi.fn(() => 0.016),
      onUpdate: vi.fn(),
      add: vi.fn((_components: any[]) => {
        const obj: any = {
          add: vi.fn(),
          pos: { x: 300, y: 180 },
          angle: 0,
          onUpdate: vi.fn(),
        };
        return obj;
      }),
      height: vi.fn(() => 720),
    };

    const mockPlayerController: any = {
      gameObj: { pos: { x: 300, y: 180 } },
      getSpeed: () => ({ x: 120, y: 0 }),
      setSpeed: vi.fn(),
    };

    const system = setupDolphinDraftingSystem(mockK, mockPlayerController);
    expect(system).toBeDefined();

    // 12 golfinhos distribuídos em 3 pods de 4 membros
    const bodyRects = rectCalls.filter((r) => r.w === 28 && r.h === 9);
    expect(bodyRects.length).toBe(12);

    // 12 barrigas cinza-claro de 20x3.2px
    const bellyRects = rectCalls.filter((r) => r.w === 20 && r.h === 3.2);
    expect(bellyRects.length).toBe(12);

    // 12 bicos delgados de 5.5x2.5px
    const beakRects = rectCalls.filter((r) => r.w === 5.5 && r.h === 2.5);
    expect(beakRects.length).toBe(12);

    // Barbatanas falcadas em polígono (dorsal + cauda)
    expect(polygonCalls.length).toBeGreaterThanOrEqual(24);
  });

  // =========================================================================
  // 28.3 & 28.4: Fauna de Fundo (Cachalote Abissal e Berçário Mãe/Filhote)
  // =========================================================================
  it("28.3 & 28.4: cachalote abissal tem escala 0.95 (182px) e berçário tem proporção 0.66 mãe e 0.26 filhote", () => {
    const scales: Record<string, number> = {};
    const mockK: any = {
      sprite: vi.fn((name: string, opts?: any) => ({ type: "sprite", name, opts })),
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      scale: vi.fn((s: number) => ({ type: "scale", scale: s })),
      rotate: vi.fn((a: number) => ({ type: "rotate", angle: a })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      anchor: vi.fn((a: string) => ({ type: "anchor", anchor: a })),
      z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      rect: vi.fn((w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts })),
      color: vi.fn((r: number, g: number, b: number) => ({ type: "color", r, g, b })),
      wait: vi.fn((_t: number, cb: () => void) => cb && cb()),
      dt: vi.fn(() => 0.016),
      get: vi.fn(() => []),
      destroy: vi.fn(),
      add: vi.fn((components: any[]) => {
        const spriteComp = components.find((c: any) => c && c.type === "sprite");
        const scaleComp = components.find((c: any) => c && c.type === "scale");
        const posComp = components.find((c: any) => c && c.type === "pos");
        if (spriteComp) {
          if (spriteComp.name === "cachalote_bg") {
            scales["cachalote"] = scaleComp ? scaleComp.scale : 1.0;
          } else if (spriteComp.name === "jubarte_bg") {
            if (posComp && posComp.x === 25800) {
              scales["mother"] = scaleComp ? scaleComp.scale : 1.0;
            } else if (posComp && posComp.x === 25848) {
              scales["calf"] = scaleComp ? scaleComp.scale : 1.0;
            }
          }
        }
        return {
          pos: { x: posComp?.x ?? 0, y: posComp?.y ?? 0, dist: vi.fn(() => 9999) },
          angle: 0,
          onUpdate: vi.fn(),
        };
      }),
    };

    setupBackgroundFaunaSystem(mockK);

    // Cachalote Abissal (Fase 28.3): escala 0.95 (182x59px no frame 192x64px)
    expect(scales["cachalote"]).toBe(0.95);

    // Mãe no Berçário (Fase 28.4): escala 0.66 (95x32px)
    expect(scales["mother"]).toBe(0.66);

    // Filhote no Berçário (Fase 28.4): escala 0.26 (~40% do tamanho da mãe)
    expect(scales["calf"]).toBe(0.26);
    expect(scales["calf"] / scales["mother"]).toBeCloseTo(0.394, 2);
  });

  // =========================================================================
  // 28.5: Navio Cargueiro
  // =========================================================================
  it("28.5: navio cargueiro possui proporções imponentes de 280x50px com 9 vigias e chaminé monumental", () => {
    const rectCalls: any[] = [];
    const mockK: any = {
      rect: vi.fn((w: number, h: number, opts?: any) => {
        rectCalls.push({ w, h, opts });
        return { type: "rect", w, h, opts };
      }),
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      color: vi.fn((r: number, g: number, b: number) => ({ type: "color", r, g, b })),
      outline: vi.fn((w: number, col: any) => ({ type: "outline", w, col })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      anchor: vi.fn((a: string) => ({ type: "anchor", anchor: a })),
      z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      dt: vi.fn(() => 0.016),
      add: vi.fn((components: any[]) => {
        const obj: any = {
          components,
          add: vi.fn((childComps: any[]) => {
            return { childComps };
          }),
          pos: { x: 13000, y: 120 },
          onUpdate: vi.fn(),
        };
        return obj;
      }),
    };

    const mockPlayerController: any = {
      gameObj: { pos: { x: 13000, y: 250, dist: vi.fn(() => 500) } },
      getSpeed: () => ({ x: 100, y: 0 }),
      setSpeed: vi.fn(),
    };

    setupShipNoiseSystem(mockK, mockPlayerController);

    // Casco do navio expandido para 280x50px
    const hulls = rectCalls.filter((r) => r.w === 280 && r.h === 50);
    expect(hulls.length).toBe(3); // 3 navios patrulhando

    // Linha d'água 280x14px
    const waterlines = rectCalls.filter((r) => r.w === 280 && r.h === 14);
    expect(waterlines.length).toBe(3);

    // Chaminé monumental: corpo 35x45px e anel 42x10px
    const chimneys = rectCalls.filter((r) => r.w === 35 && r.h === 45);
    expect(chimneys.length).toBe(3);
    const chimneyRings = rectCalls.filter((r) => r.w === 42 && r.h === 10);
    expect(chimneyRings.length).toBe(3);

    // 9 vigias por navio = 27 vigias de 6x4px
    const windows = rectCalls.filter((r) => r.w === 6 && r.h === 4);
    expect(windows.length).toBe(27);
  });

  // =========================================================================
  // 28.6: Lixo Plástico
  // =========================================================================
  it("28.6: lixo plástico tem variantes procedurais (garrafa, sacola, embalagem) com hitboxes calibradas", () => {
    const areaShapes: any[] = [];
    const mockK: any = {
      rect: vi.fn((w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts })),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      pos: vi.fn((p: any) => ({ type: "pos", p })),
      color: vi.fn((c: any) => ({ type: "color", c })),
      outline: vi.fn((w: number, c: any) => ({ type: "outline", w, c })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      anchor: vi.fn((a: string) => ({ type: "anchor", anchor: a })),
      rotate: vi.fn((ang: number) => ({ type: "rotate", angle: ang })),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      dt: vi.fn(() => 0.016),
      Rect: class {
        pos: any;
        width: number;
        height: number;
        constructor(pos: any, width: number, height: number) {
          this.pos = pos;
          this.width = width;
          this.height = height;
        }
      },
      vec2: (x: number, y: number) => ({ x, y }),
      area: vi.fn((opts?: any) => {
        if (opts && opts.shape) areaShapes.push(opts.shape);
        return { type: "area", opts };
      }),
      add: vi.fn((components: any[]) => {
        const obj: any = {
          components,
          add: vi.fn(),
          pos: { x: 500, y: 300 },
          onUpdate: vi.fn(),
        };
        return obj;
      }),
    };

    // Gera 15 instâncias para cobrir os 3 tipos procedurais
    for (let i = 0; i < 15; i++) {
      createTrash(mockK, { x: 500 + i * 50, y: 300 } as any);
    }

    // Verifica que pelo menos uma garrafa PET (com hitbox personalizada 11x26) e sacola (20x19) foram criadas
    const bottleHitbox = areaShapes.find((s) => s.width === 11 && s.height === 26);
    const bagHitbox = areaShapes.find((s) => s.width === 20 && s.height === 19);

    expect(bottleHitbox || bagHitbox).toBeDefined();
  });

  // =========================================================================
  // 28.7: Rede Fantasma
  // =========================================================================
  it("28.7: rede fantasma tem malha monofilamento com boias, cabo superior e nós de cruzamento", () => {
    const addedChilds: any[] = [];
    const mockK: any = {
      rect: vi.fn((w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts })),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      color: vi.fn((c: any) => ({ type: "color", c })),
      outline: vi.fn((w: number, c: any) => ({ type: "outline", w, c })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      area: vi.fn(),
      anchor: vi.fn(),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      dt: vi.fn(() => 0.016),
      add: vi.fn((components: any[]) => {
        const netObj: any = {
          components,
          opacity: 0,
          pos: { x: 800, y: 300 },
          add: vi.fn((childComps: any[]) => {
            const ch: any = { childComps, opacity: 0 };
            addedChilds.push(ch);
            return ch;
          }),
          onUpdate: vi.fn(),
        };
        return netObj;
      }),
    };

    createGhostNet(mockK, { x: 800, y: 300 } as any);

    // 1 top cable + 4 boias + 3 verticais + 5 horizontais + 15 nós de malha = 28 componentes
    expect(addedChilds.length).toBe(28);
  });

  // =========================================================================
  // 28.8: Bolsões de Ar
  // =========================================================================
  it("28.8: bolsão de ar possui núcleo etéreo pulsante com transição entre ativo e resfriamento", () => {
    const addedObjs: any[] = [];
    const mockK: any = {
      rect: vi.fn((w: number, h: number) => ({ type: "rect", w, h })),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      color: vi.fn((c: any) => ({ type: "color", c })),
      outline: vi.fn((w: number, col: any) => ({ type: "outline", w, col })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      area: vi.fn(),
      anchor: vi.fn(),
      z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      vec2: (x: number, y: number) => ({ x, y }),
      choose: (arr: any[]) => arr[0],
      rand: (min: number, max: number) => (min + max) / 2,
      dt: vi.fn(() => 0.016),
      add: vi.fn((components: any[]) => {
        const obj: any = {
          components,
          pos: { x: 600, y: 400 },
          opacity: 0.5,
          radius: 20,
          _updateCb: null as any,
          onUpdate: vi.fn((cb) => {
            obj._updateCb = cb;
          }),
          onDestroy: vi.fn(),
          exists: vi.fn(() => true),
        };
        addedObjs.push(obj);
        return obj;
      }),
    };

    const vent: any = createBubbleVent(mockK, { x: 600, y: 400 } as any, 220);
    expect(vent).toBeDefined();

    // ventCore (obj 0) + glowOuter (obj 1) + glowInner (obj 2) + 14 bubbles (objs 3-16) = 17 objs
    expect(addedObjs.length).toBe(17);

    const glowOuter = addedObjs[1];
    const glowInner = addedObjs[2];

    // Simula loop de atualização normal (estado ativo/respirável)
    vent._updateCb();
    expect(glowOuter.opacity).toBeGreaterThan(0.2);
    expect(glowInner.opacity).toBeGreaterThan(0.3);

    // Coleta o ar e entra em cooldown de 4s
    const customComp = vent.components.find((c: any) => c && typeof c.collectAir === "function");
    expect(customComp).toBeDefined();
    const collected = customComp.collectAir();
    expect(collected).toBe(true);

    // Durante o cooldown, o núcleo se atenua (dimmed)
    vent._updateCb();
    expect(glowOuter.opacity).toBe(0.12);
    expect(glowInner.opacity).toBe(0.2);
  });
});

import { describe, it, expect } from "vitest";
import { setupOceanFloorSystem, SUBMARINE_RELIEFS } from "../src/systems/oceanFloorSystem";
import { GAME_CONFIG } from "../src/config";

describe("Sistema de Topografia e Relevos Submarinos (oceanFloorSystem)", () => {
  it("possui catálogo de relevos geológicos abrangendo os 5 biomas da rota", () => {
    expect(SUBMARINE_RELIEFS.length).toBeGreaterThanOrEqual(15);

    // Bioma 1: Antártica (0 a 5.000m)
    const antarcticReliefs = SUBMARINE_RELIEFS.filter((r) => r.startX < 5000);
    expect(antarcticReliefs.length).toBeGreaterThanOrEqual(3);
    expect(antarcticReliefs.some((r) => r.type === "moraine")).toBe(true);

    // Bioma 2: Mar Aberto (5.000 a 12.000m)
    const pelagicReliefs = SUBMARINE_RELIEFS.filter((r) => r.startX >= 5000 && r.startX < 12000);
    expect(pelagicReliefs.length).toBeGreaterThanOrEqual(3);
    expect(pelagicReliefs.some((r) => r.type === "seamount")).toBe(true);

    // Bioma 3: Costa Urbana (12.000 a 19.000m)
    const coastalReliefs = SUBMARINE_RELIEFS.filter((r) => r.startX >= 12000 && r.startX < 19000);
    expect(coastalReliefs.length).toBeGreaterThanOrEqual(3);
    expect(coastalReliefs.some((r) => r.type === "sandbar")).toBe(true);

    // Bioma 4: Cânions de Cabo Frio (19.000 a 25.000m)
    const canyonReliefs = SUBMARINE_RELIEFS.filter((r) => r.startX >= 19000 && r.startX < 25000);
    expect(canyonReliefs.length).toBeGreaterThanOrEqual(3);
    expect(canyonReliefs.some((r) => r.type === "canyon_ridge")).toBe(true);

    // Bioma 5: Santuário de Arraial (27.300 a 30.000m)
    const sanctuaryReliefs = SUBMARINE_RELIEFS.filter((r) => r.startX >= 27300);
    expect(sanctuaryReliefs.length).toBeGreaterThanOrEqual(2);
    expect(sanctuaryReliefs.some((r) => r.type === "reef_shoal")).toBe(true);
  });

  it("garante espaço navegável suficiente entre o cume do relevo e a superfície da água", () => {
    const seaLevel = GAME_CONFIG.SEA_LEVEL; // 80px
    const floorY = 320; // 360 - 40 em resolução padrão

    SUBMARINE_RELIEFS.forEach((relief) => {
      const peakY = floorY - relief.height;
      const navigableWaterColumn = peakY - seaLevel;
      // Garante no mínimo 160px de lâmina d'água livre para nado suave da jubarte (corpo tem 40px)
      expect(navigableWaterColumn).toBeGreaterThanOrEqual(160);
    });
  });

  it("cria entidades de relevo no Kaboom com colisores sólidos e suporte ao Biosonar", () => {
    const createdObjects: any[] = [];

    const mockKaboom: any = {
      height: () => 360,
      width: () => 640,
      dt: () => 0.016,
      add: (comps: any[]) => {
        const obj: any = {
          comps,
          hasTag: (tag: string) => comps.includes(tag),
          isStaticBody: comps.some((c) => c && typeof c === "object" && "isStatic" in c && c.isStatic),
          hasArea: comps.some((c) => c && typeof c === "object" && "area" in c),
          outline: { color: { r: 40, g: 60, b: 80 }, width: 2 },
          onUpdate: () => {},
        };
        const customProps = comps.find((c) => c && typeof c === "object" && "reveal" in c);
        if (customProps) {
          obj.reveal = customProps.reveal;
          obj.reliefData = customProps.reliefData;
        }
        createdObjects.push(obj);
        return obj;
      },
      rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
      polygon: (pts: any[]) => ({ type: "polygon", pts }),
      circle: (r: number) => ({ type: "circle", r }),
      pos: (x: number, y: number) => ({ x, y }),
      color: (r: number, g: number, b: number) => ({ r, g, b }),
      outline: (width: number, color: any) => ({ width, color }),
      opacity: (o: number) => ({ opacity: o }),
      z: (z: number) => ({ z }),
      area: () => ({ area: true }),
      body: (opts: any) => ({ body: true, isStatic: opts?.isStatic }),
      anchor: (a: string) => ({ anchor: a }),
      rotate: (r: number) => ({ rotate: r }),
      vec2: (x: number, y: number) => ({ x, y }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      onUpdate: () => {},
    };

    setupOceanFloorSystem(mockKaboom);

    // 1. Verifica existência de relevos com tag ocean_relief
    const reliefs = createdObjects.filter((o) => o.hasTag("ocean_relief"));
    expect(reliefs.length).toBe(SUBMARINE_RELIEFS.length);

    // 2. Verifica existência de colisores sólidos associados
    const colliders = createdObjects.filter(
      (o) => o.hasTag("ocean_relief_collider") && o.isStaticBody
    );
    expect(colliders.length).toBe(SUBMARINE_RELIEFS.length);

    // 3. Verifica capacidade de resposta ao Biosonar
    reliefs.forEach((r) => {
      expect(typeof r.reveal).toBe("function");
    });
  });
});

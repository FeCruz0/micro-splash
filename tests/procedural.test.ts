import { describe, it, expect } from "vitest";
import {
  createRNG,
  generateProceduralLayout,
} from "../src/systems/proceduralObstacles";

describe("Procedural Obstacles Generator", () => {
  it("gera sequência pseudo-aleatória determinística para a mesma seed", () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);

    const values1 = [rng1(), rng1(), rng1()];
    const values2 = [rng2(), rng2(), rng2()];

    expect(values1).toEqual(values2);
  });

  it("produz layouts idênticos para a mesma seed", () => {
    const layoutA = generateProceduralLayout(999, 360);
    const layoutB = generateProceduralLayout(999, 360);

    expect(layoutA.trashPositions).toEqual(layoutB.trashPositions);
    expect(layoutA.krillPositions).toEqual(layoutB.krillPositions);
    expect(layoutA.netPositions).toEqual(layoutB.netPositions);
    expect(layoutA.powerupPositions).toEqual(layoutB.powerupPositions);
  });

  it("garante a distribuição biológica correta por bioma", () => {
    const layout = generateProceduralLayout(42, 360);

    // 1. Antártica (0m a 5000m):
    // Abundância de krill para alimentação, 0 lixo plástico
    const antarcticKrill = layout.krillPositions.filter((k) => k.x <= 5000);
    const antarcticTrash = layout.trashPositions.filter((t) => t.x <= 5000);
    expect(antarcticKrill.length).toBeGreaterThanOrEqual(8);
    expect(antarcticTrash.length).toBe(0);

    // 2. Travessia Oceânica (5000m a 12000m):
    // Presença de redes fantasmas e powerups de alto mar
    const oceanNets = layout.netPositions.filter((n) => n.x >= 5000 && n.x <= 12000);
    const oceanPowerups = layout.powerupPositions.filter((p) => p.x >= 5000 && p.x <= 12000);
    expect(oceanNets.length).toBeGreaterThanOrEqual(4);
    expect(oceanPowerups.length).toBeGreaterThanOrEqual(2);

    // 3. Costa Urbana (12000m a 19000m):
    // Concentração alta de lixo plástico e escudos de bolha
    const urbanTrash = layout.trashPositions.filter((t) => t.x >= 12000 && t.x <= 19000);
    const urbanBubbleShields = layout.powerupPositions.filter(
      (p) => p.x >= 12000 && p.x <= 19000 && p.type === "bubble_shield"
    );
    expect(urbanTrash.length).toBeGreaterThanOrEqual(18);
    expect(urbanBubbleShields.length).toBeGreaterThanOrEqual(2);

    // 4. Cânions de Ressurgência (19000m a 25000m):
    // Presença de redes e bolsões de ar
    const canyonAirPockets = layout.powerupPositions.filter(
      (p) => p.x >= 19000 && p.x <= 25000 && p.type === "air_pocket"
    );
    expect(canyonAirPockets.length).toBeGreaterThanOrEqual(2);

    // 5. Berçário do Santuário (25000m a 29500m):
    // Presença de desafios para escolta do filhote (redes, lixo e escudos de bolha)
    const nurseryObstacles = [
      ...layout.trashPositions.filter((t) => t.x >= 25000 && t.x <= 29500),
      ...layout.netPositions.filter((n) => n.x >= 25000 && n.x <= 29500),
    ];
    expect(nurseryObstacles.length).toBeGreaterThanOrEqual(15);

    // 6. Enseada da Vitória (29500m a 30000m):
    // Livre de perigos para permitir o Salto Majestoso (Breach) e comemoração
    const finalArrivalObstacles = [
      ...layout.trashPositions.filter((t) => t.x > 29500),
      ...layout.netPositions.filter((n) => n.x > 29500),
    ];
    expect(finalArrivalObstacles.length).toBe(0);
  });

  it("mantém todos os obstáculos dentro da profundidade navegável", () => {
    const worldHeight = 360;
    const layout = generateProceduralLayout(777, worldHeight);

    const allPositions = [
      ...layout.trashPositions,
      ...layout.krillPositions,
      ...layout.netPositions,
      ...layout.powerupPositions,
    ];

    allPositions.forEach((pos) => {
      // Y deve estar abaixo do nível do mar (~80) e acima do leito do mar (~320)
      expect(pos.y).toBeGreaterThanOrEqual(120);
      expect(pos.y).toBeLessThanOrEqual(worldHeight - 30);
    });
  });

  it("espalha lixos e redes amplamente por toda a profundidade em alta resolução (720p)", () => {
    const layout = generateProceduralLayout(1234, 720);

    const urbanTrash = layout.trashPositions.filter((t) => t.x >= 12000 && t.x <= 19000);
    const shallowTrash = urbanTrash.filter((t) => t.y < 300);
    const midTrash = urbanTrash.filter((t) => t.y >= 300 && t.y < 480);
    const deepTrash = urbanTrash.filter((t) => t.y >= 480);

    // Deve haver lixo nas três faixas (superfície, meia-água e fundo)
    expect(shallowTrash.length).toBeGreaterThanOrEqual(4);
    expect(midTrash.length).toBeGreaterThanOrEqual(4);
    expect(deepTrash.length).toBeGreaterThanOrEqual(4);

    // Redes também devem cobrir diferentes faixas verticais
    const shallowNets = layout.netPositions.filter((n) => n.y < 300);
    const midNets = layout.netPositions.filter((n) => n.y >= 300 && n.y < 500);
    const deepNets = layout.netPositions.filter((n) => n.y >= 500);

    expect(shallowNets.length).toBeGreaterThanOrEqual(2);
    expect(midNets.length).toBeGreaterThanOrEqual(2);
    expect(deepNets.length).toBeGreaterThanOrEqual(2);
  });
});

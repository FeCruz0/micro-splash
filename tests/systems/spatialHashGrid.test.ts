import { describe, it, expect } from "vitest";
import { SpatialHashGrid } from "../../src/systems/spatialHashGrid";

describe("SpatialHashGrid — Particionamento Espacial 2D em Grade (Fase 59)", () => {
  it("deve inserir itens e computar as células ocupadas corretamente", () => {
    const grid = new SpatialHashGrid<{ name: string }>({ cellSize: 100 });

    grid.insert("krill_1", { name: "Krill Alpha" }, { minX: 10, minY: 10, maxX: 50, maxY: 50 });
    expect(grid.has("krill_1")).toBe(true);
    expect(grid.get("krill_1")?.name).toBe("Krill Alpha");

    const stats = grid.getStats();
    expect(stats.entityCount).toBe(1);
    expect(stats.cellCount).toBe(1); // Célula 0:0
  });

  it("deve mapear entidades que cruzam fronteiras de células em múltiplos buckets", () => {
    const grid = new SpatialHashGrid<{ name: string }>({ cellSize: 100 });

    // Objeto ocupando fronteira entre (0,0), (1,0), (0,1) e (1,1)
    grid.insert("large_rock", { name: "Pedra" }, { minX: 80, minY: 80, maxX: 120, maxY: 120 });
    const stats = grid.getStats();
    expect(stats.entityCount).toBe(1);
    expect(stats.cellCount).toBe(4);
  });

  it("deve consultar entidades por AABB sem duplicatas", () => {
    const grid = new SpatialHashGrid<{ id: number }>({ cellSize: 100 });

    grid.insert("k1", { id: 1 }, { minX: 50, minY: 50, maxX: 150, maxY: 150 });
    grid.insert("k2", { id: 2 }, { minX: 300, minY: 300, maxX: 350, maxY: 350 });

    const results = grid.queryAABB({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(results.length).toBe(1);
    expect(results[0].id).toBe(1);
  });

  it("deve consultar entidades por raio euclidiano com precisão", () => {
    const grid = new SpatialHashGrid<{ x: number; y: number }>({ cellSize: 100 });

    grid.insert("target_near", { x: 100, y: 100 }, { minX: 95, minY: 95, maxX: 105, maxY: 105 });
    grid.insert("target_far", { x: 300, y: 300 }, { minX: 295, minY: 295, maxX: 305, maxY: 305 });

    const found = grid.queryRadius(100, 100, 50, (item) => ({ x: item.x, y: item.y }));
    expect(found.length).toBe(1);
    expect(found[0].x).toBe(100);

    const none = grid.queryRadius(0, 0, 30);
    expect(none.length).toBe(0);
  });

  it("deve atualizar a posição de uma entidade e migrar entre células", () => {
    const grid = new SpatialHashGrid<{ name: string }>({ cellSize: 100 });

    grid.insert("moving", { name: "Navegante" }, { minX: 10, minY: 10, maxX: 20, maxY: 20 });
    expect(grid.queryAABB({ minX: 0, minY: 0, maxX: 50, maxY: 50 }).length).toBe(1);

    // Desloca para coordenada 500m adiante
    const updated = grid.update("moving", { minX: 500, minY: 10, maxX: 510, maxY: 20 });
    expect(updated).toBe(true);

    expect(grid.queryAABB({ minX: 0, minY: 0, maxX: 50, maxY: 50 }).length).toBe(0);
    expect(grid.queryAABB({ minX: 450, minY: 0, maxX: 550, maxY: 50 }).length).toBe(1);
  });

  it("deve remover entidades e limpar células que ficaram vazias", () => {
    const grid = new SpatialHashGrid<{ id: number }>({ cellSize: 100 });

    grid.insert("item1", { id: 1 }, { minX: 10, minY: 10, maxX: 20, maxY: 20 });
    expect(grid.getStats().cellCount).toBe(1);

    expect(grid.remove("item1")).toBe(true);
    expect(grid.remove("non_existing")).toBe(false);

    const stats = grid.getStats();
    expect(stats.entityCount).toBe(0);
    expect(stats.cellCount).toBe(0);
  });

  it("deve limpar completamente o grid com clear()", () => {
    const grid = new SpatialHashGrid<{ id: number }>({ cellSize: 100 });

    grid.insert("1", { id: 1 }, { minX: 0, minY: 0, maxX: 10, maxY: 10 });
    grid.insert("2", { id: 2 }, { minX: 200, minY: 200, maxX: 210, maxY: 210 });

    expect(grid.getStats().entityCount).toBe(2);
    grid.clear();
    expect(grid.getStats().entityCount).toBe(0);
    expect(grid.getStats().cellCount).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import levelLayout from "../data/level_layout.json";

describe("Layout de Níveis (data/level_layout.json)", () => {
  it("contém seções obrigatórias de lixo, krill e redes", () => {
    expect(Array.isArray(levelLayout.urbanTrash)).toBe(true);
    expect(Array.isArray(levelLayout.antarcticKrill)).toBe(true);
    expect(Array.isArray(levelLayout.ghostNets)).toBe(true);
  });

  it("posiciona todo o lixo urbano dentro da faixa da Costa Urbana (12.000m - 19.000m)", () => {
    expect(levelLayout.urbanTrash.length).toBeGreaterThan(0);
    levelLayout.urbanTrash.forEach((item) => {
      expect(item.x).toBeGreaterThanOrEqual(12000);
      expect(item.x).toBeLessThanOrEqual(19000);
      expect(item.y).toBeGreaterThanOrEqual(140);
      expect(item.y).toBeLessThanOrEqual(300);
    });
  });

  it("posiciona o krill polar dentro da faixa Antártica (0m - 5.000m)", () => {
    expect(levelLayout.antarcticKrill.length).toBeGreaterThan(0);
    levelLayout.antarcticKrill.forEach((item) => {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(5000);
      expect(item.y).toBeGreaterThanOrEqual(140);
      expect(item.y).toBeLessThanOrEqual(300);
    });
  });

  it("distribui redes fantasmas com camadas válidas", () => {
    expect(levelLayout.ghostNets.length).toBeGreaterThan(0);
    const validLayers = ["floor", "mid1", "mid2"];

    levelLayout.ghostNets.forEach((net) => {
      expect(net.x).toBeGreaterThan(5000);
      expect(net.x).toBeLessThan(27000);
      expect(validLayers).toContain(net.layer);
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import {
  buildBenthicSilhouetteSpecs,
  setupBenthicStageSilhouettes,
} from "../../src/systems/benthic/benthicStageSilhouettes";
import { initSpatialCullingManager } from "../../src/systems/spatialCullingSystem";
import { initSpatialGrid, getSpatialGrid } from "../../src/systems/spatialHashGrid";
import { PixiContainerNode, PixiGraphicsNode } from "../../src/engine/adapters/PixiNodes";
import type { IRenderEngine } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

describe("benthicStageSilhouettes — diferenciação geológica do fundo oceânico", () => {
  beforeEach(() => {
    initSpatialGrid({ cellSize: 200 });
  });

  it("gera silhuetas distintas para todas as 5 regiões das 3 etapas, cobrindo o vazio pelágico e separando Cânions de Arraial", () => {
    const specs = buildBenthicSilhouetteSpecs();
    const kinds = new Set(specs.map((s) => s.kind));
    expect(kinds).toEqual(
      new Set([
        "glacial_moraine",
        "abyssal_ridge",
        "urban_impact",
        "canyon_plateau",
        "sanctuary_reef_mound",
      ])
    );

    const pelagic = specs.filter((s) => s.kind === "abyssal_ridge");
    expect(pelagic.length).toBeGreaterThanOrEqual(5);
    expect(pelagic.every((s) => s.x >= 5000 && s.x <= 12000)).toBe(true);

    const urban = specs.filter((s) => s.kind === "urban_impact");
    expect(urban.every((s) => s.x >= 11500 && s.x <= 19200)).toBe(true);
    // Entrada gradual na transição 11.400-12.700m: primeira silhueta menor/mais translúcida que o núcleo
    expect(urban[0].height).toBeLessThan(urban[2].height);
    expect(urban[0].alpha).toBeLessThan(urban[3].alpha);

    const canyons = specs.filter((s) => s.kind === "canyon_plateau");
    const arraial = specs.filter((s) => s.kind === "sanctuary_reef_mound");
    expect(canyons.every((s) => s.x < 25000)).toBe(true);
    expect(arraial.every((s) => s.x > 25000)).toBe(true);
  });

  it("adiciona nós em worldContainer com zIndex -5, culling espacial e zero colisões no SpatialHashGrid", () => {
    const worldContainer = new PixiContainerNode(undefined, "world");
    const culling = initSpatialCullingManager({ width: () => 1280 }, 600);

    const engine = {
      isInitialized: () => true,
      getDimensions: () => ({ width: 1280, height: 720 }),
      getWorldContainer: () => worldContainer,
      getStageRoot: () => worldContainer,
      createGraphics: (id?: string) => new PixiGraphicsNode(undefined, id),
    } as unknown as IRenderEngine;

    const nodes = setupBenthicStageSilhouettes(engine, 680);
    expect(nodes.length).toBeGreaterThan(20);
    expect(worldContainer.getChildren().length).toBe(nodes.length);
    expect(nodes.every((n) => n.getZIndex() === -5)).toBe(true);

    // Culling oculta silhuetas distantes (ex: Arraial a 29k quando câmera está em 1.000m)
    culling.update(1000);
    expect(nodes[0].isVisible()).toBe(true); // glacial_moraine em 700m
    expect(nodes[nodes.length - 1].isVisible()).toBe(false); // sanctuary_reef_mound em 29250m

    // Nenhuma colisão registrada no SpatialHashGrid
    const gridHits = getSpatialGrid()!.queryAABB({
      minX: 0,
      minY: 0,
      maxX: 30000,
      maxY: 1000,
    });
    expect(gridHits.length).toBe(0);
  });
});

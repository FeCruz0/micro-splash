import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateProceduralIcebergLayout,
  WHALE_JUMP_PHYSICS,
} from "../../src/systems/ice/proceduralIcebergGenerator";
import { createProceduralIcebergNode } from "../../src/systems/ice/proceduralIcebergRenderer";
import { setupPolarIceRendering } from "../../src/systems/ice/iceSurfaceRenderer";
import { initSpatialGrid, getSpatialGrid } from "../../src/systems/spatialHashGrid";
import { isPositionInIceGap, resetActiveIceGaps } from "../../src/systems/ice/iceGaps";
import { PixiContainerNode, PixiGraphicsNode } from "../../src/engine/adapters/PixiNodes";
import type { IRenderEngine } from "../../src/engine/contracts/INTERFACE_CONTRACTS";

function createTestPixiEngine(): IRenderEngine {
  const worldContainer = new PixiContainerNode(undefined, "world");
  return {
    isInitialized: () => true,
    getDimensions: () => ({ width: 1280, height: 720 }),
    getCameraPosition: () => ({ x: 0, y: 0 }),
    getWorldContainer: () => worldContainer,
    getStageRoot: () => worldContainer,
    getTicker: () => ({ add: () => () => {} }),
    createGraphics: (id?: string) => new PixiGraphicsNode(undefined, id),
    createContainer: (id?: string) => new PixiContainerNode(undefined, id),
    generateTexture: () => null,
  } as unknown as IRenderEngine;
}

describe("Geração Procedural e Renderização em 3 Camadas de Icebergs Flutuantes", () => {
  beforeEach(() => {
    initSpatialGrid({ cellSize: 100 });
    resetActiveIceGaps();
  });

  it("gera sequências determinísticas por seed e distintas para seeds diferentes", () => {
    const layoutA = generateProceduralIcebergLayout(5000, 12345, 80);
    const layoutB = generateProceduralIcebergLayout(5000, 12345, 80);
    const layoutC = generateProceduralIcebergLayout(5000, 99999, 80);

    expect(layoutA).toEqual(layoutB);
    expect(layoutA.icebergs.length).toBeGreaterThanOrEqual(10);
    expect(layoutA.icebergs.map((i) => i.x)).not.toEqual(layoutC.icebergs.map((i) => i.x));
  });

  it("produz todas as 5 categorias de icebergs com dimensões, picos e volumes submersos variados", () => {
    const layout = generateProceduralIcebergLayout(5000, 20261114, 80);
    const categories = new Set(layout.icebergs.map((i) => i.category));
    const widths = new Set(layout.icebergs.map((i) => i.width));
    const heights = new Set(layout.icebergs.map((i) => i.aboveWaterHeight));
    const depths = new Set(layout.icebergs.map((i) => i.submergedDepth));

    expect(categories.size).toBe(5);
    expect(widths.size).toBeGreaterThanOrEqual(8);
    expect(heights.size).toBeGreaterThanOrEqual(6);
    expect(depths.size).toBeGreaterThanOrEqual(8);

    for (const iceberg of layout.icebergs) {
      expect(iceberg.surfaceContour.length).toBeGreaterThanOrEqual(5);
      expect(iceberg.submergedContour.length).toBeGreaterThanOrEqual(4);
      // Parte submersa não deve criar colisão profunda indevida
      expect(iceberg.collisionMaxY).toBeLessThanOrEqual(96);
      expect(iceberg.collisionMinY).toBeLessThan(80);
    }
  });

  it("gera espaçamentos convencionais, de salto e amplos calibrados à física da baleia sem trechos impossíveis", () => {
    const layout = generateProceduralIcebergLayout(5000, 20261114, 80);
    expect(layout.gaps[0]).toEqual({ start: 0, end: 245 });

    const proceduralGaps = layout.gaps.slice(1);
    let hasConventional = false;
    let hasJump = false;
    let hasWide = false;

    for (const gap of proceduralGaps) {
      const span = gap.end - gap.start;
      expect(span).toBeGreaterThanOrEqual(WHALE_JUMP_PHYSICS.CONVENTIONAL_GAP_MIN);
      expect(span).toBeLessThanOrEqual(WHALE_JUMP_PHYSICS.WIDE_GAP_MAX);
      if (span <= WHALE_JUMP_PHYSICS.CONVENTIONAL_GAP_MAX) hasConventional = true;
      else if (span <= WHALE_JUMP_PHYSICS.JUMP_GAP_MAX) hasJump = true;
      else hasWide = true;
    }

    expect(hasConventional).toBe(true);
    expect(hasJump).toBe(true);
    expect(hasWide).toBe(true);
  });

  it("renderiza cada iceberg procedural em 3 camadas no PixiJS 8 e registra colisão coerente", () => {
    const engine = createTestPixiEngine();
    const layout = generateProceduralIcebergLayout(1200, 777, 80);
    const node = createProceduralIcebergNode(engine, layout.icebergs[0], 80);
    const drawPolygonSpy = vi.spyOn(PixiGraphicsNode.prototype, "drawPolygon");
    createProceduralIcebergNode(engine, layout.icebergs[0], 80);
    expect(drawPolygonSpy.mock.calls.length).toBeGreaterThanOrEqual(6);
    drawPolygonSpy.mockRestore();

    expect(node.getPosition()).toEqual({ x: layout.icebergs[0].x, y: 80 });
    expect(node.getZIndex()).toBe(10);

    const destroy = setupPolarIceRendering(
      engine,
      { gameObj: { pos: { x: 80, y: 120 } }, getSpeed: () => ({ x: 0, y: 0 }) } as never,
      () => true,
      777
    );

    const grid = getSpatialGrid()!;
    const firstIceberg = layout.icebergs[0];
    const hitResults = grid.queryAABB({
      minX: firstIceberg.x + 10,
      minY: firstIceberg.collisionMinY,
      maxX: firstIceberg.x + firstIceberg.width - 10,
      maxY: firstIceberg.collisionMaxY,
    });
    expect(hitResults.some((item) => (item as { id?: string }).id === firstIceberg.id)).toBe(true);

    // Espaços entre icebergs devem permanecer livres para salto
    expect(isPositionInIceGap(120)).toBe(true);
    destroy();
  });
});

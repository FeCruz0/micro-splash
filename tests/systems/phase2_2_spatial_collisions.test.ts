import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupCollisions } from "../../src/systems/collisions";
import { initSpatialGrid, getSpatialGrid } from "../../src/systems/spatialHashGrid";
import { SystemRunner } from "../../src/systems/systemRunner";
import { TAGS } from "../../src/config";
import type { PlayerController } from "../../src/entities/player";
import type { GameState } from "../../src/systems/state";

describe("Fase 2.2 — Resolução de Colisões via SpatialHashGrid e queryAABB", () => {
  let mockEngineContext: any;
  let mockPlayerController: any;
  let mockGameState: any;
  let systemRunner: SystemRunner;

  beforeEach(() => {
    initSpatialGrid<any>({ cellSize: 100 });

    mockEngineContext = {
      destroy: vi.fn(),
      time: vi.fn(() => 10.0),
      shake: vi.fn(),
      onUpdate: vi.fn(),
      get: vi.fn(() => []),
      onCollide: vi.fn(),
    };

    mockPlayerController = {
      gameObj: {
        pos: { x: 500, y: 100 },
      },
      isFrozen: vi.fn(() => false),
      isTrapped: vi.fn(() => false),
      trapInNet: vi.fn(),
      addTrapCount: vi.fn(),
      getSpeed: vi.fn(() => ({
        x: 100,
        y: 10,
        scale: vi.fn((factor: number) => ({ x: 100 * factor, y: 10 * factor })),
      })),
      setSpeed: vi.fn(),
      penalizeTrash: vi.fn(),
      restoreOxygen: vi.fn(),
      getMaxOxygen: vi.fn(() => 100),
      consumeKrill: vi.fn(),
    };

    mockGameState = {
      addTrash: vi.fn(),
      addKrill: vi.fn(),
    };

    systemRunner = new SystemRunner();
  });

  it("não deve registrar callbacks legados de k.onCollide ao configurar colisões", () => {
    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    expect(mockEngineContext.onCollide).not.toHaveBeenCalled();
  });

  it("deve resolver colisão com TAGS.TRASH via queryAABB no fim da fase collision", () => {
    const spatialGrid = getSpatialGrid()!;
    const trashEntity = {
      id: "trash_item_1",
      tag: TAGS.TRASH,
      pos: { x: 500, y: 100 },
      destroy: vi.fn(),
    };

    spatialGrid.insert(
      "trash_item_1",
      trashEntity,
      { minX: 490, minY: 90, maxX: 510, maxY: 110 },
      true
    );

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(mockGameState.addTrash).toHaveBeenCalledTimes(1);
    expect(mockPlayerController.penalizeTrash).toHaveBeenCalledTimes(1);
    expect(trashEntity.destroy).toHaveBeenCalledTimes(1);
    expect(spatialGrid.has("trash_item_1")).toBe(false);
  });

  it("deve resolver colisão com TAGS.AIR_POCKET restaurando oxigênio do jogador", () => {
    const spatialGrid = getSpatialGrid()!;
    const airVentEntity = {
      id: "vent_pocket_1",
      tag: TAGS.AIR_POCKET,
      pos: { x: 510, y: 105 },
      collectAir: vi.fn(() => true),
    };

    spatialGrid.insert(
      "vent_pocket_1",
      airVentEntity,
      { minX: 495, minY: 95, maxX: 525, maxY: 115 },
      true
    );

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(airVentEntity.collectAir).toHaveBeenCalledTimes(1);
    expect(mockPlayerController.restoreOxygen).toHaveBeenCalledWith(35);
  });

  it("deve resolver colisão com TAGS.KRILL alimentando o jogador", () => {
    const spatialGrid = getSpatialGrid()!;
    const krillEntity = {
      id: "krill_101",
      tag: TAGS.KRILL,
      pos: { x: 505, y: 98 },
      destroy: vi.fn(),
    };

    spatialGrid.insert(
      "krill_101",
      krillEntity,
      { minX: 500, minY: 90, maxX: 510, maxY: 105 },
      false
    );

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(mockGameState.addKrill).toHaveBeenCalledTimes(1);
    expect(mockPlayerController.consumeKrill).toHaveBeenCalledTimes(1);
    expect(krillEntity.destroy).toHaveBeenCalledTimes(1);
    expect(spatialGrid.has("krill_101")).toBe(false);
  });

  it("deve resolver colisão com TAGS.NET aprisionando o jogador", () => {
    const spatialGrid = getSpatialGrid()!;
    const netEntity = {
      id: "net_alpha_1",
      tag: TAGS.NET,
      pos: { x: 502, y: 101 },
      destroy: vi.fn(),
    };

    spatialGrid.insert(
      "net_alpha_1",
      netEntity,
      { minX: 490, minY: 80, maxX: 520, maxY: 120 },
      true
    );

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(mockPlayerController.trapInNet).toHaveBeenCalled();
    expect(netEntity.destroy).toHaveBeenCalledTimes(1);
    expect(spatialGrid.has("net_alpha_1")).toBe(false);
  });

  it("deve resolver colisão com bloco de gelo ao romper de cima para baixo", () => {
    const spatialGrid = getSpatialGrid()!;
    const breakIceSpy = vi.fn();
    const iceBlockEntity = {
      id: "ice_block_500_0",
      tag: "ice_block",
      pos: { x: 500, y: 100 },
      breakIce: breakIceSpy,
    };

    spatialGrid.insert(
      "ice_block_500_0",
      iceBlockEntity,
      { minX: 450, minY: 90, maxX: 550, maxY: 114 },
      true
    );

    mockPlayerController.gameObj.pos.y = 105;
    mockPlayerController.getSpeed.mockReturnValue({ x: 100, y: 20 });

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(breakIceSpy).toHaveBeenCalledTimes(1);
    expect(spatialGrid.has("ice_block_500_0")).toBe(false);
  });

  it("garante que itens estáticos (isStatic: true) não recalculam célula no hash grid", () => {
    const spatialGrid = getSpatialGrid()!;
    const staticItem = {
      id: "static_obstacle_1",
      tag: TAGS.OBSTACLE,
    };

    spatialGrid.insert(
      "static_obstacle_1",
      staticItem,
      { minX: 100, minY: 100, maxX: 150, maxY: 150 },
      true
    );

    const updateResult = spatialGrid.update("static_obstacle_1", {
      minX: 200,
      minY: 200,
      maxX: 250,
      maxY: 250,
    });

    expect(updateResult).toBe(false);
    expect(spatialGrid.queryAABB({ minX: 90, minY: 90, maxX: 160, maxY: 160 }).length).toBe(1);
    expect(spatialGrid.queryAABB({ minX: 190, minY: 190, maxX: 260, maxY: 260 }).length).toBe(0);
  });

  it("deve tratar bloco de gelo intacto como barreira física sólida quando a baleia colide por baixo", () => {
    const spatialGrid = getSpatialGrid()!;
    const breakIceSpy = vi.fn();
    const iceBlockEntity = {
      id: "ice_block_solid_1",
      tag: "ice_block",
      pos: { x: 500, y: 100 },
      breakIce: breakIceSpy,
    };

    spatialGrid.insert(
      "ice_block_solid_1",
      iceBlockEntity,
      { minX: 450, minY: 90, maxX: 550, maxY: 114 },
      true
    );

    mockPlayerController.gameObj.pos = { x: 500, y: 120 };
    mockPlayerController.getSpeed.mockReturnValue({ x: 100, y: -60, scale: vi.fn() });

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(breakIceSpy).not.toHaveBeenCalled();
    expect(spatialGrid.has("ice_block_solid_1")).toBe(true);
    expect(mockPlayerController.gameObj.pos.y).toBeGreaterThan(120);
    expect(mockPlayerController.setSpeed).toHaveBeenCalled();
  });

  it("deve repelir o jogador ao colidir contra obstáculo sólido ou navio", () => {
    const spatialGrid = getSpatialGrid()!;
    const obstacleEntity = {
      id: "ship_obstacle_1",
      tag: TAGS.OBSTACLE,
      pos: { x: 520, y: 90 },
    };

    spatialGrid.insert(
      "ship_obstacle_1",
      obstacleEntity,
      { minX: 520, minY: 70, maxX: 600, maxY: 130 },
      true
    );

    mockPlayerController.gameObj.pos = { x: 500, y: 100 };
    mockPlayerController.getSpeed.mockReturnValue({ x: 150, y: 0, scale: vi.fn() });

    setupCollisions(
      mockEngineContext,
      mockPlayerController as unknown as PlayerController,
      mockGameState as unknown as GameState,
      systemRunner
    );

    systemRunner.run(0.016);

    expect(mockPlayerController.gameObj.pos.x).toBeLessThan(500);
    expect(mockPlayerController.setSpeed).toHaveBeenCalledWith(expect.objectContaining({ x: 0 }));
  });
});

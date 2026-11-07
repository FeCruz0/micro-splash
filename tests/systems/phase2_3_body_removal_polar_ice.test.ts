import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPlayer } from "../../src/entities/player";
import { createCompanionWhale } from "../../src/entities/companionWhale";
import { PlayerPhysicsManager } from "../../src/entities/player/playerPhysics";
import { createCompanionLocomotion } from "../../src/entities/companion/companionLocomotion";
import { initSpatialGrid, getSpatialGrid } from "../../src/systems/spatialHashGrid";
import { setupIceSurfaceSystem } from "../../src/systems/iceSurface";
import { TAGS } from "../../src/config";

describe("Fase 2.3 — Supressão de k.body e Delegação de Movimento a playerPhysics e companionLocomotion", () => {
  beforeEach(() => {
    initSpatialGrid<any>({ cellSize: 100 });
  });

  it("garante que createPlayer não invoca ou anexa componente body", () => {
    const mockKaboom: any = {
      pos: (x: number, y: number) => ({ x, y }),
      vec2: (x: number, y: number) => ({
        x,
        y,
        add: (o: any) => ({ x: x + o.x, y: y + o.y }),
        scale: (f: number) => ({ x: x * f, y: y * f }),
        len: () => Math.hypot(x, y),
        unit: () => ({ x: x / (Math.hypot(x, y) || 1), y: y / (Math.hypot(x, y) || 1) }),
      }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      deg2rad: (d: number) => (d * Math.PI) / 180,
      rad2deg: (r: number) => (r * 180) / Math.PI,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      rand: (min: number, max: number) => min + Math.random() * (max - min),
      height: () => 720,
      dt: () => 0.016,
      time: () => 1.0,
      onUpdate: vi.fn(),
      onDestroy: vi.fn(),
      isKeyDown: vi.fn(() => false),
      isKeyPressed: vi.fn(() => false),
      isKeyReleased: vi.fn(() => false),
      shake: vi.fn(),
      rect: (w: number, h: number) => ({ w, h }),
      color: () => ({}),
      opacity: () => ({}),
      z: () => ({}),
      add: vi.fn(() => ({})),
    };

    const playerController = createPlayer(mockKaboom, 100, false);
    const playerObject = playerController.gameObj as any;

    expect(playerObject.body).toBeUndefined();
    expect(playerObject.isStatic).toBeUndefined();
  });

  it("garante que createCompanionWhale não invoca k.body() e não registra corpo rígido residual", () => {
    const addedComponents: any[] = [];
    const mockKaboom: any = {
      pos: (x: number, y: number) => ({ x, y }),
      vec2: (x: number, y: number) => ({
        x,
        y,
        add: (o: any) => ({ x: x + o.x, y: y + o.y }),
        scale: (f: number) => ({ x: x * f, y: y * f }),
      }),
      color: (r: number, g: number, b: number) => ({ r, g, b }),
      z: (layer: number) => ({ z: layer }),
      anchor: (pos: string) => ({ anchor: pos }),
      rotate: (angle: number) => ({ angle }),
      scale: (x: number, y: number) => ({ scale: { x, y } }),
      area: () => ({ area: true }),
      sprite: () => ({ sprite: "baleia" }),
      add: vi.fn((comps: any[]) => {
        addedComponents.push(...comps);
        return {
          pos: { x: 50, y: 150 },
          angle: 0,
          comps,
          onUpdate: vi.fn(),
          play: vi.fn(),
          move: vi.fn(),
          destroy: vi.fn(),
        };
      }),
      height: () => 720,
      dt: () => 0.016,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      deg2rad: (d: number) => (d * Math.PI) / 180,
      rad2deg: (r: number) => (r * 180) / Math.PI,
    };

    const mockPlayer: any = {
      gameObj: { pos: { x: 100, y: 150 } },
      getSpeed: () => ({ x: 100, y: 0 }),
      isTrapped: () => false,
      isBreaching: () => false,
      isFainting: () => false,
      isFrozen: () => false,
    };

    const companionController = createCompanionWhale(mockKaboom, mockPlayer);
    expect(companionController).toBeDefined();

    const hasBody = addedComponents.some(
      (comp: any) => comp && (comp.type === "body" || comp.body === true)
    );
    expect(hasBody).toBe(false);
  });

  it("insere o gelo polar e paredão de iceberg diretamente no SpatialHashGrid como estático (isStatic: true)", () => {
    const mockKaboom: any = {
      pos: (x: number, y: number) => ({ x, y }),
      vec2: (x: number, y: number) => ({ x, y }),
      rect: (w: number, h: number) => ({ w, h }),
      color: () => ({}),
      opacity: () => ({}),
      z: () => ({}),
      add: vi.fn((comps: any[]) => {
        const obj: any = { comps, onUpdate: vi.fn(), destroy: vi.fn() };
        comps.forEach((c) => {
          if (typeof c === "object" && c !== null) Object.assign(obj, c);
        });
        return obj;
      }),
      height: () => 720,
      width: () => 1280,
      dt: () => 0.016,
      polygon: vi.fn((pts: any) => ({ pts })),
      outline: vi.fn(() => ({})),
      destroy: vi.fn(),
    };

    const mockPlayerController: any = {
      gameObj: { pos: { x: 50, y: 100 } },
      getSpeed: () => ({ x: 0, y: 0 }),
    };

    setupIceSurfaceSystem(mockKaboom, mockPlayerController);

    const spatialGrid = getSpatialGrid()!;
    expect(spatialGrid).toBeDefined();

    // Consulta por AABB no paredão de gelo inicial (x: -1100 a 0)
    const wallCandidates = spatialGrid.queryAABB({
      minX: -500,
      minY: 0,
      maxX: -100,
      maxY: 720,
    });
    expect(wallCandidates.length).toBeGreaterThan(0);
    const wallObstacle = wallCandidates[0] as any;
    expect(wallObstacle.isStatic).toBe(true);
    expect(wallObstacle.tag).toBe(TAGS.OBSTACLE);

    // Consulta por AABB em uma área com segmento de banquisa de gelo polar
    const iceSegmentCandidates = spatialGrid.queryAABB({
      minX: 250,
      minY: 0,
      maxX: 500,
      maxY: 100,
    });
    expect(iceSegmentCandidates.length).toBeGreaterThan(0);
    const iceSegment = iceSegmentCandidates[0] as any;
    expect(iceSegment.isStatic).toBe(true);
    expect(iceSegment.tag).toBe("ice_block");
  });

  it("garante que playerPhysics é o único responsável pela integração de velocidade e limites do mundo", () => {
    const mockContext: any = {
      vec2: (x: number, y: number) => ({
        x,
        y,
        add: (other: any) => mockContext.vec2(x + other.x, y + other.y),
        scale: (factor: number) => mockContext.vec2(x * factor, y * factor),
        len: () => Math.hypot(x, y),
        unit: () => {
          const l = Math.hypot(x, y) || 1;
          return mockContext.vec2(x / l, y / l);
        },
      }),
      deg2rad: (deg: number) => (deg * Math.PI) / 180,
      rad2deg: (rad: number) => (rad * 180) / Math.PI,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      height: () => 720,
      shake: vi.fn(),
      rect: (w: number, h: number) => ({ w, h }),
      color: () => ({}),
      opacity: () => ({}),
      z: () => ({}),
      add: vi.fn(() => ({})),
    };

    const physicsManager = new PlayerPhysicsManager(mockContext);
    const moveSpy = vi.fn((dx: number, dy: number) => {
      mockBaleia.pos.x += dx;
      mockBaleia.pos.y += dy;
    });

    const mockBaleia: any = {
      pos: { x: 100, y: 200 },
      move: moveSpy,
    };

    physicsManager.setSpeed({ x: 150, y: 50 });
    physicsManager.applyThrust(0.016, true, 0, false, 250);

    const result = physicsManager.updateMovement(0.016, mockBaleia, true, 0, false);
    expect(result.inAir).toBe(false);
    expect(moveSpy).toHaveBeenCalled();
    expect(mockBaleia.pos.x).toBeGreaterThan(100);

    // Testa limite inferior do leito marinho gerenciado pelo playerPhysics
    mockBaleia.pos.y = 800;
    physicsManager.updateMovement(0.016, mockBaleia, true, 0, false);
    expect(mockBaleia.pos.y).toBe(720 - 55);
  });

  it("garante que companionLocomotion é o único responsável pela física e reação ao teto de gelo", () => {
    const mockContext: any = {
      vec2: (x: number, y: number) => ({
        x,
        y,
        scale: (factor: number) => mockContext.vec2(x * factor, y * factor),
        add: (other: any) => mockContext.vec2(x + other.x, y + other.y),
      }),
      deg2rad: (deg: number) => (deg * Math.PI) / 180,
      rad2deg: (rad: number) => (rad * 180) / Math.PI,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      height: () => 720,
    };

    const moveSpy = vi.fn((dx: number, dy: number) => {
      mockCompanion.pos.x += dx;
      mockCompanion.pos.y += dy;
    });

    const mockCompanion: any = {
      pos: { x: 200, y: 70 },
      angle: -25,
      move: moveSpy,
      play: vi.fn(),
    };

    const locomotion = createCompanionLocomotion({
      k: mockContext,
      companion: mockCompanion,
      prng: () => 0.5,
    });

    // Simula velocidade vertical ascendente em direção ao gelo
    locomotion.setSpeed(mockContext.vec2(120, -150));

    // Colisão direta com gelo tratada pela locomoção
    locomotion.handleIceBlockCollision();

    expect(locomotion.getSpeed().y).toBe(0);
    expect(mockCompanion.angle).toBe(0);
    expect(mockCompanion.pos.y).toBe(92);

    // Atualização normal de movimento
    locomotion.update(0.016, 0, 150, 100, "CRUISE");
    expect(moveSpy).toHaveBeenCalled();
  });
});

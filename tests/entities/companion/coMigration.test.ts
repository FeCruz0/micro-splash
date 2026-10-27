import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPANION_CONFIG, GAME_CONFIG, TAGS } from "../../../src/config";
import { createCompanionWhale } from "../../../src/entities/companionWhale";
import {
  hasSeenCompanionTutorial,
  resetCompanionTutorialSeen,
} from "../../../src/systems/companionTutorialSettings";
import { SpatialHashGrid } from "../../../src/systems/spatialHashGrid";

describe("Fase 60: Baleia Co-Migrante Autônoma & Ciclo de Vida Contínuo", () => {
  beforeEach(() => {
    resetCompanionTutorialSeen();
    localStorage.clear();
  });

  function createMockKaboom() {
    const objects: any[] = [];
    let currentDeltaTime = 0.016;

    class MockRect {
      pos: any;
      width: number;
      height: number;
      constructor(pos: any, width: number, height: number) {
        this.pos = pos;
        this.width = width;
        this.height = height;
      }
    }

    const k: any = {
      dt: () => currentDeltaTime,
      setDeltaTime: (dt: number) => {
        currentDeltaTime = dt;
      },
      deg2rad: (deg: number) => (deg * Math.PI) / 180,
      rad2deg: (rad: number) => (rad * 180) / Math.PI,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      height: () => 360,
      body: (opts?: any) => ({ type: "body", ...(opts || {}) }),
      vec2: (x: number, y: number) => ({
        x,
        y,
        dist: (other: any) => Math.hypot(other.x - x, other.y - y),
        scale: (s: number) => k.vec2(x * s, y * s),
        add: (other: any) => k.vec2(x + other.x, y + other.y),
        len: () => Math.hypot(x, y),
        unit: () => {
          const l = Math.hypot(x, y) || 1;
          return k.vec2(x / l, y / l);
        },
      }),
      Rect: MockRect,
      area: (opts?: any) => ({ type: "area", ...(opts || {}) }),
      sprite: (name: string, opts?: any) => ({ type: "sprite", name, opts }),
      pos: (x: number, y: number) => ({ x, y }),
      rotate: (angle: number) => ({ angle }),
      color: (r: number, g: number, b: number) => ({ r, g, b }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      anchor: (a: string) => ({ anchor: a }),
      z: (z: number) => ({ z }),
      scale: (sx: number, sy: number) => ({ sx, sy }),
      circle: (radius: number) => ({ radius }),
      opacity: (val: number) => ({ opacity: val }),
      outline: (width: number, col: any) => ({ width, color: col }),
      wait: (_time: number, cb: () => void) => cb(),
      destroy: (obj: any) => {
        obj._destroyed = true;
        const index = objects.indexOf(obj);
        if (index !== -1) objects.splice(index, 1);
      },
      get: (tag: string) =>
        objects.filter(
          (o) => !o._destroyed && ((o.tags && o.tags.includes(tag)) || (o.is && o.is(tag)))
        ),
      add: (comps: any[]) => {
        let updateCallback: (() => void) | null = null;
        const gameObj: any = {
          tags: [] as string[],
          pos: { x: 0, y: 0 },
          angle: 0,
          opacity: 1,
          radius: 0,
          _destroyed: false,
          exists: () => !gameObj._destroyed,
          is: (tag: string) => gameObj.tags.includes(tag),
          onUpdate: (cb: () => void) => {
            updateCallback = cb;
          },
          play: vi.fn(),
          move: vi.fn((mx: number, my: number) => {
            gameObj.pos.x += mx * currentDeltaTime;
            gameObj.pos.y += my * currentDeltaTime;
          }),
          _triggerUpdate: () => {
            if (updateCallback && !gameObj._destroyed) updateCallback();
          },
        };

        for (const c of comps) {
          if (typeof c === "string") {
            gameObj.tags.push(c);
          } else if (c && typeof c === "object") {
            Object.assign(gameObj, c);
            if ("x" in c && "y" in c) {
              gameObj.pos = { x: c.x, y: c.y };
            }
          }
        }

        objects.push(gameObj);
        return gameObj;
      },
    };

    return k;
  }

  function createMockPlayerController(x: number, y: number, speedX = 160) {
    return {
      gameObj: {
        pos: { x, y },
        exists: () => true,
      },
      getSpeed: () => ({ x: speedX, y: 0 }),
      isFrozen: () => false,
    } as any;
  }

  describe("60.1: Transição Pós-Tutorial para Co-Migração Autônoma", () => {
    it("deve transicionar para INDEPENDENT_CRUISE no modo sereno e permanecer ativa sem despawnar", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(COMPANION_CONFIG.FAREWELL_TARGET_X, 200, 180);
      const onDepartedMock = vi.fn();

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
        onDeparted: onDepartedMock,
      });

      mockKaboom.setDeltaTime(0.1);
      companionController.gameObj._triggerUpdate();

      // Transiciona para INDEPENDENT_CRUISE em vez de parar em RESTING
      expect(companionController.getState()).toBe("INDEPENDENT_CRUISE");
      expect(companionController.isDeparted()).toBe(false);
      expect(hasSeenCompanionTutorial()).toBe(true);
      expect(onDepartedMock).toHaveBeenCalled();
      expect(companionController.gameObj._destroyed).toBe(false);
    });

    it("deve manter propulsão de cruzeiro independente mesmo se o jogador desacelerar", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(3500, 200, 0); // jogador parado

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
      });
      companionController.forceState("INDEPENDENT_CRUISE");

      const initialX = companionController.gameObj.pos.x;
      mockKaboom.setDeltaTime(0.5);
      companionController.gameObj._triggerUpdate();

      // Deve ter avançado ativamente
      expect(companionController.gameObj.pos.x).toBeGreaterThan(initialX + 20);
    });
  });

  describe("60.2: Respiração Universal em Mar Aberto (Biomas pós-Antártica)", () => {
    it("deve subir e respirar na lâmina d'água livre fora da Antártica sem exigir fendas de gelo", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(6000, 200, 180); // Bioma 2: Pelágico

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
      });
      companionController.gameObj.pos.x = 6000;
      companionController.gameObj.pos.y = GAME_CONFIG.SEA_LEVEL; // na superfície

      // Força busca de fôlego
      companionController.forceState("SEEK_BREATH");

      mockKaboom.setDeltaTime(0.1);
      companionController.gameObj._triggerUpdate();

      // Em mar aberto, a superfície já permite respirar
      expect(companionController.getState()).toBe("SURFACE_BREATHE");
    });

    it("deve restaurar 100% de oxigênio e retomar INDEPENDENT_CRUISE após expirar na superfície", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(8000, 200, 180);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
      });
      companionController.gameObj.pos.x = 8000;
      companionController.gameObj.pos.y = GAME_CONFIG.SEA_LEVEL;
      companionController.forceState("SURFACE_BREATHE");

      // Passa a duração de respiração na superfície (1.2s)
      mockKaboom.setDeltaTime(COMPANION_CONFIG.SURFACE_BREATHE_DURATION + 0.1);
      companionController.gameObj._triggerUpdate();

      expect(companionController.getState()).toBe("INDEPENDENT_CRUISE");
      expect(companionController.getOxygen()).toBe(100);
    });
  });

  describe("60.3: Detecção e Evasão Autônoma de Perigos (AVOID_OBSTACLE)", () => {
    it("deve detectar obstáculo adiante via SpatialHashGrid e transicionar para AVOID_OBSTACLE", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(5000, 200, 180);
      const grid = new SpatialHashGrid<any>({ cellSize: 200 });

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
        spatialGrid: grid,
      });
      companionController.gameObj.pos.x = 5000;
      companionController.gameObj.pos.y = 180;
      companionController.forceState("INDEPENDENT_CRUISE");

      // Adiciona rede fantasma adiante no cone de detecção
      const mockNet = mockKaboom.add([mockKaboom.pos(5150, 180), TAGS.NET]);
      grid.insert("net_1", mockNet, { minX: 5100, minY: 150, maxX: 5200, maxY: 210 });

      mockKaboom.setDeltaTime(0.4); // dispara o ciclo de radar
      companionController.gameObj._triggerUpdate();

      expect(companionController.getState()).toBe("AVOID_OBSTACLE");
    });
  });

  describe("60.4: Aprisionamento em Redes Fantasma (TRAPPED)", () => {
    it("deve entrar em TRAPPED ao colidir com rede, desacelerar e drenar oxigênio", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(10000, 200, 180);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
      });
      companionController.gameObj.pos.x = 10000;
      companionController.gameObj.pos.y = 200;

      const mockNet = mockKaboom.add([mockKaboom.pos(10000, 200), TAGS.NET]);

      // Dispara colisão de rede
      (companionController.gameObj as any).handleNetCollision(mockNet);

      expect(companionController.getState()).toBe("TRAPPED");

      const initialOxygen = companionController.getOxygen();
      mockKaboom.setDeltaTime(0.5);
      companionController.gameObj._triggerUpdate();

      // Oxigênio foi drenado de forma acelerada
      expect(companionController.getOxygen()).toBeLessThan(initialOxygen);
    });

    it("deve se desvencilhar da rede após o tempo de luta e retomar cruzeiro", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(10000, 200, 180);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
      });
      companionController.gameObj.pos.x = 10000;
      companionController.forceState("TRAPPED");

      // Avança além do tempo de escape da rede
      mockKaboom.setDeltaTime(COMPANION_CONFIG.NET_ESCAPE_DURATION + 0.2);
      companionController.gameObj._triggerUpdate();

      expect(companionController.getState()).toBe("INDEPENDENT_CRUISE");
    });
  });

  describe("60.5: Mortalidade Serena por Anóxia (FAINTED)", () => {
    it("deve transicionar para FAINTED quando o oxigênio atinge 0 e disparar onFainted", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(12000, 200, 180);
      const onFaintedMock = vi.fn();

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
        onFainted: onFaintedMock,
      });
      companionController.gameObj.pos.x = 12000;

      // Esgota totalmente o oxigênio com delta time suficiente
      mockKaboom.setDeltaTime(200.0);
      companionController.gameObj._triggerUpdate();

      expect(companionController.getState()).toBe("FAINTED");
      expect(companionController.isFainted()).toBe(true);
      expect(onFaintedMock).toHaveBeenCalled();
    });
  });

  describe("60.6: Chegada aos 30.000m e Salto Majestoso (VICTORY_BREACH)", () => {
    it("deve transicionar para VICTORY_BREACH ao atingir a aproximação de Abrolhos (30.000m)", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(GAME_CONFIG.ROUTE_TOTAL_DISTANCE, 200, 180);
      const onVictoryMock = vi.fn();

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        mode: "serene",
        isCoMigration: true,
        onVictoryBreach: onVictoryMock,
      });
      companionController.gameObj.pos.x = GAME_CONFIG.ROUTE_TOTAL_DISTANCE - 300;
      companionController.forceState("INDEPENDENT_CRUISE");

      mockKaboom.setDeltaTime(0.1);
      companionController.gameObj._triggerUpdate();

      expect(companionController.getState()).toBe("VICTORY_BREACH");
      expect(onVictoryMock).toHaveBeenCalled();
    });
  });
});

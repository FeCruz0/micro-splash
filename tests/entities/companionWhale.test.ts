import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCompanionWhale, isCompanionCollidable } from "../../src/entities/companionWhale";
import {
  isCompanionTutorialEnabled,
  setCompanionTutorialEnabled,
  hasSeenCompanionTutorial,
  markCompanionTutorialSeen,
  resetCompanionTutorialSeen,
  shouldSpawnCompanionWhale,
} from "../../src/systems/companionTutorialSettings";
import { COMPANION_CONFIG, TAGS } from "../../src/config";

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
      const objTags: string[] = [];
      const obj: any = {
        pos: { x: 0, y: 0 },
        angle: 0,
        opacity: 1,
        radius: 0,
        _destroyed: false,
        tags: objTags,
        is: (tag: string) => objTags.includes(tag),
        exists: () => !obj._destroyed,
        move: (vx: number, vy: number) => {
          obj.pos.x += vx * currentDeltaTime;
          obj.pos.y += vy * currentDeltaTime;
        },
        onUpdate: (cb: () => void) => {
          updateCallback = cb;
        },
        play: vi.fn(),
        comps,
      };

      for (const comp of comps) {
        if (typeof comp === "string") {
          objTags.push(comp);
        } else if (comp && typeof comp === "object") {
          Object.assign(obj, comp);
          if ("x" in comp && "y" in comp) {
            obj.pos = {
              x: comp.x,
              y: comp.y,
              dist: (other: any) => Math.hypot(other.x - comp.x, other.y - comp.y),
            };
          }
          if ("angle" in comp) {
            obj.angle = comp.angle;
          }
        }
      }

      obj._triggerUpdate = () => {
        if (updateCallback && !obj._destroyed) updateCallback();
      };

      objects.push(obj);
      return obj;
    },
    _objects: objects,
  };

  return k;
}

function createMockPlayerController(initialX = 120, initialY = 200, speedX = 180) {
  const playerObj = {
    pos: { x: initialX, y: initialY },
    exists: () => true,
  };

  return {
    gameObj: playerObj as any,
    getSpeed: () => ({ x: speedX, y: 0 }),
    isFrozen: () => false,
  } as any;
}

describe("Fase 56: Tutorial Intuitivo & Mimético — Baleia-Guia NPC (Mãe-Guia Antártica)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("56.1: Configurações e Persistência do Tutorial", () => {
    it("deve habilitar o tutorial por padrão", () => {
      expect(isCompanionTutorialEnabled()).toBe(true);
    });

    it("deve permitir alternar o status de habilitação do tutorial", () => {
      setCompanionTutorialEnabled(false);
      expect(isCompanionTutorialEnabled()).toBe(false);

      setCompanionTutorialEnabled(true);
      expect(isCompanionTutorialEnabled()).toBe(true);
    });

    it("deve iniciar com o status de visto como false e marcar como visto corretamente", () => {
      expect(hasSeenCompanionTutorial()).toBe(false);

      markCompanionTutorialSeen();
      expect(hasSeenCompanionTutorial()).toBe(true);

      resetCompanionTutorialSeen();
      expect(hasSeenCompanionTutorial()).toBe(false);
    });

    it("deve determinar corretamente quando spawnar a Baleia-Guia por modo de jogo", () => {
      expect(shouldSpawnCompanionWhale("quick_challenge")).toBe(false);
      expect(shouldSpawnCompanionWhale("weekly")).toBe(false);

      expect(shouldSpawnCompanionWhale("serene")).toBe(true);
      setCompanionTutorialEnabled(false);
      expect(shouldSpawnCompanionWhale("serene")).toBe(false);
      setCompanionTutorialEnabled(true);

      expect(shouldSpawnCompanionWhale("standard")).toBe(true);
      markCompanionTutorialSeen();
      expect(shouldSpawnCompanionWhale("standard")).toBe(false);
    });
  });

  describe("56.2: Criação, Colisor k.area e Identidade Visual", () => {
    it("deve instanciar a Baleia-Guia com posição inicial adiante do jogador, escala calibrada 0.85x e colisor", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      expect(companionController.gameObj).toBeDefined();
      expect(companionController.gameObj.pos.x).toBeGreaterThan(mockPlayer.gameObj.pos.x);
      expect(companionController.getState()).toBe("INTRO");
      expect(companionController.isDeparted()).toBe(false);

      // Valida componente k.area presente para colisão ativa
      const areaComp = companionController.gameObj.comps.find((c: any) => c && c.type === "area");
      expect(areaComp).toBeDefined();
    });
  });

  describe("56.3: Alimentação por Filtração Real (Consumo de Krill)", () => {
    it("deve destruir o krill, restaurar oxigênio e incrementar contador ao consumir krill", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      // Simula oxigênio reduzido
      (companionController as any).forceState("CRUISE");
      const initialOxygen = companionController.getOxygen();
      expect(companionController.getKrillsEaten()).toBe(0);

      // Cria um krill no mapa
      const krillMock = mockKaboom.add([mockKaboom.pos(220, 200), TAGS.KRILL]);
      expect(krillMock._destroyed).toBe(false);

      // Consome o krill
      companionController.consumeKrill(krillMock);

      expect(krillMock._destroyed).toBe(true);
      expect(companionController.getKrillsEaten()).toBe(1);
      expect(companionController.getOxygen()).toBeGreaterThanOrEqual(initialOxygen);
    });
  });

  describe("56.4: Ciclo Biológico de Oxigênio e Respiração Polar", () => {
    it("deve reduzir oxigênio ao longo do tempo e acionar busca por respiração", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      companionController.forceState("CRUISE");
      mockKaboom.setDeltaTime(5.0);

      // Simula passagem do tempo para depleção de oxigênio
      companionController.gameObj._triggerUpdate();
      expect(companionController.getOxygen()).toBeLessThan(100);

      // Se o oxigênio cair abaixo de 38, deve buscar fenda de respiração
      mockKaboom.setDeltaTime(15.0);
      companionController.gameObj._triggerUpdate();
      expect(companionController.getState()).toBe("SEEK_BREATH");
    });

    it("deve restaurar oxigênio ao subir para a superfície", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      companionController.forceState("SEEK_BREATH");
      companionController.restoreOxygen(-50); // Reduz oxigênio

      // Força posição em fenda de gelo conhecida (ex: 120m) e sobe até a superfície
      companionController.gameObj.pos.x = 120;
      companionController.gameObj.pos.y = 74;

      mockKaboom.setDeltaTime(0.1);
      companionController.gameObj._triggerUpdate();

      expect(companionController.getState()).toBe("SURFACE_BREATHE");
      expect(companionController.getOxygen()).toBe(100);
    });
  });

  describe("56.5: Biosonar Ativo e Revelação de Itens", () => {
    it("deve emitir sonar e acionar varredura acústica", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      // Cria um item oculto com função reveal
      const revealMock = vi.fn();
      mockKaboom.add([mockKaboom.pos(300, 200), TAGS.KRILL, { reveal: revealMock }]);

      // Dispara o sonar da baleia-guia
      companionController.triggerSonar();

      // O sonar deve ter invocado a revelação de itens na área
      expect(revealMock).toHaveBeenCalled();
    });
  });

  describe("56.6: Reação a Colisões de Gelo e Obstáculos", () => {
    it("deve registrar o componente body para resolução física de colisão sólida", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      const hasBody = companionController.gameObj.comps.some(
        (comp: any) => comp && comp.type === "body"
      );
      expect(hasBody).toBe(true);
    });

    it("deve impedir penetração na banquisa sólida de gelo pelo fundo e anular velocidade vertical", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      // Simula tentativa de subir contra o teto de gelo
      companionController.gameObj.pos.y = 70;
      companionController.gameObj.angle = -20;
      companionController.getSpeed().y = -120;
      const iceMock = mockKaboom.add([mockKaboom.pos(100, 60), "ice_block"]);

      // Dispara o callback de colisão com gelo
      (companionController.gameObj as any).handleIceCollision(iceMock);

      // A baleia deve ser empurrada para baixo do gelo (>= 92px), angulação nivelada (>= 0) e vel vertical zerada
      expect(companionController.gameObj.pos.y).toBeGreaterThanOrEqual(92);
      expect(companionController.gameObj.angle).toBeGreaterThanOrEqual(0);
      expect(companionController.getSpeed().y).toBe(0);
    });

    it("deve reagir a colisão com obstáculo desviando a trajetória", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);

      const initialSpeedY = companionController.getSpeed().y;
      const obstacleMock = mockKaboom.add([mockKaboom.pos(200, 200), TAGS.OBSTACLE]);

      (companionController.gameObj as any).handleObstacleCollision(obstacleMock);
      expect(companionController.getSpeed().y).not.toBe(initialSpeedY);
    });
  });

  describe("56.7: Pacing Adaptativo e Rubber-Banding", () => {
    it("deve desacelerar quando estiver muito adiante do jogador para aguardá-lo", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200, 200);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        initialX: 400,
      });
      companionController.forceState("CRUISE");

      const initialCompanionX = companionController.gameObj.pos.x;
      mockKaboom.setDeltaTime(0.5);
      companionController.gameObj._triggerUpdate();

      const advancedDistance = companionController.gameObj.pos.x - initialCompanionX;
      expect(advancedDistance).toBeLessThan(120);
    });

    it("deve acelerar quando o jogador estiver colado atrás para abrir caminho", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(200, 200, 200);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        initialX: 240,
      });
      companionController.forceState("CRUISE");

      const initialCompanionX = companionController.gameObj.pos.x;
      mockKaboom.setDeltaTime(0.5);
      companionController.gameObj._triggerUpdate();

      const advancedDistance = companionController.gameObj.pos.x - initialCompanionX;
      expect(advancedDistance).toBeGreaterThan(50);
    });
  });

  describe("56.8: Conclusão do Tutorial e Repouso Estacionário (Sem Sumir)", () => {
    it("deve entrar em RESTING, marcar tutorial como visto e permanecer no cenário sem ser destruída", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(COMPANION_CONFIG.FAREWELL_TARGET_X, 200, 180);
      const onDepartedMock = vi.fn();

      const companionController = createCompanionWhale(mockKaboom, mockPlayer, {
        onDeparted: onDepartedMock,
      });

      mockKaboom.setDeltaTime(0.1);
      companionController.gameObj._triggerUpdate();

      // Transiciona para RESTING ao alcançar o ponto de despedida
      expect(companionController.getState()).toBe("RESTING");
      expect(companionController.isDeparted()).toBe(true);
      expect(hasSeenCompanionTutorial()).toBe(true);
      expect(onDepartedMock).toHaveBeenCalled();

      // A entidade NÃO pode ter sido destruída (não deve sumir do nada)
      expect(companionController.gameObj._destroyed).toBe(false);

      // Deve desacelerar e animar idle_swim em repouso
      mockKaboom.setDeltaTime(1.0);
      companionController.gameObj._triggerUpdate();
      expect(companionController.getSpeed().len()).toBeLessThan(50);
      expect(companionController.gameObj.play).toHaveBeenCalledWith("idle_swim");
    });

    it("deve destruir a entidade apenas ao chamar destroy() explicitamente (saída de cena)", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);

      const companionController = createCompanionWhale(mockKaboom, mockPlayer);
      expect(companionController.gameObj._destroyed).toBe(false);

      companionController.destroy();
      expect(companionController.isDeparted()).toBe(true);
      expect(companionController.gameObj._destroyed).toBe(true);
    });
  });

  describe("56.9: Hidrodinâmica Similar à Baleia do Jogador", () => {
    it("deve realizar giro vertical gradual limitando a velocidade de rotação angular", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);
      companionController.forceState("CRUISE");

      mockKaboom.add([mockKaboom.pos(companionController.gameObj.pos.x + 100, 320), TAGS.KRILL]);

      mockKaboom.setDeltaTime(0.05); // 50ms
      companionController.gameObj._triggerUpdate();

      // A mudança angular em 50ms não pode ser abrupta/instantânea (máx ~90 deg/s * 0.05s = ~4.5°)
      expect(companionController.gameObj.angle).toBeGreaterThan(0);
      expect(companionController.gameObj.angle).toBeLessThanOrEqual(5.0);
    });

    it("deve aplicar impulso na direção do ângulo de inclinação", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayerController(100, 200);
      const companionController = createCompanionWhale(mockKaboom, mockPlayer);
      companionController.forceState("CRUISE");

      // Inclina a baleia para cima (-20 graus)
      companionController.gameObj.angle = -20;
      companionController.getSpeed().x = 100;
      companionController.getSpeed().y = 0;

      mockKaboom.setDeltaTime(0.05);
      companionController.gameObj._triggerUpdate();

      // O impulso em ângulo negativo deve induzir velocidade vertical para cima (y < 0)
      expect(companionController.getSpeed().y).toBeLessThan(0);
    });
  });

  describe("Fase 58: Determinismo, PRNG Mulberry32 & Type Safety", () => {
    it("deve reproduzir trajetórias e velocidades idênticas para sementes idênticas", () => {
      const seed = 98765;
      const k1 = createMockKaboom();
      const p1 = createMockPlayerController(100, 200);
      const whale1 = createCompanionWhale(k1, p1, { seed });
      whale1.forceState("CRUISE");

      const k2 = createMockKaboom();
      const p2 = createMockPlayerController(100, 200);
      const whale2 = createCompanionWhale(k2, p2, { seed });
      whale2.forceState("CRUISE");

      // Executa 20 passos de simulação
      for (let i = 0; i < 20; i++) {
        const dt = 0.05;
        k1.setDeltaTime(dt);
        k2.setDeltaTime(dt);
        whale1.gameObj._triggerUpdate();
        whale2.gameObj._triggerUpdate();

        expect(whale1.gameObj.pos.x).toBeCloseTo(whale2.gameObj.pos.x, 5);
        expect(whale1.gameObj.pos.y).toBeCloseTo(whale2.gameObj.pos.y, 5);
        expect(whale1.gameObj.angle).toBeCloseTo(whale2.gameObj.angle, 5);
        expect(whale1.getSpeed().x).toBeCloseTo(whale2.getSpeed().x, 5);
        expect(whale1.getSpeed().y).toBeCloseTo(whale2.getSpeed().y, 5);
      }
    });

    it("deve aceitar injeção de PRNG customizado", () => {
      let callCount = 0;
      const mockPrng = () => {
        callCount++;
        return 0.5;
      };

      const k = createMockKaboom();
      const p = createMockPlayerController(100, 200);
      const whale = createCompanionWhale(k, p, { prng: mockPrng });

      // Emite uma respiração com borrifo
      whale.forceState("SEEK_BREATH");
      whale.gameObj.pos.x = 120; // posição sob fenda de gelo conhecida
      whale.gameObj.pos.y = 74;

      k.setDeltaTime(0.05);
      whale.gameObj._triggerUpdate();

      // PRNG deve ter sido consumido pelas partículas de vapor
      expect(callCount).toBeGreaterThan(0);
    });

    it("deve validar corretamente o type guard isCompanionCollidable", () => {
      const validCandidate = {
        consumeKrill: () => {},
        handleIceCollision: () => {},
        handleObstacleCollision: () => {},
      };
      expect(isCompanionCollidable(validCandidate)).toBe(true);

      const partialCandidate = {
        consumeKrill: () => {},
      };
      expect(isCompanionCollidable(partialCandidate)).toBe(true);

      expect(isCompanionCollidable(null)).toBe(false);
      expect(isCompanionCollidable(undefined)).toBe(false);
      expect(isCompanionCollidable({})).toBe(false);
      expect(isCompanionCollidable("string")).toBe(false);
    });
  });
});

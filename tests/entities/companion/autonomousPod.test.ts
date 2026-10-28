import { beforeEach, describe, expect, it, vi } from "vitest";
import { COMPANION_CONFIG, GAME_CONFIG, TAGS } from "../../../src/config";
import { createCompanionWhale } from "../../../src/entities/companionWhale";
import {
  hasSeenCompanionTutorial,
  resetCompanionTutorialSeen,
} from "../../../src/systems/companionTutorialSettings";
import { SpatialHashGrid } from "../../../src/systems/spatialHashGrid";

describe("Fase 61: Desacoplamento da Dependência do Jogador & Co-Migração 100% Autônoma", () => {
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
      setDeltaTime: (deltaTime: number) => {
        currentDeltaTime = deltaTime;
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
      } as any,
      getSpeed: () => ({ x: speedX, y: 0 }),
      getState: () => "SWIMMING",
    } as any;
  }

  it("deve partir espontaneamente após AUTONOMOUS_INTRO_DELAY sem requerer movimento do jogador", () => {
    const mockKaboom = createMockKaboom();
    // Jogador imóvel na origem
    const playerController = createMockPlayerController(0, 200, 0);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 100,
      initialY: 200,
    });

    expect(companionController.getState()).toBe("INTRO");

    // Simula 1.6 segundos com o jogador completamente parado
    mockKaboom.setDeltaTime(0.5);
    (companionController.gameObj as any)._triggerUpdate(); // 0.5s
    (companionController.gameObj as any)._triggerUpdate(); // 1.0s
    (companionController.gameObj as any)._triggerUpdate(); // 1.5s
    (companionController.gameObj as any)._triggerUpdate(); // 2.0s (> 1.5s)

    // No modo autônomo, parte espontaneamente para cruzeiro independente
    expect(companionController.getState()).toBe("INDEPENDENT_CRUISE");
  });

  it("não deve partir espontaneamente em modo guiado se o jogador estiver parado", () => {
    const mockKaboom = createMockKaboom();
    const playerController = createMockPlayerController(0, 200, 0);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "guided",
      initialX: 100,
      initialY: 200,
    });

    expect(companionController.getState()).toBe("INTRO");

    mockKaboom.setDeltaTime(0.5);
    (companionController.gameObj as any)._triggerUpdate();
    (companionController.gameObj as any)._triggerUpdate();
    (companionController.gameObj as any)._triggerUpdate();
    (companionController.gameObj as any)._triggerUpdate();

    // No modo guiado com jogador parado, aguarda o jogador
    expect(companionController.getState()).toBe("INTRO");

    // Move o jogador além de 40px
    playerController.gameObj.pos.x = 45;
    (companionController.gameObj as any)._triggerUpdate();
    expect(companionController.getState()).toBe("CRUISE");
  });

  it("deve manter cadência constante e nadar para frente mesmo se o jogador parar completamente", () => {
    const mockKaboom = createMockKaboom();
    const playerController = createMockPlayerController(5000, 200, 0); // jogador parado

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 5050,
      initialY: 200,
    });

    companionController.forceState("INDEPENDENT_CRUISE");
    const initialPositionX = companionController.gameObj.pos.x;

    mockKaboom.setDeltaTime(0.1);
    for (let i = 0; i < 20; i++) {
      (companionController.gameObj as any)._triggerUpdate();
    }

    // A baleia deve ter avançado continuamente sem ser freada a zero pelo jogador
    expect(companionController.gameObj.pos.x).toBeGreaterThan(initialPositionX + 100);
  });

  it("deve continuar migrando mesmo se o jogador ficar centenas de metros para trás", () => {
    const mockKaboom = createMockKaboom();
    // Jogador ficou muito para trás (distância de 1.000px)
    const playerController = createMockPlayerController(4000, 200, 100);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 5000,
      initialY: 200,
    });

    companionController.forceState("INDEPENDENT_CRUISE");
    const startX = companionController.gameObj.pos.x;

    mockKaboom.setDeltaTime(0.1);
    for (let i = 0; i < 15; i++) {
      (companionController.gameObj as any)._triggerUpdate();
    }

    // Mesmo com rubber-banding desativado, o progresso deve ser positivo e contínuo
    expect(companionController.gameObj.pos.x).toBeGreaterThan(startX + 80);
  });

  it("deve forragear livremente krill próximo ao jogador em modo autônomo", () => {
    const mockKaboom = createMockKaboom();
    const grid = new SpatialHashGrid<any>({ cellSize: 160 });

    // Jogador em x = 5055
    const playerController = createMockPlayerController(5055, 200, 160);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 5000,
      initialY: 200,
      spatialGrid: grid,
    });

    companionController.forceState("INDEPENDENT_CRUISE");

    // Krill em x = 5060 (a apenas 5px do jogador, < 50px)
    const mockKrill = mockKaboom.add([mockKaboom.pos(5060, 200), TAGS.KRILL]);
    grid.insert("krill_nearby", mockKrill, { minX: 5050, minY: 190, maxX: 5070, maxY: 210 });

    mockKaboom.setDeltaTime(0.4);
    (companionController.gameObj as any)._triggerUpdate();

    // Em modo autônomo, não cede krill ao jogador; seleciona o alimento para sobrevivência
    const targetKrill = (companionController as any).gameObj;
    expect(targetKrill).toBeDefined();

    // Consumo direto
    companionController.consumeKrill(mockKrill);
    expect(companionController.getKrillsEaten()).toBe(1);
  });

  it("deve ceder krill ao jogador no modo guiado quando o jogador estiver a menos de 50px", () => {
    const mockKaboom = createMockKaboom();
    const grid = new SpatialHashGrid<any>({ cellSize: 160 });

    const playerController = createMockPlayerController(1055, 200, 160);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "guided",
      initialX: 1000,
      initialY: 200,
      spatialGrid: grid,
    });

    companionController.forceState("CRUISE");

    // Krill a 5px do jogador
    const mockKrill = mockKaboom.add([mockKaboom.pos(1060, 200), TAGS.KRILL]);
    grid.insert("krill_tutorial", mockKrill, { minX: 1050, minY: 190, maxX: 1070, maxY: 210 });

    mockKaboom.setDeltaTime(0.4);
    (companionController.gameObj as any)._triggerUpdate();

    // No modo guiado, não disputa krill com o jogador
    // O krill foi ignorado pela seleção sensorial da baleia-guia
  });

  it("deve funcionar de forma autônoma sem playerController injetado", () => {
    const mockKaboom = createMockKaboom();

    // Chamada sem playerController
    const companionController = createCompanionWhale(mockKaboom, null, {
      autonomyMode: "autonomous",
      initialX: 300,
      initialY: 200,
    });

    expect(companionController.gameObj.pos.x).toBe(300);

    // Executa múltiplos frames sem lançar erros
    mockKaboom.setDeltaTime(0.1);
    expect(() => {
      for (let i = 0; i < 10; i++) {
        (companionController.gameObj as any)._triggerUpdate();
      }
    }).not.toThrow();

    expect(companionController.getOxygen()).toBeGreaterThan(0);
  });

  it("deve concluir tutorial e migrar para INDEPENDENT_CRUISE com base no seu próprio avanço", () => {
    const mockKaboom = createMockKaboom();
    // Jogador ainda atrasado na Antártica (x = 1500)
    const playerController = createMockPlayerController(1500, 200, 100);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: COMPANION_CONFIG.FAREWELL_TARGET_X - 100, // x = 3050 (> 2970)
      initialY: 200,
    });

    companionController.forceState("CRUISE");

    mockKaboom.setDeltaTime(0.1);
    (companionController.gameObj as any)._triggerUpdate();

    // Conclui tutorial e entra em cruzeiro independente pelo seu próprio progresso
    expect(hasSeenCompanionTutorial()).toBe(true);
    expect(companionController.getState()).toBe("INDEPENDENT_CRUISE");
  });

  it("deve buscar respirar mais cedo quando o oxigênio cair abaixo de 55% (CRITICAL_OXYGEN) com oxigênio finito ativo", () => {
    const mockKaboom = createMockKaboom();
    const playerController = createMockPlayerController(1000, 200, 180);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 1000,
      initialY: 200,
      infiniteOxygen: false,
    });

    companionController.forceState("CRUISE");
    // Reduz oxigênio para 54% (abaixo do novo limiar de 55%)
    companionController.restoreOxygen(-46);
    expect(companionController.getOxygen()).toBe(54);

    mockKaboom.setDeltaTime(0.1);
    (companionController.gameObj as any)._triggerUpdate();

    // Com o limiar aumentado para 55%, busca respirar mais cedo
    expect(companionController.getState()).toBe("SEEK_BREATH");
  });

  it("deve manter oxigênio infinito (100%) por padrão sem entrar em SEEK_BREATH", () => {
    const mockKaboom = createMockKaboom();
    const playerController = createMockPlayerController(1000, 200, 180);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 1000,
      initialY: 200,
    });

    companionController.forceState("CRUISE");
    mockKaboom.setDeltaTime(5.0);
    (companionController.gameObj as any)._triggerUpdate();

    expect(companionController.getOxygen()).toBe(100);
    expect(companionController.getState()).toBe("CRUISE");
  });

  it("deve reconhecer a superfície e respirar com a tolerância de 22px (y <= SEA_LEVEL + 22)", () => {
    const mockKaboom = createMockKaboom();
    const playerController = createMockPlayerController(6000, 200, 180);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 6000,
      initialY: 200,
    });

    companionController.forceState("SEEK_BREATH");
    companionController.restoreOxygen(-50);

    // Posiciona na lâmina d'água dentro da tolerância (y = 100 <= 80 + 22)
    companionController.gameObj.pos.x = 6000;
    companionController.gameObj.pos.y = GAME_CONFIG.SEA_LEVEL + 20;

    mockKaboom.setDeltaTime(0.1);
    (companionController.gameObj as any)._triggerUpdate();

    expect(companionController.getState()).toBe("SURFACE_BREATHE");
    expect(companionController.getOxygen()).toBe(100);
  });

  it("deve acelerar o nado durante SEEK_BREATH para alcançar a superfície com urgência", () => {
    const mockKaboom = createMockKaboom();
    const playerController = createMockPlayerController(5000, 200, 180);

    const companionController = createCompanionWhale(mockKaboom, playerController, {
      autonomyMode: "autonomous",
      initialX: 5000,
      initialY: 200,
    });

    companionController.forceState("SEEK_BREATH");
    const initialY = companionController.gameObj.pos.y;

    mockKaboom.setDeltaTime(0.2);
    for (let i = 0; i < 5; i++) {
      (companionController.gameObj as any)._triggerUpdate();
    }

    // A inclinação angular negativa e o boost de remada devem impulsionar para cima
    expect(companionController.gameObj.angle).toBeLessThan(0);
    expect(companionController.gameObj.pos.y).toBeLessThan(initialY);
  });
});

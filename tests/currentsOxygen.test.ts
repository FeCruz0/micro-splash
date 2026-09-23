import { describe, it, expect } from "vitest";
import { PlayerOxygenManager } from "../src/entities/player/playerOxygen";
import { setupOceanCurrentsSystem, type CurrentZone } from "../src/systems/oceanCurrentsSystem";

function createMockKaboom() {
  const updateCallbacks: Array<() => void> = [];
  return {
    shake: () => {},
    vec2: (x: number, y: number) => ({
      x,
      y,
      len: () => Math.sqrt(x * x + y * y),
      scale: (s: number) => ({ x: x * s, y: y * s }),
    }),
    add: () => {
      const childObj: any = {
        add: () => childObj,
        onUpdate: (cb: () => void) => updateCallbacks.push(cb),
        pos: { x: 0, y: 0 },
        opacity: 1,
      };
      return childObj;
    },
    circle: () => {},
    rect: () => {},
    pos: () => {},
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    color: () => {},
    opacity: () => {},
    outline: () => {},
    destroy: () => {},
    z: () => {},
    dt: () => 0.1,
    time: () => 10.0,
    rand: (min: number, _max?: number) => min,
    choose: (arr: any[]) => arr[0],
    onUpdate: (cb: () => void) => updateCallbacks.push(cb),
    _triggerUpdates: () => {
      for (const cb of updateCallbacks) cb();
    },
  } as any;
}

describe("Fase 18.1: Dinâmica Hidrodinâmica de Fôlego em Correntezas", () => {
  it("modula o dreno de oxigênio em -35% (a favor) e +35% (contra o fluxo)", () => {
    const k = createMockKaboom();
    const oxMgr = new PlayerOxygenManager(k);

    const baseDrain = oxMgr.calculateDrainMultiplier(120, false, 1.0);
    const favorableDrain = oxMgr.calculateDrainMultiplier(120, false, 0.65);
    const opposingDrain = oxMgr.calculateDrainMultiplier(120, false, 1.35);

    // A favor do fluxo: dreno 35% menor
    expect(favorableDrain).toBeCloseTo(baseDrain * 0.65, 3);
    expect(favorableDrain).toBeLessThan(baseDrain);

    // Contra o fluxo: dreno 35% maior
    expect(opposingDrain).toBeCloseTo(baseDrain * 1.35, 3);
    expect(opposingDrain).toBeGreaterThan(baseDrain);
  });

  it("atualiza a retenção de oxigênio com o modificador de correnteza ativo no loop", () => {
    const k = createMockKaboom();

    // 1. Cenário neutro (fora da correnteza)
    const oxMgrNeutral = new PlayerOxygenManager(k);
    oxMgrNeutral.setCurrentFlowModifier(1.0);
    oxMgrNeutral.update(1.0, k.vec2(500, 200), k.vec2(120, 0), true, false, false);
    const neutralOx = oxMgrNeutral.getOxygen();

    // 2. Cenário a favor da correnteza (0.65x)
    const oxMgrWithFlow = new PlayerOxygenManager(k);
    oxMgrWithFlow.setCurrentFlowModifier(0.65);
    oxMgrWithFlow.update(1.0, k.vec2(500, 200), k.vec2(120, 0), true, false, false);
    const withFlowOx = oxMgrWithFlow.getOxygen();

    // 3. Cenário contra a correnteza (1.35x)
    const oxMgrAgainstFlow = new PlayerOxygenManager(k);
    oxMgrAgainstFlow.setCurrentFlowModifier(1.35);
    oxMgrAgainstFlow.update(1.0, k.vec2(500, 200), k.vec2(120, 0), true, false, false);
    const againstFlowOx = oxMgrAgainstFlow.getOxygen();

    // Com o fluxo retém mais oxigênio; contra o fluxo drena mais oxigênio
    expect(withFlowOx).toBeGreaterThan(neutralOx);
    expect(neutralOx).toBeGreaterThan(againstFlowOx);
  });

  it("identifica corretamente o alinhamento da jubarte com o vetor de correnteza", () => {
    const k = createMockKaboom();

    let currentModifier = 1.0;
    let facingRight = true;
    let playerX = 6000;
    let playerY = 200;

    const mockPlayerController: any = {
      gameObj: {
        pos: {
          get x() { return playerX; },
          get y() { return playerY; },
        },
      },
      getSpeed: () => k.vec2(100, 0),
      setSpeed: () => {},
      isFacingRight: () => facingRight,
      setCurrentFlowModifier: (mod: number) => { currentModifier = mod; },
      getCurrentFlowModifier: () => currentModifier,
    };

    // Zona 1: Favorável (+X, empurra para a direita) de 5000 a 7000
    // Zona 2: Contrária (-X, empurra para a esquerda) de 8000 a 10000
    const testZones: CurrentZone[] = [
      { startX: 5000, endX: 7000, y: 150, height: 100, force: 150, type: "favorable" },
      { startX: 8000, endX: 10000, y: 150, height: 100, force: 150, type: "opposing" },
    ];

    setupOceanCurrentsSystem(k, mockPlayerController, testZones);

    // CASO A: Dentro da zona favorável (fluxo para a direita)
    playerX = 6000;
    playerY = 200;

    // A1. Baleia virada para a direita (+X) -> a favor do fluxo
    facingRight = true;
    k._triggerUpdates();
    expect(currentModifier).toBe(0.65);

    // A2. Baleia virada para a esquerda (-X) -> contra o fluxo
    facingRight = false;
    k._triggerUpdates();
    expect(currentModifier).toBe(1.35);

    // CASO B: Dentro da zona contrária (fluxo para a esquerda)
    playerX = 9000;
    playerY = 200;

    // B1. Baleia virada para a direita (+X) -> contra o fluxo
    facingRight = true;
    k._triggerUpdates();
    expect(currentModifier).toBe(1.35);

    // B2. Baleia virada para a esquerda (-X) -> a favor do fluxo
    facingRight = false;
    k._triggerUpdates();
    expect(currentModifier).toBe(0.65);

    // CASO C: Fora de qualquer correnteza (X = 3000)
    playerX = 3000;
    playerY = 200;
    k._triggerUpdates();
    expect(currentModifier).toBe(1.0);
  });
});

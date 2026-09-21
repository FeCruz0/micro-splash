import { describe, it, expect } from "vitest";
import { PlayerOxygenManager } from "../src/entities/player/playerOxygen";
import { GAME_CONFIG } from "../src/config";

function createMockKaboom() {
  return {
    shake: () => {},
    vec2: (x: number, y: number) => ({ x, y, len: () => Math.sqrt(x * x + y * y) }),
    add: () => ({ onUpdate: () => {} }),
    circle: () => {},
    pos: () => {},
    color: () => {},
    opacity: () => {},
    z: () => {},
    dt: () => 1.0,
  } as any;
}

describe("PlayerOxygenManager: Sistema de Fôlego Inteligente", () => {
  it("calcula multiplicadores de dreno dinâmicos baseados na velocidade", () => {
    const k = createMockKaboom();
    const oxMgr = new PlayerOxygenManager(k);

    // 1. Em repouso (velocidade 0)
    const restMult = oxMgr.calculateDrainMultiplier(0);
    expect(restMult).toBeCloseTo(0.40, 2);

    // 2. Em velocidade moderada de cruzeiro (120 px/s ~ metade da vel. máxima)
    const cruiseMult = oxMgr.calculateDrainMultiplier(120);
    expect(cruiseMult).toBeCloseTo(1.00, 2);

    // 3. Em velocidade máxima (240 px/s)
    const maxMult = oxMgr.calculateDrainMultiplier(GAME_CONFIG.MAX_SPEED);
    expect(maxMult).toBeCloseTo(1.60, 2);

    // 4. Verificação de monotonia: quanto maior a velocidade, maior o gasto de fôlego
    expect(oxMgr.calculateDrainMultiplier(200)).toBeGreaterThan(oxMgr.calculateDrainMultiplier(80));
    expect(oxMgr.calculateDrainMultiplier(80)).toBeGreaterThan(oxMgr.calculateDrainMultiplier(0));
  });

  it("reduz o consumo ao pegar vácuo (drafting) com golfinhos mesmo em alta velocidade", () => {
    const k = createMockKaboom();
    const oxMgr = new PlayerOxygenManager(k);

    const normalMaxDrain = oxMgr.calculateDrainMultiplier(GAME_CONFIG.MAX_SPEED, false);
    const draftingMaxDrain = oxMgr.calculateDrainMultiplier(GAME_CONFIG.MAX_SPEED, true);

    expect(draftingMaxDrain).toBeCloseTo(normalMaxDrain * 0.60, 2);
    expect(draftingMaxDrain).toBeLessThan(normalMaxDrain);
  });

  it("drena menos oxigênio por segundo em repouso do que em nado acelerado", () => {
    const k = createMockKaboom();

    // Cenário A: Baleia submersa em repouso (pos.y = 200, vel = 0)
    const oxMgrRest = new PlayerOxygenManager(k);
    const submergedPos = k.vec2(500, 200);
    const restSpeed = k.vec2(0, 0);

    oxMgrRest.update(1.0, submergedPos, restSpeed, true, false, false);
    const oxygenAfterRest = oxMgrRest.getOxygen();

    // Cenário B: Baleia submersa em nado rápido (pos.y = 200, vel = 240)
    const oxMgrFast = new PlayerOxygenManager(k);
    const fastSpeed = k.vec2(240, 0);

    oxMgrFast.update(1.0, submergedPos, fastSpeed, true, false, false);
    const oxygenAfterFast = oxMgrFast.getOxygen();

    // A baleia em repouso deve reter consideravelmente mais oxigênio
    expect(oxygenAfterRest).toBeGreaterThan(oxygenAfterFast);
    // Dreno em repouso: 100 - (1.0 * 5 * 0.4) = 98
    expect(oxygenAfterRest).toBeCloseTo(98, 1);
    // Dreno em velocidade máxima: 100 - (1.0 * 5 * 1.6) = 92
    expect(oxygenAfterFast).toBeCloseTo(92, 1);
  });
});

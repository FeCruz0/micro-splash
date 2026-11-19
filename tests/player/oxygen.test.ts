import { describe, it, expect, vi } from "vitest";
import { PlayerOxygenManager } from "../../src/entities/player/playerOxygen";
import * as playerParticles from "../../src/entities/player/playerParticles";
import { GAME_CONFIG } from "../../src/config";
import { setActiveIceGaps, resetActiveIceGaps } from "../../src/systems/ice/iceGaps";

function createMockKaboom() {
  const vec2 = (x: number, y: number): any => ({
    x,
    y,
    len: () => Math.sqrt(x * x + y * y),
    scale: (s: number) => vec2(x * s, y * s),
    add: (other: { x: number; y: number }) => vec2(x + other.x, y + other.y),
  });
  return {
    shake: () => {},
    vec2,
    rand: (min: number, max: number) => (min + max) * 0.5,
    deg2rad: (deg: number) => (deg * Math.PI) / 180,
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    add: () => ({ onUpdate: () => {}, pos: { x: 0, y: 0 }, opacity: 1 }),
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
    expect(restMult).toBeCloseTo(0.4, 2);

    // 2. Em velocidade moderada de cruzeiro (120 px/s ~ metade da vel. máxima)
    const cruiseMult = oxMgr.calculateDrainMultiplier(120);
    expect(cruiseMult).toBeCloseTo(1.0, 2);

    // 3. Em velocidade máxima (240 px/s)
    const maxMult = oxMgr.calculateDrainMultiplier(GAME_CONFIG.MAX_SPEED);
    expect(maxMult).toBeCloseTo(1.6, 2);

    // 4. Verificação de monotonia: quanto maior a velocidade, maior o gasto de fôlego
    expect(oxMgr.calculateDrainMultiplier(200)).toBeGreaterThan(oxMgr.calculateDrainMultiplier(80));
    expect(oxMgr.calculateDrainMultiplier(80)).toBeGreaterThan(oxMgr.calculateDrainMultiplier(0));
  });

  it("reduz o consumo ao pegar vácuo (drafting) com golfinhos mesmo em alta velocidade", () => {
    const k = createMockKaboom();
    const oxMgr = new PlayerOxygenManager(k);

    const normalMaxDrain = oxMgr.calculateDrainMultiplier(GAME_CONFIG.MAX_SPEED, false);
    const draftingMaxDrain = oxMgr.calculateDrainMultiplier(GAME_CONFIG.MAX_SPEED, true);

    expect(draftingMaxDrain).toBeCloseTo(normalMaxDrain * 0.6, 2);
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

  it("verifica respiração direcional pelo espiráculo nas bordas da fenda de gelo", () => {
    setActiveIceGaps([{ start: 600, end: 750 }]);
    try {
      const k = createMockKaboom();
      k.shake = vi.fn();

      // Drena um pouco de oxigênio primeiro
      const oxLeft = new PlayerOxygenManager(k);
      oxLeft.update(1.0, k.vec2(500, 200), k.vec2(0, 0), true, false, false);
      expect(oxLeft.getOxygen()).toBeLessThan(100);

      // Aproximando pela esquerda (x = 590): virada para direita (espiráculo em 612) DEVE respirar
      oxLeft.update(0.1, k.vec2(590, GAME_CONFIG.SEA_LEVEL + 10), k.vec2(0, 0), true, false, false);
      expect(oxLeft.getOxygen()).toBe(100);

      // Mesma posição (x = 590), porém virada para a esquerda (espiráculo em 568, sob o gelo) NÃO deve respirar
      const oxLeftOpposite = new PlayerOxygenManager(k);
      oxLeftOpposite.update(1.0, k.vec2(500, 200), k.vec2(0, 0), false, false, false);
      const drainedBefore = oxLeftOpposite.getOxygen();
      oxLeftOpposite.update(
        0.1,
        k.vec2(590, GAME_CONFIG.SEA_LEVEL + 10),
        k.vec2(0, 0),
        false,
        false,
        false
      );
      expect(oxLeftOpposite.getOxygen()).toBeLessThan(drainedBefore);

      // Aproximando pela direita (x = 762): virada para esquerda (espiráculo em 740) DEVE respirar
      const oxRight = new PlayerOxygenManager(k);
      oxRight.update(1.0, k.vec2(500, 200), k.vec2(0, 0), false, false, false);
      oxRight.update(
        0.1,
        k.vec2(762, GAME_CONFIG.SEA_LEVEL + 10),
        k.vec2(0, 0),
        false,
        false,
        false
      );
      expect(oxRight.getOxygen()).toBe(100);

      // Limite máximo (101 após 1 krill) e cooldown de 2s no borrifo
      const spoutSpy = vi.spyOn(playerParticles, "spawnBlowholeSpout");
      const oxCap = new PlayerOxygenManager(k);
      oxCap.consumeKrill();
      expect(oxCap.getMaxOxygen()).toBe(101);
      oxCap.update(1.0, k.vec2(500, 200), k.vec2(0, 0), true, false, false);
      expect(oxCap.getOxygen()).toBeLessThan(101);

      // Primeira respiração na fenda: restaura exatamente até getMaxOxygen() (101) e emite borrifo
      oxCap.update(0.1, k.vec2(650, GAME_CONFIG.SEA_LEVEL + 10), k.vec2(0, 0), true, false, false);
      expect(oxCap.getOxygen()).toBe(101);
      expect(spoutSpy).toHaveBeenCalledTimes(1);

      // Segunda respiração dentro de 2.0s: restaura oxigênio sem emitir novo borrifo (cooldown ativo)
      oxCap.update(0.5, k.vec2(500, 200), k.vec2(0, 0), true, false, false);
      oxCap.update(0.1, k.vec2(650, GAME_CONFIG.SEA_LEVEL + 10), k.vec2(0, 0), true, false, false);
      expect(oxCap.getOxygen()).toBe(101);
      expect(spoutSpy).toHaveBeenCalledTimes(1);
      spoutSpy.mockRestore();
    } finally {
      resetActiveIceGaps();
    }
  });
});

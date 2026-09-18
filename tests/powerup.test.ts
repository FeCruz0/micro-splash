import { describe, it, expect } from "vitest";
import { POWERUP_CONFIGS, type PowerUpType } from "../src/entities/powerup";
import { PlayerOxygenManager } from "../src/entities/player/playerOxygen";

describe("Power-up Systems & Configs", () => {
  it("define corretamente as configurações e metadados dos 4 power-ups", () => {
    const types: PowerUpType[] = ["bubble_shield", "tailwind", "air_pocket", "bioluminescence"];

    types.forEach((type) => {
      const conf = POWERUP_CONFIGS[type];
      expect(conf).toBeDefined();
      expect(conf.type).toBe(type);
      expect(conf.name).toBeTruthy();
      expect(conf.color).toHaveLength(3);
      expect(conf.outlineColor).toHaveLength(3);
      expect(conf.icon).toBeTruthy();
    });

    expect(POWERUP_CONFIGS.bubble_shield.name).toBe("Escudo de Bolhas");
    expect(POWERUP_CONFIGS.tailwind.name).toBe("Corrente Favorável");
    expect(POWERUP_CONFIGS.air_pocket.name).toBe("Bolsão de Ar");
    expect(POWERUP_CONFIGS.bioluminescence.name).toBe("Bioluminescência");
  });

  it("permite restauração pontual de oxigênio pelo Bolsão de Ar via PlayerOxygenManager", () => {
    // Mock minimalista de KaboomCtx para PlayerOxygenManager
    const mockKaboom: any = {
      dt: () => 1.0,
      vec2: (x: number, y: number) => ({ x, y }),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      shake: () => {},
    };

    const oxMgr = new PlayerOxygenManager(mockKaboom);
    expect(oxMgr.getOxygen()).toBe(100);

    // Drena oxigênio aplicando dano de lixo
    oxMgr.penalizeTrash();
    expect(oxMgr.getOxygen()).toBe(85); // -15 de lixo

    // Restaura fôlego (+30% com bolsão de ar)
    oxMgr.restoreOxygen(30);
    expect(oxMgr.getOxygen()).toBe(100); // Travado no teto máximo de 100

    // Drena mais para testar restauração parcial
    oxMgr.penalizeTrash();
    oxMgr.penalizeTrash();
    expect(oxMgr.getOxygen()).toBe(70);

    oxMgr.restoreOxygen(20);
    expect(oxMgr.getOxygen()).toBe(90);
  });
});

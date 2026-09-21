import { describe, it, expect } from "vitest";
import { POWERUP_CONFIGS, type PowerUpType } from "../src/entities/powerup";
import { PlayerOxygenManager } from "../src/entities/player/playerOxygen";
import { DEFAULT_OCEAN_CURRENTS, type CurrentZone } from "../src/systems/oceanCurrentsSystem";

describe("Elementos Ambientais: Bolsões de Ar e Correntes Oceânicas", () => {
  it("mantém apenas bolsão de ar e corrente favorável, sem escudo ou bioluminescência", () => {
    const types: PowerUpType[] = ["tailwind", "air_pocket"];

    types.forEach((type) => {
      const conf = POWERUP_CONFIGS[type];
      expect(conf).toBeDefined();
      expect(conf.type).toBe(type);
      expect(conf.name).toBeTruthy();
      expect(conf.color).toHaveLength(3);
      expect(conf.outlineColor).toHaveLength(3);
      expect(conf.icon).toBeTruthy();
    });

    expect(POWERUP_CONFIGS.tailwind.name).toBe("Corrente Favorável");
    expect(POWERUP_CONFIGS.air_pocket.name).toBe("Bolsão de Ar Natural");

    // Confirma remoção definitiva de escudo e bioluminescência
    // @ts-ignore
    expect(POWERUP_CONFIGS["bubble_shield"]).toBeUndefined();
    // @ts-ignore
    expect(POWERUP_CONFIGS["bioluminescence"]).toBeUndefined();
  });

  it("permite restauração de oxigênio pelo Bolsão de Ar natural via PlayerOxygenManager", () => {
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

    // Restaura fôlego (+35% com bolsão de ar natural)
    oxMgr.restoreOxygen(35);
    expect(oxMgr.getOxygen()).toBe(100); // Travado no teto máximo de 100

    // Drena mais para testar restauração parcial
    oxMgr.penalizeTrash();
    oxMgr.penalizeTrash();
    expect(oxMgr.getOxygen()).toBe(70);

    oxMgr.restoreOxygen(20);
    expect(oxMgr.getOxygen()).toBe(90);
  });

  it("configura zonas de correnteza oceânica com tipos opostos e favoráveis válidos", () => {
    expect(DEFAULT_OCEAN_CURRENTS.length).toBeGreaterThanOrEqual(3);

    DEFAULT_OCEAN_CURRENTS.forEach((current: CurrentZone) => {
      expect(current.endX).toBeGreaterThan(current.startX);
      expect(current.height).toBeGreaterThan(50);
      expect(current.force).toBeGreaterThan(100);
      expect(["opposing", "favorable"]).toContain(current.type);
    });

    const hasOpposing = DEFAULT_OCEAN_CURRENTS.some((c) => c.type === "opposing");
    const hasFavorable = DEFAULT_OCEAN_CURRENTS.some((c) => c.type === "favorable");
    expect(hasOpposing).toBe(true);
    expect(hasFavorable).toBe(true);
  });
});

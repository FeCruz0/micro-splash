import { describe, it, expect } from "vitest";
import { BiomeLifecycleManager, type BiomeModule } from "../src/systems/biomeLifecycleManager";

describe("BiomeLifecycleManager (Lazy Loading por Bioma)", () => {
  it("ativa e desativa módulos estritamente de acordo com a posição X do jogador", () => {
    const mockK: any = {};
    const mgr = new BiomeLifecycleManager(mockK, 200);

    let antarcticaActive = false;
    let pelagicActive = false;

    const antarcticaMod: BiomeModule = {
      id: "antarctica",
      name: "Antártica",
      minX: 0,
      maxX: 5000,
      activate: () => { antarcticaActive = true; },
      deactivate: () => { antarcticaActive = false; },
      isActive: () => antarcticaActive,
    };

    const pelagicMod: BiomeModule = {
      id: "pelagic",
      name: "Travessia Pelágica",
      minX: 5000,
      maxX: 12000,
      activate: () => { pelagicActive = true; },
      deactivate: () => { pelagicActive = false; },
      isActive: () => pelagicActive,
    };

    mgr.registerModule(antarcticaMod);
    mgr.registerModule(pelagicMod);

    // 1. Jogador na largada (x = 100m)
    mgr.update(100);
    expect(antarcticaActive).toBe(true);
    expect(pelagicActive).toBe(false);
    expect(mgr.getActiveModules()).toEqual(["Antártica"]);

    // 2. Jogador avança para 7000m (Travessia Pelágica)
    mgr.update(7000);
    expect(antarcticaActive).toBe(false);
    expect(pelagicActive).toBe(true);
    expect(mgr.getActiveModules()).toEqual(["Travessia Pelágica"]);

    // 3. Jogador avança para Costa Urbana (x = 15000m, fora de ambos)
    mgr.update(15000);
    expect(antarcticaActive).toBe(false);
    expect(pelagicActive).toBe(false);
    expect(mgr.getActiveModules()).toEqual([]);
  });

  it("respeita a margem de histerese para evitar oscilações na fronteira entre biomas", () => {
    const mockK: any = {};
    const hysteresis = 300;
    const mgr = new BiomeLifecycleManager(mockK, hysteresis);

    let active = false;
    const mod: BiomeModule = {
      id: "ice",
      name: "Camada de Gelo",
      minX: 0,
      maxX: 5000,
      activate: () => { active = true; },
      deactivate: () => { active = false; },
      isActive: () => active,
    };

    mgr.registerModule(mod);

    // Ativa dentro do bioma
    mgr.update(4500);
    expect(active).toBe(true);

    // Move para 5150m: além de 5000m, mas dentro da histerese (5000 + 300 = 5300m)
    mgr.update(5150);
    expect(active).toBe(true); // Permanece ativo devido à histerese

    // Move para 5350m: além da histerese
    mgr.update(5350);
    expect(active).toBe(false); // Agora desativa
  });
});

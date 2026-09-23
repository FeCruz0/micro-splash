import type { KaboomCtx } from "kaboom";

export interface BiomeModule {
  id: string;
  name: string;
  minX: number;
  maxX: number;
  activate: () => void;
  deactivate: () => void;
  isActive: () => boolean;
}

export class BiomeLifecycleManager {
  private modules: BiomeModule[] = [];
  private hysteresis: number;

  constructor(_k?: KaboomCtx, hysteresis = 500) {
    this.hysteresis = hysteresis;
  }

  public registerModule(module: BiomeModule): void {
    this.modules.push(module);
  }

  public update(playerX: number): void {
    for (let i = 0; i < this.modules.length; i++) {
      const m = this.modules[i];
      const currentlyActive = m.isActive();

      // Aplica histerese: se ativo, mantém ativo até sair de [minX - hysteresis, maxX + hysteresis]
      const min = currentlyActive ? m.minX - this.hysteresis : m.minX;
      const max = currentlyActive ? m.maxX + this.hysteresis : m.maxX;

      const shouldBeActive = playerX >= min && playerX <= max;

      if (shouldBeActive && !currentlyActive) {
        m.activate();
      } else if (!shouldBeActive && currentlyActive) {
        m.deactivate();
      }
    }
  }

  public getActiveModules(): string[] {
    return this.modules.filter((m) => m.isActive()).map((m) => m.name);
  }

  public getAllModules(): { id: string; name: string; active: boolean; minX: number; maxX: number }[] {
    return this.modules.map((m) => ({
      id: m.id,
      name: m.name,
      active: m.isActive(),
      minX: m.minX,
      maxX: m.maxX,
    }));
  }

  public reset(): void {
    this.modules = [];
  }
}

let activeBiomeManager: BiomeLifecycleManager | null = null;

export function initBiomeLifecycleManager(k: KaboomCtx, hysteresis = 500): BiomeLifecycleManager {
  activeBiomeManager = new BiomeLifecycleManager(k, hysteresis);
  return activeBiomeManager;
}

export function getBiomeLifecycleManager(): BiomeLifecycleManager | null {
  return activeBiomeManager;
}

export function setBiomeLifecycleManager(mgr: BiomeLifecycleManager | null): void {
  activeBiomeManager = mgr;
}

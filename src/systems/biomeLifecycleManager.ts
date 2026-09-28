import type { KaboomCtx } from "kaboom";

/**
 * Interface que define um módulo de subsistema atrelado a faixas geográficas da migração.
 */
export interface BiomeModule {
  /** Identificador único do módulo */
  id: string;
  /** Nome legível do módulo para auditoria e telemetria */
  name: string;
  /** Distância horizontal mínima (em metros) onde o módulo deve estar ativo */
  minX: number;
  /** Distância horizontal máxima (em metros) onde o módulo deve estar ativo */
  maxX: number;
  /** Função de ativação executada na entrada da zona */
  activate: () => void;
  /** Função de desativação executada na saída da zona */
  deactivate: () => void;
  /** Função consultiva do estado de execução do módulo */
  isActive: () => boolean;
}

/**
 * Gerenciador de Ciclo de Vida Geográfico dos Módulos e Biomas.
 *
 * Otimiza o uso de CPU, memória e renderização ao desativar sistemas distantes da câmera:
 * - Suspende loops de update, áudios e partículas de fauna quando fora de alcance (ex: orcas polares após 5.000m).
 * - Utiliza margem de histerese (padrão 500m) para impedir liga/desliga intermitente nas bordas dos biomas.
 */
export class BiomeLifecycleManager {
  private modules: BiomeModule[] = [];
  private hysteresis: number;

  /**
   * Construtor do gerenciador de ciclo de vida.
   *
   * @param _k - Instância do motor Kaboom.js.
   * @param hysteresis - Margem de tolerância em metros além de minX e maxX para evitar oscilações.
   */
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

  public getAllModules(): {
    id: string;
    name: string;
    active: boolean;
    minX: number;
    maxX: number;
  }[] {
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

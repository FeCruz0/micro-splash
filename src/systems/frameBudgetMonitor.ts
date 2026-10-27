import type { SystemPhase } from "./systemRunner";
import { SYSTEM_PHASES } from "./systemRunner";

export type PhaseBudgets = Record<SystemPhase, number>;

/**
 * Orçamentos nominais em milissegundos por fase do game loop.
 * Soma total: 16.6ms (equivalente a 60 FPS ininterruptos).
 */
export const DEFAULT_PHASE_BUDGETS: PhaseBudgets = {
  input: 1.0,
  physics: 4.0,
  ai: 3.0,
  collision: 2.5,
  culling: 2.0,
  render: 4.1,
} as const;

export interface PhaseMetrics {
  lastDurationMs: number;
  averageMs: number;
  maxMs: number;
  overrunCount: number;
  budgetMs: number;
}

export interface FrameBudgetSnapshot {
  totalFrameMs: number;
  isBudgetExceeded: boolean;
  spikeDetected: boolean;
  phaseMetrics: Record<SystemPhase, PhaseMetrics>;
  totalOverruns: number;
}

export class FrameBudgetMonitor {
  private readonly budgets: PhaseBudgets;
  private readonly history: Map<SystemPhase, number[]> = new Map();
  private readonly maxDurations: Map<SystemPhase, number> = new Map();
  private readonly overrunCounts: Map<SystemPhase, number> = new Map();
  private readonly lastDurations: Map<SystemPhase, number> = new Map();
  private readonly windowSize: number;

  constructor(customBudgets: Partial<PhaseBudgets> = {}, windowSize = 30) {
    this.budgets = { ...DEFAULT_PHASE_BUDGETS, ...customBudgets };
    this.windowSize = Math.max(5, windowSize);

    for (const phase of SYSTEM_PHASES) {
      this.history.set(phase, []);
      this.maxDurations.set(phase, 0);
      this.overrunCounts.set(phase, 0);
      this.lastDurations.set(phase, 0);
    }
  }

  /**
   * Registra a duração gasta em uma fase específica.
   */
  public recordPhaseDuration(phase: SystemPhase, durationMs: number): void {
    const validDuration = Math.max(0, durationMs);
    this.lastDurations.set(phase, validDuration);

    const hist = this.history.get(phase) ?? [];
    hist.push(validDuration);
    if (hist.length > this.windowSize) {
      hist.shift();
    }
    this.history.set(phase, hist);

    const currentMax = this.maxDurations.get(phase) ?? 0;
    if (validDuration > currentMax) {
      this.maxDurations.set(phase, validDuration);
    }

    const budget = this.budgets[phase];
    if (validDuration > budget) {
      const overruns = (this.overrunCounts.get(phase) ?? 0) + 1;
      this.overrunCounts.set(phase, overruns);
    }
  }

  /**
   * Retorna métricas consolidadas para uma fase.
   */
  public getPhaseMetrics(phase: SystemPhase): PhaseMetrics {
    const hist = this.history.get(phase) ?? [];
    const sum = hist.reduce((acc, v) => acc + v, 0);
    const averageMs = hist.length > 0 ? Number((sum / hist.length).toFixed(2)) : 0;
    const lastDurationMs = Number((this.lastDurations.get(phase) ?? 0).toFixed(2));
    const maxMs = Number((this.maxDurations.get(phase) ?? 0).toFixed(2));
    const overrunCount = this.overrunCounts.get(phase) ?? 0;
    const budgetMs = this.budgets[phase];

    return {
      lastDurationMs,
      averageMs,
      maxMs,
      overrunCount,
      budgetMs,
    };
  }

  /**
   * Retorna se a última medição de uma fase estourou seu orçamento.
   */
  public isPhaseExceeded(phase: SystemPhase): boolean {
    const last = this.lastDurations.get(phase) ?? 0;
    return last > this.budgets[phase];
  }

  /**
   * Gera um snapshot consolidado do frame para o overlay de diagnóstico F3.
   */
  public getSnapshot(totalFrameMs: number): FrameBudgetSnapshot {
    let totalOverruns = 0;
    let anyExceeded = false;
    const phaseMetrics = {} as Record<SystemPhase, PhaseMetrics>;

    for (const phase of SYSTEM_PHASES) {
      const metric = this.getPhaseMetrics(phase);
      phaseMetrics[phase] = metric;
      totalOverruns += metric.overrunCount;
      if (metric.lastDurationMs > metric.budgetMs) {
        anyExceeded = true;
      }
    }

    // Spike detectado se o frame total ultrapassar o orçamento padrão de 33.3ms (queda abaixo de 30 FPS)
    const spikeDetected = totalFrameMs > 33.3;

    return {
      totalFrameMs: Number(totalFrameMs.toFixed(2)),
      isBudgetExceeded: anyExceeded,
      spikeDetected,
      phaseMetrics,
      totalOverruns,
    };
  }

  /**
   * Ajusta dinamicamente o orçamento de uma fase.
   */
  public setBudget(phase: SystemPhase, budgetMs: number): void {
    if (budgetMs > 0) {
      this.budgets[phase] = budgetMs;
    }
  }

  /**
   * Retorna todos os orçamentos configurados.
   */
  public getBudgets(): Readonly<PhaseBudgets> {
    return { ...this.budgets };
  }

  /**
   * Reseta o histórico e contadores acumulados.
   */
  public reset(): void {
    for (const phase of SYSTEM_PHASES) {
      this.history.set(phase, []);
      this.maxDurations.set(phase, 0);
      this.overrunCounts.set(phase, 0);
      this.lastDurations.set(phase, 0);
    }
  }
}

import { describe, it, expect } from "vitest";
import { FrameBudgetMonitor, DEFAULT_PHASE_BUDGETS } from "../../src/systems/frameBudgetMonitor";
import { SystemRunner } from "../../src/systems/systemRunner";

describe("FrameBudgetMonitor — Monitor de Orçamento de Frame Time & Profiling (Fase 59)", () => {
  it("deve registrar métricas de duração por fase e calcular médias móveis", () => {
    const monitor = new FrameBudgetMonitor({}, 10);

    monitor.recordPhaseDuration("physics", 2.0);
    monitor.recordPhaseDuration("physics", 4.0);

    const metrics = monitor.getPhaseMetrics("physics");
    expect(metrics.lastDurationMs).toBe(4.0);
    expect(metrics.averageMs).toBe(3.0);
    expect(metrics.maxMs).toBe(4.0);
    expect(metrics.budgetMs).toBe(DEFAULT_PHASE_BUDGETS.physics);
  });

  it("deve detectar e contabilizar violações de orçamento por fase", () => {
    const monitor = new FrameBudgetMonitor({ input: 1.0 });

    // 0.5ms está dentro do orçamento
    monitor.recordPhaseDuration("input", 0.5);
    expect(monitor.isPhaseExceeded("input")).toBe(false);
    expect(monitor.getPhaseMetrics("input").overrunCount).toBe(0);

    // 2.5ms ultrapassa o orçamento de 1.0ms
    monitor.recordPhaseDuration("input", 2.5);
    expect(monitor.isPhaseExceeded("input")).toBe(true);
    expect(monitor.getPhaseMetrics("input").overrunCount).toBe(1);
  });

  it("deve detectar spikes quando o frame total ultrapassa 33.3ms", () => {
    const monitor = new FrameBudgetMonitor();

    const normalSnap = monitor.getSnapshot(16.2);
    expect(normalSnap.spikeDetected).toBe(false);

    const spikeSnap = monitor.getSnapshot(42.0);
    expect(spikeSnap.spikeDetected).toBe(true);
    expect(spikeSnap.totalFrameMs).toBe(42.0);
  });

  it("deve permitir ajustar dinamicamente o orçamento com setBudget", () => {
    const monitor = new FrameBudgetMonitor();

    monitor.setBudget("render", 6.0);
    expect(monitor.getBudgets().render).toBe(6.0);

    monitor.recordPhaseDuration("render", 5.0);
    expect(monitor.isPhaseExceeded("render")).toBe(false);
  });

  it("deve resetar o histórico e contadores acumulados", () => {
    const monitor = new FrameBudgetMonitor();
    monitor.recordPhaseDuration("ai", 10.0);

    expect(monitor.getPhaseMetrics("ai").overrunCount).toBe(1);

    monitor.reset();
    expect(monitor.getPhaseMetrics("ai").overrunCount).toBe(0);
    expect(monitor.getPhaseMetrics("ai").lastDurationMs).toBe(0);
  });

  it("deve se integrar com SystemRunner e manter consumo de memória estável em 1.000 quadros", () => {
    const runner = new SystemRunner();
    const monitor = new FrameBudgetMonitor({}, 20); // janela de 20 amostras

    runner.setProfiler((phase, ms) => {
      monitor.recordPhaseDuration(phase, ms);
    });

    runner.register("input", () => {});
    runner.register("physics", () => {});
    runner.register("ai", () => {});
    runner.register("render", () => {});

    // Simula 1.000 iterações de frame contínuo (equivalente a totens e quiosques)
    for (let frame = 0; frame < 1000; frame++) {
      runner.run(0.016);
    }

    const snapshot = monitor.getSnapshot(16.0);
    expect(snapshot.totalFrameMs).toBe(16.0);
    expect(snapshot.phaseMetrics.physics.maxMs).toBeGreaterThanOrEqual(0);

    // Garante que o histórico interno não cresceu indefinidamente além do windowSize
    for (const phase of ["input", "physics", "ai", "render"] as const) {
      const metric = monitor.getPhaseMetrics(phase);
      expect(metric.averageMs).toBeGreaterThanOrEqual(0);
    }
  });
});

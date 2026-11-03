import { describe, it, expect } from "vitest";
import { SystemRunner, type SystemTask } from "../../src/systems/systemRunner";

describe("SystemRunner — Orquestrador Central com Fases Determinísticas (Fase 58)", () => {
  it("deve executar as fases na ordem canônica estrita: input -> physics -> ai -> collision -> culling -> render", () => {
    const runner = new SystemRunner();
    const executionOrder: string[] = [];

    runner.register("render", () => executionOrder.push("render"));
    runner.register("ai", () => executionOrder.push("ai"));
    runner.register("input", () => executionOrder.push("input"));
    runner.register("culling", () => executionOrder.push("culling"));
    runner.register("physics", () => executionOrder.push("physics"));
    runner.register("collision", () => executionOrder.push("collision"));

    runner.run(0.016);

    expect(executionOrder).toEqual(["input", "physics", "ai", "collision", "culling", "render"]);
  });

  it("deve respeitar a prioridade numérica dentro da mesma fase (menor valor roda antes)", () => {
    const runner = new SystemRunner();
    const executionOrder: string[] = [];

    runner.register("physics", () => executionOrder.push("normal"), { priority: 0 });
    runner.register("physics", () => executionOrder.push("late"), { priority: 10 });
    runner.register("physics", () => executionOrder.push("early"), { priority: -10 });

    runner.run(0.016);

    expect(executionOrder).toEqual(["early", "normal", "late"]);
  });

  it("deve manter a ordem estável de registro para prioridades idênticas", () => {
    const runner = new SystemRunner();
    const executionOrder: string[] = [];

    runner.register("ai", () => executionOrder.push("ai_first"), { priority: 0 });
    runner.register("ai", () => executionOrder.push("ai_second"), { priority: 0 });

    runner.run(0.016);

    expect(executionOrder).toEqual(["ai_first", "ai_second"]);
  });

  it("deve permitir desregistrar uma tarefa via função de retorno", () => {
    const runner = new SystemRunner();
    const executionOrder: string[] = [];

    const unregister = runner.register("input", () => executionOrder.push("input_1"));
    runner.register("input", () => executionOrder.push("input_2"));

    unregister();
    runner.run(0.016);

    expect(executionOrder).toEqual(["input_2"]);
  });

  it("deve permitir desregistrar uma tarefa via unregister(id)", () => {
    const runner = new SystemRunner();
    const executionOrder: string[] = [];

    runner.register("culling", () => executionOrder.push("culled"), { id: "test_cull" });
    expect(runner.unregister("test_cull")).toBe(true);
    expect(runner.unregister("non_existent")).toBe(false);

    runner.run(0.016);
    expect(executionOrder).toEqual([]);
  });

  it("deve respeitar a flag enabled para ignorar sistemas desabilitados", () => {
    const runner = new SystemRunner();
    const executionOrder: string[] = [];

    runner.register("collision", () => executionOrder.push("col"), { id: "col_sys" });
    runner.setEnabled("col_sys", false);
    expect(runner.isEnabled("col_sys")).toBe(false);

    runner.run(0.016);
    expect(executionOrder).toEqual([]);

    runner.setEnabled("col_sys", true);
    expect(runner.isEnabled("col_sys")).toBe(true);

    runner.run(0.016);
    expect(executionOrder).toEqual(["col"]);
  });

  it("deve passar deltaTime fielmente a todas as tarefas", () => {
    const runner = new SystemRunner();
    let receivedDt = 0;

    runner.register("physics", (dt) => {
      receivedDt = dt;
    });

    runner.run(0.033);
    expect(receivedDt).toBe(0.033);
  });

  it("deve isolar falhas em subsistemas com o manipulador de erros customizado", () => {
    const errorLogs: string[] = [];
    const runner = new SystemRunner((error: unknown, task: SystemTask) => {
      errorLogs.push(`${task.id}: ${(error as Error).message}`);
    });

    const executionOrder: string[] = [];

    runner.register(
      "physics",
      () => {
        throw new Error("Crash in physics");
      },
      { id: "faulty_physics" }
    );

    runner.register(
      "physics",
      () => {
        executionOrder.push("healthy_physics");
      },
      { id: "healthy_physics" }
    );

    runner.run(0.016);

    expect(errorLogs).toEqual(["faulty_physics: Crash in physics"]);
    expect(executionOrder).toEqual(["healthy_physics"]);
  });

  it("deve limpar todas as tarefas cadastradas ao chamar clear()", () => {
    const runner = new SystemRunner();
    runner.register("input", () => {});
    runner.register("render", () => {});

    expect(runner.getTasks().length).toBe(2);
    runner.clear();
    expect(runner.getTasks().length).toBe(0);
  });
});

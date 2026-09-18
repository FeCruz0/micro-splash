import { describe, it, expect, beforeEach } from "vitest";
import { createGameState } from "../src/systems/state";

describe("createGameState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("inicializa com valores padrão no modo standard", () => {
    const state = createGameState({ mode: "standard" });
    expect(state.getMode()).toBe("standard");
    expect(state.getDistance()).toBe(0);
    expect(state.getKrillCount()).toBe(0);
    expect(state.getTrashCount()).toBe(0);
    expect(state.getElapsedTime()).toBe(0);
    expect(state.hasBreached()).toBe(false);
  });

  it("inicializa no modo sereno e reflete nas sabedorias", () => {
    const state = createGameState({ mode: "serene" });
    expect(state.getMode()).toBe("serene");
    expect(state.getAncestralWisdom()).toContain("Guardiã Serena");
  });

  it("inicializa no modo quick_challenge e controla tempo", () => {
    const state = createGameState({ mode: "quick_challenge", timeLimit: 60 });
    expect(state.getMode()).toBe("quick_challenge");
    expect(state.getTimeRemaining()).toBe(60);
    expect(state.isTimeUp()).toBe(false);

    state.update(60, 500);
    expect(state.isTimeUp()).toBe(true);
    expect(state.getAncestralWisdom()).toContain("Campeã Veloz");
  });

  it("computa progresso de distância e contadores de itens", () => {
    const state = createGameState();
    state.update(1.5, 1250.8);
    expect(state.getDistance()).toBe(1250);
    expect(state.getElapsedTime()).toBe(1);

    state.addKrill();
    state.addKrill();
    expect(state.getKrillCount()).toBe(2);

    state.addTrash();
    expect(state.getTrashCount()).toBe(1);
  });

  it("calcula pontuação final e bônus do salto majestoso (Breach)", () => {
    const state = createGameState();
    state.update(10, 5000);
    state.addKrill(); // +100
    state.addTrash(); // -150

    // 5000 + 100 - 150 = 4950
    expect(state.calculateFinalScore()).toBe(4950);

    state.triggerBreach(); // +500
    // 5000 + 100 - 150 + 500 = 5450
    expect(state.calculateFinalScore()).toBe(5450);
  });

  it("atualiza e persiste o high score no localStorage", () => {
    const state = createGameState();
    state.update(5, 3000);
    const score = state.calculateFinalScore();
    expect(score).toBe(3000);
    expect(localStorage.getItem("micro_splash_highscore")).toBe("3000");
  });

  it("calcula bônus do filhote (Calf Escort +300 pts) e títulos ancestrais de Arraial", () => {
    const state = createGameState();
    state.update(20, 30000);
    expect(state.hasEscortedCalf()).toBe(false);

    state.triggerCalfEscort();
    expect(state.hasEscortedCalf()).toBe(true);

    // 30000 + 300 (calf) = 30300
    expect(state.calculateFinalScore()).toBe(30300);

    state.triggerBreach(); // +500
    // 30000 + 300 + 500 = 30800
    expect(state.calculateFinalScore()).toBe(30800);
    expect(state.getAncestralWisdom()).toContain("Matriarca Protetora");

    state.addCalfRescue(); // +150
    expect(state.calculateFinalScore()).toBe(30950);
  });
});

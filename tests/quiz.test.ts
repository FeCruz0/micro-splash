import { describe, it, expect, beforeEach } from "vitest";
import factsData from "../data/facts.json";
import quizData from "../data/quiz.json";
import { createGameState } from "../src/systems/state";

describe("Expanded Scientific Facts (data/facts.json)", () => {
  it("contém exatamente 13 fatos científicos distribuídos pela rota migratória", () => {
    expect(factsData).toHaveLength(13);
  });

  it("cada fato possui id, triggerX válido, título, localização e descrição", () => {
    const ids = new Set<string>();
    factsData.forEach((fact, index) => {
      expect(fact.id).toBeTruthy();
      expect(ids.has(fact.id)).toBe(false);
      ids.add(fact.id);

      expect(typeof fact.triggerX).toBe("number");
      expect(fact.triggerX).toBeGreaterThanOrEqual(500);
      expect(fact.triggerX).toBeLessThanOrEqual(30000);

      expect(typeof fact.title).toBe("string");
      expect(fact.title.length).toBeGreaterThan(5);

      expect(typeof fact.location).toBe("string");
      expect(fact.location.length).toBeGreaterThan(5);

      expect(typeof fact.description).toBe("string");
      expect(fact.description.length).toBeGreaterThan(20);

      // Fatos devem estar ordenados de forma crescente por distância de trigger
      if (index > 0) {
        expect(fact.triggerX).toBeGreaterThan(factsData[index - 1].triggerX);
      }
    });
  });

  it("cobre pontos-chave como Antártica, Zona Abissal, Poluição e Arraial do Cabo", () => {
    const allTitles = factsData.map(f => f.title).join(" ");
    const allDescriptions = factsData.map(f => f.description).join(" ");
    expect(allTitles).toContain("Polar");
    expect(allTitles).toContain("Abissais");
    expect(allDescriptions.toLowerCase()).toContain("cachalote");
    expect(allTitles).toContain("Fantasma");
    expect(allTitles).toContain("Ressurgência");
    expect(allTitles).toContain("Arraial");
  });
});

describe("Interactive Quiz Questions (data/quiz.json)", () => {
  it("possui pelo menos 10 perguntas científicas de múltipla escolha", () => {
    expect(quizData.length).toBeGreaterThanOrEqual(10);
  });

  it("cada pergunta possui 4 opções, índice de resposta correta válido e explicação", () => {
    const questionIds = new Set<string>();
    quizData.forEach((q) => {
      expect(q.id).toBeTruthy();
      expect(questionIds.has(q.id)).toBe(false);
      questionIds.add(q.id);

      expect(q.factId).toBeTruthy();
      expect(typeof q.question).toBe("string");
      expect(q.question.length).toBeGreaterThan(10);

      expect(Array.isArray(q.options)).toBe(true);
      expect(q.options).toHaveLength(4);
      q.options.forEach((opt) => {
        expect(typeof opt).toBe("string");
        expect(opt.length).toBeGreaterThan(0);
      });

      expect(typeof q.correctIndex).toBe("number");
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);

      expect(typeof q.explanation).toBe("string");
      expect(q.explanation.length).toBeGreaterThan(15);
    });

    const indices = new Set(quizData.map((q) => q.correctIndex));
    expect(indices.has(0)).toBe(true);
    expect(indices.has(1)).toBe(true);
    expect(indices.has(2)).toBe(true);
    expect(indices.has(3)).toBe(true);
  });
});

describe("GameState Quiz Scoring and State Tracking", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("inicializa com quizScore e quizCorrectCount zerados", () => {
    const state = createGameState();
    expect(state.getQuizScore()).toBe(0);
    expect(state.getQuizCorrectCount()).toBe(0);
  });

  it("registra respostas corretas e acumula eco-pontos", () => {
    const state = createGameState();
    state.addQuizScore(100, true);
    expect(state.getQuizScore()).toBe(100);
    expect(state.getQuizCorrectCount()).toBe(1);

    state.addQuizScore(100, true);
    expect(state.getQuizScore()).toBe(200);
    expect(state.getQuizCorrectCount()).toBe(2);

    // Resposta errada
    state.addQuizScore(0, false);
    expect(state.getQuizScore()).toBe(200);
    expect(state.getQuizCorrectCount()).toBe(2);
  });

  it("incorpora a pontuação do quiz no cálculo do score final", () => {
    const state = createGameState();
    state.update(10, 5000);
    // Pontuação base = 5000
    expect(state.calculateFinalScore()).toBe(5000);

    // 3 acertos no quiz (+300)
    state.addQuizScore(100, true);
    state.addQuizScore(100, true);
    state.addQuizScore(100, true);

    expect(state.calculateFinalScore()).toBe(5300);
  });

  it("instâncias independentes de GameState mantêm pontuação isolada", () => {
    const state1 = createGameState();
    state1.addQuizScore(300, true);
    expect(state1.getQuizScore()).toBe(300);

    const state2 = createGameState();
    expect(state2.getQuizScore()).toBe(0);
    expect(state2.getQuizCorrectCount()).toBe(0);
  });
});

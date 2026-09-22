import { describe, it, expect, beforeEach } from "vitest";
import { createGameState } from "../src/systems/state";
import {
  extractVictoryCardData,
  getShareText,
  generateAndDownloadVictoryCard,
} from "../src/ui/victoryCard";

describe("Social Sharing & Certificate Generation (src/ui/victoryCard.ts)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("extrai dados completos para o cartão de vitória e compartilhamento", () => {
    const state = createGameState({ mode: "standard" });
    state.update(120, 30000);
    state.addKrill();
    state.addKrill();
    state.addTrash();
    state.triggerBreach();
    state.addQuizScore(300, true);

    const cardData = extractVictoryCardData(state, "Bióloga Clara");

    expect(cardData.playerName).toBe("Bióloga Clara");
    expect(cardData.finalScore).toBeGreaterThan(30000);
    expect(cardData.distance).toBe(30000);
    expect(cardData.elapsedTime).toBe(120);
    expect(cardData.krillCount).toBe(2);
    expect(cardData.trashCount).toBe(1);
    expect(cardData.hasBreached).toBe(true);
    expect(cardData.quizScore).toBe(300);
    expect(cardData.quizCorrectCount).toBe(1);
    expect(cardData.rank).toContain("RANK S");
    expect(cardData.dateStr).toBeTruthy();
  });

  it("gera texto formatado com emojis, estatísticas e hashtags para redes sociais", () => {
    const state = createGameState({ mode: "standard" });
    state.update(90, 25000);
    state.addQuizScore(200, true);

    const cardData = extractVictoryCardData(state, "Guardião");
    const text = getShareText(cardData);

    expect(text).toContain("🐋 Concluí a jornada da baleia-jubarte");
    expect(text).toContain("Eco-Score Final:");
    expect(text).toContain("Classificação:");
    expect(text).toContain("Distância:");
    expect(text).toContain("#MicroSplash");
    expect(text).toContain("#BaleiaJubarte");
    expect(text).toContain("#ConservacaoMarinha");
    expect(text).toContain("#ArraialDoCabo");
  });

  it("adapta o texto para o modo Desafio Rápido de 60s", () => {
    const state = createGameState({ mode: "quick_challenge", timeLimit: 60 });
    state.update(60, 4500);

    const cardData = extractVictoryCardData(state, "Veloz");
    const text = getShareText(cardData);

    expect(text).toContain("no Desafio Rápido de 60s");
  });

  it("generateAndDownloadVictoryCard retorna boolean sem lançar exceções não tratadas", () => {
    const state = createGameState();
    const cardData = extractVictoryCardData(state);
    const result = generateAndDownloadVictoryCard(cardData);
    expect(typeof result).toBe("boolean");
  });
});

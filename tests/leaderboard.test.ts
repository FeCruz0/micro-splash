import { describe, it, expect, beforeEach } from "vitest";
import {
  getTop10Entries,
  isTop10Score,
  addLeaderboardEntry,
  resetLeaderboard,
  DEFAULT_LEADERBOARD,
} from "../src/systems/leaderboard";

describe("Leaderboard System (Top 10 Arcade)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna as 10 pontuações padrão quando o armazenamento está vazio", () => {
    const entries = getTop10Entries();
    expect(entries).toHaveLength(10);
    expect(entries[0].initials).toBe("IBJ");
    expect(entries[0].score).toBe(4500);
    expect(entries[9].initials).toBe("KRL");
    expect(entries[9].score).toBe(1200);
  });

  it("valida elegibilidade para o Top 10 via isTop10Score", () => {
    // Menor score padrão é 1200
    expect(isTop10Score(0)).toBe(false);
    expect(isTop10Score(1000)).toBe(false);
    expect(isTop10Score(1200)).toBe(false);
    expect(isTop10Score(1201)).toBe(true);
    expect(isTop10Score(5000)).toBe(true);
  });

  it("adiciona novo recorde, sanitiza iniciais para 3 letras e reordena mantendo top 10", () => {
    const success = addLeaderboardEntry({
      initials: "pro",
      score: 5200,
      distance: 30000,
      mode: "standard",
      date: "18/09",
    });

    expect(success).toBe(true);
    const updated = getTop10Entries();
    expect(updated).toHaveLength(10);
    expect(updated[0].initials).toBe("PRO");
    expect(updated[0].score).toBe(5200);
    expect(updated[1].initials).toBe("IBJ"); // Antigo 1º agora é 2º
    // O antigo 10º (KRL: 1200) foi descartado
    expect(updated.find((e) => e.initials === "KRL")).toBeUndefined();
  });

  it("sanitiza iniciais com caracteres inválidos ou comprimento incorreto", () => {
    addLeaderboardEntry({
      initials: "a!b@c#d",
      score: 9999,
      distance: 30000,
      mode: "standard",
      date: "18/09",
    });

    const updated = getTop10Entries();
    expect(updated[0].initials).toBe("AAB"); // Letras válidas limitadas a 3
  });

  it("persiste dados em localStorage e restaura corretamente", () => {
    addLeaderboardEntry({
      initials: "WIN",
      score: 6000,
      distance: 30000,
      mode: "quick_challenge",
      date: "18/09",
    });

    const storedRaw = localStorage.getItem("micro_splash_top10");
    expect(storedRaw).toBeTruthy();
    const stored = JSON.parse(storedRaw!);
    expect(stored[0].initials).toBe("WIN");
    expect(stored[0].score).toBe(6000);

    resetLeaderboard();
    expect(getTop10Entries()[0].initials).toBe(DEFAULT_LEADERBOARD[0].initials);
  });
});

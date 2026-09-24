import { describe, it, expect, beforeEach } from "vitest";
import {
  getIsoWeek,
  stringToSeed,
  getWeeklyChallengeInfo,
  getWeeklyTop10Entries,
  addWeeklyLeaderboardEntry,
} from "../src/systems/weeklyChallenge";
import { generateProceduralLayout } from "../src/systems/proceduralObstacles";

describe("Weekly Challenge System (Fase 22)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calcula a semana ISO-8601 corretamente para datas conhecidas", () => {
    // 24 de setembro de 2026 é uma quinta-feira da Semana 39 de 2026
    const date = new Date(2026, 8, 24); // Mês 8 = Setembro
    const iso = getIsoWeek(date);
    expect(iso.year).toBe(2026);
    expect(iso.week).toBe(39);
  });

  it("gera sementes numéricas estáveis e determinísticas a partir de chaves semanais", () => {
    const seed1 = stringToSeed("2026-W39");
    const seed2 = stringToSeed("2026-W39");
    const seedOther = stringToSeed("2026-W40");

    expect(seed1).toBe(seed2);
    expect(seed1).toBeGreaterThan(0);
    expect(seed1).not.toBe(seedOther);
  });

  it("constrói informações completas do desafio semanal com expiração e dias restantes", () => {
    const testDate = new Date(2026, 8, 24, 12, 0, 0);
    const info = getWeeklyChallengeInfo(testDate);

    expect(info.weekKey).toBe("2026-W39");
    expect(info.weekLabel).toContain("Semana 39");
    expect(info.seed).toBeGreaterThan(0);
    expect(info.daysLeft).toBeGreaterThanOrEqual(0);
    expect(info.daysLeft).toBeLessThanOrEqual(7);
    expect(info.expiresAt.getTime()).toBeGreaterThan(testDate.getTime());
  });

  it("isola rankings semanais no localStorage por weekKey", () => {
    addWeeklyLeaderboardEntry(
      { initials: "SEM", score: 5000, distance: 30000, mode: "weekly", date: "24/09" },
      "2026-W39"
    );

    addWeeklyLeaderboardEntry(
      { initials: "NOV", score: 6000, distance: 30000, mode: "weekly", date: "01/10" },
      "2026-W40"
    );

    const week39 = getWeeklyTop10Entries("2026-W39");
    const week40 = getWeeklyTop10Entries("2026-W40");

    expect(week39[0].initials).toBe("SEM");
    expect(week39[0].score).toBe(5000);

    expect(week40[0].initials).toBe("NOV");
    expect(week40[0].score).toBe(6000);
  });

  it("garante determinismo absoluto na geração procedural de obstáculos com a semente semanal", () => {
    const info = getWeeklyChallengeInfo(new Date(2026, 8, 24));
    const layout1 = generateProceduralLayout(info.seed, 720);
    const layout2 = generateProceduralLayout(info.seed, 720);

    expect(layout1.krillPositions).toEqual(layout2.krillPositions);
    expect(layout1.trashPositions).toEqual(layout2.trashPositions);
    expect(layout1.netPositions).toEqual(layout2.netPositions);
    expect(layout1.bubbleVentPositions).toEqual(layout2.bubbleVentPositions);
    expect(layout1.currentZones).toEqual(layout2.currentZones);
  });
});

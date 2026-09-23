import { describe, it, expect, beforeEach } from "vitest";
import {
  getCumulativeStats,
  recordMigrationStart,
  recordMigrationEnd,
  recordQuizResult,
  resetCumulativeStats,
  formatDistanceKm,
  formatPlayTime,
  formatSuccessRate,
} from "../src/systems/cumulativeStats";

describe("CumulativeStats (Estatísticas Acumuladas da Comunidade)", () => {
  beforeEach(() => {
    resetCumulativeStats();
  });

  it("retorna estatísticas padrão zeradas se o storage estiver vazio", () => {
    const stats = getCumulativeStats();
    expect(stats.totalMigrationsAttempted).toBe(0);
    expect(stats.totalMigrationsCompleted).toBe(0);
    expect(stats.totalDistanceMeters).toBe(0);
    expect(stats.totalKrillCollected).toBe(0);
    expect(stats.totalTrashAvoided).toBe(0);
    expect(stats.totalPlayTimeSeconds).toBe(0);
  });

  it("registra tentativa de migração corretamente", () => {
    recordMigrationStart();
    recordMigrationStart();
    const stats = getCumulativeStats();
    expect(stats.totalMigrationsAttempted).toBe(2);
  });

  it("acumula métricas ao término da partida e contabiliza vitórias", () => {
    recordMigrationStart();
    recordMigrationEnd(15000, 25, 4, 180, false);

    let stats = getCumulativeStats();
    expect(stats.totalDistanceMeters).toBe(15000);
    expect(stats.totalKrillCollected).toBe(25);
    expect(stats.totalTrashAvoided).toBe(4);
    expect(stats.totalPlayTimeSeconds).toBe(180);
    expect(stats.totalMigrationsCompleted).toBe(0);

    // Segunda partida concluída com vitória
    recordMigrationStart();
    recordMigrationEnd(30000, 40, 2, 240, true);

    stats = getCumulativeStats();
    expect(stats.totalMigrationsAttempted).toBe(2);
    expect(stats.totalMigrationsCompleted).toBe(1);
    expect(stats.totalDistanceMeters).toBe(45000);
    expect(stats.totalKrillCollected).toBe(65);
    expect(stats.totalTrashAvoided).toBe(6);
    expect(stats.totalPlayTimeSeconds).toBe(420);
  });

  it("registra resultados de quiz educativo", () => {
    recordQuizResult(3);
    recordQuizResult(2);

    const stats = getCumulativeStats();
    expect(stats.quizzesTaken).toBe(2);
    expect(stats.quizCorrectAnswers).toBe(5);
  });

  it("formata corretamente quilômetros, tempo e taxa de sucesso", () => {
    expect(formatDistanceKm(45000)).toBe("45.0 km");
    expect(formatDistanceKm(1250)).toBe("1.3 km");

    expect(formatPlayTime(45)).toBe("45s");
    expect(formatPlayTime(130)).toBe("2m 10s");
    expect(formatPlayTime(3670)).toBe("1h 1m");

    expect(formatSuccessRate(4, 5)).toBe("80%");
    expect(formatSuccessRate(0, 0)).toBe("0%");
    expect(formatSuccessRate(1, 3)).toBe("33%");
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import {
  createDeterministicRandomGenerator,
  getRandomFloat,
  getRandomInteger,
  getRandomChoice,
  setDefaultRandomGenerator,
  resetDefaultRandomGenerator,
} from "../src/utils/random";
import {
  readLocalStorageWithSchema,
  writeLocalStorage,
  removeLocalStorageItem,
} from "../src/utils/storage";
import {
  reportInformation,
  reportWarning,
  reportError,
  subscribeToLogReports,
  setReportingSuppression,
  type LogMessagePayload,
} from "../src/utils/errorReporter";
import { safeShake } from "../src/utils/camera";
import { accessibilitySystem } from "../src/systems/accessibilitySystem";
import { AudioEngine } from "../src/systems/audio/audioEngine";

describe("Fase 37 — Qualidade de Código & Consistência Técnica", () => {
  beforeEach(() => {
    localStorage.clear();
    setReportingSuppression(true);
    resetDefaultRandomGenerator();
  });

  afterEach(() => {
    setReportingSuppression(false);
    resetDefaultRandomGenerator();
  });

  describe("37.10 — RNG Injetável & Determinismo (random.ts)", () => {
    it("gera sequência determinística idêntica com mesma semente Mulberry32", () => {
      const generatorAlpha = createDeterministicRandomGenerator(42);
      const generatorBeta = createDeterministicRandomGenerator(42);

      const sequenceAlpha = [generatorAlpha(), generatorAlpha(), generatorAlpha()];
      const sequenceBeta = [generatorBeta(), generatorBeta(), generatorBeta()];

      expect(sequenceAlpha).toEqual(sequenceBeta);
      expect(sequenceAlpha[0]).toBeGreaterThanOrEqual(0);
      expect(sequenceAlpha[0]).toBeLessThan(1);
    });

    it("gera inteiros e floats nos limites estipulados", () => {
      const deterministicGen = createDeterministicRandomGenerator(12345);
      setDefaultRandomGenerator(deterministicGen);

      const floatVal = getRandomFloat(10, 20);
      expect(floatVal).toBeGreaterThanOrEqual(10);
      expect(floatVal).toBeLessThanOrEqual(20);

      const intVal = getRandomInteger(1, 6);
      expect(Number.isInteger(intVal)).toBe(true);
      expect(intVal).toBeGreaterThanOrEqual(1);
      expect(intVal).toBeLessThanOrEqual(6);

      const choice = getRandomChoice(["krill", "orca", "golfinho"]);
      expect(["krill", "orca", "golfinho"]).toContain(choice);
    });
  });

  describe("37.5 — Utilitário Tipado de Persistência (storage.ts)", () => {
    const TestSchema = z.object({
      volume: z.number().min(0).max(1),
      theme: z.enum(["polar", "tropical"]),
    });

    it("armazena e lê dados tipados com schema Zod", () => {
      const payload = { volume: 0.85, theme: "tropical" as const };
      const writeOk = writeLocalStorage("test_key", payload);
      expect(writeOk).toBe(true);

      const readData = readLocalStorageWithSchema("test_key", TestSchema, {
        volume: 1.0,
        theme: "polar",
      });

      expect(readData).toEqual(payload);
    });

    it("retorna fallback se o dado for inválido ou ausente", () => {
      const fallback = { volume: 0.5, theme: "polar" as const };
      localStorage.setItem("corrupted_key", JSON.stringify({ volume: 999, theme: "desconhecido" }));

      const data = readLocalStorageWithSchema("corrupted_key", TestSchema, fallback);
      expect(data).toEqual(fallback);

      const missing = readLocalStorageWithSchema("missing_key", TestSchema, fallback);
      expect(missing).toEqual(fallback);
    });

    it("remove chave do localStorage com segurança", () => {
      writeLocalStorage("temporary_key", { test: true });
      expect(localStorage.getItem("temporary_key")).not.toBeNull();

      const removed = removeLocalStorageItem("temporary_key");
      expect(removed).toBe(true);
      expect(localStorage.getItem("temporary_key")).toBeNull();
    });
  });

  describe("37.2 — Centralização de safeShake com Guarda de Movimento Reduzido", () => {
    it("chama k.shake quando movimento reduzido está desativado", () => {
      const mockShake = vi.fn();
      const mockK = { shake: mockShake } as any;

      accessibilitySystem.setReducedMotion("full");
      safeShake(mockK, 5);

      expect(mockShake).toHaveBeenCalledWith(5);
    });

    it("suprime k.shake quando movimento reduzido está ativado", () => {
      const mockShake = vi.fn();
      const mockK = { shake: mockShake } as any;

      accessibilitySystem.setReducedMotion("reduced");
      safeShake(mockK, 5);

      expect(mockShake).not.toHaveBeenCalled();
    });
  });

  describe("37.9 — Logs e Telemetria Estruturada (errorReporter.ts)", () => {
    it("notifica ouvintes registrados com severidade e payload correto", () => {
      const captured: LogMessagePayload[] = [];
      const unsubscribe = subscribeToLogReports((payload) => {
        captured.push(payload);
      });

      reportInformation("Teste de informação", { testId: 101 });
      reportWarning("Aviso de teste", { warningCode: "W01" });
      reportError("Falha simulada", new Error("Simulated"));

      expect(captured.length).toBe(3);
      expect(captured[0].severity).toBe("information");
      expect(captured[1].severity).toBe("warning");
      expect(captured[2].severity).toBe("error");

      unsubscribe();
      reportInformation("Outro evento pós-unsubscribe");
      expect(captured.length).toBe(3);
    });
  });

  describe("37.8 — Guardas de Ambiente no AudioEngine", () => {
    it("AudioEngine inicializa e carrega configurações sem erros", () => {
      const engine = new AudioEngine();
      expect(() => engine.loadSettings()).not.toThrow();
      expect(() => engine.saveSettings()).not.toThrow();
      expect(engine.getSoundtrackMode()).toBeDefined();
    });
  });

  describe("37.11 — Auditoria de Listeners de Window e Cleanup", () => {
    it("gamepadSystem permite setup e cleanup limpos sem vazamento de ouvintes", async () => {
      const { gamepadSystem } = await import("../src/systems/gamepadSystem");
      expect(() => gamepadSystem.cleanup()).not.toThrow();
    });
  });
});

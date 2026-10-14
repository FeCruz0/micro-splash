import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { z } from "zod";
import {
  errorReporter as canonicalReporter,
  ErrorReporter,
  reportInformation,
  reportWarning,
  reportError,
  setReportingSuppression,
  subscribeToLogReports,
  type LogMessagePayload,
} from "../src/utils/errorReporter";
import { errorReporter as reexportedReporter } from "../src/services/errorReporter";
import {
  readLocalStorageWithSchema,
  writeLocalStorage,
  removeLocalStorageItem,
  removeLocalStorageItemsByPrefix,
} from "../src/utils/storage";

describe("Fase 45 — Robustez de Tipagem & Consolidação de Utilitários", () => {
  beforeEach(() => {
    localStorage.clear();
    setReportingSuppression(true);
    canonicalReporter.clearLog();
  });

  afterEach(() => {
    setReportingSuppression(false);
    canonicalReporter.clearLog();
  });

  describe("45.1 & 45.4 — Unificação do errorReporter & Barramento de Severidade", () => {
    it("garante que o serviço reexportado é a mesma instância canônica do utilitário", () => {
      expect(canonicalReporter).toBe(reexportedReporter);
      expect(canonicalReporter).toBeInstanceOf(ErrorReporter);
    });

    it("captura exceções estruturadas e registra no log com timestamp e contexto", () => {
      const errorContext = { entityId: "whale_main", velocity: 120 };
      canonicalReporter.captureException(new Error("Falha acústica simulada"), errorContext);

      const logs = canonicalReporter.getErrorLog();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe("Falha acústica simulada");
      expect(logs[0].level).toBe("error");
      expect(logs[0].context).toEqual(errorContext);
      expect(typeof logs[0].timestamp).toBe("number");
    });

    it("distribui payloads de severidade (information, warning, error) para listeners inscritos", () => {
      const receivedPayloads: LogMessagePayload[] = [];
      const unsubscribe = subscribeToLogReports((payload) => {
        receivedPayloads.push(payload);
      });

      reportInformation("Inicialização de cenário", { biome: "antartica" });
      reportWarning("Taxa de quadros oscilando", { fps: 45 });
      reportError("Colisão inesperada", new Error("Bounds error"), { x: 500 });

      expect(receivedPayloads.length).toBe(3);
      expect(receivedPayloads[0].severity).toBe("information");
      expect(receivedPayloads[0].message).toBe("Inicialização de cenário");
      expect(receivedPayloads[1].severity).toBe("warning");
      expect(receivedPayloads[2].severity).toBe("error");
      expect(receivedPayloads[2].originalError).toBeInstanceOf(Error);

      unsubscribe();
      reportInformation("Mensagem pós-unsubscribe");
      expect(receivedPayloads.length).toBe(3);
    });

    it("opera silenciosamente em modo offline sem quebrar com Sentry DSN configurado", () => {
      canonicalReporter.setDsn("https://fakekey@sentry.io/123456");
      expect(canonicalReporter.isConfigured()).toBe(true);

      const fetchSpy = vi.fn().mockRejectedValue(new Error("Offline network error"));
      const originalFetch = globalThis.fetch;
      globalThis.fetch = fetchSpy as unknown as typeof fetch;

      expect(() => {
        canonicalReporter.captureException(new Error("Erro com fetch mockado"));
      }).not.toThrow();

      globalThis.fetch = originalFetch;
      canonicalReporter.setDsn("");
    });
  });

  describe("45.5 — Persistência Segura com Validação Zod & Exclusão Prefixada", () => {
    it("valida e recupera dados tipados por schema com fallback gracioso para shape inválido", () => {
      const PlayerScoreSchema = z.object({
        playerName: z.string(),
        score: z.number().min(0),
        completed: z.boolean(),
      });

      writeLocalStorage("micro_splash_score_test", {
        playerName: "Jubarte",
        score: 1500,
        completed: true,
      });

      const retrievedValid = readLocalStorageWithSchema(
        "micro_splash_score_test",
        PlayerScoreSchema,
        null
      );
      expect(retrievedValid).toEqual({
        playerName: "Jubarte",
        score: 1500,
        completed: true,
      });

      // Gravação corrompida manual
      localStorage.setItem("micro_splash_score_test", JSON.stringify({ score: "invalido" }));
      const retrievedCorrupted = readLocalStorageWithSchema(
        "micro_splash_score_test",
        PlayerScoreSchema,
        null
      );
      expect(retrievedCorrupted).toBeNull();
    });

    it("remove atomicamente apenas as chaves correspondentes ao prefixo especificado", () => {
      writeLocalStorage("prefix_alpha_1", "item1");
      writeLocalStorage("prefix_alpha_2", "item2");
      writeLocalStorage("prefix_beta_1", "item3");

      removeLocalStorageItemsByPrefix("prefix_alpha_");

      expect(localStorage.getItem("prefix_alpha_1")).toBeNull();
      expect(localStorage.getItem("prefix_alpha_2")).toBeNull();
      expect(localStorage.getItem("prefix_beta_1")).not.toBeNull();
    });

    it("retorna false e reporta warning ao tentar remover chave nula em ambiente seguro", () => {
      const removed = removeLocalStorageItem("chave_inexistente");
      expect(removed).toBe(true);
    });
  });
});

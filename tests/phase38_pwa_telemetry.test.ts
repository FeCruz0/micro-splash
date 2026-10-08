import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  initPwaManager,
  cleanupPwaManager,
  canInstallPwa,
  isOnline,
  subscribeToNetworkStatusChange,
} from "../src/utils/pwaManager";
import { hasUpdateAvailable, skipWaitingAndReload } from "../src/utils/swManager";
import { telemetrySystem } from "../src/systems/telemetrySystem";
import { getKioskIdleTimeoutSeconds, setKioskIdleTimeoutSeconds } from "../src/systems/kioskMode";

describe("Fase 38 — PWA Offline Avançado & Telemetria Educativa", () => {
  beforeEach(() => {
    localStorage.clear();
    telemetrySystem.reset();
    initPwaManager();
  });

  afterEach(() => {
    cleanupPwaManager();
  });

  describe("38.1 — Gerenciador PWA e Monitoramento de Conectividade (pwaManager.ts)", () => {
    it("inicializa e limpa ouvintes sem exceções em ambiente headless", () => {
      expect(() => initPwaManager()).not.toThrow();
      expect(() => cleanupPwaManager()).not.toThrow();
    });

    it("reporta status de instalação e rede padrão", () => {
      expect(typeof canInstallPwa()).toBe("boolean");
      expect(typeof isOnline()).toBe("boolean");
    });

    it("permite registrar e cancelar inscrição de status de rede", () => {
      let capturedStatus: boolean | null = null;
      const unsubscribe = subscribeToNetworkStatusChange((online) => {
        capturedStatus = online;
      });

      expect(typeof unsubscribe).toBe("function");
      unsubscribe();
      expect(capturedStatus).toBeNull();
    });
  });

  describe("38.2 — Gestão de Service Worker e Atualizações (swManager.ts)", () => {
    it("informa se há atualizações pendentes sem falhas", () => {
      expect(hasUpdateAvailable()).toBe(false);
    });

    it("executa rotina de skipWaitingAndReload sem lançar erro", () => {
      expect(() => skipWaitingAndReload()).not.toThrow();
    });
  });

  describe("38.3 — Telemetria Educativa Local & Métrica de Conscientização (telemetrySystem.ts)", () => {
    it("inicializa com valores zerados e estrutura completa", () => {
      const metrics = telemetrySystem.getMetrics();
      expect(metrics.factsReadCount).toBe(0);
      expect(metrics.factsReadIds).toEqual([]);
      expect(metrics.quizzesAnsweredCount).toBe(0);
      expect(metrics.quizzesCorrectCount).toBe(0);
      expect(metrics.plasticTrashCleanedCount).toBe(0);
      expect(metrics.expeditionsCompletedCount).toBe(0);
    });

    it("registra leitura de fatos pedagógicos únicos", () => {
      telemetrySystem.recordFactRead("fact_orca");
      telemetrySystem.recordFactRead("fact_krill");
      telemetrySystem.recordFactRead("fact_orca"); // Id duplicado

      const metrics = telemetrySystem.getMetrics();
      expect(metrics.factsReadCount).toBe(2);
      expect(metrics.factsReadIds).toEqual(["fact_orca", "fact_krill"]);
    });

    it("registra respostas de quizzes e acertos", () => {
      telemetrySystem.recordQuizAnswer(true);
      telemetrySystem.recordQuizAnswer(false);
      telemetrySystem.recordQuizAnswer(true);

      const metrics = telemetrySystem.getMetrics();
      expect(metrics.quizzesAnsweredCount).toBe(3);
      expect(metrics.quizzesCorrectCount).toBe(2);
    });

    it("registra limpeza de plásticos e expedições concluídas", () => {
      telemetrySystem.recordPlasticTrashCleaned(5);
      telemetrySystem.recordExpeditionCompleted();

      const metrics = telemetrySystem.getMetrics();
      expect(metrics.plasticTrashCleanedCount).toBe(5);
      expect(metrics.expeditionsCompletedCount).toBe(1);
    });

    it("calcula índice de impacto pedagógico composto", () => {
      telemetrySystem.recordFactRead("fact_1"); // +4
      telemetrySystem.recordQuizAnswer(true); // +6
      telemetrySystem.recordPlasticTrashCleaned(2); // +4
      telemetrySystem.recordExpeditionCompleted(); // +20

      const score = telemetrySystem.calculateEducationalImpactScore();
      expect(score).toBe(4 + 6 + 4 + 20); // 34
    });

    it("reseta dados ao invocar reset()", () => {
      telemetrySystem.recordFactRead("fact_reset");
      telemetrySystem.reset();

      const metrics = telemetrySystem.getMetrics();
      expect(metrics.factsReadCount).toBe(0);
      expect(metrics.factsReadIds).toEqual([]);
    });
  });

  describe("38.4 — Configuração de Tempo de Inatividade para Totens (kioskMode.ts)", () => {
    it("retorna 45 segundos como padrão de inatividade", () => {
      expect(getKioskIdleTimeoutSeconds()).toBe(45);
    });

    it("persiste novo tempo limite de totem via localStorage e Zod", () => {
      setKioskIdleTimeoutSeconds(60);
      expect(getKioskIdleTimeoutSeconds()).toBe(60);

      setKioskIdleTimeoutSeconds(0); // Desativado
      expect(getKioskIdleTimeoutSeconds()).toBe(0);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import quizData from "../data/quiz.json";
import { ttsSystem } from "../src/systems/ttsSystem";
import { hasSeenOnboarding, markOnboardingSeen } from "../src/ui/onboardingModal";

describe("Fase 21: Conteúdo Educacional & Acessibilidade Expandida", () => {
  describe("1. Banco de Questões do Quiz (data/quiz.json)", () => {
    it("deve conter pelo menos 50 questões científicas e ecológicas", () => {
      expect(quizData.length).toBeGreaterThanOrEqual(50);
    });

    it("todas as questões devem possuir IDs únicos", () => {
      const ids = quizData.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(quizData.length);
    });

    it("todas as questões devem ter campos válidos e consistentes", () => {
      const validBiomes = new Set(["antartica", "pelagico", "costa_urbana", "canyons", "arraial"]);
      const validDifficulties = new Set(["facil", "medio", "dificil"]);

      quizData.forEach((q, idx) => {
        expect(q.id, `Questão ${idx} sem id`).toBeTruthy();
        expect(q.factId, `Questão ${q.id} sem factId`).toBeTruthy();
        expect(validBiomes.has(q.biome), `Questão ${q.id} com bioma inválido: ${q.biome}`).toBe(true);
        expect(validDifficulties.has(q.difficulty), `Questão ${q.id} com dificuldade inválida: ${q.difficulty}`).toBe(true);
        expect(q.question.trim().length, `Questão ${q.id} sem texto`).toBeGreaterThan(15);
        expect(Array.isArray(q.options), `Questão ${q.id} options não é array`).toBe(true);
        expect(q.options.length, `Questão ${q.id} deve ter exatamente 4 opções`).toBe(4);
        q.options.forEach((opt, optIdx) => {
          expect(opt.trim().length, `Opção ${optIdx} da questão ${q.id} está vazia`).toBeGreaterThan(0);
        });
        expect(q.correctIndex, `Questão ${q.id} correctIndex fora do intervalo 0-3`).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
        expect(q.explanation.trim().length, `Questão ${q.id} sem explicação`).toBeGreaterThan(10);
      });
    });

    it("deve cobrir todos os 5 biomas com pelo menos 8 questões cada", () => {
      const biomes = ["antartica", "pelagico", "costa_urbana", "canyons", "arraial"];
      biomes.forEach((biome) => {
        const count = quizData.filter((q) => q.biome === biome).length;
        expect(count, `Bioma '${biome}' deve ter pelo menos 8 questões`).toBeGreaterThanOrEqual(8);
      });
    });

    it("deve distribuir questões entre as 3 faixas de dificuldade", () => {
      const facilCount = quizData.filter((q) => q.difficulty === "facil").length;
      const medioCount = quizData.filter((q) => q.difficulty === "medio").length;
      const dificilCount = quizData.filter((q) => q.difficulty === "dificil").length;

      expect(facilCount).toBeGreaterThanOrEqual(10);
      expect(medioCount).toBeGreaterThanOrEqual(10);
      expect(dificilCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe("2. Sistema de Narração em Voz (ttsSystem via Web Speech API)", () => {
    beforeEach(() => {
      localStorage.clear();
      ttsSystem.setEnabled(false);
      vi.restoreAllMocks();
    });

    it("deve inicializar desativado por omissão e refletir no label", () => {
      expect(ttsSystem.isEnabled()).toBe(false);
      expect(ttsSystem.getLabel()).toContain("DESLIGADA");
    });

    it("deve alternar estado com toggle() e persistir no localStorage", () => {
      const newState = ttsSystem.toggle();
      expect(newState).toBe(true);
      expect(ttsSystem.isEnabled()).toBe(true);
      expect(ttsSystem.getLabel()).toContain("LIGADA");
      expect(localStorage.getItem("micro_splash_tts")).toBe("true");

      const secondToggle = ttsSystem.toggle();
      expect(secondToggle).toBe(false);
      expect(ttsSystem.isEnabled()).toBe(false);
      expect(ttsSystem.getLabel()).toContain("DESLIGADA");
      expect(localStorage.getItem("micro_splash_tts")).toBe("false");
    });

    it("deve invocar window.speechSynthesis.speak quando ativado e com suporte", () => {
      const mockSpeak = vi.fn();
      const mockCancel = vi.fn();

      // Mock de SpeechSynthesis e SpeechSynthesisUtterance
      class MockSpeechSynthesisUtterance {
        text: string;
        lang: string = "";
        rate: number = 1.0;
        pitch: number = 1.0;
        voice: any = null;
        constructor(text: string) {
          this.text = text;
        }
      }

      (globalThis as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
      (globalThis as any).speechSynthesis = {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: () => [
          { name: "Google português do Brasil", lang: "pt-BR" },
          { name: "English Voice", lang: "en-US" },
        ],
      };

      ttsSystem.setEnabled(true);
      expect(ttsSystem.isSupported()).toBe(true);

      ttsSystem.speak("A baleia-jubarte migra até 30.000m.");
      expect(mockCancel).toHaveBeenCalled();
      expect(mockSpeak).toHaveBeenCalledTimes(1);

      ttsSystem.stop();
      expect(mockCancel).toHaveBeenCalledTimes(2);
    });

    it("não deve disparar síntese de voz quando o sistema estiver desativado", () => {
      const mockSpeak = vi.fn();
      (globalThis as any).speechSynthesis = { speak: mockSpeak, cancel: vi.fn() };

      ttsSystem.setEnabled(false);
      ttsSystem.speak("Texto de teste");
      expect(mockSpeak).not.toHaveBeenCalled();
    });
  });

  describe("3. Onboarding PWA & Web para Primeira Abertura", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("deve detectar se o jogador já realizou o onboarding anteriormente", () => {
      expect(hasSeenOnboarding()).toBe(false);

      markOnboardingSeen();
      expect(hasSeenOnboarding()).toBe(true);
      expect(localStorage.getItem("micro_splash_onboarding_done")).toBe("true");
    });
  });
});

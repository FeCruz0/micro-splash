import { describe, it, expect } from "vitest";
import factsData from "../data/facts.json";
import quizData from "../data/quiz.json";
import layoutData from "../data/level_layout.json";
import {
  FactSchema,
  FactsArraySchema,
  QuizQuestionSchema,
  QuizArraySchema,
  LevelLayoutSchema,
} from "../src/schemas/dataSchemas";

describe("Validação de Schemas com Zod (Fase 24.6)", () => {
  describe("data/facts.json", () => {
    it("valida que facts.json está em conformidade com o schema", () => {
      const parsed = FactsArraySchema.safeParse(factsData);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        throw new Error(JSON.stringify(parsed.error.issues, null, 2));
      }

      expect(parsed.data.length).toBeGreaterThanOrEqual(10);
    });

    it("garante que todos os fatos possuem IDs únicos", () => {
      const ids = new Set<string>();
      for (const fact of factsData) {
        expect(ids.has(fact.id)).toBe(false);
        ids.add(fact.id);
      }
    });

    it("rejeita fatos com campos obrigatórios ausentes ou triggerX inválido", () => {
      const invalidFact = {
        id: "invalido",
        title: "Sem localização",
        // location ausente
        triggerX: -50, // negativo
        description: "Curto",
      };

      const result = FactSchema.safeParse(invalidFact);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("data/quiz.json", () => {
    it("valida que quiz.json cumpre o schema estrito", () => {
      const parsed = QuizArraySchema.safeParse(quizData);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        throw new Error(JSON.stringify(parsed.error.issues, null, 2));
      }

      // Mais de 50 perguntas implementadas na Fase 21
      expect(parsed.data.length).toBeGreaterThanOrEqual(50);
    });

    it("garante que todas as perguntas possuem IDs únicos e 4 opções", () => {
      const ids = new Set<string>();
      for (const q of quizData) {
        expect(ids.has(q.id)).toBe(false);
        ids.add(q.id);
        expect(q.options.length).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThanOrEqual(3);
      }
    });

    it("rejeita questões com menos de 4 opções ou correctIndex inválido", () => {
      const invalidQuestion = {
        id: "q_teste",
        factId: "antartica",
        biome: "antartica",
        difficulty: "facil",
        question: "Pergunta de teste?",
        options: ["Opção 1", "Opção 2", "Opção 3"], // apenas 3 opções
        correctIndex: 5, // índice fora de 0..3
        explanation: "Explicação válida",
      };

      const result = QuizQuestionSchema.safeParse(invalidQuestion);
      expect(result.success).toBe(false);
    });
  });

  describe("data/level_layout.json", () => {
    it("valida que o layout de obstáculos possui camadas e coordenadas válidas", () => {
      const parsed = LevelLayoutSchema.safeParse(layoutData);
      expect(parsed.success).toBe(true);
      if (!parsed.success) {
        throw new Error(JSON.stringify(parsed.error.issues, null, 2));
      }

      expect(parsed.data.urbanTrash.length).toBeGreaterThan(0);
      expect(parsed.data.antarcticKrill.length).toBeGreaterThan(0);
      expect(parsed.data.ghostNets.length).toBeGreaterThan(0);
    });

    it("rejeita rede fantasma com camada não mapeada", () => {
      const invalidLayout = {
        urbanTrash: [],
        antarcticKrill: [],
        ghostNets: [{ x: 5000, layer: "camada_inexistente" }],
      };

      const result = LevelLayoutSchema.safeParse(invalidLayout);
      expect(result.success).toBe(false);
    });
  });
});

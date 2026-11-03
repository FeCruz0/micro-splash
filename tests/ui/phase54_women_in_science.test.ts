import { describe, it, expect } from "vitest";
import factsData from "../../data/facts.json";
import quizData from "../../data/quiz.json";
import { FactsArraySchema, QuizArraySchema } from "../../src/schemas/dataSchemas";
import {
  isWomenInScienceQuestion,
  selectQuizQuestions,
  type QuizQuestion,
} from "../../src/ui/quizModal";

describe("Fase 54: Especial Feira de Ciências — Mulheres na Ciência & Educação Ambiental", () => {
  describe("54.1: Validação de Fatos Pedagógicos Canônicos (data/facts.json)", () => {
    it("deve satisfazer integralmente o FactsArraySchema do Zod sem erros", () => {
      const parseResult = FactsArraySchema.safeParse(factsData);
      expect(parseResult.success).toBe(true);
    });

    it("contém os 13 marcos migratórios canônicos ordenados por triggerX", () => {
      expect(factsData).toHaveLength(13);
      factsData.forEach((fact, index) => {
        expect(fact.triggerX).toBeGreaterThanOrEqual(0);
        expect(fact.triggerX).toBeLessThanOrEqual(30000);
        if (index > 0) {
          expect(fact.triggerX).toBeGreaterThan(factsData[index - 1].triggerX);
        }
      });
    });
  });

  describe("54.2: Validação do Banco de Questões (data/quiz.json)", () => {
    it("deve satisfazer integralmente o QuizArraySchema do Zod sem erros", () => {
      const parseResult = QuizArraySchema.safeParse(quizData);
      expect(parseResult.success).toBe(true);
    });

    it("deve conter as 11 questões dedicadas ao tema da feira", () => {
      const womenQuestions = (quizData as QuizQuestion[]).filter(isWomenInScienceQuestion);
      expect(womenQuestions.length).toBe(11);

      const questionIds = womenQuestions.map((q) => q.id);
      expect(questionIds).toContain("q_mulheres_marcia_engel");
      expect(questionIds).toContain("q_mulheres_sylvia_earle");
      expect(questionIds).toContain("q_mulheres_mariana_groch");
      expect(questionIds).toContain("q_mulheres_proantar");
      expect(questionIds).toContain("q_mulheres_rachel_carson");
      expect(questionIds).toContain("q_mulheres_johanna_dobereiner");
      expect(questionIds).toContain("q_mulheres_bertha_lutz");
      expect(questionIds).toContain("q_mulheres_jaqueline_goes");
      expect(questionIds).toContain("q_mulheres_enedina_marques");
      expect(questionIds).toContain("q_mulheres_marie_curie");
      expect(questionIds).toContain("q_mulheres_rosalind_franklin");
    });

    it("cada questão de Mulheres na Ciência deve referenciar um factId existente", () => {
      const factIdSet = new Set(factsData.map((f) => f.id));
      const womenQuestions = (quizData as QuizQuestion[]).filter(isWomenInScienceQuestion);

      for (const q of womenQuestions) {
        expect(factIdSet.has(q.factId)).toBe(true);
      }
    });

    it("valida a consistência de gabaritos e explicações pedagógicas", () => {
      const questionsMap = new Map(
        (quizData as QuizQuestion[]).map((q) => [q.id, q] as [string, QuizQuestion])
      );

      // 1. Dra. Márcia Engel (Instituto Baleia Jubarte)
      const qMarcia = questionsMap.get("q_mulheres_marcia_engel")!;
      expect(qMarcia.options[qMarcia.correctIndex]).toBe("Dra. Márcia Engel");
      expect(qMarcia.explanation).toContain("Projeto Baleia Jubarte");

      // 2. Sylvia Earle (Hope Spots)
      const qSylvia = questionsMap.get("q_mulheres_sylvia_earle")!;
      expect(qSylvia.options[qSylvia.correctIndex]).toBe("Sylvia Earle");
      expect(qSylvia.explanation).toContain("NOAA");

      // 3. Dra. Mariana Groch (Baleia Franca)
      const qMariana = questionsMap.get("q_mulheres_mariana_groch")!;
      expect(qMariana.options[qMariana.correctIndex]).toBe("Baleia-franca-austral");

      // 4. Johanna Döbereiner (Biotecnologia)
      const qJohanna = questionsMap.get("q_mulheres_johanna_dobereiner")!;
      expect(qJohanna.options[qJohanna.correctIndex]).toBe("Johanna Döbereiner");

      // 5. Bertha Lutz (Zoologia)
      const qBertha = questionsMap.get("q_mulheres_bertha_lutz")!;
      expect(qBertha.options[qBertha.correctIndex]).toBe("Bertha Lutz");

      // 6. Dra. Jaqueline Goes (Genômica SARS-CoV-2)
      const qJaqueline = questionsMap.get("q_mulheres_jaqueline_goes")!;
      expect(qJaqueline.options[qJaqueline.correctIndex]).toBe("Dra. Jaqueline Goes de Jesus");

      // 7. Enedina Alves Marques (Engenharia)
      const qEnedina = questionsMap.get("q_mulheres_enedina_marques")!;
      expect(qEnedina.options[qEnedina.correctIndex]).toBe("Enedina Alves Marques");

      // 8. Marie Curie (Física e Química)
      const qCurie = questionsMap.get("q_mulheres_marie_curie")!;
      expect(qCurie.options[qCurie.correctIndex]).toBe("Marie Curie");

      // 9. Rosalind Franklin (Foto 51 e DNA)
      const qFranklin = questionsMap.get("q_mulheres_rosalind_franklin")!;
      expect(qFranklin.options[qFranklin.correctIndex]).toBe("Rosalind Franklin");
    });
  });

  describe("54.3: Algoritmo de Seleção para a Feira de Ciências (selectQuizQuestions)", () => {
    it("garante 100% de presença de pelo menos 1 pergunta do tema em múltiplos sorteios", () => {
      const allQuestions = quizData as QuizQuestion[];

      // Executa 50 sorteios consecutivos simulando partidas na feira de ciências
      for (let iteration = 0; iteration < 50; iteration++) {
        const selected = selectQuizQuestions(allQuestions);

        expect(selected.length).toBe(3);
        const uniqueIds = new Set(selected.map((q) => q.id));
        expect(uniqueIds.size).toBe(3);

        const hasWomenInScience = selected.some(isWomenInScienceQuestion);
        expect(hasWomenInScience).toBe(true);
      }
    });

    it("prioriza a cientista cujo fato foi desbloqueado durante a migração", () => {
      const allQuestions = quizData as QuizQuestion[];

      // Simula que a baleia passou por Arraial e desbloqueou o fato de reserva_arraial
      const selected = selectQuizQuestions(allQuestions, ["reserva_arraial"]);

      expect(selected.length).toBe(3);
      const chosenMarcia = selected.find((q) => q.id === "q_mulheres_marcia_engel");
      expect(chosenMarcia).toBeDefined();
      expect(chosenMarcia?.factId).toBe("reserva_arraial");
    });

    it("mantém distribuição de 3 perguntas distintas mesmo com lista vazia de desbloqueios", () => {
      const allQuestions = quizData as QuizQuestion[];
      const selected = selectQuizQuestions(allQuestions, []);

      expect(selected.length).toBe(3);
      expect(new Set(selected.map((q) => q.id)).size).toBe(3);
    });
  });
});

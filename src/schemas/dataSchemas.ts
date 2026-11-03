import { z } from "zod";

/**
 * Schema para um Fato Ecológico (data/facts.json)
 */
export const FactSchema = z.object({
  id: z.string().min(1, "O id do fato não pode ser vazio"),
  title: z.string().min(1, "O título do fato não pode ser vazio"),
  location: z.string().min(1, "A localização não pode ser vazia"),
  triggerX: z
    .number()
    .min(0, "triggerX não pode ser negativo")
    .max(30000, "triggerX não pode exceder 30.000m"),
  description: z.string().min(10, "A descrição do fato deve conter pelo menos 10 caracteres"),
});

export const FactsArraySchema = z
  .array(FactSchema)
  .min(1, "O arquivo facts.json deve conter pelo menos 1 fato");

/**
 * Schema para uma Questão do Quiz (data/quiz.json)
 */
export const QuizQuestionSchema = z.object({
  id: z.string().min(1, "O id da questão não pode ser vazio"),
  factId: z.string().min(1, "O factId de referência não pode ser vazio"),
  biome: z.enum(["antartica", "pelagico", "oceano", "costa_urbana", "canyons", "arraial"], {
    message: "Bioma inválido para questão do quiz",
  }),
  difficulty: z.enum(["facil", "medio", "dificil"], {
    message: "Dificuldade inválida para questão do quiz",
  }),
  question: z.string().min(5, "O enunciado da questão deve ter pelo menos 5 caracteres"),
  options: z
    .array(z.string().min(1, "A opção não pode ser vazia"))
    .length(4, "Cada questão do quiz deve ter exatamente 4 opções de resposta"),
  correctIndex: z
    .number()
    .int("correctIndex deve ser inteiro")
    .min(0, "correctIndex deve ser entre 0 e 3")
    .max(3, "correctIndex deve ser entre 0 e 3"),
  explanation: z.string().min(5, "A explicação pedagógica deve ter pelo menos 5 caracteres"),
});

export const QuizArraySchema = z
  .array(QuizQuestionSchema)
  .min(1, "O arquivo quiz.json deve conter pelo menos 1 questão");

/**
 * Schema para o Layout Determinístico de Obstáculos (data/level_layout.json)
 */
export const LevelLayoutSchema = z.object({
  urbanTrash: z.array(
    z.object({
      x: z.number().min(0),
      y: z.number().min(0),
    })
  ),
  antarcticKrill: z.array(
    z.object({
      x: z.number().min(0),
      y: z.number().min(0),
    })
  ),
  ghostNets: z.array(
    z.object({
      x: z.number().min(0),
      layer: z.enum(["floor", "mid1", "mid2"]),
    })
  ),
});

export type Fact = z.infer<typeof FactSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type LevelLayout = z.infer<typeof LevelLayoutSchema>;

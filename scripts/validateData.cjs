const fs = require("node:fs");
const path = require("node:path");
const { z } = require("zod");

const FactSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  location: z.string().min(1),
  triggerX: z.number().min(0).max(30000),
  description: z.string().min(10),
});

const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  factId: z.string().min(1),
  biome: z.enum(["antartica", "pelagico", "oceano", "costa_urbana", "canyons", "arraial"]),
  difficulty: z.enum(["facil", "medio", "dificil"]),
  question: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(5),
});

const LevelLayoutSchema = z.object({
  urbanTrash: z.array(z.object({ x: z.number().min(0), y: z.number().min(0) })),
  antarcticKrill: z.array(z.object({ x: z.number().min(0), y: z.number().min(0) })),
  ghostNets: z.array(z.object({ x: z.number().min(0), layer: z.enum(["floor", "mid1", "mid2"]) })),
});

function validateFile(filename, schema) {
  const filePath = path.join(__dirname, "../data", filename);
  console.log(`🔍 Validando data/${filename}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${filePath}`);
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);
    schema.parse(json);
    console.log(`✅ data/${filename} validado com sucesso!`);
  } catch (err) {
    console.error(`❌ Falha na validação de data/${filename}:`);
    if (err.errors) {
      err.errors.forEach((e) => {
        console.error(`   - Caminho: ${e.path.join(".")} | Erro: ${e.message}`);
      });
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

console.log("--- Validação de Schemas Zod (data/*.json) ---");
validateFile("facts.json", z.array(FactSchema).min(1));
validateFile("quiz.json", z.array(QuizQuestionSchema).min(1));
validateFile("level_layout.json", LevelLayoutSchema);
console.log("🎉 Todos os arquivos de dados estão 100% em conformidade com os schemas Zod!");

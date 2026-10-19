const fs = require("node:fs");
const path = require("node:path");

/**
 * Script consolidador e gerador de manifesto de atlas de fauna secundaria (Fase 46.4)
 * Valida a presenca e integridade dos spritesheets gerados e cria o manifesto JSON
 * unificado para otimizar o carregamento e consumo no Kaboom.
 */
function runFaunaAtlasPipeline() {
  const spritesDir = path.resolve(__dirname, "../public/sprites");
  const manifestPath = path.join(spritesDir, "fauna_manifest.json");

  const faunaSpecs = {
    orca_bg: {
      file: "orca_bg.png",
      sliceX: 4,
      frameWidth: 96,
      frameHeight: 40,
      totalWidth: 384,
      totalHeight: 40,
    },
    humpback_bg: {
      file: "humpback_bg.png",
      sliceX: 4,
      frameWidth: 128,
      frameHeight: 54,
      totalWidth: 512,
      totalHeight: 54,
    },
    cachalote_bg: {
      file: "cachalote_bg.png",
      sliceX: 4,
      frameWidth: 160,
      frameHeight: 64,
      totalWidth: 640,
      totalHeight: 64,
    },
  };

  const results = {};

  for (const [key, spec] of Object.entries(faunaSpecs)) {
    const fullPath = path.join(spritesDir, spec.file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Sprite de fauna obrigatorio nao encontrado: ${spec.file}`);
    }
    const stat = fs.statSync(fullPath);
    results[key] = {
      ...spec,
      sizeBytes: stat.size,
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2), "utf-8");
  return results;
}

if (require.main === module) {
  const output = runFaunaAtlasPipeline();
  process.stdout.write(
    `Atlas de fauna consolidado com sucesso: ${Object.keys(output).join(", ")}\n`
  );
}

module.exports = { runFaunaAtlasPipeline };

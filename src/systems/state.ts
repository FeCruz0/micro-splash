import factsData from "../../data/facts.json";
import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";
import { HighscoreSchema, UnlockedFactsArraySchema } from "../schemas/storageSchemas";
import { getBiomeAtDistance, type BiomeType } from "../config";

export interface Fact {
  id: string;
  title: string;
  location: string;
  triggerX: number;
  description: string;
}

export type GameMode = "standard" | "serene" | "quick_challenge" | "weekly";

export interface GameOptions {
  mode: GameMode;
  startBiome?: number; // 0: Antártica, 2: Costa Urbana, 3: Arraial do Cabo
  timeLimit?: number; // 60 segundos padrão para o modo rápido
  seed?: number; // Semente para desafios procedurais semanais
  weekKey?: string; // Identificador da semana (ex: 2026-W39)
}

export type GameState = ReturnType<typeof createGameState>;

export function createGameState(options: GameOptions = { mode: "standard" }) {
  let distance = 0;
  let krillCount = 0;
  let trashCount = 0;
  let elapsedTime = 0;
  let timeRemaining = options.timeLimit || 60;
  let highScore = readLocalStorageWithSchema("micro_splash_highscore", HighscoreSchema, 0);

  // Carrega fatos já desbloqueados para o Diário de Bordo (Codex)
  const storedFacts = readLocalStorageWithSchema(
    "micro_splash_unlocked_facts",
    UnlockedFactsArraySchema,
    []
  );
  const triggeredFacts = new Set<string>(storedFacts);
  let didBreach = false;
  let quizScore = 0;
  let quizCorrectCount = 0;

  return {
    // leitores de estado
    getMode: () => options.mode,
    getOptions: () => options,
    getSeed: () => options.seed,
    getWeekKey: () => options.weekKey,
    getDistance: () => Math.floor(distance),
    getKrillCount: () => krillCount,
    getTrashCount: () => trashCount,
    getElapsedTime: () => Math.floor(elapsedTime),
    getTimeRemaining: () => Math.max(0, Math.ceil(timeRemaining)),
    isTimeUp: () => options.mode === "quick_challenge" && timeRemaining <= 0,
    getHighScore: () => highScore,
    getScore: () =>
      Math.max(
        0,
        Math.floor(distance) +
          krillCount * 100 -
          trashCount * 150 +
          (didBreach ? 500 : 0) +
          quizScore
      ),
    hasBreached: () => didBreach,
    getQuizScore: () => quizScore,
    getQuizCorrectCount: () => quizCorrectCount,
    getCurrentBiome: (): BiomeType => getBiomeAtDistance(distance),

    // incrementadores de eventos
    addKrill: () => {
      krillCount++;
    },
    addTrash: () => {
      trashCount++;
    },
    triggerBreach: () => {
      didBreach = true;
    },
    addQuizScore: (points: number, isCorrect: boolean = true) => {
      quizScore += points;
      if (isCorrect) quizCorrectCount++;
    },

    // Sabedoria Ancestral / Herança Cultural da rota
    getAncestralWisdom: () => {
      if (options.mode === "serene") {
        return "🌸 Guardiã Serena das Águas (Navegação Contemplativa)";
      }
      if (options.mode === "quick_challenge") {
        return "⚡ Campeã Veloz dos Oceanos (Desafio 60s)";
      }
      if (didBreach && trashCount === 0) {
        return "🐋 Matriarca Mística dos Mares (Herança Imaculada)";
      } else if (didBreach && krillCount >= 20) {
        return "✨ Guardião dos Cânticos Polares (Força Ancestral Máxima)";
      } else if (didBreach) {
        return "🌊 Navegador do Santuário de Arraial (Salto Majestoso)";
      } else if (trashCount > 5) {
        return "🛡️ Sobrevivente das Águas Urbanas (Resiliência Marinha)";
      }
      return "🐚 Aprendiz das Correntes Oceânicas (Espírito Jubarte)";
    },

    // atualiza tempo e distancia em segundo plano
    update: (deltaTime: number, playerXPosition: number) => {
      elapsedTime += deltaTime;
      if (options.mode === "quick_challenge") {
        timeRemaining -= deltaTime;
      }
      if (playerXPosition > distance) {
        distance = playerXPosition;
      }
    },

    // calculo de pontuação final
    calculateFinalScore: () => {
      const breachBonus = didBreach ? 500 : 0;
      const finalScore =
        Math.floor(distance) + krillCount * 100 - trashCount * 150 + breachBonus + quizScore;
      const score = Math.max(0, finalScore);

      if (score > highScore) {
        highScore = score;
        writeLocalStorage("micro_splash_highscore", highScore);
      }
      return score;
    },

    // checa gatilhos de fatos e salva no Codex
    checkFacts: (playerXPosition: number, onFactTriggered: (fact: Fact) => void) => {
      factsData.forEach((fact: Fact) => {
        if (playerXPosition >= fact.triggerX && !triggeredFacts.has(fact.id)) {
          triggeredFacts.add(fact.id);
          writeLocalStorage("micro_splash_unlocked_facts", Array.from(triggeredFacts));
          onFactTriggered(fact);
        }
      });
    },

    // lista de fatos desbloqueados para consulta no Codex
    getUnlockedFactIds: () => Array.from(triggeredFacts),
  };
}

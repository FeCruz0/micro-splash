import factsData from "../../data/facts.json";

export interface Fact {
    id: string;
    title: string;
    location: string;
    triggerX: number;
    description: string;
}

export type GameMode = "standard" | "serene" | "quick_challenge";

export interface GameOptions {
    mode: GameMode;
    startBiome?: number; // 0: Antártica, 2: Costa Urbana, 3: Arraial do Cabo
    timeLimit?: number;  // 60 segundos padrão para o desafio da feira
}

export type GameState = ReturnType<typeof createGameState>;

export function createGameState(options: GameOptions = { mode: "standard" }) {
    let distance = 0;
    let krillCount = 0;
    let trashCount = 0;
    let elapsedTime = 0;
    let timeRemaining = options.timeLimit || 60;
    let highScore = Number(localStorage.getItem("micro_splash_highscore") || 0);
    
    // Carrega fatos já desbloqueados para o Diário de Bordo (Codex)
    let storedFacts: string[] = [];
    try {
        storedFacts = JSON.parse(localStorage.getItem("micro_splash_unlocked_facts") || "[]");
    } catch {}
    const triggeredFacts = new Set<string>(storedFacts);
    let didBreach = false;

    return {
        // leitores de estado
        getMode: () => options.mode,
        getOptions: () => options,
        getDistance: () => Math.floor(distance),
        getKrillCount: () => krillCount,
        getTrashCount: () => trashCount,
        getElapsedTime: () => Math.floor(elapsedTime),
        getTimeRemaining: () => Math.max(0, Math.ceil(timeRemaining)),
        isTimeUp: () => options.mode === "quick_challenge" && timeRemaining <= 0,
        getHighScore: () => highScore,
        hasBreached: () => didBreach,

        // incrementadores de eventos
        addKrill: () => { krillCount++; },
        addTrash: () => { trashCount++; },
        triggerBreach: () => { didBreach = true; },

        // Sabedoria Ancestral / Herança Cultural da rota
        getAncestralWisdom: () => {
            if (options.mode === "serene") {
                return "🌸 Guardiã Serena das Águas (Navegação Contemplativa)";
            }
            if (options.mode === "quick_challenge") {
                return "⚡ Campeã Veloz da Feira de Ciências (Desafio 60s)";
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
            const finalScore = Math.floor(distance) + (krillCount * 100) - (trashCount * 150) + breachBonus;
            const score = Math.max(0, finalScore);

            if (score > highScore) {
                highScore = score;
                localStorage.setItem("micro_splash_highscore", highScore.toString());
            }
            return score;
        },

        // checa gatilhos de fatos e salva no Codex
        checkFacts: (playerXPosition: number, onFactTriggered: (fact: Fact) => void) => {
            factsData.forEach((fact: Fact) => {
                if (playerXPosition >= fact.triggerX && !triggeredFacts.has(fact.id)) {
                    triggeredFacts.add(fact.id);
                    try {
                        localStorage.setItem("micro_splash_unlocked_facts", JSON.stringify(Array.from(triggeredFacts)));
                    } catch {}
                    onFactTriggered(fact);
                }
            });
        },

        // lista de fatos desbloqueados para consulta no Codex
        getUnlockedFactIds: () => Array.from(triggeredFacts),
    };
}
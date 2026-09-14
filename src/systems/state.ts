import factsData from "../../data/facts.json";

export interface Fact {
    id: string;
    title: string;
    location: string;
    triggerX: number;
    description: string;
}

export function createGameState() {
    let distance = 0;
    let krillCount = 0;
    let trashCount = 0;
    let elapsedTime = 0;
    let highScore = Number(localStorage.getItem("micro_splash_highscore") || 0);
    const triggeredFacts = new Set<string>();
    let didBreach = false;

    return {
        // leitores de estado
        getDistance: () => Math.floor(distance),
        getKrillCount: () => krillCount,
        getTrashCount: () => trashCount,
        getElapsedTime: () => Math.floor(elapsedTime),
        getHighScore: () => highScore,
        hasBreached: () => didBreach,

        // incrementadores de eventos
        addKrill: () => { krillCount++; },
        addTrash: () => { trashCount++; },
        triggerBreach: () => { didBreach = true; },

        // Sabedoria Ancestral / Herança Cultural da rota
        getAncestralWisdom: () => {
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

        // checa gatilhos de fatos
        checkFacts: (playerXPosition: number, onFactTriggered: (fact: Fact) => void) => {
            factsData.forEach((fact: Fact) => {
                if (playerXPosition >= fact.triggerX && !triggeredFacts.has(fact.id)) {
                    triggeredFacts.add(fact.id);
                    onFactTriggered(fact);
                }
            });
        },
    };
}
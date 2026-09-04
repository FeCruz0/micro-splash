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

    return {
        // leitores de estado
        getDistance: () => Math.floor(distance),
        getKrillCount: () =>krillCount,
        getTrashCount: () => trashCount,
        getElapsedTime: () => Math.floor (elapsedTime),
        getHighScore: () => highScore,

        // incrementadores de eventos
        addKrill: () => { krillCount++; },
        addTrash: () => { trashCount++; },

        // atualiza tempo e distancia em segundo plano
        update: (deltaTime: number, playerXPosition: number) => {
            elapsedTime += deltaTime;
            if (playerXPosition > distance) {
                distance = playerXPosition;
            }
        },

        // calculo de pontuação final
        calculateFinalScore: () => {
            const finalScore = Math.floor(distance) + (krillCount * 100) - (trashCount * 150);
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
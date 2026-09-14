import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "../systems/audioSystem";

export function showVictoryScreen(k: KaboomCtx, gameState: any, onRestart: () => void) {
    const finalScore = gameState.calculateFinalScore();
    const highScore = gameState.getHighScore();
    const hasBreached = gameState.hasBreached();
    const ancestralWisdom = gameState.getAncestralWisdom();

    // Toca a fanfarra triunfal da vitória
    audioSystem.playVictoryFanfare();

    // Fundo escuro com brilho azul turquesa
    k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.color(5, 25, 55),
        k.opacity(0.93),
        k.fixed(),
        k.z(200),
    ]);

    // Partículas de celebração no fundo (estrelas marinhas / luzes bioluminescentes)
    for (let i = 0; i < 20; i++) {
        const star = k.add([
            k.circle(k.rand(2, 4)),
            k.pos(k.rand(20, k.width() - 20), k.rand(20, k.height() - 20)),
            k.color(k.choose([k.rgb(255, 230, 120), k.rgb(100, 240, 255), k.rgb(255, 255, 255)])),
            k.opacity(k.rand(0.3, 0.8)),
            k.fixed(),
            k.z(200),
        ]);
        let starTime = k.rand(0, 10);
        star.onUpdate(() => {
            starTime += k.dt() * 3;
            star.opacity = 0.4 + Math.sin(starTime) * 0.35;
        });
    }

    // Card de vitória (600x440 com borda dourada elegante)
    k.add([
        k.rect(600, 440, { radius: 14 }),      
        k.pos(k.width() / 2, k.height() / 2),
        k.color(12, 45, 95),
        k.outline(3, k.rgb(255, 215, 0)), // Borda dourada
        k.anchor("center"),
        k.fixed(),
        k.z(201),
    ]);

    // Título vitória
    k.add([
        k.text("MIGRAÇÃO CONCLUÍDA COM SUCESSO! 🐋", {
            size: 17,
            font: "sans-serif",
        }),
        k.pos(k.width() / 2, k.height() / 2 - 180),
        k.color(255, 215, 0),
        k.anchor("center"),
        k.fixed(),
        k.z(202),
    ]);

    // Subtítulo
    k.add([
        k.text("Você guiou a baleia ao Santuário Marinho de Arraial do Cabo (Ilha do Farol)!", {
            size: 12,
            width: 540,
            font: "sans-serif",
            align: "center",
        }),
        k.pos(k.width() / 2, k.height() / 2 - 145),
        k.color(200, 240, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(202),
    ]);

    // Cálculo do score e rank
    let rank = "🥉 RANK B - Navegador Aprendiz";
    if (finalScore >= 3500) rank = "🥇 RANK S - Guardião dos Oceanos!";
    else if (finalScore >= 2500) rank = "🥈 RANK A - Protetor das Jubartes!";
    
    const totalDistanceFormatted = GAME_CONFIG.ROUTE_TOTAL_DISTANCE.toLocaleString("pt-BR");
    const breachText = hasBreached ? "✨ Salto Majestoso (Breach): EXECUTADO (+500 pts)\n" : "";

    const statsText = 
        `📏 Rota Migratória: 100% Concluída (${totalDistanceFormatted}m)\n` +
        `⏱️ Tempo de Viagem: ${gameState.getElapsedTime()} seg\n` +
        `🦐 Krill Coletado: ${gameState.getKrillCount()}\n` +
        `🗑️ Lixo Colidido: ${gameState.getTrashCount()}\n` +
        breachText +
        `\n📜 Sabedoria Ancestral: ${ancestralWisdom}\n\n` +
        `⭐ Eco-Score Final: ${finalScore} pts   |   🏆 Recorde: ${highScore} pts\n\n` +
        `🎖️ Classificação: ${rank}`;

    // Estatísticas no centro
    k.add([
        k.text(statsText, {
            size: 12, 
            font: "sans-serif",
            lineSpacing: 5
        }),
        k.pos(k.width() / 2 - 250, k.height() / 2 - 105),
        k.color(255, 255, 255),
        k.fixed(),
        k.z(202),
    ]);

    // Botão de reinício
    const restartButtonLabel = k.add([
        k.text("Pressione ENTER para Jogar Novamente", {
            size: 14,
            font: "sans-serif",
        }),
        k.pos(k.width() / 2, k.height() / 2 + 185),
        k.color(100, 255, 180),
        k.opacity(1),
        k.anchor("center"),
        k.fixed(),
        k.z(202),
    ]);

    let blinkAnimationTime = 0;
    restartButtonLabel.onUpdate(() => {
        blinkAnimationTime += k.dt() * 4;
        restartButtonLabel.opacity = Math.sin(blinkAnimationTime) > 0 ? 1 : 0.3;
    });

    const cancelKeyPress = k.onKeyPress("enter", () => {
        cancelKeyPress.cancel();
        onRestart();
    });
}

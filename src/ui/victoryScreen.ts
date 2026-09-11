import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";

export function showVictoryScreen(k: KaboomCtx, gameState: any, onRestart: () => void) {
    const finalScore = gameState.calculateFinalScore();
    const highScore = gameState.getHighScore();

    // Fundo escuro com brilho azul turquesa
    k.add([
        k.rect(k.width(), k.height()),
        k.pos(0, 0),
        k.color(5, 30, 60),
        k.opacity(0.92),
        k.fixed(),
        k.z(200),
    ]);

    // Card de vitória (Altura aumentada para 420px para caber todo o conteúdo com folga)
    k.add([
        k.rect(580, 420, { radius: 12 }),      
        k.pos(k.width() / 2, k.height() / 2),
        k.color(15, 55, 110),
        k.outline(3, k.rgb(255, 215, 0)), // Borda dourada
        k.anchor("center"),
        k.fixed(),
        k.z(201),
    ]);

    // Título vitória (Ajustado para Y = -165)
    k.add([
        k.text("MIGRAÇÃO CONCLUÍDA COM SUCESSO! 🐋", {
            size: 17,
            font: "sans-serif",
        }),
        k.pos(k.width() / 2, k.height() / 2 - 165),
        k.color(255, 215, 0),
        k.anchor("center"),
        k.fixed(),
        k.z(202),
    ]);

    // Subtítulo
    k.add([
        k.text("Você guiou a baleia com sucesso ao Santuário Marinho de Arraial do Cabo!", {
            size: 12,
            width: 500,
            font: "sans-serif",
        }),
        k.pos(k.width() / 2, k.height() / 2 - 125),
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
    const statsText = 
        `📏 Rota Migratória: 100% Concluída (${totalDistanceFormatted}m)\n` +
        `⏱️ Tempo de Viagem: ${gameState.getElapsedTime()} seg\n` +
        `🦐 Krill Coletado: ${gameState.getKrillCount()}\n` +
        `🗑️ Lixo Colidido: ${gameState.getTrashCount()}\n\n` +
        `⭐ Eco-Score Final: ${finalScore} pts\n` +
        `🏆 Recorde Histórico: ${highScore} pts\n\n` +
        `🎖️ Classificação: ${rank}`;

    // Estatísticas (Posicionadas com folga no centro)
    k.add([
        k.text(statsText, {
            size: 13, 
            font: "sans-serif",
            lineSpacing: 6
        }),
        k.pos(k.width() / 2 - 230, k.height() / 2 - 80),
        k.color(255, 255, 255),
        k.fixed(),
        k.z(202),
    ]);

    // Botão de reinício (Ajustado para Y = +160)
    const restartButtonLabel = k.add([
        k.text("Pressione ENTER para Jogar Novamente", {
            size: 14,
            font: "sans-serif",
        }),
        k.pos(k.width() / 2, k.height() / 2 + 160),
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

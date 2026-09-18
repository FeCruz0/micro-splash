import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import { audioSystem } from "../systems/audioSystem";
import type { GameState } from "../systems/state";
import { isTop10Score } from "../systems/leaderboard";
import { showInitialsInputModal } from "./initialsInputModal";

export function showVictoryScreen(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
    const finalScore = gameState.calculateFinalScore();
    const distance = gameState.getDistance();
    const mode = gameState.getMode();

    if (isTop10Score(finalScore)) {
        showInitialsInputModal(k, finalScore, distance, mode, () => {
            renderVictoryContent(k, gameState, onRestart);
        });
    } else {
        renderVictoryContent(k, gameState, onRestart);
    }
}

function renderVictoryContent(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
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
    const calfText = gameState.hasEscortedCalf() ? "🐋 Filhote Protegido no Berçário: SUCESSO (+300 pts)\n" : "";

    const statsText = 
        `📏 Rota Migratória: 100% Concluída (${totalDistanceFormatted}m)\n` +
        `⏱️ Tempo de Viagem: ${gameState.getElapsedTime()} seg\n` +
        `🦐 Krill Coletado: ${gameState.getKrillCount()}\n` +
        `🗑️ Lixo Colidido: ${gameState.getTrashCount()}\n` +
        breachText +
        calfText +
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

    // Botão de reinício (suporta toque mobile e clique)
    const restartButton = k.add([
        k.rect(340, 38, { radius: 8 }),
        k.pos(k.width() / 2, k.height() / 2 + 185),
        k.color(20, 90, 140),
        k.outline(2, k.rgb(100, 240, 255)),
        k.anchor("center"),
        k.area(),
        k.fixed(),
        k.z(202),
    ]);

    k.add([
        k.text("Jogar Novamente (ou ENTER) 🔄", {
            size: 13,
            font: "sans-serif",
        }),
        k.pos(k.width() / 2, k.height() / 2 + 185),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(203),
    ]);

    let isRestarting = false;
    const triggerRestart = () => {
        if (isRestarting) return;
        isRestarting = true;
        cancelKeyPress.cancel();
        onRestart();
    };

    restartButton.onHoverUpdate(() => {
        restartButton.color = k.rgb(30, 140, 200);
    });
    restartButton.onHoverEnd(() => {
        restartButton.color = k.rgb(20, 90, 140);
    });
    restartButton.onClick(triggerRestart);

    const cancelKeyPress = k.onKeyPress("enter", triggerRestart);
}

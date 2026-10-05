import type { KaboomCtx } from "kaboom";
import type { GameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { formatDualDistance } from "../utils/navigation";
import { addShadowedText } from "./textUtils";
import { animateModalEntrance, attachButtonHoverEffect } from "./animationUtils";

export function showRescueScreen(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
  const finalScore = gameState.calculateFinalScore();
  const highScore = gameState.getHighScore();
  const distance = gameState.getDistance();
  const dualDistStr = formatDualDistance(distance);
  const elementsToDestroy: any[] = [];

  // Fundo escuro cinematográfico com transparência suave
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(6, 16, 36),
    k.opacity(0.94),
    k.fixed(),
    k.z(200),
  ]);
  elementsToDestroy.push(backdrop);

  // Dimensões compactas e limpas (sem caixa de texto narrativa)
  const cardW = Math.min(800, k.width() - 32);
  const cardH = Math.min(340, k.height() - 24);
  const centerX = k.width() / 2;
  const centerY = k.height() / 2;
  const cardTop = centerY - cardH / 2;

  // Card do Relatório de Resgate
  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(centerX, centerY),
    k.color(10, 26, 54),
    k.outline(2.5, k.rgb(0, 210, 255)),
    k.anchor("center"),
    k.scale(1),
    k.fixed(),
    k.z(201),
  ]);
  elementsToDestroy.push(card);
  animateModalEntrance(k, card);

  // ==========================================
  // ZONA 1: CABEÇALHO DO RESGATE
  // ==========================================
  const badgeY = cardTop + 28;
  const badgeBg = k.add([
    k.rect(220, 22, { radius: 11 }),
    k.pos(centerX, badgeY),
    k.color(36, 18, 12),
    k.outline(1.5, k.rgb(249, 115, 22)),
    k.anchor("center"),
    k.fixed(),
    k.z(202),
  ]);
  elementsToDestroy.push(badgeBg);

  const badgeText = k.add([
    k.text("🚨 OPERAÇÃO DE SALVAMENTO", {
      size: accessibilitySystem.scaleFont(11),
      font: "Outfit",
    }),
    k.pos(centerX, badgeY),
    k.color(255, 185, 90),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);
  elementsToDestroy.push(badgeText);

  const titleY = cardTop + 58;
  const titleShadowHandle = addShadowedText(k, "RESGATE DA GUARDA MARÍTIMA", {
    pos: k.vec2(centerX, titleY),
    size: accessibilitySystem.scaleFont(22.5),
    font: "Outfit",
    color: k.rgb(255, 222, 50),
    shadowColor: k.rgb(2, 10, 24),
    anchor: "center",
    z: 203,
  });
  elementsToDestroy.push(titleShadowHandle);

  const subTitleY = cardTop + 86;
  const subTitle = k.add([
    k.text("Cuidados Veterinários & Estabilização", {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    k.pos(centerX, subTitleY),
    k.color(160, 225, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);
  elementsToDestroy.push(subTitle);

  // ==========================================
  // ZONA 2: 4 CARDS DE MÉTRICAS VISUAIS
  // ==========================================
  const statY = cardTop + 160;
  const statGap = 12;
  const statW = (cardW - 56 - statGap * 3) / 4;
  const statH = 76;

  const krillCount = gameState.getKrillCount();
  const elapsedSec = Math.round(gameState.getElapsedTime());
  const percentRoute = Math.min(100, Math.round((distance / 30000) * 100));

  const statConfigs = [
    {
      label: "📏 DISTÂNCIA",
      value: dualDistStr,
      sub: `${percentRoute}% da rota`,
      x: centerX - (statW * 1.5 + statGap * 1.5),
      bg: [11, 30, 62] as [number, number, number],
      outline: k.rgb(56, 189, 248),
      valColor: k.rgb(255, 255, 255),
      labelColor: k.rgb(160, 215, 255),
    },
    {
      label: "⭐ PONTUAÇÃO",
      value: `${finalScore.toLocaleString("pt-BR")} pts`,
      sub: finalScore >= highScore && highScore > 0 ? "Novo Recorde! 🎉" : "Desempenho",
      x: centerX - (statW * 0.5 + statGap * 0.5),
      bg: [11, 30, 62] as [number, number, number],
      outline: k.rgb(250, 204, 21),
      valColor: k.rgb(255, 225, 90),
      labelColor: k.rgb(255, 220, 100),
    },
    {
      label: "🏆 RECORDE",
      value: `${highScore.toLocaleString("pt-BR")} pts`,
      sub: "Melhor histórico",
      x: centerX + (statW * 0.5 + statGap * 0.5),
      bg: [18, 38, 72] as [number, number, number],
      outline: k.rgb(234, 179, 8),
      valColor: k.rgb(255, 235, 120),
      labelColor: k.rgb(255, 220, 130),
    },
    {
      label: "🦐 KRILL & TEMPO",
      value: `${krillCount} | ${elapsedSec}s`,
      sub: `${gameState.getTrashCount()} lixo evitado`,
      x: centerX + (statW * 1.5 + statGap * 1.5),
      bg: [11, 30, 62] as [number, number, number],
      outline: k.rgb(52, 211, 153),
      valColor: k.rgb(210, 250, 230),
      labelColor: k.rgb(150, 240, 200),
    },
  ];

  statConfigs.forEach((sc) => {
    const sBox = k.add([
      k.rect(statW, statH, { radius: 9 }),
      k.pos(sc.x, statY),
      k.color(sc.bg[0], sc.bg[1], sc.bg[2]),
      k.outline(1.5, sc.outline),
      k.anchor("center"),
      k.fixed(),
      k.z(202),
    ]);
    elementsToDestroy.push(sBox);

    const sLabel = k.add([
      k.text(sc.label, {
        size: accessibilitySystem.scaleFont(11),
        font: "Outfit",
      }),
      k.pos(sc.x, statY - 20),
      k.color(sc.labelColor),
      k.anchor("center"),
      k.fixed(),
      k.z(203),
    ]);
    elementsToDestroy.push(sLabel);

    const sVal = k.add([
      k.text(sc.value, {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(sc.x, statY + 2),
      k.color(sc.valColor),
      k.anchor("center"),
      k.fixed(),
      k.z(203),
    ]);
    elementsToDestroy.push(sVal);

    const sSub = k.add([
      k.text(sc.sub, {
        size: accessibilitySystem.scaleFont(10.5),
        font: "Inter",
      }),
      k.pos(sc.x, statY + 22),
      k.color(140, 175, 215),
      k.anchor("center"),
      k.fixed(),
      k.z(203),
    ]);
    elementsToDestroy.push(sSub);
  });

  // ==========================================
  // ZONA 4: BOTÃO DE AÇÃO & ATALHOS (325 a 470px)
  // ==========================================
  const btnW = 380;
  const btnH = 48;
  const btnY = cardTop + 250;

  const restartButton = k.add([
    k.rect(btnW, btnH, { radius: 11 }),
    k.pos(centerX, btnY),
    k.color(20, 115, 185),
    k.outline(2, k.rgb(0, 230, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(204),
  ]);
  elementsToDestroy.push(restartButton);

  const btnLabel = k.add([
    k.text("Tentar Novamente  [ ENTER ]  🔄", {
      size: accessibilitySystem.scaleFont(16),
      font: "Outfit",
    }),
    k.pos(centerX, btnY),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(205),
  ]);
  elementsToDestroy.push(btnLabel);

  const hintLabel = k.add([
    k.text("Pressione [ENTER] ou [ESPAÇO] para iniciar nova migração", {
      size: accessibilitySystem.scaleFont(11.5),
      font: "Inter",
    }),
    k.pos(centerX, btnY + 34),
    k.color(140, 185, 225),
    k.anchor("center"),
    k.fixed(),
    k.z(205),
  ]);
  elementsToDestroy.push(hintLabel);

  let isRestarting = false;
  const triggerRestart = () => {
    if (isRestarting) return;
    isRestarting = true;
    cancelKeyPress.cancel();
    if (cancelSpacePress) cancelSpacePress.cancel();
    elementsToDestroy.forEach((item) => {
      try {
        if (typeof item.destroy === "function") {
          item.destroy();
        } else {
          k.destroy(item);
        }
      } catch {}
    });
    onRestart();
  };

  attachButtonHoverEffect(k, restartButton, {
    baseColor: [20, 115, 185],
    hoverColor: [32, 150, 235],
    baseScale: 1.0,
    hoverScale: 1.035,
  });
  restartButton.onClick(triggerRestart);

  // Gatilhos de teclado: Enter e Espaço
  const cancelKeyPress = k.onKeyPress("enter", triggerRestart);
  const cancelSpacePress = k.onKeyPress("space", triggerRestart);
}

import type { KaboomCtx } from "kaboom";
import type { GameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { FONT_TITLE, FONT_BODY, TEXT_SIZE_H1, TEXT_SIZE_BODY, TEXT_SIZE_CAPTION } from "../config";
import { formatDualDistance } from "../utils/navigation";
import { addShadowedText } from "./textUtils";
import { createKeyBadge } from "./keyBadge";

export function showRescueScreen(k: KaboomCtx, gameState: GameState, onRestart: () => void) {
  const finalScore = gameState.calculateFinalScore();
  const highScore = gameState.getHighScore();
  const distance = gameState.getDistance();
  const dualDistStr = formatDualDistance(distance);
  const elementsToDestroy: any[] = [];

  // Fundo escuro com transparência (Fade In)
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(10, 25, 50),
    k.opacity(0.92),
    k.fixed(),
    k.z(200),
  ]);
  elementsToDestroy.push(backdrop);

  const cardW = Math.min(580, k.width() - 24);
  const cardH = Math.min(430, k.height() - 20);
  const centerX = k.width() / 2;
  const centerY = k.height() / 2;

  // Card do Relatório
  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(centerX, centerY),
    k.color(14, 32, 64),
    k.outline(2.5, k.rgb(0, 210, 255)),
    k.anchor("center"),
    k.fixed(),
    k.z(201),
  ]);
  elementsToDestroy.push(card);

  // Título do Resgate com Sombra de Legibilidade (Fase 32.3)
  const titleShadowHandle = addShadowedText(k, "🚨 RESGATE DA GUARDA MARÍTIMA 🚨", {
    pos: k.vec2(centerX, centerY - cardH / 2 + 36),
    size: accessibilitySystem.scaleFont(TEXT_SIZE_H1),
    font: FONT_TITLE,
    color: k.rgb(255, 220, 40),
    shadowColor: k.rgb(4, 12, 28),
    anchor: "center",
    z: 203,
  });
  elementsToDestroy.push(titleShadowHandle);

  // Subtítulo acolhedor
  const subTitle = k.add([
    k.text("Santuário de Arraial do Cabo — Cuidados Veterinários", {
      size: accessibilitySystem.scaleFont(TEXT_SIZE_CAPTION + 1),
      font: FONT_BODY,
    }),
    k.pos(centerX, centerY - cardH / 2 + 64),
    k.color(130, 205, 245),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);
  elementsToDestroy.push(subTitle);

  // Parágrafo Narrativo Imersivo da Viagem (Fase 32.7)
  const narrativeText =
    `A jovem jubarte bravamente completou ${dualDistStr} de sua jornada pelas águas do Atlântico Sul.\n\n` +
    `Durante o percurso, filtrou ${gameState.getKrillCount()} cardumes de krill nutritivo e enfrentou correntes adversas ao longo de ${gameState.getElapsedTime()}s de travessia.\n\n` +
    `Após exaustão respiratória, a Guarda Marítima e biólogos a estabilizaram com segurança no santuário costeiro. Ela está pronta para um novo mergulho!`;

  const narrative = k.add([
    k.text(narrativeText, {
      size: accessibilitySystem.scaleFont(TEXT_SIZE_BODY - 0.5),
      font: FONT_BODY,
      width: cardW - 56,
      lineSpacing: 5.5,
      align: "center",
    }),
    k.pos(centerX, centerY - 28),
    k.color(225, 242, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);
  elementsToDestroy.push(narrative);

  // Painel de Destaques de Pontuação e Recorde
  const scoreBox = k.add([
    k.rect(cardW - 56, 36, { radius: 8 }),
    k.pos(centerX, centerY + 86),
    k.color(8, 22, 46),
    k.outline(1.5, k.rgb(40, 110, 180)),
    k.anchor("center"),
    k.fixed(),
    k.z(203),
  ]);
  elementsToDestroy.push(scoreBox);

  const scoreLabel = k.add([
    k.text(
      `⭐ Pontuação: ${finalScore} pts   •   🏆 Recorde: ${highScore} pts   •   🗑️ Lixo evitado: ${gameState.getTrashCount()}`,
      {
        size: accessibilitySystem.scaleFont(TEXT_SIZE_CAPTION + 1),
        font: FONT_BODY,
      }
    ),
    k.pos(centerX, centerY + 86),
    k.color(255, 235, 160),
    k.anchor("center"),
    k.fixed(),
    k.z(204),
  ]);
  elementsToDestroy.push(scoreLabel);

  // Botão interativo para reiniciar com KeyBadge físico integrado (Fase 32.8)
  const btnW = 340;
  const btnH = 48;
  const btnY = centerY + cardH / 2 - 38;

  const restartButton = k.add([
    k.rect(btnW, btnH, { radius: 10 }),
    k.pos(centerX, btnY),
    k.color(20, 95, 155),
    k.outline(2, k.rgb(0, 225, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(204),
  ]);
  elementsToDestroy.push(restartButton);

  const btnLabel = k.add([
    k.text("Tentar Novamente", {
      size: accessibilitySystem.scaleFont(TEXT_SIZE_BODY + 1),
      font: FONT_BODY,
    }),
    k.pos(centerX - 35, btnY),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(205),
  ]);
  elementsToDestroy.push(btnLabel);

  // Badge visual de tecla mecânica [ENTER] (Fase 32.8)
  const enterBadge = createKeyBadge(k, {
    pos: k.vec2(centerX + 85, btnY),
    keyLabel: "ENTER",
    fontSize: 11,
    minWidth: 54,
    z: 206,
  });
  elementsToDestroy.push(enterBadge);

  let isRestarting = false;
  const triggerRestart = () => {
    if (isRestarting) return;
    isRestarting = true;
    cancelKeyPress.cancel();
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

  restartButton.onHoverUpdate(() => {
    restartButton.color = k.rgb(32, 145, 215);
  });
  restartButton.onHoverEnd(() => {
    restartButton.color = k.rgb(20, 95, 155);
  });
  restartButton.onClick(triggerRestart);

  // Gatilho de Reinício ao pressionar Enter
  const cancelKeyPress = k.onKeyPress("enter", triggerRestart);
}

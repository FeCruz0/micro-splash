import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { getTop10Entries } from "../systems/leaderboard";

export function showLeaderboardScreen(k: KaboomCtx, onClose: () => void) {
  audioSystem.playUiClick();
  const elements: any[] = [];

  // Fundo translúcido
  elements.push(
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(4, 12, 28),
      k.opacity(0.94),
      k.fixed(),
      k.z(300),
    ])
  );

  const cardW = 660;
  const cardH = 490;
  const centerX = k.width() / 2;
  const centerY = k.height() / 2;

  // Caixa da tabela
  elements.push(
    k.add([
      k.rect(cardW, cardH, { radius: 14 }),
      k.pos(centerX, centerY),
      k.color(10, 28, 60),
      k.outline(3, k.rgb(255, 215, 60)),
      k.anchor("center"),
      k.fixed(),
      k.z(301),
    ])
  );

  // Título e Subtítulo
  elements.push(
    k.add([
      k.text("🏆 RANKING TOP 10 — RECORDE HISTÓRICO", { size: 18, font: "sans-serif" }),
      k.pos(centerX, centerY - 215),
      k.color(255, 220, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  elements.push(
    k.add([
      k.text("Os maiores navegadores e protetores da rota da baleia-jubarte:", {
        size: 11,
        font: "sans-serif",
      }),
      k.pos(centerX, centerY - 188),
      k.color(180, 230, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Cabeçalho da tabela
  const startY = centerY - 155;
  const rowHeight = 31;

  elements.push(
    k.add([
      k.rect(cardW - 40, 26, { radius: 4 }),
      k.pos(centerX, startY),
      k.color(18, 50, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const headerText = "POS   INICIAIS     ECO-PONTOS     DISTÂNCIA      MODO           DATA";
  elements.push(
    k.add([
      k.text(headerText, { size: 11, font: "monospace" }),
      k.pos(centerX - (cardW - 60) / 2, startY),
      k.color(255, 230, 140),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  // Linhas dos 10 colocados
  const entries = getTop10Entries();

  entries.forEach((entry, idx) => {
    const y = startY + 22 + idx * rowHeight;
    const isTop1 = idx === 0;
    const isTop2 = idx === 1;
    const isTop3 = idx === 2;

    const medal = isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : `${(idx + 1).toString().padStart(2, " ")}º`;
    const modeLabel =
      entry.mode === "quick_challenge" ? "Desafio 60s" : entry.mode === "serene" ? "Serena" : "Clássico";

    const posCol = medal.padEnd(5, " ");
    const initCol = entry.initials.padEnd(11, " ");
    const scoreCol = `${entry.score} pts`.padEnd(15, " ");
    const distCol = `${entry.distance}m`.padEnd(15, " ");
    const modeCol = modeLabel.padEnd(15, " ");
    const dateCol = entry.date || "--/--";

    const line = `${posCol} ${initCol} ${scoreCol} ${distCol} ${modeCol} ${dateCol}`;

    // Fundo zebrado
    if (idx % 2 === 0) {
      elements.push(
        k.add([
          k.rect(cardW - 40, rowHeight - 4, { radius: 4 }),
          k.pos(centerX, y + 10),
          k.color(14, 38, 78),
          k.opacity(0.6),
          k.anchor("center"),
          k.fixed(),
          k.z(302),
        ])
      );
    }

    const textColor = isTop1
      ? k.rgb(255, 220, 80)
      : isTop2
      ? k.rgb(220, 235, 255)
      : isTop3
      ? k.rgb(240, 180, 120)
      : k.rgb(200, 230, 255);

    elements.push(
      k.add([
        k.text(line, { size: 11, font: "monospace" }),
        k.pos(centerX - (cardW - 60) / 2, y + 10),
        k.color(textColor),
        k.anchor("left"),
        k.fixed(),
        k.z(303),
      ])
    );
  });

  // Botão Fechar
  const btnClose = k.add([
    k.rect(220, 38, { radius: 8 }),
    k.pos(centerX, centerY + 205),
    k.color(24, 75, 130),
    k.outline(2, k.rgb(100, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnClose);

  elements.push(
    k.add([
      k.text("Fechar (ESC / ENTER) ✖", { size: 12, font: "sans-serif" }),
      k.pos(centerX, centerY + 205),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  btnClose.onHoverUpdate(() => {
    btnClose.color = k.rgb(35, 110, 180);
  });
  btnClose.onHoverEnd(() => {
    btnClose.color = k.rgb(24, 75, 130);
  });

  let isClosed = false;
  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    keyEsc.cancel();
    keyEnter.cancel();
    elements.forEach((el) => k.destroy(el));
    onClose();
  };

  btnClose.onClick(close);
  const keyEsc = k.onKeyPress("escape", close);
  const keyEnter = k.onKeyPress("enter", close);
}

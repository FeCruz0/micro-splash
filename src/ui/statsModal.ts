import type { KaboomCtx } from "kaboom";
import {
  getCumulativeStats,
  formatDistanceKm,
  formatPlayTime,
  formatSuccessRate,
} from "../systems/cumulativeStats";
import { audioSystem } from "../systems/audioSystem";

export function showStatsModal(k: KaboomCtx, onClose: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;
  let canInteract = false;

  k.wait(0.12, () => {
    canInteract = true;
  });

  // Fundo escurecido semitransparente
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(4, 12, 28),
    k.opacity(0.92),
    k.area(),
    k.fixed(),
    k.z(290),
  ]);
  elements.push(backdrop);

  // Card do Modal Principal
  const cardW = Math.min(680, k.width() - 40);
  const cardH = Math.min(480, k.height() - 30);
  const card = k.add([
    k.rect(cardW, cardH, { radius: 14 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(10, 26, 52),
    k.outline(3, k.rgb(0, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(291),
  ]);
  elements.push(card);

  // Cabeçalho
  elements.push(
    k.add([
      k.text("📊 IMPACTO ECOLÓGICO COLETIVO", { size: 20, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 - cardH / 2 + 34),
      k.color(255, 230, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(292),
    ])
  );

  elements.push(
    k.add([
      k.text("Métricas agregadas de todas as migrações realizadas pelos jogadores", {
        size: 11,
        font: "sans-serif",
      }),
      k.pos(k.width() / 2, k.height() / 2 - cardH / 2 + 58),
      k.color(170, 220, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(292),
    ])
  );

  const stats = getCumulativeStats();
  const successRate = formatSuccessRate(
    stats.totalMigrationsCompleted,
    stats.totalMigrationsAttempted
  );
  const totalBiomassTons = (stats.totalKrillCollected * 1.5).toFixed(1);

  // Grid de 6 Cartões de Métricas (2 colunas x 3 linhas)
  const metricCards = [
    {
      title: "🐋 MIGRAÇÕES CONCLUÍDAS",
      mainVal: `${stats.totalMigrationsCompleted} / ${stats.totalMigrationsAttempted}`,
      subVal: `Taxa de Sucesso: ${successRate}`,
      color: k.rgb(100, 240, 255),
    },
    {
      title: "🌊 DISTÂNCIA NAVEGADA",
      mainVal: formatDistanceKm(stats.totalDistanceMeters),
      subVal: "Oceano Antártico até Arraial",
      color: k.rgb(120, 255, 210),
    },
    {
      title: "🦐 KRILL & BIOMASSA",
      mainVal: `${stats.totalKrillCollected} Cardumes`,
      subVal: `~${totalBiomassTons} t de biomassa ecológica`,
      color: k.rgb(255, 215, 80),
    },
    {
      title: "🛡️ RESÍDUOS ENFRENTADOS",
      mainVal: `${stats.totalTrashAvoided} Detritos`,
      subVal: "Redes fantasmas e plásticos",
      color: k.rgb(255, 140, 120),
    },
    {
      title: "⏱️ TEMPO EM ALTO MAR",
      mainVal: formatPlayTime(stats.totalPlayTimeSeconds),
      subVal: "Exploração e conscientização",
      color: k.rgb(190, 190, 255),
    },
    {
      title: "🎓 QUIZ ECOLÓGICO",
      mainVal: `${stats.quizCorrectAnswers} Acertos`,
      subVal: `${stats.quizzesTaken} Quizzes realizados`,
      color: k.rgb(140, 255, 180),
    },
  ];

  const gridStartX = k.width() / 2 - 150;
  const gridStartY = k.height() / 2 - cardH / 2 + 115;
  const colWidth = 300;
  const rowHeight = 85;

  metricCards.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const posX = gridStartX + (col === 0 ? -colWidth / 2 + 10 : colWidth / 2 - 10);
    const posY = gridStartY + row * rowHeight;

    // Fundo do card da métrica
    const metricBox = k.add([
      k.rect(280, 72, { radius: 8 }),
      k.pos(posX, posY),
      k.color(16, 38, 76),
      k.outline(1.5, k.rgb(45, 85, 140)),
      k.anchor("center"),
      k.fixed(),
      k.z(293),
    ]);
    elements.push(metricBox);

    // Título da métrica
    elements.push(
      k.add([
        k.text(item.title, { size: 10, font: "sans-serif" }),
        k.pos(posX - 125, posY - 22),
        k.color(180, 215, 245),
        k.fixed(),
        k.z(294),
      ])
    );

    // Valor Principal em destaque
    elements.push(
      k.add([
        k.text(item.mainVal, { size: 18, font: "sans-serif" }),
        k.pos(posX - 125, posY - 4),
        k.color(item.color),
        k.fixed(),
        k.z(294),
      ])
    );

    // Sub-legenda informativa
    elements.push(
      k.add([
        k.text(item.subVal, { size: 9, font: "sans-serif" }),
        k.pos(posX - 125, posY + 16),
        k.color(140, 180, 215),
        k.fixed(),
        k.z(294),
      ])
    );
  });

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    onClose();
  };

  // Botão Voltar ao Menu
  const btnClose = k.add([
    k.rect(240, 42, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + cardH / 2 - 38),
    k.color(24, 75, 140),
    k.outline(2, k.rgb(0, 220, 255)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(294),
  ]);
  elements.push(btnClose);

  const btnText = k.add([
    k.text("VOLTAR AO MENU", { size: 13, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + cardH / 2 - 38),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(295),
  ]);
  elements.push(btnText);

  btnClose.onHoverUpdate(() => {
    btnClose.color = k.rgb(35, 110, 190);
    btnClose.scale = k.vec2(1.02, 1.02);
  });
  btnClose.onHoverEnd(() => {
    btnClose.color = k.rgb(24, 75, 140);
    btnClose.scale = k.vec2(1, 1);
  });
  btnClose.onClick(() => {
    if (canInteract) close();
  });

  // Teclas ESC / ENTER para fechar
  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed || !canInteract) return;
    if (e.key === "Escape" || e.key === "Enter") {
      window.removeEventListener("keydown", keyHandler);
      close();
    }
  };
  window.addEventListener("keydown", keyHandler);
}

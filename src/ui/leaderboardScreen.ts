import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { getTop10Entries, type LeaderboardEntry } from "../systems/leaderboard";
import { getWeeklyTop10Entries, getWeeklyChallengeInfo } from "../systems/weeklyChallenge";
import { fetchOnlineLeaderboard } from "../services/leaderboardApi";

type LeaderboardTab = "global" | "weekly" | "local";

export function showLeaderboardScreen(k: KaboomCtx, onClose: () => void) {
  audioSystem.playUiClick();
  const elements: any[] = [];
  let tableElements: any[] = [];
  let isClosed = false;

  let activeTab: LeaderboardTab = "global";
  const statusMessage = "Conectando ao servidor global...";

  const cardW = 720;
  const cardH = 530;
  const centerX = k.width() / 2;
  const centerY = k.height() / 2;

  // Fundo translúcido
  elements.push(
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(4, 12, 28),
      k.opacity(0.95),
      k.fixed(),
      k.z(300),
    ])
  );

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

  // Título
  elements.push(
    k.add([
      k.text("🏆 RANKING TOP 10 — QUADRO DE RECORDES", { size: 18, font: "sans-serif" }),
      k.pos(centerX, centerY - 238),
      k.color(255, 220, 80),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Botões de Abas
  const tabs: Array<{ id: LeaderboardTab; label: string }> = [
    { id: "global", label: "🌐 Global Online" },
    { id: "weekly", label: "📅 Desafio Semanal" },
    { id: "local", label: "💾 Local / Totem" },
  ];

  const tabBtns: any[] = [];
  const tabW = 200;
  const tabStartX = centerX - (tabs.length * (tabW + 10)) / 2 + tabW / 2;

  tabs.forEach((tab, i) => {
    const tX = tabStartX + i * (tabW + 10);
    const tY = centerY - 198;

    const btn = k.add([
      k.rect(tabW, 28, { radius: 6 }),
      k.pos(tX, tY),
      k.color(activeTab === tab.id ? k.rgb(24, 85, 150) : k.rgb(15, 38, 70)),
      k.outline(1.5, activeTab === tab.id ? k.rgb(120, 230, 255) : k.rgb(60, 110, 160)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(303),
    ]);
    elements.push(btn);
    tabBtns.push(btn);

    const txt = k.add([
      k.text(tab.label, { size: 12, font: "sans-serif" }),
      k.pos(tX, tY),
      k.color(activeTab === tab.id ? k.rgb(255, 255, 255) : k.rgb(180, 210, 240)),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(txt);

    btn.onClick(() => {
      if (isClosed || activeTab === tab.id) return;
      audioSystem.playUiClick();
      activeTab = tab.id;
      updateTabsUI();
      loadTabData();
    });
  });

  const updateTabsUI = () => {
    tabs.forEach((tab, i) => {
      const isSel = activeTab === tab.id;
      tabBtns[i].color = isSel ? k.rgb(24, 85, 150) : k.rgb(15, 38, 70);
      tabBtns[i].outline.color = isSel ? k.rgb(120, 230, 255) : k.rgb(60, 110, 160);
    });
  };

  // Linha de Status de Conexão
  const statusTxt = k.add([
    k.text(statusMessage, { size: 11, font: "sans-serif" }),
    k.pos(centerX, centerY - 164),
    k.color(180, 220, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(statusTxt);

  // Cabeçalho da tabela
  const startY = centerY - 134;
  const rowHeight = 29;

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

  // Função para renderizar as linhas da tabela
  const renderTableRows = (entries: LeaderboardEntry[]) => {
    // Destrói elementos da tabela anterior
    tableElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    tableElements = [];

    entries.slice(0, 10).forEach((entry, idx) => {
      const y = startY + 20 + idx * rowHeight;
      const isTop1 = idx === 0;
      const isTop2 = idx === 1;
      const isTop3 = idx === 2;

      const medal = isTop1
        ? "🥇"
        : isTop2
          ? "🥈"
          : isTop3
            ? "🥉"
            : `${(idx + 1).toString().padStart(2, " ")}º`;
      const modeLabel =
        entry.mode === "weekly"
          ? "Semanal"
          : entry.mode === "quick_challenge"
            ? "Desafio 60s"
            : entry.mode === "serene"
              ? "Serena"
              : "Clássico";

      const posCol = medal.padEnd(5, " ");
      const initCol = (entry.initials || "AAA").padEnd(11, " ");
      const scoreCol = `${entry.score} pts`.padEnd(15, " ");
      const distCol = `${entry.distance}m`.padEnd(15, " ");
      const modeCol = modeLabel.padEnd(15, " ");
      const dateCol = entry.date || "--/--";

      const line = `${posCol} ${initCol} ${scoreCol} ${distCol} ${modeCol} ${dateCol}`;

      // Fundo zebrado
      if (idx % 2 === 0) {
        const bgRow = k.add([
          k.rect(cardW - 40, rowHeight - 4, { radius: 4 }),
          k.pos(centerX, y + 10),
          k.color(14, 38, 78),
          k.opacity(0.6),
          k.anchor("center"),
          k.fixed(),
          k.z(302),
        ]);
        tableElements.push(bgRow);
        elements.push(bgRow);
      }

      const textColor = isTop1
        ? k.rgb(255, 220, 80)
        : isTop2
          ? k.rgb(220, 235, 255)
          : isTop3
            ? k.rgb(240, 180, 120)
            : k.rgb(200, 230, 255);

      const rowTxt = k.add([
        k.text(line, { size: 11, font: "monospace" }),
        k.pos(centerX - (cardW - 60) / 2, y + 10),
        k.color(textColor),
        k.anchor("left"),
        k.fixed(),
        k.z(303),
      ]);
      tableElements.push(rowTxt);
      elements.push(rowTxt);
    });
  };

  const loadTabData = () => {
    const weeklyChallenge = getWeeklyChallengeInfo();

    if (activeTab === "local") {
      statusTxt.text = "💾 Exibindo dados locais do dispositivo / totem (Offline-First)";
      statusTxt.color = k.rgb(180, 230, 255);
      renderTableRows(getTop10Entries());
      return;
    }

    if (activeTab === "weekly") {
      // Exibe imediatamente o ranking semanal local/cache
      const localWeekly = getWeeklyTop10Entries(weeklyChallenge.weekKey);
      renderTableRows(localWeekly);

      statusTxt.text = `📅 ${weeklyChallenge.weekLabel} (Semente #${weeklyChallenge.seed}) • Sincronizando...`;
      statusTxt.color = k.rgb(255, 220, 120);

      fetchOnlineLeaderboard("weekly", weeklyChallenge.weekKey).then((res) => {
        if (isClosed || activeTab !== "weekly") return;
        if (res.success && res.data.length > 0) {
          statusTxt.text = res.isOffline
            ? `🟡 ${weeklyChallenge.weekLabel} (Exibindo cache offline)`
            : `🟢 ${weeklyChallenge.weekLabel} • Servidor Global Conectado`;
          statusTxt.color = res.isOffline ? k.rgb(255, 210, 100) : k.rgb(100, 255, 180);
          renderTableRows(res.data);
        } else {
          statusTxt.text = `🟡 ${weeklyChallenge.weekLabel} (Modo Offline — Registro Local)`;
          statusTxt.color = k.rgb(255, 210, 100);
        }
      });
      return;
    }

    // activeTab === "global"
    const localTop10 = getTop10Entries();
    renderTableRows(localTop10);
    statusTxt.text = "🌐 Consultando ranking mundial em tempo real...";
    statusTxt.color = k.rgb(180, 220, 255);

    fetchOnlineLeaderboard("global").then((res) => {
      if (isClosed || activeTab !== "global") return;
      if (res.success && res.data.length > 0) {
        statusTxt.text = res.isOffline
          ? "🟡 Conexão instável — Exibindo cache local sincronizado"
          : "🟢 Servidor Global Conectado — Top 10 Mundial";
        statusTxt.color = res.isOffline ? k.rgb(255, 210, 100) : k.rgb(100, 255, 180);
        renderTableRows(res.data);
      } else {
        statusTxt.text = "🟡 Servidor offline ou inacessível — Exibindo recordes locais";
        statusTxt.color = k.rgb(255, 210, 100);
      }
    });
  };

  // Carrega a aba inicial
  loadTabData();

  // Botão Fechar
  const btnClose = k.add([
    k.rect(220, 36, { radius: 8 }),
    k.pos(centerX, centerY + 225),
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
      k.pos(centerX, centerY + 225),
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

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    keyEsc.cancel();
    keyEnter.cancel();
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    onClose();
  };

  btnClose.onClick(close);
  const keyEsc = k.onKeyPress("escape", close);
  const keyEnter = k.onKeyPress("enter", close);
}

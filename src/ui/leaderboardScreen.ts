import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { getTop10Entries, type LeaderboardEntry } from "../systems/leaderboard";
import { getWeeklyTop10Entries, getWeeklyChallengeInfo } from "../systems/weeklyChallenge";
import { fetchOnlineLeaderboard } from "../services/leaderboardApi";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";

type LeaderboardTab = "global" | "weekly" | "local";

export function showLeaderboardScreen(k: KaboomCtx, onClose: () => void) {
  audioSystem.playUiClick();
  const elements: any[] = [];
  let tableElements: any[] = [];
  let isClosed = false;

  let activeTab: LeaderboardTab = "global";
  const statusMessage = "🌐 Consultando ranking mundial em tempo real...";
  const statusColor = k.rgb(180, 220, 255);

  const cardW = Math.min(1000, k.width() - 24);
  const cardH = Math.min(660, k.height() - 20);
  const centerX = k.width() / 2;
  const centerY = k.height() / 2;

  // Fundo escuro semitransparente
  elements.push(
    k.add([
      k.rect(k.width(), k.height()),
      k.pos(0, 0),
      k.color(4, 14, 32),
      k.opacity(0.95),
      k.area(),
      k.fixed(),
      k.z(300),
    ])
  );

  // Card do Modal Principal com contorno dourado de prestígio ampliado
  elements.push(
    k.add([
      k.rect(cardW, cardH, { radius: 16 }),
      k.pos(centerX, centerY),
      k.color(10, 28, 56),
      k.outline(2.5, k.rgb(250, 204, 21)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(301),
    ])
  );

  // Título Principal
  elements.push(
    k.add([
      k.text("🏆 RANKING TOP 10 — QUADRO DE RECORDES", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      k.pos(centerX, centerY - cardH / 2 + 32),
      k.color(255, 225, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    if (focusGroup) {
      focusGroup.destroy();
    }
    window.removeEventListener("keydown", keyHandler);
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    tableElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    onClose();
  };

  // Botão fechar [X] no topo direito
  const btnXPos = k.vec2(centerX + cardW / 2 - 32, centerY - cardH / 2 + 32);
  const btnX = k.add([
    k.rect(38, 38, { radius: 8 }),
    k.pos(btnXPos),
    k.color(22, 50, 90),
    k.outline(1.5, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnX);

  elements.push(
    k.add([
      k.text("✕", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      k.pos(btnXPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnX.onHoverUpdate(() => {
    btnX.color = k.rgb(180, 50, 50);
    btnX.scale = k.vec2(1.05, 1.05);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(22, 50, 90);
    btnX.scale = k.vec2(1, 1);
  });
  btnX.onClick(close);

  // Botões de Abas
  const tabs: Array<{ id: LeaderboardTab; label: string }> = [
    { id: "global", label: "🌐 Global Online" },
    { id: "weekly", label: "📅 Desafio Semanal" },
    { id: "local", label: "💾 Local / Totem" },
  ];

  const tabBtns: any[] = [];
  const tabEntities: any[] = [];
  const tabW = Math.min(280, (cardW - 60) / 3);
  const tabH = 42;
  const tabY = centerY - cardH / 2 + 82;

  tabs.forEach((tab, i) => {
    const tX = centerX - tabW - 14 + i * (tabW + 14);

    const btn = k.add([
      k.rect(tabW, tabH, { radius: 9 }),
      k.pos(tX, tabY),
      k.color(activeTab === tab.id ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60)),
      k.outline(
        activeTab === tab.id ? 2 : 1,
        activeTab === tab.id ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115)
      ),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(303),
    ]);
    elements.push(btn);
    tabBtns.push(btn);

    const txt = k.add([
      k.text(tab.label, {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(tX, tabY),
      k.color(activeTab === tab.id ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235)),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(txt);
    tabEntities.push({ btn, txt, id: tab.id });

    btn.onHoverUpdate(() => {
      if (activeTab !== tab.id) {
        btn.color = k.rgb(25, 55, 95);
        btn.scale = k.vec2(1.02, 1.02);
      }
    });
    btn.onHoverEnd(() => {
      btn.scale = k.vec2(1, 1);
      updateTabsUI();
    });

    btn.onClick(() => {
      if (isClosed || activeTab === tab.id) return;
      audioSystem.playUiClick();
      activeTab = tab.id;
      updateTabsUI();
      loadTabData();
    });
  });

  const updateTabsUI = () => {
    tabEntities.forEach((t) => {
      const isSel = activeTab === t.id;
      t.btn.color = isSel ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60);
      t.btn.outline = {
        width: isSel ? 2 : 1,
        color: isSel ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115),
      };
      t.txt.color = isSel ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235);
    });
  };

  // Barra de Status de Conexão com fundo estilizado
  const statusBoxW = cardW - 48;
  const statusY = centerY - cardH / 2 + 126;

  elements.push(
    k.add([
      k.rect(statusBoxW, 32, { radius: 6 }),
      k.pos(centerX, statusY),
      k.color(8, 22, 46),
      k.outline(1, k.rgb(35, 75, 125)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const statusTxt = k.add([
    k.text(statusMessage, {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    k.pos(centerX, statusY),
    k.color(statusColor),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]);
  elements.push(statusTxt);

  // Largura útil da tabela e coordenadas exatas de cada coluna
  const tableW = cardW - 48;
  const headerY = centerY - cardH / 2 + 162;
  const rowHeight = 37;
  const rowStartY = headerY + 20 + 16;

  const colPos = centerX - tableW / 2 + 50;
  const colInit = centerX - tableW / 2 + 155;
  const colScore = centerX - tableW / 2 + 315;
  const colDist = centerX - tableW / 2 + 485;
  const colMode = centerX - tableW / 2 + 655;
  const colDate = centerX - tableW / 2 + 810;

  // Fundo do Cabeçalho da Tabela
  elements.push(
    k.add([
      k.rect(tableW, 36, { radius: 8 }),
      k.pos(centerX, headerY),
      k.color(18, 48, 95),
      k.outline(1.5, k.rgb(56, 189, 248)),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const headerCols = [
    { label: "POS", x: colPos },
    { label: "INICIAIS", x: colInit },
    { label: "ECO-PONTOS", x: colScore },
    { label: "DISTÂNCIA", x: colDist },
    { label: "MODO", x: colMode },
    { label: "DATA", x: colDate },
  ];

  headerCols.forEach((col) => {
    elements.push(
      k.add([
        k.text(col.label, {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Outfit",
        }),
        k.pos(col.x, headerY),
        k.color(255, 225, 110),
        k.anchor("center"),
        k.fixed(),
        k.z(303),
      ])
    );
  });

  // Função para renderizar as linhas da tabela com colunas alinhadas independentes
  const renderTableRows = (entries: LeaderboardEntry[]) => {
    tableElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    tableElements = [];

    entries.slice(0, 10).forEach((entry, idx) => {
      const y = rowStartY + idx * rowHeight;
      const isTop1 = idx === 0;
      const isTop2 = idx === 1;
      const isTop3 = idx === 2;

      // Fundo individual de cada linha com efeito zebrado
      const rowBg = k.add([
        k.rect(tableW, 33, { radius: 6 }),
        k.pos(centerX, y),
        k.color(idx % 2 === 0 ? k.rgb(14, 34, 68) : k.rgb(10, 26, 52)),
        k.outline(1, isTop1 ? k.rgb(255, 215, 80) : k.rgb(30, 68, 115)),
        k.anchor("center"),
        k.fixed(),
        k.z(302),
      ]);
      tableElements.push(rowBg);

      const medal = isTop1 ? "🥇 1º" : isTop2 ? "🥈 2º" : isTop3 ? "🥉 3º" : `${idx + 1}º`;
      const modeLabel =
        entry.mode === "weekly"
          ? "Semanal"
          : entry.mode === "quick_challenge"
            ? "Desafio 60s"
            : entry.mode === "serene"
              ? "Serena"
              : "Clássico";

      const textColor = isTop1
        ? k.rgb(255, 225, 100)
        : isTop2
          ? k.rgb(220, 240, 255)
          : isTop3
            ? k.rgb(250, 190, 130)
            : k.rgb(205, 230, 255);

      // Coluna 1: Posição / Medalha
      tableElements.push(
        k.add([
          k.text(medal, {
            size: accessibilitySystem.scaleFont(15),
            font: "Outfit",
          }),
          k.pos(colPos, y),
          k.color(textColor),
          k.anchor("center"),
          k.fixed(),
          k.z(303),
        ])
      );

      // Coluna 2: Iniciais
      tableElements.push(
        k.add([
          k.text(entry.initials || "AAA", {
            size: accessibilitySystem.scaleFont(15.5),
            font: "Outfit",
          }),
          k.pos(colInit, y),
          k.color(255, 255, 255),
          k.anchor("center"),
          k.fixed(),
          k.z(303),
        ])
      );

      // Coluna 3: Eco-Pontos
      tableElements.push(
        k.add([
          k.text(`${entry.score.toLocaleString()} pts`, {
            size: accessibilitySystem.scaleFont(15),
            font: "Outfit",
          }),
          k.pos(colScore, y),
          k.color(isTop1 ? k.rgb(255, 225, 100) : k.rgb(100, 240, 255)),
          k.anchor("center"),
          k.fixed(),
          k.z(303),
        ])
      );

      // Coluna 4: Distância
      tableElements.push(
        k.add([
          k.text(`${entry.distance.toLocaleString()}m`, {
            size: accessibilitySystem.scaleFont(14.5),
            font: "Inter",
          }),
          k.pos(colDist, y),
          k.color(215, 235, 255),
          k.anchor("center"),
          k.fixed(),
          k.z(303),
        ])
      );

      // Coluna 5: Modo de Jogo
      tableElements.push(
        k.add([
          k.text(modeLabel, {
            size: accessibilitySystem.scaleFont(14),
            font: "Inter",
          }),
          k.pos(colMode, y),
          k.color(180, 220, 250),
          k.anchor("center"),
          k.fixed(),
          k.z(303),
        ])
      );

      // Coluna 6: Data
      tableElements.push(
        k.add([
          k.text(entry.date || "--/--", {
            size: accessibilitySystem.scaleFont(13.5),
            font: "Inter",
          }),
          k.pos(colDate, y),
          k.color(170, 205, 235),
          k.anchor("center"),
          k.fixed(),
          k.z(303),
        ])
      );
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

  // Botão Fechar no rodapé
  const btnClosePos = k.vec2(centerX, centerY + cardH / 2 - 32);
  const btnClose = k.add([
    k.rect(280, 46, { radius: 10 }),
    k.pos(btnClosePos),
    k.color(24, 85, 150),
    k.outline(2, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnClose);

  elements.push(
    k.add([
      k.text("Fechar (ESC) ✕", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnClosePos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  btnClose.onHoverUpdate(() => {
    btnClose.color = k.rgb(35, 115, 200);
    btnClose.scale = k.vec2(1.02, 1.02);
  });
  btnClose.onHoverEnd(() => {
    btnClose.color = k.rgb(24, 85, 150);
    btnClose.scale = k.vec2(1, 1);
  });
  btnClose.onClick(close);

  // Grupo de foco por teclado acessível
  const focusItems: FocusableItem[] = [
    {
      pos: btnXPos,
      width: 38,
      height: 38,
      onActivate: close,
    },
    ...tabEntities.map((t) => ({
      pos: t.btn.pos,
      width: tabW,
      height: tabH,
      onActivate: () => {
        audioSystem.playUiClick();
        activeTab = t.id;
        updateTabsUI();
        loadTabData();
      },
    })),
    {
      pos: btnClosePos,
      width: 280,
      height: 46,
      onActivate: close,
    },
  ];

  const focusGroup = createFocusGroup(k, {
    items: focusItems,
    initialIndex: focusItems.length - 1,
    ringZ: 315,
  });

  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed) return;
    if (e.key === "Escape") {
      close();
    }
  };
  window.addEventListener("keydown", keyHandler);
}

import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { getTop10Entries, type LeaderboardEntry } from "../systems/leaderboard";
import { getWeeklyTop10Entries, getWeeklyChallengeInfo } from "../systems/weeklyChallenge";
import { fetchOnlineLeaderboard } from "../services/leaderboardApi";
import { createFocusGroup, type FocusableItem, type LegacyKeyboardNavContext } from "./keyboardNav";
import { UI_COLORS, UI_RADII, UI_Z_INDEX, getModalDimensions } from "./theme";
import {
  createTabBar,
  createCardButton,
  staggerElementsEntrance,
  type MotionTargetObject,
} from "./shared";
import type { LegacyCardButtonContext } from "./shared/cardButton";
import type { LegacyTabBarContext } from "./shared/tabBar";

export type LeaderboardTab = "global" | "weekly" | "local";

export interface ShowLeaderboardEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyLeaderboardUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number };
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  pos?: { x: number; y: number };
  destroy?(): void;
  onHoverUpdate(callback: () => void): unknown;
  onHoverEnd(callback: () => void): unknown;
  onClick(callback: () => void): unknown;
}

export interface LegacyLeaderboardEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): LegacyLeaderboardUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top"): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  area(): unknown;
  scale(factor: number): unknown;
  scale(factor: { x: number; y: number }): unknown;
  text(content: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  vec2(x: number, y: number): { x: number; y: number };
}

export function showLeaderboardScreen(k: ShowLeaderboardEngineContext, onClose: () => void) {
  const engine = k as unknown as LegacyLeaderboardEngineContext;
  audioSystem.playUiClick();
  const elements: Array<{ destroy?: () => void } | object> = [];
  let tableElements: Array<{ destroy?: () => void } | object> = [];
  let isClosed = false;

  let activeTab: LeaderboardTab = "global";
  const statusMessage = "🌐 Consultando ranking mundial em tempo real...";
  const statusColor = engine.rgb(180, 220, 255);

  const {
    cardW,
    cardH,
    cX: centerX,
    cY: centerY,
  } = getModalDimensions(engine.width(), engine.height(), "tall");

  // Fundo escuro semitransparente
  elements.push(
    engine.add([
      engine.rect(engine.width(), engine.height()),
      engine.pos(0, 0),
      engine.color(UI_COLORS.backdrop[0], UI_COLORS.backdrop[1], UI_COLORS.backdrop[2]),
      engine.opacity(UI_COLORS.backdropOpacity),
      engine.area(),
      engine.fixed(),
      engine.z(UI_Z_INDEX.backdrop),
    ])
  );

  // Card do Modal Principal com contorno dourado de prestígio ampliado
  elements.push(
    engine.add([
      engine.rect(cardW, cardH, { radius: UI_RADII.xl }),
      engine.pos(centerX, centerY),
      engine.color(UI_COLORS.panel[0], UI_COLORS.panel[1], UI_COLORS.panel[2]),
      engine.outline(
        2.5,
        engine.rgb(UI_COLORS.borderGold[0], UI_COLORS.borderGold[1], UI_COLORS.borderGold[2])
      ),
      engine.anchor("center"),
      engine.area(),
      engine.fixed(),
      engine.z(UI_Z_INDEX.modalCard),
    ])
  );

  // Título Principal
  elements.push(
    engine.add([
      engine.text("🏆 RANKING TOP 10 — QUADRO DE RECORDES", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      engine.pos(centerX, centerY - cardH / 2 + 32),
      engine.color(255, 225, 100),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(302),
    ])
  );

  let keyHandler: ((event: KeyboardEvent) => void) | null = null;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    if (focusGroup) {
      focusGroup.destroy();
    }
    if (typeof window !== "undefined" && keyHandler) {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        engine.destroy(el);
      } catch {}
    });
    tableElements.forEach((el) => {
      try {
        engine.destroy(el);
      } catch {}
    });
    onClose();
  };

  // Botão fechar [X] no topo direito
  const btnXPos = engine.vec2(centerX + cardW / 2 - 32, centerY - cardH / 2 + 32);
  const btnX = engine.add([
    engine.rect(38, 38, { radius: 8 }),
    engine.pos(btnXPos),
    engine.color(22, 50, 90),
    engine.outline(1.5, engine.rgb(100, 200, 255)),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(305),
  ]);
  elements.push(btnX);

  elements.push(
    engine.add([
      engine.text("✕", {
        size: accessibilitySystem.scaleFont(20),
        font: "Outfit",
      }),
      engine.pos(btnXPos),
      engine.color(255, 255, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(306),
    ])
  );

  btnX.onHoverUpdate(() => {
    btnX.color = engine.rgb(180, 50, 50);
    btnX.scale = engine.vec2(1.05, 1.05);
  });
  btnX.onHoverEnd(() => {
    btnX.color = engine.rgb(22, 50, 90);
    btnX.scale = engine.vec2(1, 1);
  });
  btnX.onClick(close);

  // Botões de Abas (Apenas abas ativas: Global e Local; Desafio Semanal mantido em desenvolvimento)
  const tabs: Array<{ id: LeaderboardTab; label: string }> = [
    { id: "global", label: "🌐 Global Online" },
    { id: "local", label: "💾 Local / Totem" },
  ];

  const tabBar = createTabBar<LeaderboardTab>(engine as unknown as LegacyTabBarContext, {
    tabs,
    activeTab,
    posY: centerY - cardH / 2 + 82,
    containerWidth: cardW,
    centerX,
    tabGap: 20,
    tabHeight: 42,
    maxTabWidth: 320,
    onTabChange: (tabId) => {
      if (isClosed) return;
      activeTab = tabId;
      loadTabData();
    },
    canInteract: () => !isClosed,
  });
  elements.push(...tabBar.elements);

  // Barra de Status de Conexão com fundo estilizado
  const statusBoxW = cardW - 48;
  const statusY = centerY - cardH / 2 + 126;

  elements.push(
    engine.add([
      engine.rect(statusBoxW, 32, { radius: 6 }),
      engine.pos(centerX, statusY),
      engine.color(8, 22, 46),
      engine.outline(1, engine.rgb(35, 75, 125)),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(302),
    ])
  );

  const statusTxt = engine.add([
    engine.text(statusMessage, {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    engine.pos(centerX, statusY),
    engine.color(statusColor),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(303),
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
    engine.add([
      engine.rect(tableW, 36, { radius: 8 }),
      engine.pos(centerX, headerY),
      engine.color(18, 48, 95),
      engine.outline(1.5, engine.rgb(56, 189, 248)),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(302),
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
      engine.add([
        engine.text(col.label, {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Outfit",
        }),
        engine.pos(col.x, headerY),
        engine.color(255, 225, 110),
        engine.anchor("center"),
        engine.fixed(),
        engine.z(303),
      ])
    );
  });

  // Função para renderizar as linhas da tabela com colunas alinhadas independentes
  const renderTableRows = (entries: LeaderboardEntry[]) => {
    tableElements.forEach((el) => {
      try {
        engine.destroy(el);
      } catch {}
    });
    tableElements = [];

    const rowBackgrounds: MotionTargetObject[] = [];

    entries.slice(0, 10).forEach((entry, idx) => {
      const y = rowStartY + idx * rowHeight;
      const isTop1 = idx === 0;
      const isTop2 = idx === 1;
      const isTop3 = idx === 2;

      // Fundo individual de cada linha com efeito zebrado e destaque de pódio
      const rowBg = engine.add([
        engine.rect(tableW, 33, { radius: 6 }),
        engine.pos(centerX, y),
        engine.color(
          isTop1
            ? engine.rgb(24, 48, 88)
            : idx % 2 === 0
              ? engine.rgb(14, 34, 68)
              : engine.rgb(10, 26, 52)
        ),
        engine.outline(
          isTop1 ? 1.5 : 1,
          isTop1 ? engine.rgb(255, 215, 80) : engine.rgb(30, 68, 115)
        ),
        engine.anchor("center"),
        engine.fixed(),
        engine.z(302),
      ]);
      tableElements.push(rowBg);
      rowBackgrounds.push(rowBg);

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
        ? engine.rgb(255, 225, 100)
        : isTop2
          ? engine.rgb(220, 240, 255)
          : isTop3
            ? engine.rgb(250, 190, 130)
            : engine.rgb(205, 230, 255);

      // Coluna 1: Posição / Medalha
      tableElements.push(
        engine.add([
          engine.text(medal, {
            size: accessibilitySystem.scaleFont(15),
            font: "Outfit",
          }),
          engine.pos(colPos, y),
          engine.color(textColor),
          engine.anchor("center"),
          engine.fixed(),
          engine.z(303),
        ])
      );

      // Coluna 2: Iniciais
      tableElements.push(
        engine.add([
          engine.text(entry.initials || "AAA", {
            size: accessibilitySystem.scaleFont(15.5),
            font: "Outfit",
          }),
          engine.pos(colInit, y),
          engine.color(255, 255, 255),
          engine.anchor("center"),
          engine.fixed(),
          engine.z(303),
        ])
      );

      // Coluna 3: Eco-Pontos
      tableElements.push(
        engine.add([
          engine.text(`${entry.score.toLocaleString()} pts`, {
            size: accessibilitySystem.scaleFont(15),
            font: "Outfit",
          }),
          engine.pos(colScore, y),
          engine.color(isTop1 ? engine.rgb(255, 225, 100) : engine.rgb(100, 240, 255)),
          engine.anchor("center"),
          engine.fixed(),
          engine.z(303),
        ])
      );

      // Coluna 4: Distância
      tableElements.push(
        engine.add([
          engine.text(`${entry.distance.toLocaleString()}m`, {
            size: accessibilitySystem.scaleFont(14.5),
            font: "Inter",
          }),
          engine.pos(colDist, y),
          engine.color(215, 235, 255),
          engine.anchor("center"),
          engine.fixed(),
          engine.z(303),
        ])
      );

      // Coluna 5: Modo de Jogo
      tableElements.push(
        engine.add([
          engine.text(modeLabel, {
            size: accessibilitySystem.scaleFont(14),
            font: "Inter",
          }),
          engine.pos(colMode, y),
          engine.color(180, 220, 250),
          engine.anchor("center"),
          engine.fixed(),
          engine.z(303),
        ])
      );

      // Coluna 6: Data
      tableElements.push(
        engine.add([
          engine.text(entry.date || "--/--", {
            size: accessibilitySystem.scaleFont(13.5),
            font: "Inter",
          }),
          engine.pos(colDate, y),
          engine.color(170, 205, 235),
          engine.anchor("center"),
          engine.fixed(),
          engine.z(303),
        ])
      );
    });

    staggerElementsEntrance(engine, rowBackgrounds, {
      staggerDelayMs: 25,
      duration: 0.18,
    });
  };

  const loadTabData = () => {
    if (activeTab === "local") {
      statusTxt.text = "💾 Exibindo dados locais do dispositivo / totem (Offline-First)";
      statusTxt.color = engine.rgb(180, 230, 255);
      renderTableRows(getTop10Entries());
      return;
    }

    if (activeTab === "weekly") {
      const weeklyChallenge = getWeeklyChallengeInfo();
      const localWeekly = getWeeklyTop10Entries(weeklyChallenge.weekKey);
      renderTableRows(localWeekly);

      statusTxt.text = `📅 ${weeklyChallenge.weekLabel} (Semente #${weeklyChallenge.seed}) • Sincronizando...`;
      statusTxt.color = engine.rgb(255, 220, 120);

      fetchOnlineLeaderboard("weekly", weeklyChallenge.weekKey).then((res) => {
        if (isClosed || activeTab !== "weekly") return;
        if (res.success && res.data.length > 0) {
          statusTxt.text = res.isOffline
            ? `🟡 ${weeklyChallenge.weekLabel} (Exibindo cache offline)`
            : `🟢 ${weeklyChallenge.weekLabel} • Servidor Global Conectado`;
          statusTxt.color = res.isOffline ? engine.rgb(255, 210, 100) : engine.rgb(100, 255, 180);
          renderTableRows(res.data);
        } else {
          statusTxt.text = `🟡 ${weeklyChallenge.weekLabel} (Modo Offline — Registro Local)`;
          statusTxt.color = engine.rgb(255, 210, 100);
        }
      });
      return;
    }

    // activeTab === "global"
    const localTop10 = getTop10Entries();
    renderTableRows(localTop10);
    statusTxt.text = "🌐 Consultando ranking mundial em tempo real...";
    statusTxt.color = engine.rgb(180, 220, 255);

    fetchOnlineLeaderboard("global").then((res) => {
      if (isClosed || activeTab !== "global") return;
      if (res.success && res.data.length > 0) {
        statusTxt.text = res.isOffline
          ? "🟡 Conexão instável — Exibindo cache local sincronizado"
          : "🟢 Servidor Global Conectado — Top 10 Mundial";
        statusTxt.color = res.isOffline ? engine.rgb(255, 210, 100) : engine.rgb(100, 255, 180);
        renderTableRows(res.data);
      } else {
        statusTxt.text = "🟡 Servidor offline ou inacessível — Exibindo recordes locais";
        statusTxt.color = engine.rgb(255, 210, 100);
      }
    });
  };

  // Carrega a aba inicial
  loadTabData();

  // Botão Fechar no rodapé
  const btnClosePos = engine.vec2(centerX, centerY + cardH / 2 - 32);
  const btnClose = createCardButton(engine as unknown as LegacyCardButtonContext, {
    label: "Fechar (ESC) ✕",
    pos: btnClosePos,
    width: 280,
    height: 46,
    variant: "secondary",
    fontSize: 16,
    onClick: close,
    canInteract: () => !isClosed,
  });
  elements.push(...(btnClose.elements as Array<{ destroy?: () => void } | object>));

  // Grupo de foco por teclado acessível
  const focusItems: FocusableItem[] = [
    {
      pos: btnXPos,
      width: 38,
      height: 38,
      onActivate: close,
    },
    ...tabBar.focusItems,
    btnClose.focusItem,
  ];

  const focusGroup = createFocusGroup(engine as unknown as LegacyKeyboardNavContext, {
    items: focusItems,
    initialIndex: focusItems.length - 1,
    ringZ: 315,
  });

  keyHandler = (event: KeyboardEvent) => {
    if (isClosed) return;
    if (event.key === "Escape") {
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }
}

import type { KaboomCtx } from "kaboom";
import {
  getCumulativeStats,
  formatDistanceKm,
  formatPlayTime,
  formatSuccessRate,
} from "../systems/cumulativeStats";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";

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
    k.opacity(0.94),
    k.area(),
    k.fixed(),
    k.z(290),
  ]);
  elements.push(backdrop);

  // Card do Modal Principal com proporções amplas e confortáveis expandidas
  const cardW = Math.min(1000, k.width() - 24);
  const cardH = Math.min(660, k.height() - 20);
  const cX = k.width() / 2;
  const cY = k.height() / 2;

  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(291),
  ]);
  elements.push(card);

  // Botão fechar [X] no canto superior direito
  const btnXPos = k.vec2(cX + cardW / 2 - 32, cY - cardH / 2 + 32);
  const btnX = k.add([
    k.rect(38, 38, { radius: 8 }),
    k.pos(btnXPos),
    k.color(22, 50, 90),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(293),
  ]);
  elements.push(btnX);

  elements.push(
    k.add([
      k.text("✕", { size: accessibilitySystem.scaleFont(20), font: "Outfit" }),
      k.pos(btnXPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(294),
    ])
  );

  // Cabeçalho Principal com tipografia imersiva
  elements.push(
    k.add([
      k.text("📊 IMPACTO ECOLÓGICO COLETIVO", {
        size: accessibilitySystem.scaleFont(28),
        font: "Outfit",
      }),
      k.pos(cX, cY - cardH / 2 + 40),
      k.color(255, 230, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(292),
    ])
  );

  elements.push(
    k.add([
      k.text("Métricas agregadas de todas as migrações oceânicas realizadas", {
        size: accessibilitySystem.scaleFont(16),
        font: "Inter",
      }),
      k.pos(cX, cY - cardH / 2 + 74),
      k.color(190, 230, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(292),
    ])
  );

  // Linha divisória sutil
  elements.push(
    k.add([
      k.rect(cardW - 60, 1.5, { radius: 1 }),
      k.pos(cX, cY - cardH / 2 + 98),
      k.color(35, 80, 140),
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
      icon: "🐋",
      title: "MIGRAÇÕES CONCLUÍDAS",
      mainVal: `${stats.totalMigrationsCompleted} / ${stats.totalMigrationsAttempted}`,
      subVal: `Taxa de Sucesso: ${successRate}`,
      color: k.rgb(100, 240, 255),
    },
    {
      icon: "🌊",
      title: "DISTÂNCIA NAVEGADA",
      mainVal: formatDistanceKm(stats.totalDistanceMeters),
      subVal: "Oceano Antártico até Arraial",
      color: k.rgb(120, 255, 210),
    },
    {
      icon: "🦐",
      title: "KRILL & BIOMASSA",
      mainVal: `${stats.totalKrillCollected} Cardumes`,
      subVal: `~${totalBiomassTons} t de biomassa ecológica`,
      color: k.rgb(255, 215, 80),
    },
    {
      icon: "🛡️",
      title: "RESÍDUOS ENFRENTADOS",
      mainVal: `${stats.totalTrashAvoided} Detritos`,
      subVal: "Redes fantasmas e plásticos",
      color: k.rgb(255, 140, 120),
    },
    {
      icon: "⏱️",
      title: "TEMPO EM ALTO MAR",
      mainVal: formatPlayTime(stats.totalPlayTimeSeconds),
      subVal: "Exploração e conscientização",
      color: k.rgb(195, 195, 255),
    },
    {
      icon: "🎓",
      title: "QUIZ ECOLÓGICO",
      mainVal: `${stats.quizCorrectAnswers} Acertos`,
      subVal: `${stats.quizzesTaken} Quizzes realizados`,
      color: k.rgb(140, 255, 180),
    },
  ];

  // Geometria ampliada e perfeitamente centrada dentro do modal
  const boxW = Math.min(450, (cardW - 60) / 2);
  const boxH = 118;
  const colGap = 20;
  const col0X = cX - boxW / 2 - colGap / 2;
  const col1X = cX + boxW / 2 + colGap / 2;
  const startRowY = cY - cardH / 2 + 172;
  const rowGap = 130;

  metricCards.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const posX = col === 0 ? col0X : col1X;
    const posY = startRowY + row * rowGap;

    // Fundo do card da métrica
    const metricBox = k.add([
      k.rect(boxW, boxH, { radius: 12 }),
      k.pos(posX, posY),
      k.color(14, 34, 68),
      k.outline(1.5, k.rgb(35, 75, 130)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(293),
    ]);
    elements.push(metricBox);

    // Efeito de hover suave no card
    metricBox.onHoverUpdate(() => {
      metricBox.color = k.rgb(18, 44, 88);
      metricBox.outline = { width: 1.5, color: k.rgb(80, 200, 255) };
    });
    metricBox.onHoverEnd(() => {
      metricBox.color = k.rgb(14, 34, 68);
      metricBox.outline = { width: 1.5, color: k.rgb(35, 75, 130) };
    });

    // Badge com ícone dedicado no lado esquerdo
    const iconPillX = posX - boxW / 2 + 36;
    const iconPill = k.add([
      k.rect(54, 54, { radius: 10 }),
      k.pos(iconPillX, posY),
      k.color(18, 48, 92),
      k.outline(1, k.rgb(56, 189, 248)),
      k.anchor("center"),
      k.fixed(),
      k.z(294),
    ]);
    elements.push(iconPill);

    elements.push(
      k.add([
        k.text(item.icon, {
          size: accessibilitySystem.scaleFont(26),
          font: "Inter",
        }),
        k.pos(iconPillX, posY),
        k.anchor("center"),
        k.fixed(),
        k.z(295),
      ])
    );

    // Coluna de informações com alinhamento e contraste impecáveis
    const textStartX = posX - boxW / 2 + 76;

    // Título da métrica
    elements.push(
      k.add([
        k.text(item.title, {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
        }),
        k.pos(textStartX, posY - 29),
        k.color(190, 225, 255),
        k.fixed(),
        k.z(294),
      ])
    );

    // Valor Principal em destaque vibrante
    elements.push(
      k.add([
        k.text(item.mainVal, {
          size: accessibilitySystem.scaleFont(27),
          font: "Outfit",
        }),
        k.pos(textStartX, posY + 2),
        k.color(item.color),
        k.fixed(),
        k.z(294),
      ])
    );

    // Sub-legenda informativa de alto contraste
    elements.push(
      k.add([
        k.text(item.subVal, {
          size: accessibilitySystem.scaleFont(14),
          font: "Inter",
        }),
        k.pos(textStartX, posY + 33),
        k.color(195, 225, 250),
        k.fixed(),
        k.z(294),
      ])
    );
  });

  // Mensagem educativa e inspiradora no rodapé do modal
  elements.push(
    k.add([
      k.text(
        "🌱 Cada jornada no oceano reforça a preservação marinha e a proteção das baleias-jubarte.",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
        }
      ),
      k.pos(cX, cY + cardH / 2 - 96),
      k.color(150, 220, 245),
      k.anchor("center"),
      k.fixed(),
      k.z(293),
    ])
  );

  const focusItems: FocusableItem[] = [];

  let keyHandler: ((event: KeyboardEvent) => void) | null = null;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    focusGroup.destroy();
    if (typeof window !== "undefined" && keyHandler) {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    onClose();
  };

  btnX.onHoverUpdate(() => {
    btnX.color = k.rgb(35, 75, 130);
    btnX.scale = k.vec2(1.05, 1.05);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(22, 50, 90);
    btnX.scale = k.vec2(1, 1);
  });
  btnX.onClick(() => {
    if (canInteract) close();
  });
  focusItems.push({
    pos: btnXPos,
    width: 38,
    height: 38,
    onActivate: () => {
      if (canInteract) close();
    },
  });

  // Botão Voltar ao Menu
  const btnClosePos = k.vec2(cX, cY + cardH / 2 - 46);
  const btnClose = k.add([
    k.rect(300, 50, { radius: 10 }),
    k.pos(btnClosePos),
    k.color(24, 85, 150),
    k.outline(2, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(294),
  ]);
  elements.push(btnClose);

  const btnText = k.add([
    k.text("VOLTAR AO MENU ↩", {
      size: accessibilitySystem.scaleFont(16.5),
      font: "Outfit",
    }),
    k.pos(btnClosePos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(295),
  ]);
  elements.push(btnText);

  btnClose.onHoverUpdate(() => {
    btnClose.color = k.rgb(35, 115, 200);
    btnClose.scale = k.vec2(1.02, 1.02);
  });
  btnClose.onHoverEnd(() => {
    btnClose.color = k.rgb(24, 85, 150);
    btnClose.scale = k.vec2(1, 1);
  });
  btnClose.onClick(() => {
    if (canInteract) close();
  });
  focusItems.push({
    pos: btnClosePos,
    width: 300,
    height: 50,
    onActivate: () => {
      if (canInteract) close();
    },
  });

  // Grupo de foco por teclado acessível (WCAG 2.1 AA)
  const focusGroup = createFocusGroup(k, {
    items: focusItems,
    initialIndex: 1, // Começa focado no botão principal Voltar
    isEnabled: () => !isClosed && canInteract,
  });

  keyHandler = (event: KeyboardEvent) => {
    if (isClosed || !canInteract) return;
    if (event.key === "Escape") {
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }
}

import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import type { GameOptions } from "../systems/state";
import { getWeeklyChallengeInfo } from "../systems/weeklyChallenge";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";

export function showModeSelectScreen(
  k: KaboomCtx,
  onSelectMode: (options: GameOptions) => void,
  onBack: () => void
) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;

  let canInteract = false;
  k.wait(0.15, () => {
    canInteract = true;
  });

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  // Fundo escuro semitransparente
  const backdrop = k.add([
    k.rect(screenW, screenH),
    k.pos(0, 0),
    k.color(4, 14, 32),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Modal Card Principal com geometria ampla expandida
  const cardW = Math.min(1000, screenW - 24);
  const cardH = Math.min(660, screenH - 20);
  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);

  // Título do Modal
  elements.push(
    k.add([
      k.text("ESCOLHA SEU ESTILO DE MIGRAÇÃO 🐋", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      k.pos(cX, cY - cardH / 2 + 32),
      k.color(255, 225, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Subtítulo descritivo
  elements.push(
    k.add([
      k.text("Selecione uma modalidade para navegar pelas águas profundas do Atlântico Sul", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Inter",
      }),
      k.pos(cX, cY - cardH / 2 + 58),
      k.color(180, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;
    if (focusGroup) {
      focusGroup.destroy();
    }
    window.removeEventListener("keydown", keyHandler);
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
  };

  const close = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onBack();
  };

  // Botão fechar [X] no canto superior direito
  const btnXPos = k.vec2(cX + cardW / 2 - 32, cY - cardH / 2 + 32);
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
    if (!canInteract) return;
    btnX.color = k.rgb(180, 50, 50);
    btnX.scale = k.vec2(1.05, 1.05);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(22, 50, 90);
    btnX.scale = k.vec2(1, 1);
  });
  btnX.onClick(close);

  const focusItems: FocusableItem[] = [
    {
      pos: btnXPos,
      width: 34,
      height: 34,
      onActivate: close,
    },
  ];

  const contentBoxW = cardW - 48;
  const startCardsY = cY - cardH / 2 + 88;

  // ==========================================
  // CARD 1: MIGRAÇÃO SERENA (1ª OPÇÃO)
  // ==========================================
  const card1H = 86;
  const card1Y = startCardsY + card1H / 2;

  const card1 = k.add([
    k.rect(contentBoxW, card1H, { radius: 12 }),
    k.pos(cX, card1Y),
    k.color(14, 36, 72),
    k.outline(1.5, k.rgb(52, 211, 153)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(card1);

  const icon1Pos = k.vec2(cX - contentBoxW / 2 + 36, card1Y);
  elements.push(
    k.add([
      k.rect(50, 50, { radius: 10 }),
      k.pos(icon1Pos),
      k.color(16, 50, 40),
      k.outline(1.5, k.rgb(52, 211, 153)),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
  elements.push(
    k.add([
      k.text("🌸", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      k.pos(icon1Pos),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  const textStartX = cX - contentBoxW / 2 + 76;

  elements.push(
    k.add([
      k.text("MIGRAÇÃO SERENA (RELAXANTE & EDUCATIVA)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      k.pos(textStartX, card1Y - 16),
      k.color(140, 255, 200),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  elements.push(
    k.add([
      k.text(
        "Oxigênio infinito (∞) e zero risco de desmaio. Experiência contemplativa com HUD completo, fatos ambientais e identificação dos biomas.",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          width: contentBoxW - 90,
          lineSpacing: 3.5,
        }
      ),
      k.pos(textStartX, card1Y + 12),
      k.color(215, 245, 235),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  card1.onHoverUpdate(() => {
    if (!canInteract) return;
    card1.color = k.rgb(18, 55, 65);
    card1.outline = { width: 2, color: k.rgb(80, 255, 190) };
    card1.scale = k.vec2(1.01, 1.01);
  });
  card1.onHoverEnd(() => {
    card1.color = k.rgb(14, 36, 72);
    card1.outline = { width: 1.5, color: k.rgb(52, 211, 153) };
    card1.scale = k.vec2(1, 1);
  });

  const selectSerene = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({ mode: "serene" });
  };
  card1.onClick(selectSerene);
  focusItems.push({
    pos: k.vec2(cX, card1Y),
    width: contentBoxW,
    height: card1H,
    onActivate: selectSerene,
  });

  // ==========================================
  // CARD 2: MIGRAÇÃO DIFÍCIL (2ª OPÇÃO)
  // ==========================================
  const card2H = 86;
  const card2Y = card1Y + card1H / 2 + 12 + card2H / 2;

  const card2 = k.add([
    k.rect(contentBoxW, card2H, { radius: 12 }),
    k.pos(cX, card2Y),
    k.color(14, 36, 72),
    k.outline(1.5, k.rgb(244, 63, 94)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(card2);

  const icon2Pos = k.vec2(cX - contentBoxW / 2 + 36, card2Y);
  elements.push(
    k.add([
      k.rect(50, 50, { radius: 10 }),
      k.pos(icon2Pos),
      k.color(45, 20, 30),
      k.outline(1.5, k.rgb(244, 63, 94)),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
  elements.push(
    k.add([
      k.text("🌊", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      k.pos(icon2Pos),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  elements.push(
    k.add([
      k.text("MIGRAÇÃO DIFÍCIL (DESAFIO REALISTA)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      k.pos(textStartX, card2Y - 16),
      k.color(255, 120, 140),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  elements.push(
    k.add([
      k.text(
        "Travessia autêntica sem HUD, sem auxílios visuais e sem avisos em texto. Gerencie o fôlego da jubarte guiando-se apenas pelos seus sentidos marinhos.",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          width: contentBoxW - 90,
          lineSpacing: 3.5,
        }
      ),
      k.pos(textStartX, card2Y + 12),
      k.color(255, 220, 225),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  card2.onHoverUpdate(() => {
    if (!canInteract) return;
    card2.color = k.rgb(45, 25, 45);
    card2.outline = { width: 2, color: k.rgb(255, 90, 130) };
    card2.scale = k.vec2(1.01, 1.01);
  });
  card2.onHoverEnd(() => {
    card2.color = k.rgb(14, 36, 72);
    card2.outline = { width: 1.5, color: k.rgb(244, 63, 94) };
    card2.scale = k.vec2(1, 1);
  });

  const selectDifficult = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({ mode: "standard" });
  };
  card2.onClick(selectDifficult);
  focusItems.push({
    pos: k.vec2(cX, card2Y),
    width: contentBoxW,
    height: card2H,
    onActivate: selectDifficult,
  });

  // ==========================================
  // CARD 3: DESAFIO SEMANAL PROCEDURAL
  // ==========================================
  const weeklyInfo = getWeeklyChallengeInfo();
  const card3H = 92;
  const card3Y = card2Y + card2H / 2 + 12 + card3H / 2;

  const cardWeekly = k.add([
    k.rect(contentBoxW, card3H, { radius: 12 }),
    k.pos(cX, card3Y),
    k.color(14, 36, 72),
    k.outline(1.5, k.rgb(250, 204, 21)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(cardWeekly);

  const icon3Pos = k.vec2(cX - contentBoxW / 2 + 36, card3Y);
  elements.push(
    k.add([
      k.rect(50, 50, { radius: 10 }),
      k.pos(icon3Pos),
      k.color(45, 38, 16),
      k.outline(1.5, k.rgb(250, 204, 21)),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
  elements.push(
    k.add([
      k.text("📅", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      k.pos(icon3Pos),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  elements.push(
    k.add([
      k.text(`DESAFIO SEMANAL DA ROTA — ${weeklyInfo.weekLabel}`, {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      k.pos(textStartX, card3Y - 18),
      k.color(255, 225, 90),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  elements.push(
    k.add([
      k.text(
        `Semente #${weeklyInfo.seed} • Rota idêntica para o mundo todo • ⏳ ${weeklyInfo.daysLeft} dia(s) restantes\nSupere obstáculos idênticos e dispute o topo do ranking semanal global!`,
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          lineSpacing: 3.5,
          width: contentBoxW - 90,
        }
      ),
      k.pos(textStartX, card3Y + 14),
      k.color(235, 245, 255),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  cardWeekly.onHoverUpdate(() => {
    if (!canInteract) return;
    cardWeekly.color = k.rgb(30, 45, 80);
    cardWeekly.outline = { width: 2, color: k.rgb(255, 235, 120) };
    cardWeekly.scale = k.vec2(1.01, 1.01);
  });
  cardWeekly.onHoverEnd(() => {
    cardWeekly.color = k.rgb(14, 36, 72);
    cardWeekly.outline = { width: 1.5, color: k.rgb(250, 204, 21) };
    cardWeekly.scale = k.vec2(1, 1);
  });

  const selectWeekly = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({
      mode: "weekly",
      seed: weeklyInfo.seed,
      weekKey: weeklyInfo.weekKey,
    });
  };
  cardWeekly.onClick(selectWeekly);
  focusItems.push({
    pos: k.vec2(cX, card3Y),
    width: contentBoxW,
    height: card3H,
    onActivate: selectWeekly,
  });

  // ==========================================
  // CARD 4: MIGRAÇÃO RÁPIDA (60 SEGUNDOS)
  // ==========================================
  let selectedBiomeIndex = 0;
  const card4H = 124;
  const card4Y = card3Y + card3H / 2 + 12 + card4H / 2;

  const card4 = k.add([
    k.rect(contentBoxW, card4H, { radius: 12 }),
    k.pos(cX, card4Y),
    k.color(14, 36, 72),
    k.outline(1.5, k.rgb(249, 115, 22)),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(card4);

  const icon4Pos = k.vec2(cX - contentBoxW / 2 + 36, card4Y);
  elements.push(
    k.add([
      k.rect(50, 50, { radius: 10 }),
      k.pos(icon4Pos),
      k.color(45, 26, 14),
      k.outline(1.5, k.rgb(249, 115, 22)),
      k.anchor("center"),
      k.fixed(),
      k.z(303),
    ])
  );
  elements.push(
    k.add([
      k.text("⚡", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      k.pos(icon4Pos),
      k.anchor("center"),
      k.fixed(),
      k.z(304),
    ])
  );

  elements.push(
    k.add([
      k.text("MIGRAÇÃO RÁPIDA (TRECHO DE 60 SEGUNDOS)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      k.pos(textStartX, card4Y - 36),
      k.color(255, 190, 110),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  elements.push(
    k.add([
      k.text("Selecione o bioma de partida:", {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
      }),
      k.pos(textStartX, card4Y - 8),
      k.color(225, 235, 250),
      k.anchor("left"),
      k.fixed(),
      k.z(303),
    ])
  );

  // Botões Seletores de Bioma
  const biomes = [
    { label: "❄️ Antártica", index: 0 },
    { label: "🚢 Costa Urbana", index: 2 },
    { label: "🏝️ Arraial do Cabo", index: 3 },
  ];

  const biomeBtns: any[] = [];
  const biomeBtnW = 165;
  const biomeBtnH = 34;

  biomes.forEach((b, i) => {
    const bX = textStartX + 195 + i * (biomeBtnW + 10);
    const bY = card4Y - 8;

    const bBtn = k.add([
      k.rect(biomeBtnW, biomeBtnH, { radius: 7 }),
      k.pos(bX, bY),
      k.color(selectedBiomeIndex === b.index ? k.rgb(190, 90, 15) : k.rgb(20, 48, 85)),
      k.outline(1.5, selectedBiomeIndex === b.index ? k.rgb(255, 215, 120) : k.rgb(56, 100, 155)),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(bBtn);

    const bTxt = k.add([
      k.text(b.label, {
        size: accessibilitySystem.scaleFont(14),
        font: "Outfit",
      }),
      k.pos(bX, bY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ]);
    elements.push(bTxt);

    biomeBtns.push({ btn: bBtn, txt: bTxt, index: b.index });

    bBtn.onClick(() => {
      if (!canInteract) return;
      audioSystem.playUiClick();
      selectedBiomeIndex = b.index;
      biomeBtns.forEach((item) => {
        const isSel = item.index === selectedBiomeIndex;
        item.btn.color = isSel ? k.rgb(190, 90, 15) : k.rgb(20, 48, 85);
        item.btn.outline.color = isSel ? k.rgb(255, 215, 120) : k.rgb(56, 100, 155);
      });
    });

    focusItems.push({
      pos: k.vec2(bX, bY),
      width: biomeBtnW,
      height: biomeBtnH,
      onActivate: () => {
        audioSystem.playUiClick();
        selectedBiomeIndex = b.index;
        biomeBtns.forEach((item) => {
          const isSel = item.index === selectedBiomeIndex;
          item.btn.color = isSel ? k.rgb(190, 90, 15) : k.rgb(20, 48, 85);
          item.btn.outline.color = isSel ? k.rgb(255, 215, 120) : k.rgb(56, 100, 155);
        });
      },
    });
  });

  // Botão Iniciar Trecho Rápido
  const btnStartQuickPos = k.vec2(cX, card4Y + 32);
  const btnStartQuick = k.add([
    k.rect(380, 40, { radius: 8 }),
    k.pos(btnStartQuickPos),
    k.color(200, 95, 15),
    k.outline(1.5, k.rgb(255, 210, 100)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnStartQuick);

  elements.push(
    k.add([
      k.text("⚡ INICIAR DESAFIO RÁPIDO (60s)", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(btnStartQuickPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  btnStartQuick.onHoverUpdate(() => {
    if (!canInteract) return;
    btnStartQuick.color = k.rgb(230, 120, 25);
    btnStartQuick.scale = k.vec2(1.02, 1.02);
  });
  btnStartQuick.onHoverEnd(() => {
    btnStartQuick.color = k.rgb(200, 95, 15);
    btnStartQuick.scale = k.vec2(1, 1);
  });

  const startQuick = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({
      mode: "quick_challenge",
      startBiome: selectedBiomeIndex,
      timeLimit: 60,
    });
  };
  btnStartQuick.onClick(startQuick);
  focusItems.push({
    pos: btnStartQuickPos,
    width: 380,
    height: 40,
    onActivate: startQuick,
  });

  // ==========================================
  // BOTÃO VOLTAR AO MENU NA BASE
  // ==========================================
  const btnBackPos = k.vec2(cX, cY + cardH / 2 - 32);
  const btnBack = k.add([
    k.rect(280, 46, { radius: 10 }),
    k.pos(btnBackPos),
    k.color(20, 80, 140),
    k.outline(2, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnBack);

  elements.push(
    k.add([
      k.text("Voltar ao Menu ↩", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnBackPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ])
  );

  btnBack.onHoverUpdate(() => {
    if (!canInteract) return;
    btnBack.color = k.rgb(28, 110, 185);
    btnBack.scale = k.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(20, 80, 140);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(close);
  focusItems.push({
    pos: btnBackPos,
    width: 280,
    height: 46,
    onActivate: close,
  });

  // Grupo de foco por teclado acessível
  const focusGroup = createFocusGroup(k, {
    items: focusItems,
    initialIndex: 1, // Começa no modo clássico
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

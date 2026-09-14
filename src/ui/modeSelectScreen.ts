import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import type { GameOptions } from "../systems/state";

export function showModeSelectScreen(
  k: KaboomCtx,
  onSelectMode: (options: GameOptions) => void,
  onBack: () => void
) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;

  // Trava temporária para impedir que o mesmo clique que abriu o modal ative um botão acidentalmente
  let canInteract = false;
  k.wait(0.15, () => {
    canInteract = true;
  });

  // Fundo escuro semitransparente (bloqueia cliques na tela de fundo)
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(4, 15, 32),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Modal Card Principal
  const cardW = 740;
  const cardH = 540;
  const card = k.add([
    k.rect(cardW, cardH, { radius: 14 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(10, 30, 65),
    k.outline(3, k.rgb(100, 220, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);

  // Título do Modal
  elements.push(k.add([
    k.text("ESCOLHA SEU ESTILO DE MIGRAÇÃO 🐋", { size: 22, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 - 225),
    k.color(255, 230, 100),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]));

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;
    escListener.cancel();
    elements.forEach((el) => {
      try { k.destroy(el); } catch {}
    });
  };

  const close = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onBack();
  };

  const escListener = k.onKeyPress("escape", close);

  // Botão fechar [X] no topo
  const btnX = k.add([
    k.rect(34, 34, { radius: 6 }),
    k.pos(k.width() / 2 + cardW / 2 - 28, k.height() / 2 - cardH / 2 + 28),
    k.color(20, 45, 80),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnX);

  elements.push(k.add([
    k.text("✕", { size: 18, font: "sans-serif" }),
    k.pos(k.width() / 2 + cardW / 2 - 28, k.height() / 2 - cardH / 2 + 28),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(306),
  ]));

  btnX.onHoverUpdate(() => {
    if (!canInteract) return;
    btnX.color = k.rgb(180, 50, 50);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(20, 45, 80);
  });
  btnX.onClick(close);

  // ==========================================
  // CARD 1: MIGRAÇÃO NORMAL
  // ==========================================
  const card1 = k.add([
    k.rect(660, 85, { radius: 10 }),
    k.pos(k.width() / 2, k.height() / 2 - 145),
    k.color(16, 50, 95),
    k.outline(2, k.rgb(50, 150, 230)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(card1);

  elements.push(k.add([
    k.text("🌊 MIGRAÇÃO NORMAL", { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2 - 310, k.height() / 2 - 165),
    k.color(100, 240, 255),
    k.anchor("left"),
    k.fixed(),
    k.z(303),
  ]));

  elements.push(k.add([
    k.text("Rota clássica completa de 27.000m. Fôlego limitado por mergulho, desvio de navios,\nredes de pesca, poluição e pontuação ancestral no Eco-Score.", {
      size: 12,
      font: "sans-serif",
      lineSpacing: 4,
    }),
    k.pos(k.width() / 2 - 310, k.height() / 2 - 135),
    k.color(200, 230, 250),
    k.anchor("left"),
    k.fixed(),
    k.z(303),
  ]));

  card1.onHoverUpdate(() => {
    if (!canInteract) return;
    card1.color = k.rgb(25, 75, 140);
    card1.outline.color = k.rgb(120, 250, 255);
    card1.scale = k.vec2(1.01, 1.01);
  });
  card1.onHoverEnd(() => {
    card1.color = k.rgb(16, 50, 95);
    card1.outline.color = k.rgb(50, 150, 230);
    card1.scale = k.vec2(1, 1);
  });
  card1.onClick(() => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({ mode: "standard" });
  });

  // ==========================================
  // CARD 2: MIGRAÇÃO SERENA
  // ==========================================
  const card2 = k.add([
    k.rect(660, 85, { radius: 10 }),
    k.pos(k.width() / 2, k.height() / 2 - 45),
    k.color(16, 50, 95),
    k.outline(2, k.rgb(120, 210, 180)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(card2);

  elements.push(k.add([
    k.text("🌸 MIGRAÇÃO SERENA", { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2 - 310, k.height() / 2 - 65),
    k.color(140, 255, 200),
    k.anchor("left"),
    k.fixed(),
    k.z(303),
  ]));

  elements.push(k.add([
    k.text("Oxigênio infinito (∞) e zero risco de desmaio. Modo acessível e contemplativo,\nideal para crianças, novatos ou para relaxar com a trilha sonora.", {
      size: 12,
      font: "sans-serif",
      lineSpacing: 4,
    }),
    k.pos(k.width() / 2 - 310, k.height() / 2 - 35),
    k.color(200, 245, 230),
    k.anchor("left"),
    k.fixed(),
    k.z(303),
  ]));

  card2.onHoverUpdate(() => {
    if (!canInteract) return;
    card2.color = k.rgb(20, 80, 110);
    card2.outline.color = k.rgb(160, 255, 230);
    card2.scale = k.vec2(1.01, 1.01);
  });
  card2.onHoverEnd(() => {
    card2.color = k.rgb(16, 50, 95);
    card2.outline.color = k.rgb(120, 210, 180);
    card2.scale = k.vec2(1, 1);
  });
  card2.onClick(() => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({ mode: "serene" });
  });

  // ==========================================
  // CARD 3: MIGRAÇÃO RÁPIDA (60s)
  // ==========================================
  let selectedBiomeIndex = 0; // 0: Antártica, 2: Costa Urbana, 3: Arraial

  const card3 = k.add([
    k.rect(660, 130, { radius: 10 }),
    k.pos(k.width() / 2, k.height() / 2 + 80),
    k.color(16, 50, 95),
    k.outline(2, k.rgb(255, 180, 80)),
    k.anchor("center"),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(card3);

  elements.push(k.add([
    k.text("⚡ MIGRAÇÃO RÁPIDA (60 SEGUNDOS)", { size: 16, font: "sans-serif" }),
    k.pos(k.width() / 2 - 310, k.height() / 2 + 32),
    k.color(255, 210, 120),
    k.anchor("left"),
    k.fixed(),
    k.z(303),
  ]));

  elements.push(k.add([
    k.text("Desafio cronometrado de alta rotatividade para feiras. Escolha o trecho inicial:", {
      size: 12,
      font: "sans-serif",
    }),
    k.pos(k.width() / 2 - 310, k.height() / 2 + 58),
    k.color(240, 220, 190),
    k.anchor("left"),
    k.fixed(),
    k.z(303),
  ]));

  // Botões seletores de Bioma
  const biomes = [
    { label: "❄️ Antártica (Gelo)", index: 0 },
    { label: "🚢 Costa Urbana (Navios)", index: 2 },
    { label: "🏝️ Arraial (Cânions)", index: 3 },
  ];

  const biomeButtons: any[] = [];
  biomes.forEach((biome, idx) => {
    const bX = k.width() / 2 - 200 + idx * 200;
    const bY = k.height() / 2 + 90;

    const bBtn = k.add([
      k.rect(180, 28, { radius: 6 }),
      k.pos(bX, bY),
      k.color(selectedBiomeIndex === biome.index ? k.rgb(200, 120, 20) : k.rgb(20, 45, 80)),
      k.outline(1, selectedBiomeIndex === biome.index ? k.rgb(255, 230, 150) : k.rgb(100, 140, 190)),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(bBtn);
    biomeButtons.push(bBtn);

    const bText = k.add([
      k.text(biome.label, { size: 11, font: "sans-serif" }),
      k.pos(bX, bY),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ]);
    elements.push(bText);

    bBtn.onClick(() => {
      if (!canInteract) return;
      audioSystem.playUiClick();
      selectedBiomeIndex = biome.index;
      biomeButtons.forEach((btn, i) => {
        const isSel = biomes[i].index === selectedBiomeIndex;
        btn.color = isSel ? k.rgb(200, 120, 20) : k.rgb(20, 45, 80);
        btn.outline.color = isSel ? k.rgb(255, 230, 150) : k.rgb(100, 140, 190);
      });
    });
  });

  // Botão dedicado para iniciar a Migração Rápida
  const btnStartQuick = k.add([
    k.rect(260, 30, { radius: 6 }),
    k.pos(k.width() / 2, k.height() / 2 + 126),
    k.color(220, 130, 20),
    k.outline(1, k.rgb(255, 230, 140)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(304),
  ]);
  elements.push(btnStartQuick);

  elements.push(k.add([
    k.text("⚡ INICIAR MIGRAÇÃO RÁPIDA (60s)", { size: 12, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 126),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(305),
  ]));

  btnStartQuick.onHoverUpdate(() => {
    if (!canInteract) return;
    btnStartQuick.color = k.rgb(245, 155, 35);
    btnStartQuick.scale = k.vec2(1.02, 1.02);
  });
  btnStartQuick.onHoverEnd(() => {
    btnStartQuick.color = k.rgb(220, 130, 20);
    btnStartQuick.scale = k.vec2(1, 1);
  });
  btnStartQuick.onClick(() => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({
      mode: "quick_challenge",
      startBiome: selectedBiomeIndex,
      timeLimit: 60,
    });
  });

  // ==========================================
  // BOTÃO VOLTAR AO MENU
  // ==========================================
  const btnBack = k.add([
    k.rect(240, 40, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 225),
    k.color(20, 60, 100),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(302),
  ]);
  elements.push(btnBack);

  elements.push(k.add([
    k.text("Voltar ao Menu ↩️", { size: 15, font: "sans-serif" }),
    k.pos(k.width() / 2, k.height() / 2 + 225),
    k.color(220, 240, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(303),
  ]));

  btnBack.onHoverUpdate(() => {
    if (!canInteract) return;
    btnBack.color = k.rgb(30, 90, 150);
    btnBack.scale = k.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(20, 60, 100);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(close);
}

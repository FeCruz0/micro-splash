import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { createGameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { showQuizModal } from "./quizModal";
import { showOnboardingModal } from "./onboardingModal";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";
import factsData from "../../data/facts.json";
import { animateModalEntrance, attachButtonHoverEffect } from "./animationUtils";

/**
 * Retorna as informações do bioma com base na distância de disparo da descoberta (Fase 34.7).
 */
export function getCodexBiomeInfo(triggerX: number): { name: string; emoji: string } {
  if (triggerX < 5000) return { name: "Oceano Antártico", emoji: "❄️" };
  if (triggerX < 12000) return { name: "Travessia Pelágica", emoji: "🌊" };
  if (triggerX < 19000) return { name: "Costa Urbana", emoji: "🏭" };
  if (triggerX < 25000) return { name: "Cânions & Ressurgência", emoji: "🌀" };
  return { name: "Santuário de Arraial", emoji: "☀️" };
}

export function showCodexScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;
  let isModalOpen = false;

  // Fundo escuro semitransparente bloqueando cliques fora do modal
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(4, 14, 32),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card do Diário de Bordo (Codex) com geometria adaptativa expandida (Fase 34.1)
  const cardW = Math.min(1000, k.width() - 24);
  const cardH = Math.min(660, k.height() - 20);
  const cX = k.width() / 2;
  const cY = k.height() / 2;

  const card = k.add([
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(250, 204, 21)),
    k.anchor("center"),
    k.scale(1),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);
  animateModalEntrance(k, card);

  // Título Principal com destaque dourado e tamanho nítido ampliado
  elements.push(
    k.add([
      k.text("DIÁRIO DE BORDO DA EXPEDIÇÃO 📖", {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      k.pos(cX, cY - cardH / 2 + 34),
      k.color(255, 225, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  // Subtítulo descritivo elegante de alto contraste
  elements.push(
    k.add([
      k.text("Enciclopédia de espécies marinhas, descobertas da rota migratória e preservação", {
        size: accessibilitySystem.scaleFont(15),
        font: "Inter",
      }),
      k.pos(cX, cY - cardH / 2 + 63),
      k.color(180, 225, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  let contentElements: any[] = [];
  let focusGroup: { destroy: () => void } | null = null;

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

  const close = () => {
    if (isClosed || isModalOpen) return;
    isClosed = true;
    audioSystem.playUiClick();
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    contentElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    onBack();
  };

  attachButtonHoverEffect(k, btnX, {
    baseColor: [22, 50, 90],
    hoverColor: [180, 50, 50],
    baseScale: 1.0,
    hoverScale: 1.06,
    canInteract: () => !isClosed && !isModalOpen,
  });
  btnX.onClick(close);

  // Tecla ESC para fechar
  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed || isModalOpen) return;
    if (e.key === "Escape") {
      close();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }

  // Carrega fatos já desbloqueados
  let unlockedFactIds: string[] = [];
  try {
    unlockedFactIds = JSON.parse(localStorage.getItem("micro_splash_unlocked_facts") || "[]");
  } catch {}

  let activeTab: "species" | "route" | "conservation" = "species";
  let routePage = 0;

  // Limites da Área de Conteúdo
  const contentBoxTop = cY - cardH / 2 + 122;
  const contentBoxBottom = cY + cardH / 2 - 66;
  const contentBoxH = contentBoxBottom - contentBoxTop;

  const tabButtonsData = [
    { id: "species" as const, icon: "🐋", label: "Espécies Marinhas" },
    { id: "route" as const, icon: "🗺️", label: "Fatos da Rota" },
    { id: "conservation" as const, icon: "🌊", label: "Conservação & IBJ" },
  ];

  const tabW = Math.min(270, (cardW - 60) / 3);
  const tabH = 42;
  const tabY = cY - cardH / 2 + 94;
  const tabEntities: Array<{
    btn: any;
    label: any;
    id: "species" | "route" | "conservation";
  }> = [];

  const updateTabStyles = () => {
    tabEntities.forEach((t) => {
      const isActive = t.id === activeTab;
      t.btn.color = isActive ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60);
      t.btn.outline = {
        width: isActive ? 2 : 1,
        color: isActive ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115),
      };
      t.label.color = isActive ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235);
    });
  };

  tabButtonsData.forEach((tb, i) => {
    const tabX = cX - tabW - 14 + i * (tabW + 14);

    const btnTab = k.add([
      k.rect(tabW, tabH, { radius: 8 }),
      k.pos(tabX, tabY),
      k.color(activeTab === tb.id ? k.rgb(20, 100, 165) : k.rgb(14, 32, 60)),
      k.outline(
        activeTab === tb.id ? 2 : 1,
        activeTab === tb.id ? k.rgb(56, 189, 248) : k.rgb(45, 75, 115)
      ),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(btnTab);

    const lblTab = k.add([
      k.text(`${tb.icon} ${tb.label}`, {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      k.pos(tabX, tabY),
      k.color(activeTab === tb.id ? k.rgb(255, 255, 255) : k.rgb(175, 205, 235)),
      k.anchor("center"),
      k.fixed(),
      k.z(305),
    ]);
    elements.push(lblTab);

    tabEntities.push({ btn: btnTab, label: lblTab, id: tb.id });

    btnTab.onHoverUpdate(() => {
      if (activeTab !== tb.id) {
        btnTab.color = k.rgb(25, 55, 95);
        btnTab.scale = k.vec2(1.02, 1.02);
      }
    });
    btnTab.onHoverEnd(() => {
      btnTab.scale = k.vec2(1, 1);
      updateTabStyles();
    });

    btnTab.onClick(() => {
      if (isModalOpen) return;
      audioSystem.playUiClick();
      activeTab = tb.id;
      updateTabStyles();
      renderTabContent();
    });
  });

  // Botões de Ação Inferiores (Footer)
  const bottomBtnY = cY + cardH / 2 - 34;
  const bottomBtnW = Math.min(280, (cardW - 60) / 3);
  const bottomBtnH = 48;

  // Botão 1: Voltar ao Menu
  const btnBackPos = k.vec2(cX - bottomBtnW - 14, bottomBtnY);
  const btnBack = k.add([
    k.rect(bottomBtnW, bottomBtnH, { radius: 10 }),
    k.pos(btnBackPos),
    k.color(20, 80, 140),
    k.outline(2, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
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
      k.z(306),
    ])
  );

  btnBack.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnBack.color = k.rgb(28, 110, 185);
      btnBack.scale = k.vec2(1.02, 1.02);
    }
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = k.rgb(20, 80, 140);
    btnBack.scale = k.vec2(1, 1);
  });
  btnBack.onClick(close);

  // Botão 2: Tutorial / Guia
  const btnTutorialPos = k.vec2(cX, bottomBtnY);
  const btnTutorial = k.add([
    k.rect(bottomBtnW, bottomBtnH, { radius: 10 }),
    k.pos(btnTutorialPos),
    k.color(22, 90, 150),
    k.outline(2, k.rgb(90, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnTutorial);

  elements.push(
    k.add([
      k.text("🎓 Tutorial / Guia", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnTutorialPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnTutorial.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnTutorial.color = k.rgb(30, 125, 200);
      btnTutorial.scale = k.vec2(1.02, 1.02);
    }
  });
  btnTutorial.onHoverEnd(() => {
    btnTutorial.color = k.rgb(22, 90, 150);
    btnTutorial.scale = k.vec2(1, 1);
  });

  btnTutorial.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    showOnboardingModal(k, () => {
      isModalOpen = false;
    });
  });

  // Botão 3: Desafio Ecológico (Quiz)
  const btnQuizPos = k.vec2(cX + bottomBtnW + 14, bottomBtnY);
  const btnQuiz = k.add([
    k.rect(bottomBtnW, bottomBtnH, { radius: 10 }),
    k.pos(btnQuizPos),
    k.color(18, 125, 80),
    k.outline(2, k.rgb(52, 211, 153)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnQuiz);

  elements.push(
    k.add([
      k.text("🧪 Desafio Ecológico", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      k.pos(btnQuizPos),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnQuiz.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnQuiz.color = k.rgb(25, 155, 100);
      btnQuiz.scale = k.vec2(1.02, 1.02);
    }
  });
  btnQuiz.onHoverEnd(() => {
    btnQuiz.color = k.rgb(18, 125, 80);
    btnQuiz.scale = k.vec2(1, 1);
  });

  btnQuiz.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    const testState = createGameState();
    showQuizModal(
      k,
      testState,
      () => {
        isModalOpen = false;
      },
      () => {
        isModalOpen = false;
      }
    );
  });

  // Atualização do grupo de foco acessível
  const setupKeyboardFocus = (dynamicItems: FocusableItem[] = []) => {
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }

    const items: FocusableItem[] = [
      {
        pos: btnXPos,
        width: 32,
        height: 32,
        onActivate: close,
      },
      ...tabEntities.map((t) => ({
        pos: t.btn.pos,
        width: tabW,
        height: tabH,
        onActivate: () => {
          if (!isModalOpen) {
            audioSystem.playUiClick();
            activeTab = t.id;
            updateTabStyles();
            renderTabContent();
          }
        },
      })),
      ...dynamicItems,
      {
        pos: btnBackPos,
        width: bottomBtnW,
        height: bottomBtnH,
        onActivate: close,
      },
      {
        pos: btnTutorialPos,
        width: bottomBtnW,
        height: bottomBtnH,
        onActivate: () => {
          if (!isModalOpen) {
            isModalOpen = true;
            showOnboardingModal(k, () => {
              isModalOpen = false;
            });
          }
        },
      },
      {
        pos: btnQuizPos,
        width: bottomBtnW,
        height: bottomBtnH,
        onActivate: () => {
          if (!isModalOpen) {
            isModalOpen = true;
            const testState = createGameState();
            showQuizModal(
              k,
              testState,
              () => {
                isModalOpen = false;
              },
              () => {
                isModalOpen = false;
              }
            );
          }
        },
      },
    ];

    focusGroup = createFocusGroup(k, {
      items,
      initialIndex: 4, // Foca no primeiro botão de ação por padrão
      isEnabled: () => !isClosed && !isModalOpen,
    });
  };

  const renderTabContent = () => {
    contentElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    contentElements = [];

    const dynamicFocusItems: FocusableItem[] = [];

    if (activeTab === "species") {
      // --- ABA ESPÉCIES MARINHAS (Grid em 2 Colunas x 3 Linhas com Cards Individuais) ---
      const speciesData = [
        {
          icon: "🐋",
          name: "Baleia-Jubarte",
          sci: "Megaptera novaeangliae",
          desc: "Famosa pelas longas nadadeiras peitorais e saltos acrobáticos. Migra 27.000 km da Antártica ao litoral brasileiro para reprodução.",
        },
        {
          icon: "🌊",
          name: "Orca",
          sci: "Orcinus orca",
          desc: "Maior membro dos golfinhos e predador de topo polar. Comunica-se por dialetos acústicos únicos em grupos matriarcais.",
        },
        {
          icon: "🦐",
          name: "Krill Antártico",
          sci: "Euphausia superba",
          desc: "Minúsculos crustáceos bioluminescentes base da cadeia alimentar antártica. Fornecem a biomassa vital para a migração.",
        },
        {
          icon: "🐬",
          name: "Golfinho-Rotador",
          sci: "Stenella longirostris",
          desc: "Nadam em bandos criando esteiras hidrodinâmicas (drafting), economizando até 40% de energia e fôlego em navegação.",
        },
        {
          icon: "🐧",
          name: "Pinguim-de-Magalhães",
          sci: "Spheniscus magellanicus",
          desc: "Mestres do salto em arco (porpoising), migram das colônias austrais rumo ao Brasil seguindo as correntes de nutrientes.",
        },
        {
          icon: "🐋",
          name: "Cachalote",
          sci: "Physeter macrocephalus",
          desc: "Gigante abissal com o maior cérebro do reino animal. Mergulha a mais de 2.000m nas fossas oceânicas emitindo cliques.",
        },
      ];

      const colGap = 16;
      const boxW = Math.min(460, (cardW - 64 - colGap) / 2);
      const rowGap = 12;
      const boxH = Math.min(132, (contentBoxH - 20 - rowGap * 2) / 3);
      const col0X = cX - boxW / 2 - colGap / 2;
      const col1X = cX + boxW / 2 + colGap / 2;
      const startY = contentBoxTop + 14 + boxH / 2;

      speciesData.forEach((sp, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const posX = col === 0 ? col0X : col1X;
        const posY = startY + row * (boxH + rowGap);

        // Container do Card da Espécie
        const spBox = k.add([
          k.rect(boxW, boxH, { radius: 12 }),
          k.pos(posX, posY),
          k.color(14, 34, 68),
          k.outline(1.5, k.rgb(42, 85, 145)),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(304),
        ]);
        contentElements.push(spBox);

        spBox.onHoverUpdate(() => {
          spBox.color = k.rgb(18, 48, 92);
          spBox.outline = { width: 1.5, color: k.rgb(80, 200, 255) };
        });
        spBox.onHoverEnd(() => {
          spBox.color = k.rgb(14, 34, 68);
          spBox.outline = { width: 1.5, color: k.rgb(42, 85, 145) };
        });

        // Badge com Ícone à esquerda
        const iconPillX = posX - boxW / 2 + 32;
        const iconPill = k.add([
          k.rect(50, 50, { radius: 10 }),
          k.pos(iconPillX, posY),
          k.color(18, 48, 92),
          k.outline(1, k.rgb(56, 189, 248)),
          k.anchor("center"),
          k.fixed(),
          k.z(305),
        ]);
        contentElements.push(iconPill);

        contentElements.push(
          k.add([
            k.text(sp.icon, {
              size: accessibilitySystem.scaleFont(26),
              font: "Inter",
            }),
            k.pos(iconPillX, posY),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        // Coluna de Texto
        const textStartX = posX - boxW / 2 + 68;

        // Nome Comum
        contentElements.push(
          k.add([
            k.text(sp.name, {
              size: accessibilitySystem.scaleFont(16.5),
              font: "Outfit",
            }),
            k.pos(textStartX, posY - boxH / 2 + 10),
            k.color(110, 235, 255),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );

        // Nome Científico
        contentElements.push(
          k.add([
            k.text(`(${sp.sci})`, {
              size: accessibilitySystem.scaleFont(13),
              font: "Inter",
            }),
            k.pos(textStartX, posY - boxH / 2 + 33),
            k.color(255, 215, 120),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );

        // Descrição Ecológica com topleft e sem sobreposição
        contentElements.push(
          k.add([
            k.text(sp.desc, {
              size: accessibilitySystem.scaleFont(13.5),
              font: "Inter",
              width: boxW - 76,
              lineSpacing: 3.5,
            }),
            k.pos(textStartX, posY - boxH / 2 + 53),
            k.color(225, 240, 255),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );
      });
    } else if (activeTab === "route") {
      // --- ABA FATOS DA ROTA (Cards com Paginação) ---
      const pageSize = 4;
      const totalPages = Math.ceil(factsData.length / pageSize);
      const startIndex = routePage * pageSize;
      const currentFacts = factsData.slice(startIndex, startIndex + pageSize);
      const countUnlocked = factsData.filter((f) => unlockedFactIds.includes(f.id)).length;

      // Estatísticas de Descobertas por Bioma (Fase 34.7)
      const biomes = [
        { name: "Antártica", emoji: "❄️", maxDist: 5000, minDist: 0 },
        { name: "Travessia", emoji: "🌊", maxDist: 12000, minDist: 5000 },
        { name: "Urbana", emoji: "🏭", maxDist: 19000, minDist: 12000 },
        { name: "Cânions", emoji: "🌀", maxDist: 25000, minDist: 19000 },
        { name: "Santuário", emoji: "☀️", maxDist: 30000, minDist: 25000 },
      ];

      const biomeChipsText = biomes
        .map((b) => {
          const inBiome = factsData.filter(
            (f) => f.triggerX >= b.minDist && f.triggerX < b.maxDist
          );
          const unlocked = inBiome.filter((f) => unlockedFactIds.includes(f.id)).length;
          return `${b.emoji} ${b.name}: ${unlocked}/${inBiome.length}`;
        })
        .join("   •   ");

      // Cabeçalho de Status da Rota
      contentElements.push(
        k.add([
          k.text(
            `🗺️ Descobertas na Rota: ${countUnlocked} de ${factsData.length} desbloqueadas (${Math.round((countUnlocked / factsData.length) * 100)}%)  •  Página ${routePage + 1} de ${totalPages}`,
            {
              size: accessibilitySystem.scaleFont(15),
              font: "Outfit",
            }
          ),
          k.pos(cX, contentBoxTop + 14),
          k.color(255, 220, 100),
          k.anchor("center"),
          k.fixed(),
          k.z(304),
        ])
      );

      // Linha de Progresso por Bioma (Fase 34.7)
      contentElements.push(
        k.add([
          k.text(biomeChipsText, {
            size: accessibilitySystem.scaleFont(12.5),
            font: "Inter",
          }),
          k.pos(cX, contentBoxTop + 33),
          k.color(175, 225, 255),
          k.anchor("center"),
          k.fixed(),
          k.z(304),
        ])
      );

      // Barra Horizontal de Progresso da Rota Completa (0 a 30.000m) com Marcadores
      const barW = cardW - 72;
      const barY = contentBoxTop + 48;

      contentElements.push(
        k.add([
          k.rect(barW, 6, { radius: 3 }),
          k.pos(cX, barY),
          k.color(16, 38, 72),
          k.outline(1, k.rgb(35, 70, 120)),
          k.anchor("center"),
          k.fixed(),
          k.z(304),
        ])
      );

      const fillW = Math.max(6, (barW * countUnlocked) / Math.max(1, factsData.length));
      contentElements.push(
        k.add([
          k.rect(fillW, 6, { radius: 3 }),
          k.pos(cX - barW / 2 + fillW / 2, barY),
          k.color(56, 189, 248),
          k.anchor("center"),
          k.fixed(),
          k.z(305),
        ])
      );

      // Marcadores pontuais de cada fato na rota
      factsData.forEach((f) => {
        const norm = Math.min(1, Math.max(0, f.triggerX / 30000));
        const dotX = cX - barW / 2 + norm * barW;
        const isUnl = unlockedFactIds.includes(f.id);

        contentElements.push(
          k.add([
            k.circle(isUnl ? 3.5 : 2.5),
            k.pos(dotX, barY),
            k.color(isUnl ? k.rgb(250, 204, 21) : k.rgb(70, 95, 135)),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );
      });

      const factBoxW = cardW - 64;
      const factBoxH = 78;
      const factGap = 10;
      const factStartY = contentBoxTop + 64 + factBoxH / 2;

      currentFacts.forEach((fact, i) => {
        const isUnlocked = unlockedFactIds.includes(fact.id);
        const bInfo = getCodexBiomeInfo(fact.triggerX);
        const itemY = factStartY + i * (factBoxH + factGap);

        const fBox = k.add([
          k.rect(factBoxW, factBoxH, { radius: 10 }),
          k.pos(cX, itemY),
          k.color(14, 34, 68),
          k.outline(1.5, isUnlocked ? k.rgb(35, 100, 80) : k.rgb(38, 65, 100)),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(304),
        ]);
        contentElements.push(fBox);

        fBox.onHoverUpdate(() => {
          fBox.color = k.rgb(18, 45, 88);
          fBox.outline = {
            width: 1.5,
            color: isUnlocked ? k.rgb(52, 211, 153) : k.rgb(80, 200, 255),
          };
        });
        fBox.onHoverEnd(() => {
          fBox.color = k.rgb(14, 34, 68);
          fBox.outline = {
            width: 1.5,
            color: isUnlocked ? k.rgb(35, 100, 80) : k.rgb(38, 65, 100),
          };
        });

        // Badge de Status com Emoji do Bioma (Fase 34.7)
        const badgeX = cX - factBoxW / 2 + 32;
        contentElements.push(
          k.add([
            k.rect(46, 46, { radius: 8 }),
            k.pos(badgeX, itemY),
            k.color(isUnlocked ? k.rgb(16, 50, 40) : k.rgb(20, 32, 52)),
            k.outline(1, isUnlocked ? k.rgb(52, 211, 153) : k.rgb(75, 95, 125)),
            k.anchor("center"),
            k.fixed(),
            k.z(305),
          ])
        );

        contentElements.push(
          k.add([
            k.text(isUnlocked ? `${bInfo.emoji}` : "🔒", {
              size: accessibilitySystem.scaleFont(20),
              font: "Outfit",
            }),
            k.pos(badgeX, itemY),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        // Título e Localização com identificador do bioma
        const textStartX = cX - factBoxW / 2 + 66;
        contentElements.push(
          k.add([
            k.text(`${bInfo.emoji} ${fact.title} • [${fact.location}]`, {
              size: accessibilitySystem.scaleFont(15.5),
              font: "Outfit",
            }),
            k.pos(textStartX, itemY - factBoxH / 2 + 10),
            k.color(isUnlocked ? k.rgb(255, 225, 110) : k.rgb(160, 175, 200)),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );

        // Descrição do Fato Ecológico
        contentElements.push(
          k.add([
            k.text(
              isUnlocked
                ? fact.description
                : "Navegue pela rota migratória na expedição para desbloquear esta descoberta ecológica!",
              {
                size: accessibilitySystem.scaleFont(14),
                font: "Inter",
                width: factBoxW - 84,
                lineSpacing: 3.5,
              }
            ),
            k.pos(textStartX, itemY - factBoxH / 2 + 36),
            k.color(isUnlocked ? k.rgb(225, 240, 255) : k.rgb(145, 165, 190)),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );
      });

      // Controles de Paginação no Rodapé da Caixa
      const pagY = contentBoxBottom - 24;

      if (routePage > 0) {
        const btnPrevPos = k.vec2(cX - 95, pagY);
        const btnPrev = k.add([
          k.rect(140, 38, { radius: 8 }),
          k.pos(btnPrevPos),
          k.color(20, 50, 95),
          k.outline(1.5, k.rgb(100, 200, 255)),
          k.scale(1),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(305),
        ]);
        contentElements.push(btnPrev);

        contentElements.push(
          k.add([
            k.text("◀ Anterior", {
              size: accessibilitySystem.scaleFont(14.5),
              font: "Outfit",
            }),
            k.pos(btnPrevPos),
            k.color(255, 255, 255),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        btnPrev.onHoverUpdate(() => {
          btnPrev.color = k.rgb(28, 70, 130);
          btnPrev.scale = k.vec2(1.03, 1.03);
        });
        btnPrev.onHoverEnd(() => {
          btnPrev.color = k.rgb(20, 50, 95);
          btnPrev.scale = k.vec2(1, 1);
        });

        btnPrev.onClick(() => {
          audioSystem.playUiClick();
          routePage--;
          renderTabContent();
        });

        dynamicFocusItems.push({
          pos: btnPrevPos,
          width: 140,
          height: 38,
          onActivate: () => {
            audioSystem.playUiClick();
            routePage--;
            renderTabContent();
          },
        });
      }

      if (routePage < totalPages - 1) {
        const btnNextPos = k.vec2(cX + 95, pagY);
        const btnNext = k.add([
          k.rect(140, 38, { radius: 8 }),
          k.pos(btnNextPos),
          k.color(20, 50, 95),
          k.outline(1.5, k.rgb(100, 200, 255)),
          k.scale(1),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(305),
        ]);
        contentElements.push(btnNext);

        contentElements.push(
          k.add([
            k.text("Próxima ▶", {
              size: accessibilitySystem.scaleFont(14.5),
              font: "Outfit",
            }),
            k.pos(btnNextPos),
            k.color(255, 255, 255),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        btnNext.onHoverUpdate(() => {
          btnNext.color = k.rgb(28, 70, 130);
          btnNext.scale = k.vec2(1.03, 1.03);
        });
        btnNext.onHoverEnd(() => {
          btnNext.color = k.rgb(20, 50, 95);
          btnNext.scale = k.vec2(1, 1);
        });

        btnNext.onClick(() => {
          audioSystem.playUiClick();
          routePage++;
          renderTabContent();
        });

        dynamicFocusItems.push({
          pos: btnNextPos,
          width: 140,
          height: 36,
          onActivate: () => {
            audioSystem.playUiClick();
            routePage++;
            renderTabContent();
          },
        });
      }
    } else if (activeTab === "conservation") {
      // --- ABA CONSERVAÇÃO (4 Cards Temáticos em Grid 2x2) ---
      contentElements.push(
        k.add([
          k.text("🛡️ PRESERVAÇÃO E PROTEÇÃO DAS BALEIAS-JUBARTE", {
            size: accessibilitySystem.scaleFont(17),
            font: "Outfit",
          }),
          k.pos(cX, contentBoxTop + 24),
          k.color(100, 240, 255),
          k.anchor("center"),
          k.fixed(),
          k.z(304),
        ])
      );

      const conservationCards = [
        {
          icon: "🕸️",
          title: "Redes Fantasmas (Ghost Fishing)",
          desc: "Redes de pesca perdidas continuam aprisionando baleias e golfinhos por décadas. O jogo conscientiza sobre petrechos sustentáveis e descarte responsável.",
        },
        {
          icon: "🧴",
          title: "Poluição Plástica e Microplásticos",
          desc: "Resíduos flutuantes provocam lesões mecânicas e obstruções graves. A fragmentação em microplásticos contamina os cardumes de krill na base alimentar.",
        },
        {
          icon: "🚢",
          title: "Tráfego de Navios & Ruído Subaquático",
          desc: "O tráfego marítimo intenso gera poluição sonora contínua no canal SOFAR, abafando os cantos das baleias e desorientando sua comunicação acústica.",
        },
        {
          icon: "🐋",
          title: "Instituto Baleia Jubarte (IBJ)",
          desc: "Desde 1988 atua no monitoramento, pesquisa e resgate de jubartes no Brasil, recuperando a espécie de quase extinção para mais de 30 mil indivíduos!",
        },
      ];

      const colGap = 20;
      const boxW = Math.min(460, (cardW - 64 - colGap) / 2);
      const rowGap = 16;
      const boxH = Math.min(160, (contentBoxH - 64 - rowGap) / 2);
      const col0X = cX - boxW / 2 - colGap / 2;
      const col1X = cX + boxW / 2 + colGap / 2;
      const startY = contentBoxTop + 50 + boxH / 2;

      conservationCards.forEach((c, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const posX = col === 0 ? col0X : col1X;
        const posY = startY + row * (boxH + rowGap);

        const cBox = k.add([
          k.rect(boxW, boxH, { radius: 12 }),
          k.pos(posX, posY),
          k.color(14, 34, 68),
          k.outline(1.5, k.rgb(42, 85, 145)),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(304),
        ]);
        contentElements.push(cBox);

        cBox.onHoverUpdate(() => {
          cBox.color = k.rgb(18, 48, 92);
          cBox.outline = { width: 1.5, color: k.rgb(80, 200, 255) };
        });
        cBox.onHoverEnd(() => {
          cBox.color = k.rgb(14, 34, 68);
          cBox.outline = { width: 1.5, color: k.rgb(42, 85, 145) };
        });

        // Badge de Ícone
        const iconPillX = posX - boxW / 2 + 32;
        contentElements.push(
          k.add([
            k.rect(50, 50, { radius: 10 }),
            k.pos(iconPillX, posY - boxH / 2 + 35),
            k.color(18, 48, 92),
            k.outline(1.5, k.rgb(56, 189, 248)),
            k.anchor("center"),
            k.fixed(),
            k.z(305),
          ])
        );

        contentElements.push(
          k.add([
            k.text(c.icon, {
              size: accessibilitySystem.scaleFont(24),
              font: "Outfit",
            }),
            k.pos(iconPillX, posY - boxH / 2 + 35),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        // Título do Tópico
        const textStartX = posX - boxW / 2 + 66;
        contentElements.push(
          k.add([
            k.text(c.title, {
              size: accessibilitySystem.scaleFont(16),
              font: "Outfit",
              width: boxW - 78,
            }),
            k.pos(textStartX, posY - boxH / 2 + 14),
            k.color(110, 235, 255),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );

        // Descrição Educativa
        contentElements.push(
          k.add([
            k.text(c.desc, {
              size: accessibilitySystem.scaleFont(14),
              font: "Inter",
              width: boxW - 78,
              lineSpacing: 4,
            }),
            k.pos(textStartX, posY - boxH / 2 + 42),
            k.color(225, 240, 255),
            k.anchor("topleft"),
            k.fixed(),
            k.z(305),
          ])
        );
      });
    }

    setupKeyboardFocus(dynamicFocusItems);
  };

  renderTabContent();
}

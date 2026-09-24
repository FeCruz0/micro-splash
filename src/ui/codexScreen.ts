import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { createGameState } from "../systems/state";
import { showQuizModal } from "./quizModal";
import { showOnboardingModal } from "./onboardingModal";
import factsData from "../../data/facts.json";

export function showCodexScreen(k: KaboomCtx, onBack: () => void) {
  audioSystem.playUiClick();

  const elements: any[] = [];
  let isClosed = false;
  let isModalOpen = false;

  // Fundo escuro semitransparente (bloqueia cliques na tela de menu abaixo)
  const backdrop = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(4, 16, 35),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(300),
  ]);
  elements.push(backdrop);

  // Card do Diário de Bordo (Codex)
  const cardW = 780;
  const cardH = 540;
  const card = k.add([
    k.rect(cardW, cardH, { radius: 12 }),
    k.pos(k.width() / 2, k.height() / 2),
    k.color(10, 28, 58),
    k.outline(3, k.rgb(255, 215, 80)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(301),
  ]);
  elements.push(card);

  // Título Principal (Maior e mais nítido)
  elements.push(
    k.add([
      k.text("DIÁRIO DE BORDO DA EXPEDIÇÃO 📖", { size: 23, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 - 232),
      k.color(255, 220, 100),
      k.anchor("center"),
      k.fixed(),
      k.z(302),
    ])
  );

  let contentElements: any[] = [];

  const close = () => {
    if (isClosed || isModalOpen) return;
    isClosed = true;
    audioSystem.playUiClick();
    escListener.cancel();
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

  const escListener = k.onKeyPress("escape", () => {
    if (!isModalOpen) close();
  });

  // Botão fechar [X] no canto superior direito do card
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

  elements.push(
    k.add([
      k.text("✕", { size: 18, font: "sans-serif" }),
      k.pos(k.width() / 2 + cardW / 2 - 28, k.height() / 2 - cardH / 2 + 28),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnX.onHoverUpdate(() => {
    btnX.color = k.rgb(180, 50, 50);
  });
  btnX.onHoverEnd(() => {
    btnX.color = k.rgb(20, 45, 80);
  });
  btnX.onClick(close);

  // Carrega fatos já desbloqueados
  let unlockedFactIds: string[] = [];
  try {
    unlockedFactIds = JSON.parse(localStorage.getItem("micro_splash_unlocked_facts") || "[]");
  } catch {}

  let activeTab: "species" | "route" | "conservation" = "species";
  let routePage = 0;

  const renderTabContent = () => {
    contentElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    contentElements = [];

    const contentBoxW = 726;
    const contentBoxH = 330;
    const contentBoxY = k.height() / 2 + 15;

    // Fundo do conteúdo da aba
    contentElements.push(
      k.add([
        k.rect(contentBoxW, contentBoxH, { radius: 8 }),
        k.pos(k.width() / 2, contentBoxY),
        k.color(6, 22, 48),
        k.outline(1, k.rgb(50, 120, 180)),
        k.anchor("center"),
        k.fixed(),
        k.z(303),
      ])
    );

    if (activeTab === "species") {
      // --- ABA ESPÉCIES ---
      const speciesData = [
        {
          name: "🐋 Baleia-Jubarte (Megaptera novaeangliae)",
          desc: "Famosa pelas longas nadadeiras peitorais (1/3 do corpo) e saltos acrobáticos. Viaja 27.000 km entre a Antártica e o litoral brasileiro para reprodução.",
        },
        {
          name: "🌊 Orca (Orcinus orca)",
          desc: "Maior membro da família dos golfinhos e predador de topo polar. Comunica-se por dialetos acústicos únicos em grupos matriarcais altamente estruturados.",
        },
        {
          name: "🦐 Krill Antártico (Euphausia superba)",
          desc: "Minúsculos crustáceos bioluminescentes que formam a base da cadeia trófica polar, fornecendo sustento essencial para o acúmulo de energia da migração.",
        },
        {
          name: "🐬 Golfinho-Rotador (Stenella longirostris)",
          desc: "Nadam em bandos criando esteiras hidrodinâmicas (drafting) que reduzem o arrasto e economizam até 40% do fôlego de cetáceos em navegação cooperativa.",
        },
        {
          name: "🐧 Pinguim-de-Magalhães (Spheniscus magellanicus)",
          desc: "Mestres do salto em arco (porpoising), migram das colônias austrais rumo ao sudeste brasileiro acompanhando as correntes ricas em nutrientes.",
        },
        {
          name: "🐋 Cachalote (Physeter macrocephalus)",
          desc: "O gigante abissal com cabeça maciça quadrada e maior cérebro do reino animal. Mergulha a mais de 2.000m nas fossas oceânicas emitindo infrassons profundos.",
        },
      ];

      speciesData.forEach((sp, i) => {
        const itemY = contentBoxY - 144 + i * 50;
        contentElements.push(
          k.add([
            k.text(sp.name, { size: 12, font: "sans-serif" }),
            k.pos(k.width() / 2 - 340, itemY),
            k.color(120, 240, 255),
            k.anchor("left"),
            k.fixed(),
            k.z(304),
          ])
        );
        contentElements.push(
          k.add([
            k.text(sp.desc, { size: 10.5, font: "sans-serif", width: 680, lineSpacing: 2 }),
            k.pos(k.width() / 2 - 340, itemY + 16),
            k.color(205, 230, 250),
            k.anchor("left"),
            k.fixed(),
            k.z(304),
          ])
        );
      });
    } else if (activeTab === "route") {
      // --- ABA FATOS DA ROTA COM PAGINAÇÃO ---
      const pageSize = 5;
      const totalPages = Math.ceil(factsData.length / pageSize);
      const startIndex = routePage * pageSize;
      const currentFacts = factsData.slice(startIndex, startIndex + pageSize);

      const countUnlocked = factsData.filter((f) => unlockedFactIds.includes(f.id)).length;

      contentElements.push(
        k.add([
          k.text(
            `Descobertas na Rota: ${countUnlocked} de ${factsData.length} desbloqueadas  •  Página ${routePage + 1} de ${totalPages}`,
            {
              size: 13,
              font: "sans-serif",
            }
          ),
          k.pos(k.width() / 2, contentBoxY - 142),
          k.color(255, 215, 100),
          k.anchor("center"),
          k.fixed(),
          k.z(304),
        ])
      );

      currentFacts.forEach((fact, i) => {
        const isUnlocked = unlockedFactIds.includes(fact.id);
        const itemY = contentBoxY - 114 + i * 48;

        contentElements.push(
          k.add([
            k.text(`${isUnlocked ? "✅" : "🔒"} ${fact.title} (${fact.location})`, {
              size: 12.5,
              font: "sans-serif",
            }),
            k.pos(k.width() / 2 - 340, itemY),
            k.color(isUnlocked ? k.rgb(100, 240, 200) : k.rgb(140, 150, 170)),
            k.anchor("left"),
            k.fixed(),
            k.z(304),
          ])
        );

        contentElements.push(
          k.add([
            k.text(
              isUnlocked
                ? fact.description
                : "Navegue pela rota migratória na expedição para desbloquear este conhecimento!",
              { size: 10.5, font: "sans-serif", width: 680, lineSpacing: 2 }
            ),
            k.pos(k.width() / 2 - 340, itemY + 16),
            k.color(isUnlocked ? k.rgb(205, 230, 250) : k.rgb(120, 135, 150)),
            k.anchor("left"),
            k.fixed(),
            k.z(304),
          ])
        );
      });

      // Botão Página Anterior
      if (routePage > 0) {
        const btnPrev = k.add([
          k.rect(110, 26, { radius: 6 }),
          k.pos(k.width() / 2 - 80, contentBoxY + 140),
          k.color(20, 50, 95),
          k.outline(1, k.rgb(100, 200, 255)),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(305),
        ]);
        contentElements.push(btnPrev);

        contentElements.push(
          k.add([
            k.text("◀ Anterior", { size: 11, font: "sans-serif" }),
            k.pos(k.width() / 2 - 80, contentBoxY + 140),
            k.color(255, 255, 255),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        btnPrev.onClick(() => {
          audioSystem.playUiClick();
          routePage--;
          renderTabContent();
        });
      }

      // Botão Próxima Página
      if (routePage < totalPages - 1) {
        const btnNext = k.add([
          k.rect(110, 26, { radius: 6 }),
          k.pos(k.width() / 2 + 80, contentBoxY + 140),
          k.color(20, 50, 95),
          k.outline(1, k.rgb(100, 200, 255)),
          k.anchor("center"),
          k.area(),
          k.fixed(),
          k.z(305),
        ]);
        contentElements.push(btnNext);

        contentElements.push(
          k.add([
            k.text("Próxima ▶", { size: 11, font: "sans-serif" }),
            k.pos(k.width() / 2 + 80, contentBoxY + 140),
            k.color(255, 255, 255),
            k.anchor("center"),
            k.fixed(),
            k.z(306),
          ])
        );

        btnNext.onClick(() => {
          audioSystem.playUiClick();
          routePage++;
          renderTabContent();
        });
      }
    } else if (activeTab === "conservation") {
      // --- ABA CONSERVAÇÃO ---
      contentElements.push(
        k.add([
          k.text("🛡️ PRESERVAÇÃO E PROTEÇÃO DAS BALEIAS-JUBARTE", { size: 15, font: "sans-serif" }),
          k.pos(k.width() / 2, contentBoxY - 136),
          k.color(100, 240, 255),
          k.anchor("center"),
          k.fixed(),
          k.z(304),
        ])
      );

      const texts = [
        "• Redes Fantasmas: Redes de pesca perdidas ou abandonadas continuam aprisionando baleias e golfinhos por décadas. O jogo simula esse perigo para conscientizar sobre a pesca sustentável e o descarte correto de petrechos.",
        "• Poluição Plástica: Resíduos sólidos flutuantes provocam lesões mecânicas, obstruem espiráculos e poluem os cardumes de krill através da contaminação por microplásticos.",
        "• Tráfego de Navios & Ruído: O tráfego marítimo intenso gera poluição acústica subaquática contínua, dificultando a ecolocalização, navegação e comunicação dos animais pelo canal SOFAR.",
        "• Instituto Baleia Jubarte: Desde 1988 atua no monitoramento, pesquisa e proteção das jubartes no Brasil, contribuindo para a recuperação histórica da espécie de quase extinção para mais de 30 mil indivíduos!",
      ];

      texts.forEach((txt, idx) => {
        contentElements.push(
          k.add([
            k.text(txt, { size: 12, font: "sans-serif", width: 680, lineSpacing: 4 }),
            k.pos(k.width() / 2 - 340, contentBoxY - 105 + idx * 62),
            k.color(205, 230, 250),
            k.anchor("left"),
            k.fixed(),
            k.z(304),
          ])
        );
      });
    }
  };

  // Botões de Abas (Tabs) - Mais largos e com fontes maiores
  const tabButtonsData = [
    { id: "species" as const, label: "🐋 Espécies Marinhas" },
    { id: "route" as const, label: "🗺️ Fatos da Rota" },
    { id: "conservation" as const, label: "🌊 Conservação & IBJ" },
  ];

  const tabButtons: any[] = [];

  tabButtonsData.forEach((tb, i) => {
    const tabX = k.width() / 2 - 230 + i * 230;
    const tabY = k.height() / 2 - 180;

    const btnTab = k.add([
      k.rect(215, 36, { radius: 7 }),
      k.pos(tabX, tabY),
      k.color(activeTab === tb.id ? k.rgb(20, 100, 160) : k.rgb(15, 35, 65)),
      k.outline(1, activeTab === tb.id ? k.rgb(100, 240, 255) : k.rgb(60, 90, 130)),
      k.scale(1),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(304),
    ]);
    elements.push(btnTab);
    tabButtons.push({ btn: btnTab, id: tb.id });

    elements.push(
      k.add([
        k.text(tb.label, { size: 13, font: "sans-serif" }),
        k.pos(tabX, tabY),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(305),
      ])
    );

    btnTab.onHoverUpdate(() => {
      if (activeTab !== tb.id) {
        btnTab.color = k.rgb(25, 60, 100);
      }
    });
    btnTab.onHoverEnd(() => {
      btnTab.color = activeTab === tb.id ? k.rgb(20, 100, 160) : k.rgb(15, 35, 65);
    });

    btnTab.onClick(() => {
      if (isModalOpen) return;
      audioSystem.playUiClick();
      activeTab = tb.id;
      tabButtons.forEach((t) => {
        const isActive = t.id === activeTab;
        t.btn.color = isActive ? k.rgb(20, 100, 160) : k.rgb(15, 35, 65);
        t.btn.outline.color = isActive ? k.rgb(100, 240, 255) : k.rgb(60, 90, 130);
      });
      renderTabContent();
    });
  });

  renderTabContent();

  // Botão 1: Voltar ao Menu
  const btnBack = k.add([
    k.rect(190, 38, { radius: 8 }),
    k.pos(k.width() / 2 - 235, k.height() / 2 + 225),
    k.color(16, 75, 120),
    k.outline(2, k.rgb(100, 220, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnBack);

  elements.push(
    k.add([
      k.text("Voltar ao Menu ↩️", { size: 12.5, font: "sans-serif" }),
      k.pos(k.width() / 2 - 235, k.height() / 2 + 225),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnBack.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnBack.color = k.rgb(25, 115, 175);
    }
  });
  btnBack.onHoverEnd(() => {
    if (!isModalOpen) {
      btnBack.color = k.rgb(16, 75, 120);
    }
  });
  btnBack.onClick(close);

  // Botão 2: Tutorial / Guia da Espécie e Controles
  const btnTutorial = k.add([
    k.rect(190, 38, { radius: 8 }),
    k.pos(k.width() / 2, k.height() / 2 + 225),
    k.color(20, 85, 135),
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
      k.text("🎓 Tutorial / Guia", { size: 12.5, font: "sans-serif" }),
      k.pos(k.width() / 2, k.height() / 2 + 225),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnTutorial.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnTutorial.color = k.rgb(28, 120, 180);
    }
  });
  btnTutorial.onHoverEnd(() => {
    if (!isModalOpen) {
      btnTutorial.color = k.rgb(20, 85, 135);
    }
  });

  btnTutorial.onClick(() => {
    if (isModalOpen) return;
    isModalOpen = true;
    showOnboardingModal(k, () => {
      isModalOpen = false;
    });
  });

  // Botão 3: Iniciar Desafio Ecológico (Quiz)
  const btnQuiz = k.add([
    k.rect(210, 38, { radius: 8 }),
    k.pos(k.width() / 2 + 235, k.height() / 2 + 225),
    k.color(20, 115, 80),
    k.outline(2, k.rgb(100, 255, 180)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(305),
  ]);
  elements.push(btnQuiz);

  elements.push(
    k.add([
      k.text("🧪 Desafio Ecológico (Quiz)", { size: 12.5, font: "sans-serif" }),
      k.pos(k.width() / 2 + 235, k.height() / 2 + 225),
      k.color(255, 255, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(306),
    ])
  );

  btnQuiz.onHoverUpdate(() => {
    if (!isModalOpen) {
      btnQuiz.color = k.rgb(28, 145, 100);
    }
  });
  btnQuiz.onHoverEnd(() => {
    if (!isModalOpen) {
      btnQuiz.color = k.rgb(20, 115, 80);
    }
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
}

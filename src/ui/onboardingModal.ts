import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";

const ONBOARDING_STORAGE_KEY = "micro_splash_onboarding_done";

export function hasSeenOnboarding(): boolean {
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  }
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  }
  return false;
}

export function markOnboardingSeen(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  } else if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }
}

interface OnboardingSlide {
  badge: string;
  title: string;
  subtitle: string;
  points: { icon: string; title: string; desc: string }[];
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    badge: "SLIDE 1 DE 3 • BIOLOGIA MARINHA",
    title: "QUEM É A BALEIA-JUBARTE? 🐋",
    subtitle: "Megaptera novaeangliae • A Acrobata dos Oceanos",
    points: [
      {
        icon: "🌊",
        title: "Asas Gigantes:",
        desc: "Suas nadadeiras peitorais chegam a 5 metros — equivalem a um terço de todo o comprimento do animal!",
      },
      {
        icon: "🎵",
        title: "Cantoras do Oceano:",
        desc: "Os machos entoam cantos submarinos complexos que viajam milhares de quilômetros pelo Canal SOFAR.",
      },
      {
        icon: "✨",
        title: "Saltos Acrobáticos:",
        desc: "Arremessam até 40 toneladas no ar para se comunicar, cortejar e remover parasitas de sua pele.",
      },
    ],
  },
  {
    badge: "SLIDE 2 DE 3 • JORNADA MIGRATÓRIA",
    title: "A ROTA DOS 30.000 METROS 🗺️",
    subtitle: "Do Gelo Polar ao Berçário Tropical de Arraial",
    points: [
      {
        icon: "❄️",
        title: "Banquete na Antártica:",
        desc: "No verão polar, consomem até 2 toneladas de krill ao dia para acumular grossas reservas de gordura.",
      },
      {
        icon: "⏳",
        title: "Jejum Prolongado:",
        desc: "Durante a travessia de meses em mar aberto, não se alimentam e navegam gastando apenas energia acumulada.",
      },
      {
        icon: "☀️",
        title: "Berçário em Arraial do Cabo:",
        desc: "Encontram águas mornas, calmas e protegidas da RESEX para parir, amamentar e guiar os filhotes recém-nascidos.",
      },
    ],
  },
  {
    badge: "SLIDE 3 DE 3 • COMO JOGAR",
    title: "CONTROLES & NAVEGAÇÃO OCEÂNICA 🎮",
    subtitle: "Comandos de Teclado, Touch & Biosonar",
    points: [
      {
        icon: "💨",
        title: "Nado & Impulso:",
        desc: "Pressione [ESPAÇO] ou o botão de Nado touch a cada 1s para cadenciar suas batidas de cauda com menor esforço.",
      },
      {
        icon: "🧭",
        title: "Direção & Mergulho:",
        desc: "Use [SETAS] ou [WASD] para alternar entre as profundezas ricas e a superfície onde se respira.",
      },
      {
        icon: "📡",
        title: "Fôlego & Biosonar:",
        desc: "Rompa a superfície para respirar oxigênio. Pressione [SHIFT] ou [E] para varrer o mar escuro e revelar perigos!",
      },
    ],
  },
];

export function showOnboardingModal(k: KaboomCtx, onDone: () => void) {
  audioSystem.playUiClick();

  let currentSlide = 0;
  let isClosed = false;

  const elements: any[] = [];
  let dynamicElements: any[] = [];
  const keyListeners: any[] = [];

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(620, screenW - 24);
  const cardH = Math.min(410, screenH - 24);

  // Backdrop escuro bloqueando cliques externos
  const backdrop = k.add([
    k.rect(screenW, screenH),
    k.pos(0, 0),
    k.color(5, 15, 32),
    k.opacity(0.95),
    k.area(),
    k.fixed(),
    k.z(550),
  ]);
  elements.push(backdrop);

  // Card principal
  const card = k.add([
    k.rect(cardW, cardH, { radius: 14 }),
    k.pos(cX, cY),
    k.color(10, 32, 65),
    k.outline(2.5, k.rgb(80, 210, 255)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(551),
  ]);
  elements.push(card);

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    keyListeners.forEach((l) => {
      try {
        l.cancel();
      } catch {}
    });
    dynamicElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
  };

  const closeAndFinish = () => {
    cleanup();
    markOnboardingSeen();
    audioSystem.playUiClick();
    onDone();
  };

  const renderSlide = (slideIndex: number) => {
    dynamicElements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    dynamicElements = [];

    const slide = ONBOARDING_SLIDES[slideIndex];

    // Badge de etapa
    dynamicElements.push(
      k.add([
        k.text(slide.badge, { size: 10.5, font: "sans-serif" }),
        k.pos(cX, cY - cardH / 2 + 25),
        k.color(100, 220, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(553),
      ])
    );

    // Título do slide
    dynamicElements.push(
      k.add([
        k.text(slide.title, { size: 16.5, font: "sans-serif" }),
        k.pos(cX, cY - cardH / 2 + 48),
        k.color(255, 225, 90),
        k.anchor("center"),
        k.fixed(),
        k.z(553),
      ])
    );

    // Subtítulo
    dynamicElements.push(
      k.add([
        k.text(slide.subtitle, { size: 11.5, font: "sans-serif" }),
        k.pos(cX, cY - cardH / 2 + 70),
        k.color(190, 230, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(553),
      ])
    );

    // 3 Cards de Conteúdo
    const startY = cY - cardH / 2 + 96;
    const itemGap = 68;

    slide.points.forEach((pt, idx) => {
      const itemY = startY + idx * itemGap;
      const boxW = cardW - 40;

      // Fundo do tópico
      dynamicElements.push(
        k.add([
          k.rect(boxW, 58, { radius: 8 }),
          k.pos(cX, itemY + 29),
          k.color(16, 46, 88),
          k.outline(1, k.rgb(40, 110, 175)),
          k.anchor("center"),
          k.fixed(),
          k.z(552),
        ])
      );

      // Ícone do tópico
      dynamicElements.push(
        k.add([
          k.text(pt.icon, { size: 20 }),
          k.pos(cX - boxW / 2 + 25, itemY + 29),
          k.anchor("center"),
          k.fixed(),
          k.z(553),
        ])
      );

      // Título do tópico
      dynamicElements.push(
        k.add([
          k.text(pt.title, { size: 12, font: "sans-serif" }),
          k.pos(cX - boxW / 2 + 50, itemY + 14),
          k.color(255, 235, 150),
          k.fixed(),
          k.z(553),
        ])
      );

      // Descrição do tópico
      dynamicElements.push(
        k.add([
          k.text(pt.desc, { size: 10.5, font: "sans-serif", width: boxW - 65, lineSpacing: 2 }),
          k.pos(cX - boxW / 2 + 50, itemY + 31),
          k.color(210, 235, 255),
          k.fixed(),
          k.z(553),
        ])
      );
    });

    // Indicadores visuais de bolinhas no rodapé
    const dotsY = cY + cardH / 2 - 58;
    for (let i = 0; i < ONBOARDING_SLIDES.length; i++) {
      const dotX = cX + (i - 1) * 24;
      const isActive = i === slideIndex;
      dynamicElements.push(
        k.add([
          k.circle(isActive ? 5 : 3.5),
          k.pos(dotX, dotsY),
          k.color(isActive ? k.rgb(100, 230, 255) : k.rgb(45, 90, 140)),
          k.anchor("center"),
          k.fixed(),
          k.z(553),
        ])
      );
    }

    // --- BOTÕES DE AÇÃO ---
    const btnY = cY + cardH / 2 - 26;

    // Botão Pular (canto superior direito)
    const btnSkip = k.add([
      k.rect(76, 26, { radius: 6 }),
      k.pos(cX + cardW / 2 - 48, cY - cardH / 2 + 24),
      k.color(25, 45, 75),
      k.outline(1, k.rgb(80, 160, 210)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(554),
    ]);
    dynamicElements.push(btnSkip);

    dynamicElements.push(
      k.add([
        k.text("Pular ✕", { size: 10.5, font: "sans-serif" }),
        k.pos(cX + cardW / 2 - 48, cY - cardH / 2 + 24),
        k.color(200, 225, 250),
        k.anchor("center"),
        k.fixed(),
        k.z(555),
      ])
    );

    btnSkip.onClick(closeAndFinish);

    // Botão Anterior (visível apenas a partir do slide 1)
    if (slideIndex > 0) {
      const btnPrev = k.add([
        k.rect(130, 32, { radius: 7 }),
        k.pos(cX - 120, btnY),
        k.color(25, 65, 110),
        k.outline(1, k.rgb(90, 180, 240)),
        k.anchor("center"),
        k.area(),
        k.fixed(),
        k.z(554),
      ]);
      dynamicElements.push(btnPrev);

      dynamicElements.push(
        k.add([
          k.text("◀ Anterior", { size: 12, font: "sans-serif" }),
          k.pos(cX - 120, btnY),
          k.color(255, 255, 255),
          k.anchor("center"),
          k.fixed(),
          k.z(555),
        ])
      );

      btnPrev.onClick(() => {
        audioSystem.playUiClick();
        currentSlide--;
        renderSlide(currentSlide);
      });
    }

    // Botão Próximo / Concluir
    const isLast = slideIndex === ONBOARDING_SLIDES.length - 1;
    const nextBtnX = slideIndex === 0 ? cX : cX + 120;
    const nextBtnW = slideIndex === 0 ? 210 : 160;

    const btnNext = k.add([
      k.rect(nextBtnW, 32, { radius: 7 }),
      k.pos(nextBtnX, btnY),
      k.color(isLast ? k.rgb(20, 140, 100) : k.rgb(18, 120, 190)),
      k.outline(1.5, isLast ? k.rgb(100, 255, 180) : k.rgb(100, 230, 255)),
      k.anchor("center"),
      k.area(),
      k.fixed(),
      k.z(554),
    ]);
    dynamicElements.push(btnNext);

    dynamicElements.push(
      k.add([
        k.text(isLast ? "Começar Migração 🌊▶" : "Próximo ▶", { size: 12, font: "sans-serif" }),
        k.pos(nextBtnX, btnY),
        k.color(255, 255, 255),
        k.anchor("center"),
        k.fixed(),
        k.z(555),
      ])
    );

    btnNext.onClick(() => {
      audioSystem.playUiClick();
      if (isLast) {
        closeAndFinish();
      } else {
        currentSlide++;
        renderSlide(currentSlide);
      }
    });
  };

  // Teclas de atalho para avançar / retroceder / pular
  keyListeners.push(k.onKeyPress("escape", closeAndFinish));
  keyListeners.push(
    k.onKeyPress("right", () => {
      if (currentSlide < ONBOARDING_SLIDES.length - 1) {
        audioSystem.playUiClick();
        currentSlide++;
        renderSlide(currentSlide);
      } else {
        closeAndFinish();
      }
    })
  );
  keyListeners.push(
    k.onKeyPress("space", () => {
      if (currentSlide < ONBOARDING_SLIDES.length - 1) {
        audioSystem.playUiClick();
        currentSlide++;
        renderSlide(currentSlide);
      } else {
        closeAndFinish();
      }
    })
  );
  keyListeners.push(
    k.onKeyPress("enter", () => {
      if (currentSlide < ONBOARDING_SLIDES.length - 1) {
        audioSystem.playUiClick();
        currentSlide++;
        renderSlide(currentSlide);
      } else {
        closeAndFinish();
      }
    })
  );
  keyListeners.push(
    k.onKeyPress("left", () => {
      if (currentSlide > 0) {
        audioSystem.playUiClick();
        currentSlide--;
        renderSlide(currentSlide);
      }
    })
  );

  renderSlide(0);
}

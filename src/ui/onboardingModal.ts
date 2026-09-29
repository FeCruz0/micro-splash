import type { KaboomCtx } from "kaboom";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem } from "./keyboardNav";

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
        desc: "Encontram águas calmas e protegidas para parir, amamentar e guiar os filhotes recém-nascidos.",
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
        desc: "Pressione [ESPAÇO] ou o botão touch a cada 1s para cadenciar suas batidas de cauda com menor esforço.",
      },
      {
        icon: "🧭",
        title: "Direção & Mergulho:",
        desc: "Use [SETAS] ou [WASD] para alternar entre as profundezas ricas em krill e a superfície para respirar.",
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
  let focusGroup: { destroy: () => void } | null = null;

  const screenW = k.width();
  const screenH = k.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(1000, screenW - 24);
  const cardH = Math.min(660, screenH - 20);

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
    k.rect(cardW, cardH, { radius: 16 }),
    k.pos(cX, cY),
    k.color(10, 28, 56),
    k.outline(2.5, k.rgb(56, 189, 248)),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(551),
  ]);
  elements.push(card);

  const initialSlide = ONBOARDING_SLIDES[0];

  // Badge de etapa
  const badgeText = k.add([
    k.text(initialSlide.badge, {
      size: accessibilitySystem.scaleFont(14),
      font: "Outfit",
    }),
    k.pos(cX, cY - cardH / 2 + 30),
    k.color(100, 220, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(553),
  ]);
  elements.push(badgeText);

  // Título do slide
  const titleText = k.add([
    k.text(initialSlide.title, {
      size: accessibilitySystem.scaleFont(26),
      font: "Outfit",
    }),
    k.pos(cX, cY - cardH / 2 + 58),
    k.color(255, 225, 90),
    k.anchor("center"),
    k.fixed(),
    k.z(553),
  ]);
  elements.push(titleText);

  // Subtítulo
  const subtitleText = k.add([
    k.text(initialSlide.subtitle, {
      size: accessibilitySystem.scaleFont(15.5),
      font: "Inter",
    }),
    k.pos(cX, cY - cardH / 2 + 86),
    k.color(190, 230, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(553),
  ]);
  elements.push(subtitleText);

  // 3 Cards de Conteúdo (estruturas fixas atualizadas in-place)
  const boxW = cardW - 56;
  const boxH = 100;
  const itemGap = 110;
  const startY = cY - cardH / 2 + 116;

  const pointIconTexts: any[] = [];
  const pointTitleTexts: any[] = [];
  const pointDescTexts: any[] = [];

  for (let idx = 0; idx < 3; idx++) {
    const itemY = startY + idx * itemGap + boxH / 2;
    const pt = initialSlide.points[idx];

    // Fundo do tópico
    elements.push(
      k.add([
        k.rect(boxW, boxH, { radius: 12 }),
        k.pos(cX, itemY),
        k.color(14, 36, 72),
        k.outline(1.5, k.rgb(38, 78, 130)),
        k.anchor("center"),
        k.fixed(),
        k.z(552),
      ])
    );

    // Badge de Ícone à esquerda
    const iconPillX = cX - boxW / 2 + 36;
    elements.push(
      k.add([
        k.rect(54, 54, { radius: 10 }),
        k.pos(iconPillX, itemY),
        k.color(20, 52, 100),
        k.outline(1.5, k.rgb(56, 189, 248)),
        k.anchor("center"),
        k.fixed(),
        k.z(553),
      ])
    );

    const iconText = k.add([
      k.text(pt.icon, {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      k.pos(iconPillX, itemY),
      k.anchor("center"),
      k.fixed(),
      k.z(554),
    ]);
    pointIconTexts.push(iconText);
    elements.push(iconText);

    // Coluna de Texto
    const textStartX = cX - boxW / 2 + 76;

    const pTitle = k.add([
      k.text(pt.title, {
        size: accessibilitySystem.scaleFont(17),
        font: "Outfit",
      }),
      k.pos(textStartX, itemY - boxH / 2 + 16),
      k.color(255, 225, 110),
      k.anchor("topleft"),
      k.fixed(),
      k.z(553),
    ]);
    pointTitleTexts.push(pTitle);
    elements.push(pTitle);

    const pDesc = k.add([
      k.text(pt.desc, {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
        width: boxW - 94,
        lineSpacing: 4.5,
      }),
      k.pos(textStartX, itemY - boxH / 2 + 42),
      k.color(225, 240, 255),
      k.anchor("topleft"),
      k.fixed(),
      k.z(553),
    ]);
    pointDescTexts.push(pDesc);
    elements.push(pDesc);
  }

  // Indicadores visuais de bolinhas no rodapé
  const dotsY = cY + cardH / 2 - 62;
  const dotCircles: any[] = [];
  for (let i = 0; i < ONBOARDING_SLIDES.length; i++) {
    const dotX = cX + (i - 1) * 26;
    const isActive = i === 0;
    const dot = k.add([
      k.circle(isActive ? 7 : 4.5),
      k.pos(dotX, dotsY),
      k.color(isActive ? k.rgb(100, 230, 255) : k.rgb(45, 90, 140)),
      k.anchor("center"),
      k.fixed(),
      k.z(553),
    ]);
    dotCircles.push(dot);
    elements.push(dot);
  }

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    window.removeEventListener("keydown", keyHandler);
    elements.forEach((el) => {
      try {
        k.destroy(el);
      } catch {}
    });
    elements.length = 0;
  };

  const closeAndFinish = () => {
    if (isClosed) return;
    cleanup();
    markOnboardingSeen();
    audioSystem.playUiClick();
    onDone();
  };

  // --- BOTÕES DE AÇÃO ---
  // Botão Pular (canto superior direito)
  const btnSkipPos = k.vec2(cX + cardW / 2 - 54, cY - cardH / 2 + 30);
  const btnSkip = k.add([
    k.rect(94, 36, { radius: 8 }),
    k.pos(btnSkipPos),
    k.color(22, 50, 90),
    k.outline(1, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(554),
  ]);
  elements.push(btnSkip);

  elements.push(
    k.add([
      k.text("Pular ✕", {
        size: accessibilitySystem.scaleFont(14),
        font: "Outfit",
      }),
      k.pos(btnSkipPos),
      k.color(215, 235, 255),
      k.anchor("center"),
      k.fixed(),
      k.z(555),
    ])
  );

  btnSkip.onHoverUpdate(() => {
    if (isClosed) return;
    btnSkip.color = k.rgb(180, 50, 50);
    btnSkip.scale = k.vec2(1.05, 1.05);
  });
  btnSkip.onHoverEnd(() => {
    if (isClosed) return;
    btnSkip.color = k.rgb(22, 50, 90);
    btnSkip.scale = k.vec2(1, 1);
  });
  btnSkip.onClick(() => {
    if (isClosed) return;
    closeAndFinish();
  });

  const actionBtnY = cY + cardH / 2 - 30;

  // Botão Anterior
  const btnPrevPos = k.vec2(cX - 120, actionBtnY);
  const btnPrev = k.add([
    k.rect(160, 46, { radius: 9 }),
    k.pos(-9999, -9999),
    k.color(20, 55, 100),
    k.outline(1.5, k.rgb(100, 200, 255)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(554),
  ]);
  btnPrev.hidden = true;
  elements.push(btnPrev);

  const btnPrevText = k.add([
    k.text("◀ Anterior", {
      size: accessibilitySystem.scaleFont(15.5),
      font: "Outfit",
    }),
    k.pos(-9999, -9999),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(555),
  ]);
  btnPrevText.hidden = true;
  elements.push(btnPrevText);

  btnPrev.onHoverUpdate(() => {
    if (isClosed || currentSlide === 0) return;
    btnPrev.color = k.rgb(28, 75, 135);
    btnPrev.scale = k.vec2(1.02, 1.02);
  });
  btnPrev.onHoverEnd(() => {
    if (isClosed || currentSlide === 0) return;
    btnPrev.color = k.rgb(20, 55, 100);
    btnPrev.scale = k.vec2(1, 1);
  });

  const goPrev = () => {
    if (isClosed || currentSlide <= 0) return;
    audioSystem.playUiClick();
    goToSlide(currentSlide - 1);
  };
  btnPrev.onClick(goPrev);

  // Botão Próximo / Concluir
  const btnNextPos = k.vec2(cX, actionBtnY);
  const btnNext = k.add([
    k.rect(240, 46, { radius: 9 }),
    k.pos(btnNextPos),
    k.color(24, 85, 150),
    k.outline(1.5, k.rgb(56, 189, 248)),
    k.scale(1),
    k.anchor("center"),
    k.area(),
    k.fixed(),
    k.z(554),
  ]);
  elements.push(btnNext);

  const btnNextText = k.add([
    k.text("Próximo ▶", {
      size: accessibilitySystem.scaleFont(16),
      font: "Outfit",
    }),
    k.pos(btnNextPos),
    k.color(255, 255, 255),
    k.anchor("center"),
    k.fixed(),
    k.z(555),
  ]);
  elements.push(btnNextText);

  btnNext.onHoverUpdate(() => {
    if (isClosed) return;
    const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
    btnNext.color = isLast ? k.rgb(25, 150, 95) : k.rgb(32, 110, 190);
    btnNext.scale = k.vec2(1.02, 1.02);
  });
  btnNext.onHoverEnd(() => {
    if (isClosed) return;
    const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
    btnNext.color = isLast ? k.rgb(18, 125, 80) : k.rgb(24, 85, 150);
    btnNext.scale = k.vec2(1, 1);
  });

  const goNext = () => {
    if (isClosed) return;
    if (currentSlide === ONBOARDING_SLIDES.length - 1) {
      closeAndFinish();
    } else {
      audioSystem.playUiClick();
      goToSlide(currentSlide + 1);
    }
  };
  btnNext.onClick(goNext);

  const goToSlide = (slideIndex: number) => {
    if (isClosed) return;
    currentSlide = Math.max(0, Math.min(slideIndex, ONBOARDING_SLIDES.length - 1));
    const slide = ONBOARDING_SLIDES[currentSlide];

    badgeText.text = slide.badge;
    titleText.text = slide.title;
    subtitleText.text = slide.subtitle;

    for (let i = 0; i < 3; i++) {
      const pt = slide.points[i];
      if (pointIconTexts[i]) pointIconTexts[i].text = pt.icon;
      if (pointTitleTexts[i]) pointTitleTexts[i].text = pt.title;
      if (pointDescTexts[i]) pointDescTexts[i].text = pt.desc;
    }

    for (let i = 0; i < dotCircles.length; i++) {
      const isActive = i === currentSlide;
      dotCircles[i].radius = isActive ? 7 : 4.5;
      dotCircles[i].color = isActive ? k.rgb(100, 230, 255) : k.rgb(45, 90, 140);
    }

    const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;

    if (currentSlide === 0) {
      btnPrev.hidden = true;
      btnPrev.pos = k.vec2(-9999, -9999);
      btnPrevText.hidden = true;
      btnPrevText.pos = k.vec2(-9999, -9999);

      btnNext.pos = k.vec2(cX, actionBtnY);
      btnNext.width = 240;
      btnNextText.pos = k.vec2(cX, actionBtnY);
    } else {
      btnPrev.hidden = false;
      btnPrev.pos = btnPrevPos;
      btnPrevText.hidden = false;
      btnPrevText.pos = btnPrevPos;

      btnNext.pos = k.vec2(cX + 120, actionBtnY);
      btnNext.width = 160;
      btnNextText.pos = k.vec2(cX + 120, actionBtnY);
    }

    btnNextText.text = isLast ? "Entendi! Iniciar 🌊" : "Próximo ▶";
    btnNext.color = isLast ? k.rgb(18, 125, 80) : k.rgb(24, 85, 150);
    btnNext.outline.color = isLast ? k.rgb(52, 211, 153) : k.rgb(56, 189, 248);
  };

  const keyHandler = (e: KeyboardEvent) => {
    if (isClosed) return;
    if (e.key === "Escape") {
      closeAndFinish();
    } else if (e.key === "ArrowRight") {
      if (currentSlide < ONBOARDING_SLIDES.length - 1) {
        audioSystem.playUiClick();
        goToSlide(currentSlide + 1);
      }
    } else if (e.key === "ArrowLeft") {
      if (currentSlide > 0) {
        audioSystem.playUiClick();
        goToSlide(currentSlide - 1);
      }
    }
  };
  window.addEventListener("keydown", keyHandler);

  // Itens focáveis estáveis
  const focusItems: FocusableItem[] = [
    {
      pos: btnSkipPos,
      width: 94,
      height: 36,
      onActivate: closeAndFinish,
    },
    {
      pos: btnPrevPos,
      width: 160,
      height: 46,
      onActivate: goPrev,
    },
    {
      pos: k.vec2(cX + 120, actionBtnY),
      width: 160,
      height: 46,
      onActivate: goNext,
    },
  ];

  focusGroup = createFocusGroup(k, {
    items: focusItems,
    initialIndex: 2, // Foco padrão em Próximo / Iniciar
    ringZ: 560,
  });

  goToSlide(0);
}

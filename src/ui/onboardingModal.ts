/**
 * Modal de Onboarding & Tutorial da Jornada (Fase 21.3 / Fase 26 / WBS 2.15) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte nativo a IRenderEngine (PixiJS v8)
 * e compatibilidade reversa para contextos legados sem nenhum uso de "any".
 */

import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem, type FocusGroup } from "./keyboardNav";
import { FONT_TITLE, FONT_BODY, TEXT_SIZE_H1, TEXT_SIZE_BODY, TEXT_SIZE_CAPTION } from "../config";
import { readLocalStorageWithSchema, writeLocalStorage } from "../utils/storage";
import { HapticsEnabledSchema } from "../schemas/storageSchemas";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
  Vector2D,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

const ONBOARDING_STORAGE_KEY = "micro_splash_onboarding_done";

export function hasSeenOnboarding(): boolean {
  return readLocalStorageWithSchema(ONBOARDING_STORAGE_KEY, HapticsEnabledSchema, false);
}

export function markOnboardingSeen(): void {
  writeLocalStorage(ONBOARDING_STORAGE_KEY, true);
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

export interface LegacyOnboardingContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  circle(radius: number): unknown;
  pos(x: number, y: number): unknown;
  pos(position: Vector2D | { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center" | "topleft"): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  area?(): unknown;
  scale?(factor: number): unknown;
  text(content: string, options?: unknown): unknown;
  destroy?(target: unknown): void;
  vec2?(x: number, y: number): { x: number; y: number };
  onKeyPress?(
    key: "tab" | "down" | "right" | "up" | "left" | "enter" | "space" | "escape",
    callback: () => void
  ): { cancel: () => void };
  isKeyDown?(key: "shift"): boolean;
}

export function showOnboardingModal(
  engineOrContext: IRenderEngine | LegacyOnboardingContext,
  onDone: () => void
): void {
  audioSystem.playUiClick();

  let currentSlide = 0;
  let isClosed = false;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const screenW = dimensions.width;
    const screenH = dimensions.height;
    const cX = screenW / 2;
    const cY = screenH / 2;

    const cardW = Math.min(1000, screenW - 24);
    const cardH = Math.min(660, screenH - 20);

    const createdNodes: Array<IGraphicsNode | ITextNode> = [];
    let focusGroup: FocusGroup | null = null;

    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      if (focusGroup) {
        focusGroup.destroy();
        focusGroup = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", keyHandler);
      }
      createdNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      createdNodes.length = 0;
    };

    const closeAndFinish = () => {
      if (isClosed) return;
      cleanup();
      markOnboardingSeen();
      audioSystem.playUiClick();
      onDone();
    };

    // Backdrop escuro
    const backdrop = engineOrContext.createGraphics("onboarding-backdrop");
    backdrop.drawRect(0, 0, screenW, screenH, {
      fill: { color: [5, 15, 32], alpha: 0.95 },
    });
    backdrop.setZIndex(550);
    stageRoot.addChild(backdrop);
    createdNodes.push(backdrop);

    // Card principal
    const card = engineOrContext.createGraphics("onboarding-card");
    card.drawRoundedRect(cX - cardW / 2, cY - cardH / 2, cardW, cardH, 16, {
      fill: { color: [10, 28, 56], alpha: 1 },
      stroke: { color: [56, 189, 248], width: 2.5 },
    });
    card.setZIndex(551);
    stageRoot.addChild(card);
    createdNodes.push(card);

    const initialSlide = ONBOARDING_SLIDES[0];

    // Badge
    const badgeText = engineOrContext.createText(
      initialSlide.badge,
      {
        fontSize: accessibilitySystem.scaleFont(TEXT_SIZE_CAPTION + 1),
        fontFamily: FONT_TITLE,
        color: [100, 220, 255],
        align: "center",
      },
      "onboarding-badge"
    );
    badgeText.setPosition(cX, cY - cardH / 2 + 30);
    badgeText.setAlign("center");
    const nativeBadge = badgeText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeBadge?.anchor?.set) nativeBadge.anchor.set(0.5, 0.5);
    badgeText.setZIndex(553);
    stageRoot.addChild(badgeText);
    createdNodes.push(badgeText);

    // Título
    const titleText = engineOrContext.createText(
      initialSlide.title,
      {
        fontSize: accessibilitySystem.scaleFont(TEXT_SIZE_H1),
        fontFamily: FONT_TITLE,
        color: [255, 225, 90],
        align: "center",
      },
      "onboarding-title"
    );
    titleText.setPosition(cX, cY - cardH / 2 + 58);
    titleText.setAlign("center");
    const nativeTitle = titleText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeTitle?.anchor?.set) nativeTitle.anchor.set(0.5, 0.5);
    titleText.setZIndex(553);
    stageRoot.addChild(titleText);
    createdNodes.push(titleText);

    // Subtítulo
    const subtitleText = engineOrContext.createText(
      initialSlide.subtitle,
      {
        fontSize: accessibilitySystem.scaleFont(TEXT_SIZE_BODY),
        fontFamily: FONT_BODY,
        color: [190, 230, 255],
        align: "center",
      },
      "onboarding-subtitle"
    );
    subtitleText.setPosition(cX, cY - cardH / 2 + 86);
    subtitleText.setAlign("center");
    const nativeSub = subtitleText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeSub?.anchor?.set) nativeSub.anchor.set(0.5, 0.5);
    subtitleText.setZIndex(553);
    stageRoot.addChild(subtitleText);
    createdNodes.push(subtitleText);

    // 3 Cards de Conteúdo
    const boxW = cardW - 56;
    const boxH = 100;
    const itemGap = 110;
    const startY = cY - cardH / 2 + 116;

    const pointIconTexts: ITextNode[] = [];
    const pointTitleTexts: ITextNode[] = [];
    const pointDescTexts: ITextNode[] = [];

    for (let idx = 0; idx < 3; idx++) {
      const itemY = startY + idx * itemGap + boxH / 2;
      const pt = initialSlide.points[idx];

      // Fundo do tópico
      const itemBox = engineOrContext.createGraphics(`onboarding-box-${idx}`);
      itemBox.drawRoundedRect(cX - boxW / 2, itemY - boxH / 2, boxW, boxH, 12, {
        fill: { color: [14, 36, 72], alpha: 1 },
        stroke: { color: [38, 78, 130], width: 1.5 },
      });
      itemBox.setZIndex(552);
      stageRoot.addChild(itemBox);
      createdNodes.push(itemBox);

      // Badge de Ícone à esquerda
      const iconPillX = cX - boxW / 2 + 36;
      const iconBox = engineOrContext.createGraphics(`onboarding-iconbox-${idx}`);
      iconBox.drawRoundedRect(iconPillX - 27, itemY - 27, 54, 54, 10, {
        fill: { color: [20, 52, 100], alpha: 1 },
        stroke: { color: [56, 189, 248], width: 1.5 },
      });
      iconBox.setZIndex(553);
      stageRoot.addChild(iconBox);
      createdNodes.push(iconBox);

      const iconText = engineOrContext.createText(
        pt.icon,
        {
          fontSize: accessibilitySystem.scaleFont(26),
          fontFamily: "Outfit",
          align: "center",
        },
        `onboarding-icon-${idx}`
      );
      iconText.setPosition(iconPillX, itemY);
      iconText.setAlign("center");
      const nativeIcon = iconText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
      if (nativeIcon?.anchor?.set) nativeIcon.anchor.set(0.5, 0.5);
      iconText.setZIndex(554);
      stageRoot.addChild(iconText);
      createdNodes.push(iconText);
      pointIconTexts.push(iconText);

      // Coluna de Texto
      const textStartX = cX - boxW / 2 + 76;

      const pTitle = engineOrContext.createText(
        pt.title,
        {
          fontSize: accessibilitySystem.scaleFont(17),
          fontFamily: "Outfit",
          color: [255, 225, 110],
          align: "left",
        },
        `onboarding-pt-title-${idx}`
      );
      pTitle.setPosition(textStartX, itemY - boxH / 2 + 16);
      pTitle.setZIndex(553);
      stageRoot.addChild(pTitle);
      createdNodes.push(pTitle);
      pointTitleTexts.push(pTitle);

      const pDesc = engineOrContext.createText(
        pt.desc,
        {
          fontSize: accessibilitySystem.scaleFont(14.5),
          fontFamily: "Inter",
          color: [225, 240, 255],
          align: "left",
          wordWrapWidth: boxW - 94,
          lineSpacing: 4.5,
        },
        `onboarding-pt-desc-${idx}`
      );
      pDesc.setPosition(textStartX, itemY - boxH / 2 + 42);
      pDesc.setZIndex(553);
      stageRoot.addChild(pDesc);
      createdNodes.push(pDesc);
      pointDescTexts.push(pDesc);
    }

    // Indicadores visuais de bolinhas no rodapé
    const dotsY = cY + cardH / 2 - 62;
    const dotsGraphics = engineOrContext.createGraphics("onboarding-dots");
    dotsGraphics.setZIndex(553);
    stageRoot.addChild(dotsGraphics);
    createdNodes.push(dotsGraphics);

    const renderDots = (activeIdx: number) => {
      dotsGraphics.clear();
      for (let i = 0; i < ONBOARDING_SLIDES.length; i++) {
        const dotX = cX + (i - 1) * 26;
        const isActive = i === activeIdx;
        dotsGraphics.drawCircle(dotX, dotsY, isActive ? 7 : 4.5, {
          fill: {
            color: isActive ? [100, 230, 255] : [45, 90, 140],
            alpha: 1,
          },
        });
      }
    };
    renderDots(0);

    // Botão Pular (canto superior direito)
    const btnSkipPos: Vector2D = { x: cX + cardW / 2 - 54, y: cY - cardH / 2 + 30 };
    const btnSkip = engineOrContext.createGraphics("onboarding-btn-skip");
    const drawSkip = (hovered: boolean) => {
      btnSkip.clear();
      btnSkip.drawRoundedRect(btnSkipPos.x - 47, btnSkipPos.y - 18, 94, 36, 8, {
        fill: { color: hovered ? [180, 50, 50] : [22, 50, 90], alpha: 1 },
        stroke: { color: [100, 200, 255], width: 1 },
      });
    };
    drawSkip(false);
    btnSkip.setZIndex(554);
    stageRoot.addChild(btnSkip);
    createdNodes.push(btnSkip);

    const btnSkipText = engineOrContext.createText(
      "Pular ✕",
      {
        fontSize: accessibilitySystem.scaleFont(14),
        fontFamily: "Outfit",
        color: [215, 235, 255],
        align: "center",
      },
      "onboarding-skip-label"
    );
    btnSkipText.setPosition(btnSkipPos.x, btnSkipPos.y);
    btnSkipText.setAlign("center");
    const nativeSkip = btnSkipText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeSkip?.anchor?.set) nativeSkip.anchor.set(0.5, 0.5);
    btnSkipText.setZIndex(555);
    stageRoot.addChild(btnSkipText);
    createdNodes.push(btnSkipText);

    const nativeSkipBtn = btnSkip.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeSkipBtn?.on) {
      nativeSkipBtn.eventMode = "static";
      nativeSkipBtn.cursor = "pointer";
      nativeSkipBtn.on("pointerover", () => drawSkip(true));
      nativeSkipBtn.on("pointerout", () => drawSkip(false));
      nativeSkipBtn.on("pointerdown", () => {
        if (!isClosed) closeAndFinish();
      });
    }

    const actionBtnY = cY + cardH / 2 - 30;

    // Botão Anterior
    const btnPrevPos: Vector2D = { x: cX - 120, y: actionBtnY };
    const btnPrev = engineOrContext.createGraphics("onboarding-btn-prev");
    const drawPrev = (hovered: boolean) => {
      btnPrev.clear();
      btnPrev.drawRoundedRect(btnPrevPos.x - 80, btnPrevPos.y - 23, 160, 46, 9, {
        fill: { color: hovered ? [28, 75, 135] : [20, 55, 100], alpha: 1 },
        stroke: { color: [100, 200, 255], width: 1.5 },
      });
    };
    drawPrev(false);
    btnPrev.setZIndex(554);
    btnPrev.setVisible(false);
    stageRoot.addChild(btnPrev);
    createdNodes.push(btnPrev);

    const btnPrevText = engineOrContext.createText(
      "◀ Anterior",
      {
        fontSize: accessibilitySystem.scaleFont(15.5),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "onboarding-prev-label"
    );
    btnPrevText.setPosition(btnPrevPos.x, btnPrevPos.y);
    btnPrevText.setAlign("center");
    const nativePrev = btnPrevText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativePrev?.anchor?.set) nativePrev.anchor.set(0.5, 0.5);
    btnPrevText.setZIndex(555);
    btnPrevText.setVisible(false);
    stageRoot.addChild(btnPrevText);
    createdNodes.push(btnPrevText);

    const goPrev = () => {
      if (isClosed || currentSlide <= 0) return;
      audioSystem.playUiClick();
      goToSlide(currentSlide - 1);
    };

    const nativePrevBtn = btnPrev.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativePrevBtn?.on) {
      nativePrevBtn.eventMode = "static";
      nativePrevBtn.cursor = "pointer";
      nativePrevBtn.on("pointerover", () => drawPrev(true));
      nativePrevBtn.on("pointerout", () => drawPrev(false));
      nativePrevBtn.on("pointerdown", goPrev);
    }

    // Botão Próximo / Concluir
    const btnNext = engineOrContext.createGraphics("onboarding-btn-next");
    btnNext.setZIndex(554);
    stageRoot.addChild(btnNext);
    createdNodes.push(btnNext);

    const btnNextText = engineOrContext.createText(
      "Próximo ▶",
      {
        fontSize: accessibilitySystem.scaleFont(16),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "onboarding-next-label"
    );
    btnNextText.setAlign("center");
    const nativeNext = btnNextText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeNext?.anchor?.set) nativeNext.anchor.set(0.5, 0.5);
    btnNextText.setZIndex(555);
    stageRoot.addChild(btnNextText);
    createdNodes.push(btnNextText);

    const drawNext = (hovered: boolean) => {
      btnNext.clear();
      const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
      const isFirst = currentSlide === 0;
      const width = isFirst ? 240 : 160;
      const centerX = isFirst ? cX : cX + 120;

      const baseColor: [number, number, number] = isLast ? [18, 125, 80] : [24, 85, 150];
      const hoverColor: [number, number, number] = isLast ? [25, 150, 95] : [32, 110, 190];
      const strokeColor: [number, number, number] = isLast ? [52, 211, 153] : [56, 189, 248];

      btnNext.drawRoundedRect(centerX - width / 2, actionBtnY - 23, width, 46, 9, {
        fill: { color: hovered ? hoverColor : baseColor, alpha: 1 },
        stroke: { color: strokeColor, width: 1.5 },
      });
    };

    const goNext = () => {
      if (isClosed) return;
      if (currentSlide === ONBOARDING_SLIDES.length - 1) {
        closeAndFinish();
      } else {
        audioSystem.playUiClick();
        goToSlide(currentSlide + 1);
      }
    };

    const nativeNextBtn = btnNext.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeNextBtn?.on) {
      nativeNextBtn.eventMode = "static";
      nativeNextBtn.cursor = "pointer";
      nativeNextBtn.on("pointerover", () => drawNext(true));
      nativeNextBtn.on("pointerout", () => drawNext(false));
      nativeNextBtn.on("pointerdown", goNext);
    }

    const goToSlide = (slideIndex: number) => {
      if (isClosed) return;
      currentSlide = Math.max(0, Math.min(slideIndex, ONBOARDING_SLIDES.length - 1));
      const slide = ONBOARDING_SLIDES[currentSlide];

      badgeText.setText(slide.badge);
      titleText.setText(slide.title);
      subtitleText.setText(slide.subtitle);

      for (let i = 0; i < 3; i++) {
        const pt = slide.points[i];
        if (pointIconTexts[i]) pointIconTexts[i].setText(pt.icon);
        if (pointTitleTexts[i]) pointTitleTexts[i].setText(pt.title);
        if (pointDescTexts[i]) pointDescTexts[i].setText(pt.desc);
      }

      renderDots(currentSlide);

      const isFirst = currentSlide === 0;
      const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;

      btnPrev.setVisible(!isFirst);
      btnPrevText.setVisible(!isFirst);

      const nextCenterX = isFirst ? cX : cX + 120;
      btnNextText.setPosition(nextCenterX, actionBtnY);
      btnNextText.setText(isLast ? "Entendi! Iniciar 🌊" : "Próximo ▶");
      drawNext(false);
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
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", keyHandler);
    }

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
        pos: { x: cX + 120, y: actionBtnY },
        width: 160,
        height: 46,
        onActivate: goNext,
      },
    ];

    focusGroup = createFocusGroup(engineOrContext, {
      items: focusItems,
      initialIndex: 2,
      ringZ: 560,
    });

    goToSlide(0);
    return;
  }

  // --- MODO LEGADO (COMPATIBILIDADE REVERSA) ---
  const elements: Array<{ destroy?: () => void } | object> = [];
  let focusGroup: { destroy: () => void } | null = null;

  const screenW = engineOrContext.width();
  const screenH = engineOrContext.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(1000, screenW - 24);
  const cardH = Math.min(660, screenH - 20);

  const backdrop = engineOrContext.add([
    engineOrContext.rect(screenW, screenH),
    engineOrContext.pos(0, 0),
    engineOrContext.color(5, 15, 32),
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.95) : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(550) : undefined,
  ]);
  if (backdrop && typeof backdrop === "object") elements.push(backdrop);

  const cardOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(2.5, engineOrContext.rgb(56, 189, 248))
      : undefined;

  const card = engineOrContext.add([
    engineOrContext.rect(cardW, cardH, { radius: 16 }),
    engineOrContext.pos(cX, cY),
    engineOrContext.color(10, 28, 56),
    cardOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(551) : undefined,
  ]);
  if (card && typeof card === "object") elements.push(card);

  const initialSlide = ONBOARDING_SLIDES[0];

  const badgeText = engineOrContext.add([
    engineOrContext.text(initialSlide.badge, {
      size: accessibilitySystem.scaleFont(TEXT_SIZE_CAPTION + 1),
      font: FONT_TITLE,
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 30),
    engineOrContext.color(100, 220, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
  ]) as { text?: string };
  if (badgeText && typeof badgeText === "object") elements.push(badgeText);

  const titleText = engineOrContext.add([
    engineOrContext.text(initialSlide.title, {
      size: accessibilitySystem.scaleFont(TEXT_SIZE_H1),
      font: FONT_TITLE,
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 58),
    engineOrContext.color(255, 225, 90),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
  ]) as { text?: string };
  if (titleText && typeof titleText === "object") elements.push(titleText);

  const subtitleText = engineOrContext.add([
    engineOrContext.text(initialSlide.subtitle, {
      size: accessibilitySystem.scaleFont(TEXT_SIZE_BODY),
      font: FONT_BODY,
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 86),
    engineOrContext.color(190, 230, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
  ]) as { text?: string };
  if (subtitleText && typeof subtitleText === "object") elements.push(subtitleText);

  const boxW = cardW - 56;
  const boxH = 100;
  const itemGap = 110;
  const startY = cY - cardH / 2 + 116;

  const pointIconTexts: Array<{ text?: string }> = [];
  const pointTitleTexts: Array<{ text?: string }> = [];
  const pointDescTexts: Array<{ text?: string }> = [];

  for (let idx = 0; idx < 3; idx++) {
    const itemY = startY + idx * itemGap + boxH / 2;
    const pt = initialSlide.points[idx];

    const boxOutline =
      typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
        ? engineOrContext.outline(1.5, engineOrContext.rgb(38, 78, 130))
        : undefined;

    const topicBg = engineOrContext.add([
      engineOrContext.rect(boxW, boxH, { radius: 12 }),
      engineOrContext.pos(cX, itemY),
      engineOrContext.color(14, 36, 72),
      boxOutline,
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(552) : undefined,
    ]);
    if (topicBg && typeof topicBg === "object") elements.push(topicBg);

    const iconPillX = cX - boxW / 2 + 36;
    const iconPillOutline =
      typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
        ? engineOrContext.outline(1.5, engineOrContext.rgb(56, 189, 248))
        : undefined;

    const iconBox = engineOrContext.add([
      engineOrContext.rect(54, 54, { radius: 10 }),
      engineOrContext.pos(iconPillX, itemY),
      engineOrContext.color(20, 52, 100),
      iconPillOutline,
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
    ]);
    if (iconBox && typeof iconBox === "object") elements.push(iconBox);

    const iconText = engineOrContext.add([
      engineOrContext.text(pt.icon, {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      engineOrContext.pos(iconPillX, itemY),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(554) : undefined,
    ]) as { text?: string };
    pointIconTexts.push(iconText);
    if (iconText && typeof iconText === "object") elements.push(iconText);

    const textStartX = cX - boxW / 2 + 76;

    const pTitle = engineOrContext.add([
      engineOrContext.text(pt.title, {
        size: accessibilitySystem.scaleFont(17),
        font: "Outfit",
      }),
      engineOrContext.pos(textStartX, itemY - boxH / 2 + 16),
      engineOrContext.color(255, 225, 110),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("topleft") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
    ]) as { text?: string };
    pointTitleTexts.push(pTitle);
    if (pTitle && typeof pTitle === "object") elements.push(pTitle);

    const pDesc = engineOrContext.add([
      engineOrContext.text(pt.desc, {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
        width: boxW - 94,
        lineSpacing: 4.5,
      }),
      engineOrContext.pos(textStartX, itemY - boxH / 2 + 42),
      engineOrContext.color(225, 240, 255),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("topleft") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
    ]) as { text?: string };
    pointDescTexts.push(pDesc);
    if (pDesc && typeof pDesc === "object") elements.push(pDesc);
  }

  const dotsY = cY + cardH / 2 - 62;
  const dotCircles: Array<{ radius?: number; color?: unknown }> = [];
  for (let i = 0; i < ONBOARDING_SLIDES.length; i++) {
    const dotX = cX + (i - 1) * 26;
    const isActive = i === 0;
    const dotColor =
      typeof engineOrContext.rgb === "function"
        ? isActive
          ? engineOrContext.rgb(100, 230, 255)
          : engineOrContext.rgb(45, 90, 140)
        : undefined;

    const dot = engineOrContext.add([
      engineOrContext.circle(isActive ? 7 : 4.5),
      engineOrContext.pos(dotX, dotsY),
      dotColor ? engineOrContext.color(dotColor) : undefined,
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(553) : undefined,
    ]) as { radius?: number; color?: unknown };
    dotCircles.push(dot);
    if (dot && typeof dot === "object") elements.push(dot);
  }

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        if (typeof engineOrContext.destroy === "function") {
          engineOrContext.destroy(el);
        } else if (
          "destroy" in el &&
          typeof (el as { destroy?: () => void }).destroy === "function"
        ) {
          (el as { destroy: () => void }).destroy();
        }
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

  const createVec2 = (x: number, y: number): { x: number; y: number } => {
    return typeof engineOrContext.vec2 === "function" ? engineOrContext.vec2(x, y) : { x, y };
  };

  const btnSkipPos = createVec2(cX + cardW / 2 - 54, cY - cardH / 2 + 30);
  const skipOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1, engineOrContext.rgb(100, 200, 255))
      : undefined;

  const btnSkip = engineOrContext.add([
    engineOrContext.rect(94, 36, { radius: 8 }),
    engineOrContext.pos(btnSkipPos.x, btnSkipPos.y),
    engineOrContext.color(22, 50, 90),
    skipOutline,
    typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(554) : undefined,
  ]) as {
    color?: unknown;
    scale?: { x: number; y: number };
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnSkip && typeof btnSkip === "object") elements.push(btnSkip);

  const skipLabel = engineOrContext.add([
    engineOrContext.text("Pular ✕", {
      size: accessibilitySystem.scaleFont(14),
      font: "Outfit",
    }),
    engineOrContext.pos(btnSkipPos.x, btnSkipPos.y),
    engineOrContext.color(215, 235, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(555) : undefined,
  ]);
  if (skipLabel && typeof skipLabel === "object") elements.push(skipLabel);

  if (typeof btnSkip?.onHoverUpdate === "function") {
    btnSkip.onHoverUpdate(() => {
      if (isClosed) return;
      if (typeof engineOrContext.rgb === "function")
        btnSkip.color = engineOrContext.rgb(180, 50, 50);
      btnSkip.scale = createVec2(1.05, 1.05);
    });
  }
  if (typeof btnSkip?.onHoverEnd === "function") {
    btnSkip.onHoverEnd(() => {
      if (isClosed) return;
      if (typeof engineOrContext.rgb === "function")
        btnSkip.color = engineOrContext.rgb(22, 50, 90);
      btnSkip.scale = createVec2(1, 1);
    });
  }
  if (typeof btnSkip?.onClick === "function") {
    btnSkip.onClick(() => {
      if (isClosed) return;
      closeAndFinish();
    });
  }

  const actionBtnY = cY + cardH / 2 - 30;

  const btnPrevPos = createVec2(cX - 120, actionBtnY);
  const prevOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(100, 200, 255))
      : undefined;

  const btnPrev = engineOrContext.add([
    engineOrContext.rect(160, 46, { radius: 9 }),
    engineOrContext.pos(-9999, -9999),
    engineOrContext.color(20, 55, 100),
    prevOutline,
    typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(554) : undefined,
  ]) as {
    hidden?: boolean;
    pos?: { x: number; y: number };
    color?: unknown;
    scale?: { x: number; y: number };
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  btnPrev.hidden = true;
  if (btnPrev && typeof btnPrev === "object") elements.push(btnPrev);

  const btnPrevText = engineOrContext.add([
    engineOrContext.text("◀ Anterior", {
      size: accessibilitySystem.scaleFont(15.5),
      font: "Outfit",
    }),
    engineOrContext.pos(-9999, -9999),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(555) : undefined,
  ]) as { hidden?: boolean; pos?: { x: number; y: number } };
  btnPrevText.hidden = true;
  if (btnPrevText && typeof btnPrevText === "object") elements.push(btnPrevText);

  if (typeof btnPrev?.onHoverUpdate === "function") {
    btnPrev.onHoverUpdate(() => {
      if (isClosed || currentSlide === 0) return;
      if (typeof engineOrContext.rgb === "function")
        btnPrev.color = engineOrContext.rgb(28, 75, 135);
      btnPrev.scale = createVec2(1.02, 1.02);
    });
  }
  if (typeof btnPrev?.onHoverEnd === "function") {
    btnPrev.onHoverEnd(() => {
      if (isClosed || currentSlide === 0) return;
      if (typeof engineOrContext.rgb === "function")
        btnPrev.color = engineOrContext.rgb(20, 55, 100);
      btnPrev.scale = createVec2(1, 1);
    });
  }

  const goPrev = () => {
    if (isClosed || currentSlide <= 0) return;
    audioSystem.playUiClick();
    goToSlide(currentSlide - 1);
  };
  if (typeof btnPrev?.onClick === "function") {
    btnPrev.onClick(goPrev);
  }

  const btnNextPos = createVec2(cX, actionBtnY);
  const nextOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(56, 189, 248))
      : undefined;

  const btnNext = engineOrContext.add([
    engineOrContext.rect(240, 46, { radius: 9 }),
    engineOrContext.pos(btnNextPos.x, btnNextPos.y),
    engineOrContext.color(24, 85, 150),
    nextOutline,
    typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(554) : undefined,
  ]) as {
    width?: number;
    pos?: { x: number; y: number };
    color?: unknown;
    outline?: { color?: unknown };
    scale?: { x: number; y: number };
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnNext && typeof btnNext === "object") elements.push(btnNext);

  const btnNextText = engineOrContext.add([
    engineOrContext.text("Próximo ▶", {
      size: accessibilitySystem.scaleFont(16),
      font: "Outfit",
    }),
    engineOrContext.pos(btnNextPos.x, btnNextPos.y),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(555) : undefined,
  ]) as { text?: string; pos?: { x: number; y: number } };
  if (btnNextText && typeof btnNextText === "object") elements.push(btnNextText);

  if (typeof btnNext?.onHoverUpdate === "function") {
    btnNext.onHoverUpdate(() => {
      if (isClosed) return;
      const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
      if (typeof engineOrContext.rgb === "function") {
        btnNext.color = isLast
          ? engineOrContext.rgb(25, 150, 95)
          : engineOrContext.rgb(32, 110, 190);
      }
      btnNext.scale = createVec2(1.02, 1.02);
    });
  }
  if (typeof btnNext?.onHoverEnd === "function") {
    btnNext.onHoverEnd(() => {
      if (isClosed) return;
      const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
      if (typeof engineOrContext.rgb === "function") {
        btnNext.color = isLast
          ? engineOrContext.rgb(18, 125, 80)
          : engineOrContext.rgb(24, 85, 150);
      }
      btnNext.scale = createVec2(1, 1);
    });
  }

  const goNext = () => {
    if (isClosed) return;
    if (currentSlide === ONBOARDING_SLIDES.length - 1) {
      closeAndFinish();
    } else {
      audioSystem.playUiClick();
      goToSlide(currentSlide + 1);
    }
  };
  if (typeof btnNext?.onClick === "function") {
    btnNext.onClick(goNext);
  }

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
      if (typeof engineOrContext.rgb === "function") {
        dotCircles[i].color = isActive
          ? engineOrContext.rgb(100, 230, 255)
          : engineOrContext.rgb(45, 90, 140);
      }
    }

    const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;

    if (currentSlide === 0) {
      btnPrev.hidden = true;
      btnPrev.pos = createVec2(-9999, -9999);
      btnPrevText.hidden = true;
      btnPrevText.pos = createVec2(-9999, -9999);

      btnNext.pos = createVec2(cX, actionBtnY);
      btnNext.width = 240;
      btnNextText.pos = createVec2(cX, actionBtnY);
    } else {
      btnPrev.hidden = false;
      btnPrev.pos = btnPrevPos;
      btnPrevText.hidden = false;
      btnPrevText.pos = btnPrevPos;

      btnNext.pos = createVec2(cX + 120, actionBtnY);
      btnNext.width = 160;
      btnNextText.pos = createVec2(cX + 120, actionBtnY);
    }

    btnNextText.text = isLast ? "Entendi! Iniciar 🌊" : "Próximo ▶";
    if (typeof engineOrContext.rgb === "function") {
      btnNext.color = isLast ? engineOrContext.rgb(18, 125, 80) : engineOrContext.rgb(24, 85, 150);
      if (btnNext.outline) {
        btnNext.outline.color = isLast
          ? engineOrContext.rgb(52, 211, 153)
          : engineOrContext.rgb(56, 189, 248);
      }
    }
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
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", keyHandler);
  }

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
      pos: createVec2(cX + 120, actionBtnY),
      width: 160,
      height: 46,
      onActivate: goNext,
    },
  ];

  focusGroup = createFocusGroup(engineOrContext, {
    items: focusItems,
    initialIndex: 2,
    ringZ: 560,
  });

  goToSlide(0);
}

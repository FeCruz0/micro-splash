import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import type { GameOptions } from "../systems/state";
import { createFocusGroup, type FocusableItem, type LegacyKeyboardNavContext } from "./keyboardNav";
import { FONT_TITLE, FONT_BODY, TEXT_SIZE_H1, TEXT_SIZE_BODY } from "../config";
import { addShadowedText } from "./textUtils";
import {
  animateModalEntrance,
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "./animationUtils";
import {
  UI_COLORS,
  UI_RADII,
  UI_Z_INDEX,
  getModalDimensions,
  staggerElementsEntrance,
  attachPulseEffect,
  type MotionTargetObject,
} from "./shared";
import type { LegacyShadowedTextContext } from "./textUtils";

export interface ShowModeSelectEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyModeSelectUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  destroy?(): void;
  onHoverUpdate(callback: () => void): unknown;
  onHoverEnd(callback: () => void): unknown;
  onClick(callback: () => void): unknown;
}

export interface LegacyModeSelectEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): LegacyModeSelectUiObject;
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
  wait(duration: number, callback: () => void): void;
  dt?(): number;
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  easings?: {
    easeOutBack?: unknown;
    easeInQuad?: unknown;
    easeOutQuad?: unknown;
    [key: string]: unknown;
  };
}

export function showModeSelectScreen(
  k: ShowModeSelectEngineContext,
  onSelectMode: (options: GameOptions) => void,
  onBack: () => void
) {
  const engine = k as unknown as LegacyModeSelectEngineContext;
  audioSystem.playUiClick();

  const elements: Array<{ destroy?: () => void } | object> = [];
  let isClosed = false;

  let canInteract = false;
  engine.wait(0.15, () => {
    canInteract = true;
  });

  const screenW = engine.width();
  const screenH = engine.height();
  const { cardW, cardH, cX, cY } = getModalDimensions(screenW, screenH, "standard");

  // Fundo escuro semitransparente
  const backdrop = engine.add([
    engine.rect(screenW, screenH),
    engine.pos(0, 0),
    engine.color(UI_COLORS.backdrop[0], UI_COLORS.backdrop[1], UI_COLORS.backdrop[2]),
    engine.opacity(UI_COLORS.backdropOpacity),
    engine.area(),
    engine.fixed(),
    engine.z(UI_Z_INDEX.backdrop),
  ]);
  elements.push(backdrop);

  // Modal Card Principal com geometria ampla expandida (Fase 34.1 e 64)
  const card = engine.add([
    engine.rect(cardW, cardH, { radius: UI_RADII.xl }),
    engine.pos(cX, cY),
    engine.color(UI_COLORS.panel[0], UI_COLORS.panel[1], UI_COLORS.panel[2]),
    engine.outline(2.5, engine.rgb(UI_COLORS.border[0], UI_COLORS.border[1], UI_COLORS.border[2])),
    engine.anchor("center"),
    engine.scale(1),
    engine.area(),
    engine.fixed(),
    engine.z(UI_Z_INDEX.modalCard),
  ]);
  elements.push(card);
  animateModalEntrance(
    engine as unknown as AnimationEngineContext,
    card as unknown as AnimationUiObject
  );

  // Título do Modal com Sombra de Legibilidade (Fase 32.3)
  const titleShadowHandle = addShadowedText(
    engine as unknown as LegacyShadowedTextContext,
    "ESCOLHA SEU ESTILO DE MIGRAÇÃO 🐋",
    {
      pos: engine.vec2(cX, cY - cardH / 2 + 32),
      size: accessibilitySystem.scaleFont(TEXT_SIZE_H1 + 2),
      font: FONT_TITLE,
      color: engine.rgb(255, 225, 100),
      shadowColor: engine.rgb(4, 12, 28),
      anchor: "center",
      z: 303,
    }
  );
  elements.push(titleShadowHandle);

  // Subtítulo descritivo
  elements.push(
    engine.add([
      engine.text("Selecione uma modalidade para navegar pelas águas profundas do Atlântico Sul", {
        size: accessibilitySystem.scaleFont(TEXT_SIZE_BODY),
        font: FONT_BODY,
      }),
      engine.pos(cX, cY - cardH / 2 + 58),
      engine.color(180, 225, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(302),
    ])
  );

  let keyHandler: ((event: KeyboardEvent) => void) | null = null;
  let quickPulseHandle: { destroy: () => void } | null = null;

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;
    if (quickPulseHandle) {
      quickPulseHandle.destroy();
      quickPulseHandle = null;
    }
    if (focusGroup) {
      focusGroup.destroy();
    }
    if (typeof window !== "undefined" && keyHandler) {
      window.removeEventListener("keydown", keyHandler);
    }
    elements.forEach((el) => {
      try {
        if ("destroy" in el && typeof el.destroy === "function") {
          el.destroy();
        } else if (typeof engine.destroy === "function") {
          engine.destroy(el);
        }
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
  const btnXPos = engine.vec2(cX + cardW / 2 - 32, cY - cardH / 2 + 32);
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

  attachButtonHoverEffect(
    engine as unknown as AnimationEngineContext,
    btnX as unknown as AnimationUiObject,
    {
      baseColor: [22, 50, 90],
      hoverColor: [180, 50, 50],
      baseScale: 1.0,
      hoverScale: 1.05,
      canInteract: () => canInteract,
    }
  );
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

  const card1 = engine.add([
    engine.rect(contentBoxW, card1H, { radius: UI_RADII.lg }),
    engine.pos(cX, card1Y),
    engine.color(UI_COLORS.panelSurface[0], UI_COLORS.panelSurface[1], UI_COLORS.panelSurface[2]),
    engine.outline(
      1.5,
      engine.rgb(
        UI_COLORS.modes.serene.accent[0],
        UI_COLORS.modes.serene.accent[1],
        UI_COLORS.modes.serene.accent[2]
      )
    ),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(302),
  ]);
  elements.push(card1);

  const icon1Pos = engine.vec2(cX - contentBoxW / 2 + 36, card1Y);
  elements.push(
    engine.add([
      engine.rect(50, 50, { radius: 10 }),
      engine.pos(icon1Pos),
      engine.color(
        UI_COLORS.modes.serene.surface[0],
        UI_COLORS.modes.serene.surface[1],
        UI_COLORS.modes.serene.surface[2]
      ),
      engine.outline(
        1.5,
        engine.rgb(
          UI_COLORS.modes.serene.accent[0],
          UI_COLORS.modes.serene.accent[1],
          UI_COLORS.modes.serene.accent[2]
        )
      ),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(303),
    ])
  );
  elements.push(
    engine.add([
      engine.text("🌸", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      engine.pos(icon1Pos),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(304),
    ])
  );

  const textStartX = cX - contentBoxW / 2 + 76;

  elements.push(
    engine.add([
      engine.text("MIGRAÇÃO SERENA (RELAXANTE & EDUCATIVA)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      engine.pos(textStartX, card1Y - 16),
      engine.color(140, 255, 200),
      engine.anchor("left"),
      engine.fixed(),
      engine.z(303),
    ])
  );

  elements.push(
    engine.add([
      engine.text(
        "Oxigênio infinito (∞) e zero risco de desmaio. Experiência contemplativa com HUD completo, fatos ambientais e identificação dos biomas.",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          width: contentBoxW - 90,
          lineSpacing: 3.5,
        }
      ),
      engine.pos(textStartX, card1Y + 12),
      engine.color(215, 245, 235),
      engine.anchor("left"),
      engine.fixed(),
      engine.z(303),
    ])
  );

  attachButtonHoverEffect(
    engine as unknown as AnimationEngineContext,
    card1 as unknown as AnimationUiObject,
    {
      baseColor: [14, 36, 72],
      hoverColor: [18, 55, 65],
      baseScale: 1.0,
      hoverScale: 1.015,
      canInteract: () => canInteract,
    }
  );

  const selectSerene = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({ mode: "serene" });
  };
  card1.onClick(selectSerene);
  focusItems.push({
    pos: engine.vec2(cX, card1Y),
    width: contentBoxW,
    height: card1H,
    onActivate: selectSerene,
  });

  // ==========================================
  // CARD 2: MIGRAÇÃO DIFÍCIL (2ª OPÇÃO)
  // ==========================================
  const card2H = 86;
  const card2Y = card1Y + card1H / 2 + 12 + card2H / 2;

  const card2 = engine.add([
    engine.rect(contentBoxW, card2H, { radius: UI_RADII.lg }),
    engine.pos(cX, card2Y),
    engine.color(UI_COLORS.panelSurface[0], UI_COLORS.panelSurface[1], UI_COLORS.panelSurface[2]),
    engine.outline(
      1.5,
      engine.rgb(
        UI_COLORS.modes.difficult.accent[0],
        UI_COLORS.modes.difficult.accent[1],
        UI_COLORS.modes.difficult.accent[2]
      )
    ),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(302),
  ]);
  elements.push(card2);

  const icon2Pos = engine.vec2(cX - contentBoxW / 2 + 36, card2Y);
  elements.push(
    engine.add([
      engine.rect(50, 50, { radius: 10 }),
      engine.pos(icon2Pos),
      engine.color(
        UI_COLORS.modes.difficult.surface[0],
        UI_COLORS.modes.difficult.surface[1],
        UI_COLORS.modes.difficult.surface[2]
      ),
      engine.outline(
        1.5,
        engine.rgb(
          UI_COLORS.modes.difficult.accent[0],
          UI_COLORS.modes.difficult.accent[1],
          UI_COLORS.modes.difficult.accent[2]
        )
      ),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(303),
    ])
  );
  elements.push(
    engine.add([
      engine.text("🌊", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      engine.pos(icon2Pos),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(304),
    ])
  );

  elements.push(
    engine.add([
      engine.text("MIGRAÇÃO DIFÍCIL (DESAFIO REALISTA)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      engine.pos(textStartX, card2Y - 16),
      engine.color(255, 120, 140),
      engine.anchor("left"),
      engine.fixed(),
      engine.z(303),
    ])
  );

  elements.push(
    engine.add([
      engine.text(
        "Travessia autêntica sem HUD, sem auxílios visuais e sem avisos em texto. Gerencie o fôlego da jubarte guiando-se apenas pelos seus sentidos marinhos.",
        {
          size: accessibilitySystem.scaleFont(14.5),
          font: "Inter",
          width: contentBoxW - 90,
          lineSpacing: 3.5,
        }
      ),
      engine.pos(textStartX, card2Y + 12),
      engine.color(255, 220, 225),
      engine.anchor("left"),
      engine.fixed(),
      engine.z(303),
    ])
  );

  attachButtonHoverEffect(
    engine as unknown as AnimationEngineContext,
    card2 as unknown as AnimationUiObject,
    {
      baseColor: [14, 36, 72],
      hoverColor: [45, 25, 45],
      baseScale: 1.0,
      hoverScale: 1.015,
      canInteract: () => canInteract,
    }
  );

  const selectDifficult = () => {
    if (!canInteract) return;
    audioSystem.playUiClick();
    destroyAll();
    onSelectMode({ mode: "standard" });
  };
  card2.onClick(selectDifficult);
  focusItems.push({
    pos: engine.vec2(cX, card2Y),
    width: contentBoxW,
    height: card2H,
    onActivate: selectDifficult,
  });

  // ==========================================
  // CARD 3: MIGRAÇÃO RÁPIDA (60 SEGUNDOS)
  // ==========================================
  let selectedBiomeIndex = 0;
  const card4H = 168;
  const card4Y = card2Y + card2H / 2 + 16 + card4H / 2;

  const card4 = engine.add([
    engine.rect(contentBoxW, card4H, { radius: UI_RADII.lg }),
    engine.pos(cX, card4Y),
    engine.color(UI_COLORS.panelSurface[0], UI_COLORS.panelSurface[1], UI_COLORS.panelSurface[2]),
    engine.outline(
      1.5,
      engine.rgb(
        UI_COLORS.modes.quick.accent[0],
        UI_COLORS.modes.quick.accent[1],
        UI_COLORS.modes.quick.accent[2]
      )
    ),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(302),
  ]);
  elements.push(card4);

  const icon4Pos = engine.vec2(cX - contentBoxW / 2 + 36, card4Y - 42);
  elements.push(
    engine.add([
      engine.rect(50, 50, { radius: 10 }),
      engine.pos(icon4Pos),
      engine.color(
        UI_COLORS.modes.quick.surface[0],
        UI_COLORS.modes.quick.surface[1],
        UI_COLORS.modes.quick.surface[2]
      ),
      engine.outline(
        1.5,
        engine.rgb(
          UI_COLORS.modes.quick.accent[0],
          UI_COLORS.modes.quick.accent[1],
          UI_COLORS.modes.quick.accent[2]
        )
      ),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(303),
    ])
  );
  elements.push(
    engine.add([
      engine.text("⚡", {
        size: accessibilitySystem.scaleFont(26),
        font: "Outfit",
      }),
      engine.pos(icon4Pos),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(304),
    ])
  );

  elements.push(
    engine.add([
      engine.text("MIGRAÇÃO RÁPIDA (TRECHO DE 60 SEGUNDOS)", {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      engine.pos(textStartX, card4Y - 56),
      engine.color(255, 190, 110),
      engine.anchor("left"),
      engine.fixed(),
      engine.z(303),
    ])
  );

  elements.push(
    engine.add([
      engine.text("Selecione o bioma de partida:", {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
      }),
      engine.pos(textStartX, card4Y - 28),
      engine.color(225, 235, 250),
      engine.anchor("left"),
      engine.fixed(),
      engine.z(303),
    ])
  );

  // Botões Seletores de Bioma
  const biomes = [
    { label: "❄️ Antártica", index: 0 },
    { label: "🚢 Costa Urbana", index: 2 },
    { label: "🏝️ Arraial do Cabo", index: 3 },
  ];

  const biomeBtns: Array<{
    btn: LegacyModeSelectUiObject;
    txt: LegacyModeSelectUiObject;
    index: number;
  }> = [];
  const biomeBtnW = 160;
  const biomeBtnH = 34;
  const biomeGap = 12;
  const totalBiomesW = biomes.length * biomeBtnW + (biomes.length - 1) * biomeGap;

  biomes.forEach((b, i) => {
    const bX = cX - totalBiomesW / 2 + biomeBtnW / 2 + i * (biomeBtnW + biomeGap);
    const bY = card4Y + 8;

    const bBtn = engine.add([
      engine.rect(biomeBtnW, biomeBtnH, { radius: 7 }),
      engine.pos(bX, bY),
      engine.color(
        selectedBiomeIndex === b.index ? engine.rgb(190, 90, 15) : engine.rgb(20, 48, 85)
      ),
      engine.outline(
        1.5,
        selectedBiomeIndex === b.index ? engine.rgb(255, 215, 120) : engine.rgb(56, 100, 155)
      ),
      engine.scale(1),
      engine.anchor("center"),
      engine.area(),
      engine.fixed(),
      engine.z(304),
    ]);
    elements.push(bBtn);

    const bTxt = engine.add([
      engine.text(b.label, {
        size: accessibilitySystem.scaleFont(14),
        font: "Outfit",
      }),
      engine.pos(bX, bY),
      engine.color(255, 255, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(305),
    ]);
    elements.push(bTxt);

    biomeBtns.push({ btn: bBtn, txt: bTxt, index: b.index });

    bBtn.onClick(() => {
      if (!canInteract) return;
      audioSystem.playUiClick();
      selectedBiomeIndex = b.index;
      biomeBtns.forEach((item) => {
        const isSel = item.index === selectedBiomeIndex;
        item.btn.color = isSel ? engine.rgb(190, 90, 15) : engine.rgb(20, 48, 85);
        if (item.btn.outline) {
          item.btn.outline.color = isSel ? engine.rgb(255, 215, 120) : engine.rgb(56, 100, 155);
        }
      });
    });

    focusItems.push({
      pos: engine.vec2(bX, bY),
      width: biomeBtnW,
      height: biomeBtnH,
      onActivate: () => {
        audioSystem.playUiClick();
        selectedBiomeIndex = b.index;
        biomeBtns.forEach((item) => {
          const isSel = item.index === selectedBiomeIndex;
          item.btn.color = isSel ? engine.rgb(190, 90, 15) : engine.rgb(20, 48, 85);
          if (item.btn.outline) {
            item.btn.outline.color = isSel ? engine.rgb(255, 215, 120) : engine.rgb(56, 100, 155);
          }
        });
      },
    });
  });

  // Botão Iniciar Trecho Rápido
  const btnStartQuickPos = engine.vec2(cX, card4Y + 52);
  const btnStartQuick = engine.add([
    engine.rect(380, 38, { radius: 8 }),
    engine.pos(btnStartQuickPos),
    engine.color(200, 95, 15),
    engine.outline(1.5, engine.rgb(255, 210, 100)),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(304),
  ]);
  elements.push(btnStartQuick);

  elements.push(
    engine.add([
      engine.text("⚡ INICIAR DESAFIO RÁPIDO (60s)", {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      engine.pos(btnStartQuickPos),
      engine.color(255, 255, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(305),
    ])
  );

  attachButtonHoverEffect(
    engine as unknown as AnimationEngineContext,
    btnStartQuick as unknown as AnimationUiObject,
    {
      baseColor: [200, 95, 15],
      hoverColor: [230, 120, 25],
      baseScale: 1.0,
      hoverScale: 1.025,
      canInteract: () => canInteract,
    }
  );
  quickPulseHandle = attachPulseEffect(engine, btnStartQuick as unknown as MotionTargetObject, {
    canInteract: () => canInteract,
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
    height: 38,
    onActivate: startQuick,
  });

  // ==========================================
  // BOTÃO VOLTAR AO MENU NA BASE
  // ==========================================
  const btnBackPos = engine.vec2(cX, cY + cardH / 2 - 34);
  const btnBack = engine.add([
    engine.rect(280, 46, { radius: 10 }),
    engine.pos(btnBackPos),
    engine.color(20, 80, 140),
    engine.outline(2, engine.rgb(56, 189, 248)),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(304),
  ]);
  elements.push(btnBack);

  elements.push(
    engine.add([
      engine.text("Voltar ao Menu ↩", {
        size: accessibilitySystem.scaleFont(16),
        font: "Outfit",
      }),
      engine.pos(btnBackPos),
      engine.color(255, 255, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(305),
    ])
  );

  btnBack.onHoverUpdate(() => {
    if (!canInteract) return;
    btnBack.color = engine.rgb(28, 110, 185);
    btnBack.scale = engine.vec2(1.02, 1.02);
  });
  btnBack.onHoverEnd(() => {
    btnBack.color = engine.rgb(20, 80, 140);
    btnBack.scale = engine.vec2(1, 1);
  });
  btnBack.onClick(close);
  focusItems.push({
    pos: btnBackPos,
    width: 280,
    height: 46,
    onActivate: close,
  });

  // Grupo de foco por teclado acessível
  const focusGroup = createFocusGroup(engine as unknown as LegacyKeyboardNavContext, {
    items: focusItems,
    initialIndex: 1, // Começa no modo clássico
    ringZ: 315,
  });

  staggerElementsEntrance(engine, [card1, card2, card4] as unknown as MotionTargetObject[], {
    staggerDelayMs: 40,
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

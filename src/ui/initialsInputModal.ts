/**
 * Modal de Inserção de Iniciais para o Ranking Arcade (Fase 26 e Fase 64) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Vector2D.
 */

import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { addLeaderboardEntry } from "../systems/leaderboard";
import type { GameMode } from "../systems/state";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface LegacyInitialsContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  destroy?(target: unknown): void;
  wait?(duration: number, callback: () => void): void;
  onKeyPress?(key: string, callback: () => void): { cancel?: () => void };
  onCharInput?(callback: (ch: string) => void): { cancel?: () => void };
}

export function showInitialsInputModal(
  engineOrContext: IRenderEngine | LegacyInitialsContext,
  score: number,
  distance: number,
  mode: GameMode,
  onSubmitted: () => void,
  weekKey?: string
): void {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  const initials = ["A", "A", "A"];
  let activeIndex = 0;

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const screenW = dimensions.width;
    const screenH = dimensions.height;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

    const cardW = Math.min(660, screenW - 24);
    const cardH = Math.min(450, screenH - 20);

    const createdNodes: Array<IGraphicsNode | ITextNode> = [];

    // Backdrop
    const backdropNode = engineOrContext.createGraphics("initials_backdrop");
    backdropNode.drawRect(0, 0, screenW, screenH, {
      fill: { color: [4, 14, 32], alpha: 0.92 },
    });
    backdropNode.setZIndex(400);
    stageRoot.addChild(backdropNode);
    createdNodes.push(backdropNode);

    // Card
    const cardNode = engineOrContext.createGraphics("initials_card");
    cardNode.drawRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 16, {
      fill: { color: [10, 32, 68], alpha: 1 },
      stroke: { width: 3, color: [255, 215, 60], alpha: 1 },
    });
    cardNode.setPosition(centerX, centerY);
    cardNode.setZIndex(401);
    stageRoot.addChild(cardNode);
    createdNodes.push(cardNode);

    // Título
    const titleNode = engineOrContext.createText(
      mode === "weekly" ? "📅 NOVO RECORDE SEMANAL!" : "🏆 NOVO RECORDE NO TOP 10!",
      {
        fontFamily: "Outfit",
        fontSize: accessibilitySystem.scaleFont(24),
        color: [255, 220, 80],
        align: "center",
      },
      "initials_title"
    );
    titleNode.setPosition(centerX, centerY - 165);
    titleNode.setZIndex(402);
    stageRoot.addChild(titleNode);
    createdNodes.push(titleNode);

    // Subtítulo
    const scoreNode = engineOrContext.createText(
      `⭐ ${score} Eco-Pontos  |  🌊 ${Math.floor(distance)}m`,
      {
        fontFamily: "Outfit",
        fontSize: accessibilitySystem.scaleFont(17.5),
        color: [160, 240, 255],
        align: "center",
      },
      "initials_score"
    );
    scoreNode.setPosition(centerX, centerY - 124);
    scoreNode.setZIndex(402);
    stageRoot.addChild(scoreNode);
    createdNodes.push(scoreNode);

    const promptNode = engineOrContext.createText(
      "Insira 3 letras para registrar seu nome no ranking arcade:",
      {
        fontFamily: "Inter",
        fontSize: accessibilitySystem.scaleFont(15),
        color: [210, 230, 255],
        align: "center",
      },
      "initials_prompt"
    );
    promptNode.setPosition(centerX, centerY - 88);
    promptNode.setZIndex(402);
    stageRoot.addChild(promptNode);
    createdNodes.push(promptNode);

    // Slots
    const slotSpacing = 100;
    const startX = centerX - slotSpacing;
    const slotY = centerY + 12;

    const slotBoxes: IGraphicsNode[] = [];
    const slotTexts: ITextNode[] = [];

    const updateSlots = () => {
      for (let i = 0; i < 3; i++) {
        slotTexts[i].setText(initials[i]);
        const isCurrent = i === activeIndex;
        slotBoxes[i].clear();
        slotBoxes[i].drawRoundedRect(-39, -33, 78, 66, 10, {
          fill: { color: isCurrent ? [25, 80, 150] : [14, 45, 90], alpha: 1 },
          stroke: {
            width: isCurrent ? 3 : 1.5,
            color: isCurrent ? [100, 250, 255] : [80, 140, 200],
            alpha: 1,
          },
        });
      }
    };

    const cycleChar = (index: number, direction: number) => {
      audioSystem.playUiClick();
      const curChar = initials[index];
      let charIdx = chars.indexOf(curChar);
      if (charIdx === -1) charIdx = 0;
      charIdx = (charIdx + direction + chars.length) % chars.length;
      initials[index] = chars[charIdx];
      updateSlots();
    };

    for (let i = 0; i < 3; i++) {
      const slotX = startX + i * slotSpacing;

      // Seta ▲
      const btnUp = engineOrContext.createGraphics(`slot_up_${i}`);
      btnUp.drawRoundedRect(-30, -17, 60, 34, 7, {
        fill: { color: [20, 60, 110], alpha: 1 },
        stroke: { width: 1.5, color: [120, 200, 255], alpha: 1 },
      });
      btnUp.setPosition(slotX, slotY - 56);
      btnUp.setZIndex(403);
      stageRoot.addChild(btnUp);
      createdNodes.push(btnUp);

      const txtUp = engineOrContext.createText(
        "▲",
        {
          fontFamily: "Outfit",
          fontSize: accessibilitySystem.scaleFont(18),
          color: [255, 255, 255],
          align: "center",
        },
        `slot_up_txt_${i}`
      );
      txtUp.setPosition(slotX, slotY - 56);
      txtUp.setZIndex(404);
      stageRoot.addChild(txtUp);
      createdNodes.push(txtUp);

      const nativeUp = btnUp.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (ev: string, cb: () => void) => void;
      }>();
      if (nativeUp && typeof nativeUp.on === "function") {
        nativeUp.interactive = true;
        nativeUp.cursor = "pointer";
        nativeUp.on("pointertap", () => {
          activeIndex = i;
          cycleChar(i, 1);
        });
      }

      // Caixa da letra
      const box = engineOrContext.createGraphics(`slot_box_${i}`);
      box.setPosition(slotX, slotY);
      box.setZIndex(402);
      stageRoot.addChild(box);
      slotBoxes.push(box);
      createdNodes.push(box);

      const letter = engineOrContext.createText(
        initials[i],
        {
          fontFamily: "Outfit",
          fontSize: accessibilitySystem.scaleFont(36),
          color: [255, 255, 255],
          align: "center",
        },
        `slot_letter_${i}`
      );
      letter.setPosition(slotX, slotY);
      letter.setZIndex(403);
      stageRoot.addChild(letter);
      slotTexts.push(letter);
      createdNodes.push(letter);

      const nativeBox = box.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (ev: string, cb: () => void) => void;
      }>();
      if (nativeBox && typeof nativeBox.on === "function") {
        nativeBox.interactive = true;
        nativeBox.cursor = "pointer";
        nativeBox.on("pointertap", () => {
          activeIndex = i;
          updateSlots();
          audioSystem.playUiClick();
        });
      }

      // Seta ▼
      const btnDown = engineOrContext.createGraphics(`slot_down_${i}`);
      btnDown.drawRoundedRect(-30, -17, 60, 34, 7, {
        fill: { color: [20, 60, 110], alpha: 1 },
        stroke: { width: 1.5, color: [120, 200, 255], alpha: 1 },
      });
      btnDown.setPosition(slotX, slotY + 56);
      btnDown.setZIndex(403);
      stageRoot.addChild(btnDown);
      createdNodes.push(btnDown);

      const txtDown = engineOrContext.createText(
        "▼",
        {
          fontFamily: "Outfit",
          fontSize: accessibilitySystem.scaleFont(18),
          color: [255, 255, 255],
          align: "center",
        },
        `slot_down_txt_${i}`
      );
      txtDown.setPosition(slotX, slotY + 56);
      txtDown.setZIndex(404);
      stageRoot.addChild(txtDown);
      createdNodes.push(txtDown);

      const nativeDown = btnDown.getNativeNode<{
        interactive?: boolean;
        cursor?: string;
        on?: (ev: string, cb: () => void) => void;
      }>();
      if (nativeDown && typeof nativeDown.on === "function") {
        nativeDown.interactive = true;
        nativeDown.cursor = "pointer";
        nativeDown.on("pointertap", () => {
          activeIndex = i;
          cycleChar(i, -1);
        });
      }
    }

    updateSlots();

    // Botão Confirmar
    const btnSubmit = engineOrContext.createGraphics("initials_submit_btn");
    const drawSubmit = (isHover: boolean) => {
      btnSubmit.clear();
      btnSubmit.drawRoundedRect(-200, -26, 400, 52, 10, {
        fill: { color: isHover ? [35, 175, 110] : [25, 145, 90], alpha: 1 },
        stroke: { width: 2, color: [120, 255, 180], alpha: 1 },
      });
    };
    drawSubmit(false);
    btnSubmit.setPosition(centerX, centerY + 150);
    btnSubmit.setZIndex(403);
    stageRoot.addChild(btnSubmit);
    createdNodes.push(btnSubmit);

    const txtSubmit = engineOrContext.createText(
      "💾 SALVAR NO RANKING (ENTER)",
      {
        fontFamily: "Outfit",
        fontSize: accessibilitySystem.scaleFont(16.5),
        color: [255, 255, 255],
        align: "center",
      },
      "initials_submit_txt"
    );
    txtSubmit.setPosition(centerX, centerY + 150);
    txtSubmit.setZIndex(404);
    stageRoot.addChild(txtSubmit);
    createdNodes.push(txtSubmit);

    let submitted = false;

    let cleanupKeys: (() => void) | null = null;

    const doSubmit = () => {
      if (submitted) return;
      submitted = true;
      if (cleanupKeys) cleanupKeys();
      audioSystem.playUiClick();

      const tag = initials.join("");
      addLeaderboardEntry({
        initials: tag,
        score,
        distance,
        mode,
        date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        weekKey,
      });

      createdNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });

      setTimeout(onSubmitted, 100);
    };

    const nativeSubmit = btnSubmit.getNativeNode<{
      interactive?: boolean;
      cursor?: string;
      on?: (ev: string, cb: () => void) => void;
    }>();
    if (nativeSubmit && typeof nativeSubmit.on === "function") {
      nativeSubmit.interactive = true;
      nativeSubmit.cursor = "pointer";
      nativeSubmit.on("pointerover", () => drawSubmit(true));
      nativeSubmit.on("pointerout", () => drawSubmit(false));
      nativeSubmit.on("pointertap", doSubmit);
    }

    if (typeof window !== "undefined") {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (submitted) return;
        if (event.key === "Enter") {
          event.preventDefault();
          doSubmit();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          cycleChar(activeIndex, 1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          cycleChar(activeIndex, -1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          activeIndex = (activeIndex - 1 + 3) % 3;
          updateSlots();
          audioSystem.playUiClick();
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          activeIndex = (activeIndex + 1) % 3;
          updateSlots();
          audioSystem.playUiClick();
        } else if (event.key === "Backspace") {
          event.preventDefault();
          initials[activeIndex] = "A";
          activeIndex = Math.max(0, activeIndex - 1);
          updateSlots();
          audioSystem.playUiClick();
        } else if (event.key.length === 1) {
          const upper = event.key.toUpperCase();
          if (chars.includes(upper)) {
            event.preventDefault();
            initials[activeIndex] = upper;
            activeIndex = Math.min(2, activeIndex + 1);
            updateSlots();
            audioSystem.playUiClick();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      cleanupKeys = () => window.removeEventListener("keydown", handleKeyDown);
    }

    return;
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyInitialsContext;
  const elements: unknown[] = [];

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const screenW = legacyContext.width();
  const screenH = legacyContext.height();

  elements.push(
    legacyContext.add([
      typeof legacyContext.rect === "function" ? legacyContext.rect(screenW, screenH) : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(0, 0) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(4, 14, 32) : undefined,
      typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.92) : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(400) : undefined,
    ])
  );

  const cardW = Math.min(660, screenW - 24);
  const cardH = Math.min(450, screenH - 20);
  const centerX = screenW / 2;
  const centerY = screenH / 2;

  elements.push(
    legacyContext.add([
      typeof legacyContext.rect === "function"
        ? legacyContext.rect(cardW, cardH, { radius: 16 })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(centerX, centerY) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(10, 32, 68) : undefined,
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(3, resolveRgb(255, 215, 60))
        : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(401) : undefined,
    ])
  );

  elements.push(
    legacyContext.add([
      typeof legacyContext.text === "function"
        ? legacyContext.text(
            mode === "weekly" ? "📅 NOVO RECORDE SEMANAL!" : "🏆 NOVO RECORDE NO TOP 10!",
            {
              size: accessibilitySystem.scaleFont(24),
              font: "Outfit",
            }
          )
        : undefined,
      typeof legacyContext.pos === "function"
        ? legacyContext.pos(centerX, centerY - 165)
        : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(255, 220, 80) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(402) : undefined,
    ])
  );

  elements.push(
    legacyContext.add([
      typeof legacyContext.text === "function"
        ? legacyContext.text(`⭐ ${score} Eco-Pontos  |  🌊 ${Math.floor(distance)}m`, {
            size: accessibilitySystem.scaleFont(17.5),
            font: "Outfit",
          })
        : undefined,
      typeof legacyContext.pos === "function"
        ? legacyContext.pos(centerX, centerY - 124)
        : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(160, 240, 255) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(402) : undefined,
    ])
  );

  elements.push(
    legacyContext.add([
      typeof legacyContext.text === "function"
        ? legacyContext.text("Insira 3 letras para registrar seu nome no ranking arcade:", {
            size: accessibilitySystem.scaleFont(15),
            font: "Inter",
          })
        : undefined,
      typeof legacyContext.pos === "function"
        ? legacyContext.pos(centerX, centerY - 88)
        : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(210, 230, 255) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(402) : undefined,
    ])
  );

  const slotSpacing = 100;
  const startX = centerX - slotSpacing;
  const slotY = centerY + 12;

  const slotBoxes: Array<{ color?: unknown; outline?: unknown }> = [];
  const slotTexts: Array<{ text?: string }> = [];

  const updateSlots = () => {
    for (let i = 0; i < 3; i++) {
      slotTexts[i].text = initials[i];
      if (i === activeIndex) {
        slotBoxes[i].color = resolveRgb(25, 80, 150);
        slotBoxes[i].outline = { width: 3, color: resolveRgb(100, 250, 255) };
      } else {
        slotBoxes[i].color = resolveRgb(14, 45, 90);
        slotBoxes[i].outline = { width: 1.5, color: resolveRgb(80, 140, 200) };
      }
    }
  };

  const cycleChar = (index: number, direction: number) => {
    audioSystem.playUiClick();
    const curChar = initials[index];
    let charIdx = chars.indexOf(curChar);
    if (charIdx === -1) charIdx = 0;
    charIdx = (charIdx + direction + chars.length) % chars.length;
    initials[index] = chars[charIdx];
    updateSlots();
  };

  for (let i = 0; i < 3; i++) {
    const slotX = startX + i * slotSpacing;

    const btnUp = legacyContext.add([
      typeof legacyContext.rect === "function"
        ? legacyContext.rect(60, 34, { radius: 7 })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(slotX, slotY - 56) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(20, 60, 110) : undefined,
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(1.5, resolveRgb(120, 200, 255))
        : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(403) : undefined,
    ]) as { onClick?(cb: () => void): void };
    elements.push(btnUp);

    elements.push(
      legacyContext.add([
        typeof legacyContext.text === "function"
          ? legacyContext.text("▲", {
              size: accessibilitySystem.scaleFont(18),
              font: "Outfit",
            })
          : undefined,
        typeof legacyContext.pos === "function" ? legacyContext.pos(slotX, slotY - 56) : undefined,
        typeof legacyContext.color === "function" ? legacyContext.color(255, 255, 255) : undefined,
        typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(404) : undefined,
      ])
    );

    if (typeof btnUp.onClick === "function") {
      btnUp.onClick(() => {
        activeIndex = i;
        cycleChar(i, 1);
      });
    }

    const box = legacyContext.add([
      typeof legacyContext.rect === "function"
        ? legacyContext.rect(78, 66, { radius: 10 })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(slotX, slotY) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(14, 45, 90) : undefined,
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(2, resolveRgb(80, 140, 200))
        : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(402) : undefined,
    ]) as { color?: unknown; outline?: unknown; onClick?(cb: () => void): void };
    slotBoxes.push(box);
    elements.push(box);

    if (typeof box.onClick === "function") {
      box.onClick(() => {
        activeIndex = i;
        updateSlots();
        audioSystem.playUiClick();
      });
    }

    const letter = legacyContext.add([
      typeof legacyContext.text === "function"
        ? legacyContext.text(initials[i], {
            size: accessibilitySystem.scaleFont(36),
            font: "Outfit",
          })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(slotX, slotY) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(255, 255, 255) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(403) : undefined,
    ]) as { text?: string };
    slotTexts.push(letter);
    elements.push(letter);

    const btnDown = legacyContext.add([
      typeof legacyContext.rect === "function"
        ? legacyContext.rect(60, 34, { radius: 7 })
        : undefined,
      typeof legacyContext.pos === "function" ? legacyContext.pos(slotX, slotY + 56) : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(20, 60, 110) : undefined,
      typeof legacyContext.outline === "function"
        ? legacyContext.outline(1.5, resolveRgb(120, 200, 255))
        : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(403) : undefined,
    ]) as { onClick?(cb: () => void): void };
    elements.push(btnDown);

    elements.push(
      legacyContext.add([
        typeof legacyContext.text === "function"
          ? legacyContext.text("▼", {
              size: accessibilitySystem.scaleFont(18),
              font: "Outfit",
            })
          : undefined,
        typeof legacyContext.pos === "function" ? legacyContext.pos(slotX, slotY + 56) : undefined,
        typeof legacyContext.color === "function" ? legacyContext.color(255, 255, 255) : undefined,
        typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
        typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
        typeof legacyContext.z === "function" ? legacyContext.z(404) : undefined,
      ])
    );

    if (typeof btnDown.onClick === "function") {
      btnDown.onClick(() => {
        activeIndex = i;
        cycleChar(i, -1);
      });
    }
  }

  updateSlots();

  const btnSubmit = legacyContext.add([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(400, 52, { radius: 10 })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(centerX, centerY + 150) : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(25, 145, 90) : undefined,
    typeof legacyContext.outline === "function"
      ? legacyContext.outline(2, resolveRgb(120, 255, 180))
      : undefined,
    typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(403) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  elements.push(btnSubmit);

  elements.push(
    legacyContext.add([
      typeof legacyContext.text === "function"
        ? legacyContext.text("💾 SALVAR NO RANKING (ENTER)", {
            size: accessibilitySystem.scaleFont(16.5),
            font: "Outfit",
          })
        : undefined,
      typeof legacyContext.pos === "function"
        ? legacyContext.pos(centerX, centerY + 150)
        : undefined,
      typeof legacyContext.color === "function" ? legacyContext.color(255, 255, 255) : undefined,
      typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
      typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
      typeof legacyContext.z === "function" ? legacyContext.z(404) : undefined,
    ])
  );

  if (typeof btnSubmit.onHoverUpdate === "function") {
    btnSubmit.onHoverUpdate(() => {
      btnSubmit.color = resolveRgb(35, 175, 110);
    });
  }
  if (typeof btnSubmit.onHoverEnd === "function") {
    btnSubmit.onHoverEnd(() => {
      btnSubmit.color = resolveRgb(25, 145, 90);
    });
  }

  let submitted = false;
  let cleanUpKeyHandlers: (() => void) | null = null;

  const doSubmit = () => {
    if (submitted) return;
    submitted = true;
    if (cleanUpKeyHandlers) cleanUpKeyHandlers();
    audioSystem.playUiClick();

    const tag = initials.join("");
    addLeaderboardEntry({
      initials: tag,
      score,
      distance,
      mode,
      date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      weekKey,
    });

    elements.forEach((el) => {
      try {
        if (typeof legacyContext.destroy === "function") {
          legacyContext.destroy(el);
        }
      } catch {}
    });

    const waitFunc =
      typeof legacyContext.wait === "function"
        ? legacyContext.wait
        : (sec: number, cb: () => void) => setTimeout(cb, sec * 1000);

    waitFunc(0.1, () => {
      onSubmitted();
    });
  };

  if (typeof btnSubmit.onClick === "function") {
    btnSubmit.onClick(doSubmit);
  }

  const keyHandlers: Array<{ cancel?: () => void }> = [];

  if (typeof legacyContext.onKeyPress === "function") {
    const enterH = legacyContext.onKeyPress("enter", doSubmit);
    if (enterH) keyHandlers.push(enterH);

    const upH = legacyContext.onKeyPress("up", () => cycleChar(activeIndex, 1));
    if (upH) keyHandlers.push(upH);

    const downH = legacyContext.onKeyPress("down", () => cycleChar(activeIndex, -1));
    if (downH) keyHandlers.push(downH);

    const leftH = legacyContext.onKeyPress("left", () => {
      activeIndex = (activeIndex - 1 + 3) % 3;
      updateSlots();
      audioSystem.playUiClick();
    });
    if (leftH) keyHandlers.push(leftH);

    const rightH = legacyContext.onKeyPress("right", () => {
      activeIndex = (activeIndex + 1) % 3;
      updateSlots();
      audioSystem.playUiClick();
    });
    if (rightH) keyHandlers.push(rightH);

    const backH = legacyContext.onKeyPress("backspace", () => {
      initials[activeIndex] = "A";
      activeIndex = Math.max(0, activeIndex - 1);
      updateSlots();
      audioSystem.playUiClick();
    });
    if (backH) keyHandlers.push(backH);
  }

  if (typeof legacyContext.onCharInput === "function") {
    const charH = legacyContext.onCharInput((ch: string) => {
      const upper = ch.toUpperCase();
      if (chars.includes(upper)) {
        initials[activeIndex] = upper;
        activeIndex = Math.min(2, activeIndex + 1);
        updateSlots();
        audioSystem.playUiClick();
      }
    });
    if (charH) keyHandlers.push(charH);
  }

  cleanUpKeyHandlers = () => {
    keyHandlers.forEach((h) => {
      if (h && typeof h.cancel === "function") h.cancel();
    });
  };
}

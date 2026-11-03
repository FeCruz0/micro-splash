/**
 * Modal de Estatísticas Acumuladas & Impacto Ecológico (Fase 25 / WBS 2.18) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte nativo a IRenderEngine (PixiJS v8)
 * e compatibilidade reversa para contextos legados sem nenhum uso de "any".
 */

import {
  getCumulativeStats,
  formatDistanceKm,
  formatPlayTime,
  formatSuccessRate,
} from "../systems/cumulativeStats";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { telemetrySystem } from "../systems/telemetrySystem";
import { createFocusGroup, type FocusableItem, type FocusGroup } from "./keyboardNav";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
  Vector2D,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface LegacyStatsModalContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  pos(position: Vector2D | { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  outline?(width: number, color: unknown): unknown;
  opacity?(alpha: number): unknown;
  anchor?(anchorPoint: "center"): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  area?(): unknown;
  scale?(factor: number): unknown;
  text(content: string, options?: unknown): unknown;
  destroy?(target: unknown): void;
  wait?(duration: number, callback: () => void): void;
  vec2?(x: number, y: number): { x: number; y: number };
  onKeyPress?(
    key: "tab" | "down" | "right" | "up" | "left" | "enter" | "space" | "escape",
    callback: () => void
  ): { cancel: () => void };
  isKeyDown?(key: "shift"): boolean;
}

export function showStatsModal(
  engineOrContext: IRenderEngine | LegacyStatsModalContext,
  onClose: () => void
): void {
  audioSystem.playUiClick();

  let isClosed = false;
  let canInteract = false;

  const stats = getCumulativeStats();
  const successRate = formatSuccessRate(
    stats.totalMigrationsCompleted,
    stats.totalMigrationsAttempted
  );
  const totalBiomassTons = (stats.totalKrillCollected * 1.5).toFixed(1);

  const metricCards = [
    {
      icon: "🐋",
      title: "MIGRAÇÕES CONCLUÍDAS",
      mainVal: `${stats.totalMigrationsCompleted} / ${stats.totalMigrationsAttempted}`,
      subVal: `Taxa de Sucesso: ${successRate}`,
      color: [100, 240, 255] as [number, number, number],
    },
    {
      icon: "🌊",
      title: "DISTÂNCIA NAVEGADA",
      mainVal: formatDistanceKm(stats.totalDistanceMeters),
      subVal: "Oceano Antártico até Arraial",
      color: [120, 255, 210] as [number, number, number],
    },
    {
      icon: "🦐",
      title: "KRILL & BIOMASSA",
      mainVal: `${stats.totalKrillCollected} Cardumes`,
      subVal: `~${totalBiomassTons} t de biomassa ecológica`,
      color: [255, 215, 80] as [number, number, number],
    },
    {
      icon: "🛡️",
      title: "RESÍDUOS ENFRENTADOS",
      mainVal: `${stats.totalTrashAvoided} Detritos`,
      subVal: "Redes fantasmas e plásticos",
      color: [255, 140, 120] as [number, number, number],
    },
    {
      icon: "⏱️",
      title: "TEMPO EM ALTO MAR",
      mainVal: formatPlayTime(stats.totalPlayTimeSeconds),
      subVal: "Exploração e conscientização",
      color: [195, 195, 255] as [number, number, number],
    },
    {
      icon: "🎓",
      title: "QUIZ & CONSCIENTIZAÇÃO",
      mainVal: `${stats.quizCorrectAnswers} Acertos`,
      subVal: `Impacto: ${telemetrySystem.calculateEducationalImpactScore()} pts (${stats.quizzesTaken} quizzes)`,
      color: [140, 255, 180] as [number, number, number],
    },
  ];

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
    let keyHandler: ((e: KeyboardEvent) => void) | null = null;

    setTimeout(() => {
      canInteract = true;
    }, 120);

    const close = () => {
      if (isClosed) return;
      isClosed = true;
      audioSystem.playUiClick();
      if (focusGroup) {
        focusGroup.destroy();
        focusGroup = null;
      }
      if (typeof window !== "undefined" && keyHandler) {
        window.removeEventListener("keydown", keyHandler);
      }
      createdNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      createdNodes.length = 0;
      onClose();
    };

    // Backdrop
    const backdrop = engineOrContext.createGraphics("stats-backdrop");
    backdrop.drawRect(0, 0, screenW, screenH, {
      fill: { color: [4, 12, 28], alpha: 0.94 },
    });
    backdrop.setZIndex(290);
    stageRoot.addChild(backdrop);
    createdNodes.push(backdrop);

    // Card principal
    const card = engineOrContext.createGraphics("stats-card");
    card.drawRoundedRect(cX - cardW / 2, cY - cardH / 2, cardW, cardH, 16, {
      fill: { color: [10, 28, 56], alpha: 1 },
      stroke: { color: [56, 189, 248], width: 2.5 },
    });
    card.setZIndex(291);
    stageRoot.addChild(card);
    createdNodes.push(card);

    // Botão Fechar [✕]
    const btnXPos: Vector2D = { x: cX + cardW / 2 - 32, y: cY - cardH / 2 + 32 };
    const btnX = engineOrContext.createGraphics("stats-btn-x");
    const drawBtnX = (hovered: boolean) => {
      btnX.clear();
      btnX.drawRoundedRect(btnXPos.x - 19, btnXPos.y - 19, 38, 38, 8, {
        fill: { color: hovered ? [35, 75, 130] : [22, 50, 90], alpha: 1 },
        stroke: { color: [100, 200, 255], width: 1 },
      });
    };
    drawBtnX(false);
    btnX.setZIndex(293);
    stageRoot.addChild(btnX);
    createdNodes.push(btnX);

    const xLabel = engineOrContext.createText(
      "✕",
      {
        fontSize: accessibilitySystem.scaleFont(20),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "stats-x-label"
    );
    xLabel.setPosition(btnXPos.x, btnXPos.y);
    xLabel.setAlign("center");
    const nativeXLabel = xLabel.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeXLabel?.anchor?.set) nativeXLabel.anchor.set(0.5, 0.5);
    xLabel.setZIndex(294);
    stageRoot.addChild(xLabel);
    createdNodes.push(xLabel);

    const nativeBtnX = btnX.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeBtnX?.on) {
      nativeBtnX.eventMode = "static";
      nativeBtnX.cursor = "pointer";
      nativeBtnX.on("pointerover", () => drawBtnX(true));
      nativeBtnX.on("pointerout", () => drawBtnX(false));
      nativeBtnX.on("pointerdown", () => {
        if (canInteract) close();
      });
    }

    // Título Principal
    const title = engineOrContext.createText(
      "📊 IMPACTO ECOLÓGICO COLETIVO",
      {
        fontSize: accessibilitySystem.scaleFont(28),
        fontFamily: "Outfit",
        color: [255, 230, 100],
        align: "center",
      },
      "stats-title"
    );
    title.setPosition(cX, cY - cardH / 2 + 40);
    title.setAlign("center");
    const nativeTitle = title.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeTitle?.anchor?.set) nativeTitle.anchor.set(0.5, 0.5);
    title.setZIndex(292);
    stageRoot.addChild(title);
    createdNodes.push(title);

    // Subtítulo
    const subtitle = engineOrContext.createText(
      "Métricas agregadas de todas as migrações oceânicas realizadas",
      {
        fontSize: accessibilitySystem.scaleFont(16),
        fontFamily: "Inter",
        color: [190, 230, 255],
        align: "center",
      },
      "stats-subtitle"
    );
    subtitle.setPosition(cX, cY - cardH / 2 + 74);
    subtitle.setAlign("center");
    const nativeSub = subtitle.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeSub?.anchor?.set) nativeSub.anchor.set(0.5, 0.5);
    subtitle.setZIndex(292);
    stageRoot.addChild(subtitle);
    createdNodes.push(subtitle);

    // Linha divisória
    const divider = engineOrContext.createGraphics("stats-divider");
    divider.drawRoundedRect(cX - (cardW - 60) / 2, cY - cardH / 2 + 97, cardW - 60, 2, 1, {
      fill: { color: [35, 80, 140], alpha: 1 },
    });
    divider.setZIndex(292);
    stageRoot.addChild(divider);
    createdNodes.push(divider);

    // 6 Cards de métricas
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

      const metricBox = engineOrContext.createGraphics(`stats-metric-box-${index}`);
      const drawBox = (hovered: boolean) => {
        metricBox.clear();
        metricBox.drawRoundedRect(posX - boxW / 2, posY - boxH / 2, boxW, boxH, 12, {
          fill: { color: hovered ? [18, 44, 88] : [14, 34, 68], alpha: 1 },
          stroke: { color: hovered ? [80, 200, 255] : [35, 75, 130], width: 1.5 },
        });
      };
      drawBox(false);
      metricBox.setZIndex(293);
      stageRoot.addChild(metricBox);
      createdNodes.push(metricBox);

      const nativeBox = metricBox.getNativeNode<{
        eventMode?: string;
        on?(evt: string, fn: () => void): void;
      }>();
      if (nativeBox?.on) {
        nativeBox.eventMode = "static";
        nativeBox.on("pointerover", () => drawBox(true));
        nativeBox.on("pointerout", () => drawBox(false));
      }

      // Ícone
      const iconPillX = posX - boxW / 2 + 36;
      const iconPill = engineOrContext.createGraphics(`stats-icon-pill-${index}`);
      iconPill.drawRoundedRect(iconPillX - 27, posY - 27, 54, 54, 10, {
        fill: { color: [18, 48, 92], alpha: 1 },
        stroke: { color: [56, 189, 248], width: 1 },
      });
      iconPill.setZIndex(294);
      stageRoot.addChild(iconPill);
      createdNodes.push(iconPill);

      const iconText = engineOrContext.createText(
        item.icon,
        {
          fontSize: accessibilitySystem.scaleFont(26),
          fontFamily: "Inter",
          align: "center",
        },
        `stats-icon-text-${index}`
      );
      iconText.setPosition(iconPillX, posY);
      iconText.setAlign("center");
      const nativeIconText = iconText.getNativeNode<{
        anchor?: { set(x: number, y: number): void };
      }>();
      if (nativeIconText?.anchor?.set) nativeIconText.anchor.set(0.5, 0.5);
      iconText.setZIndex(295);
      stageRoot.addChild(iconText);
      createdNodes.push(iconText);

      // Coluna de textos
      const textStartX = posX - boxW / 2 + 76;

      const titleNode = engineOrContext.createText(
        item.title,
        {
          fontSize: accessibilitySystem.scaleFont(14.5),
          fontFamily: "Inter",
          color: [190, 225, 255],
          align: "left",
        },
        `stats-card-title-${index}`
      );
      titleNode.setPosition(textStartX, posY - 29);
      titleNode.setZIndex(294);
      stageRoot.addChild(titleNode);
      createdNodes.push(titleNode);

      const mainValNode = engineOrContext.createText(
        item.mainVal,
        {
          fontSize: accessibilitySystem.scaleFont(27),
          fontFamily: "Outfit",
          color: item.color,
          align: "left",
        },
        `stats-card-val-${index}`
      );
      mainValNode.setPosition(textStartX, posY - 10);
      mainValNode.setZIndex(294);
      stageRoot.addChild(mainValNode);
      createdNodes.push(mainValNode);

      const subValNode = engineOrContext.createText(
        item.subVal,
        {
          fontSize: accessibilitySystem.scaleFont(14),
          fontFamily: "Inter",
          color: [195, 225, 250],
          align: "left",
        },
        `stats-card-sub-${index}`
      );
      subValNode.setPosition(textStartX, posY + 22);
      subValNode.setZIndex(294);
      stageRoot.addChild(subValNode);
      createdNodes.push(subValNode);
    });

    // Rodapé
    const footer = engineOrContext.createText(
      "🌱 Cada jornada no oceano reforça a preservação marinha e a proteção das baleias-jubarte.",
      {
        fontSize: accessibilitySystem.scaleFont(14.5),
        fontFamily: "Inter",
        color: [150, 220, 245],
        align: "center",
      },
      "stats-footer"
    );
    footer.setPosition(cX, cY + cardH / 2 - 96);
    footer.setAlign("center");
    const nativeFooter = footer.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeFooter?.anchor?.set) nativeFooter.anchor.set(0.5, 0.5);
    footer.setZIndex(293);
    stageRoot.addChild(footer);
    createdNodes.push(footer);

    // Botão Voltar ao Menu
    const btnClosePos: Vector2D = { x: cX, y: cY + cardH / 2 - 46 };
    const btnClose = engineOrContext.createGraphics("stats-btn-back");
    const drawBackBtn = (hovered: boolean) => {
      btnClose.clear();
      btnClose.drawRoundedRect(btnClosePos.x - 150, btnClosePos.y - 25, 300, 50, 10, {
        fill: { color: hovered ? [35, 115, 200] : [24, 85, 150], alpha: 1 },
        stroke: { color: [56, 189, 248], width: 2 },
      });
    };
    drawBackBtn(false);
    btnClose.setZIndex(294);
    stageRoot.addChild(btnClose);
    createdNodes.push(btnClose);

    const btnText = engineOrContext.createText(
      "VOLTAR AO MENU ↩",
      {
        fontSize: accessibilitySystem.scaleFont(16.5),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "stats-btn-back-text"
    );
    btnText.setPosition(btnClosePos.x, btnClosePos.y);
    btnText.setAlign("center");
    const nativeBtnText = btnText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeBtnText?.anchor?.set) nativeBtnText.anchor.set(0.5, 0.5);
    btnText.setZIndex(295);
    stageRoot.addChild(btnText);
    createdNodes.push(btnText);

    const nativeCloseBtn = btnClose.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeCloseBtn?.on) {
      nativeCloseBtn.eventMode = "static";
      nativeCloseBtn.cursor = "pointer";
      nativeCloseBtn.on("pointerover", () => drawBackBtn(true));
      nativeCloseBtn.on("pointerout", () => drawBackBtn(false));
      nativeCloseBtn.on("pointerdown", () => {
        if (canInteract) close();
      });
    }

    const focusItems: FocusableItem[] = [
      {
        pos: btnXPos,
        width: 38,
        height: 38,
        onActivate: () => {
          if (canInteract) close();
        },
      },
      {
        pos: btnClosePos,
        width: 300,
        height: 50,
        onActivate: () => {
          if (canInteract) close();
        },
      },
    ];

    focusGroup = createFocusGroup(engineOrContext, {
      items: focusItems,
      initialIndex: 1,
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

    return;
  }

  // --- MODO LEGADO (COMPATIBILIDADE REVERSA) ---
  const elements: Array<{ destroy?: () => void } | object> = [];

  if (typeof engineOrContext.wait === "function") {
    engineOrContext.wait(0.12, () => {
      canInteract = true;
    });
  } else {
    canInteract = true;
  }

  const screenW = engineOrContext.width();
  const screenH = engineOrContext.height();
  const cardW = Math.min(1000, screenW - 24);
  const cardH = Math.min(660, screenH - 20);
  const cX = screenW / 2;
  const cY = screenH / 2;

  const createVec2 = (x: number, y: number): { x: number; y: number } => {
    return typeof engineOrContext.vec2 === "function" ? engineOrContext.vec2(x, y) : { x, y };
  };

  const backdrop = engineOrContext.add([
    engineOrContext.rect(screenW, screenH),
    engineOrContext.pos(0, 0),
    engineOrContext.color(4, 12, 28),
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.94) : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(290) : undefined,
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
    typeof engineOrContext.z === "function" ? engineOrContext.z(291) : undefined,
  ]);
  if (card && typeof card === "object") elements.push(card);

  const btnXPos = createVec2(cX + cardW / 2 - 32, cY - cardH / 2 + 32);
  const xOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1, engineOrContext.rgb(100, 200, 255))
      : undefined;

  const btnX = engineOrContext.add([
    engineOrContext.rect(38, 38, { radius: 8 }),
    engineOrContext.pos(btnXPos.x, btnXPos.y),
    engineOrContext.color(22, 50, 90),
    xOutline,
    typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(293) : undefined,
  ]) as {
    color?: unknown;
    scale?: { x: number; y: number };
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnX && typeof btnX === "object") elements.push(btnX);

  const xLabel = engineOrContext.add([
    engineOrContext.text("✕", { size: accessibilitySystem.scaleFont(20), font: "Outfit" }),
    engineOrContext.pos(btnXPos.x, btnXPos.y),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(294) : undefined,
  ]);
  if (xLabel && typeof xLabel === "object") elements.push(xLabel);

  const titleNode = engineOrContext.add([
    engineOrContext.text("📊 IMPACTO ECOLÓGICO COLETIVO", {
      size: accessibilitySystem.scaleFont(28),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 40),
    engineOrContext.color(255, 230, 100),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(292) : undefined,
  ]);
  if (titleNode && typeof titleNode === "object") elements.push(titleNode);

  const subtitleNode = engineOrContext.add([
    engineOrContext.text("Métricas agregadas de todas as migrações oceânicas realizadas", {
      size: accessibilitySystem.scaleFont(16),
      font: "Inter",
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 74),
    engineOrContext.color(190, 230, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(292) : undefined,
  ]);
  if (subtitleNode && typeof subtitleNode === "object") elements.push(subtitleNode);

  const divider = engineOrContext.add([
    engineOrContext.rect(cardW - 60, 1.5, { radius: 1 }),
    engineOrContext.pos(cX, cY - cardH / 2 + 98),
    engineOrContext.color(35, 80, 140),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(292) : undefined,
  ]);
  if (divider && typeof divider === "object") elements.push(divider);

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

    const boxOutline =
      typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
        ? engineOrContext.outline(1.5, engineOrContext.rgb(35, 75, 130))
        : undefined;

    const metricBox = engineOrContext.add([
      engineOrContext.rect(boxW, boxH, { radius: 12 }),
      engineOrContext.pos(posX, posY),
      engineOrContext.color(14, 34, 68),
      boxOutline,
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(293) : undefined,
    ]) as {
      color?: unknown;
      outline?: { width: number; color: unknown };
      onHoverUpdate?(cb: () => void): void;
      onHoverEnd?(cb: () => void): void;
    };
    if (metricBox && typeof metricBox === "object") elements.push(metricBox);

    if (typeof metricBox?.onHoverUpdate === "function") {
      metricBox.onHoverUpdate(() => {
        if (typeof engineOrContext.rgb === "function") {
          metricBox.color = engineOrContext.rgb(18, 44, 88);
          if (metricBox.outline)
            metricBox.outline = { width: 1.5, color: engineOrContext.rgb(80, 200, 255) };
        }
      });
    }
    if (typeof metricBox?.onHoverEnd === "function") {
      metricBox.onHoverEnd(() => {
        if (typeof engineOrContext.rgb === "function") {
          metricBox.color = engineOrContext.rgb(14, 34, 68);
          if (metricBox.outline)
            metricBox.outline = { width: 1.5, color: engineOrContext.rgb(35, 75, 130) };
        }
      });
    }

    const iconPillX = posX - boxW / 2 + 36;
    const iconPillOutline =
      typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
        ? engineOrContext.outline(1, engineOrContext.rgb(56, 189, 248))
        : undefined;

    const iconPill = engineOrContext.add([
      engineOrContext.rect(54, 54, { radius: 10 }),
      engineOrContext.pos(iconPillX, posY),
      engineOrContext.color(18, 48, 92),
      iconPillOutline,
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(294) : undefined,
    ]);
    if (iconPill && typeof iconPill === "object") elements.push(iconPill);

    const iconNode = engineOrContext.add([
      engineOrContext.text(item.icon, {
        size: accessibilitySystem.scaleFont(26),
        font: "Inter",
      }),
      engineOrContext.pos(iconPillX, posY),
      typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(295) : undefined,
    ]);
    if (iconNode && typeof iconNode === "object") elements.push(iconNode);

    const textStartX = posX - boxW / 2 + 76;

    const cardTitle = engineOrContext.add([
      engineOrContext.text(item.title, {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
      }),
      engineOrContext.pos(textStartX, posY - 29),
      engineOrContext.color(190, 225, 255),
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(294) : undefined,
    ]);
    if (cardTitle && typeof cardTitle === "object") elements.push(cardTitle);

    const mainColor =
      typeof engineOrContext.rgb === "function"
        ? engineOrContext.rgb(item.color[0], item.color[1], item.color[2])
        : undefined;

    const cardMainVal = engineOrContext.add([
      engineOrContext.text(item.mainVal, {
        size: accessibilitySystem.scaleFont(27),
        font: "Outfit",
      }),
      engineOrContext.pos(textStartX, posY + 2),
      mainColor ? engineOrContext.color(mainColor) : undefined,
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(294) : undefined,
    ]);
    if (cardMainVal && typeof cardMainVal === "object") elements.push(cardMainVal);

    const cardSubVal = engineOrContext.add([
      engineOrContext.text(item.subVal, {
        size: accessibilitySystem.scaleFont(14),
        font: "Inter",
      }),
      engineOrContext.pos(textStartX, posY + 33),
      engineOrContext.color(195, 225, 250),
      typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
      typeof engineOrContext.z === "function" ? engineOrContext.z(294) : undefined,
    ]);
    if (cardSubVal && typeof cardSubVal === "object") elements.push(cardSubVal);
  });

  const footer = engineOrContext.add([
    engineOrContext.text(
      "🌱 Cada jornada no oceano reforça a preservação marinha e a proteção das baleias-jubarte.",
      {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
      }
    ),
    engineOrContext.pos(cX, cY + cardH / 2 - 96),
    engineOrContext.color(150, 220, 245),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(293) : undefined,
  ]);
  if (footer && typeof footer === "object") elements.push(footer);

  const focusItems: FocusableItem[] = [];
  let keyHandler: ((event: KeyboardEvent) => void) | null = null;
  let focusGroup: { destroy: () => void } | null = null;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    if (focusGroup) {
      focusGroup.destroy();
      focusGroup = null;
    }
    if (typeof window !== "undefined" && keyHandler) {
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
    onClose();
  };

  if (typeof btnX?.onHoverUpdate === "function") {
    btnX.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function") btnX.color = engineOrContext.rgb(35, 75, 130);
      btnX.scale = createVec2(1.05, 1.05);
    });
  }
  if (typeof btnX?.onHoverEnd === "function") {
    btnX.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function") btnX.color = engineOrContext.rgb(22, 50, 90);
      btnX.scale = createVec2(1, 1);
    });
  }
  if (typeof btnX?.onClick === "function") {
    btnX.onClick(() => {
      if (canInteract) close();
    });
  }
  focusItems.push({
    pos: btnXPos,
    width: 38,
    height: 38,
    onActivate: () => {
      if (canInteract) close();
    },
  });

  const btnClosePos = createVec2(cX, cY + cardH / 2 - 46);
  const backOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(2, engineOrContext.rgb(56, 189, 248))
      : undefined;

  const btnClose = engineOrContext.add([
    engineOrContext.rect(300, 50, { radius: 10 }),
    engineOrContext.pos(btnClosePos.x, btnClosePos.y),
    engineOrContext.color(24, 85, 150),
    backOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.scale === "function" ? engineOrContext.scale(1) : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(294) : undefined,
  ]) as {
    color?: unknown;
    scale?: { x: number; y: number };
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnClose && typeof btnClose === "object") elements.push(btnClose);

  const btnText = engineOrContext.add([
    engineOrContext.text("VOLTAR AO MENU ↩", {
      size: accessibilitySystem.scaleFont(16.5),
      font: "Outfit",
    }),
    engineOrContext.pos(btnClosePos.x, btnClosePos.y),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(295) : undefined,
  ]);
  if (btnText && typeof btnText === "object") elements.push(btnText);

  if (typeof btnClose?.onHoverUpdate === "function") {
    btnClose.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnClose.color = engineOrContext.rgb(35, 115, 200);
      btnClose.scale = createVec2(1.02, 1.02);
    });
  }
  if (typeof btnClose?.onHoverEnd === "function") {
    btnClose.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnClose.color = engineOrContext.rgb(24, 85, 150);
      btnClose.scale = createVec2(1, 1);
    });
  }
  if (typeof btnClose?.onClick === "function") {
    btnClose.onClick(() => {
      if (canInteract) close();
    });
  }
  focusItems.push({
    pos: btnClosePos,
    width: 300,
    height: 50,
    onActivate: () => {
      if (canInteract) close();
    },
  });

  focusGroup = createFocusGroup(engineOrContext, {
    items: focusItems,
    initialIndex: 1,
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

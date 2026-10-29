/**
 * Modal de Compartilhamento Social & Certificado (Fase 25 / WBS 2.17) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte nativo a IRenderEngine (PixiJS v8)
 * e compatibilidade reversa para contextos legados sem nenhum uso de "any".
 */

import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import {
  type VictoryCardData,
  getShareText,
  generateAndDownloadVictoryCard,
  shareVictoryCard,
} from "./victoryCard";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface LegacyShareModalContext {
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
  area?(): unknown;
  text(content: string, options?: unknown): unknown;
  destroy?(target: unknown): void;
  wait?(duration: number, callback: () => void): void;
  onKeyPress?(key: string, callback: () => void): { cancel?: () => void };
}

export function showShareModal(
  engineOrContext: IRenderEngine | LegacyShareModalContext,
  data: VictoryCardData,
  onClose: () => void
): void {
  audioSystem.playUiClick();

  const shareText = getShareText(data);
  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "https://micro-splash.local";

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const screenW = dimensions.width;
    const screenH = dimensions.height;
    const cX = screenW / 2;
    const cY = screenH / 2;

    const cardW = Math.min(680, screenW - 24);
    const cardH = Math.min(480, screenH - 20);

    const createdNodes: Array<IGraphicsNode | ITextNode> = [];
    let isClosed = false;

    const destroyAll = () => {
      if (isClosed) return;
      isClosed = true;

      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", handleKey);
      }

      createdNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      createdNodes.length = 0;
    };

    const doClose = () => {
      audioSystem.playUiClick();
      destroyAll();
      onClose();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (isClosed) return;
      if (e.key === "Escape") {
        doClose();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKey);
    }

    // Fundo escuro
    const backdrop = engineOrContext.createGraphics("share-backdrop");
    backdrop.drawRect(0, 0, screenW, screenH, {
      fill: { color: [4, 12, 28], alpha: 0.95 },
    });
    backdrop.setZIndex(500);
    stageRoot.addChild(backdrop);
    createdNodes.push(backdrop);

    // Card principal
    const card = engineOrContext.createGraphics("share-card");
    card.drawRoundedRect(cX - cardW / 2, cY - cardH / 2, cardW, cardH, 14, {
      fill: { color: [10, 30, 64], alpha: 1 },
      stroke: { color: [100, 220, 255], width: 2.5 },
    });
    card.setZIndex(501);
    stageRoot.addChild(card);
    createdNodes.push(card);

    // Título
    const title = engineOrContext.createText(
      "COMPARTILHAR CERTIFICADO 📲🌊",
      {
        fontSize: accessibilitySystem.scaleFont(22),
        fontFamily: "Outfit",
        color: [255, 215, 80],
        align: "center",
      },
      "share-title"
    );
    title.setPosition(cX, cY - cardH / 2 + 30);
    title.setAlign("center");
    const nativeTitle = title.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeTitle?.anchor?.set) nativeTitle.anchor.set(0.5, 0.5);
    title.setZIndex(502);
    stageRoot.addChild(title);
    createdNodes.push(title);

    // Subtítulo
    const subtitle = engineOrContext.createText(
      "Mostre sua pontuação nas redes e ajude na conscientização da vida marinha!",
      {
        fontSize: accessibilitySystem.scaleFont(14.5),
        fontFamily: "Inter",
        color: [180, 225, 255],
        align: "center",
        wordWrapWidth: cardW - 50,
      },
      "share-subtitle"
    );
    subtitle.setPosition(cX, cY - cardH / 2 + 58);
    subtitle.setAlign("center");
    const nativeSub = subtitle.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeSub?.anchor?.set) nativeSub.anchor.set(0.5, 0.5);
    subtitle.setZIndex(502);
    stageRoot.addChild(subtitle);
    createdNodes.push(subtitle);

    // Preview das Conquistas
    const previewY = cY - cardH / 2 + 110;
    const previewBox = engineOrContext.createGraphics("share-preview-box");
    previewBox.drawRoundedRect(cX - (cardW - 50) / 2, previewY - 30, cardW - 50, 60, 10, {
      fill: { color: [14, 42, 85], alpha: 1 },
      stroke: { color: [80, 160, 230], width: 1.5 },
    });
    previewBox.setZIndex(502);
    stageRoot.addChild(previewBox);
    createdNodes.push(previewBox);

    const scoreLine = engineOrContext.createText(
      `⭐ ${data.finalScore.toLocaleString("pt-BR")} Eco-Pontos   |   ${data.rank}`,
      {
        fontSize: accessibilitySystem.scaleFont(16.5),
        fontFamily: "Outfit",
        color: [255, 225, 90],
        align: "center",
      },
      "share-score-line"
    );
    scoreLine.setPosition(cX, previewY - 13);
    scoreLine.setAlign("center");
    const nativeScore = scoreLine.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeScore?.anchor?.set) nativeScore.anchor.set(0.5, 0.5);
    scoreLine.setZIndex(503);
    stageRoot.addChild(scoreLine);
    createdNodes.push(scoreLine);

    const statsLine = engineOrContext.createText(
      `📏 ${Math.floor(data.distance).toLocaleString("pt-BR")}m percorridos   •   🦐 ${data.krillCount} Krill   •   🗑️ ${data.trashCount} Lixo`,
      {
        fontSize: accessibilitySystem.scaleFont(13.5),
        fontFamily: "Inter",
        color: [200, 235, 255],
        align: "center",
      },
      "share-stats-line"
    );
    statsLine.setPosition(cX, previewY + 14);
    statsLine.setAlign("center");
    const nativeStats = statsLine.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeStats?.anchor?.set) nativeStats.anchor.set(0.5, 0.5);
    statsLine.setZIndex(503);
    stageRoot.addChild(statsLine);
    createdNodes.push(statsLine);

    // Botão Fechar [✕]
    const btnCloseX = cX + cardW / 2 - 28;
    const btnCloseY = cY - cardH / 2 + 28;
    const btnClose = engineOrContext.createGraphics("share-btn-close");
    const drawCloseBtn = (hovered: boolean) => {
      btnClose.clear();
      btnClose.drawRoundedRect(btnCloseX - 17, btnCloseY - 17, 34, 34, 8, {
        fill: { color: hovered ? [150, 40, 40] : [25, 45, 80], alpha: 1 },
        stroke: { color: [100, 200, 255], width: 1 },
      });
    };
    drawCloseBtn(false);
    btnClose.setZIndex(505);
    stageRoot.addChild(btnClose);
    createdNodes.push(btnClose);

    const closeText = engineOrContext.createText(
      "✕",
      {
        fontSize: accessibilitySystem.scaleFont(16),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "share-close-label"
    );
    closeText.setPosition(btnCloseX, btnCloseY);
    closeText.setAlign("center");
    const nativeCloseText = closeText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeCloseText?.anchor?.set) nativeCloseText.anchor.set(0.5, 0.5);
    closeText.setZIndex(506);
    stageRoot.addChild(closeText);
    createdNodes.push(closeText);

    const nativeClose = btnClose.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeClose?.on) {
      nativeClose.eventMode = "static";
      nativeClose.cursor = "pointer";
      nativeClose.on("pointerover", () => drawCloseBtn(true));
      nativeClose.on("pointerout", () => drawCloseBtn(false));
      nativeClose.on("pointerdown", doClose);
    }

    // Botões de Ação
    const startBtnY = previewY + 58;
    const btnSpacing = 48;
    const btnW = cardW - 50;
    const btnH = 42;

    // 1. WhatsApp
    const btnWhatsAppY = startBtnY;
    const btnWhatsApp = engineOrContext.createGraphics("share-btn-wa");
    const drawWa = (hovered: boolean) => {
      btnWhatsApp.clear();
      btnWhatsApp.drawRoundedRect(cX - btnW / 2, btnWhatsAppY - btnH / 2, btnW, btnH, 8, {
        fill: { color: hovered ? [28, 145, 75] : [20, 115, 60], alpha: 1 },
        stroke: { color: [80, 220, 120], width: 1.5 },
      });
    };
    drawWa(false);
    btnWhatsApp.setZIndex(503);
    stageRoot.addChild(btnWhatsApp);
    createdNodes.push(btnWhatsApp);

    const waText = engineOrContext.createText(
      "📱 Compartilhar no WhatsApp",
      {
        fontSize: accessibilitySystem.scaleFont(15),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "share-wa-label"
    );
    waText.setPosition(cX, btnWhatsAppY);
    waText.setAlign("center");
    const nativeWaText = waText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeWaText?.anchor?.set) nativeWaText.anchor.set(0.5, 0.5);
    waText.setZIndex(504);
    stageRoot.addChild(waText);
    createdNodes.push(waText);

    const nativeWa = btnWhatsApp.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeWa?.on) {
      nativeWa.eventMode = "static";
      nativeWa.cursor = "pointer";
      nativeWa.on("pointerover", () => drawWa(true));
      nativeWa.on("pointerout", () => drawWa(false));
      nativeWa.on("pointerdown", () => {
        audioSystem.playUiClick();
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n" + currentUrl)}`;
        if (typeof window !== "undefined") {
          window.open(waUrl, "_blank", "noopener,noreferrer");
        }
      });
    }

    // 2. X / Twitter
    const btnTwitterY = startBtnY + btnSpacing;
    const btnTwitter = engineOrContext.createGraphics("share-btn-tw");
    const drawTw = (hovered: boolean) => {
      btnTwitter.clear();
      btnTwitter.drawRoundedRect(cX - btnW / 2, btnTwitterY - btnH / 2, btnW, btnH, 8, {
        fill: { color: hovered ? [30, 95, 160] : [20, 75, 130], alpha: 1 },
        stroke: { color: [90, 180, 255], width: 1.5 },
      });
    };
    drawTw(false);
    btnTwitter.setZIndex(503);
    stageRoot.addChild(btnTwitter);
    createdNodes.push(btnTwitter);

    const twText = engineOrContext.createText(
      "🐦 Compartilhar no X (Twitter)",
      {
        fontSize: accessibilitySystem.scaleFont(15),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "share-tw-label"
    );
    twText.setPosition(cX, btnTwitterY);
    twText.setAlign("center");
    const nativeTwText = twText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeTwText?.anchor?.set) nativeTwText.anchor.set(0.5, 0.5);
    twText.setZIndex(504);
    stageRoot.addChild(twText);
    createdNodes.push(twText);

    const nativeTw = btnTwitter.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeTw?.on) {
      nativeTw.eventMode = "static";
      nativeTw.cursor = "pointer";
      nativeTw.on("pointerover", () => drawTw(true));
      nativeTw.on("pointerout", () => drawTw(false));
      nativeTw.on("pointerdown", () => {
        audioSystem.playUiClick();
        const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
        if (typeof window !== "undefined") {
          window.open(twUrl, "_blank", "noopener,noreferrer");
        }
      });
    }

    // 3. Copiar Texto Formatado
    const btnCopyY = startBtnY + btnSpacing * 2;
    const btnCopy = engineOrContext.createGraphics("share-btn-copy");
    const drawCopy = (hovered: boolean) => {
      btnCopy.clear();
      btnCopy.drawRoundedRect(cX - btnW / 2, btnCopyY - btnH / 2, btnW, btnH, 8, {
        fill: { color: hovered ? [40, 70, 120] : [30, 50, 90], alpha: 1 },
        stroke: { color: [110, 170, 240], width: 1.5 },
      });
    };
    drawCopy(false);
    btnCopy.setZIndex(503);
    stageRoot.addChild(btnCopy);
    createdNodes.push(btnCopy);

    const copyLabel = engineOrContext.createText(
      "📋 Copiar Texto do Certificado (Instagram / Discord)",
      {
        fontSize: accessibilitySystem.scaleFont(14.5),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "share-copy-label"
    );
    copyLabel.setPosition(cX, btnCopyY);
    copyLabel.setAlign("center");
    const nativeCopyText = copyLabel.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeCopyText?.anchor?.set) nativeCopyText.anchor.set(0.5, 0.5);
    copyLabel.setZIndex(504);
    stageRoot.addChild(copyLabel);
    createdNodes.push(copyLabel);

    const nativeCopy = btnCopy.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeCopy?.on) {
      nativeCopy.eventMode = "static";
      nativeCopy.cursor = "pointer";
      nativeCopy.on("pointerover", () => drawCopy(true));
      nativeCopy.on("pointerout", () => drawCopy(false));
      nativeCopy.on("pointerdown", async () => {
        audioSystem.playUiClick();
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(shareText + "\n" + currentUrl);
            copyLabel.setText("Copiado com Sucesso para a Área de Transferência! ✓");
            setTimeout(() => {
              if (!isClosed) {
                copyLabel.setText("📋 Copiar Texto do Certificado (Instagram / Discord)");
              }
            }, 2500);
          }
        } catch {
          copyLabel.setText("Texto gerado! Pressione Ctrl+C");
        }
      });
    }

    // 4. Compartilhar Imagem com App (Nativo) ou Baixar PNG
    const hasNativeShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function";
    const btnActionY = startBtnY + btnSpacing * 3;
    const btnAction = engineOrContext.createGraphics("share-btn-action");
    const drawAction = (hovered: boolean) => {
      btnAction.clear();
      const baseColor: [number, number, number] = hasNativeShare ? [18, 110, 120] : [18, 90, 75];
      const hoverColor: [number, number, number] = hasNativeShare ? [25, 140, 150] : [24, 120, 100];
      const strokeColor: [number, number, number] = hasNativeShare
        ? [90, 230, 230]
        : [90, 240, 180];
      btnAction.drawRoundedRect(cX - btnW / 2, btnActionY - btnH / 2, btnW, btnH, 8, {
        fill: { color: hovered ? hoverColor : baseColor, alpha: 1 },
        stroke: { color: strokeColor, width: 1.5 },
      });
    };
    drawAction(false);
    btnAction.setZIndex(503);
    stageRoot.addChild(btnAction);
    createdNodes.push(btnAction);

    const actionLabel = engineOrContext.createText(
      hasNativeShare
        ? "✨ Compartilhar Imagem com App (Nativo)"
        : "📥 Baixar Imagem PNG do Certificado",
      {
        fontSize: accessibilitySystem.scaleFont(15),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "share-action-label"
    );
    actionLabel.setPosition(cX, btnActionY);
    actionLabel.setAlign("center");
    const nativeActionText = actionLabel.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeActionText?.anchor?.set) nativeActionText.anchor.set(0.5, 0.5);
    actionLabel.setZIndex(504);
    stageRoot.addChild(actionLabel);
    createdNodes.push(actionLabel);

    const nativeAction = btnAction.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeAction?.on) {
      nativeAction.eventMode = "static";
      nativeAction.cursor = "pointer";
      nativeAction.on("pointerover", () => drawAction(true));
      nativeAction.on("pointerout", () => drawAction(false));
      nativeAction.on("pointerdown", async () => {
        audioSystem.playUiClick();
        if (hasNativeShare) {
          actionLabel.setText("Abrindo Compartilhamento... 📲");
          const shared = await shareVictoryCard(data);
          if (shared) {
            actionLabel.setText("Compartilhado com Sucesso! ✓");
          } else {
            generateAndDownloadVictoryCard(data);
            actionLabel.setText("Certificado PNG Baixado! ✓");
          }
          setTimeout(() => {
            if (!isClosed) {
              actionLabel.setText("✨ Compartilhar Imagem com App (Nativo)");
            }
          }, 2500);
        } else {
          generateAndDownloadVictoryCard(data);
          actionLabel.setText("Certificado PNG Baixado! ✓ (Poste nos Stories)");
          setTimeout(() => {
            if (!isClosed) {
              actionLabel.setText("📥 Baixar Imagem PNG do Certificado");
            }
          }, 2500);
        }
      });
    }

    // Botão Concluir / Voltar
    const btnDoneY = cY + cardH / 2 - 26;
    const btnDone = engineOrContext.createGraphics("share-btn-done");
    const drawDone = (hovered: boolean) => {
      btnDone.clear();
      btnDone.drawRoundedRect(cX - 105, btnDoneY - 20, 210, 40, 8, {
        fill: { color: hovered ? [28, 65, 110] : [18, 45, 80], alpha: 1 },
        stroke: { color: [80, 160, 220], width: 1.5 },
      });
    };
    drawDone(false);
    btnDone.setZIndex(503);
    stageRoot.addChild(btnDone);
    createdNodes.push(btnDone);

    const doneLabel = engineOrContext.createText(
      "Voltar (ESC)",
      {
        fontSize: accessibilitySystem.scaleFont(14.5),
        fontFamily: "Outfit",
        color: [210, 235, 255],
        align: "center",
      },
      "share-done-label"
    );
    doneLabel.setPosition(cX, btnDoneY);
    doneLabel.setAlign("center");
    const nativeDoneText = doneLabel.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (nativeDoneText?.anchor?.set) nativeDoneText.anchor.set(0.5, 0.5);
    doneLabel.setZIndex(504);
    stageRoot.addChild(doneLabel);
    createdNodes.push(doneLabel);

    const nativeDone = btnDone.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeDone?.on) {
      nativeDone.eventMode = "static";
      nativeDone.cursor = "pointer";
      nativeDone.on("pointerover", () => drawDone(true));
      nativeDone.on("pointerout", () => drawDone(false));
      nativeDone.on("pointerdown", doClose);
    }

    return;
  }

  // --- MODO LEGADO (COMPATIBILIDADE REVERSA) ---
  const elements: Array<{ destroy?: () => void } | object> = [];
  const keyListeners: Array<{ cancel?: () => void }> = [];
  let isClosed = false;

  const screenW = engineOrContext.width();
  const screenH = engineOrContext.height();
  const cX = screenW / 2;
  const cY = screenH / 2;

  const cardW = Math.min(680, screenW - 24);
  const cardH = Math.min(480, screenH - 20);

  const backdrop = engineOrContext.add([
    engineOrContext.rect(screenW, screenH),
    engineOrContext.pos(0, 0),
    engineOrContext.color(4, 12, 28),
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.95) : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(500) : undefined,
  ]);
  if (backdrop && typeof backdrop === "object") elements.push(backdrop);

  const cardOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(2.5, engineOrContext.rgb(100, 220, 255))
      : undefined;

  const card = engineOrContext.add([
    engineOrContext.rect(cardW, cardH, { radius: 14 }),
    engineOrContext.pos(cX, cY),
    engineOrContext.color(10, 30, 64),
    cardOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(501) : undefined,
  ]);
  if (card && typeof card === "object") elements.push(card);

  const titleObj = engineOrContext.add([
    engineOrContext.text("COMPARTILHAR CERTIFICADO 📲🌊", {
      size: accessibilitySystem.scaleFont(22),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, cY - cardH / 2 + 30),
    engineOrContext.color(255, 215, 80),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (titleObj && typeof titleObj === "object") elements.push(titleObj);

  const subtitleObj = engineOrContext.add([
    engineOrContext.text(
      "Mostre sua pontuação nas redes e ajude na conscientização da vida marinha!",
      {
        size: accessibilitySystem.scaleFont(14.5),
        font: "Inter",
        width: cardW - 50,
        align: "center",
      }
    ),
    engineOrContext.pos(cX, cY - cardH / 2 + 58),
    engineOrContext.color(180, 225, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (subtitleObj && typeof subtitleObj === "object") elements.push(subtitleObj);

  const previewY = cY - cardH / 2 + 110;
  const previewOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(80, 160, 230))
      : undefined;

  const previewBox = engineOrContext.add([
    engineOrContext.rect(cardW - 50, 60, { radius: 10 }),
    engineOrContext.pos(cX, previewY),
    engineOrContext.color(14, 42, 85),
    previewOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (previewBox && typeof previewBox === "object") elements.push(previewBox);

  const scoreTextObj = engineOrContext.add([
    engineOrContext.text(
      `⭐ ${data.finalScore.toLocaleString("pt-BR")} Eco-Pontos   |   ${data.rank}`,
      {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }
    ),
    engineOrContext.pos(cX, previewY - 13),
    engineOrContext.color(255, 225, 90),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]);
  if (scoreTextObj && typeof scoreTextObj === "object") elements.push(scoreTextObj);

  const statsTextObj = engineOrContext.add([
    engineOrContext.text(
      `📏 ${Math.floor(data.distance).toLocaleString("pt-BR")}m percorridos   •   🦐 ${data.krillCount} Krill   •   🗑️ ${data.trashCount} Lixo`,
      { size: accessibilitySystem.scaleFont(13.5), font: "Inter" }
    ),
    engineOrContext.pos(cX, previewY + 14),
    engineOrContext.color(200, 235, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]);
  if (statsTextObj && typeof statsTextObj === "object") elements.push(statsTextObj);

  const destroyAll = () => {
    if (isClosed) return;
    isClosed = true;

    keyListeners.forEach((l) => {
      try {
        if (l && typeof l.cancel === "function") l.cancel();
      } catch {}
    });

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

  const doClose = () => {
    audioSystem.playUiClick();
    destroyAll();
    onClose();
  };

  const closeOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1, engineOrContext.rgb(100, 200, 255))
      : undefined;

  const btnClose = engineOrContext.add([
    engineOrContext.rect(34, 34, { radius: 8 }),
    engineOrContext.pos(cX + cardW / 2 - 28, cY - cardH / 2 + 28),
    engineOrContext.color(25, 45, 80),
    closeOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(505) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnClose && typeof btnClose === "object") elements.push(btnClose);

  const closeLabel = engineOrContext.add([
    engineOrContext.text("✕", { size: accessibilitySystem.scaleFont(16), font: "Outfit" }),
    engineOrContext.pos(cX + cardW / 2 - 28, cY - cardH / 2 + 28),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(506) : undefined,
  ]);
  if (closeLabel && typeof closeLabel === "object") elements.push(closeLabel);

  if (typeof btnClose?.onHoverUpdate === "function") {
    btnClose.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnClose.color = engineOrContext.rgb(150, 40, 40);
    });
  }
  if (typeof btnClose?.onHoverEnd === "function") {
    btnClose.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnClose.color = engineOrContext.rgb(25, 45, 80);
    });
  }
  if (typeof btnClose?.onClick === "function") {
    btnClose.onClick(doClose);
  }
  if (typeof engineOrContext.onKeyPress === "function") {
    const escHandler = engineOrContext.onKeyPress("escape", doClose);
    if (escHandler) keyListeners.push(escHandler);
  }

  const startBtnY = previewY + 58;
  const btnSpacing = 48;
  const btnW = cardW - 50;
  const btnH = 42;

  // WhatsApp
  const waOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(80, 220, 120))
      : undefined;

  const btnWhatsApp = engineOrContext.add([
    engineOrContext.rect(btnW, btnH, { radius: 8 }),
    engineOrContext.pos(cX, startBtnY),
    engineOrContext.color(20, 115, 60),
    waOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnWhatsApp && typeof btnWhatsApp === "object") elements.push(btnWhatsApp);

  const waLabel = engineOrContext.add([
    engineOrContext.text("📱 Compartilhar no WhatsApp", {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, startBtnY),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
  ]);
  if (waLabel && typeof waLabel === "object") elements.push(waLabel);

  if (typeof btnWhatsApp?.onHoverUpdate === "function") {
    btnWhatsApp.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnWhatsApp.color = engineOrContext.rgb(28, 145, 75);
    });
  }
  if (typeof btnWhatsApp?.onHoverEnd === "function") {
    btnWhatsApp.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnWhatsApp.color = engineOrContext.rgb(20, 115, 60);
    });
  }
  if (typeof btnWhatsApp?.onClick === "function") {
    btnWhatsApp.onClick(() => {
      audioSystem.playUiClick();
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + "\n" + currentUrl)}`;
      if (typeof window !== "undefined") {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  // Twitter
  const twOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(90, 180, 255))
      : undefined;

  const btnTwitter = engineOrContext.add([
    engineOrContext.rect(btnW, btnH, { radius: 8 }),
    engineOrContext.pos(cX, startBtnY + btnSpacing),
    engineOrContext.color(20, 75, 130),
    twOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnTwitter && typeof btnTwitter === "object") elements.push(btnTwitter);

  const twLabel = engineOrContext.add([
    engineOrContext.text("🐦 Compartilhar no X (Twitter)", {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, startBtnY + btnSpacing),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
  ]);
  if (twLabel && typeof twLabel === "object") elements.push(twLabel);

  if (typeof btnTwitter?.onHoverUpdate === "function") {
    btnTwitter.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnTwitter.color = engineOrContext.rgb(30, 95, 160);
    });
  }
  if (typeof btnTwitter?.onHoverEnd === "function") {
    btnTwitter.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnTwitter.color = engineOrContext.rgb(20, 75, 130);
    });
  }
  if (typeof btnTwitter?.onClick === "function") {
    btnTwitter.onClick(() => {
      audioSystem.playUiClick();
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(currentUrl)}`;
      if (typeof window !== "undefined") {
        window.open(twUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  // Copy
  const copyOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(110, 170, 240))
      : undefined;

  const btnCopy = engineOrContext.add([
    engineOrContext.rect(btnW, btnH, { radius: 8 }),
    engineOrContext.pos(cX, startBtnY + btnSpacing * 2),
    engineOrContext.color(30, 50, 90),
    copyOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnCopy && typeof btnCopy === "object") elements.push(btnCopy);

  const copyLabel = engineOrContext.add([
    engineOrContext.text("📋 Copiar Texto do Certificado (Instagram / Discord)", {
      size: accessibilitySystem.scaleFont(14.5),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, startBtnY + btnSpacing * 2),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
  ]) as { text?: string };
  if (copyLabel && typeof copyLabel === "object") elements.push(copyLabel);

  if (typeof btnCopy?.onHoverUpdate === "function") {
    btnCopy.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnCopy.color = engineOrContext.rgb(40, 70, 120);
    });
  }
  if (typeof btnCopy?.onHoverEnd === "function") {
    btnCopy.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnCopy.color = engineOrContext.rgb(30, 50, 90);
    });
  }
  if (typeof btnCopy?.onClick === "function") {
    btnCopy.onClick(async () => {
      audioSystem.playUiClick();
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(shareText + "\n" + currentUrl);
          copyLabel.text = "Copiado com Sucesso para a Área de Transferência! ✓";
          if (typeof engineOrContext.wait === "function") {
            engineOrContext.wait(2.5, () => {
              if (!isClosed) {
                copyLabel.text = "📋 Copiar Texto do Certificado (Instagram / Discord)";
              }
            });
          }
        }
      } catch {
        copyLabel.text = "Texto gerado! Pressione Ctrl+C";
      }
    });
  }

  // Action
  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const actionColor =
    typeof engineOrContext.rgb === "function"
      ? hasNativeShare
        ? engineOrContext.rgb(18, 110, 120)
        : engineOrContext.rgb(18, 90, 75)
      : undefined;

  const actionOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(
          1.5,
          hasNativeShare ? engineOrContext.rgb(90, 230, 230) : engineOrContext.rgb(90, 240, 180)
        )
      : undefined;

  const btnAction = engineOrContext.add([
    engineOrContext.rect(btnW, btnH, { radius: 8 }),
    engineOrContext.pos(cX, startBtnY + btnSpacing * 3),
    actionColor ? engineOrContext.color(actionColor) : undefined,
    actionOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnAction && typeof btnAction === "object") elements.push(btnAction);

  const actionLabel = engineOrContext.add([
    engineOrContext.text(
      hasNativeShare
        ? "✨ Compartilhar Imagem com App (Nativo)"
        : "📥 Baixar Imagem PNG do Certificado",
      {
        size: accessibilitySystem.scaleFont(15),
        font: "Outfit",
      }
    ),
    engineOrContext.pos(cX, startBtnY + btnSpacing * 3),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
  ]) as { text?: string };
  if (actionLabel && typeof actionLabel === "object") elements.push(actionLabel);

  if (typeof btnAction?.onHoverUpdate === "function") {
    btnAction.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function") {
        btnAction.color = hasNativeShare
          ? engineOrContext.rgb(25, 140, 150)
          : engineOrContext.rgb(24, 120, 100);
      }
    });
  }
  if (typeof btnAction?.onHoverEnd === "function") {
    btnAction.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function") {
        btnAction.color = hasNativeShare
          ? engineOrContext.rgb(18, 110, 120)
          : engineOrContext.rgb(18, 90, 75);
      }
    });
  }
  if (typeof btnAction?.onClick === "function") {
    btnAction.onClick(async () => {
      audioSystem.playUiClick();
      if (hasNativeShare) {
        actionLabel.text = "Abrindo Compartilhamento... 📲";
        const shared = await shareVictoryCard(data);
        if (shared) {
          actionLabel.text = "Compartilhado com Sucesso! ✓";
        } else {
          generateAndDownloadVictoryCard(data);
          actionLabel.text = "Certificado PNG Baixado! ✓";
        }
        if (typeof engineOrContext.wait === "function") {
          engineOrContext.wait(2.5, () => {
            if (!isClosed) {
              actionLabel.text = "✨ Compartilhar Imagem com App (Nativo)";
            }
          });
        }
      } else {
        generateAndDownloadVictoryCard(data);
        actionLabel.text = "Certificado PNG Baixado! ✓ (Poste nos Stories)";
        if (typeof engineOrContext.wait === "function") {
          engineOrContext.wait(2.5, () => {
            if (!isClosed) {
              actionLabel.text = "📥 Baixar Imagem PNG do Certificado";
            }
          });
        }
      }
    });
  }

  // Done
  const doneOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(80, 160, 220))
      : undefined;

  const btnDone = engineOrContext.add([
    engineOrContext.rect(210, 40, { radius: 8 }),
    engineOrContext.pos(cX, cY + cardH / 2 - 26),
    engineOrContext.color(18, 45, 80),
    doneOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]) as {
    color?: unknown;
    onHoverUpdate?(cb: () => void): void;
    onHoverEnd?(cb: () => void): void;
    onClick?(cb: () => void): void;
  };
  if (btnDone && typeof btnDone === "object") elements.push(btnDone);

  const doneLabel = engineOrContext.add([
    engineOrContext.text("Voltar (ESC)", {
      size: accessibilitySystem.scaleFont(14.5),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, cY + cardH / 2 - 26),
    engineOrContext.color(210, 235, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(504) : undefined,
  ]);
  if (doneLabel && typeof doneLabel === "object") elements.push(doneLabel);

  if (typeof btnDone?.onHoverUpdate === "function") {
    btnDone.onHoverUpdate(() => {
      if (typeof engineOrContext.rgb === "function")
        btnDone.color = engineOrContext.rgb(28, 65, 110);
    });
  }
  if (typeof btnDone?.onHoverEnd === "function") {
    btnDone.onHoverEnd(() => {
      if (typeof engineOrContext.rgb === "function")
        btnDone.color = engineOrContext.rgb(18, 45, 80);
    });
  }
  if (typeof btnDone?.onClick === "function") {
    btnDone.onClick(doClose);
  }
}

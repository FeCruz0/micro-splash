/**
 * Modal de Instalação PWA (Fase 19.2 / WBS 2.14) — Micro Splash
 *
 * Desacoplado do Kaboom.js, com suporte unificado a IRenderEngine (PixiJS v8)
 * e compatibilidade reversa para contextos legados sem nenhum uso de "any".
 */

import { promptPwaInstall, canInstallPwa } from "../utils/pwaManager";
import { audioSystem } from "../systems/audioSystem";
import {
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "./animationUtils";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";

export interface PwaInstallModalOptions {
  onClose: () => void;
  onInstalled?: () => void;
}

export interface LegacyPwaModalContext {
  width(): number;
  height(): number;
  rand?(min: number, max: number): number;
  dt?(): number;
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
  vec2?(x: number, y: number): { x: number; y: number };
}

export function showPwaInstallModal(
  engineOrContext: IRenderEngine | LegacyPwaModalContext,
  options: PwaInstallModalOptions
): void {
  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const dimensions = engineOrContext.getDimensions();
    const screenWidth = dimensions.width;
    const screenHeight = dimensions.height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    const modalWidth = Math.min(480, screenWidth - 40);
    const modalHeight = 280;

    const createdNodes: Array<IGraphicsNode | ITextNode> = [];
    let isClosed = false;

    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      audioSystem.playUiClick();
      createdNodes.forEach((node) => {
        try {
          stageRoot.removeChild(node);
          node.destroy();
        } catch {}
      });
      options.onClose();
    };

    // Fundo escuro semitransparente
    const overlay = engineOrContext.createGraphics("pwa-overlay");
    overlay.drawRect(0, 0, screenWidth, screenHeight, {
      fill: { color: [6, 18, 42], alpha: 0.85 },
    });
    overlay.setZIndex(500);
    stageRoot.addChild(overlay);
    createdNodes.push(overlay);

    // Cartão central
    const card = engineOrContext.createGraphics("pwa-card");
    card.drawRoundedRect(
      centerX - modalWidth / 2,
      centerY - modalHeight / 2,
      modalWidth,
      modalHeight,
      16,
      {
        fill: { color: [14, 30, 58], alpha: 1.0 },
        stroke: { color: [56, 189, 248], width: 2 },
      }
    );
    card.setZIndex(501);
    stageRoot.addChild(card);
    createdNodes.push(card);

    // Ícone e Título
    const titleText = engineOrContext.createText(
      "📱 Instalar Micro Splash",
      {
        fontSize: accessibilitySystem.scaleFont(22),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "pwa-title"
    );
    titleText.setPosition(centerX, centerY - modalHeight / 2 + 36);
    titleText.setAlign("center");
    const nativeTitle = titleText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeTitle && nativeTitle.anchor && typeof nativeTitle.anchor.set === "function") {
      nativeTitle.anchor.set(0.5, 0.5);
    }
    titleText.setZIndex(502);
    stageRoot.addChild(titleText);
    createdNodes.push(titleText);

    // Descrição
    const descText = engineOrContext.createText(
      "Instale o jogo para jogar offline em feiras, totens e telas cheias com carregamento instantâneo!",
      {
        fontSize: accessibilitySystem.scaleFont(14),
        fontFamily: "Inter",
        color: [186, 230, 253],
        align: "center",
        wordWrapWidth: modalWidth - 60,
      },
      "pwa-desc"
    );
    descText.setPosition(centerX, centerY - 20);
    descText.setAlign("center");
    const nativeDesc = descText.getNativeNode<{ anchor?: { set(x: number, y: number): void } }>();
    if (nativeDesc && nativeDesc.anchor && typeof nativeDesc.anchor.set === "function") {
      nativeDesc.anchor.set(0.5, 0.5);
    }
    descText.setZIndex(502);
    stageRoot.addChild(descText);
    createdNodes.push(descText);

    // Botões
    const buttonInstallY = centerY + modalHeight / 2 - 50;
    const buttonWidth = 160;
    const buttonHeight = 44;
    const installCenterX = centerX - buttonWidth / 2 - 12;
    const cancelCenterX = centerX + buttonWidth / 2 + 12;

    // Botão Instalar
    const btnInstall = engineOrContext.createGraphics("pwa-btn-install");
    const drawInstallBtn = (hovered: boolean) => {
      btnInstall.clear();
      btnInstall.drawRoundedRect(
        installCenterX - buttonWidth / 2,
        buttonInstallY - buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10,
        {
          fill: { color: hovered ? [5, 150, 105] : [16, 185, 129] },
          stroke: { color: [110, 231, 183], width: 1.5 },
        }
      );
    };
    drawInstallBtn(false);
    btnInstall.setZIndex(502);
    stageRoot.addChild(btnInstall);
    createdNodes.push(btnInstall);

    const btnInstallText = engineOrContext.createText(
      "Instalar 🚀",
      {
        fontSize: accessibilitySystem.scaleFont(15),
        fontFamily: "Outfit",
        color: [255, 255, 255],
        align: "center",
      },
      "pwa-install-label"
    );
    btnInstallText.setPosition(installCenterX, buttonInstallY);
    btnInstallText.setAlign("center");
    const nativeInstallText = btnInstallText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (
      nativeInstallText &&
      nativeInstallText.anchor &&
      typeof nativeInstallText.anchor.set === "function"
    ) {
      nativeInstallText.anchor.set(0.5, 0.5);
    }
    btnInstallText.setZIndex(503);
    stageRoot.addChild(btnInstallText);
    createdNodes.push(btnInstallText);

    const nativeInstall = btnInstall.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeInstall && typeof nativeInstall.on === "function") {
      nativeInstall.eventMode = "static";
      nativeInstall.cursor = "pointer";
      nativeInstall.on("pointerover", () => drawInstallBtn(true));
      nativeInstall.on("pointerout", () => drawInstallBtn(false));
      nativeInstall.on("pointerdown", async () => {
        if (!canInstallPwa()) {
          cleanup();
          return;
        }
        const installed = await promptPwaInstall();
        if (installed && options.onInstalled) {
          options.onInstalled();
        }
        cleanup();
      });
    }

    // Botão Cancelar
    const btnCancel = engineOrContext.createGraphics("pwa-btn-cancel");
    const drawCancelBtn = (hovered: boolean) => {
      btnCancel.clear();
      btnCancel.drawRoundedRect(
        cancelCenterX - buttonWidth / 2,
        buttonInstallY - buttonHeight / 2,
        buttonWidth,
        buttonHeight,
        10,
        {
          fill: { color: hovered ? [51, 65, 85] : [30, 41, 59] },
          stroke: { color: [100, 116, 139], width: 1.5 },
        }
      );
    };
    drawCancelBtn(false);
    btnCancel.setZIndex(502);
    stageRoot.addChild(btnCancel);
    createdNodes.push(btnCancel);

    const btnCancelText = engineOrContext.createText(
      "Agora Não",
      {
        fontSize: accessibilitySystem.scaleFont(15),
        fontFamily: "Outfit",
        color: [203, 213, 225],
        align: "center",
      },
      "pwa-cancel-label"
    );
    btnCancelText.setPosition(cancelCenterX, buttonInstallY);
    btnCancelText.setAlign("center");
    const nativeCancelText = btnCancelText.getNativeNode<{
      anchor?: { set(x: number, y: number): void };
    }>();
    if (
      nativeCancelText &&
      nativeCancelText.anchor &&
      typeof nativeCancelText.anchor.set === "function"
    ) {
      nativeCancelText.anchor.set(0.5, 0.5);
    }
    btnCancelText.setZIndex(503);
    stageRoot.addChild(btnCancelText);
    createdNodes.push(btnCancelText);

    const nativeCancel = btnCancel.getNativeNode<{
      eventMode?: string;
      cursor?: string;
      on?(evt: string, fn: () => void): void;
    }>();
    if (nativeCancel && typeof nativeCancel.on === "function") {
      nativeCancel.eventMode = "static";
      nativeCancel.cursor = "pointer";
      nativeCancel.on("pointerover", () => drawCancelBtn(true));
      nativeCancel.on("pointerout", () => drawCancelBtn(false));
      nativeCancel.on("pointerdown", cleanup);
    }

    return;
  }

  // Fallback para contexto legado
  const elements: Array<{ destroy?: () => void } | object> = [];
  let isClosed = false;

  const close = () => {
    if (isClosed) return;
    isClosed = true;
    audioSystem.playUiClick();
    elements.forEach((element) => {
      try {
        if (typeof engineOrContext.destroy === "function") {
          engineOrContext.destroy(element);
        } else if (
          "destroy" in element &&
          typeof (element as { destroy?: () => void }).destroy === "function"
        ) {
          (element as { destroy: () => void }).destroy();
        }
      } catch {}
    });
    options.onClose();
  };

  const cX = engineOrContext.width() / 2;
  const cY = engineOrContext.height() / 2;
  const modalWidth = Math.min(480, engineOrContext.width() - 40);
  const modalHeight = 280;

  // Fundo escuro semitransparente
  const overlay = engineOrContext.add([
    engineOrContext.rect(engineOrContext.width(), engineOrContext.height()),
    engineOrContext.pos(0, 0),
    engineOrContext.color(6, 18, 42),
    typeof engineOrContext.opacity === "function" ? engineOrContext.opacity(0.85) : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(500) : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
  ]);
  if (overlay && typeof overlay === "object") elements.push(overlay);

  // Cartão central
  const outlineComponent =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(2, engineOrContext.rgb(56, 189, 248))
      : undefined;

  const card = engineOrContext.add([
    engineOrContext.rect(modalWidth, modalHeight, { radius: 16 }),
    engineOrContext.pos(cX, cY),
    engineOrContext.color(14, 30, 58),
    outlineComponent,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(501) : undefined,
  ]);
  if (card && typeof card === "object") elements.push(card);

  // Ícone e Título
  const titleObj = engineOrContext.add([
    engineOrContext.text("📱 Instalar Micro Splash", {
      size: accessibilitySystem.scaleFont(22),
      font: "Outfit",
    }),
    engineOrContext.pos(cX, cY - modalHeight / 2 + 36),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (titleObj && typeof titleObj === "object") elements.push(titleObj);

  // Descrição
  const descObj = engineOrContext.add([
    engineOrContext.text(
      "Instale o jogo para jogar offline em feiras, totens e telas cheias com carregamento instantâneo!",
      {
        size: accessibilitySystem.scaleFont(14),
        font: "Inter",
        width: modalWidth - 60,
        align: "center",
      }
    ),
    engineOrContext.pos(cX, cY - 20),
    engineOrContext.color(186, 230, 253),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (descObj && typeof descObj === "object") elements.push(descObj);

  // Botão Instalar
  const buttonInstallY = cY + modalHeight / 2 - 50;
  const buttonWidth = 160;
  const buttonHeight = 44;

  const installOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(110, 231, 183))
      : undefined;

  const btnInstall = engineOrContext.add([
    engineOrContext.rect(buttonWidth, buttonHeight, { radius: 10 }),
    engineOrContext.pos(cX - buttonWidth / 2 - 12, buttonInstallY),
    engineOrContext.color(16, 185, 129),
    installOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (btnInstall && typeof btnInstall === "object") elements.push(btnInstall);

  const installTextObj = engineOrContext.add([
    engineOrContext.text("Instalar 🚀", {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    engineOrContext.pos(cX - buttonWidth / 2 - 12, buttonInstallY),
    engineOrContext.color(255, 255, 255),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]);
  if (installTextObj && typeof installTextObj === "object") elements.push(installTextObj);

  if (btnInstall && typeof btnInstall === "object") {
    attachButtonHoverEffect(
      engineOrContext as unknown as AnimationEngineContext,
      btnInstall as unknown as AnimationUiObject,
      {
        baseColor: [16, 185, 129],
        hoverColor: [5, 150, 105],
        baseScale: 1.0,
        hoverScale: 1.04,
      }
    );

    const clickableInstall = btnInstall as { onClick?: (callback: () => void) => void };
    if (typeof clickableInstall.onClick === "function") {
      clickableInstall.onClick(async () => {
        if (!canInstallPwa()) {
          close();
          return;
        }
        const installed = await promptPwaInstall();
        if (installed && options.onInstalled) {
          options.onInstalled();
        }
        close();
      });
    }
  }

  // Botão Cancelar / Fechar
  const cancelOutline =
    typeof engineOrContext.outline === "function" && typeof engineOrContext.rgb === "function"
      ? engineOrContext.outline(1.5, engineOrContext.rgb(100, 116, 139))
      : undefined;

  const btnCancel = engineOrContext.add([
    engineOrContext.rect(buttonWidth, buttonHeight, { radius: 10 }),
    engineOrContext.pos(cX + buttonWidth / 2 + 12, buttonInstallY),
    engineOrContext.color(30, 41, 59),
    cancelOutline,
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.area === "function" ? engineOrContext.area() : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(502) : undefined,
  ]);
  if (btnCancel && typeof btnCancel === "object") elements.push(btnCancel);

  const cancelTextObj = engineOrContext.add([
    engineOrContext.text("Agora Não", {
      size: accessibilitySystem.scaleFont(15),
      font: "Outfit",
    }),
    engineOrContext.pos(cX + buttonWidth / 2 + 12, buttonInstallY),
    engineOrContext.color(203, 213, 225),
    typeof engineOrContext.anchor === "function" ? engineOrContext.anchor("center") : undefined,
    typeof engineOrContext.fixed === "function" ? engineOrContext.fixed() : undefined,
    typeof engineOrContext.z === "function" ? engineOrContext.z(503) : undefined,
  ]);
  if (cancelTextObj && typeof cancelTextObj === "object") elements.push(cancelTextObj);

  if (btnCancel && typeof btnCancel === "object") {
    attachButtonHoverEffect(
      engineOrContext as unknown as AnimationEngineContext,
      btnCancel as unknown as AnimationUiObject,
      {
        baseColor: [30, 41, 59],
        hoverColor: [51, 65, 85],
        baseScale: 1.0,
        hoverScale: 1.04,
      }
    );

    const clickableCancel = btnCancel as { onClick?: (callback: () => void) => void };
    if (typeof clickableCancel.onClick === "function") {
      clickableCancel.onClick(close);
    }
  }
}

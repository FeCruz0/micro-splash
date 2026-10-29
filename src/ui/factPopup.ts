/**
 * Pop-up de Fatos Educativos e Conscientização Oceânica (Fase 32.4) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e Tween.
 */

import { type Fact } from "../systems/state";
import { ttsSystem } from "../systems/ttsSystem";
import { FONT_TITLE, FONT_BODY } from "../config";
import { telemetrySystem } from "../systems/telemetrySystem";
import type {
  IRenderEngine,
  IGraphicsNode,
  ITextNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine } from "../engine/adapters/LegacyBridge";
import { createTween, Easings } from "../engine/utils/Tween";

export interface LegacyFactPopupContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(...args: unknown[]): unknown;
  rgb?(red: number, green: number, blue: number): unknown;
  opacity?(alpha: number): unknown;
  outline?(width: number, color: unknown): unknown;
  anchor?(anchorPoint: "center"): unknown;
  fixed?(): unknown;
  z?(zIndex: number): unknown;
  text(content: string, options?: unknown): unknown;
  tween?(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  wait?(duration: number, callback: () => void): void;
  destroy?(target: unknown): void;
  easings?: {
    easeOutBack?: unknown;
    easeInQuad?: unknown;
    [key: string]: unknown;
  };
}

export function showFactPopup(
  engineOrContext: IRenderEngine | LegacyFactPopupContext,
  fact: Fact
): void {
  telemetrySystem.recordFactRead(fact.id);

  const screenW = isRenderEngine(engineOrContext)
    ? engineOrContext.getDimensions().width
    : engineOrContext.width();
  const screenH = isRenderEngine(engineOrContext)
    ? engineOrContext.getDimensions().height
    : engineOrContext.height();

  // Quebra de linha adaptativa em conteúdo educacional (Fase 32.4)
  const contentW = Math.min(500, screenW - 80);
  const width = contentW + 36;
  const height = 118;
  const startY = screenH + 20;
  const targetY = screenH - height - 30;

  // Narração por voz acessível via Web Speech API
  ttsSystem.speak(`${fact.title}. ${fact.description}`);

  if (isRenderEngine(engineOrContext)) {
    const stageRoot = engineOrContext.getStageRoot();
    const ticker = engineOrContext.getTicker();

    // Painel de fundo com cantos arredondados e borda dourada
    const panelNode: IGraphicsNode = engineOrContext.createGraphics("fact_popup_panel");
    panelNode.drawRoundedRect(-width / 2, -height / 2, width, height, 10, {
      fill: { color: [15, 30, 50], alpha: 0.92 },
      stroke: { width: 2, color: [240, 190, 70], alpha: 1 },
    });
    panelNode.setPosition(screenW / 2, startY);
    panelNode.setZIndex(98);
    stageRoot.addChild(panelNode);

    // Ícone pedagógico e título
    const titleNode: ITextNode = engineOrContext.createText(
      `📖 ${fact.title} (${fact.location})`,
      {
        fontFamily: FONT_TITLE,
        fontSize: 14,
        color: [255, 215, 100],
        wordWrapWidth: contentW,
      },
      "fact_popup_title"
    );
    titleNode.setPosition(screenW / 2 - width / 2 + 18, startY - height / 2 + 14);
    titleNode.setZIndex(99);
    stageRoot.addChild(titleNode);

    // Descrição do fato científico
    const descNode: ITextNode = engineOrContext.createText(
      fact.description,
      {
        fontFamily: FONT_BODY,
        fontSize: 12.5,
        color: [220, 235, 255],
        wordWrapWidth: contentW,
        lineSpacing: 4.5,
      },
      "fact_popup_desc"
    );
    descNode.setPosition(screenW / 2 - width / 2 + 18, startY - height / 2 + 42);
    descNode.setZIndex(99);
    stageRoot.addChild(descNode);

    const cleanup = () => {
      ttsSystem.stop();
      try {
        stageRoot.removeChild(panelNode);
        stageRoot.removeChild(titleNode);
        stageRoot.removeChild(descNode);
        panelNode.destroy();
        titleNode.destroy();
        descNode.destroy();
      } catch {}
    };

    // Animação de entrada (Slide UP)
    createTween(
      startY,
      targetY + height / 2,
      0.5,
      (currentY) => {
        panelNode.setPosition(screenW / 2, currentY);
        titleNode.setPosition(screenW / 2 - width / 2 + 18, currentY - height / 2 + 12);
        descNode.setPosition(screenW / 2 - width / 2 + 18, currentY - height / 2 + 38);
      },
      Easings.easeOutBack,
      ticker
    ).promise.then(() => {
      setTimeout(() => {
        createTween(
          targetY + height / 2,
          startY,
          0.5,
          (currentY) => {
            panelNode.setPosition(screenW / 2, currentY);
            titleNode.setPosition(screenW / 2 - width / 2 + 18, currentY - height / 2 + 12);
            descNode.setPosition(screenW / 2 - width / 2 + 18, currentY - height / 2 + 38);
          },
          Easings.easeInQuad,
          ticker
        ).promise.then(() => {
          cleanup();
        });
      }, 5500);
    });

    return;
  }

  // Fallback para contexto legado
  const legacyContext = engineOrContext as LegacyFactPopupContext;

  const resolveRgb = (red: number, green: number, blue: number): unknown => {
    if (typeof legacyContext.rgb === "function") {
      return legacyContext.rgb(red, green, blue);
    }
    return typeof legacyContext.color === "function"
      ? legacyContext.color(red, green, blue)
      : undefined;
  };

  const panel = legacyContext.add([
    typeof legacyContext.rect === "function"
      ? legacyContext.rect(width, height, { radius: 10 })
      : undefined,
    typeof legacyContext.pos === "function" ? legacyContext.pos(screenW / 2, startY) : undefined,
    typeof legacyContext.anchor === "function" ? legacyContext.anchor("center") : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(15, 30, 50) : undefined,
    typeof legacyContext.opacity === "function" ? legacyContext.opacity(0.92) : undefined,
    typeof legacyContext.outline === "function"
      ? legacyContext.outline(2, resolveRgb(240, 190, 70))
      : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(98) : undefined,
  ]) as { pos: { x: number; y: number } };

  const titleText = legacyContext.add([
    typeof legacyContext.text === "function"
      ? legacyContext.text(`📖 ${fact.title} (${fact.location})`, {
          size: 14,
          font: FONT_TITLE,
          width: contentW,
        })
      : undefined,
    typeof legacyContext.pos === "function"
      ? legacyContext.pos(screenW / 2 - width / 2 + 18, startY - height / 2 + 14)
      : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(255, 215, 100) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(99) : undefined,
  ]) as { pos: { x: number; y: number } };

  const descText = legacyContext.add([
    typeof legacyContext.text === "function"
      ? legacyContext.text(fact.description, {
          size: 12.5,
          font: FONT_BODY,
          width: contentW,
          lineSpacing: 4.5,
        })
      : undefined,
    typeof legacyContext.pos === "function"
      ? legacyContext.pos(screenW / 2 - width / 2 + 18, startY - height / 2 + 42)
      : undefined,
    typeof legacyContext.color === "function" ? legacyContext.color(220, 235, 255) : undefined,
    typeof legacyContext.fixed === "function" ? legacyContext.fixed() : undefined,
    typeof legacyContext.z === "function" ? legacyContext.z(99) : undefined,
  ]) as { pos: { x: number; y: number } };

  const easeOut = legacyContext.easings?.easeOutBack ?? ((val: number) => val);
  const easeIn = legacyContext.easings?.easeInQuad ?? ((val: number) => val);

  if (typeof legacyContext.tween === "function") {
    legacyContext
      .tween(
        startY,
        targetY + height / 2,
        0.5,
        (val: number) => {
          if (panel.pos) panel.pos.y = val;
          if (titleText.pos) titleText.pos.y = val - height / 2 + 12;
          if (descText.pos) descText.pos.y = val - height / 2 + 38;
        },
        easeOut
      )
      ?.then(() => {
        const waitFunc =
          typeof legacyContext.wait === "function"
            ? legacyContext.wait
            : (sec: number, cb: () => void) => setTimeout(cb, sec * 1000);

        waitFunc(5.5, () => {
          legacyContext
            .tween?.(
              panel.pos?.y ?? targetY + height / 2,
              startY,
              0.5,
              (val: number) => {
                if (panel.pos) panel.pos.y = val;
                if (titleText.pos) titleText.pos.y = val - height / 2 + 12;
                if (descText.pos) descText.pos.y = val - height / 2 + 38;
              },
              easeIn
            )
            ?.then(() => {
              ttsSystem.stop();
              if (typeof legacyContext.destroy === "function") {
                legacyContext.destroy(panel);
                legacyContext.destroy(titleText);
                legacyContext.destroy(descText);
              }
            });
        });
      });
  }
}

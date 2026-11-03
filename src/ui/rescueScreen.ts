import type { GameState } from "../systems/state";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { formatDualDistance } from "../utils/navigation";
import { addShadowedText, type LegacyShadowedTextContext } from "./textUtils";
import {
  animateModalEntrance,
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "./animationUtils";

export interface ShowRescueEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyRescueUiObject {
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

export interface LegacyRescueEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): LegacyRescueUiObject;
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
  onKeyPress(key: string, callback: () => void): { cancel: () => void };
}

export function showRescueScreen(
  k: ShowRescueEngineContext,
  gameState: GameState,
  onRestart: () => void
) {
  const engine = k as unknown as LegacyRescueEngineContext;
  const finalScore = gameState.calculateFinalScore();
  const highScore = gameState.getHighScore();
  const distance = gameState.getDistance();
  const dualDistStr = formatDualDistance(distance);
  const elementsToDestroy: Array<{ destroy?: () => void } | object> = [];

  // Fundo escuro cinematográfico com transparência suave
  const backdrop = engine.add([
    engine.rect(engine.width(), engine.height()),
    engine.pos(0, 0),
    engine.color(6, 16, 36),
    engine.opacity(0.94),
    engine.fixed(),
    engine.z(200),
  ]);
  elementsToDestroy.push(backdrop);

  // Dimensões compactas e limpas (sem caixa de texto narrativa)
  const cardW = Math.min(800, engine.width() - 32);
  const cardH = Math.min(340, engine.height() - 24);
  const centerX = engine.width() / 2;
  const centerY = engine.height() / 2;
  const cardTop = centerY - cardH / 2;

  // Card do Relatório de Resgate
  const card = engine.add([
    engine.rect(cardW, cardH, { radius: 16 }),
    engine.pos(centerX, centerY),
    engine.color(10, 26, 54),
    engine.outline(2.5, engine.rgb(0, 210, 255)),
    engine.anchor("center"),
    engine.scale(1),
    engine.fixed(),
    engine.z(201),
  ]);
  elementsToDestroy.push(card);
  animateModalEntrance(
    engine as unknown as AnimationEngineContext,
    card as unknown as AnimationUiObject
  );

  // ==========================================
  // ZONA 1: CABEÇALHO DO RESGATE
  // ==========================================
  const badgeY = cardTop + 28;
  const badgeBg = engine.add([
    engine.rect(220, 22, { radius: 11 }),
    engine.pos(centerX, badgeY),
    engine.color(36, 18, 12),
    engine.outline(1.5, engine.rgb(249, 115, 22)),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(202),
  ]);
  elementsToDestroy.push(badgeBg);

  const badgeText = engine.add([
    engine.text("🚨 OPERAÇÃO DE SALVAMENTO", {
      size: accessibilitySystem.scaleFont(11),
      font: "Outfit",
    }),
    engine.pos(centerX, badgeY),
    engine.color(255, 185, 90),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(203),
  ]);
  elementsToDestroy.push(badgeText);

  const titleY = cardTop + 58;
  const titleShadowHandle = addShadowedText(
    engine as unknown as LegacyShadowedTextContext,
    "RESGATE DA GUARDA MARÍTIMA",
    {
      pos: engine.vec2(centerX, titleY),
      size: accessibilitySystem.scaleFont(22.5),
      font: "Outfit",
      color: engine.rgb(255, 222, 50),
      shadowColor: engine.rgb(2, 10, 24),
      anchor: "center",
      z: 203,
    }
  );
  elementsToDestroy.push(titleShadowHandle);

  const subTitleY = cardTop + 86;
  const subTitle = engine.add([
    engine.text("Cuidados Veterinários & Estabilização", {
      size: accessibilitySystem.scaleFont(13.5),
      font: "Inter",
    }),
    engine.pos(centerX, subTitleY),
    engine.color(160, 225, 255),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(203),
  ]);
  elementsToDestroy.push(subTitle);

  // ==========================================
  // ZONA 2: 4 CARDS DE MÉTRICAS VISUAIS
  // ==========================================
  const statY = cardTop + 160;
  const statGap = 12;
  const statW = (cardW - 56 - statGap * 3) / 4;
  const statH = 76;

  const krillCount = gameState.getKrillCount();
  const elapsedSec = Math.round(gameState.getElapsedTime());
  const percentRoute = Math.min(100, Math.round((distance / 30000) * 100));

  const statConfigs = [
    {
      label: "📏 DISTÂNCIA",
      value: dualDistStr,
      sub: `${percentRoute}% da rota`,
      x: centerX - (statW * 1.5 + statGap * 1.5),
      bg: [11, 30, 62] as [number, number, number],
      outline: engine.rgb(56, 189, 248),
      valColor: engine.rgb(255, 255, 255),
      labelColor: engine.rgb(160, 215, 255),
    },
    {
      label: "⭐ PONTUAÇÃO",
      value: `${finalScore.toLocaleString("pt-BR")} pts`,
      sub: finalScore >= highScore && highScore > 0 ? "Novo Recorde! 🎉" : "Desempenho",
      x: centerX - (statW * 0.5 + statGap * 0.5),
      bg: [11, 30, 62] as [number, number, number],
      outline: engine.rgb(250, 204, 21),
      valColor: engine.rgb(255, 225, 90),
      labelColor: engine.rgb(255, 220, 100),
    },
    {
      label: "🏆 RECORDE",
      value: `${highScore.toLocaleString("pt-BR")} pts`,
      sub: "Melhor histórico",
      x: centerX + (statW * 0.5 + statGap * 0.5),
      bg: [18, 38, 72] as [number, number, number],
      outline: engine.rgb(234, 179, 8),
      valColor: engine.rgb(255, 235, 120),
      labelColor: engine.rgb(255, 220, 130),
    },
    {
      label: "🦐 KRILL & TEMPO",
      value: `${krillCount} | ${elapsedSec}s`,
      sub: `${gameState.getTrashCount()} lixo evitado`,
      x: centerX + (statW * 1.5 + statGap * 1.5),
      bg: [11, 30, 62] as [number, number, number],
      outline: engine.rgb(52, 211, 153),
      valColor: engine.rgb(210, 250, 230),
      labelColor: engine.rgb(150, 240, 200),
    },
  ];

  statConfigs.forEach((sc) => {
    const sBox = engine.add([
      engine.rect(statW, statH, { radius: 9 }),
      engine.pos(sc.x, statY),
      engine.color(sc.bg[0], sc.bg[1], sc.bg[2]),
      engine.outline(1.5, sc.outline),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(202),
    ]);
    elementsToDestroy.push(sBox);

    const sLabel = engine.add([
      engine.text(sc.label, {
        size: accessibilitySystem.scaleFont(11),
        font: "Outfit",
      }),
      engine.pos(sc.x, statY - 20),
      engine.color(sc.labelColor),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(203),
    ]);
    elementsToDestroy.push(sLabel);

    const sVal = engine.add([
      engine.text(sc.value, {
        size: accessibilitySystem.scaleFont(15.5),
        font: "Outfit",
      }),
      engine.pos(sc.x, statY + 2),
      engine.color(sc.valColor),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(203),
    ]);
    elementsToDestroy.push(sVal);

    const sSub = engine.add([
      engine.text(sc.sub, {
        size: accessibilitySystem.scaleFont(10.5),
        font: "Inter",
      }),
      engine.pos(sc.x, statY + 22),
      engine.color(140, 175, 215),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(203),
    ]);
    elementsToDestroy.push(sSub);
  });

  // ==========================================
  // ZONA 4: BOTÃO DE AÇÃO & ATALHOS (325 a 470px)
  // ==========================================
  const btnW = 380;
  const btnH = 48;
  const btnY = cardTop + 250;

  const restartButton = engine.add([
    engine.rect(btnW, btnH, { radius: 11 }),
    engine.pos(centerX, btnY),
    engine.color(20, 115, 185),
    engine.outline(2, engine.rgb(0, 230, 255)),
    engine.scale(1),
    engine.anchor("center"),
    engine.area(),
    engine.fixed(),
    engine.z(204),
  ]);
  elementsToDestroy.push(restartButton);

  const btnLabel = engine.add([
    engine.text("Tentar Novamente  [ ENTER ]  🔄", {
      size: accessibilitySystem.scaleFont(16),
      font: "Outfit",
    }),
    engine.pos(centerX, btnY),
    engine.color(255, 255, 255),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(205),
  ]);
  elementsToDestroy.push(btnLabel);

  const hintLabel = engine.add([
    engine.text("Pressione [ENTER] ou [ESPAÇO] para iniciar nova migração", {
      size: accessibilitySystem.scaleFont(11.5),
      font: "Inter",
    }),
    engine.pos(centerX, btnY + 34),
    engine.color(140, 185, 225),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(205),
  ]);
  elementsToDestroy.push(hintLabel);

  let isRestarting = false;
  const triggerRestart = () => {
    if (isRestarting) return;
    isRestarting = true;
    cancelKeyPress.cancel();
    if (cancelSpacePress) cancelSpacePress.cancel();
    elementsToDestroy.forEach((item) => {
      try {
        if ("destroy" in item && typeof item.destroy === "function") {
          item.destroy();
        } else if (typeof engine.destroy === "function") {
          engine.destroy(item);
        }
      } catch {}
    });
    onRestart();
  };

  attachButtonHoverEffect(
    engine as unknown as AnimationEngineContext,
    restartButton as unknown as AnimationUiObject,
    {
      baseColor: [20, 115, 185],
      hoverColor: [32, 150, 235],
      baseScale: 1.0,
      hoverScale: 1.035,
    }
  );
  restartButton.onClick(triggerRestart);

  // Gatilhos de teclado: Enter e Espaço
  const cancelKeyPress = engine.onKeyPress("enter", triggerRestart);
  const cancelSpacePress = engine.onKeyPress("space", triggerRestart);
}

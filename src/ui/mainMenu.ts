import { APP_VERSION } from "../config";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem, type LegacyKeyboardNavContext } from "./keyboardNav";
import { hasSeenOnboarding, showOnboardingModal } from "./onboardingModal";
import { t } from "../i18n/i18n";
import {
  attachButtonHoverEffect,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "./animationUtils";
import { attachPulseEffect, type MotionTargetObject } from "./shared";
import { getKioskIdleTimeoutSeconds } from "../systems/kioskMode";
import { getRandomFloat } from "../utils/random";
import { readLocalStorageWithSchema } from "../utils/storage";
import { HighscoreSchema } from "../schemas/storageSchemas";

export interface ShowMainMenuEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyMainMenuUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  pos?: { x: number; y: number };
  angle?: number;
  destroy?(): void;
  onHoverUpdate?(callback: () => void): unknown;
  onHoverEnd?(callback: () => void): unknown;
  onClick?(callback: () => void): unknown;
  onUpdate?(callback: () => void): unknown;
}

export interface LegacyMainMenuEngineContext {
  width(): number;
  height(): number;
  rand?(min: number, max: number): number;
  dt?(): number;
  add(components?: unknown): LegacyMainMenuUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  circle(radius: number): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top" | "botright"): unknown;
  rotate?(degrees: number): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  area(): unknown;
  scale(factor: number): unknown;
  scale(factor: { x: number; y: number }): unknown;
  scale(factorX: number, factorY: number): unknown;
  text(content: string, options?: unknown): unknown;
  sprite?(id: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  vec2(x: number, y: number): { x: number; y: number };
  onKeyPress(callback: () => void): { cancel: () => void };
  onKeyPress(key: string, callback: () => void): { cancel: () => void };
  onMousePress?(callback: () => void): { cancel?: () => void };
  onMouseMove?(callback: () => void): { cancel?: () => void };
  onUpdate(callback: () => void): { cancel: () => void };
  go(sceneName: string): void;
}

export function createMainMenu(
  k: ShowMainMenuEngineContext,
  onStartMigration: (onClose: () => void) => void,
  onOptions: (onClose: () => void) => void,
  onCodex: (onClose: () => void) => void,
  onLeaderboard?: (onClose: () => void) => void
) {
  const engine = k as unknown as LegacyMainMenuEngineContext;
  // Inicializa contexto de áudio para cliques da interface, mas sem disparar a trilha de migração
  audioSystem.init();
  audioSystem.stopMigrationAudio();

  let isModalOpen = false;

  // Fundo oceânico profundo
  engine.add([
    engine.rect(engine.width(), engine.height()),
    engine.pos(0, 0),
    engine.color(6, 18, 42),
    engine.fixed(),
    engine.z(0),
  ]);

  // Partículas oceânicas temáticas de ambientação (Fase 31.6)
  const particles: LegacyMainMenuUiObject[] = [];
  const screenW = typeof engine.width === "function" ? engine.width() : 640;
  const screenH = typeof engine.height === "function" ? engine.height() : 360;

  // 1. Bolhas translúcidas ascendentes com contorno leve
  for (let i = 0; i < 12; i++) {
    const radius = typeof engine.rand === "function" ? engine.rand(2, 4.5) : 3;
    const p = engine.add([
      engine.circle(radius),
      engine.pos(
        typeof engine.rand === "function" ? engine.rand(0, screenW) : getRandomFloat(0, screenW),
        typeof engine.rand === "function" ? engine.rand(0, screenH) : getRandomFloat(0, screenH)
      ),
      engine.color(70, 205, 255),
      engine.opacity(typeof engine.rand === "function" ? engine.rand(0.25, 0.55) : 0.4),
      engine.fixed(),
      engine.z(1),
      ...(typeof engine.outline === "function"
        ? [engine.outline(1, engine.rgb(180, 240, 255))]
        : []),
    ]);
    const speed = typeof engine.rand === "function" ? engine.rand(14, 28) : 20;
    let time = typeof engine.rand === "function" ? engine.rand(0, 10) : i;

    if (typeof p.onUpdate === "function") {
      p.onUpdate(() => {
        const dt = typeof engine.dt === "function" ? engine.dt() : 0.016;
        time += dt;
        if (p.pos) {
          p.pos.y -= dt * speed;
          p.pos.x += Math.sin(time * 2.2) * 0.4;
          if (p.pos.y < -12) {
            p.pos.y = screenH + 10;
            p.pos.x =
              typeof engine.rand === "function"
                ? engine.rand(0, screenW)
                : getRandomFloat(0, screenW);
          }
        }
      });
    }
    particles.push(p);
  }

  // 2. Plâncton brilhante em ângulo de 45°
  for (let i = 0; i < 12; i++) {
    const pColor = i % 2 === 0 ? engine.rgb(80, 250, 220) : engine.rgb(170, 255, 230);
    const baseOpacity = typeof engine.rand === "function" ? engine.rand(0.2, 0.5) : 0.35;
    const p = engine.add([
      engine.rect(2, 6, { radius: 1 }),
      engine.pos(
        typeof engine.rand === "function" ? engine.rand(0, screenW) : getRandomFloat(0, screenW),
        typeof engine.rand === "function" ? engine.rand(0, screenH) : getRandomFloat(0, screenH)
      ),
      engine.color(pColor),
      engine.opacity(baseOpacity),
      engine.fixed(),
      engine.z(1),
      ...(typeof engine.rotate === "function" ? [engine.rotate(45)] : []),
    ]);
    const speed = typeof engine.rand === "function" ? engine.rand(8, 18) : 12;
    let time = typeof engine.rand === "function" ? engine.rand(0, 10) : i;

    if (typeof p.onUpdate === "function") {
      p.onUpdate(() => {
        const dt = typeof engine.dt === "function" ? engine.dt() : 0.016;
        time += dt;
        if (p.pos) {
          p.pos.y -= dt * speed;
          p.pos.x += Math.cos(time * 1.5) * 0.3;
          p.opacity = Math.max(0.1, Math.min(0.8, baseOpacity + Math.sin(time * 3) * 0.15));
          if (p.pos.y < -12) {
            p.pos.y = screenH + 10;
            p.pos.x =
              typeof engine.rand === "function"
                ? engine.rand(0, screenW)
                : getRandomFloat(0, screenW);
          }
        }
      });
    }
    particles.push(p);
  }

  // 3. Mini-águas-vivas / medusas estilizadas
  for (let i = 0; i < 6; i++) {
    const baseOpacity = typeof engine.rand === "function" ? engine.rand(0.28, 0.55) : 0.4;
    const p = engine.add([
      engine.rect(9, 6, { radius: 3 }),
      engine.pos(
        typeof engine.rand === "function" ? engine.rand(20, screenW - 20) : 50 + i * 90,
        typeof engine.rand === "function" ? engine.rand(50, screenH) : 100 + i * 40
      ),
      engine.color(140, 220, 255),
      engine.opacity(baseOpacity),
      engine.scale(1, 1),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(1),
    ]);
    const speed = typeof engine.rand === "function" ? engine.rand(6, 14) : 10;
    let time = typeof engine.rand === "function" ? engine.rand(0, 10) : i * 1.5;

    if (typeof p.onUpdate === "function") {
      p.onUpdate(() => {
        const dt = typeof engine.dt === "function" ? engine.dt() : 0.016;
        time += dt;
        if (p.pos) {
          p.pos.y -= dt * speed;
          p.pos.x += Math.sin(time * 0.8) * 0.25;
          const pulse = Math.sin(time * 2.8);
          if (typeof engine.scale === "function" && p.scale) {
            p.scale = engine.vec2(1 - pulse * 0.12, 1 + pulse * 0.22);
          }
          if (p.pos.y < -16) {
            p.pos.y = screenH + 15;
            p.pos.x =
              typeof engine.rand === "function"
                ? engine.rand(20, screenW - 20)
                : getRandomFloat(0, screenW);
          }
        }
      });
    }
    particles.push(p);
  }

  // Jubarte cenográfica de fundo navegando no menu principal com nado orgânico
  try {
    if (typeof engine.sprite === "function") {
      const menuWhale = engine.add([
        engine.sprite("baleia", { anim: "idle_swim" }),
        engine.pos(engine.width() / 2, engine.height() / 2 + 10),
        engine.scale(1.15),
        ...(typeof engine.rotate === "function" ? [engine.rotate(0)] : []),
        engine.anchor("center"),
        engine.color(140, 210, 245),
        engine.opacity(0.18),
        engine.fixed(),
        engine.z(2),
      ]);

      let menuWhaleTime = 0;
      if (typeof menuWhale.onUpdate === "function") {
        menuWhale.onUpdate(() => {
          const dt = typeof engine.dt === "function" ? engine.dt() : 0.016;
          menuWhaleTime += dt;
          const idleBreath = Math.sin(menuWhaleTime * 1.4) * 0.016;
          menuWhale.scale = engine.vec2(1.15 * (1 - idleBreath * 0.35), 1.15 * (1 + idleBreath));
          if (menuWhale.pos) {
            menuWhale.pos.y = engine.height() / 2 + 10 + Math.sin(menuWhaleTime * 0.9) * 8;
            menuWhale.pos.x = engine.width() / 2 + Math.sin(menuWhaleTime * 0.35) * 22;
          }
          const swell = Math.sin(menuWhaleTime * 0.8) * 2.2;
          const ripple = Math.sin(menuWhaleTime * 2.1) * 0.6;
          menuWhale.angle = swell + ripple;
        });
      }
    }
  } catch {
    // Ignora silenciosamente caso mock de teste não forneça sprite baleia
  }

  const cX = engine.width() / 2;
  const cY = engine.height() / 2;

  // Sombra do Título
  engine.add([
    engine.text("MICRO SPLASH", { size: 58, font: "Outfit" }),
    engine.pos(cX + 3, cY - 225 + 3),
    engine.color(2, 8, 20),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(10),
  ]);

  // Título Principal
  engine.add([
    engine.text("MICRO SPLASH", { size: 58, font: "Outfit" }),
    engine.pos(cX, cY - 225),
    engine.color(100, 240, 255),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(11),
  ]);

  // Subtítulo
  engine.add([
    engine.text(`${t("menu.subtitle")} 🐋`, {
      size: accessibilitySystem.scaleFont(19),
      font: "Outfit",
    }),
    engine.pos(cX, cY - 170),
    engine.color(195, 235, 255),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(11),
  ]);

  // Placar Recorde com badge elegante e respiro
  const highScore = readLocalStorageWithSchema("micro_splash_highscore", HighscoreSchema, 0);
  if (highScore > 0) {
    const formattedScore = highScore.toLocaleString("pt-BR");
    engine.add([
      engine.rect(340, 26, { radius: 13 }),
      engine.pos(cX, cY - 122),
      engine.color(14, 30, 54),
      engine.outline(1.5, engine.rgb(250, 204, 21)),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(10),
    ]);
    engine.add([
      engine.text(`🏆 Recorde Histórico: ${formattedScore} Eco-Pontos`, {
        size: accessibilitySystem.scaleFont(13.5),
        font: "Outfit",
      }),
      engine.pos(cX, cY - 122),
      engine.color(255, 225, 95),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(11),
    ]);
  }

  // ==========================================
  // BOTÕES PRINCIPAIS DO MENU COM ESPAÇAMENTO GENEROSO
  // ==========================================
  const btnW = 430;
  const btnH = 48;
  const btnGap = 14;
  const startBtnY = cY - 58;

  const menuButtons = [
    {
      label: `🌊 ${t("menu.play")}`,
      y: startBtnY,
      bg: [20, 140, 200] as [number, number, number],
      hover: [35, 175, 240] as [number, number, number],
      outline: engine.rgb(100, 250, 255),
      action: onStartMigration,
    },
    {
      label: "🏆 RANKING TOP 10",
      y: startBtnY + (btnH + btnGap),
      bg: [26, 85, 150] as [number, number, number],
      hover: [40, 120, 200] as [number, number, number],
      outline: engine.rgb(255, 215, 80),
      action: (onClose: () => void) => {
        if (onLeaderboard) onLeaderboard(onClose);
        else onClose();
      },
    },
    {
      label: "📊 IMPACTO COLETIVO",
      y: startBtnY + (btnH + btnGap) * 2,
      bg: [18, 95, 130] as [number, number, number],
      hover: [28, 135, 180] as [number, number, number],
      outline: engine.rgb(0, 230, 255),
      action: async (onClose: () => void) => {
        const { showStatsModal } = await import("./statsModal");
        showStatsModal(engine as unknown as Parameters<typeof showStatsModal>[0], onClose);
      },
    },
    {
      label: `📖 ${t("menu.codex")}`,
      y: startBtnY + (btnH + btnGap) * 3,
      bg: [20, 50, 100] as [number, number, number],
      hover: [30, 80, 145] as [number, number, number],
      outline: engine.rgb(180, 220, 255),
      action: onCodex,
    },
    {
      label: `⚙️ ${t("menu.options")}`,
      y: startBtnY + (btnH + btnGap) * 4,
      bg: [24, 65, 120] as [number, number, number],
      hover: [35, 95, 165] as [number, number, number],
      outline: engine.rgb(80, 180, 240),
      action: onOptions,
    },
  ];

  const focusItems: FocusableItem[] = [];

  menuButtons.forEach((btnData) => {
    const btnPos = engine.vec2(cX, btnData.y);
    const btn = engine.add([
      engine.rect(btnW, btnH, { radius: 11 }),
      engine.pos(btnPos),
      engine.color(btnData.bg[0], btnData.bg[1], btnData.bg[2]),
      engine.outline(2, btnData.outline),
      engine.scale(1),
      engine.anchor("center"),
      engine.area(),
      engine.fixed(),
      engine.z(12),
    ]);

    engine.add([
      engine.text(btnData.label, {
        size: accessibilitySystem.scaleFont(17.5),
        font: "Outfit",
      }),
      engine.pos(btnPos),
      engine.color(255, 255, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(13),
    ]);

    const activate = () => {
      resetIdle();
      if (isModalOpen) return;
      audioSystem.playUiClick();
      isModalOpen = true;
      btnData.action(() => {
        isModalOpen = false;
        resetIdle();
      });
    };

    attachButtonHoverEffect(
      engine as unknown as AnimationEngineContext,
      btn as unknown as AnimationUiObject,
      {
        baseColor: btnData.bg,
        hoverColor: btnData.hover,
        baseScale: 1.0,
        hoverScale: 1.035,
        canInteract: () => !isModalOpen,
      }
    );

    if (menuButtons.indexOf(btnData) === 0) {
      attachPulseEffect(engine, btn as unknown as MotionTargetObject, {
        canInteract: () => !isModalOpen,
      });
    }

    if (typeof btn.onClick === "function") {
      btn.onClick(activate);
    }

    focusItems.push({
      pos: btnPos,
      width: btnW,
      height: btnH,
      onActivate: activate,
    });
  });

  createFocusGroup(engine as unknown as LegacyKeyboardNavContext, {
    items: focusItems,
    initialIndex: 0,
    ringZ: 14,
    isEnabled: () => !isModalOpen,
  });

  // Rodapé Educativo e Institucional
  engine.add([
    engine.text(
      "Inspirado nas pesquisas de conservação do Instituto Baleia Jubarte\nTrilha: 'Aquatic Ambience' (David Wise) & 16-Bit Lofi Ocean",
      {
        size: accessibilitySystem.scaleFont(13.5),
        font: "Inter",
        align: "center",
        lineSpacing: 4.5,
      }
    ),
    engine.pos(engine.width() / 2, engine.height() - 34),
    engine.color(140, 180, 220),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(11),
  ]);

  // Versão da aplicação (Fase 25 - Diagnóstico de Totem & PWA)
  engine.add([
    engine.text(`v${APP_VERSION}`, {
      size: accessibilitySystem.scaleFont(12),
      font: "Inter",
    }),
    engine.pos(engine.width() - 14, engine.height() - 12),
    engine.anchor("botright"),
    engine.color(120, 160, 210),
    engine.opacity(0.65),
    engine.fixed(),
    engine.z(11),
  ]);

  // =========================================================================
  // FASE 10: TIMER DE INATIVIDADE PARA MODO KIOSK (45 SEGUNDOS)
  // =========================================================================
  let idleTime = 0;
  const resetIdle = () => {
    idleTime = 0;
  };

  if (typeof engine.onKeyPress === "function") engine.onKeyPress(resetIdle);
  if (typeof engine.onMousePress === "function") engine.onMousePress(resetIdle);
  if (typeof engine.onMouseMove === "function") engine.onMouseMove(resetIdle);

  const idleTimeout = getKioskIdleTimeoutSeconds();
  const idleLoop = engine.onUpdate(() => {
    if (!isModalOpen && idleTimeout > 0) {
      const dt = typeof engine.dt === "function" ? engine.dt() : 0.016;
      idleTime += dt;
      if (idleTime >= idleTimeout) {
        if (idleLoop && typeof idleLoop.cancel === "function") {
          idleLoop.cancel();
        }
        engine.go("kiosk");
      }
    } else {
      idleTime = 0;
    }
  });

  // Fase 21: Se for a primeira inicialização do jogo (totens ou novos jogadores), exibe o onboarding contextual protegido
  if (!hasSeenOnboarding()) {
    isModalOpen = true;
    showOnboardingModal(engine as unknown as Parameters<typeof showOnboardingModal>[0], () => {
      isModalOpen = false;
      resetIdle();
    });
  }
}

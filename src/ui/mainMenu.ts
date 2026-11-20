import { APP_VERSION } from "../config";
import { audioSystem } from "../systems/audioSystem";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem, type LegacyKeyboardNavContext } from "./keyboardNav";
import { hasSeenOnboarding, showOnboardingModal } from "./onboardingModal";
import { t } from "../i18n/i18n";
import {
  attachInteractiveButtonStates,
  type AnimationEngineContext,
  type AnimationUiObject,
} from "./animationUtils";
import { readLocalStorageWithSchema } from "../utils/storage";
import { HighscoreSchema } from "../schemas/storageSchemas";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveScreenRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import { createMenuOceanBackdrop, type MenuBackdropWhaleAdapter } from "./menuOceanBackdrop";
import {
  createMenuPixelIconNode,
  createMenuPixelTitleNode,
  type MenuPixelIconKind,
} from "./menuPixelIcons";

export interface ShowMainMenuEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): unknown;
}

export interface LegacyMainMenuUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number };
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
  onSceneLeave?(callback: () => void): unknown;
  go(sceneName: string): void;
}

interface MenuButtonDefinition {
  readonly label: string;
  readonly icon: MenuPixelIconKind;
  readonly y: number;
  readonly bg: readonly [number, number, number];
  readonly hover: readonly [number, number, number];
  readonly outline: unknown;
  readonly isPrimary: boolean;
  readonly action: (onClose: () => void) => void;
}

export function createMainMenu(
  k: ShowMainMenuEngineContext,
  onStartMigration: (onClose: () => void) => void,
  onOptions: (onClose: () => void) => void,
  onCodex: (onClose: () => void) => void,
  onLeaderboard?: (onClose: () => void) => void
): () => void {
  const engine = k as unknown as LegacyMainMenuEngineContext;
  audioSystem.init();
  audioSystem.stopMigrationAudio();

  let isModalOpen = false;
  const cleanupCallbacks: Array<() => void> = [];
  const screenW = typeof engine.width === "function" ? engine.width() : 1280;
  const screenH = typeof engine.height === "function" ? engine.height() : 720;
  const resolvedRenderEngine = resolveInitializedRenderEngine(k);

  // Silhueta distante da jubarte (reutilizando sprite oficial "baleia")
  let distantWhaleNode: MenuBackdropWhaleAdapter | null = null;
  try {
    if (typeof engine.sprite === "function") {
      distantWhaleNode = engine.add([
        engine.sprite("baleia", { anim: "idle_swim" }),
        engine.pos(Math.round(screenW * 0.22), Math.round(screenH * 0.22)),
        engine.scale(1.25),
        ...(typeof engine.rotate === "function" ? [engine.rotate(-2.5)] : []),
        engine.anchor("center"),
        engine.color(92, 178, 228),
        engine.opacity(0.32),
        engine.fixed(),
        engine.z(2),
      ]) as MenuBackdropWhaleAdapter;
    }
  } catch {
    distantWhaleNode = null;
  }

  // Fundo oceânico contemplativo e minimalista
  if (resolvedRenderEngine) {
    const backdrop = createMenuOceanBackdrop(
      resolvedRenderEngine,
      screenW,
      screenH,
      distantWhaleNode
    );
    cleanupCallbacks.push(() => backdrop.destroy());
  } else {
    engine.add([
      engine.rect(screenW, screenH),
      engine.pos(0, 0),
      engine.color(6, 18, 42),
      engine.fixed(),
      engine.z(0),
    ]);
  }

  const cX = screenW / 2;
  const cY = screenH / 2;
  const isCompactHeight = screenH < 640;
  const titleOffsetY = isCompactHeight ? -195 : -220;
  const subtitleOffsetY = isCompactHeight ? -145 : -168;
  const recordOffsetY = isCompactHeight ? -105 : -122;
  const startBtnY = cY + (isCompactHeight ? -46 : -56);

  // Título Principal em pixel art 5x7 nativa (sem aspecto sci-fi de Orbitron)
  if (resolvedRenderEngine) {
    const screenContainer = resolveScreenRenderContainer(resolvedRenderEngine);
    const titleNode = createMenuPixelTitleNode(
      resolvedRenderEngine,
      "MICRO SPLASH",
      cX,
      cY + titleOffsetY,
      isCompactHeight ? 4.4 : 5.2,
      11
    );
    screenContainer.addChild(titleNode);
    cleanupCallbacks.push(() => titleNode.destroy());
  } else {
    engine.add([
      engine.text("MICRO SPLASH", { size: isCompactHeight ? 48 : 56, font: "Outfit" }),
      engine.pos(cX + 3, cY + titleOffsetY + 3),
      engine.color(2, 8, 20),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(10),
    ]);

    engine.add([
      engine.text("MICRO SPLASH", { size: isCompactHeight ? 48 : 56, font: "Outfit" }),
      engine.pos(cX, cY + titleOffsetY),
      engine.color(118, 240, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(11),
    ]);
  }

  // Subtítulo com ícone pixel art da jubarte (sem emoji de SO)
  const subtitleText = resolvedRenderEngine ? t("menu.subtitle") : `${t("menu.subtitle")} 🐋`;
  engine.add([
    engine.text(subtitleText, {
      size: accessibilitySystem.scaleFont(isCompactHeight ? 16 : 18),
      font: "Outfit",
    }),
    engine.pos(resolvedRenderEngine ? cX - 12 : cX, cY + subtitleOffsetY),
    engine.color(184, 224, 248),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(11),
  ]);

  if (resolvedRenderEngine) {
    const screenContainer = resolveScreenRenderContainer(resolvedRenderEngine);
    const whaleIcon = createMenuPixelIconNode(
      resolvedRenderEngine,
      "whale",
      cX + 148,
      cY + subtitleOffsetY,
      1.5,
      11
    );
    screenContainer.addChild(whaleIcon);
    cleanupCallbacks.push(() => whaleIcon.destroy());
  }

  // Recorde histórico discreto com filete dourado e ícone pixel art
  const highScore = readLocalStorageWithSchema("micro_splash_highscore", HighscoreSchema, 0);
  if (highScore > 0) {
    const formattedScore = highScore.toLocaleString("pt-BR");
    engine.add([
      engine.rect(340, 26, { radius: 6 }),
      engine.pos(cX, cY + recordOffsetY),
      engine.color(10, 26, 52),
      engine.outline(1.5, engine.rgb(218, 178, 72)),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(10),
    ]);
    engine.add([
      engine.text(`Recorde Histórico: ${formattedScore} Eco-Pontos`, {
        size: accessibilitySystem.scaleFont(13),
        font: "Inter",
      }),
      engine.pos(resolvedRenderEngine ? cX + 10 : cX, cY + recordOffsetY),
      engine.color(248, 218, 118),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(11),
    ]);

    if (resolvedRenderEngine) {
      const screenContainer = resolveScreenRenderContainer(resolvedRenderEngine);
      const trophyBadgeIcon = createMenuPixelIconNode(
        resolvedRenderEngine,
        "trophy",
        cX - 148,
        cY + recordOffsetY,
        1.25,
        12
      );
      screenContainer.addChild(trophyBadgeIcon);
      cleanupCallbacks.push(() => trophyBadgeIcon.destroy());
    }
  }

  // ==========================================
  // BOTÕES PRINCIPAIS EM PIXEL ART MINIMALISTA
  // ==========================================
  const btnW = Math.min(430, Math.max(300, screenW - 48));
  const btnH = 48;
  const btnGap = isCompactHeight ? 10 : 14;

  const menuButtons: readonly MenuButtonDefinition[] = [
    {
      label: t("menu.play"),
      icon: "wave",
      y: startBtnY,
      bg: [18, 118, 152],
      hover: [26, 146, 184],
      outline: engine.rgb(102, 228, 245),
      isPrimary: true,
      action: onStartMigration,
    },
    {
      label: "RANKING TOP 10",
      icon: "trophy",
      y: startBtnY + (btnH + btnGap),
      bg: [14, 44, 82],
      hover: [22, 66, 116],
      outline: engine.rgb(66, 156, 206),
      isPrimary: false,
      action: (onClose) => {
        if (onLeaderboard) onLeaderboard(onClose);
        else onClose();
      },
    },
    {
      label: "IMPACTO COLETIVO",
      icon: "chart",
      y: startBtnY + (btnH + btnGap) * 2,
      bg: [14, 52, 86],
      hover: [22, 76, 120],
      outline: engine.rgb(66, 174, 212),
      isPrimary: false,
      action: async (onClose) => {
        const { showStatsModal } = await import("./statsModal");
        showStatsModal(engine as unknown as Parameters<typeof showStatsModal>[0], onClose);
      },
    },
    {
      label: t("menu.codex"),
      icon: "book",
      y: startBtnY + (btnH + btnGap) * 3,
      bg: [14, 40, 74],
      hover: [22, 62, 108],
      outline: engine.rgb(92, 168, 218),
      isPrimary: false,
      action: onCodex,
    },
    {
      label: t("menu.options"),
      icon: "gear",
      y: startBtnY + (btnH + btnGap) * 4,
      bg: [16, 46, 84],
      hover: [24, 68, 118],
      outline: engine.rgb(74, 156, 204),
      isPrimary: false,
      action: onOptions,
    },
  ];

  const focusItems: FocusableItem[] = [];

  menuButtons.forEach((btnData) => {
    const btnPos = engine.vec2(cX, btnData.y);
    const btn = engine.add([
      engine.rect(btnW, btnH, { radius: 6 }),
      engine.pos(btnPos),
      engine.color(btnData.bg[0], btnData.bg[1], btnData.bg[2]),
      engine.outline(btnData.isPrimary ? 2 : 1.5, btnData.outline),
      engine.scale(1),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(12),
    ]);

    engine.add([
      engine.text(btnData.label, {
        size: accessibilitySystem.scaleFont(16.5),
        font: "Outfit",
      }),
      engine.pos(resolvedRenderEngine ? cX + 12 : cX, btnData.y),
      engine.color(btnData.isPrimary ? 245 : 226, btnData.isPrimary ? 253 : 242, 255),
      engine.anchor("center"),
      engine.fixed(),
      engine.z(13),
    ]);

    if (resolvedRenderEngine) {
      const screenContainer = resolveScreenRenderContainer(resolvedRenderEngine);
      const iconNode = createMenuPixelIconNode(
        resolvedRenderEngine,
        btnData.icon,
        cX - btnW * 0.5 + 30,
        btnData.y,
        1.55,
        13
      );
      screenContainer.addChild(iconNode);
      cleanupCallbacks.push(() => iconNode.destroy());
    }

    const buttonStates = attachInteractiveButtonStates(
      engine as unknown as AnimationEngineContext,
      btn as unknown as AnimationUiObject,
      {
        baseColor: [...btnData.bg] as [number, number, number],
        hoverColor: [...btnData.hover] as [number, number, number],
        focusColor: btnData.isPrimary ? [30, 162, 198] : [26, 98, 146],
        pressedColor: btnData.isPrimary ? [12, 84, 112] : [10, 30, 62],
        baseScale: 1.0,
        hoverScale: 1.015,
        canInteract: () => !isModalOpen,
      }
    );

    const activate = () => {
      if (isModalOpen) return;
      const interactionStart = typeof performance !== "undefined" ? performance.now() : 0;
      buttonStates.onPress();
      const visualFeedbackMs =
        typeof performance !== "undefined" ? performance.now() - interactionStart : 0;
      audioSystem.playUiClick();
      isModalOpen = true;
      void Promise.resolve(
        btnData.action(() => {
          isModalOpen = false;
          buttonStates.onRelease();
        })
      ).then(() => {
        if (typeof window !== "undefined") {
          const modalOpenMs =
            typeof performance !== "undefined" ? performance.now() - interactionStart : 0;
          (window as unknown as Record<string, unknown>).__MICRO_SPLASH_MENU_METRICS = {
            lastLabel: btnData.label,
            visualFeedbackMs: Number(visualFeedbackMs.toFixed(2)),
            modalOpenMs: Number(modalOpenMs.toFixed(2)),
          };
        }
      });
    };

    if (typeof btn.onClick === "function") {
      btn.onClick(activate);
    }

    focusItems.push({
      pos: btnPos,
      width: btnW,
      height: btnH,
      onActivate: activate,
      onFocus: () => buttonStates.onFocus(),
      onBlur: () => buttonStates.onBlur(),
    });
  });

  const focusGroup = createFocusGroup(engine as unknown as LegacyKeyboardNavContext, {
    items: focusItems,
    initialIndex: 0,
    ringZ: 14,
    isEnabled: () => !isModalOpen,
  });
  cleanupCallbacks.push(() => focusGroup.destroy());

  // Rodapé discreto
  engine.add([
    engine.text(
      "Inspirado nas pesquisas de conservação do Instituto Baleia Jubarte\nTrilha: 'Aquatic Ambience' (David Wise) & 16-Bit Lofi Ocean",
      {
        size: accessibilitySystem.scaleFont(12.5),
        font: "Inter",
        align: "center",
        lineSpacing: 4,
      }
    ),
    engine.pos(cX, screenH - 30),
    engine.color(130, 172, 212),
    engine.opacity(0.86),
    engine.anchor("center"),
    engine.fixed(),
    engine.z(11),
  ]);

  engine.add([
    engine.text(`v${APP_VERSION}`, {
      size: accessibilitySystem.scaleFont(11.5),
      font: "Inter",
    }),
    engine.pos(screenW - 14, screenH - 12),
    engine.anchor("botright"),
    engine.color(115, 155, 200),
    engine.opacity(0.6),
    engine.fixed(),
    engine.z(11),
  ]);

  const destroyMenu = () => {
    for (const cleanup of cleanupCallbacks) {
      cleanup();
    }
    cleanupCallbacks.length = 0;
  };

  if (typeof engine.onSceneLeave === "function") {
    engine.onSceneLeave(destroyMenu);
  }

  if (!hasSeenOnboarding()) {
    isModalOpen = true;
    showOnboardingModal(engine as unknown as Parameters<typeof showOnboardingModal>[0], () => {
      isModalOpen = false;
    });
  }

  return destroyMenu;
}

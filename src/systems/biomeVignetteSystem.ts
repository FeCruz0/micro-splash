/**
 * Sistema de Vinhetas Narrativas de Bioma (Fase 20.2) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import type { PlayerController } from "../entities/player";
import { accessibilitySystem } from "./accessibilitySystem";
import type { IRenderEngine, IRenderNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine, type LegacyEngineBridge } from "../engine/adapters/LegacyBridge";
import { createTween, Easings } from "../engine/utils/Tween";

export interface BiomeMilestone {
  triggerDistance: number;
  title: string;
  subtitle: string;
  icon: string;
  accentColor: [number, number, number];
}

export const BIOME_MILESTONES: BiomeMilestone[] = [
  {
    triggerDistance: 5000,
    title: "TRAVESSIA PELÁGICA",
    subtitle: "Onde o krill polar se despede e os primeiros golfinhos guiam a rota.",
    icon: "🌊",
    accentColor: [245, 160, 95], // Pôr do sol dourado
  },
  {
    triggerDistance: 12000,
    title: "COSTA URBANA",
    subtitle: "Luzes e navios na superfície, silêncio e bioluminescência no abismo.",
    icon: "🌃",
    accentColor: [50, 230, 240], // Ciano neon noturno
  },
  {
    triggerDistance: 19000,
    title: "CÂNIOS SUBMARINOS & RESSURGÊNCIA",
    subtitle: "Águas gélidas ricas sobem da fossa oceânica impulsionando a vida.",
    icon: "🌀",
    accentColor: [110, 185, 255], // Azul profundo ressurgência
  },
  {
    triggerDistance: 25000,
    title: "SANTUÁRIO DE ARRAIAL DO CABO",
    subtitle: "Águas cristalinas e quentes: o refúgio seguro para o berçário da vida.",
    icon: "✨",
    accentColor: [255, 220, 100], // Dourado solar radiante
  },
];

/**
 * Função pura para verificação de disparo de vinheta ao cruzar uma fronteira de bioma.
 * Retorna o marco correspondente se a baleia cruzou a distância e o evento ainda não foi disparado.
 */
export function checkBiomeVignetteTrigger(
  lastXPosition: number,
  currentXPosition: number,
  triggeredDistances: Set<number>
): BiomeMilestone | null {
  for (let index = 0; index < BIOME_MILESTONES.length; index++) {
    const milestone = BIOME_MILESTONES[index];
    if (
      !triggeredDistances.has(milestone.triggerDistance) &&
      lastXPosition < milestone.triggerDistance &&
      currentXPosition >= milestone.triggerDistance
    ) {
      return milestone;
    }
  }
  return null;
}

export interface BiomeVignetteSystem {
  destroy: () => void;
  getTriggeredDistances: () => number[];
  showVignetteDirectly: (milestone: BiomeMilestone) => void;
}

/**
 * Inicializa o sistema de Vinhetas Narrativas de Bioma.
 */
export function setupBiomeVignetteSystem(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  playerController: PlayerController
): BiomeVignetteSystem {
  const triggeredDistances = new Set<number>();
  let lastRecordedX = playerController.gameObj?.pos?.x ?? 0;

  if (isRenderEngine(engineOrContext)) {
    const renderEngine = engineOrContext;
    const stageRoot = renderEngine.getStageRoot();
    const { width: screenWidth, height: screenHeight } = renderEngine.getDimensions();

    let activeNodes: IRenderNode[] = [];
    let activeTweenCancel: (() => void) | null = null;
    let activeTimerHandle: ReturnType<typeof setTimeout> | null = null;

    function cleanupActive(): void {
      if (activeTweenCancel) {
        activeTweenCancel();
        activeTweenCancel = null;
      }
      if (activeTimerHandle) {
        clearTimeout(activeTimerHandle);
        activeTimerHandle = null;
      }
      activeNodes.forEach((n) => n.destroy());
      activeNodes = [];
    }

    function displayVignette(milestone: BiomeMilestone): void {
      cleanupActive();

      const bannerWidth = Math.min(560, screenWidth - 40);
      const bannerHeight = 64;
      const bannerYPosition = screenHeight - 85;

      const card = renderEngine.createGraphics("biome_vignette_card");
      card.drawRoundedRect(-bannerWidth / 2, -bannerHeight / 2, bannerWidth, bannerHeight, 10, {
        fill: { color: [8, 16, 30], alpha: 1 },
        stroke: { color: milestone.accentColor, width: 2 },
      });
      card.setPosition(screenWidth / 2, bannerYPosition);
      card.setOpacity(0);
      card.setZIndex(160);
      stageRoot.addChild(card);

      const title = renderEngine.createText(`${milestone.icon} ${milestone.title}`, {
        fontFamily: "Outfit",
        fontSize: 15,
        color: milestone.accentColor,
        align: "center",
      });
      title.setPosition(screenWidth / 2, bannerYPosition - 13);
      title.setOpacity(0);
      title.setZIndex(161);
      stageRoot.addChild(title);

      const subtitle = renderEngine.createText(milestone.subtitle, {
        fontFamily: "Inter",
        fontSize: 12,
        color: [215, 235, 255],
        align: "center",
        wordWrapWidth: bannerWidth - 32,
      });
      subtitle.setPosition(screenWidth / 2, bannerYPosition + 13);
      subtitle.setOpacity(0);
      subtitle.setZIndex(161);
      stageRoot.addChild(subtitle);

      activeNodes = [card, title, subtitle];

      const setAllOpacity = (v: number) => {
        card.setOpacity(v);
        title.setOpacity(v);
        subtitle.setOpacity(v);
      };

      const isReduced = accessibilitySystem.isReducedMotion();

      if (!isReduced) {
        const tweenHandle = createTween(
          0,
          0.92,
          0.35,
          (val: number) => setAllOpacity(val),
          Easings.easeOutQuad,
          renderEngine.getTicker()
        );
        activeTweenCancel = () => tweenHandle.cancel();

        tweenHandle.promise.then(() => {
          activeTimerHandle = setTimeout(() => {
            const fadeHandle = createTween(
              0.92,
              0,
              0.45,
              (val: number) => setAllOpacity(val),
              Easings.easeInQuad,
              renderEngine.getTicker()
            );
            activeTweenCancel = () => fadeHandle.cancel();
            fadeHandle.promise.then(() => {
              cleanupActive();
            });
          }, 2000);
        });
      } else {
        setAllOpacity(0.92);
        activeTimerHandle = setTimeout(() => {
          cleanupActive();
        }, 2200);
      }
    }

    const unregisterTicker = renderEngine.getTicker().add(() => {
      const baleia = playerController.gameObj;
      if (!baleia || !baleia.pos) return;

      const currentX = baleia.pos.x;
      const triggeredMilestone = checkBiomeVignetteTrigger(
        lastRecordedX,
        currentX,
        triggeredDistances
      );

      if (triggeredMilestone) {
        triggeredDistances.add(triggeredMilestone.triggerDistance);
        displayVignette(triggeredMilestone);
      }

      lastRecordedX = currentX;
    });

    return {
      destroy: () => {
        unregisterTicker();
        cleanupActive();
      },
      getTriggeredDistances: () => Array.from(triggeredDistances),
      showVignetteDirectly: (milestone: BiomeMilestone) => {
        displayVignette(milestone);
      },
    };
  }

  // Modo Legacy Kaboom Bridge
  const legacyCtx = engineOrContext as LegacyEngineBridge & {
    width(): number;
    height(): number;
    rect(w: number, h: number, opts?: unknown): unknown;
    pos(x: number, y: number): unknown;
    anchor(a: string): unknown;
    color(...args: unknown[]): unknown;
    rgb(...args: unknown[]): unknown;
    outline(w: number, c: unknown): unknown;
    opacity(o: number): unknown;
    fixed(): unknown;
    z(layer: number): unknown;
    text(txt: string, opts?: unknown): unknown;
    destroy(obj: unknown): void;
    tween?(
      from: number,
      to: number,
      duration: number,
      setter: (v: number) => void,
      ease?: unknown
    ): { then(cb: () => void): void };
    wait?(time: number, cb: () => void): { cancel: () => void };
    easings?: { easeOutQuad?: unknown; easeInQuad?: unknown };
    onUpdate(cb: () => void): { cancel?: () => void } | (() => void);
  };

  interface LegacyObj {
    opacity: number;
    add(comps: unknown[]): unknown;
    destroy?: () => void;
  }

  let activeVignetteContainer: LegacyObj | null = null;
  let activeVignetteTimer: { cancel: () => void } | null = null;

  function displayVignette(milestone: BiomeMilestone): void {
    if (activeVignetteContainer) {
      if (typeof legacyCtx.destroy === "function") {
        legacyCtx.destroy(activeVignetteContainer);
      }
      activeVignetteContainer = null;
    }
    if (activeVignetteTimer) {
      if (typeof activeVignetteTimer.cancel === "function") {
        activeVignetteTimer.cancel();
      }
      activeVignetteTimer = null;
    }

    const screenWidth = legacyCtx.width();
    const screenHeight = legacyCtx.height();
    const bannerWidth = Math.min(560, screenWidth - 40);
    const bannerHeight = 64;
    const bannerYPosition = screenHeight - 85;

    const outlineColor =
      typeof legacyCtx.rgb === "function"
        ? legacyCtx.rgb(...milestone.accentColor)
        : milestone.accentColor;

    const container = legacyCtx.add([
      legacyCtx.rect(bannerWidth, bannerHeight, { radius: 10 }),
      legacyCtx.pos(screenWidth / 2, bannerYPosition),
      legacyCtx.anchor("center"),
      legacyCtx.color(8, 16, 30),
      legacyCtx.outline(2, outlineColor),
      legacyCtx.opacity(0),
      typeof legacyCtx.fixed === "function" ? legacyCtx.fixed() : null,
      legacyCtx.z(160),
      "biome_vignette_card",
    ]) as unknown as LegacyObj;

    if (container && typeof container.add === "function") {
      container.add([
        legacyCtx.text(`${milestone.icon} ${milestone.title}`, {
          size: 15,
          font: "Outfit",
        }),
        legacyCtx.pos(0, -13),
        legacyCtx.anchor("center"),
        legacyCtx.color(...milestone.accentColor),
      ]);

      container.add([
        legacyCtx.text(milestone.subtitle, {
          size: 12,
          font: "Inter",
          width: bannerWidth - 32,
        }),
        legacyCtx.pos(0, 13),
        legacyCtx.anchor("center"),
        legacyCtx.color(215, 235, 255),
      ]);
    }

    activeVignetteContainer = container;
    let isContainerDestroyed = false;

    const safeDestroyContainer = () => {
      if (!isContainerDestroyed) {
        isContainerDestroyed = true;
        if (typeof legacyCtx.destroy === "function") {
          legacyCtx.destroy(container);
        }
        if (activeVignetteContainer === container) {
          activeVignetteContainer = null;
        }
      }
    };

    const isReduced = accessibilitySystem.isReducedMotion();

    if (!isReduced && typeof legacyCtx.tween === "function" && legacyCtx.easings?.easeOutQuad) {
      legacyCtx
        .tween(
          0,
          0.92,
          0.35,
          (opacityValue) => {
            if (!isContainerDestroyed) {
              container.opacity = opacityValue;
            }
          },
          legacyCtx.easings.easeOutQuad
        )
        .then(() => {
          if (typeof legacyCtx.wait === "function") {
            activeVignetteTimer = legacyCtx.wait(2.0, () => {
              if (!isContainerDestroyed && typeof legacyCtx.tween === "function") {
                legacyCtx
                  .tween(
                    0.92,
                    0,
                    0.45,
                    (fadeValue) => {
                      if (!isContainerDestroyed) {
                        container.opacity = fadeValue;
                      }
                    },
                    legacyCtx.easings?.easeInQuad ?? ((t: number) => t)
                  )
                  .then(() => {
                    safeDestroyContainer();
                  });
              }
            });
          }
        });
    } else {
      container.opacity = 0.92;
      if (typeof legacyCtx.wait === "function") {
        activeVignetteTimer = legacyCtx.wait(2.2, () => {
          safeDestroyContainer();
        });
      }
    }
  }

  const updateHandler = legacyCtx.onUpdate(() => {
    const baleia = playerController.gameObj;
    if (!baleia || !baleia.pos) return;

    const currentX = baleia.pos.x;
    const triggeredMilestone = checkBiomeVignetteTrigger(
      lastRecordedX,
      currentX,
      triggeredDistances
    );

    if (triggeredMilestone) {
      triggeredDistances.add(triggeredMilestone.triggerDistance);
      displayVignette(triggeredMilestone);
    }

    lastRecordedX = currentX;
  });

  return {
    destroy: () => {
      if (
        updateHandler &&
        typeof updateHandler === "object" &&
        "cancel" in updateHandler &&
        typeof (updateHandler as { cancel: () => void }).cancel === "function"
      ) {
        (updateHandler as { cancel: () => void }).cancel();
      } else if (typeof updateHandler === "function") {
        (updateHandler as () => void)();
      }
      if (activeVignetteTimer && typeof activeVignetteTimer.cancel === "function") {
        activeVignetteTimer.cancel();
      }
      if (activeVignetteContainer) {
        if (typeof legacyCtx.destroy === "function") {
          legacyCtx.destroy(activeVignetteContainer);
        }
        activeVignetteContainer = null;
      }
    },
    getTriggeredDistances: () => Array.from(triggeredDistances),
    showVignetteDirectly: (milestone: BiomeMilestone) => {
      displayVignette(milestone);
    },
  };
}

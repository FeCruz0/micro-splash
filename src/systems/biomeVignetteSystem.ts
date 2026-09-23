import type { KaboomCtx, GameObj } from "kaboom";
import type { PlayerController } from "../entities/player";

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

/**
 * Inicializa o sistema de Vinhetas Narrativas de Bioma.
 */
export function setupBiomeVignetteSystem(
  k: KaboomCtx,
  playerController: PlayerController
): {
  destroy: () => void;
  getTriggeredDistances: () => number[];
  showVignetteDirectly: (milestone: BiomeMilestone) => void;
} {
  const triggeredDistances = new Set<number>();
  let lastRecordedX = playerController.gameObj?.pos?.x ?? 0;
  let activeVignetteContainer: GameObj | null = null;
  let activeVignetteTimer: any = null;

  function displayVignette(milestone: BiomeMilestone): void {
    if (activeVignetteContainer) {
      if (typeof k.destroy === "function") {
        k.destroy(activeVignetteContainer);
      }
      activeVignetteContainer = null;
    }
    if (activeVignetteTimer) {
      if (typeof activeVignetteTimer.cancel === "function") {
        activeVignetteTimer.cancel();
      }
      activeVignetteTimer = null;
    }

    const screenWidth = k.width();
    const screenHeight = k.height();
    const bannerWidth = Math.min(520, screenWidth - 40);
    const bannerHeight = 58;
    const bannerYPosition = screenHeight - 82;

    const container = k.add([
      k.rect(bannerWidth, bannerHeight, { radius: 8 }),
      k.pos(screenWidth / 2, bannerYPosition),
      k.anchor("center"),
      k.color(8, 16, 30),
      k.outline(1.8, k.rgb(...milestone.accentColor)),
      k.opacity(0),
      k.fixed(),
      k.z(160),
      "biome_vignette_card",
    ]);

    // Ícone e Título principal do bioma
    container.add([
      k.text(`${milestone.icon} ${milestone.title}`, {
        size: 13,
        font: "sans-serif",
      }),
      k.pos(0, -11),
      k.anchor("center"),
      k.color(...milestone.accentColor),
    ]);

    // Frase narrativa poética
    container.add([
      k.text(milestone.subtitle, {
        size: 9.5,
        font: "sans-serif",
        width: bannerWidth - 28,
      }),
      k.pos(0, 11),
      k.anchor("center"),
      k.color(215, 235, 255),
    ]);

    activeVignetteContainer = container;
    let isContainerDestroyed = false;

    const safeDestroyContainer = () => {
      if (!isContainerDestroyed) {
        isContainerDestroyed = true;
        if (typeof k.destroy === "function") {
          k.destroy(container);
        }
        if (activeVignetteContainer === container) {
          activeVignetteContainer = null;
        }
      }
    };

    // Animação: Fade-in suave (0.4s) -> Exibição (2.0s) -> Fade-out suave (0.5s)
    if (typeof k.tween === "function" && k.easings?.easeOutQuad) {
      k.tween(
        0,
        0.92,
        0.4,
        (opacityValue) => {
          if (!isContainerDestroyed) {
            container.opacity = opacityValue;
          }
        },
        k.easings.easeOutQuad
      ).then(() => {
        activeVignetteTimer = k.wait(2.0, () => {
          if (!isContainerDestroyed) {
            k.tween(
              0.92,
              0,
              0.5,
              (fadeValue) => {
                if (!isContainerDestroyed) {
                  container.opacity = fadeValue;
                }
              },
              k.easings.easeInQuad
            ).then(() => {
              safeDestroyContainer();
            });
          }
        });
      });
    } else {
      container.opacity = 0.92;
      activeVignetteTimer = k.wait(2.5, () => {
        safeDestroyContainer();
      });
    }
  }

  const updateHandler = k.onUpdate(() => {
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
      if (typeof updateHandler?.cancel === "function") {
        updateHandler.cancel();
      }
      if (activeVignetteTimer?.cancel) {
        activeVignetteTimer.cancel();
      }
      if (activeVignetteContainer) {
        k.destroy(activeVignetteContainer);
        activeVignetteContainer = null;
      }
    },
    getTriggeredDistances: () => Array.from(triggeredDistances),
    showVignetteDirectly: (milestone: BiomeMilestone) => {
      displayVignette(milestone);
    },
  };
}

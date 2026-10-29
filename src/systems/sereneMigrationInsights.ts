import { FONT_TITLE, FONT_BODY } from "../config";
import { ttsSystem } from "./ttsSystem";
import { accessibilitySystem } from "./accessibilitySystem";

export type InsightCategory = "biology" | "oceanography" | "conservation";

export interface SereneInsight {
  id: string;
  icon: string;
  title: string;
  text: string;
  category: InsightCategory;
}

export interface SereneInsightsUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  pos?: { x: number; y: number };
  destroy?(): void;
}

export interface SereneInsightsEngineContext {
  width?(): number;
  height?(): number;
  add(components?: unknown): SereneInsightsUiObject;
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
  text(content: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  tween(
    from: number,
    to: number,
    duration: number,
    setter: (value: number) => void,
    ease?: unknown
  ): { then(callback: () => void): void };
  wait(duration: number, callback: () => void): void;
  easings: {
    easeOutQuad: unknown;
    easeInQuad: unknown;
    [key: string]: unknown;
  };
}

/**
 * Catálogo imutável dos 10 momentos educativos interativos da Migração Serena.
 */
export const SERENE_MIGRATION_INSIGHTS: Record<string, SereneInsight> = {
  krill_feeding: {
    id: "krill_feeding",
    icon: "🦐",
    title: "Alimentação por Filtração & Krill",
    text: "O krill antártico é a base alimentar das jubartes. Sem dentes, elas usam cerdas de queratina (barbas) para filtrar a água, ingerindo até 2 toneladas diárias no verão polar para estocar energia e resistir a meses de jejum na migração.",
    category: "biology",
  },
  surface_breathing: {
    id: "surface_breathing",
    icon: "💨",
    title: "Respiração Pulmonar & Espiráculo",
    text: "Baleias são mamíferos e respiram ar atmosférico por dois espiráculos no topo da cabeça. Elas conseguem renovar até 90% do oxigênio dos pulmões em um único sopro na superfície, sem engolir água do mar.",
    category: "biology",
  },
  tail_propulsion: {
    id: "tail_propulsion",
    icon: "🌊",
    title: "Propulsão Hidrodinâmica & Flukes",
    text: "A nadadeira caudal (flukes) move-se na vertical impulsionada por poderosos músculos dorsais. Essa hidrodinâmica permite deslocar 40 toneladas através das correntes com extraordinária economia de energia.",
    category: "biology",
  },
  ice_gap_breathing: {
    id: "ice_gap_breathing",
    icon: "❄️",
    title: "Banquisa Polar & Fendas de Gelo",
    text: "Fendas naturais na banquisa polar (polínias) são corredores de ar essenciais no início da rota. As jubartes precisam encontrar essas aberturas antes que o inverno congele totalmente o Oceano Austral.",
    category: "oceanography",
  },
  sonar_communication: {
    id: "sonar_communication",
    icon: "🎵",
    title: "Vocalizações & Canal SOFAR",
    text: "As jubartes emitem cantos e pulsos acústicos que viajam centenas de quilômetros pelo canal SOFAR — camada oceânica onde o som viaja sem dispersão —, permitindo comunicação e orientação submarina.",
    category: "oceanography",
  },
  dolphin_drafting: {
    id: "dolphin_drafting",
    icon: "🐬",
    title: "Nado em Esteira (Drafting)",
    text: "Nadar no rastro ou ao lado de outros cetáceos reduz a resistência da água em até 40%. Essa cooperação hidrodinâmica alivia o esforço físico durante a travessia pelágica de 30.000 metros.",
    category: "biology",
  },
  ocean_trash_threat: {
    id: "ocean_trash_threat",
    icon: "⚠️",
    title: "Ameaça dos Plásticos & Microplásticos",
    text: "Milhões de toneladas de lixo descartadas no continente flutuam nas rotas marinhas. Sacolas plásticas confundem-se com alimento, causando asfixia e fragmentando-se em microplásticos que contaminam a teia trófica.",
    category: "conservation",
  },
  ghost_net_entanglement: {
    id: "ghost_net_entanglement",
    icon: "🕸️",
    title: "Perigo das Redes Fantasmas",
    text: "Redes de pesca perdidas continuam aprisionando animais marinhos por décadas na chamada 'pesca fantasma'. O emalhe acidental é uma das principais ameaças às baleias, impedindo sua subida para respirar.",
    category: "conservation",
  },
  upwelling_currents: {
    id: "upwelling_currents",
    icon: "🌀",
    title: "Ressurgência de Cabo Frio & ACAS",
    text: "Ventos afastam as águas mornas superficiais, permitindo que a Corrente Central do Atlântico Sul (ACAS) — gélida e farta em nutrientes minerais — suba das fossas submarinas, turbinando a vida marinha.",
    category: "oceanography",
  },
  nursery_sanctuary: {
    id: "nursery_sanctuary",
    icon: "✨",
    title: "O Berçário das Jubartes & Reprodução",
    text: "A migração tem um propósito de preservação da vida: as jubartes deixam a Antártida em jejum para dar à luz e amamentar seus filhotes nas águas calmas, quentes e rasas do litoral brasileiro.",
    category: "biology",
  },
};

export class SereneInsightsManager {
  private k: SereneInsightsEngineContext;
  private triggeredInsightIds = new Set<string>();
  private queue: SereneInsight[] = [];
  private isShowing = false;
  private cooldownTimer = 0;
  private isEnabled = true;

  // Nós gráficos ativos
  private currentPanelObj: SereneInsightsUiObject | null = null;
  private currentTitleObj: SereneInsightsUiObject | null = null;
  private currentTextObj: SereneInsightsUiObject | null = null;

  constructor(k: SereneInsightsEngineContext, enabled: boolean = true) {
    this.k = k;
    this.isEnabled = enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public isInsightEnabled(): boolean {
    return this.isEnabled;
  }

  public isTriggered(insightId: string): boolean {
    return this.triggeredInsightIds.has(insightId);
  }

  public getTriggeredCount(): number {
    return this.triggeredInsightIds.size;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Dispara um insight educativo caso o modo sereno esteja ativo e o evento seja inédito na partida.
   * Retorna `true` se foi aceito (ou enfileirado), ou `false` se já foi disparado / desativado.
   */
  public trigger(insightId: string): boolean {
    if (!this.isEnabled) return false;
    if (this.triggeredInsightIds.has(insightId)) return false;

    const insight = SERENE_MIGRATION_INSIGHTS[insightId];
    if (!insight) return false;

    this.triggeredInsightIds.add(insightId);

    if (this.isShowing) {
      this.queue.push(insight);
    } else if (this.cooldownTimer > 0) {
      this.queue.push(insight);
    } else {
      this.displayInsight(insight);
    }
    return true;
  }

  public update(deltaTime: number): void {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaTime);
      if (this.cooldownTimer === 0 && !this.isShowing && this.queue.length > 0) {
        const nextInsight = this.queue.shift();
        if (nextInsight) {
          this.displayInsight(nextInsight);
        }
      }
    }
  }

  private displayInsight(insight: SereneInsight): void {
    this.isShowing = true;
    const k = this.k;

    // Narração por voz acessível via Web Speech API (se habilitado)
    ttsSystem.speak(`${insight.title}. ${insight.text}`);

    const screenWidth = typeof k.width === "function" ? k.width() : 1280;
    const screenHeight = typeof k.height === "function" ? k.height() : 720;

    const contentWidth = Math.min(540, screenWidth - 80);
    const boxWidth = contentWidth + 36;
    const boxHeight = 114;

    const startY = screenHeight + 20;
    const targetY = screenHeight - boxHeight - 24;

    const centerX = screenWidth / 2;

    // Painel glassmorphic elegante com cantos arredondados
    const panel = k.add([
      k.rect(boxWidth, boxHeight, { radius: 10 }),
      k.pos(centerX, startY),
      k.anchor("center"),
      k.color(10, 24, 48),
      k.opacity(0.94),
      k.outline(2, k.rgb(70, 185, 240)),
      k.fixed(),
      k.z(98),
    ]);
    this.currentPanelObj = panel;

    // Título com ícone temático
    const titleObj = k.add([
      k.text(`${insight.icon} ${insight.title}`, {
        size: accessibilitySystem.scaleFont(14),
        font: FONT_TITLE,
        width: contentWidth,
      }),
      k.pos(centerX - boxWidth / 2 + 18, startY - boxHeight / 2 + 14),
      k.color(255, 220, 100),
      k.fixed(),
      k.z(99),
    ]);
    this.currentTitleObj = titleObj;

    // Texto descritivo pedagógico
    const textObj = k.add([
      k.text(insight.text, {
        size: accessibilitySystem.scaleFont(12),
        font: FONT_BODY,
        width: contentWidth,
        lineSpacing: 4.5,
      }),
      k.pos(centerX - boxWidth / 2 + 18, startY - boxHeight / 2 + 40),
      k.color(225, 240, 255),
      k.fixed(),
      k.z(99),
    ]);
    this.currentTextObj = textObj;

    const isReducedMotion = accessibilitySystem.isReducedMotion();
    const transitionDuration = isReducedMotion ? 0.05 : 0.45;

    // Animação de entrada
    k.tween(
      startY,
      targetY + boxHeight / 2,
      transitionDuration,
      (currentY) => {
        if (panel && panel.pos) panel.pos.y = currentY;
        if (titleObj && titleObj.pos) titleObj.pos.y = currentY - boxHeight / 2 + 14;
        if (textObj && textObj.pos) textObj.pos.y = currentY - boxHeight / 2 + 40;
      },
      k.easings.easeOutQuad
    ).then(() => {
      // Tempo de permanência de 5.5s para leitura tranquila
      k.wait(5.5, () => {
        // Animação de saída
        k.tween(
          panel.pos?.y ?? startY,
          startY,
          transitionDuration,
          (currentY) => {
            if (panel && panel.pos) panel.pos.y = currentY;
            if (titleObj && titleObj.pos) titleObj.pos.y = currentY - boxHeight / 2 + 14;
            if (textObj && textObj.pos) textObj.pos.y = currentY - boxHeight / 2 + 40;
          },
          k.easings.easeInQuad
        ).then(() => {
          this.destroyCurrentVisuals();
          this.isShowing = false;
          this.cooldownTimer = 2.0; // Intervalo de respiro antes da próxima caixa
        });
      });
    });
  }

  private destroyCurrentVisuals(): void {
    if (this.currentPanelObj) {
      if (typeof this.k.destroy === "function") this.k.destroy(this.currentPanelObj);
      this.currentPanelObj = null;
    }
    if (this.currentTitleObj) {
      if (typeof this.k.destroy === "function") this.k.destroy(this.currentTitleObj);
      this.currentTitleObj = null;
    }
    if (this.currentTextObj) {
      if (typeof this.k.destroy === "function") this.k.destroy(this.currentTextObj);
      this.currentTextObj = null;
    }
  }

  public destroy(): void {
    ttsSystem.stop();
    this.destroyCurrentVisuals();
    this.queue = [];
    this.isShowing = false;
  }
}

let activeSereneInsightsManager: SereneInsightsManager | null = null;

export function getSereneInsightsManager(): SereneInsightsManager | null {
  return activeSereneInsightsManager;
}

export function setupSereneInsightsSystem(
  k: SereneInsightsEngineContext,
  enabled: boolean = true
): SereneInsightsManager | null {
  if (activeSereneInsightsManager) {
    activeSereneInsightsManager.destroy();
    activeSereneInsightsManager = null;
  }

  if (!enabled) {
    return null;
  }

  activeSereneInsightsManager = new SereneInsightsManager(k, enabled);
  return activeSereneInsightsManager;
}

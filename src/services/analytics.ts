/**
 * Serviço de Métricas e Analytics Ético (Plausible)
 * 100% sem cookies, compatível com a LGPD e políticas escolares de privacidade.
 * Respeita cabeçalho Do Not Track (DNT) e opera em modo silencioso/offline quando não configurado.
 */

export interface AnalyticsEventPayload {
  name: string;
  url?: string;
  domain?: string;
  props?: Record<string, string | number | boolean>;
}

class AnalyticsService {
  private domain: string;
  private apiHost: string;
  private eventLog: AnalyticsEventPayload[] = [];
  private enabled: boolean;

  constructor() {
    const metaEnv =
      typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as any);
    this.domain = metaEnv.VITE_PLAUSIBLE_DOMAIN || "";
    this.apiHost = metaEnv.VITE_PLAUSIBLE_API_HOST || "https://plausible.io";

    // Respeita doNotTrack se presente no navegador
    const isDnt =
      typeof navigator !== "undefined" &&
      (navigator.doNotTrack === "1" || (navigator as any).msDoNotTrack === "1");

    this.enabled = Boolean(this.domain) && !isDnt;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public getDomain(): string {
    return this.domain;
  }

  public setDomain(domain: string): void {
    this.domain = domain;
    this.enabled = Boolean(domain);
  }

  public getEventLog(): AnalyticsEventPayload[] {
    return [...this.eventLog];
  }

  public clearLog(): void {
    this.eventLog = [];
  }

  /**
   * Envia evento customizado para o Plausible
   */
  public async trackEvent(
    name: string,
    props?: Record<string, string | number | boolean>
  ): Promise<boolean> {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "http://localhost/";

    const payload: AnalyticsEventPayload = {
      name,
      url: currentUrl,
      domain: this.domain,
      props,
    };

    // Salva sempre no buffer em memória para diagnóstico e testes
    this.eventLog.push(payload);

    if (!this.enabled || !this.domain) {
      // Modo Mock / Silencioso para offline ou ambiente sem configuração
      return false;
    }

    try {
      const endpoint = `${this.apiHost.replace(/\/+$/, "")}/api/event`;
      const body = JSON.stringify(payload);

      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const beaconSuccess = navigator.sendBeacon(
          endpoint,
          new Blob([body], { type: "application/json" })
        );
        if (beaconSuccess) return true;
      }

      if (typeof fetch === "function") {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body,
          keepalive: true,
        });
        return true;
      }
    } catch {
      // Falhas de rede em modo offline nunca devem propagar erro para o jogo
    }

    return false;
  }

  // --- Métodos de Conveniência Tipados ---

  public trackGameStarted(difficulty?: string, soundtrack?: string): Promise<boolean> {
    return this.trackEvent("game_started", {
      difficulty: difficulty || "padrao",
      soundtrack: soundtrack || "dinamica",
    });
  }

  public trackMigrationCompleted(metrics: {
    score: number;
    distance: number;
    timeSeconds: number;
    biomesPassed: number;
  }): Promise<boolean> {
    return this.trackEvent("migration_completed", {
      score: metrics.score,
      distance: metrics.distance,
      timeSeconds: Math.round(metrics.timeSeconds),
      biomesPassed: metrics.biomesPassed,
    });
  }

  public trackMigrationAbandoned(metrics: {
    distance: number;
    cause: "oxygen" | "quit" | "net";
    biome: string;
  }): Promise<boolean> {
    return this.trackEvent("migration_abandoned", {
      distance: Math.round(metrics.distance),
      cause: metrics.cause,
      biome: metrics.biome,
    });
  }

  public trackBiomeReached(biomeName: string, distance: number): Promise<boolean> {
    return this.trackEvent("biome_reached", {
      biomeName,
      distance: Math.round(distance),
    });
  }

  public trackQuizTaken(metrics: {
    questionId: string;
    isCorrect: boolean;
    biome: string;
  }): Promise<boolean> {
    return this.trackEvent("quiz_taken", {
      questionId: metrics.questionId,
      isCorrect: metrics.isCorrect,
      biome: metrics.biome,
    });
  }

  public trackBreachTriggered(metrics: { distance: number; speed: number }): Promise<boolean> {
    return this.trackEvent("breach_triggered", {
      distance: Math.round(metrics.distance),
      speed: Math.round(metrics.speed),
    });
  }
}

export const analytics = new AnalyticsService();

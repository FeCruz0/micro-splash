import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  SERENE_MIGRATION_INSIGHTS,
  SereneInsightsManager,
  setupSereneInsightsSystem,
  getSereneInsightsManager,
} from "../../src/systems/sereneMigrationInsights";

function createMockKaboom() {
  const objects: any[] = [];
  return {
    width: () => 1280,
    height: () => 720,
    rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
    pos: (x: number, y: number) => ({ x, y }),
    color: (r: number, g: number, b: number) => ({ r, g, b }),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    opacity: (o: number) => ({ opacity: o }),
    outline: (w: number, c: any) => ({ width: w, color: c }),
    fixed: () => ({ fixed: true }),
    anchor: (a: string) => ({ anchor: a }),
    z: (z: number) => ({ z }),
    text: (t: string, opts?: any) => ({ text: t, opts }),
    tween: () => ({
      then: (cb: () => void) => {
        cb();
        return { catch: () => {} };
      },
    }),
    wait: (_time: number, cb: () => void) => {
      cb();
    },
    easings: {
      easeOutQuad: (t: number) => t,
      easeInQuad: (t: number) => t,
    },
    destroy: (obj: any) => {
      const idx = objects.indexOf(obj);
      if (idx !== -1) objects.splice(idx, 1);
    },
    add: (comps: any[]) => {
      const obj: any = { pos: { x: 0, y: 0 }, comps };
      objects.push(obj);
      return obj;
    },
    _objects: objects,
  } as any;
}

describe("Fase 55: Diário de Bordo da Migração Serena (Educação Ambiental & Narrativa Interativa)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("55.1: Catálogo Pedagógico dos 10 Momentos da Migração", () => {
    it("deve conter exatamente os 10 eventos essenciais da jornada migratória", () => {
      const expectedIds = [
        "krill_feeding",
        "surface_breathing",
        "tail_propulsion",
        "ice_gap_breathing",
        "sonar_communication",
        "dolphin_drafting",
        "ocean_trash_threat",
        "ghost_net_entanglement",
        "upwelling_currents",
        "nursery_sanctuary",
      ];

      expect(Object.keys(SERENE_MIGRATION_INSIGHTS)).toHaveLength(10);
      for (const expectedId of expectedIds) {
        expect(SERENE_MIGRATION_INSIGHTS[expectedId]).toBeDefined();
      }
    });

    it("cada insight possui ícone, título, texto substantivo e categoria válida", () => {
      const validCategories = new Set(["biology", "oceanography", "conservation"]);

      for (const insight of Object.values(SERENE_MIGRATION_INSIGHTS)) {
        expect(insight.id).toBeTruthy();
        expect(insight.icon.length).toBeGreaterThan(0);
        expect(insight.title.length).toBeGreaterThan(5);
        expect(insight.text.length).toBeGreaterThan(50);
        expect(validCategories.has(insight.category)).toBe(true);
      }
    });

    it("o insight de krill explica filtração, biomassa e acúmulo de energia para jejum", () => {
      const krillInsight = SERENE_MIGRATION_INSIGHTS.krill_feeding;
      expect(krillInsight.text.toLowerCase()).toContain("filtra");
      expect(krillInsight.text.toLowerCase()).toContain("krill");
      expect(krillInsight.text.toLowerCase()).toContain("jejum");
    });
  });

  describe("55.2: Gerenciador de Exibição e Fila Anti-Sobreposição (SereneInsightsManager)", () => {
    it("não dispara insights se estiver desabilitado (modo arcade/padrão)", () => {
      const mockK = createMockKaboom();
      const manager = new SereneInsightsManager(mockK, false);

      const triggered = manager.trigger("krill_feeding");
      expect(triggered).toBe(false);
      expect(manager.isTriggered("krill_feeding")).toBe(false);
      expect(manager.getTriggeredCount()).toBe(0);
    });

    it("dispara apenas uma vez por ID em toda a partida (single-fire)", () => {
      const mockK = createMockKaboom();
      const manager = new SereneInsightsManager(mockK, true);

      // Primeiro disparo com sucesso
      const firstTry = manager.trigger("krill_feeding");
      expect(firstTry).toBe(true);
      expect(manager.isTriggered("krill_feeding")).toBe(true);
      expect(manager.getTriggeredCount()).toBe(1);

      // Tentativas subsequentes do mesmo evento são ignoradas
      const secondTry = manager.trigger("krill_feeding");
      expect(secondTry).toBe(false);
      expect(manager.getTriggeredCount()).toBe(1);
    });

    it("enfileira mensagens secundárias sem sobreposição na tela", () => {
      const mockK = createMockKaboom();
      // Criar mock que NÃO executa wait callback imediatamente para simular mensagem ativa na tela
      const pendingWaitCallbacks: Array<() => void> = [];
      mockK.wait = (_time: number, cb: () => void) => {
        pendingWaitCallbacks.push(cb);
      };

      const manager = new SereneInsightsManager(mockK, true);

      // Dispara o primeiro insight (fica ativo na tela)
      const first = manager.trigger("krill_feeding");
      expect(first).toBe(true);
      expect(manager.getQueueLength()).toBe(0);

      // Dispara o segundo insight enquanto o primeiro está ativo (entra na fila)
      const second = manager.trigger("surface_breathing");
      expect(second).toBe(true);
      expect(manager.getQueueLength()).toBe(1);

      // Finaliza o primeiro insight simulando o término da espera
      if (pendingWaitCallbacks.length > 0) {
        pendingWaitCallbacks[0]();
      }

      // Atualiza o manager com deltaTime para consumir o cooldown
      manager.update(3.0);
      expect(manager.getQueueLength()).toBe(0);
      expect(manager.isTriggered("surface_breathing")).toBe(true);
    });

    it("limpa recursos e fila ao destruir o gerenciador", () => {
      const mockK = createMockKaboom();
      mockK.wait = () => {};
      const manager = new SereneInsightsManager(mockK, true);

      manager.trigger("krill_feeding");
      manager.trigger("surface_breathing");
      expect(manager.getQueueLength()).toBe(1);

      manager.destroy();
      expect(manager.getQueueLength()).toBe(0);
    });
  });

  describe("55.3: Factory e Integração Global (setupSereneInsightsSystem)", () => {
    it("retorna null e desativa o sistema quando enabled for false", () => {
      const mockK = createMockKaboom();
      const manager = setupSereneInsightsSystem(mockK, false);

      expect(manager).toBeNull();
      expect(getSereneInsightsManager()).toBeNull();
    });

    it("cria e registra instância única quando enabled for true", () => {
      const mockK = createMockKaboom();
      const manager = setupSereneInsightsSystem(mockK, true);

      expect(manager).not.toBeNull();
      expect(getSereneInsightsManager()).toBe(manager);
      expect(manager?.isInsightEnabled()).toBe(true);

      manager?.destroy();
    });
  });
});

import { describe, it, expect } from "vitest";
import { GAME_CONFIG } from "../src/config";
import {
  isBioluminescenceActive,
  calculateBioluminescentColor,
  setupBioluminescenceSystem,
} from "../src/systems/bioluminescenceSystem";
import {
  BIOME_MILESTONES,
  checkBiomeVignetteTrigger,
  setupBiomeVignetteSystem,
} from "../src/systems/biomeVignetteSystem";
import {
  CINEMATIC_EVENTS,
  checkCinematicEvent,
  setupCinematicCameraSystem,
} from "../src/systems/cinematicCameraSystem";
import {
  calculateShadowMetrics,
  setupDynamicShadowSystem,
} from "../src/systems/dynamicShadowSystem";
import { createDebugDistanceUI } from "../src/ui/debugDistance";

function createMockKaboom() {
  const updateCallbacks: Array<() => void> = [];
  const objects: any[] = [];
  let currentCamScale = 1.0;

  const mock: any = {
    width: () => 640,
    height: () => 360,
    camPos: () => ({ x: 12500, y: 180 }),
    camScale: (val?: any) => {
      if (typeof val === "number") currentCamScale = val;
      else if (val && typeof val.x === "number") currentCamScale = val.x;
      return currentCamScale;
    },
    rand: (min: number, _max?: number) => min,
    vec2: (x: number, y: number) => ({ x, y }),
    deg2rad: (deg: number) => (deg * Math.PI) / 180,
    circle: (r: number) => ({ type: "circle", r }),
    rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
    rotate: (a: number) => ({ type: "rotate", a }),
    scale: (x: number, y: number) => ({ type: "scale", x, y }),
    text: (content: string, opts?: any) => ({ type: "text", content, opts }),
    pos: (x: number, y: number) => ({ x, y }),
    color: (r: number, g: number, b: number) => ({ r, g, b }),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    opacity: (o: number) => ({ opacity: o }),
    outline: (width: number, color: any) => ({ width, color }),
    anchor: (anchor: string) => ({ anchor }),
    fixed: () => ({ fixed: true }),
    z: (val: number) => ({ z: val }),
    dt: () => 0.016,
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    wait: (_time: number, _callback: () => void) => {
      return { cancel: () => {} };
    },
    tween: (_from: number, _to: number, _duration: number, _setter: (val: number) => void) => {
      return {
        then: (cb: () => void) => {
          cb();
          return { catch: () => {} };
        },
      };
    },
    easings: {
      easeOutQuad: (t: number) => t,
      easeInQuad: (t: number) => t,
      easeInOutQuad: (t: number) => t,
    },
    onUpdate: (cb: () => void) => {
      updateCallbacks.push(cb);
      return { cancel: () => {} };
    },
    destroy: (obj: any) => {
      obj.isDestroyed = () => true;
    },
    add: (components: any[]) => {
      const obj: any = {
        pos: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        opacity: 1,
        angle: 0,
        hidden: false,
        components,
        isDestroyed: () => false,
        add: (childComps: any[]) => {
          const childObj: any = { pos: { x: 0, y: 0 }, components: childComps };
          return childObj;
        },
      };
      objects.push(obj);
      return obj;
    },
    _triggerUpdates: () => {
      for (const cb of updateCallbacks) cb();
    },
  };

  return mock;
}

function createMockPlayer(x: number, y: number, speedX = 120, speedY = 0) {
  return {
    gameObj: {
      pos: { x, y },
      angle: 0,
    },
    getSpeed: () => ({
      x: speedX,
      y: speedY,
      len: () => Math.sqrt(speedX * speedX + speedY * speedY),
    }),
    isFacingRight: () => true,
    isFainting: () => false,
  } as any;
}

describe("FASE 20: Imersão Visual Avançada", () => {
  describe("20.1: Esteira de Bioluminescência Procedural", () => {
    it("ativa bioluminescência estritamente na Costa Urbana (12.000m a 19.000m) sob a água e em movimento", () => {
      // 1. Condições perfeitas na Costa Urbana
      expect(isBioluminescenceActive(15000, GAME_CONFIG.SEA_LEVEL + 50, 100)).toBe(true);

      // 2. Fora da Costa Urbana (Antártica ou Travessia)
      expect(isBioluminescenceActive(4000, GAME_CONFIG.SEA_LEVEL + 50, 100)).toBe(false);
      expect(isBioluminescenceActive(11990, GAME_CONFIG.SEA_LEVEL + 50, 100)).toBe(false);
      expect(isBioluminescenceActive(19050, GAME_CONFIG.SEA_LEVEL + 50, 100)).toBe(false);

      // 3. Fora d'água (no ar, salto acima de SEA_LEVEL)
      expect(isBioluminescenceActive(15000, GAME_CONFIG.SEA_LEVEL - 20, 100)).toBe(false);

      // 4. Parada ou velocidade quase nula (< 15)
      expect(isBioluminescenceActive(15000, GAME_CONFIG.SEA_LEVEL + 50, 5)).toBe(false);
    });

    it("calcula tons azul-esverdeados característicos de plânctons marinhos", () => {
      for (let phase = 0; phase < Math.PI * 2; phase += 0.5) {
        const [r, g, b] = calculateBioluminescentColor(phase);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(60); // Baixo vermelho (tons frios)
        expect(g).toBeGreaterThanOrEqual(200); // Alto verde esmeralda
        expect(b).toBeGreaterThanOrEqual(210); // Alto azul ciano
      }
    });

    it("inicializa e gerencia partículas no pool sem falhas", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayer(15000, GAME_CONFIG.SEA_LEVEL + 40, 120, 0);

      const system = setupBioluminescenceSystem(mockKaboom, mockPlayer);
      expect(system.getActiveParticleCount()).toBe(0);

      // Simula frame de update dentro da Costa Urbana com nado
      mockKaboom._triggerUpdates();
      // O sistema deve ter alocado e estar operando partículas
      expect(typeof system.getActiveParticleCount()).toBe("number");

      system.destroy();
    });
  });

  describe("20.2: Vinhetas Narrativas de Transição de Bioma", () => {
    it("possui 4 marcos com conteúdo narrativo e cores específicas para cada bioma", () => {
      expect(BIOME_MILESTONES.length).toBe(4);
      expect(BIOME_MILESTONES.map((m) => m.triggerDistance)).toEqual([5000, 12000, 19000, 25000]);

      BIOME_MILESTONES.forEach((m) => {
        expect(m.title.length).toBeGreaterThan(0);
        expect(m.subtitle.length).toBeGreaterThan(15);
        expect(m.icon.length).toBeGreaterThan(0);
        expect(m.accentColor.length).toBe(3);
      });
    });

    it("dispara a vinheta uma única vez ao ultrapassar a fronteira de distância", () => {
      const triggered = new Set<number>();

      // Cruzando o marco de 5.000m
      const milestone1 = checkBiomeVignetteTrigger(4950, 5020, triggered);
      expect(milestone1).not.toBeNull();
      expect(milestone1?.title).toContain("TRAVESSIA PELÁGICA");

      if (milestone1) triggered.add(milestone1.triggerDistance);

      // Próximo passo no mesmo bioma: não deve disparar novamente
      const repeatCheck = checkBiomeVignetteTrigger(5020, 5100, triggered);
      expect(repeatCheck).toBeNull();

      // Cruzando o marco de 12.000m (Costa Urbana)
      const milestone2 = checkBiomeVignetteTrigger(11980, 12050, triggered);
      expect(milestone2).not.toBeNull();
      expect(milestone2?.title).toContain("COSTA URBANA");

      if (milestone2) triggered.add(milestone2.triggerDistance);

      // Cruzando o marco de 19.000m (Cânions & Ressurgência)
      const milestone3 = checkBiomeVignetteTrigger(18950, 19020, triggered);
      expect(milestone3).not.toBeNull();
      expect(milestone3?.title).toContain("CÂNIOS");

      if (milestone3) triggered.add(milestone3.triggerDistance);

      // Cruzando o marco de 25.000m (Arraial do Cabo)
      const milestone4 = checkBiomeVignetteTrigger(24900, 25050, triggered);
      expect(milestone4).not.toBeNull();
      expect(milestone4?.title).toContain("ARRAIAL DO CABO");
    });

    it("inicializa o sistema de vinhetas e expõe API de exibição direta", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayer(4900, 180);

      const system = setupBiomeVignetteSystem(mockKaboom, mockPlayer);
      expect(system.getTriggeredDistances()).toEqual([]);

      system.showVignetteDirectly(BIOME_MILESTONES[0]);
      system.destroy();
    });
  });

  describe("20.3: Zoom Cinematográfico em Eventos Narrativos", () => {
    it("possui 3 momentos narrativos dramáticos mapeados ao longo da jornada", () => {
      expect(CINEMATIC_EVENTS.length).toBe(3);
      const eventIds = CINEMATIC_EVENTS.map((e) => e.id);
      expect(eventIds).toContain("dolphin_encounter");
      expect(eventIds).toContain("first_ship_noise");
      expect(eventIds).toContain("upwelling_surge");
    });

    it("dispara evento cinemático na coordenada correta e respeita idempotência", () => {
      const triggered = new Set<string>();

      // Fora de qualquer evento
      expect(checkCinematicEvent(2000, triggered)).toBeNull();

      // No primeiro encontro com golfinhos (6.500m)
      const dolphinEvent = checkCinematicEvent(6520, triggered);
      expect(dolphinEvent).not.toBeNull();
      expect(dolphinEvent?.id).toBe("dolphin_encounter");
      expect(dolphinEvent?.targetScale).toBeGreaterThan(1.15);

      if (dolphinEvent) triggered.add(dolphinEvent.id);

      // Já disparado: não repete
      expect(checkCinematicEvent(6520, triggered)).toBeNull();

      // No ruído de cargueiro (13.000m)
      const shipEvent = checkCinematicEvent(13020, triggered);
      expect(shipEvent?.id).toBe("first_ship_noise");

      // Na ressurgência (19.000m)
      const upwellingEvent = checkCinematicEvent(19040, triggered);
      expect(upwellingEvent?.id).toBe("upwelling_surge");
    });

    it("inicializa o sistema e restaura escala da câmera em destroy", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayer(6520, 180);

      const system = setupCinematicCameraSystem(mockKaboom, mockPlayer);
      expect(system.isZoomActive()).toBe(false);

      system.triggerEventDirectly(CINEMATIC_EVENTS[0]);
      system.destroy();
      expect(mockKaboom.camScale()).toBe(1.0);
    });
  });

  describe("20.4: Sombras Dinâmicas Projetadas sob a Jubarte", () => {
    it("não exibe mancha de sombra flutuando ao lado da baleia em meia-água", () => {
      const midWaterMetrics = calculateShadowMetrics(
        1200,
        GAME_CONFIG.SEA_LEVEL + 50,
        0,
        GAME_CONFIG.SEA_LEVEL,
        120,
        360
      );

      // Opacidade zerada em meia-água para eliminar a sensação de 'mancha que segue a baleia'
      expect(midWaterMetrics.opacity).toBe(0);
      expect(midWaterMetrics.isCastOnWaterSurface).toBe(false);
    });

    it("projeta a sombra exclusivamente na superfície da água quando a baleia salta no ar (Breach)", () => {
      // 40px acima da linha d'água
      const airMetrics = calculateShadowMetrics(
        1200,
        GAME_CONFIG.SEA_LEVEL - 40,
        -25,
        GAME_CONFIG.SEA_LEVEL,
        120,
        360
      );

      expect(airMetrics.isCastOnWaterSurface).toBe(true);
      expect(airMetrics.positionY).toBe(GAME_CONFIG.SEA_LEVEL + 3);
      expect(airMetrics.angle).toBe(0); // Deforma na lâmina d'água horizontal
      expect(airMetrics.opacity).toBeGreaterThan(0.15);
    });

    it("projeta sombra sobre o leito marinho quando próxima ao fundo", () => {
      // Perto do leito oceânico (360 - 44 = 316)
      const nearFloorMetrics = calculateShadowMetrics(
        1200,
        280,
        10,
        GAME_CONFIG.SEA_LEVEL,
        120,
        360
      );

      expect(nearFloorMetrics.isCastOnWaterSurface).toBe(false);
      expect(nearFloorMetrics.opacity).toBeGreaterThan(0.1);
      expect(nearFloorMetrics.positionY).toBe(360 - 44);
    });

    it("inicializa o sistema de sombra e atualiza a geometria na superfície", () => {
      const mockKaboom = createMockKaboom();
      // Baleia saltando no ar (Y = SEA_LEVEL - 30)
      const mockPlayer = createMockPlayer(1200, GAME_CONFIG.SEA_LEVEL - 30);

      const system = setupDynamicShadowSystem(mockKaboom, mockPlayer);
      const shadow = system.getShadowObject();
      expect(shadow).toBeDefined();

      mockKaboom._triggerUpdates();
      expect(shadow.opacity).toBeGreaterThan(0);
      expect(shadow.pos.y).toBe(GAME_CONFIG.SEA_LEVEL + 3);

      system.destroy();
    });
  });

  describe("Painel de Telemetria e Diagnóstico F3 (debugDistanceUI)", () => {
    it("permanece oculto por padrão na gameplay comum para preservar a imersão visual", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayer(1500, 180);

      const debugUI = createDebugDistanceUI(mockKaboom, mockPlayer);
      expect(debugUI.isVisible()).toBe(false);
      expect(debugUI.getContainer().hidden).toBe(true);

      debugUI.destroy();
    });

    it("alterna visibilidade ao pressionar F3 (toggle)", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayer(1500, 180);

      const debugUI = createDebugDistanceUI(mockKaboom, mockPlayer);

      // Pressiona F3 pela 1ª vez: abre painel
      const isOpen = debugUI.toggle();
      expect(isOpen).toBe(true);
      expect(debugUI.isVisible()).toBe(true);
      expect(debugUI.getContainer().hidden).toBe(false);

      // Pressiona F3 pela 2ª vez: fecha painel
      const isClosed = debugUI.toggle();
      expect(isClosed).toBe(false);
      expect(debugUI.isVisible()).toBe(false);
      expect(debugUI.getContainer().hidden).toBe(true);

      debugUI.destroy();
    });

    it("atualiza métricas de telemetria e diagnóstico sem erro quando ativo", () => {
      const mockKaboom = createMockKaboom();
      const mockPlayer = createMockPlayer(5000, 180, 150, -10);

      const debugUI = createDebugDistanceUI(mockKaboom, mockPlayer);
      debugUI.setVisible(true);

      expect(() => {
        debugUI.update(5000, {
          fps: 60,
          entities: 42,
          activeParticles: 15,
          totalParticles: 140,
          activeModules: "Esteira Bioluminescente",
        });
      }).not.toThrow();

      debugUI.destroy();
    });
  });
});

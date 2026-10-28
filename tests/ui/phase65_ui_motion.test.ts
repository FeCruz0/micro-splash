import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GameObj, KaboomCtx, Vec2 } from "kaboom";
import { attachPulseEffect, staggerElementsEntrance } from "../../src/ui/shared/motion";
import { animateScoreCounter } from "../../src/ui/shared/scoreCounter";
import { UI_FONTS, UI_TYPOGRAPHY_SCALE } from "../../src/ui/theme";
import { calculateBiomeTransitionFactor } from "../../src/systems/biomeTransitionSystem";
import { checkBiomeVignetteTrigger, BIOME_MILESTONES } from "../../src/systems/biomeVignetteSystem";

// Helper para mock de Vec2
function createMockVec2(x: number, y: number): Vec2 {
  return {
    x,
    y,
    clone: () => createMockVec2(x, y),
    add: () => createMockVec2(x, y),
    sub: () => createMockVec2(x, y),
    scale: () => createMockVec2(x, y),
    dist: () => 0,
    len: () => 0,
    unit: () => createMockVec2(x, y),
    normal: () => createMockVec2(x, y),
    dot: () => 0,
    angle: () => 0,
    lerp: () => createMockVec2(x, y),
    isZero: () => x === 0 && y === 0,
    toFixed: () => `(${x}, ${y})`,
    eq: () => false,
  } as unknown as Vec2;
}

// Helper para criar mock de GameObj
function createMockGameObj(initialProps: Record<string, unknown> = {}): GameObj {
  const updateCallbacks: Array<() => void> = [];
  const hoverUpdateCallbacks: Array<() => void> = [];
  const hoverEndCallbacks: Array<() => void> = [];

  const obj: Record<string, unknown> = {
    pos: createMockVec2(0, 0),
    scale: createMockVec2(1, 1),
    opacity: 1,
    color: { r: 255, g: 255, b: 255 },
    text: "",
    isHoveringState: false,
    onUpdate: (cb: () => void) => {
      updateCallbacks.push(cb);
      return {
        cancel: () => {
          const idx = updateCallbacks.indexOf(cb);
          if (idx !== -1) updateCallbacks.splice(idx, 1);
        },
      };
    },
    onHoverUpdate: (cb: () => void) => {
      hoverUpdateCallbacks.push(cb);
      return { cancel: () => {} };
    },
    onHoverEnd: (cb: () => void) => {
      hoverEndCallbacks.push(cb);
      return { cancel: () => {} };
    },
    isHovering: () => obj.isHoveringState === true,
    _triggerUpdate: () => {
      updateCallbacks.forEach((cb) => cb());
    },
    ...initialProps,
  };

  return obj as unknown as GameObj;
}

// Helper para criar mock de KaboomCtx
function createMockKaboom(overrides: Record<string, unknown> = {}): KaboomCtx {
  const timers: Array<{ delay: number; cb: () => void }> = [];

  const mockKaboom: Record<string, unknown> = {
    vec2: (x: number, y: number) => createMockVec2(x, y),
    rgb: (r: number, g: number, b: number) =>
      ({ r, g, b, isRgb: true }) as unknown as ReturnType<KaboomCtx["rgb"]>,
    dt: () => 0.016,
    wait: (delay: number, cb: () => void) => {
      timers.push({ delay, cb });
      // Executa de forma síncrona nos testes para validação determinística
      cb();
      return {
        cancel: () => {},
        paused: false,
      };
    },
    tween: (from: number, to: number, _dur: number, setValue: (val: number) => void) => {
      setValue(from);
      setValue(to);
      return Promise.resolve();
    },
    easings: {
      easeOutQuad: (t: number) => t * (2 - t),
      easeInQuad: (t: number) => t * t,
      linear: (t: number) => t,
    },
    destroy: vi.fn(),
    ...overrides,
  };

  return mockKaboom as unknown as KaboomCtx;
}

describe("Fase 65: Polimento Visual, Micro-Interações & Dinâmica Oceânica (Motion & Juice)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("65.1: Micro-Animações Sutis em Ações Principais (attachPulseEffect & staggerElementsEntrance)", () => {
    it("attachPulseEffect varia a escala do botão em ciclo harmônico suave", () => {
      const currentDt = 0.35; // 1/4 do ciclo de 1.4s (seno em pico: ~1.025)
      const k = createMockKaboom({
        dt: () => currentDt,
      });

      const btn = createMockGameObj();
      const handle = attachPulseEffect(k, btn, {
        maxScale: 1.025,
        duration: 1.4,
        isReducedMotion: () => false,
      });

      // Dispara 1 frame de atualização
      (btn as unknown as { _triggerUpdate: () => void })._triggerUpdate();

      // Escala deve ter expandido acima de 1.0
      expect(btn.scale.x).toBeGreaterThan(1.0);
      expect(btn.scale.x).toBeLessThanOrEqual(1.025);

      handle.destroy();
      expect(btn.scale.x).toBe(1.0);
    });

    it("attachPulseEffect respeita imediatamente preferência de movimento reduzido mantendo escala 1.0", () => {
      const k = createMockKaboom({
        dt: () => 0.35,
      });

      const btn = createMockGameObj();
      attachPulseEffect(k, btn, {
        maxScale: 1.025,
        duration: 1.4,
        isReducedMotion: () => true, // Movimento reduzido ativo
      });

      (btn as unknown as { _triggerUpdate: () => void })._triggerUpdate();

      // A escala deve permanecer inalterada em 1.0
      expect(btn.scale.x).toBe(1.0);
      expect(btn.scale.y).toBe(1.0);
    });

    it("attachPulseEffect pausa a oscilação durante o hover do ponteiro", () => {
      const k = createMockKaboom({
        dt: () => 0.35,
      });

      const btn = createMockGameObj({ isHoveringState: true });
      btn.scale = createMockVec2(1.04, 1.04); // Escala de hover aplicada externamente

      attachPulseEffect(k, btn, {
        maxScale: 1.025,
        duration: 1.4,
        pauseOnHover: true,
        isReducedMotion: () => false,
      });

      (btn as unknown as { _triggerUpdate: () => void })._triggerUpdate();

      // Não sobrescreve a escala do hover
      expect(btn.scale.x).toBe(1.04);
    });

    it("staggerElementsEntrance escalona posições e opacidades chamando onComplete", async () => {
      const k = createMockKaboom();
      const el1 = createMockGameObj({ pos: createMockVec2(100, 100), opacity: 1 });
      const el2 = createMockGameObj({ pos: createMockVec2(100, 200), opacity: 1 });
      const el3 = createMockGameObj({ pos: createMockVec2(100, 300), opacity: 1 });

      const onComplete = vi.fn();

      staggerElementsEntrance(k, [el1, el2, el3], {
        staggerDelayMs: 40,
        startOffsetY: 12,
        isReducedMotion: () => false,
        onComplete,
      });

      // Aguarda o ciclo de resolução de microtasks do Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(el1.pos.y).toBe(100);
      expect(el2.pos.y).toBe(200);
      expect(el3.pos.y).toBe(300);
      expect(el1.opacity).toBe(1);
    });

    it("staggerElementsEntrance com movimento reduzido aplica estado final instantâneo", () => {
      const k = createMockKaboom();
      const el1 = createMockGameObj({ pos: createMockVec2(50, 50), opacity: 0.5 });
      const onComplete = vi.fn();

      staggerElementsEntrance(k, [el1], {
        isReducedMotion: () => true,
        onComplete,
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(el1.opacity).toBe(1);
      expect(el1.pos.y).toBe(50);
    });

    it("staggerElementsEntrance lida com lista vazia sem erros", () => {
      const k = createMockKaboom();
      const onComplete = vi.fn();

      staggerElementsEntrance(k, [], { onComplete });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("65.2: Contador Progressivo de Pontuação (animateScoreCounter)", () => {
    it("interpola pontuação com formatação pt-BR até o alvo final", async () => {
      const k = createMockKaboom({
        tween: (from: number, to: number, _dur: number, setValue: (val: number) => void) => {
          setValue(from);
          setValue(1250);
          setValue(to);
          return Promise.resolve();
        },
      });

      const textObj = createMockGameObj({ text: "" });
      const onComplete = vi.fn();

      animateScoreCounter(k, textObj, 2500, {
        prefix: "⭐ ",
        suffix: " pts",
        isReducedMotion: () => false,
        onComplete,
      });

      // Aguarda microtask
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(textObj.text).toBe("⭐ 2.500 pts");
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("atribui pontuação final diretamente sem animação quando movimento reduzido está ativo", () => {
      const k = createMockKaboom();
      const textObj = createMockGameObj({ text: "" });
      const onComplete = vi.fn();

      animateScoreCounter(k, textObj, 4200, {
        prefix: "🏆 ",
        suffix: " pts",
        isReducedMotion: () => true,
        onComplete,
      });

      expect(textObj.text).toBe("🏆 4.200 pts");
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("permite interrupção antecipada via handle.stop() fixando o valor alvo", () => {
      let capturedSetValue: ((val: number) => void) | null = null;
      const k = createMockKaboom({
        tween: (_from: number, _to: number, _dur: number, setValue: (val: number) => void) => {
          capturedSetValue = setValue;
          return new Promise(() => {}); // Não resolve imediatamente
        },
      });

      const textObj = createMockGameObj({ text: "" });
      const handle = animateScoreCounter(k, textObj, 3000, {
        prefix: "Pts: ",
        isReducedMotion: () => false,
      });

      if (capturedSetValue) {
        (capturedSetValue as (val: number) => void)(500);
      }
      expect(textObj.text).toBe("Pts: 500");

      handle.stop();
      expect(textObj.text).toBe("Pts: 3.000");
    });
  });

  describe("65.3: Padronização da Escala Tipográfica (UI_FONTS & UI_TYPOGRAPHY_SCALE)", () => {
    it("garante que os degraus canônicos da escala tipográfica são estritamente crescentes", () => {
      expect(UI_TYPOGRAPHY_SCALE.caption).toBe(11);
      expect(UI_TYPOGRAPHY_SCALE.body).toBe(14);
      expect(UI_TYPOGRAPHY_SCALE.label).toBe(16);
      expect(UI_TYPOGRAPHY_SCALE.h2).toBe(18);
      expect(UI_TYPOGRAPHY_SCALE.h1).toBe(24);
      expect(UI_TYPOGRAPHY_SCALE.display).toBe(44);

      expect(UI_TYPOGRAPHY_SCALE.caption).toBeLessThan(UI_TYPOGRAPHY_SCALE.body);
      expect(UI_TYPOGRAPHY_SCALE.body).toBeLessThan(UI_TYPOGRAPHY_SCALE.label);
      expect(UI_TYPOGRAPHY_SCALE.label).toBeLessThan(UI_TYPOGRAPHY_SCALE.h2);
      expect(UI_TYPOGRAPHY_SCALE.h2).toBeLessThan(UI_TYPOGRAPHY_SCALE.h1);
      expect(UI_TYPOGRAPHY_SCALE.h1).toBeLessThan(UI_TYPOGRAPHY_SCALE.display);
    });

    it("fornece famílias de fontes canônicas padronizadas", () => {
      expect(UI_FONTS.title).toBe("Orbitron");
      expect(UI_FONTS.body).toBe("Inter");
      expect(UI_FONTS.accent).toBe("Outfit");
    });
  });

  describe("65.4: Transições Fluidas de Bioma em Tempo Real", () => {
    it("calculateBiomeTransitionFactor atenua com smoothstep nas bordas de 300m", () => {
      const startX = 5000;
      const endX = 12000;

      // Fora do bioma
      expect(calculateBiomeTransitionFactor(4999, startX, endX)).toBe(0);
      expect(calculateBiomeTransitionFactor(12001, startX, endX)).toBe(0);

      // No início exato da transição (0%)
      expect(calculateBiomeTransitionFactor(5000, startX, endX)).toBe(0);

      // Meio da transição de entrada (150m dentro de 300m = t=0.5 -> smoothstep=0.5)
      expect(calculateBiomeTransitionFactor(5150, startX, endX)).toBeCloseTo(0.5, 2);

      // Plenamente dentro do bioma (fora das zonas de 300m das pontas)
      expect(calculateBiomeTransitionFactor(7000, startX, endX)).toBe(1.0);

      // Meio da transição de saída (11850m = 150m da borda final = t=0.5 -> smoothstep=0.5)
      expect(calculateBiomeTransitionFactor(11850, startX, endX)).toBeCloseTo(0.5, 2);

      // No fim exato da transição (0%)
      expect(calculateBiomeTransitionFactor(12000, startX, endX)).toBe(0);
    });

    it("checkBiomeVignetteTrigger dispara marco exatamente quando a distância é cruzada e não repete", () => {
      const triggered = new Set<number>();

      // Antes do marco de 5000m
      const m1 = checkBiomeVignetteTrigger(4800, 4950, triggered);
      expect(m1).toBeNull();

      // Cruzando o marco de 5000m
      const m2 = checkBiomeVignetteTrigger(4950, 5020, triggered);
      expect(m2).not.toBeNull();
      expect(m2?.triggerDistance).toBe(5000);
      expect(m2?.title).toBe("TRAVESSIA PELÁGICA");

      // Registra que foi disparado
      if (m2) triggered.add(m2.triggerDistance);

      // Próximo frame além dos 5000m: não deve disparar novamente
      const m3 = checkBiomeVignetteTrigger(5020, 5100, triggered);
      expect(m3).toBeNull();
    });

    it("contém todos os 4 marcos de bioma devidamente configurados", () => {
      expect(BIOME_MILESTONES).toHaveLength(4);
      expect(BIOME_MILESTONES[0].triggerDistance).toBe(5000);
      expect(BIOME_MILESTONES[1].triggerDistance).toBe(12000);
      expect(BIOME_MILESTONES[2].triggerDistance).toBe(19000);
      expect(BIOME_MILESTONES[3].triggerDistance).toBe(25000);
    });
  });
});

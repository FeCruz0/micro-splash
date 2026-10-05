import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  animateModalEntrance,
  attachButtonHoverEffect,
  createOceanConfetti,
  createResolutionTransitionOverlay,
  OCEAN_CONFETTI_PALETTE,
} from "../src/ui/animationUtils";
import { createRescueBoat } from "../src/entities/boat";
import { getCodexBiomeInfo } from "../src/ui/codexScreen";

describe("Fase 34: Telas de Jogo — Visual & Polimento de UI", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("34.1 — Animação Universal de Entrada em Modais", () => {
    it("configura escala e opacidade iniciais e aciona tween com easeOutBack", () => {
      const mockCard: any = {
        scale: { x: 1, y: 1 },
        opacity: 1,
      };

      const tweenFn = vi.fn().mockReturnValue({
        then: (cb: () => void) => {
          cb();
          return { then: vi.fn() };
        },
      });

      const mockK: any = {
        vec2: (x: number, y: number) => ({ x, y }),
        tween: tweenFn,
        easings: { easeOutBack: vi.fn() },
      };

      const onComplete = vi.fn();
      animateModalEntrance(mockK, mockCard, {
        duration: 0.25,
        startScale: 0.85,
        onComplete,
      });

      expect(mockCard.scale).toEqual({ x: 1, y: 1 });
      expect(mockCard.opacity).toBe(1);
      expect(tweenFn).toHaveBeenCalledWith(
        0.85,
        1.0,
        0.25,
        expect.any(Function),
        mockK.easings.easeOutBack
      );
      expect(onComplete).toHaveBeenCalled();
    });

    it("executa fallback seguro se tween não estiver disponível no motor", () => {
      const mockCard: any = { scale: { x: 0.5, y: 0.5 }, opacity: 0 };
      const mockK: any = {
        vec2: (x: number, y: number) => ({ x, y }),
      };

      const onComplete = vi.fn();
      animateModalEntrance(mockK, mockCard, { onComplete });

      expect(mockCard.scale).toEqual({ x: 1, y: 1 });
      expect(mockCard.opacity).toBe(1);
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe("34.3 — Barco de Resgate com Detalhes Náuticos", () => {
    it("instancia o barco de resgate com mastro, flâmula oscilante, faixas de salvamento e vigias", () => {
      const children: any[] = [];
      const boatObj: any = {
        pos: { x: 100, y: 200 },
        add: vi.fn((child) => {
          children.push(child);
          return {
            add: vi.fn((subChild) => {
              children.push(subChild);
              return subChild;
            }),
            ...child,
          };
        }),
        onUpdate: vi.fn(),
      };

      const mockK: any = {
        rect: vi.fn((w, h, opt) => ({ type: "rect", w, h, opt })),
        pos: vi.fn((x, y) => ({ pos: { x, y } })),
        color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
        outline: vi.fn((w, c) => ({ outline: { w, c } })),
        anchor: vi.fn((a) => ({ anchor: a })),
        z: vi.fn((z) => ({ z })),
        rotate: vi.fn((ang) => ({ rotate: ang })),
        circle: vi.fn((rad) => ({ type: "circle", rad })),
        opacity: vi.fn((op) => ({ opacity: op })),
        rgb: vi.fn((r, g, b) => [r, g, b]),
        add: vi.fn(() => boatObj),
        dt: vi.fn(() => 0.016),
      };

      const targetPos = { x: 500, y: 100 } as any;
      const boat = createRescueBoat(mockK, targetPos);

      expect(boat).toBeDefined();
      expect(mockK.rect).toHaveBeenCalledWith(94, 30, expect.any(Object));
      expect(boatObj.add).toHaveBeenCalled();

      // Verifica presença de faixa laranja de salvamento marinho ([249, 115, 22])
      expect(mockK.color).toHaveBeenCalledWith(249, 115, 22);
      // Verifica presença do mastro vertical (rect 3, 40)
      expect(mockK.rect).toHaveBeenCalledWith(3, 40);
      // Verifica presença da bandeira verde (color 34, 197, 94)
      expect(mockK.color).toHaveBeenCalledWith(34, 197, 94);
    });
  });

  describe("34.4 — Chuva de Confetes Oceânicos de Celebração", () => {
    it("gera confetes utilizando a paleta de cores oceânicas", () => {
      expect(OCEAN_CONFETTI_PALETTE.length).toBeGreaterThanOrEqual(4);
      // Verifica presença de turquesa (#22d3ee) e ouro (#facc15)
      expect(OCEAN_CONFETTI_PALETTE).toContainEqual([34, 211, 238]);
      expect(OCEAN_CONFETTI_PALETTE).toContainEqual([250, 204, 21]);

      const addedComps: any[] = [];
      const mockK: any = {
        width: () => 1920,
        height: () => 1080,
        rand: (min: number, max: number) => (min + max) / 2,
        rect: vi.fn((w, h) => ({ type: "rect", w, h })),
        pos: vi.fn((x, y) => ({ pos: { x, y } })),
        color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
        anchor: vi.fn((a) => ({ anchor: a })),
        rotate: vi.fn((ang) => ({ angle: ang })),
        opacity: vi.fn((op) => ({ opacity: op })),
        fixed: vi.fn(() => ({ fixed: true })),
        z: vi.fn((z) => ({ z })),
        dt: () => 0.016,
        destroy: vi.fn(),
        add: vi.fn(() => {
          const comp = { onUpdate: vi.fn(), pos: { x: 100, y: 100 }, angle: 0 };
          addedComps.push(comp);
          return comp;
        }),
      };

      const confetti = createOceanConfetti(mockK, 25);
      expect(confetti.length).toBe(25);
      expect(mockK.add).toHaveBeenCalledTimes(25);
    });
  });

  describe("34.5 — Padronização de Estados de Hover", () => {
    it("aplica iluminação de cor, escala ampliada (1.04) e cursor pointer no hover", () => {
      let hoverUpdateCb: (() => void) | null = null;
      let hoverEndCb: (() => void) | null = null;

      const mockBtn: any = {
        scale: { x: 1, y: 1 },
        color: [20, 50, 100],
        onHoverUpdate: vi.fn((cb) => {
          hoverUpdateCb = cb;
        }),
        onHoverEnd: vi.fn((cb) => {
          hoverEndCb = cb;
        }),
      };

      const mockK: any = {
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => [r, g, b],
      };

      attachButtonHoverEffect(mockK, mockBtn, {
        baseColor: [20, 50, 100],
        hoverColor: [40, 80, 160],
        baseScale: 1.0,
        hoverScale: 1.04,
      });

      expect(mockBtn.onHoverUpdate).toHaveBeenCalled();
      expect(mockBtn.onHoverEnd).toHaveBeenCalled();

      // Dispara hover
      hoverUpdateCb!();
      expect(mockBtn.scale).toEqual({ x: 1.04, y: 1.04 });
      expect(mockBtn.color).toEqual([40, 80, 160]);

      // Dispara saída de hover
      hoverEndCb!();
      expect(mockBtn.scale).toEqual({ x: 1.0, y: 1.0 });
      expect(mockBtn.color).toEqual([20, 50, 100]);
    });
  });

  describe("34.7 — Diário de Bordo & Progresso por Bioma", () => {
    it("associa corretamente as distâncias de rota aos 5 biomas oceânicos", () => {
      const polar = getCodexBiomeInfo(600);
      expect(polar.name).toBe("Oceano Antártico");
      expect(polar.emoji).toBe("❄️");

      const pelagic = getCodexBiomeInfo(8800);
      expect(pelagic.name).toBe("Travessia Pelágica");
      expect(pelagic.emoji).toBe("🌊");

      const urban = getCodexBiomeInfo(15000);
      expect(urban.name).toBe("Costa Urbana");
      expect(urban.emoji).toBe("🏭");

      const canyon = getCodexBiomeInfo(21000);
      expect(canyon.name).toBe("Cânions & Ressurgência");
      expect(canyon.emoji).toBe("🌀");

      const sanctuary = getCodexBiomeInfo(28000);
      expect(sanctuary.name).toBe("Santuário de Arraial");
      expect(sanctuary.emoji).toBe("☀️");
    });
  });

  describe("34.8 — Transição Suave ao Mudar de Resolução", () => {
    it("renderiza overlay preto em z: 9999 e aciona callback de recarregamento", () => {
      const mockOverlay: any = { opacity: 0 };
      const tweenFn = vi.fn().mockReturnValue({
        then: (cb: () => void) => {
          cb();
          return { then: vi.fn() };
        },
      });

      const mockK: any = {
        width: () => 1920,
        height: () => 1080,
        rect: vi.fn(),
        pos: vi.fn(),
        color: vi.fn(),
        opacity: vi.fn(),
        fixed: vi.fn(),
        z: vi.fn((val) => ({ z: val })),
        tween: tweenFn,
        easings: { easeOutQuad: vi.fn() },
        add: vi.fn(() => mockOverlay),
      };

      const onReload = vi.fn();
      createResolutionTransitionOverlay(mockK, onReload, 0.3);

      expect(mockK.z).toHaveBeenCalledWith(9999);
      expect(tweenFn).toHaveBeenCalledWith(
        0,
        1,
        0.3,
        expect.any(Function),
        mockK.easings.easeOutQuad
      );
      expect(onReload).toHaveBeenCalled();
    });
  });

  describe("34.9 — Correção Visual e Gramatical da Tela de Resgate", () => {
    it("renderiza o card de resgate com proporções ampliadas, gramática de cardume correta e 3 chips de estatísticas", async () => {
      const { showRescueScreen } = await import("../src/ui/rescueScreen");

      const addedObjects: any[] = [];
      const mockK: any = {
        width: () => 1920,
        height: () => 1080,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => [r, g, b],
        rect: vi.fn((w, h, opt) => ({ type: "rect", w, h, opt })),
        pos: vi.fn((x, y) => ({ pos: { x, y } })),
        color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
        outline: vi.fn((w, c) => ({ outline: { w, c } })),
        opacity: vi.fn((op) => ({ opacity: op })),
        anchor: vi.fn((a) => ({ anchor: a })),
        fixed: vi.fn(() => ({ fixed: true })),
        scale: vi.fn((s) => ({ scale: s })),
        z: vi.fn((z) => ({ z })),
        text: vi.fn((t, opt) => ({ text: t, opt })),
        area: vi.fn(() => ({ area: true })),
        tween: vi.fn().mockReturnValue({ then: (cb: any) => cb() }),
        easings: { easeOutBack: vi.fn() },
        onKeyPress: vi.fn(() => ({ cancel: vi.fn() })),
        add: vi.fn((obj) => {
          const comp = {
            ...obj,
            onHoverUpdate: vi.fn(),
            onHoverEnd: vi.fn(),
            onClick: vi.fn(),
            destroy: vi.fn(),
          };
          addedObjects.push(comp);
          return comp;
        }),
      };

      const mockState: any = {
        calculateFinalScore: () => 1979,
        getHighScore: () => 32395,
        getDistance: () => 4879,
        getKrillCount: () => 1,
        getTrashCount: () => 0,
        getElapsedTime: () => 92,
      };

      showRescueScreen(mockK, mockState, vi.fn());

      // 1. Verifica dimensões compactas e elegantes (800x340)
      expect(mockK.rect).toHaveBeenCalledWith(800, 340, { radius: 16 });

      // 2. Verifica título com tipografia Outfit e badge oficial
      expect(mockK.text).toHaveBeenCalledWith(
        "🚨 OPERAÇÃO DE SALVAMENTO",
        expect.objectContaining({ font: "Outfit" })
      );
      expect(mockK.text).toHaveBeenCalledWith(
        "RESGATE DA GUARDA MARÍTIMA",
        expect.objectContaining({ font: "Outfit" })
      );

      // 3. Garante que a caixa de texto com descrição narrativa foi completamente removida
      const textCalls = mockK.text.mock.calls.map((c: any) => c[0]);
      const hasNarrative = textCalls.some(
        (t: string) => typeof t === "string" && (t.includes("filtrou") || t.includes("exaustão"))
      );
      expect(hasNarrative).toBe(false);

      // 4. Verifica os 4 cards visuais de métricas focadas
      expect(mockK.text).toHaveBeenCalledWith(
        "📏 DISTÂNCIA",
        expect.objectContaining({ font: "Outfit" })
      );
      expect(mockK.text).toHaveBeenCalledWith(
        "⭐ PONTUAÇÃO",
        expect.objectContaining({ font: "Outfit" })
      );
      expect(mockK.text).toHaveBeenCalledWith(
        "1.979 pts",
        expect.objectContaining({ font: "Outfit" })
      );
      expect(mockK.text).toHaveBeenCalledWith(
        "🏆 RECORDE",
        expect.objectContaining({ font: "Outfit" })
      );
      expect(mockK.text).toHaveBeenCalledWith(
        "32.395 pts",
        expect.objectContaining({ font: "Outfit" })
      );
      expect(mockK.text).toHaveBeenCalledWith(
        "🦐 KRILL & TEMPO",
        expect.objectContaining({ font: "Outfit" })
      );

      // 5. Verifica botão de ação de retorno
      expect(mockK.text).toHaveBeenCalledWith(
        "Tentar Novamente  [ ENTER ]  🔄",
        expect.objectContaining({ font: "Outfit" })
      );
    });
  });

  describe("34.10 — Espaçamento e Harmonia Visual do Menu Principal", () => {
    it("cria os 5 botões com altura 48px, largura 430px e espaçamento líquido de 14px sem sobreposição com o recorde", async () => {
      const { createMainMenu } = await import("../src/ui/mainMenu");

      const rectCalls: any[] = [];
      const posCalls: any[] = [];
      const textCalls: any[] = [];

      const mockK: any = {
        width: () => 1920,
        height: () => 1080,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => [r, g, b],
        rect: vi.fn((w, h, opt) => {
          rectCalls.push({ w, h, opt });
          return { type: "rect", w, h, opt };
        }),
        circle: vi.fn(() => ({ type: "circle" })),
        pos: vi.fn((x, y) => {
          posCalls.push({ x, y });
          return { pos: { x, y } };
        }),
        color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
        outline: vi.fn((w, c) => ({ outline: { w, c } })),
        opacity: vi.fn((op) => ({ opacity: op })),
        anchor: vi.fn((a) => ({ anchor: a })),
        fixed: vi.fn(() => ({ fixed: true })),
        scale: vi.fn((s) => ({ scale: s })),
        z: vi.fn((z) => ({ z })),
        text: vi.fn((t, opt) => {
          textCalls.push({ t, opt });
          return { text: t, opt };
        }),
        area: vi.fn(() => ({ area: true })),
        dt: () => 0.016,
        rand: () => 0.5,
        add: vi.fn((obj) => ({
          ...obj,
          onUpdate: vi.fn(),
          onClick: vi.fn(),
          onHoverUpdate: vi.fn(),
          onHoverEnd: vi.fn(),
        })),
        onKeyPress: vi.fn(() => ({ cancel: vi.fn() })),
        onMousePress: vi.fn(() => ({ cancel: vi.fn() })),
        onMouseMove: vi.fn(() => ({ cancel: vi.fn() })),
        onGamepadButtonPress: vi.fn(() => ({ cancel: vi.fn() })),
        onUpdate: vi.fn(() => ({ cancel: vi.fn() })),
      };

      // Simula recorde existente e onboarding já visualizado no localStorage
      localStorage.setItem("micro_splash_highscore", "32395");
      localStorage.setItem("micro_splash_onboarding_done", "true");

      createMainMenu(mockK, vi.fn(), vi.fn(), vi.fn(), vi.fn());

      // 1. Verifica dimensões dos botões (430x48)
      const btnRects = rectCalls.filter((r) => r.w === 430 && r.h === 48);
      expect(btnRects).toHaveLength(5);

      // 2. Verifica badge do recorde (340x26)
      const badgeRect = rectCalls.find((r) => r.w === 340 && r.h === 26);
      expect(badgeRect).toBeDefined();

      // 3. Verifica que o texto do recorde foi formatado em pt-BR
      const recordText = textCalls.find(
        (tc) => typeof tc.t === "string" && tc.t.includes("Recorde Histórico")
      );
      expect(recordText).toBeDefined();
      expect(recordText.t).toContain("32.395 Eco-Pontos");
    });
  });

  describe("34.11 — Harmonia Geométrica & Correção de Overflow na Tela de Opções", () => {
    it("renderiza o guia de controles com largura delimitada e o botão de resolução com proporção embutida", async () => {
      const { showOptionsScreen } = await import("../src/ui/optionsScreen");

      const rectCalls: any[] = [];
      const textCalls: any[] = [];

      const mockK: any = {
        width: () => 1920,
        height: () => 1080,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => [r, g, b],
        rect: vi.fn((w, h, opt) => {
          rectCalls.push({ w, h, opt });
          return { type: "rect", w, h, opt };
        }),
        circle: vi.fn(() => ({ type: "circle" })),
        pos: vi.fn((x, y) => ({ pos: { x, y } })),
        color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
        outline: vi.fn((w, c) => ({ outline: { w, c } })),
        opacity: vi.fn((op) => ({ opacity: op })),
        anchor: vi.fn((a) => ({ anchor: a })),
        fixed: vi.fn(() => ({ fixed: true })),
        scale: vi.fn((s) => ({ scale: s })),
        z: vi.fn((z) => ({ z })),
        text: vi.fn((t, opt) => {
          textCalls.push({ t, opt });
          return { text: t, opt };
        }),
        area: vi.fn(() => ({ area: true })),
        dt: () => 0.016,
        rand: () => 0.5,
        add: vi.fn((obj) => ({
          ...obj,
          onUpdate: vi.fn(),
          onClick: vi.fn(),
          onHoverUpdate: vi.fn(),
          onHoverEnd: vi.fn(),
        })),
        onKeyPress: vi.fn(() => ({ cancel: vi.fn() })),
        onGamepadButtonPress: vi.fn(() => ({ cancel: vi.fn() })),
      };

      showOptionsScreen(mockK, vi.fn());

      // 1. Verifica que a resolução contém proporção embutida no próprio texto do botão
      const resButtonText = textCalls.find(
        (tc) => typeof tc.t === "string" && tc.t.startsWith("Resolução:")
      );
      expect(resButtonText).toBeDefined();
      expect(resButtonText.t).toContain("16:9");

      // 2. Verifica que NÃO existe texto flutuante isolado com "Proporção:"
      const floatingAspect = textCalls.find(
        (tc) => typeof tc.t === "string" && tc.t.startsWith("Proporção:")
      );
      expect(floatingAspect).toBeUndefined();

      // 3. Verifica que o texto do guia de controles possui largura delimitada e quebra em linhas
      const controlsText = textCalls.find(
        (tc) => typeof tc.t === "string" && tc.t.includes("Nadar e Inclinar")
      );
      expect(controlsText).toBeDefined();
      expect(controlsText.opt.width).toBeGreaterThan(500);
      expect(controlsText.opt.align).toBe("center");
      expect(controlsText.t).toContain("\n");

      // 4. Verifica selo de conformidade no rodapé
      const footerText = textCalls.find(
        (tc) => typeof tc.t === "string" && tc.t.includes("Conformidade LGPD")
      );
      expect(footerText).toBeDefined();
    });
  });

  describe("34.12 — Remoção de Container Redundante no Diário de Bordo", () => {
    it("renderiza os cards de espécies diretamente na superfície do modal sem container de fundo intermediário", async () => {
      const { showCodexScreen } = await import("../src/ui/codexScreen");

      const rectCalls: any[] = [];
      const textCalls: any[] = [];

      const mockK: any = {
        width: () => 1920,
        height: () => 1080,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => [r, g, b],
        rect: vi.fn((w, h, opt) => {
          rectCalls.push({ w, h, opt });
          return { type: "rect", w, h, opt };
        }),
        circle: vi.fn(() => ({ type: "circle" })),
        pos: vi.fn((x, y) => ({ pos: { x, y } })),
        color: vi.fn((r, g, b) => ({ color: [r, g, b] })),
        outline: vi.fn((w, c) => ({ outline: { w, c } })),
        opacity: vi.fn((op) => ({ opacity: op })),
        anchor: vi.fn((a) => ({ anchor: a })),
        fixed: vi.fn(() => ({ fixed: true })),
        scale: vi.fn((s) => ({ scale: s })),
        z: vi.fn((z) => ({ z })),
        text: vi.fn((t, opt) => {
          textCalls.push({ t, opt });
          return { text: t, opt };
        }),
        area: vi.fn(() => ({ area: true })),
        dt: () => 0.016,
        rand: () => 0.5,
        add: vi.fn((obj) => ({
          ...obj,
          onUpdate: vi.fn(),
          onClick: vi.fn(),
          onHoverUpdate: vi.fn(),
          onHoverEnd: vi.fn(),
        })),
        onKeyPress: vi.fn(() => ({ cancel: vi.fn() })),
        onGamepadButtonPress: vi.fn(() => ({ cancel: vi.fn() })),
      };

      showCodexScreen(mockK, vi.fn());

      // 1. Verifica que NÃO existe retângulo de container intermediário (que tinha cardW - 40 = 960)
      const redundantBgBox = rectCalls.find((r) => r.w === 960);
      expect(redundantBgBox).toBeUndefined();

      // 2. Verifica que os 6 cards de espécies (460x132) foram criados diretamente
      const speciesCardRects = rectCalls.filter((r) => r.w === 460 && r.h === 132);
      expect(speciesCardRects).toHaveLength(6);

      // 3. Verifica os 3 botões de abas
      const tabTexts = textCalls.filter((tc) =>
        ["Espécies Marinhas", "Fatos da Rota", "Conservação & IBJ"].some(
          (label) => typeof tc.t === "string" && tc.t.includes(label)
        )
      );
      expect(tabTexts).toHaveLength(3);
    });
  });
});

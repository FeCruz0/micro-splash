import { describe, it, expect, vi } from "vitest";
import { calculateBreachReentryParticleData, setupBreachSystem } from "../src/systems/breachSystem";
import { calculateTailStrokeBubbleData } from "../src/entities/player/playerParticles";
import {
  isAmbientPlanktonActive,
  calculateAmbientPlanktonOpacity,
} from "../src/systems/bioluminescenceSystem";
import { getBiomeTrashPalette } from "../src/entities/trash";
import { getBiomeNetPalette } from "../src/entities/net";
import { calculateBiomeTransitionFactor } from "../src/systems/biomeTransitionSystem";
import {
  getBiomeHudInfo,
  getOxygenUrgencyState,
  getOxygenColor,
  formatHudDistance,
} from "../src/ui/hudSystem";
import { createDebugDistanceUI } from "../src/ui/debugDistance";

describe("FASE 31: Partículas, Coerência de Bioma & Polimento de Interface", () => {
  describe("31.1 Salto Majestoso: Re-entrada Dramática (breachSystem)", () => {
    it("deve calcular parâmetros de arco balístico simétrico para partículas de respingo", () => {
      const total = 24;
      let leftCount = 0;
      let rightCount = 0;

      for (let i = 0; i < total; i++) {
        const p = calculateBreachReentryParticleData(i, total);
        expect(p.gravityY).toBe(620);
        expect(p.width).toBe(3);
        expect(p.height).toBe(8);

        if (p.velX < 0) leftCount++;
        if (p.velX > 0) rightCount++;

        // Velocidade vertical inicial deve ser para cima (-Y balístico)
        expect(p.velY).toBeLessThan(0);
        expect(p.velY).toBeGreaterThanOrEqual(-420);
      }

      // Simetria perfeita: 12 para a esquerda, 12 para a direita
      expect(leftCount).toBe(12);
      expect(rightCount).toBe(12);
    });
  });

  describe("31.2 Rastro de Bolhas da Batida de Cauda (playerParticles)", () => {
    it("deve gerar bolhas ascendentes atrás da cauda conforme a direção da jubarte", () => {
      // 1. Nadando para a direita: bolhas devem ser emitidas atrás (offset X negativo)
      for (let i = 0; i < 7; i++) {
        const b = calculateTailStrokeBubbleData(i, true);
        expect(b.offsetX).toBeLessThan(0); // atrás da baleia virada para a direita
        expect(b.velY).toBeLessThan(0); // sobe em direção à superfície (-20 a -40 px/s)
        expect(b.velY).toBeGreaterThanOrEqual(-45);
        expect(b.radius).toBeGreaterThanOrEqual(2);
        expect(b.radius).toBeLessThanOrEqual(4.5);
      }

      // 2. Nadando para a esquerda: bolhas emitidas atrás (offset X positivo)
      for (let i = 0; i < 7; i++) {
        const b = calculateTailStrokeBubbleData(i, false);
        expect(b.offsetX).toBeGreaterThan(0);
        expect(b.velY).toBeLessThan(0);
      }
    });
  });

  describe("31.3 Plâncton Bioluminescente de Ambiente (bioluminescenceSystem)", () => {
    it("deve ativar plâncton estático ambiente apenas entre 12.000m e 25.000m", () => {
      // Fora da faixa
      expect(isAmbientPlanktonActive(4000)).toBe(false);
      expect(isAmbientPlanktonActive(11990)).toBe(false);
      expect(isAmbientPlanktonActive(25050)).toBe(false);

      // Dentro da faixa (Costa Urbana e Cânions de Cabo Frio)
      expect(isAmbientPlanktonActive(12000)).toBe(true);
      expect(isAmbientPlanktonActive(18000)).toBe(true);
      expect(isAmbientPlanktonActive(25000)).toBe(true);
    });

    it("deve pulsar suavemente a opacidade com sin(tempo + fase) * 0.4", () => {
      const baseOpacity = 0.35;
      for (let t = 0; t < 10; t += 0.5) {
        const op = calculateAmbientPlanktonOpacity(t, 0.5, baseOpacity);
        expect(op).toBeGreaterThanOrEqual(0.05);
        expect(op).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe("31.4 Paletas de Obstáculos Contextuais por Bioma (trash & net)", () => {
    it("deve alternar a paleta de lixo conforme o bioma e preservar alto contraste", () => {
      // 1. Antártica (< 5.000m): plástico desbotado acinzentado polar
      const antarcticaTrash = getBiomeTrashPalette(2500, false);
      expect(antarcticaTrash.body[0]).toBe(175);
      expect(antarcticaTrash.body[1]).toBe(195);
      expect(antarcticaTrash.body[2]).toBe(210);

      // 2. Travessia Pelágica (5.000m a 12.000m): azul oceânico
      const pelagicTrash = getBiomeTrashPalette(8000, false);
      expect(pelagicTrash.body[0]).toBe(80);
      expect(pelagicTrash.body[1]).toBe(140);

      // 3. Costa Urbana & Cânions (12.000m a 25.000m): vermelho saturado e grafite
      const urbanTrash = getBiomeTrashPalette(16000, false);
      expect(urbanTrash.body[0]).toBe(215);
      expect(urbanTrash.body[1]).toBe(65);

      // 4. Arraial do Cabo (25.000m+): laranja queimado de sol
      const arraialTrash = getBiomeTrashPalette(28000, false);
      expect(arraialTrash.body[0]).toBe(235);
      expect(arraialTrash.body[1]).toBe(155);

      // 5. Alto Contraste: preserva padrão de acessibilidade vermelho e amarelo
      const highContrastTrash = getBiomeTrashPalette(8000, true);
      expect(highContrastTrash.body).toEqual([240, 60, 60]);
      expect(highContrastTrash.outline).toEqual([255, 240, 50]);
    });

    it("deve alternar a paleta de rede fantasma conforme o bioma e preservar alto contraste", () => {
      // 1. Antártica: rede verde-cinza glacial
      const antarcticaNet = getBiomeNetPalette(3000, false);
      expect(antarcticaNet.mesh).toEqual([90, 145, 135]);

      // 2. Pelágica: azul ciano e boias alaranjadas
      const pelagicNet = getBiomeNetPalette(9000, false);
      expect(pelagicNet.mesh).toEqual([65, 170, 195]);
      expect(pelagicNet.floats).toEqual([240, 110, 50]);

      // 3. Costa: malha oliva industrial e boias amarelo-alerta
      const urbanNet = getBiomeNetPalette(15000, false);
      expect(urbanNet.mesh).toEqual([75, 125, 95]);
      expect(urbanNet.floats).toEqual([245, 190, 40]);

      // 4. Arraial: turquesa e boias coral
      const arraialNet = getBiomeNetPalette(26000, false);
      expect(arraialNet.mesh).toEqual([40, 210, 185]);
      expect(arraialNet.floats).toEqual([255, 120, 80]);

      // 5. Alto Contraste
      const highContrastNet = getBiomeNetPalette(15000, true);
      expect(highContrastNet.mesh).toEqual([210, 100, 255]);
      expect(highContrastNet.outline).toEqual([255, 255, 255]);
    });
  });

  describe("31.5 Easing de Transição de Biomas (biomeTransitionSystem)", () => {
    it("deve calcular fator 0.0 fora do bioma, curva suave nos primeiros 300m, 1.0 no centro e curva suave de saída", () => {
      const startX = 5000;
      const endX = 12000;
      const width = 300;

      // Fora do bioma
      expect(calculateBiomeTransitionFactor(4900, startX, endX, width)).toBe(0.0);
      expect(calculateBiomeTransitionFactor(12100, startX, endX, width)).toBe(0.0);

      // Exatamente nas fronteiras
      expect(calculateBiomeTransitionFactor(startX, startX, endX, width)).toBe(0.0);
      expect(calculateBiomeTransitionFactor(endX, startX, endX, width)).toBe(0.0);

      // No meio da zona de atenuação de entrada (150m de 300m -> smoothstep(0.5) = 0.5)
      const midEntry = calculateBiomeTransitionFactor(5150, startX, endX, width);
      expect(midEntry).toBeCloseTo(0.5, 2);

      // No final da zona de atenuação de entrada (300m)
      expect(calculateBiomeTransitionFactor(5300, startX, endX, width)).toBe(1.0);

      // No coração do bioma
      expect(calculateBiomeTransitionFactor(8500, startX, endX, width)).toBe(1.0);

      // Na zona de atenuação de saída (11850m -> 150m de 12000m)
      const midExit = calculateBiomeTransitionFactor(11850, startX, endX, width);
      expect(midExit).toBeCloseTo(0.5, 2);
    });
  });

  describe("31.7 & 31.8 HUD de Distância, Biomas & Barra de Oxigênio (hudSystem)", () => {
    it("deve formatar distância em metros e mapear o bioma correto com emoji", () => {
      expect(formatHudDistance(0)).toBe("0m");
      expect(formatHudDistance(14238.4)).toBe("14.238m");
      expect(formatHudDistance(30000)).toBe("30.000m");

      // Antártica
      const info1 = getBiomeHudInfo(2500);
      expect(info1.emoji).toBe("❄️");
      expect(info1.name).toContain("Antártico");
      expect(info1.progressPercent).toBe(8);

      // Travessia Pelágica
      const info2 = getBiomeHudInfo(9000);
      expect(info2.emoji).toBe("🌊");
      expect(info2.progressPercent).toBe(30);

      // Costa Urbana
      const info3 = getBiomeHudInfo(15000);
      expect(info3.emoji).toBe("🏭");
      expect(info3.progressPercent).toBe(50);

      // Cânions
      const info4 = getBiomeHudInfo(22000);
      expect(info4.emoji).toBe("🌀");
      expect(info4.progressPercent).toBe(73);

      // Arraial do Cabo
      const info5 = getBiomeHudInfo(29000);
      expect(info5.emoji).toBe("☀️");
      expect(info5.progressPercent).toBe(96);
    });

    it("deve classificar os 3 estados de urgência de oxigênio (>50% calmo, 20-50% alerta, <20% crítico)", () => {
      // Calm: > 50%
      expect(getOxygenUrgencyState(1.0)).toBe("calm");
      expect(getOxygenUrgencyState(0.51)).toBe("calm");

      // Warning: 20% a 50%
      expect(getOxygenUrgencyState(0.5)).toBe("warning");
      expect(getOxygenUrgencyState(0.35)).toBe("warning");
      expect(getOxygenUrgencyState(0.2)).toBe("warning");

      // Critical: < 20%
      expect(getOxygenUrgencyState(0.19)).toBe("critical");
      expect(getOxygenUrgencyState(0.05)).toBe("critical");
      expect(getOxygenUrgencyState(0.0)).toBe("critical");
    });

    it("deve fornecer as cores corretas para cada estado de urgência", () => {
      // Calm: azul ciano sereno constante
      const calmColor = getOxygenColor("calm", 0, false);
      expect(calmColor).toEqual([0, 229, 255]);

      // Warning: tons âmbar/dourados
      const warnColor = getOxygenColor("warning", 1.0, false);
      expect(warnColor[0]).toBe(255);
      expect(warnColor[1]).toBeGreaterThanOrEqual(120);
      expect(warnColor[2]).toBe(10);

      // Critical: vermelho de emergência
      const critColor = getOxygenColor("critical", 1.0, false);
      expect(critColor[0]).toBe(255);
      expect(critColor[2]).toBe(102);

      // Alto Contraste
      expect(getOxygenColor("critical", 0, true)).toEqual([255, 40, 40]);
      expect(getOxygenColor("warning", 0, true)).toEqual([255, 230, 40]);
      expect(getOxygenColor("calm", 0, true)).toEqual([0, 230, 255]);
    });
  });

  describe("31.9 Migração Difícil vs Serena: Supressão de Prompts e HUD", () => {
    function createMockKaboomForBreach() {
      const objects: any[] = [];
      let updateCallback: (() => void) | null = null;
      let keyPressed = false;

      return {
        objects,
        triggerUpdate: () => {
          if (updateCallback) updateCallback();
        },
        setKeyPressed: (v: boolean) => {
          keyPressed = v;
        },
        onUpdate: (cb: () => void) => {
          updateCallback = cb;
        },
        width: () => 640,
        height: () => 360,
        add: (comps: any[]) => {
          const obj: any = {
            comps,
            opacity: 1,
            pos: { x: 0, y: 0 },
            text: "",
            onUpdate: vi.fn(),
          };
          for (const c of comps) {
            if (c && c.text !== undefined) {
              obj.text = c.text;
            }
          }
          objects.push(obj);
          return obj;
        },
        text: (t: string, opts?: any) => ({ text: t, opts }),
        rect: (w: number, h: number) => ({ w, h }),
        pos: (x: number, y: number) => ({ x, y }),
        color: (r: number, g: number, b: number) => ({ r, g, b }),
        outline: (w: number, col: any) => ({ w, col }),
        anchor: (a: string) => ({ anchor: a }),
        fixed: () => ({ fixed: true }),
        z: (z: number) => ({ z }),
        opacity: (o: number) => ({ opacity: o }),
        dt: () => 0.016,
        isKeyPressed: (key: string) => keyPressed && key === "space",
        isMousePressed: () => false,
        isTouchStarted: () => false,
        destroy: (obj: any) => {
          const idx = objects.indexOf(obj);
          if (idx !== -1) objects.splice(idx, 1);
        },
        shake: vi.fn(),
        wait: vi.fn(),
        tween: () => ({ then: (cb: () => void) => cb() }),
        vec2: (x: number, y: number) => ({ x, y }),
        rand: (min: number, max: number) => (min + max) / 2,
        deg2rad: (d: number) => (d * Math.PI) / 180,
        circle: (r: number) => ({ circle: r }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      } as any;
    }

    it("não deve criar banner ou prompt de texto se showPrompt for false (Migração Difícil)", () => {
      const mockK = createMockKaboomForBreach();
      const mockPlayer = {
        gameObj: { pos: { x: 29800, y: 140 } },
        startBreach: vi.fn(),
        setSpeed: vi.fn(),
        completeBreach: vi.fn(),
        isBreaching: () => false,
        isFainting: () => false,
      } as any;
      const mockState = {
        triggerBreach: vi.fn(),
        getDistance: () => 29800,
      } as any;

      setupBreachSystem({
        k: mockK,
        playerController: mockPlayer,
        gameState: mockState,
        onBreachComplete: vi.fn(),
        showPrompt: false, // Modo Migração Difícil
      });

      // Dispara ciclo de atualização
      mockK.triggerUpdate();

      // Nenhum objeto com texto deve ter sido adicionado à tela
      const textObjects = mockK.objects.filter((obj: any) => obj.text && obj.text.length > 0);
      expect(textObjects.length).toBe(0);

      // O pulo/salto ainda pode ser acionado normalmente pelo jogador
      mockK.setKeyPressed(true);
      mockK.triggerUpdate();
      expect(mockPlayer.startBreach).toHaveBeenCalled();
    });

    it("deve criar o banner de instruções se showPrompt for true (Migração Serena)", () => {
      const mockK = createMockKaboomForBreach();
      const mockPlayer = {
        gameObj: { pos: { x: 29800, y: 140 } },
        startBreach: vi.fn(),
        setSpeed: vi.fn(),
        completeBreach: vi.fn(),
        isBreaching: () => false,
        isFainting: () => false,
      } as any;
      const mockState = {
        triggerBreach: vi.fn(),
        getDistance: () => 29800,
      } as any;

      setupBreachSystem({
        k: mockK,
        playerController: mockPlayer,
        gameState: mockState,
        onBreachComplete: vi.fn(),
        showPrompt: true, // Modo Migração Serena
      });

      mockK.triggerUpdate();

      const banner = mockK.objects.find(
        (obj: any) => obj.text && obj.text.includes("SALTO MAJESTOSO")
      );
      expect(banner).toBeDefined();
    });

    it("deve adaptar o cabeçalho e estado de visibilidade do debugDistanceUI para Migração Serena e Difícil", () => {
      const mockK = {
        width: () => 1280,
        height: () => 720,
        rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
        pos: (x: number, y: number) => ({ type: "pos", x, y }),
        color: (r: number, g: number, b: number) => ({ type: "color", r, g, b }),
        opacity: (a: number) => ({ type: "opacity", a }),
        outline: (w: number, c: any) => ({ type: "outline", w, c }),
        fixed: () => ({ type: "fixed" }),
        z: (v: number) => ({ type: "z", v }),
        text: (t: string, opts?: any) => ({ type: "text", t, opts }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: vi.fn((props: any[]) => {
          const addedChildren: any[] = [];
          const obj: any = {
            props,
            hidden: true,
            add: vi.fn((childProps: any[]) => {
              const child: any = { props: childProps };
              addedChildren.push(child);
              return child;
            }),
            children: addedChildren,
          };
          return obj;
        }),
      } as any;

      // 1. No modo Difícil (isSereneMode: false)
      const mockPlayerHard = {
        isSereneMode: () => false,
      } as any;
      const debugUIHard = createDebugDistanceUI(mockK, mockPlayerHard);
      expect(debugUIHard.isVisible()).toBe(false); // Inicia oculto no modo Difícil
      expect(debugUIHard.toggle()).toBe(true); // F8 ativa a visibilidade
      expect(debugUIHard.isVisible()).toBe(true);

      // 2. No modo Serena (isSereneMode: true)
      const mockPlayerSerene = {
        isSereneMode: () => true,
      } as any;
      const debugUISerene = createDebugDistanceUI(mockK, mockPlayerSerene);
      expect(debugUISerene.isVisible()).toBe(false);
      debugUISerene.setVisible(true); // main.ts ativa o debug HUD por padrão na Migração Serena
      expect(debugUISerene.isVisible()).toBe(true);
    });
  });
});

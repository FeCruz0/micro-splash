import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAccessibilityOptions } from "../../src/ui/options/accessibilityOptionsTab";
import { showModeSelectScreen } from "../../src/ui/modeSelectScreen";
import { getWeeklyChallengeInfo } from "../../src/systems/weeklyChallenge";
import { ttsSystem } from "../../src/systems/ttsSystem";
import type { OptionsScreenContext } from "../../src/ui/options/optionsTypes";
import type { FocusableItem } from "../../src/ui/keyboardNav";

describe("Fases 62 & 63: Ocultação de Recursos em Desenvolvimento (Desafio Semanal & Narração TTS)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("Fase 62: Ajuste de Interface & Ocultação do Desafio Semanal (modeSelectScreen)", () => {
    it("não deve exibir card nem opção de foco para o Desafio Semanal, mantendo apenas 3 modos ativos", () => {
      const addedElements: any[] = [];
      const mockKaboom: any = {
        width: () => 1280,
        height: () => 720,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        rect: (w: number, h: number) => ({ type: "rect", w, h }),
        pos: (x: number, y: number) => ({ type: "pos", x, y }),
        color: (r: any, g?: any, b?: any) => ({ type: "color", r, g, b }),
        outline: (w: number, col: any) => ({ type: "outline", w, col }),
        scale: (s: number) => ({ type: "scale", s }),
        opacity: (o: number) => ({ type: "opacity", o }),
        anchor: (a: string) => ({ type: "anchor", a }),
        fixed: () => ({ type: "fixed" }),
        area: () => ({ type: "area" }),
        z: (idx: number) => ({ type: "z", idx }),
        text: (content: string, opts?: any) => ({ type: "text", content, opts }),
        add: vi.fn((comps: any[]) => {
          const obj: any = {
            comps,
            onClick: vi.fn(),
            onHoverUpdate: vi.fn(),
            onHoverEnd: vi.fn(),
            onUpdate: vi.fn(),
            destroy: vi.fn(),
          };
          for (const c of comps) {
            if (c.type === "pos") obj.pos = { x: c.x, y: c.y };
            if (c.type === "text") obj.text = c.content;
            if (c.type === "color") obj.color = c;
          }
          addedElements.push(obj);
          return obj;
        }),
        wait: vi.fn((_time: number, cb: () => void) => cb()),
        tween: vi.fn().mockReturnValue({ then: (cb: () => void) => cb() }),
        easings: { easeOutBack: vi.fn() },
        onKeyPress: vi.fn(),
        onKeyDown: vi.fn(),
        isKeyDown: vi.fn().mockReturnValue(false),
      };

      const onSelectMode = vi.fn();
      const onBack = vi.fn();

      showModeSelectScreen(mockKaboom, onSelectMode, onBack);

      // 1. Nenhum elemento gráfico deve possuir o texto de Desafio Semanal
      const textContents = addedElements
        .filter((el) => typeof el.text === "string")
        .map((el) => el.text);

      expect(textContents.some((t) => t.includes("DESAFIO SEMANAL DA ROTA"))).toBe(false);
      expect(textContents.some((t) => t.includes("Semente #"))).toBe(false);

      // 2. Os modos de jogo ativos devem ser exibidos
      expect(textContents.some((t) => t.includes("MIGRAÇÃO SERENA"))).toBe(true);
      expect(textContents.some((t) => t.includes("MIGRAÇÃO RÁPIDA"))).toBe(true);
    });

    it("preserva o gerador de semente e dados do desafio semanal para futura reativação", () => {
      const weeklyInfo = getWeeklyChallengeInfo();
      expect(weeklyInfo.seed).toBeGreaterThan(0);
      expect(weeklyInfo.weekKey).toMatch(/^\d{4}-W\d{2}$/);
      expect(weeklyInfo.daysLeft).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Fase 63: Ocultação da Narração por Voz na Aba de Acessibilidade (accessibilityOptionsTab)", () => {
    it("deve renderizar 4 opções ativas na grade vertical sem o controle de Narração em Voz (TTS)", () => {
      const focusItems: FocusableItem[] = [];
      const elements: any[] = [];
      const rowStartY = 120;
      const btnH = 44;
      const rowGap = 16;

      const mockKaboom: any = {
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
        pos: (pos: any) => ({ type: "pos", ...pos }),
        color: (r: any, g?: any, b?: any) => ({ type: "color", r, g, b }),
        outline: (w: number, col: any) => ({ type: "outline", w, col }),
        scale: (s: number) => ({ type: "scale", s }),
        anchor: (a: string) => ({ type: "anchor", a }),
        fixed: () => ({ type: "fixed" }),
        area: () => ({ type: "area" }),
        z: (idx: number) => ({ type: "z", idx }),
        text: (content: string, opts?: any) => ({ type: "text", content, opts }),
        add: vi.fn((comps: any[]) => {
          const obj: any = {
            comps,
            onClick: vi.fn(),
            onHoverUpdate: vi.fn(),
            onHoverEnd: vi.fn(),
            destroy: vi.fn(),
          };
          for (const c of comps) {
            if (c.type === "pos") obj.pos = { x: c.x, y: c.y };
            if (c.type === "text") obj.text = c.content;
            if (c.type === "color") obj.color = c;
          }
          elements.push(obj);
          return obj;
        }),
      };

      const context: OptionsScreenContext = {
        k: mockKaboom,
        elements,
        focusItems,
        col0X: 200,
        col1X: 400,
        colW: 320,
        btnH,
        rowGap,
        rowStartY,
        cardTop: 80,
        cardW: 800,
        cX: 400,
        cY: 300,
        getCurrentResKey: vi.fn().mockReturnValue("1080p"),
        setCurrentResKey: vi.fn(),
        getCurrentDisplayMode: vi.fn().mockReturnValue("letterbox"),
        setCurrentDisplayMode: vi.fn(),
        getCurrentLetterboxColor: vi.fn().mockReturnValue("dark_slate"),
        setCurrentLetterboxColor: vi.fn(),
        updateReloadHint: vi.fn(),
        isClosed: vi.fn().mockReturnValue(false),
        isModalOpen: vi.fn().mockReturnValue(false),
        setIsModalOpen: vi.fn(),
        close: vi.fn(),
      };

      renderAccessibilityOptions(context);

      // 1. Deve haver exatamente 4 itens de foco acessíveis (Linha 0 a Linha 3)
      expect(focusItems.length).toBe(4);

      // 2. O 4º item (índice 3) deve estar na coordenada Y de row3Y (linha de idioma)
      const expectedRow3Y = rowStartY + 3 * (btnH + rowGap);
      expect(focusItems[3].pos.y).toBe(expectedRow3Y);

      // 3. Nenhum texto renderizado deve ser da narração em voz
      const textElements = elements
        .filter((el) => typeof el.text === "string")
        .map((el) => el.text);
      expect(textElements.some((t) => t.includes("TTS") || t.includes("NARRAÇÃO"))).toBe(false);
    });

    it("mantém o ttsSystem intacto e operacional no core para reativação futura", () => {
      ttsSystem.setEnabled(false);
      expect(ttsSystem.isEnabled()).toBe(false);
      expect(ttsSystem.getLabel()).toContain("DESLIGADA");

      const toggled = ttsSystem.toggle();
      expect(toggled).toBe(true);
      expect(ttsSystem.isEnabled()).toBe(true);
      expect(ttsSystem.getLabel()).toContain("LIGADA");

      ttsSystem.setEnabled(false);
    });
  });
});

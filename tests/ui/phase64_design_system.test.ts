import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UI_COLORS,
  UI_RADII,
  UI_SPACING,
  UI_Z_INDEX,
  getModalDimensions,
} from "../../src/ui/theme";
import { createModalShell } from "../../src/ui/shared/modalShell";
import { createTabBar } from "../../src/ui/shared/tabBar";
import { createCardButton } from "../../src/ui/shared/cardButton";

describe("Fase 64: Design System Centralizado, Tokens Semânticos & Shell de Modais", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("64.1: Tokens Semânticos e Paleta Central de Tema (UI_COLORS, UI_RADII, UI_SPACING, UI_Z_INDEX)", () => {
    it("valida que todas as tuplas cromáticas são válidas (3 canais sRGB entre 0 e 255)", () => {
      const validateRgb = (rgb: readonly [number, number, number]) => {
        expect(rgb).toHaveLength(3);
        rgb.forEach((channel) => {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        });
      };

      validateRgb(UI_COLORS.background);
      validateRgb(UI_COLORS.panel);
      validateRgb(UI_COLORS.panelSurface);
      validateRgb(UI_COLORS.panelDeep);
      validateRgb(UI_COLORS.panelHeader);
      validateRgb(UI_COLORS.border);
      validateRgb(UI_COLORS.borderSubtle);
      validateRgb(UI_COLORS.borderGold);
      validateRgb(UI_COLORS.textPrimary);
      validateRgb(UI_COLORS.textSecondary);
      validateRgb(UI_COLORS.textMuted);
      validateRgb(UI_COLORS.textGold);

      // Modalidades
      validateRgb(UI_COLORS.modes.serene.accent);
      validateRgb(UI_COLORS.modes.serene.text);
      validateRgb(UI_COLORS.modes.serene.surface);

      validateRgb(UI_COLORS.modes.difficult.accent);
      validateRgb(UI_COLORS.modes.difficult.text);
      validateRgb(UI_COLORS.modes.difficult.surface);

      validateRgb(UI_COLORS.modes.quick.accent);
      validateRgb(UI_COLORS.modes.quick.text);
      validateRgb(UI_COLORS.modes.quick.surface);

      // Botões
      validateRgb(UI_COLORS.button.primary.base);
      validateRgb(UI_COLORS.button.primary.hover);
      validateRgb(UI_COLORS.button.secondary.base);
      validateRgb(UI_COLORS.button.secondary.hover);
      validateRgb(UI_COLORS.button.danger.base);
      validateRgb(UI_COLORS.button.danger.hover);
      validateRgb(UI_COLORS.button.tabActive.base);
      validateRgb(UI_COLORS.button.tabInactive.base);
    });

    it("assegura hierarquia estrita de camadas z-index para prevenção de sobreposição", () => {
      expect(UI_Z_INDEX.backdrop).toBeLessThan(UI_Z_INDEX.modalCard);
      expect(UI_Z_INDEX.modalCard).toBeLessThan(UI_Z_INDEX.modalContent);
      expect(UI_Z_INDEX.modalContent).toBeLessThan(UI_Z_INDEX.modalControls);
      expect(UI_Z_INDEX.modalControls).toBeLessThan(UI_Z_INDEX.modalForeground);
      expect(UI_Z_INDEX.modalForeground).toBeLessThan(UI_Z_INDEX.modalOverlay);
      expect(UI_Z_INDEX.modalOverlay).toBeLessThan(UI_Z_INDEX.modalCloseBtn);
      expect(UI_Z_INDEX.modalCloseBtn).toBeLessThan(UI_Z_INDEX.focusRing);
    });

    it("fornece escala consistente de raios de curvatura e espaçamentos", () => {
      expect(UI_RADII.xs).toBeLessThan(UI_RADII.sm);
      expect(UI_RADII.sm).toBeLessThan(UI_RADII.md);
      expect(UI_RADII.md).toBeLessThan(UI_RADII.lg);
      expect(UI_RADII.lg).toBeLessThan(UI_RADII.xl);

      expect(UI_SPACING.xs).toBe(4);
      expect(UI_SPACING.sm).toBe(8);
      expect(UI_SPACING.md).toBe(12);
      expect(UI_SPACING.lg).toBe(16);
      expect(UI_SPACING.xl).toBe(20);
      expect(UI_SPACING.xxl).toBe(24);
    });
  });

  describe("64.2: Calculador Canônico de Dimensões de Modais (getModalDimensions)", () => {
    it("calcula dimensões canônicas em resolução padrão 1080p (1920x1080)", () => {
      const dims = getModalDimensions(1920, 1080, "standard");
      expect(dims.cardW).toBe(1000);
      expect(dims.cardH).toBe(580);
      expect(dims.cX).toBe(960);
      expect(dims.cY).toBe(540);
      expect(dims.contentW).toBe(952);
      expect(dims.top).toBe(540 - 290);
      expect(dims.bottom).toBe(540 + 290);
    });

    it("suporta variantes 'tall' (660px) e 'compact' (520px)", () => {
      const tallDims = getModalDimensions(1920, 1080, "tall");
      expect(tallDims.cardH).toBe(660);

      const compactDims = getModalDimensions(1920, 1080, "compact");
      expect(compactDims.cardW).toBe(840);
      expect(compactDims.cardH).toBe(520);
    });

    it("adapta-se responsivamente a telas ultra-compactas (640x360) sem exceder bordas", () => {
      const smallDims = getModalDimensions(640, 360, "standard");
      expect(smallDims.cardW).toBe(640 - 24);
      expect(smallDims.cardH).toBe(360 - 20);
      expect(smallDims.cX).toBe(320);
      expect(smallDims.cY).toBe(180);
    });
  });

  describe("64.3: Shell Universal de Modal (createModalShell)", () => {
    function createMockKaboom() {
      const addedElements: any[] = [];
      const mockK: any = {
        width: () => 1280,
        height: () => 720,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
        pos: (x: any, y?: number) =>
          typeof x === "object" && x !== null
            ? { type: "pos", x: x.x, y: x.y }
            : { type: "pos", x, y },
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
            if (c.type === "rect") {
              obj.width = c.w;
              obj.height = c.h;
            }
          }
          addedElements.push(obj);
          return obj;
        }),
        destroy: vi.fn(),
        tween: vi.fn().mockReturnValue({ then: (cb: () => void) => cb() }),
        easings: { easeOutBack: vi.fn(), easeInQuad: vi.fn() },
        onKeyPress: vi.fn(),
        onKeyDown: vi.fn(),
        isKeyDown: vi.fn().mockReturnValue(false),
      };
      return { mockK, addedElements };
    }

    it("instancia backdrop, card modal, título com sombra e botão de fechar", () => {
      const { mockK, addedElements } = createMockKaboom();
      const onClose = vi.fn();

      const shell = createModalShell(mockK, {
        title: "MODAL DE TESTE",
        subtitle: "Subtítulo explicativo",
        onClose,
      });

      expect(shell.card).toBeDefined();
      expect(shell.backdrop).toBeDefined();
      expect(shell.closeBtn).toBeDefined();
      expect(shell.isClosed()).toBe(false);

      const textContents = addedElements
        .filter((el) => typeof el.text === "string")
        .map((el) => el.text);

      expect(textContents).toContain("MODAL DE TESTE");
      expect(textContents).toContain("Subtítulo explicativo");
      expect(textContents).toContain("✕");

      // Deve cadastrar o botão [X] como primeiro item de foco acessível
      expect(shell.focusItems.length).toBeGreaterThanOrEqual(1);
      expect(shell.focusItems[0].width).toBe(38);
    });

    it("executa animação de saída e callback onClose ao fechar", () => {
      const { mockK } = createMockKaboom();
      const onClose = vi.fn();

      const shell = createModalShell(mockK, {
        title: "FECHAMENTO SUAVE",
        onClose,
      });

      shell.close();
      expect(shell.isClosed()).toBe(true);
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("64.4: Barra de Abas Simétrica (createTabBar)", () => {
    function createMockKaboom() {
      const addedElements: any[] = [];
      const mockK: any = {
        width: () => 1280,
        height: () => 720,
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
        pos: (x: any, y?: number) =>
          typeof x === "object" && x !== null
            ? { type: "pos", x: x.x, y: x.y }
            : { type: "pos", x, y },
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
            if (c.type === "rect") {
              obj.width = c.w;
              obj.height = c.h;
            }
          }
          addedElements.push(obj);
          return obj;
        }),
      };
      return { mockK, addedElements };
    }

    it("centraliza simetricamente 2 abas em torno do eixo central (centerX)", () => {
      const { mockK, addedElements } = createMockKaboom();
      const onTabChange = vi.fn();

      const tabBar = createTabBar(mockK, {
        tabs: [
          { id: "tab1", label: "Aba 1" },
          { id: "tab2", label: "Aba 2" },
        ],
        activeTab: "tab1",
        posY: 100,
        containerWidth: 1000,
        centerX: 640,
        onTabChange,
      });

      expect(tabBar.elements.length).toBe(4); // 2 botões + 2 textos
      expect(tabBar.focusItems.length).toBe(2);

      const tab1Txt = addedElements.find((el) => el.text === "Aba 1");
      const tab2Txt = addedElements.find((el) => el.text === "Aba 2");

      expect(tab1Txt).toBeDefined();
      expect(tab2Txt).toBeDefined();

      const midX = (tab1Txt.pos.x + tab2Txt.pos.x) / 2;
      expect(midX).toBeCloseTo(640, 1);
      expect(tabBar.getActiveTab()).toBe("tab1");
    });

    it("centraliza simetricamente 3 abas posicionando a aba do meio exatamente em centerX", () => {
      const { mockK, addedElements } = createMockKaboom();
      const onTabChange = vi.fn();

      createTabBar(mockK, {
        tabs: [
          { id: "a", label: "Aba A" },
          { id: "b", label: "Aba B" },
          { id: "c", label: "Aba C" },
        ],
        activeTab: "b",
        posY: 100,
        containerWidth: 1000,
        centerX: 640,
        onTabChange,
      });

      const tabBTxt = addedElements.find((el) => el.text === "Aba B");
      expect(tabBTxt).toBeDefined();
      expect(tabBTxt.pos.x).toBeCloseTo(640, 1);
    });
  });

  describe("64.5: Componente de Botão de Ação (createCardButton)", () => {
    function createMockKaboom() {
      const addedElements: any[] = [];
      const mockK: any = {
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        rect: (w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts }),
        pos: (x: any, y?: number) =>
          typeof x === "object" && x !== null
            ? { type: "pos", x: x.x, y: x.y }
            : { type: "pos", x, y },
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
            if (c.type === "rect") {
              obj.width = c.w;
              obj.height = c.h;
            }
          }
          addedElements.push(obj);
          return obj;
        }),
      };
      return { mockK, addedElements };
    }

    it("cria botão estilizado com variante primária e item de foco acessível", () => {
      const { mockK, addedElements } = createMockKaboom();
      const onClick = vi.fn();

      const btnHandle = createCardButton(mockK, {
        label: "⚡ INICIAR DESAFIO",
        pos: { x: 500, y: 300 },
        width: 380,
        height: 44,
        variant: "primary",
        onClick,
      });

      expect(btnHandle.btn).toBeDefined();
      expect(btnHandle.txt).toBeDefined();
      expect(btnHandle.focusItem).toBeDefined();
      expect(btnHandle.focusItem.width).toBe(380);
      expect(btnHandle.focusItem.height).toBe(44);

      const labelObj = addedElements.find((el) => el.text === "⚡ INICIAR DESAFIO");
      expect(labelObj).toBeDefined();

      btnHandle.focusItem.onActivate();
      expect(onClick).toHaveBeenCalled();
    });
  });
});

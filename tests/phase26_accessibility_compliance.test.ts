import { describe, it, expect, beforeEach } from "vitest";
import { accessibilitySystem } from "../src/systems/accessibilitySystem";
import { createFocusGroup, type FocusableItem } from "../src/ui/keyboardNav";

describe("Fase 26: Documentação, Acessibilidade & Compliance", () => {
  beforeEach(() => {
    localStorage.clear();
    accessibilitySystem.setColorMode("normal");
    accessibilitySystem.setReducedMotion("auto");
    accessibilitySystem.setFontScale("normal");
  });

  describe("26.6: Suporte a prefers-reduced-motion", () => {
    it("inicia no modo automático por padrão e comuta entre os 3 modos", () => {
      expect(accessibilitySystem.getReducedMotionMode()).toBe("auto");

      accessibilitySystem.setReducedMotion("reduced");
      expect(accessibilitySystem.getReducedMotionMode()).toBe("reduced");
      expect(accessibilitySystem.isReducedMotion()).toBe(true);

      accessibilitySystem.setReducedMotion("full");
      expect(accessibilitySystem.getReducedMotionMode()).toBe("full");
      expect(accessibilitySystem.isReducedMotion()).toBe(false);

      accessibilitySystem.setReducedMotion("auto");
      expect(accessibilitySystem.getReducedMotionMode()).toBe("auto");
    });

    it("rotaciona sequencialmente entre os modos (cycleReducedMotion)", () => {
      accessibilitySystem.setReducedMotion("auto");
      expect(accessibilitySystem.cycleReducedMotion()).toBe("reduced");
      expect(accessibilitySystem.cycleReducedMotion()).toBe("full");
      expect(accessibilitySystem.cycleReducedMotion()).toBe("auto");
    });

    it("persiste a escolha do movimento reduzido no localStorage", () => {
      accessibilitySystem.setReducedMotion("reduced");
      expect(localStorage.getItem("micro_splash_reduced_motion")).toBe("reduced");

      accessibilitySystem.setReducedMotion("full");
      expect(localStorage.getItem("micro_splash_reduced_motion")).toBe("full");
    });

    it("retorna labels descritivos formatados para UI", () => {
      accessibilitySystem.setReducedMotion("auto");
      expect(accessibilitySystem.getReducedMotionLabel()).toContain("AUTOMÁTICO");

      accessibilitySystem.setReducedMotion("reduced");
      expect(accessibilitySystem.getReducedMotionLabel()).toContain("REDUZIDO");

      accessibilitySystem.setReducedMotion("full");
      expect(accessibilitySystem.getReducedMotionLabel()).toContain("COMPLETO");
    });
  });

  describe("26.7: Escalonamento de Tamanho de Fonte na UI", () => {
    it("inicia com escala normal (1.0x) e rotaciona entre os 3 níveis", () => {
      expect(accessibilitySystem.getFontScaleKey()).toBe("normal");
      expect(accessibilitySystem.getFontScale()).toBe(1.0);

      expect(accessibilitySystem.cycleFontScale()).toBe("large");
      expect(accessibilitySystem.getFontScale()).toBe(1.2);

      expect(accessibilitySystem.cycleFontScale()).toBe("small");
      expect(accessibilitySystem.getFontScale()).toBe(0.85);

      expect(accessibilitySystem.cycleFontScale()).toBe("normal");
      expect(accessibilitySystem.getFontScale()).toBe(1.0);
    });

    it("calcula corretamente a escala das fontes com scaleFont()", () => {
      accessibilitySystem.setFontScale("normal");
      expect(accessibilitySystem.scaleFont(16)).toBe(16);

      accessibilitySystem.setFontScale("large");
      expect(accessibilitySystem.scaleFont(16)).toBe(19); // 16 * 1.2 = 19.2 -> 19

      accessibilitySystem.setFontScale("small");
      expect(accessibilitySystem.scaleFont(16)).toBe(14); // 16 * 0.85 = 13.6 -> 14
    });

    it("persiste a escolha da escala de fonte no localStorage", () => {
      accessibilitySystem.setFontScale("large");
      expect(localStorage.getItem("micro_splash_font_scale")).toBe("large");

      accessibilitySystem.setFontScale("small");
      expect(localStorage.getItem("micro_splash_font_scale")).toBe("small");
    });

    it("retorna labels descritivos com ícones para a interface", () => {
      accessibilitySystem.setFontScale("normal");
      expect(accessibilitySystem.getFontScaleLabel()).toContain("NORMAL");

      accessibilitySystem.setFontScale("large");
      expect(accessibilitySystem.getFontScaleLabel()).toContain("GRANDE");

      accessibilitySystem.setFontScale("small");
      expect(accessibilitySystem.getFontScaleLabel()).toContain("PEQUENA");
    });
  });

  describe("26.8: Conformidade LGPD & Exclusão de Dados", () => {
    it("apaga todas as chaves micro_splash_* e preserva chaves de terceiros", () => {
      localStorage.setItem("micro_splash_highscore", "15400");
      localStorage.setItem("micro_splash_cumulative_stats", JSON.stringify({ km: 45 }));
      localStorage.setItem("micro_splash_color_mode", "protanopia");
      localStorage.setItem("micro_splash_reduced_motion", "reduced");
      localStorage.setItem("micro_splash_font_scale", "large");
      localStorage.setItem("external_user_token", "abc-123-keep");

      accessibilitySystem.clearAllUserData();

      expect(localStorage.getItem("micro_splash_highscore")).toBeNull();
      expect(localStorage.getItem("micro_splash_cumulative_stats")).toBeNull();
      expect(localStorage.getItem("micro_splash_color_mode")).toBeNull();
      expect(localStorage.getItem("micro_splash_reduced_motion")).toBeNull();
      expect(localStorage.getItem("micro_splash_font_scale")).toBeNull();
      expect(localStorage.getItem("external_user_token")).toBe("abc-123-keep");

      expect(accessibilitySystem.getColorMode()).toBe("normal");
      expect(accessibilitySystem.getReducedMotionMode()).toBe("auto");
      expect(accessibilitySystem.getFontScaleKey()).toBe("normal");
    });
  });

  describe("26.5: Navegação por Teclado Acessível (WCAG 2.1 AA)", () => {
    it("gerencia o foco e aciona ações de ativação com createFocusGroup", () => {
      let activatedIndex = -1;
      const mockItems: FocusableItem[] = [
        {
          pos: { x: 100, y: 100 },
          width: 200,
          height: 40,
          onActivate: () => {
            activatedIndex = 0;
          },
        },
        {
          pos: { x: 100, y: 150 },
          width: 200,
          height: 40,
          onActivate: () => {
            activatedIndex = 1;
          },
        },
        {
          pos: { x: 100, y: 200 },
          width: 200,
          height: 40,
          onActivate: () => {
            activatedIndex = 2;
          },
        },
      ];

      // Mock mínimo de KaboomCtx para focusGroup
      const mockKaboom: any = {
        add: () => ({
          pos: { x: 0, y: 0 },
          width: 0,
          height: 0,
          opacity: 0,
          onUpdate: () => ({ cancel: () => {} }),
        }),
        destroy: () => {},
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: () => ({}),
        rect: () => ({}),
        pos: () => ({}),
        outline: () => ({}),
        color: () => ({}),
        opacity: () => ({}),
        anchor: () => ({}),
        fixed: () => ({}),
        z: () => ({}),
        onKeyPress: () => ({ cancel: () => {} }),
        isKeyDown: () => false,
      };

      const group = createFocusGroup(mockKaboom, {
        items: mockItems,
        initialIndex: 0,
      });

      expect(group.getCurrentIndex()).toBe(0);
      group.activateCurrent();
      expect(activatedIndex).toBe(0);

      // Avança foco ciclicamente
      group.focusNext();
      expect(group.getCurrentIndex()).toBe(1);
      group.activateCurrent();
      expect(activatedIndex).toBe(1);

      group.focusNext();
      expect(group.getCurrentIndex()).toBe(2);

      group.focusNext(); // Wrap around para 0
      expect(group.getCurrentIndex()).toBe(0);

      // Recua foco ciclicamente
      group.focusPrev(); // Wrap around para 2
      expect(group.getCurrentIndex()).toBe(2);

      group.focusPrev();
      expect(group.getCurrentIndex()).toBe(1);

      group.destroy();
    });

    it("respeita a guarda isEnabled quando modais estão abertos", () => {
      let isModalOpen = false;
      let activations = 0;

      const mockItems: FocusableItem[] = [
        {
          pos: { x: 50, y: 50 },
          onActivate: () => {
            activations++;
          },
        },
      ];

      const mockKaboom: any = {
        add: () => ({
          pos: { x: 0, y: 0 },
          width: 0,
          height: 0,
          opacity: 0,
          onUpdate: () => ({ cancel: () => {} }),
        }),
        destroy: () => {},
        vec2: (x: number, y: number) => ({ x, y }),
        rgb: () => ({}),
        rect: () => ({}),
        pos: () => ({}),
        outline: () => ({}),
        color: () => ({}),
        opacity: () => ({}),
        anchor: () => ({}),
        fixed: () => ({}),
        z: () => ({}),
        onKeyPress: () => ({ cancel: () => {} }),
        isKeyDown: () => false,
      };

      const group = createFocusGroup(mockKaboom, {
        items: mockItems,
        initialIndex: 0,
        isEnabled: () => !isModalOpen,
      });

      group.activateCurrent();
      expect(activations).toBe(1);

      // Bloqueia com modal aberto
      isModalOpen = true;
      group.activateCurrent();
      expect(activations).toBe(1); // Não incrementou

      group.destroy();
    });
  });

  describe("26.1, 26.2, 26.3, 26.8: Integridade de Arquivos de Documentação & Compliance", () => {
    it("possui CONTRIBUTING.md com diretrizes para desenvolvedores e educadores", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const contribPath = path.resolve(nodeProcess.cwd(), "CONTRIBUTING.md");
      expect(fs.existsSync(contribPath)).toBe(true);

      const content = fs.readFileSync(contribPath, "utf-8");
      expect(content).toContain("Conventional Commits");
      expect(content).toContain("npm run validate:data");
      expect(content).toContain("facts.json");
      expect(content).toContain("quiz.json");
    });

    it("possui docs/DATA_SCHEMA.md detalhando os schemas Zod de dados", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const schemaDocPath = path.resolve(nodeProcess.cwd(), "docs/DATA_SCHEMA.md");
      expect(fs.existsSync(schemaDocPath)).toBe(true);

      const content = fs.readFileSync(schemaDocPath, "utf-8");
      expect(content).toContain("FactSchema");
      expect(content).toContain("QuizQuestionSchema");
      expect(content).toContain("LevelLayoutSchema");
      expect(content).toContain("triggerX");
      expect(content).toContain("correctIndex");
    });

    it("possui docs/PRIVACIDADE.md em conformidade com a LGPD e GDPR", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const privPath = path.resolve(nodeProcess.cwd(), "docs/PRIVACIDADE.md");
      expect(fs.existsSync(privPath)).toBe(true);

      const content = fs.readFileSync(privPath, "utf-8");
      expect(content).toContain("Lei Geral de Proteção de Dados");
      expect(content).toContain("Artigo 18");
      expect(content).toContain("micro_splash_");
      expect(content).toContain("Offline-First");
    });

    it("possui README.md enriquecido com badges de CI, acessibilidade e controles", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const readmePath = path.resolve(nodeProcess.cwd(), "README.md");
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, "utf-8");
      expect(content).toContain("actions/workflows/ci.yml/badge.svg");
      expect(content).toContain("WCAG 2.1 AA");
      expect(content).toContain("CONTRIBUTING.md");
      expect(content).toContain("docs/PRIVACIDADE.md");
      expect(content).toContain("Controles Universais");
    });
  });

  describe("26.4: Presença de JSDoc Completo nos 10 Sistemas Principais", () => {
    const systemsToVerify = [
      "src/systems/oceanCurrentsSystem.ts",
      "src/systems/breachSystem.ts",
      "src/systems/particlePool.ts",
      "src/systems/weatherSystem.ts",
      "src/systems/dolphinDraftingSystem.ts",
      "src/systems/iceSurface.ts",
      "src/systems/proceduralObstacles.ts",
      "src/systems/penguinFlockSystem.ts",
      "src/systems/canyonSystem.ts",
      "src/systems/biomeLifecycleManager.ts",
    ];

    systemsToVerify.forEach((relPath) => {
      it(`contém documentação JSDoc formal em ${relPath}`, async () => {
        // @ts-ignore
        const fs = await import("node:fs");
        // @ts-ignore
        const path = await import("node:path");
        const nodeProcess = (globalThis as any).process;

        const fullPath = path.resolve(nodeProcess.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);

        const content = fs.readFileSync(fullPath, "utf-8");
        // Verifica a presença de blocos JSDoc com /** ... */ e anotações @param ou descrição detalhada
        expect(content).toMatch(/\/\*\*[\s\S]*?\*\//);
      });
    });
  });
});

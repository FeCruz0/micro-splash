import { describe, it, expect, beforeEach } from "vitest";
import { analytics } from "../src/services/analytics";
import { errorReporter } from "../src/services/errorReporter";
import { i18n, t } from "../src/i18n/i18n";

describe("Fase 27: Marketing, Analytics, Conteúdo & Internacionalização", () => {
  beforeEach(() => {
    localStorage.clear();
    analytics.clearLog();
    errorReporter.clearLog();
    i18n.setLocale("pt-BR");
  });

  describe("27.1: Open Graph e Twitter Cards no index.html", () => {
    it("possui meta tags Open Graph e Twitter completas no index.html", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const indexPath = path.resolve(nodeProcess.cwd(), "index.html");
      expect(fs.existsSync(indexPath)).toBe(true);

      const html = fs.readFileSync(indexPath, "utf-8");

      // Canonical link
      expect(html).toContain('rel="canonical"');

      // Open Graph tags
      expect(html).toContain('property="og:type" content="website"');
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('property="og:image:width" content="1200"');
      expect(html).toContain('property="og:image:height" content="630"');

      // Twitter Cards tags
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain('name="twitter:title"');
      expect(html).toContain('name="twitter:description"');
      expect(html).toContain('name="twitter:image"');
    });
  });

  describe("27.2: Imagem de Preview Social (og-image.png) & Gerador", () => {
    it("possui script scripts/generateOgImage.cjs e gera PNG 1200x630 válido", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const scriptPath = path.resolve(nodeProcess.cwd(), "scripts/generateOgImage.cjs");
      expect(fs.existsSync(scriptPath)).toBe(true);

      const ogImagePath = path.resolve(nodeProcess.cwd(), "public/og-image.png");
      expect(fs.existsSync(ogImagePath)).toBe(true);

      const buffer = fs.readFileSync(ogImagePath);
      expect(buffer.length).toBeGreaterThan(15000);

      // Assinatura de 8 bytes de arquivo PNG válido
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
      expect(buffer[4]).toBe(0x0d);
      expect(buffer[5]).toBe(0x0a);
      expect(buffer[6]).toBe(0x1a);
      expect(buffer[7]).toBe(0x0a);

      // Leitura da largura e altura no chunk IHDR (offsets 16 e 20)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      expect(width).toBe(1200);
      expect(height).toBe(630);
    });

    it("possui o script npm 'generate:og' mapeado no package.json", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const pkgPath = path.resolve(nodeProcess.cwd(), "package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

      expect(pkg.scripts["generate:og"]).toBe("node scripts/generateOgImage.cjs");
      expect(pkg.scripts["generate"]).toContain("node scripts/generateOgImage.cjs");
    });
  });

  describe("27.3: Landing Page Estática Educacional (public/about.html)", () => {
    it("possui landing page educacional responsiva e estruturada", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const aboutPath = path.resolve(nodeProcess.cwd(), "public/about.html");
      expect(fs.existsSync(aboutPath)).toBe(true);

      const html = fs.readFileSync(aboutPath, "utf-8");

      expect(html).toContain("<!doctype html>");
      expect(html).toContain("Micro Splash");
      expect(html).toContain("<h1");
      expect(html).toContain("</h1>");
      expect(html).toContain('id="sobre"');
      expect(html).toContain('id="biologia"');
      expect(html).toContain('id="professores"');
      expect(html).toContain('id="totem"');
      expect(html).toContain('id="privacidade"');

      // Links essenciais
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/tools/editor.html"');
      expect(html).toContain("baleiajubarte.org.br");

      // QR Code SVG
      expect(html).toContain("<svg");
    });
  });

  describe("27.4: Analytics de Privacidade via Plausible (src/services/analytics.ts)", () => {
    it("opera em modo mock seguro por padrão e registra eventos tipados no buffer", async () => {
      expect(analytics.getEventLog().length).toBe(0);

      await analytics.trackGameStarted("standard", "dinamica");
      expect(analytics.getEventLog().length).toBe(1);
      expect(analytics.getEventLog()[0].name).toBe("game_started");
      expect(analytics.getEventLog()[0].props?.difficulty).toBe("standard");

      await analytics.trackBiomeReached("canyons", 19500);
      expect(analytics.getEventLog().length).toBe(2);
      expect(analytics.getEventLog()[1].name).toBe("biome_reached");
      expect(analytics.getEventLog()[1].props?.biomeName).toBe("canyons");

      await analytics.trackQuizTaken({
        questionId: "q_krill_1",
        isCorrect: true,
        biome: "antartica",
      });
      expect(analytics.getEventLog().length).toBe(3);
      expect(analytics.getEventLog()[2].name).toBe("quiz_taken");
      expect(analytics.getEventLog()[2].props?.isCorrect).toBe(true);

      await analytics.trackBreachTriggered({ distance: 26700, speed: 280 });
      expect(analytics.getEventLog().length).toBe(4);
      expect(analytics.getEventLog()[3].name).toBe("breach_triggered");

      await analytics.trackMigrationCompleted({
        score: 3500,
        distance: 30000,
        timeSeconds: 240,
        biomesPassed: 5,
      });
      expect(analytics.getEventLog().length).toBe(5);
      expect(analytics.getEventLog()[4].name).toBe("migration_completed");
      expect(analytics.getEventLog()[4].props?.score).toBe(3500);

      await analytics.trackMigrationAbandoned({
        distance: 8000,
        cause: "oxygen",
        biome: "pelagico",
      });
      expect(analytics.getEventLog().length).toBe(6);
      expect(analytics.getEventLog()[5].name).toBe("migration_abandoned");
      expect(analytics.getEventLog()[5].props?.cause).toBe("oxygen");

      analytics.clearLog();
      expect(analytics.getEventLog().length).toBe(0);
    });

    it("respeita a desativação explícita de rastreamento (DNT / setEnabled)", async () => {
      analytics.setEnabled(false);
      expect(analytics.isEnabled()).toBe(false);

      const res = await analytics.trackEvent("test_event");
      expect(res).toBe(false);
    });
  });

  describe("27.5: Relatório de Erros com Fallback (src/services/errorReporter.ts)", () => {
    it("opera sem falhas quando DSN não está configurado e armazena registros", () => {
      expect(errorReporter.isConfigured()).toBe(false);
      expect(errorReporter.getErrorLog().length).toBe(0);

      errorReporter.captureException(new Error("Erro de simulação WebGL"), {
        component: "iceSurface",
      });
      expect(errorReporter.getErrorLog().length).toBe(1);
      expect(errorReporter.getErrorLog()[0].message).toContain("Erro de simulação WebGL");
      expect(errorReporter.getErrorLog()[0].level).toBe("error");
      expect(errorReporter.getErrorLog()[0].context?.component).toBe("iceSurface");

      errorReporter.captureMessage("Autoplay bloqueado pelo navegador", "warning");
      expect(errorReporter.getErrorLog().length).toBe(2);
      expect(errorReporter.getErrorLog()[1].level).toBe("warning");

      errorReporter.clearLog();
      expect(errorReporter.getErrorLog().length).toBe(0);
    });
  });

  describe("27.6: Content Security Policy (CSP) & Headers de Segurança", () => {
    it("possui cabeçalhos CSP e Permissions-Policy configurados no nginx.conf", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const nginxPath = path.resolve(nodeProcess.cwd(), "nginx.conf");
      const nginx = fs.readFileSync(nginxPath, "utf-8");

      expect(nginx).toContain("Content-Security-Policy");
      expect(nginx).toContain("default-src 'self'");
      expect(nginx).toContain("Permissions-Policy");
    });

    it("possui arquivo public/_headers com diretivas estáticas para Cloudflare Pages", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const headersPath = path.resolve(nodeProcess.cwd(), "public/_headers");
      expect(fs.existsSync(headersPath)).toBe(true);

      const headers = fs.readFileSync(headersPath, "utf-8");
      expect(headers).toContain("Content-Security-Policy");
      expect(headers).toContain("X-Content-Type-Options: nosniff");
      expect(headers).toContain("X-Frame-Options: SAMEORIGIN");
    });
  });

  describe("27.7: Ferramenta de Edição de Conteúdo Educacional (tools/editor.html)", () => {
    it("possui CMS Lite autônomo com formulários para fatos e quiz", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const nodeProcess = (globalThis as any).process;

      const editorPath = path.resolve(nodeProcess.cwd(), "tools/editor.html");
      expect(fs.existsSync(editorPath)).toBe(true);

      const html = fs.readFileSync(editorPath, "utf-8");

      // Abas
      expect(html).toContain('id="tab-facts"');
      expect(html).toContain('id="tab-quiz"');

      // Campos de fatos
      expect(html).toContain('id="fact-id"');
      expect(html).toContain('id="fact-title"');
      expect(html).toContain('id="fact-location"');
      expect(html).toContain('id="fact-trigger-x"');
      expect(html).toContain('id="fact-desc"');

      // Campos de quiz
      expect(html).toContain('id="quiz-id"');
      expect(html).toContain('id="quiz-fact-id"');
      expect(html).toContain('id="quiz-biome"');
      expect(html).toContain('id="quiz-difficulty"');
      expect(html).toContain('id="quiz-question"');
      expect(html).toContain('id="quiz-opt-0"');
      expect(html).toContain('id="quiz-opt-3"');
      expect(html).toContain('id="quiz-explanation"');

      // Botão de exportação
      expect(html).toContain('id="btn-export-json"');
    });
  });

  describe("27.8 & 27.9: Internacionalização (i18n pt-BR, en-US e Guarani gn)", () => {
    it("inicia em pt-BR por padrão e resolve chaves aninhadas", () => {
      expect(i18n.getLocale()).toBe("pt-BR");
      expect(i18n.getLocaleLabel()).toContain("Português");
      expect(t("menu.title")).toBe("MICRO SPLASH");
      expect(t("menu.play")).toBe("INICIAR MIGRAÇÃO");
      expect(t("hud.oxygen")).toBe("OXIGÊNIO");
    });

    it("comuta perfeitamente para inglês en-US e traduz terminologias biológicas", () => {
      i18n.setLocale("en-US");
      expect(i18n.getLocale()).toBe("en-US");
      expect(i18n.getLocaleLabel()).toContain("English");

      expect(t("menu.play")).toBe("START MIGRATION");
      expect(t("menu.codex")).toBe("EXPEDITION LOG (CODEX)");
      expect(t("hud.oxygen")).toBe("OXYGEN");
      expect(t("biomes.antarctica")).toContain("Southern Ocean");
      expect(t("biomes.arraial")).toContain("Arraial do Cabo Nursery");
    });

    it("suporta línguas indígenas brasileiras (Guarani Nhandewa - gn)", () => {
      i18n.setLocale("gn");
      expect(i18n.getLocale()).toBe("gn");
      expect(i18n.getLocaleLabel()).toContain("Guarani");

      expect(t("menu.play")).toBe("ÑEPYRŨ (INICIAR)");
      expect(t("menu.options")).toBe("MBA'ERENDY (OPÇÕES)");
      expect(t("hud.oxygen")).toBe("PYTU (AR/OXIGÊNIO)");
      expect(t("biomes.antarctica")).toBe("Y Ro'ysã Para (Águas Antárticas)");
    });

    it("realiza interpolação dinâmica de parâmetros na string traduzida", () => {
      i18n.setLocale("pt-BR");
      expect(t("hud.distance", { dist: 1450 })).toBe("1450m");

      i18n.setLocale("en-US");
      expect(t("victory.score", { score: 9800 })).toBe("Final Score: 9800");
    });

    it("rotaciona sequencialmente entre os três idiomas (cycleNextLocale)", () => {
      i18n.setLocale("pt-BR");
      expect(i18n.cycleNextLocale()).toBe("en-US");
      expect(i18n.cycleNextLocale()).toBe("gn");
      expect(i18n.cycleNextLocale()).toBe("pt-BR");
    });

    it("persiste a escolha do idioma no localStorage ('micro_splash_locale')", () => {
      i18n.setLocale("en-US");
      expect(localStorage.getItem("micro_splash_locale")).toBe("en-US");

      i18n.setLocale("gn");
      expect(localStorage.getItem("micro_splash_locale")).toBe("gn");
    });

    it("retorna fallback para pt-BR caso uma chave não exista em outro locale", () => {
      i18n.setLocale("gn");
      // Testando chave inexistente com fallback
      expect(t("inexistente.chave.teste")).toBe("inexistente.chave.teste");
    });
  });
});

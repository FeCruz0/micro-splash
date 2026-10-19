import { describe, it, expect } from "vitest";
import packageJson from "../package.json" with { type: "json" };
import swRawContent from "../public/sw.js?raw";
import offlineHtmlRaw from "../public/offline.html?raw";

describe("Fase 47 — PWA Versionado & Experiência Offline Refinada", () => {
  describe("47.1 — Nome de Cache Derivado da Versão", () => {
    it("utiliza CACHE_NAME sincronizado com a versao do package.json", () => {
      const expectedCacheName = `micro-splash-v${packageJson.version}`;
      expect(swRawContent).toContain(`const CACHE_NAME = "${expectedCacheName}";`);
    });
  });

  describe("47.2 — Precache Completo de Recursos Estruturais e Educativos", () => {
    it("inclui dados essenciais (facts.json, quiz.json e fauna_manifest.json) no precache", () => {
      expect(swRawContent).toContain('"/data/facts.json"');
      expect(swRawContent).toContain('"/data/quiz.json"');
      expect(swRawContent).toContain('"/sprites/fauna_manifest.json"');
    });

    it("inclui paginas institucionais e de contingencia offline no precache", () => {
      expect(swRawContent).toContain('"/about.html"');
      expect(swRawContent).toContain('"/offline.html"');
    });

    it("inclui todas as fontes de alta resolucao no precache", () => {
      expect(swRawContent).toContain('"/fonts/Inter-SemiBold.ttf"');
      expect(swRawContent).toContain('"/fonts/Outfit-Bold.ttf"');
      expect(swRawContent).toContain('"/fonts/Orbitron-Bold.ttf"');
    });
  });

  describe("47.3 — Politica de Poda e Limite do Cache Dinamico (LRU)", () => {
    it("define constante MAX_DYNAMIC_CACHE_ITEMS e funcao trimCache", () => {
      expect(swRawContent).toContain("const MAX_DYNAMIC_CACHE_ITEMS = 60;");
      expect(swRawContent).toContain("async function trimCache(");
      expect(swRawContent).toContain("trimCache(CACHE_NAME);");
    });
  });

  describe("47.4 — Tela Offline Glassmorfica", () => {
    it("possui estrutura HTML5 valida e semantica", () => {
      expect(offlineHtmlRaw).toContain("<!DOCTYPE html>");
      expect(offlineHtmlRaw).toContain("<title>Micro Splash — Modo Offline</title>");
      expect(offlineHtmlRaw).toContain('class="offline-card"');
    });

    it("nao utiliza metodos nativos de dialogo do navegador (alert, confirm, prompt)", () => {
      expect(offlineHtmlRaw).not.toContain("alert(");
      expect(offlineHtmlRaw).not.toContain("confirm(");
      expect(offlineHtmlRaw).not.toContain("prompt(");
    });

    it("inclui botao tátil de recarga e link para a tela inicial", () => {
      expect(offlineHtmlRaw).toContain("window.location.reload()");
      expect(offlineHtmlRaw).toContain('href="/"');
    });
  });
});

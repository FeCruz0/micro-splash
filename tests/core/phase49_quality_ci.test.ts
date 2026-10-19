import { describe, it, expect } from "vitest";
import packageJson from "../../package.json" with { type: "json" };
import ciWorkflowRaw from "../../.github/workflows/ci.yml?raw";
import dependabotRaw from "../../.github/dependabot.yml?raw";
import vitestConfigRaw from "../../vitest.config.ts?raw";

describe("Fase 49 — Qualidade, Testes & Pipeline de CI", () => {
  describe("49.1 — Reorganização de Testes por Domínio", () => {
    it("possui todos os subdiretórios semânticos de teste em tests/", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir = (globalThis as any).process?.cwd?.() || "";

      const expectedDomains = ["player", "audio", "ui", "systems", "core"];
      for (const domain of expectedDomains) {
        const domainPath = path.join(rootDir, "tests", domain);
        expect(fs.existsSync(domainPath), `Diretório tests/${domain} deve existir`).toBe(true);
        const files = fs.readdirSync(domainPath).filter((f: string) => f.endsWith(".test.ts"));
        expect(
          files.length,
          `Diretório tests/${domain} deve conter arquivos de teste`
        ).toBeGreaterThan(0);
      }
    });

    it("raiz de tests/ mantém apenas subdiretórios de domínio e setup.ts", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir = (globalThis as any).process?.cwd?.() || "";

      const rootEntries = fs.readdirSync(path.join(rootDir, "tests"));
      const nonDirectoryFiles = rootEntries.filter((entry: string) => {
        const fullPath = path.join(rootDir, "tests", entry);
        return !fs.statSync(fullPath).isDirectory();
      });

      expect(nonDirectoryFiles).toEqual(["setup.ts"]);
    });
  });

  describe("49.2 — Limiar de Cobertura de Código (vitest.config.ts)", () => {
    it("define thresholds de cobertura para linhas, funções, branches e statements", () => {
      expect(vitestConfigRaw).toContain("thresholds:");
      expect(vitestConfigRaw).toContain("lines: 45");
      expect(vitestConfigRaw).toContain("functions: 45");
      expect(vitestConfigRaw).toContain("branches: 38");
      expect(vitestConfigRaw).toContain("statements: 45");
    });
  });

  describe("49.3 — Workflow de CI Completo (.github/workflows/ci.yml)", () => {
    it("executa lint, typecheck, auditoria, testes e build no pipeline", () => {
      expect(ciWorkflowRaw).toContain("npm run format:check");
      expect(ciWorkflowRaw).toContain("npm run lint");
      expect(ciWorkflowRaw).toContain("npm run validate:data");
      expect(ciWorkflowRaw).toContain("npx tsc --noEmit");
      expect(ciWorkflowRaw).toContain("npm audit --audit-level=high");
      expect(ciWorkflowRaw).toContain("npm run coverage");
      expect(ciWorkflowRaw).toContain("npm run build");
    });

    it("configura concorrência e cancelamento de execuções redundantes", () => {
      expect(ciWorkflowRaw).toContain("concurrency:");
      expect(ciWorkflowRaw).toContain("cancel-in-progress: true");
    });
  });

  describe("49.4 — Snapshots Visuais e Procedurais Determinísticos", () => {
    it("possui suíte de snapshots determinísticos implementada em tests/systems/", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir = (globalThis as any).process?.cwd?.() || "";

      const snapshotTestPath = path.join(rootDir, "tests/systems/proceduralSnapshots.test.ts");
      expect(fs.existsSync(snapshotTestPath)).toBe(true);
    });
  });

  describe("49.5 — Auditoria de Dependências & Dependabot", () => {
    it("configura dependabot para npm e github-actions semanalmente", () => {
      expect(dependabotRaw).toContain('package-ecosystem: "npm"');
      expect(dependabotRaw).toContain('package-ecosystem: "github-actions"');
      expect(dependabotRaw).toContain('interval: "weekly"');
    });
  });

  describe("49.6 — Script Agregador npm run check", () => {
    it("package.json expõe o comando unificado check", () => {
      expect(packageJson.scripts).toHaveProperty("check");
      const checkScript = packageJson.scripts.check;
      expect(checkScript).toContain("npm run format:check");
      expect(checkScript).toContain("npm run lint");
      expect(checkScript).toContain("npm run validate:data");
      expect(checkScript).toContain("tsc --noEmit");
      expect(checkScript).toContain("npm run test");
      expect(checkScript).toContain("npm run build");
    });
  });
});

import { describe, it, expect } from "vitest";
import architectureRaw from "../../docs/ARCHITECTURE.md?raw";
import changelogRaw from "../../CHANGELOG.md?raw";
import roadmapRaw from "../../docs/ROADMAP.md?raw";

describe("Fase 52: Consistência Documental e Experiência do Desenvolvedor", () => {
  describe("52.1: Integridade do docs/ARCHITECTURE.md", () => {
    it("arquivo de arquitetura possui conteúdo substantivo", () => {
      expect(architectureRaw.length).toBeGreaterThan(4000);
    });

    it("contém diagramas Mermaid válidos para ciclo de cenas, pipeline e áudio", () => {
      const mermaidMatches = architectureRaw.match(/```mermaid[\s\S]*?```/g);
      expect(mermaidMatches).not.toBeNull();
      expect(mermaidMatches!.length).toBeGreaterThanOrEqual(3);

      // Valida diagrama da pipeline da baleia
      expect(architectureRaw).toContain("executeWhaleRenderPipeline");
      expect(architectureRaw).toContain("playerRenderPipeline.ts");
    });

    it("documenta todos os subsistemas biomecânicos e de renderização da jubarte", () => {
      const requiredModules = [
        "playerRenderPipeline.ts",
        "playerPuppetRig.ts",
        "playerSliceRenderer.ts",
        "playerPectoralFin.ts",
        "playerBreathPalette.ts",
        "playerAnimation.ts",
        "playerDrift.ts",
      ];

      for (const moduleName of requiredModules) {
        expect(architectureRaw).toContain(moduleName);
      }
    });

    it("documenta persistência com schemas Zod, PWA versionado e culling de performance", () => {
      expect(architectureRaw).toContain("storage.ts");
      expect(architectureRaw).toContain("storageSchemas.ts");
      expect(architectureRaw).toContain("trimCache");
      expect(architectureRaw).toContain("spatialCullingSystem.ts");
    });

    it("valida que caminhos de arquivos citados na arquitetura existem no disco", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir =
        (globalThis as unknown as { process?: { cwd?: () => string } }).process?.cwd?.() || "";

      const citedFiles = [
        "src/entities/player/playerRenderPipeline.ts",
        "src/entities/player/playerPuppetRig.ts",
        "src/entities/player/playerSliceRenderer.ts",
        "src/entities/player/playerPectoralFin.ts",
        "src/entities/player/playerBreathPalette.ts",
        "src/utils/storage.ts",
        "src/utils/contrast.ts",
        "src/ui/animationUtils.ts",
        "src/ui/keyboardNav.ts",
        "public/offline.html",
      ];

      for (const relativePath of citedFiles) {
        const fullPath = path.join(rootDir, relativePath);
        expect(fs.existsSync(fullPath), `Arquivo ${relativePath} deve existir`).toBe(true);
      }
    });
  });

  describe("52.2: Reconciliação do CHANGELOG.md (Fases 38 a 44)", () => {
    it("arquivo de changelog possui estrutura Keep a Changelog", () => {
      expect(changelogRaw).toContain("# Changelog");
      expect(changelogRaw).toContain("Keep a Changelog");
    });

    it("contém seções formais para as fases históricas 38 a 44", () => {
      const expectedPhaseHeaders = [
        "Fase 38",
        "Fase 39",
        "Fase 40",
        "Fase 41",
        "Fase 42",
        "Fase 43",
        "Fase 44",
      ];

      for (const header of expectedPhaseHeaders) {
        expect(changelogRaw).toContain(header);
      }
    });

    it("contém documentação das fases recentes 50 e 51", () => {
      expect(changelogRaw).toContain("Fase 50");
      expect(changelogRaw).toContain("Fase 51");
    });
  });

  describe("52.3: Reconciliação do ROADMAP.md", () => {
    it("ROADMAP.md define e categoriza todas as fases planejadas", () => {
      expect(roadmapRaw).toContain("FASE 51:");
      expect(roadmapRaw).toContain("FASE 52:");
      expect(roadmapRaw).toContain("FASE 53:");
    });
  });
});

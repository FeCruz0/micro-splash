import { describe, it, expect } from "vitest";
import packageJson from "../../package.json" with { type: "json" };
import codexRaw from "../../src/ui/codexScreen.ts?raw";
import optionsRaw from "../../src/ui/optionsScreen.ts?raw";
import mainRaw from "../../src/main.ts?raw";
import uiIndexRaw from "../../src/ui/index.ts?raw";
import {
  PLAYER_ANIMATION_CONFIG,
  ACCESSIBILITY_VISUAL_CONFIG,
  ENVIRONMENT_CONFIG,
} from "../../src/config";
import { DEFAULT_LEADERBOARD } from "../../src/types/leaderboard";
import { audioSystem } from "../../src/systems/audio/index";
import { audioSystem as audioSystemFacade } from "../../src/systems/audioSystem";
import { loadAllGameAssets } from "../../src/scenes/assetLoader";

describe("Fase 48 — Decomposição Arquitetural & Organização de Módulos", () => {
  describe("48.1 — Decomposição de Telas e Entidades Monolíticas", () => {
    it("codexScreen.ts possui menos de 300 linhas de código", () => {
      const lines = codexRaw.split("\n").length;
      expect(lines).toBeLessThan(300);
    });

    it("optionsScreen.ts possui menos de 300 linhas de código", () => {
      const lines = optionsRaw.split("\n").length;
      expect(lines).toBeLessThan(300);
    });

    it("extrai submódulos de navegação para codex e options", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir = (globalThis as any).process?.cwd?.() || "";

      const codexNavExists = fs.existsSync(path.join(rootDir, "src/ui/codex/codexNavigation.ts"));
      const optionsNavExists = fs.existsSync(
        path.join(rootDir, "src/ui/options/optionsNavigation.ts")
      );
      expect(codexNavExists).toBe(true);
      expect(optionsNavExists).toBe(true);
    });

    it("extrai submódulos de física e colisão de player.ts", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir = (globalThis as any).process?.cwd?.() || "";

      expect(fs.existsSync(path.join(rootDir, "src/entities/player/playerDrift.ts"))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, "src/entities/player/playerCaustics.ts"))).toBe(true);
      expect(fs.existsSync(path.join(rootDir, "src/entities/player/playerCollision.ts"))).toBe(
        true
      );
    });
  });

  describe("48.2 — Extração de Cenas e Registro de Sprites", () => {
    it("assetLoader.ts existe e exporta carregador centralizado de recursos", () => {
      expect(typeof loadAllGameAssets).toBe("function");
    });

    it("src/main.ts orquestra o carregamento via loadAllGameAssets sem carregar atlas inline redundantes", () => {
      expect(mainRaw).toContain("loadAllGameAssets");
      expect(mainRaw).not.toContain("orca_bg:");
      expect(mainRaw).not.toContain("cachalote_bg:");
    });
  });

  describe("48.3 — Padronização de Responsabilidades (Áudio e Leaderboard)", () => {
    it("audioSystem.ts re-exporta a implementação de systems/audio/index.ts", () => {
      expect(audioSystemFacade).toBe(audioSystem);
    });

    it("contrato de leaderboard é segregado em src/types/leaderboard.ts", () => {
      expect(DEFAULT_LEADERBOARD).toBeDefined();
      expect(Array.isArray(DEFAULT_LEADERBOARD)).toBe(true);
      expect(DEFAULT_LEADERBOARD.length).toBeGreaterThan(0);
      expect(DEFAULT_LEADERBOARD[0]).toHaveProperty("initials");
      expect(DEFAULT_LEADERBOARD[0]).toHaveProperty("score");
    });
  });

  describe("48.4 — Reorganização Estrutural de src/ui/", () => {
    it("possui diretórios semânticos de UI estruturados com barrels index.ts", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const path = await import("node:path");
      const rootDir = (globalThis as any).process?.cwd?.() || "";

      const dirs = ["screens", "modals", "hud", "shared"];
      for (const dir of dirs) {
        const indexPath = path.join(rootDir, `src/ui/${dir}/index.ts`);
        expect(fs.existsSync(indexPath), `Barrel index.ts deve existir em src/ui/${dir}/`).toBe(
          true
        );
      }
    });

    it("src/ui/index.ts re-exporta as camadas semânticas principais", () => {
      expect(uiIndexRaw).toContain('export * from "./screens/index"');
      expect(uiIndexRaw).toContain('export * from "./modals/index"');
      expect(uiIndexRaw).toContain('export * from "./hud/index"');
      expect(uiIndexRaw).toContain('export * from "./shared/index"');
    });
  });

  describe("48.5 — Segmentação de Domínio e Constantes Nomeadas", () => {
    it("config.ts exporta blocos semânticos PLAYER_ANIMATION_CONFIG, ACCESSIBILITY_VISUAL_CONFIG e ENVIRONMENT_CONFIG", () => {
      expect(PLAYER_ANIMATION_CONFIG).toBeDefined();
      expect(PLAYER_ANIMATION_CONFIG.STROKE_DOWN_PHASE_THRESHOLD).toBe(0.55);
      expect(PLAYER_ANIMATION_CONFIG.FEED_TIMER_DURATION).toBe(0.55);

      expect(ACCESSIBILITY_VISUAL_CONFIG).toBeDefined();
      expect(ACCESSIBILITY_VISUAL_CONFIG.HIGH_CONTRAST_OPACITY).toBe(0.55);

      expect(ENVIRONMENT_CONFIG).toBeDefined();
      expect(ENVIRONMENT_CONFIG.BUBBLE_VENT_MAX_LIFE).toBe(0.55);
    });
  });

  describe("48.6 — Modernização dos Scripts Geradores em ESM", () => {
    it("scripts/shared/pngWriter.mjs gera buffers de imagem válidos com assinatura PNG e CRC32", async () => {
      // @ts-ignore
      const { encodePng, crc32 } = await import("../../scripts/shared/pngWriter.mjs");
      expect(typeof crc32).toBe("function");
      expect(typeof encodePng).toBe("function");

      const width = 2;
      const height = 2;
      const NodeBuffer = (globalThis as any).Buffer;
      const rgba = NodeBuffer.alloc(width * height * 4, 255);
      const pngBuffer = encodePng(width, height, rgba);

      // Assinatura PNG: [137, 80, 78, 71, 13, 10, 26, 10]
      expect(pngBuffer[0]).toBe(0x89);
      expect(pngBuffer[1]).toBe(0x50); // P
      expect(pngBuffer[2]).toBe(0x4e); // N
      expect(pngBuffer[3]).toBe(0x47); // G
    });

    it("package.json utiliza scripts em formato .mjs", () => {
      expect(packageJson.scripts.build).toContain("buildSw.mjs");
      expect(packageJson.scripts["generate:atlas"]).toContain("generateFaunaAtlas.mjs");
      expect(packageJson.scripts["generate:icons"]).toContain("generatePwaIcons.mjs");
    });
  });
});

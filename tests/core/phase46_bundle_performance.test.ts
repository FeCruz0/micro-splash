import { describe, it, expect, beforeEach } from "vitest";
import {
  SpatialCullingManager,
  type CullableSubsystem,
} from "../../src/systems/spatialCullingSystem";
import { BiomeLifecycleManager } from "../../src/systems/biomeLifecycleManager";
import faunaManifest from "../../public/sprites/fauna_manifest.json";

describe("Fase 46 — Bundle, Code-Splitting & Performance de Renderização", () => {
  const sourceModules = import.meta.glob("../../src/**/*.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  describe("46.3 — Eliminação Universal de k.get() Residual em Simulação", () => {
    it("não permite chamadas diretas ou fallbacks a k.get(TAGS.PLAYER) em entidades e simulações", () => {
      const filesToCheck = [
        "../../src/systems/penguinFlockSystem.ts",
        "../../src/systems/iceSurface.ts",
        "../../src/entities/krill.ts",
      ];

      for (const filePath of filesToCheck) {
        const content = sourceModules[filePath];
        expect(content).toBeDefined();
        expect(content).not.toContain("k.get(TAGS.PLAYER)");
        expect(content).not.toContain("k.get ? k.get(TAGS.PLAYER)");
      }
    });

    it("utiliza getActivePlayerObject em vez de varreduras lineares em penguinFlockSystem e krill", () => {
      expect(sourceModules["../../src/systems/penguinFlockSystem.ts"]).toContain(
        "getActivePlayerObject()"
      );
      expect(sourceModules["../../src/entities/krill.ts"]).toContain("getActivePlayerObject()");
    });

    it("não executa 6 chamadas literais consecutivas this.k.get() no sonar", () => {
      const sonarContent = sourceModules["../../src/entities/player/playerSonar.ts"];
      expect(sonarContent).toBeDefined();
      expect(sonarContent).not.toContain("...this.k.get(TAGS.TRASH)");
      expect(sonarContent).not.toContain("...this.k.get(TAGS.KRILL)");
      expect(sonarContent).not.toContain("...this.k.get(TAGS.NET)");
    });
  });

  describe("46.2 — Culling Espacial de Subsistemas e Ciclo de Vida", () => {
    let mockKaboom: { width: () => number; height: () => number };

    beforeEach(() => {
      mockKaboom = {
        width: () => 800,
        height: () => 600,
      };
    });

    it("registra e comuta a visibilidade de subsistemas no SpatialCullingManager", () => {
      const culling = new SpatialCullingManager(mockKaboom as any, 100);
      let isSystemVisible = false;

      const testSubsystem: CullableSubsystem = {
        id: "pelagic_weather_test",
        getBounds: () => ({ minX: 5000, maxX: 12000 }),
        setVisible: (visible: boolean) => {
          isSystemVisible = visible;
        },
      };

      culling.registerSubsystem(testSubsystem);
      expect(culling.getSubsystems().length).toBe(1);

      // Câmera a 1000m (muito antes de 5000m): subsistema deve ser culled (invisível)
      culling.update(1000);
      expect(isSystemVisible).toBe(false);

      // Câmera a 8000m (dentro da faixa de 5000m-12000m): subsistema deve ser visível
      culling.update(8000);
      expect(isSystemVisible).toBe(true);

      // Câmera a 20000m (muito após 12000m): subsistema deve ser culled (invisível)
      culling.update(20000);
      expect(isSystemVisible).toBe(false);
    });

    it("gerencia o ciclo de vida de subsistemas no BiomeLifecycleManager com histerese", () => {
      const biomeManager = new BiomeLifecycleManager(undefined, 200);
      let isMarineSnowActive = false;

      biomeManager.registerModule({
        id: "marine_snow_system",
        name: "Neve Marinha",
        minX: 5000,
        maxX: 12000,
        activate: () => {
          isMarineSnowActive = true;
        },
        deactivate: () => {
          isMarineSnowActive = false;
        },
        isActive: () => isMarineSnowActive,
      });

      // Fora da faixa
      biomeManager.update(1000);
      expect(isMarineSnowActive).toBe(false);

      // Dentro da faixa
      biomeManager.update(6000);
      expect(isMarineSnowActive).toBe(true);

      // Na margem de histerese (12100m <= 12200m) deve permanecer ativo
      biomeManager.update(12100);
      expect(isMarineSnowActive).toBe(true);

      // Além da histerese (> 12200m) deve desativar
      biomeManager.update(12300);
      expect(isMarineSnowActive).toBe(false);
    });
  });

  describe("46.4 — Atlas de Fauna Secundária e Integridade de Assets", () => {
    it("valida conformidade do manifesto de atlas fauna_manifest.json", () => {
      expect(faunaManifest).toHaveProperty("orca_bg");
      expect(faunaManifest).toHaveProperty("humpback_bg");
      expect(faunaManifest).toHaveProperty("cachalote_bg");

      const orca = (faunaManifest as any).orca_bg;
      expect(orca.sliceX).toBe(4);
      expect(orca.frameWidth).toBe(96);
      expect(orca.frameHeight).toBe(40);
      expect(orca.totalWidth).toBe(384);
    });
  });

  describe("46.1 — Code-Splitting e Configuração de Manual Chunks", () => {
    it("utiliza dynamic import para carregar modais pesados nas telas de menu e vitória", () => {
      const menuSceneContent = sourceModules["../../src/scenes/menuScene.ts"];
      expect(menuSceneContent).toContain('import("../ui/modeSelectScreen")');
      expect(menuSceneContent).toContain('import("../ui/optionsScreen")');
      expect(menuSceneContent).toContain('import("../ui/codexScreen")');

      const victoryContent = sourceModules["../../src/ui/victoryScreen.ts"];
      expect(victoryContent).toContain('import("./quizModal")');
      expect(victoryContent).toContain('import("./shareModal")');
      expect(victoryContent).toContain('import("./victoryCard")');
    });
  });
});

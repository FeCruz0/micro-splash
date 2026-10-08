import { describe, it, expect, beforeEach } from "vitest";
import {
  isEntityInFrustum,
  SpatialCullingManager,
  initSpatialCullingManager,
  getSpatialCullingManager,
} from "../src/systems/spatialCullingSystem";
import { getActivePlayerObject, setActivePlayerObject } from "../src/entities/player";

describe("Fase 39: Otimização de Desempenho e Frustum Culling", () => {
  describe("isEntityInFrustum (Cálculo Puro)", () => {
    const screenWidth = 800;
    const margin = 100;
    const cameraX = 1000;

    it("identifica entidade no centro da câmera como visível", () => {
      const inFrustum = isEntityInFrustum(1000, cameraX, screenWidth, margin);
      expect(inFrustum).toBe(true);
    });

    it("identifica entidade dentro da margem de histerese como visível", () => {
      // Borda direita visível: 1000 + 400 + 100 = 1500
      expect(isEntityInFrustum(1490, cameraX, screenWidth, margin)).toBe(true);
      // Borda esquerda visível: 1000 - 400 - 100 = 500
      expect(isEntityInFrustum(510, cameraX, screenWidth, margin)).toBe(true);
    });

    it("identifica entidade além da borda direita como invisível (culled)", () => {
      expect(isEntityInFrustum(1510, cameraX, screenWidth, margin)).toBe(false);
      expect(isEntityInFrustum(2500, cameraX, screenWidth, margin)).toBe(false);
    });

    it("identifica entidade antes da borda esquerda como invisível (culled)", () => {
      expect(isEntityInFrustum(490, cameraX, screenWidth, margin)).toBe(false);
      expect(isEntityInFrustum(100, cameraX, screenWidth, margin)).toBe(false);
    });

    it("respeita margens customizadas", () => {
      expect(isEntityInFrustum(1600, cameraX, screenWidth, 300)).toBe(true);
      expect(isEntityInFrustum(1800, cameraX, screenWidth, 300)).toBe(false);
    });
  });

  describe("SpatialCullingManager", () => {
    let mockKaboom: any;

    beforeEach(() => {
      mockKaboom = {
        width: () => 800,
        height: () => 600,
      };
    });

    it("registra entidades e atualiza visibilidade conforme o deslocamento da câmera", () => {
      const manager = new SpatialCullingManager(mockKaboom, 100);

      const nearEntity: any = { hidden: false, exists: () => true };
      const farEntity: any = { hidden: false, exists: () => true };
      const dynamicEntity: any = { pos: { x: 500 }, hidden: false, exists: () => true };

      manager.registerEntity(nearEntity, 400);
      manager.registerEntity(farEntity, 5000);
      manager.registerEntity(dynamicEntity, () => dynamicEntity.pos.x);

      // Câmera em X = 400
      manager.update(400);

      expect(nearEntity.hidden).toBe(false);
      expect(dynamicEntity.hidden).toBe(false);
      expect(farEntity.hidden).toBe(true);

      const statsStart = manager.getStats();
      expect(statsStart.totalEntities).toBe(3);
      expect(statsStart.culledEntities).toBe(1);

      // Câmera desloca-se para X = 5000
      manager.update(5000);

      expect(nearEntity.hidden).toBe(true);
      expect(dynamicEntity.hidden).toBe(true);
      expect(farEntity.hidden).toBe(false);

      const statsEnd = manager.getStats();
      expect(statsEnd.culledEntities).toBe(2);
    });

    it("remove automaticamente entidades destruídas durante a varredura", () => {
      const manager = new SpatialCullingManager(mockKaboom, 100);

      let existsFlag = true;
      const destroyedEntity: any = {
        hidden: false,
        exists: () => existsFlag,
      };
      const aliveEntity: any = {
        hidden: false,
        exists: () => true,
      };

      manager.registerEntity(destroyedEntity, 400);
      manager.registerEntity(aliveEntity, 400);

      manager.update(400);
      expect(manager.getStats().totalEntities).toBe(2);

      // Simula destruição da entidade no Kaboom
      existsFlag = false;
      manager.update(400);

      expect(manager.getStats().totalEntities).toBe(1);
    });

    it("gerencia o ciclo de vida do singleton global", () => {
      const initialized = initSpatialCullingManager(mockKaboom, 150);
      expect(initialized).toBeDefined();
      expect(getSpatialCullingManager()).toBe(initialized);

      initialized.reset();
      expect(initialized.getStats().totalEntities).toBe(0);
    });
  });

  describe("Player Reference Singleton (O(1) Access)", () => {
    it("permite acesso e limpeza do jogador em O(1) sem varredura linear de tags", () => {
      const mockPlayerObj: any = { pos: { x: 120, y: 340 }, isPlayer: true };

      setActivePlayerObject(mockPlayerObj);
      expect(getActivePlayerObject()).toBe(mockPlayerObj);

      setActivePlayerObject(null);
      expect(getActivePlayerObject()).toBeNull();
    });
  });
});

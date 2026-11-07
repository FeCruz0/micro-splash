import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  EntityFamilyTicker,
  initEntityFamilyTicker,
  getEntityFamilyTicker,
  type EntityFamilyMember,
} from "../../src/systems/entityFamilyTicker";

describe("Etapa 2.4 - EntityFamilyTicker & Frustum Culling Centralizado", () => {
  let mockEngineContext: { width: () => number };

  beforeEach(() => {
    mockEngineContext = {
      width: () => 1280,
    };
  });

  it("deve inicializar e gerenciar singleton via initEntityFamilyTicker e getEntityFamilyTicker", () => {
    const tickerInstance = initEntityFamilyTicker(mockEngineContext, 700);
    expect(tickerInstance).toBeInstanceOf(EntityFamilyTicker);
    expect(getEntityFamilyTicker()).toBe(tickerInstance);
  });

  it("deve registrar e categorizar entidades nas 8 famílias suportadas", () => {
    const ticker = new EntityFamilyTicker(mockEngineContext, 700);

    const families = [
      "krill",
      "net",
      "trash",
      "boat",
      "ship",
      "penguin",
      "dolphin",
      "current",
    ] as const;

    families.forEach((family, index) => {
      ticker.registerEntity({
        id: `${family}_${index}`,
        family,
        getXPosition: () => 1000,
        width: 50,
        update: vi.fn(),
      });
    });

    expect(ticker.getEntityCount()).toBe(8);
    families.forEach((family) => {
      expect(ticker.getEntitiesInFamily(family).length).toBe(1);
    });
  });

  it("deve executar update exclusivamente para entidades dentro do frustum da câmera", () => {
    const ticker = new EntityFamilyTicker(mockEngineContext, 700);
    // Camera está em x = 1000, tela 1280px (metade = 640px) + margem 700px => frustum visível de -340 a 2340
    const cameraPositionX = 1000;

    const visibleUpdateSpy = vi.fn();
    const offscreenUpdateSpy = vi.fn();

    const visibleMember: EntityFamilyMember = {
      id: "krill_visible",
      family: "krill",
      getXPosition: () => 1200,
      width: 40,
      update: visibleUpdateSpy,
      targetObject: { hidden: false, paused: false },
    };

    const offscreenMember: EntityFamilyMember = {
      id: "krill_offscreen",
      family: "krill",
      getXPosition: () => 5000, // Fora do frustum
      width: 40,
      update: offscreenUpdateSpy,
      targetObject: { hidden: false, paused: false },
    };

    ticker.registerEntity(visibleMember);
    ticker.registerEntity(offscreenMember);

    ticker.update(0.016, cameraPositionX);

    // Entidade no frustum deve ser atualizada e permanecer visível/ativa
    expect(visibleUpdateSpy).toHaveBeenCalledWith(0.016);
    expect(visibleMember.targetObject?.hidden).toBe(false);
    expect(visibleMember.targetObject?.paused).toBe(false);

    // Entidade fora do frustum não deve receber update e deve ser pausada/ocultada
    expect(offscreenUpdateSpy).not.toHaveBeenCalled();
    expect(offscreenMember.targetObject?.hidden).toBe(true);
    expect(offscreenMember.targetObject?.paused).toBe(true);
  });

  it("deve reativar a entidade quando a câmera se aproximar do seu campo visual", () => {
    const ticker = new EntityFamilyTicker(mockEngineContext, 700);
    const updateSpy = vi.fn();

    const entity: EntityFamilyMember = {
      id: "boat_patrol",
      family: "boat",
      getXPosition: () => 2000,
      width: 100,
      update: updateSpy,
      targetObject: { hidden: false, paused: false },
    };

    ticker.registerEntity(entity);

    // Câmera longe (x = 0): entidade em 2000 está fora do frustum (-1340 a 1340)
    ticker.update(0.016, 0);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(entity.targetObject?.hidden).toBe(true);

    // Câmera avança (x = 1800): entidade em 2000 entra no frustum
    ticker.update(0.016, 1800);
    expect(updateSpy).toHaveBeenCalledWith(0.016);
    expect(entity.targetObject?.hidden).toBe(false);
    expect(entity.targetObject?.paused).toBe(false);
  });

  it("deve desregistrar entidade individualmente via unregisterEntity ou função retornada", () => {
    const ticker = new EntityFamilyTicker(mockEngineContext, 700);

    const unsubscribe = ticker.registerEntity({
      id: "net_discarded",
      family: "net",
      getXPosition: () => 1000,
      update: vi.fn(),
    });

    expect(ticker.getEntityCount()).toBe(1);

    unsubscribe();
    expect(ticker.getEntityCount()).toBe(0);
    expect(ticker.getEntitiesInFamily("net").length).toBe(0);
  });

  it("deve purgar automaticamente entidades destruídas durante o ciclo de update", () => {
    const ticker = new EntityFamilyTicker(mockEngineContext, 700);
    let destroyed = false;

    ticker.registerEntity({
      id: "trash_item",
      family: "trash",
      getXPosition: () => 1000,
      update: vi.fn(),
      isDestroyed: () => destroyed,
    });

    expect(ticker.getEntityCount()).toBe(1);

    // Primeiro update: entidade ainda existe
    ticker.update(0.016, 1000);
    expect(ticker.getEntityCount()).toBe(1);

    // Entidade é marcada como destruída
    destroyed = true;
    ticker.update(0.016, 1000);

    // Deve ser expurgada do índice e do bucket da família
    expect(ticker.getEntityCount()).toBe(0);
    expect(ticker.getEntitiesInFamily("trash").length).toBe(0);
  });

  it("deve limpar todos os registros ao invocar clear()", () => {
    const ticker = new EntityFamilyTicker(mockEngineContext, 700);

    ticker.registerEntity({
      id: "penguin_1",
      family: "penguin",
      getXPosition: () => 500,
      update: vi.fn(),
    });

    ticker.registerEntity({
      id: "dolphin_1",
      family: "dolphin",
      getXPosition: () => 8000,
      update: vi.fn(),
    });

    expect(ticker.getEntityCount()).toBe(2);

    ticker.clear();
    expect(ticker.getEntityCount()).toBe(0);
    expect(ticker.getEntitiesInFamily("penguin").length).toBe(0);
    expect(ticker.getEntitiesInFamily("dolphin").length).toBe(0);
  });
});

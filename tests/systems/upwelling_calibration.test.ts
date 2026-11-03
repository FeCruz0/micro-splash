import { describe, it, expect } from "vitest";
import { GAME_CONFIG } from "../../src/config";
import { computeUpwellingVerticalForce } from "../../src/systems/upwellingSystem";

describe("Calibração da Ressurgência (Arraial do Cabo)", () => {
  it("deve calibrar a força vertical ascendente vigorosa (-98 e -9.0)", () => {
    expect(GAME_CONFIG.UPWELLING_PUSH_Y).toBe(-98);
    expect(GAME_CONFIG.UPWELLING_COLLISION_FORCE_Y).toBe(-9.0);
    expect(GAME_CONFIG.UPWELLING_SURFACE_LOCK_DISTANCE).toBe(55);
    expect(GAME_CONFIG.UPWELLING_PUSH_Y).toBeLessThan(0);
  });

  it("deve zerar o empuxo ascendente a menos de 55px abaixo da linha d'água", () => {
    const nearSurface = GAME_CONFIG.SEA_LEVEL + 30;
    expect(computeUpwellingVerticalForce(nearSurface)).toBe(0);
    expect(computeUpwellingVerticalForce(GAME_CONFIG.SEA_LEVEL - 20)).toBe(0);
    expect(computeUpwellingVerticalForce(GAME_CONFIG.SEA_LEVEL + 55)).toBe(0);
  });

  it("deve aplicar o empuxo vigoroso em águas mais profundas", () => {
    const deepY = GAME_CONFIG.SEA_LEVEL + 200;
    expect(computeUpwellingVerticalForce(deepY)).toBe(-9.0);
  });

  it("nunca deve bloquear forças descendentes próximas à superfície", () => {
    expect(computeUpwellingVerticalForce(GAME_CONFIG.SEA_LEVEL + 10, 5)).toBe(5);
  });
});

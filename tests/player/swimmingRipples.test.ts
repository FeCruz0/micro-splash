import { describe, it, expect, beforeEach } from "vitest";
import {
  spawnTailWaterRipples,
  spawnTailBubbleTrail,
} from "../../src/entities/player/playerParticles";
import { setParticlePool } from "../../src/systems/particlePool";
import { createMockRenderEngineHarness } from "../testUtils/mockRenderEngine";

describe("Ondulações na Água (Water Ripples vs. Hélice/Torpedo)", () => {
  beforeEach(() => {
    setParticlePool(null);
  });

  it("emite ondulações translúcidas na cauda com expansão suave via IRenderEngine nativo", () => {
    const harness = createMockRenderEngineHarness();
    spawnTailWaterRipples(harness.renderEngine, { x: 100, y: 200 }, 0, true, 1.0);

    const rippleNodes = harness.createdGraphicsNodes.filter(
      (node) => node.id === "player_tail_water_ripple"
    );
    expect(rippleNodes.length).toBeGreaterThanOrEqual(1);

    const primaryRipple = rippleNodes[0];
    expect(primaryRipple.drawCircle).toHaveBeenCalledTimes(1);

    // Simula atualização temporal no ticker nativo: raio deve crescer (expansão da ondulação)
    harness.advanceTicker(0.016);
    expect(primaryRipple.drawCircle).toHaveBeenCalledTimes(2);
    const initialCallArgs = (primaryRipple.drawCircle as ReturnType<typeof import("vitest").vi.fn>)
      .mock.calls[0];
    const updatedCallArgs = (primaryRipple.drawCircle as ReturnType<typeof import("vitest").vi.fn>)
      .mock.calls[1];
    expect(updatedCallArgs[2]).toBeGreaterThan(initialCallArgs[2]);
  });

  it("emite ondulação concêntrica secundária em impulsos vigorosos (intensity > 1.15)", () => {
    const harness = createMockRenderEngineHarness();
    spawnTailWaterRipples(harness.renderEngine, { x: 100, y: 200 }, 0, true, 1.3);

    const rippleNodes = harness.createdGraphicsNodes.filter(
      (node) => node.id === "player_tail_water_ripple"
    );
    expect(rippleNodes.length).toBe(2);
  });

  it("redireciona a função legado spawnTailBubbleTrail para spawnTailWaterRipples", () => {
    const harness = createMockRenderEngineHarness();
    spawnTailBubbleTrail(harness.renderEngine, { x: 150, y: 250 }, 0, true, 1.0);

    const rippleNodes = harness.createdGraphicsNodes.filter(
      (node) => node.id === "player_tail_water_ripple"
    );
    expect(rippleNodes.length).toBeGreaterThanOrEqual(1);
  });
});

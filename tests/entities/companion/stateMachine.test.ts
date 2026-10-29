import { describe, it, expect, vi } from "vitest";
import { CompanionStateMachine } from "../../../src/entities/companion/companionStateMachine";
import type { CompanionGameObject } from "../../../src/entities/companion/types";
import type {
  CompanionStateContext,
  CompanionStateNode,
} from "../../../src/entities/companion/states/types";

describe("CompanionStateMachine — FSM Formal com State Pattern (Fase 59)", () => {
  function createMockContext(
    overrides: Partial<CompanionStateContext> = {}
  ): CompanionStateContext {
    let oxygen = 100;
    return {
      k: {
        clamp: (val: number, min: number, max: number) => Math.min(Math.max(val, min), max),
        rad2deg: (rad: number) => (rad * 180) / Math.PI,
      } as any,
      companion: {
        pos: { x: 100, y: 200 },
        play: vi.fn(),
      } as any,
      options: {},
      prng: () => 0.5,
      getOxygen: () => oxygen,
      restoreOxygen: (amount: number) => {
        oxygen = Math.min(100, oxygen + amount);
      },
      getMaxOxygen: () => 100,
      getKrillsEaten: () => 0,
      incrementKrillsEaten: vi.fn(),
      emitDoubleBlowholeSpout: vi.fn(),
      onResetVerticalSpeed: vi.fn(),
      stateTimer: 0,
      ...overrides,
    };
  }

  it("deve inicializar no estado INTRO e transicionar para CRUISE quando o jogador avançar", () => {
    const fsm = new CompanionStateMachine("INTRO");
    const ctx = createMockContext();

    expect(fsm.getState()).toBe("INTRO");

    // Jogador parado na largada
    const angle1 = fsm.update(ctx, 0.016, 20, null);
    expect(angle1).toBe(0);
    expect(fsm.getState()).toBe("INTRO");

    // Jogador ultrapassa x=40
    fsm.update(ctx, 0.016, 60, null);
    expect(fsm.getState()).toBe("CRUISE");
  });

  it("deve chamar onEnter e onExit simetricamente durante transições", () => {
    const exitSpy = vi.fn();
    const enterSpy = vi.fn();

    const mockIntroNode: CompanionStateNode = {
      name: "INTRO",
      onExit: exitSpy,
      onUpdate: () => ({ targetAngle: 0 }),
    };

    const mockCruiseNode: CompanionStateNode = {
      name: "CRUISE",
      onEnter: enterSpy,
      onUpdate: () => ({ targetAngle: 10 }),
    };

    const fsm = new CompanionStateMachine("INTRO");
    fsm.registerState(mockIntroNode);
    fsm.registerState(mockCruiseNode);

    const ctx = createMockContext();
    fsm.transitionTo("CRUISE", ctx);

    expect(exitSpy).toHaveBeenCalledWith(ctx);
    expect(enterSpy).toHaveBeenCalledWith(ctx);
    expect(fsm.getState()).toBe("CRUISE");
  });

  it("deve disparar onStateChangeCallback ao mudar de estado", () => {
    const stateChangeSpy = vi.fn();
    const fsm = new CompanionStateMachine("INTRO", stateChangeSpy);
    const ctx = createMockContext();

    fsm.transitionTo("RESTING", ctx);
    expect(stateChangeSpy).toHaveBeenCalledWith("RESTING");
    expect(fsm.getState()).toBe("RESTING");
  });

  it("deve orientar ângulo em direção ao krill alvo no estado CRUISE", () => {
    const fsm = new CompanionStateMachine("CRUISE");
    const ctx = createMockContext();

    const mockKrill = {
      pos: { x: 200, y: 260 }, // krill abaixo e à frente da baleia (100, 200)
    } as unknown as CompanionGameObject;

    const angle = fsm.update(ctx, 0.016, 100, mockKrill);
    expect(angle).toBeGreaterThan(0); // ângulo positivo (mergulho para baixo)
  });

  it("deve acionar borrifo e restaurar oxigênio ao entrar em SURFACE_BREATHE", () => {
    const fsm = new CompanionStateMachine("SEEK_BREATH");
    const resetVerticalSpeedSpy = vi.fn();
    const blowholeSpy = vi.fn();
    const ctx = createMockContext({
      onResetVerticalSpeed: resetVerticalSpeedSpy,
      emitDoubleBlowholeSpout: blowholeSpy,
    });

    fsm.transitionTo("SURFACE_BREATHE", ctx);

    expect(resetVerticalSpeedSpy).toHaveBeenCalled();
    expect(blowholeSpy).toHaveBeenCalled();
    expect(ctx.getOxygen()).toBe(100);
  });

  it("deve ignorar transições para o mesmo estado ativo", () => {
    const stateChangeSpy = vi.fn();
    const fsm = new CompanionStateMachine("CRUISE", stateChangeSpy);
    const ctx = createMockContext();

    fsm.transitionTo("CRUISE", ctx);
    expect(stateChangeSpy).not.toHaveBeenCalled();
  });
});

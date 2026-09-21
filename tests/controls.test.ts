import { describe, it, expect } from "vitest";
import { PlayerControlsManager, type PlayerInputSnapshot } from "../src/entities/player/playerControls";

function createMockKaboom() {
  return {
    isKeyDown: () => false,
    isKeyPressed: () => false,
    isKeyReleased: () => false,
    lerp: (a: number, b: number, t: number) => a + (b - a) * t,
    clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
  } as any;
}

function createMockBaleia(flipX = false) {
  return {
    flipX,
    pos: { x: 100, y: 100 },
  } as any;
}

function createInputs(partial: Partial<PlayerInputSnapshot> = {}): PlayerInputSnapshot {
  return {
    isStrokePressed: false,
    isStrokeDown: false,
    isStrokeReleased: false,
    isSonarTriggered: false,
    isLeftDown: false,
    isRightDown: false,
    isUpDown: false,
    isDownDown: false,
    ...partial,
  };
}

describe("PlayerControlsManager: Controle de Orientação", () => {
  it("permite virar para esquerda e direita quando está na água (inAir = false)", () => {
    const k = createMockKaboom();
    const controls = new PlayerControlsManager(k);
    const baleia = createMockBaleia(false);

    // Inicialmente virado para a direita
    expect(controls.isFacingRight()).toBe(true);
    expect(baleia.flipX).toBe(false);

    // Vira para esquerda na água
    controls.updateOrientation(0.016, baleia, createInputs({ isLeftDown: true }), false, false);
    expect(controls.isFacingRight()).toBe(false);
    expect(baleia.flipX).toBe(true);
    expect(controls.getTargetCamOffset()).toBe(-200);

    // Vira para direita na água
    controls.updateOrientation(0.016, baleia, createInputs({ isRightDown: true }), false, false);
    expect(controls.isFacingRight()).toBe(true);
    expect(baleia.flipX).toBe(false);
    expect(controls.getTargetCamOffset()).toBe(200);
  });

  it("NÃO permite virar horizontalmente no ar (inAir = true) quando virada para a direita", () => {
    const k = createMockKaboom();
    const controls = new PlayerControlsManager(k);
    const baleia = createMockBaleia(false);

    controls.setFacingRight(true);
    controls.setTargetCamOffset(200);
    baleia.flipX = false;

    // Tenta virar para a esquerda durante salto no ar
    controls.updateOrientation(0.016, baleia, createInputs({ isLeftDown: true }), false, true);

    // Deve permanecer virada para a direita
    expect(controls.isFacingRight()).toBe(true);
    expect(baleia.flipX).toBe(false);
    expect(controls.getTargetCamOffset()).toBe(200);
  });

  it("NÃO permite virar horizontalmente no ar (inAir = true) quando virada para a esquerda", () => {
    const k = createMockKaboom();
    const controls = new PlayerControlsManager(k);
    const baleia = createMockBaleia(true);

    controls.setFacingRight(false);
    controls.setTargetCamOffset(-200);
    baleia.flipX = true;

    // Tenta virar para a direita durante salto no ar
    controls.updateOrientation(0.016, baleia, createInputs({ isRightDown: true }), false, true);

    // Deve permanecer virada para a esquerda
    expect(controls.isFacingRight()).toBe(false);
    expect(baleia.flipX).toBe(true);
    expect(controls.getTargetCamOffset()).toBe(-200);
  });

  it("permite congelar o jogador (freeze) bloqueando movimento e controles ao final da partida", async () => {
    const { createPlayer } = await import("../src/entities/player");

    let registeredUpdate: (() => void) | null = null;
    const mockKaboom: any = {
      sprite: () => ({ anim: "glide" }),
      pos: (x: number, y: number) => ({ x, y }),
      area: () => ({ area: true }),
      body: () => ({ body: true }),
      rotate: (r: number) => ({ rotate: r }),
      color: (r: number, g: number, b: number) => ({ r, g, b }),
      anchor: (_a: string) => ({ anchor: _a }),
      Rect: class { constructor(_pos: any, _w: number, _h: number) {} },
      vec2: (x: number, y: number) => ({
        x,
        y,
        len: () => Math.sqrt(x * x + y * y),
        unit: () => ({ x: 0, y: 0 }),
        add: (other: any) => mockKaboom.vec2(x + other.x, y + other.y),
        scale: (s: number) => mockKaboom.vec2(x * s, y * s),
      }),
      deg2rad: (deg: number) => (deg * Math.PI) / 180,
      rad2deg: (rad: number) => (rad * 180) / Math.PI,
      clamp: (val: number, min: number, max: number) => Math.max(min, Math.min(max, val)),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      isKeyDown: () => true, // Simula jogador apertando teclas
      isKeyPressed: () => true,
      isKeyReleased: () => false,
      rand: (min: number, _max: number) => min,
      dt: () => 0.016,
      camPos: () => ({ x: 100, y: 100 }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      add: (_comps: any[]) => {
        const obj: any = {
          pos: { x: 120, y: 200, add: () => ({ x: 120, y: 200 }) },
          flipX: false,
          color: { r: 255, g: 255, b: 255 },
          play: () => {},
          move: () => {},
          onUpdate: (cb: () => void) => { registeredUpdate = cb; },
        };
        return obj;
      },
    };

    const player = createPlayer(mockKaboom, 120, false);
    expect(player.isFrozen()).toBe(false);

    // Congela o jogador
    player.freeze();
    expect(player.isFrozen()).toBe(true);

    // Executa o update com teclas pressionadas
    const updateFn = registeredUpdate as unknown as (() => void) | null;
    if (updateFn) {
      updateFn();
    }

    // A velocidade deve ser zero absoluto
    expect(player.getSpeed().len()).toBe(0);

    // Descongela
    player.unfreeze();
    expect(player.isFrozen()).toBe(false);
  });
});

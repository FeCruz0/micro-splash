import { describe, it, expect, vi } from "vitest";
import { setupBackgroundFaunaSystem } from "../src/systems/backgroundFauna";

describe("Sprites de Fauna de Fundo (Orca, Jubarte e Cachalote)", () => {
  it("arquivo public/sprites/orca_bg.png existe e tem assinatura PNG válida", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const filePath = path.join(nodeProcess.cwd(), "public/sprites/orca_bg.png");
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    expect(buffer.length).toBeGreaterThan(500);

    // Assinatura PNG W3C: 137, 80, 78, 71, 13, 10, 26, 10
    expect(buffer[0]).toBe(137);
    expect(buffer[1]).toBe(80); // 'P'
    expect(buffer[2]).toBe(78); // 'N'
    expect(buffer[3]).toBe(71); // 'G'
  });

  it("arquivo public/sprites/humpback_bg.png existe e tem assinatura PNG válida", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const filePath = path.join(nodeProcess.cwd(), "public/sprites/humpback_bg.png");
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    expect(buffer.length).toBeGreaterThan(1000);

    // Assinatura PNG W3C: 137, 80, 78, 71, 13, 10, 26, 10
    expect(buffer[0]).toBe(137);
    expect(buffer[1]).toBe(80); // 'P'
    expect(buffer[2]).toBe(78); // 'N'
    expect(buffer[3]).toBe(71); // 'G'
  });

  it("arquivo public/sprites/cachalote_bg.png existe e tem assinatura PNG válida", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    const nodeProcess = (globalThis as any).process;

    const filePath = path.join(nodeProcess.cwd(), "public/sprites/cachalote_bg.png");
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    expect(buffer.length).toBeGreaterThan(1000);

    // Assinatura PNG W3C: 137, 80, 78, 71, 13, 10, 26, 10
    expect(buffer[0]).toBe(137);
    expect(buffer[1]).toBe(80); // 'P'
    expect(buffer[2]).toBe(78); // 'N'
    expect(buffer[3]).toBe(71); // 'G'
  });

  it("setupBackgroundFaunaSystem inicializa sprites de orca_bg, jubarte_bg e cachalote_bg", () => {
    const addedObjects: any[] = [];
    const mockK: any = {
      sprite: vi.fn((name: string, opts?: any) => ({ type: "sprite", name, opts })),
      pos: vi.fn((x: number, y: number) => ({ type: "pos", x, y })),
      color: vi.fn((r: number, g: number, b: number) => ({ type: "color", r, g, b })),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      anchor: vi.fn((a: string) => ({ type: "anchor", anchor: a })),
      scale: vi.fn((s: number) => ({ type: "scale", scale: s })),
      z: vi.fn((zVal: number) => ({ type: "z", z: zVal })),
      rect: vi.fn((w: number, h: number, opts?: any) => ({ type: "rect", w, h, opts })),
      circle: vi.fn((r: number) => ({ type: "circle", r })),
      polygon: vi.fn((pts: any[]) => ({ type: "polygon", pts })),
      vec2: vi.fn((x: number, y: number) => ({ x, y })),
      rotate: vi.fn((a: number) => ({ type: "rotate", angle: a })),
      wait: vi.fn((_time: number, cb: () => void) => cb && cb()),
      add: vi.fn((components: any[]) => {
        const obj = {
          components,
          onUpdate: vi.fn(),
          add: vi.fn(),
          pos: { x: 0, y: 0, dist: vi.fn(() => 9999) },
        };
        addedObjects.push(obj);
        return obj;
      }),
      dt: vi.fn(() => 0.016),
      get: vi.fn(() => []),
      destroy: vi.fn(),
    };

    setupBackgroundFaunaSystem(mockK);

    // Verifica chamadas para sprite("orca_bg"), sprite("jubarte_bg") e sprite("cachalote_bg")
    const orcaCalls = mockK.sprite.mock.calls.filter((c: any[]) => c[0] === "orca_bg");
    const jubarteCalls = mockK.sprite.mock.calls.filter((c: any[]) => c[0] === "jubarte_bg");
    const cachaloteCalls = mockK.sprite.mock.calls.filter((c: any[]) => c[0] === "cachalote_bg");

    // 4 pods familiares de orcas na Antártida (total de 9 orcas)
    expect(orcaCalls.length).toBe(9);
    expect(orcaCalls[0][1]).toEqual({ anim: "swim" });

    // 3 jubartes passantes + mãe e filhote no santuário = 5 jubartes
    expect(jubarteCalls.length).toBe(5);
    expect(jubarteCalls[0][1]).toEqual({ anim: "swim" });

    // 1 Cachalote monumental no abismo
    expect(cachaloteCalls.length).toBe(1);
    expect(cachaloteCalls[0][1]).toEqual({ anim: "swim" });
  });

  it("createGhostNet é invisível (opacity 0) sem sonar e se torna visível ao chamar reveal()", async () => {
    const { createGhostNet } = await import("../src/entities/net");
    let updateCallback: () => void = () => {};
    const addedChilds: any[] = [];
    const mockK: any = {
      rect: vi.fn(),
      pos: vi.fn(),
      color: vi.fn(),
      outline: vi.fn(),
      opacity: vi.fn((o: number) => ({ type: "opacity", opacity: o })),
      area: vi.fn(),
      anchor: vi.fn(),
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      dt: vi.fn(() => 0.1),
      vec2: (x: number, y: number) => ({ x, y }),
      add: vi.fn((components: any[]) => {
        const netObj: any = {
          components,
          opacity: 0,
          pos: { x: 100, y: 200 },
          add: vi.fn((childComponents: any[]) => {
            const childObj: any = { childComponents, opacity: 0 };
            const chOp = childComponents.find((c: any) => c && c.type === "opacity");
            if (chOp) childObj.opacity = chOp.opacity;
            addedChilds.push(childObj);
            return childObj;
          }),
          onUpdate: vi.fn((cb) => {
            updateCallback = cb;
          }),
        };
        const opComp = components.find((c: any) => c && c.type === "opacity");
        if (opComp) netObj.opacity = opComp.opacity;
        return netObj;
      }),
    };

    const net: any = createGhostNet(mockK, { x: 100, y: 200 } as any);
    expect(net.opacity).toBe(0);
    expect(addedChilds.length).toBe(8); // 3 verticais + 5 horizontais
    expect(addedChilds[0].opacity).toBe(0);

    // Sem reveal, o update mantém a rede invisível
    updateCallback();
    expect(net.opacity).toBe(0);
    expect(addedChilds[0].opacity).toBe(0);

    // Aciona ecolocalização / sonar
    const netCustom = net.components.find((c: any) => c && typeof c.reveal === "function");
    expect(netCustom).toBeDefined();
    netCustom.reveal();

    // Com reveal, o update ilumina a rede e suas linhas
    updateCallback();
    expect(net.opacity).toBeGreaterThan(0.5);
    expect(addedChilds[0].opacity).toBeGreaterThan(0.5);
  });
});

import { describe, it, expect } from "vitest";
import {
  PRESENTATION_POINTS,
  getConceptByDistance,
  PresentationModeManager,
} from "../src/systems/presentationMode";

function createMockController(initialX = 100, initialY = 130) {
  return {
    gameObj: {
      pos: { x: initialX, y: initialY },
    },
    setSpeed: (v: any) => {
      // Mock speed setter
      (createMockController as any).lastSpeed = v;
    },
  } as any;
}

function createMockKaboom() {
  const createdObjects: any[] = [];
  let cameraX = 0;
  let cameraY = 0;

  return {
    width: () => 640,
    height: () => 360,
    add: (comps: any[]) => {
      const createObj = (cComps: any[]) => {
        const obj: any = {
          comps: cComps,
          pos: { x: 0, y: 0 },
          text: "",
          color: null,
          hidden: false,
          add: (childComps: any[]) => createObj(childComps),
          onClick: () => {},
          onHoverUpdate: () => {},
          onHoverEnd: () => {},
        };
        return obj;
      };
      const root = createObj(comps);
      createdObjects.push(root);
      return root;
    },
    rect: (w: number, h: number) => ({ type: "rect", w, h }),
    pos: (x: number, y: number) => ({ x, y }),
    color: (r: number, g: number, b: number) => ({ r, g, b }),
    outline: (w: number, col: any) => ({ w, col }),
    opacity: (o: number) => ({ opacity: o }),
    fixed: () => ({ fixed: true }),
    z: (z: number) => ({ z }),
    area: () => ({ area: true }),
    text: (t: string) => ({ type: "text", text: t }),
    anchor: (a: string) => ({ anchor: a }),
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
    vec2: (x: number, y: number) => ({ x, y }),
    camPos: (x?: number, y?: number) => {
      if (x !== undefined) cameraX = x;
      if (y !== undefined) cameraY = y;
      return { x: cameraX, y: cameraY };
    },
    destroy: () => {},
    createdObjects,
  } as any;
}

describe("PresentationMode (Modo Apresentação Guiada - Apoio aos Jurados)", () => {
  it("mapeia os 5 biomas com pontos de apresentação, conceitos ecológicos e computacionais", () => {
    expect(PRESENTATION_POINTS.length).toBe(5);

    // Bioma 1: Antártica
    const antarctica = getConceptByDistance(500);
    expect(antarctica.biomeIndex).toBe(1);
    expect(antarctica.name).toBe("Antártica");
    expect(antarctica.ecoTitle).toContain("Polar");
    expect(antarctica.techTitle).toContain("Gelo");

    // Bioma 2: Travessia Pelágica
    const pelagic = getConceptByDistance(7500);
    expect(pelagic.biomeIndex).toBe(2);
    expect(pelagic.name).toBe("Travessia Pelágica");
    expect(pelagic.ecoTitle).toContain("Cardumes");
    expect(pelagic.techTitle).toContain("Boids");

    // Bioma 3: Costa Urbana
    const urban = getConceptByDistance(15000);
    expect(urban.biomeIndex).toBe(3);
    expect(urban.name).toBe("Costa Urbana");
    expect(urban.ecoTitle).toContain("Acústica");
    expect(urban.techTitle).toContain("FSM");

    // Bioma 4: Ressurgência & Cânions
    const upwelling = getConceptByDistance(21000);
    expect(upwelling.biomeIndex).toBe(4);
    expect(upwelling.name).toBe("Ressurgência & Cânions");
    expect(upwelling.ecoTitle).toContain("Ressurgência");

    // Bioma 5: Santuário de Arraial
    const sanctuary = getConceptByDistance(28000);
    expect(sanctuary.biomeIndex).toBe(5);
    expect(sanctuary.name).toBe("Santuário de Arraial");
    expect(sanctuary.techTitle).toContain("Breach");
  });

  it("abre e fecha o painel de apresentação alternando estado", () => {
    const mockK = createMockKaboom();
    const mockController = createMockController(100, 100);
    const mgr = new PresentationModeManager(mockK, mockController);

    expect(mgr.isOpen()).toBe(false);

    mgr.open();
    expect(mgr.isOpen()).toBe(true);

    mgr.close();
    expect(mgr.isOpen()).toBe(false);

    mgr.destroy();
  });

  it("teletransporta a baleia para o bioma selecionado e atualiza câmera", () => {
    const mockK = createMockKaboom();
    const mockController = createMockController(100, 100);
    const mgr = new PresentationModeManager(mockK, mockController);

    mgr.open();

    // Salta para Costa Urbana (Bioma 3 - 12.600m)
    mgr.jumpToBiome(3);
    expect(mockController.gameObj.pos.x).toBe(12600);
    expect(mockK.camPos().x).toBe(12600 + 160);

    // Salta para Santuário de Arraial (Bioma 5 - 25.600m)
    mgr.jumpToBiome(5);
    expect(mockController.gameObj.pos.x).toBe(25600);
    expect(mockK.camPos().x).toBe(25600 + 160);

    mgr.destroy();
  });

  it("permite pausar didaticamente a cena", () => {
    const mockK = createMockKaboom();
    const mockController = createMockController(100, 100);
    const mgr = new PresentationModeManager(mockK, mockController);

    expect(mgr.isDidacticPaused()).toBe(false);

    mgr.togglePause();
    expect(mgr.isDidacticPaused()).toBe(true);

    mgr.togglePause();
    expect(mgr.isDidacticPaused()).toBe(false);

    mgr.destroy();
  });
});

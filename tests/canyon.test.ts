import { describe, it, expect } from "vitest";
import { setupCanyonSystem } from "../src/systems/canyonSystem";
import { TAGS } from "../src/config";

describe("Sistema da Ilha do Farol & Boqueirão (Passagem Rasa entre Continente e Ilha)", () => {
  it("cria o fundo rochoso submarino do Boqueirão com colisão e elevação até perto da superfície", () => {
    const createdObjects: any[] = [];

    const mockKaboom: any = {
      height: () => 360,
      width: () => 640,
      dt: () => 0.016,
      add: (comps: any[]) => {
        const obj: any = {
          comps,
          hasTag: (tag: string) => comps.includes(tag),
          isStaticBody: comps.some(
            (c) => c && typeof c === "object" && "isStatic" in c && c.isStatic
          ),
          hasArea: comps.some((c) => c && typeof c === "object"),
          onUpdate: () => {},
        };
        createdObjects.push(obj);
        return obj;
      },
      rect: (w: number, h: number) => ({ type: "rect", w, h }),
      polygon: (pts: any[]) => ({ type: "polygon", pts }),
      circle: (r: number) => ({ type: "circle", r }),
      pos: (x: number, y: number) => ({ x, y }),
      color: (r: number, g: number, b: number) => ({ r, g, b }),
      outline: (width: number, color: any) => ({ width, color }),
      opacity: (o: number) => ({ opacity: o }),
      z: (z: number) => ({ z }),
      area: () => ({ area: true }),
      body: (opts: any) => ({ body: true, isStatic: opts?.isStatic }),
      anchor: (a: string) => ({ anchor: a }),
      rotate: (r: number) => ({ rotate: r }),
      vec2: (x: number, y: number) => ({ x, y }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      onUpdate: () => {},
    };

    setupCanyonSystem(mockKaboom);

    // 1. Verifica existência de obstáculos rochosos com colisão física sólida (isStatic: true)
    const obstacleColliders = createdObjects.filter(
      (o) => o.hasTag(TAGS.OBSTACLE) && o.isStaticBody
    );
    expect(obstacleColliders.length).toBeGreaterThanOrEqual(3);

    // 2. Verifica existência do fundo rochoso do Boqueirão
    const boqueiraoRock = createdObjects.find((o) => o.hasTag("boqueirao_rock"));
    expect(boqueiraoRock).toBeDefined();

    // 3. Verifica existência do colisor físico da montanha/falésias da Ilha do Farol
    const islandCliff = createdObjects.find((o) => o.hasTag("island_cliff"));
    expect(islandCliff).toBeDefined();
    expect(islandCliff.hasTag(TAGS.OBSTACLE)).toBe(true);
    expect(islandCliff.isStaticBody).toBe(true);

    // 4. Confirma que as rochas antigas arbitrárias foram removidas
    const oldCanyonRock = createdObjects.find((o) => o.hasTag("canyon_rock"));
    expect(oldCanyonRock).toBeUndefined();
  });

  it("cria formação geológica orgânica com costões de granito, fendas e bioincrustações (Fase 17.4)", () => {
    const createdObjects: any[] = [];

    const mockKaboom: any = {
      height: () => 360,
      width: () => 640,
      dt: () => 0.016,
      add: (comps: any[]) => {
        const obj: any = {
          comps,
          hasTag: (tag: string) => comps.includes(tag),
          isStaticBody: comps.some(
            (c) => c && typeof c === "object" && "isStatic" in c && c.isStatic
          ),
          hasArea: comps.some((c) => c && typeof c === "object"),
          onUpdate: () => {},
        };
        createdObjects.push(obj);
        return obj;
      },
      rect: (w: number, h: number) => ({ type: "rect", w, h }),
      polygon: (pts: any[]) => ({ type: "polygon", pts }),
      circle: (r: number) => ({ type: "circle", r }),
      pos: (x: number, y: number) => ({ x, y }),
      color: (r: number, g: number, b: number) => ({ r, g, b }),
      outline: (width: number, color: any) => ({ width, color }),
      opacity: (o: number) => ({ opacity: o }),
      z: (z: number) => ({ z }),
      area: () => ({ area: true }),
      body: (opts: any) => ({ body: true, isStatic: opts?.isStatic }),
      anchor: (a: string) => ({ anchor: a }),
      rotate: (r: number) => ({ rotate: r }),
      vec2: (x: number, y: number) => ({ x, y }),
      rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      onUpdate: () => {},
    };

    setupCanyonSystem(mockKaboom);

    // 1. Costões rochosos escarpados de granito (boqueirao_crag)
    const crags = createdObjects.filter((o) => o.hasTag("boqueirao_crag"));
    expect(crags.length).toBeGreaterThanOrEqual(10);

    // 2. Fendas submarinas profundas e fraturas tectônicas (boqueirao_fissure)
    const fissures = createdObjects.filter((o) => o.hasTag("boqueirao_fissure"));
    expect(fissures.length).toBeGreaterThanOrEqual(6);

    // 3. Bioincrustações de algas calcárias Lithothamnion (boqueirao_bioincrustation)
    const bioincrustations = createdObjects.filter((o) => o.hasTag("boqueirao_bioincrustation"));
    expect(bioincrustations.length).toBeGreaterThanOrEqual(10);

    // 4. Ouriços-pretos Echinometra lucunter (boqueirao_urchin)
    const urchins = createdObjects.filter((o) => o.hasTag("boqueirao_urchin"));
    expect(urchins.length).toBeGreaterThanOrEqual(7);

    // 5. Tufos de anêmonas marinhas vivas (boqueirao_anemone)
    const anemones = createdObjects.filter((o) => o.hasTag("boqueirao_anemone"));
    expect(anemones.length).toBeGreaterThanOrEqual(5);
  });
});

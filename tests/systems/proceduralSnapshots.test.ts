import { describe, it, expect } from "vitest";
import {
  createDeterministicRandomGenerator,
  getRandomFloat,
  getRandomInteger,
} from "../../src/utils/random";
import { SUBMARINE_RELIEFS } from "../../src/systems/oceanFloorSystem";

describe("Snapshots Visuais e Procedurais Determinísticos (Fase 49.4)", () => {
  const SEED_ALPHA = 0xcafe1234;
  const SEED_BETA = 0xdeadbeef;

  describe("Invariância de PRNG com Semente Fixa", () => {
    it("produz sequências numéricas rigorosamente idênticas para a mesma semente", () => {
      const rng1 = createDeterministicRandomGenerator(SEED_ALPHA);
      const rng2 = createDeterministicRandomGenerator(SEED_ALPHA);

      const sequence1 = Array.from({ length: 15 }, () => rng1());
      const sequence2 = Array.from({ length: 15 }, () => rng2());

      expect(sequence1).toEqual(sequence2);
    });

    it("produz sequências divergentes para sementes distintas", () => {
      const rngA = createDeterministicRandomGenerator(SEED_ALPHA);
      const rngB = createDeterministicRandomGenerator(SEED_BETA);

      const valA = Array.from({ length: 5 }, () => rngA());
      const valB = Array.from({ length: 5 }, () => rngB());

      expect(valA).not.toEqual(valB);
    });
  });

  describe("Geração Procedural Determinística de Relevo e Obstáculos", () => {
    it("gera perfil de alturas de terreno submarino consistente via snapshot numérico", () => {
      const prng = createDeterministicRandomGenerator(SEED_ALPHA);
      const samplePoints = 10;
      const terrainHeights: number[] = [];

      for (let i = 0; i < samplePoints; i++) {
        // Simulação de jitter procedural de relevo oceânico
        const noise = getRandomFloat(-15, 15, prng);
        terrainHeights.push(Math.round((120 + noise) * 100) / 100);
      }

      // Snapshot determinístico dos 10 primeiros pontos
      expect(terrainHeights).toMatchInlineSnapshot(`
        [
          132.47,
          107.14,
          127.76,
          130.78,
          113.03,
          132.68,
          119.15,
          113.75,
          111.02,
          122.77,
        ]
      `);
    });

    it("distribuição de obstáculos marinhos mantém integridade estrutural com semente fixa", () => {
      const prng = createDeterministicRandomGenerator(SEED_ALPHA);
      const obstacleTypes = ["plastic", "net", "oil", "crag"];
      const generatedSpawns: Array<{ type: string; distance: number; depth: number }> = [];

      for (let i = 0; i < 5; i++) {
        const typeIndex = getRandomInteger(0, obstacleTypes.length - 1, prng);
        const distance = getRandomInteger(1000, 5000, prng);
        const depth = getRandomFloat(100, 300, prng);

        generatedSpawns.push({
          type: obstacleTypes[typeIndex],
          distance,
          depth: Math.round(depth),
        });
      }

      expect(generatedSpawns).toMatchInlineSnapshot(`
        [
          {
            "depth": 252,
            "distance": 1284,
            "type": "crag",
          },
          {
            "depth": 285,
            "distance": 2071,
            "type": "crag",
          },
          {
            "depth": 140,
            "distance": 2166,
            "type": "net",
          },
          {
            "depth": 144,
            "distance": 2744,
            "type": "oil",
          },
          {
            "depth": 148,
            "distance": 1658,
            "type": "plastic",
          },
        ]
      `);
    });

    it("relevos fixos de oceanFloorSystem preservam catálogo de transição determinístico", () => {
      const reliefTypes = SUBMARINE_RELIEFS.map((r) => r.type);
      expect(reliefTypes.slice(0, 5)).toEqual([
        "moraine",
        "moraine",
        "moraine",
        "moraine",
        "seamount",
      ]);
    });
  });
});

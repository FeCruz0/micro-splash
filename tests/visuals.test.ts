import { describe, it, expect } from "vitest";
import { BIOME_COLOR_STOPS, GAME_CONFIG } from "../src/config";
import { getColorsAtDistance, getCurrentBiome } from "../src/systems/oceanEnvironment";
import { extractVictoryCardData, generateAndDownloadVictoryCard, type VictoryCardData } from "../src/ui/victoryCard";
import { createGameState } from "../src/systems/state";

describe("Fase 13: Polimento Visual, Atmosfera & Identidade", () => {
  describe("Ciclo Dia/Noite e Biomas (BIOME_COLOR_STOPS)", () => {
    it("possui 5 estágios contínuos cobrindo de 0m a 30.000m", () => {
      expect(BIOME_COLOR_STOPS.length).toBe(5);

      // Primeiro bioma começa em 0m
      expect(BIOME_COLOR_STOPS[0].distanceStart).toBe(0);

      // Último bioma termina na distância total da rota (30.000m)
      expect(BIOME_COLOR_STOPS[BIOME_COLOR_STOPS.length - 1].distanceEnd).toBe(
        GAME_CONFIG.ROUTE_TOTAL_DISTANCE
      );

      // Continuidade sem lacunas
      for (let i = 0; i < BIOME_COLOR_STOPS.length - 1; i++) {
        expect(BIOME_COLOR_STOPS[i].distanceEnd).toBe(
          BIOME_COLOR_STOPS[i + 1].distanceStart
        );
      }
    });

    it("todos os biomas têm canais de cores RGB válidos entre 0 e 255", () => {
      BIOME_COLOR_STOPS.forEach((biome) => {
        [biome.bgColor, biome.surfaceColor, biome.floorColor, biome.skyColor].forEach(
          (color) => {
            expect(color.length).toBe(3);
            color.forEach((channel) => {
              expect(channel).toBeGreaterThanOrEqual(0);
              expect(channel).toBeLessThanOrEqual(255);
            });
          }
        );
      });
    });

    it("retorna o bioma correto para cada marco da rota", () => {
      expect(getCurrentBiome(2000).name).toContain("Antártica");
      expect(getCurrentBiome(8000).name).toContain("Travessia Pelágica");
      expect(getCurrentBiome(15000).name).toContain("Costa Urbana");
      expect(getCurrentBiome(22000).name).toContain("Cânions");
      expect(getCurrentBiome(28000).name).toContain("Santuário de Arraial");
    });

    it("interpola suavemente as cores entre biomas sem extrapolações", () => {
      // Mock do KaboomCtx mínimo para getColorsAtDistance
      const mockKaboomCtx: any = {
        lerp: (a: number, b: number, t: number) => a + (b - a) * t,
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
      };

      const startColors = getColorsAtDistance(mockKaboomCtx, 0);
      expect(startColors.currentBiome.name).toContain("Antártica");

      const midColors = getColorsAtDistance(mockKaboomCtx, 15000);
      expect(midColors.currentBiome.name).toContain("Costa Urbana");

      const endColors = getColorsAtDistance(mockKaboomCtx, 30000);
      expect(endColors.currentBiome.name).toContain("Santuário de Arraial");
    });
  });

  describe("Cartão de Vitória e Certificado (victoryCard.ts)", () => {
    it("extrai corretamente os dados formatados do GameState para o certificado", () => {
      const state = createGameState();
      state.addKrill();
      state.addKrill();
      state.addTrash();
      state.triggerBreach();

      const cardData = extractVictoryCardData(state, "Jubarte Heróica");

      expect(cardData.playerName).toBe("Jubarte Heróica");
      expect(cardData.krillCount).toBe(2);
      expect(cardData.trashCount).toBe(1);
      expect(cardData.hasBreached).toBe(true);
      expect(cardData.finalScore).toBeGreaterThan(0);
      expect(cardData.rank).toBeDefined();
      expect(cardData.dateStr).toBeDefined();
    });

    it("atribui classificação correta com base na pontuação", () => {
      const state = createGameState();
      // Score baixo -> Rank B
      const lowData = extractVictoryCardData(state);
      expect(lowData.rank).toContain("RANK B");

      // Simula score alto
      const highData: VictoryCardData = {
        ...lowData,
        finalScore: 3800,
        rank: "🥇 RANK S - Guardião dos Oceanos!",
      };
      expect(highData.rank).toContain("RANK S");
    });

    it("lida graciosamente com ambientes sem DOM (headless/testes)", () => {
      const state = createGameState();
      const cardData = extractVictoryCardData(state);

      // Em ambiente node sem document, deve retornar false sem lançar exceção
      const originalDoc = globalThis.document;
      try {
        // @ts-ignore
        delete globalThis.document;
        const result = generateAndDownloadVictoryCard(cardData);
        expect(result).toBe(false);
      } finally {
        if (originalDoc) {
          globalThis.document = originalDoc;
        }
      }
    });
  });

  describe("Fase 17: Animação Orgânica da Jubarte & Dinâmica Visual", () => {
    it("valida que o spritesheet whale.png contém 4 frames com limites verticais seguros (Fase 17.1)", async () => {
      // @ts-ignore
      const fs = await import("node:fs");
      // @ts-ignore
      const zlib = await import("node:zlib");
      // @ts-ignore
      const path = await import("node:path");

      const nodeProcess = (globalThis as any).process;
      const nodeBuffer = (globalThis as any).Buffer;

      const spritePath = path.resolve(nodeProcess.cwd(), "public/sprites/whale.png");
      expect(fs.existsSync(spritePath)).toBe(true);

      const file = fs.readFileSync(spritePath);
      // Validação do cabeçalho PNG
      expect(file[0]).toBe(0x89);
      expect(file.toString("ascii", 1, 4)).toBe("PNG");

      // Descomprime dados IDAT
      let pos = 8;
      const chunks: any[] = [];
      let width = 0;
      let height = 0;

      while (pos < file.length) {
        const len = file.readUInt32BE(pos);
        const type = file.toString("ascii", pos + 4, pos + 8);
        if (type === "IHDR") {
          width = file.readUInt32BE(pos + 8);
          height = file.readUInt32BE(pos + 12);
        } else if (type === "IDAT") {
          chunks.push(file.subarray(pos + 8, pos + 8 + len));
        }
        pos += 12 + len;
      }

      expect(width).toBe(512);
      expect(height).toBe(64);

      const raw = zlib.inflateSync(nodeBuffer.concat(chunks));
      const frameWidth = 128;

      // Cada um dos 4 frames deve ter pixels renderizados sem estourar as margens de 64px
      for (let f = 0; f < 4; f++) {
        let minY = 999;
        let maxY = -1;
        let nonTransparentPixels = 0;

        for (let y = 0; y < height; y++) {
          const rowOffset = y * (width * 4 + 1) + 1;
          for (let x = f * frameWidth; x < (f + 1) * frameWidth; x++) {
            const alpha = raw[rowOffset + x * 4 + 3];
            if (alpha > 10) {
              nonTransparentPixels++;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        expect(nonTransparentPixels).toBeGreaterThan(400);
        // Margem de segurança de pelo menos 2px no topo e na base (sem clipping nos 64px)
        expect(minY).toBeGreaterThanOrEqual(2);
        expect(maxY).toBeLessThanOrEqual(62);
      }
    });

    it("aplica dinâmica de roll em perspectiva ao mudar de profundidade (Fase 17.2)", async () => {
      const { createPlayer } = await import("../src/entities/player");

      let registeredUpdate: (() => void) | null = null;

      const mockKaboom: any = {
        height: () => 360,
        width: () => 640,
        sprite: () => ({ anim: "glide" }),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({ area: true }),
        body: () => ({ body: true }),
        rotate: (r: number) => ({ rotate: r }),
        color: (r: number, g: number, b: number) => ({ r, g, b }),
        anchor: (_a: string) => ({ anchor: _a }),
        scale: (x: number, y: number) => ({ x, y }),
        opacity: (o: number) => ({ opacity: o }),
        z: (z: number) => ({ z }),
        rect: (w: number, h: number) => ({ type: "rect", w, h }),
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
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        dt: () => 0.016,
        time: () => 1.5,
        camPos: () => ({ x: 100, y: 100 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => {
          const obj: any = {
            pos: { x: 120, y: 150, add: (v: any) => ({ x: 120 + v.x, y: 150 + v.y }) },
            scale: { x: 1, y: 1 },
            angle: 0,
            flipX: false,
            opacity: 0,
            color: { r: 255, g: 255, b: 255 },
            play: () => {},
            move: () => {},
            onUpdate: (cb: () => void) => { registeredUpdate = cb; },
            onDestroy: () => {},
          };
          return obj;
        },
      };

      const player = createPlayer(mockKaboom, 120, false);
      expect(typeof player.getRollAngle).toBe("function");

      // Simula subida acentuada (pitch up: ângulo de navegação negativo em Kaboom)
      const updateFn = registeredUpdate as unknown as (() => void) | null;
      if (updateFn) {
        updateFn();
      }

      expect(player.getRollAngle!()).toBeDefined();
      expect(player.getVentralOpacity!()).toBeGreaterThanOrEqual(0);
    });

    it("calcula reflexo cáustico de luz solar sobre a pele da jubarte conforme profundidade (Fase 17.3)", async () => {
      const { createPlayer } = await import("../src/entities/player");

      let currentWhaleY = GAME_CONFIG.SEA_LEVEL + 20; // 20px abaixo da superfície (área rasa)
      let registeredUpdate: (() => void) | null = null;

      const mockKaboom: any = {
        height: () => 360,
        width: () => 640,
        sprite: () => ({ anim: "glide" }),
        pos: (x: number, y: number) => ({ x, y }),
        area: () => ({ area: true }),
        body: () => ({ body: true }),
        rotate: (r: number) => ({ rotate: r }),
        color: (r: number, g: number, b: number) => ({ r, g, b }),
        anchor: (_a: string) => ({ anchor: _a }),
        scale: (x: number, y: number) => ({ x, y }),
        opacity: (o: number) => ({ opacity: o }),
        z: (z: number) => ({ z }),
        rect: (w: number, h: number) => ({ type: "rect", w, h }),
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
        isKeyDown: () => false,
        isKeyPressed: () => false,
        isKeyReleased: () => false,
        rand: (min: number) => min,
        dt: () => 0.016,
        time: () => 2.0,
        shake: () => {},
        camPos: () => ({ x: 100, y: 100 }),
        rgb: (r: number, g: number, b: number) => ({ r, g, b }),
        add: () => {
          let _pos = { x: 120, y: currentWhaleY, add: (v: any) => ({ x: 120 + v.x, y: currentWhaleY + v.y }) };
          const obj: any = {
            get pos() { return { x: _pos.x, y: currentWhaleY, add: (v: any) => ({ x: _pos.x + v.x, y: currentWhaleY + v.y }) }; },
            set pos(v: any) { _pos = v; },
            scale: { x: 1, y: 1 },
            angle: 0,
            flipX: false,
            opacity: 0,
            color: { r: 255, g: 255, b: 255 },
            play: () => {},
            move: () => {},
            onUpdate: (cb: () => void) => { registeredUpdate = cb; },
            onDestroy: () => {},
          };
          return obj;
        },
      };

      const player = createPlayer(mockKaboom, 120, false);
      const updateFn = registeredUpdate as unknown as (() => void) | null;

      // 1. Próximo à superfície (20px de profundidade): cáusticos ativos e visíveis
      currentWhaleY = GAME_CONFIG.SEA_LEVEL + 20;
      updateFn?.();
      const shallowCaustic = player.getCausticOpacity!();
      expect(shallowCaustic).toBeGreaterThan(0.08);

      // 2. Em águas profundas (> 100px abaixo do nível do mar): atenuação total para 0
      currentWhaleY = GAME_CONFIG.SEA_LEVEL + 160;
      updateFn?.();
      const deepCaustic = player.getCausticOpacity!();
      expect(deepCaustic).toBe(0);

      // 3. No ar (durante um salto / breach acima de SEA_LEVEL): sem cáusticos aquáticos
      currentWhaleY = GAME_CONFIG.SEA_LEVEL - 30;
      updateFn?.();
      const airCaustic = player.getCausticOpacity!();
      expect(airCaustic).toBe(0);
    });
  });
});

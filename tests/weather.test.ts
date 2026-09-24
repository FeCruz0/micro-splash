import { describe, it, expect } from "vitest";
import { calculateWeatherAtDistance, setupWeatherSystem } from "../src/systems/weatherSystem";

function createMockKaboom() {
  const objects: any[] = [];
  const updateCallbacks: Array<() => void> = [];

  return {
    width: () => 640,
    height: () => 360,
    camPos: () => ({ x: 300, y: 180 }),
    rand: (min: number, _max?: number) => min,
    vec2: (x: number, y: number) => ({ x, y }),
    circle: (r: number) => ({ type: "circle", r }),
    rect: (w: number, h: number) => ({ type: "rect", w, h }),
    rotate: (a: number) => ({ type: "rotate", a }),
    pos: (x: number, y: number) => ({ x, y }),
    color: () => ({}),
    opacity: (o: number) => ({ o }),
    z: (val: number) => ({ val }),
    dt: () => 0.016,
    onUpdate: (cb: () => void) => updateCallbacks.push(cb),
    add: (tagsAndComponents: any[]) => {
      const obj: any = {
        pos: { x: 0, y: 0 },
        opacity: 0,
        tags: tagsAndComponents.filter((t) => typeof t === "string"),
      };
      objects.push(obj);
      return obj;
    },
    _objects: objects,
    _triggerUpdates: () => {
      for (const cb of updateCallbacks) cb();
    },
  } as any;
}

describe("Fase 19.1: Sistema de Eventos Climáticos Dinâmicos na Rota", () => {
  it("ativa a nevasca polar exclusivamente no trecho polar da Antártica (800m a 4200m)", () => {
    // Fora da nevasca (antes de 800m)
    const beforeBlizzard = calculateWeatherAtDistance(400);
    expect(beforeBlizzard.weather).toBe("clear");
    expect(beforeBlizzard.intensity).toBe(0);

    // Fade-in da nevasca (ex: 975m, metade do fade-in de 350m iniciado em 800m)
    const fadeIn = calculateWeatherAtDistance(975);
    expect(fadeIn.weather).toBe("polar_blizzard");
    expect(fadeIn.intensity).toBeCloseTo(0.5, 1);

    // Pico da nevasca polar
    const peak = calculateWeatherAtDistance(2500);
    expect(peak.weather).toBe("polar_blizzard");
    expect(peak.intensity).toBe(1.0);

    // Após o término da Antártica
    const afterAntarctica = calculateWeatherAtDistance(6000);
    expect(afterAntarctica.weather).toBe("clear");
    expect(afterAntarctica.intensity).toBe(0);
  });

  it("ativa o vendaval com chuva em alto-mar na travessia pelágica (9000m a 15500m)", () => {
    // Pico do vendaval em alto mar
    const galePeak = calculateWeatherAtDistance(12000);
    expect(galePeak.weather).toBe("open_sea_gale");
    expect(galePeak.intensity).toBe(1.0);

    // Limites de fade-in e fade-out
    const galeStart = calculateWeatherAtDistance(9200);
    expect(galeStart.weather).toBe("open_sea_gale");
    expect(galeStart.intensity).toBeCloseTo(0.5, 1);

    // Fora do vendaval (ex: 18000m na costa urbana)
    const clearCoast = calculateWeatherAtDistance(18000);
    expect(clearCoast.weather).toBe("clear");
    expect(clearCoast.intensity).toBe(0);
  });

  it("ativa a calmaria solar radiante em Arraial do Cabo (25000m a 30000m)", () => {
    // Entrada na enseada solar de Arraial
    const solarCalm = calculateWeatherAtDistance(27000);
    expect(solarCalm.weather).toBe("arraial_solar_calm");
    expect(solarCalm.intensity).toBe(1.0);
  });

  it("inicializa e gerencia os pools de partículas de nevasca, chuva e pó solar", () => {
    const k = createMockKaboom();
    const mockPlayerController: any = {
      gameObj: {
        pos: { x: 2000, y: 150 },
      },
    };

    setupWeatherSystem(k, mockPlayerController);

    // Verifica se os objetos das três camadas climáticas foram alocados
    const snowParticles = k._objects.filter((o: any) => o.tags.includes("weather_snow"));
    const rainParticles = k._objects.filter((o: any) => o.tags.includes("weather_rain"));
    const glintParticles = k._objects.filter((o: any) => o.tags.includes("weather_sun_glint"));

    expect(snowParticles.length).toBeGreaterThanOrEqual(30);
    expect(rainParticles.length).toBeGreaterThanOrEqual(40);
    expect(glintParticles.length).toBeGreaterThanOrEqual(25);

    // Executa um ciclo de update climático
    k._triggerUpdates();

    // Na posição 2000m (nevasca), a opacidade da neve deve ser positiva
    expect(snowParticles[0].opacity).toBeGreaterThan(0);
    // E a chuva deve estar com opacidade zerada
    expect(rainParticles[0].opacity).toBe(0);
  });
});

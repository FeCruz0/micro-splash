import kaboom, { type GameObj } from "kaboom";
import { GAME_CONFIG } from "../config";

interface CloudData {
  obj: GameObj;
  baseX: number;
  baseY: number;
  speed: number;
  parallaxFactor: number;
  width: number;
}

export type BirdSpecies = "albatross" | "frigatebird" | "egret";

export interface BirdData {
  body: GameObj;
  wingLeft: GameObj;
  wingRight: GameObj;
  extra?: GameObj; // Ex: cauda bifurcada da fragata ou pernas da garça
  worldX: number;
  worldY: number;
  speedX: number;
  flightType: BirdSpecies;
  animOffset: number;
}

interface StarData {
  obj: GameObj;
  baseX: number;
  baseY: number;
  blinkPhase: number;
}

export interface ParallaxSkySystem {
  clouds: CloudData[];
  stars: StarData[];
  birds: BirdData[];
  moon: {
    disk: GameObj;
    halo: GameObj;
    reflections: GameObj[];
  };
  sunsetBands: GameObj[];
  destroy: () => void;
}

/**
 * Sistema de Céu em Paralaxe, Atmosfera e Fauna Aérea (Fase 29)
 * - Nuvens cumuliformes com morfologia realista em pixel art (29.5)
 * - Lua e coluna de reflexos ondulantes na Costa Urbana (29.2)
 * - Pôr do sol estratificado em 5 camadas na Travessia Pelágica (29.7)
 * - Aves marinhas autênticas por bioma: Albatroz, Fragata e Garça (29.8)
 */
export function setupParallaxSkySystem(k: ReturnType<typeof kaboom>): ParallaxSkySystem {
  const screenW = k.width ? k.width() : 640;

  // =========================================================================
  // 1. PÔR DO SOL ESTRATIFICADO NA TRAVESSIA PELÁGICA (29.7: 5.000m - 12.000m)
  // =========================================================================
  const sunsetConfigs = [
    { y: 0, h: 18, col: k.rgb(45, 55, 95) }, // 1. Azul-crepúsculo escuro
    { y: 18, h: 18, col: k.rgb(135, 80, 125) }, // 2. Lilás / Roxo crepuscular
    { y: 36, h: 16, col: k.rgb(210, 95, 105) }, // 3. Rosa coral profundo
    { y: 52, h: 16, col: k.rgb(240, 145, 85) }, // 4. Âmbar alaranjado quente
    { y: 68, h: 12, col: k.rgb(255, 205, 115) }, // 5. Dourado solar rasante
  ];

  const sunsetBands: GameObj[] = sunsetConfigs.map((cfg) => {
    return k.add([
      k.rect(screenW * 2.2, cfg.h),
      k.pos(-screenW / 2, cfg.y),
      k.color(cfg.col),
      k.opacity(0),
      k.z(-9.5),
      "sky_sunset_band",
    ]);
  });

  // =========================================================================
  // 2. NUVENS EM PARALAXE (Camadas lentas e médias)
  // =========================================================================
  const cloudCount = 7;
  const clouds: CloudData[] = [];

  for (let i = 0; i < cloudCount; i++) {
    const width = 80 + (i % 4) * 35;
    const height = 18 + (i % 3) * 6;
    const baseY = 10 + (i % 4) * 12;
    const parallaxFactor = 0.18 + (i % 3) * 0.1; // Nuvens mais distantes movem-se mais devagar
    const speed = 6 + (i % 3) * 4; // Deriva do vento

    const cloudObj = k.add([
      k.rect(width, height, { radius: height / 2 }),
      k.pos(0, baseY),
      k.color(255, 255, 255),
      k.opacity(0.45 + (i % 3) * 0.15),
      k.z(-8),
      "sky_cloud",
    ]);

    clouds.push({
      obj: cloudObj,
      baseX: i * ((screenW / cloudCount) * 1.3),
      baseY,
      speed,
      parallaxFactor,
      width,
    });
  }

  // =========================================================================
  // 3. ESTRELAS CINTILANTES NA COSTA URBANA (12.000m - 19.000m)
  // =========================================================================
  const starCount = 28;
  const stars: StarData[] = [];

  for (let i = 0; i < starCount; i++) {
    const starY = 8 + (i % 6) * 11;
    const starObj = k.add([
      k.rect(1.5, 1.5),
      k.pos(0, starY),
      k.color(240, 245, 255),
      k.opacity(0),
      k.z(-9),
      "sky_star",
    ]);

    stars.push({
      obj: starObj,
      baseX: i * ((screenW / starCount) * 1.4),
      baseY: starY,
      blinkPhase: Math.random() * Math.PI * 2,
    });
  }

  // =========================================================================
  // 4. LUA E REFLEXO AQUÁTICO NA COSTA URBANA (29.2: 12.000m - 19.000m)
  // =========================================================================
  const moonDisk = k.add([
    k.circle(16),
    k.pos(0, 22),
    k.color(248, 242, 215), // Marfim quente suave
    k.opacity(0),
    k.anchor("center"),
    k.z(-9),
    "sky_moon",
  ]);

  const moonHalo = k.add([
    k.circle(26),
    k.pos(0, 22),
    k.color(248, 242, 215),
    k.opacity(0),
    k.anchor("center"),
    k.z(-9.2),
    "sky_moon_halo",
  ]);

  // Coluna de 5 filetes luminosos de reflexo lunar na água
  const reflectionConfigs = [
    { offY: 4, w: 22, baseAlpha: 0.32 },
    { offY: 12, w: 17, baseAlpha: 0.24 },
    { offY: 22, w: 13, baseAlpha: 0.17 },
    { offY: 34, w: 9, baseAlpha: 0.11 },
    { offY: 48, w: 6, baseAlpha: 0.05 },
  ];

  const moonReflections: GameObj[] = reflectionConfigs.map((rc) => {
    return k.add([
      k.rect(rc.w, 2.5, { radius: 1 }),
      k.pos(0, GAME_CONFIG.SEA_LEVEL + rc.offY),
      k.color(248, 242, 215),
      k.opacity(0),
      k.anchor("center"),
      k.z(2),
      "sky_moon_reflection",
    ]);
  });

  // =========================================================================
  // 5. AVES MARINHAS COM IDENTIDADE DE ESPÉCIE (29.8)
  // =========================================================================
  const birds: BirdData[] = [];
  const birdSpawnPoints = [
    // 1. Albatrozes-viajantes (Antártica & Pelágico)
    { x: 900, y: 35, type: "albatross" as const, speed: 72 },
    { x: 2600, y: 24, type: "albatross" as const, speed: 80 },
    { x: 4300, y: 38, type: "albatross" as const, speed: 68 },
    { x: 7200, y: 28, type: "albatross" as const, speed: 75 },

    // 2. Fragatas-magníficas (Costa Urbana & Pelágico)
    { x: 10400, y: 25, type: "frigatebird" as const, speed: 82 },
    { x: 13600, y: 30, type: "frigatebird" as const, speed: 78 },
    { x: 16900, y: 20, type: "frigatebird" as const, speed: 85 },

    // 3. Garças-brancas / Atobás costeiros (Arraial do Cabo)
    { x: 21500, y: 34, type: "egret" as const, speed: 58 },
    { x: 24200, y: 26, type: "egret" as const, speed: 52 },
    { x: 26400, y: 18, type: "egret" as const, speed: 48 },
  ];

  birdSpawnPoints.forEach((b, idx) => {
    let bodyColor: any;
    let wingColor: any;
    let wingLength: number;
    let bodyWidth: number;
    let extraObj: GameObj | undefined = undefined;

    if (b.type === "albatross") {
      // Albatroz-viajante: envergadura colossal (44px total), corpo esguio e pontas escuras
      bodyColor = k.rgb(240, 245, 255);
      wingColor = k.rgb(55, 65, 75);
      wingLength = 22;
      bodyWidth = 13;
    } else if (b.type === "frigatebird") {
      // Fragata-magnífica: plumagem escura, papo gular rubro e cauda bifurcada em tesoura
      bodyColor = k.rgb(25, 25, 30);
      wingColor = k.rgb(35, 35, 42);
      wingLength = 16;
      bodyWidth = 11;

      // Cauda bifurcada
      extraObj = k.add([
        k.polygon([k.vec2(0, 0), k.vec2(-7, -3.5), k.vec2(-3, 0), k.vec2(-7, 3.5)]),
        k.pos(b.x - 5, b.y),
        k.color(25, 25, 30),
        k.z(-7),
        "sky_bird_tail",
      ]);
    } else {
      // Garça-branca / Atobá costeiro: plumagem alva, pescoço em S e pernas estendidas
      bodyColor = k.rgb(255, 255, 255);
      wingColor = k.rgb(235, 240, 245);
      wingLength = 13;
      bodyWidth = 9;

      // Pernas pendentes
      extraObj = k.add([
        k.rect(6, 1.2),
        k.pos(b.x - 6, b.y + 2),
        k.color(30, 30, 35),
        k.z(-7),
        "sky_bird_legs",
      ]);
    }

    const body = k.add([
      k.rect(bodyWidth, 3, { radius: 1 }),
      k.pos(b.x, b.y),
      k.color(bodyColor),
      k.anchor("center"),
      k.z(-7),
      "sky_bird",
    ]);

    const wingLeft = k.add([
      k.rect(wingLength, 2.2),
      k.pos(b.x - 2, b.y),
      k.color(wingColor),
      k.anchor("right"),
      k.z(-7),
    ]);

    const wingRight = k.add([
      k.rect(wingLength, 2.2),
      k.pos(b.x + 2, b.y),
      k.color(wingColor),
      k.anchor("left"),
      k.z(-7),
    ]);

    birds.push({
      body,
      wingLeft,
      wingRight,
      extra: extraObj,
      worldX: b.x,
      worldY: b.y,
      speedX: b.speed,
      flightType: b.type,
      animOffset: idx * 1.3,
    });
  });

  let time = 0;
  let cancelUpdate: any = null;

  if (k.onUpdate) {
    cancelUpdate = k.onUpdate(() => {
      const dt = k.dt ? k.dt() : 0.016;
      time += dt;
      const camX = k.camPos ? k.camPos().x : 0;
      const screenLeft = camX - screenW / 2;

      // -----------------------------------------------------------------------
      // A. Atualiza Pôr do Sol Estratificado (4.800m - 12.200m)
      // -----------------------------------------------------------------------
      const sunsetIntensity =
        camX < 4800
          ? 0
          : camX < 5800
            ? (camX - 4800) / 1000
            : camX > 12200
              ? 0
              : camX > 11200
                ? (12200 - camX) / 1000
                : 1.0;

      sunsetBands.forEach((band) => {
        band.pos.x = screenLeft - screenW * 0.1;
        band.opacity = sunsetIntensity * 0.88;
      });

      // -----------------------------------------------------------------------
      // B. Atualiza Nuvens em Paralaxe
      // -----------------------------------------------------------------------
      clouds.forEach((c) => {
        // Posição baseada na paralaxe da câmera + deriva do vento
        const drift = time * c.speed;
        const effectivePos = (c.baseX + drift + camX * c.parallaxFactor) % (screenW * 1.5);
        c.obj.pos.x = screenLeft - 100 + effectivePos;

        // Mudança de tom das nuvens conforme o ciclo dia/noite da rota
        if (camX < 5000) {
          c.obj.color = k.rgb(240, 248, 255); // Manhã polar gélida
          c.obj.opacity = 0.55;
        } else if (camX < 12000) {
          c.obj.color = k.rgb(255, 195, 160); // Entardecer / Pôr do sol âmbar
          c.obj.opacity = 0.65;
        } else if (camX < 19000) {
          c.obj.color = k.rgb(75, 85, 115); // Noite urbana (silhuetas azuladas no céu noturno)
          c.obj.opacity = 0.4;
        } else if (camX < 25000) {
          c.obj.color = k.rgb(220, 195, 235); // Alvorada límpida / lilás
          c.obj.opacity = 0.55;
        } else {
          c.obj.color = k.rgb(255, 248, 230); // Manhã solar dourada em Arraial
          c.obj.opacity = 0.6;
        }
      });

      // -----------------------------------------------------------------------
      // C. Atualiza Noite Urbana: Estrelas, Lua e Reflexos (11.500m - 19.500m)
      // -----------------------------------------------------------------------
      const nightIntensity =
        camX >= 11500 && camX <= 19500
          ? camX < 13000
            ? (camX - 11500) / 1500
            : camX > 18000
              ? (19500 - camX) / 1500
              : 1.0
          : 0;

      // Estrelas
      stars.forEach((s) => {
        const effPos = (s.baseX + camX * 0.05) % (screenW * 1.4);
        s.obj.pos.x = screenLeft - 50 + effPos;
        const twinkle = Math.sin(time * 3.5 + s.blinkPhase) * 0.35 + 0.65;
        s.obj.opacity = nightIntensity * twinkle * 0.9;
      });

      // Lua e Halo
      const moonX = screenLeft + screenW * 0.68;
      moonDisk.pos.x = moonX;
      moonHalo.pos.x = moonX;
      moonDisk.opacity = nightIntensity * 0.92;
      moonHalo.opacity = nightIntensity * 0.18;

      // Reflexos lunares na água
      moonReflections.forEach((ref, idx) => {
        const waveSway = Math.sin(time * 3.2 + idx * 0.85) * (4 + idx * 2.2);
        ref.pos.x = moonX + waveSway;
        ref.opacity = nightIntensity * reflectionConfigs[idx].baseAlpha;
      });

      // -----------------------------------------------------------------------
      // D. Atualiza Aves Marinhas (Padrões de Voo e Batimento de Asas)
      // -----------------------------------------------------------------------
      birds.forEach((b) => {
        b.worldX += b.speedX * dt;

        let flapSpeed: number;
        let flapAmplitude: number;

        if (b.flightType === "albatross") {
          flapSpeed = 3.4; // Batimento lento e majestoso com planeio
          flapAmplitude = 18;
        } else if (b.flightType === "frigatebird") {
          flapSpeed = 6.2; // Voo rápido e ágil
          flapAmplitude = 26;
        } else {
          flapSpeed = 7.2; // Voo costeiro rápido
          flapAmplitude = 22;
        }

        const wingAngle = Math.sin(time * flapSpeed + b.animOffset) * flapAmplitude;
        const altSway = Math.cos(time * 2.0 + b.animOffset) * 4;
        const currentY = b.worldY + altSway;

        b.body.pos.x = b.worldX;
        b.body.pos.y = currentY;

        b.wingLeft.pos.x = b.worldX - 2;
        b.wingLeft.pos.y = currentY;
        b.wingLeft.angle = -wingAngle;

        b.wingRight.pos.x = b.worldX + 2;
        b.wingRight.pos.y = currentY;
        b.wingRight.angle = wingAngle;

        if (b.extra && b.extra.exists && b.extra.exists()) {
          b.extra.pos.x = b.worldX - 5;
          b.extra.pos.y = currentY + (b.flightType === "egret" ? 2 : 0);
        }
      });
    });
  }

  const destroy = () => {
    if (cancelUpdate) {
      if (typeof cancelUpdate === "function") cancelUpdate();
      else if (cancelUpdate.cancel) cancelUpdate.cancel();
    }
    sunsetBands.forEach((sb) => sb.exists && sb.exists() && k.destroy(sb));
    clouds.forEach((c) => {
      if (c.obj.exists && c.obj.exists()) k.destroy(c.obj);
    });
    stars.forEach((s) => s.obj.exists && s.obj.exists() && k.destroy(s.obj));
    if (moonDisk.exists && moonDisk.exists()) k.destroy(moonDisk);
    if (moonHalo.exists && moonHalo.exists()) k.destroy(moonHalo);
    moonReflections.forEach((mr) => mr.exists && mr.exists() && k.destroy(mr));
    birds.forEach((b) => {
      if (b.body.exists && b.body.exists()) k.destroy(b.body);
      if (b.wingLeft.exists && b.wingLeft.exists()) k.destroy(b.wingLeft);
      if (b.wingRight.exists && b.wingRight.exists()) k.destroy(b.wingRight);
      if (b.extra && b.extra.exists && b.extra.exists()) k.destroy(b.extra);
    });
  };

  return {
    clouds,
    stars,
    birds,
    moon: {
      disk: moonDisk,
      halo: moonHalo,
      reflections: moonReflections,
    },
    sunsetBands,
    destroy,
  };
}

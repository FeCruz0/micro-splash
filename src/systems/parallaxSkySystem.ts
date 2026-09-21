import kaboom, { type GameObj } from "kaboom";

interface CloudData {
  obj: GameObj;
  baseX: number;
  baseY: number;
  speed: number;
  parallaxFactor: number;
  width: number;
}

interface BirdData {
  body: GameObj;
  wingLeft: GameObj;
  wingRight: GameObj;
  worldX: number;
  worldY: number;
  speedX: number;
  flightType: "albatross" | "seagull";
  animOffset: number;
}

interface StarData {
  obj: GameObj;
  baseX: number;
  baseY: number;
  blinkPhase: number;
}

/**
 * Sistema de Céu em Paralaxe: Nuvens em deriva, Aves Marinhas e Silhueta do Farol de Arraial
 * Atua no espaço aéreo acima do nível do mar (0px a 80px) enriquecendo saltos e navegação de superfície.
 */
export function setupParallaxSkySystem(k: ReturnType<typeof kaboom>) {
  // 1. Criação das Nuvens em Paralaxe (Camadas lentas e médias)
  const cloudCount = 7;
  const clouds: CloudData[] = [];

  for (let i = 0; i < cloudCount; i++) {
    const width = 80 + (i % 4) * 35;
    const height = 18 + (i % 3) * 6;
    const baseY = 10 + (i % 4) * 12;
    const parallaxFactor = 0.18 + (i % 3) * 0.10; // Nuvens mais distantes movem-se mais devagar
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
      baseX: i * (k.width() / cloudCount * 1.3),
      baseY,
      speed,
      parallaxFactor,
      width,
    });
  }

  // 1.5. Estrelas Cintilantes na Costa Urbana Noturna (12.000m a 19.000m)
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
      baseX: i * (k.width() / starCount * 1.4),
      baseY: starY,
      blinkPhase: Math.random() * Math.PI * 2,
    });
  }

  // 2. Aves Marinhas (Albatrozes na Antártica / Gaivotas na Costa e Arraial)
  const birds: BirdData[] = [];
  const birdSpawnPoints = [
    // Albatrozes Polares (Antártica)
    { x: 900, y: 35, type: "albatross" as const, speed: 75 },
    { x: 2400, y: 25, type: "albatross" as const, speed: 85 },
    { x: 4100, y: 40, type: "albatross" as const, speed: 70 },
    // Gaivotas Litorâneas (Costa Urbana & Arraial)
    { x: 13500, y: 30, type: "seagull" as const, speed: 55 },
    { x: 16800, y: 22, type: "seagull" as const, speed: 60 },
    { x: 21200, y: 35, type: "seagull" as const, speed: 65 },
    { x: 23900, y: 28, type: "seagull" as const, speed: 58 },
    { x: 26200, y: 20, type: "seagull" as const, speed: 50 },
  ];

  birdSpawnPoints.forEach((b, idx) => {
    const isAlbatross = b.type === "albatross";
    const bodyColor = isAlbatross ? k.rgb(220, 230, 245) : k.rgb(255, 255, 255);
    const wingLength = isAlbatross ? 18 : 12;
    const bodyLength = isAlbatross ? 12 : 8;

    const body = k.add([
      k.rect(bodyLength, 3, { radius: 1 }),
      k.pos(b.x, b.y),
      k.color(bodyColor),
      k.anchor("center"),
      k.z(-7),
      "sky_bird",
    ]);

    const wingLeft = k.add([
      k.rect(wingLength, 2),
      k.pos(b.x - 2, b.y),
      k.color(isAlbatross ? k.rgb(60, 70, 80) : k.rgb(180, 190, 200)),
      k.anchor("right"),
      k.z(-7),
    ]);

    const wingRight = k.add([
      k.rect(wingLength, 2),
      k.pos(b.x + 2, b.y),
      k.color(isAlbatross ? k.rgb(60, 70, 80) : k.rgb(180, 190, 200)),
      k.anchor("left"),
      k.z(-7),
    ]);

    birds.push({
      body,
      wingLeft,
      wingRight,
      worldX: b.x,
      worldY: b.y,
      speedX: b.speed,
      flightType: b.type,
      animOffset: idx * 1.3,
    });
  });

  let time = 0;

  k.onUpdate(() => {
    time += k.dt();
    const camX = k.camPos().x;
    const screenLeft = camX - k.width() / 2;

    // A. Atualiza Nuvens em Paralaxe
    clouds.forEach((c) => {
      // Posição baseada na paralaxe da câmera + deriva do vento
      const drift = time * c.speed;
      const effectivePos = (c.baseX + drift + camX * c.parallaxFactor) % (k.width() * 1.5);
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
        c.obj.opacity = 0.40;
      } else if (camX < 25000) {
        c.obj.color = k.rgb(220, 195, 235); // Alvorada límpida / lilás
        c.obj.opacity = 0.55;
      } else {
        c.obj.color = k.rgb(255, 248, 230); // Manhã solar dourada em Arraial
        c.obj.opacity = 0.60;
      }
    });

    // A2. Atualiza Estrelas Cintilantes na Costa Urbana Noturna (12.000m - 19.000m)
    const nightIntensity =
      camX >= 11500 && camX <= 19500
        ? camX < 13000
          ? (camX - 11500) / 1500
          : camX > 18000
          ? (19500 - camX) / 1500
          : 1.0
        : 0;

    stars.forEach((s) => {
      const effPos = (s.baseX + camX * 0.05) % (k.width() * 1.4);
      s.obj.pos.x = screenLeft - 50 + effPos;
      const twinkle = Math.sin(time * 3.5 + s.blinkPhase) * 0.35 + 0.65;
      s.obj.opacity = nightIntensity * twinkle * 0.9;
    });

    // B. Atualiza Aves Marinhas (Voo e Bater de Asas)
    birds.forEach((b) => {
      b.worldX += b.speedX * k.dt();
      const flapSpeed = b.flightType === "albatross" ? 5.5 : 8.5;
      const wingAngle = Math.sin(time * flapSpeed + b.animOffset) * 24;

      // Ondulação suave de altitude
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
    });

  });
}

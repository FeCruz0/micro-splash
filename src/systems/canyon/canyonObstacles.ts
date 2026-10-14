import type { KaboomCtx } from "kaboom";
import { TAGS } from "../../config";
import type { CanyonConfig, AnemoneItem } from "./canyonTypes";

export function setupCanyonObstacles(k: KaboomCtx, config: CanyonConfig): AnemoneItem[] {
  const { rampUpEndX, shallowRockTopY } = config;

  // 1. Costões rochosos escarpados de granito com silhueta serrilhada orgânica
  const cragCount = 14;
  for (let c = 0; c < cragCount; c++) {
    const cragX = rampUpEndX + 20 + c * 78;
    const cragW = 46 + (c % 4) * 14;
    const cragH = 9 + (c % 5) * 3;
    const peakOffset = c % 2 === 0 ? -cragH : -cragH * 0.7;
    k.add([
      k.polygon([
        k.vec2(0, cragH + 4),
        k.vec2(cragW * 0.25, cragH * 0.4),
        k.vec2(cragW * 0.55, 0),
        k.vec2(cragW * 0.85, cragH * 0.3),
        k.vec2(cragW, cragH + 4),
      ]),
      k.pos(cragX, shallowRockTopY + peakOffset + 3),
      k.color(46 + (c % 3) * 6, 60 + (c % 3) * 6, 78 + (c % 3) * 8),
      k.outline(1.5, k.rgb(75, 98, 122)),
      k.z(3),
      "boqueirao_crag",
      TAGS.OBSTACLE,
    ]);
  }

  // 2. Fendas submarinas profundas e fraturas geológicas tectônicas verticais/diagonais
  const fissurePositions = [
    { x: rampUpEndX + 80, h: 55, w: 5, tilt: -12 },
    { x: rampUpEndX + 210, h: 70, w: 6, tilt: 8 },
    { x: rampUpEndX + 350, h: 48, w: 4, tilt: -6 },
    { x: rampUpEndX + 490, h: 80, w: 7, tilt: 14 },
    { x: rampUpEndX + 620, h: 62, w: 5, tilt: -10 },
    { x: rampUpEndX + 740, h: 75, w: 6, tilt: 7 },
    { x: rampUpEndX + 870, h: 50, w: 4, tilt: -8 },
    { x: rampUpEndX + 1010, h: 65, w: 6, tilt: 11 },
  ];

  for (const fp of fissurePositions) {
    // Fenda escura profunda
    k.add([
      k.rect(fp.w, fp.h, { radius: 1 }),
      k.pos(fp.x, shallowRockTopY + 8),
      k.color(14, 20, 28),
      k.rotate(fp.tilt),
      k.opacity(0.95),
      k.z(3),
      "boqueirao_fissure",
    ]);
    // Veio de quartzo / mineral na borda da fenda
    k.add([
      k.rect(1.5, fp.h * 0.85),
      k.pos(fp.x + fp.w, shallowRockTopY + 12),
      k.color(75, 95, 120),
      k.rotate(fp.tilt),
      k.opacity(0.7),
      k.z(3),
    ]);
  }

  // 3. Bioincrustações: Crostas de algas calcárias rosadas/aroxeadas (Lithothamnion)
  const crustCount = 16;
  for (let c = 0; c < crustCount; c++) {
    const crustX = rampUpEndX + 15 + c * 68;
    const crustW = 28 + (c % 4) * 10;
    const crustH = 3.5 + (c % 3) * 1.5;
    k.add([
      k.rect(crustW, crustH, { radius: 1.5 }),
      k.pos(crustX, shallowRockTopY - 1 + (c % 3) * 1.2),
      k.color(175 + (c % 3) * 10, 95 + (c % 4) * 8, 130 + (c % 2) * 15),
      k.opacity(0.88),
      k.z(3),
      "boqueirao_bioincrustation",
    ]);
  }

  // 4. Bioincrustações: Ouriços-pretos (Echinometra lucunter) em tocas e concavidades
  const urchinPockets = [
    { x: rampUpEndX + 150, y: shallowRockTopY + 6 },
    { x: rampUpEndX + 270, y: shallowRockTopY + 10 },
    { x: rampUpEndX + 430, y: shallowRockTopY + 5 },
    { x: rampUpEndX + 610, y: shallowRockTopY + 9 },
    { x: rampUpEndX + 790, y: shallowRockTopY + 6 },
    { x: rampUpEndX + 930, y: shallowRockTopY + 10 },
    { x: rampUpEndX + 1050, y: shallowRockTopY + 7 },
  ];

  for (const up of urchinPockets) {
    // Corpo esférico central
    k.add([k.circle(3), k.pos(up.x, up.y), k.color(18, 18, 22), k.z(4), "boqueirao_urchin"]);
    // Espinhos radiais
    for (let s = 0; s < 6; s++) {
      const angle = (s / 6) * Math.PI * 2;
      k.add([
        k.rect(1.2, 4.5, { radius: 0.5 }),
        k.pos(up.x, up.y),
        k.color(24, 24, 30),
        k.rotate(angle * (180 / Math.PI)),
        k.anchor("bot"),
        k.z(4),
        "boqueirao_urchin",
      ]);
    }
  }

  // 5. Bioincrustações: Tufos de Anêmonas Vivas (oscilam suavemente com a ressurgência)
  const anemones: AnemoneItem[] = [];
  const anemonePositions = [
    { x: rampUpEndX + 110, y: shallowRockTopY - 4, col: [230, 110, 85] },
    { x: rampUpEndX + 320, y: shallowRockTopY - 6, col: [75, 195, 155] },
    { x: rampUpEndX + 540, y: shallowRockTopY - 5, col: [240, 130, 95] },
    { x: rampUpEndX + 760, y: shallowRockTopY - 3, col: [85, 205, 165] },
    { x: rampUpEndX + 970, y: shallowRockTopY - 6, col: [225, 105, 80] },
  ];

  for (let a = 0; a < anemonePositions.length; a++) {
    const ap = anemonePositions[a];
    k.add([
      k.circle(3.5),
      k.pos(ap.x, ap.y + 2),
      k.color(
        Math.round(ap.col[0] * 0.7),
        Math.round(ap.col[1] * 0.7),
        Math.round(ap.col[2] * 0.7)
      ),
      k.z(4),
      "boqueirao_anemone",
    ]);
    for (let t = -2; t <= 2; t++) {
      const tentacle = k.add([
        k.rect(2, 6, { radius: 1 }),
        k.pos(ap.x + t * 2.5, ap.y - 1),
        k.color(ap.col[0], ap.col[1], ap.col[2]),
        k.rotate(t * 12),
        k.anchor("bot"),
        k.opacity(0.85),
        k.z(4),
        "boqueirao_anemone",
      ]);
      anemones.push({ obj: tentacle, baseAngle: t * 12, phase: a * 1.3 + t * 0.5 });
    }
  }

  return anemones;
}

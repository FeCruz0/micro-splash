/**
 * Paisagem Subaquática Contemplativa em Pixel Art 16-Bit para o Menu Principal — Micro Splash
 *
 * Renderiza em PixiJS 8 com geometria estática reutilizada e zero alocações por frame:
 * - Profundidade oceânica contínua + véus atmosféricos sutis entre planos
 * - Superfície solar pixelada orgânica com reflexos variados no topo central
 * - Raios volumétricos em leque natural com atenuação gradual de 6 segmentos
 * - Formações rochosas em 3 planos subdivididas em facetas menores com bordas pixeladas
 * - Agrupamentos discretos de vegetação bentônica, plâncton e bolhas ocasionais
 * - Silhueta distante da jubarte no terço superior esquerdo
 */

import type {
  IGraphicsNode,
  IRenderEngine,
  IRenderNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveScreenRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import {
  getRaySegmentPolygonVertices,
  type RaySegmentDefinition,
} from "../utils/volumetricRayGeometry";

interface AmbientParticleState {
  readonly node: IGraphicsNode;
  x: number;
  y: number;
  readonly speedY: number;
  readonly driftSpeed: number;
  readonly phase: number;
  readonly baseAlpha: number;
}

interface MenuLightRayState {
  readonly node: IGraphicsNode;
  readonly baseX: number;
  readonly baseAngleRad: number;
  readonly phase: number;
  readonly speed: number;
  readonly baseAlpha: number;
}

export interface MenuBackdropWhaleAdapter {
  pos?: { x: number; y: number };
  scale?: { x: number; y: number };
  opacity?: number;
  angle?: number;
  destroy?: () => void;
}

export interface MenuOceanBackdropHandle {
  destroy(): void;
}

function createDeterministicRng(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerpChannel(start: number, end: number, t: number): number {
  return Math.round(start + (end - start) * t);
}

function drawContinuousOceanDepth(
  graphics: IGraphicsNode,
  screenWidth: number,
  screenHeight: number
): void {
  const stripCount = 42;
  const topColor: readonly [number, number, number] = [14, 54, 98];
  const midColor: readonly [number, number, number] = [6, 26, 58];
  const abyssColor: readonly [number, number, number] = [3, 11, 28];

  for (let i = 0; i < stripCount; i++) {
    const t = i / (stripCount - 1);
    const yStart = Math.floor((i / stripCount) * screenHeight);
    const yEnd = Math.ceil(((i + 1) / stripCount) * screenHeight);
    const height = Math.max(1, yEnd - yStart + 1);

    const color: [number, number, number] =
      t < 0.45
        ? [
            lerpChannel(topColor[0], midColor[0], t / 0.45),
            lerpChannel(topColor[1], midColor[1], t / 0.45),
            lerpChannel(topColor[2], midColor[2], t / 0.45),
          ]
        : [
            lerpChannel(midColor[0], abyssColor[0], (t - 0.45) / 0.55),
            lerpChannel(midColor[1], abyssColor[1], (t - 0.45) / 0.55),
            lerpChannel(midColor[2], abyssColor[2], (t - 0.45) / 0.55),
          ];

    graphics.drawRect(0, yStart, screenWidth, height, { fill: { color, alpha: 1 } });
  }
}

function drawPixelatedSolarSurface(
  graphics: IGraphicsNode,
  screenWidth: number,
  rng: () => number
): void {
  const centerX = Math.round(screenWidth * 0.5);

  const haloBands: ReadonlyArray<{
    readonly halfW: number;
    readonly h: number;
    readonly color: [number, number, number];
    readonly alpha: number;
  }> = [
    { halfW: screenWidth * 0.48, h: 74, color: [18, 78, 126], alpha: 0.2 },
    { halfW: screenWidth * 0.32, h: 48, color: [36, 132, 180], alpha: 0.26 },
    { halfW: screenWidth * 0.18, h: 28, color: [84, 196, 232], alpha: 0.32 },
  ];

  for (const band of haloBands) {
    graphics.drawPolygon(
      [
        { x: Math.round(centerX - band.halfW), y: 0 },
        { x: Math.round(centerX + band.halfW), y: 0 },
        { x: Math.round(centerX + band.halfW * 0.56), y: band.h },
        { x: Math.round(centerX - band.halfW * 0.56), y: band.h },
      ],
      { fill: { color: band.color, alpha: band.alpha } }
    );
  }

  // Reflexos pixelados irregulares em múltiplas larguras e tonalidades
  const baseUnit = Math.max(6, Math.round(screenWidth / 140));
  for (let row = 0; row < 6; row++) {
    const cellH = row === 0 ? 5 : row <= 2 ? 4 : 3;
    const posY = row * 4;
    const spanRatio = 0.52 - row * 0.068;
    let cursorX = Math.round(centerX - screenWidth * spanRatio);
    const endX = Math.round(centerX + screenWidth * spanRatio);

    while (cursorX < endX) {
      const spanMultiplier = rng() > 0.62 ? 2 : 1;
      const cellW = baseUnit * spanMultiplier;
      const distNorm = Math.abs(cursorX - centerX) / (screenWidth * spanRatio);
      const density = (1 - distNorm * 0.68) * (1 - row * 0.13);

      if (rng() <= density) {
        const isCore = distNorm < 0.3 && row <= 1;
        const color: [number, number, number] = isCore
          ? [188, 248, 255]
          : row <= 2
            ? rng() > 0.45
              ? [114, 220, 246]
              : [68, 178, 222]
            : [34, 126, 176];
        const alpha = isCore ? 0.5 : 0.2 + (1 - distNorm) * 0.22;
        graphics.drawRect(cursorX, posY, Math.max(3, cellW - 2), cellH, {
          fill: { color, alpha },
        });
      }
      cursorX += cellW + Math.round(rng() * 3);
    }
  }
}

function drawRockFormationsThreePlanes(
  graphics: IGraphicsNode,
  screenWidth: number,
  screenHeight: number
): void {
  const w = (r: number) => Math.round(screenWidth * r);
  const h = (r: number) => Math.round(screenHeight * r);

  const drawPoly = (
    pts: ReadonlyArray<readonly [number, number]>,
    color: [number, number, number],
    alpha: number
  ) => {
    graphics.drawPolygon(
      pts.map(([rx, ry]) => ({ x: w(rx), y: h(ry) })),
      { fill: { color, alpha } }
    );
  };

  // --- PLANO 1 (Fundo distante): pináculos azulados de baixo contraste ---
  const distantBase: [number, number, number] = [8, 30, 62];
  drawPoly(
    [
      [0, 1],
      [0, 0.44],
      [0.04, 0.46],
      [0.08, 0.54],
      [0.13, 0.5],
      [0.16, 0.37],
      [0.19, 0.38],
      [0.22, 0.61],
      [0.28, 0.7],
      [0.35, 0.87],
      [0.42, 1],
    ],
    distantBase,
    0.68
  );
  drawPoly(
    [
      [0.62, 1],
      [0.68, 0.85],
      [0.73, 0.72],
      [0.76, 0.58],
      [0.79, 0.59],
      [0.83, 0.71],
      [0.88, 0.52],
      [0.92, 0.41],
      [0.96, 0.43],
      [1, 0.51],
      [1, 1],
    ],
    distantBase,
    0.68
  );

  // Véu atmosférico sutil sobre o plano distante para aumentar profundidade
  graphics.drawRect(0, h(0.35), screenWidth, h(0.65), {
    fill: { color: [7, 26, 56], alpha: 0.2 },
  });

  // --- PLANO 2 (Intermediário): paredões e platôs subdivididos em facetas ---
  const midBase: [number, number, number] = [5, 20, 44];
  const midShade: [number, number, number] = [9, 32, 66];
  const midLit: [number, number, number] = [17, 56, 98];
  const midHighlight: [number, number, number] = [26, 78, 128];

  // Esquerda intermediária
  drawPoly(
    [
      [0, 1],
      [0, 0.52],
      [0.06, 0.54],
      [0.11, 0.62],
      [0.17, 0.61],
      [0.22, 0.74],
      [0.29, 0.86],
      [0.37, 1],
    ],
    midBase,
    0.92
  );
  drawPoly(
    [
      [0.06, 0.54],
      [0.11, 0.62],
      [0.17, 0.61],
      [0.13, 0.71],
      [0.05, 0.66],
    ],
    midLit,
    0.62
  );
  drawPoly(
    [
      [0.11, 0.62],
      [0.17, 0.61],
      [0.22, 0.74],
      [0.17, 0.77],
    ],
    midHighlight,
    0.42
  );
  drawPoly(
    [
      [0, 0.52],
      [0.06, 0.54],
      [0.05, 0.66],
      [0, 0.63],
    ],
    midShade,
    0.58
  );

  // Direita intermediária (torre rochosa facetada)
  drawPoly(
    [
      [0.7, 1],
      [0.76, 0.87],
      [0.81, 0.76],
      [0.85, 0.64],
      [0.88, 0.44],
      [0.91, 0.3],
      [0.95, 0.29],
      [0.98, 0.37],
      [1, 0.44],
      [1, 1],
    ],
    midBase,
    0.92
  );
  drawPoly(
    [
      [0.88, 0.44],
      [0.91, 0.3],
      [0.93, 0.31],
      [0.9, 0.52],
      [0.85, 0.64],
    ],
    midLit,
    0.66
  );
  drawPoly(
    [
      [0.91, 0.3],
      [0.95, 0.29],
      [0.94, 0.42],
      [0.9, 0.52],
    ],
    midHighlight,
    0.4
  );
  drawPoly(
    [
      [0.81, 0.76],
      [0.85, 0.64],
      [0.9, 0.52],
      [0.87, 0.74],
    ],
    midShade,
    0.65
  );

  // --- PLANO 3 (Primeiro plano): rochas escuras recortadas com degraus e realces ---
  const foreDark: [number, number, number] = [3, 11, 27];
  const foreFacet: [number, number, number] = [5, 17, 39];
  const foreEdgeLit: [number, number, number] = [16, 50, 90];

  // Esquerda primeiro plano
  drawPoly(
    [
      [0, 1],
      [0, 0.64],
      [0.04, 0.66],
      [0.07, 0.59],
      [0.11, 0.58],
      [0.14, 0.67],
      [0.15, 0.75],
      [0.21, 0.82],
      [0.27, 0.92],
      [0.34, 1],
    ],
    foreDark,
    0.98
  );
  drawPoly(
    [
      [0, 0.64],
      [0.04, 0.66],
      [0.08, 0.76],
      [0.03, 0.88],
      [0, 0.84],
    ],
    foreFacet,
    0.78
  );
  drawPoly(
    [
      [0.07, 0.59],
      [0.11, 0.58],
      [0.14, 0.67],
      [0.1, 0.69],
    ],
    foreEdgeLit,
    0.58
  );
  drawPoly(
    [
      [0.15, 0.75],
      [0.21, 0.82],
      [0.24, 0.92],
      [0.18, 0.9],
    ],
    foreEdgeLit,
    0.44
  );

  // Direita primeiro plano
  drawPoly(
    [
      [0.72, 1],
      [0.78, 0.92],
      [0.83, 0.83],
      [0.87, 0.79],
      [0.91, 0.66],
      [0.95, 0.61],
      [1, 0.59],
      [1, 1],
    ],
    foreDark,
    0.98
  );
  drawPoly(
    [
      [0.87, 0.79],
      [0.91, 0.66],
      [0.94, 0.69],
      [0.9, 0.85],
    ],
    foreEdgeLit,
    0.54
  );
  drawPoly(
    [
      [0.78, 0.92],
      [0.83, 0.83],
      [0.88, 0.89],
      [0.83, 0.98],
    ],
    foreFacet,
    0.78
  );
}

function drawSparseBenthicFlora(
  graphics: IGraphicsNode,
  screenWidth: number,
  screenHeight: number
): void {
  const clusters: ReadonlyArray<{
    readonly xRatio: number;
    readonly yRatio: number;
    readonly dir: number;
    readonly height: number;
  }> = [
    { xRatio: 0.042, yRatio: 0.86, dir: 1, height: 30 },
    { xRatio: 0.068, yRatio: 0.88, dir: -1, height: 22 },
    { xRatio: 0.125, yRatio: 0.91, dir: 1, height: 24 },
    { xRatio: 0.15, yRatio: 0.93, dir: 1, height: 16 },
    { xRatio: 0.885, yRatio: 0.91, dir: -1, height: 22 },
    { xRatio: 0.92, yRatio: 0.88, dir: -1, height: 32 },
    { xRatio: 0.955, yRatio: 0.84, dir: -1, height: 26 },
  ];

  const stemCol: [number, number, number] = [18, 68, 108];
  const branchCol: [number, number, number] = [28, 96, 140];
  const tipCol: [number, number, number] = [52, 146, 190];

  for (const c of clusters) {
    const bx = Math.round(screenWidth * c.xRatio);
    const by = Math.round(screenHeight * c.yRatio);
    const d = c.dir;

    graphics.drawRect(bx, by - c.height, 3, c.height, { fill: { color: stemCol, alpha: 0.88 } });
    graphics.drawRect(
      bx + d * 4,
      by - Math.round(c.height * 0.72),
      3,
      Math.round(c.height * 0.42),
      {
        fill: { color: branchCol, alpha: 0.82 },
      }
    );
    graphics.drawRect(
      bx - d * 4,
      by - Math.round(c.height * 0.55),
      3,
      Math.round(c.height * 0.34),
      {
        fill: { color: branchCol, alpha: 0.8 },
      }
    );
    graphics.drawRect(bx, by - c.height - 4, 4, 4, { fill: { color: tipCol, alpha: 0.88 } });
    graphics.drawRect(bx + d * 5, by - Math.round(c.height * 0.72) - 3, 3, 3, {
      fill: { color: tipCol, alpha: 0.82 },
    });
  }
}

function createVolumetricMenuRaySegments(
  baseWidth: number,
  totalLength: number
): readonly RaySegmentDefinition[] {
  const step = totalLength / 6;
  const alphas = [1.0, 0.72, 0.45, 0.24, 0.1, 0.02];
  return alphas.map((relativeAlpha, idx) => ({
    topY: step * idx,
    bottomY: step * (idx + 1),
    topWidth: baseWidth * (1 + idx * 0.22),
    bottomWidth: baseWidth * (1 + (idx + 1) * 0.22),
    relativeAlpha,
  }));
}

/**
 * Constrói e anima o fundo contemplativo do menu principal no screenContainer do PixiJS 8.
 */
export function createMenuOceanBackdrop(
  renderEngine: IRenderEngine,
  screenWidth: number,
  screenHeight: number,
  distantWhaleNode?: MenuBackdropWhaleAdapter | null
): MenuOceanBackdropHandle {
  const screenContainer = resolveScreenRenderContainer(renderEngine);
  const createdNodes: IRenderNode[] = [];
  const rng = createDeterministicRng(20261120);

  // 1. Profundidade contínua + superfície pixelada + rochas facetadas em 3 planos + flora
  const backdropGraphics = renderEngine.createGraphics("menu_ocean_backdrop");
  drawContinuousOceanDepth(backdropGraphics, screenWidth, screenHeight);
  drawPixelatedSolarSurface(backdropGraphics, screenWidth, rng);
  drawRockFormationsThreePlanes(backdropGraphics, screenWidth, screenHeight);
  drawSparseBenthicFlora(backdropGraphics, screenWidth, screenHeight);
  backdropGraphics.setPosition(0, 0);
  backdropGraphics.setZIndex(0);
  screenContainer.addChild(backdropGraphics);
  createdNodes.push(backdropGraphics);

  // 2. Raios volumétricos em leque natural integrados à superfície
  const raySpecs: ReadonlyArray<{
    readonly xRatio: number;
    readonly width: number;
    readonly lengthRatio: number;
    readonly angleDeg: number;
    readonly alpha: number;
  }> = [
    { xRatio: 0.34, width: 8, lengthRatio: 0.6, angleDeg: 19, alpha: 0.048 },
    { xRatio: 0.4, width: 15, lengthRatio: 0.72, angleDeg: 13, alpha: 0.072 },
    { xRatio: 0.45, width: 10, lengthRatio: 0.66, angleDeg: 7, alpha: 0.064 },
    { xRatio: 0.5, width: 22, lengthRatio: 0.78, angleDeg: 1, alpha: 0.082 },
    { xRatio: 0.55, width: 11, lengthRatio: 0.7, angleDeg: -6, alpha: 0.068 },
    { xRatio: 0.6, width: 17, lengthRatio: 0.64, angleDeg: -12, alpha: 0.06 },
    { xRatio: 0.65, width: 8, lengthRatio: 0.56, angleDeg: -18, alpha: 0.044 },
    { xRatio: 0.7, width: 12, lengthRatio: 0.5, angleDeg: -23, alpha: 0.032 },
  ];

  const rayStates: MenuLightRayState[] = [];
  for (let i = 0; i < raySpecs.length; i++) {
    const spec = raySpecs[i];
    const segments = createVolumetricMenuRaySegments(
      spec.width,
      Math.round(screenHeight * spec.lengthRatio)
    );
    const rayNode = renderEngine.createGraphics(`menu_light_ray_${i}`);
    for (const segment of segments) {
      rayNode.drawPolygon(getRaySegmentPolygonVertices(segment), {
        fill: { color: [108, 214, 246], alpha: segment.relativeAlpha },
      });
    }
    const baseX = Math.round(screenWidth * spec.xRatio);
    const baseAngleRad = (spec.angleDeg * Math.PI) / 180;
    rayNode.setPosition(baseX, -4);
    rayNode.setRotation(baseAngleRad);
    rayNode.setOpacity(spec.alpha);
    rayNode.setZIndex(1);
    screenContainer.addChild(rayNode);
    createdNodes.push(rayNode);

    rayStates.push({
      node: rayNode,
      baseX,
      baseAngleRad,
      phase: i * 1.1,
      speed: 0.042 + (i % 3) * 0.012,
      baseAlpha: spec.alpha,
    });
  }

  // 3. Plâncton pixelado e pequenas bolhas discretas
  const ambientParticles: AmbientParticleState[] = [];
  for (let i = 0; i < 22; i++) {
    const isBrightHighlight = i % 6 === 0;
    const pixelSize = i % 3 === 0 ? 3 : 2;
    const color: [number, number, number] = isBrightHighlight
      ? [186, 242, 255]
      : i % 2 === 0
        ? [88, 182, 222]
        : [122, 210, 238];
    const baseAlpha = isBrightHighlight ? 0.42 : 0.16 + rng() * 0.2;

    const pNode = renderEngine.createGraphics(`menu_plankton_${i}`);
    pNode.drawRect(0, 0, pixelSize, pixelSize, { fill: { color, alpha: 1 } });

    const startX = Math.round(rng() * screenWidth);
    const startY = Math.round(rng() * screenHeight);
    pNode.setPosition(startX, startY);
    pNode.setOpacity(baseAlpha);
    pNode.setZIndex(2);
    screenContainer.addChild(pNode);
    createdNodes.push(pNode);

    ambientParticles.push({
      node: pNode,
      x: startX,
      y: startY,
      speedY: 3.5 + rng() * 6.5,
      driftSpeed: 0.18 + rng() * 0.22,
      phase: rng() * Math.PI * 2,
      baseAlpha,
    });
  }

  const bubbleAnchors = [0.16, 0.18, 0.21, 0.69, 0.87, 0.91];
  for (let i = 0; i < bubbleAnchors.length; i++) {
    const bubbleRadius = i % 2 === 0 ? 3 : 2;
    const bNode = renderEngine.createGraphics(`menu_bubble_${i}`);
    bNode.drawCircle(0, 0, bubbleRadius, {
      stroke: { color: [132, 222, 250], width: 1.2, alpha: 0.75 },
    });
    bNode.drawRect(-1, -1, 1.5, 1.5, { fill: { color: [220, 250, 255], alpha: 0.85 } });

    const startX = Math.round(screenWidth * bubbleAnchors[i]);
    const startY = Math.round(screenHeight * (0.28 + rng() * 0.55));
    const baseAlpha = 0.28 + rng() * 0.18;
    bNode.setPosition(startX, startY);
    bNode.setOpacity(baseAlpha);
    bNode.setZIndex(2);
    screenContainer.addChild(bNode);
    createdNodes.push(bNode);

    ambientParticles.push({
      node: bNode,
      x: startX,
      y: startY,
      speedY: 9 + rng() * 7,
      driftSpeed: 0.35 + rng() * 0.25,
      phase: rng() * Math.PI * 2,
      baseAlpha,
    });
  }

  // 4. Silhueta da baleia-jubarte no terço superior esquerdo
  const whaleMargin = 220;
  const whaleCycleSpan = screenWidth + whaleMargin * 2;
  let whaleX = Math.round(screenWidth * 0.22);
  let whalePauseRemaining = 0;
  let elapsedSeconds = 0;
  const whaleBaseY = Math.round(screenHeight * 0.22);

  if (distantWhaleNode && distantWhaleNode.pos) {
    distantWhaleNode.pos.x = whaleX;
    distantWhaleNode.pos.y = whaleBaseY;
    distantWhaleNode.opacity = 0.32;
  }

  const unregisterTicker = renderEngine.getTicker().add((deltaTime) => {
    const dt = Math.min(0.05, Math.max(0.001, deltaTime));
    if (accessibilitySystem.isReducedMotion()) {
      return;
    }

    elapsedSeconds += dt;

    for (let i = 0; i < rayStates.length; i++) {
      const ray = rayStates[i];
      const wave = Math.sin(elapsedSeconds * ray.speed + ray.phase);
      ray.node.setPosition(ray.baseX + wave * 10, -4);
      ray.node.setRotation(ray.baseAngleRad + wave * 0.012);
      ray.node.setOpacity(ray.baseAlpha + wave * 0.009);
    }

    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];
      p.y -= p.speedY * dt;
      p.x += Math.sin(elapsedSeconds * p.driftSpeed + p.phase) * 4 * dt;
      if (p.y < -10) {
        p.y = screenHeight + 10;
        p.x = ((p.x % screenWidth) + screenWidth) % screenWidth;
      }
      p.node.setPosition(p.x, p.y);
      const shimmer = Math.sin(elapsedSeconds * 0.55 + p.phase) * 0.05;
      p.node.setOpacity(Math.max(0.08, p.baseAlpha + shimmer));
    }

    if (distantWhaleNode && distantWhaleNode.pos) {
      if (whalePauseRemaining > 0) {
        whalePauseRemaining -= dt;
        distantWhaleNode.opacity = 0;
      } else {
        whaleX += 14 * dt;
        const progress = (whaleX + whaleMargin) / whaleCycleSpan;
        if (progress >= 1) {
          whaleX = -whaleMargin;
          whalePauseRemaining = 7.0;
          distantWhaleNode.opacity = 0;
        } else {
          const edgeFade = Math.min(1, progress / 0.16, (1 - progress) / 0.16);
          distantWhaleNode.opacity = 0.34 * Math.max(0, edgeFade);
          distantWhaleNode.pos.x = whaleX;
          distantWhaleNode.pos.y = whaleBaseY + Math.sin(elapsedSeconds * 0.4) * 7;
          distantWhaleNode.angle = -2.5 + Math.sin(elapsedSeconds * 0.5) * 1.4;
        }
      }
    }
  });

  return {
    destroy(): void {
      if (typeof unregisterTicker === "function") {
        unregisterTicker();
      }
      for (const node of createdNodes) {
        node.destroy();
      }
      createdNodes.length = 0;
      if (distantWhaleNode && typeof distantWhaleNode.destroy === "function") {
        distantWhaleNode.destroy();
      }
    },
  };
}

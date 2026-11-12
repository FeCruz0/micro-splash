/**
 * Sistema de Textura Pré-Gerada e Overlay de Rede de Pesca 16-Bits de Alto Contraste (Fase 68 / Etapa 2 & Refinamento).
 *
 * Gera proceduralmente uma armadilha completa de Ghost Net 16-bits que quebra a silhueta da baleia:
 * - Contorno Duplo para leitura imediata em fundo escuro e claro:
 *   Sombra escura (0x11171A, 4px) e linha principal em corda clara/ciano fantasma (0xF5E6C8 e 0x48C9B0, 2px).
 * - Primitivas reais de IGraphicsNode: drawPolygon (quadriláteros de 4 vértices para diagonais e pontas de corda)
 *   e drawRect para cabos, nós, boias laranjas (0xFF5722) e chumbos (0x90A4AE). Zero uso de drawLine inexistente.
 * - Coordenadas positivas no pre-bake (0 a 136 no eixo X, 0 a 54 no eixo Y) eliminando corte de quadrante no PixiJS v8.
 * - Sem sobrescrita de escala: não chama setSize(136, 54) junto com setScale.
 * - Resolução real do IRenderEngine a partir de k ou adaptador ativo, acoplando no container nativo da baleia
 *   com sortableChildren = true e zIndex = 999, ou camada de mundo via k.add().
 * - Dimensões 25% maiores que a caixa da entidade (136x54px) com alpha = 1.0 e zIndex = 999.
 * - Âncora centralizada sobre tronco e cauda com espelhamento horizontal (scale.x).
 * - Feedback físico de aprisionamento: pulsação de tensão (time * 16) e struggle jitter (time * 32).
 */

import type { PlayerGameObject } from "./types";
import type { IRenderEngine, IGraphicsNode } from "../../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveInitializedRenderEngine,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { getActiveRenderEngine } from "../../engine/adapters/RenderEngineAdapter";

export interface NetOverlayEngineContext {
  createGraphics?(id?: string): unknown;
  generateTexture?(
    target: unknown,
    options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
  ): unknown;
  createSprite?(texture: unknown, id?: string): unknown;
  getStageRoot?(): unknown;
  destroy?(obj: unknown): void;
  renderEngine?: unknown;
  getRenderEngine?(): unknown;
  add?(components?: unknown[]): unknown;
  rect?(w: number, h: number, opt?: { radius?: number }): unknown;
  pos?(x: number, y: number): unknown;
  rotate?(angle: number): unknown;
  opacity?(alpha: number): unknown;
  z?(zIndex: number): unknown;
  anchor?(a: string): unknown;
  color?(r: number, g?: number, b?: number): unknown;
  outline?(w: number, col: unknown): unknown;
  rgb?(r: number, g: number, b: number): unknown;
}

export interface NetGraphicsContext {
  drawPolygon?(
    pts: { x: number; y: number }[],
    opt?: {
      fill?: { color: number; alpha?: number };
      stroke?: { color: number; width?: number; alpha?: number };
    }
  ): void;
  drawRect?(
    x: number,
    y: number,
    w: number,
    h: number,
    opt?: {
      fill?: { color: number; alpha?: number };
      stroke?: { color: number; width?: number; alpha?: number };
    }
  ): void;
  destroy?(): void;
  [key: string]: unknown;
}

export interface NetOverlaySpriteNode {
  visible?: boolean;
  alpha?: number;
  opacity?: number;
  zIndex?: number;
  z?: number;
  scale?: { x: number; y: number };
  setVisible?(visible: boolean): void;
  setPosition?(x: number, y: number): void;
  setRotation?(angleInRadians: number): void;
  setScale?(scaleX: number, scaleY: number): void;
  setSize?(width: number, height: number): void;
  setAnchor?(anchorX: number, anchorY: number): void;
  setZIndex?(index: number): void;
  setOpacity?(alpha: number): void;
  destroy?(): void;
  getNativeNode?<T>(): T;
  [key: string]: unknown;
}

export interface WhaleNetOverlayController {
  readonly netOverlaySprite: NetOverlaySpriteNode | null;
  update(
    isTrapped: boolean,
    baleia: PlayerGameObject,
    isFacingRight: boolean,
    timeInSeconds?: number
  ): void;
  destroy(): void;
}

/** Paleta cromática autêntica de Ghost Net 16-bits de alto contraste */
export const NET_16BIT_PALETTE = {
  SHADOW_DARK: 0x11171a, // Sombra escura de contorno duplo (4px)
  ROPE_LIGHT: 0xf5e6c8, // Corda clara de alto contraste (2px)
  GHOST_CYAN: 0x48c9b0, // Ciano fantasma de rede de pesca (2px)
  KNOT_SQUARE: 0xf5e6c8, // Nós quadrados 3x3px
  CABLE_MAIN: 0xf5e6c8, // Cabo de tensão grosso
  CABLE_ACCENT: 0x48c9b0, // Realce de cabo de tensão
  FLOAT_ORANGE: 0xff5722, // Boias flutuadoras laranja-vivo
  FLOAT_YELLOW: 0xffd54f, // Boias flutuadoras amarelo
  LEAD_SINKER: 0x90a4ae, // Pesos de chumbo na borda inferior
  LEAD_SPECULAR: 0xcfd8dc, // Reflexo metálico no chumbo
  FRAYED_ROPE: 0xf5e6c8, // Pontas de corda arrebentadas arrastando
  FRAYED_CYAN: 0x48c9b0, // Pontas de corda em ciano
  FRAYED_SHADOW: 0x11171a, // Sombra das pontas arrastando

  // Aliases de retrocompatibilidade
  NYLON_LIGHT: 0xf5e6c8,
  NYLON_DARK: 0x11171a,
  FLOAT_BODY: 0xff5722,
  FLOAT_ACCENT: 0xffd54f,
  SINKER_LEAD: 0x90a4ae,
  SINKER_SPECULAR: 0xcfd8dc,
} as const;

/**
 * Desenha uma tira espessa (linha diagonal) como um polígono quadrilátero de 4 vértices.
 * Todos os vértices são rigorosamente limitados às coordenadas positivas [0, 136] e [0, 54].
 */
function drawQuadStrip(
  gfx: IGraphicsNode | NetGraphicsContext,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  color: number,
  alpha = 1.0
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 0.001) return;
  const half = thickness / 2;
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;
  const points = [
    { x: Math.max(0, Math.min(136, x1 + nx)), y: Math.max(0, Math.min(54, y1 + ny)) },
    { x: Math.max(0, Math.min(136, x1 - nx)), y: Math.max(0, Math.min(54, y1 - ny)) },
    { x: Math.max(0, Math.min(136, x2 - nx)), y: Math.max(0, Math.min(54, y2 - ny)) },
    { x: Math.max(0, Math.min(136, x2 + nx)), y: Math.max(0, Math.min(54, y2 + ny)) },
  ];

  if (typeof gfx.drawPolygon === "function") {
    gfx.drawPolygon(points, {
      fill: { color, alpha },
    });
  }
}

export interface WhaleBodyBounds {
  topY: number;
  bottomY: number;
}

/**
 * Calcula o contorno anatômico dorsoventral da baleia conforme o offset horizontal (getWhaleBodyBounds).
 * Função pura que retorna { topY, bottomY } relativo ao centro vertical (centerY = 27):
 * - Torso central (offsetX entre -8 e +22): dorso arqueado (topY = -17, bottomY = +16)
 * - Cabeça (offsetX > +22 até +44): afunilamento suave até topY = -7, bottomY = +8
 * - Pedúnculo da cauda (offsetX < -8 até -36): estrangulamento forte onde a rede aperta a cauda (topY = -6, bottomY = +6)
 * - Rabicho traseiro (offsetX < -36 até -54): abertura leve sobre a nadadeira caudal (topY = -10, bottomY = +10)
 */
export function getWhaleBodyBounds(offsetX: number): WhaleBodyBounds {
  // 1. Rabicho traseiro / abertura leve sobre a nadadeira caudal (offsetX <= -36 até -54)
  if (offsetX <= -36) {
    const clampedOffset = Math.max(-54, Math.min(-36, offsetX));
    const progression = (-36 - clampedOffset) / 18; // 0.0 a 1.0 de -36 até -54
    const topY = -6 - 4 * progression; // -6 -> -10
    const bottomY = 6 + 4 * progression; // +6 -> +10
    return { topY, bottomY };
  }

  // 2. Pedúnculo da cauda / estrangulamento forte onde a rede aperta a cauda (offsetX < -8 até -36)
  if (offsetX < -8) {
    const progression = (-8 - offsetX) / 28; // 0.0 a 1.0 de -8 até -36
    const topY = -17 + 11 * progression; // -17 -> -6
    const bottomY = 16 - 10 * progression; // +16 -> +6
    return { topY, bottomY };
  }

  // 3. Torso central com dorso arqueado (offsetX entre -8 e +22)
  if (offsetX <= 22) {
    const normalizedTorso = (offsetX - 7) / 15;
    const archOffset = normalizedTorso * normalizedTorso * 1.5;
    const topY = -17 + archOffset;
    const bottomY = 16 - archOffset * 0.5;
    return { topY, bottomY };
  }

  // 4. Cabeça / afunilamento suave (offsetX > +22 até +44)
  const clampedHead = Math.min(44, Math.max(22, offsetX));
  const headProgression = (clampedHead - 22) / 22; // 0.0 a 1.0 de +22 até +44
  const topY = -17 + 10 * headProgression; // -17 -> -7
  const bottomY = 16 - 8 * headProgression; // +16 -> +8
  return { topY, bottomY };
}

/**
 * Desenha proceduralmente a armadilha de Ghost Net 16-bits organicamente enrolada na anatomia da baleia:
 * - 6 laços transversais anatômicos cujas extremidades começam em topY(x) e terminam em bottomY(x)
 * - Arcos com curvatura 3D simulada via deslocamento de 2px no centro equatorial
 * - Fios diagonais cruzados em X (malha losangular de pesca)
 * - Cabos longitudinais convergindo em direção ao pedúnculo caudal (offsetX = -34)
 * - 3 pontas de corda arrebentadas e assimétricas saindo do nó da cauda (offsetX = -34 até -56)
 * - 5 boias laranjas acompanhando o contorno superior topY(x)
 * - 4 chumbos cinzas acompanhando a curva ventral bottomY(x)
 * - Nós escuros 3x3px com centro claro 0xF5E6C8 nos cruzamentos diagonais
 */
export function drawRetro16BitNetMesh(gfx: IGraphicsNode | NetGraphicsContext): void {
  const centerX = 68;
  const centerY = 27;

  // 1. 6 Laços de envoltório (cintas transversais anatômicas) de -34 a +36
  const loopOffsetsX = [-34, -20, -6, 8, 22, 36];
  const loopCoords: Array<{
    ox: number;
    cx: number;
    startY: number;
    midY: number;
    endY: number;
    height: number;
  }> = [];

  for (const ox of loopOffsetsX) {
    const bounds = getWhaleBodyBounds(ox);
    const cx = centerX + ox;
    const startY = Math.round(centerY + bounds.topY);
    const endY = Math.round(centerY + bounds.bottomY);
    const midY = Math.round((startY + endY) / 2);
    const height = endY - startY;

    loopCoords.push({ ox, cx, startY, midY, endY, height });

    // Desenha arco transversal em 2 segmentos com deslocamento em 2px no centro (+2px para frente)
    // para conferir volume cilíndrico 3D à jubarte
    if (typeof gfx.drawPolygon === "function") {
      // Sombra escura
      drawQuadStrip(gfx, cx, startY, cx + 2, midY, 4, NET_16BIT_PALETTE.SHADOW_DARK, 1.0);
      drawQuadStrip(gfx, cx + 2, midY, cx, endY, 4, NET_16BIT_PALETTE.SHADOW_DARK, 1.0);
      // Corda clara
      drawQuadStrip(gfx, cx, startY, cx + 2, midY, 2, NET_16BIT_PALETTE.ROPE_LIGHT, 1.0);
      drawQuadStrip(gfx, cx + 2, midY, cx, endY, 2, NET_16BIT_PALETTE.ROPE_LIGHT, 1.0);
    } else if (typeof gfx.drawRect === "function") {
      const topH = Math.max(2, midY - startY);
      const botH = Math.max(2, endY - midY);
      // Sombra
      gfx.drawRect(cx - 2, startY, 4, topH, {
        fill: { color: NET_16BIT_PALETTE.SHADOW_DARK, alpha: 1.0 },
      });
      gfx.drawRect(cx, midY, 4, botH, {
        fill: { color: NET_16BIT_PALETTE.SHADOW_DARK, alpha: 1.0 },
      });
      // Corda
      gfx.drawRect(cx - 1, startY, 2, topH, {
        fill: { color: NET_16BIT_PALETTE.ROPE_LIGHT, alpha: 1.0 },
      });
      gfx.drawRect(cx + 1, midY, 2, botH, {
        fill: { color: NET_16BIT_PALETTE.ROPE_LIGHT, alpha: 1.0 },
      });
    }
  }

  // 2. Fios diagonais cruzados em X (malha losangular) conectando laços adjacentes
  const knotPositions: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < loopCoords.length - 1; i++) {
    const l1 = loopCoords[i];
    const l2 = loopCoords[i + 1];

    if (typeof gfx.drawPolygon === "function") {
      // Sombra escura das diagonais
      drawQuadStrip(
        gfx,
        l1.cx,
        l1.startY,
        l2.cx + 2,
        l2.midY,
        3,
        NET_16BIT_PALETTE.SHADOW_DARK,
        0.9
      );
      drawQuadStrip(
        gfx,
        l1.cx + 2,
        l1.midY,
        l2.cx,
        l2.startY,
        3,
        NET_16BIT_PALETTE.SHADOW_DARK,
        0.9
      );
      drawQuadStrip(gfx, l1.cx + 2, l1.midY, l2.cx, l2.endY, 3, NET_16BIT_PALETTE.SHADOW_DARK, 0.9);
      drawQuadStrip(gfx, l1.cx, l1.endY, l2.cx + 2, l2.midY, 3, NET_16BIT_PALETTE.SHADOW_DARK, 0.9);

      // Linhas principais de corda clara e ciano fantasma
      const ropeColor = i % 2 === 0 ? NET_16BIT_PALETTE.ROPE_LIGHT : NET_16BIT_PALETTE.GHOST_CYAN;
      drawQuadStrip(gfx, l1.cx, l1.startY, l2.cx + 2, l2.midY, 2, ropeColor, 1.0);
      drawQuadStrip(gfx, l1.cx + 2, l1.midY, l2.cx, l2.startY, 2, ropeColor, 1.0);
      drawQuadStrip(gfx, l1.cx + 2, l1.midY, l2.cx, l2.endY, 2, ropeColor, 1.0);
      drawQuadStrip(gfx, l1.cx, l1.endY, l2.cx + 2, l2.midY, 2, ropeColor, 1.0);
    }

    // Calcula os pontos de interseção dos Xs para posicionar os nós
    const crossX = Math.round((l1.cx + l2.cx) / 2);
    const upperCrossY = Math.round((l1.startY + l1.midY + l2.startY + l2.midY) / 4);
    const lowerCrossY = Math.round((l1.midY + l1.endY + l2.midY + l2.endY) / 4);

    knotPositions.push({ x: crossX, y: upperCrossY });
    knotPositions.push({ x: crossX, y: lowerCrossY });
    knotPositions.push({ x: l1.cx + 2, y: l1.midY });
  }
  const lastLoop = loopCoords[loopCoords.length - 1];
  knotPositions.push({ x: lastLoop.cx + 2, y: lastLoop.midY });

  // 3. Cabos longitudinais que convergem para o pedúnculo caudal (ox = -34, cx = 34)
  for (let i = 0; i < loopCoords.length - 1; i++) {
    const l1 = loopCoords[i];
    const l2 = loopCoords[i + 1];

    if (typeof gfx.drawPolygon === "function") {
      // Cabo dorsal convergente
      drawQuadStrip(
        gfx,
        l1.cx,
        l1.startY + 2,
        l2.cx,
        l2.startY + 2,
        3,
        NET_16BIT_PALETTE.SHADOW_DARK,
        0.8
      );
      drawQuadStrip(
        gfx,
        l1.cx,
        l1.startY + 2,
        l2.cx,
        l2.startY + 2,
        2,
        NET_16BIT_PALETTE.ROPE_LIGHT,
        1.0
      );

      // Cabo da linha lateral convergente
      drawQuadStrip(
        gfx,
        l1.cx + 2,
        l1.midY,
        l2.cx + 2,
        l2.midY,
        3,
        NET_16BIT_PALETTE.SHADOW_DARK,
        0.8
      );
      drawQuadStrip(
        gfx,
        l1.cx + 2,
        l1.midY,
        l2.cx + 2,
        l2.midY,
        2,
        NET_16BIT_PALETTE.ROPE_LIGHT,
        1.0
      );

      // Cabo ventral convergente
      drawQuadStrip(
        gfx,
        l1.cx,
        l1.endY - 2,
        l2.cx,
        l2.endY - 2,
        3,
        NET_16BIT_PALETTE.SHADOW_DARK,
        0.8
      );
      drawQuadStrip(
        gfx,
        l1.cx,
        l1.endY - 2,
        l2.cx,
        l2.endY - 2,
        2,
        NET_16BIT_PALETTE.ROPE_LIGHT,
        1.0
      );
    }
  }

  // 4. 3 Pontas de corda arrebentadas e assimétricas saindo do nó da cauda (ox = -34 até -56)
  const tailKnotX = centerX - 34; // 34
  const tailKnotY = centerY; // 27

  if (typeof gfx.drawPolygon === "function") {
    // Ponta 1 (superior/longa até ox = -56, x = 12)
    drawQuadStrip(
      gfx,
      tailKnotX,
      tailKnotY,
      tailKnotX - 10,
      tailKnotY - 4,
      3,
      NET_16BIT_PALETTE.SHADOW_DARK,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX - 10,
      tailKnotY - 4,
      tailKnotX - 22,
      tailKnotY - 6,
      3,
      NET_16BIT_PALETTE.SHADOW_DARK,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX,
      tailKnotY,
      tailKnotX - 10,
      tailKnotY - 4,
      2,
      NET_16BIT_PALETTE.ROPE_LIGHT,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX - 10,
      tailKnotY - 4,
      tailKnotX - 22,
      tailKnotY - 6,
      2,
      NET_16BIT_PALETTE.ROPE_LIGHT,
      1.0
    );

    // Ponta 2 (mediana/ondulada)
    drawQuadStrip(
      gfx,
      tailKnotX,
      tailKnotY,
      tailKnotX - 8,
      tailKnotY + 2,
      3,
      NET_16BIT_PALETTE.SHADOW_DARK,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX - 8,
      tailKnotY + 2,
      tailKnotX - 16,
      tailKnotY + 1,
      3,
      NET_16BIT_PALETTE.SHADOW_DARK,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX,
      tailKnotY,
      tailKnotX - 8,
      tailKnotY + 2,
      2,
      NET_16BIT_PALETTE.GHOST_CYAN,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX - 8,
      tailKnotY + 2,
      tailKnotX - 16,
      tailKnotY + 1,
      2,
      NET_16BIT_PALETTE.GHOST_CYAN,
      1.0
    );

    // Ponta 3 (inferior/curta)
    drawQuadStrip(
      gfx,
      tailKnotX,
      tailKnotY,
      tailKnotX - 7,
      tailKnotY + 6,
      3,
      NET_16BIT_PALETTE.SHADOW_DARK,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX - 7,
      tailKnotY + 6,
      tailKnotX - 18,
      tailKnotY + 7,
      3,
      NET_16BIT_PALETTE.SHADOW_DARK,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX,
      tailKnotY,
      tailKnotX - 7,
      tailKnotY + 6,
      2,
      NET_16BIT_PALETTE.ROPE_LIGHT,
      1.0
    );
    drawQuadStrip(
      gfx,
      tailKnotX - 7,
      tailKnotY + 6,
      tailKnotX - 18,
      tailKnotY + 7,
      2,
      NET_16BIT_PALETTE.ROPE_LIGHT,
      1.0
    );
  }

  // 5. Nós escuros (3x3 px em 0x11171A com centro 0xF5E6C8) nos cruzamentos da silhueta
  knotPositions.push({ x: tailKnotX, y: tailKnotY });

  for (const knot of knotPositions) {
    if (typeof gfx.drawRect === "function") {
      // Borda escura 3x3px (0x11171A)
      gfx.drawRect(knot.x - 1.5, knot.y - 1.5, 3, 3, {
        fill: { color: NET_16BIT_PALETTE.SHADOW_DARK, alpha: 1.0 },
      });
      // Centro claro 1x1px (0xF5E6C8)
      gfx.drawRect(knot.x - 0.5, knot.y - 0.5, 1, 1, {
        fill: { color: NET_16BIT_PALETTE.ROPE_LIGHT, alpha: 1.0 },
      });
    }
  }

  // 6. 5 Boias laranjas (8x4 px) acompanhando a curva superior topY(x)
  const floatOffsetsX = [-26, -12, 4, 18, 32];
  for (let fi = 0; fi < floatOffsetsX.length; fi++) {
    const fox = floatOffsetsX[fi];
    const fBounds = getWhaleBodyBounds(fox);
    const fcx = centerX + fox;
    const yJitter = fi % 2 === 0 ? -1 : 1;
    const fcy = centerY + fBounds.topY - 3 + yJitter;

    if (typeof gfx.drawRect === "function") {
      // Borda da boia (10x6 px em 0x11171A)
      gfx.drawRect(fcx - 5, fcy - 3, 10, 6, {
        fill: { color: NET_16BIT_PALETTE.SHADOW_DARK, alpha: 1.0 },
      });
      // Corpo da boia (8x4 px em 0xFF5722)
      gfx.drawRect(fcx - 4, fcy - 2, 8, 4, {
        fill: { color: NET_16BIT_PALETTE.FLOAT_ORANGE, alpha: 1.0 },
      });
      // Centro amarelo (4x2 px em 0xFFD54F)
      gfx.drawRect(fcx - 2, fcy - 1, 4, 2, {
        fill: { color: NET_16BIT_PALETTE.FLOAT_YELLOW, alpha: 1.0 },
      });
    }
  }

  // 7. 4 Chumbos cinzas (5x5 px em 0x90A4AE) acompanhando a curva ventral bottomY(x)
  const sinkerOffsetsX = [-24, -8, 10, 26];
  for (const sox of sinkerOffsetsX) {
    const sBounds = getWhaleBodyBounds(sox);
    const scx = centerX + sox;
    const scy = centerY + sBounds.bottomY + 3;

    if (typeof gfx.drawRect === "function") {
      // Borda escura (7x7 px em 0x11171A)
      gfx.drawRect(scx - 3.5, scy - 3.5, 7, 7, {
        fill: { color: NET_16BIT_PALETTE.SHADOW_DARK, alpha: 1.0 },
      });
      // Corpo do chumbo (5x5 px em 0x90A4AE)
      gfx.drawRect(scx - 2.5, scy - 2.5, 5, 5, {
        fill: { color: NET_16BIT_PALETTE.LEAD_SINKER, alpha: 1.0 },
      });
    }
  }
}

/**
 * Resolve deterministicamente a instância real de IRenderEngine a partir do contexto ou adaptador ativo.
 */
export function resolveRenderEngine(engineContext?: unknown): IRenderEngine | null {
  const initializedEngine = resolveInitializedRenderEngine(engineContext);
  if (initializedEngine) {
    return initializedEngine;
  }
  if (engineContext && typeof engineContext === "object") {
    const ctx = engineContext as {
      getRenderEngine?: () => unknown;
      createGraphics?: unknown;
      createSprite?: unknown;
    };
    if ("getRenderEngine" in ctx && typeof ctx.getRenderEngine === "function") {
      const resolvedFromGetter = resolveInitializedRenderEngine(ctx.getRenderEngine());
      if (resolvedFromGetter) return resolvedFromGetter;
    }
    if ("createGraphics" in ctx && "createSprite" in ctx) {
      return engineContext as unknown as IRenderEngine;
    }
  }
  const activeEngine = getActiveRenderEngine();
  if (activeEngine && isRenderEngine(activeEngine)) {
    return resolveInitializedRenderEngine(activeEngine);
  }
  const globalEngine =
    typeof globalThis !== "undefined"
      ? (globalThis as unknown as Record<string, unknown>).__MICRO_SPLASH_RENDER_ENGINE
      : null;
  return resolveInitializedRenderEngine(globalEngine);
}

/**
 * Cria a textura 16-bits estática pré-gerada (bake imediato em coordenadas positivas e descarte de Graphics).
 */
export function create16BitNetTexture(engineContext: unknown): unknown | null {
  const engine = resolveRenderEngine(engineContext) ?? (engineContext as NetOverlayEngineContext);
  const engObj = engine as unknown as {
    createGraphics?: (id?: string) => unknown;
    generateTexture?: (
      target: unknown,
      options?: { resolution?: number; scaleMode?: "nearest" | "linear" }
    ) => unknown;
  };
  if (
    !engine ||
    typeof engObj.createGraphics !== "function" ||
    typeof engObj.generateTexture !== "function"
  ) {
    return null;
  }

  try {
    const tempGfx = engObj.createGraphics("whale_net_mesh_bake") as NetGraphicsContext;
    drawRetro16BitNetMesh(tempGfx);

    const bakedTexture = engObj.generateTexture(tempGfx, {
      resolution: 0.5,
      scaleMode: "nearest",
    });

    if (typeof tempGfx.destroy === "function") {
      tempGfx.destroy();
    }

    return bakedTexture ?? null;
  } catch {
    return null;
  }
}

/**
 * Inicializa o Sprite de Overlay de Rede 16-bits de alto contraste acoplado à baleia:
 * - alpha = 1.0
 * - zIndex = 999 (estritamente superior a todas as partes do corpo da baleia)
 * - Fundo 100% transparente (vazado), revelando >= 80% do corpo azul da baleia
 * - Dimensões 25% maiores que a caixa da entidade (136x54) bakeadas nativamente na textura
 * - Âncora centralizada (0.5, 0.5) sobre tronco e cauda com espelhamento horizontal (scale.x)
 * - Sem chamada concorrente a setSize(136, 54) com setScale para não sobrescrever a escala da textura
 * - Acoplamento direto no container nativo da baleia com sortableChildren = true ou na camada de mundo via k.add()
 * - Animação de restrição física no onUpdate com tensão da malha (time * 16)
 */
export function setupWhaleNetOverlay(
  engineContext: NetOverlayEngineContext | IRenderEngine | unknown,
  baleia: PlayerGameObject
): WhaleNetOverlayController {
  let netOverlaySprite: NetOverlaySpriteNode | null = null;
  let isChildAttachedToContainer = false;

  const isExplicitEngine =
    engineContext &&
    typeof engineContext === "object" &&
    ("createGraphics" in engineContext || "createSprite" in engineContext);

  const activeEngine = isExplicitEngine
    ? (engineContext as NetOverlayEngineContext)
    : resolveRenderEngine(engineContext);
  const targetEngine = activeEngine ?? (engineContext as NetOverlayEngineContext);

  // 1. Tenta pré-bake da textura 16-bits via IRenderEngine
  const bakedTexture = create16BitNetTexture(targetEngine);

  const engSpriteCreator = targetEngine as unknown as {
    createSprite?: (tex: unknown, id?: string) => NetOverlaySpriteNode;
    getStageRoot?: () => { addChild?: (node: unknown) => void };
  };

  if (bakedTexture && typeof engSpriteCreator.createSprite === "function") {
    try {
      const spriteNode = engSpriteCreator.createSprite(bakedTexture, "whale_net_overlay");

      // Âncora centralizada
      if (typeof spriteNode.setAnchor === "function") {
        spriteNode.setAnchor(0.5, 0.5);
      }

      // Inicialmente invisível
      if (typeof spriteNode.setVisible === "function") {
        spriteNode.setVisible(false);
      }
      spriteNode.visible = false;

      // Hierarquia e Opacidade: alpha = 1.0 e zIndex = 999 (superior a todas as partes do corpo da baleia)
      spriteNode.alpha = 1.0;
      spriteNode.opacity = 1.0;
      if (typeof spriteNode.setOpacity === "function") {
        spriteNode.setOpacity(1.0);
      }

      if (typeof spriteNode.setZIndex === "function") {
        spriteNode.setZIndex(999);
      }
      spriteNode.zIndex = 999;
      spriteNode.z = 999;

      // Tenta acoplar diretamente como filho do container nativo da baleia (Pixi)
      const baleiaWithNodes = baleia as unknown as {
        node?: unknown;
        _pixiNode?: unknown;
        getNativeNode?: () => unknown;
        addChild?: (c: unknown) => void;
        sortableChildren?: boolean;
      };

      const nativeBaleia = (baleiaWithNodes.node ??
        baleiaWithNodes._pixiNode ??
        (typeof baleiaWithNodes.getNativeNode === "function"
          ? baleiaWithNodes.getNativeNode()
          : baleiaWithNodes)) as {
        addChild?: (child: unknown) => void;
        sortableChildren?: boolean;
      };

      const nativeSprite = (
        typeof (spriteNode as unknown as { getNativeNode?: () => unknown }).getNativeNode ===
        "function"
          ? (spriteNode as unknown as { getNativeNode: () => unknown }).getNativeNode()
          : spriteNode
      ) as { zIndex?: number } | null;

      if (nativeBaleia && typeof nativeBaleia.addChild === "function") {
        if ("sortableChildren" in nativeBaleia) {
          nativeBaleia.sortableChildren = true;
        }
        if (nativeSprite && typeof nativeSprite === "object") {
          nativeSprite.zIndex = 999;
        }
        nativeBaleia.addChild(nativeSprite);
        isChildAttachedToContainer = true;
      } else if (typeof baleiaWithNodes.addChild === "function") {
        if ("sortableChildren" in baleiaWithNodes) {
          baleiaWithNodes.sortableChildren = true;
        }
        baleiaWithNodes.addChild(spriteNode);
        isChildAttachedToContainer = true;
      } else if (typeof engSpriteCreator.getStageRoot === "function") {
        const stageRoot = engSpriteCreator.getStageRoot();
        if (stageRoot && typeof stageRoot.addChild === "function") {
          stageRoot.addChild(spriteNode);
        }
      }

      netOverlaySprite = spriteNode;
    } catch {
      netOverlaySprite = null;
    }
  }

  // 2. Fallback via sub-elementos vazados se não houver sprite Pixi (zero preenchimento de fundo)
  if (!netOverlaySprite) {
    interface FallbackChildNode {
      hidden?: boolean;
      opacity?: number;
      pos?: { x: number; y: number };
      angle?: number;
      scale?: { x: number; y: number };
      destroy?: () => void;
    }
    let attachedChild: FallbackChildNode | null = null;
    const attachedChildren: FallbackChildNode[] = [];

    const baleiaObj = baleia as unknown as {
      add?: (components: unknown[]) => FallbackChildNode;
    };

    if (typeof baleiaObj?.add === "function") {
      try {
        const kObj = (engineContext as NetOverlayEngineContext) ?? {};
        // Container raiz transparente acoplado à baleia (sem nenhum rect de preenchimento)
        attachedChild = baleiaObj.add([
          typeof kObj.pos === "function" ? kObj.pos(-20, 0) : {},
          typeof kObj.z === "function" ? kObj.z(999) : {},
          "whale_net_overlay",
        ]);
        if (attachedChild) {
          attachedChild.hidden = true;
          isChildAttachedToContainer = true;
        }

        // Sub-elementos da malha anatômica vazada:
        // A. 6 laços de envoltório com altura correspondente a getWhaleBodyBounds(ox)
        const loopPositionsX = [-34, -20, -6, 8, 22, 36];
        for (const lox of loopPositionsX) {
          const lBounds = getWhaleBodyBounds(lox);
          const loopHeight = Math.max(8, Math.round(lBounds.bottomY - lBounds.topY));
          const loopCenterY = Math.round((lBounds.topY + lBounds.bottomY) / 2);

          if (typeof kObj.rect === "function") {
            // Borda escura do laço
            const borderLoop = baleiaObj.add([
              kObj.rect(4, loopHeight),
              typeof kObj.pos === "function" ? kObj.pos(lox - 20, loopCenterY) : {},
              typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
              typeof kObj.color === "function" ? kObj.color(17, 23, 26) : {},
              typeof kObj.z === "function" ? kObj.z(998) : {},
              "whale_net_loop_border",
            ]);
            if (borderLoop) {
              borderLoop.hidden = true;
              attachedChildren.push(borderLoop);
            }

            // Tira de corda do laço
            const strandLoop = baleiaObj.add([
              kObj.rect(2, loopHeight),
              typeof kObj.pos === "function" ? kObj.pos(lox - 20, loopCenterY) : {},
              typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
              typeof kObj.color === "function" ? kObj.color(245, 230, 200) : {},
              typeof kObj.z === "function" ? kObj.z(999) : {},
              "whale_net_loop",
            ]);
            if (strandLoop) {
              strandLoop.hidden = true;
              attachedChildren.push(strandLoop);
            }
          }
        }

        // B. Cabos longitudinais convergindo em direção ao pedúnculo caudal
        for (let i = 0; i < loopPositionsX.length - 1; i++) {
          const x1 = loopPositionsX[i];
          const x2 = loopPositionsX[i + 1];
          const spanW = x2 - x1;
          const midX = (x1 + x2) / 2;
          const b1 = getWhaleBodyBounds(x1);
          const b2 = getWhaleBodyBounds(x2);

          const dorsalY = (b1.topY + b2.topY) / 2 + 2;
          const lateralY = (b1.topY + b1.bottomY + b2.topY + b2.bottomY) / 4;
          const ventralY = (b1.bottomY + b2.bottomY) / 2 - 2;

          for (const lineY of [dorsalY, lateralY, ventralY]) {
            if (typeof kObj.rect === "function") {
              const cable = baleiaObj.add([
                kObj.rect(spanW, 2),
                typeof kObj.pos === "function" ? kObj.pos(midX - 20, lineY) : {},
                typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
                typeof kObj.color === "function" ? kObj.color(245, 230, 200) : {},
                typeof kObj.z === "function" ? kObj.z(999) : {},
                "whale_net_cable",
              ]);
              if (cable) {
                cable.hidden = true;
                attachedChildren.push(cable);
              }
            }
          }
        }

        // C. Nós escuros nos cruzamentos
        for (let i = 0; i < loopPositionsX.length - 1; i++) {
          const x1 = loopPositionsX[i];
          const x2 = loopPositionsX[i + 1];
          const midX = (x1 + x2) / 2;
          const bMid = getWhaleBodyBounds(midX);
          const midY = (bMid.topY + bMid.bottomY) / 2;

          for (const ky of [bMid.topY + 6, midY, bMid.bottomY - 6]) {
            if (typeof kObj.rect === "function") {
              const knot = baleiaObj.add([
                kObj.rect(3, 3),
                typeof kObj.pos === "function" ? kObj.pos(midX - 20, ky) : {},
                typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
                typeof kObj.color === "function" ? kObj.color(17, 23, 26) : {},
                typeof kObj.z === "function" ? kObj.z(1000) : {},
                "whale_net_knot",
              ]);
              if (knot) {
                knot.hidden = true;
                attachedChildren.push(knot);
              }
            }
          }
        }

        // D. 5 boias laranjas (8x4 px em 0xFF5722 com centro amarelo 0xFFD54F) acompanhando topY(x)
        const floatPositionsX = [-26, -12, 4, 18, 32];
        for (let fi = 0; fi < floatPositionsX.length; fi++) {
          const fox = floatPositionsX[fi];
          const fBounds = getWhaleBodyBounds(fox);
          const yJitter = fi % 2 === 0 ? -1 : 1;
          const floatY = fBounds.topY - 3 + yJitter;

          if (typeof kObj.rect === "function") {
            const floatBody = baleiaObj.add([
              kObj.rect(8, 4),
              typeof kObj.pos === "function" ? kObj.pos(fox - 20, floatY) : {},
              typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
              typeof kObj.color === "function" ? kObj.color(255, 87, 34) : {},
              typeof kObj.outline === "function"
                ? kObj.outline(1, typeof kObj.rgb === "function" ? kObj.rgb(17, 23, 26) : 0x11171a)
                : {},
              typeof kObj.z === "function" ? kObj.z(1001) : {},
              "whale_net_float",
            ]);
            if (floatBody) {
              floatBody.hidden = true;
              attachedChildren.push(floatBody);
            }

            const floatCenter = baleiaObj.add([
              kObj.rect(4, 2),
              typeof kObj.pos === "function" ? kObj.pos(fox - 20, floatY) : {},
              typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
              typeof kObj.color === "function" ? kObj.color(255, 213, 79) : {},
              typeof kObj.z === "function" ? kObj.z(1002) : {},
              "whale_net_float_center",
            ]);
            if (floatCenter) {
              floatCenter.hidden = true;
              attachedChildren.push(floatCenter);
            }
          }
        }

        // E. 4 chumbos cinzas (5x5 px em 0x90A4AE) acompanhando a curva ventral bottomY(x)
        const sinkerPositionsX = [-24, -8, 10, 26];
        for (const sox of sinkerPositionsX) {
          const sBounds = getWhaleBodyBounds(sox);
          const sinkerY = sBounds.bottomY + 3;

          if (typeof kObj.rect === "function") {
            const sinker = baleiaObj.add([
              kObj.rect(5, 5),
              typeof kObj.pos === "function" ? kObj.pos(sox - 20, sinkerY) : {},
              typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
              typeof kObj.color === "function" ? kObj.color(144, 164, 174) : {},
              typeof kObj.outline === "function"
                ? kObj.outline(1, typeof kObj.rgb === "function" ? kObj.rgb(17, 23, 26) : 0x11171a)
                : {},
              typeof kObj.z === "function" ? kObj.z(1001) : {},
              "whale_net_sinker",
            ]);
            if (sinker) {
              sinker.hidden = true;
              attachedChildren.push(sinker);
            }
          }
        }

        // F. 3 pontas de corda arrebentadas na cauda (ox = -34 até -54)
        for (const fray of [
          { dx: -10, dy: -4, len: 12 },
          { dx: -14, dy: 1, len: 14 },
          { dx: -12, dy: 6, len: 10 },
        ]) {
          if (typeof kObj.rect === "function") {
            const frayStrand = baleiaObj.add([
              kObj.rect(fray.len, 2),
              typeof kObj.pos === "function" ? kObj.pos(-34 - 20 + fray.dx / 2, fray.dy) : {},
              typeof kObj.anchor === "function" ? kObj.anchor("center") : {},
              typeof kObj.color === "function" ? kObj.color(245, 230, 200) : {},
              typeof kObj.z === "function" ? kObj.z(999) : {},
              "whale_net_fray",
            ]);
            if (frayStrand) {
              frayStrand.hidden = true;
              attachedChildren.push(frayStrand);
            }
          }
        }
      } catch {
        attachedChild = null;
      }
    }

    const fallbackSprite: NetOverlaySpriteNode = {
      visible: false,
      alpha: 1.0,
      opacity: 1.0,
      zIndex: 999,
      z: 999,
      scale: { x: 1, y: 1 },
      setVisible(isVisible: boolean) {
        this.visible = isVisible;
        if (attachedChild) {
          attachedChild.hidden = !isVisible;
          if (isVisible) attachedChild.opacity = 1.0;
        }
        for (const child of attachedChildren) {
          child.hidden = !isVisible;
          if (isVisible && typeof child.opacity === "number") {
            child.opacity = 1.0;
          }
        }
      },
      setPosition(x: number, y: number) {
        if (attachedChild && attachedChild.pos) {
          attachedChild.pos.x = x;
          attachedChild.pos.y = y;
        }
      },
      setRotation(angleInRadians: number) {
        if (attachedChild) {
          attachedChild.angle = (angleInRadians * 180) / Math.PI;
        }
      },
      setScale(sx: number, sy: number) {
        if (this.scale) {
          this.scale.x = sx;
          this.scale.y = sy;
        }
        if (attachedChild && attachedChild.scale) {
          attachedChild.scale.x = sx;
          attachedChild.scale.y = sy;
        }
      },
      setSize(_w: number, _h: number) {},
      setAnchor(_ax: number, _ay: number) {},
      setZIndex(z: number) {
        this.zIndex = z;
        this.z = z;
      },
      setOpacity(alpha: number) {
        this.alpha = alpha;
        this.opacity = alpha;
        if (attachedChild) attachedChild.opacity = alpha;
        for (const child of attachedChildren) {
          child.opacity = alpha;
        }
      },
      destroy() {
        this.visible = false;
        if (attachedChild && typeof attachedChild.destroy === "function") {
          attachedChild.destroy();
        }
        for (const child of attachedChildren) {
          if (typeof child.destroy === "function") {
            child.destroy();
          }
        }
      },
    };

    netOverlaySprite = fallbackSprite;
  }

  // Acopla referência pública na baleia
  (baleia as unknown as { netOverlaySprite?: NetOverlaySpriteNode | null }).netOverlaySprite =
    netOverlaySprite;

  /**
   * Atualização contínua com feedback físico de aprisionamento:
   * - Tensão da malha pulsando scale.x e scale.y com Math.sin(time * 16) * 0.06
   * - Âncora centrada sobre tronco e nadadeira caudal (offset local -20 * facingSign)
   * - Espelhamento horizontal acompanhando scale.x da baleia
   * - Sincronização de pos.x, pos.y, angle e hidden = !isTrapped a cada frame
   */
  function update(
    isTrapped: boolean,
    targetWhale: PlayerGameObject,
    isFacingRight: boolean,
    timeInSeconds?: number
  ): void {
    if (!netOverlaySprite) return;

    const currentlyVisible = netOverlaySprite.visible ?? false;
    if (currentlyVisible !== isTrapped) {
      netOverlaySprite.visible = isTrapped;
      if (typeof netOverlaySprite.setVisible === "function") {
        netOverlaySprite.setVisible(isTrapped);
      }
    }

    if (!isTrapped) return;

    // Tempo corrente para animação in-place zero-overhead
    const time =
      typeof timeInSeconds === "number"
        ? timeInSeconds
        : typeof performance !== "undefined"
          ? performance.now() / 1000
          : 0;

    const facingMultiplier = isFacingRight ? 1 : -1;

    // Âncora centralizada sobre o tronco e a nadadeira caudal da baleia (offset de -20px em relação ao centro)
    const trunkTailOffsetLocalX = -20 * facingMultiplier;

    // Tensão da Malha: pulsação de aperto simétrico Math.sin(time * 16) * 0.06
    const tensionPulse = 1.0 + Math.sin(time * 16) * 0.06;

    const baseScaleX = ((targetWhale.scale as { x?: number })?.x ?? 1) * facingMultiplier;
    const baseScaleY = (targetWhale.scale as { y?: number })?.y ?? 1;

    const finalScaleX = baseScaleX * tensionPulse;
    const finalScaleY = baseScaleY * tensionPulse;

    if (typeof netOverlaySprite.setScale === "function") {
      netOverlaySprite.setScale(finalScaleX, finalScaleY);
    }
    if (netOverlaySprite.scale) {
      netOverlaySprite.scale.x = finalScaleX;
      netOverlaySprite.scale.y = finalScaleY;
    }

    // Se for filho do container da baleia, alinha a âncora localmente sobre o tronco/cauda
    if (isChildAttachedToContainer) {
      if (typeof netOverlaySprite.setPosition === "function") {
        netOverlaySprite.setPosition(trunkTailOffsetLocalX, 0);
      }
      if (typeof netOverlaySprite.setRotation === "function") {
        netOverlaySprite.setRotation(0);
      }
    } else {
      // Se estiver no palco global ou camada de mundo, sincroniza com o centro de mundo da baleia
      if (typeof netOverlaySprite.setPosition === "function" && targetWhale.pos) {
        netOverlaySprite.setPosition(targetWhale.pos.x + trunkTailOffsetLocalX, targetWhale.pos.y);
      }

      if (
        typeof netOverlaySprite.setRotation === "function" &&
        typeof targetWhale.angle === "number"
      ) {
        netOverlaySprite.setRotation((targetWhale.angle * Math.PI) / 180);
      }
    }
  }

  function destroy(): void {
    if (netOverlaySprite && typeof netOverlaySprite.destroy === "function") {
      netOverlaySprite.destroy();
    }
    netOverlaySprite = null;
    (baleia as unknown as { netOverlaySprite?: NetOverlaySpriteNode | null }).netOverlaySprite =
      null;
  }

  return {
    get netOverlaySprite() {
      return netOverlaySprite;
    },
    update,
    destroy,
  };
}

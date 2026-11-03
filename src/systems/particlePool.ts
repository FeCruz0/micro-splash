/**
 * Gerenciador de Piscina de Partículas (Object Pooling) — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { getRandomFloat } from "../utils/random";
import type {
  IRenderEngine,
  IRenderNode,
  IGraphicsNode,
  ISpriteNode,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { isRenderEngine, type LegacyEngineBridge } from "../engine/adapters/LegacyBridge";

export interface ParticleVec2 {
  x: number;
  y: number;
}

export interface ParticleColor {
  r: number;
  g: number;
  b: number;
}

export interface ParticleRenderObject {
  pos: { x: number; y: number };
  radius?: number;
  width?: number;
  height?: number;
  color?: unknown;
  opacity: number;
  z?: number;
  hidden?: boolean;
}

/**
 * Parâmetros de configuração para emitir uma partícula circular a partir do pool.
 */
export interface SpawnCircleOptions {
  /** Posição inicial no mundo (x, y) */
  pos: ParticleVec2;
  /** Raio da partícula circular em pixels */
  radius: number;
  /** Cor RGB da partícula */
  color: ParticleColor | unknown;
  /** Opacidade inicial (0.0 a 1.0, padrão 1.0) */
  opacity?: number;
  /** Profundidade Z na camada de renderização (padrão 15) */
  z?: number;
  /** Vetor de velocidade inicial em px/s */
  vel?: ParticleVec2;
  /** Aceleração gravitacional vertical em px/s² */
  gravityY?: number;
  /** Taxa de crescimento ou encolhimento do raio em px/s */
  growthRate?: number;
  /** Frequência da oscilação senoidal lateral (balanço de bolhas) */
  swayFreq?: number;
  /** Amplitude do deslocamento senoidal lateral em pixels */
  swayAmp?: number;
  /** Taxa de esmaecimento (fade-out) de opacidade por segundo */
  fadeRate?: number;
  /** Tempo máximo de vida útil em segundos */
  maxLife?: number;
  /** Limite de coordenada Y no mundo para reciclagem antecipada */
  boundaryY?: number;
  /** Critério de validação do limite: reciclado se y for maior ou menor que boundaryY */
  boundaryYMode?: "greater" | "less";
  /** Posição alvo para atração magnética direcionada */
  targetPos?: ParticleVec2;
  /** Velocidade de deslocamento na direção do alvo */
  targetSpeed?: number;
}

/**
 * Parâmetros de configuração para emitir uma partícula retangular a partir do pool.
 */
export interface SpawnRectOptions {
  /** Posição inicial no mundo (x, y) */
  pos: ParticleVec2;
  /** Largura da partícula em pixels */
  width: number;
  /** Altura da partícula em pixels */
  height: number;
  /** Cor RGB da partícula */
  color: ParticleColor | unknown;
  /** Opacidade inicial (0.0 a 1.0) */
  opacity?: number;
  /** Camada Z de renderização */
  z?: number;
  /** Vetor de velocidade em px/s */
  vel?: ParticleVec2;
  /** Taxa de esmaecimento por segundo */
  fadeRate?: number;
  /** Tempo de vida máximo em segundos */
  maxLife?: number;
}

interface PooledCircle {
  obj: ParticleRenderObject;
  active: boolean;
  poolIndex: number;
  activeListIndex: number;
  life: number;
  maxLife: number;
  initialOpacity: number;
  vel: ParticleVec2;
  gravityY: number;
  growthRate: number;
  swayFreq: number;
  swayAmp: number;
  swayTimer: number;
  fadeRate: number;
  boundaryY: number | null;
  boundaryYMode: "greater" | "less" | null;
  targetPos: ParticleVec2 | null;
  targetSpeed: number;
}

interface PooledRect {
  obj: ParticleRenderObject;
  active: boolean;
  poolIndex: number;
  activeListIndex: number;
  life: number;
  maxLife: number;
  initialOpacity: number;
  vel: ParticleVec2;
  fadeRate: number;
}

class PixiPooledParticleProxy implements ParticleRenderObject {
  private readonly node: IRenderNode;
  private currentX: number = -9999;
  private currentY: number = -9999;
  private currentRadius: number = 2;
  private currentWidth: number = 10;
  private currentHeight: number = 2;
  private currentColor: [number, number, number] = [255, 255, 255];
  private isCircle: boolean;
  private readonly isSprite: boolean;

  constructor(node: IRenderNode, isCircle: boolean, isSprite = false) {
    this.node = node;
    this.isCircle = isCircle;
    this.isSprite = isSprite;
  }

  get pos(): { x: number; y: number } {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const nodeRef = this.node;
    return {
      get x() {
        return self.currentX;
      },
      set x(val: number) {
        if (Math.abs(self.currentX - val) > 0.01) {
          self.currentX = val;
          nodeRef.setPosition(val, self.currentY);
        }
      },
      get y() {
        return self.currentY;
      },
      set y(val: number) {
        if (Math.abs(self.currentY - val) > 0.01) {
          self.currentY = val;
          nodeRef.setPosition(self.currentX, val);
        }
      },
    };
  }
  set pos(val: { x: number; y: number }) {
    if (Math.abs(this.currentX - val.x) > 0.01 || Math.abs(this.currentY - val.y) > 0.01) {
      this.currentX = val.x;
      this.currentY = val.y;
      this.node.setPosition(val.x, val.y);
    }
  }

  get radius(): number {
    return this.currentRadius;
  }
  set radius(val: number) {
    if (Math.abs(this.currentRadius - val) < 0.01) return;
    this.currentRadius = val;
    if (this.isCircle) {
      this.node.setScale(val / 2, val / 2);
    } else {
      this.redraw();
    }
  }

  get width(): number {
    return this.currentWidth;
  }
  set width(val: number) {
    if (Math.abs(this.currentWidth - val) < 0.01) return;
    this.currentWidth = val;
    if (!this.isCircle) {
      this.node.setScale(val / 10, this.currentHeight / 2);
    } else {
      this.redraw();
    }
  }

  get height(): number {
    return this.currentHeight;
  }
  set height(val: number) {
    if (Math.abs(this.currentHeight - val) < 0.01) return;
    this.currentHeight = val;
    if (!this.isCircle) {
      this.node.setScale(this.currentWidth / 10, val / 2);
    } else {
      this.redraw();
    }
  }

  get color(): unknown {
    return { r: this.currentColor[0], g: this.currentColor[1], b: this.currentColor[2] };
  }
  set color(c: unknown) {
    let red = 255;
    let green = 255;
    let blue = 255;
    if (Array.isArray(c)) {
      red = c[0];
      green = c[1];
      blue = c[2];
    } else if (c && typeof c === "object" && "r" in c) {
      const rgb = c as { r: number; g: number; b: number };
      red = rgb.r;
      green = rgb.g;
      blue = rgb.b;
    }
    if (
      this.currentColor[0] === red &&
      this.currentColor[1] === green &&
      this.currentColor[2] === blue
    ) {
      return;
    }
    this.currentColor = [red, green, blue];

    const hexColor = ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
    if ("setTint" in this.node && typeof (this.node as ISpriteNode).setTint === "function") {
      (this.node as ISpriteNode).setTint(hexColor);
    } else {
      const native = this.node.getNativeNode<{ tint?: number }>();
      if (native && typeof native === "object" && "tint" in native) {
        native.tint = hexColor;
      } else {
        this.redraw();
      }
    }
  }

  get opacity(): number {
    return this.node.getOpacity();
  }
  set opacity(val: number) {
    this.node.setOpacity(val);
  }

  get z(): number {
    return this.node.getZIndex();
  }
  set z(val: number) {
    this.node.setZIndex(val);
  }

  get hidden(): boolean {
    return !this.node.isVisible();
  }
  set hidden(val: boolean) {
    this.node.setVisible(!val);
  }

  private redraw(): void {
    if (this.isSprite) return;
    if ("clear" in this.node && typeof (this.node as IGraphicsNode).clear === "function") {
      const gfx = this.node as IGraphicsNode;
      gfx.clear();
      if (this.isCircle) {
        gfx.drawCircle(0, 0, 2, {
          fill: { color: this.currentColor, alpha: 1 },
        });
        gfx.setScale(this.currentRadius / 2, this.currentRadius / 2);
      } else {
        gfx.drawRect(0, 0, 10, 2, {
          fill: { color: this.currentColor, alpha: 1 },
        });
        gfx.setScale(this.currentWidth / 10, this.currentHeight / 2);
      }
    }
  }
}

/**
 * Gerenciador de Piscina de Partículas (Object Pooling) de alta performance.
 */
export class ParticlePool {
  private engineOrContext: IRenderEngine | LegacyEngineBridge;
  private circlePool: PooledCircle[] = [];
  private rectPool: PooledRect[] = [];
  private activeCircleIndices: number[] = [];
  private activeRectIndices: number[] = [];
  private circleIndex = 0;
  private rectIndex = 0;

  private sharedCircleTexture: unknown = null;

  constructor(
    engineOrContext: IRenderEngine | LegacyEngineBridge,
    circleCount = 140,
    rectCount = 30
  ) {
    this.engineOrContext = engineOrContext;
    this.initPools(circleCount, rectCount);
  }

  private initPools(circleCount: number, rectCount: number): void {
    if (isRenderEngine(this.engineOrContext)) {
      const stageRoot = this.engineOrContext.getStageRoot();

      if (
        typeof this.engineOrContext.generateTexture === "function" &&
        typeof this.engineOrContext.createGraphics === "function"
      ) {
        try {
          const tempG = this.engineOrContext.createGraphics("pooled_circle_baker");
          tempG.drawCircle(0, 0, 2, { fill: { color: [255, 255, 255], alpha: 1 } });
          this.sharedCircleTexture = this.engineOrContext.generateTexture(tempG, {
            resolution: 0.5,
            scaleMode: "nearest",
          });
          tempG.destroy();
        } catch {
          this.sharedCircleTexture = null;
        }
      }

      for (let i = 0; i < circleCount; i++) {
        let node: IRenderNode;
        let isSprite = false;

        if (this.sharedCircleTexture && typeof this.engineOrContext.createSprite === "function") {
          try {
            const spr = this.engineOrContext.createSprite(
              this.sharedCircleTexture,
              "pooled_particle"
            );
            spr.setAnchor(0.5, 0.5);
            const nativeSpr = spr.getNativeNode<{
              roundPixels?: boolean;
              cullable?: boolean;
              eventMode?: string;
            }>();
            if (nativeSpr) {
              nativeSpr.roundPixels = true;
              nativeSpr.cullable = true;
              nativeSpr.eventMode = "none";
            }
            node = spr;
            isSprite = true;
          } catch {
            const g = this.engineOrContext.createGraphics("pooled_particle");
            g.drawCircle(0, 0, 2, { fill: { color: [255, 255, 255], alpha: 1 } });
            node = g;
          }
        } else {
          const g = this.engineOrContext.createGraphics("pooled_particle");
          g.drawCircle(0, 0, 2, { fill: { color: [255, 255, 255], alpha: 1 } });
          node = g;
        }

        node.setPosition(-9999, -9999);
        node.setOpacity(0);
        node.setZIndex(15);
        node.setVisible(false);
        stageRoot.addChild(node);

        const proxy = new PixiPooledParticleProxy(node, true, isSprite);
        this.circlePool.push({
          obj: proxy,
          active: false,
          poolIndex: i,
          activeListIndex: -1,
          life: 0,
          maxLife: 1,
          initialOpacity: 1,
          vel: { x: 0, y: 0 },
          gravityY: 0,
          growthRate: 0,
          swayFreq: 0,
          swayAmp: 0,
          swayTimer: 0,
          fadeRate: 0,
          boundaryY: null,
          boundaryYMode: null,
          targetPos: null,
          targetSpeed: 0,
        });
      }

      for (let i = 0; i < rectCount; i++) {
        let node: IRenderNode;
        let isSprite = false;

        if (typeof this.engineOrContext.createSprite === "function") {
          try {
            const spr = this.engineOrContext.createSprite("white", "pooled_rect_particle");
            spr.setSize(10, 2);
            const nativeSpr = spr.getNativeNode<{
              roundPixels?: boolean;
              cullable?: boolean;
              eventMode?: string;
            }>();
            if (nativeSpr) {
              nativeSpr.roundPixels = true;
              nativeSpr.cullable = true;
              nativeSpr.eventMode = "none";
            }
            node = spr;
            isSprite = true;
          } catch {
            const g = this.engineOrContext.createGraphics("pooled_rect_particle");
            g.drawRect(0, 0, 10, 2, { fill: { color: [255, 255, 255], alpha: 1 } });
            node = g;
          }
        } else {
          const g = this.engineOrContext.createGraphics("pooled_rect_particle");
          g.drawRect(0, 0, 10, 2, { fill: { color: [255, 255, 255], alpha: 1 } });
          node = g;
        }

        node.setPosition(-9999, -9999);
        node.setOpacity(0);
        node.setZIndex(12);
        node.setVisible(false);
        stageRoot.addChild(node);

        const proxy = new PixiPooledParticleProxy(node, false, isSprite);
        this.rectPool.push({
          obj: proxy,
          active: false,
          poolIndex: i,
          activeListIndex: -1,
          life: 0,
          maxLife: 1,
          initialOpacity: 1,
          vel: { x: 0, y: 0 },
          fadeRate: 0,
        });
      }
    } else {
      const legacyCtx = this.engineOrContext as LegacyEngineBridge & {
        circle(r: number): unknown;
        rect(w: number, h: number): unknown;
        pos(x: number, y: number): unknown;
        color(r: number, g: number, b: number): unknown;
        opacity(o: number): unknown;
        z(layer: number): unknown;
        vec2(x: number, y: number): ParticleVec2;
      };

      for (let i = 0; i < circleCount; i++) {
        const obj = legacyCtx.add([
          legacyCtx.circle(2),
          legacyCtx.pos(-9999, -9999),
          legacyCtx.color(255, 255, 255),
          legacyCtx.opacity(0),
          legacyCtx.z(15),
          "pooled_particle",
        ]) as ParticleRenderObject;
        obj.hidden = true;

        this.circlePool.push({
          obj,
          active: false,
          poolIndex: i,
          activeListIndex: -1,
          life: 0,
          maxLife: 1,
          initialOpacity: 1,
          vel: { x: 0, y: 0 },
          gravityY: 0,
          growthRate: 0,
          swayFreq: 0,
          swayAmp: 0,
          swayTimer: 0,
          fadeRate: 0,
          boundaryY: null,
          boundaryYMode: null,
          targetPos: null,
          targetSpeed: 0,
        });
      }

      for (let i = 0; i < rectCount; i++) {
        const obj = legacyCtx.add([
          legacyCtx.rect(10, 2),
          legacyCtx.pos(-9999, -9999),
          legacyCtx.color(255, 255, 255),
          legacyCtx.opacity(0),
          legacyCtx.z(12),
          "pooled_rect_particle",
        ]) as ParticleRenderObject;
        obj.hidden = true;

        this.rectPool.push({
          obj,
          active: false,
          poolIndex: i,
          activeListIndex: -1,
          life: 0,
          maxLife: 1,
          initialOpacity: 1,
          vel: { x: 0, y: 0 },
          fadeRate: 0,
        });
      }
    }
  }

  public spawnCircle(opts: SpawnCircleOptions): ParticleRenderObject | null {
    if (this.circlePool.length === 0) return null;

    let candidate: PooledCircle | null = null;
    const total = this.circlePool.length;

    for (let i = 0; i < total; i++) {
      const idx = (this.circleIndex + i) % total;
      if (!this.circlePool[idx].active) {
        candidate = this.circlePool[idx];
        this.circleIndex = (idx + 1) % total;
        break;
      }
    }

    if (!candidate) {
      candidate = this.circlePool[this.circleIndex];
      this.circleIndex = (this.circleIndex + 1) % total;
    }

    const maxLife = opts.maxLife ?? 1.0;
    const initialOpacity = opts.opacity ?? 0.85;

    if (!candidate.active) {
      candidate.active = true;
      candidate.activeListIndex = this.activeCircleIndices.length;
      this.activeCircleIndices.push(candidate.poolIndex);
    }

    candidate.life = maxLife;
    candidate.maxLife = maxLife;
    candidate.initialOpacity = initialOpacity;
    candidate.vel = opts.vel ? { x: opts.vel.x, y: opts.vel.y } : { x: 0, y: 0 };
    candidate.gravityY = opts.gravityY ?? 0;
    candidate.growthRate = opts.growthRate ?? 0;
    candidate.swayFreq = opts.swayFreq ?? 0;
    candidate.swayAmp = opts.swayAmp ?? 0;
    candidate.swayTimer = getRandomFloat(0, Math.PI * 2);
    candidate.fadeRate = opts.fadeRate ?? 0;
    candidate.boundaryY = opts.boundaryY ?? null;
    candidate.boundaryYMode = opts.boundaryYMode ?? null;
    candidate.targetPos = opts.targetPos ? { x: opts.targetPos.x, y: opts.targetPos.y } : null;
    candidate.targetSpeed = opts.targetSpeed ?? 0;

    const p = candidate.obj;
    p.hidden = false;
    p.pos.x = opts.pos.x;
    p.pos.y = opts.pos.y;
    p.radius = opts.radius;
    p.color = opts.color;
    p.opacity = initialOpacity;
    if (opts.z !== undefined) p.z = opts.z;

    return p;
  }

  public spawnRect(opts: SpawnRectOptions): ParticleRenderObject | null {
    if (this.rectPool.length === 0) return null;

    let candidate: PooledRect | null = null;
    const total = this.rectPool.length;

    for (let i = 0; i < total; i++) {
      const idx = (this.rectIndex + i) % total;
      if (!this.rectPool[idx].active) {
        candidate = this.rectPool[idx];
        this.rectIndex = (idx + 1) % total;
        break;
      }
    }

    if (!candidate) {
      candidate = this.rectPool[this.rectIndex];
      this.rectIndex = (this.rectIndex + 1) % total;
    }

    const maxLife = opts.maxLife ?? 1.0;
    const initialOpacity = opts.opacity ?? 0.75;

    if (!candidate.active) {
      candidate.active = true;
      candidate.activeListIndex = this.activeRectIndices.length;
      this.activeRectIndices.push(candidate.poolIndex);
    }

    candidate.life = maxLife;
    candidate.maxLife = maxLife;
    candidate.initialOpacity = initialOpacity;
    candidate.vel = opts.vel ? { x: opts.vel.x, y: opts.vel.y } : { x: 0, y: 0 };
    candidate.fadeRate = opts.fadeRate ?? 0;

    const p = candidate.obj;
    p.hidden = false;
    p.pos.x = opts.pos.x;
    p.pos.y = opts.pos.y;
    p.width = opts.width;
    p.height = opts.height;
    p.color = opts.color;
    p.opacity = initialOpacity;
    if (opts.z !== undefined) p.z = opts.z;

    return p;
  }

  public update(dt: number): void {
    // 1. Atualização com lista ativa densa de círculos
    for (let i = this.activeCircleIndices.length - 1; i >= 0; i--) {
      const poolIdx = this.activeCircleIndices[i];
      const p = this.circlePool[poolIdx];
      if (!p || !p.active) continue;

      p.life -= dt;

      if (p.gravityY !== 0) {
        p.vel.y += p.gravityY * dt;
      }

      if (p.targetPos) {
        const dx = p.targetPos.x - p.obj.pos.x;
        const dy = p.targetPos.y - p.obj.pos.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 36) {
          this.deactivateCircle(p, i);
          continue;
        }
        const dist = Math.sqrt(distSq);
        p.obj.pos.x += (dx / dist) * (p.targetSpeed * dt);
        p.obj.pos.y += (dy / dist) * (p.targetSpeed * dt);
      } else {
        p.obj.pos.x += p.vel.x * dt;
        p.obj.pos.y += p.vel.y * dt;
      }

      if (p.swayAmp > 0 && p.swayFreq > 0) {
        p.swayTimer += dt * p.swayFreq;
        p.obj.pos.x += Math.sin(p.swayTimer) * p.swayAmp * dt;
      }

      if (p.growthRate !== 0 && typeof p.obj.radius === "number") {
        p.obj.radius += p.growthRate * dt;
      }

      if (p.fadeRate > 0) {
        p.obj.opacity -= p.fadeRate * dt;
      } else if (p.maxLife > 0) {
        p.obj.opacity = Math.max(0, (p.life / p.maxLife) * p.initialOpacity);
      }

      const isDead = p.life <= 0 || p.obj.opacity <= 0;
      let hitBoundary = false;
      if (p.boundaryY !== null && p.boundaryYMode !== null) {
        if (p.boundaryYMode === "greater" && p.obj.pos.y > p.boundaryY) hitBoundary = true;
        if (p.boundaryYMode === "less" && p.obj.pos.y < p.boundaryY) hitBoundary = true;
      }

      if (isDead || hitBoundary) {
        this.deactivateCircle(p, i);
      }
    }

    // 2. Atualização com lista ativa densa de retângulos
    for (let i = this.activeRectIndices.length - 1; i >= 0; i--) {
      const poolIdx = this.activeRectIndices[i];
      const r = this.rectPool[poolIdx];
      if (!r || !r.active) continue;

      r.life -= dt;
      r.obj.pos.x += r.vel.x * dt;
      r.obj.pos.y += r.vel.y * dt;

      if (r.fadeRate > 0) {
        r.obj.opacity -= r.fadeRate * dt;
      } else if (r.maxLife > 0) {
        r.obj.opacity = Math.max(0, (r.life / r.maxLife) * r.initialOpacity);
      }

      if (r.life <= 0 || r.obj.opacity <= 0) {
        this.deactivateRect(r, i);
      }
    }
  }

  private deactivateCircle(p: PooledCircle, activeIdx?: number): void {
    if (!p.active) return;
    p.active = false;
    p.obj.hidden = true;
    p.obj.pos.x = -9999;
    p.obj.pos.y = -9999;
    p.obj.opacity = 0;

    const listIdx = activeIdx !== undefined ? activeIdx : p.activeListIndex;
    const lastListIdx = this.activeCircleIndices.length - 1;
    if (listIdx >= 0 && listIdx <= lastListIdx) {
      const lastPoolIdx = this.activeCircleIndices[lastListIdx];
      this.circlePool[lastPoolIdx].activeListIndex = listIdx;
      this.activeCircleIndices[listIdx] = lastPoolIdx;
      this.activeCircleIndices.pop();
    }
    p.activeListIndex = -1;
  }

  private deactivateRect(r: PooledRect, activeIdx?: number): void {
    if (!r.active) return;
    r.active = false;
    r.obj.hidden = true;
    r.obj.pos.x = -9999;
    r.obj.pos.y = -9999;
    r.obj.opacity = 0;

    const listIdx = activeIdx !== undefined ? activeIdx : r.activeListIndex;
    const lastListIdx = this.activeRectIndices.length - 1;
    if (listIdx >= 0 && listIdx <= lastListIdx) {
      const lastPoolIdx = this.activeRectIndices[lastListIdx];
      this.rectPool[lastPoolIdx].activeListIndex = listIdx;
      this.activeRectIndices[listIdx] = lastPoolIdx;
      this.activeRectIndices.pop();
    }
    r.activeListIndex = -1;
  }

  public getActiveIndices(): {
    circleIndices: readonly number[];
    rectIndices: readonly number[];
  } {
    return {
      circleIndices: this.activeCircleIndices,
      rectIndices: this.activeRectIndices,
    };
  }

  public getStats(): {
    activeCircles: number;
    totalCircles: number;
    activeRects: number;
    totalRects: number;
  } {
    return {
      activeCircles: this.activeCircleIndices.length,
      totalCircles: this.circlePool.length,
      activeRects: this.activeRectIndices.length,
      totalRects: this.rectPool.length,
    };
  }

  public reset(): void {
    for (let i = 0; i < this.circlePool.length; i++) {
      this.deactivateCircle(this.circlePool[i]);
    }
    for (let i = 0; i < this.rectPool.length; i++) {
      this.deactivateRect(this.rectPool[i]);
    }
  }

  public destroy(): void {
    this.reset();
    if (
      this.sharedCircleTexture &&
      typeof (this.sharedCircleTexture as { destroy?: (destroyBase?: boolean) => void }).destroy ===
        "function"
    ) {
      (this.sharedCircleTexture as { destroy: (destroyBase?: boolean) => void }).destroy(true);
      this.sharedCircleTexture = null;
    }
  }
}

let activeParticlePool: ParticlePool | null = null;

export function initParticlePool(
  engineOrContext: IRenderEngine | LegacyEngineBridge,
  circleCount = 140,
  rectCount = 30
): ParticlePool {
  activeParticlePool = new ParticlePool(engineOrContext, circleCount, rectCount);
  return activeParticlePool;
}

export function getParticlePool(): ParticlePool | null {
  return activeParticlePool;
}

export function setParticlePool(pool: ParticlePool | null): void {
  activeParticlePool = pool;
}

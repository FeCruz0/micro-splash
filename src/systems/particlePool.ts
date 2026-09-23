import type { KaboomCtx, Vec2, Color, GameObj } from "kaboom";

export interface SpawnCircleOptions {
  pos: Vec2;
  radius: number;
  color: Color;
  opacity?: number;
  z?: number;
  vel?: Vec2;
  gravityY?: number;
  growthRate?: number;
  swayFreq?: number;
  swayAmp?: number;
  fadeRate?: number;
  maxLife?: number;
  boundaryY?: number;
  boundaryYMode?: "greater" | "less";
  targetPos?: Vec2;
  targetSpeed?: number;
}

export interface SpawnRectOptions {
  pos: Vec2;
  width: number;
  height: number;
  color: Color;
  opacity?: number;
  z?: number;
  vel?: Vec2;
  fadeRate?: number;
  maxLife?: number;
}

interface PooledCircle {
  obj: GameObj;
  active: boolean;
  life: number;
  maxLife: number;
  initialOpacity: number;
  vel: Vec2;
  gravityY: number;
  growthRate: number;
  swayFreq: number;
  swayAmp: number;
  swayTimer: number;
  fadeRate: number;
  boundaryY: number | null;
  boundaryYMode: "greater" | "less" | null;
  targetPos: Vec2 | null;
  targetSpeed: number;
}

interface PooledRect {
  obj: GameObj;
  active: boolean;
  life: number;
  maxLife: number;
  initialOpacity: number;
  vel: Vec2;
  fadeRate: number;
}

export class ParticlePool {
  private k: KaboomCtx;
  private circlePool: PooledCircle[] = [];
  private rectPool: PooledRect[] = [];
  private circleIndex = 0;
  private rectIndex = 0;

  constructor(k: KaboomCtx, circleCount = 140, rectCount = 30) {
    this.k = k;
    this.initPools(circleCount, rectCount);
  }

  private initPools(circleCount: number, rectCount: number): void {
    // 1. Pre-aloca partículas circulares
    for (let i = 0; i < circleCount; i++) {
      const obj = this.k.add([
        this.k.circle(2),
        this.k.pos(-9999, -9999),
        this.k.color(255, 255, 255),
        this.k.opacity(0),
        this.k.z(15),
        "pooled_particle",
      ]);
      obj.hidden = true;

      this.circlePool.push({
        obj,
        active: false,
        life: 0,
        maxLife: 1,
        initialOpacity: 1,
        vel: this.k.vec2(0, 0),
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

    // 2. Pre-aloca partículas retangulares (rastros, fitas de esteira)
    for (let i = 0; i < rectCount; i++) {
      const obj = this.k.add([
        this.k.rect(10, 2),
        this.k.pos(-9999, -9999),
        this.k.color(255, 255, 255),
        this.k.opacity(0),
        this.k.z(12),
        "pooled_rect_particle",
      ]);
      obj.hidden = true;

      this.rectPool.push({
        obj,
        active: false,
        life: 0,
        maxLife: 1,
        initialOpacity: 1,
        vel: this.k.vec2(0, 0),
        fadeRate: 0,
      });
    }
  }

  public spawnCircle(opts: SpawnCircleOptions): GameObj | null {
    if (this.circlePool.length === 0) return null;

    // Busca próxima partícula inativa ou reutiliza a mais antiga (Ring Buffer / LRU)
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

    // Se todas estiverem ativas, substitui a atual da fila circular
    if (!candidate) {
      candidate = this.circlePool[this.circleIndex];
      this.circleIndex = (this.circleIndex + 1) % total;
    }

    const maxLife = opts.maxLife ?? 1.0;
    const initialOpacity = opts.opacity ?? 0.85;

    candidate.active = true;
    candidate.life = maxLife;
    candidate.maxLife = maxLife;
    candidate.initialOpacity = initialOpacity;
    candidate.vel = opts.vel ? this.k.vec2(opts.vel.x, opts.vel.y) : this.k.vec2(0, 0);
    candidate.gravityY = opts.gravityY ?? 0;
    candidate.growthRate = opts.growthRate ?? 0;
    candidate.swayFreq = opts.swayFreq ?? 0;
    candidate.swayAmp = opts.swayAmp ?? 0;
    candidate.swayTimer = Math.random() * Math.PI * 2;
    candidate.fadeRate = opts.fadeRate ?? 0;
    candidate.boundaryY = opts.boundaryY ?? null;
    candidate.boundaryYMode = opts.boundaryYMode ?? null;
    candidate.targetPos = opts.targetPos ? this.k.vec2(opts.targetPos.x, opts.targetPos.y) : null;
    candidate.targetSpeed = opts.targetSpeed ?? 0;

    // Atualiza propriedades do GameObj
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

  public spawnRect(opts: SpawnRectOptions): GameObj | null {
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

    candidate.active = true;
    candidate.life = maxLife;
    candidate.maxLife = maxLife;
    candidate.initialOpacity = initialOpacity;
    candidate.vel = opts.vel ? this.k.vec2(opts.vel.x, opts.vel.y) : this.k.vec2(0, 0);
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
    // 1. Atualização do pool de círculos
    for (let i = 0; i < this.circlePool.length; i++) {
      const p = this.circlePool[i];
      if (!p.active) continue;

      p.life -= dt;

      // Movimento balístico / gravidade
      if (p.gravityY !== 0) {
        p.vel.y += p.gravityY * dt;
      }

      // Atração em direção a um alvo (ex: boca da baleia na sucção de krill)
      if (p.targetPos) {
        const toTarget = p.targetPos.sub(p.obj.pos);
        if (toTarget.len() < 6) {
          this.deactivateCircle(p);
          continue;
        }
        const dir = toTarget.unit();
        p.obj.pos = p.obj.pos.add(dir.scale(p.targetSpeed * dt));
      } else {
        p.obj.pos.x += p.vel.x * dt;
        p.obj.pos.y += p.vel.y * dt;
      }

      // Ondulação senoidal (sway)
      if (p.swayAmp > 0 && p.swayFreq > 0) {
        p.swayTimer += dt * p.swayFreq;
        p.obj.pos.x += Math.sin(p.swayTimer) * p.swayAmp * dt;
      }

      // Expansão do raio (ex: gotículas de vapor se dispersando)
      if (p.growthRate !== 0) {
        p.obj.radius += p.growthRate * dt;
      }

      // Opacidade
      if (p.fadeRate > 0) {
        p.obj.opacity -= p.fadeRate * dt;
      } else if (p.maxLife > 0) {
        p.obj.opacity = Math.max(0, (p.life / p.maxLife) * p.initialOpacity);
      }

      // Condições de término
      const isDead = p.life <= 0 || p.obj.opacity <= 0;
      let hitBoundary = false;
      if (p.boundaryY !== null && p.boundaryYMode !== null) {
        if (p.boundaryYMode === "greater" && p.obj.pos.y > p.boundaryY) hitBoundary = true;
        if (p.boundaryYMode === "less" && p.obj.pos.y < p.boundaryY) hitBoundary = true;
      }

      if (isDead || hitBoundary) {
        this.deactivateCircle(p);
      }
    }

    // 2. Atualização do pool de retângulos
    for (let i = 0; i < this.rectPool.length; i++) {
      const r = this.rectPool[i];
      if (!r.active) continue;

      r.life -= dt;
      r.obj.pos.x += r.vel.x * dt;
      r.obj.pos.y += r.vel.y * dt;

      if (r.fadeRate > 0) {
        r.obj.opacity -= r.fadeRate * dt;
      } else if (r.maxLife > 0) {
        r.obj.opacity = Math.max(0, (r.life / r.maxLife) * r.initialOpacity);
      }

      if (r.life <= 0 || r.obj.opacity <= 0) {
        this.deactivateRect(r);
      }
    }
  }

  private deactivateCircle(p: PooledCircle): void {
    p.active = false;
    p.obj.hidden = true;
    p.obj.pos.x = -9999;
    p.obj.pos.y = -9999;
    p.obj.opacity = 0;
  }

  private deactivateRect(r: PooledRect): void {
    r.active = false;
    r.obj.hidden = true;
    r.obj.pos.x = -9999;
    r.obj.pos.y = -9999;
    r.obj.opacity = 0;
  }

  public getStats(): { activeCircles: number; totalCircles: number; activeRects: number; totalRects: number } {
    let activeCircles = 0;
    for (let i = 0; i < this.circlePool.length; i++) {
      if (this.circlePool[i].active) activeCircles++;
    }

    let activeRects = 0;
    for (let i = 0; i < this.rectPool.length; i++) {
      if (this.rectPool[i].active) activeRects++;
    }

    return {
      activeCircles,
      totalCircles: this.circlePool.length,
      activeRects,
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
}

let activeParticlePool: ParticlePool | null = null;

export function initParticlePool(k: KaboomCtx, circleCount = 140, rectCount = 30): ParticlePool {
  activeParticlePool = new ParticlePool(k, circleCount, rectCount);
  return activeParticlePool;
}

export function getParticlePool(): ParticlePool | null {
  return activeParticlePool;
}

export function setParticlePool(pool: ParticlePool | null): void {
  activeParticlePool = pool;
}

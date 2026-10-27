/**
 * Particionamento Espacial em Grade (Spatial Hash Grid 2D) — Fase 59.
 * Estrutura de dados espacial determinística para aceleração de consultas
 * de vizinhança (radar, biosonar, cardumes) reduzindo de O(N) para O(1) médio.
 */

export interface SpatialAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SpatialEntry<T> {
  id: string;
  item: T;
  bounds: SpatialAABB;
  cellKeys: Set<string>;
}

export interface SpatialHashGridOptions {
  cellSize?: number;
}

export interface SpatialGridStats {
  cellCount: number;
  entityCount: number;
  cellSize: number;
}

export class SpatialHashGrid<T> {
  private readonly cellSize: number;
  private readonly cells: Map<string, Map<string, SpatialEntry<T>>> = new Map();
  private readonly entries: Map<string, SpatialEntry<T>> = new Map();

  constructor(options: SpatialHashGridOptions = {}) {
    this.cellSize = options.cellSize && options.cellSize > 0 ? options.cellSize : 200;
  }

  private cellCoord(val: number): number {
    return Math.floor(val / this.cellSize);
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  private getCellsForAABB(bounds: SpatialAABB): string[] {
    const minCx = this.cellCoord(bounds.minX);
    const maxCx = this.cellCoord(bounds.maxX);
    const minCy = this.cellCoord(bounds.minY);
    const maxCy = this.cellCoord(bounds.maxY);

    const keys: string[] = [];
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        keys.push(this.cellKey(cx, cy));
      }
    }
    return keys;
  }

  /**
   * Insere um item na grade espacial delimitado por sua AABB.
   */
  public insert(id: string, item: T, bounds: SpatialAABB): void {
    if (this.entries.has(id)) {
      this.remove(id);
    }

    const cellKeys = new Set(this.getCellsForAABB(bounds));
    const entry: SpatialEntry<T> = {
      id,
      item,
      bounds: { ...bounds },
      cellKeys,
    };

    for (const key of cellKeys) {
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = new Map();
        this.cells.set(key, bucket);
      }
      bucket.set(id, entry);
    }

    this.entries.set(id, entry);
  }

  /**
   * Atualiza a posição e dimensões de um item existente.
   */
  public update(id: string, bounds: SpatialAABB): boolean {
    const existing = this.entries.get(id);
    if (!existing) {
      return false;
    }

    const newKeys = this.getCellsForAABB(bounds);
    const newKeysSet = new Set(newKeys);

    // Verifica se as células ocupadas mudaram
    let keysChanged = existing.cellKeys.size !== newKeysSet.size;
    if (!keysChanged) {
      for (const k of newKeysSet) {
        if (!existing.cellKeys.has(k)) {
          keysChanged = true;
          break;
        }
      }
    }

    existing.bounds = { ...bounds };

    if (keysChanged) {
      // Remove das células que não ocupa mais
      for (const oldKey of existing.cellKeys) {
        if (!newKeysSet.has(oldKey)) {
          const bucket = this.cells.get(oldKey);
          if (bucket) {
            bucket.delete(id);
            if (bucket.size === 0) {
              this.cells.delete(oldKey);
            }
          }
        }
      }

      // Adiciona às novas células
      for (const newKey of newKeysSet) {
        if (!existing.cellKeys.has(newKey)) {
          let bucket = this.cells.get(newKey);
          if (!bucket) {
            bucket = new Map();
            this.cells.set(newKey, bucket);
          }
          bucket.set(id, existing);
        }
      }

      existing.cellKeys = newKeysSet;
    }

    return true;
  }

  /**
   * Remove um item da grade pelo seu identificador.
   */
  public remove(id: string): boolean {
    const existing = this.entries.get(id);
    if (!existing) {
      return false;
    }

    for (const key of existing.cellKeys) {
      const bucket = this.cells.get(key);
      if (bucket) {
        bucket.delete(id);
        if (bucket.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.entries.delete(id);
    return true;
  }

  /**
   * Obtém um item pelo identificador.
   */
  public get(id: string): T | undefined {
    return this.entries.get(id)?.item;
  }

  /**
   * Verifica se um item existe na grade.
   */
  public has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * Consulta itens contidos ou interceptados por uma AABB.
   */
  public queryAABB(queryBounds: SpatialAABB): T[] {
    const keys = this.getCellsForAABB(queryBounds);
    const visited = new Set<string>();
    const results: T[] = [];

    for (let i = 0; i < keys.length; i++) {
      const bucket = this.cells.get(keys[i]);
      if (!bucket) continue;

      for (const [id, entry] of bucket) {
        if (visited.has(id)) continue;
        visited.add(id);

        // Teste de intersecção estrita de AABB
        if (
          entry.bounds.maxX >= queryBounds.minX &&
          entry.bounds.minX <= queryBounds.maxX &&
          entry.bounds.maxY >= queryBounds.minY &&
          entry.bounds.minY <= queryBounds.maxY
        ) {
          results.push(entry.item);
        }
      }
    }

    return results;
  }

  /**
   * Consulta itens dentro de um raio euclidiano a partir de um ponto central.
   */
  public queryRadius(
    centerX: number,
    centerY: number,
    radius: number,
    getPoint?: (item: T) => { x: number; y: number }
  ): T[] {
    const queryBounds: SpatialAABB = {
      minX: centerX - radius,
      minY: centerY - radius,
      maxX: centerX + radius,
      maxY: centerY + radius,
    };

    const keys = this.getCellsForAABB(queryBounds);
    const visited = new Set<string>();
    const results: T[] = [];
    const radiusSq = radius * radius;

    for (let i = 0; i < keys.length; i++) {
      const bucket = this.cells.get(keys[i]);
      if (!bucket) continue;

      for (const [id, entry] of bucket) {
        if (visited.has(id)) continue;
        visited.add(id);

        // Se uma função de ponto for fornecida, calcula distância radial exata
        if (getPoint) {
          const pt = getPoint(entry.item);
          const dx = pt.x - centerX;
          const dy = pt.y - centerY;
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(entry.item);
          }
        } else {
          // Aproximação pelo centro da AABB da entidade
          const entCx = (entry.bounds.minX + entry.bounds.maxX) / 2;
          const entCy = (entry.bounds.minY + entry.bounds.maxY) / 2;
          const dx = entCx - centerX;
          const dy = entCy - centerY;
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(entry.item);
          }
        }
      }
    }

    return results;
  }

  /**
   * Limpa todas as células e registros da grade.
   */
  public clear(): void {
    this.cells.clear();
    this.entries.clear();
  }

  /**
   * Retorna estatísticas de ocupação da grade.
   */
  public getStats(): SpatialGridStats {
    return {
      cellCount: this.cells.size,
      entityCount: this.entries.size,
      cellSize: this.cellSize,
    };
  }
}

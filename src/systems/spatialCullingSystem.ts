import type { KaboomCtx, GameObj } from "kaboom";

export interface CullableEntity {
  targetObject: GameObj;
  getXPosition: () => number;
  width?: number;
}

/**
 * Pure function to check whether an entity is inside the horizontal camera view frustum.
 *
 * @param entityXPosition - Horizontal coordinate of the entity in the world
 * @param cameraXPosition - Center horizontal coordinate of the camera
 * @param viewportWidth - Width of the visible screen in pixels
 * @param safetyMarginInPixels - Extra margin around the view to avoid pop-in effects
 * @returns boolean indicating if the entity is visible
 */
export function isEntityInFrustum(
  entityXPosition: number,
  cameraXPosition: number,
  viewportWidth: number,
  safetyMarginInPixels: number = 320
): boolean {
  const halfViewport = viewportWidth / 2;
  const minimumVisibleX = cameraXPosition - halfViewport - safetyMarginInPixels;
  const maximumVisibleX = cameraXPosition + halfViewport + safetyMarginInPixels;

  return entityXPosition >= minimumVisibleX && entityXPosition <= maximumVisibleX;
}

export class SpatialCullingManager {
  private cullableEntities: CullableEntity[] = [];
  private kaboomContext: KaboomCtx;
  private safetyMargin: number;
  private lastVisibleCount: number = 0;
  private lastHiddenCount: number = 0;

  constructor(kaboomContext: KaboomCtx, safetyMargin: number = 320) {
    this.kaboomContext = kaboomContext;
    this.safetyMargin = safetyMargin;
  }

  public registerEntity(targetObject: GameObj, getCustomXPosition?: number | (() => number)): void {
    const resolveXPosition: () => number =
      typeof getCustomXPosition === "function"
        ? getCustomXPosition
        : typeof getCustomXPosition === "number"
          ? () => getCustomXPosition
          : () => (targetObject.pos ? targetObject.pos.x : 0);

    this.cullableEntities.push({
      targetObject,
      getXPosition: resolveXPosition,
    });
  }

  public registerEntities(targetObjects: GameObj[]): void {
    for (let index = 0; index < targetObjects.length; index++) {
      this.registerEntity(targetObjects[index]);
    }
  }

  public update(cameraXPosition: number): { visibleCount: number; hiddenCount: number } {
    const viewportWidth =
      typeof this.kaboomContext.width === "function" ? this.kaboomContext.width() : 1280;

    let visibleCount = 0;
    let hiddenCount = 0;

    for (let index = 0; index < this.cullableEntities.length; index++) {
      const entity = this.cullableEntities[index];
      const targetObject = entity.targetObject;

      if (targetObject.exists && !targetObject.exists()) {
        this.cullableEntities.splice(index, 1);
        index--;
        continue;
      }

      const entityX = entity.getXPosition();
      const isVisible = isEntityInFrustum(
        entityX,
        cameraXPosition,
        viewportWidth,
        this.safetyMargin
      );

      targetObject.hidden = !isVisible;

      if (isVisible) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    }

    this.lastVisibleCount = visibleCount;
    this.lastHiddenCount = hiddenCount;

    return { visibleCount, hiddenCount };
  }

  public getRegisteredCount(): number {
    return this.cullableEntities.length;
  }

  public getStats(): {
    totalEntities: number;
    visibleEntities: number;
    culledEntities: number;
  } {
    return {
      totalEntities: this.cullableEntities.length,
      visibleEntities: this.lastVisibleCount,
      culledEntities: this.lastHiddenCount,
    };
  }

  public reset(): void {
    this.cullableEntities = [];
    this.lastVisibleCount = 0;
    this.lastHiddenCount = 0;
  }

  public clear(): void {
    this.reset();
  }
}

let activeSpatialCullingManager: SpatialCullingManager | null = null;

export function initSpatialCullingManager(
  kaboomContext: KaboomCtx,
  safetyMargin: number = 320
): SpatialCullingManager {
  activeSpatialCullingManager = new SpatialCullingManager(kaboomContext, safetyMargin);
  return activeSpatialCullingManager;
}

export function getSpatialCullingManager(): SpatialCullingManager | null {
  return activeSpatialCullingManager;
}

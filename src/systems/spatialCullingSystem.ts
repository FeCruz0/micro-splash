export interface SpatialCullingEngineContext {
  width: () => number;
}

export interface CullableTargetObject {
  pos?: { x: number; y: number };
  hidden?: boolean;
  paused?: boolean;
  exists?: () => boolean;
}

export interface CullableEntity {
  targetObject: CullableTargetObject;
  getXPosition: () => number;
  width?: number;
}

export interface CullableSubsystem {
  id: string;
  setVisible: (visible: boolean) => void;
  getBounds: () => { minX: number; maxX: number };
  update?: (cameraXPosition: number, isVisible: boolean) => void;
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
  private cullableSubsystems: CullableSubsystem[] = [];
  private engineContext: SpatialCullingEngineContext;
  private safetyMargin: number;
  private lastVisibleCount: number = 0;
  private lastHiddenCount: number = 0;

  constructor(engineContext: SpatialCullingEngineContext, safetyMargin: number = 320) {
    this.engineContext = engineContext;
    this.safetyMargin = safetyMargin;
  }

  public registerSubsystem(subsystem: CullableSubsystem): void {
    this.cullableSubsystems.push(subsystem);
  }

  public getSubsystems(): readonly CullableSubsystem[] {
    return this.cullableSubsystems;
  }

  public registerEntity(
    targetObject: CullableTargetObject,
    getCustomXPosition?: number | (() => number)
  ): void {
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

  public registerEntities(targetObjects: CullableTargetObject[]): void {
    for (let index = 0; index < targetObjects.length; index++) {
      this.registerEntity(targetObjects[index]);
    }
  }

  public update(cameraXPosition: number): { visibleCount: number; hiddenCount: number } {
    const viewportWidth =
      typeof this.engineContext.width === "function" ? this.engineContext.width() : 1280;

    let visibleCount = 0;
    let hiddenCount = 0;

    for (let index = 0; index < this.cullableEntities.length; index++) {
      const entity = this.cullableEntities[index];
      const targetObject = entity.targetObject;

      if (targetObject.exists && !targetObject.exists()) {
        const lastIndex = this.cullableEntities.length - 1;
        if (index < lastIndex) {
          this.cullableEntities[index] = this.cullableEntities[lastIndex];
        }
        this.cullableEntities.pop();
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
      if ("paused" in targetObject) {
        (targetObject as unknown as { paused?: boolean }).paused = !isVisible;
      }

      if (isVisible) {
        visibleCount++;
      } else {
        hiddenCount++;
      }
    }

    for (let index = 0; index < this.cullableSubsystems.length; index++) {
      const subsystem = this.cullableSubsystems[index];
      const bounds = subsystem.getBounds();
      const halfViewport = viewportWidth / 2;
      const minVisible = cameraXPosition - halfViewport - this.safetyMargin;
      const maxVisible = cameraXPosition + halfViewport + this.safetyMargin;
      const isVisible = bounds.maxX >= minVisible && bounds.minX <= maxVisible;

      subsystem.setVisible(isVisible);
      if (typeof subsystem.update === "function") {
        subsystem.update(cameraXPosition, isVisible);
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
    this.cullableSubsystems = [];
    this.lastVisibleCount = 0;
    this.lastHiddenCount = 0;
  }

  public clear(): void {
    this.reset();
  }
}

let activeSpatialCullingManager: SpatialCullingManager | null = null;

export function initSpatialCullingManager(
  engineContext: SpatialCullingEngineContext,
  safetyMargin: number = 320
): SpatialCullingManager {
  activeSpatialCullingManager = new SpatialCullingManager(engineContext, safetyMargin);
  return activeSpatialCullingManager;
}

export function getSpatialCullingManager(): SpatialCullingManager | null {
  return activeSpatialCullingManager;
}

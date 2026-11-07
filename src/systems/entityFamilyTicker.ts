/**
 * Ticker Centralizado por Família de Entidades (EntityFamilyTicker) — Micro Splash
 *
 * Consolida a lógica de atualização de fauna, obstáculos e partículas em um único despachante
 * indexado por família (krill, net, trash, boat, ship, penguin, dolphin, current).
 *
 * Elimina dezenas de ouvintes onUpdate autônomos por entidade e implementa otimização de
 * culling para pausar integralmente o processamento de elementos fora do frustum da câmera.
 */

import { isEntityInFrustum } from "./spatialCullingSystem";

export type EntityFamilyType =
  | "krill"
  | "net"
  | "trash"
  | "boat"
  | "ship"
  | "penguin"
  | "dolphin"
  | "current";

export interface EntityFamilyMemberTargetObject {
  hidden?: boolean;
  paused?: boolean;
  setVisible?: (visible: boolean) => void;
  exists?: () => boolean;
}

export interface EntityFamilyMember {
  /** Identificador único da entidade */
  id: string;
  /** Família de classificação biológica/funcional */
  family: EntityFamilyType;
  /** Posição horizontal no mundo (em pixels/metros) */
  getXPosition: () => number;
  /** Largura horizontal estimada para margem segura de culling */
  width?: number;
  /** Lógica de atualização executada exclusivamente quando a entidade estiver dentro do frustum */
  update: (deltaTimeInSeconds: number) => void;
  /** Verificação de destruição ou ciclo de vida encerrado */
  isDestroyed?: () => boolean;
  /** Objeto de cena associado para alternância de visibilidade e estado pausado */
  targetObject?: EntityFamilyMemberTargetObject;
}

export interface EntityFamilyTickerEngineContext {
  width?: () => number;
}

export class EntityFamilyTicker {
  private families: Map<EntityFamilyType, EntityFamilyMember[]> = new Map();
  private entityIndex: Map<string, EntityFamilyMember> = new Map();
  private engineContext: EntityFamilyTickerEngineContext;
  private defaultFrustumSafetyMarginInPixels: number;

  constructor(
    engineContext: EntityFamilyTickerEngineContext,
    defaultFrustumSafetyMarginInPixels: number = 700
  ) {
    this.engineContext = engineContext;
    this.defaultFrustumSafetyMarginInPixels = defaultFrustumSafetyMarginInPixels;
    this.resetFamilies();
  }

  private resetFamilies(): void {
    const familyTypes: EntityFamilyType[] = [
      "krill",
      "net",
      "trash",
      "boat",
      "ship",
      "penguin",
      "dolphin",
      "current",
    ];
    for (let index = 0; index < familyTypes.length; index++) {
      this.families.set(familyTypes[index], []);
    }
    this.entityIndex.clear();
  }

  /**
   * Registra uma entidade em sua respectiva família e retorna a função de desinscrição.
   */
  public registerEntity(member: EntityFamilyMember): () => void {
    if (this.entityIndex.has(member.id)) {
      this.unregisterEntity(member.id);
    }

    let familyBucket = this.families.get(member.family);
    if (!familyBucket) {
      familyBucket = [];
      this.families.set(member.family, familyBucket);
    }

    familyBucket.push(member);
    this.entityIndex.set(member.id, member);

    return () => {
      this.unregisterEntity(member.id);
    };
  }

  /**
   * Remove uma entidade do despachante pelo seu identificador.
   */
  public unregisterEntity(id: string): boolean {
    const member = this.entityIndex.get(id);
    if (!member) return false;

    this.entityIndex.delete(id);
    const familyBucket = this.families.get(member.family);
    if (familyBucket) {
      const itemIndex = familyBucket.indexOf(member);
      if (itemIndex >= 0) {
        familyBucket.splice(itemIndex, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Executa a atualização consolidada de todas as famílias registradas.
   * Pausa o processamento das entidades localizadas fora do frustum da câmera.
   */
  public update(
    deltaTimeInSeconds: number,
    cameraXPosition: number,
    viewportWidthOverride?: number
  ): { activeEntitiesCount: number; pausedEntitiesCount: number } {
    const viewportWidth =
      viewportWidthOverride ??
      (typeof this.engineContext.width === "function" ? this.engineContext.width() : 1280);

    let activeEntitiesCount = 0;
    let pausedEntitiesCount = 0;

    for (const members of this.families.values()) {
      for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
        const member = members[memberIndex];

        // Limpeza de entidades destruídas
        if (
          (member.isDestroyed && member.isDestroyed()) ||
          (member.targetObject?.exists && !member.targetObject.exists())
        ) {
          this.entityIndex.delete(member.id);
          members.splice(memberIndex, 1);
          memberIndex--;
          continue;
        }

        const entityXPosition = member.getXPosition();
        const entityWidth = member.width ?? 0;
        const isVisibleInFrustum = isEntityInFrustum(
          entityXPosition,
          cameraXPosition,
          viewportWidth,
          this.defaultFrustumSafetyMarginInPixels,
          entityWidth
        );

        if (member.targetObject) {
          member.targetObject.hidden = !isVisibleInFrustum;
          member.targetObject.paused = !isVisibleInFrustum;
          if (typeof member.targetObject.setVisible === "function") {
            member.targetObject.setVisible(isVisibleInFrustum);
          }
        }

        if (isVisibleInFrustum) {
          activeEntitiesCount++;
          member.update(deltaTimeInSeconds);
        } else {
          pausedEntitiesCount++;
          // Entidade fora do frustum: processamento pausado para poupar orçamento de CPU
        }
      }
    }

    return { activeEntitiesCount, pausedEntitiesCount };
  }

  /**
   * Executa a atualização focada em uma única família de entidades.
   */
  public updateFamily(
    familyType: EntityFamilyType,
    deltaTimeInSeconds: number,
    cameraXPosition: number,
    viewportWidthOverride?: number
  ): { activeEntitiesCount: number; pausedEntitiesCount: number } {
    const members = this.families.get(familyType);
    if (!members || members.length === 0) {
      return { activeEntitiesCount: 0, pausedEntitiesCount: 0 };
    }

    const viewportWidth =
      viewportWidthOverride ??
      (typeof this.engineContext.width === "function" ? this.engineContext.width() : 1280);

    let activeEntitiesCount = 0;
    let pausedEntitiesCount = 0;

    for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
      const member = members[memberIndex];

      if (
        (member.isDestroyed && member.isDestroyed()) ||
        (member.targetObject?.exists && !member.targetObject.exists())
      ) {
        this.entityIndex.delete(member.id);
        members.splice(memberIndex, 1);
        memberIndex--;
        continue;
      }

      const entityXPosition = member.getXPosition();
      const entityWidth = member.width ?? 0;
      const isVisibleInFrustum = isEntityInFrustum(
        entityXPosition,
        cameraXPosition,
        viewportWidth,
        this.defaultFrustumSafetyMarginInPixels,
        entityWidth
      );

      if (member.targetObject) {
        member.targetObject.hidden = !isVisibleInFrustum;
        member.targetObject.paused = !isVisibleInFrustum;
        if (typeof member.targetObject.setVisible === "function") {
          member.targetObject.setVisible(isVisibleInFrustum);
        }
      }

      if (isVisibleInFrustum) {
        activeEntitiesCount++;
        member.update(deltaTimeInSeconds);
      } else {
        pausedEntitiesCount++;
      }
    }

    return { activeEntitiesCount, pausedEntitiesCount };
  }

  public getEntitiesByFamily(familyType: EntityFamilyType): readonly EntityFamilyMember[] {
    return this.families.get(familyType) ?? [];
  }

  public getEntitiesInFamily(familyType: EntityFamilyType): readonly EntityFamilyMember[] {
    return this.getEntitiesByFamily(familyType);
  }

  public getEntityCount(): number {
    return this.entityIndex.size;
  }

  public getStats(): {
    totalEntitiesCount: number;
    countsByFamily: Record<EntityFamilyType, number>;
  } {
    const countsByFamily = {} as Record<EntityFamilyType, number>;
    let totalEntitiesCount = 0;

    for (const [familyType, members] of this.families.entries()) {
      countsByFamily[familyType] = members.length;
      totalEntitiesCount += members.length;
    }

    return {
      totalEntitiesCount,
      countsByFamily,
    };
  }

  public clear(): void {
    this.resetFamilies();
  }
}

let activeEntityFamilyTicker: EntityFamilyTicker | null = null;

export function initEntityFamilyTicker(
  engineContext: EntityFamilyTickerEngineContext,
  defaultFrustumSafetyMarginInPixels: number = 700
): EntityFamilyTicker {
  activeEntityFamilyTicker = new EntityFamilyTicker(
    engineContext,
    defaultFrustumSafetyMarginInPixels
  );
  return activeEntityFamilyTicker;
}

export function getEntityFamilyTicker(): EntityFamilyTicker | null {
  return activeEntityFamilyTicker;
}

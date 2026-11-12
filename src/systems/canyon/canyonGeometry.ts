import { GAME_CONFIG, TAGS } from "../../config";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
  type Vector2D,
} from "../../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativePolygonNode,
  createNativeRectNode,
  type NativeNodeAnchorAlignment,
} from "../../engine/adapters/NativeRenderNodeFactory";
import type {
  CanyonConfig,
  CanyonGeometryResult,
  CanyonFoamParticle,
  CanyonEngineContext,
  CanyonVector2D,
  CanyonGameObject,
  CanyonOutlinedGameObject,
} from "./canyonTypes";
import { getSpatialCullingManager, type CullableTargetObject } from "../spatialCullingSystem";
import { getSpatialGrid } from "../spatialHashGrid";

export function setupCanyonGeometry<
  TColor = unknown,
  TVec extends { x: number; y: number } = CanyonVector2D,
>(
  k: IRenderEngine | CanyonEngineContext<TColor, TVec>,
  config: CanyonConfig
): CanyonGeometryResult<TColor> {
  /* v8 ignore start */
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as CanyonEngineContext<TColor, TVec> & {
    onSceneLeave?: (callback: () => void) => unknown;
  };
  const createdNativeNodes: Array<{ destroy(): void }> = [];

  const {
    surfaceY,
    deepFloorY,
    boqueiraoStartX,
    rampUpEndX,
    plateauEndX,
    boqueiraoEndX,
    lighthouseX,
  } = config;

  let revealTimer = 0;
  const setRevealTimer = (duration: number) => {
    revealTimer = duration;
  };
  const getRevealTimer = () => revealTimer;

  const cullingManager = getSpatialCullingManager();
  const spatialGrid = getSpatialGrid();

  const createPolygonEntity = <TReturn = unknown>(params: {
    identifier: string;
    points: readonly Vector2D[];
    positionX: number;
    positionY: number;
    fillColor: [number, number, number];
    outlineColor?: [number, number, number];
    outlineWidth?: number;
    opacity?: number;
    rotationDegrees?: number;
    zIndex?: number;
    tags?: readonly string[];
    onReveal?: () => void;
  }): TReturn => {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const node = createNativePolygonNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: params.identifier,
        points: params.points,
        positionX: params.positionX,
        positionY: params.positionY,
        fillColor: params.fillColor,
        outlineColor: params.outlineColor,
        outlineWidth: params.outlineWidth,
        opacity: params.opacity ?? 1,
        rotationDegrees: params.rotationDegrees ?? 0,
        zIndex: params.zIndex ?? 0,
        tags: params.tags,
        onReveal: params.onReveal,
      });
      createdNativeNodes.push(node);
      return node as unknown as TReturn;
    }

    const legacyPoints = params.points.map((point) => legacyContext.vec2(point.x, point.y));
    const components: unknown[] = [
      legacyContext.polygon(legacyPoints),
      legacyContext.pos(params.positionX, params.positionY),
      legacyContext.color(params.fillColor[0], params.fillColor[1], params.fillColor[2]),
    ];
    if (params.outlineColor && params.outlineWidth) {
      components.push(
        legacyContext.outline(
          params.outlineWidth,
          legacyContext.rgb(params.outlineColor[0], params.outlineColor[1], params.outlineColor[2])
        )
      );
    }
    if (params.opacity !== undefined) {
      components.push(legacyContext.opacity(params.opacity));
    }
    if (params.rotationDegrees !== undefined) {
      components.push(legacyContext.rotate(params.rotationDegrees));
    }
    if (params.zIndex !== undefined) {
      components.push(legacyContext.z(params.zIndex));
    }
    if (params.tags) {
      components.push(...params.tags);
    }
    if (params.onReveal) {
      components.push({ reveal: params.onReveal });
    }
    return legacyContext.add(components) as TReturn;
  };

  const createRectEntity = <TReturn = unknown>(params: {
    identifier: string;
    width: number;
    height: number;
    cornerRadius?: number;
    positionX: number;
    positionY: number;
    fillColor?: [number, number, number];
    outlineColor?: [number, number, number];
    outlineWidth?: number;
    opacity?: number;
    anchor?: NativeNodeAnchorAlignment;
    zIndex?: number;
    tags?: readonly string[];
    onReveal?: () => void;
    colliderKey?: string;
  }): TReturn => {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      if (params.opacity === 0 && params.colliderKey && spatialGrid) {
        const tagSet = new Set(params.tags ?? []);
        const colliderEntity = {
          id: params.colliderKey,
          pos: { x: params.positionX, y: params.positionY },
          tags: Array.from(tagSet),
          tag: params.tags?.[0],
          is: (tagName: string) => tagSet.has(tagName),
          ...(params.onReveal ? { reveal: params.onReveal } : {}),
        };
        spatialGrid.insert(
          params.colliderKey,
          colliderEntity,
          {
            minX: params.positionX,
            minY: params.positionY,
            maxX: params.positionX + params.width,
            maxY: params.positionY + params.height,
          },
          true
        );
        return colliderEntity as unknown as TReturn;
      }

      const node = createNativeRectNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: params.identifier,
        width: params.width,
        height: params.height,
        cornerRadius: params.cornerRadius,
        positionX: params.positionX,
        positionY: params.positionY,
        fillColor: params.fillColor,
        outlineColor: params.outlineColor,
        outlineWidth: params.outlineWidth,
        opacity: params.opacity ?? 1,
        anchor: params.anchor,
        zIndex: params.zIndex ?? 0,
        tags: params.tags,
        onReveal: params.onReveal,
      });
      createdNativeNodes.push(node);
      return node as unknown as TReturn;
    }

    const components: unknown[] = [
      legacyContext.rect(
        params.width,
        params.height,
        params.cornerRadius ? { radius: params.cornerRadius } : undefined
      ),
      legacyContext.pos(params.positionX, params.positionY),
    ];
    if (params.fillColor) {
      components.push(
        legacyContext.color(params.fillColor[0], params.fillColor[1], params.fillColor[2])
      );
    }
    if (params.outlineColor && params.outlineWidth) {
      components.push(
        legacyContext.outline(
          params.outlineWidth,
          legacyContext.rgb(params.outlineColor[0], params.outlineColor[1], params.outlineColor[2])
        )
      );
    }
    if (params.opacity !== undefined) {
      components.push(legacyContext.opacity(params.opacity));
    }
    if (params.anchor === "center" || params.anchor === "bot") {
      components.push(legacyContext.anchor(params.anchor));
    }
    if (params.zIndex !== undefined) {
      components.push(legacyContext.z(params.zIndex));
    }
    if (params.tags) {
      components.push(...params.tags);
    }
    if (params.onReveal) {
      components.push({ reveal: params.onReveal });
    }
    return legacyContext.add(components) as TReturn;
  };

  const createCircleEntity = <TReturn = unknown>(params: {
    identifier: string;
    radius: number;
    positionX: number;
    positionY: number;
    fillColor: [number, number, number];
    opacity?: number;
    anchor?: NativeNodeAnchorAlignment;
    zIndex?: number;
    tags?: readonly string[];
  }): TReturn => {
    if (resolvedNativeRenderEngine && nativeWorldContainer) {
      const node = createNativeCircleNode(k, resolvedNativeRenderEngine, nativeWorldContainer, {
        identifier: params.identifier,
        radius: params.radius,
        positionX: params.positionX,
        positionY: params.positionY,
        fillColor: params.fillColor,
        opacity: params.opacity ?? 1,
        anchor: params.anchor,
        zIndex: params.zIndex ?? 0,
        tags: params.tags,
      });
      createdNativeNodes.push(node);
      return node as unknown as TReturn;
    }

    const components: unknown[] = [
      legacyContext.circle(params.radius),
      legacyContext.pos(params.positionX, params.positionY),
      legacyContext.color(params.fillColor[0], params.fillColor[1], params.fillColor[2]),
    ];
    if (params.opacity !== undefined) {
      components.push(legacyContext.opacity(params.opacity));
    }
    if (params.anchor === "center" || params.anchor === "bot") {
      components.push(legacyContext.anchor(params.anchor));
    }
    if (params.zIndex !== undefined) {
      components.push(legacyContext.z(params.zIndex));
    }
    if (params.tags) {
      components.push(...params.tags);
    }
    return legacyContext.add(components) as TReturn;
  };

  if (resolvedNativeRenderEngine && typeof legacyContext.onSceneLeave === "function") {
    legacyContext.onSceneLeave(() => {
      for (let index = 0; index < createdNativeNodes.length; index++) {
        createdNativeNodes[index].destroy();
      }
      createdNativeNodes.length = 0;
    });
  }

  // =========================================================================
  // 1. FUNDO ROCHOSO DO BOQUEIRÃO (SUBMERSO - FORMAÇÃO ORGÂNICA CONTÍNUA)
  // =========================================================================

  // A. Rampa de Subida Orgânica (25.400m a 25.800m)
  const rampUpWidth = rampUpEndX - boqueiraoStartX;
  const crestY = 190;
  const rampUpShape = createPolygonEntity<CanyonOutlinedGameObject<TColor>>({
    identifier: "canyon_ramp_up",
    points: [
      { x: 0, y: 1200 },
      { x: 0, y: deepFloorY },
      { x: rampUpWidth * 0.25, y: deepFloorY - (deepFloorY - crestY) * 0.2 },
      { x: rampUpWidth * 0.55, y: deepFloorY - (deepFloorY - crestY) * 0.5 },
      { x: rampUpWidth * 0.8, y: deepFloorY - (deepFloorY - crestY) * 0.8 },
      { x: rampUpWidth, y: crestY },
      { x: rampUpWidth, y: 1200 },
    ],
    positionX: boqueiraoStartX,
    positionY: 0,
    fillColor: [127, 140, 141], // 0x7F8C8D (gnaisse)
    outlineColor: [60, 80, 100],
    outlineWidth: 2,
    zIndex: 2,
    tags: [TAGS.OBSTACLE, "boqueirao_rock"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });
  cullingManager?.registerEntity(
    rampUpShape as unknown as CullableTargetObject,
    () => boqueiraoStartX + rampUpWidth / 2
  );

  // Colisores Físicos Sólidos da Rampa de Subida (estendidos até o limite abissal)
  const upSegments = 4;
  const upSegW = rampUpWidth / upSegments;
  for (let i = 0; i < upSegments; i++) {
    const segX = boqueiraoStartX + i * upSegW;
    const t = (i + 0.5) / upSegments;
    const segTopY = deepFloorY - t * (deepFloorY - crestY);
    createRectEntity({
      identifier: `canyon_ramp_up_collider_${i}`,
      colliderKey: `boqueirao_ramp_up_collider_${i}`,
      width: upSegW + 4,
      height: deepFloorY + 140 - segTopY + 800,
      positionX: segX,
      positionY: segTopY,
      opacity: 0,
      zIndex: 3,
      tags: [TAGS.OBSTACLE, "boqueirao_rock_collider"],
    });
  }

  // Cobertura vegetal de musgo e algas calcárias na rampa de subida
  createPolygonEntity({
    identifier: "canyon_ramp_up_moss",
    points: [
      { x: 0, y: deepFloorY },
      { x: rampUpWidth * 0.25, y: deepFloorY - (deepFloorY - crestY) * 0.2 },
      { x: rampUpWidth * 0.55, y: deepFloorY - (deepFloorY - crestY) * 0.5 },
      { x: rampUpWidth * 0.8, y: deepFloorY - (deepFloorY - crestY) * 0.8 },
      { x: rampUpWidth, y: crestY },
      { x: rampUpWidth, y: crestY + 8 },
      { x: rampUpWidth * 0.8, y: deepFloorY - (deepFloorY - crestY) * 0.8 + 8 },
      { x: rampUpWidth * 0.55, y: deepFloorY - (deepFloorY - crestY) * 0.5 + 8 },
      { x: rampUpWidth * 0.25, y: deepFloorY - (deepFloorY - crestY) * 0.2 + 8 },
      { x: 0, y: deepFloorY + 8 },
    ],
    positionX: boqueiraoStartX,
    positionY: 0,
    fillColor: [28, 105, 80],
    zIndex: 3,
  });

  // B. Estreito Submarino em V do Boqueirão (25.800m a 26.900m)
  const plateauWidth = plateauEndX - rampUpEndX;
  const canyonMidX = rampUpEndX + plateauWidth / 2;

  const rightWallOffsetX = plateauWidth - 640;
  const valleyStartX = rampUpEndX + 200;
  const valleyEndX = rampUpEndX + rightWallOffsetX + 440;
  const valleyWidth = Math.max(10, valleyEndX - valleyStartX);

  // Parede Esquerda
  const leftWallShape = createPolygonEntity<CanyonOutlinedGameObject<TColor>>({
    identifier: "canyon_left_wall",
    points: [
      { x: 0, y: 1200 },
      { x: 0, y: 190 },
      { x: 150, y: 340 },
      { x: 200, y: 1200 },
    ],
    positionX: rampUpEndX,
    positionY: 0,
    fillColor: [127, 140, 141],
    outlineColor: [60, 80, 100],
    outlineWidth: 2,
    zIndex: 2,
    tags: [TAGS.OBSTACLE, "boqueirao_rock", "canyon_left_wall"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });
  cullingManager?.registerEntity(
    leftWallShape as unknown as CullableTargetObject,
    () => rampUpEndX + 100
  );
  spatialGrid?.insert(
    "boqueirao_canyon_left_wall",
    leftWallShape,
    { minX: rampUpEndX, minY: 190, maxX: rampUpEndX + 200, maxY: 1200 },
    true
  );

  // Parede Direita
  const rightWallShape = createPolygonEntity<CanyonOutlinedGameObject<TColor>>({
    identifier: "canyon_right_wall",
    points: [
      { x: 440, y: 1200 },
      { x: 490, y: 340 },
      { x: 640, y: 190 },
      { x: 640, y: 1200 },
    ],
    positionX: rampUpEndX + rightWallOffsetX,
    positionY: 0,
    fillColor: [127, 140, 141],
    outlineColor: [60, 80, 100],
    outlineWidth: 2,
    zIndex: 2,
    tags: [TAGS.OBSTACLE, "boqueirao_rock", "canyon_right_wall"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });
  cullingManager?.registerEntity(
    rightWallShape as unknown as CullableTargetObject,
    () => rampUpEndX + rightWallOffsetX + 540
  );
  spatialGrid?.insert(
    "boqueirao_canyon_right_wall",
    rightWallShape,
    {
      minX: rampUpEndX + rightWallOffsetX + 440,
      minY: 190,
      maxX: rampUpEndX + rightWallOffsetX + 640,
      maxY: 1200,
    },
    true
  );

  // Fundo do Vale
  const plateauObj = createPolygonEntity<CanyonOutlinedGameObject<TColor>>({
    identifier: "canyon_valley_floor",
    points: [
      { x: -50, y: 340 },
      { x: valleyWidth + 50, y: 340 },
      { x: valleyWidth + 50, y: 1200 },
      { x: -50, y: 1200 },
    ],
    positionX: valleyStartX,
    positionY: 0,
    fillColor: [127, 140, 141],
    outlineColor: [60, 80, 100],
    outlineWidth: 2,
    zIndex: 2,
    tags: [TAGS.OBSTACLE, "boqueirao_rock", "canyon_valley_floor"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });
  cullingManager?.registerEntity(plateauObj as unknown as CullableTargetObject, () => canyonMidX);
  spatialGrid?.insert(
    "boqueirao_canyon_valley_floor",
    plateauObj,
    { minX: valleyStartX - 50, minY: 340, maxX: valleyStartX + valleyWidth + 50, maxY: 1200 },
    true
  );

  // 4. Diques de Diabásio Vulcânico (0x2C3E50 e 0x1A252F) cortando o gnaisse dentro das novas paredes
  createPolygonEntity({
    identifier: "canyon_diabase_dike_1",
    points: [
      { x: 30, y: 205 },
      { x: 55, y: 230 },
      { x: 120, y: 335 },
      { x: 95, y: 345 },
    ],
    positionX: rampUpEndX,
    positionY: 0,
    fillColor: [44, 62, 80],
    zIndex: 3,
    tags: ["boqueirao_diabase_dike"],
  });

  createPolygonEntity({
    identifier: "canyon_diabase_dike_2",
    points: [
      { x: 30, y: 240 },
      { x: 55, y: 240 },
      { x: 150, y: 340 },
      { x: 130, y: 340 },
    ],
    positionX: rampUpEndX,
    positionY: 0,
    fillColor: [26, 37, 47],
    zIndex: 3,
    tags: ["boqueirao_diabase_dike"],
  });

  createPolygonEntity({
    identifier: "canyon_diabase_dike_3",
    points: [
      { x: 610, y: 205 },
      { x: 585, y: 230 },
      { x: 520, y: 335 },
      { x: 545, y: 340 },
    ],
    positionX: rampUpEndX + rightWallOffsetX,
    positionY: 0,
    fillColor: [44, 62, 80],
    zIndex: 3,
    tags: ["boqueirao_diabase_dike"],
  });

  createPolygonEntity({
    identifier: "canyon_diabase_dike_4",
    points: [
      { x: 610, y: 240 },
      { x: 585, y: 240 },
      { x: 490, y: 340 },
      { x: 510, y: 340 },
    ],
    positionX: rampUpEndX + rightWallOffsetX,
    positionY: 0,
    fillColor: [26, 37, 47],
    zIndex: 3,
    tags: ["boqueirao_diabase_dike"],
  });

  createPolygonEntity({
    identifier: "canyon_diabase_dike_5",
    points: [
      { x: valleyWidth * 0.42, y: 340 },
      { x: valleyWidth * 0.42 + 25, y: 340 },
      { x: valleyWidth * 0.42 + 20, y: 380 },
      { x: valleyWidth * 0.42 - 5, y: 380 },
    ],
    positionX: valleyStartX,
    positionY: 0,
    fillColor: [26, 37, 47],
    zIndex: 3,
    tags: ["boqueirao_diabase_dike"],
  });

  // 5. Bordas texturizadas com pontilhamento 4x4px nas beiradas inclinadas para quebrar a linha reta do polígono
  const leftEdgeSteps = [
    { x: 35, y: 200 },
    { x: 60, y: 230 },
    { x: 85, y: 260 },
    { x: 110, y: 285 },
    { x: 130, y: 310 },
    { x: 140, y: 325 },
    { x: 146, y: 334 },
  ];
  for (let stepIndex = 0; stepIndex < leftEdgeSteps.length; stepIndex++) {
    const step = leftEdgeSteps[stepIndex];
    createRectEntity({
      identifier: `canyon_left_dither_a_${stepIndex}`,
      width: 4,
      height: 4,
      positionX: rampUpEndX + step.x,
      positionY: step.y,
      fillColor: [44, 62, 80],
      zIndex: 3,
      tags: ["boqueirao_dither"],
    });
    createRectEntity({
      identifier: `canyon_left_dither_b_${stepIndex}`,
      width: 4,
      height: 4,
      positionX: rampUpEndX + step.x - 4,
      positionY: step.y + 4,
      fillColor: [26, 37, 47],
      zIndex: 3,
      tags: ["boqueirao_dither"],
    });
  }

  const rightEdgeSteps = [
    { x: 605, y: 200 },
    { x: 580, y: 230 },
    { x: 555, y: 260 },
    { x: 530, y: 285 },
    { x: 510, y: 310 },
    { x: 500, y: 325 },
    { x: 494, y: 334 },
  ];
  for (let stepIndex = 0; stepIndex < rightEdgeSteps.length; stepIndex++) {
    const step = rightEdgeSteps[stepIndex];
    createRectEntity({
      identifier: `canyon_right_dither_a_${stepIndex}`,
      width: 4,
      height: 4,
      positionX: rampUpEndX + rightWallOffsetX + step.x,
      positionY: step.y,
      fillColor: [44, 62, 80],
      zIndex: 3,
      tags: ["boqueirao_dither"],
    });
    createRectEntity({
      identifier: `canyon_right_dither_b_${stepIndex}`,
      width: 4,
      height: 4,
      positionX: rampUpEndX + rightWallOffsetX + step.x + 4,
      positionY: step.y + 4,
      fillColor: [26, 37, 47],
      zIndex: 3,
      tags: ["boqueirao_dither"],
    });
  }

  // 6. Colisores Físicos Sólidos nas Paredes e Vale do Estreito (estendidos até o limite abissal)
  const leftSegments = 5;
  for (let i = 0; i < leftSegments; i++) {
    const t = i / leftSegments;
    const sx = rampUpEndX + t * 150;
    const sy = 190 + t * 150; // de 190 até 340
    const segH = 360 - sy + 800;
    createRectEntity({
      identifier: `canyon_left_wall_collider_${i}`,
      colliderKey: `boqueirao_left_wall_collider_${i}`,
      width: 35,
      height: segH,
      positionX: sx,
      positionY: sy,
      opacity: 0,
      zIndex: 3,
      tags: [TAGS.OBSTACLE, "boqueirao_wall_collider"],
    });
  }

  const rightSegments = 5;
  for (let i = 0; i < rightSegments; i++) {
    const t = i / rightSegments;
    const sx = rampUpEndX + rightWallOffsetX + 640 - (1 - t) * 150;
    const sy = 340 - t * 150; // de 340 até 190
    const segH = 360 - sy + 800;
    createRectEntity({
      identifier: `canyon_right_wall_collider_${i}`,
      colliderKey: `boqueirao_right_wall_collider_${i}`,
      width: 35,
      height: segH,
      positionX: sx - 35,
      positionY: sy,
      opacity: 0,
      zIndex: 3,
      tags: [TAGS.OBSTACLE, "boqueirao_wall_collider"],
    });
  }

  createRectEntity({
    identifier: "canyon_valley_collider",
    colliderKey: "boqueirao_valley_collider",
    width: valleyWidth + 100,
    height: 800,
    positionX: valleyStartX - 50,
    positionY: 340,
    opacity: 0,
    zIndex: 3,
    tags: [TAGS.OBSTACLE, "boqueirao_valley_collider"],
  });

  // C. Rampa de Descida Orgânica (26.900m a 27.300m)
  const rampDownWidth = boqueiraoEndX - plateauEndX;
  const rampDownShape = createPolygonEntity<CanyonOutlinedGameObject<TColor>>({
    identifier: "canyon_ramp_down",
    points: [
      { x: 0, y: crestY },
      { x: rampDownWidth * 0.2, y: deepFloorY - (deepFloorY - crestY) * 0.8 },
      { x: rampDownWidth * 0.45, y: deepFloorY - (deepFloorY - crestY) * 0.5 },
      { x: rampDownWidth * 0.75, y: deepFloorY - (deepFloorY - crestY) * 0.2 },
      { x: rampDownWidth, y: deepFloorY },
      { x: rampDownWidth, y: 1200 },
      { x: 0, y: 1200 },
    ],
    positionX: plateauEndX,
    positionY: 0,
    fillColor: [127, 140, 141], // 0x7F8C8D (gnaisse)
    outlineColor: [60, 80, 100],
    outlineWidth: 2,
    zIndex: 2,
    tags: [TAGS.OBSTACLE, "boqueirao_rock"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });
  cullingManager?.registerEntity(
    rampDownShape as unknown as CullableTargetObject,
    () => plateauEndX + rampDownWidth / 2
  );

  // Colisores Físicos Sólidos da Rampa de Descida (estendidos até o limite abissal)
  const downSegments = 4;
  const downSegW = rampDownWidth / downSegments;
  for (let i = 0; i < downSegments; i++) {
    const segX = plateauEndX + i * downSegW;
    const t = (i + 0.5) / downSegments;
    const segTopY = crestY + t * (deepFloorY - crestY);
    createRectEntity({
      identifier: `canyon_ramp_down_collider_${i}`,
      colliderKey: `boqueirao_ramp_down_collider_${i}`,
      width: downSegW + 4,
      height: deepFloorY + 140 - segTopY + 800,
      positionX: segX,
      positionY: segTopY,
      opacity: 0,
      zIndex: 3,
      tags: [TAGS.OBSTACLE, "boqueirao_rock_collider"],
    });
  }

  // Cobertura de musgo na rampa de descida
  createPolygonEntity({
    identifier: "canyon_ramp_down_moss",
    points: [
      { x: 0, y: crestY },
      { x: rampDownWidth * 0.2, y: deepFloorY - (deepFloorY - crestY) * 0.8 },
      { x: rampDownWidth * 0.45, y: deepFloorY - (deepFloorY - crestY) * 0.5 },
      { x: rampDownWidth * 0.75, y: deepFloorY - (deepFloorY - crestY) * 0.2 },
      { x: rampDownWidth, y: deepFloorY },
      { x: rampDownWidth, y: deepFloorY + 8 },
      { x: rampDownWidth * 0.75, y: deepFloorY - (deepFloorY - crestY) * 0.2 + 8 },
      { x: rampDownWidth * 0.45, y: deepFloorY - (deepFloorY - crestY) * 0.5 + 8 },
      { x: rampDownWidth * 0.2, y: deepFloorY - (deepFloorY - crestY) * 0.8 + 8 },
      { x: 0, y: crestY + 8 },
    ],
    positionX: plateauEndX,
    positionY: 0,
    fillColor: [28, 105, 80],
    zIndex: 3,
  });

  // =========================================================================
  // 2. A ILHA DO FAROL (SUPERFÍCIE E CÉU COM CAMADAS DE PROFUNDIDADE)
  // =========================================================================

  const islandStartX = 25750;
  const islandEndX = 26950;
  const islandWidth = islandEndX - islandStartX;
  const islandPeakY = surfaceY - 82;

  // A. Silhueta de Fundo da Cordilheira da Ilha
  createPolygonEntity({
    identifier: "island_mountain_silhouette",
    points: [
      { x: 0, y: surfaceY },
      { x: 180, y: surfaceY - 45 },
      { x: islandWidth * 0.45, y: islandPeakY - 12 },
      { x: islandWidth * 0.6, y: islandPeakY - 8 },
      { x: islandWidth * 0.85, y: surfaceY - 40 },
      { x: islandWidth, y: surfaceY },
      { x: islandWidth, y: surfaceY + 15 },
      { x: 0, y: surfaceY + 15 },
    ],
    positionX: islandStartX - 40,
    positionY: 0,
    fillColor: [28, 38, 52],
    opacity: 0.85,
    zIndex: -6,
  });

  // B. Promontório Rochoso Principal da Ilha do Farol
  const cliffObj = createPolygonEntity<CanyonOutlinedGameObject<TColor>>({
    identifier: "island_cliff_visual",
    points: [
      { x: 0, y: surfaceY },
      { x: 220, y: surfaceY - 38 },
      { x: lighthouseX - islandStartX - 90, y: islandPeakY + 16 },
      { x: lighthouseX - islandStartX, y: islandPeakY },
      { x: lighthouseX - islandStartX + 85, y: islandPeakY + 18 },
      { x: islandWidth - 190, y: surfaceY - 32 },
      { x: islandWidth, y: surfaceY },
      { x: islandWidth, y: surfaceY + 12 },
      { x: 0, y: surfaceY + 12 },
    ],
    positionX: islandStartX,
    positionY: 0,
    fillColor: [44, 56, 72],
    outlineColor: [30, 38, 50],
    outlineWidth: 3,
    zIndex: -5,
    tags: [TAGS.OBSTACLE, "island_cliff_visual"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });
  cullingManager?.registerEntity(
    cliffObj as unknown as CullableTargetObject,
    () => islandStartX + islandWidth / 2
  );

  // Cobertura de vegetação de restinga e matas costeiras no topo da ilha
  createPolygonEntity({
    identifier: "island_vegetation_cover",
    points: [
      { x: 210, y: surfaceY - 40 },
      { x: lighthouseX - islandStartX - 90, y: islandPeakY + 14 },
      { x: lighthouseX - islandStartX, y: islandPeakY - 2 },
      { x: lighthouseX - islandStartX + 85, y: islandPeakY + 16 },
      { x: islandWidth - 195, y: surfaceY - 34 },
      { x: islandWidth - 185, y: surfaceY - 28 },
      { x: lighthouseX - islandStartX, y: islandPeakY + 6 },
      { x: 200, y: surfaceY - 34 },
    ],
    positionX: islandStartX,
    positionY: 0,
    fillColor: [36, 90, 58],
    zIndex: -4,
  });

  // Tufos de vegetação de restinga procedural ao longo da encosta da ilha
  const bushDefs = [
    { rx: 150, ry: surfaceY - 34, r: 8 },
    { rx: 280, ry: surfaceY - 46, r: 9 },
    { rx: 420, ry: surfaceY - 58, r: 7 },
    { rx: lighthouseX - islandStartX - 165, ry: islandPeakY + 30, r: 8 },
    { rx: lighthouseX - islandStartX - 82, ry: islandPeakY + 14, r: 6 },
    { rx: lighthouseX - islandStartX + 68, ry: islandPeakY + 18, r: 7 },
    { rx: lighthouseX - islandStartX + 148, ry: islandPeakY + 28, r: 8 },
    { rx: 855, ry: surfaceY - 48, r: 9 },
    { rx: 962, ry: surfaceY - 38, r: 7 },
    { rx: 1058, ry: surfaceY - 28, r: 8 },
  ];
  const bushCols: [number, number, number][] = [
    [40, 100, 55],
    [55, 130, 65],
    [35, 85, 45],
  ];
  for (let b = 0; b < bushDefs.length; b++) {
    const bd = bushDefs[b];
    const c0 = bushCols[b % 3];
    const c1 = bushCols[(b + 1) % 3];
    const c2 = bushCols[(b + 2) % 3];
    createCircleEntity({
      identifier: `island_bush_0_${b}`,
      radius: bd.r,
      positionX: islandStartX + bd.rx,
      positionY: bd.ry,
      fillColor: c0,
      anchor: "center",
      zIndex: -4,
      tags: ["island_bush"],
    });
    createCircleEntity({
      identifier: `island_bush_1_${b}`,
      radius: bd.r - 2,
      positionX: islandStartX + bd.rx - 9,
      positionY: bd.ry + 3,
      fillColor: c1,
      anchor: "center",
      zIndex: -4,
      tags: ["island_bush"],
    });
    createCircleEntity({
      identifier: `island_bush_2_${b}`,
      radius: Math.max(2, bd.r - 3),
      positionX: islandStartX + bd.rx + 8,
      positionY: bd.ry + 2,
      fillColor: c2,
      anchor: "center",
      zIndex: -4,
      tags: ["island_bush"],
    });
  }

  // C. Colisor Físico Sólido da Ilha
  createRectEntity({
    identifier: "island_cliff_collider",
    colliderKey: "boqueirao_island_cliff_collider",
    width: islandWidth - 90,
    height: surfaceY - islandPeakY + 15,
    positionX: islandStartX + 45,
    positionY: islandPeakY,
    opacity: 0,
    zIndex: 10,
    tags: [TAGS.OBSTACLE, "island_cliff"],
    onReveal: () => {
      revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    },
  });

  // D. Farol Histórico de Arraial
  const lighthouseBaseY = islandPeakY;

  createRectEntity({
    identifier: "lighthouse_base",
    width: 36,
    height: 14,
    cornerRadius: 2,
    positionX: lighthouseX,
    positionY: lighthouseBaseY,
    fillColor: [58, 66, 78],
    anchor: "bot",
    zIndex: -4,
  });

  createRectEntity({
    identifier: "lighthouse_tower",
    width: 26,
    height: 68,
    cornerRadius: 3,
    positionX: lighthouseX,
    positionY: lighthouseBaseY - 14,
    fillColor: [245, 245, 250],
    anchor: "bot",
    zIndex: -4,
  });

  for (let s = 0; s < 3; s++) {
    createRectEntity({
      identifier: `lighthouse_stripe_${s}`,
      width: 26,
      height: 5,
      positionX: lighthouseX,
      positionY: lighthouseBaseY - 22 - s * 18,
      fillColor: [210, 45, 45],
      anchor: "bot",
      zIndex: -3,
    });
  }

  createRectEntity({
    identifier: "lighthouse_balcony",
    width: 34,
    height: 5,
    cornerRadius: 1,
    positionX: lighthouseX,
    positionY: lighthouseBaseY - 80,
    fillColor: [190, 195, 210],
    outlineColor: [140, 145, 160],
    outlineWidth: 1,
    anchor: "bot",
    zIndex: -3,
  });

  createRectEntity({
    identifier: "lighthouse_cupola",
    width: 22,
    height: 16,
    cornerRadius: 4,
    positionX: lighthouseX,
    positionY: lighthouseBaseY - 82,
    fillColor: [40, 45, 55],
    anchor: "bot",
    zIndex: -3,
  });

  createRectEntity({
    identifier: "lighthouse_lightning_rod",
    width: 2,
    height: 12,
    positionX: lighthouseX,
    positionY: lighthouseBaseY - 100,
    fillColor: [80, 88, 96],
    anchor: "bot",
    zIndex: -3,
  });

  const lanternGlow = createCircleEntity<CanyonGameObject<TColor>>({
    identifier: "lighthouse_lantern_glow",
    radius: 7,
    positionX: lighthouseX,
    positionY: lighthouseBaseY - 90,
    fillColor: [255, 240, 140],
    opacity: 0.9,
    anchor: "center",
    zIndex: -3,
  });

  const lighthouseBeam = createPolygonEntity<CanyonGameObject<TColor>>({
    identifier: "lighthouse_beam",
    points: [
      { x: 0, y: 0 },
      { x: -400, y: -70 },
      { x: -460, y: 50 },
    ],
    positionX: lighthouseX,
    positionY: lighthouseBaseY - 90,
    fillColor: [255, 245, 180],
    opacity: 0.22,
    rotationDegrees: 0,
    zIndex: -3,
    tags: ["lighthouse_beam"],
  });

  // E. Reflexo difuso do farol na superfície da água
  const reflectionSegments: CanyonGameObject<TColor>[] = [];
  for (let r = 0; r < 4; r++) {
    reflectionSegments.push(
      createRectEntity<CanyonGameObject<TColor>>({
        identifier: `lighthouse_reflection_${r}`,
        width: Math.max(1, 6 - r),
        height: Math.max(1, 9 - r * 2),
        positionX: lighthouseX,
        positionY: surfaceY + 12 + r * 14,
        fillColor: [255, 245, 180],
        opacity: 0.1 - r * 0.02,
        anchor: "center",
        zIndex: -2,
        tags: ["lighthouse_reflection"],
      })
    );
  }

  // F. Espuma costeira animada na base da ilha
  const foamParticles: CanyonFoamParticle<TColor>[] = [];
  for (let f = 0; f < 8; f++) {
    const foamBaseX = islandStartX + 60 + Math.round((f * (islandEndX - islandStartX - 120)) / 7);
    foamParticles.push({
      obj: createRectEntity<CanyonGameObject<TColor>>({
        identifier: `island_foam_${f}`,
        width: 10,
        height: 2,
        cornerRadius: 1,
        positionX: foamBaseX,
        positionY: surfaceY + 2,
        fillColor: [240, 250, 255],
        opacity: 0.3,
        zIndex: -2,
        tags: ["island_foam"],
      }),
      baseX: foamBaseX,
      speed: 14 + (f % 3) * 5,
      phase: f * 0.85,
    });
  }

  // G. Veios de estratificação rochosa no promontório
  const strataDefinitions = [
    { yOff: -18, lenFrac: 0.55, op: 0.13 },
    { yOff: -36, lenFrac: 0.44, op: 0.1 },
    { yOff: -52, lenFrac: 0.3, op: 0.08 },
  ];
  for (let strataIndex = 0; strataIndex < strataDefinitions.length; strataIndex++) {
    const sd = strataDefinitions[strataIndex];
    createRectEntity({
      identifier: `island_strata_${strataIndex}`,
      width: Math.round(islandWidth * sd.lenFrac),
      height: 2,
      positionX: islandStartX + 80,
      positionY: surfaceY + sd.yOff,
      fillColor: [68, 86, 108],
      opacity: sd.op,
      zIndex: -4,
      tags: ["island_strata"],
    });
  }

  /* v8 ignore stop */
  return {
    plateauObj,
    rampUpShape,
    rampDownShape,
    cliffObj,
    leftWallShape,
    rightWallShape,
    lighthouseBeam,
    lanternGlow,
    reflectionSegments,
    foamParticles,
    setRevealTimer,
    getRevealTimer,
  };
}

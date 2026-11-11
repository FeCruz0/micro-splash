/**
 * Sistema de Iluminação Subaquática: God Rays & Cáusticos — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado de geometrias rígidas de 90° e normalizado para cross-browser (Chrome ANGLE vs Firefox WebRender).
 */

import { GAME_CONFIG } from "../config";
import { getSpatialCullingManager } from "./spatialCullingSystem";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveCameraX } from "./cameraSystem";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createVolumetricRayProfile,
  getRaySegmentPolygonVertices,
  resolveBiomeLightColor,
  type RayGeometryProfile,
} from "../utils/volumetricRayGeometry";

/**
 * Calcula a largura volumétrica do feixe solar (Fase 30.4: 8px a 18px).
 */
export function calculateGodRayWidth(rayIndex: number): number {
  return 8 + (rayIndex % 4) * 3.2;
}

interface GodRayData {
  readonly baseXOffset: number;
  readonly pulseSpeed: number;
  readonly pulsePhase: number;
  readonly angleOffsetDeg: number;
}

interface CausticData {
  readonly index: number;
}

interface LegacyLightObj {
  pos: { x: number; y: number };
  angle?: number;
  color?: unknown;
  opacity?: number;
  hidden?: boolean;
}

interface LegacyRaySegment {
  readonly obj: LegacyLightObj;
  readonly relativeAlpha: number;
}

interface LegacyRayGroup {
  readonly segments: readonly LegacyRaySegment[];
  readonly baseXOffset: number;
  readonly pulseSpeed: number;
  readonly pulsePhase: number;
  readonly angleOffsetDeg: number;
}

function drawVolumetricRay(
  node: IGraphicsNode,
  profile: RayGeometryProfile,
  color: readonly [number, number, number]
): void {
  for (let index = 0; index < profile.segments.length; index++) {
    const segment = profile.segments[index];
    const vertices = getRaySegmentPolygonVertices(segment);
    node.drawPolygon(vertices, {
      fill: {
        color,
        alpha: segment.relativeAlpha,
      },
    });
  }
}

interface LegacyLightRaysEngineContext {
  width?(): number;
  dt(): number;
  camPos?(): { readonly x: number; readonly y: number };
  vec2?(x: number, y: number): unknown;
  rgb?(r: number, g: number, b: number): unknown;
  polygon(points: readonly unknown[]): unknown;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  color(r: number, g: number, b: number): unknown;
  opacity(alpha: number): unknown;
  z(layer: number): unknown;
  add(components: unknown[]): unknown;
  onUpdate(callback: () => void): (() => void) | { cancel: () => void };
}

/**
 * Sistema de Iluminação Subaquática: God Rays (Feixes Volumétricos) & Cáusticos de Superfície
 * Traz atmosfera cinematográfica e sensação de profundidade através da luz solar filtrada na água.
 */
export function setupLightRaysSystem(engineOrContext: IRenderEngine | unknown): void {
  const resolvedRenderEngine = resolveInitializedRenderEngine(engineOrContext);
  const legacyEngineContext = !resolvedRenderEngine
    ? (engineOrContext as LegacyLightRaysEngineContext)
    : undefined;
  const rayCount = 15;
  const causticSegments = 10;
  const screenWidth = resolvedRenderEngine
    ? resolvedRenderEngine.getDimensions().width
    : typeof legacyEngineContext?.width === "function"
      ? legacyEngineContext.width()
      : 640;

  let isSystemVisible = true;

  if (resolvedRenderEngine) {
    const worldContainer = resolveWorldRenderContainer(resolvedRenderEngine);
    const godRays: { node: IGraphicsNode; profile: RayGeometryProfile; data: GodRayData }[] = [];
    const caustics: { node: IGraphicsNode; data: CausticData }[] = [];

    for (let index = 0; index < rayCount; index++) {
      const baseWidth = calculateGodRayWidth(index);
      const baseAngleDeg = -18 + index * 2.6;
      const profile = createVolumetricRayProfile(baseWidth);

      const graphicsNode = resolvedRenderEngine.createGraphics("god_ray");
      drawVolumetricRay(graphicsNode, profile, [120, 195, 235]);
      graphicsNode.setPosition(0, GAME_CONFIG.SEA_LEVEL);
      graphicsNode.setRotation((baseAngleDeg * Math.PI) / 180);
      graphicsNode.setOpacity(0.04);
      graphicsNode.setZIndex(-2);
      worldContainer.addChild(graphicsNode);

      godRays.push({
        node: graphicsNode,
        profile,
        data: {
          baseXOffset: -60 + index * (screenWidth / (rayCount - 1) + 10),
          pulseSpeed: 0.6 + (index % 5) * 0.2,
          pulsePhase: index * 0.85,
          angleOffsetDeg: baseAngleDeg,
        },
      });
    }

    const causticWidth = screenWidth / causticSegments + 10;
    for (let c = 0; c < causticSegments; c++) {
      const g = resolvedRenderEngine.createGraphics("caustic_surface");
      g.drawRoundedRect(0, 0, causticWidth, 4, 2, {
        fill: { color: [220, 245, 255], alpha: 1 },
      });
      g.setPosition(c * (screenWidth / causticSegments), GAME_CONFIG.SEA_LEVEL + 2);
      g.setOpacity(0.1);
      g.setZIndex(1);
      worldContainer.addChild(g);

      caustics.push({ node: g, data: { index: c } });
    }

    const cullingManager = getSpatialCullingManager();
    if (cullingManager) {
      cullingManager.registerSubsystem({
        id: "light_rays_system",
        getBounds: () => ({ minX: 0, maxX: 30000 }),
        setVisible: (visible: boolean) => {
          isSystemVisible = visible;
          for (let index = 0; index < godRays.length; index++) {
            godRays[index].node.setVisible(visible);
          }
          for (let index = 0; index < caustics.length; index++) {
            caustics[index].node.setVisible(visible);
          }
        },
      });
    }

    let time = 0;
    let lastColor: readonly [number, number, number] | null = null;

    resolvedRenderEngine.getTicker().add((deltaTimeInSeconds: number) => {
      if (!isSystemVisible) return;
      time += deltaTimeInSeconds;

      const cameraXPosition = resolveCameraX(resolvedRenderEngine);
      const screenLeft = cameraXPosition - screenWidth / 2;
      const atmospheric = resolveBiomeLightColor(cameraXPosition);

      if (lastColor !== atmospheric.rayColor) {
        lastColor = atmospheric.rayColor;
        for (let index = 0; index < godRays.length; index++) {
          const { node, profile } = godRays[index];
          node.clear();
          drawVolumetricRay(node, profile, atmospheric.rayColor);
        }
      }

      for (let index = 0; index < godRays.length; index++) {
        const { node, data } = godRays[index];
        const sway = Math.sin(time * data.pulseSpeed + data.pulsePhase);
        const angleSwayInDegrees = Math.cos(time * 0.6 + data.pulsePhase) * 4;

        node.setPosition(screenLeft + data.baseXOffset + sway * 25, GAME_CONFIG.SEA_LEVEL);
        node.setRotation(((data.angleOffsetDeg + angleSwayInDegrees) * Math.PI) / 180);

        const pulseOpacity = (0.75 + sway * 0.25) * atmospheric.lightFactor;
        node.setOpacity(Math.max(0.015, Math.min(0.06, pulseOpacity)));
      }

      for (let index = 0; index < caustics.length; index++) {
        const { node, data } = caustics[index];
        const offsetC = data.index * (screenWidth / causticSegments);
        const yPos = GAME_CONFIG.SEA_LEVEL + 4 + Math.sin(time * 2.5 + data.index * 1.2) * 5;
        node.setPosition(screenLeft + offsetC, yPos);
        const opacity =
          (0.1 + Math.sin(time * 3.0 + data.index * 0.8) * 0.06) * (atmospheric.lightFactor * 4.0);
        node.setOpacity(opacity);
      }
    });
  } else {
    // Modo Legacy Kaboom Bridge
    const legacyCtx = legacyEngineContext as LegacyLightRaysEngineContext;
    const godRays: LegacyRayGroup[] = [];

    for (let index = 0; index < rayCount; index++) {
      const baseWidth = calculateGodRayWidth(index);
      const baseAngleDeg = -18 + index * 2.6;
      const profile = createVolumetricRayProfile(baseWidth);
      const segmentObjects: LegacyRaySegment[] = [];

      for (let s = 0; s < profile.segments.length; s++) {
        const segment = profile.segments[s];
        const rawVertices = getRaySegmentPolygonVertices(segment);
        const points =
          typeof legacyCtx.vec2 === "function"
            ? rawVertices.map((vertex) => legacyCtx.vec2!(vertex.x, vertex.y))
            : rawVertices;

        const segmentObj = legacyCtx.add([
          legacyCtx.polygon(points),
          legacyCtx.pos(0, GAME_CONFIG.SEA_LEVEL),
          legacyCtx.color(120, 195, 235),
          legacyCtx.opacity(0.04 * segment.relativeAlpha),
          legacyCtx.z(-2),
          "god_ray_segment",
        ]) as unknown as LegacyLightObj;

        if (typeof segmentObj.angle === "number") {
          segmentObj.angle = baseAngleDeg;
        }

        segmentObjects.push({
          obj: segmentObj,
          relativeAlpha: segment.relativeAlpha,
        });
      }

      godRays.push({
        segments: segmentObjects,
        baseXOffset: -60 + index * (screenWidth / (rayCount - 1) + 10),
        pulseSpeed: 0.6 + (index % 5) * 0.2,
        pulsePhase: index * 0.85,
        angleOffsetDeg: baseAngleDeg,
      });
    }

    const caustics: (LegacyLightObj & { readonly index: number })[] = [];
    const causticWidth = screenWidth / causticSegments + 10;

    for (let c = 0; c < causticSegments; c++) {
      const caustic = legacyCtx.add([
        legacyCtx.rect(causticWidth, 4, { radius: 2 }),
        legacyCtx.pos(c * (screenWidth / causticSegments), GAME_CONFIG.SEA_LEVEL + 2),
        legacyCtx.color(220, 245, 255),
        legacyCtx.opacity(0.1),
        legacyCtx.z(1),
        "caustic_surface",
        {
          index: c,
        },
      ]) as unknown as LegacyLightObj & { readonly index: number };
      caustics.push(caustic);
    }

    const cullingManager = getSpatialCullingManager();
    if (cullingManager) {
      cullingManager.registerSubsystem({
        id: "light_rays_system",
        getBounds: () => ({ minX: 0, maxX: 30000 }),
        setVisible: (visible: boolean) => {
          isSystemVisible = visible;
          for (let index = 0; index < godRays.length; index++) {
            const segments = godRays[index].segments;
            for (let s = 0; s < segments.length; s++) {
              segments[s].obj.hidden = !visible;
            }
          }
          for (let index = 0; index < caustics.length; index++) {
            caustics[index].hidden = !visible;
          }
        },
      });
    }

    let time = 0;
    let lastRayColorKey: string | null = null;

    legacyCtx.onUpdate(() => {
      if (!isSystemVisible) return;
      time += legacyCtx.dt();
      const cameraXPosition = legacyCtx.camPos ? legacyCtx.camPos().x : 0;
      const screenLeft = cameraXPosition - screenWidth / 2;
      const atmospheric = resolveBiomeLightColor(cameraXPosition);

      const colorKey = `${atmospheric.rayColor[0]}_${atmospheric.rayColor[1]}_${atmospheric.rayColor[2]}`;
      if (colorKey !== lastRayColorKey) {
        lastRayColorKey = colorKey;
        const resolvedColor =
          typeof legacyCtx.rgb === "function"
            ? legacyCtx.rgb(
                atmospheric.rayColor[0],
                atmospheric.rayColor[1],
                atmospheric.rayColor[2]
              )
            : atmospheric.rayColor;

        for (let index = 0; index < godRays.length; index++) {
          const segments = godRays[index].segments;
          for (let s = 0; s < segments.length; s++) {
            segments[s].obj.color = resolvedColor;
          }
        }
        for (let index = 0; index < caustics.length; index++) {
          caustics[index].color = resolvedColor;
        }
      }

      for (let index = 0; index < godRays.length; index++) {
        const ray = godRays[index];
        const sway = Math.sin(time * ray.pulseSpeed + ray.pulsePhase);
        const angleSway = Math.cos(time * 0.6 + ray.pulsePhase) * 4;
        const currentX = screenLeft + ray.baseXOffset + sway * 25;
        const currentAngle = ray.angleOffsetDeg + angleSway;
        const pulseOpacity = (0.75 + sway * 0.25) * atmospheric.lightFactor;
        const baseOpacity = Math.max(0.015, Math.min(0.06, pulseOpacity));

        const segments = ray.segments;
        for (let s = 0; s < segments.length; s++) {
          const seg = segments[s];
          seg.obj.pos.x = currentX;
          seg.obj.pos.y = GAME_CONFIG.SEA_LEVEL;
          seg.obj.angle = currentAngle;
          seg.obj.opacity = baseOpacity * seg.relativeAlpha;
        }
      }

      for (let index = 0; index < caustics.length; index++) {
        const c = caustics[index];
        const offsetC = c.index * (screenWidth / causticSegments);
        c.pos.x = screenLeft + offsetC;
        c.pos.y = GAME_CONFIG.SEA_LEVEL + 4 + Math.sin(time * 2.5 + c.index * 1.2) * 5;
        c.opacity =
          (0.1 + Math.sin(time * 3.0 + c.index * 0.8) * 0.06) * (atmospheric.lightFactor * 4.0);
      }
    });
  }
}

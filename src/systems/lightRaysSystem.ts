/**
 * Sistema de Iluminação Subaquática: God Rays & Cáusticos — Micro Splash
 *
 * Refatorado para o Adapter Pattern (PixiJS v8 / Micro Splash Engine).
 * Desacoplado do Kaboom.js, com tipagem estrita de IRenderEngine e IRenderNode.
 */

import { GAME_CONFIG } from "../config";
import { getSpatialCullingManager } from "./spatialCullingSystem";
import type { IRenderEngine, IGraphicsNode } from "../engine/contracts/INTERFACE_CONTRACTS";
import {
  isRenderEngine,
  resolveCameraX,
  type LegacyEngineBridge,
} from "../engine/adapters/LegacyBridge";

/**
 * Calcula a largura volumétrica do feixe solar (Fase 30.4: 8px a 18px).
 */
export function calculateGodRayWidth(rayIndex: number): number {
  return 8 + (rayIndex % 4) * 3.2;
}

interface GodRayData {
  baseWidth: number;
  baseXOffset: number;
  pulseSpeed: number;
  pulsePhase: number;
  angleOffsetDeg: number;
}

interface CausticData {
  index: number;
}

interface LegacyLightObj {
  pos: { x: number; y: number };
  angle?: number;
  color?: unknown;
  opacity?: number;
  hidden?: boolean;
}

/**
 * Sistema de Iluminação Subaquática: God Rays (Feixes Volumétricos) & Cáusticos de Superfície
 * Traz atmosfera cinematográfica e sensação de profundidade através da luz solar filtrada na água.
 */
export function setupLightRaysSystem(engineOrContext: IRenderEngine | LegacyEngineBridge): void {
  const isPixi = isRenderEngine(engineOrContext);
  const rayCount = 15;
  const causticSegments = 10;
  const screenW = isPixi
    ? engineOrContext.getDimensions().width
    : typeof engineOrContext.width === "function"
      ? engineOrContext.width()
      : 640;

  let isSystemVisible = true;

  if (isPixi) {
    const stageRoot = engineOrContext.getStageRoot();
    const godRays: { node: IGraphicsNode; data: GodRayData }[] = [];
    const caustics: { node: IGraphicsNode; data: CausticData }[] = [];

    for (let i = 0; i < rayCount; i++) {
      const baseWidth = calculateGodRayWidth(i);
      const baseAngleDeg = -18 + i * 2.6;

      const g = engineOrContext.createGraphics("god_ray");
      g.drawRect(-baseWidth / 2, 0, baseWidth, 420, {
        fill: { color: [210, 245, 255], alpha: 1 },
      });
      g.setPosition(0, GAME_CONFIG.SEA_LEVEL);
      g.setRotation((baseAngleDeg * Math.PI) / 180);
      g.setOpacity(0.05);
      g.setZIndex(-2);
      stageRoot.addChild(g);

      godRays.push({
        node: g,
        data: {
          baseWidth,
          baseXOffset: -60 + i * (screenW / (rayCount - 1) + 10),
          pulseSpeed: 0.6 + (i % 5) * 0.2,
          pulsePhase: i * 0.85,
          angleOffsetDeg: baseAngleDeg,
        },
      });
    }

    const causticWidth = screenW / causticSegments + 10;
    for (let c = 0; c < causticSegments; c++) {
      const g = engineOrContext.createGraphics("caustic_surface");
      g.drawRoundedRect(0, 0, causticWidth, 4, 2, {
        fill: { color: [240, 255, 255], alpha: 1 },
      });
      g.setPosition(c * (screenW / causticSegments), GAME_CONFIG.SEA_LEVEL + 2);
      g.setOpacity(0.12);
      g.setZIndex(1);
      stageRoot.addChild(g);

      caustics.push({ node: g, data: { index: c } });
    }

    const cullingManager = getSpatialCullingManager();
    if (cullingManager) {
      cullingManager.registerSubsystem({
        id: "light_rays_system",
        getBounds: () => ({ minX: 0, maxX: 30000 }),
        setVisible: (visible: boolean) => {
          isSystemVisible = visible;
          godRays.forEach((r) => r.node.setVisible(visible));
          caustics.forEach((c) => c.node.setVisible(visible));
        },
      });
    }

    let time = 0;
    let lastColor: readonly [number, number, number] | null = null;
    engineOrContext.getTicker().add((dt: number) => {
      if (!isSystemVisible) return;
      time += dt;

      const camX = resolveCameraX(engineOrContext);
      const screenLeft = camX - screenW / 2;

      let biomeLightFactor = 0.05;
      let rayColor: readonly [number, number, number] = [190, 230, 255];

      if (camX < 5000) {
        biomeLightFactor = 0.035;
        rayColor = [160, 210, 255];
      } else if (camX < 12000) {
        biomeLightFactor = 0.055;
        rayColor = [180, 230, 255];
      } else if (camX < 19000) {
        biomeLightFactor = 0.045;
        rayColor = [180, 220, 210];
      } else {
        biomeLightFactor = 0.075;
        rayColor = [255, 250, 210];
      }

      if (lastColor !== rayColor) {
        lastColor = rayColor;
        godRays.forEach(({ node, data }) => {
          node.clear();
          node.drawRect(-data.baseWidth / 2, 0, data.baseWidth, 420, {
            fill: { color: rayColor, alpha: 1 },
          });
        });
      }

      godRays.forEach(({ node, data }) => {
        const sway = Math.sin(time * data.pulseSpeed + data.pulsePhase);
        const angleSwayDeg = Math.cos(time * 0.6 + data.pulsePhase) * 4;

        node.setPosition(screenLeft + data.baseXOffset + sway * 25, GAME_CONFIG.SEA_LEVEL);
        node.setRotation(((data.angleOffsetDeg + angleSwayDeg) * Math.PI) / 180);

        const pulseOpacity = (0.8 + sway * 0.2) * biomeLightFactor;
        node.setOpacity(Math.max(0.02, Math.min(0.08, pulseOpacity)));
      });

      caustics.forEach(({ node, data }) => {
        const offsetC = data.index * (screenW / causticSegments);
        const yPos = GAME_CONFIG.SEA_LEVEL + 4 + Math.sin(time * 2.5 + data.index * 1.2) * 5;
        node.setPosition(screenLeft + offsetC, yPos);
        const opacity =
          (0.12 + Math.sin(time * 3.0 + data.index * 0.8) * 0.08) * (biomeLightFactor * 4.5);
        node.setOpacity(opacity);
      });
    });
  } else {
    // Modo Legacy Kaboom Bridge
    const legacyCtx = engineOrContext as LegacyEngineBridge & {
      rect(w: number, h: number, opts?: unknown): unknown;
      pos(x: number, y: number): unknown;
      rotate(a: number): unknown;
      color(c: unknown): unknown;
      rgb(r: number, g: number, b: number): unknown;
      opacity(o: number): unknown;
      anchor(a: string): unknown;
      z(layer: number): unknown;
      camPos?(): { x: number; y: number };
      width(): number;
      dt(): number;
      onUpdate(cb: () => void): void;
    };

    const godRays: (LegacyLightObj & {
      baseXOffset: number;
      pulseSpeed: number;
      pulsePhase: number;
      angleOffset: number;
    })[] = [];

    for (let i = 0; i < rayCount; i++) {
      const baseWidth = calculateGodRayWidth(i);
      const baseAngle = -18 + i * 2.6;

      const ray = legacyCtx.add([
        legacyCtx.rect(baseWidth, 420),
        legacyCtx.pos(0, GAME_CONFIG.SEA_LEVEL),
        legacyCtx.rotate(baseAngle),
        legacyCtx.color(210, 245, 255),
        legacyCtx.opacity(0.05),
        legacyCtx.anchor("top"),
        legacyCtx.z(-2),
        "god_ray",
        {
          baseXOffset: -60 + i * (legacyCtx.width() / (rayCount - 1) + 10),
          pulseSpeed: 0.6 + (i % 5) * 0.2,
          pulsePhase: i * 0.85,
          angleOffset: baseAngle,
        },
      ]) as unknown as LegacyLightObj & {
        baseXOffset: number;
        pulseSpeed: number;
        pulsePhase: number;
        angleOffset: number;
      };

      godRays.push(ray);
    }

    const caustics: (LegacyLightObj & { index: number })[] = [];

    for (let c = 0; c < causticSegments; c++) {
      const caustic = legacyCtx.add([
        legacyCtx.rect(legacyCtx.width() / causticSegments + 10, 4, { radius: 2 }),
        legacyCtx.pos(c * (legacyCtx.width() / causticSegments), GAME_CONFIG.SEA_LEVEL + 2),
        legacyCtx.color(240, 255, 255),
        legacyCtx.opacity(0.12),
        legacyCtx.z(1),
        "caustic_surface",
        {
          index: c,
        },
      ]) as unknown as LegacyLightObj & { index: number };
      caustics.push(caustic);
    }

    const cullingManager = getSpatialCullingManager();
    if (cullingManager) {
      cullingManager.registerSubsystem({
        id: "light_rays_system",
        getBounds: () => ({ minX: 0, maxX: 30000 }),
        setVisible: (visible: boolean) => {
          isSystemVisible = visible;
          godRays.forEach((r) => {
            r.hidden = !visible;
          });
          caustics.forEach((c) => {
            c.hidden = !visible;
          });
        },
      });
    }

    let time = 0;
    legacyCtx.onUpdate(() => {
      if (!isSystemVisible) return;
      time += legacyCtx.dt();
      const camX = legacyCtx.camPos ? legacyCtx.camPos().x : 0;
      const screenLeft = camX - legacyCtx.width() / 2;

      let biomeLightFactor = 0.05;
      let rayColor =
        typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(190, 230, 255) : [190, 230, 255];

      if (camX < 5000) {
        biomeLightFactor = 0.035;
        rayColor =
          typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(160, 210, 255) : [160, 210, 255];
      } else if (camX < 12000) {
        biomeLightFactor = 0.055;
        rayColor =
          typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(180, 230, 255) : [180, 230, 255];
      } else if (camX < 19000) {
        biomeLightFactor = 0.045;
        rayColor =
          typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(180, 220, 210) : [180, 220, 210];
      } else {
        biomeLightFactor = 0.075;
        rayColor =
          typeof legacyCtx.rgb === "function" ? legacyCtx.rgb(255, 250, 210) : [255, 250, 210];
      }

      godRays.forEach((ray) => {
        const sway = Math.sin(time * ray.pulseSpeed + ray.pulsePhase);
        const angleSway = Math.cos(time * 0.6 + ray.pulsePhase) * 4;

        ray.pos.x = screenLeft + ray.baseXOffset + sway * 25;
        ray.angle = ray.angleOffset + angleSway;
        ray.color = rayColor;

        const pulseOpacity = (0.8 + sway * 0.2) * biomeLightFactor;
        ray.opacity = Math.max(0.02, Math.min(0.08, pulseOpacity));
      });

      caustics.forEach((c) => {
        const offsetC = c.index * (legacyCtx.width() / causticSegments);
        c.pos.x = screenLeft + offsetC;
        c.pos.y = GAME_CONFIG.SEA_LEVEL + 4 + Math.sin(time * 2.5 + c.index * 1.2) * 5;
        c.opacity = (0.12 + Math.sin(time * 3.0 + c.index * 0.8) * 0.08) * (biomeLightFactor * 4.5);
        c.color = rayColor;
      });
    });
  }
}

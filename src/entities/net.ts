import { GAME_CONFIG, TAGS } from "../config";
import { accessibilitySystem } from "../systems/accessibilitySystem";
import { getRandomFloat } from "../utils/random";
import { getEntityFamilyTicker } from "../systems/entityFamilyTicker";
import {
  registerSonarTarget,
  unregisterSonarTarget,
  type RevealableTarget,
} from "./player/playerSonar";
import { resolveInitializedRenderEngine } from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeCircleNode,
  createNativeRectNode,
  type NativeVisualObjectAdapter,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface NetVector2D {
  x: number;
  y: number;
}

export interface NetGameObject {
  pos: NetVector2D;
  opacity: number;
  hidden: boolean;
  add: (components: unknown[]) => NetGameObject;
  onUpdate: (cb: () => void) => void;
  reveal?: () => void;
}

export interface GhostNetObject extends NetGameObject {
  reveal: () => void;
}

export interface NetEngineContext<TColor = unknown> {
  add: (components: unknown[]) => unknown;
  dt: () => number;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle?: (r: number) => unknown;
  pos: (x: number | NetVector2D, y?: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  opacity: (o: number) => unknown;
  area: () => unknown;
  anchor: (a: "center") => unknown;
  rgb: (r: number, g: number, b: number) => TColor;
  lerp?: (a: number, b: number, t: number) => number;
}

export interface BiomeNetPalette {
  mesh: [number, number, number];
  outline: [number, number, number];
  floats: [number, number, number];
}

/**
 * Retorna paleta de cores contextual para redes fantasmas conforme o bioma (Fase 31.4).
 */
export function getBiomeNetPalette(posX: number, isHighContrast = false): BiomeNetPalette {
  if (isHighContrast) {
    return {
      mesh: [210, 100, 255],
      outline: [255, 255, 255],
      floats: [255, 240, 50],
    };
  }

  if (posX < 5000) {
    // 1. Antártica: redes verde-cinza glacial polar
    return {
      mesh: [90, 145, 135],
      outline: [60, 110, 100],
      floats: [130, 175, 170],
    };
  }
  if (posX < 12000) {
    // 2. Travessia Pelágica: azul/ciano oceânico e boias alaranjadas
    return {
      mesh: [65, 170, 195],
      outline: [40, 120, 145],
      floats: [240, 110, 50],
    };
  }
  if (posX < 25000) {
    // 3. Costa Urbana e Cânions: malha oliva industrial e boias amarelo-alerta
    return {
      mesh: [75, 125, 95],
      outline: [55, 80, 70],
      floats: [245, 190, 40],
    };
  }
  // 4. Santuário de Arraial: turquesa vivo e boias coral
  return {
    mesh: [40, 210, 185],
    outline: [25, 150, 130],
    floats: [255, 120, 80],
  };
}

export function createGhostNet<TColor = unknown>(
  k: NetEngineContext<TColor>,
  position: NetVector2D
): GhostNetObject {
  let revealTimer = 0;
  const isHighContrast = accessibilitySystem.isHighContrast();
  // Totalmente invisível a olho nu sem sonar (rede fantasma), mantendo acessibilidade em alto contraste
  const baseOpacity = isHighContrast ? 0.35 : 0.0;
  const palette = getBiomeNetPalette(position.x, isHighContrast);

  const netW = 38;
  const netH = 52;
  const gridLines: NetGameObject[] = [];
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  let net: GhostNetObject;
  let nativeNetAdapter: NativeVisualObjectAdapter | null = null;

  const activateReveal = () => {
    revealTimer = GAME_CONFIG.SONAR_REVEAL_DURATION;
    net.hidden = false;
  };

  if (resolvedNativeRenderEngine) {
    const worldRenderContainer = resolveWorldRenderContainer(resolvedNativeRenderEngine);
    nativeNetAdapter = createNativeRectNode(k, resolvedNativeRenderEngine, worldRenderContainer, {
      identifier: "ghost_net_body",
      width: netW,
      height: netH,
      cornerRadius: 2,
      positionX: position.x,
      positionY: position.y,
      fillColor: palette.mesh,
      outlineColor: palette.outline,
      outlineWidth: isHighContrast ? 2.5 : 1.5,
      opacity: baseOpacity,
      anchor: "center",
      visible: isHighContrast,
      tags: [TAGS.NET],
      onReveal: activateReveal,
    });
    const netRenderNode = nativeNetAdapter.getRenderNode();

    gridLines.push(
      createNativeRectNode(k, resolvedNativeRenderEngine, netRenderNode, {
        identifier: "ghost_net_top_cable",
        width: netW + 4,
        height: 2,
        positionX: 0,
        positionY: -netH / 2,
        fillColor: palette.mesh,
        opacity: baseOpacity,
        anchor: "center",
      }) as unknown as NetGameObject
    );
    for (let floatIndex = 0; floatIndex < 4; floatIndex++) {
      gridLines.push(
        createNativeRectNode(k, resolvedNativeRenderEngine, netRenderNode, {
          identifier: `ghost_net_float_${floatIndex}`,
          width: 6,
          height: 4,
          cornerRadius: 2,
          positionX: -netW / 2 + 5 + floatIndex * 9.5,
          positionY: -netH / 2 - 2,
          fillColor: palette.floats,
          opacity: baseOpacity,
          anchor: "center",
        }) as unknown as NetGameObject
      );
    }
    for (let verticalIndex = 1; verticalIndex <= 3; verticalIndex++) {
      gridLines.push(
        createNativeRectNode(k, resolvedNativeRenderEngine, netRenderNode, {
          identifier: `ghost_net_v_line_${verticalIndex}`,
          width: 1.2,
          height: netH,
          positionX: -netW / 2 + verticalIndex * (netW / 4),
          positionY: 0,
          fillColor: palette.mesh,
          opacity: baseOpacity,
          anchor: "center",
        }) as unknown as NetGameObject
      );
    }
    for (let horizontalIndex = 1; horizontalIndex <= 5; horizontalIndex++) {
      gridLines.push(
        createNativeRectNode(k, resolvedNativeRenderEngine, netRenderNode, {
          identifier: `ghost_net_h_line_${horizontalIndex}`,
          width: netW,
          height: 1.2,
          positionX: 0,
          positionY: -netH / 2 + horizontalIndex * (netH / 6),
          fillColor: palette.mesh,
          opacity: baseOpacity,
          anchor: "center",
        }) as unknown as NetGameObject
      );
    }
    for (let verticalIndex = 1; verticalIndex <= 3; verticalIndex++) {
      for (let horizontalIndex = 1; horizontalIndex <= 5; horizontalIndex++) {
        gridLines.push(
          createNativeCircleNode(k, resolvedNativeRenderEngine, netRenderNode, {
            identifier: `ghost_net_knot_${verticalIndex}_${horizontalIndex}`,
            radius: 0.9,
            positionX: -netW / 2 + verticalIndex * (netW / 4),
            positionY: -netH / 2 + horizontalIndex * (netH / 6),
            fillColor: palette.mesh,
            opacity: baseOpacity,
            anchor: "center",
          }) as unknown as NetGameObject
        );
      }
    }

    net = nativeNetAdapter as unknown as GhostNetObject;
    registerSonarTarget(net as unknown as RevealableTarget);
    nativeNetAdapter.onDestroy(() => {
      unregisterSonarTarget(net as unknown as RevealableTarget);
    });
  } else {
    // Fundo semi-transparente da rede (corpo principal legado)
    net = k.add([
      k.rect(netW, netH, { radius: 2 }),
      k.pos(position),
      k.color(palette.mesh[0], palette.mesh[1], palette.mesh[2]),
      k.outline(
        isHighContrast ? 2.5 : 1.5,
        k.rgb(palette.outline[0], palette.outline[1], palette.outline[2])
      ),
      k.opacity(baseOpacity),
      k.area(),
      k.anchor("center"),
      TAGS.NET,
      {
        reveal() {
          activateReveal();
        },
      },
    ]) as GhostNetObject;

    net.hidden = !isHighContrast;

    // Grade visual: malha monofilamento autêntica (linhas verticais e horizontais, nós e boias)
    const lineColor = k.rgb(palette.mesh[0], palette.mesh[1], palette.mesh[2]);
    const floatColor = k.rgb(palette.floats[0], palette.floats[1], palette.floats[2]);

    const topCable = net.add([
      k.rect(netW + 4, 2),
      k.pos(0, -netH / 2),
      k.color(lineColor),
      k.opacity(baseOpacity),
      k.anchor("center"),
    ]) as NetGameObject;
    gridLines.push(topCable);

    for (let b = 0; b < 4; b++) {
      const floatObj = net.add([
        k.rect(6, 4, { radius: 2 }),
        k.pos(-netW / 2 + 5 + b * 9.5, -netH / 2 - 2),
        k.color(floatColor),
        k.opacity(baseOpacity),
        k.anchor("center"),
      ]) as NetGameObject;
      gridLines.push(floatObj);
    }

    for (let v = 1; v <= 3; v++) {
      const line = net.add([
        k.rect(1.2, netH),
        k.pos(-netW / 2 + v * (netW / 4), 0),
        k.color(lineColor),
        k.opacity(baseOpacity),
        k.anchor("center"),
      ]) as NetGameObject;
      gridLines.push(line);
    }

    for (let h = 1; h <= 5; h++) {
      const line = net.add([
        k.rect(netW, 1.2),
        k.pos(0, -netH / 2 + h * (netH / 6)),
        k.color(lineColor),
        k.opacity(baseOpacity),
        k.anchor("center"),
      ]) as NetGameObject;
      gridLines.push(line);
    }

    for (let v = 1; v <= 3; v++) {
      for (let h = 1; h <= 5; h++) {
        const knotComp = typeof k.circle === "function" ? k.circle(0.9) : k.rect(1.8, 1.8);
        const knot = net.add([
          knotComp,
          k.pos(-netW / 2 + v * (netW / 4), -netH / 2 + h * (netH / 6)),
          k.color(lineColor),
          k.opacity(baseOpacity),
          k.anchor("center"),
        ]) as NetGameObject;
        gridLines.push(knot);
      }
    }
  }

  const baseY = position.y;
  let time = getRandomFloat(0, 10);

  const updateGhostNet = (deltaTime: number) => {
    time += deltaTime;
    net.pos.y = baseY + Math.sin(time * 1.8) * 5; // Balanço suave senoidal

    if (revealTimer > 0) {
      revealTimer -= deltaTime;
      net.hidden = false;
      const revealProgress = Math.min(1, revealTimer / 1.5);
      const currentOpacity =
        typeof k.lerp === "function"
          ? k.lerp(baseOpacity, 0.88, revealProgress)
          : baseOpacity + (0.88 - baseOpacity) * revealProgress;
      net.opacity = currentOpacity;
      for (const line of gridLines) {
        line.opacity = currentOpacity;
      }
    } else {
      net.hidden = !isHighContrast;
      net.opacity = baseOpacity;
      for (const line of gridLines) {
        line.opacity = baseOpacity;
      }
    }
  };

  const familyTicker = getEntityFamilyTicker();
  if (familyTicker) {
    familyTicker.registerEntity({
      id: `net_${Math.round(position.x)}_${Math.round(position.y)}_${Math.round(Math.random() * 100000)}`,
      family: "net",
      getXPosition: () => net.pos.x,
      width: 40,
      targetObject: net,
      update: updateGhostNet,
    });
  } else if (nativeNetAdapter) {
    nativeNetAdapter.onUpdate((deltaTimeInSeconds: number) => {
      if (nativeNetAdapter.hidden && revealTimer <= 0) return;
      updateGhostNet(deltaTimeInSeconds);
    });
  } else {
    net.onUpdate(() => {
      const rawNet = net as unknown as { hidden?: boolean; isVisible?: () => boolean };
      const isCulled =
        rawNet.hidden === true || (typeof rawNet.isVisible === "function" && !rawNet.isVisible());
      if (isCulled && revealTimer <= 0) return;
      updateGhostNet(k.dt());
    });
  }

  return net;
}

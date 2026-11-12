import { GAME_CONFIG, TAGS } from "../config";
import { createKrill } from "../entities/krill";
import type { PlayerController } from "../entities/player";
import { safeShake } from "../utils/camera";
import { getRandomFloat } from "../utils/random";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveWorldRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeContainerNode,
  createNativeRectNode,
  registerNativeSceneUpdate,
} from "../engine/adapters/NativeRenderNodeFactory";

/**
 * Calcula o impulso vertical da ressurgência sobre a baleia com trava de superfície.
 * Se a baleia estiver a menos de UPWELLING_SURFACE_LOCK_DISTANCE abaixo da linha d'água
 * (SEA_LEVEL), qualquer componente ascendente (forceY < 0) é zerado: o salto para fora
 * d'água só ocorre pela velocidade própria do jogador.
 */
export function computeUpwellingVerticalForce(
  playerY: number,
  forceY: number = GAME_CONFIG.UPWELLING_COLLISION_FORCE_Y
): number {
  const lockLimitY = GAME_CONFIG.SEA_LEVEL + GAME_CONFIG.UPWELLING_SURFACE_LOCK_DISTANCE;
  if (forceY < 0 && playerY <= lockLimitY) return 0;
  return forceY;
}

export interface UpwellingVector2D {
  x: number;
  y: number;
}

export interface UpwellingGameObject<TColor = unknown> {
  pos: UpwellingVector2D;
  opacity?: number;
  add: (components: unknown[]) => UpwellingGameObject<TColor>;
  onUpdate: (cb: () => void) => void;
  exists?: () => boolean;
  destroy?: () => void;
}

export interface UpwellingEngineContext<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = UpwellingVector2D,
> {
  add: (components: unknown[]) => unknown;
  destroy: (obj: TDestroyable) => void;
  dt: () => number;
  height: () => number;
  onUpdate: (cb: () => void) => void;
  onCollideUpdate: (
    tag1: string,
    tag2: string,
    cb: (obj1: unknown, obj2: unknown) => void
  ) => unknown;
  rect: (w: number, h: number, opt?: { radius?: number }) => unknown;
  circle: (r: number) => unknown;
  scale: (s: number | UpwellingVector2D) => unknown;
  pos: (x: number | UpwellingVector2D, y?: number) => unknown;
  color: (r: number | TColor, g?: number, b?: number) => unknown;
  opacity: (o: number) => unknown;
  outline: (w: number, col: TColor) => unknown;
  rotate: (angle: number) => unknown;
  area: (opt?: { scale?: TVec }) => unknown;
  anchor: (a: "center") => unknown;
  z: (v: number) => unknown;
  rand: (min: number, max: number) => number;
  choose: <T>(arr: T[]) => T;
  rgb: (r: number, g: number, b: number) => TColor;
  vec2: (x: number, y: number) => TVec;
  clamp: (val: number, min: number, max: number) => number;
  shake?: (amount: number) => void;
  onSceneLeave?: (callback: () => void) => unknown;
}

export function createUpwellingStream<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = UpwellingVector2D,
>(
  k: IRenderEngine | UpwellingEngineContext<TDestroyable, TColor, TVec>,
  spawnXPosition: number,
  spawnYPosition: number
) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const nativeWorldContainer = resolvedNativeRenderEngine
    ? resolveWorldRenderContainer(resolvedNativeRenderEngine)
    : null;
  const legacyContext = k as UpwellingEngineContext<TDestroyable, TColor, TVec>;

  const getDeltaTime = (): number => {
    if (typeof legacyContext.dt === "function") {
      return legacyContext.dt();
    }
    return resolvedNativeRenderEngine
      ? resolvedNativeRenderEngine.getTicker().getDeltaTime()
      : 0.016;
  };

  let upwellingStream: UpwellingGameObject<TColor>;
  const strands: UpwellingGameObject<TColor>[] = [];
  const strandCount = 6;

  if (resolvedNativeRenderEngine && nativeWorldContainer) {
    const streamContainerNode = createNativeContainerNode(
      k,
      resolvedNativeRenderEngine,
      nativeWorldContainer,
      {
        identifier: "upwelling_stream_parent",
        positionX: spawnXPosition,
        positionY: spawnYPosition,
        rotationDegrees: -25,
        zIndex: -1,
        tags: [TAGS.UPWELLING_STREAM, "upwelling_stream_parent"],
      }
    );

    for (let strandIndex = 0; strandIndex < strandCount; strandIndex++) {
      const strandOffsetX = (strandIndex - (strandCount - 1) / 2) * 5.5;
      const strandAngle = (strandIndex - (strandCount - 1) / 2) * 2.2;

      const baseSegment = createNativeRectNode(
        k,
        resolvedNativeRenderEngine,
        streamContainerNode.renderNode,
        {
          identifier: "upwelling_strand_base",
          width: 4,
          height: 30,
          cornerRadius: 2,
          positionX: strandOffsetX,
          positionY: 20,
          fillColor: [0, 210, 255],
          opacity: 0.55,
          rotationDegrees: strandAngle,
          anchor: "center",
        }
      );

      const middleSegment = createNativeRectNode(
        k,
        resolvedNativeRenderEngine,
        streamContainerNode.renderNode,
        {
          identifier: "upwelling_strand_mid",
          width: 3.5,
          height: 30,
          cornerRadius: 1.5,
          positionX: strandOffsetX + strandAngle * 0.4,
          positionY: -8,
          fillColor: [60, 225, 255],
          opacity: 0.35,
          rotationDegrees: strandAngle,
          anchor: "center",
        }
      );

      const topSegment = createNativeRectNode(
        k,
        resolvedNativeRenderEngine,
        streamContainerNode.renderNode,
        {
          identifier: "upwelling_strand_top",
          width: 3,
          height: 25,
          cornerRadius: 1.5,
          positionX: strandOffsetX + strandAngle * 0.8,
          positionY: -34,
          fillColor: [160, 245, 255],
          opacity: 0.18,
          rotationDegrees: strandAngle,
          anchor: "center",
        }
      );

      strands.push(
        baseSegment as unknown as UpwellingGameObject<TColor>,
        middleSegment as unknown as UpwellingGameObject<TColor>,
        topSegment as unknown as UpwellingGameObject<TColor>
      );
    }

    upwellingStream = streamContainerNode as unknown as UpwellingGameObject<TColor>;
  } else {
    upwellingStream = legacyContext.add([
      legacyContext.rect(36, 84),
      legacyContext.pos(spawnXPosition, spawnYPosition),
      legacyContext.color(0, 220, 255),
      legacyContext.opacity(0),
      legacyContext.rotate(-25), // 25º de inclinação ascendente
      legacyContext.area({ scale: legacyContext.vec2(4, 10) }),
      legacyContext.anchor("center"),
      legacyContext.z(-1),
      TAGS.UPWELLING_STREAM,
      "upwelling_stream_parent",
    ]) as UpwellingGameObject<TColor>;

    for (let strandIndex = 0; strandIndex < strandCount; strandIndex++) {
      const strandOffsetX = (strandIndex - (strandCount - 1) / 2) * 5.5;
      const strandAngle = (strandIndex - (strandCount - 1) / 2) * 2.2;

      const baseSegment = upwellingStream.add([
        legacyContext.rect(4, 30, { radius: 2 }),
        legacyContext.pos(strandOffsetX, 20),
        legacyContext.color(0, 210, 255),
        legacyContext.opacity(0.55),
        legacyContext.rotate(strandAngle),
        legacyContext.anchor("center"),
        "upwelling_strand_base",
      ]);

      const middleSegment = upwellingStream.add([
        legacyContext.rect(3.5, 30, { radius: 1.5 }),
        legacyContext.pos(strandOffsetX + strandAngle * 0.4, -8),
        legacyContext.color(60, 225, 255),
        legacyContext.opacity(0.35),
        legacyContext.rotate(strandAngle),
        legacyContext.anchor("center"),
        "upwelling_strand_mid",
      ]);

      const topSegment = upwellingStream.add([
        legacyContext.rect(3, 25, { radius: 1.5 }),
        legacyContext.pos(strandOffsetX + strandAngle * 0.8, -34),
        legacyContext.color(160, 245, 255),
        legacyContext.opacity(0.18),
        legacyContext.rotate(strandAngle),
        legacyContext.anchor("center"),
        "upwelling_strand_top",
      ]);

      strands.push(baseSegment, middleSegment, topSegment);
    }
  }

  let streamTime = 0;
  let streamLifetime = 1.0;
  upwellingStream.onUpdate(() => {
    const deltaTime = getDeltaTime();
    streamTime += deltaTime;
    // move jato diagonalmente para direita e para cima
    upwellingStream.pos.x += deltaTime * GAME_CONFIG.UPWELLING_PUSH_X;
    upwellingStream.pos.y += deltaTime * GAME_CONFIG.UPWELLING_PUSH_Y;
    upwellingStream.pos.x += Math.sin(streamTime * 4) * 0.8; // oscilação orgânica

    streamLifetime -= deltaTime * 0.25;
    for (let strandIndex = 0; strandIndex < strands.length; strandIndex++) {
      const strand = strands[strandIndex];
      if (strand.opacity !== undefined) {
        strand.opacity = Math.max(0, strand.opacity - deltaTime * 0.12);
      }
    }
    if (upwellingStream.pos.y <= -50 || streamLifetime <= 0) {
      if (resolvedNativeRenderEngine && typeof upwellingStream.destroy === "function") {
        upwellingStream.destroy();
      } else {
        legacyContext.destroy(upwellingStream as unknown as TDestroyable);
      }
    }
  });

  return { upwellingStream, strands };
}

export function setupUpwellingSystem<
  TDestroyable = unknown,
  TColor = unknown,
  TVec extends { x: number; y: number } = UpwellingVector2D,
>(
  k: IRenderEngine | UpwellingEngineContext<TDestroyable, TColor, TVec>,
  playerController: PlayerController
) {
  const resolvedNativeRenderEngine = resolveInitializedRenderEngine(k);
  const legacyContext = k as UpwellingEngineContext<TDestroyable, TColor, TVec>;
  const activeStreams: Array<UpwellingGameObject<TColor>> = [];

  const getDeltaTime = (): number => {
    if (typeof legacyContext.dt === "function") {
      return legacyContext.dt();
    }
    return resolvedNativeRenderEngine
      ? resolvedNativeRenderEngine.getTicker().getDeltaTime()
      : 0.016;
  };

  const getViewportHeight = (): number => {
    if (resolvedNativeRenderEngine) {
      return resolvedNativeRenderEngine.getDimensions().height;
    }
    return legacyContext.height();
  };

  const clampValue = (value: number, min: number, max: number): number => {
    return typeof legacyContext.clamp === "function"
      ? legacyContext.clamp(value, min, max)
      : Math.max(min, Math.min(max, value));
  };

  const createVelocityVector = (
    x: number,
    y: number
  ): Parameters<PlayerController["setSpeed"]>[0] => {
    if (typeof legacyContext.vec2 === "function") {
      return legacyContext.vec2(x, y) as unknown as Parameters<PlayerController["setSpeed"]>[0];
    }
    return {
      x,
      y,
      len: () => Math.hypot(x, y),
      scale: (factor: number) => createVelocityVector(x * factor, y * factor),
    } as unknown as Parameters<PlayerController["setSpeed"]>[0];
  };

  const applyUpwellingImpulseToPlayer = (): void => {
    const currentVelocity = playerController.getSpeed();
    playerController.setSpeed(
      createVelocityVector(
        clampValue(currentVelocity.x + 10, -GAME_CONFIG.MAX_SPEED, GAME_CONFIG.MAX_SPEED),
        clampValue(
          currentVelocity.y + computeUpwellingVerticalForce(playerController.gameObj.pos.y),
          -GAME_CONFIG.MAX_SPEED,
          GAME_CONFIG.MAX_SPEED
        )
      )
    );
  };

  let upwellingTimer = 0;
  let isUpwellingActive = false;
  let upwellingEventTimer = 0;
  let eventOriginXPosition = 0;

  const updateUpwelling = (deltaTime: number) => {
    // só produz ressurgencia se baleia não estiver desmaiando
    if (playerController.isFainting()) return;

    const currentXPosition = playerController.gameObj.pos.x;
    const isInUpwellingZone =
      currentXPosition >= GAME_CONFIG.UPWELLING_ZONE_START &&
      currentXPosition <= GAME_CONFIG.UPWELLING_ZONE_END;

    // se estiver fora da zona de ressurgência (19.000m - 25.000m), reseta timer e não inicia novos eventos
    if (!isInUpwellingZone) {
      upwellingTimer = 0;
      return;
    }

    upwellingTimer += deltaTime;

    // ativa ressurgencia a cada 18 segundos
    if (upwellingTimer >= GAME_CONFIG.UPWELLING_INTERVAL && !isUpwellingActive) {
      isUpwellingActive = true;
      upwellingEventTimer = GAME_CONFIG.UPWELLING_DURATION;
      upwellingTimer = 0;
      eventOriginXPosition = currentXPosition;
      safeShake(legacyContext, 2); // leve tremida na tela com guarda de acessibilidade
    }

    // ativa ressurgencia (4 segundos)
    if (isUpwellingActive) {
      upwellingEventTimer -= deltaTime;
      const normalizedDeltaTime = deltaTime * 60;

      // fluxo de agua ascendente na diagonal para direita independente de taxa de quadros
      if (getRandomFloat(0, 1) < 0.4 * normalizedDeltaTime) {
        const spawnXPosition = eventOriginXPosition + getRandomFloat(-100, 300);
        const spawnYPosition = getViewportHeight() - 40;
        const createdStream = createUpwellingStream(k, spawnXPosition, spawnYPosition);
        activeStreams.push(createdStream.upwellingStream);
      }

      // gera cardume de krill na area independente de taxa de quadros
      if (
        getRandomFloat(0, 1) < 0.005 * normalizedDeltaTime &&
        (resolvedNativeRenderEngine || typeof legacyContext.add === "function")
      ) {
        const krillXPosition = eventOriginXPosition + 300 + getRandomFloat(0, 200);
        const krillYPosition = getViewportHeight() - 100 - getRandomFloat(0, 200);
        createKrill(
          k as unknown as Parameters<typeof createKrill>[0],
          { x: krillXPosition, y: krillYPosition } as unknown as Parameters<typeof createKrill>[1]
        );
      }

      if (upwellingEventTimer <= 0) {
        isUpwellingActive = false;
      }
    }

    // Física nativa no pipeline PixiJS v8: verifica sobreposição AABB direta com os jatos ativos
    if (resolvedNativeRenderEngine && activeStreams.length > 0) {
      const playerPos = playerController.gameObj.pos;
      let hasStreamOverlap = false;
      for (let index = activeStreams.length - 1; index >= 0; index--) {
        const stream = activeStreams[index];
        if (typeof stream.exists === "function" && !stream.exists()) {
          activeStreams.splice(index, 1);
          continue;
        }
        if (
          Math.abs(playerPos.x - stream.pos.x) <= 95 &&
          Math.abs(playerPos.y - stream.pos.y) <= 220
        ) {
          hasStreamOverlap = true;
        }
      }
      if (hasStreamOverlap) {
        applyUpwellingImpulseToPlayer();
      }
    }
  };

  if (resolvedNativeRenderEngine) {
    registerNativeSceneUpdate(k, resolvedNativeRenderEngine, updateUpwelling);
    if (typeof legacyContext.onSceneLeave === "function") {
      legacyContext.onSceneLeave(() => {
        for (let index = 0; index < activeStreams.length; index++) {
          activeStreams[index].destroy?.();
        }
        activeStreams.length = 0;
      });
    }
  } else {
    legacyContext.onUpdate(() => {
      updateUpwelling(getDeltaTime());
    });
    // física: ressurgencia empurra baleia
    legacyContext.onCollideUpdate(TAGS.PLAYER, TAGS.UPWELLING_STREAM, () => {
      applyUpwellingImpulseToPlayer();
    });
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderingContext } from "../../src/engine/adapters/RenderingContextAdapter";
import { SceneManager } from "../../src/engine/SceneManager";
import {
  type IGraphicsNode,
  type IRenderEngine,
  type IRenderNode,
  type IRenderTicker,
  type ISpriteNode,
  type ITextNode,
} from "../../src/engine/contracts/INTERFACE_CONTRACTS";
import { TAGS } from "../../src/config";
import {
  createFishingTrawler,
  createRescueBoat,
  type BoatEngineContext,
} from "../../src/entities/boat";
import {
  createBubbleVent,
  type BubbleVentEngineContext,
  type BubbleVentObj,
} from "../../src/entities/bubbleVent";
import { createKrill, type KrillEngineContext } from "../../src/entities/krill";
import { createGhostNet, type NetEngineContext } from "../../src/entities/net";
import { createTrash, type TrashEngineContext } from "../../src/entities/trash";
import {
  setupPlayerCaustics,
  type PlayerCausticsContext,
  type PlayerCausticsTargetWhale,
} from "../../src/entities/player/playerCaustics";
import {
  spawnBaleenSuction,
  spawnBlowholeSpout,
  spawnDraftingTrail,
  spawnOilSpout,
  spawnPurifyBubbles,
  spawnTailStrokeBubbles,
  spawnTailWaterRipples,
  type PlayerParticlesEngineContext,
} from "../../src/entities/player/playerParticles";
import {
  activeSonarTargets,
  PlayerSonarManager,
  revealEntitiesInSonarRadius,
  type PlayerSonarEngineContext,
  type RevealableTarget,
} from "../../src/entities/player/playerSonar";
import { createCompanionSenses } from "../../src/entities/companion/companionSenses";
import { createCompanionStates } from "../../src/entities/companion/companionStates";
import type { CompanionGameObject } from "../../src/entities/companion/types";
import type { CompanionEngineContext } from "../../src/entities/companion/states/types";
import { setParticlePool } from "../../src/systems/particlePool";

interface NativeEngineHarness {
  renderEngine: IRenderEngine;
  worldContainer: IRenderNode;
  createdGraphicsNodes: IGraphicsNode[];
  advanceFrame: (
    deltaTimeInSeconds: number,
    renderingContext?: { lifecycle?: { runSceneUpdateCallbacks?: (dt: number) => void } }
  ) => void;
}

function createMockRenderNode(identifier: string): IRenderNode {
  const children: IRenderNode[] = [];
  let visibleFlag = true;
  let opacityValue = 1;
  let zIndexValue = 0;
  let rotationRadians = 0;
  let position = { x: 0, y: 0 };
  let scale = { x: 1, y: 1 };

  return {
    id: identifier,
    getPosition: () => position,
    setPosition: vi.fn((x: number, y: number) => {
      position = { x, y };
    }),
    getScale: () => scale,
    setScale: vi.fn((x: number, y: number) => {
      scale = { x, y };
    }),
    getRotation: () => rotationRadians,
    setRotation: vi.fn((angle: number) => {
      rotationRadians = angle;
    }),
    getOpacity: () => opacityValue,
    setOpacity: vi.fn((alpha: number) => {
      opacityValue = alpha;
    }),
    getZIndex: () => zIndexValue,
    setZIndex: vi.fn((index: number) => {
      zIndexValue = index;
    }),
    isVisible: () => visibleFlag,
    setVisible: vi.fn((visible: boolean) => {
      visibleFlag = visible;
    }),
    addChild: vi.fn((child: IRenderNode) => {
      children.push(child);
    }),
    removeChild: vi.fn((child: IRenderNode) => {
      const targetIndex = children.indexOf(child);
      if (targetIndex !== -1) {
        children.splice(targetIndex, 1);
      }
    }),
    getChildren: () => children,
    destroy: vi.fn(),
    getNativeNode: <T = unknown>() => ({}) as T,
  };
}

function createNativeEngineHarness(): NativeEngineHarness {
  const worldContainer = createMockRenderNode("world_container");
  const screenContainer = createMockRenderNode("screen_container");
  const stageRoot = createMockRenderNode("stage_root");
  const tickerListeners: Array<(deltaTimeInSeconds: number) => void> = [];
  const createdGraphicsNodes: IGraphicsNode[] = [];

  const renderTicker: IRenderTicker = {
    add: vi.fn((callback: (deltaTimeInSeconds: number) => void) => {
      tickerListeners.push(callback);
      return () => {
        const index = tickerListeners.indexOf(callback);
        if (index !== -1) {
          tickerListeners.splice(index, 1);
        }
      };
    }),
    start: vi.fn(),
    stop: vi.fn(),
    getFPS: () => 60,
    getDeltaTime: () => 0.016,
  };

  let cameraX = 0;
  let cameraY = 0;

  const renderEngine: IRenderEngine = {
    isInitialized: true,
    init: vi.fn(async () => {}),
    resize: vi.fn(),
    getDimensions: () => ({ width: 1280, height: 720 }),
    getCanvas: () => null,
    getStageRoot: () => stageRoot,
    getWorldContainer: () => worldContainer,
    getScreenContainer: () => screenContainer,
    getCameraPosition: () => ({ x: cameraX, y: cameraY }),
    setCameraPosition: vi.fn((x: number, y: number) => {
      cameraX = x;
      cameraY = y;
    }),
    shake: vi.fn(),
    getTicker: () => renderTicker,
    createContainer: vi.fn((identifier?: string) =>
      createMockRenderNode(identifier ?? "container")
    ),
    createSprite: vi.fn((texture: unknown, identifier?: string) => {
      const baseNode = createMockRenderNode(identifier ?? "sprite");
      let textureId = typeof texture === "string" ? texture : "texture";
      const spriteNode: ISpriteNode = {
        ...baseNode,
        getTextureId: () => textureId,
        setTextureId: vi.fn((nextId: string) => {
          textureId = nextId;
        }),
        getAnchor: () => ({ x: 0, y: 0 }),
        setAnchor: vi.fn(),
        getTint: () => [255, 255, 255],
        setTint: vi.fn(),
        getWidth: () => 64,
        getHeight: () => 32,
        setSize: vi.fn(),
      };
      return spriteNode;
    }),
    createGraphics: vi.fn((identifier?: string) => {
      const graphicsNode: IGraphicsNode = {
        ...createMockRenderNode(identifier ?? "graphics"),
        clear: vi.fn(),
        drawRect: vi.fn(),
        drawRoundedRect: vi.fn(),
        drawCircle: vi.fn(),
        drawPolygon: vi.fn(),
        drawLine: vi.fn(),
      };
      createdGraphicsNodes.push(graphicsNode);
      return graphicsNode;
    }),
    createText: vi.fn((content: string, _style?: unknown, identifier?: string) => {
      let currentText = content;
      const textNode: ITextNode = {
        ...createMockRenderNode(identifier ?? "text"),
        getText: () => currentText,
        setText: vi.fn((updatedContent: string) => {
          currentText = updatedContent;
        }),
        getFontFamily: () => "Outfit",
        setFontFamily: vi.fn(),
        getFontSize: () => 16,
        setFontSize: vi.fn(),
        getColor: () => [255, 255, 255],
        setColor: vi.fn(),
        getAlign: () => "left",
        setAlign: vi.fn(),
        setShadow: vi.fn(),
        setAnchor: vi.fn(),
      };
      return textNode;
    }),
    destroy: vi.fn(),
  };

  return {
    renderEngine,
    worldContainer,
    createdGraphicsNodes,
    advanceFrame: (deltaTimeInSeconds, renderingContext) => {
      vi.advanceTimersByTime(deltaTimeInSeconds * 1000);
      renderingContext?.lifecycle?.runSceneUpdateCallbacks?.(deltaTimeInSeconds);
      for (const listener of [...tickerListeners]) {
        listener(deltaTimeInSeconds);
      }
    },
  };
}

describe("Fase 3 — Migração Nativa PixiJS v8 de Entidades e Submódulos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    activeSonarTargets.clear();
    setParticlePool(null);
  });

  it("renderiza embarcações (rescue boat e trawler) via nós gráficos nativos sem fallback para add()", () => {
    const harness = createNativeEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const legacyAddSpy = vi.spyOn(renderingContext, "add");

    const rescueBoat = createRescueBoat(renderingContext as unknown as BoatEngineContext, {
      x: 900,
      y: 120,
    });
    const trawler = createFishingTrawler(renderingContext as unknown as BoatEngineContext, 14200);

    expect(legacyAddSpy).not.toHaveBeenCalled();
    expect(harness.createdGraphicsNodes.length).toBeGreaterThanOrEqual(20);
    expect(rescueBoat.pos.x).toBe(600);
    expect(trawler.pos.x).toBe(14200);

    harness.advanceFrame(0.08, renderingContext);
    expect(rescueBoat.pos.x).toBeGreaterThan(600);
    expect(harness.createdGraphicsNodes.some((node) => node.id === "rescue_boat_wake_bubble")).toBe(
      true
    );
  });

  it("cria bubbleVent, krill, net e trash nativos com reveal acústico e destruição limpa", () => {
    const harness = createNativeEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const legacyAddSpy = vi.spyOn(renderingContext, "add");

    const vent = createBubbleVent(
      renderingContext as unknown as BubbleVentEngineContext<BubbleVentObj>,
      { x: 400, y: 300 },
      220
    );
    expect(vent.collectAir?.()).toBe(true);
    expect(vent.collectAir?.()).toBe(false);

    const krill = createKrill(renderingContext as unknown as KrillEngineContext, {
      x: 440,
      y: 260,
    });
    expect(krill.is?.(TAGS.KRILL)).toBe(true);
    expect(activeSonarTargets.has(krill as unknown as RevealableTarget)).toBe(true);
    krill.reveal();
    expect(krill.isRevealed()).toBe(true);

    const ghostNet = createGhostNet(renderingContext as unknown as NetEngineContext, {
      x: 470,
      y: 280,
    });
    expect(activeSonarTargets.has(ghostNet as unknown as RevealableTarget)).toBe(true);
    ghostNet.reveal();
    expect(ghostNet.hidden).toBe(false);

    const trash = createTrash(renderingContext as unknown as TrashEngineContext, {
      x: 500,
      y: 290,
    });
    expect(activeSonarTargets.has(trash as unknown as RevealableTarget)).toBe(true);
    trash.reveal?.();

    expect(legacyAddSpy).not.toHaveBeenCalled();
    harness.advanceFrame(0.05, renderingContext);

    (krill as unknown as { destroy: () => void }).destroy();
    (ghostNet as unknown as { destroy: () => void }).destroy();
    (trash as unknown as { destroy: () => void }).destroy();
    (vent as unknown as { destroy: () => void }).destroy();

    expect(activeSonarTargets.has(krill as unknown as RevealableTarget)).toBe(false);
    expect(activeSonarTargets.has(ghostNet as unknown as RevealableTarget)).toBe(false);
    expect(activeSonarTargets.has(trash as unknown as RevealableTarget)).toBe(false);
  });

  it("migra playerCaustics e todos os emissores de playerParticles para nós nativos", () => {
    const harness = createNativeEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const legacyAddSpy = vi.spyOn(renderingContext, "add");
    const particlesCtx = renderingContext as unknown as PlayerParticlesEngineContext;

    const caustics = setupPlayerCaustics(
      renderingContext as unknown as PlayerCausticsContext,
      300,
      150
    );
    const whaleTarget: PlayerCausticsTargetWhale = {
      pos: { x: 300, y: 150 },
      angle: 0,
      scale: { x: 1, y: 1 },
    };
    caustics.update({
      baleia: whaleTarget,
      dt: 0.016,
      isFacingRight: true,
      currentRoll: 0.8,
      pitchFlexion: 0,
      isFainting: false,
      isFrozen: false,
      slices: [],
    });
    expect(caustics.getCausticOpacity()).toBeGreaterThan(0);
    expect(caustics.getVentralOpacity()).toBeGreaterThan(0);

    const samplePos = { x: 320, y: 180 };
    spawnOilSpout(particlesCtx, samplePos, true, 120);
    spawnPurifyBubbles(particlesCtx, samplePos);
    spawnBlowholeSpout(particlesCtx, samplePos, true, 100);
    spawnBaleenSuction(particlesCtx, samplePos, true);
    spawnDraftingTrail(particlesCtx, samplePos, true);
    spawnTailWaterRipples(particlesCtx, samplePos, 0, true, 1.3);
    spawnTailStrokeBubbles(particlesCtx, samplePos, true);

    expect(legacyAddSpy).not.toHaveBeenCalled();
    expect(
      harness.createdGraphicsNodes.some((node) => node.id === "player_blowhole_sun_halo")
    ).toBe(true);

    for (let tick = 0; tick < 80; tick++) {
      harness.advanceFrame(0.05, renderingContext);
    }
    expect(harness.createdGraphicsNodes[0].destroy).toBeDefined();
  });

  it("aciona playerSonar, companionSenses e companionStates no pipeline nativo PixiJS v8", () => {
    const harness = createNativeEngineHarness();
    const renderingContext = createRenderingContext(harness.renderEngine, new SceneManager());
    const legacyAddSpy = vi.spyOn(renderingContext, "add");

    const krillTarget = createKrill(renderingContext as unknown as KrillEngineContext, {
      x: 540,
      y: 260,
    });

    const sonarManager = new PlayerSonarManager(
      renderingContext as unknown as PlayerSonarEngineContext
    );
    sonarManager.updateCooldown(10);
    sonarManager.triggerSonar({ x: 500, y: 260 }, true);

    const revealedCount = revealEntitiesInSonarRadius(
      renderingContext as unknown as PlayerSonarEngineContext,
      { x: 500, y: 260 },
      600
    );
    expect(revealedCount).toBeGreaterThanOrEqual(1);

    const companionObj = {
      pos: { x: 500, y: 260 },
      angle: 0,
      exists: () => true,
    } as unknown as CompanionGameObject;

    const senses = createCompanionSenses({
      k: renderingContext as unknown as CompanionEngineContext,
      companion: companionObj,
      prng: () => 0.5,
    });
    senses.triggerSonar();

    const states = createCompanionStates({
      k: renderingContext as unknown as CompanionEngineContext,
      companion: companionObj,
      options: { initialX: 500, initialY: 260, isCoMigration: true },
      prng: () => 0.5,
    });
    states.forceState("SURFACE_BREATHE");
    expect(states.getState()).toBe("SURFACE_BREATHE");
    expect(
      harness.createdGraphicsNodes.some((node) => node.id === "companion_steam_particle")
    ).toBe(true);

    // Avança ticker e timers para processar ecos atrasados, anéis secundários e destruição
    for (let tick = 0; tick < 10; tick++) {
      harness.advanceFrame(0.05, renderingContext);
    }
    expect(krillTarget.isRevealed()).toBe(true);
    expect(legacyAddSpy).not.toHaveBeenCalled();
    expect(
      harness.createdGraphicsNodes.some((node) => node.id === "player_sonar_primary_pulse")
    ).toBe(true);
    expect(
      harness.createdGraphicsNodes.some((node) => node.id === "player_sonar_secondary_pulse")
    ).toBe(true);
    expect(harness.createdGraphicsNodes.some((node) => node.id === "sonar_krill_echo_ping")).toBe(
      true
    );
    expect(harness.createdGraphicsNodes.some((node) => node.id === "companion_sonar_ring_0")).toBe(
      true
    );
  });
});

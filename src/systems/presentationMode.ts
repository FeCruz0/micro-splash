import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { audioSystem } from "./audioSystem";
import {
  resolveInitializedRenderEngine,
  type IRenderEngine,
} from "../engine/contracts/INTERFACE_CONTRACTS";
import { resolveScreenRenderContainer } from "../engine/adapters/RenderEngineAdapter";
import {
  createNativeContainerNode,
  createNativeRectNode,
  createNativeTextNode,
} from "../engine/adapters/NativeRenderNodeFactory";

export interface PresentationPoint {
  biomeIndex: number;
  name: string;
  x: number;
  y: number;
  ecoTitle: string;
  ecoDesc: string;
  techTitle: string;
  techDesc: string;
}

export interface PresentationUiObject {
  hidden?: boolean;
  color?: unknown;
  scale?: { x: number; y: number } | unknown;
  width?: number;
  height?: number;
  text?: string;
  outline?: { color?: unknown; width?: number };
  opacity?: number;
  destroy?(): void;
  onHoverUpdate?(callback: () => void): unknown;
  onHoverEnd?(callback: () => void): unknown;
  onClick?(callback: () => void): unknown;
  add?(components?: unknown): PresentationUiObject;
}

export interface PresentationEngineContext {
  width(): number;
  height(): number;
  add(components?: unknown): PresentationUiObject;
  rect(width: number, height: number, options?: unknown): unknown;
  pos(x: number, y: number): unknown;
  pos(position: { x: number; y: number }): unknown;
  color(...args: unknown[]): unknown;
  rgb(red: number, green: number, blue: number): unknown;
  outline(width: number, color: unknown): unknown;
  opacity(alpha: number): unknown;
  anchor(anchorPoint: "center" | "topleft" | "left" | "right" | "top"): unknown;
  fixed(): unknown;
  z(zIndex: number): unknown;
  area(): unknown;
  text(content: string, options?: unknown): unknown;
  destroy(target: unknown): void;
  vec2(x: number, y: number): Parameters<PlayerController["setSpeed"]>[0];
  camPos(x?: number | { x: number; y: number }, y?: number): { x: number; y: number };
  setPaused?(pausedState: boolean): void;
  debug?: { paused: boolean };
}

export const PRESENTATION_POINTS: PresentationPoint[] = [
  {
    biomeIndex: 1,
    name: "Antártica",
    x: 120,
    y: GAME_CONFIG.SEA_LEVEL + 50,
    ecoTitle: "Fotoperíodo Polar & Berçário Glacial",
    ecoDesc:
      "O gelo marinho antártico serve de abrigo térmico contra orcas e berçário de microalgas essenciais para a proliferação massiva do krill.",
    techTitle: "Quebra Top-Down de Gelo & Física Modular",
    techDesc:
      "Camada de 40+ blocos com detecção vetorial estrita por cima, estilhaços gerados via Object Pooling e fendas dinâmicas de respiração registradas no gameState.",
  },
  {
    biomeIndex: 2,
    name: "Travessia Pelágica",
    x: 5600,
    y: GAME_CONFIG.SEA_LEVEL + 75,
    ecoTitle: "Comportamento de Cardumes & Vácuo Hidrodinâmico",
    ecoDesc:
      "Cetáceos e golfinhos-rotadores utilizam a esteira hidrodinâmica (drafting) da líder para poupar até 60% de energia metabólica na travessia oceânica.",
    techTitle: "Boids Flocking Kinematics & U-Turns Orgânicos",
    techDesc:
      "Cardumes com cinemática contínua sem física custosa: interpolação senoidal da formação, perspectiva 3D na virada e saltos acrobáticos em cascata sincronizada.",
  },
  {
    biomeIndex: 3,
    name: "Costa Urbana",
    x: 12600,
    y: GAME_CONFIG.SEA_LEVEL + 45,
    ecoTitle: "Poluição Acústica & Impacto de Hidrocarbonetos",
    ecoDesc:
      "Ruídos de hélices e motores de cargueiros propagam pelo canal SOFAR e desorientam o biosonar; o petróleo obstrui o espiráculo impedindo a recarga de ar.",
    techTitle: "FSM Autônoma & Anéis de Interferência Harmônica",
    techDesc:
      "Navios cargueiros em patrulha autônoma com dispersor periódico de resíduos sólidos e emissor de ondas acústicas que exercem repulsão física sobre a baleia.",
  },
  {
    biomeIndex: 4,
    name: "Ressurgência & Cânions",
    x: 19300,
    y: GAME_CONFIG.SEA_LEVEL + 90,
    ecoTitle: "A Ressurgência de Cabo Frio (Upwelling)",
    ecoDesc:
      "Ventos de NE empurram as águas superficiais e forçam a ascensão da ACAS (Água Central do Atlântico Sul), gelada e carregada de nitratos e fosfatos.",
    techTitle: "Propulsão Vetorial Dinâmica & Iluminação Volumétrica",
    techDesc:
      "Jatos ascendentes periódicos com vetores de força diagonal, spawn dinâmico de enxames de krill e raios solares translúcidos renderizados em paralaxe 2.5D.",
  },
  {
    biomeIndex: 5,
    name: "Santuário de Arraial",
    x: 25600,
    y: GAME_CONFIG.SEA_LEVEL + 35,
    ecoTitle: "Santuário de Reprodução & O Salto Majestoso",
    ecoDesc:
      "A Enseada de Arraial do Cabo oferece águas abrigadas ideais para amamentação. O salto fora d'água (breach) serve para comunicação e desparasitação.",
    techTitle: "Breach System & Clímax Balístico",
    techDesc:
      "Breach System: congelamento suave dos controles ao ultrapassar o Boqueirão, arco gravitacional aéreo com rotação de 360°, câmera lenta e splash de celebração.",
  },
];

export function getConceptByDistance(x: number): PresentationPoint {
  if (x < 5000) return PRESENTATION_POINTS[0];
  if (x < 12000) return PRESENTATION_POINTS[1];
  if (x < 19000) return PRESENTATION_POINTS[2];
  if (x < 25000) return PRESENTATION_POINTS[3];
  return PRESENTATION_POINTS[4];
}

export class PresentationModeManager {
  private k: IRenderEngine | PresentationEngineContext;
  private playerController: PlayerController;
  private isPresentationOpen = false;
  private isPaused = false;
  private container: PresentationUiObject | null = null;
  private ecoText: PresentationUiObject | null = null;
  private techText: PresentationUiObject | null = null;
  private biomeLabel: PresentationUiObject | null = null;
  private pauseBtnText: PresentationUiObject | null = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(k: IRenderEngine | PresentationEngineContext, playerController: PlayerController) {
    this.k = k;
    this.playerController = playerController;
    this.setupGlobalShortcut();
  }

  private setupGlobalShortcut(): void {
    this.keydownListener = (e: KeyboardEvent) => {
      // Captura Ctrl+P ou Command+P
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
        return;
      }

      // Atalhos numéricos 1 a 5 para teletransporte rápido quando o menu estiver aberto
      if (this.isPresentationOpen && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "1") this.jumpToBiome(1);
        else if (e.key === "2") this.jumpToBiome(2);
        else if (e.key === "3") this.jumpToBiome(3);
        else if (e.key === "4") this.jumpToBiome(4);
        else if (e.key === "5") this.jumpToBiome(5);
        else if (e.key === "Escape") this.close();
        else if (e.key === "p" || e.key === "P") this.togglePause();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.keydownListener, { capture: true });
    }
  }

  public toggle(): void {
    if (this.isPresentationOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    if (this.isPresentationOpen) return;
    this.isPresentationOpen = true;
    audioSystem.playUiClick();

    if (!this.container) {
      this.buildUI();
    }
    if (this.container) {
      this.container.hidden = false;
    }
    this.updateContent();
  }

  public close(): void {
    if (!this.isPresentationOpen) return;
    this.isPresentationOpen = false;
    audioSystem.playUiClick();

    if (this.container) {
      this.container.hidden = true;
    }
    if (this.isPaused) {
      this.togglePause();
    }
  }

  public isOpen(): boolean {
    return this.isPresentationOpen;
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    if (this.k) {
      const legacyContext = this.k as Partial<PresentationEngineContext>;
      if (typeof legacyContext.setPaused === "function") {
        legacyContext.setPaused(this.isPaused);
      } else if (legacyContext.debug) {
        legacyContext.debug.paused = this.isPaused;
      }
    }
    if (this.pauseBtnText) {
      this.pauseBtnText.text = this.isPaused ? "▶️ RETOMAR" : "⏸️ PAUSA DIDÁTICA";
    }
  }

  public isDidacticPaused(): boolean {
    return this.isPaused;
  }

  public jumpToBiome(biomeIndex: number): void {
    const point = PRESENTATION_POINTS.find((p) => p.biomeIndex === biomeIndex);
    if (!point) return;

    audioSystem.playUiClick();
    const playerObj = this.playerController.gameObj;
    const legacyContext = this.k as Partial<PresentationEngineContext>;
    const resolvedNativeRenderEngine = resolveInitializedRenderEngine(this.k);
    if (playerObj) {
      playerObj.pos.x = point.x;
      playerObj.pos.y = point.y;
      const nextVelocity =
        typeof legacyContext.vec2 === "function"
          ? legacyContext.vec2(100, 0)
          : ({
              x: 100,
              y: 0,
              len: () => 100,
              scale: (f: number) => ({ x: 100 * f, y: 0 }),
            } as Parameters<PlayerController["setSpeed"]>[0]);
      this.playerController.setSpeed(nextVelocity);
      if (typeof legacyContext.camPos === "function") {
        legacyContext.camPos(point.x + 160, legacyContext.camPos().y);
      } else if (resolvedNativeRenderEngine) {
        resolvedNativeRenderEngine.setCameraPosition(
          point.x + 160,
          resolvedNativeRenderEngine.getCameraPosition().y
        );
      }
      audioSystem.updateBiomeTrack(point.x);
      audioSystem.updateDepthAcoustics(point.y);
    }
    this.updateContent();
  }

  public update(): void {
    if (!this.isPresentationOpen) return;
    this.updateContent();
  }

  private updateContent(): void {
    const playerObj = this.playerController.gameObj;
    if (!playerObj) return;

    const currentX = playerObj.pos.x;
    const point = getConceptByDistance(currentX);

    if (this.biomeLabel) {
      this.biomeLabel.text = `SETOR: ${point.name.toUpperCase()} (${Math.floor(currentX)}m)`;
    }

    if (this.ecoText) {
      this.ecoText.text = [
        `🧬 CONCEITO CIENTÍFICO & ECOLÓGICO:`,
        `"${point.ecoTitle}"`,
        `${point.ecoDesc}`,
      ].join("\n");
    }

    if (this.techText) {
      this.techText.text = [
        `💻 ENGENHARIA DE SOFTWARE & ALGORITMO:`,
        `"${point.techTitle}"`,
        `${point.techDesc}`,
      ].join("\n");
    }
  }

  private buildUI(): void {
    const resolvedNativeRenderEngine = resolveInitializedRenderEngine(this.k);
    if (resolvedNativeRenderEngine) {
      const nativeScreenContainer = resolveScreenRenderContainer(resolvedNativeRenderEngine);
      const viewportDimensions = resolvedNativeRenderEngine.getDimensions();
      const viewportWidth = viewportDimensions.width;
      const viewportHeight = viewportDimensions.height;

      const rootContainerNode = createNativeContainerNode(
        this.k,
        resolvedNativeRenderEngine,
        nativeScreenContainer,
        {
          identifier: "presentation_mode_root",
          positionX: 0,
          positionY: 0,
          zIndex: 350,
          visible: this.isPresentationOpen,
        }
      );
      this.container = rootContainerNode as unknown as PresentationUiObject;

      const topBarNode = createNativeRectNode(
        this.k,
        resolvedNativeRenderEngine,
        rootContainerNode.renderNode,
        {
          identifier: "presentation_top_bar",
          width: viewportWidth,
          height: 54,
          positionX: 0,
          positionY: 0,
          fillColor: [6, 16, 32],
          outlineColor: [0, 230, 255],
          outlineWidth: 2,
          opacity: 0.96,
        }
      );

      createNativeTextNode(this.k, resolvedNativeRenderEngine, topBarNode.renderNode, {
        identifier: "presentation_header_title",
        content: "🎙️ MODO APRESENTAÇÃO GUIADA (JURADOS/PROFESSORES)",
        fontSize: 13,
        fontFamily: "Outfit",
        positionX: 12,
        positionY: 8,
        color: [255, 220, 90],
      });

      createNativeTextNode(this.k, resolvedNativeRenderEngine, topBarNode.renderNode, {
        identifier: "presentation_header_subtitle",
        content: "Saltar Biomas [Teclas 1 a 5] | Fechar [Ctrl+P / ESC]",
        fontSize: 10.5,
        fontFamily: "Inter",
        positionX: 12,
        positionY: 28,
        color: [140, 195, 240],
      });

      const buttonStartX = Math.max(340, viewportWidth - 440);
      PRESENTATION_POINTS.forEach((point, index) => {
        const buttonPositionX = buttonStartX + index * 62;
        const biomeButton = createNativeRectNode(
          this.k,
          resolvedNativeRenderEngine,
          topBarNode.renderNode,
          {
            identifier: `presentation_biome_btn_${point.biomeIndex}`,
            width: 58,
            height: 34,
            cornerRadius: 6,
            positionX: buttonPositionX,
            positionY: 9,
            fillColor: [18, 55, 95],
            outlineColor: [0, 210, 255],
            outlineWidth: 1.5,
          }
        );

        createNativeTextNode(this.k, resolvedNativeRenderEngine, biomeButton.renderNode, {
          identifier: `presentation_biome_btn_index_${point.biomeIndex}`,
          content: `[${point.biomeIndex}]`,
          fontSize: 10.5,
          fontFamily: "Outfit",
          positionX: 29,
          positionY: 9,
          color: [255, 230, 120],
          anchor: "center",
        });

        createNativeTextNode(this.k, resolvedNativeRenderEngine, biomeButton.renderNode, {
          identifier: `presentation_biome_btn_name_${point.biomeIndex}`,
          content: point.name.slice(0, 7),
          fontSize: 8.5,
          fontFamily: "Inter",
          positionX: 29,
          positionY: 23,
          color: [200, 240, 255],
          anchor: "center",
        });

        const nativeButtonNode = biomeButton.renderNode.getNativeNode<{
          eventMode?: string;
          cursor?: string;
          on?(event: string, listener: () => void): void;
        }>();
        if (nativeButtonNode && typeof nativeButtonNode.on === "function") {
          nativeButtonNode.eventMode = "static";
          nativeButtonNode.cursor = "pointer";
          nativeButtonNode.on("pointerdown", () => this.jumpToBiome(point.biomeIndex));
          nativeButtonNode.on("pointerover", () => {
            biomeButton.color = [30, 90, 160];
          });
          nativeButtonNode.on("pointerout", () => {
            biomeButton.color = [18, 55, 95];
          });
        }
      });

      const pauseButtonNode = createNativeRectNode(
        this.k,
        resolvedNativeRenderEngine,
        topBarNode.renderNode,
        {
          identifier: "presentation_pause_btn",
          width: 98,
          height: 34,
          cornerRadius: 6,
          positionX: viewportWidth - 110,
          positionY: 9,
          fillColor: [28, 70, 45],
          outlineColor: [80, 240, 150],
          outlineWidth: 1.5,
        }
      );

      this.pauseBtnText = createNativeTextNode(
        this.k,
        resolvedNativeRenderEngine,
        pauseButtonNode.renderNode,
        {
          identifier: "presentation_pause_btn_label",
          content: "⏸️ PAUSA",
          fontSize: 11,
          fontFamily: "Outfit",
          positionX: 49,
          positionY: 17,
          color: [230, 255, 235],
          anchor: "center",
        }
      ) as unknown as PresentationUiObject;

      const nativePauseButton = pauseButtonNode.renderNode.getNativeNode<{
        eventMode?: string;
        cursor?: string;
        on?(event: string, listener: () => void): void;
      }>();
      if (nativePauseButton && typeof nativePauseButton.on === "function") {
        nativePauseButton.eventMode = "static";
        nativePauseButton.cursor = "pointer";
        nativePauseButton.on("pointerdown", () => this.togglePause());
      }

      const panelHeight = 104;
      const bottomPanelNode = createNativeRectNode(
        this.k,
        resolvedNativeRenderEngine,
        rootContainerNode.renderNode,
        {
          identifier: "presentation_bottom_panel",
          width: viewportWidth,
          height: panelHeight,
          positionX: 0,
          positionY: viewportHeight - panelHeight,
          fillColor: [8, 18, 38],
          outlineColor: [0, 210, 255],
          outlineWidth: 2,
          opacity: 0.95,
        }
      );

      this.biomeLabel = createNativeTextNode(
        this.k,
        resolvedNativeRenderEngine,
        bottomPanelNode.renderNode,
        {
          identifier: "presentation_biome_label",
          content: "SETOR: ANTÁRTICA (0m)",
          fontSize: 12.5,
          fontFamily: "Outfit",
          positionX: 15,
          positionY: 6,
          color: [255, 220, 80],
        }
      ) as unknown as PresentationUiObject;

      const columnWidth = (viewportWidth - 30) / 2;
      this.ecoText = createNativeTextNode(
        this.k,
        resolvedNativeRenderEngine,
        bottomPanelNode.renderNode,
        {
          identifier: "presentation_eco_text",
          content: "",
          fontSize: 10.5,
          fontFamily: "Inter",
          wordWrapWidth: columnWidth - 10,
          lineSpacing: 3.5,
          positionX: 15,
          positionY: 26,
          color: [140, 250, 210],
        }
      ) as unknown as PresentationUiObject;

      this.techText = createNativeTextNode(
        this.k,
        resolvedNativeRenderEngine,
        bottomPanelNode.renderNode,
        {
          identifier: "presentation_tech_text",
          content: "",
          fontSize: 10.5,
          fontFamily: "Inter",
          wordWrapWidth: columnWidth - 10,
          lineSpacing: 3.5,
          positionX: 15 + columnWidth,
          positionY: 26,
          color: [255, 215, 130],
        }
      ) as unknown as PresentationUiObject;

      return;
    }

    const legacyContext = this.k as PresentationEngineContext;
    const w = legacyContext.width();
    const h = legacyContext.height();

    // Container raiz fixo na tela com alta prioridade visual
    this.container = legacyContext.add([
      legacyContext.pos(0, 0),
      legacyContext.fixed(),
      legacyContext.z(350),
    ]);

    // 1. BARRA SUPERIOR DE TELETRANSPORTE & CONTROLE
    const topBar = this.container.add?.([
      legacyContext.rect(w, 54),
      legacyContext.pos(0, 0),
      legacyContext.color(6, 16, 32),
      legacyContext.outline(2, legacyContext.rgb(0, 230, 255)),
      legacyContext.opacity(0.96),
      legacyContext.area(),
      legacyContext.fixed(),
    ]);

    if (topBar) {
      topBar.add?.([
        legacyContext.text("🎙️ MODO APRESENTAÇÃO GUIADA (JURADOS/PROFESSORES)", {
          size: 13,
          font: "Outfit",
        }),
        legacyContext.pos(12, 8),
        legacyContext.color(255, 220, 90),
      ]);

      topBar.add?.([
        legacyContext.text("Saltar Biomas [Teclas 1 a 5] | Fechar [Ctrl+P / ESC]", {
          size: 10.5,
          font: "Inter",
        }),
        legacyContext.pos(12, 28),
        legacyContext.color(140, 195, 240),
      ]);

      // Botões de Teletransporte dos 5 Biomas
      const btnStartX = Math.max(340, w - 440);
      PRESENTATION_POINTS.forEach((pt, i) => {
        const bX = btnStartX + i * 62;
        const b = topBar.add?.([
          legacyContext.rect(58, 34, { radius: 6 }),
          legacyContext.pos(bX, 9),
          legacyContext.color(18, 55, 95),
          legacyContext.outline(1.5, legacyContext.rgb(0, 210, 255)),
          legacyContext.area(),
        ]);

        if (b) {
          b.add?.([
            legacyContext.text(`[${pt.biomeIndex}]`, { size: 10.5, font: "Outfit" }),
            legacyContext.pos(29, 9),
            legacyContext.color(255, 230, 120),
            legacyContext.anchor("center"),
          ]);

          b.add?.([
            legacyContext.text(pt.name.slice(0, 7), { size: 8.5, font: "Inter" }),
            legacyContext.pos(29, 23),
            legacyContext.color(200, 240, 255),
            legacyContext.anchor("center"),
          ]);

          if (typeof b.onClick === "function") {
            b.onClick(() => {
              this.jumpToBiome(pt.biomeIndex);
            });
          }
          if (typeof b.onHoverUpdate === "function") {
            b.onHoverUpdate(() => {
              b.color = legacyContext.rgb(30, 90, 160);
            });
          }
          if (typeof b.onHoverEnd === "function") {
            b.onHoverEnd(() => {
              b.color = legacyContext.rgb(18, 55, 95);
            });
          }
        }
      });

      // Botão de Pausa Didática
      const pauseBtn = topBar.add?.([
        legacyContext.rect(98, 34, { radius: 6 }),
        legacyContext.pos(w - 110, 9),
        legacyContext.color(28, 70, 45),
        legacyContext.outline(1.5, legacyContext.rgb(80, 240, 150)),
        legacyContext.area(),
      ]);

      if (pauseBtn) {
        this.pauseBtnText =
          pauseBtn.add?.([
            legacyContext.text("⏸️ PAUSA", { size: 11, font: "Outfit" }),
            legacyContext.pos(49, 17),
            legacyContext.color(230, 255, 235),
            legacyContext.anchor("center"),
          ]) ?? null;

        if (typeof pauseBtn.onClick === "function") {
          pauseBtn.onClick(() => {
            this.togglePause();
          });
        }
      }
    }

    // 2. PAINEL DIDÁTICO INFERIOR (CONCEITO ECOLÓGICO vs CONCEITO COMPUTACIONAL)
    const panelH = 104;
    const bottomPanel = this.container.add?.([
      legacyContext.rect(w, panelH),
      legacyContext.pos(0, h - panelH),
      legacyContext.color(8, 18, 38),
      legacyContext.outline(2, legacyContext.rgb(0, 210, 255)),
      legacyContext.opacity(0.95),
      legacyContext.fixed(),
    ]);

    if (bottomPanel) {
      this.biomeLabel =
        bottomPanel.add?.([
          legacyContext.text("SETOR: ANTÁRTICA (0m)", { size: 12.5, font: "Outfit" }),
          legacyContext.pos(15, 6),
          legacyContext.color(255, 220, 80),
        ]) ?? null;

      // Coluna 1: Conceito Ecológico
      const colW = (w - 30) / 2;
      this.ecoText =
        bottomPanel.add?.([
          legacyContext.text("", {
            size: 10.5,
            font: "Inter",
            width: colW - 10,
            lineSpacing: 3.5,
          }),
          legacyContext.pos(15, 26),
          legacyContext.color(140, 250, 210),
        ]) ?? null;

      // Coluna 2: Engenharia de Software
      this.techText =
        bottomPanel.add?.([
          legacyContext.text("", {
            size: 10.5,
            font: "Inter",
            width: colW - 10,
            lineSpacing: 3.5,
          }),
          legacyContext.pos(15 + colW, 26),
          legacyContext.color(255, 215, 130),
        ]) ?? null;
    }
  }

  public destroy(): void {
    if (this.keydownListener && typeof window !== "undefined") {
      window.removeEventListener("keydown", this.keydownListener, { capture: true });
      this.keydownListener = null;
    }
    if (this.container) {
      try {
        if (
          resolveInitializedRenderEngine(this.k) &&
          typeof this.container.destroy === "function"
        ) {
          this.container.destroy();
        } else {
          (this.k as PresentationEngineContext).destroy(this.container);
        }
      } catch {}
      this.container = null;
    }
  }
}

let activePresentationManager: PresentationModeManager | null = null;

export function initPresentationMode(
  k: IRenderEngine | PresentationEngineContext,
  playerController: PlayerController
): PresentationModeManager {
  if (activePresentationManager) {
    activePresentationManager.destroy();
  }
  activePresentationManager = new PresentationModeManager(k, playerController);
  return activePresentationManager;
}

export function getPresentationMode(): PresentationModeManager | null {
  return activePresentationManager;
}

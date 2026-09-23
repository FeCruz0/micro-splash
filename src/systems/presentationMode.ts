import type { KaboomCtx } from "kaboom";
import { GAME_CONFIG } from "../config";
import type { PlayerController } from "../entities/player";
import { audioSystem } from "./audioSystem";

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

export const PRESENTATION_POINTS: PresentationPoint[] = [
  {
    biomeIndex: 1,
    name: "Antártica",
    x: 120,
    y: GAME_CONFIG.SEA_LEVEL + 50,
    ecoTitle: "Fotoperíodo Polar & Berçário Glacial",
    ecoDesc: "O gelo marinho antártico serve de abrigo térmico contra orcas e berçário de microalgas essenciais para a proliferação massiva do krill.",
    techTitle: "Quebra Top-Down de Gelo & Física Modular",
    techDesc: "Camada de 40+ blocos com detecção vetorial estrita por cima, estilhaços gerados via Object Pooling e fendas dinâmicas de respiração registradas no gameState.",
  },
  {
    biomeIndex: 2,
    name: "Travessia Pelágica",
    x: 5600,
    y: GAME_CONFIG.SEA_LEVEL + 75,
    ecoTitle: "Comportamento de Cardumes & Vácuo Hidrodinâmico",
    ecoDesc: "Cetáceos e golfinhos-rotadores utilizam a esteira hidrodinâmica (drafting) da líder para poupar até 60% de energia metabólica na travessia oceânica.",
    techTitle: "Boids Flocking Kinematics & U-Turns Orgânicos",
    techDesc: "Cardumes com cinemática contínua sem física custosa: interpolação senoidal da formação, perspectiva 3D na virada e saltos acrobáticos em cascata sincronizada.",
  },
  {
    biomeIndex: 3,
    name: "Costa Urbana",
    x: 12600,
    y: GAME_CONFIG.SEA_LEVEL + 45,
    ecoTitle: "Poluição Acústica & Impacto de Hidrocarbonetos",
    ecoDesc: "Ruídos de hélices e motores de cargueiros propagam pelo canal SOFAR e desorientam o biosonar; o petróleo obstrui o espiráculo impedindo a recarga de ar.",
    techTitle: "FSM Autônoma & Anéis de Interferência Harmônica",
    techDesc: "Navios cargueiros em patrulha autônoma com dispersor periódico de resíduos sólidos e emissor de ondas acústicas que exercem repulsão física sobre a baleia.",
  },
  {
    biomeIndex: 4,
    name: "Ressurgência & Cânions",
    x: 19300,
    y: GAME_CONFIG.SEA_LEVEL + 90,
    ecoTitle: "A Ressurgência de Cabo Frio (Upwelling)",
    ecoDesc: "Ventos de NE empurram as águas superficiais e forçam a ascensão da ACAS (Água Central do Atlântico Sul), gelada e carregada de nitratos e fosfatos.",
    techTitle: "Propulsão Vetorial Dinâmica & Iluminação Volumétrica",
    techDesc: "Jatos ascendentes periódicos com vetores de força diagonal, spawn dinâmico de enxames de krill e raios solares translúcidos renderizados em paralaxe 2.5D.",
  },
  {
    biomeIndex: 5,
    name: "Santuário de Arraial",
    x: 25600,
    y: GAME_CONFIG.SEA_LEVEL + 35,
    ecoTitle: "Santuário de Reprodução & O Salto Majestoso",
    ecoDesc: "A Enseada de Arraial do Cabo oferece águas abrigadas ideais para amamentação. O salto fora d'água (breach) serve para comunicação e desparasitação.",
    techTitle: "Breach System & Clímax Balístico",
    techDesc: "Breach System: congelamento suave dos controles ao ultrapassar o Boqueirão, arco gravitacional aéreo com rotação de 360°, câmera lenta e splash de celebração.",
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
  private k: KaboomCtx;
  private playerController: PlayerController;
  private isPresentationOpen = false;
  private isPaused = false;
  private container: any = null;
  private ecoText: any = null;
  private techText: any = null;
  private biomeLabel: any = null;
  private pauseBtnText: any = null;
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  constructor(k: KaboomCtx, playerController: PlayerController) {
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
    if (playerObj) {
      playerObj.pos.x = point.x;
      playerObj.pos.y = point.y;
      this.playerController.setSpeed(this.k.vec2(100, 0));
      this.k.camPos(point.x + 160, this.k.camPos().y);
      audioSystem.updateBiomeTrack(point.x);
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
    const w = this.k.width();
    const h = this.k.height();

    // Container raiz fixo na tela com alta prioridade visual
    this.container = this.k.add([
      this.k.pos(0, 0),
      this.k.fixed(),
      this.k.z(350),
    ]);

    // 1. BARRA SUPERIOR DE TELETRANSPORTE & CONTROLE
    const topBar = this.container.add([
      this.k.rect(w, 54),
      this.k.pos(0, 0),
      this.k.color(6, 16, 32),
      this.k.outline(2, this.k.rgb(0, 230, 255)),
      this.k.opacity(0.96),
      this.k.area(),
      this.k.fixed(),
    ]);

    topBar.add([
      this.k.text("🎙️ MODO APRESENTAÇÃO GUIADA (JURADOS/PROFESSORES)", { size: 11, font: "sans-serif" }),
      this.k.pos(12, 10),
      this.k.color(255, 220, 90),
    ]);

    topBar.add([
      this.k.text("Saltar Biomas [Teclas 1 a 5] | Fechar [Ctrl+P / ESC]", { size: 9, font: "sans-serif" }),
      this.k.pos(12, 28),
      this.k.color(140, 195, 240),
    ]);

    // Botões de Teletransporte dos 5 Biomas
    const btnStartX = Math.max(340, w - 440);
    PRESENTATION_POINTS.forEach((pt, i) => {
      const bX = btnStartX + i * 62;
      const b = topBar.add([
        this.k.rect(58, 32, { radius: 6 }),
        this.k.pos(bX, 11),
        this.k.color(18, 55, 95),
        this.k.outline(1.5, this.k.rgb(0, 210, 255)),
        this.k.area(),
      ]);

      b.add([
        this.k.text(`[${pt.biomeIndex}]`, { size: 9, font: "sans-serif" }),
        this.k.pos(29, 9),
        this.k.color(255, 230, 120),
        this.k.anchor("center"),
      ]);

      b.add([
        this.k.text(pt.name.slice(0, 7), { size: 7, font: "sans-serif" }),
        this.k.pos(29, 21),
        this.k.color(200, 240, 255),
        this.k.anchor("center"),
      ]);

      b.onClick(() => {
        this.jumpToBiome(pt.biomeIndex);
      });
      b.onHoverUpdate(() => {
        b.color = this.k.rgb(30, 90, 160);
      });
      b.onHoverEnd(() => {
        b.color = this.k.rgb(18, 55, 95);
      });
    });

    // Botão de Pausa Didática
    const pauseBtn = topBar.add([
      this.k.rect(98, 32, { radius: 6 }),
      this.k.pos(w - 110, 11),
      this.k.color(28, 70, 45),
      this.k.outline(1.5, this.k.rgb(80, 240, 150)),
      this.k.area(),
    ]);

    this.pauseBtnText = pauseBtn.add([
      this.k.text("⏸️ PAUSA", { size: 9, font: "sans-serif" }),
      this.k.pos(49, 16),
      this.k.color(230, 255, 235),
      this.k.anchor("center"),
    ]);

    pauseBtn.onClick(() => {
      this.togglePause();
    });

    // 2. PAINEL DIDÁTICO INFERIOR (CONCEITO ECOLÓGICO vs CONCEITO COMPUTACIONAL)
    const panelH = 92;
    const bottomPanel = this.container.add([
      this.k.rect(w, panelH),
      this.k.pos(0, h - panelH),
      this.k.color(8, 18, 38),
      this.k.outline(2, this.k.rgb(0, 210, 255)),
      this.k.opacity(0.95),
      this.k.fixed(),
    ]);

    this.biomeLabel = bottomPanel.add([
      this.k.text("SETOR: ANTÁRTICA (0m)", { size: 10, font: "sans-serif" }),
      this.k.pos(15, 6),
      this.k.color(255, 220, 80),
    ]);

    // Coluna 1: Conceito Ecológico
    const colW = (w - 30) / 2;
    this.ecoText = bottomPanel.add([
      this.k.text("", {
        size: 8.5,
        font: "sans-serif",
        width: colW - 10,
        lineSpacing: 3,
      }),
      this.k.pos(15, 24),
      this.k.color(140, 250, 210),
    ]);

    // Coluna 2: Engenharia de Software
    this.techText = bottomPanel.add([
      this.k.text("", {
        size: 8.5,
        font: "sans-serif",
        width: colW - 10,
        lineSpacing: 3,
      }),
      this.k.pos(15 + colW, 24),
      this.k.color(255, 215, 130),
    ]);
  }

  public destroy(): void {
    if (this.keydownListener && typeof window !== "undefined") {
      window.removeEventListener("keydown", this.keydownListener, { capture: true });
      this.keydownListener = null;
    }
    if (this.container) {
      try {
        this.k.destroy(this.container);
      } catch {}
      this.container = null;
    }
  }
}

let activePresentationManager: PresentationModeManager | null = null;

export function initPresentationMode(k: KaboomCtx, playerController: PlayerController): PresentationModeManager {
  if (activePresentationManager) {
    activePresentationManager.destroy();
  }
  activePresentationManager = new PresentationModeManager(k, playerController);
  return activePresentationManager;
}

export function getPresentationMode(): PresentationModeManager | null {
  return activePresentationManager;
}

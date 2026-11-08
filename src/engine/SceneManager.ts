/**
 * Gerenciador de Cenas com FSM Formal e Transição Suave — Micro Splash
 *
 * Implementa ISceneManager substituindo k.scene() e k.go() do Kaboom.js.
 * Coordena o ciclo de vida formal (enter, update, exit) e estados de transição.
 */

import type { IScene, ISceneManager } from "./contracts/INTERFACE_CONTRACTS";

/**
 * Estados da Máquina de Estados Finitos (FSM) de Transição de Cenas.
 */
export type SceneTransitionState = "IDLE" | "EXITING" | "SWITCHING" | "ENTERING" | "ERROR";

export interface SceneTransitionOptions {
  readonly durationInSeconds?: number;
  readonly onProgress?: (progress: number, state: SceneTransitionState) => void;
}

/**
 * Descreve uma transição de cena que falhou, para que a camada de aplicação possa torná-la visível.
 */
export interface SceneTransitionFailure {
  readonly sceneName: string;
  readonly phase: SceneTransitionState;
  readonly error: unknown;
}

export type SceneTransitionErrorHandler = (failure: SceneTransitionFailure) => void;

/**
 * Implementação padrão de ISceneManager com FSM e controle estrito de concorrência.
 *
 * O estado "ERROR" é apenas informativo: ele registra que a última transição falhou, mas nunca
 * bloqueia o despacho de update nem novas chamadas de loadScene (recuperação segura).
 */
export class SceneManager implements ISceneManager {
  private readonly sceneRegistry = new Map<string, IScene>();
  private activeScene: IScene | null = null;
  private transitionState: SceneTransitionState = "IDLE";
  private queuedTransition: { sceneName: string; transitionData?: unknown } | null = null;
  private isProcessingTransition: boolean = false;
  private lastTransitionFailure: SceneTransitionFailure | null = null;
  private transitionErrorHandler: SceneTransitionErrorHandler | null = null;

  getCurrentScene(): IScene | null {
    return this.activeScene;
  }

  getTransitionState(): SceneTransitionState {
    return this.transitionState;
  }

  getLastTransitionFailure(): SceneTransitionFailure | null {
    return this.lastTransitionFailure;
  }

  /**
   * Registra o ouvinte notificado sempre que uma transição falhar (ex.: overlay de erro visível).
   */
  setTransitionErrorHandler(handler: SceneTransitionErrorHandler | null): void {
    this.transitionErrorHandler = handler;
  }

  getRegisteredSceneNames(): readonly string[] {
    return Array.from(this.sceneRegistry.keys());
  }

  hasScene(sceneName: string): boolean {
    return this.sceneRegistry.has(sceneName);
  }

  registerScene(scene: IScene): void {
    if (this.sceneRegistry.has(scene.name)) {
      console.warn(
        `[SceneManager] Cena "${scene.name}" já está registrada. Substituindo registro.`
      );
    }
    this.sceneRegistry.set(scene.name, scene);
  }

  unregisterScene(sceneName: string): boolean {
    if (this.activeScene?.name === sceneName) {
      throw new Error(
        `[SceneManager] Não é possível desregistrar a cena ativa "${sceneName}". Mude de cena antes de removê-la.`
      );
    }
    return this.sceneRegistry.delete(sceneName);
  }

  async loadScene(
    sceneName: string,
    transitionData?: unknown,
    options?: SceneTransitionOptions
  ): Promise<void> {
    const targetScene = this.sceneRegistry.get(sceneName);
    if (!targetScene) {
      const missingSceneError = new Error(
        `[SceneManager] Cena "${sceneName}" não encontrada no registro.`
      );
      this.transitionState = "ERROR";
      this.recordTransitionFailure(sceneName, "ERROR", missingSceneError);
      throw missingSceneError;
    }

    // Se já estiver em transição, enfileira a transição mais recente para evitar condições de corrida
    if (this.isProcessingTransition) {
      this.queuedTransition = { sceneName, transitionData };
      return;
    }

    this.isProcessingTransition = true;
    let currentTransitionPhase: SceneTransitionState = "IDLE";

    try {
      // 1. Fase EXITING: Notifica saída da cena atual e interpola transição
      if (this.activeScene) {
        currentTransitionPhase = "EXITING";
        this.transitionState = "EXITING";
        options?.onProgress?.(0, "EXITING");

        await this.activeScene.exit();

        if (options?.durationInSeconds && options.durationInSeconds > 0) {
          await this.delay(options.durationInSeconds / 2);
        }
        options?.onProgress?.(1, "EXITING");
      }

      // 2. Fase SWITCHING: Troca a referência canônica da cena
      currentTransitionPhase = "SWITCHING";
      this.transitionState = "SWITCHING";
      options?.onProgress?.(0.5, "SWITCHING");
      this.activeScene = targetScene;

      // 3. Fase ENTERING: Inicializa a nova cena com dados de transição
      currentTransitionPhase = "ENTERING";
      this.transitionState = "ENTERING";
      options?.onProgress?.(0, "ENTERING");

      await targetScene.enter(transitionData);

      if (options?.durationInSeconds && options.durationInSeconds > 0) {
        await this.delay(options.durationInSeconds / 2);
      }
      options?.onProgress?.(1, "ENTERING");

      // 4. Retorno ao estado IDLE
      this.transitionState = "IDLE";
      this.lastTransitionFailure = null;
    } catch (error) {
      console.error(`[SceneManager] Falha crítica na transição para "${sceneName}":`, error);
      await this.recoverFromTransitionFailure(targetScene, sceneName, currentTransitionPhase, error);
      throw error;
    } finally {
      this.isProcessingTransition = false;

      // Processa próxima transição enfileirada se houver
      if (this.queuedTransition) {
        const next = this.queuedTransition;
        this.queuedTransition = null;
        await this.loadScene(next.sceneName, next.transitionData, options);
      }
    }
  }

  update(deltaTimeInSeconds: number): void {
    // "ERROR" é informativo: se ainda houver cena ativa íntegra, o loop continua sendo despachado.
    if (
      this.transitionState !== "IDLE" &&
      this.transitionState !== "ENTERING" &&
      this.transitionState !== "ERROR"
    ) {
      return;
    }
    if (this.activeScene) {
      this.activeScene.update(deltaTimeInSeconds);
    }
  }

  destroy(): void {
    if (this.activeScene) {
      try {
        void this.activeScene.exit();
      } catch (error) {
        console.error("[SceneManager] Erro ao encerrar cena ativa durante destruição:", error);
      }
      this.activeScene = null;
    }
    this.sceneRegistry.clear();
    this.queuedTransition = null;
    this.transitionState = "IDLE";
    this.isProcessingTransition = false;
    this.lastTransitionFailure = null;
    this.transitionErrorHandler = null;
  }

  /**
   * Descarta a cena parcialmente inicializada (exit seguro), libera a referência ativa e registra
   * a falha. O estado permanece "ERROR" apenas como informação: update e loadScene continuam livres.
   */
  private async recoverFromTransitionFailure(
    failedTargetScene: IScene,
    sceneName: string,
    failedPhase: SceneTransitionState,
    error: unknown
  ): Promise<void> {
    const sceneToDiscard = failedPhase === "EXITING" ? this.activeScene : failedTargetScene;
    if (sceneToDiscard) {
      try {
        await sceneToDiscard.exit();
      } catch (exitError) {
        console.error(
          `[SceneManager] Erro ao encerrar a cena "${sceneToDiscard.name}" após falha de transição:`,
          exitError
        );
      }
    }
    this.activeScene = null;
    this.transitionState = "ERROR";
    this.recordTransitionFailure(sceneName, failedPhase, error);
  }

  private recordTransitionFailure(
    sceneName: string,
    phase: SceneTransitionState,
    error: unknown
  ): void {
    const failure: SceneTransitionFailure = { sceneName, phase, error };
    this.lastTransitionFailure = failure;
    if (!this.transitionErrorHandler) {
      return;
    }
    try {
      this.transitionErrorHandler(failure);
    } catch (handlerError) {
      console.error("[SceneManager] Erro no handler de falha de transição:", handlerError);
    }
  }

  private delay(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, seconds * 1000));
    });
  }
}

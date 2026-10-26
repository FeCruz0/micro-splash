/**
 * Orquestrador Central de Subsistemas do Game Loop (Fase 58).
 * Garante execução determinística através de fases canônicas estritamente ordenadas:
 * input -> physics -> ai -> collision -> culling -> render.
 */

export type SystemPhase = "input" | "physics" | "ai" | "collision" | "culling" | "render";

export const SYSTEM_PHASES: readonly SystemPhase[] = [
  "input",
  "physics",
  "ai",
  "collision",
  "culling",
  "render",
] as const;

export interface SystemTask {
  id: string;
  phase: SystemPhase;
  priority: number; // Menor valor numérico executa antes (ex: -10 antes de 0, 0 antes de 10)
  execute: (deltaTime: number) => void;
  enabled: boolean;
  orderIndex: number;
}

export interface RegisterSystemOptions {
  id?: string;
  priority?: number;
  enabled?: boolean;
}

export type SystemErrorHandler = (error: unknown, task: SystemTask) => void;

export class SystemRunner {
  private tasks: Map<string, SystemTask> = new Map();
  private sortedTasksByPhase: Map<SystemPhase, SystemTask[]> = new Map();
  private isDirty = false;
  private nextOrderIndex = 0;
  private errorHandler: SystemErrorHandler | null = null;

  constructor(errorHandler?: SystemErrorHandler) {
    if (errorHandler) {
      this.errorHandler = errorHandler;
    }
    for (const phase of SYSTEM_PHASES) {
      this.sortedTasksByPhase.set(phase, []);
    }
  }

  /**
   * Registra uma tarefa/subsistema em uma fase canônica específica.
   * Retorna uma função de desregistro para limpeza imediata (ex: em onSceneLeave).
   */
  public register(
    phase: SystemPhase,
    execute: (deltaTime: number) => void,
    options: RegisterSystemOptions = {}
  ): () => void {
    const id = options.id ?? `sys_${phase}_${this.nextOrderIndex}`;
    const priority = options.priority ?? 0;
    const enabled = options.enabled ?? true;

    const task: SystemTask = {
      id,
      phase,
      priority,
      execute,
      enabled,
      orderIndex: this.nextOrderIndex++,
    };

    this.tasks.set(id, task);
    this.isDirty = true;

    return () => {
      this.unregister(id);
    };
  }

  /**
   * Remove uma tarefa pelo ID.
   */
  public unregister(id: string): boolean {
    const existed = this.tasks.delete(id);
    if (existed) {
      this.isDirty = true;
    }
    return existed;
  }

  /**
   * Habilita ou desabilita um subsistema dinamicamente.
   */
  public setEnabled(id: string, enabled: boolean): void {
    const task = this.tasks.get(id);
    if (task) {
      task.enabled = enabled;
    }
  }

  /**
   * Retorna se uma tarefa está cadastrada e ativa.
   */
  public isEnabled(id: string): boolean {
    return this.tasks.get(id)?.enabled ?? false;
  }

  /**
   * Limpa todas as tarefas registradas.
   */
  public clear(): void {
    this.tasks.clear();
    for (const phase of SYSTEM_PHASES) {
      this.sortedTasksByPhase.set(phase, []);
    }
    this.isDirty = false;
  }

  /**
   * Configura o tratador de erros de execução de subsistemas.
   */
  public setErrorHandler(handler: SystemErrorHandler | null): void {
    this.errorHandler = handler;
  }

  /**
   * Retorna a lista ordenada de tarefas ativas para uma fase ou para todas.
   */
  public getTasks(phase?: SystemPhase): readonly SystemTask[] {
    if (this.isDirty) {
      this.rebuildSortedTasks();
    }

    if (phase) {
      return this.sortedTasksByPhase.get(phase) ?? [];
    }

    const allTasks: SystemTask[] = [];
    for (const p of SYSTEM_PHASES) {
      const phaseTasks = this.sortedTasksByPhase.get(p);
      if (phaseTasks) {
        allTasks.push(...phaseTasks);
      }
    }
    return allTasks;
  }

  /**
   * Executa uma iteração do loop por todas as fases em ordem determinística estrita:
   * input -> physics -> ai -> collision -> culling -> render.
   */
  public run(deltaTime: number): void {
    if (this.isDirty) {
      this.rebuildSortedTasks();
    }

    for (const phase of SYSTEM_PHASES) {
      const phaseTasks = this.sortedTasksByPhase.get(phase);
      if (!phaseTasks || phaseTasks.length === 0) continue;

      for (let i = 0; i < phaseTasks.length; i++) {
        const task = phaseTasks[i];
        if (!task.enabled) continue;

        try {
          task.execute(deltaTime);
        } catch (error) {
          if (this.errorHandler) {
            this.errorHandler(error, task);
          } else {
            console.error(`[SystemRunner] Erro no sistema ${task.id} (fase ${task.phase}):`, error);
          }
        }
      }
    }
  }

  private rebuildSortedTasks(): void {
    for (const phase of SYSTEM_PHASES) {
      this.sortedTasksByPhase.set(phase, []);
    }

    for (const task of this.tasks.values()) {
      const bucket = this.sortedTasksByPhase.get(task.phase);
      if (bucket) {
        bucket.push(task);
      }
    }

    for (const phase of SYSTEM_PHASES) {
      const bucket = this.sortedTasksByPhase.get(phase);
      if (bucket && bucket.length > 1) {
        bucket.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.orderIndex - b.orderIndex;
        });
      }
    }

    this.isDirty = false;
  }
}

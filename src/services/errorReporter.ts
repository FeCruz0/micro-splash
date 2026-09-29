/**
 * Serviço de Relatório de Erros e Monitoramento em Totens
 * Monitora exceções não tratadas, falhas de WebGL e AudioContext.
 * Fallback seguro sem dependências pesadas externas e operação silenciosa em ambientes offline.
 */

export interface CapturedError {
  timestamp: number;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  level: "info" | "warning" | "error";
}

class ErrorReporter {
  private dsn: string;
  private errorLog: CapturedError[] = [];
  private handlersInstalled = false;

  constructor() {
    const metaEnv =
      typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as any);
    this.dsn = metaEnv.VITE_SENTRY_DSN || "";
  }

  public isConfigured(): boolean {
    return Boolean(this.dsn);
  }

  public getDsn(): string {
    return this.dsn;
  }

  public setDsn(dsn: string): void {
    this.dsn = dsn;
  }

  public getErrorLog(): CapturedError[] {
    return [...this.errorLog];
  }

  public clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Instala manipuladores globais no window
   */
  public setupGlobalHandlers(): void {
    if (this.handlersInstalled || typeof window === "undefined") return;
    this.handlersInstalled = true;

    window.addEventListener("error", (event: ErrorEvent) => {
      this.captureException(event.error || event.message, {
        source: "window.onerror",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
      this.captureException(event.reason || "Unhandled Promise Rejection", {
        source: "unhandledrejection",
      });
    });
  }

  /**
   * Captura uma exceção com contexto adicional
   */
  public captureException(error: unknown, context?: Record<string, any>): void {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const entry: CapturedError = {
      timestamp: Date.now(),
      message,
      stack,
      context,
      level: "error",
    };

    this.errorLog.push(entry);

    if (this.dsn && typeof fetch === "function") {
      // Disparo de envelope para ingestão em Sentry quando configurado
      try {
        const body = JSON.stringify({
          event_id: Math.random().toString(36).substring(2),
          timestamp: new Date().toISOString(),
          message,
          extra: context,
        });

        fetch(this.dsn, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        }).catch(() => {
          // Ignora falhas de envio em modo offline
        });
      } catch {
        // Safe fallback
      }
    }
  }

  /**
   * Captura mensagem informativa ou aviso operacional
   */
  public captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
    const entry: CapturedError = {
      timestamp: Date.now(),
      message,
      level,
    };

    this.errorLog.push(entry);
  }
}

export const errorReporter = new ErrorReporter();

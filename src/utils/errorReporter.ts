/**
 * Unified error reporting and telemetry module.
 * Combines Sentry/offline event capture, structured console routing,
 * severity levels, and test suppression in a single canonical bus.
 */

import { getRandomFloat } from "./random";

export type ReportingSeverityLevel = "information" | "warning" | "error";

export interface CapturedError {
  timestamp: number;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  level: "info" | "warning" | "error";
}

export interface LogMessagePayload {
  readonly message: string;
  readonly severity: ReportingSeverityLevel;
  readonly timestamp: number;
  readonly contextDetails?: Readonly<Record<string, unknown>>;
  readonly originalError?: unknown;
}

export type LogListenerCallback = (payload: LogMessagePayload) => void;

export class ErrorReporter {
  private dsn: string;
  private errorLog: CapturedError[] = [];
  private handlersInstalled = false;
  private isConsoleOutputSuppressed = false;
  private activeLogListeners = new Set<LogListenerCallback>();

  constructor() {
    const metaEnv =
      typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env as Record<string, string | undefined>)
        : {};
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

  public setSuppression(shouldSuppress: boolean): void {
    this.isConsoleOutputSuppressed = shouldSuppress;
  }

  public isSuppressed(): boolean {
    return this.isConsoleOutputSuppressed;
  }

  public subscribe(listener: LogListenerCallback): () => void {
    this.activeLogListeners.add(listener);
    return () => {
      this.activeLogListeners.delete(listener);
    };
  }

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

  public captureException(error: unknown, context?: Record<string, unknown>): void {
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
    this.dispatchSentryEnvelope(message, context);
  }

  public captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
    const entry: CapturedError = {
      timestamp: Date.now(),
      message,
      level,
    };

    this.errorLog.push(entry);
  }

  public dispatchReport(payload: LogMessagePayload): void {
    for (const listener of this.activeLogListeners) {
      try {
        listener(payload);
      } catch {}
    }

    try {
      if (payload.severity === "error") {
        this.captureException(
          payload.originalError || payload.message,
          payload.contextDetails as Record<string, unknown>
        );
      } else {
        this.captureMessage(payload.message, payload.severity === "warning" ? "warning" : "info");
      }
    } catch {}

    if (this.isConsoleOutputSuppressed) return;

    const prefix = `[MicroSplash:${payload.severity.toUpperCase()}]`;
    if (payload.severity === "error") {
      console.error(
        prefix,
        payload.message,
        payload.originalError ?? "",
        payload.contextDetails ?? ""
      );
    } else if (payload.severity === "warning") {
      console.warn(
        prefix,
        payload.message,
        payload.originalError ?? "",
        payload.contextDetails ?? ""
      );
    } else {
      console.info(prefix, payload.message, payload.contextDetails ?? "");
    }
  }

  private dispatchSentryEnvelope(message: string, context?: Record<string, unknown>): void {
    if (!this.dsn || typeof fetch !== "function") return;
    try {
      const body = JSON.stringify({
        event_id: getRandomFloat(0, 1).toString(36).substring(2),
        timestamp: new Date().toISOString(),
        message,
        extra: context,
      });

      fetch(this.dsn, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }
}

export const errorReporter = new ErrorReporter();

export function setReportingSuppression(shouldSuppress: boolean): void {
  errorReporter.setSuppression(shouldSuppress);
}

export function subscribeToLogReports(listener: LogListenerCallback): () => void {
  return errorReporter.subscribe(listener);
}

export function reportInformation(
  message: string,
  contextDetails?: Readonly<Record<string, unknown>>
): void {
  errorReporter.dispatchReport({
    message,
    severity: "information",
    timestamp: Date.now(),
    contextDetails,
  });
}

export function reportWarning(
  message: string,
  contextDetails?: Readonly<Record<string, unknown>>,
  originalError?: unknown
): void {
  errorReporter.dispatchReport({
    message,
    severity: "warning",
    timestamp: Date.now(),
    contextDetails,
    originalError,
  });
}

export function reportError(
  message: string,
  originalError?: unknown,
  contextDetails?: Readonly<Record<string, unknown>>
): void {
  errorReporter.dispatchReport({
    message,
    severity: "error",
    timestamp: Date.now(),
    contextDetails,
    originalError,
  });
}

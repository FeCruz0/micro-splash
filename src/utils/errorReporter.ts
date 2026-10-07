/**
 * Structured error and telemetry reporting utility.
 * Centralizes console output with severity levels, test suppression, and error formatting.
 */

import { errorReporter } from "../services/errorReporter";

export type ReportingSeverityLevel = "information" | "warning" | "error";

export interface LogMessagePayload {
  readonly message: string;
  readonly severity: ReportingSeverityLevel;
  readonly timestamp: number;
  readonly contextDetails?: Readonly<Record<string, unknown>>;
  readonly originalError?: unknown;
}

export type LogListenerCallback = (payload: LogMessagePayload) => void;

let isConsoleOutputSuppressed = false;
const activeLogListeners = new Set<LogListenerCallback>();

export function setReportingSuppression(shouldSuppress: boolean): void {
  isConsoleOutputSuppressed = shouldSuppress;
}

export function subscribeToLogReports(listener: LogListenerCallback): () => void {
  activeLogListeners.add(listener);
  return () => {
    activeLogListeners.delete(listener);
  };
}

export function reportInformation(
  message: string,
  contextDetails?: Readonly<Record<string, unknown>>
): void {
  dispatchLogReport({
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
  dispatchLogReport({
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
  dispatchLogReport({
    message,
    severity: "error",
    timestamp: Date.now(),
    contextDetails,
    originalError,
  });
}

function dispatchLogReport(payload: LogMessagePayload): void {
  for (const listener of activeLogListeners) {
    try {
      listener(payload);
    } catch {}
  }

  try {
    if (payload.severity === "error") {
      errorReporter.captureException(
        payload.originalError || payload.message,
        payload.contextDetails as Record<string, unknown>
      );
    } else {
      errorReporter.captureMessage(
        payload.message,
        payload.severity === "warning" ? "warning" : "info"
      );
    }
  } catch {}

  if (isConsoleOutputSuppressed) return;

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

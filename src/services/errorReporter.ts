/**
 * Canonical re-export of unified errorReporter module for backward compatibility.
 */
export {
  errorReporter,
  ErrorReporter,
  reportInformation,
  reportWarning,
  reportError,
  setReportingSuppression,
  subscribeToLogReports,
  type CapturedError,
  type LogMessagePayload,
  type LogListenerCallback,
  type ReportingSeverityLevel,
} from "../utils/errorReporter";

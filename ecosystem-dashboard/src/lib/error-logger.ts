/**
 * Centralized Error Logger
 * Sends errors to dashboard error logs for diagnosis
 */

export interface ErrorLog {
  timestamp: string;
  source: string; // e.g., 'podcast-studio', 'ai-gateway', 'knowledge-graph'
  errorType: string; // e.g., 'connection_failed', 'request_failed', 'parse_error'
  message: string;
  details?: any;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Log an error to the centralized error logging system
 */
export async function logError(
  source: string,
  errorType: string,
  error: Error | string,
  details?: any
): Promise<void> {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    source,
    errorType,
    message: typeof error === 'string' ? error : error.message,
    details,
    stackTrace: error instanceof Error ? error.stack : undefined,
    sessionId: getSessionId(),
  };

  try {
    // Send to centralized error logging endpoint
    await fetch('/api/system/error-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorLog),
    });

    // Also log to console for immediate visibility
    console.error(`[${source}] ${errorType}:`, errorLog);
  } catch (loggingError) {
    // If error logging fails, at least console.error it
    console.error('Failed to send error to logging system:', loggingError);
    console.error('Original error:', errorLog);
  }
}

/**
 * Get or create session ID for tracking user sessions
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = sessionStorage.getItem('error-log-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('error-log-session-id', sessionId);
  }
  return sessionId;
}

/**
 * Quick helper for common error types
 */
export const ErrorLogger = {
  /**
   * Log AI Gateway connection failure
   */
  aiGatewayConnection: (error: Error, details?: any) =>
    logError('ai-gateway', 'connection_failed', error, details),

  /**
   * Log AI Gateway request failure
   */
  aiGatewayRequest: (error: Error, details?: any) =>
    logError('ai-gateway', 'request_failed', error, details),

  /**
   * Log Podcast Studio error
   */
  podcastStudio: (errorType: string, error: Error | string, details?: any) =>
    logError('podcast-studio', errorType, error, details),

  /**
   * Log Knowledge Graph error
   */
  knowledgeGraph: (errorType: string, error: Error | string, details?: any) =>
    logError('knowledge-graph', errorType, error, details),

  /**
   * Log Research Lab error
   */
  researchLab: (errorType: string, error: Error | string, details?: any) =>
    logError('research-lab', errorType, error, details),

  /**
   * Log generic system error
   */
  system: (source: string, errorType: string, error: Error | string, details?: any) =>
    logError(source, errorType, error, details),
};

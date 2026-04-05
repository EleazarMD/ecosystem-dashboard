/**
 * WebSocket Event Types for Real-time Approval Updates
 * 
 * Defines the event structure for real-time communication between
 * the dashboard and agents for approval workflow.
 */

export type ApprovalEventType = 
  | 'approval:created'
  | 'approval:approved'
  | 'approval:denied'
  | 'approval:expired'
  | 'approval:poll';

export interface ApprovalEvent {
  type: ApprovalEventType;
  approvalId: string;
  userId: string;
  timestamp: string;
  data: {
    toolName?: string;
    agentId?: string;
    sessionId?: string;
    riskLevel?: string;
    status?: string;
    reason?: string;
  };
}

export interface WebSocketMessage {
  event: string;
  data: unknown;
  timestamp: string;
}

/**
 * Create an approval event message
 */
export function createApprovalEvent(
  type: ApprovalEventType,
  approvalId: string,
  userId: string,
  data: ApprovalEvent['data'] = {}
): ApprovalEvent {
  return {
    type,
    approvalId,
    userId,
    timestamp: new Date().toISOString(),
    data,
  };
}

/**
 * Parse a WebSocket message
 */
export function parseWebSocketMessage(message: string): WebSocketMessage | null {
  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
}

/**
 * Serialize a WebSocket message
 */
export function serializeWebSocketMessage(event: string, data: unknown): string {
  return JSON.stringify({
    event,
    data,
    timestamp: new Date().toISOString(),
  });
}

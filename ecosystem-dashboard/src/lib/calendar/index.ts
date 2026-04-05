/**
 * AI Homelab Calendar System
 * 
 * Unified calendar module with Apple/Google sync, AI scheduling,
 * family sharing, and Workspace AI integration.
 * 
 * @module calendar
 */

// Database connection
export { pool, healthCheck, getClient } from './db';

// Core calendar service
export * from './calendar-service';

// Apple Calendar sync (CalDAV)
export { 
  AppleCalendarClient,
  AppleCalendarSyncService,
  appleCalendarSync,
  parseICalEvent,
  generateICalEvent,
  type CalDAVConfig,
  type CalDAVCalendar,
  type CalDAVEvent,
  type SyncResult,
} from './apple-calendar-sync';

// Workspace AI tools
export {
  calendarTools,
  executeCalendarTool,
  getCalendarToolDefinitions,
  getCalendarToolNames,
  type ToolDefinition,
  type ToolContext,
  type ToolResult,
} from './workspace-ai-tools';

// Email-to-Calendar sync (Mac Agent integration)
export {
  EmailGraphRAGClient,
  EmailCalendarSyncService,
  emailCalendarSync,
  type EmailEventExtraction,
  type ExtractedEventData,
  type ExtractionResult,
} from './email-calendar-sync';

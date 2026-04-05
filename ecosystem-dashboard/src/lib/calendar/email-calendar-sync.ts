/**
 * Email-to-Calendar Sync Service
 * Integrates with Mac Agent Email Synchronizer to auto-extract events from emails
 * 
 * Uses the Email GraphRAG service (port 8780) for intelligent event extraction
 */

import { pool } from './db';
import * as calendarService from './calendar-service';
import type { CalendarEvent } from './calendar-service';

// ============================================
// TYPES
// ============================================

export interface EmailEventExtraction {
  id: string;
  email_id: string;
  email_subject: string;
  email_from: string;
  email_date: string;
  extracted_title: string;
  extracted_start_time: string;
  extracted_end_time: string;
  extracted_location?: string;
  extracted_attendees: string[];
  confidence_score: number;
  extraction_model: string;
  source_text: string;
  status: 'pending' | 'accepted' | 'rejected' | 'auto_created';
  created_event_id?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface ExtractedEventData {
  title: string;
  start_time: string;
  end_time?: string;
  location?: string;
  attendees?: string[];
  description?: string;
  is_all_day?: boolean;
  timezone?: string;
}

export interface ExtractionResult {
  success: boolean;
  event_data?: ExtractedEventData;
  confidence: number;
  source_text: string;
  error?: string;
}

// ============================================
// EMAIL GRAPHRAG CLIENT
// ============================================

const EMAIL_GRAPHRAG_URL = process.env.EMAIL_GRAPHRAG_URL || 'http://localhost:8780';

export class EmailGraphRAGClient {
  private baseUrl: string;

  constructor(baseUrl: string = EMAIL_GRAPHRAG_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Extract calendar event from email content using AI
   */
  async extractEventFromEmail(params: {
    email_id: string;
    subject: string;
    body: string;
    from: string;
    date: string;
  }): Promise<ExtractionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/extract-calendar-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: params.email_id,
          subject: params.subject,
          body: params.body,
          from: params.from,
          date: params.date,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email GraphRAG request failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.has_event,
        event_data: result.has_event ? {
          title: result.title,
          start_time: result.start_time,
          end_time: result.end_time,
          location: result.location,
          attendees: result.attendees,
          description: result.description,
          is_all_day: result.is_all_day,
          timezone: result.timezone,
        } : undefined,
        confidence: result.confidence || 0,
        source_text: result.source_text || params.body.substring(0, 500),
      };

    } catch (error) {
      return {
        success: false,
        confidence: 0,
        source_text: params.body.substring(0, 500),
        error: (error as Error).message,
      };
    }
  }

  /**
   * Batch extract events from multiple emails
   */
  async batchExtractEvents(emails: Array<{
    email_id: string;
    subject: string;
    body: string;
    from: string;
    date: string;
  }>): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    
    for (const email of emails) {
      const result = await this.extractEventFromEmail(email);
      results.push(result);
    }
    
    return results;
  }
}

// ============================================
// EMAIL CALENDAR SYNC SERVICE
// ============================================

export class EmailCalendarSyncService {
  private graphragClient: EmailGraphRAGClient;
  private autoCreateThreshold: number;

  constructor(options?: {
    graphragUrl?: string;
    autoCreateThreshold?: number;
  }) {
    this.graphragClient = new EmailGraphRAGClient(options?.graphragUrl);
    this.autoCreateThreshold = options?.autoCreateThreshold || 0.85;
  }

  /**
   * Process an email and extract potential calendar events
   */
  async processEmail(params: {
    owner_id: string;
    email_id: string;
    subject: string;
    body: string;
    from: string;
    date: string;
    auto_create?: boolean;
  }): Promise<EmailEventExtraction | null> {
    // Check if already processed
    const existingResult = await pool.query(
      `SELECT * FROM calendar.email_extractions WHERE email_id = $1`,
      [params.email_id]
    );

    if (existingResult.rows[0]) {
      return existingResult.rows[0];
    }

    // Extract event from email
    const extraction = await this.graphragClient.extractEventFromEmail({
      email_id: params.email_id,
      subject: params.subject,
      body: params.body,
      from: params.from,
      date: params.date,
    });

    if (!extraction.success || !extraction.event_data) {
      return null;
    }

    // Determine initial status based on confidence
    let status: 'pending' | 'auto_created' = 'pending';
    let createdEventId: string | undefined;

    // Auto-create if confidence is high and auto_create is enabled
    if (params.auto_create && extraction.confidence >= this.autoCreateThreshold) {
      try {
        const calendar = await calendarService.ensureDefaultCalendar(params.owner_id);
        
        // Calculate end time if not provided (default 1 hour)
        const startTime = new Date(extraction.event_data.start_time);
        const endTime = extraction.event_data.end_time 
          ? new Date(extraction.event_data.end_time)
          : new Date(startTime.getTime() + 60 * 60 * 1000);

        const event = await calendarService.createEvent({
          calendar_id: calendar.id,
          title: extraction.event_data.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          location: extraction.event_data.location,
          description: extraction.event_data.description || `Extracted from email: ${params.subject}`,
          all_day: extraction.event_data.is_all_day,
          timezone: extraction.event_data.timezone || 'America/Chicago',
          created_by: params.owner_id,
          attendees: extraction.event_data.attendees?.map(email => ({ email })),
        });

        // Mark as AI extracted
        await pool.query(
          `UPDATE calendar.events SET 
            ai_extracted = true,
            ai_confidence = $1,
            ai_source_email_id = $2,
            ai_extracted_data = $3
           WHERE id = $4`,
          [
            extraction.confidence,
            params.email_id,
            JSON.stringify(extraction.event_data),
            event.id,
          ]
        );

        createdEventId = event.id;
        status = 'auto_created';
      } catch (error) {
        console.error('Failed to auto-create event:', error);
        status = 'pending';
      }
    }

    // Store extraction record
    const insertResult = await pool.query(
      `INSERT INTO calendar.email_extractions (
        email_id, email_subject, email_from, email_date,
        extracted_title, extracted_start_time, extracted_end_time,
        extracted_location, extracted_attendees, confidence_score,
        extraction_model, source_text, status, created_event_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        params.email_id,
        params.subject,
        params.from,
        params.date,
        extraction.event_data.title,
        extraction.event_data.start_time,
        extraction.event_data.end_time,
        extraction.event_data.location,
        JSON.stringify(extraction.event_data.attendees || []),
        extraction.confidence,
        'email-graphrag-v1',
        extraction.source_text,
        status,
        createdEventId,
      ]
    );

    return insertResult.rows[0];
  }

  /**
   * Get pending email extractions for review
   */
  async getPendingExtractions(ownerId: string): Promise<EmailEventExtraction[]> {
    const result = await pool.query(
      `SELECT ee.* FROM calendar.email_extractions ee
       WHERE ee.status = 'pending'
       ORDER BY ee.confidence_score DESC, ee.created_at DESC
       LIMIT 50`
    );
    return result.rows;
  }

  /**
   * Accept an email extraction and create the calendar event
   */
  async acceptExtraction(params: {
    extraction_id: string;
    owner_id: string;
    calendar_id?: string;
    modifications?: Partial<ExtractedEventData>;
  }): Promise<CalendarEvent> {
    // Get extraction
    const extractionResult = await pool.query(
      `SELECT * FROM calendar.email_extractions WHERE id = $1`,
      [params.extraction_id]
    );

    if (!extractionResult.rows[0]) {
      throw new Error('Extraction not found');
    }

    const extraction = extractionResult.rows[0];

    if (extraction.status !== 'pending') {
      throw new Error(`Extraction already ${extraction.status}`);
    }

    // Merge modifications if provided
    const eventData = {
      title: params.modifications?.title || extraction.extracted_title,
      start_time: params.modifications?.start_time || extraction.extracted_start_time,
      end_time: params.modifications?.end_time || extraction.extracted_end_time,
      location: params.modifications?.location || extraction.extracted_location,
      attendees: params.modifications?.attendees || JSON.parse(extraction.extracted_attendees),
    };

    // Get or create calendar
    const calendarId = params.calendar_id || 
      (await calendarService.ensureDefaultCalendar(params.owner_id)).id;

    // Calculate end time if not provided
    const startTime = new Date(eventData.start_time);
    const endTime = eventData.end_time 
      ? new Date(eventData.end_time)
      : new Date(startTime.getTime() + 60 * 60 * 1000);

    // Create event
    const event = await calendarService.createEvent({
      calendar_id: calendarId,
      title: eventData.title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: eventData.location,
      description: `Extracted from email: ${extraction.email_subject}`,
      created_by: params.owner_id,
      attendees: eventData.attendees?.map((email: string) => ({ email })),
    });

    // Mark event as AI extracted
    await pool.query(
      `UPDATE calendar.events SET 
        ai_extracted = true,
        ai_confidence = $1,
        ai_source_email_id = $2
       WHERE id = $3`,
      [extraction.confidence_score, extraction.email_id, event.id]
    );

    // Update extraction status
    await pool.query(
      `UPDATE calendar.email_extractions SET 
        status = 'accepted',
        created_event_id = $1,
        reviewed_by = $2,
        reviewed_at = NOW()
       WHERE id = $3`,
      [event.id, params.owner_id, params.extraction_id]
    );

    return event;
  }

  /**
   * Reject an email extraction
   */
  async rejectExtraction(params: {
    extraction_id: string;
    owner_id: string;
  }): Promise<void> {
    await pool.query(
      `UPDATE calendar.email_extractions SET 
        status = 'rejected',
        reviewed_by = $1,
        reviewed_at = NOW()
       WHERE id = $2`,
      [params.owner_id, params.extraction_id]
    );
  }

  /**
   * Get extraction statistics
   */
  async getExtractionStats(ownerId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    auto_created: number;
    average_confidence: number;
  }> {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'auto_created') as auto_created,
        AVG(confidence_score) as average_confidence
       FROM calendar.email_extractions`
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total),
      pending: parseInt(row.pending),
      accepted: parseInt(row.accepted),
      rejected: parseInt(row.rejected),
      auto_created: parseInt(row.auto_created),
      average_confidence: parseFloat(row.average_confidence) || 0,
    };
  }

  /**
   * Webhook handler for Mac Agent email notifications
   */
  async handleMacAgentWebhook(payload: {
    event: 'new_email' | 'email_updated';
    email: {
      id: string;
      subject: string;
      body: string;
      from: string;
      date: string;
      account_id: string;
    };
  }): Promise<EmailEventExtraction | null> {
    if (payload.event !== 'new_email') {
      return null;
    }

    // Get owner_id from account mapping (simplified - in production use proper mapping)
    const owner_id = payload.email.account_id;

    return this.processEmail({
      owner_id,
      email_id: payload.email.id,
      subject: payload.email.subject,
      body: payload.email.body,
      from: payload.email.from,
      date: payload.email.date,
      auto_create: true, // Auto-create high-confidence events
    });
  }
}

// Export singleton instance
export const emailCalendarSync = new EmailCalendarSyncService();

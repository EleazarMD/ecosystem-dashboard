/**
 * Calendar Event Analysis API
 * POST /api/calendar/analyze-event
 * 
 * Provides AI-powered analysis of calendar events by integrating:
 * - Personal Identity Core (PIC) for user context and preferences
 * - Hermes Core for calendar intelligence and related events
 * - AI Gateway for natural language analysis
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { hermesFetch } from '@/lib/hermes-client';

const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://localhost:8780';
const PIC_BASE_URL = process.env.PIC_BASE_URL || 'http://localhost:8765/api/pic';
const AI_GATEWAY_URL = process.env.AI_GATEWAY_URL || 'http://localhost:8787';
const PIC_READ_KEY = process.env.PIC_READ_KEY || 'dev-read-key-change-in-prod';

interface CalendarEvent {
  id: string;
  calendar_id: string;
  calendar_name?: string;
  calendar_color?: string;
  calendar_type?: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  status?: string;
  priority?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    response_status?: string;
  }>;
  ai_extracted?: boolean;
  ical_uid?: string; // Links to email thread for meeting invites
  external_id?: string;
  external_source?: string;
}

interface AnalysisResult {
  summary: string;
  meetingType: string;
  estimatedImportance: number;
  preparationTips: string[];
  conflictWarnings: string[];
  relatedContext: string[];
  suggestedActions: Array<{
    action: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  relatedEvents?: Array<{
    id: string;
    title: string;
    date: string;
    relevance: string;
  }>;
  relatedEmails?: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    preview: string;
    similarity: number;
  }>;
  attendeeInsights?: Array<{
    email: string;
    name?: string;
    relationship?: string;
    lastInteraction?: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  const owner_id = getMobileOrSessionUserId(session?.user?.id, req);

  if (!owner_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { event } = req.body as { event: CalendarEvent };

  if (!event || !event.id) {
    return res.status(400).json({ error: 'Event data is required' });
  }

  try {
    // Parallel fetch from multiple sources
    const [
      picContext,
      relatedEvents,
      conflictCheck,
      relatedEmails,
    ] = await Promise.allSettled([
      fetchPICContext(owner_id, event),
      fetchRelatedEvents(event),
      checkScheduleConflicts(event),
      searchRelatedEmails(event),
    ]);

    // Build analysis from gathered context
    const analysis = await buildAnalysis(
      event,
      picContext.status === 'fulfilled' ? picContext.value : null,
      relatedEvents.status === 'fulfilled' ? relatedEvents.value : [],
      conflictCheck.status === 'fulfilled' ? conflictCheck.value : [],
      relatedEmails.status === 'fulfilled' ? relatedEmails.value : [],
    );

    return res.status(200).json({ 
      success: true, 
      analysis,
      sources: {
        pic: picContext.status === 'fulfilled',
        hermes: relatedEvents.status === 'fulfilled',
        conflicts: conflictCheck.status === 'fulfilled',
        emails: relatedEmails.status === 'fulfilled',
      }
    });

  } catch (error) {
    console.error('[Calendar Analysis API] Error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed',
      message: (error as Error).message,
    });
  }
}

/**
 * Fetch user context from Personal Identity Core
 */
async function fetchPICContext(userId: string, event: CalendarEvent): Promise<any> {
  try {
    // Get user preferences and context from PIC
    const response = await fetch(`${PIC_BASE_URL}/context/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-PIC-Read-Key': PIC_READ_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        event_title: event.title,
        event_location: event.location,
        attendees: event.attendees?.map(a => a.email) || [],
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('[PIC Context] Failed to fetch:', error);
    return null;
  }
}

/**
 * Fetch related events from Hermes Core
 */
async function fetchRelatedEvents(event: CalendarEvent): Promise<any[]> {
  try {
    // Get events in the same time window (±7 days)
    const startDate = new Date(event.start_time);
    const rangeStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rangeEnd = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
      start_date: rangeStart.toISOString(),
      end_date: rangeEnd.toISOString(),
    });

    const response = await hermesFetch(`/v1/calendar/events?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      const events = data.events || [];
      
      // Filter to find related events (same attendees, similar titles, recurring)
      return events
        .filter((e: any) => e.id !== event.id)
        .filter((e: any) => {
          // Check for attendee overlap
          const eventAttendees = new Set(event.attendees?.map(a => a.email.toLowerCase()) || []);
          const otherAttendees = e.attendees?.map((a: any) => a.email?.toLowerCase()) || [];
          const hasOverlap = otherAttendees.some((email: string) => eventAttendees.has(email));
          
          // Check for title similarity
          const titleWords = event.title.toLowerCase().split(/\s+/);
          const otherTitleWords = e.title.toLowerCase().split(/\s+/);
          const commonWords = titleWords.filter((w: string) => 
            w.length > 3 && otherTitleWords.includes(w)
          );
          const hasSimilarTitle = commonWords.length >= 2;
          
          return hasOverlap || hasSimilarTitle;
        })
        .slice(0, 5)
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.start_time,
          relevance: 'Related meeting',
        }));
    }
    return [];
  } catch (error) {
    console.error('[Hermes Related Events] Failed to fetch:', error);
    return [];
  }
}

/**
 * Search for related emails from Hermes Core
 * Uses a three-tier approach:
 * 1. Direct thread lookup via iCalUID (the actual email thread that created the meeting)
 * 2. Attendee-based search (emails from meeting participants)
 * 3. Semantic search (broader context and related discussions)
 */
async function searchRelatedEmails(event: CalendarEvent): Promise<any[]> {
  try {
    const attendeeEmails = event.attendees?.map(a => a.email).filter(Boolean) || [];
    const allEmails: any[] = [];
    const seenIds = new Set<string>();
    
    // ===========================================
    // TIER 1: Direct thread lookup via iCalUID
    // This is the definitive link between calendar events and email threads
    // When a meeting is created from an email, the iCalUID references the thread
    // ===========================================
    if (event.ical_uid) {
      try {
        // The iCalUID often contains or references the original message-id
        // Try to find the thread directly
        const threadResponse = await hermesFetch(
          `/v1/threads/${encodeURIComponent(event.ical_uid)}`
        );
        
        if (threadResponse.ok) {
          const threadData = await threadResponse.json();
          for (const email of (threadData.emails || [])) {
            if (!seenIds.has(email.id || email.email?.id)) {
              const emailId = email.id || email.email?.id;
              seenIds.add(emailId);
              allEmails.push({
                id: emailId,
                subject: email.subject || email.email?.subject,
                from: email.from_email || email.sender?.email || email.email?.from_email,
                date: email.date || email.email?.date,
                preview: email.body_preview || email.email?.body_preview || '',
                similarity: 1.0, // Perfect match - this IS the thread
                source: 'thread',
              });
            }
          }
        }
        
        // Also try searching by iCalUID as a reference in email headers
        if (allEmails.length === 0) {
          const refResponse = await hermesFetch(`/v1/emails/search`, {
            method: 'POST',
            body: JSON.stringify({
              query: event.ical_uid,
              top_k: 5,
              include_sent: true,
              include_inbox: true,
            }),
          });
          
          if (refResponse.ok) {
            const refData = await refResponse.json();
            for (const r of (refData.results || [])) {
              const emailId = r.email_id || r.id;
              if (!seenIds.has(emailId) && r.similarity > 0.7) {
                seenIds.add(emailId);
                allEmails.push({
                  id: emailId,
                  subject: r.subject,
                  from: r.from_addr || r.from_email,
                  date: r.date,
                  preview: r.snippet || r.body_preview || '',
                  similarity: 0.95, // High confidence - matched by UID
                  source: 'ical_ref',
                });
              }
            }
          }
        }
      } catch (e) {
        console.log('[Email Search] Thread lookup failed, continuing with other strategies');
      }
    }
    
    // ===========================================
    // TIER 2: Attendee-based search
    // Find emails from/to meeting participants about this topic
    // ===========================================
    if (allEmails.length < 3 && attendeeEmails.length > 0) {
      const attendeeNames = event.attendees
        ?.map(a => a.name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' ') || '';
      
      const titleKeywords = event.title
        .replace(/\b(meeting|call|sync|weekly|daily|monthly|standup|1:1|one on one)\b/gi, '')
        .trim();
      
      const searchQuery = `${titleKeywords} ${attendeeNames}`.trim() || event.title;
      
      for (const attendeeEmail of attendeeEmails.slice(0, 3)) {
        try {
          const response = await hermesFetch(`/v1/emails/search`, {
            method: 'POST',
            body: JSON.stringify({
              query: searchQuery,
              top_k: 3,
              include_sent: true,
              include_inbox: true,
              from_person: attendeeEmail,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            for (const r of (data.results || [])) {
              const emailId = r.email_id || r.id;
              if (!seenIds.has(emailId) && r.similarity > 0.3) {
                seenIds.add(emailId);
                allEmails.push({
                  id: emailId,
                  subject: r.subject,
                  from: r.from_addr || r.from_email || attendeeEmail,
                  date: r.date,
                  preview: r.snippet || r.body_preview || '',
                  similarity: Math.min((r.similarity || 0.5) + 0.2, 0.9), // Boost but cap below thread
                  source: 'attendee',
                });
              }
            }
          }
        } catch (e) {
          // Continue with other strategies
        }
      }
    }
    
    // ===========================================
    // TIER 3: Semantic search for broader context
    // Find related discussions that might be relevant
    // ===========================================
    if (allEmails.length < 5) {
      try {
        const searchQuery = event.title;
        const response = await hermesFetch(`/v1/emails/search`, {
          method: 'POST',
          body: JSON.stringify({
            query: searchQuery,
            top_k: 5,
            include_sent: true,
            include_inbox: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          for (const r of (data.results || [])) {
            const emailId = r.email_id || r.id;
            if (!seenIds.has(emailId) && r.similarity > 0.4) {
              seenIds.add(emailId);
              allEmails.push({
                id: emailId,
                subject: r.subject,
                from: r.from_addr || r.from_email || r.from,
                date: r.date,
                preview: r.snippet || r.body_preview || '',
                similarity: r.similarity || 0.5,
                source: 'semantic',
              });
            }
          }
        }
      } catch (e) {
        console.error('[Hermes Email Search] Semantic search failed:', e);
      }
    }
    
    // Sort by similarity/relevance and return top 5
    // Thread emails will always be first due to similarity = 1.0
    return allEmails
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
      
  } catch (error) {
    console.error('[Hermes Email Search] Failed:', error);
    return [];
  }
}

/**
 * Check for schedule conflicts from Hermes Core
 */
async function checkScheduleConflicts(event: CalendarEvent): Promise<string[]> {
  try {
    const startTime = new Date(event.start_time);
    const endTime = new Date(event.end_time);
    
    // Expand window slightly to catch adjacent events
    const windowStart = new Date(startTime.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(endTime.getTime() + 30 * 60 * 1000);

    const params = new URLSearchParams({
      start_date: windowStart.toISOString(),
      end_date: windowEnd.toISOString(),
    });

    const response = await hermesFetch(`/v1/calendar/events?${params}`);
    
    if (response.ok) {
      const data = await response.json();
      const events = (data.events || []).filter((e: any) => e.id !== event.id);
      
      const conflicts: string[] = [];
      
      for (const other of events) {
        const otherStart = new Date(other.start_time);
        const otherEnd = new Date(other.end_time);
        
        // Check for overlap
        if (startTime < otherEnd && endTime > otherStart) {
          conflicts.push(`Overlaps with "${other.title}" (${otherStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
        }
        // Check for back-to-back (no buffer)
        else if (Math.abs(endTime.getTime() - otherStart.getTime()) < 5 * 60 * 1000) {
          conflicts.push(`Back-to-back with "${other.title}" - no buffer time`);
        }
        else if (Math.abs(otherEnd.getTime() - startTime.getTime()) < 5 * 60 * 1000) {
          conflicts.push(`Immediately after "${other.title}" - no buffer time`);
        }
      }
      
      return conflicts;
    }
    return [];
  } catch (error) {
    console.error('[Conflict Check] Failed:', error);
    return [];
  }
}

/**
 * Build comprehensive analysis from all sources
 */
async function buildAnalysis(
  event: CalendarEvent,
  picContext: any,
  relatedEvents: any[],
  conflicts: string[],
  relatedEmails: any[],
): Promise<AnalysisResult> {
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
  const durationStr = duration >= 60 
    ? `${Math.floor(duration / 60)}h ${duration % 60 > 0 ? `${duration % 60}m` : ''}`
    : `${duration} min`;

  // Detect meeting characteristics
  const isVideoMeeting = event.location?.toLowerCase().includes('zoom') || 
                         event.location?.toLowerCase().includes('meet.google') ||
                         event.location?.toLowerCase().includes('teams');
  const hasAttendees = event.attendees && event.attendees.length > 0;
  const attendeeCount = event.attendees?.length || 0;
  
  // Detect event type from title/description
  const titleLower = event.title.toLowerCase();
  const isMedical = titleLower.includes('health') || titleLower.includes('doctor') || 
                    titleLower.includes('medical') || titleLower.includes('appointment');
  const is1on1 = titleLower.includes('1:1') || titleLower.includes('one on one') || 
                 titleLower.includes('1-1') || attendeeCount === 1;
  const isStandup = titleLower.includes('standup') || titleLower.includes('sync') || 
                    titleLower.includes('daily');
  const isReview = titleLower.includes('review') || titleLower.includes('retrospective');
  const isInterview = titleLower.includes('interview');
  const isTraining = titleLower.includes('training') || titleLower.includes('workshop');

  // Determine meeting type
  let meetingType = 'General';
  if (isMedical) meetingType = 'Healthcare';
  else if (isInterview) meetingType = 'Interview';
  else if (isTraining) meetingType = 'Training/Workshop';
  else if (is1on1) meetingType = '1:1 Meeting';
  else if (isStandup) meetingType = 'Team Sync';
  else if (isReview) meetingType = 'Review Session';
  else if (isVideoMeeting) meetingType = 'Video Conference';
  else if (attendeeCount > 5) meetingType = 'Large Meeting';

  // Calculate importance score
  let importance = 50;
  if (isMedical) importance += 30;
  if (isInterview) importance += 25;
  if (attendeeCount > 3) importance += 10;
  if (attendeeCount > 10) importance += 10;
  if (event.priority === 'high' || event.priority === 'urgent') importance += 20;
  if (conflicts.length > 0) importance += 10;
  if (picContext?.highPriority) importance += 15;
  importance = Math.min(100, importance);

  // Build preparation tips
  const preparationTips: string[] = [];
  
  if (isVideoMeeting) {
    preparationTips.push('Test your audio/video setup 5 minutes before');
    preparationTips.push('Have meeting link ready to join');
  }
  
  if (hasAttendees) {
    const pendingCount = event.attendees?.filter(a => 
      !a.response_status || a.response_status === 'pending' || a.response_status === 'needsAction'
    ).length || 0;
    if (pendingCount > 0) {
      preparationTips.push(`${pendingCount} attendee(s) haven't responded - consider following up`);
    }
    preparationTips.push(`Review attendee list (${attendeeCount} participant${attendeeCount > 1 ? 's' : ''})`);
  }
  
  if (isMedical) {
    preparationTips.push('Bring insurance card and ID');
    preparationTips.push('Prepare list of current medications');
    preparationTips.push('Note any symptoms or questions to discuss');
  }
  
  if (isInterview) {
    preparationTips.push('Review candidate resume/portfolio');
    preparationTips.push('Prepare interview questions');
    preparationTips.push('Have evaluation criteria ready');
  }
  
  if (event.description) {
    preparationTips.push('Review meeting agenda/description');
  }

  // Build suggested actions
  const suggestedActions: Array<{ action: string; priority: 'high' | 'medium' | 'low' }> = [];
  
  if (conflicts.length > 0) {
    suggestedActions.push({ 
      action: 'Resolve schedule conflicts', 
      priority: 'high' 
    });
  }
  
  if (isVideoMeeting) {
    suggestedActions.push({ 
      action: 'Add meeting link to quick access', 
      priority: 'medium' 
    });
  }
  
  if (isMedical && !event.location?.includes('telehealth')) {
    suggestedActions.push({ 
      action: 'Set reminder 1 hour before for travel time', 
      priority: 'high' 
    });
  }
  
  if (duration > 60 && !isTraining) {
    suggestedActions.push({ 
      action: 'Consider adding a break or shortening meeting', 
      priority: 'low' 
    });
  }

  // Build conflict warnings
  const conflictWarnings = [...conflicts];
  
  const startHour = startTime.getHours();
  if (startHour < 8) {
    conflictWarnings.push('Early morning meeting - ensure you\'re available');
  }
  if (startHour >= 18) {
    conflictWarnings.push('After-hours event - may conflict with personal time');
  }
  if (startHour === 12 || startHour === 13) {
    conflictWarnings.push('Lunch hour meeting - consider meal timing');
  }

  // Build related context
  const relatedContext: string[] = [];
  
  if (relatedEvents.length > 0) {
    relatedContext.push(`${relatedEvents.length} related event(s) this week`);
  }
  
  if (relatedEmails.length > 0) {
    relatedContext.push(`${relatedEmails.length} related email(s) found`);
  }
  
  if (picContext?.previousMeetings) {
    relatedContext.push(`${picContext.previousMeetings} previous meetings with attendees`);
  }

  // Build summary
  let summary = `This is a ${durationStr} ${meetingType.toLowerCase()}`;
  if (hasAttendees) summary += ` with ${attendeeCount} participant${attendeeCount > 1 ? 's' : ''}`;
  if (isVideoMeeting) summary += ', held virtually';
  else if (event.location) summary += ` at ${event.location.split(',')[0]}`;
  summary += '.';
  
  if (conflicts.length > 0) {
    summary += ` Note: ${conflicts.length} scheduling concern${conflicts.length > 1 ? 's' : ''} detected.`;
  }

  // Build attendee insights from PIC context
  const attendeeInsights = picContext?.attendeeInsights || event.attendees?.slice(0, 5).map(a => ({
    email: a.email,
    name: a.name,
    relationship: undefined,
    lastInteraction: undefined,
  }));

  return {
    summary,
    meetingType,
    estimatedImportance: importance,
    preparationTips: preparationTips.slice(0, 5),
    conflictWarnings,
    relatedContext,
    suggestedActions: suggestedActions.slice(0, 4),
    relatedEvents: relatedEvents.slice(0, 3),
    relatedEmails: relatedEmails.slice(0, 5),
    attendeeInsights,
  };
}

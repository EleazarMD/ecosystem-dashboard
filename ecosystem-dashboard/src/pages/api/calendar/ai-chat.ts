/**
 * Calendar AI Chat API
 * POST /api/calendar/ai-chat - Process natural language calendar commands
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { executeCalendarTool, getCalendarToolDefinitions } from '@/lib/calendar';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const owner_id = (session.user as any).id;

  try {
    if (req.method === 'POST') {
      const { message, settings } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'message is required' });
      }

      // Parse intent from message
      const intent = parseCalendarIntent(message);
      
      let response = '';
      const toolCalls: Array<{ name: string; result: string }> = [];

      // Execute appropriate tool based on intent
      if (intent.tool) {
        const result = await executeCalendarTool(
          intent.tool,
          intent.params,
          { owner_id }
        );

        toolCalls.push({
          name: intent.tool,
          result: result.success ? 'success' : 'failed',
        });

        if (result.success) {
          response = formatToolResponse(intent.tool, result);
        } else {
          response = `I encountered an issue: ${result.error || 'Unknown error'}`;
        }
      } else {
        // General response
        response = getGeneralResponse(message);
      }

      return res.status(200).json({
        response,
        toolCalls,
        intent,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Calendar AI chat error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

interface CalendarIntent {
  tool?: string;
  params: Record<string, unknown>;
  confidence: number;
}

interface ParsedEvent {
  title: string;
  start_time: Date | null;
  end_time: Date;
  location?: string;
  description?: string;
  confidence: number;
}

function parseNaturalLanguageEvent(message: string): ParsedEvent {
  const lower = message.toLowerCase();
  const now = new Date();
  
  // Default values
  let title = 'New Event';
  let startTime: Date | null = null;
  let duration = 60; // minutes
  let location: string | undefined;
  let confidence = 0.5;

  // Parse duration
  const durationMatch = lower.match(/(\d+)\s*(?:hour|hr)s?/i) || lower.match(/(\d+)\s*(?:minute|min)s?/i);
  if (durationMatch) {
    const value = parseInt(durationMatch[1]);
    if (lower.includes('hour') || lower.includes('hr')) {
      duration = value * 60;
    } else {
      duration = value;
    }
    confidence += 0.1;
  }

  // Parse time
  const timeMatch = lower.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const meridiem = timeMatch[3]?.toLowerCase();
    
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    // If no meridiem and hour < 8, assume PM for business hours
    if (!meridiem && hour >= 1 && hour <= 7) hour += 12;
    
    startTime = new Date(now);
    startTime.setHours(hour, minute, 0, 0);
    confidence += 0.2;
  }

  // Parse date
  if (lower.includes('tomorrow')) {
    if (!startTime) startTime = new Date(now);
    startTime.setDate(startTime.getDate() + 1);
    confidence += 0.15;
  } else if (lower.includes('today')) {
    if (!startTime) startTime = new Date(now);
    confidence += 0.1;
  } else if (lower.includes('next week')) {
    if (!startTime) startTime = new Date(now);
    startTime.setDate(startTime.getDate() + 7);
    confidence += 0.1;
  } else {
    // Parse day of week
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        if (!startTime) startTime = new Date(now);
        const currentDay = startTime.getDay();
        let daysUntil = i - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next occurrence
        startTime.setDate(startTime.getDate() + daysUntil);
        confidence += 0.15;
        break;
      }
    }
  }

  // If no time specified but we have a date, default to 9 AM
  if (startTime && !timeMatch) {
    startTime.setHours(9, 0, 0, 0);
  }

  // Parse title - extract meaningful content
  // Remove common phrases and extract the event description
  let titleCandidate = message
    .replace(/schedule|create|add|book|set up|a\s+/gi, '')
    .replace(/(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, '')
    .replace(/tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday/gi, '')
    .replace(/for\s+\d+\s*(?:hour|hr|minute|min)s?/gi, '')
    .replace(/with\s+/gi, 'with ')
    .trim();

  // Clean up extra spaces
  titleCandidate = titleCandidate.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter
  if (titleCandidate) {
    title = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);
    confidence += 0.15;
  }

  // Parse location (after "at" that's not a time)
  const locationMatch = message.match(/(?:at|in)\s+(?![\d])([\w\s]+?)(?:\s+(?:at|on|for|tomorrow|today)|$)/i);
  if (locationMatch && !locationMatch[1].match(/^\d/)) {
    location = locationMatch[1].trim();
    // Don't use location if it looks like a time
    if (location.match(/am|pm|\d{1,2}:\d{2}/i)) {
      location = undefined;
    }
  }

  // Calculate end time
  const endTime = startTime ? new Date(startTime.getTime() + duration * 60 * 1000) : new Date(now.getTime() + duration * 60 * 1000);

  return {
    title,
    start_time: startTime,
    end_time: endTime,
    location,
    confidence: Math.min(confidence, 1),
  };
}

function parseCalendarIntent(message: string): CalendarIntent {
  const lower = message.toLowerCase();

  // Today's agenda
  if (lower.includes('today') && (lower.includes('agenda') || lower.includes('schedule') || lower.includes('calendar'))) {
    return {
      tool: 'calendar_get_today_agenda',
      params: {},
      confidence: 0.9,
    };
  }

  // Get events for a date range
  if (lower.includes('this week') || lower.includes('next week')) {
    const today = new Date();
    const startOfWeek = new Date(today);
    const endOfWeek = new Date(today);
    
    if (lower.includes('next week')) {
      startOfWeek.setDate(today.getDate() + (7 - today.getDay()));
      endOfWeek.setDate(startOfWeek.getDate() + 6);
    } else {
      startOfWeek.setDate(today.getDate() - today.getDay());
      endOfWeek.setDate(startOfWeek.getDate() + 6);
    }

    return {
      tool: 'calendar_get_events',
      params: {
        start_date: startOfWeek.toISOString(),
        end_date: endOfWeek.toISOString(),
      },
      confidence: 0.85,
    };
  }

  // Find free time
  if (lower.includes('free') || lower.includes('available') || lower.includes('open')) {
    let targetDate = new Date();
    
    if (lower.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (lower.includes('friday')) {
      const daysUntilFriday = (5 - targetDate.getDay() + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilFriday);
    }

    return {
      tool: 'calendar_find_free_time',
      params: {
        date: targetDate.toISOString().split('T')[0],
        duration_minutes: 60,
      },
      confidence: 0.85,
    };
  }

  // Check conflicts
  if (lower.includes('conflict') || lower.includes('overlap')) {
    return {
      tool: 'calendar_check_conflicts',
      params: {
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      confidence: 0.8,
    };
  }

  // Get stats
  if (lower.includes('stats') || lower.includes('statistics') || lower.includes('summary')) {
    return {
      tool: 'calendar_get_stats',
      params: {},
      confidence: 0.85,
    };
  }

  // List calendars
  if (lower.includes('list') && lower.includes('calendar')) {
    return {
      tool: 'calendar_list_calendars',
      params: {},
      confidence: 0.85,
    };
  }

  // Create event (enhanced detection)
  if (lower.includes('schedule') || lower.includes('create') || lower.includes('add') || lower.includes('book') || lower.includes('set up')) {
    const eventKeywords = ['meeting', 'event', 'appointment', 'call', 'lunch', 'dinner', 'coffee', 'sync', 'standup', 'review', 'interview', 'session'];
    const hasEventKeyword = eventKeywords.some(kw => lower.includes(kw));
    
    if (hasEventKeyword || lower.match(/schedule|create|add|book/)) {
      // Parse the natural language for event details
      const parsed = parseNaturalLanguageEvent(message);
      
      if (parsed.start_time) {
        return {
          tool: 'calendar_create_event',
          params: {
            title: parsed.title,
            start_time: parsed.start_time.toISOString(),
            end_time: parsed.end_time.toISOString(),
            location: parsed.location,
            description: parsed.description,
          },
          confidence: parsed.confidence,
        };
      }
    }
  }

  // No specific intent detected
  return {
    params: {},
    confidence: 0,
  };
}

function formatToolResponse(tool: string, result: any): string {
  switch (tool) {
    case 'calendar_get_today_agenda':
      if (!result.data?.events || result.data.events.length === 0) {
        return '📅 **Today\'s Agenda**\n\nYou have no events scheduled for today. Enjoy your free day!';
      }
      const events = result.data.events;
      const agenda = result.data.agenda;
      let response = `📅 **Today's Agenda** (${events.length} events)\n\n`;
      agenda.forEach((item: any) => {
        response += `• **${item.time}** - ${item.title}`;
        if (item.location) response += ` 📍 ${item.location}`;
        response += ` (${item.duration})\n`;
      });
      return response;

    case 'calendar_get_events':
      if (!result.data || result.data.length === 0) {
        return '📅 No events found for this period.';
      }
      return `📅 Found **${result.data.length} events** in this period.\n\n${result.data.slice(0, 5).map((e: any) => 
        `• ${new Date(e.start_time).toLocaleDateString()} - ${e.title}`
      ).join('\n')}`;

    case 'calendar_find_free_time':
      if (!result.data || result.data.length === 0) {
        return '🕐 No free time slots found for this date.';
      }
      let freeResponse = `🕐 **Available Time Slots**\n\n`;
      result.data.slice(0, 5).forEach((slot: any) => {
        freeResponse += `• ${slot.formatted}\n`;
      });
      return freeResponse;

    case 'calendar_get_stats':
      const stats = result.data;
      return `📊 **Calendar Statistics**\n\n` +
        `• Events today: **${stats.events_today}**\n` +
        `• Events this week: **${stats.events_this_week}**\n` +
        `• Total calendars: **${stats.total_calendars}**\n` +
        `• Pending invites: **${stats.pending_invites}**`;

    case 'calendar_list_calendars':
      if (!result.data || result.data.length === 0) {
        return '📅 You have no calendars yet. Would you like to create one?';
      }
      return `📅 **Your Calendars** (${result.data.length})\n\n` +
        result.data.map((c: any) => `• ${c.name} (${c.calendar_type})`).join('\n');

    case 'calendar_create_event':
      return `✅ **Event Created**\n\n` +
        `**${result.data.title}**\n` +
        `📅 ${new Date(result.data.start_time).toLocaleString()}\n` +
        (result.data.location ? `📍 ${result.data.location}\n` : '');

    case 'calendar_check_conflicts':
      if (!result.data || result.data.length === 0) {
        return '✅ No conflicts found! Your schedule looks good.';
      }
      return `⚠️ **${result.data.length} Conflicts Found**\n\n` +
        result.data.map((c: any) => `• ${c.title} - ${new Date(c.start_time).toLocaleString()}`).join('\n');

    default:
      return result.message || 'Action completed successfully.';
  }
}

function getGeneralResponse(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! 👋 I\'m your Calendar AI assistant. I can help you:\n\n' +
      '• View your agenda\n' +
      '• Find free time\n' +
      '• Schedule events\n' +
      '• Check for conflicts\n\n' +
      'What would you like to do?';
  }

  if (lower.includes('help')) {
    return '🤖 **Calendar AI Commands**\n\n' +
      '**View Schedule:**\n' +
      '• "What\'s on my calendar today?"\n' +
      '• "Show me this week\'s events"\n\n' +
      '**Find Time:**\n' +
      '• "Find free time tomorrow"\n' +
      '• "When am I available Friday?"\n\n' +
      '**Schedule:**\n' +
      '• "Schedule a meeting tomorrow at 2pm"\n' +
      '• "Create a 30-minute call with John"\n\n' +
      '**Other:**\n' +
      '• "Check for conflicts"\n' +
      '• "Show calendar stats"';
  }

  return 'I can help you manage your calendar. Try asking:\n\n' +
    '• "What\'s on my calendar today?"\n' +
    '• "Find free time tomorrow"\n' +
    '• "Schedule a meeting at 2pm"\n\n' +
    'What would you like to do?';
}

/**
 * Scheduling Links API
 * GET /api/calendar/scheduling-links - List scheduling links
 * POST /api/calendar/scheduling-links - Create scheduling link
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import * as calendarService from '@/lib/calendar';

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
    if (req.method === 'GET') {
      const links = await calendarService.getSchedulingLinks(owner_id);
      return res.status(200).json({ links });
    }

    if (req.method === 'POST') {
      const {
        slug,
        title,
        description,
        duration_minutes,
        buffer_before_minutes,
        buffer_after_minutes,
        min_notice_hours,
        max_future_days,
        availability_schedule,
        conflict_calendar_ids,
        require_approval,
        max_bookings_per_day,
        booking_questions,
        create_in_calendar_id,
      } = req.body;

      if (!slug || !title || !duration_minutes) {
        return res.status(400).json({ 
          error: 'slug, title, and duration_minutes are required' 
        });
      }

      // Default availability: weekdays 9-5
      const defaultAvailability = availability_schedule || {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
      };

      const link = await calendarService.createSchedulingLink({
        owner_id,
        slug,
        title,
        description,
        duration_minutes,
        buffer_before_minutes,
        buffer_after_minutes,
        min_notice_hours,
        max_future_days,
        availability_schedule: defaultAvailability,
        conflict_calendar_ids,
        require_approval,
        max_bookings_per_day,
        booking_questions,
        create_in_calendar_id,
      });

      return res.status(201).json({ 
        link,
        booking_url: `/book/${link.slug}`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Scheduling links API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

/**
 * Calendar Free Time API
 * GET /api/calendar/free-time - Find available time slots
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
      const { 
        date, 
        duration_minutes, 
        calendar_ids,
        work_hours_start,
        work_hours_end,
      } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
      }

      const slots = await calendarService.findFreeSlots({
        owner_id,
        date: date as string,
        duration_minutes: duration_minutes ? parseInt(duration_minutes as string) : 60,
        calendar_ids: calendar_ids 
          ? (calendar_ids as string).split(',') 
          : undefined,
        work_hours_start: work_hours_start as string,
        work_hours_end: work_hours_end as string,
      });

      return res.status(200).json({ 
        date,
        slots,
        count: slots.length,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Calendar free-time API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

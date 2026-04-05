/**
 * Calendar Event by ID API
 * GET /api/calendar/events/[id] - Get single event
 * PUT /api/calendar/events/[id] - Update event
 * DELETE /api/calendar/events/[id] - Delete/cancel event
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
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
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const event = await calendarService.getEventById(id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.status(200).json({ event });
    }

    if (req.method === 'PUT') {
      const updates = req.body;

      // If rescheduling, check for conflicts
      if (updates.start_time && updates.end_time) {
        const conflicts = await calendarService.checkConflicts({
          owner_id,
          start_time: updates.start_time,
          end_time: updates.end_time,
          exclude_event_id: id,
        });

        if (conflicts.length > 0) {
          return res.status(409).json({
            error: 'Time conflict detected',
            conflicts,
          });
        }
      }

      const event = await calendarService.updateEvent(id, updates);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.status(200).json({ event });
    }

    if (req.method === 'DELETE') {
      const { notify_attendees } = req.query;
      
      const event = await calendarService.cancelEvent(
        id,
        notify_attendees !== 'false'
      );

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.status(200).json({ 
        message: 'Event cancelled',
        event,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Calendar event API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

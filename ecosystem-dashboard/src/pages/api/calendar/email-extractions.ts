/**
 * Email Calendar Extractions API
 * GET /api/calendar/email-extractions - Get pending extractions
 * POST /api/calendar/email-extractions - Process new email
 * PUT /api/calendar/email-extractions/[id]/accept - Accept extraction
 * PUT /api/calendar/email-extractions/[id]/reject - Reject extraction
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { emailCalendarSync } from '@/lib/calendar';

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
      // Get pending extractions for review
      const extractions = await emailCalendarSync.getPendingExtractions(owner_id);
      const stats = await emailCalendarSync.getExtractionStats(owner_id);

      return res.status(200).json({ 
        extractions,
        stats,
      });
    }

    if (req.method === 'POST') {
      // Process a new email for event extraction
      const { email_id, subject, body, from, date, auto_create } = req.body;

      if (!email_id || !subject || !body) {
        return res.status(400).json({ 
          error: 'email_id, subject, and body are required' 
        });
      }

      const extraction = await emailCalendarSync.processEmail({
        owner_id,
        email_id,
        subject,
        body,
        from: from || 'unknown',
        date: date || new Date().toISOString(),
        auto_create: auto_create ?? false,
      });

      if (!extraction) {
        return res.status(200).json({ 
          message: 'No calendar event detected in email',
          has_event: false,
        });
      }

      return res.status(201).json({ 
        message: extraction.status === 'auto_created' 
          ? 'Event automatically created' 
          : 'Event extracted and pending review',
        extraction,
        has_event: true,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Email extractions API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

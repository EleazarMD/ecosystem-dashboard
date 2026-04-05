/**
 * Email Extraction Actions API
 * PUT /api/calendar/email-extractions/[id] - Accept or reject extraction
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { emailCalendarSync } from '@/lib/calendar';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const owner_id = req.headers['x-user-id'] as string || 'default-user';

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Extraction ID is required' });
  }

  try {
    if (req.method === 'PUT') {
      const { action, calendar_id, modifications } = req.body;

      if (!action || !['accept', 'reject'].includes(action)) {
        return res.status(400).json({ 
          error: 'action is required (accept or reject)' 
        });
      }

      if (action === 'accept') {
        const event = await emailCalendarSync.acceptExtraction({
          extraction_id: id,
          owner_id,
          calendar_id,
          modifications,
        });

        return res.status(200).json({ 
          message: 'Extraction accepted and event created',
          event,
        });
      }

      if (action === 'reject') {
        await emailCalendarSync.rejectExtraction({
          extraction_id: id,
          owner_id,
        });

        return res.status(200).json({ 
          message: 'Extraction rejected',
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Email extraction action API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

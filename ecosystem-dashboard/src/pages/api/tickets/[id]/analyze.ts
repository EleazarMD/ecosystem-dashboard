/**
 * Ticket Analysis API
 * POST /api/tickets/[id]/analyze - Submit analysis for a ticket (called by OpenClaw)
 * 
 * Flow:
 * 1. OpenClaw reads the ticket via GET /api/tickets/[id]
 * 2. OpenClaw analyzes the codebase and identifies root cause + proposed fix
 * 3. OpenClaw POSTs analysis here with findings
 * 4. If the fix requires code changes, an approval request is created
 * 5. The ticket status moves to 'awaiting_approval'
 * 6. User approves/rejects on iOS or Dashboard
 * 7. On approval, OpenClaw can proceed with the fix
 * 
 * Authentication: X-API-Key header (service-to-service)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { getMobileOrSessionUserId } from '@/lib/mobile-auth';
import { Pool } from 'pg';
import ApprovalService from '@/services/ApprovalService';

const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'ecosystem_unified',
  user: process.env.DATABASE_USER || 'eleazar',
  password: process.env.DATABASE_PASSWORD || '',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = getMobileOrSessionUserId(session?.user?.id, req);

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ticket ID' });
  }

  try {
    // Verify ticket exists
    const ticketResult = await pool.query(
      'SELECT * FROM tickets WHERE id = $1',
      [id]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    const {
      analysis,
      analysis_agent = 'openclaw',
      proposed_fix,
      affected_files = [],
      requires_code_change = false,
      auto_fixable = false,
    } = req.body;

    if (!analysis) {
      return res.status(400).json({ error: 'analysis is required' });
    }

    // Update the ticket with analysis
    const updateFields: any = {
      analysis,
      analysis_agent,
      analysis_at: new Date().toISOString(),
    };

    if (proposed_fix) {
      updateFields.proposed_fix = proposed_fix;
    }
    if (affected_files.length > 0) {
      updateFields.affected_files = JSON.stringify(affected_files);
    }

    // If code changes are needed, create an approval request
    if (requires_code_change && proposed_fix) {
      updateFields.status = 'awaiting_approval';
      updateFields.delegation_status = 'analyzed';

      // Create approval request via the approval engine
      const approval = await ApprovalService.createApprovalRequest({
        actionType: 'code_change' as any,
        payload: {
          ticket_id: id,
          ticket_title: ticket.title,
          proposed_fix,
          affected_files,
          auto_fixable,
          analysis_agent,
        },
        agent: {
          id: analysis_agent,
          name: analysis_agent === 'openclaw' ? 'OpenClaw' : analysis_agent,
          type: 'coding_agent',
        },
        userId,
        title: `Code fix: ${ticket.title}`,
        aiReasoning: analysis,
        aiConfidence: auto_fixable ? 0.85 : 0.60,
        context: `Ticket ${id.slice(0, 8)}: ${ticket.description?.slice(0, 200) || ticket.title}`,
      });

      updateFields.delegation_approval_id = approval.id;

      // Build and execute the UPDATE
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const [key, value] of Object.entries(updateFields)) {
        setClauses.push(`${key} = $${paramIdx++}`);
        params.push(value);
      }

      params.push(id);
      const updatedResult = await pool.query(
        `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        params
      );

      return res.status(200).json({
        ticket: updatedResult.rows[0],
        approval: {
          id: approval.id,
          status: approval.status,
        },
        message: approval.status === 'executed'
          ? 'Analysis submitted. Fix auto-approved and ready for execution.'
          : 'Analysis submitted. Awaiting user approval for code changes.',
      });
    } else {
      // Analysis only, no code change needed — or informational update
      updateFields.status = requires_code_change ? 'awaiting_approval' : 'analyzing';
      updateFields.delegation_status = 'analyzed';

      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (const [key, value] of Object.entries(updateFields)) {
        setClauses.push(`${key} = $${paramIdx++}`);
        params.push(value);
      }

      params.push(id);
      const updatedResult = await pool.query(
        `UPDATE tickets SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
        params
      );

      return res.status(200).json({
        ticket: updatedResult.rows[0],
        message: 'Analysis submitted.',
      });
    }

  } catch (error) {
    console.error('[Ticket Analysis API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

/**
 * Notes API - Single note operations
 * 
 * GET /api/notes/[id] - Get a note by ID
 * PATCH /api/notes/[id] - Update a note
 * DELETE /api/notes/[id] - Archive a note
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

const DEFAULT_USER_ID = 'eleazar';

interface UpdateNoteRequest {
  title?: string;
  content?: string;
  note_type?: 'meeting' | 'quick' | 'project' | 'journal' | 'reference';
  tags?: string[];
  action_items?: Array<{
    id?: string;
    text: string;
    completed: boolean;
    assignee?: string;
    due_date?: string;
  }>;
  meeting_date?: string;
  attendees?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const userId = (req.headers['x-user-id'] as string) || DEFAULT_USER_ID;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Note ID is required' });
  }

  // GET: Fetch a single note
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT 
          b.id,
          b.workspace_id,
          b.properties,
          b.created_at,
          b.updated_at,
          b.created_by
        FROM blocks b
        WHERE b.id = $1 AND b.archived = FALSE AND b.type = 'page'`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const row = result.rows[0];
      const note = {
        id: row.id,
        workspace_id: row.workspace_id,
        title: row.properties?.title?.[0]?.text?.content || 'Untitled',
        content: row.properties?.content || '',
        note_type: row.properties?.note_type || 'quick',
        tags: row.properties?.tags || [],
        action_items: row.properties?.action_items || [],
        meeting_date: row.properties?.meeting_date,
        attendees: row.properties?.attendees || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
      };

      return res.status(200).json(note);
    } catch (error) {
      console.error('Error fetching note:', error);
      return res.status(500).json({
        error: 'Failed to fetch note',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PATCH: Update a note
  if (req.method === 'PATCH') {
    try {
      const body: UpdateNoteRequest = req.body;

      // First, get the existing note
      const existing = await query(
        `SELECT properties FROM blocks WHERE id = $1 AND archived = FALSE`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const currentProps = existing.rows[0].properties || {};

      // Merge updates into existing properties
      const updatedProperties = { ...currentProps };

      if (body.title !== undefined) {
        updatedProperties.title = [
          {
            type: 'text',
            text: { content: body.title },
          },
        ];
      }

      if (body.content !== undefined) {
        updatedProperties.content = body.content;
      }

      if (body.note_type !== undefined) {
        updatedProperties.note_type = body.note_type;
        // Update icon based on type
        updatedProperties.icon = body.note_type === 'meeting' ? '📋' : 
                                  body.note_type === 'project' ? '📁' : '📝';
      }

      if (body.tags !== undefined) {
        updatedProperties.tags = body.tags;
      }

      if (body.action_items !== undefined) {
        updatedProperties.action_items = body.action_items.map((item, idx) => ({
          id: item.id || `action-${Date.now()}-${idx}`,
          text: item.text,
          completed: item.completed || false,
          assignee: item.assignee,
          due_date: item.due_date,
        }));
      }

      if (body.meeting_date !== undefined) {
        updatedProperties.meeting_date = body.meeting_date;
      }

      if (body.attendees !== undefined) {
        updatedProperties.attendees = body.attendees;
      }

      // Update the note
      const result = await query(
        `UPDATE blocks 
         SET properties = $1, updated_at = NOW(), last_edited_by = $2
         WHERE id = $3
         RETURNING *`,
        [JSON.stringify(updatedProperties), userId, id]
      );

      const row = result.rows[0];
      const note = {
        id: row.id,
        workspace_id: row.workspace_id,
        title: updatedProperties.title?.[0]?.text?.content || 'Untitled',
        content: updatedProperties.content || '',
        note_type: updatedProperties.note_type || 'quick',
        tags: updatedProperties.tags || [],
        action_items: updatedProperties.action_items || [],
        meeting_date: updatedProperties.meeting_date,
        attendees: updatedProperties.attendees || [],
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      return res.status(200).json(note);
    } catch (error) {
      console.error('Error updating note:', error);
      return res.status(500).json({
        error: 'Failed to update note',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // DELETE: Archive a note
  if (req.method === 'DELETE') {
    try {
      const result = await query(
        `UPDATE blocks SET archived = TRUE, updated_at = NOW() WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      return res.status(200).json({ success: true, id });
    } catch (error) {
      console.error('Error deleting note:', error);
      return res.status(500).json({
        error: 'Failed to delete note',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

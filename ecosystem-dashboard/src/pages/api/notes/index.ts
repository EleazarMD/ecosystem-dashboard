/**
 * Notes API - Meeting notes, action items, and productivity documents
 * 
 * Built on top of workspace blocks but provides a simpler interface
 * for Nova Agent and iOS app to manage notes.
 * 
 * POST /api/notes - Create a new note
 * GET /api/notes - List notes (with filters)
 * GET /api/notes?search=query - Search notes
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query, transaction } from '@/lib/db/client';

// Default workspace for notes (user's primary workspace)
const DEFAULT_USER_ID = 'eleazar';

interface NoteActionItem {
  id?: string;
  text: string;
  completed: boolean;
  assignee?: string;
  due_date?: string;
}

interface CreateNoteRequest {
  title: string;
  content: string;
  note_type?: 'meeting' | 'quick' | 'project' | 'journal' | 'reference';
  tags?: string[];
  action_items?: NoteActionItem[];
  meeting_date?: string;
  attendees?: string[];
  workspace_id?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const userId = (req.headers['x-user-id'] as string) || DEFAULT_USER_ID;

  // GET: List or search notes
  if (req.method === 'GET') {
    try {
      const { search, note_type, tag, limit = '20', offset = '0' } = req.query;
      const limitNum = Math.min(parseInt(limit as string, 10), 100);
      const offsetNum = parseInt(offset as string, 10);

      let whereClause = `
        b.archived = FALSE 
        AND b.type = 'page'
        AND b.properties->>'note_type' IS NOT NULL
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by note type
      if (note_type) {
        whereClause += ` AND b.properties->>'note_type' = $${paramIndex}`;
        params.push(note_type);
        paramIndex++;
      }

      // Filter by tag
      if (tag) {
        whereClause += ` AND b.properties->'tags' ? $${paramIndex}`;
        params.push(tag);
        paramIndex++;
      }

      // Search in title and content
      if (search) {
        whereClause += ` AND (
          b.properties->'title'->0->'text'->>'content' ILIKE $${paramIndex}
          OR b.properties->>'content' ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM blocks b WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0]?.total || '0', 10);

      // Get notes with pagination
      params.push(limitNum, offsetNum);
      const result = await query(
        `SELECT 
          b.id,
          b.workspace_id,
          b.properties,
          b.created_at,
          b.updated_at,
          b.created_by
        FROM blocks b
        WHERE ${whereClause}
        ORDER BY b.updated_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      const notes = result.rows.map(row => ({
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
      }));

      return res.status(200).json({
        notes,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          has_more: offsetNum + notes.length < total,
        },
      });
    } catch (error) {
      console.error('Error listing notes:', error);
      return res.status(500).json({
        error: 'Failed to list notes',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST: Create a new note
  if (req.method === 'POST') {
    try {
      const body: CreateNoteRequest = req.body;
      const {
        title,
        content,
        note_type = 'quick',
        tags = [],
        action_items = [],
        meeting_date,
        attendees = [],
        workspace_id,
      } = body;

      if (!title) {
        return res.status(400).json({ error: 'title is required' });
      }

      // Get user's default workspace if not specified
      let targetWorkspaceId = workspace_id;
      if (!targetWorkspaceId) {
        const wsResult = await query(
          `SELECT id FROM workspaces WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1`,
          [userId]
        );
        if (wsResult.rows.length === 0) {
          return res.status(400).json({ 
            error: 'No workspace found. Create a workspace first.',
          });
        }
        targetWorkspaceId = wsResult.rows[0].id;
      }

      // Build note properties (Notion-style block format)
      const noteProperties = {
        title: [
          {
            type: 'text',
            text: { content: title },
          },
        ],
        content,
        note_type,
        tags,
        action_items: action_items.map((item, idx) => ({
          id: item.id || `action-${Date.now()}-${idx}`,
          text: item.text,
          completed: item.completed || false,
          assignee: item.assignee,
          due_date: item.due_date,
        })),
        meeting_date,
        attendees,
        icon: note_type === 'meeting' ? '📋' : note_type === 'project' ? '📁' : '📝',
      };

      // Create the note as a page block
      const result = await query(
        `INSERT INTO blocks (workspace_id, type, properties, created_by, last_edited_by)
         VALUES ($1, 'page', $2, $3, $3)
         RETURNING *`,
        [targetWorkspaceId, JSON.stringify(noteProperties), userId]
      );

      const note = result.rows[0];

      return res.status(201).json({
        id: note.id,
        workspace_id: note.workspace_id,
        title,
        content,
        note_type,
        tags,
        action_items: noteProperties.action_items,
        meeting_date,
        attendees,
        created_at: note.created_at,
        updated_at: note.updated_at,
      });
    } catch (error) {
      console.error('Error creating note:', error);
      return res.status(500).json({
        error: 'Failed to create note',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

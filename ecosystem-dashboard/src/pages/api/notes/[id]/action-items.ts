/**
 * Action Items API - Manage action items within a note
 * 
 * GET /api/notes/[id]/action-items - List action items
 * POST /api/notes/[id]/action-items - Add action item
 * PATCH /api/notes/[id]/action-items - Update action item (toggle complete, edit)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';

const DEFAULT_USER_ID = 'eleazar';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
  assignee?: string;
  due_date?: string;
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

  // GET: List action items for a note
  if (req.method === 'GET') {
    try {
      const result = await query(
        `SELECT properties FROM blocks WHERE id = $1 AND archived = FALSE`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const actionItems = result.rows[0].properties?.action_items || [];
      const completed = actionItems.filter((item: ActionItem) => item.completed).length;

      return res.status(200).json({
        note_id: id,
        action_items: actionItems,
        summary: {
          total: actionItems.length,
          completed,
          pending: actionItems.length - completed,
        },
      });
    } catch (error) {
      console.error('Error fetching action items:', error);
      return res.status(500).json({ error: 'Failed to fetch action items' });
    }
  }

  // POST: Add a new action item
  if (req.method === 'POST') {
    try {
      const { text, assignee, due_date } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'text is required' });
      }

      // Get existing note
      const existing = await query(
        `SELECT properties FROM blocks WHERE id = $1 AND archived = FALSE`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const props = existing.rows[0].properties || {};
      const actionItems: ActionItem[] = props.action_items || [];

      // Create new action item
      const newItem: ActionItem = {
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        completed: false,
        assignee,
        due_date,
      };

      actionItems.push(newItem);
      props.action_items = actionItems;

      // Update note
      await query(
        `UPDATE blocks SET properties = $1, updated_at = NOW(), last_edited_by = $2 WHERE id = $3`,
        [JSON.stringify(props), userId, id]
      );

      return res.status(201).json({
        action_item: newItem,
        total_items: actionItems.length,
      });
    } catch (error) {
      console.error('Error adding action item:', error);
      return res.status(500).json({ error: 'Failed to add action item' });
    }
  }

  // PATCH: Update an action item (toggle complete, edit text)
  if (req.method === 'PATCH') {
    try {
      const { action_item_id, text, completed, assignee, due_date } = req.body;

      if (!action_item_id) {
        return res.status(400).json({ error: 'action_item_id is required' });
      }

      // Get existing note
      const existing = await query(
        `SELECT properties FROM blocks WHERE id = $1 AND archived = FALSE`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const props = existing.rows[0].properties || {};
      const actionItems: ActionItem[] = props.action_items || [];

      // Find and update the action item
      const itemIndex = actionItems.findIndex(item => item.id === action_item_id);
      if (itemIndex === -1) {
        return res.status(404).json({ error: 'Action item not found' });
      }

      if (text !== undefined) actionItems[itemIndex].text = text;
      if (completed !== undefined) actionItems[itemIndex].completed = completed;
      if (assignee !== undefined) actionItems[itemIndex].assignee = assignee;
      if (due_date !== undefined) actionItems[itemIndex].due_date = due_date;

      props.action_items = actionItems;

      // Update note
      await query(
        `UPDATE blocks SET properties = $1, updated_at = NOW(), last_edited_by = $2 WHERE id = $3`,
        [JSON.stringify(props), userId, id]
      );

      return res.status(200).json({
        action_item: actionItems[itemIndex],
        total_items: actionItems.length,
        completed_count: actionItems.filter(i => i.completed).length,
      });
    } catch (error) {
      console.error('Error updating action item:', error);
      return res.status(500).json({ error: 'Failed to update action item' });
    }
  }

  // DELETE: Remove an action item
  if (req.method === 'DELETE') {
    try {
      const { action_item_id } = req.body;

      if (!action_item_id) {
        return res.status(400).json({ error: 'action_item_id is required' });
      }

      // Get existing note
      const existing = await query(
        `SELECT properties FROM blocks WHERE id = $1 AND archived = FALSE`,
        [id]
      );

      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const props = existing.rows[0].properties || {};
      const actionItems: ActionItem[] = props.action_items || [];

      // Remove the action item
      const newItems = actionItems.filter(item => item.id !== action_item_id);
      if (newItems.length === actionItems.length) {
        return res.status(404).json({ error: 'Action item not found' });
      }

      props.action_items = newItems;

      // Update note
      await query(
        `UPDATE blocks SET properties = $1, updated_at = NOW(), last_edited_by = $2 WHERE id = $3`,
        [JSON.stringify(props), userId, id]
      );

      return res.status(200).json({
        success: true,
        remaining_items: newItems.length,
      });
    } catch (error) {
      console.error('Error deleting action item:', error);
      return res.status(500).json({ error: 'Failed to delete action item' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

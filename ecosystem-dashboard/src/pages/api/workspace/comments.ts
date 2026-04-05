/**
 * Workspace Comments API
 * 
 * Manage comments and annotations on workspace blocks:
 * - Create comments (inline or block-level)
 * - List comments
 * - Reply to comments (threads)
 * - Resolve/unresolve comments
 * - React to comments
 * - Delete comments
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db/client';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface CommentOperation {
  operation:
    | 'create_comment'
    | 'list_comments'
    | 'get_thread'
    | 'update_comment'
    | 'delete_comment'
    | 'resolve_comment'
    | 'unresolve_comment'
    | 'add_reaction'
    | 'remove_reaction';
  block_id?: string;
  comment_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface CommentResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommentResponse>,
  authContext: APIAuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const op: CommentOperation = req.body;
    const userId = authContext.userId;

    if (op.user_id && op.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'user_id does not match authenticated user',
        timestamp: new Date().toISOString(),
      });
    }

    if (!op.operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required',
        timestamp: new Date().toISOString(),
      });
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // CREATE COMMENT
      // ========================================
      case 'create_comment': {
        const { 
          block_id, 
          content, 
          parent_comment_id,
          anchor,
          mentions = []
        } = { ...op.data, block_id: op.block_id };

        if (!block_id || !content) {
          return res.status(400).json({
            success: false,
            error: 'block_id and content are required for create_comment',
            timestamp: new Date().toISOString(),
          });
        }

        // Build rich text content
        const richTextContent = [{
          type: 'text',
          text: { content: content as string },
        }];

        const commentResult = await query(
          `INSERT INTO block_comments (
            block_id, parent_comment_id, content, anchor, author_id
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *`,
          [
            block_id,
            parent_comment_id || null,
            JSON.stringify(richTextContent),
            anchor ? JSON.stringify(anchor) : null,
            userId,
          ]
        );

        const comment = commentResult.rows[0];

        // TODO: Send notifications to mentioned users
        if ((mentions as string[]).length > 0) {
          console.log(`[Comments] Mentions to notify: ${(mentions as string[]).join(', ')}`);
        }

        result = {
          comment: {
            ...comment,
            content: comment.content,
          },
          is_reply: !!parent_comment_id,
        };
        break;
      }

      // ========================================
      // LIST COMMENTS
      // ========================================
      case 'list_comments': {
        const { 
          block_id, 
          include_resolved = false,
          limit = 50 
        } = { ...op.data, block_id: op.block_id };

        if (!block_id) {
          return res.status(400).json({
            success: false,
            error: 'block_id is required for list_comments',
            timestamp: new Date().toISOString(),
          });
        }

        let sql = `
          SELECT c.*, 
            (SELECT COUNT(*) FROM block_comments r WHERE r.parent_comment_id = c.id) as reply_count
          FROM block_comments c
          WHERE c.block_id = $1 AND c.parent_comment_id IS NULL
        `;
        const params: unknown[] = [block_id];

        if (!include_resolved) {
          sql += ` AND c.resolved = false`;
        }

        sql += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const commentsResult = await query(sql, params);

        result = {
          block_id,
          comments: commentsResult.rows.map(c => ({
            ...c,
            reply_count: parseInt(c.reply_count || '0'),
          })),
          total: commentsResult.rows.length,
        };
        break;
      }

      // ========================================
      // GET THREAD
      // ========================================
      case 'get_thread': {
        const { comment_id } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id) {
          return res.status(400).json({
            success: false,
            error: 'comment_id is required for get_thread',
            timestamp: new Date().toISOString(),
          });
        }

        // Get parent comment
        const parentResult = await query(
          'SELECT * FROM block_comments WHERE id = $1',
          [comment_id]
        );

        if (parentResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found',
            timestamp: new Date().toISOString(),
          });
        }

        // Get replies
        const repliesResult = await query(
          `SELECT * FROM block_comments 
           WHERE parent_comment_id = $1
           ORDER BY created_at ASC`,
          [comment_id]
        );

        result = {
          parent: parentResult.rows[0],
          replies: repliesResult.rows,
          total_replies: repliesResult.rows.length,
        };
        break;
      }

      // ========================================
      // UPDATE COMMENT
      // ========================================
      case 'update_comment': {
        const { comment_id, content } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id || !content) {
          return res.status(400).json({
            success: false,
            error: 'comment_id and content are required for update_comment',
            timestamp: new Date().toISOString(),
          });
        }

        const richTextContent = [{
          type: 'text',
          text: { content: content as string },
        }];

        const updateResult = await query(
          `UPDATE block_comments 
           SET content = $1, updated_at = NOW()
           WHERE id = $2 AND author_id = $3
           RETURNING *`,
          [JSON.stringify(richTextContent), comment_id, userId]
        );

        if (updateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found or you are not the author',
            timestamp: new Date().toISOString(),
          });
        }

        result = { comment: updateResult.rows[0] };
        break;
      }

      // ========================================
      // DELETE COMMENT
      // ========================================
      case 'delete_comment': {
        const { comment_id } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id) {
          return res.status(400).json({
            success: false,
            error: 'comment_id is required for delete_comment',
            timestamp: new Date().toISOString(),
          });
        }

        // Delete comment and all replies (cascade)
        const deleteResult = await query(
          `DELETE FROM block_comments 
           WHERE id = $1 AND author_id = $2
           RETURNING id`,
          [comment_id, userId]
        );

        if (deleteResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found or you are not the author',
            timestamp: new Date().toISOString(),
          });
        }

        result = { deleted: true, comment_id };
        break;
      }

      // ========================================
      // RESOLVE COMMENT
      // ========================================
      case 'resolve_comment': {
        const { comment_id } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id) {
          return res.status(400).json({
            success: false,
            error: 'comment_id is required for resolve_comment',
            timestamp: new Date().toISOString(),
          });
        }

        const resolveResult = await query(
          `UPDATE block_comments 
           SET resolved = true, resolved_by = $1, resolved_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [userId, comment_id]
        );

        if (resolveResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = { comment: resolveResult.rows[0] };
        break;
      }

      // ========================================
      // UNRESOLVE COMMENT
      // ========================================
      case 'unresolve_comment': {
        const { comment_id } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id) {
          return res.status(400).json({
            success: false,
            error: 'comment_id is required for unresolve_comment',
            timestamp: new Date().toISOString(),
          });
        }

        const unresolveResult = await query(
          `UPDATE block_comments 
           SET resolved = false, resolved_by = NULL, resolved_at = NULL
           WHERE id = $1
           RETURNING *`,
          [comment_id]
        );

        if (unresolveResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = { comment: unresolveResult.rows[0] };
        break;
      }

      // ========================================
      // ADD REACTION
      // ========================================
      case 'add_reaction': {
        const { comment_id, emoji } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id || !emoji) {
          return res.status(400).json({
            success: false,
            error: 'comment_id and emoji are required for add_reaction',
            timestamp: new Date().toISOString(),
          });
        }

        // Get current reactions
        const commentResult = await query(
          'SELECT reactions FROM block_comments WHERE id = $1',
          [comment_id]
        );

        if (commentResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found',
            timestamp: new Date().toISOString(),
          });
        }

        let reactions = commentResult.rows[0].reactions || [];
        
        // Find existing reaction for this emoji
        const existingReaction = reactions.find((r: any) => r.emoji === emoji);
        
        if (existingReaction) {
          // Add user to existing reaction if not already there
          if (!existingReaction.user_ids.includes(userId)) {
            existingReaction.user_ids.push(userId);
          }
        } else {
          // Create new reaction
          reactions.push({ emoji, user_ids: [userId] });
        }

        const updateResult = await query(
          `UPDATE block_comments SET reactions = $1 WHERE id = $2 RETURNING *`,
          [JSON.stringify(reactions), comment_id]
        );

        result = { comment: updateResult.rows[0] };
        break;
      }

      // ========================================
      // REMOVE REACTION
      // ========================================
      case 'remove_reaction': {
        const { comment_id, emoji } = { ...op.data, comment_id: op.comment_id };

        if (!comment_id || !emoji) {
          return res.status(400).json({
            success: false,
            error: 'comment_id and emoji are required for remove_reaction',
            timestamp: new Date().toISOString(),
          });
        }

        // Get current reactions
        const commentResult = await query(
          'SELECT reactions FROM block_comments WHERE id = $1',
          [comment_id]
        );

        if (commentResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Comment not found',
            timestamp: new Date().toISOString(),
          });
        }

        let reactions = commentResult.rows[0].reactions || [];
        
        // Find and update reaction
        const reactionIndex = reactions.findIndex((r: any) => r.emoji === emoji);
        
        if (reactionIndex !== -1) {
          const reaction = reactions[reactionIndex];
          reaction.user_ids = reaction.user_ids.filter((id: string) => id !== userId);
          
          // Remove reaction entirely if no users left
          if (reaction.user_ids.length === 0) {
            reactions.splice(reactionIndex, 1);
          }
        }

        const updateResult = await query(
          `UPDATE block_comments SET reactions = $1 WHERE id = $2 RETURNING *`,
          [JSON.stringify(reactions), comment_id]
        );

        result = { comment: updateResult.rows[0] };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown operation: ${op.operation}`,
          timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Workspace Comments] Error:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

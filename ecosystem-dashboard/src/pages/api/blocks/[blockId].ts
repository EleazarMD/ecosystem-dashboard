import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';

/**
 * API endpoint for block operations
 * GET /api/blocks/[blockId] - Fetch a block with its children
 * PATCH /api/blocks/[blockId] - Update a block
 * DELETE /api/blocks/[blockId] - Delete a block
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { blockId } = req.query;

  if (!blockId || typeof blockId !== 'string') {
    return res.status(400).json({ error: 'Block ID is required' });
  }

  // GET: Fetch block with children
  if (req.method === 'GET') {
    try {
      const block = await blockService.getBlock(blockId, true);

      if (!block) {
        return res.status(404).json({ error: 'Block not found' });
      }

      return res.status(200).json(block);
    } catch (error) {
      console.error('Error fetching block:', error);
      return res.status(500).json({
        error: 'Failed to fetch block',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // PATCH/PUT: Update block
  if (req.method === 'PATCH' || req.method === 'PUT') {
    try {
      const updateData = req.body;

      // Validate that we have something to update
      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Update data is required' });
      }

      // Update the block
      const updatedBlock = await blockService.updateBlock(blockId, updateData);

      if (!updatedBlock) {
        return res.status(404).json({ error: 'Block not found' });
      }

      return res.status(200).json(updatedBlock);
    } catch (error) {
      console.error('Error updating block:', error);
      return res.status(500).json({
        error: 'Failed to update block',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // DELETE: Archive/delete block
  if (req.method === 'DELETE') {
    try {
      await blockService.deleteBlock(blockId);
      return res.status(200).json({ success: true, message: 'Block deleted successfully' });
    } catch (error) {
      console.error('Error deleting block:', error);
      return res.status(500).json({
        error: 'Failed to delete block',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

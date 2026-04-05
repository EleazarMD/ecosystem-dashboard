/**
 * IDE Memory Contradiction Resolution API
 * 
 * Resolves contradictions between IDE memories by either keeping one memory,
 * merging them, or marking them as compatible. Also updates Knowledge Graph relationships.
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const IDE_MEMORY_SCRIPT = '../../../../../../../core/knowledge-graph/scripts/intelligent-memory-proxy.js';

// Verify script exists
const scriptExists = fs.existsSync(IDE_MEMORY_SCRIPT);
console.log(`[ide-memory/resolve-contradiction] Script path ${IDE_MEMORY_SCRIPT} exists: ${scriptExists}`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[ide-memory/resolve-contradiction] API handler called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!scriptExists) {
    console.error('[ide-memory/resolve-contradiction] Script not found at path:', IDE_MEMORY_SCRIPT);
    return res.status(500).json({ error: 'Memory proxy script not found' });
  }

  const { 
    primaryMemoryId, 
    contradictingMemoryId, 
    action, 
    mergedMemory, 
    resolutionComment,
    updateKgRelationships 
  } = req.body;

  if (!primaryMemoryId || !contradictingMemoryId || !action) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  console.log('[ide-memory/resolve-contradiction] Request params:', { 
    primaryMemoryId, contradictingMemoryId, action, updateKgRelationships,
    hasMergedMemory: !!mergedMemory
  });

  try {
    // Different MCP tool name based on resolution action
    let toolName = '';
    const params: any = {
      primary_id: primaryMemoryId,
      contradicting_id: contradictingMemoryId,
      resolution_comment: resolutionComment || '',
      update_kg: updateKgRelationships
    };

    switch (action) {
      case 'keep_primary':
        toolName = 'ide_memory_resolve_keep_primary';
        break;
      case 'keep_contradicting':
        toolName = 'ide_memory_resolve_keep_contradicting';
        break;
      case 'merge':
        toolName = 'ide_memory_resolve_merge';
        if (mergedMemory) {
          params.merged_memory = mergedMemory;
        }
        break;
      case 'delete_both':
        toolName = 'ide_memory_resolve_delete_both';
        break;
      case 'mark_compatible':
        toolName = 'ide_memory_resolve_mark_compatible';
        break;
      default:
        return res.status(400).json({ error: 'Invalid resolution action' });
    }

    const mcpMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    };

    console.log(`[ide-memory/resolve-contradiction] Sending MCP message with tool: ${toolName}`);
    const result = await sendMCPMessage(mcpMessage);
    
    console.log('[ide-memory/resolve-contradiction] MCP response received:', 
      JSON.stringify(result).substring(0, 200) + '...');
    
    if (result.error) {
      console.error('[ide-memory/resolve-contradiction] MCP error:', result.error);
      return res.status(500).json({ error: result.error });
    }
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('[ide-memory/resolve-contradiction] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Send message to MCP service and get response
 */
async function sendMCPMessage(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Spawn the IDE memory script as a child process
    const child = spawn('node', [IDE_MEMORY_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    // Collect stdout data
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    // Collect stderr data
    child.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`[ide-memory/resolve-contradiction] STDERR: ${data.toString()}`);
    });

    // Handle process completion
    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Process exited with code ${code}: ${stderr}`));
      }

      try {
        // Find the JSON response in stdout
        const jsonStartIndex = stdout.indexOf('{');
        const jsonEndIndex = stdout.lastIndexOf('}');
        
        if (jsonStartIndex === -1 || jsonEndIndex === -1) {
          return reject(new Error('No valid JSON response found in MCP output'));
        }
        
        const jsonResponse = stdout.substring(jsonStartIndex, jsonEndIndex + 1);
        const response = JSON.parse(jsonResponse);
        resolve(response);
      } catch (error: any) {
        reject(new Error(`Failed to parse MCP response: ${error.message}`));
      }
    });

    // Handle process errors
    child.on('error', (error) => {
      reject(new Error(`Failed to spawn MCP process: ${error.message}`));
    });

    // Send the message to the child process
    child.stdin.write(JSON.stringify(message));
    child.stdin.end();

    // Set a timeout for the process
    const timeoutMs = 30000; // 30 seconds
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`MCP process timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Clear timeout when process completes
    child.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

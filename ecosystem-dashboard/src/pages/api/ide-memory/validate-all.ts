import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const IDE_MEMORY_SCRIPT = '../../../../../../../core/knowledge-graph/scripts/intelligent-memory-proxy.js';

// Verify script exists
const scriptExists = fs.existsSync(IDE_MEMORY_SCRIPT);
console.log(`[ide-memory/validate-all] Script path ${IDE_MEMORY_SCRIPT} exists: ${scriptExists}`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[ide-memory/validate-all] API handler called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!scriptExists) {
    console.error('[ide-memory/validate-all] Script not found at path:', IDE_MEMORY_SCRIPT);
    return res.status(500).json({ error: 'Memory proxy script not found' });
  }

  try {
    const mcpMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'ide_memory_validate',
        arguments: {
          // Leave component empty to validate all memories
        }
      }
    };

    console.log('[ide-memory/validate-all] Sending MCP message');
    const result = await sendMCPMessage(mcpMessage);
    
    console.log('[ide-memory/validate-all] MCP response received:', JSON.stringify(result));
    
    if (result.error) {
      console.error('[ide-memory/validate-all] MCP error:', result.error);
      return res.status(500).json({ error: result.error });
    }

    // Parse the response content
    const content = result.result?.content?.[0]?.text;
    console.log('[ide-memory/validate-all] MCP content:', content ? content.substring(0, 100) + '...' : 'null');
    
    if (content) {
      try {
        const parsedContent = JSON.parse(content);
        console.log('[ide-memory/validate-all] Validation complete for', 
          parsedContent.validations?.length || 0, 'memories');
        return res.status(200).json(parsedContent);
      } catch (parseError) {
        console.error('[ide-memory/validate-all] JSON parse error:', parseError);
        return res.status(500).json({ error: 'Failed to parse validation data', details: content.substring(0, 200) });
      }
    }

    return res.status(200).json({ validations: [], count: 0 });
  } catch (error) {
    console.error('[ide-memory/validate-all] API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      location: 'ide-memory/validate-all handler'
    });
  }
}

async function sendMCPMessage(message: any): Promise<any> {
  console.log('[ide-memory/validate-all] sendMCPMessage called with:', JSON.stringify(message));
  
  return new Promise((resolve, reject) => {
    console.log('[ide-memory/validate-all] Spawning process:', 'node', IDE_MEMORY_SCRIPT);
    
    const child = spawn('node', [IDE_MEMORY_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';
    
    console.log('[ide-memory/validate-all] Process spawned, setting up event handlers');

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log('[ide-memory/validate-all] Process stdout:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.log('[ide-memory/validate-all] Process stderr:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
    });

    child.on('close', (code) => {
      console.log(`[ide-memory/validate-all] Process exited with code ${code}`);
      
      if (code !== 0) {
        console.error(`[ide-memory/validate-all] Process error: ${errorOutput}`);
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
        return;
      }

      try {
        // Parse the JSON response
        const lines = output.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        
        if (lastLine.startsWith('{')) {
          const response = JSON.parse(lastLine);
          resolve(response);
        } else {
          reject(new Error('Invalid JSON response'));
        }
      } catch (error) {
        reject(new Error(`Failed to parse response: ${error}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Send the message
    child.stdin.write(JSON.stringify(message) + '\n');
    child.stdin.end();

    // Set timeout
    const timeoutId = setTimeout(() => {
      console.error('[ide-memory/validate-all] Process timeout after 30s, killing');
      child.kill();
      reject(new Error('Request timeout after 30 seconds'));
    }, 30000);
    
    // Clear timeout if process ends
    child.on('exit', () => {
      clearTimeout(timeoutId);
    });
  });
}

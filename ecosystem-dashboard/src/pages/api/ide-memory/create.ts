import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const IDE_MEMORY_SCRIPT = '../../../../../../../core/knowledge-graph/scripts/intelligent-memory-proxy.js';

// Verify script exists
const scriptExists = fs.existsSync(IDE_MEMORY_SCRIPT);
console.log(`[ide-memory/create] Script path ${IDE_MEMORY_SCRIPT} exists: ${scriptExists}`);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[ide-memory/create] API handler called');
  if (req.method !== 'POST') {
    console.log('[ide-memory/create] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!scriptExists) {
    console.error('[ide-memory/create] Script not found at path:', IDE_MEMORY_SCRIPT);
    return res.status(500).json({ error: 'Memory proxy script not found' });
  }

  const { title, content, tags, component, context } = req.body;
  
  console.log('[ide-memory/create] Request data:', { title, component, tags, contextLength: context?.length });

  if (!title || !content) {
    console.log('[ide-memory/create] Validation failed: Missing title or content');
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const mcpMessage = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'ide_memory_create',
        arguments: {
          title,
          content,
          tags: tags || [],
          component,
          context
        }
      }
    };

    console.log('[ide-memory/create] Sending MCP message:', JSON.stringify(mcpMessage).substring(0, 200) + '...');
    const result = await sendMCPMessage(mcpMessage);
    
    console.log('[ide-memory/create] MCP response received:', JSON.stringify(result).substring(0, 200) + '...');
    
    if (result.error) {
      console.error('[ide-memory/create] MCP error:', result.error);
      return res.status(500).json({ error: result.error });
    }

    // Parse the response content
    const responseContent = result.result?.content?.[0]?.text;
    console.log('[ide-memory/create] MCP content:', responseContent ? responseContent.substring(0, 100) + '...' : 'null');
    
    if (responseContent) {
      try {
        const parsedContent = JSON.parse(responseContent);
        console.log('[ide-memory/create] Memory created successfully with id:', parsedContent.id || 'unknown');
        return res.status(200).json(parsedContent);
      } catch (parseError) {
        console.error('[ide-memory/create] JSON parse error:', parseError);
        return res.status(500).json({ error: 'Failed to parse response data', details: responseContent.substring(0, 200) });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[ide-memory/create] API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      location: 'ide-memory/create handler'
    });
  }
}

async function sendMCPMessage(message: any): Promise<any> {
  console.log('[ide-memory/create] sendMCPMessage called with:', JSON.stringify(message).substring(0, 100) + '...');
  
  return new Promise((resolve, reject) => {
    console.log('[ide-memory/create] Spawning process:', 'node', IDE_MEMORY_SCRIPT);
    
    const child = spawn('node', [IDE_MEMORY_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';
    
    console.log('[ide-memory/create] Process spawned, setting up event handlers');

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log('[ide-memory/create] Process stdout:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.error('[ide-memory/create] Process stderr:', chunk.substring(0, 100) + (chunk.length > 100 ? '...' : ''));
    });

    child.on('close', (code) => {
      console.log(`[ide-memory/create] Process exited with code ${code}`);
      
      if (code !== 0) {
        console.error(`[ide-memory/create] Process error: ${errorOutput}`);
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
          console.error('[ide-memory/create] Invalid JSON response:', lastLine.substring(0, 100));
          reject(new Error('Invalid JSON response'));
        }
      } catch (error) {
        console.error('[ide-memory/create] Failed to parse response:', error);
        reject(new Error(`Failed to parse response: ${error}`));
      }
    });

    child.on('error', (error) => {
      console.error('[ide-memory/create] Child process error:', error);
      reject(error);
    });
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      console.error('[ide-memory/create] Process timeout after 30s, killing');
      child.kill();
      reject(new Error('Request timeout after 30 seconds'));
    }, 30000);
    
    // Clear timeout if process ends
    child.on('exit', () => {
      clearTimeout(timeoutId);
    });

    // Send the message
    child.stdin.write(JSON.stringify(message) + '\n');
    child.stdin.end();

    // Set timeout
    setTimeout(() => {
      child.kill();
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

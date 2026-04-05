/**
 * Session Manager Service
 * 
 * Handles Goose session management:
 * - Parsing JSONL session files
 * - Retrieving session history
 * - Exporting sessions in multiple formats
 * - Token usage analysis
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);

// Types
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string | object;
  };
  result?: any;
  status?: 'success' | 'error' | 'pending';
  duration_ms?: number;
  error?: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string | null;
  timestamp: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  metadata?: {
    model?: string;
    tokens?: {
      input: number;
      output: number;
      total: number;
    };
    latency_ms?: number;
    cost?: number;
  };
}

export interface SessionData {
  session_id: string;
  file_path: string;
  started_at: Date;
  ended_at?: Date;
  last_updated: Date;
  messages: SessionMessage[];
  statistics: {
    total_messages: number;
    user_messages: number;
    assistant_messages: number;
    tool_calls: number;
    successful_tools: number;
    failed_tools: number;
    total_tokens: number;
    total_cost: number;
    average_latency_ms: number;
    duration_seconds: number;
  };
  metadata: {
    models_used: string[];
    tools_used: string[];
    mcp_servers_used: string[];
    status: 'active' | 'completed' | 'error';
  };
}

export interface SessionSummary {
  session_id: string;
  file_path: string;
  started_at: Date;
  last_updated: Date;
  message_count: number;
  tool_calls_count: number;
  is_active: boolean;
  size_bytes: number;
  preview: string;
}

export class SessionManager {
  private defaultSessionPath = process.env.HOME + '/.local/share/goose/sessions';
  
  constructor(private sessionPath?: string) {
    this.sessionPath = sessionPath || this.defaultSessionPath;
  }
  
  /**
   * Get all session summaries (lightweight overview)
   */
  async getSessionSummaries(limit: number = 50): Promise<SessionSummary[]> {
    const summaries: SessionSummary[] = [];
    
    try {
      await access(this.sessionPath, fs.constants.R_OK);
      const files = await readdir(this.sessionPath);
      
      // Filter for .jsonl files and sort by modification time
      const sessionFiles = files
        .filter(f => f.endsWith('.jsonl'))
        .map(f => path.join(this.sessionPath!, f));
      
      // Get stats for each file
      const fileStats = await Promise.all(
        sessionFiles.map(async (filePath) => {
          const stats = await stat(filePath);
          return { filePath, stats };
        })
      );
      
      // Sort by most recent first
      fileStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
      
      // Take only the requested limit
      const limitedFiles = fileStats.slice(0, limit);
      
      // Parse each file for summary
      for (const { filePath, stats } of limitedFiles) {
        try {
          const summary = await this.parseSessionSummary(filePath, stats);
          summaries.push(summary);
        } catch (error) {
          console.error(`Error parsing session summary ${filePath}:`, error);
        }
      }
      
      return summaries;
    } catch (error) {
      console.error('Error getting session summaries:', error);
      return [];
    }
  }
  
  /**
   * Get full session data by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const filePath = path.join(this.sessionPath, `${sessionId}.jsonl`);
      await access(filePath, fs.constants.R_OK);
      
      const stats = await stat(filePath);
      const content = await readFile(filePath, 'utf-8');
      
      return this.parseSessionData(content, sessionId, filePath, stats);
    } catch (error) {
      console.error(`Error getting session ${sessionId}:`, error);
      return null;
    }
  }
  
  /**
   * Parse session summary (lightweight)
   */
  private async parseSessionSummary(filePath: string, stats: fs.Stats): Promise<SessionSummary> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    
    let messageCount = 0;
    let toolCallsCount = 0;
    let firstMessage = '';
    let startedAt: Date | undefined;
    
    // Parse first few lines for quick summary
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      try {
        const line = JSON.parse(lines[i]);
        
        if (line.role) {
          messageCount++;
          
          if (!firstMessage && line.content) {
            firstMessage = typeof line.content === 'string' 
              ? line.content.substring(0, 100) 
              : JSON.stringify(line.content).substring(0, 100);
          }
        }
        
        if (line.tool_calls && Array.isArray(line.tool_calls)) {
          toolCallsCount += line.tool_calls.length;
        }
        
        if (!startedAt && line.timestamp) {
          startedAt = new Date(line.timestamp);
        }
      } catch (error) {
        // Skip invalid JSON lines
      }
    }
    
    // Estimate total based on sample
    const estimatedMessages = Math.floor((lines.length / Math.min(lines.length, 5)) * messageCount) || lines.length;
    
    return {
      session_id: path.basename(filePath, '.jsonl'),
      file_path: filePath,
      started_at: startedAt || stats.birthtime,
      last_updated: stats.mtime,
      message_count: estimatedMessages,
      tool_calls_count: toolCallsCount,
      is_active: (Date.now() - stats.mtime.getTime()) < 3600000, // Active if modified in last hour
      size_bytes: stats.size,
      preview: firstMessage || 'No preview available'
    };
  }
  
  /**
   * Parse full session data
   */
  private parseSessionData(
    content: string, 
    sessionId: string, 
    filePath: string, 
    stats: fs.Stats
  ): SessionData {
    const lines = content.trim().split('\n').filter(l => l.trim());
    const messages: SessionMessage[] = [];
    
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    let userMessages = 0;
    let assistantMessages = 0;
    let successfulTools = 0;
    let failedTools = 0;
    
    const modelsUsed = new Set<string>();
    const toolsUsed = new Set<string>();
    const mcpServersUsed = new Set<string>();
    
    let startedAt: Date | undefined;
    let endedAt: Date | undefined;
    
    // Parse each line
    for (const line of lines) {
      try {
        const message = JSON.parse(line) as SessionMessage;
        messages.push(message);
        
        // Track timestamps
        if (message.timestamp) {
          const msgTime = new Date(message.timestamp);
          if (!startedAt || msgTime < startedAt) {
            startedAt = msgTime;
          }
          if (!endedAt || msgTime > endedAt) {
            endedAt = msgTime;
          }
        }
        
        // Track message types
        if (message.role === 'user') userMessages++;
        if (message.role === 'assistant') assistantMessages++;
        
        // Track metadata
        if (message.metadata) {
          if (message.metadata.model) {
            modelsUsed.add(message.metadata.model);
          }
          if (message.metadata.tokens) {
            totalTokens += message.metadata.tokens.total;
          }
          if (message.metadata.cost) {
            totalCost += message.metadata.cost;
          }
          if (message.metadata.latency_ms) {
            totalLatency += message.metadata.latency_ms;
            latencyCount++;
          }
        }
        
        // Track tool calls
        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            if (toolCall.function?.name) {
              toolsUsed.add(toolCall.function.name);
            }
            if (toolCall.status === 'success') {
              successfulTools++;
            } else if (toolCall.status === 'error') {
              failedTools++;
            }
          }
        }
      } catch (error) {
        console.error('Error parsing session line:', error);
      }
    }
    
    // Calculate duration
    const durationSeconds = startedAt && endedAt 
      ? (endedAt.getTime() - startedAt.getTime()) / 1000 
      : 0;
    
    // Determine status
    const isActive = (Date.now() - stats.mtime.getTime()) < 3600000;
    const hasErrors = failedTools > 0;
    const status = isActive ? 'active' : hasErrors ? 'error' : 'completed';
    
    return {
      session_id: sessionId,
      file_path: filePath,
      started_at: startedAt || stats.birthtime,
      ended_at: endedAt,
      last_updated: stats.mtime,
      messages,
      statistics: {
        total_messages: messages.length,
        user_messages: userMessages,
        assistant_messages: assistantMessages,
        tool_calls: messages.reduce((sum, m) => sum + (m.tool_calls?.length || 0), 0),
        successful_tools: successfulTools,
        failed_tools: failedTools,
        total_tokens: totalTokens,
        total_cost: totalCost,
        average_latency_ms: latencyCount > 0 ? totalLatency / latencyCount : 0,
        duration_seconds: durationSeconds
      },
      metadata: {
        models_used: Array.from(modelsUsed),
        tools_used: Array.from(toolsUsed),
        mcp_servers_used: Array.from(mcpServersUsed),
        status
      }
    };
  }
  
  /**
   * Export session in JSON format
   */
  async exportSessionJSON(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    return JSON.stringify(session, null, 2);
  }
  
  /**
   * Export session in YAML format
   */
  async exportSessionYAML(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    // Simple YAML conversion (for complex scenarios, use a YAML library)
    let yaml = `session_id: ${session.session_id}\n`;
    yaml += `started_at: ${session.started_at.toISOString()}\n`;
    yaml += `status: ${session.metadata.status}\n\n`;
    
    yaml += `statistics:\n`;
    yaml += `  total_messages: ${session.statistics.total_messages}\n`;
    yaml += `  tool_calls: ${session.statistics.tool_calls}\n`;
    yaml += `  total_tokens: ${session.statistics.total_tokens}\n\n`;
    
    yaml += `messages:\n`;
    for (const msg of session.messages) {
      yaml += `  - role: ${msg.role}\n`;
      yaml += `    timestamp: ${msg.timestamp}\n`;
      if (msg.content) {
        yaml += `    content: |\n`;
        yaml += `      ${msg.content.split('\n').join('\n      ')}\n`;
      }
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        yaml += `    tool_calls:\n`;
        for (const tool of msg.tool_calls) {
          yaml += `      - name: ${tool.function.name}\n`;
          yaml += `        status: ${tool.status || 'unknown'}\n`;
        }
      }
      yaml += `\n`;
    }
    
    return yaml;
  }
  
  /**
   * Export session in Markdown format
   */
  async exportSessionMarkdown(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    let md = `# Session: ${session.session_id}\n\n`;
    md += `**Started:** ${session.started_at.toLocaleString()}\n`;
    md += `**Duration:** ${Math.floor(session.statistics.duration_seconds / 60)} minutes\n`;
    md += `**Status:** ${session.metadata.status}\n\n`;
    
    md += `## Statistics\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Messages | ${session.statistics.total_messages} |\n`;
    md += `| Tool Calls | ${session.statistics.tool_calls} |\n`;
    md += `| Successful Tools | ${session.statistics.successful_tools} |\n`;
    md += `| Failed Tools | ${session.statistics.failed_tools} |\n`;
    md += `| Total Tokens | ${session.statistics.total_tokens.toLocaleString()} |\n`;
    md += `| Average Latency | ${session.statistics.average_latency_ms.toFixed(0)}ms |\n\n`;
    
    if (session.metadata.models_used.length > 0) {
      md += `**Models Used:** ${session.metadata.models_used.join(', ')}\n\n`;
    }
    
    if (session.metadata.tools_used.length > 0) {
      md += `**Tools Used:** ${session.metadata.tools_used.join(', ')}\n\n`;
    }
    
    md += `## Conversation\n\n`;
    
    for (const msg of session.messages) {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      
      if (msg.role === 'user') {
        md += `### 👤 User (${time})\n\n`;
        md += `${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        md += `### 🤖 Assistant (${time})\n\n`;
        if (msg.content) {
          md += `${msg.content}\n\n`;
        }
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          md += `**Tool Calls:**\n`;
          for (const tool of msg.tool_calls) {
            const status = tool.status === 'success' ? '✅' : tool.status === 'error' ? '❌' : '⏳';
            md += `- ${status} \`${tool.function.name}\``;
            if (tool.duration_ms) {
              md += ` (${tool.duration_ms}ms)`;
            }
            md += `\n`;
          }
          md += `\n`;
        }
      } else if (msg.role === 'tool') {
        md += `### 🔧 Tool Result (${time})\n\n`;
        md += `\`\`\`\n${typeof msg.content === 'string' ? msg.content.substring(0, 500) : JSON.stringify(msg.content, null, 2).substring(0, 500)}\n\`\`\`\n\n`;
      }
    }
    
    md += `---\n`;
    md += `*Generated: ${new Date().toLocaleString()}*\n`;
    
    return md;
  }
  
  /**
   * Get active sessions only
   */
  async getActiveSessions(): Promise<SessionSummary[]> {
    const allSessions = await this.getSessionSummaries(100);
    return allSessions.filter(s => s.is_active);
  }
  
  /**
   * Search sessions by content
   */
  async searchSessions(query: string, limit: number = 20): Promise<SessionSummary[]> {
    const allSessions = await this.getSessionSummaries(100);
    const lowerQuery = query.toLowerCase();
    
    return allSessions
      .filter(s => 
        s.session_id.toLowerCase().includes(lowerQuery) ||
        s.preview.toLowerCase().includes(lowerQuery)
      )
      .slice(0, limit);
  }
}

export default SessionManager;

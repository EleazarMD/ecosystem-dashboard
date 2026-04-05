/**
 * Goose Agent Detection Service
 * 
 * Detects and discovers Goose AI agents by:
 * 1. Checking Goose API server (port 9001)
 * 2. Reading MCP server configurations
 * 3. Scanning session directories for active sessions
 * 4. Building unified agent metadata
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

// Types
interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled?: boolean;
}

interface GooseConfig {
  mcp_servers?: Record<string, MCPServerConfig>;
  profiles?: Record<string, any>;
  session_storage?: {
    directory?: string;
    format?: string;
  };
}

interface SessionMetadata {
  session_id: string;
  file_path: string;
  started_at: Date;
  last_updated: Date;
  message_count: number;
  tool_calls_count: number;
  is_active: boolean;
  size_bytes: number;
}

interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: any;
  mcp_server?: string;
}

interface GooseAgent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  source: 'goose';
  capabilities: string[];
  endpoint: string;
  version: string;
  description: string;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  platform: string;
  model?: string;
  lastHeartbeat: string;
  
  // Goose-specific fields
  sessions?: {
    active: SessionMetadata[];
    history: SessionMetadata[];
    storage_path?: string;
  };
  
  tools?: {
    available: ToolDefinition[];
    mcp_servers?: MCPServerConfig[];
    usage_stats?: {
      total_calls: number;
      success_rate: number;
    };
  };
  
  observability?: {
    langfuse_enabled: boolean;
    otlp_enabled: boolean;
    session_export_formats: string[];
  };
  
  resourceUsage: {
    cpu: number;
    memory: number;
    network: number;
  };
  
  health: {
    overall: number;
    components: {
      connectivity: number;
      performance: number;
      resources: number;
      dependencies: number;
      security: number;
    };
    trend: 'stable' | 'improving' | 'degrading';
    lastCheck: string;
  };
  
  remediation: {
    enabled: boolean;
    mode: 'automatic' | 'manual';
    lastAction: string;
    successRate: number;
    actionsToday: number;
  };
  
  incidents: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
  
  dependencies: Array<{
    name: string;
    status: string;
    port?: number;
    model?: string;
  }>;
}

export default class GooseAgentDetector {
  private gooseApiUrl = 'http://localhost:9001';
  private gooseConfigPath = process.env.HOME + '/.config/goose';
  private gooseSessionPath = process.env.HOME + '/.local/share/goose/sessions';
  
  /**
   * Main detection method - discovers all Goose agents
   */
  async detectGooseAgents(): Promise<GooseAgent[]> {
    const agents: GooseAgent[] = [];
    
    try {
      // Check if Goose API server is running
      const apiHealth = await this.checkGooseApi();
      
      if (apiHealth.isRunning) {
        // Read MCP server configuration
        const mcpServers = await this.readMCPConfig();
        
        // Scan session directory
        const sessions = await this.scanSessionDirectory();
        
        // Build Goose agent representation
        const gooseAgent = this.buildGooseAgent(apiHealth, mcpServers, sessions);
        agents.push(gooseAgent);
        
        console.log('[GooseDetector] ✅ Detected Goose agent with', mcpServers.length, 'MCP servers');
      } else {
        console.log('[GooseDetector] ⚠️  Goose API server not running on port 9001');
      }
    } catch (error) {
      console.error('[GooseDetector] Error detecting Goose agents:', error);
    }
    
    return agents;
  }
  
  /**
   * Check if Goose API server is healthy
   */
  private async checkGooseApi(): Promise<{ isRunning: boolean; version?: string; uptime?: number }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.gooseApiUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          isRunning: true,
          version: data.version || '1.0.0',
          uptime: data.uptime || 0
        };
      }
    } catch (error) {
      // API not available
    }
    
    return { isRunning: false };
  }
  
  /**
   * Read Goose MCP server configuration
   */
  private async readMCPConfig(): Promise<MCPServerConfig[]> {
    const mcpServers: MCPServerConfig[] = [];
    const configFiles = [
      path.join(this.gooseConfigPath, 'mcp-servers.json'),
      path.join(process.cwd(), 'mcp-servers/goose-config/mcp-servers.json')
    ];
    
    for (const configFile of configFiles) {
      try {
        await access(configFile, fs.constants.R_OK);
        const content = await readFile(configFile, 'utf-8');
        const config = JSON.parse(content);
        
        // Parse MCP servers from config
        if (config.mcpServers) {
          for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
            mcpServers.push({
              name,
              ...(serverConfig as any)
            });
          }
        }
        
        console.log(`[GooseDetector] Read MCP config from ${configFile}`);
        break; // Use first found config
      } catch (error) {
        // Config file not found, try next
        continue;
      }
    }
    
    return mcpServers;
  }
  
  /**
   * Scan Goose session directory for active and historical sessions
   */
  private async scanSessionDirectory(): Promise<{ active: SessionMetadata[]; history: SessionMetadata[] }> {
    const active: SessionMetadata[] = [];
    const history: SessionMetadata[] = [];
    
    try {
      await access(this.gooseSessionPath, fs.constants.R_OK);
      const files = await readdir(this.gooseSessionPath);
      
      // Filter for .jsonl files
      const sessionFiles = files.filter(f => f.endsWith('.jsonl'));
      
      for (const file of sessionFiles.slice(0, 50)) { // Limit to 50 most recent
        try {
          const filePath = path.join(this.gooseSessionPath, file);
          const stats = await stat(filePath);
          
          // Parse session metadata from JSONL
          const metadata = await this.parseSessionMetadata(filePath, stats);
          
          // Consider active if modified in last hour
          const isActive = (Date.now() - stats.mtime.getTime()) < 3600000;
          
          if (isActive) {
            active.push(metadata);
          } else {
            history.push(metadata);
          }
        } catch (error) {
          console.error(`[GooseDetector] Error parsing session ${file}:`, error);
        }
      }
      
      console.log(`[GooseDetector] Found ${active.length} active sessions, ${history.length} historical`);
    } catch (error) {
      console.log('[GooseDetector] No session directory found at', this.gooseSessionPath);
    }
    
    return { active, history };
  }
  
  /**
   * Parse basic metadata from a JSONL session file
   */
  private async parseSessionMetadata(filePath: string, stats: fs.Stats): Promise<SessionMetadata> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    let messageCount = 0;
    let toolCallsCount = 0;
    let startedAt: Date | undefined;
    
    // Parse first and sample lines for metadata
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      try {
        const line = JSON.parse(lines[i]);
        
        if (line.role === 'user' || line.role === 'assistant') {
          messageCount++;
        }
        
        if (line.tool_calls) {
          toolCallsCount += line.tool_calls.length;
        }
        
        if (!startedAt && line.timestamp) {
          startedAt = new Date(line.timestamp);
        }
      } catch (error) {
        // Skip invalid JSON lines
      }
    }
    
    // Estimate total from file
    const estimatedTotal = Math.floor((lines.length / Math.min(lines.length, 10)) * messageCount);
    
    return {
      session_id: path.basename(filePath, '.jsonl'),
      file_path: filePath,
      started_at: startedAt || stats.birthtime,
      last_updated: stats.mtime,
      message_count: estimatedTotal || lines.length,
      tool_calls_count: toolCallsCount,
      is_active: (Date.now() - stats.mtime.getTime()) < 3600000,
      size_bytes: stats.size
    };
  }
  
  /**
   * Build unified GooseAgent object
   */
  private buildGooseAgent(
    apiHealth: { isRunning: boolean; version?: string; uptime?: number },
    mcpServers: MCPServerConfig[],
    sessions: { active: SessionMetadata[]; history: SessionMetadata[] }
  ): GooseAgent {
    // Extract tool definitions from MCP servers
    const tools: ToolDefinition[] = mcpServers.map(server => ({
      name: server.name,
      description: `MCP Server: ${server.name}`,
      mcp_server: server.name
    }));
    
    return {
      id: 'goose-main-agent',
      name: 'Goose AI Agent',
      status: apiHealth.isRunning ? 'active' : 'inactive',
      type: 'goose-orchestrator',
      source: 'goose',
      capabilities: ['mcp-orchestration', 'tool-execution', 'session-logging', ...mcpServers.map(s => s.name)],
      endpoint: this.gooseApiUrl,
      version: apiHealth.version || '1.0.0',
      description: 'Autonomous MCP orchestrator with tool execution capabilities',
      uptime: apiHealth.uptime || 0,
      memoryUsage: 35,
      cpuUsage: 10,
      platform: 'Goose (Python/Rust)',
      model: 'gpt-4o', // Default, can be overridden from config
      lastHeartbeat: new Date().toISOString(),
      
      sessions: {
        active: sessions.active,
        history: sessions.history.slice(0, 20), // Keep 20 most recent
        storage_path: this.gooseSessionPath
      },
      
      tools: {
        available: tools,
        mcp_servers: mcpServers,
        usage_stats: {
          total_calls: sessions.active.reduce((sum, s) => sum + s.tool_calls_count, 0),
          success_rate: 95 // Would calculate from actual data
        }
      },
      
      observability: {
        langfuse_enabled: false, // Check from config
        otlp_enabled: false,
        session_export_formats: ['json', 'yaml', 'markdown']
      },
      
      resourceUsage: {
        cpu: 10,
        memory: 35,
        network: 1.5
      },
      
      health: {
        overall: apiHealth.isRunning ? 95 : 0,
        components: {
          connectivity: apiHealth.isRunning ? 100 : 0,
          performance: apiHealth.isRunning ? 95 : 0,
          resources: apiHealth.isRunning ? 90 : 0,
          dependencies: mcpServers.length > 0 ? 95 : 50,
          security: 100
        },
        trend: 'stable',
        lastCheck: new Date().toISOString()
      },
      
      // Required fields from Agent interface
      remediation: {
        enabled: true,
        mode: 'automatic' as const,
        lastAction: apiHealth.isRunning ? 'health_check' : 'service_offline',
        successRate: apiHealth.isRunning ? 98 : 0,
        actionsToday: 0
      },
      
      incidents: apiHealth.isRunning ? [] : [{
        type: 'service_offline',
        message: 'Goose API server not responding on port 9001',
        timestamp: new Date().toISOString()
      }],
      
      dependencies: mcpServers.map(server => ({
        name: server.name,
        status: 'active',
        port: undefined
      }))
    };
  }
}

// Also export as named export for flexibility
export { GooseAgentDetector };

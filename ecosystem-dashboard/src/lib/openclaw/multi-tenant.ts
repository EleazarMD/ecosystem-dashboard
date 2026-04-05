/**
 * OpenClaw Multi-Tenant Agent Management
 * 
 * Provisions and manages per-user OpenClaw agents for multi-tenancy.
 * Each user gets their own agent instance with isolated:
 * - Workspace (memory, preferences)
 * - Sessions
 * - Auth profiles
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const OPENCLAW_BASE = process.env.OPENCLAW_BASE || '/home/eleazar/.openclaw';
const OPENCLAW_CLI = process.env.OPENCLAW_CLI || '/home/eleazar/.local/bin/openclaw';

export interface UserAgentConfig {
  userId: string;
  userName: string;
  userEmail: string;
  tenantId?: string;
}

export interface AgentStatus {
  agentId: string;
  exists: boolean;
  workspacePath: string;
  sessionsPath: string;
  hasBootstrap: boolean;
}

/**
 * Generate agent ID from user info
 * Format: user-{userId} or tenant-{tenantId}-user-{userId}
 */
export function getAgentId(config: UserAgentConfig): string {
  if (config.tenantId) {
    return `tenant-${config.tenantId}-user-${config.userId}`;
  }
  return `user-${config.userId}`;
}

/**
 * Get paths for a user's agent
 */
export function getAgentPaths(agentId: string) {
  return {
    agentDir: path.join(OPENCLAW_BASE, 'agents', agentId),
    sessionsDir: path.join(OPENCLAW_BASE, 'agents', agentId, 'sessions'),
    agentConfigDir: path.join(OPENCLAW_BASE, 'agents', agentId, 'agent'),
    workspaceDir: path.join(OPENCLAW_BASE, `workspace-${agentId}`),
  };
}

/**
 * Check if a user agent exists
 */
export async function checkAgentExists(agentId: string): Promise<AgentStatus> {
  const paths = getAgentPaths(agentId);
  
  let exists = false;
  let hasBootstrap = false;
  
  try {
    await fs.access(paths.agentDir);
    exists = true;
    
    try {
      await fs.access(path.join(paths.workspaceDir, 'AGENTS.md'));
      hasBootstrap = true;
    } catch {
      hasBootstrap = false;
    }
  } catch {
    exists = false;
  }
  
  return {
    agentId,
    exists,
    workspacePath: paths.workspaceDir,
    sessionsPath: paths.sessionsDir,
    hasBootstrap,
  };
}

/**
 * Provision a new agent for a user
 */
export async function provisionUserAgent(config: UserAgentConfig): Promise<AgentStatus> {
  const agentId = getAgentId(config);
  const paths = getAgentPaths(agentId);
  
  // Check if already exists
  const status = await checkAgentExists(agentId);
  if (status.exists && status.hasBootstrap) {
    return status;
  }
  
  // Create directories
  await fs.mkdir(paths.agentDir, { recursive: true });
  await fs.mkdir(paths.sessionsDir, { recursive: true });
  await fs.mkdir(paths.agentConfigDir, { recursive: true });
  await fs.mkdir(paths.workspaceDir, { recursive: true });
  
  // Create workspace bootstrap files
  await createWorkspaceFiles(paths.workspaceDir, config);
  
  // Create empty sessions.json
  await fs.writeFile(
    path.join(paths.sessionsDir, 'sessions.json'),
    JSON.stringify({ sessions: {} }, null, 2)
  );
  
  return checkAgentExists(agentId);
}

/**
 * Create workspace bootstrap files for a user
 * 
 * HYBRID APPROACH:
 * - Agent instructions (AGENTS.md, SOUL.md) are local to OpenClaw workspace
 * - Identity and preferences come from PIC via homelab-context skill
 * - Memory/observations are written to PIC, not local files
 */
async function createWorkspaceFiles(workspaceDir: string, config: UserAgentConfig) {
  // AGENTS.md - Agent instructions (local - defines behavior)
  const agentsMd = `# Agent Instructions

You are a personal AI assistant for ${config.userName}.

## Memory Architecture (HYBRID)

**DO NOT use local memory files.** Instead:
- **Identity & Preferences**: Fetch from PIC via \`homelab-context\` skill
- **Observations**: Record to PIC via \`homelab-context\` skill
- **Goals**: Query from PIC via \`homelab-context\` skill

At the start of each session, call:
\`\`\`
GET http://localhost:8765/api/context/full
Headers: X-User-Id: ${config.userId}
\`\`\`

To record observations (things you learn about the user):
\`\`\`
POST http://localhost:8765/api/context/observe
Headers: X-User-Id: ${config.userId}
Body: { "observation": "User prefers morning meetings", "confidence": 0.8 }
\`\`\`

## Available Services

Use the homelab skills to access these services:
- **homelab-context**: Personal context, identity, preferences, goals (port 8765) - PRIMARY MEMORY
- **homelab-email**: Email via Hermes Core (port 8030)
- **homelab-agents**: GooseMind agents for specialized tasks (port 9001)
- **homelab-tts**: Voice synthesis via Qwen TTS (port 4200)
- **homelab-stt**: Speech-to-text via Whisper (port 8032)

## User Context Headers

Always include these headers when calling homelab services:
\`\`\`
X-User-Id: ${config.userId}
X-User-Email: ${config.userEmail}
${config.tenantId ? `X-Tenant-Id: ${config.tenantId}` : ''}
\`\`\`
`;

  // SOUL.md - Persona
  const soulMd = `# Soul

I am a helpful, knowledgeable AI assistant.

## Tone
- Professional but friendly
- Concise and direct
- Proactive in offering help

## Boundaries
- I respect user privacy
- I ask for confirmation before taking actions
- I explain my reasoning when helpful
`;

  // IDENTITY.md
  const identityMd = `# Identity

Name: AI Assistant
Emoji: 🤖
Vibe: Helpful and efficient
`;

  // TOOLS.md
  const toolsMd = `# Tools

## AI Homelab Services

This agent has access to the AI Homelab infrastructure:

- **Email**: Use homelab-email skill for email operations
- **Context**: Use homelab-context skill for personal memory
- **Agents**: Use homelab-agents skill to delegate to GooseMind
- **Voice**: Use homelab-tts and homelab-stt for voice

## User Context Headers

When calling homelab APIs, include:
\`\`\`
X-User-Id: ${config.userId}
X-User-Email: ${config.userEmail}
${config.tenantId ? `X-Tenant-Id: ${config.tenantId}` : ''}
\`\`\`
`;

  // Write files (no USER.md or MEMORY.md - those come from PIC)
  await fs.writeFile(path.join(workspaceDir, 'AGENTS.md'), agentsMd);
  await fs.writeFile(path.join(workspaceDir, 'SOUL.md'), soulMd);
  await fs.writeFile(path.join(workspaceDir, 'IDENTITY.md'), identityMd);
  await fs.writeFile(path.join(workspaceDir, 'TOOLS.md'), toolsMd);
  
  // No local memory directory - memory is stored in PIC
}

/**
 * List all user agents
 */
export async function listUserAgents(): Promise<AgentStatus[]> {
  const agentsDir = path.join(OPENCLAW_BASE, 'agents');
  
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    const userAgents = entries
      .filter(e => e.isDirectory() && (e.name.startsWith('user-') || e.name.startsWith('tenant-')))
      .map(e => e.name);
    
    return Promise.all(userAgents.map(agentId => checkAgentExists(agentId)));
  } catch {
    return [];
  }
}

/**
 * Delete a user agent (cleanup)
 */
export async function deleteUserAgent(agentId: string): Promise<boolean> {
  const paths = getAgentPaths(agentId);
  
  try {
    await fs.rm(paths.agentDir, { recursive: true, force: true });
    await fs.rm(paths.workspaceDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

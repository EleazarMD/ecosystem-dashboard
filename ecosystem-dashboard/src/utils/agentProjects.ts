/**
 * Agent Project Classification and Utilities
 */

export interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  badgeColor: string;
  icon: string;
}

export const ProjectMap: Record<string, ProjectInfo> = {
  // Database-compatible keys (match agent_registry.metadata.project values)
  'Homelab Dashboard': {
    id: 'homelab-dashboard',
    name: 'Homelab Dashboard',
    description: 'Core dashboard agents for ecosystem monitoring and control',
    color: '#20B2AA', // Teal
    badgeColor: 'teal',
    icon: '🏠'
  },
  'Knowledge Graph': {
    id: 'knowledge-graph',
    name: 'Knowledge Graph',
    description: 'AI Homelab knowledge management and graph processing agents',
    color: '#7B68EE', // Purple
    badgeColor: 'purple',
    icon: '🕸️'
  },
  // Legacy kebab-case keys for backward compatibility
  'ai-homelab-dashboard': {
    id: 'homelab-dashboard',
    name: 'Homelab Dashboard',
    description: 'Core dashboard agents for ecosystem monitoring and control',
    color: '#20B2AA', // Teal
    badgeColor: 'teal',
    icon: '🏠'
  },
  'kids-platform-v2': {
    id: 'kids-platform-v2',
    name: 'Kids Learning Platform',
    description: 'Educational AI agents for K-12 curriculum and content generation',
    color: '#4A90E2', // Blue
    badgeColor: 'blue',
    icon: '🎓'
  },
  'knowledge-graph': {
    id: 'knowledge-graph',
    name: 'Knowledge Graph',
    description: 'AI Homelab knowledge management and graph processing agents',
    color: '#7B68EE', // Purple
    badgeColor: 'purple',
    icon: '🕸️'
  },
  'development-tools': {
    id: 'development-tools',
    name: 'Development Tools',
    description: 'Agent development and testing infrastructure (ADK, etc.)',
    color: '#FF6347', // Orange-Red
    badgeColor: 'red',
    icon: '🛠️'
  },
  'ai-gateway': {
    id: 'ai-gateway',
    name: 'AI Gateway',
    description: 'AI model orchestration and routing services',
    color: '#FFD700', // Gold
    badgeColor: 'yellow',
    icon: '🚪'
  }
};

/**
 * Classify agent into project based on metadata and type
 */
export function classifyAgentProject(agent: any): ProjectInfo {
  // Check metadata.project field first
  if (agent.metadata?.project && ProjectMap[agent.metadata.project]) {
    return ProjectMap[agent.metadata.project];
  }

  // Fallback classification based on agent characteristics
  const name = agent.name?.toLowerCase() || '';
  const type = agent.type?.toLowerCase() || '';
  const description = agent.description?.toLowerCase() || '';
  const capabilities = agent.capabilities || [];

  // Kids Learning Platform
  if (
    name.includes('teks') || 
    name.includes('curriculum') || 
    name.includes('learning') ||
    name.includes('assessment') ||
    name.includes('cognitive') ||
    capabilities.some(c => c.includes('curriculum') || c.includes('teks') || c.includes('education'))
  ) {
    return ProjectMap['kids-platform-v2'];
  }

  // Knowledge Graph
  if (
    name.includes('knowledge') ||
    name.includes('graph') ||
    name.includes('vector') ||
    name.includes('documentation') ||
    name.includes('reasoning') ||
    name.includes('memory') ||
    capabilities.some(c => c.includes('knowledge') || c.includes('graph') || c.includes('semantic'))
  ) {
    return ProjectMap['knowledge-graph'];
  }



  // AI Gateway
  if (
    name.includes('gateway') ||
    name.includes('routing') ||
    capabilities.some(c => c.includes('gateway') || c.includes('routing'))
  ) {
    return ProjectMap['ai-gateway'];
  }

  // AI Homelab Dashboard (includes ADK-compliant dashboard agents)
  if (
    name.includes('dashboard') ||
    name.includes('coordinator') ||
    name.includes('dashai') ||
    type === 'dashboard-ai' ||
    type === 'dashboard-assistant' ||
    type === 'adk-dashboard-assistant' ||
    (capabilities.some(c => c.includes('dashboard') || c.includes('monitoring') || c.includes('system-monitoring') || c.includes('dashboard-assistance')) && !name.includes('simple'))
  ) {
    return ProjectMap['ai-homelab-dashboard'];
  }

  // Development Tools (ADK, ADE, testing agents)
  if (
    type === 'development-tool' ||
    name.includes('development environment') ||
    name.includes('ade') ||
    (name.includes('adk') && name.includes('simple')) ||
    (type === 'adk-agent' && name.includes('simple')) ||
    capabilities.some(c => c.includes('testing') || c.includes('agent-development') || c.includes('agent-simulation'))
  ) {
    return ProjectMap['development-tools'];
  }

  // Default fallback
  return {
    id: 'unknown',
    name: 'Other',
    description: 'Uncategorized agents',
    color: '#808080',
    badgeColor: 'gray',
    icon: '❓'
  };
}

/**
 * Get unique projects from agent list
 */
export function getUniqueProjects(agents: any[]): ProjectInfo[] {
  const projectIds = new Set<string>();
  const projects: ProjectInfo[] = [];

  agents.forEach(agent => {
    const project = classifyAgentProject(agent);
    if (!projectIds.has(project.id)) {
      projectIds.add(project.id);
      projects.push(project);
    }
  });

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Filter agents by project
 */
export function filterAgentsByProject(agents: any[], projectId: string): any[] {
  if (projectId === 'all') {
    return agents;
  }

  return agents.filter(agent => {
    const project = classifyAgentProject(agent);
    return project.id === projectId;
  });
}

/**
 * Get project statistics
 */
export function getProjectStats(agents: any[]) {
  const stats: Record<string, { total: number; active: number; inactive: number }> = {};

  agents.forEach(agent => {
    const project = classifyAgentProject(agent);
    const projectId = project.id;

    if (!stats[projectId]) {
      stats[projectId] = { total: 0, active: 0, inactive: 0 };
    }

    stats[projectId].total++;
    if (agent.status === 'active') {
      stats[projectId].active++;
    } else {
      stats[projectId].inactive++;
    }
  });

  return stats;
}

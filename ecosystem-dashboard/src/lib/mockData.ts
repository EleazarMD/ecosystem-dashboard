/**
 * AI Homelab Ecosystem - Mock Data
 * 
 * This module provides mock data for the dashboard when running in development mode
 * without the MCP server backend. This allows for UI development and testing.
 */

// Mock project data
export const mockProjects = [
  {
    id: 'proj-001',
    name: 'Infrastructure Core',
    description: 'Core infrastructure components for the AI Homelab Ecosystem',
    domain: 'Infrastructure',
    status: 'In Progress',
    progress: 75,
    startDate: '2024-12-01',
    lastUpdated: '2025-04-15',
    taskCount: 24,
    completedTaskCount: 18,
    componentCount: 12,
    documentationCount: 8
  },
  {
    id: 'proj-002',
    name: 'Knowledge Graph System',
    description: 'Centralized knowledge graph for the ecosystem',
    domain: 'Knowledge',
    status: 'In Progress',
    progress: 60,
    startDate: '2025-01-15',
    lastUpdated: '2025-04-20',
    taskCount: 32,
    completedTaskCount: 19,
    componentCount: 8,
    documentationCount: 12
  },
  {
    id: 'proj-003',
    name: 'Model Registry',
    description: 'Registry for AI models and their metadata',
    domain: 'AI Systems',
    status: 'In Progress',
    progress: 45,
    startDate: '2025-02-01',
    lastUpdated: '2025-04-22',
    taskCount: 18,
    completedTaskCount: 8,
    componentCount: 6,
    documentationCount: 5
  },
  {
    id: 'proj-004',
    name: 'Developer Platform',
    description: 'Platform for developers to build on the ecosystem',
    domain: 'Platforms',
    status: 'Not Started',
    progress: 0,
    startDate: '2025-05-01',
    lastUpdated: '2025-04-10',
    taskCount: 15,
    completedTaskCount: 0,
    componentCount: 4,
    documentationCount: 3
  },
  {
    id: 'proj-005',
    name: 'AHIS Server',
    description: 'Master Control Program for the AI Homelab Ecosystem',
    domain: 'Infrastructure',
    status: 'Completed',
    progress: 100,
    startDate: '2024-11-01',
    lastUpdated: '2025-03-15',
    taskCount: 30,
    completedTaskCount: 30,
    componentCount: 15,
    documentationCount: 10
  }
];

// Mock component data
export const mockComponents = [
  {
    id: 'comp-001',
    name: 'Database Service',
    description: 'PostgreSQL database service for the ecosystem',
    type: 'Service',
    status: 'Active',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    dependencies: ['comp-003'],
    lastUpdated: '2025-04-10',
    documentationCount: 3
  },
  {
    id: 'comp-002',
    name: 'Authentication Module',
    description: 'Authentication module using Authentik',
    type: 'Library',
    status: 'Active',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    dependencies: ['comp-001'],
    lastUpdated: '2025-04-12',
    documentationCount: 2
  },
  {
    id: 'comp-003',
    name: 'API Gateway',
    description: 'API Gateway for the ecosystem',
    type: 'Service',
    status: 'Active',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    dependencies: [],
    lastUpdated: '2025-04-15',
    documentationCount: 4
  },
  {
    id: 'comp-004',
    name: 'Knowledge Graph API',
    description: 'API for the knowledge graph',
    type: 'API',
    status: 'In Development',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    dependencies: ['comp-003', 'comp-001'],
    lastUpdated: '2025-04-18',
    documentationCount: 3
  },
  {
    id: 'comp-005',
    name: 'Graph Visualization',
    description: 'UI component for visualizing the knowledge graph',
    type: 'UI',
    status: 'In Development',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    dependencies: ['comp-004'],
    lastUpdated: '2025-04-20',
    documentationCount: 1
  },
  {
    id: 'comp-006',
    name: 'Model Registry UI',
    description: 'UI for the model registry',
    type: 'UI',
    status: 'In Development',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    dependencies: ['comp-007'],
    lastUpdated: '2025-04-22',
    documentationCount: 2
  },
  {
    id: 'comp-007',
    name: 'Model Registry API',
    description: 'API for the model registry',
    type: 'API',
    status: 'In Development',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    dependencies: ['comp-003', 'comp-001'],
    lastUpdated: '2025-04-21',
    documentationCount: 3
  },
  {
    id: 'comp-008',
    name: 'AI Homelab Ecosystem Dashboard',
    description: 'Dashboard for the AHIS Server',
    type: 'UI',
    status: 'Active',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    dependencies: ['comp-009'],
    lastUpdated: '2025-03-15',
    documentationCount: 2
  },
  {
    id: 'comp-009',
    name: 'AHIS API',
    description: 'API for the AHIS Server',
    type: 'API',
    status: 'Active',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    dependencies: ['comp-001', 'comp-003'],
    lastUpdated: '2025-03-10',
    documentationCount: 3
  }
];

// Mock documentation data
export const mockDocumentation = [
  {
    id: 'doc-001',
    title: 'AI Homelab Ecosystem Architecture',
    description: 'Overview of the AI Homelab Ecosystem architecture',
    path: '/docs/technical/ARCHITECTURE.md',
    type: 'Architecture',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    tags: ['architecture', 'overview', 'infrastructure'],
    lastUpdated: '2025-04-10',
    wordCount: 2500,
    author: 'System Architect'
  },
  {
    id: 'doc-002',
    title: 'Database Schema',
    description: 'Database schema for the ecosystem',
    path: '/docs/technical/DATABASE_SCHEMA.md',
    type: 'Technical',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    tags: ['database', 'schema', 'postgresql'],
    lastUpdated: '2025-04-12',
    wordCount: 1800,
    author: 'Database Engineer'
  },
  {
    id: 'doc-003',
    title: 'API Documentation',
    description: 'API documentation for the ecosystem',
    path: '/docs/technical/API_DOCUMENTATION.md',
    type: 'Technical',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    tags: ['api', 'rest', 'documentation'],
    lastUpdated: '2025-04-15',
    wordCount: 3200,
    author: 'API Engineer'
  },
  {
    id: 'doc-004',
    title: 'Knowledge Graph Design',
    description: 'Design of the knowledge graph',
    path: '/docs/technical/knowledge-graph/DESIGN.md',
    type: 'Architecture',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    tags: ['knowledge-graph', 'design', 'architecture'],
    lastUpdated: '2025-04-18',
    wordCount: 2200,
    author: 'Knowledge Engineer'
  },
  {
    id: 'doc-005',
    title: 'Knowledge Graph API',
    description: 'API documentation for the knowledge graph',
    path: '/docs/technical/knowledge-graph/API.md',
    type: 'Technical',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    tags: ['knowledge-graph', 'api', 'documentation'],
    lastUpdated: '2025-04-20',
    wordCount: 1500,
    author: 'API Engineer'
  },
  {
    id: 'doc-006',
    title: 'Model Registry Design',
    description: 'Design of the model registry',
    path: '/docs/technical/model-registry/DESIGN.md',
    type: 'Architecture',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    tags: ['model-registry', 'design', 'architecture'],
    lastUpdated: '2025-04-21',
    wordCount: 1800,
    author: 'AI Systems Engineer'
  },
  {
    id: 'doc-007',
    title: 'Model Registry API',
    description: 'API documentation for the model registry',
    path: '/docs/technical/model-registry/API.md',
    type: 'Technical',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    tags: ['model-registry', 'api', 'documentation'],
    lastUpdated: '2025-04-22',
    wordCount: 1200,
    author: 'API Engineer'
  },
  {
    id: 'doc-008',
    title: 'Developer Platform Overview',
    description: 'Overview of the developer platform',
    path: '/docs/technical/developer-platform/OVERVIEW.md',
    type: 'User',
    projectId: 'proj-004',
    projectName: 'Developer Platform',
    tags: ['developer-platform', 'overview', 'user-guide'],
    lastUpdated: '2025-04-10',
    wordCount: 1000,
    author: 'Platform Engineer'
  },
  {
    id: 'doc-009',
    title: 'AHIS Server Architecture',
    description: 'Architecture of the AHIS Server',
    path: '/docs/technical/mcp-server/ARCHITECTURE.md',
    type: 'Architecture',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    tags: ['mcp-server', 'architecture', 'infrastructure'],
    lastUpdated: '2025-03-10',
    wordCount: 2800,
    author: 'System Architect'
  },
  {
    id: 'doc-010',
    title: 'AHIS Server API',
    description: 'API documentation for the AHIS Server',
    path: '/docs/technical/mcp-server/API.md',
    type: 'Technical',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    tags: ['mcp-server', 'api', 'documentation'],
    lastUpdated: '2025-03-12',
    wordCount: 2000,
    author: 'API Engineer'
  },
  {
    id: 'doc-011',
    title: 'AI Homelab Ecosystem Dashboard User Guide',
    description: 'User guide for the AI Homelab Ecosystem Dashboard',
    path: '/docs/technical/mcp-server/DASHBOARD.md',
    type: 'User',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    tags: ['mcp-server', 'dashboard', 'user-guide'],
    lastUpdated: '2025-03-15',
    wordCount: 1500,
    author: 'UI Engineer'
  },
  {
    id: 'doc-012',
    title: 'AI Homelab Ecosystem Roadmap',
    description: 'Strategic roadmap for the AI Homelab Ecosystem',
    path: '/docs/strategic/AI_HOMELAB_CLOUD_ROADMAP.md',
    type: 'Strategic',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    tags: ['roadmap', 'strategic', 'planning'],
    lastUpdated: '2025-04-28',
    wordCount: 3500,
    author: 'System Architect'
  },
  {
    id: 'doc-013',
    title: 'Network Knowledge Mesh Diagram',
    description: 'Diagram of the Network Knowledge Mesh',
    path: '/docs/strategic/NETWORK_KNOWLEDGE_MESH_DIAGRAM.md',
    type: 'Strategic',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    tags: ['knowledge-mesh', 'strategic', 'diagram'],
    lastUpdated: '2025-04-28',
    wordCount: 1200,
    author: 'Knowledge Engineer'
  },
  {
    id: 'doc-014',
    title: 'Next.js Dashboard Documentation',
    description: 'Documentation for the Next.js AI Homelab Ecosystem Dashboard',
    path: '/docs/technical/cloud-dashboard/NEXTJS_DASHBOARD_DOCUMENTATION.md',
    type: 'Technical',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    tags: ['dashboard', 'nextjs', 'documentation'],
    lastUpdated: '2025-04-28',
    wordCount: 2500,
    author: 'UI Engineer'
  }
];

// Mock tasks data
export const mockTasks = [
  {
    id: 'task-001',
    name: 'Set up PostgreSQL database',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    status: 'Completed',
    priority: 'High',
    completedAt: '2025-01-15',
    assignee: 'Database Engineer'
  },
  {
    id: 'task-002',
    name: 'Implement authentication module',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    status: 'Completed',
    priority: 'High',
    completedAt: '2025-02-01',
    assignee: 'Security Engineer'
  },
  {
    id: 'task-003',
    name: 'Set up API Gateway',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    status: 'Completed',
    priority: 'High',
    completedAt: '2025-02-15',
    assignee: 'API Engineer'
  },
  {
    id: 'task-004',
    name: 'Design knowledge graph schema',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    status: 'Completed',
    priority: 'Medium',
    completedAt: '2025-03-01',
    assignee: 'Knowledge Engineer'
  },
  {
    id: 'task-005',
    name: 'Implement knowledge graph API',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    status: 'In Progress',
    priority: 'Medium',
    completedAt: null,
    assignee: 'API Engineer'
  },
  {
    id: 'task-006',
    name: 'Develop graph visualization component',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    status: 'In Progress',
    priority: 'Low',
    completedAt: null,
    assignee: 'UI Engineer'
  },
  {
    id: 'task-007',
    name: 'Design model registry schema',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    status: 'Completed',
    priority: 'Medium',
    completedAt: '2025-03-15',
    assignee: 'AI Systems Engineer'
  },
  {
    id: 'task-008',
    name: 'Implement model registry API',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    status: 'In Progress',
    priority: 'Medium',
    completedAt: null,
    assignee: 'API Engineer'
  },
  {
    id: 'task-009',
    name: 'Develop model registry UI',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    status: 'Not Started',
    priority: 'Low',
    completedAt: null,
    assignee: 'UI Engineer'
  },
  {
    id: 'task-010',
    name: 'Design developer platform architecture',
    projectId: 'proj-004',
    projectName: 'Developer Platform',
    status: 'Not Started',
    priority: 'Low',
    completedAt: null,
    assignee: 'Platform Engineer'
  }
];

// Mock activity feed
export const mockActivityFeed = [
  {
    id: 'activity-001',
    title: 'Documentation Updated',
    description: 'AI Homelab Ecosystem Roadmap was updated',
    timestamp: '2025-04-28T15:30:00Z',
    type: 'documentation_updated',
    projectId: 'proj-001',
    projectName: 'Infrastructure Core',
    userId: 'user-001',
    userName: 'System Architect'
  },
  {
    id: 'activity-002',
    title: 'Documentation Updated',
    description: 'Network Knowledge Mesh Diagram was updated',
    timestamp: '2025-04-28T14:45:00Z',
    type: 'documentation_updated',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    userId: 'user-002',
    userName: 'Knowledge Engineer'
  },
  {
    id: 'activity-003',
    title: 'Task Completed',
    description: 'Task "Design knowledge graph schema" was completed',
    timestamp: '2025-03-01T10:15:00Z',
    type: 'task_completed',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    userId: 'user-002',
    userName: 'Knowledge Engineer'
  },
  {
    id: 'activity-004',
    title: 'Component Created',
    description: 'Component "Knowledge Graph API" was created',
    timestamp: '2025-02-20T09:30:00Z',
    type: 'component_created',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    userId: 'user-003',
    userName: 'API Engineer'
  },
  {
    id: 'activity-005',
    title: 'Task Started',
    description: 'Task "Implement knowledge graph API" was started',
    timestamp: '2025-02-21T11:00:00Z',
    type: 'task_started',
    projectId: 'proj-002',
    projectName: 'Knowledge Graph System',
    userId: 'user-003',
    userName: 'API Engineer'
  },
  {
    id: 'activity-006',
    title: 'Documentation Created',
    description: 'Next.js Dashboard Documentation was created',
    timestamp: '2025-04-28T12:30:00Z',
    type: 'documentation_created',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    userId: 'user-004',
    userName: 'UI Engineer'
  },
  {
    id: 'activity-007',
    title: 'Project Updated',
    description: 'Project "Model Registry" progress updated to 45%',
    timestamp: '2025-04-22T16:45:00Z',
    type: 'project_updated',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    userId: 'user-005',
    userName: 'AI Systems Engineer'
  },
  {
    id: 'activity-008',
    title: 'Component Updated',
    description: 'Component "Model Registry API" was updated',
    timestamp: '2025-04-21T14:15:00Z',
    type: 'component_updated',
    projectId: 'proj-003',
    projectName: 'Model Registry',
    userId: 'user-003',
    userName: 'API Engineer'
  },
  {
    id: 'activity-009',
    title: 'System Alert',
    description: 'AHIS Server successfully deployed new version',
    timestamp: '2025-04-28T08:00:00Z',
    type: 'system_alert',
    projectId: null,
    projectName: null,
    userId: null,
    userName: 'System'
  },
  {
    id: 'activity-010',
    title: 'Documentation Updated',
    description: 'AI Homelab Ecosystem Dashboard User Guide was updated',
    timestamp: '2025-03-15T13:30:00Z',
    type: 'documentation_updated',
    projectId: 'proj-005',
    projectName: 'AHIS Server',
    userId: 'user-004',
    userName: 'UI Engineer'
  }
];

// Mock ecosystem overview data
export const mockEcosystemOverview = {
  projectStats: {
    total: mockProjects.length,
    byStatus: {
      'Completed': mockProjects.filter(p => p.status === 'Completed').length,
      'In Progress': mockProjects.filter(p => p.status === 'In Progress').length,
      'Not Started': mockProjects.filter(p => p.status === 'Not Started').length
    },
    byDomain: {
      'Infrastructure': mockProjects.filter(p => p.domain === 'Infrastructure').length,
      'Knowledge': mockProjects.filter(p => p.domain === 'Knowledge').length,
      'AI Systems': mockProjects.filter(p => p.domain === 'AI Systems').length,
      'Platforms': mockProjects.filter(p => p.domain === 'Platforms').length
    },
    recentlyUpdated: mockProjects
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        lastUpdated: p.lastUpdated
      })),
    projects: mockProjects
  },
  taskStats: {
    total: mockTasks.length,
    completed: mockTasks.filter(t => t.status === 'Completed').length,
    inProgress: mockTasks.filter(t => t.status === 'In Progress').length,
    notStarted: mockTasks.filter(t => t.status === 'Not Started').length,
    byPriority: {
      'High': mockTasks.filter(t => t.priority === 'High').length,
      'Medium': mockTasks.filter(t => t.priority === 'Medium').length,
      'Low': mockTasks.filter(t => t.priority === 'Low').length
    },
    recentlyCompleted: mockTasks
      .filter(t => t.status === 'Completed')
      .sort((a, b) => new Date(b.completedAt || '').getTime() - new Date(a.completedAt || '').getTime())
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        name: t.name,
        projectId: t.projectId,
        projectName: t.projectName,
        completedAt: t.completedAt || ''
      }))
  },
  componentStats: {
    total: mockComponents.length,
    byType: {
      'Service': mockComponents.filter(c => c.type === 'Service').length,
      'Library': mockComponents.filter(c => c.type === 'Library').length,
      'UI': mockComponents.filter(c => c.type === 'UI').length,
      'API': mockComponents.filter(c => c.type === 'API').length
    },
    byStatus: {
      'Active': mockComponents.filter(c => c.status === 'Active').length,
      'In Development': mockComponents.filter(c => c.status === 'In Development').length,
      'Deprecated': mockComponents.filter(c => c.status === 'Deprecated').length
    },
    components: mockComponents
  },
  documentationStats: {
    total: mockDocumentation.length,
    byType: {
      'Technical': mockDocumentation.filter(d => d.type === 'Technical').length,
      'Architecture': mockDocumentation.filter(d => d.type === 'Architecture').length,
      'User': mockDocumentation.filter(d => d.type === 'User').length,
      'Strategic': mockDocumentation.filter(d => d.type === 'Strategic').length
    },
    recentlyUpdated: mockDocumentation
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        title: d.title,
        path: d.path,
        lastUpdated: d.lastUpdated
      })),
    documentation: mockDocumentation
  },
  healthMetrics: {
    overallHealth: 85,
    issuesCount: 3,
    warningsCount: 7
  },
  activities: mockActivityFeed
};

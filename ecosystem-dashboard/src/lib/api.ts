import axios, { AxiosResponse } from 'axios';
import { mockEcosystemOverview, mockProjects, mockComponents, mockDocumentation, mockActivityFeed } from './mockData';
import {
  ProjectRegistrationData,
  ProjectRegistrationResponse,
  PortRegistrationRequest,
  PortRegistrationResponse,
  AvailablePortsResponse,
  ConfigUpdateRequest,
  ConfigUpdateResponse,
  ComplianceScanInitiationResponse,
  ComplianceScanStatusResponse,
  DocumentationSetupRequest,
  DocumentationSetupInitiationResponse,
  DocumentationSetupStatusResponse
} from '@/types/onboarding';
import {
  AgentDetectionResponse,
  AIHDSIntegrationRequest,
  AIHDSIntegrationResponse,
  AIHDSValidationRequest,
  AIHDSValidationResponse
} from '@/types/aihds-onboarding';
import { aihdsIntegrationAPI } from './api/aihds-integration';

/**
 * Base API client for making requests to the AHIS server API
 * This follows the ecosystem-first development principle by providing
 * a standardized way to interact with the AHIS server API
 */
const api = axios.create({
  baseURL: '/api', // This will be proxied to the AHIS server API through Next.js rewrites
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Cloud API client for making requests to the cloud dashboard API
 */
const cloudApi = axios.create({
  baseURL: '/api/cloud', // This will be proxied to the cloud API through Next.js rewrites
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * AI Gateway API client
 */
const aiGatewayApi = axios.create({
  baseURL: '/api/gateway', // Proxied to AI Gateway service
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Handle API errors
 * @param error - Error from API call
 * @returns Error object with message
 */
const handleApiError = <T extends { success: boolean; error?: string }>(error: any): T => {
  console.error('API Error:', error);
  
  // Create a base error response that matches our API response interfaces
  const errorResponse = {
    success: false,
    error: error.response?.data?.message || error.message || 'An unknown error occurred',
    message: error.response?.data?.message || error.message || 'An unknown error occurred',
    status: error.response?.status
  } as unknown;
  
  return errorResponse as T;
};

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Flag to use mock data in development - set to false to use real data
const useMockData = false;

// Mock data for AI Gateway models in development mode
const mockAiGatewayModels = {
  models: [
    {
      id: 'gpt-4',
      provider: 'openai',
      type: 'large-language-model',
      capabilities: ['text-generation', 'chat', 'embeddings'],
      configured: true
    },
    {
      id: 'llama3',
      provider: 'ollama',
      type: 'large-language-model',
      capabilities: ['text-generation', 'chat'],
      configured: true
    },
    {
      id: 'stable-diffusion',
      provider: 'stability',
      type: 'image-generation',
      capabilities: ['image-generation', 'image-editing'],
      configured: false
    }
  ],
  count: 3
};

/**
 * Ecosystem API - Database integration endpoints
 */
export const ecosystemApi = {
  /**
   * Get ecosystem overview data
   * @returns Overview data for the ecosystem
   */
  getOverview: async () => {
    if (useMockData) {
      console.log('Using mock data for ecosystem overview');
      return mockEcosystemOverview;
    }
    
    try {
      const response = await cloudApi.get('/ecosystem/overview');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  /**
   * Generic GET method for dashboard API endpoints
   * @param endpoint - API endpoint path
   * @returns Response data
   */
  get: async (endpoint: string) => {
    try {
      const response = await api.get(endpoint);
      return response;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  },

  /**
   * Get project details
   * @param projectId - ID of the project to get details for
   * @returns Project details
   */
  getProjectDetails: async (projectId: string) => {
    if (useMockData) {
      console.log(`Using mock data for project ${projectId}`);
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) {
        return { error: true, message: 'Project not found', status: 404 };
      }
      return { project };
    }
    
    try {
      const response = await cloudApi.get(`/ecosystem/project/${projectId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Search the ecosystem
   * @param query - Search query
   * @returns Search results
   */
  searchEcosystem: async (query: string) => {
    if (useMockData) {
      console.log(`Using mock data for search: ${query}`);
      const lowerQuery = query.toLowerCase();
      
      // Search in projects
      const projectResults = mockProjects
        .filter(p => 
          p.name.toLowerCase().includes(lowerQuery) || 
          p.description.toLowerCase().includes(lowerQuery)
        )
        .map(p => ({
          id: p.id,
          title: p.name,
          description: p.description,
          type: 'project',
          status: p.status,
          domain: p.domain,
          lastUpdated: p.lastUpdated,
          score: 1.0
        }));
      
      // Search in components
      const componentResults = mockComponents
        .filter(c => 
          c.name.toLowerCase().includes(lowerQuery) || 
          c.description.toLowerCase().includes(lowerQuery)
        )
        .map(c => ({
          id: c.id,
          title: c.name,
          description: c.description,
          type: 'component',
          projectId: c.projectId,
          projectName: c.projectName,
          status: c.status,
          lastUpdated: c.lastUpdated,
          score: 0.9
        }));
      
      // Search in documentation
      const documentationResults = mockDocumentation
        .filter(d => 
          d.title.toLowerCase().includes(lowerQuery) || 
          d.description.toLowerCase().includes(lowerQuery) ||
          d.path.toLowerCase().includes(lowerQuery)
        )
        .map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          type: 'documentation',
          projectId: d.projectId,
          projectName: d.projectName,
          path: d.path,
          tags: d.tags,
          lastUpdated: d.lastUpdated,
          score: 0.8
        }));
      
      // Combine results and sort by score
      const results = [...projectResults, ...componentResults, ...documentationResults]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      return { results };
    }
    
    try {
      const response = await cloudApi.get('/ecosystem/search', {
        params: { query },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get project progress timeline
   * @param projectId - ID of the project to get timeline for
   * @returns Project progress timeline
   */
  getProjectProgressTimeline: async (projectId: string) => {
    if (useMockData) {
      console.log(`Using mock data for project timeline ${projectId}`);
      // Generate mock timeline data
      const project = mockProjects.find(p => p.id === projectId);
      if (!project) {
        return { error: true, message: 'Project not found', status: 404 };
      }
      
      const timeline = [
        { date: '2025-01-01', progress: 0 },
        { date: '2025-02-01', progress: 25 },
        { date: '2025-03-01', progress: 50 },
        { date: '2025-04-01', progress: 75 },
        { date: project.lastUpdated, progress: project.progress }
      ];
      
      return { timeline };
    }
    
    try {
      const response = await cloudApi.get(`/ecosystem/project/${projectId}/timeline`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get activity feed
   * @returns Activity feed for the ecosystem
   */
  getActivityFeed: async () => {
    if (useMockData) {
      console.log('Using mock data for activity feed');
      return { activities: mockActivityFeed };
    }
    
    try {
      const response = await cloudApi.get('/ecosystem/activity');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get documentation statistics
   * @returns Statistics about documentation in the ecosystem
   */
  getDocumentationStats: async () => {
    // TODO: Implement mock data if needed (useMockData flag)
    try {
      // Assuming the backend route is /api/documentation-stats
      // This uses the base 'api' axios instance which proxies to the MCP server
      const response = await api.get('/documentation-stats'); 
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get all documentation entries
   * @returns List of documentation entries
   */
  getAllDocumentation: async () => {
    // TODO: Implement mock data if needed (useMockData flag)
    try {
      // Uses the base 'api' axios instance which proxies to the AHIS server
      const response = await api.get('/documentation'); // Calls GET /api/documentation which is proxied to the AHIS server
      return response.data; // Expects { success: true, data: [...] } from the backend
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Register a new project with AHIS
   * @param projectData - Project data to register
   * @returns Registration result
   */
  registerProject: async (projectData: ProjectRegistrationData): Promise<ProjectRegistrationResponse> => {
    try {
      const response = await api.post<ProjectRegistrationResponse>('/ahis/projects/register', projectData);
      return response.data;
    } catch (error) {
      return handleApiError<ProjectRegistrationResponse>(error);
    }
  },

  /**
   * Register ports for a project
   * @param data - Port registration data including project_id and services
   * @returns Registration result
   */
  registerPorts: async (data: PortRegistrationRequest): Promise<PortRegistrationResponse> => {
    try {
      const response = await api.post<PortRegistrationResponse>('/ahis/ports/register', data);
      return response.data;
    } catch (error) {
      return handleApiError<PortRegistrationResponse>(error);
    }
  },

  /**
   * Get available ports for services
   * @returns List of available ports
   */
  getAvailablePorts: async (): Promise<AvailablePortsResponse> => {
    try {
      const response = await api.get<AvailablePortsResponse>('/ahis/ports/available');
      return response.data;
    } catch (error) {
      return handleApiError<AvailablePortsResponse>(error);
    }
  },

  /**
   * Update project configuration files
   * @param data - Configuration update data
   * @returns Update result
   */
  updateProjectConfig: async (data: ConfigUpdateRequest): Promise<ConfigUpdateResponse> => {
    try {
      const response = await api.post<ConfigUpdateResponse>('/ahis/projects/config/update', data);
      return response.data;
    } catch (error) {
      return handleApiError<ConfigUpdateResponse>(error);
    }
  },

  /**
   * Initiate a compliance scan for a project
   * @param projectId - ID of the project to scan
   * @returns Scan initiation result with scan_id
   */
  initiateComplianceScan: async (projectId: string): Promise<ComplianceScanInitiationResponse> => {
    try {
      const response = await api.post<ComplianceScanInitiationResponse>('/ahis/compliance/scan', { project_id: projectId });
      return response.data;
    } catch (error) {
      return handleApiError<ComplianceScanInitiationResponse>(error);
    }
  },

  /**
   * Get the status of a compliance scan
   * @param scanId - ID of the scan to check
   * @returns Scan status and results
   */
  getComplianceScanStatus: async (scanId: string): Promise<ComplianceScanStatusResponse> => {
    try {
      const response = await api.get<ComplianceScanStatusResponse>(`/ahis/compliance/scan/${scanId}/status`);
      return response.data;
    } catch (error) {
      return handleApiError<ComplianceScanStatusResponse>(error);
    }
  },

  /**
   * Setup documentation for a project
   * @param projectId - ID of the project
   * @param options - Optional documentation setup options
   * @returns Setup initiation result with operation_id
   */
  setupDocumentation: async (projectId: string, options?: DocumentationSetupRequest['options']): Promise<DocumentationSetupInitiationResponse> => {
    try {
      const response = await api.post<DocumentationSetupInitiationResponse>('/ahis/documentation/setup', { 
        project_id: projectId,
        ...options
      });
      return response.data;
    } catch (error) {
      return handleApiError<DocumentationSetupInitiationResponse>(error);
    }
  },

  /**
   * Get the status of a documentation setup operation
   * @param operationId - ID of the operation to check
   * @returns Setup status and results
   */
  getDocumentationSetupStatus: async (operationId: string): Promise<DocumentationSetupStatusResponse> => {
    try {
      const response = await api.get<DocumentationSetupStatusResponse>(`/ahis/documentation/setup/${operationId}/status`);
      return response.data;
    } catch (error) {
      return handleApiError<DocumentationSetupStatusResponse>(error);
    }
  },

  /**
   * AIHDS SDK Integration Methods
   */

  /**
   * Detect agent components in a project
   * @param projectId - ID of the project
   * @param projectPath - Path to the project directory
   * @returns Agent detection results
   */
  detectAgents: async (projectId: string, projectPath: string): Promise<AgentDetectionResponse> => {
    return await aihdsIntegrationAPI.detectAgents(projectId, projectPath);
  },

  /**
   * Integrate AIHDS SDK into a project
   * @param request - SDK integration request data
   * @returns Integration results
   */
  integrateAIHDSSDK: async (request: AIHDSIntegrationRequest): Promise<AIHDSIntegrationResponse> => {
    return await aihdsIntegrationAPI.integrateSDK(request);
  },

  /**
   * Validate AIHDS SDK integration in a project
   * @param request - Validation request data
   * @returns Validation results
   */
  validateAIHDSIntegration: async (request: AIHDSValidationRequest): Promise<AIHDSValidationResponse> => {
    return await aihdsIntegrationAPI.validateIntegration(request);
  },
};

/**
 * AI Gateway Service - API endpoints for AI Gateway
 */
export const aiGatewayService = {
  /**
   * Get all configured AI models from the Gateway
   * @returns List of models
   */
  getModels: async () => {
    // Use mock data in development mode to prevent API errors
    if (process.env.NODE_ENV === 'development') {
      console.log('Using mock data for AI Gateway models in development mode');
      return Promise.resolve(mockAiGatewayModels);
    }

    return new Promise((resolve, reject) => {
      aiGatewayApi
        .get('/v1/models')
        .then((response) => resolve(response.data))
        .catch((error) => {
          console.error('Error fetching models:', error);
          // Fall back to mock data even on error in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Falling back to mock data after API error');
            resolve(mockAiGatewayModels);
          } else {
            reject(handleApiError(error));
          }
        });
    });
  },

  /**
   * Get details for a specific model from the Gateway
   * @param provider - The model provider (e.g., 'ollama', 'openai')
   * @param modelName - The name of the model
   * @returns Model details
   */
  getModelDetails: async (provider: string, modelName: string) => {
    // Example: If mock data is needed
    // if (useMockData) { ... }
    try {
      const response = await aiGatewayApi.get(`/v1/models/${provider}/${modelName}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  // Add other AI Gateway service methods here as needed
};

/**
 * Cloud API - Cloud Dashboard specific endpoints
 */
export const cloudApiService = {
  // Add cloud API service methods here as needed
};

/**
 * Infrastructure API - Kubernetes endpoints
 */
export const infrastructureApi = {
  getKubernetes: async () => {
    if (useMockData) {
      return { 
        clusterInfo: {
          name: 'ai-homelab-cluster',
          version: 'v1.26.3',
          nodes: 3,
          pods: 24,
          namespaces: 6,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/kubernetes');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getNamespaces: async () => {
    if (useMockData) {
      return {
        namespaces: [
          { name: 'default', status: 'Active', pods: 5 },
          { name: 'kube-system', status: 'Active', pods: 8 },
          { name: 'monitoring', status: 'Active', pods: 4 },
          { name: 'ai-systems', status: 'Active', pods: 3 },
          { name: 'knowledge', status: 'Active', pods: 2 },
          { name: 'platforms', status: 'Active', pods: 2 }
        ]
      };
    }
    
    try {
      const response = await cloudApi.get('/kubernetes/namespaces');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getPods: async () => {
    if (useMockData) {
      return {
        pods: [
          { name: 'mcp-server-7d9f6b8c7b-2xz4r', namespace: 'default', status: 'Running', restarts: 0 },
          { name: 'postgres-0', namespace: 'default', status: 'Running', restarts: 0 },
          { name: 'redis-0', namespace: 'default', status: 'Running', restarts: 0 },
          { name: 'authentik-server-0', namespace: 'default', status: 'Running', restarts: 0 },
          { name: 'authentik-worker-5d8b9c7f68-xvz2q', namespace: 'default', status: 'Running', restarts: 0 }
        ]
      };
    }
    
    try {
      const response = await cloudApi.get('/kubernetes/pods');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getServiceMesh: async () => {
    if (useMockData) {
      return {
        serviceMeshInfo: {
          name: 'istio',
          version: '1.16.2',
          services: 12,
          gateways: 2,
          virtualServices: 8,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/service-mesh');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * Knowledge Systems API - Knowledge endpoints
 */
export const knowledgeApi = {
  getVectorDb: async () => {
    if (useMockData) {
      return {
        vectorDbInfo: {
          name: 'Milvus',
          version: '2.2.3',
          collections: 5,
          entities: 1250000,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/vector-db');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getKnowledgeGraph: async () => {
    if (useMockData) {
      return {
        knowledgeGraphInfo: {
          name: 'Neo4j',
          version: '5.7.0',
          nodes: 75000,
          relationships: 320000,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/knowledge-graph');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getKnowledgeMesh: async () => {
    if (useMockData) {
      return {
        knowledgeMeshInfo: {
          components: 3,
          connectors: 5,
          dataFlows: 8,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/knowledge-mesh');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getDocumentationContent: async (docId: number): Promise<any> => {
    if (isNaN(docId)) {
      throw new Error('Invalid Documentation ID provided.');
    }
    try {
      const response = await api.get(`/knowledge/documentation/${docId}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Scan AI Homelab ecosystem for new documents
   * @returns Scan results with discovered documents
   */
  scanEcosystemDocuments: async (): Promise<any> => {
    try {
      // Use AHIS JSON-RPC interface for ecosystem scanning
      const response = await api.post('/ahis', {
        jsonrpc: '2.0',
        id: 'scan-ecosystem-' + Date.now(),
        method: 'ecosystem_scanner',
        params: {
          action: 'scan_projects',
          projects: ['ai-gateway', 'knowledge-graph', 'ecosystem-dashboard', 'authentik', 'monitoring'],
          file_types: ['markdown', 'text', 'code', 'config'],
          exclude_patterns: ['node_modules', '.git', 'dist', 'build']
        }
      });
      return {
        success: true,
        data: response.data.result || []
      };
    } catch (error) {
      console.error('Ecosystem scan failed:', error);
      return handleApiError(error);
    }
  },

  /**
   * Get project scan status from AHIS
   * @param scanId - ID of the scan operation
   * @returns Scan status and progress
   */
  getProjectScanStatus: async (scanId: string): Promise<any> => {
    try {
      const response = await api.post('/ahis', {
        jsonrpc: '2.0',
        id: 'scan-status-' + Date.now(),
        method: 'ecosystem_scanner',
        params: {
          action: 'get_scan_status',
          scan_id: scanId
        }
      });
      return {
        success: true,
        data: response.data.result
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Prepare documents for Knowledge Graph ingestion
   * @param documents - Array of document paths to prepare
   * @returns Preparation results
   */
  prepareDocumentsForIngestion: async (documents: string[]): Promise<any> => {
    try {
      const response = await api.post('/knowledge/prepare-ingestion', {
        documents,
        timestamp: new Date().toISOString()
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Ingest documents into Knowledge Graph
   * @param documents - Array of prepared documents
   * @returns Ingestion results
   */
  ingestDocuments: async (documents: any[]): Promise<any> => {
    try {
      const response = await api.post('/knowledge/ingest', {
        documents,
        options: {
          update_existing: true,
          create_embeddings: true,
          extract_entities: true
        },
        timestamp: new Date().toISOString()
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get ingestion progress
   * @param ingestionId - ID of the ingestion operation
   * @returns Ingestion progress and status
   */
  getIngestionProgress: async (ingestionId: string): Promise<any> => {
    try {
      const response = await api.get(`/knowledge/ingestion/${ingestionId}/progress`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * AI Systems API - AI endpoints
 */
export const aiSystemsApi = {
  getModelRegistry: async () => {
    if (useMockData) {
      return {
        modelRegistryInfo: {
          models: 24,
          versions: 87,
          frameworks: ['PyTorch', 'TensorFlow', 'JAX', 'ONNX'],
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/model-registry');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getModelServing: async () => {
    if (useMockData) {
      return {
        modelServingInfo: {
          platforms: ['Triton', 'TorchServe', 'TF Serving'],
          deployedModels: 12,
          endpoints: 18,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/model-serving');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getExperimentTracking: async () => {
    if (useMockData) {
      return {
        experimentTrackingInfo: {
          platform: 'MLflow',
          experiments: 35,
          runs: 428,
          artifacts: 1250,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/experiment-tracking');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * Platforms API - Platform endpoints
 */
export const platformsApi = {
  getPlatformStatus: async () => {
    if (useMockData) {
      return {
        platformStatus: {
          platforms: 3,
          services: 12,
          users: 25,
          status: 'Healthy'
        }
      };
    }
    
    try {
      const response = await cloudApi.get('/platform-status');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  getDeployments: async () => {
    if (useMockData) {
      return {
        deployments: [
          { name: 'knowledge-graph-ui', platform: 'Web', status: 'Deployed', version: '1.2.0', lastDeployed: '2025-03-15' },
          { name: 'model-registry-ui', platform: 'Web', status: 'Deployed', version: '0.9.0', lastDeployed: '2025-04-01' },
          { name: 'mcp-dashboard', platform: 'Web', status: 'Deployed', version: '1.0.0', lastDeployed: '2025-04-28' }
        ]
      };
    }
    
    try {
      const response = await cloudApi.get('/deployments');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

/**
 * Database API - Direct database access endpoints
 */
/**
 * Port Registry API - Port management endpoints
 */
export const portRegistryApi = {
  /**
   * Get all registered ports
   * @returns List of all registered ports
   */
  getAllPorts: async () => {
    try {
      const response = await api.get('/ports');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get port registry statistics
   * @returns Statistics about the port registry
   */
  getPortStats: async () => {
    try {
      const response = await api.get('/ports/stats');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Analyze port assignments and generate migration recommendations
   * @returns Analysis of port assignments with recommendations
   */
  analyzePortAssignments: async () => {
    try {
      // This uses the AHIS JSON-RPC interface
      const response = await api.post('/ahis', {
        jsonrpc: '2.0',
        id: 'analyze-ports-' + Date.now(),
        method: 'port_registry',
        params: {
          action: 'analyze_ports'
        }
      });
      return response.data.result;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Scan ecosystem for port compliance
   * @returns Results of ecosystem port compliance scan
   */
  scanEcosystemForPortCompliance: async () => {
    try {
      const response = await api.post('/ports/scan-ecosystem');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Find available port in range
   * @param startPort - Start of port range to search
   * @param endPort - End of port range to search
   * @returns Available port number or null if none found
   */
  findAvailablePort: async (startPort: number = 8000, endPort: number = 9099) => {
    try {
      const response = await api.get(`/ports/available?start=${startPort}&end=${endPort}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get ports by service name
   * @param serviceName - Name of the service to get ports for
   * @returns List of ports for the specified service
   */
  getPortsByService: async (serviceName: string) => {
    try {
      const response = await api.get(`/ports/service/${serviceName}`);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};

export const databaseApi = {
  /**
   * Get database status and statistics
   * @returns Database status information
   */
  getDatabaseStatus: async () => {
    try {
      const response = await cloudApi.get('/database/status');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get database schema information
   * @returns Database schema structure
   */
  getDatabaseSchema: async () => {
    try {
      const response = await cloudApi.get('/database/schema');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get table data with pagination
   * @param tableName - Name of the table to get data for
   * @param limit - Maximum number of rows to return
   * @param offset - Offset for pagination
   * @returns Table data with pagination information
   */
  getTableData: async (tableName: string, limit: number = 100, offset: number = 0) => {
    try {
      const response = await cloudApi.get(`/database/table/${tableName}`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  }
};

export default api;

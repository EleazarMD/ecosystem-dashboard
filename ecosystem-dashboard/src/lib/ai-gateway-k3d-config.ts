/**
 * AI Gateway k3d Kubernetes Configuration Helper
 * Handles dynamic endpoint resolution for AI Gateway deployed in k3d cluster
 */

export interface AIGatewayEndpoints {
  aiClientUrl: string;
  serviceMeshUrl: string;
  apiKey: string;
}

export interface K3dServiceConfig {
  namespace: string;
  serviceName: string;
  port: number;
  loadBalancerPort?: number;
}

/**
 * AI Gateway k3d service configurations
 */
export const AI_GATEWAY_K3D_SERVICES = {
  aiClient: {
    namespace: 'ai-gateway',
    serviceName: 'ai-gateway-ai-client',
    port: 8777,
    loadBalancerPort: 8777
  } as K3dServiceConfig,
  
  serviceMesh: {
    namespace: 'ai-gateway', 
    serviceName: 'ai-gateway-service-mesh',
    port: 7777,
    loadBalancerPort: 7777
  } as K3dServiceConfig
};

/**
 * Check if AI Gateway is available in k3d cluster
 */
export async function checkK3dAIGatewayAvailability(): Promise<boolean> {
  try {
    // Try to reach the k3d LoadBalancer endpoint
    const response = await fetch(`http://localhost:${AI_GATEWAY_K3D_SERVICES.serviceMesh.loadBalancerPort}/health`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024'
      },
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        return controller.signal;
      })()
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'healthy' && data.port === 7777;
    }
    
    return false;
  } catch (error) {
    console.log('k3d AI Gateway not available, using localhost fallback');
    return false;
  }
}

/**
 * Get AI Gateway endpoints based on deployment status
 */
export async function getAIGatewayEndpoints(): Promise<AIGatewayEndpoints> {
  const apiKey = process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024';
  
  // Check if k3d deployment is available
  const isK3dAvailable = await checkK3dAIGatewayAvailability();
  
  if (isK3dAvailable) {
    console.log('🚀 Using k3d AI Gateway endpoints');
    return {
      aiClientUrl: `http://localhost:${AI_GATEWAY_K3D_SERVICES.aiClient.loadBalancerPort}`,
      serviceMeshUrl: `http://localhost:${AI_GATEWAY_K3D_SERVICES.serviceMesh.loadBalancerPort}`,
      apiKey
    };
  }
  
  // Fallback to localhost development endpoints
  console.log('🔧 Using localhost AI Gateway endpoints (development)');
  return {
    aiClientUrl: process.env.NEXT_PUBLIC_AI_GATEWAY_AI_CLIENT_URL || 'http://localhost:8777',
    serviceMeshUrl: process.env.NEXT_PUBLIC_AI_GATEWAY_SERVICE_MESH_URL || 'http://localhost:7777',
    apiKey
  };
}

/**
 * Get cluster-internal service URLs (for services running inside k3d)
 */
export function getClusterInternalEndpoints(): AIGatewayEndpoints {
  return {
    aiClientUrl: `http://${AI_GATEWAY_K3D_SERVICES.aiClient.serviceName}.${AI_GATEWAY_K3D_SERVICES.aiClient.namespace}.svc.cluster.local:${AI_GATEWAY_K3D_SERVICES.aiClient.port}`,
    serviceMeshUrl: `http://${AI_GATEWAY_K3D_SERVICES.serviceMesh.serviceName}.${AI_GATEWAY_K3D_SERVICES.serviceMesh.namespace}.svc.cluster.local:${AI_GATEWAY_K3D_SERVICES.serviceMesh.port}`,
    apiKey: process.env.NEXT_PUBLIC_AI_GATEWAY_API_KEY || 'ai-gateway-api-key-2024'
  };
}

/**
 * Test AI Gateway connectivity
 */
export async function testAIGatewayConnectivity(endpoints: AIGatewayEndpoints): Promise<{
  aiClient: boolean;
  serviceMesh: boolean;
  details: any;
}> {
  const results = {
    aiClient: false,
    serviceMesh: false,
    details: {} as any
  };
  
  try {
    // Test AI Client endpoint (Port 8777)
    const aiClientResponse = await fetch(`${endpoints.aiClientUrl}/health`, {
      headers: { 'X-API-Key': endpoints.apiKey },
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        return controller.signal;
      })()
    });
    
    if (aiClientResponse.ok) {
      results.aiClient = true;
      results.details.aiClient = await aiClientResponse.json();
    }
  } catch (error) {
    results.details.aiClientError = error;
  }
  
  try {
    // Test Service Mesh endpoint (Port 7777)
    const serviceMeshResponse = await fetch(`${endpoints.serviceMeshUrl}/health`, {
      headers: { 'X-API-Key': endpoints.apiKey },
      signal: (() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 5000);
        return controller.signal;
      })()
    });
    
    if (serviceMeshResponse.ok) {
      results.serviceMesh = true;
      results.details.serviceMesh = await serviceMeshResponse.json();
    }
  } catch (error) {
    results.details.serviceMeshError = error;
  }
  
  return results;
}

/**
 * Environment detection helper
 */
export function getDeploymentEnvironment(): 'development' | 'k3d' | 'production' {
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  if (process.env.NEXT_PUBLIC_K3D_DEPLOYMENT === 'true') {
    return 'k3d';
  }
  
  return 'development';
}

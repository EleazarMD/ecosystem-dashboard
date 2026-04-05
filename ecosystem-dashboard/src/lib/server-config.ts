/**
 * Server Configuration Utility
 * 
 * Provides configuration settings for server-side API routes.
 * Loads configuration from environment variables.
 */

interface ServerConfig {
  // AHIS configuration
  ahisServerHost: string;
  ahisServerPort: number;
  ahisServerUrl: string;
  
  // Agent Registry Service configuration
  agentRegistryUrl: string;
  agentRegistryAuthToken: string;
}

/**
 * Get server configuration
 * 
 * @returns Server configuration object
 */
export function getServerConfig(): ServerConfig {
  // Get AHIS configuration
  const ahisServerHost = process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost';
  const ahisServerPort = parseInt(process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888', 10);
  const ahisServerUrl = `http://${ahisServerHost}:${ahisServerPort}`;
  
  // Get Agent Registry Service configuration
  const agentRegistryUrl = process.env.AGENT_REGISTRY_URL || 'http://localhost:8888';
  const agentRegistryAuthToken = process.env.AGENT_REGISTRY_AUTH_TOKEN || '';
  
  return {
    ahisServerHost,
    ahisServerPort,
    ahisServerUrl,
    agentRegistryUrl,
    agentRegistryAuthToken
  };
}

/**
 * Get client-safe configuration
 * 
 * Returns only configuration that is safe to expose to the client
 * 
 * @returns Client-safe configuration object
 */
export function getClientConfig() {
  return {
    ahisServerHost: process.env.NEXT_PUBLIC_AHIS_SERVER_HOST || 'localhost',
    ahisServerPort: parseInt(process.env.NEXT_PUBLIC_AHIS_SERVER_PORT || '8888', 10),
  };
}

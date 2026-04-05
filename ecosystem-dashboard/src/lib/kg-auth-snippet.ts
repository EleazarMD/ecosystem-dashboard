/**
 * Create authenticated headers for Knowledge Graph API requests
 * 
 * @param requestId - The request ID for tracing
 * @param serviceApiKey - Optional API key for service-to-service authentication
 * @returns Headers object with authentication and tracing information
 */
export function createAuthenticatedHeaders(requestId: string, serviceApiKey?: string): Record<string, string> {
  // Add request ID and content type to headers for authentication and tracing
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId
  };

  // Add service API key for proper service-to-service authentication if provided
  if (serviceApiKey) {
    headers['X-API-Key'] = serviceApiKey;
    console.debug('[KG-Gateway] Using service API key for authentication', { requestId });
  }
  
  return headers;
}

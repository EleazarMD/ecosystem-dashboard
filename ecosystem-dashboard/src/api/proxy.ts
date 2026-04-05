// Dashboard Proxy API for database operations
// This provides kubectl-based database access when CLI tools aren't available in containers

export interface ProxyQueryRequest {
  query?: string;
  command?: string;
  parameters?: Record<string, any>;
}

export interface ProxyQueryResponse {
  success: boolean;
  results?: any[];
  data?: any[];
  error?: string;
  executionTime?: number;
  output?: string;
}

// Execute PostgreSQL query through kubectl proxy
export const executePostgreSQLProxy = async (query: string): Promise<ProxyQueryResponse> => {
  try {
    const response = await fetch('/api/proxy/database/postgresql/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Execute Neo4j Cypher query through kubectl proxy
export const executeCypherProxy = async (query: string, parameters: Record<string, any> = {}): Promise<ProxyQueryResponse> => {
  try {
    const response = await fetch('/api/proxy/database/neo4j/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, parameters })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Execute Redis command through kubectl proxy
export const executeRedisProxy = async (command: string): Promise<ProxyQueryResponse> => {
  try {
    const response = await fetch('/api/proxy/database/redis/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Test single-file ingestion through proxy
export const testIngestionProxy = async (documentPath: string, content: string): Promise<ProxyQueryResponse> => {
  try {
    const response = await fetch('/api/proxy/ingestion/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentPath, content })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get proxy health status
export const getProxyHealth = async (): Promise<ProxyQueryResponse> => {
  try {
    const response = await fetch('/api/proxy/health');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

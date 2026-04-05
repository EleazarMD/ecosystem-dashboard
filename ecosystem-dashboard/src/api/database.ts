// Database API endpoints for the AI Homelab Dashboard
import axios from 'axios';

const KG_API_BASE = process.env.REACT_APP_KG_API_URL || 'http://localhost:8765';

export interface DatabaseQueryRequest {
  query: string;
  parameters?: Record<string, any>;
}

export interface DatabaseQueryResponse {
  success: boolean;
  results?: any[];
  data?: any[];
  error?: string;
  message?: string;
  executionTime?: number;
  rowCount?: number;
}

export interface DatabaseHealth {
  status: string;
  components: {
    postgres?: string;
    neo4j?: string;
    redis?: string;
  };
}

// PostgreSQL query execution
export const executePostgreSQLQuery = async (query: string): Promise<DatabaseQueryResponse> => {
  try {
    const response = await axios.post(`${KG_API_BASE}/database/postgresql/query`, {
      query
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || error.message
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Neo4j Cypher query execution
export const executeCypherQuery = async (query: string, parameters: Record<string, any> = {}): Promise<DatabaseQueryResponse> => {
  try {
    const response = await axios.post(`${KG_API_BASE}/query`, {
      query,
      parameters
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || error.message
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Redis command execution
export const executeRedisCommand = async (command: string): Promise<DatabaseQueryResponse> => {
  try {
    const response = await axios.post(`${KG_API_BASE}/database/redis/command`, {
      command
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || error.message
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get database health status
export const getDatabaseHealth = async (): Promise<DatabaseHealth> => {
  try {
    const response = await axios.get(`${KG_API_BASE}/health`);
    return response.data;
  } catch (error) {
    return {
      status: 'error',
      components: {
        postgres: 'disconnected',
        neo4j: 'disconnected',
        redis: 'disconnected'
      }
    };
  }
};

// Document ingestion
export const ingestDocument = async (documentPath: string, content: string, metadata: Record<string, any> = {}): Promise<DatabaseQueryResponse> => {
  try {
    const response = await axios.post(`${KG_API_BASE}/ingest`, {
      documentPath,
      content,
      metadata
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || error.message
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Search documents and entities
export const searchKnowledgeGraph = async (query: string, limit: number = 10, offset: number = 0): Promise<DatabaseQueryResponse> => {
  try {
    const response = await axios.get(`${KG_API_BASE}/search`, {
      params: { q: query, limit, offset }
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || error.message
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get graph statistics
export const getGraphStatistics = async (): Promise<DatabaseQueryResponse> => {
  try {
    const response = await axios.get(`${KG_API_BASE}/graph/statistics`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        success: false,
        error: error.response.data?.error || error.message
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

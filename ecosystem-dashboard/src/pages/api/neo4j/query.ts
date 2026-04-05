import { NextApiRequest, NextApiResponse } from 'next';
import neo4j from 'neo4j-driver';

interface Neo4jQueryRequest {
  cypher: string;
  parameters?: Record<string, any>;
}

interface Neo4jNode {
  identity: string;
  labels: string[];
  properties: Record<string, any>;
}

interface Neo4jRelationship {
  identity: string;
  type: string;
  start: string;
  end: string;
  properties: Record<string, any>;
}

interface Neo4jResponse {
  success: boolean;
  data?: {
    nodes: Neo4jNode[];
    relationships: Neo4jRelationship[];
    statistics?: {
      nodeCount: number;
      relationshipCount: number;
      executionTime: number;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Neo4jResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  const { cypher, parameters = {} }: Neo4jQueryRequest = req.body;

  if (!cypher || typeof cypher !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Invalid or missing cypher query'
    });
  }

  // Create Neo4j driver
  const driver = neo4j.driver(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_USER || 'neo4j',
      process.env.NEO4J_PASSWORD || 'password'
    )
  );

  let session;

  try {
    session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    
    const startTime = Date.now();
    const result = await session.run(cypher, parameters);
    const executionTime = Date.now() - startTime;

    // Process results
    const nodes = new Map<string, Neo4jNode>();
    const relationships: Neo4jRelationship[] = [];

    result.records.forEach(record => {
      record.keys.forEach((key, index) => {
        const value = record.get(index);
        
        if (value && typeof value === 'object') {
          // Handle Neo4j Node
          if (value.labels !== undefined) {
            const nodeId = value.identity.toString();
            if (!nodes.has(nodeId)) {
              nodes.set(nodeId, {
                identity: nodeId,
                labels: value.labels,
                properties: value.properties || {}
              });
            }
          }
          
          // Handle Neo4j Relationship
          if (value.type !== undefined && value.start !== undefined && value.end !== undefined) {
            const startId = value.start.toString();
            const endId = value.end.toString();
            
            relationships.push({
              identity: value.identity.toString(),
              type: value.type,
              start: startId,
              end: endId,
              properties: value.properties || {}
            });
          }
          
          // Handle Path objects
          if (value.segments !== undefined) {
            value.segments.forEach((segment: any) => {
              // Add start node
              const startId = segment.start.identity.toString();
              if (!nodes.has(startId)) {
                nodes.set(startId, {
                  identity: startId,
                  labels: segment.start.labels,
                  properties: segment.start.properties || {}
                });
              }
              
              // Add end node
              const endId = segment.end.identity.toString();
              if (!nodes.has(endId)) {
                nodes.set(endId, {
                  identity: endId,
                  labels: segment.end.labels,
                  properties: segment.end.properties || {}
                });
              }
              
              // Add relationship
              relationships.push({
                identity: segment.relationship.identity.toString(),
                type: segment.relationship.type,
                start: startId,
                end: endId,
                properties: segment.relationship.properties || {}
              });
            });
          }
        }
      });
    });

    const responseData = {
      nodes: Array.from(nodes.values()),
      relationships,
      statistics: {
        nodeCount: nodes.size,
        relationshipCount: relationships.length,
        executionTime
      }
    };

    console.log(`[Neo4j API] Query executed successfully. Nodes: ${nodes.size}, Relationships: ${relationships.length}, Time: ${executionTime}ms`);

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('[Neo4j API] Query execution failed:', error);
    
    let errorMessage = 'Unknown error occurred';
    if (error.code) {
      errorMessage = `Neo4j Error [${error.code}]: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });

  } finally {
    if (session) {
      await session.close();
    }
    await driver.close();
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import neo4j from 'neo4j-driver';

interface Neo4jStats {
  success: boolean;
  data?: {
    totalNodes: number;
    totalRelationships: number;
    nodeLabels: Array<{ label: string; count: number }>;
    relationshipTypes: Array<{ type: string; count: number }>;
    databaseInfo: {
      name: string;
      version: string;
      edition: string;
    };
    isConnected: boolean;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Neo4jStats>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
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
    
    // Test connection
    await session.run('RETURN 1');

    // Get total node count
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as totalNodes');
    const totalNodes = nodeCountResult.records[0]?.get('totalNodes').toNumber() || 0;

    // Get total relationship count
    const relationshipCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as totalRelationships');
    const totalRelationships = relationshipCountResult.records[0]?.get('totalRelationships').toNumber() || 0;

    // Get node labels with counts
    const labelsResult = await session.run(`
      CALL db.labels() YIELD label
      CALL {
        WITH label
        MATCH (n)
        WHERE label IN labels(n)
        RETURN count(n) as count
      }
      RETURN label, count
      ORDER BY count DESC
    `);
    
    const nodeLabels = labelsResult.records.map(record => ({
      label: record.get('label'),
      count: record.get('count').toNumber()
    }));

    // Get relationship types with counts
    const typesResult = await session.run(`
      CALL db.relationshipTypes() YIELD relationshipType
      CALL {
        WITH relationshipType
        MATCH ()-[r]->()
        WHERE type(r) = relationshipType
        RETURN count(r) as count
      }
      RETURN relationshipType as type, count
      ORDER BY count DESC
    `);
    
    const relationshipTypes = typesResult.records.map(record => ({
      type: record.get('type'),
      count: record.get('count').toNumber()
    }));

    // Get database info
    const dbInfoResult = await session.run('CALL dbms.components()');
    const dbInfo = dbInfoResult.records[0];
    
    const databaseInfo = {
      name: dbInfo?.get('name') || 'neo4j',
      version: dbInfo?.get('versions')[0] || 'Unknown',
      edition: dbInfo?.get('edition') || 'Community'
    };

    const responseData = {
      totalNodes,
      totalRelationships,
      nodeLabels,
      relationshipTypes,
      databaseInfo,
      isConnected: true
    };

    console.log(`[Neo4j Stats] Database statistics retrieved successfully. Nodes: ${totalNodes}, Relationships: ${totalRelationships}`);

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error: any) {
    console.error('[Neo4j Stats] Failed to retrieve database statistics:', error);
    
    let errorMessage = 'Failed to connect to Neo4j database';
    if (error.code) {
      errorMessage = `Neo4j Error [${error.code}]: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      data: {
        totalNodes: 0,
        totalRelationships: 0,
        nodeLabels: [],
        relationshipTypes: [],
        databaseInfo: {
          name: 'Unknown',
          version: 'Unknown',
          edition: 'Unknown'
        },
        isConnected: false
      }
    });

  } finally {
    if (session) {
      await session.close();
    }
    await driver.close();
  }
}

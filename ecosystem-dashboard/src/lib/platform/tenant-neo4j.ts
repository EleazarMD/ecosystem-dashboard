/**
 * Tenant Neo4j Manager
 * 
 * Manages tenant-scoped Neo4j graph data for:
 * - Email GraphRAG (contacts, threads, topics, sentiments)
 * - Knowledge Graph (facts, concepts, relationships)
 * - Calendar entities (events, people)
 */

import { TenantDataService, TenantNeo4jLabels } from './tenant-data-service';

// ============================================================
// Types
// ============================================================

export interface Neo4jNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Neo4jRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties?: Record<string, any>;
}

export interface GraphQueryResult {
  nodes: Neo4jNode[];
  relationships: Neo4jRelationship[];
}

// ============================================================
// Tenant Neo4j Manager
// ============================================================

export class TenantNeo4jManager {
  private tenantService: TenantDataService;
  private neo4jUrl: string;
  private apiUrl: string;
  
  constructor(tenantService: TenantDataService) {
    this.tenantService = tenantService;
    this.neo4jUrl = tenantService.getTenantContext().urls.neo4j;
    // Use HTTP API endpoint for Neo4j (typically on port 7474)
    this.apiUrl = this.neo4jUrl.replace('bolt://', 'http://').replace(':7687', ':7474');
  }
  
  // --------------------------------------------------------
  // Label Management
  // --------------------------------------------------------
  
  /**
   * Get all label names for this tenant
   */
  getLabels(): TenantNeo4jLabels {
    return this.tenantService.getNeo4jLabels();
  }
  
  /**
   * Get tenant prefix for labels
   */
  getTenantPrefix(): string {
    return this.tenantService.getTenantContext().tenantSlug;
  }
  
  /**
   * Initialize tenant namespace (create constraints and indexes)
   */
  async initializeTenantNamespace(): Promise<void> {
    const labels = this.getLabels();
    const prefix = this.getTenantPrefix();
    
    // Create constraints for unique IDs
    const constraints = [
      `CREATE CONSTRAINT ${prefix}_person_email IF NOT EXISTS FOR (p:${labels.Person}) REQUIRE p.email IS UNIQUE`,
      `CREATE CONSTRAINT ${prefix}_email_id IF NOT EXISTS FOR (e:${labels.Email}) REQUIRE e.id IS UNIQUE`,
      `CREATE CONSTRAINT ${prefix}_event_id IF NOT EXISTS FOR (e:${labels.Event}) REQUIRE e.id IS UNIQUE`,
      `CREATE CONSTRAINT ${prefix}_fact_id IF NOT EXISTS FOR (f:${labels.Fact}) REQUIRE f.id IS UNIQUE`,
    ];
    
    // Create indexes for common queries
    const indexes = [
      `CREATE INDEX ${prefix}_email_date IF NOT EXISTS FOR (e:${labels.Email}) ON (e.date)`,
      `CREATE INDEX ${prefix}_email_subject IF NOT EXISTS FOR (e:${labels.Email}) ON (e.subject)`,
      `CREATE INDEX ${prefix}_topic_name IF NOT EXISTS FOR (t:${labels.Topic}) ON (t.name)`,
      `CREATE INDEX ${prefix}_event_start IF NOT EXISTS FOR (e:${labels.Event}) ON (e.start_time)`,
      `CREATE INDEX ${prefix}_fact_category IF NOT EXISTS FOR (f:${labels.Fact}) ON (f.category)`,
    ];
    
    for (const query of [...constraints, ...indexes]) {
      await this.runQuery(query);
    }
  }
  
  /**
   * Clean up tenant namespace (for archival)
   */
  async cleanupTenantNamespace(): Promise<void> {
    const labels = this.getLabels();
    
    // Delete all nodes with tenant labels
    for (const label of Object.values(labels)) {
      await this.runQuery(`MATCH (n:${label}) DETACH DELETE n`);
    }
  }
  
  // --------------------------------------------------------
  // Email GraphRAG Operations
  // --------------------------------------------------------
  
  /**
   * Add a person (contact) to the graph
   */
  async addPerson(person: {
    email: string;
    name?: string;
    organization?: string;
  }): Promise<boolean> {
    const labels = this.getLabels();
    const query = `
      MERGE (p:${labels.Person} {email: $email})
      SET p.name = COALESCE($name, p.name),
          p.organization = COALESCE($organization, p.organization),
          p.updated_at = datetime()
      RETURN p
    `;
    return this.runQuery(query, person);
  }
  
  /**
   * Add an email to the graph
   */
  async addEmail(email: {
    id: string;
    subject: string;
    from: string;
    to: string[];
    date: string;
    sentiment?: string;
    topics?: string[];
    priority?: string;
  }): Promise<boolean> {
    const labels = this.getLabels();
    
    // Create email node
    const emailQuery = `
      MERGE (e:${labels.Email} {id: $id})
      SET e.subject = $subject,
          e.date = datetime($date),
          e.sentiment = $sentiment,
          e.priority = $priority,
          e.updated_at = datetime()
      RETURN e
    `;
    await this.runQuery(emailQuery, email);
    
    // Create sender relationship
    const senderQuery = `
      MATCH (e:${labels.Email} {id: $emailId})
      MERGE (p:${labels.Person} {email: $fromEmail})
      MERGE (p)-[:SENT]->(e)
    `;
    await this.runQuery(senderQuery, { emailId: email.id, fromEmail: email.from });
    
    // Create recipient relationships
    for (const toEmail of email.to) {
      const recipientQuery = `
        MATCH (e:${labels.Email} {id: $emailId})
        MERGE (p:${labels.Person} {email: $toEmail})
        MERGE (e)-[:SENT_TO]->(p)
      `;
      await this.runQuery(recipientQuery, { emailId: email.id, toEmail });
    }
    
    // Create topic relationships
    if (email.topics) {
      for (const topic of email.topics) {
        const topicQuery = `
          MATCH (e:${labels.Email} {id: $emailId})
          MERGE (t:${labels.Topic} {name: $topic})
          MERGE (e)-[:HAS_TOPIC]->(t)
        `;
        await this.runQuery(topicQuery, { emailId: email.id, topic });
      }
    }
    
    return true;
  }
  
  /**
   * Get email graph for a contact
   */
  async getContactGraph(email: string, depth: number = 2): Promise<GraphQueryResult> {
    const labels = this.getLabels();
    const query = `
      MATCH path = (p:${labels.Person} {email: $email})-[*1..${depth}]-(connected)
      RETURN path
      LIMIT 100
    `;
    return this.runGraphQuery(query, { email });
  }
  
  /**
   * Get topics for a contact
   */
  async getContactTopics(email: string): Promise<string[]> {
    const labels = this.getLabels();
    const query = `
      MATCH (p:${labels.Person} {email: $email})<-[:SENT_TO|SENT]-(e:${labels.Email})-[:HAS_TOPIC]->(t:${labels.Topic})
      RETURN DISTINCT t.name as topic, count(e) as count
      ORDER BY count DESC
      LIMIT 20
    `;
    const result = await this.runQuery(query, { email });
    return result ? (result as any[]).map((r: any) => r.topic) : [];
  }
  
  // --------------------------------------------------------
  // Knowledge Graph Operations
  // --------------------------------------------------------
  
  /**
   * Add a fact to the knowledge graph
   */
  async addFact(fact: {
    id: string;
    content: string;
    category?: string;
    source?: string;
    confidence?: number;
  }): Promise<boolean> {
    const labels = this.getLabels();
    const query = `
      MERGE (f:${labels.Fact} {id: $id})
      SET f.content = $content,
          f.category = $category,
          f.source = $source,
          f.confidence = $confidence,
          f.created_at = datetime()
      RETURN f
    `;
    return this.runQuery(query, fact);
  }
  
  /**
   * Add a concept and link it to facts
   */
  async addConcept(concept: {
    name: string;
    description?: string;
    relatedFactIds?: string[];
  }): Promise<boolean> {
    const labels = this.getLabels();
    
    // Create concept
    const conceptQuery = `
      MERGE (c:${labels.Concept} {name: $name})
      SET c.description = $description,
          c.updated_at = datetime()
      RETURN c
    `;
    await this.runQuery(conceptQuery, concept);
    
    // Link to facts
    if (concept.relatedFactIds) {
      for (const factId of concept.relatedFactIds) {
        const linkQuery = `
          MATCH (c:${labels.Concept} {name: $conceptName})
          MATCH (f:${labels.Fact} {id: $factId})
          MERGE (f)-[:RELATES_TO]->(c)
        `;
        await this.runQuery(linkQuery, { conceptName: concept.name, factId });
      }
    }
    
    return true;
  }
  
  /**
   * Query knowledge graph
   */
  async queryKnowledgeGraph(query: string, limit: number = 20): Promise<GraphQueryResult> {
    const labels = this.getLabels();
    const cypherQuery = `
      MATCH (f:${labels.Fact})
      WHERE f.content CONTAINS $query OR f.category CONTAINS $query
      OPTIONAL MATCH (f)-[r]-(related)
      RETURN f, r, related
      LIMIT ${limit}
    `;
    return this.runGraphQuery(cypherQuery, { query });
  }
  
  // --------------------------------------------------------
  // Calendar Operations
  // --------------------------------------------------------
  
  /**
   * Add a calendar event
   */
  async addEvent(event: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    attendees?: string[];
    location?: string;
  }): Promise<boolean> {
    const labels = this.getLabels();
    
    const eventQuery = `
      MERGE (e:${labels.Event} {id: $id})
      SET e.title = $title,
          e.start_time = datetime($startTime),
          e.end_time = datetime($endTime),
          e.location = $location,
          e.updated_at = datetime()
      RETURN e
    `;
    await this.runQuery(eventQuery, event);
    
    // Link attendees
    if (event.attendees) {
      for (const attendee of event.attendees) {
        const attendeeQuery = `
          MATCH (e:${labels.Event} {id: $eventId})
          MERGE (p:${labels.Person} {email: $attendee})
          MERGE (p)-[:ATTENDS]->(e)
        `;
        await this.runQuery(attendeeQuery, { eventId: event.id, attendee });
      }
    }
    
    return true;
  }
  
  // --------------------------------------------------------
  // Query Helpers
  // --------------------------------------------------------
  
  /**
   * Run a Cypher query via HTTP API
   */
  private async runQuery(query: string, params?: Record<string, any>): Promise<boolean | any[]> {
    try {
      const response = await fetch(`${this.apiUrl}/db/neo4j/tx/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from('neo4j:password').toString('base64'),
        },
        body: JSON.stringify({
          statements: [{
            statement: query,
            parameters: params || {},
          }],
        }),
      });
      
      if (!response.ok) {
        console.error(`[TenantNeo4j] Query failed: ${response.status}`);
        return false;
      }
      
      const data = await response.json();
      if (data.errors?.length > 0) {
        console.error(`[TenantNeo4j] Query error:`, data.errors);
        return false;
      }
      
      return data.results?.[0]?.data || true;
    } catch (error) {
      console.error(`[TenantNeo4j] Query error:`, error);
      return false;
    }
  }
  
  /**
   * Run a graph query and return nodes/relationships
   */
  private async runGraphQuery(query: string, params?: Record<string, any>): Promise<GraphQueryResult> {
    const result = await this.runQuery(query, params);
    
    if (!result || result === true) {
      return { nodes: [], relationships: [] };
    }
    
    const nodes: Neo4jNode[] = [];
    const relationships: Neo4jRelationship[] = [];
    const seenNodes = new Set<string>();
    const seenRels = new Set<string>();
    
    // Parse result data
    for (const row of result as any[]) {
      for (const item of row.row || []) {
        if (item?.labels) {
          // It's a node
          if (!seenNodes.has(item.id)) {
            nodes.push({
              id: item.id,
              labels: item.labels,
              properties: item.properties || {},
            });
            seenNodes.add(item.id);
          }
        } else if (item?.type) {
          // It's a relationship
          if (!seenRels.has(item.id)) {
            relationships.push({
              id: item.id,
              type: item.type,
              startNodeId: item.startNode,
              endNodeId: item.endNode,
              properties: item.properties,
            });
            seenRels.add(item.id);
          }
        }
      }
    }
    
    return { nodes, relationships };
  }
  
  /**
   * Get graph statistics
   */
  async getGraphStats(): Promise<Record<string, number>> {
    const labels = this.getLabels();
    const stats: Record<string, number> = {};
    
    for (const [key, label] of Object.entries(labels)) {
      const query = `MATCH (n:${label}) RETURN count(n) as count`;
      const result = await this.runQuery(query);
      stats[key] = Array.isArray(result) && result[0]?.row?.[0] || 0;
    }
    
    return stats;
  }
}

// ============================================================
// Factory
// ============================================================

export function createTenantNeo4j(tenantService: TenantDataService): TenantNeo4jManager {
  return new TenantNeo4jManager(tenantService);
}

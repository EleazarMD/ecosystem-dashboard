/**
 * GraphRAG Service
 * Queries the Hermes Core Neo4j knowledge graph for email intelligence,
 * contact networks, and contextual information to enhance research.
 */

const HERMES_CORE_URL = process.env.HERMES_CORE_URL || 'http://localhost:8780';

export interface GraphRAGContext {
  emails: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    relevanceScore: number;
  }>;
  contacts: Array<{
    email: string;
    name: string;
    relationship: string;
    interactionCount: number;
  }>;
  topics: Array<{
    name: string;
    frequency: number;
    relatedEmails: number;
  }>;
  insights: string[];
}

/**
 * Query the knowledge graph for relevant context
 */
export async function queryGraphRAG(query: string): Promise<GraphRAGContext> {
  try {
    console.log('[GraphRAG] Querying knowledge graph for:', query.substring(0, 100));

    // Extract key entities and topics from the query
    const entities = await extractEntities(query);
    
    // Query Hermes Core for relevant emails
    const emails = await searchRelevantEmails(entities);
    
    // Get contact network information
    const contacts = await getRelevantContacts(entities);
    
    // Extract topics and themes
    const topics = await extractTopics(emails);
    
    // Generate insights from the graph
    const insights = await generateGraphInsights(emails, contacts, topics);

    return {
      emails,
      contacts,
      topics,
      insights,
    };

  } catch (error) {
    console.error('[GraphRAG] Error querying knowledge graph:', error);
    return {
      emails: [],
      contacts: [],
      topics: [],
      insights: ['Knowledge graph query failed - continuing without graph context'],
    };
  }
}

/**
 * Extract entities from query using simple keyword extraction
 */
async function extractEntities(query: string): Promise<string[]> {
  // Simple entity extraction - in production, use NER or LLM
  const words = query.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'what', 'when', 'where', 'who', 'how', 'why']);
  
  return words
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Top 10 keywords
}

/**
 * Search for relevant emails in Hermes Core
 */
async function searchRelevantEmails(entities: string[]): Promise<GraphRAGContext['emails']> {
  try {
    const searchQuery = entities.join(' ');
    
    const response = await fetch(`${HERMES_CORE_URL}/v1/emails/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        limit: 10,
        includeContent: false,
      }),
    });

    if (!response.ok) {
      console.warn('[GraphRAG] Email search failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.emails || []).map((email: any) => ({
      id: email.id,
      subject: email.subject || 'No subject',
      from: email.from_email || email.from_name || 'Unknown',
      date: email.date || new Date().toISOString(),
      snippet: email.snippet || email.body_text?.substring(0, 200) || '',
      relevanceScore: email.score || 0.5,
    }));

  } catch (error) {
    console.error('[GraphRAG] Error searching emails:', error);
    return [];
  }
}

/**
 * Get relevant contacts from the knowledge graph
 */
async function getRelevantContacts(entities: string[]): Promise<GraphRAGContext['contacts']> {
  try {
    // Search for contacts matching entities
    const searchQuery = entities.join(' ');
    
    const response = await fetch(`${HERMES_CORE_URL}/v1/contacts/search?q=${encodeURIComponent(searchQuery)}&limit=10`);

    if (!response.ok) {
      console.warn('[GraphRAG] Contact search failed:', response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.contacts || []).map((contact: any) => ({
      email: contact.email,
      name: contact.name || contact.email,
      relationship: contact.relationship || 'colleague',
      interactionCount: contact.email_count || 0,
    }));

  } catch (error) {
    console.error('[GraphRAG] Error searching contacts:', error);
    return [];
  }
}

/**
 * Extract topics from emails
 */
async function extractTopics(emails: GraphRAGContext['emails']): Promise<GraphRAGContext['topics']> {
  // Simple topic extraction from subjects
  const topicMap = new Map<string, { frequency: number; emailIds: Set<string> }>();
  
  emails.forEach(email => {
    const words = email.subject.toLowerCase().split(/\s+/);
    words.forEach(word => {
      if (word.length > 4) {
        const existing = topicMap.get(word) || { frequency: 0, emailIds: new Set() };
        existing.frequency++;
        existing.emailIds.add(email.id);
        topicMap.set(word, existing);
      }
    });
  });

  return Array.from(topicMap.entries())
    .map(([name, data]) => ({
      name,
      frequency: data.frequency,
      relatedEmails: data.emailIds.size,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}

/**
 * Generate insights from graph data
 */
async function generateGraphInsights(
  emails: GraphRAGContext['emails'],
  contacts: GraphRAGContext['contacts'],
  topics: GraphRAGContext['topics']
): Promise<string[]> {
  const insights: string[] = [];

  if (emails.length > 0) {
    insights.push(`Found ${emails.length} relevant emails in your knowledge graph`);
    
    const recentEmails = emails.filter(e => {
      const date = new Date(e.date);
      const daysAgo = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo < 30;
    });
    
    if (recentEmails.length > 0) {
      insights.push(`${recentEmails.length} of these are from the last 30 days`);
    }
  }

  if (contacts.length > 0) {
    insights.push(`Identified ${contacts.length} relevant contacts in your network`);
    
    const topContact = contacts.reduce((max, c) => 
      c.interactionCount > max.interactionCount ? c : max
    , contacts[0]);
    
    if (topContact.interactionCount > 0) {
      insights.push(`Most frequent contact: ${topContact.name} (${topContact.interactionCount} interactions)`);
    }
  }

  if (topics.length > 0) {
    const topTopics = topics.slice(0, 3).map(t => t.name);
    insights.push(`Key topics: ${topTopics.join(', ')}`);
  }

  if (insights.length === 0) {
    insights.push('No relevant context found in knowledge graph');
  }

  return insights;
}

/**
 * Format GraphRAG context for inclusion in research prompts
 */
export function formatGraphRAGContext(context: GraphRAGContext): string {
  let formatted = '## Knowledge Graph Context\n\n';

  if (context.insights.length > 0) {
    formatted += '### Insights:\n';
    context.insights.forEach(insight => {
      formatted += `- ${insight}\n`;
    });
    formatted += '\n';
  }

  if (context.emails.length > 0) {
    formatted += '### Relevant Emails:\n';
    context.emails.slice(0, 5).forEach(email => {
      formatted += `- **${email.subject}** (from ${email.from}, ${new Date(email.date).toLocaleDateString()})\n`;
      formatted += `  ${email.snippet.substring(0, 150)}...\n\n`;
    });
  }

  if (context.contacts.length > 0) {
    formatted += '### Relevant Contacts:\n';
    context.contacts.slice(0, 5).forEach(contact => {
      formatted += `- **${contact.name}** (${contact.email}) - ${contact.interactionCount} interactions\n`;
    });
    formatted += '\n';
  }

  if (context.topics.length > 0) {
    formatted += '### Key Topics:\n';
    context.topics.slice(0, 5).forEach(topic => {
      formatted += `- ${topic.name} (mentioned ${topic.frequency} times in ${topic.relatedEmails} emails)\n`;
    });
    formatted += '\n';
  }

  return formatted;
}

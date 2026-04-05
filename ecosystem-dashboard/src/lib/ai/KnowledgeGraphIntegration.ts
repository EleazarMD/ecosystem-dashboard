/**
 * KnowledgeGraphIntegration - Connect workspace pages to the Knowledge Graph
 * Provides entity linking, auto-tagging, and context enrichment
 */

export interface KGEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  relevanceScore: number;
}

export interface KGRelation {
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, any>;
}

export interface PageContext {
  entities: KGEntity[];
  relations: KGRelation[];
  suggestedTags: string[];
  relatedPages: { pageId: string; title: string; score: number }[];
}

export class KnowledgeGraphIntegration {
  /**
   * Extract entities from page content and link to Knowledge Graph
   */
  static async extractEntities(pageId: string, title: string, content: string): Promise<KGEntity[]> {
    try {
      const res = await fetch('/api/ai/kg/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, title, content }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.entities || [];
      }
      return [];
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return [];
    }
  }

  /**
   * Get context enrichment for a page based on its content
   */
  static async getPageContext(pageId: string): Promise<PageContext | null> {
    try {
      const res = await fetch(`/api/ai/kg/context/${pageId}`);
      if (res.ok) return await res.json();
      return null;
    } catch (error) {
      console.error('Context enrichment failed:', error);
      return null;
    }
  }

  /**
   * Suggest tags for a page based on content analysis
   */
  static suggestTags(title: string, content: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const tags: string[] = [];

    // Domain detection
    const domainPatterns: Record<string, string[]> = {
      'engineering': ['api', 'code', 'deploy', 'server', 'database', 'debug', 'bug', 'feature', 'architecture'],
      'product': ['user', 'ux', 'design', 'flow', 'wireframe', 'prototype', 'roadmap', 'feedback'],
      'operations': ['infra', 'monitor', 'alert', 'incident', 'sla', 'uptime', 'deploy', 'pipeline'],
      'data': ['metric', 'dashboard', 'report', 'analytics', 'chart', 'kpi', 'tracking'],
      'meeting': ['meeting', 'standup', 'retro', 'sync', 'agenda', 'minutes', 'action item'],
      'documentation': ['guide', 'how-to', 'tutorial', 'reference', 'docs', 'readme'],
      'planning': ['sprint', 'quarter', 'okr', 'goal', 'milestone', 'roadmap', 'initiative'],
      'personal': ['journal', 'reflection', 'habit', 'daily', 'weekly', 'monthly'],
    };

    for (const [domain, keywords] of Object.entries(domainPatterns)) {
      const matchCount = keywords.filter(kw => text.includes(kw)).length;
      if (matchCount >= 2) tags.push(domain);
    }

    // Technology detection
    const techPatterns: Record<string, string[]> = {
      'react': ['react', 'jsx', 'component', 'hook', 'useState'],
      'python': ['python', 'pip', 'django', 'flask', 'pandas'],
      'typescript': ['typescript', 'tsx', 'interface', 'type '],
      'docker': ['docker', 'container', 'kubernetes', 'k8s'],
      'database': ['postgres', 'sql', 'neo4j', 'redis', 'mongo'],
      'ai-ml': ['model', 'training', 'inference', 'llm', 'embedding', 'neural'],
    };

    for (const [tech, keywords] of Object.entries(techPatterns)) {
      if (keywords.some(kw => text.includes(kw))) tags.push(tech);
    }

    return Array.from(new Set(tags)).slice(0, 8);
  }

  /**
   * Find related pages based on shared entities and content similarity
   */
  static async findRelatedPages(
    pageId: string,
    workspaceId: string,
    limit: number = 5
  ): Promise<{ pageId: string; title: string; score: number }[]> {
    try {
      const res = await fetch(
        `/api/ai/kg/related?pageId=${pageId}&workspaceId=${workspaceId}&limit=${limit}`
      );
      if (res.ok) {
        const data = await res.json();
        return data.relatedPages || [];
      }
      return [];
    } catch (error) {
      console.error('Related pages lookup failed:', error);
      return [];
    }
  }

  /**
   * Link a page to a Knowledge Graph entity
   */
  static async linkToEntity(pageId: string, entityId: string, entityType: string): Promise<boolean> {
    try {
      const res = await fetch('/api/ai/kg/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, entityId, entityType }),
      });
      return res.ok;
    } catch (error) {
      console.error('Entity linking failed:', error);
      return false;
    }
  }

  /**
   * Extract plain text from blocks for analysis
   */
  static blocksToText(blocks: any[]): string {
    if (!blocks || !Array.isArray(blocks)) return '';

    return blocks.map(block => {
      if (!block.content) return '';
      if (Array.isArray(block.content)) {
        return block.content.map((seg: any) => seg.text || '').join('');
      }
      return '';
    }).filter(Boolean).join('\n');
  }
}

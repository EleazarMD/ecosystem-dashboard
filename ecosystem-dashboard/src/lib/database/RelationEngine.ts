/**
 * RelationEngine - Manages database relations and links between rows
 */

export interface RelationConfig {
  id: string;
  sourceDatabaseId: string;
  targetDatabaseId: string;
  sourcePropertyName: string;
  targetPropertyName?: string;
  relationType: 'single' | 'dual';
}

export interface RelationLink {
  id: string;
  relationId: string;
  sourceRowId: string;
  targetRowId: string;
}

export class RelationEngine {
  /**
   * Create a new relation between two databases
   */
  static async createRelation(config: {
    sourceDatabaseId: string;
    targetDatabaseId: string;
    sourcePropertyName: string;
    targetPropertyName?: string;
    relationType: 'single' | 'dual';
  }): Promise<RelationConfig | null> {
    try {
      const response = await fetch('/api/database/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to create relation:', error);
      return null;
    }
  }

  /**
   * Get all relations for a database
   */
  static async getRelations(databaseId: string): Promise<RelationConfig[]> {
    try {
      const response = await fetch(`/api/database/${databaseId}/relations`);
      if (response.ok) {
        const data = await response.json();
        return data.relations || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get relations:', error);
      return [];
    }
  }

  /**
   * Add a link between two rows
   */
  static async addLink(
    relationId: string,
    sourceRowId: string,
    targetRowId: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/database/relations/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relationId, sourceRowId, targetRowId }),
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to add relation link:', error);
      return false;
    }
  }

  /**
   * Remove a link between two rows
   */
  static async removeLink(linkId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/database/relations/links/${linkId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to remove relation link:', error);
      return false;
    }
  }

  /**
   * Get all linked rows for a source row via a relation
   */
  static async getLinkedRows(
    relationId: string,
    sourceRowId: string
  ): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await fetch(
        `/api/database/relations/${relationId}/links?sourceRowId=${sourceRowId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.linkedRows || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get linked rows:', error);
      return [];
    }
  }

  /**
   * Get reverse links (rows in source DB that link to this target row)
   */
  static async getReverseLinks(
    relationId: string,
    targetRowId: string
  ): Promise<Array<{ id: string; title: string }>> {
    try {
      const response = await fetch(
        `/api/database/relations/${relationId}/links?targetRowId=${targetRowId}`
      );
      if (response.ok) {
        const data = await response.json();
        return data.linkedRows || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get reverse links:', error);
      return [];
    }
  }
}

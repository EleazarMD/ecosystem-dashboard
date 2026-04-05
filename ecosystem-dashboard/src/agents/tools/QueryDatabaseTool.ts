/**
 * QueryDatabaseTool - Let DashAI search and query databases
 * Essential for understanding database contents before operations
 * Uses API calls instead of direct database imports (browser-safe)
 */

import { Tool, ToolContext } from '../ADKAgent';

export class QueryDatabaseTool implements Tool {
  name = 'query_database';
  description = `Query and search database pages.
  
  Use this when the user asks to:
  - Search for specific pages in a database
  - Find items matching criteria
  - List all pages in a database
  - Filter by property values
  - Count pages or analyze data
  
  This tool is essential for understanding database contents before making updates.
  
  Examples:
  - "Show me all high priority tasks"
  - "Find completed projects"
  - "List all items with status 'In Progress'"
  - "How many tasks are overdue?"`;

  input_schema = {
    type: 'object',
    properties: {
      database_id: {
        type: 'string',
        description: 'The database ID to query'
      },
      filter: {
        type: 'object',
        description: 'Optional filter criteria',
        properties: {
          property_name: {
            type: 'string',
            description: 'Name of property to filter by'
          },
          property_value: {
            type: 'string',
            description: 'Value to match'
          }
        }
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)'
      },
      include_properties: {
        type: 'boolean',
        description: 'Whether to include all property values (default: true)'
      }
    },
    required: ['database_id']
  };

  output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      database_title: { type: 'string' },
      total_pages: { type: 'number' },
      matching_pages: { type: 'number' },
      pages: { type: 'array' },
      message: { type: 'string' }
    }
  };

  async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const params = parameters as {
      database_id: string;
      filter?: {
        property_name: string;
        property_value: any;
      };
      limit?: number;
      include_properties?: boolean;
    };

    try {
      console.log(`🤖 DashAI: Querying database...`);
      console.log(`   - Database ID: ${params.database_id}`);

      // Get database via API
      const dbResponse = await fetch(`/api/database/${params.database_id}`);
      if (!dbResponse.ok) {
        throw new Error('Database not found');
      }
      const dbData = await dbResponse.json();
      const database = dbData.database;

      const databaseTitle = database.title?.[0]?.text?.content || 'Untitled';
      
      // Get all pages via API
      const pagesResponse = await fetch(`/api/database/${params.database_id}/pages`);
      if (!pagesResponse.ok) {
        throw new Error('Failed to fetch pages');
      }
      const pagesData = await pagesResponse.json();
      let pages = pagesData.pages || [];
      const totalPages = pages.length;

      console.log(`   - Total pages: ${totalPages}`);

      // Apply filter if provided
      if (params.filter) {
        console.log(`   - Filtering by ${params.filter.property_name} = ${params.filter.property_value}`);
        
        const property = database.schema.find((p: any) => p.name === params.filter.property_name);
        if (!property) {
          throw new Error(`Property "${params.filter.property_name}" not found in database schema`);
        }

        const filteredPages = [];
        for (const page of pages) {
          try {
            const propResponse = await fetch(`/api/database/property-values/${page.id}`);
            if (propResponse.ok) {
              const propData = await propResponse.json();
              const value = propData.values[params.filter.property_name];
              
              // Simple equality check (can be enhanced)
              if (value === params.filter.property_value) {
                filteredPages.push(page);
              }
            }
          } catch (error) {
            console.error(`Failed to load properties for page ${page.id}:`, error);
          }
        }
        pages = filteredPages;
      }

      // Apply limit
      const limit = params.limit || 50;
      const limitedPages = pages.slice(0, limit);
      const includeProperties = params.include_properties !== false;

      console.log(`   - Matching pages: ${pages.length}`);
      console.log(`   - Returning: ${limitedPages.length}`);

      // Format results
      const results = [];
      for (const page of limitedPages) {
        const result: any = {
          id: page.id,
          title: page.properties?.title?.[0]?.text?.content || 'Untitled',
          created_at: page.created_at,
          updated_at: page.updated_at
        };

        if (includeProperties) {
          try {
            const propResponse = await fetch(`/api/database/property-values/${page.id}`);
            if (propResponse.ok) {
              const propData = await propResponse.json();
              result.properties = propData.values;
            }
          } catch (error) {
            console.error(`Failed to load properties for page ${page.id}:`, error);
          }
        }

        results.push(result);
      }

      console.log(`✅ DashAI: Query completed successfully!`);

      // Create summary message
      let message = `Found ${pages.length} pages in database "${databaseTitle}"`;
      if (params.filter) {
        message += ` matching ${params.filter.property_name} = ${params.filter.property_value}`;
      }
      if (pages.length > limitedPages.length) {
        message += ` (showing first ${limitedPages.length})`;
      }

      return {
        success: true,
        database_title: databaseTitle,
        total_pages: totalPages,
        matching_pages: pages.length,
        pages: results,
        message
      };
    } catch (error: any) {
      console.error('❌ DashAI: Error querying database:', error);
      return {
        success: false,
        error: error.message || 'Failed to query database',
        details: error.stack
      };
    }
  }
}

export default QueryDatabaseTool;

/**
 * CreateDatabaseTool - Let DashAI create databases with custom schemas
 * Supports all property types and automatic view creation
 */

import { Tool, ToolContext } from '../ADKAgent';
import { PropertyType } from '../../types/workspace';

export class CreateDatabaseTool implements Tool {
  name = 'create_database';
  description = `Create a database with a custom schema and optional initial pages.
  
  Use this when the user asks to:
  - Create a project tracker, task list, or database
  - Build a table or spreadsheet
  - Organize information in a structured way
  - Track items with specific properties
  
  The database will support multiple views (Table, Board, Gallery, List) and can include:
  - Text and rich text fields
  - Numbers with formatting (currency, percent, etc.)
  - Select dropdowns and multi-select
  - Dates and checkboxes
  - Relations to other databases
  - Formulas and rollups
  
  Pages can be added immediately or later by the user or agent.`;

  input_schema = {
    type: 'object',
    properties: {
      workspace_id: {
        type: 'string',
        description: 'The workspace ID where the database will be created'
      },
      title: {
        type: 'string',
        description: 'The database title (e.g., "Project Tracker", "Tasks")'
      },
      inline: {
        type: 'boolean',
        description: 'Whether to create as inline database (default: false for full-page)'
      },
      schema: {
        type: 'array',
        description: 'Array of property definitions for the database',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Property name (e.g., "Status", "Priority")'
            },
            type: {
              type: 'string',
              enum: [
                'title',
                'rich_text',
                'number',
                'select',
                'multi_select',
                'date',
                'checkbox',
                'url',
                'email'
              ],
              description: 'Property type'
            },
            config: {
              type: 'object',
              description: 'Type-specific configuration',
              properties: {
                options: {
                  type: 'array',
                  description: 'For select/multi_select: available options',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      color: { type: 'string' }
                    }
                  }
                },
                format: {
                  type: 'string',
                  description: 'For numbers: dollar, percent, etc.'
                }
              }
            }
          },
          required: ['name', 'type']
        }
      },
      initial_pages: {
        type: 'array',
        description: 'Optional initial pages to populate the database',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            properties: { type: 'object' }
          }
        }
      },
      parent_id: {
        type: 'string',
        description: 'Optional parent page ID if this is a sub-database'
      }
    },
    required: ['workspace_id', 'title', 'schema']
  };

  output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      database_id: { type: 'string' },
      title: { type: 'string' },
      url: { type: 'string' },
      properties_count: { type: 'number' },
      pages_created: { type: 'number' },
      message: { type: 'string' }
    }
  };

  async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const params = parameters as {
      workspace_id: string;
      title: string;
      inline?: boolean;
      schema: Array<{
        name: string;
        type: PropertyType;
        config?: Record<string, any>;
      }>;
      initial_pages?: Array<{
        title: string;
        properties: Record<string, any>;
      }>;
      parent_id?: string;
    };

    try {
      console.log(`🤖 DashAI: Creating database "${params.title}"...`);
      console.log(`   - Properties: ${params.schema.length}`);
      console.log(`   - Initial pages: ${params.initial_pages?.length || 0}`);

      // Ensure there's a title property
      const hasTitleProp = params.schema.some(p => p.type === 'title');
      const schema = hasTitleProp
        ? params.schema
        : [{ name: 'Title', type: 'title' as PropertyType, config: {} }, ...params.schema];

      // Create the database via API
      const response = await fetch('/api/database/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: params.workspace_id,
          parent_id: params.parent_id,
          title: params.title,
          inline: params.inline || false,
          schema: schema.map((prop, index) => ({
            name: prop.name,
            type: prop.type,
            config: prop.config || {},
            position: index
          })),
          initial_pages: params.initial_pages || [],
          created_by: 'dashai'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create database');
      }

      const data = await response.json();
      const database = data.database;

      const databaseUrl = `/workspace/database/${database.id}`;

      console.log(`✅ DashAI: Database created successfully!`);
      console.log(`   - ID: ${database.id}`);
      console.log(`   - Title: ${params.title}`);
      console.log(`   - Properties: ${schema.length}`);
      console.log(`   - Pages: ${params.initial_pages?.length || 0}`);
      console.log(`   - URL: ${databaseUrl}`);

      return {
        success: true,
        database_id: database.id,
        title: params.title,
        url: databaseUrl,
        properties_count: schema.length,
        pages_created: params.initial_pages?.length || 0,
        message: `Successfully created database "${params.title}" with ${schema.length} properties${
          params.initial_pages?.length
            ? ` and ${params.initial_pages.length} initial pages`
            : ''
        }. View at: ${databaseUrl}`
      };
    } catch (error: any) {
      console.error('❌ DashAI: Error creating database:', error);
      return {
        success: false,
        error: error.message || 'Failed to create database',
        details: error.stack
      };
    }
  }
}

export default CreateDatabaseTool;

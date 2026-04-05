/**
 * UpdateDatabaseTool - Let DashAI update database pages in bulk
 * Supports updating hundreds of pages simultaneously (Notion 3.0 scale)
 */

import { Tool, ToolContext } from '../ADKAgent';

export class UpdateDatabaseTool implements Tool {
  name = 'update_database';
  description = `Update multiple pages in a database simultaneously.
  
  Use this when the user asks to:
  - Update all pages matching certain criteria
  - Bulk update property values
  - Change status for multiple items
  - Mark items as complete/archived
  - Update dates, priorities, or other properties
  
  Can update hundreds of pages at once, just like Notion 3.0 Agents.
  
  Examples:
  - "Mark all completed tasks as archived"
  - "Update all high priority items to medium"
  - "Set due date for all items in 'To Do' status"`;

  input_schema = {
    type: 'object',
    properties: {
      database_id: {
        type: 'string',
        description: 'The database ID to update'
      },
      filter: {
        type: 'object',
        description: 'Filter to select which pages to update (optional, updates all if omitted)',
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
      updates: {
        type: 'object',
        description: 'Property values to update. Keys are property names, values are new values',
        additionalProperties: true
      }
    },
    required: ['database_id', 'updates']
  };

  output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      pages_updated: { type: 'number' },
      updates_applied: { type: 'object' },
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
      updates: Record<string, any>;
    };

    try {
      console.log(`🤖 DashAI: Updating database pages...`);
      console.log(`   - Database ID: ${params.database_id}`);
      console.log(`   - Updates: ${Object.keys(params.updates).length} properties`);

      // Get database and its pages via API
      const dbResponse = await fetch(`/api/database/${params.database_id}`);
      if (!dbResponse.ok) {
        throw new Error('Database not found');
      }
      const dbData = await dbResponse.json();
      const database = dbData.database;

      const pagesResponse = await fetch(`/api/database/${params.database_id}/pages`);
      if (!pagesResponse.ok) {
        throw new Error('Failed to fetch pages');
      }
      const pagesData = await pagesResponse.json();
      let pages = pagesData.pages || [];

      // Apply filter if provided
      if (params.filter) {
        console.log(`   - Filtering by ${params.filter.property_name} = ${params.filter.property_value}`);
        
        const property = database.schema.find(p => p.name === params.filter.property_name);
        if (!property) {
          throw new Error(`Property "${params.filter.property_name}" not found in database schema`);
        }

        // Filter pages based on property value
        const filteredPages = [];
        for (const page of pages) {
          try {
            const propResponse = await fetch(`/api/database/property-values/${page.id}`);
            if (propResponse.ok) {
              const propData = await propResponse.json();
              const value = propData.values[params.filter.property_name];
              
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

      console.log(`   - Pages to update: ${pages.length}`);

      // Get property IDs for updates
      const propertyIds: Record<string, string> = {};
      for (const propName of Object.keys(params.updates)) {
        const property = database.schema.find(p => p.name === propName);
        if (property) {
          propertyIds[propName] = property.id;
        } else {
          console.warn(`⚠️  Property "${propName}" not found in schema, skipping`);
        }
      }

      // Update pages via API
      let updatedCount = 0;
      for (const page of pages) {
        try {
          for (const [propName, newValue] of Object.entries(params.updates)) {
            const propertyId = propertyIds[propName];
            if (propertyId) {
              const updateResponse = await fetch(`/api/database/property-values/${page.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  property_id: propertyId,
                  value: newValue
                })
              });
              
              if (!updateResponse.ok) {
                throw new Error(`Failed to update property ${propName}`);
              }
            }
          }
          updatedCount++;
        } catch (error) {
          console.error(`Failed to update page ${page.id}:`, error);
        }
      }

      console.log(`✅ DashAI: Updated ${updatedCount} pages successfully!`);

      return {
        success: true,
        pages_updated: updatedCount,
        updates_applied: params.updates,
        message: `Successfully updated ${updatedCount} pages in database "${database.title?.[0]?.text?.content || 'Untitled'}". Applied updates: ${Object.keys(params.updates).join(', ')}`
      };
    } catch (error: any) {
      console.error('❌ DashAI: Error updating database:', error);
      return {
        success: false,
        error: error.message || 'Failed to update database',
        details: error.stack
      };
    }
  }
}

export default UpdateDatabaseTool;

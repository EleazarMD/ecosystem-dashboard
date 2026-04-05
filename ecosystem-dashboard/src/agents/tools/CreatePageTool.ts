/**
 * CreatePageTool - Let DashAI create pages with rich content
 * Supports Notion-flavored Markdown for efficient content creation
 */

import { Tool, ToolContext } from '../ADKAgent';
import { RichText } from '../../types/workspace';

export class CreatePageTool implements Tool {
  name = 'create_page';
  description = `Create a new page with rich content in the workspace.
  
  Use this when the user asks to:
  - Create a new document or page
  - Write content with headings, paragraphs, lists
  - Build a structured document
  - Start a new project page
  
  Supports Notion-flavored content including:
  - Headings (# ## ###)
  - Paragraphs
  - Bulleted and numbered lists
  - To-do items
  - Code blocks
  - Quotes and callouts
  
  The page will be created in the user's workspace and can contain nested blocks.`;

  input_schema = {
    type: 'object',
    properties: {
      workspace_id: {
        type: 'string',
        description: 'The workspace ID where the page will be created'
      },
      title: {
        type: 'string',
        description: 'The page title'
      },
      content: {
        type: 'array',
        description: 'Array of content blocks for the page',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: [
                'paragraph',
                'heading_1',
                'heading_2',
                'heading_3',
                'bulleted_list',
                'numbered_list',
                'to_do',
                'quote',
                'code',
                'callout'
              ],
              description: 'The block type'
            },
            text: {
              type: 'string',
              description: 'The text content of the block'
            },
            checked: {
              type: 'boolean',
              description: 'For to_do blocks, whether it is checked'
            },
            language: {
              type: 'string',
              description: 'For code blocks, the programming language'
            }
          },
          required: ['type', 'text']
        }
      },
      parent_id: {
        type: 'string',
        description: 'Optional parent page ID if this is a sub-page'
      }
    },
    required: ['workspace_id', 'title', 'content']
  };

  output_schema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      page_id: { type: 'string' },
      title: { type: 'string' },
      url: { type: 'string' },
      blocks_created: { type: 'number' },
      message: { type: 'string' }
    }
  };

  async execute(context: ToolContext, parameters: Record<string, any>): Promise<any> {
    const params = parameters as {
      workspace_id: string;
      title: string;
      content: Array<{
        type: string;
        text: string;
        checked?: boolean;
        language?: string;
      }>;
      parent_id?: string;
    };
    try {
      console.log(`🤖 DashAI: Creating page "${params.title}"...`);

      // Convert content to blocks
      const children: any[] = params.content.map((block) => {
        const properties: any = {
          title: this.parseTextToRichText(block.text)
        };

        if (block.type === 'to_do' && block.checked !== undefined) {
          properties.checked = block.checked;
        }

        if (block.type === 'code' && block.language) {
          properties.language = block.language;
        }

        return {
          workspace_id: params.workspace_id,
          type: block.type as any,
          properties,
          created_by: 'dashai'
        };
      });

      // Create the page block with nested content via API
      const response = await fetch(`/api/workspace/${params.workspace_id}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page',
          properties: {
            title: this.parseTextToRichText(params.title)
          },
          parent_id: params.parent_id || null,
          created_by: 'dashai',
          children
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create page');
      }

      const data = await response.json();
      const page = data.block;

      const pageUrl = `/workspace/page/${page.id}`;

      console.log(`✅ DashAI: Page created successfully!`);
      console.log(`   - ID: ${page.id}`);
      console.log(`   - Title: ${params.title}`);
      console.log(`   - Blocks: ${children.length}`);
      console.log(`   - URL: ${pageUrl}`);

      return {
        success: true,
        page_id: page.id,
        title: params.title,
        url: pageUrl,
        blocks_created: children.length + 1,
        message: `Successfully created page "${params.title}" with ${children.length} content blocks. View at: ${pageUrl}`
      };
    } catch (error: any) {
      console.error('❌ DashAI: Error creating page:', error);
      return {
        success: false,
        error: error.message || 'Failed to create page',
        details: error.stack
      };
    }
  }

  /**
   * Parse simple text to RichText format
   */
  private parseTextToRichText(text: string): RichText[] {
    // Simple implementation - can be enhanced to support markdown formatting
    return [
      {
        type: 'text',
        text: { content: text }
      }
    ];
  }

  /**
   * Get user's default workspace via API
   */
  private async getDefaultWorkspace(userId: string): Promise<string | null> {
    try {
      const response = await fetch(`/api/workspace/list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.workspaces.length > 0 ? data.workspaces[0].id : null;
    } catch (error) {
      return null;
    }
  }
}

export default CreatePageTool;

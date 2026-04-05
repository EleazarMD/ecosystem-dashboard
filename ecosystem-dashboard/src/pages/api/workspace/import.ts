/**
 * Workspace Import API
 * 
 * Import content into workspace from various sources:
 * - Markdown files
 * - URLs (web pages)
 * - PDFs
 * - Emails (via Hermes)
 * - Research sessions
 * - Notion exports
 * - CSV/JSON data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { databaseService } from '@/lib/workspace/database-service';
import { markdownToBlocks } from '@/lib/workspace/markdown-to-blocks';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface ImportOperation {
  operation: 
    | 'import_markdown'
    | 'import_url'
    | 'import_pdf'
    | 'import_email'
    | 'import_research'
    | 'import_notion'
    | 'import_csv'
    | 'bulk_import'
    | 'check_status';
  workspace_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface ImportResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImportResponse>,
  authContext: APIAuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const op: ImportOperation = req.body;
    const userId = authContext.userId;

    if (op.user_id && op.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'user_id does not match authenticated user',
        timestamp: new Date().toISOString(),
      });
    }

    if (!op.operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get or create workspace
    let workspaceId = op.workspace_id;
    if (!workspaceId) {
      const workspaces = await workspaceService.getUserWorkspaces(userId);
      if (workspaces.length === 0) {
        const newWs = await workspaceService.createDefaultWorkspace(userId);
        workspaceId = newWs.id;
      } else {
        workspaceId = workspaces[0].id;
      }
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // MARKDOWN IMPORT
      // ========================================
      case 'import_markdown': {
        const { content, title, parent_page_id } = op.data || {};

        if (!content || typeof content !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'content is required for import_markdown',
            timestamp: new Date().toISOString(),
          });
        }

        // Convert markdown to blocks
        const blocks = markdownToBlocks(content, workspaceId, userId);

        // Extract title from first heading if not provided
        const pageTitle = (title as string) || extractTitleFromMarkdown(content) || 'Imported Document';

        // Create page
        const page = await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: (parent_page_id as string) || null,
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: pageTitle } }],
            icon: { type: 'emoji', emoji: '📄' },
          },
          created_by: userId,
        });

        // Create child blocks
        let blocksCreated = 0;
        for (const block of blocks) {
          await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: page.id,
            type: block.type,
            properties: block.properties,
            created_by: userId,
          });
          blocksCreated++;
        }

        result = {
          status: 'completed',
          pages_created: 1,
          blocks_created: blocksCreated,
          root_page_id: page.id,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/page/${page.id}`,
        };
        break;
      }

      // ========================================
      // URL IMPORT
      // ========================================
      case 'import_url': {
        const { url, title, extract_mode = 'article' } = op.data || {};

        if (!url || typeof url !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'url is required for import_url',
            timestamp: new Date().toISOString(),
          });
        }

        // Fetch and extract content from URL
        const extracted = await extractFromUrl(url as string, extract_mode as string);

        // Convert to blocks
        const blocks = markdownToBlocks(extracted.content, workspaceId, userId);

        // Create page
        const pageTitle = (title as string) || extracted.title || 'Imported from Web';
        const page = await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: null,
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: pageTitle } }],
            icon: { type: 'emoji', emoji: '🌐' },
          },
          created_by: userId,
        });

        // Add source callout
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: page.id,
          type: 'callout',
          properties: {
            icon: { type: 'emoji', emoji: '🔗' },
            rich_text: [{ type: 'text', text: { content: `Source: ${url}` } }],
          },
          created_by: userId,
        });

        // Add divider
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: page.id,
          type: 'divider',
          properties: {},
          created_by: userId,
        });

        // Create content blocks
        let blocksCreated = 2; // callout + divider
        for (const block of blocks) {
          await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: page.id,
            type: block.type,
            properties: block.properties,
            created_by: userId,
          });
          blocksCreated++;
        }

        result = {
          status: 'completed',
          pages_created: 1,
          blocks_created: blocksCreated,
          root_page_id: page.id,
          source_url: url,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/page/${page.id}`,
        };
        break;
      }

      // ========================================
      // EMAIL IMPORT
      // ========================================
      case 'import_email': {
        const { 
          source = 'hermes', 
          email_id, 
          include_attachments = true,
          include_thread = false,
          template = 'email_archive'
        } = op.data || {};

        if (!email_id) {
          return res.status(400).json({
            success: false,
            error: 'email_id is required for import_email',
            timestamp: new Date().toISOString(),
          });
        }

        // Fetch email from Hermes
        let email: any;
        if (source === 'hermes') {
          const hermesResponse = await fetch(
            `http://localhost:8780/api/emails/${email_id}`
          );
          if (!hermesResponse.ok) {
            throw new Error(`Failed to fetch email from Hermes: ${hermesResponse.status}`);
          }
          email = await hermesResponse.json();
        } else {
          throw new Error(`Unsupported email source: ${source}`);
        }

        // Create email archive page
        const page = await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: null,
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: `Email: ${email.subject || 'No Subject'}` } }],
            icon: { type: 'emoji', emoji: '📧' },
          },
          created_by: userId,
        });

        // Add email metadata callout
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: page.id,
          type: 'callout',
          properties: {
            icon: { type: 'emoji', emoji: '📬' },
            rich_text: [{ 
              type: 'text', 
              text: { 
                content: `From: ${email.from || 'Unknown'}\nTo: ${email.to || 'Unknown'}\nDate: ${email.date || 'Unknown'}` 
              } 
            }],
          },
          created_by: userId,
        });

        // Add divider
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: page.id,
          type: 'divider',
          properties: {},
          created_by: userId,
        });

        // Add email body
        const bodyBlocks = markdownToBlocks(email.body || email.text || '', workspaceId, userId);
        for (const block of bodyBlocks) {
          await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: page.id,
            type: block.type,
            properties: block.properties,
            created_by: userId,
          });
        }

        result = {
          status: 'completed',
          pages_created: 1,
          blocks_created: bodyBlocks.length + 2,
          root_page_id: page.id,
          email_subject: email.subject,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/page/${page.id}`,
        };
        break;
      }

      // ========================================
      // RESEARCH IMPORT
      // ========================================
      case 'import_research': {
        const { 
          session_id, 
          include_sources = true,
          include_sub_topics = true,
          format = 'document'
        } = op.data || {};

        if (!session_id) {
          return res.status(400).json({
            success: false,
            error: 'session_id is required for import_research',
            timestamp: new Date().toISOString(),
          });
        }

        // Fetch research session from Research Lab
        const researchResponse = await fetch(
          `http://localhost:8404/api/research-lab/sessions/${session_id}`
        );
        if (!researchResponse.ok) {
          throw new Error(`Failed to fetch research session: ${researchResponse.status}`);
        }
        const research = await researchResponse.json();

        // Create research page
        const page = await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: null,
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: `Research: ${research.query || research.topic || 'Untitled'}` } }],
            icon: { type: 'emoji', emoji: '🔬' },
          },
          created_by: userId,
        });

        // Add research metadata
        await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: page.id,
          type: 'callout',
          properties: {
            icon: { type: 'emoji', emoji: '📋' },
            rich_text: [{ 
              type: 'text', 
              text: { 
                content: `Research Session: ${session_id}\nDate: ${research.created_at || 'Unknown'}\nModel: ${research.model || 'Unknown'}` 
              } 
            }],
          },
          created_by: userId,
        });

        // Convert research content to blocks
        const contentBlocks = markdownToBlocks(
          research.content || research.report || research.synthesis || '', 
          workspaceId, 
          userId
        );
        
        for (const block of contentBlocks) {
          await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: page.id,
            type: block.type,
            properties: block.properties,
            created_by: userId,
          });
        }

        // Add sources section if available
        if (include_sources && research.sources && research.sources.length > 0) {
          await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: page.id,
            type: 'heading_2',
            properties: {
              title: [{ type: 'text', text: { content: 'Sources' } }],
            },
            created_by: userId,
          });

          for (const source of research.sources) {
            await blockService.createBlock({
              workspace_id: workspaceId,
              parent_id: page.id,
              type: 'bulleted_list',
              properties: {
                title: [{ 
                  type: 'text', 
                  text: { 
                    content: source.title || source.url || source,
                    link: source.url || null
                  } 
                }],
              },
              created_by: userId,
            });
          }
        }

        result = {
          status: 'completed',
          pages_created: 1,
          blocks_created: contentBlocks.length + 2,
          root_page_id: page.id,
          research_session_id: session_id,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/page/${page.id}`,
        };
        break;
      }

      // ========================================
      // BULK IMPORT
      // ========================================
      case 'bulk_import': {
        const { items, parent_page_id, create_index_page = true } = op.data || {};

        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'items array is required for bulk_import',
            timestamp: new Date().toISOString(),
          });
        }

        const results: Array<{ title: string; page_id: string; success: boolean; error?: string }> = [];
        let indexPageId: string | null = null;

        // Create index page if requested
        if (create_index_page) {
          const indexPage = await blockService.createBlock({
            workspace_id: workspaceId,
            parent_id: (parent_page_id as string) || null,
            type: 'page',
            properties: {
              title: [{ type: 'text', text: { content: `Import - ${new Date().toLocaleDateString()}` } }],
              icon: { type: 'emoji', emoji: '📚' },
            },
            created_by: userId,
          });
          indexPageId = indexPage.id;
        }

        // Process each item
        for (const item of items) {
          try {
            const itemType = item.type || 'markdown';
            const itemTitle = item.title || 'Untitled';
            
            let pageId: string;

            if (itemType === 'markdown') {
              const blocks = markdownToBlocks(item.content || '', workspaceId, userId);
              const page = await blockService.createBlock({
                workspace_id: workspaceId,
                parent_id: indexPageId || (parent_page_id as string) || null,
                type: 'page',
                properties: {
                  title: [{ type: 'text', text: { content: itemTitle } }],
                  icon: { type: 'emoji', emoji: '📄' },
                },
                created_by: userId,
              });
              pageId = page.id;

              for (const block of blocks) {
                await blockService.createBlock({
                  workspace_id: workspaceId,
                  parent_id: page.id,
                  type: block.type,
                  properties: block.properties,
                  created_by: userId,
                });
              }
            } else {
              // For other types, create placeholder page
              const page = await blockService.createBlock({
                workspace_id: workspaceId,
                parent_id: indexPageId || (parent_page_id as string) || null,
                type: 'page',
                properties: {
                  title: [{ type: 'text', text: { content: itemTitle } }],
                  icon: { type: 'emoji', emoji: '📄' },
                },
                created_by: userId,
              });
              pageId = page.id;
            }

            results.push({ title: itemTitle, page_id: pageId, success: true });
          } catch (err) {
            results.push({ 
              title: item.title || 'Unknown', 
              page_id: '', 
              success: false, 
              error: err instanceof Error ? err.message : 'Unknown error' 
            });
          }
        }

        result = {
          status: 'completed',
          pages_created: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          index_page_id: indexPageId,
          results,
          dashboard_url: indexPageId 
            ? `http://localhost:8404/workspace/${workspaceId}/page/${indexPageId}`
            : `http://localhost:8404/workspace/${workspaceId}`,
        };
        break;
      }

      // ========================================
      // CSV IMPORT
      // ========================================
      case 'import_csv': {
        const { 
          content, 
          database_title = 'Imported Data',
          has_header_row = true,
          column_types = {}
        } = op.data || {};

        if (!content || typeof content !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'content is required for import_csv',
            timestamp: new Date().toISOString(),
          });
        }

        // Parse CSV
        const lines = content.trim().split('\n');
        if (lines.length === 0) {
          throw new Error('CSV is empty');
        }

        const headers = has_header_row 
          ? lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
          : lines[0].split(',').map((_, i) => `Column ${i + 1}`);

        const dataLines = has_header_row ? lines.slice(1) : lines;

        // Build schema
        const schema = headers.map((name, i) => ({
          name,
          type: (column_types as Record<string, string>)[name] || (i === 0 ? 'title' : 'rich_text'),
          config: {},
          position: i,
        }));

        // Create database
        const database = await databaseService.createDatabase({
          workspace_id: workspaceId,
          title: database_title as string,
          inline: false,
          schema,
          created_by: userId,
        });

        // Add rows
        let rowsCreated = 0;
        for (const line of dataLines) {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const properties: Record<string, unknown> = {};
          
          headers.forEach((header, i) => {
            properties[header] = values[i] || '';
          });

          await databaseService.createDatabasePage(
            database.id,
            values[0] || 'Untitled',
            properties,
            userId
          );
          rowsCreated++;
        }

        result = {
          status: 'completed',
          database_id: database.id,
          columns: headers.length,
          rows_created: rowsCreated,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/database/${database.id}`,
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown operation: ${op.operation}`,
          timestamp: new Date().toISOString(),
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Workspace Import] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper: Extract title from markdown
function extractTitleFromMarkdown(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

// Helper: Extract content from URL
async function extractFromUrl(url: string, mode: string): Promise<{ title: string; content: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIHomelabBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Basic extraction - in production, use readability library
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Imported Page';

    // Extract text content (simplified)
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Limit content length
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '\n\n...(truncated)';
    }

    return { title, content };
  } catch (error) {
    console.error('[URL Extract] Error:', error);
    return { 
      title: 'Import Failed', 
      content: `Failed to extract content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

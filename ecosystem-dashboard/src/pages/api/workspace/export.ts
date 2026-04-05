/**
 * Workspace Export API
 * 
 * Export workspace content to various formats:
 * - Markdown
 * - PDF
 * - HTML
 * - DOCX
 * - ZIP (backup)
 * - JSON (raw)
 * - CSV (databases)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { databaseService } from '@/lib/workspace/database-service';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface ExportOperation {
  operation: 
    | 'export_markdown'
    | 'export_pdf'
    | 'export_html'
    | 'export_docx'
    | 'export_json'
    | 'export_csv'
    | 'export_project'
    | 'backup_workspace'
    | 'check_status';
  workspace_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface ExportResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExportResponse>,
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
    const op: ExportOperation = req.body;
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

    // Get workspace
    let workspaceId = op.workspace_id;
    if (!workspaceId) {
      const workspaces = await workspaceService.getUserWorkspaces(userId);
      if (workspaces.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No workspace found',
          timestamp: new Date().toISOString(),
        });
      }
      workspaceId = workspaces[0].id;
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // MARKDOWN EXPORT
      // ========================================
      case 'export_markdown': {
        const { 
          page_id, 
          page_ids,
          include_subpages = true,
          include_frontmatter = true,
          flatten_structure = false
        } = op.data || {};

        const targetPageIds = page_ids 
          ? (page_ids as string[]) 
          : page_id 
            ? [page_id as string] 
            : null;

        if (!targetPageIds || targetPageIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'page_id or page_ids is required for export_markdown',
            timestamp: new Date().toISOString(),
          });
        }

        const exports: Array<{ title: string; content: string; path: string }> = [];

        for (const pageId of targetPageIds) {
          const page = await blockService.getBlock(pageId, true);
          if (!page || page.type !== 'page') continue;

          const markdown = await pageToMarkdown(page, include_frontmatter as boolean);
          const title = page.properties?.title?.[0]?.text?.content || 'Untitled';
          const safeName = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();

          exports.push({
            title,
            content: markdown,
            path: `${safeName}.md`,
          });

          // Export subpages if requested
          if (include_subpages) {
            const children = await blockService.getBlockChildren(pageId);
            const childPages = children.filter(c => c.type === 'page');
            
            for (const childPage of childPages) {
              const childMd = await pageToMarkdown(childPage, include_frontmatter as boolean);
              const childTitle = childPage.properties?.title?.[0]?.text?.content || 'Untitled';
              const childSafeName = childTitle.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();

              exports.push({
                title: childTitle,
                content: childMd,
                path: flatten_structure 
                  ? `${childSafeName}.md`
                  : `${safeName}/${childSafeName}.md`,
              });
            }
          }
        }

        // For single file, return content directly
        if (exports.length === 1) {
          result = {
            format: 'markdown',
            file_name: exports[0].path,
            content: exports[0].content,
            pages_exported: 1,
          };
        } else {
          // For multiple files, return as array (would be ZIP in production)
          result = {
            format: 'markdown',
            files: exports.map(e => ({ path: e.path, title: e.title })),
            content: exports, // In production, this would be a ZIP download URL
            pages_exported: exports.length,
          };
        }
        break;
      }

      // ========================================
      // JSON EXPORT (Raw blocks)
      // ========================================
      case 'export_json': {
        const { 
          page_id, 
          page_ids,
          include_metadata = true,
          include_children = true
        } = op.data || {};

        const targetPageIds = page_ids 
          ? (page_ids as string[]) 
          : page_id 
            ? [page_id as string] 
            : null;

        if (!targetPageIds || targetPageIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'page_id or page_ids is required for export_json',
            timestamp: new Date().toISOString(),
          });
        }

        const pages: unknown[] = [];

        for (const pageId of targetPageIds) {
          const page = await blockService.getBlock(pageId, include_children as boolean);
          if (!page) continue;

          if (include_metadata) {
            pages.push(page);
          } else {
            // Strip metadata
            const { created_at, updated_at, created_by, last_edited_by, ...rest } = page;
            pages.push(rest);
          }
        }

        result = {
          format: 'json',
          workspace_id: workspaceId,
          exported_at: new Date().toISOString(),
          pages,
          pages_exported: pages.length,
        };
        break;
      }

      // ========================================
      // CSV EXPORT (Database)
      // ========================================
      case 'export_csv': {
        const { 
          database_id,
          include_header = true,
          columns
        } = op.data || {};

        if (!database_id) {
          return res.status(400).json({
            success: false,
            error: 'database_id is required for export_csv',
            timestamp: new Date().toISOString(),
          });
        }

        // Get database with entries
        const database = await databaseService.getDatabase(database_id as string);
        if (!database) {
          return res.status(404).json({
            success: false,
            error: 'Database not found',
            timestamp: new Date().toISOString(),
          });
        }

        const entries = await databaseService.getDatabasePages(database_id as string);
        
        // Get column names
        const allColumns = database.schema.map(p => p.name);
        const exportColumns = columns 
          ? (columns as string[]).filter(c => allColumns.includes(c))
          : allColumns;

        // Build CSV
        const lines: string[] = [];

        if (include_header) {
          lines.push(exportColumns.map(c => `"${c}"`).join(','));
        }

        for (const entry of entries) {
          const values = exportColumns.map(col => {
            const value = entry.properties?.[col] || '';
            const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            return `"${strValue.replace(/"/g, '""')}"`;
          });
          lines.push(values.join(','));
        }

        const csvContent = lines.join('\n');
        const title = database.title?.[0]?.text?.content || 'database';
        const safeName = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();

        result = {
          format: 'csv',
          file_name: `${safeName}.csv`,
          content: csvContent,
          columns: exportColumns.length,
          rows_exported: entries.length,
        };
        break;
      }

      // ========================================
      // WORKSPACE BACKUP
      // ========================================
      case 'backup_workspace': {
        const { 
          include_files = true,
          include_versions = false,
          include_comments = true
        } = op.data || {};

        // Get all pages in workspace
        const allBlocks = await blockService.getWorkspaceBlocks(workspaceId);
        const pages = allBlocks.filter(b => b.type === 'page');
        const databases = allBlocks.filter(b => 
          b.type === 'database_inline' || b.type === 'database_full_page'
        );

        // Build backup manifest
        const manifest = {
          version: '1.0',
          workspace_id: workspaceId,
          exported_at: new Date().toISOString(),
          exported_by: userId,
          stats: {
            pages: pages.length,
            databases: databases.length,
            total_blocks: allBlocks.length,
          },
          options: {
            include_files,
            include_versions,
            include_comments,
          },
        };

        // Export all pages with children
        const pagesData: unknown[] = [];
        for (const page of pages) {
          const fullPage = await blockService.getBlock(page.id, true);
          if (fullPage) {
            pagesData.push(fullPage);
          }
        }

        // Export databases
        const databasesData: unknown[] = [];
        for (const db of databases) {
          const dbData = await databaseService.getDatabaseByBlockId(db.id);
          if (dbData) {
            const entries = await databaseService.getDatabasePages(dbData.id);
            databasesData.push({
              ...dbData,
              entries,
            });
          }
        }

        result = {
          format: 'backup',
          manifest,
          pages: pagesData,
          databases: databasesData,
          // In production, this would generate a ZIP file and return download URL
          download_url: null, // Would be: `/api/workspace/export/download/${jobId}`
          pages_exported: pages.length,
          databases_exported: databases.length,
        };
        break;
      }

      // ========================================
      // PDF EXPORT (Placeholder)
      // ========================================
      case 'export_pdf': {
        const { page_id, page_ids, options = {} } = op.data || {};

        const targetPageIds = page_ids 
          ? (page_ids as string[]) 
          : page_id 
            ? [page_id as string] 
            : null;

        if (!targetPageIds || targetPageIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'page_id or page_ids is required for export_pdf',
            timestamp: new Date().toISOString(),
          });
        }

        // PDF generation requires Puppeteer/Playwright - placeholder for now
        result = {
          format: 'pdf',
          status: 'not_implemented',
          message: 'PDF export requires Puppeteer/Playwright integration. Use export_markdown or export_html instead.',
          pages_requested: targetPageIds.length,
          options,
        };
        break;
      }

      // ========================================
      // HTML EXPORT
      // ========================================
      case 'export_html': {
        const { 
          page_id, 
          page_ids,
          include_styles = true,
          theme = 'light'
        } = op.data || {};

        const targetPageIds = page_ids 
          ? (page_ids as string[]) 
          : page_id 
            ? [page_id as string] 
            : null;

        if (!targetPageIds || targetPageIds.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'page_id or page_ids is required for export_html',
            timestamp: new Date().toISOString(),
          });
        }

        const exports: Array<{ title: string; content: string; path: string }> = [];

        for (const pageId of targetPageIds) {
          const page = await blockService.getBlock(pageId, true);
          if (!page || page.type !== 'page') continue;

          const html = await pageToHtml(page, include_styles as boolean, theme as string);
          const title = page.properties?.title?.[0]?.text?.content || 'Untitled';
          const safeName = title.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();

          exports.push({
            title,
            content: html,
            path: `${safeName}.html`,
          });
        }

        if (exports.length === 1) {
          result = {
            format: 'html',
            file_name: exports[0].path,
            content: exports[0].content,
            pages_exported: 1,
          };
        } else {
          result = {
            format: 'html',
            files: exports.map(e => ({ path: e.path, title: e.title })),
            content: exports,
            pages_exported: exports.length,
          };
        }
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
    console.error('[Workspace Export] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

// Helper: Convert page to Markdown
async function pageToMarkdown(page: any, includeFrontmatter: boolean): Promise<string> {
  const lines: string[] = [];
  const title = page.properties?.title?.[0]?.text?.content || 'Untitled';

  // Add frontmatter
  if (includeFrontmatter) {
    lines.push('---');
    lines.push(`title: "${title}"`);
    lines.push(`id: ${page.id}`);
    lines.push(`created: ${page.created_at}`);
    lines.push(`updated: ${page.updated_at}`);
    lines.push('---');
    lines.push('');
  }

  // Add title
  lines.push(`# ${title}`);
  lines.push('');

  // Convert children to markdown
  if (page.children) {
    for (const child of page.children) {
      const md = blockToMarkdown(child);
      if (md) lines.push(md);
    }
  }

  return lines.join('\n');
}

// Helper: Convert block to Markdown
function blockToMarkdown(block: any): string {
  const getText = (props: any): string => {
    const textArray = props?.title || props?.rich_text || [];
    return textArray.map((t: any) => {
      let text = t.text?.content || t.plain_text || '';
      if (t.annotations?.bold) text = `**${text}**`;
      if (t.annotations?.italic) text = `*${text}*`;
      if (t.annotations?.code) text = `\`${text}\``;
      if (t.annotations?.strikethrough) text = `~~${text}~~`;
      if (t.href || t.text?.link) text = `[${text}](${t.href || t.text?.link})`;
      return text;
    }).join('');
  };

  const text = getText(block.properties);

  switch (block.type) {
    case 'heading_1':
      return `# ${text}\n`;
    case 'heading_2':
      return `## ${text}\n`;
    case 'heading_3':
      return `### ${text}\n`;
    case 'paragraph':
      return `${text}\n`;
    case 'bulleted_list':
      return `- ${text}`;
    case 'numbered_list':
      return `1. ${text}`;
    case 'to_do':
      const checked = block.properties?.checked ? 'x' : ' ';
      return `- [${checked}] ${text}`;
    case 'quote':
      return `> ${text}\n`;
    case 'code':
      const lang = block.properties?.language || '';
      return `\`\`\`${lang}\n${text}\n\`\`\`\n`;
    case 'divider':
      return '---\n';
    case 'callout':
      const icon = block.properties?.icon?.emoji || 'ℹ️';
      return `> ${icon} ${text}\n`;
    case 'image':
      const url = block.properties?.url || '';
      const caption = block.properties?.caption?.[0]?.text?.content || '';
      return `![${caption}](${url})\n`;
    case 'bookmark':
      const bookmarkUrl = block.properties?.url || '';
      return `[${text || bookmarkUrl}](${bookmarkUrl})\n`;
    default:
      return text ? `${text}\n` : '';
  }
}

// Helper: Convert page to HTML
async function pageToHtml(page: any, includeStyles: boolean, theme: string): Promise<string> {
  const title = page.properties?.title?.[0]?.text?.content || 'Untitled';
  
  const styles = includeStyles ? `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        line-height: 1.6;
        color: ${theme === 'dark' ? '#e0e0e0' : '#333'};
        background: ${theme === 'dark' ? '#1a1a1a' : '#fff'};
      }
      h1 { font-size: 2rem; margin-top: 2rem; }
      h2 { font-size: 1.5rem; margin-top: 1.5rem; }
      h3 { font-size: 1.25rem; margin-top: 1rem; }
      code { background: ${theme === 'dark' ? '#333' : '#f4f4f4'}; padding: 0.2em 0.4em; border-radius: 3px; }
      pre { background: ${theme === 'dark' ? '#333' : '#f4f4f4'}; padding: 1rem; border-radius: 5px; overflow-x: auto; }
      blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1rem; color: #666; }
      .callout { background: ${theme === 'dark' ? '#2a2a2a' : '#f8f8f8'}; padding: 1rem; border-radius: 5px; margin: 1rem 0; }
      hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
      ul, ol { padding-left: 1.5rem; }
      .todo { list-style: none; }
      .todo input { margin-right: 0.5rem; }
    </style>
  ` : '';

  let content = '';
  if (page.children) {
    for (const child of page.children) {
      content += blockToHtml(child);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${styles}
</head>
<body>
  <h1>${title}</h1>
  ${content}
</body>
</html>`;
}

// Helper: Convert block to HTML
function blockToHtml(block: any): string {
  const getText = (props: any): string => {
    const textArray = props?.title || props?.rich_text || [];
    return textArray.map((t: any) => {
      let text = t.text?.content || t.plain_text || '';
      text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (t.annotations?.bold) text = `<strong>${text}</strong>`;
      if (t.annotations?.italic) text = `<em>${text}</em>`;
      if (t.annotations?.code) text = `<code>${text}</code>`;
      if (t.annotations?.strikethrough) text = `<del>${text}</del>`;
      if (t.href || t.text?.link) text = `<a href="${t.href || t.text?.link}">${text}</a>`;
      return text;
    }).join('');
  };

  const text = getText(block.properties);

  switch (block.type) {
    case 'heading_1':
      return `<h1>${text}</h1>\n`;
    case 'heading_2':
      return `<h2>${text}</h2>\n`;
    case 'heading_3':
      return `<h3>${text}</h3>\n`;
    case 'paragraph':
      return `<p>${text}</p>\n`;
    case 'bulleted_list':
      return `<ul><li>${text}</li></ul>\n`;
    case 'numbered_list':
      return `<ol><li>${text}</li></ol>\n`;
    case 'to_do':
      const checked = block.properties?.checked ? 'checked' : '';
      return `<div class="todo"><input type="checkbox" ${checked} disabled> ${text}</div>\n`;
    case 'quote':
      return `<blockquote>${text}</blockquote>\n`;
    case 'code':
      const lang = block.properties?.language || '';
      return `<pre><code class="language-${lang}">${text}</code></pre>\n`;
    case 'divider':
      return '<hr>\n';
    case 'callout':
      const icon = block.properties?.icon?.emoji || 'ℹ️';
      return `<div class="callout">${icon} ${text}</div>\n`;
    case 'image':
      const url = block.properties?.url || '';
      const caption = block.properties?.caption?.[0]?.text?.content || '';
      return `<figure><img src="${url}" alt="${caption}"><figcaption>${caption}</figcaption></figure>\n`;
    default:
      return text ? `<p>${text}</p>\n` : '';
  }
}

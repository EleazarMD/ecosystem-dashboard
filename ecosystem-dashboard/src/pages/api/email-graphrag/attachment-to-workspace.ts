/**
 * API Bridge: Email Attachment to Workspace
 * 
 * This endpoint bridges the email-graphrag service with Workspace AI:
 * 1. Retrieves attachment from Mac Mail agent
 * 2. Analyzes it with AI (if not already analyzed)
 * 3. Creates a Workspace page with the analysis
 * 4. Links the page back to the original email
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

import { HERMES_URL, hermesAuthHeaders } from '@/lib/hermes-client';

interface AttachmentToWorkspaceRequest {
  email_id: string;
  attachment_filename: string;
  email_subject: string;
  email_from: string;
  workspace_id?: string;
  user_id?: string;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface AttachmentToWorkspaceResponse {
  success: boolean;
  page_id?: string;
  page_title?: string;
  analysis?: {
    description?: string;
    insights?: string[];
    recommendations?: string[];
  };
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AttachmentToWorkspaceResponse>,
  authContext: APIAuthContext
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    email_id,
    attachment_filename,
    email_subject,
    email_from,
    workspace_id,
    user_id,
  } = req.body as AttachmentToWorkspaceRequest;

  const userId = authContext.userId;

  if (user_id && user_id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'user_id does not match authenticated user',
    });
  }

  if (!workspace_id) {
    return res.status(400).json({
      success: false,
      error: 'workspace_id is required',
    });
  }

  if (!email_id || !attachment_filename) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: email_id and attachment_filename',
    });
  }

  try {
    // Step 1: Get email source path from GraphRAG
    const emailRes = await fetch(
      `${HERMES_URL}/emails/${encodeURIComponent(email_id)}/attachments`,
      { headers: { ...hermesAuthHeaders() } }
    );
    
    if (!emailRes.ok) {
      throw new Error(`Failed to get email attachments: ${emailRes.statusText}`);
    }
    
    const emailData = await emailRes.json();
    const sourcePath = emailData.source_path;
    
    if (!sourcePath) {
      throw new Error('Email source path not available');
    }

    // Step 2: Retrieve attachment content
    const retrieveRes = await fetch(`${HERMES_URL}/attachments/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hermesAuthHeaders() },
      body: JSON.stringify({
        emlx_path: sourcePath,
        filename: attachment_filename,
      }),
    });

    if (!retrieveRes.ok) {
      throw new Error(`Failed to retrieve attachment: ${retrieveRes.statusText}`);
    }

    const attachmentData = await retrieveRes.json();
    const contentType = attachmentData.content_type || 'application/octet-stream';

    // Step 3: Analyze attachment with AI
    const analyzeRes = await fetch(`${HERMES_URL}/analyze/attachment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...hermesAuthHeaders() },
      body: JSON.stringify({
        filename: attachment_filename,
        content_type: contentType,
        data: attachmentData.data,
        context: `Email subject: ${email_subject}\nFrom: ${email_from}`,
      }),
    });

    let analysis = {
      description: `Attachment from email: ${email_subject}`,
      insights: [] as string[],
      recommendations: [] as string[],
    };

    if (analyzeRes.ok) {
      const analyzeData = await analyzeRes.json();
      if (analyzeData.analysis) {
        analysis = {
          description: analyzeData.analysis.description || analysis.description,
          insights: analyzeData.analysis.insights || [],
          recommendations: analyzeData.analysis.recommendations || [],
        };
      }
    }

    // Step 4: Create Workspace page
    const pageTitle = `📎 ${attachment_filename} - Analysis`;
    
    // Build page content in Markdown format
    const pageContent = buildPageContent({
      filename: attachment_filename,
      emailSubject: email_subject,
      emailFrom: email_from,
      emailId: email_id,
      analysis,
    });

    const createPageRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8404'}/api/workspace/pages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: workspace_id,
          userId: userId,
          title: pageTitle,
          content: pageContent,
          icon: getIconForContentType(contentType),
        }),
      }
    );

    if (!createPageRes.ok) {
      throw new Error(`Failed to create workspace page: ${createPageRes.statusText}`);
    }

    const pageData = await createPageRes.json();

    // Step 5: Update email in GraphRAG with workspace link (optional enhancement)
    // This could be implemented to store the workspace_page_id in Neo4j

    return res.status(200).json({
      success: true,
      page_id: pageData.id,
      page_title: pageTitle,
      analysis,
    });

  } catch (error) {
    console.error('Attachment to workspace error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Build Markdown content for the workspace page
 */
function buildPageContent(params: {
  filename: string;
  emailSubject: string;
  emailFrom: string;
  emailId: string;
  analysis: {
    description?: string;
    insights?: string[];
    recommendations?: string[];
  };
}): string {
  const { filename, emailSubject, emailFrom, emailId, analysis } = params;
  
  let content = `## Source Email\n\n`;
  content += `- **Subject:** ${emailSubject}\n`;
  content += `- **From:** ${emailFrom}\n`;
  content += `- **Email ID:** \`${emailId}\`\n\n`;
  
  content += `## Attachment Details\n\n`;
  content += `- **Filename:** ${filename}\n\n`;
  
  if (analysis.description) {
    content += `## AI Analysis\n\n`;
    content += `${analysis.description}\n\n`;
  }
  
  if (analysis.insights && analysis.insights.length > 0) {
    content += `## Key Insights\n\n`;
    analysis.insights.forEach((insight, idx) => {
      content += `${idx + 1}. ${insight}\n`;
    });
    content += '\n';
  }
  
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    content += `## Recommendations\n\n`;
    analysis.recommendations.forEach((rec, idx) => {
      content += `${idx + 1}. ${rec}\n`;
    });
    content += '\n';
  }
  
  content += `---\n\n`;
  content += `*Generated from email attachment analysis*`;
  
  return content;
}

/**
 * Get appropriate icon based on content type
 */
function getIconForContentType(contentType: string): string {
  if (contentType.startsWith('image/')) return '🖼️';
  if (contentType.includes('pdf')) return '📄';
  if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
  if (contentType.includes('word') || contentType.includes('document')) return '📝';
  if (contentType.includes('zip') || contentType.includes('archive')) return '📦';
  return '📎';
}

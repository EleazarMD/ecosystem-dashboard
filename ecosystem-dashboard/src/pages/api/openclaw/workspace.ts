/**
 * OpenClaw Workspace API
 * 
 * Unified endpoint for OpenClaw to perform workspace operations:
 * - Create/read/update/delete pages
 * - Create/manage databases
 * - Search workspace content
 * - Apply content templates
 * 
 * This endpoint is called by the workspace-files skill.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { blockService } from '@/lib/workspace/block-service';
import { workspaceService } from '@/lib/workspace/workspace-service';
import { databaseService } from '@/lib/workspace/database-service';
import { markdownToBlocks } from '@/lib/workspace/markdown-to-blocks';
import { withAPIAuth, type APIAuthContext } from '@/lib/security/api-auth';

interface WorkspaceOperation {
  operation: 
    | 'create_workspace'
    | 'rename_workspace'
    | 'update_workspace'
    | 'delete_workspace'
    | 'list_workspaces'
    | 'get_workspace'
    | 'create_page'
    | 'get_page'
    | 'update_page'
    | 'delete_page'
    | 'list_pages'
    | 'search_pages'
    | 'append_blocks'
    | 'create_database'
    | 'get_or_create_workspace';
  workspace_id?: string;
  page_id?: string;
  user_id?: string;
  data?: Record<string, unknown>;
}

export default withAPIAuth(async (req, res, authContext) => handler(req, res, authContext));

interface OperationResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

// Content templates for common document types - Enterprise-grade professional templates
const TEMPLATES: Record<string, { icon: string; blocks: Array<{ type: string; content: string; icon?: string; color?: string }> }> = {
  note: {
    icon: '📝',
    blocks: [
      { type: 'paragraph', content: '' },
    ],
  },
  research: {
    icon: '🔬',
    blocks: [
      { type: 'callout', content: '📋 Research Brief\n\nObjective: Define the primary research question\nScope: Outline boundaries and limitations\nMethodology: Describe approach and data sources', icon: '🎯', color: 'blue' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: '1. Executive Summary' },
      { type: 'paragraph', content: 'Provide a concise overview of key findings and recommendations.' },
      { type: 'heading_2', content: '2. Background & Context' },
      { type: 'paragraph', content: 'Describe the business context, problem statement, and why this research matters.' },
      { type: 'heading_2', content: '3. Research Methodology' },
      { type: 'bulleted_list', content: 'Data sources and collection methods' },
      { type: 'bulleted_list', content: 'Analysis framework' },
      { type: 'bulleted_list', content: 'Limitations and assumptions' },
      { type: 'heading_2', content: '4. Key Findings' },
      { type: 'callout', content: 'Finding 1: [Key insight with supporting data]', icon: '💡', color: 'yellow' },
      { type: 'callout', content: 'Finding 2: [Key insight with supporting data]', icon: '💡', color: 'yellow' },
      { type: 'heading_2', content: '5. Analysis & Implications' },
      { type: 'paragraph', content: 'Interpret findings and discuss business implications.' },
      { type: 'heading_2', content: '6. Recommendations' },
      { type: 'numbered_list', content: 'Primary recommendation with expected impact' },
      { type: 'numbered_list', content: 'Secondary recommendation with timeline' },
      { type: 'heading_2', content: '7. Appendix & Sources' },
      { type: 'toggle', content: 'Data Tables & Charts' },
      { type: 'toggle', content: 'Reference Materials' },
    ],
  },
  meeting: {
    icon: '📅',
    blocks: [
      { type: 'callout', content: '📋 Meeting Details\n\nDate: [Date]\nTime: [Start] - [End]\nLocation: [Room/Virtual Link]\nFacilitator: [Name]', icon: '🗓️', color: 'blue' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Attendees' },
      { type: 'table', content: '| Name | Role | Present |\n|------|------|---------|' },
      { type: 'heading_2', content: 'Agenda' },
      { type: 'numbered_list', content: '[Topic 1] — Owner: [Name] — Time: [X min]' },
      { type: 'numbered_list', content: '[Topic 2] — Owner: [Name] — Time: [X min]' },
      { type: 'numbered_list', content: '[Topic 3] — Owner: [Name] — Time: [X min]' },
      { type: 'heading_2', content: 'Discussion Notes' },
      { type: 'toggle', content: 'Topic 1: [Summary of discussion]' },
      { type: 'toggle', content: 'Topic 2: [Summary of discussion]' },
      { type: 'heading_2', content: 'Decisions Made' },
      { type: 'callout', content: '[Decision 1]: [Brief description and rationale]', icon: '✅', color: 'green' },
      { type: 'heading_2', content: 'Action Items' },
      { type: 'to_do', content: '[Action] — Owner: [Name] — Due: [Date]' },
      { type: 'to_do', content: '[Action] — Owner: [Name] — Due: [Date]' },
      { type: 'heading_2', content: 'Next Meeting' },
      { type: 'paragraph', content: 'Date: [Next meeting date]\nTopics to cover: [Carry-over items]' },
    ],
  },
  email_archive: {
    icon: '📧',
    blocks: [
      { type: 'callout', content: '📬 Email Metadata\n\nFrom: [Sender]\nTo: [Recipients]\nCC: [CC Recipients]\nDate: [Date & Time]\nSubject: [Subject Line]', icon: '📧', color: 'gray' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Email Content' },
      { type: 'paragraph', content: '' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Attachments' },
      { type: 'bulleted_list', content: '[Filename] — [Size] — [Link]' },
      { type: 'heading_2', content: 'Follow-up Actions' },
      { type: 'to_do', content: '[Action required from this email]' },
      { type: 'heading_2', content: 'Related Documents' },
      { type: 'bulleted_list', content: '[Link to related page or document]' },
    ],
  },
  document: {
    icon: '📄',
    blocks: [
      { type: 'callout', content: '📋 Document Information\n\nVersion: 1.0\nStatus: Draft | In Review | Approved\nOwner: [Name]\nLast Updated: [Date]', icon: '📄', color: 'gray' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: '1. Purpose & Scope' },
      { type: 'paragraph', content: 'Define the purpose of this document and its intended audience.' },
      { type: 'heading_2', content: '2. Overview' },
      { type: 'paragraph', content: 'Provide a high-level summary of the content.' },
      { type: 'heading_2', content: '3. Details' },
      { type: 'heading_3', content: '3.1 Section One' },
      { type: 'paragraph', content: '' },
      { type: 'heading_3', content: '3.2 Section Two' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: '4. Summary & Conclusions' },
      { type: 'paragraph', content: '' },
      { type: 'heading_2', content: '5. References' },
      { type: 'bulleted_list', content: '[Reference 1]' },
      { type: 'heading_2', content: 'Revision History' },
      { type: 'table', content: '| Version | Date | Author | Changes |\n|---------|------|--------|---------|' },
    ],
  },
  project: {
    icon: '🎯',
    blocks: [
      { type: 'callout', content: '📊 Project Overview\n\nStatus: 🟡 Planning | 🟢 In Progress | 🔵 Complete\nPriority: High | Medium | Low\nOwner: [Project Lead]\nStart Date: [Date]\nTarget Completion: [Date]', icon: '🎯', color: 'blue' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: '1. Executive Summary' },
      { type: 'paragraph', content: 'Brief description of the project, its goals, and expected outcomes.' },
      { type: 'heading_2', content: '2. Objectives & Success Criteria' },
      { type: 'callout', content: '🎯 Primary Objective: [What this project aims to achieve]', icon: '🎯', color: 'green' },
      { type: 'heading_3', content: 'Key Results' },
      { type: 'bulleted_list', content: 'KR1: [Measurable outcome] — Target: [Metric]' },
      { type: 'bulleted_list', content: 'KR2: [Measurable outcome] — Target: [Metric]' },
      { type: 'bulleted_list', content: 'KR3: [Measurable outcome] — Target: [Metric]' },
      { type: 'heading_2', content: '3. Timeline & Milestones' },
      { type: 'callout', content: '📅 Phase 1: [Name] — [Start] to [End]\n📅 Phase 2: [Name] — [Start] to [End]\n📅 Phase 3: [Name] — [Start] to [End]', icon: '🗓️', color: 'purple' },
      { type: 'heading_2', content: '4. Tasks & Deliverables' },
      { type: 'heading_3', content: 'Phase 1: [Phase Name]' },
      { type: 'to_do', content: '[Task 1] — Owner: [Name] — Due: [Date]' },
      { type: 'to_do', content: '[Task 2] — Owner: [Name] — Due: [Date]' },
      { type: 'heading_3', content: 'Phase 2: [Phase Name]' },
      { type: 'to_do', content: '[Task 3] — Owner: [Name] — Due: [Date]' },
      { type: 'heading_2', content: '5. Resources & Budget' },
      { type: 'heading_3', content: 'Team' },
      { type: 'bulleted_list', content: '[Name] — [Role] — [Allocation %]' },
      { type: 'heading_3', content: 'Budget' },
      { type: 'table', content: '| Category | Allocated | Spent | Remaining |\n|----------|-----------|-------|-----------|' },
      { type: 'heading_2', content: '6. Risks & Mitigations' },
      { type: 'callout', content: '⚠️ Risk: [Description]\nImpact: High | Medium | Low\nMitigation: [Strategy]', icon: '⚠️', color: 'red' },
      { type: 'heading_2', content: '7. Stakeholders & Communication' },
      { type: 'bulleted_list', content: '[Stakeholder] — [Interest/Role] — [Communication Frequency]' },
      { type: 'heading_2', content: '8. Notes & Updates' },
      { type: 'toggle', content: '[Date]: [Update summary]' },
    ],
  },
  // Additional enterprise templates
  sop: {
    icon: '📋',
    blocks: [
      { type: 'callout', content: '📋 Standard Operating Procedure\n\nDocument ID: SOP-[XXX]\nVersion: 1.0\nEffective Date: [Date]\nReview Date: [Date]\nOwner: [Department/Role]', icon: '📋', color: 'blue' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: '1. Purpose' },
      { type: 'paragraph', content: 'Describe the purpose and scope of this procedure.' },
      { type: 'heading_2', content: '2. Scope & Applicability' },
      { type: 'paragraph', content: 'Define who this SOP applies to and under what circumstances.' },
      { type: 'heading_2', content: '3. Definitions' },
      { type: 'bulleted_list', content: '[Term]: [Definition]' },
      { type: 'heading_2', content: '4. Responsibilities' },
      { type: 'table', content: '| Role | Responsibility |\n|------|----------------|' },
      { type: 'heading_2', content: '5. Procedure' },
      { type: 'numbered_list', content: 'Step 1: [Action] — [Details]' },
      { type: 'numbered_list', content: 'Step 2: [Action] — [Details]' },
      { type: 'numbered_list', content: 'Step 3: [Action] — [Details]' },
      { type: 'heading_2', content: '6. Quality Control' },
      { type: 'to_do', content: 'Verification checkpoint 1' },
      { type: 'to_do', content: 'Verification checkpoint 2' },
      { type: 'heading_2', content: '7. References' },
      { type: 'bulleted_list', content: '[Related document or standard]' },
      { type: 'heading_2', content: 'Revision History' },
      { type: 'table', content: '| Version | Date | Author | Changes |\n|---------|------|--------|---------|' },
    ],
  },
  rfc: {
    icon: '📝',
    blocks: [
      { type: 'callout', content: '📝 Request for Comments (RFC)\n\nRFC Number: RFC-[XXX]\nStatus: Draft | Open for Comments | Accepted | Rejected\nAuthor: [Name]\nCreated: [Date]\nComment Deadline: [Date]', icon: '📝', color: 'purple' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Abstract' },
      { type: 'paragraph', content: 'One-paragraph summary of the proposal.' },
      { type: 'heading_2', content: '1. Problem Statement' },
      { type: 'paragraph', content: 'Describe the problem or opportunity this RFC addresses.' },
      { type: 'heading_2', content: '2. Proposed Solution' },
      { type: 'paragraph', content: 'Detail the proposed approach.' },
      { type: 'heading_2', content: '3. Alternatives Considered' },
      { type: 'heading_3', content: 'Option A: [Name]' },
      { type: 'paragraph', content: 'Pros: [List]\nCons: [List]' },
      { type: 'heading_3', content: 'Option B: [Name]' },
      { type: 'paragraph', content: 'Pros: [List]\nCons: [List]' },
      { type: 'heading_2', content: '4. Implementation Plan' },
      { type: 'numbered_list', content: 'Phase 1: [Description]' },
      { type: 'numbered_list', content: 'Phase 2: [Description]' },
      { type: 'heading_2', content: '5. Impact Assessment' },
      { type: 'callout', content: 'Systems Affected: [List]\nTeams Involved: [List]\nEstimated Effort: [Time]', icon: '📊', color: 'yellow' },
      { type: 'heading_2', content: '6. Open Questions' },
      { type: 'bulleted_list', content: '[Question that needs input]' },
      { type: 'heading_2', content: '7. Comments & Feedback' },
      { type: 'toggle', content: '[Reviewer Name] — [Date]: [Feedback]' },
    ],
  },
  incident: {
    icon: '🚨',
    blocks: [
      { type: 'callout', content: '🚨 Incident Report\n\nIncident ID: INC-[XXX]\nSeverity: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low\nStatus: Investigating | Mitigated | Resolved | Post-mortem\nDetected: [Date/Time]\nResolved: [Date/Time]', icon: '🚨', color: 'red' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: 'Executive Summary' },
      { type: 'paragraph', content: 'Brief description of what happened and the impact.' },
      { type: 'heading_2', content: 'Timeline' },
      { type: 'bulleted_list', content: '[Time] — [Event]' },
      { type: 'bulleted_list', content: '[Time] — [Event]' },
      { type: 'bulleted_list', content: '[Time] — [Event]' },
      { type: 'heading_2', content: 'Impact' },
      { type: 'callout', content: 'Users Affected: [Number/Percentage]\nServices Impacted: [List]\nDuration: [Time]\nRevenue Impact: [Estimate if applicable]', icon: '📊', color: 'orange' },
      { type: 'heading_2', content: 'Root Cause Analysis' },
      { type: 'paragraph', content: 'Detailed analysis of what caused the incident.' },
      { type: 'heading_2', content: 'Resolution' },
      { type: 'paragraph', content: 'Steps taken to resolve the incident.' },
      { type: 'heading_2', content: 'Action Items' },
      { type: 'to_do', content: '[Preventive action] — Owner: [Name] — Due: [Date]' },
      { type: 'to_do', content: '[Preventive action] — Owner: [Name] — Due: [Date]' },
      { type: 'heading_2', content: 'Lessons Learned' },
      { type: 'bulleted_list', content: '[Key takeaway]' },
    ],
  },
  prd: {
    icon: '📦',
    blocks: [
      { type: 'callout', content: '📦 Product Requirements Document\n\nProduct: [Name]\nVersion: 1.0\nStatus: Draft | In Review | Approved\nProduct Manager: [Name]\nTarget Release: [Date/Quarter]', icon: '📦', color: 'blue' },
      { type: 'divider', content: '' },
      { type: 'heading_2', content: '1. Overview' },
      { type: 'heading_3', content: 'Problem Statement' },
      { type: 'paragraph', content: 'What problem are we solving?' },
      { type: 'heading_3', content: 'Target Users' },
      { type: 'paragraph', content: 'Who are we building this for?' },
      { type: 'heading_2', content: '2. Goals & Success Metrics' },
      { type: 'callout', content: '🎯 Primary Goal: [Goal]\n\n📊 Success Metrics:\n• [Metric 1]: [Target]\n• [Metric 2]: [Target]', icon: '🎯', color: 'green' },
      { type: 'heading_2', content: '3. User Stories' },
      { type: 'callout', content: 'As a [user type], I want to [action] so that [benefit].', icon: '👤', color: 'purple' },
      { type: 'heading_2', content: '4. Requirements' },
      { type: 'heading_3', content: 'Functional Requirements' },
      { type: 'bulleted_list', content: 'FR-1: [Requirement] — Priority: P0/P1/P2' },
      { type: 'bulleted_list', content: 'FR-2: [Requirement] — Priority: P0/P1/P2' },
      { type: 'heading_3', content: 'Non-Functional Requirements' },
      { type: 'bulleted_list', content: 'NFR-1: [Performance/Security/Scalability requirement]' },
      { type: 'heading_2', content: '5. Design & UX' },
      { type: 'paragraph', content: '[Link to designs or embed mockups]' },
      { type: 'heading_2', content: '6. Technical Considerations' },
      { type: 'toggle', content: 'Architecture Notes' },
      { type: 'toggle', content: 'Dependencies' },
      { type: 'toggle', content: 'API Changes' },
      { type: 'heading_2', content: '7. Launch Plan' },
      { type: 'to_do', content: 'Feature flag setup' },
      { type: 'to_do', content: 'Documentation' },
      { type: 'to_do', content: 'Rollout plan' },
      { type: 'heading_2', content: '8. Open Questions' },
      { type: 'bulleted_list', content: '[Question requiring decision]' },
    ],
  },
};

function buildBlockProperties(type: string, content: string, icon?: string, color?: string): Record<string, unknown> {
  // Dividers have no properties
  if (type === 'divider') {
    return {};
  }

  // Image blocks store a URL and optional caption
  if (type === 'image') {
    const imageProps: Record<string, unknown> = {
      type: 'external',
      external: { url: content },
    };
    if (icon) {
      imageProps.caption = [{ type: 'text', text: { content: icon } }];
    }
    return imageProps;
  }

  // Bookmark blocks store a URL
  if (type === 'bookmark') {
    return { url: content };
  }

  // All text-based blocks use rich_text except page titles
  const props: Record<string, unknown> = {
    rich_text: [
      {
        type: 'text',
        text: { content },
      },
    ],
  };

  // Callout-specific properties
  if (type === 'callout') {
    if (icon) {
      props.icon = { type: 'emoji', emoji: icon };
    }
    if (color) {
      props.color = color;
    }
  }

  // To-do specific properties
  if (type === 'to_do') {
    props.checked = false;
  }

  // Toggle blocks need a title property for the toggle header
  if (type === 'toggle') {
    props.title = props.rich_text;
  }

  // Code blocks need a language
  if (type === 'code') {
    props.language = 'plain text';
  }

  return props;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OperationResponse>,
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
    const op: WorkspaceOperation = req.body;
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

    // Workspace ownership gate: if caller provides a workspace_id, verify they own it
    if (op.workspace_id) {
      const ownerCheck = await workspaceService.getWorkspace(op.workspace_id);
      if (!ownerCheck) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
          timestamp: new Date().toISOString(),
        });
      }
      if (ownerCheck.workspace.owner_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this workspace',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Page ownership gate: if caller provides a page_id, verify the page belongs to their workspace
    if (op.page_id) {
      const pageCheck = await blockService.getBlock(op.page_id);
      if (pageCheck) {
        const pageWs = await workspaceService.getWorkspace(pageCheck.workspace_id);
        if (pageWs && pageWs.workspace.owner_id !== userId) {
          return res.status(403).json({
            success: false,
            error: 'You do not have access to this page',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    let result: unknown;

    switch (op.operation) {
      // ========================================
      // WORKSPACE OPERATIONS
      // ========================================
      case 'list_workspaces': {
        const workspaces = await workspaceService.getUserWorkspaces(userId);
        result = { workspaces, count: workspaces.length };
        break;
      }

      case 'get_or_create_workspace': {
        let workspaces = await workspaceService.getUserWorkspaces(userId);
        
        if (workspaces.length === 0) {
          // Create default workspace
          const newWorkspace = await workspaceService.createDefaultWorkspace(userId);
          workspaces = [newWorkspace];
        }

        result = { 
          workspace: workspaces[0],
          created: workspaces.length === 1 && !op.workspace_id,
        };
        break;
      }

      case 'create_workspace': {
        const { name, icon, settings } = op.data || {};
        
        if (!name) {
          return res.status(400).json({
            success: false,
            error: 'name is required for create_workspace',
            timestamp: new Date().toISOString(),
          });
        }

        const workspace = await workspaceService.createWorkspace({
          name: name as string,
          owner_id: userId,
          settings: {
            icon: (icon as string) || '📁',
            ...(settings as Record<string, unknown> || {}),
          },
        });

        result = {
          workspace,
          dashboard_url: `http://localhost:8404/workspace/${workspace.id}`,
        };
        break;
      }

      case 'get_workspace': {
        if (!op.workspace_id) {
          return res.status(400).json({
            success: false,
            error: 'workspace_id is required for get_workspace',
            timestamp: new Date().toISOString(),
          });
        }

        const workspace = await workspaceService.getWorkspace(op.workspace_id);
        if (!workspace) {
          return res.status(404).json({
            success: false,
            error: 'Workspace not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = { workspace };
        break;
      }

      case 'rename_workspace':
      case 'update_workspace': {
        if (!op.workspace_id) {
          return res.status(400).json({
            success: false,
            error: 'workspace_id is required for update_workspace',
            timestamp: new Date().toISOString(),
          });
        }

        const { name, icon, settings } = op.data || {};
        
        const updates: Record<string, unknown> = {};
        if (name) updates.name = name;
        if (settings) updates.settings = settings;
        if (icon) {
          const existingWs = await workspaceService.getWorkspace(op.workspace_id);
          updates.settings = { ...existingWs?.settings, icon };
        }

        const updatedWorkspace = await workspaceService.updateWorkspace(op.workspace_id, updates);

        result = {
          workspace: updatedWorkspace,
          updated_fields: Object.keys(updates),
        };
        break;
      }

      case 'delete_workspace': {
        if (!op.workspace_id) {
          return res.status(400).json({
            success: false,
            error: 'workspace_id is required for delete_workspace',
            timestamp: new Date().toISOString(),
          });
        }

        await workspaceService.deleteWorkspace(op.workspace_id);

        result = {
          deleted: true,
          workspace_id: op.workspace_id,
        };
        break;
      }

      // ========================================
      // PAGE OPERATIONS
      // ========================================
      case 'create_page': {
        const { title, content, parent_id, icon, template } = op.data || {};
        
        // Get workspace - use provided ID or get user's first workspace
        let workspaceId = op.workspace_id;
        if (!workspaceId) {
          const workspaces = await workspaceService.getUserWorkspaces(userId);
          if (workspaces.length === 0) {
            const newWs = await workspaceService.createWorkspace({
              name: 'My Workspace',
              owner_id: userId,
              settings: { icon: '📁' },
            });
            workspaceId = newWs.id;
          } else {
            workspaceId = workspaces[0].id;
          }
        }

        // Determine icon from template or explicit
        const templateConfig = template ? TEMPLATES[template as string] : null;
        const pageIcon = (icon as string) || templateConfig?.icon || '📄';

        // Create the page
        const pageProperties: Record<string, unknown> = {
          title: [
            {
              type: 'text',
              text: { content: (title as string) || 'Untitled' },
            },
          ],
          icon: {
            type: 'emoji',
            emoji: pageIcon,
          },
        };

        const page = await blockService.createBlock({
          workspace_id: workspaceId,
          parent_id: (parent_id as string) || null,
          type: 'page',
          properties: pageProperties,
          created_by: userId,
        });

        // Add content or template blocks
        const blocksToCreate: Array<{ type: string; content: string; icon?: string; color?: string }> = [];

        if (templateConfig) {
          blocksToCreate.push(...templateConfig.blocks);
        }

        // Parse markdown content into proper blocks
        if (content && typeof content === 'string') {
          const contentStr = content as string;
          // Check if content contains markdown formatting
          const hasMarkdown = /^#{1,3}\s|^\*\*|^\*\s|^-\s|^\d+\.\s|^>\s|```/.test(contentStr);
          
          if (hasMarkdown) {
            // Parse markdown into structured blocks
            const parsedBlocks = markdownToBlocks(contentStr, workspaceId, userId);
            for (const parsedBlock of parsedBlocks) {
              await blockService.createBlock({
                ...parsedBlock,
                parent_id: page.id,
              });
            }
          } else {
            // Simple text - create as paragraph
            blocksToCreate.push({ type: 'paragraph', content: contentStr });
          }
        }

        // Create template blocks
        if (blocksToCreate.length > 0) {
          for (const block of blocksToCreate) {
            await blockService.createBlock({
              workspace_id: workspaceId,
              parent_id: page.id,
              type: block.type as any,
              properties: buildBlockProperties(block.type, block.content, block.icon, block.color),
              created_by: userId,
            });
          }
        }

        result = {
          page,
          workspace_id: workspaceId,
          template_applied: template || null,
          dashboard_url: `http://localhost:8404/workspace/${workspaceId}/page/${page.id}`,
        };
        break;
      }

      case 'get_page': {
        if (!op.page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for get_page',
            timestamp: new Date().toISOString(),
          });
        }

        const page = await blockService.getBlock(op.page_id, true);
        if (!page) {
          return res.status(404).json({
            success: false,
            error: 'Page not found',
            timestamp: new Date().toISOString(),
          });
        }

        result = { page };
        break;
      }

      case 'update_page': {
        if (!op.page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for update_page',
            timestamp: new Date().toISOString(),
          });
        }

        const { title, content, properties } = op.data || {};
        
        const currentPage = await blockService.getBlock(op.page_id);
        if (!currentPage) {
          return res.status(404).json({
            success: false,
            error: 'Page not found',
            timestamp: new Date().toISOString(),
          });
        }

        const updatedProperties = { ...(currentPage.properties || {}) };

        if (title) {
          updatedProperties.title = [
            { type: 'text', text: { content: title as string } },
          ];
        }

        if (properties) {
          Object.assign(updatedProperties, properties);
        }

        const updatedPage = await blockService.updateBlock(op.page_id, {
          properties: updatedProperties,
          last_edited_by: userId,
        });

        // Update content if provided - parse markdown into proper blocks
        if (content && typeof content === 'string') {
          const contentStr = content as string;
          const hasMarkdown = /^#{1,3}\s|^\*\*|^\*\s|^-\s|^\d+\.\s|^>\s|```/m.test(contentStr);
          
          if (hasMarkdown) {
            // Clear existing content blocks and replace with parsed markdown
            const children = await blockService.getBlockChildren(op.page_id);
            for (const child of children) {
              await blockService.deleteBlock(child.id);
            }
            
            // Parse and create new blocks
            const parsedBlocks = markdownToBlocks(contentStr, currentPage.workspace_id, userId);
            for (const parsedBlock of parsedBlocks) {
              await blockService.createBlock({
                ...parsedBlock,
                parent_id: op.page_id,
              });
            }
          } else {
            // Simple text update
            const children = await blockService.getBlockChildren(op.page_id);
            const firstParagraph = children.find(b => b.type === 'paragraph');

            if (firstParagraph) {
              await blockService.updateBlock(firstParagraph.id, {
                properties: {
                  rich_text: [{ type: 'text', text: { content: contentStr } }],
                },
                last_edited_by: userId,
              });
            } else {
              await blockService.createBlock({
                workspace_id: currentPage.workspace_id,
                parent_id: op.page_id,
                type: 'paragraph',
                properties: {
                  rich_text: [{ type: 'text', text: { content: contentStr } }],
                },
                created_by: userId,
              });
            }
          }
        }

        result = { page: updatedPage };
        break;
      }

      case 'delete_page': {
        if (!op.page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for delete_page',
            timestamp: new Date().toISOString(),
          });
        }

        await blockService.deleteBlock(op.page_id);
        result = { deleted: true, page_id: op.page_id };
        break;
      }

      case 'list_pages': {
        if (!op.workspace_id) {
          // Get default workspace
          const workspaces = await workspaceService.getUserWorkspaces(userId);
          if (workspaces.length === 0) {
            result = { pages: [], count: 0 };
            break;
          }
          op.workspace_id = workspaces[0].id;
        }

        const allBlocks = await blockService.getWorkspaceBlocks(op.workspace_id, 'page');
        const limit = (op.data?.limit as number) || 50;
        const pages = allBlocks.slice(0, limit);

        result = {
          pages: pages.map(p => ({
            id: p.id,
            title: p.properties?.title?.[0]?.text?.content || 'Untitled',
            icon: p.properties?.icon?.emoji || '📄',
            created_at: p.created_at,
            updated_at: p.updated_at,
          })),
          count: pages.length,
          total: allBlocks.length,
          workspace_id: op.workspace_id,
        };
        break;
      }

      case 'search_pages': {
        const { query, limit = 20 } = op.data || {};

        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'query is required for search_pages',
            timestamp: new Date().toISOString(),
          });
        }

        let workspaceId = op.workspace_id;
        if (!workspaceId) {
          const workspaces = await workspaceService.getUserWorkspaces(userId);
          if (workspaces.length === 0) {
            result = { results: [], count: 0 };
            break;
          }
          workspaceId = workspaces[0].id;
        }

        const searchResults = await blockService.searchBlocks(
          workspaceId,
          query,
          limit as number
        );

        // Filter to pages only
        const pageResults = searchResults.filter(b => b.type === 'page');

        result = {
          results: pageResults.map(p => ({
            id: p.id,
            title: p.properties?.title?.[0]?.text?.content || 'Untitled',
            icon: p.properties?.icon?.emoji || '📄',
            updated_at: p.updated_at,
          })),
          count: pageResults.length,
          query,
          workspace_id: workspaceId,
        };
        break;
      }

      // ========================================
      // BLOCK OPERATIONS
      // ========================================
      case 'append_blocks': {
        if (!op.page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for append_blocks',
            timestamp: new Date().toISOString(),
          });
        }

        const { blocks } = op.data || {};
        if (!blocks || !Array.isArray(blocks)) {
          return res.status(400).json({
            success: false,
            error: 'blocks array is required for append_blocks',
            timestamp: new Date().toISOString(),
          });
        }

        const page = await blockService.getBlock(op.page_id);
        if (!page) {
          return res.status(404).json({
            success: false,
            error: 'Page not found',
            timestamp: new Date().toISOString(),
          });
        }

        const createdBlocks = [];
        for (const block of blocks) {
          const newBlock = await blockService.createBlock({
            workspace_id: page.workspace_id,
            parent_id: op.page_id,
            type: block.type,
            properties: block.properties || buildBlockProperties(
              block.type,
              block.content || '',
              block.icon
            ),
            created_by: userId,
          });
          createdBlocks.push(newBlock);
        }

        result = {
          blocks_created: createdBlocks.length,
          blocks: createdBlocks,
        };
        break;
      }

      // ========================================
      // IMAGE OPERATIONS
      // ========================================
      case 'add_image': {
        // Add an image block to a page
        // Expects: page_id, data.url (from /api/workspace/upload), data.caption (optional)
        if (!op.page_id) {
          return res.status(400).json({
            success: false,
            error: 'page_id is required for add_image',
            timestamp: new Date().toISOString(),
          });
        }

        const { url: imageUrl, caption: imageCaption, file_id } = op.data || {};
        if (!imageUrl) {
          return res.status(400).json({
            success: false,
            error: 'data.url is required for add_image (use /api/workspace/upload to get a URL)',
            timestamp: new Date().toISOString(),
          });
        }

        const imagePage = await blockService.getBlock(op.page_id);
        if (!imagePage) {
          return res.status(404).json({
            success: false,
            error: 'Page not found',
            timestamp: new Date().toISOString(),
          });
        }

        const imageProps: Record<string, unknown> = {
          type: 'external',
          external: { url: imageUrl },
        };
        if (imageCaption) {
          imageProps.caption = [{ type: 'text', text: { content: imageCaption } }];
        }
        if (file_id) {
          imageProps.file_id = file_id;
        }

        const imageBlock = await blockService.createBlock({
          workspace_id: imagePage.workspace_id,
          parent_id: op.page_id,
          type: 'image',
          properties: imageProps,
          created_by: userId,
        });

        result = {
          block: imageBlock,
          image_url: imageUrl,
          page_id: op.page_id,
        };
        break;
      }

      // ========================================
      // DATABASE OPERATIONS
      // ========================================
      case 'create_database': {
        const { title, schema, inline = false } = op.data || {};

        if (!title) {
          return res.status(400).json({
            success: false,
            error: 'title is required for create_database',
            timestamp: new Date().toISOString(),
          });
        }

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

        // Default schema if not provided
        const dbSchema = (schema as Array<{ name: string; type: string; config?: Record<string, unknown> }>) || [
          { name: 'Name', type: 'title', config: {} },
          { name: 'Status', type: 'select', config: {
            options: [
              { name: 'Todo', color: 'gray' },
              { name: 'In Progress', color: 'blue' },
              { name: 'Done', color: 'green' },
            ],
          }},
          { name: 'Created', type: 'created_time', config: {} },
        ];

        const database = await databaseService.createDatabase({
          workspace_id: workspaceId,
          title: title as string,
          inline: inline as boolean,
          schema: dbSchema.map((s, i) => ({
            name: s.name,
            type: s.type as any,
            config: s.config || {},
            position: i,
          })),
          created_by: userId,
        });

        result = {
          database,
          workspace_id: workspaceId,
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
    console.error('[OpenClaw Workspace] Error:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

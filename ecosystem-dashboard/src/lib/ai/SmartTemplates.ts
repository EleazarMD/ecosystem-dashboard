/**
 * SmartTemplates - AI-powered template generation based on context
 * Generates page structure suggestions using AI inference
 */

import type { Block, RichTextSegment, BlockType } from '@/lib/editor/BlockModel';
import { nanoid } from 'nanoid';

export interface TemplateRequest {
  purpose: string;
  context?: string;
  preferredBlocks?: BlockType[];
}

export interface GeneratedTemplate {
  title: string;
  description: string;
  blocks: Block[];
  suggestedProperties?: Record<string, { type: string; name: string }>;
}

export class SmartTemplates {
  /**
   * Generate a template based on a text description
   * Uses local pattern matching + optional AI inference
   */
  static async generate(request: TemplateRequest): Promise<GeneratedTemplate> {
    const purpose = request.purpose.toLowerCase();

    // Pattern-based template generation (no AI needed for common cases)
    if (this.matchesPattern(purpose, ['meeting', 'standup', 'sync', 'retro'])) {
      return this.meetingTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['project', 'plan', 'roadmap', 'initiative'])) {
      return this.projectTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['doc', 'documentation', 'guide', 'how-to', 'tutorial'])) {
      return this.documentationTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['bug', 'issue', 'ticket', 'report'])) {
      return this.bugReportTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['review', 'feedback', 'assessment', 'evaluation'])) {
      return this.reviewTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['decision', 'adr', 'rfc', 'proposal'])) {
      return this.decisionTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['journal', 'diary', 'log', 'daily'])) {
      return this.journalTemplate(request.purpose);
    }
    if (this.matchesPattern(purpose, ['database', 'tracker', 'inventory', 'list'])) {
      return this.databaseTemplate(request.purpose);
    }

    // Fallback: generic structured template
    return this.genericTemplate(request.purpose);
  }

  private static matchesPattern(text: string, keywords: string[]): boolean {
    return keywords.some(kw => text.includes(kw));
  }

  private static meetingTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Structured meeting notes with agenda, attendees, and action items',
      blocks: [
        this.block('heading_2', 'Attendees'),
        this.block('bulleted_list', '@person1'),
        this.block('bulleted_list', '@person2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Agenda'),
        this.block('numbered_list', 'Topic 1'),
        this.block('numbered_list', 'Topic 2'),
        this.block('numbered_list', 'Topic 3'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Discussion Notes'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Action Items'),
        this.block('to_do', 'Action item 1 — @owner — due date'),
        this.block('to_do', 'Action item 2 — @owner — due date'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Decisions Made'),
        this.block('bulleted_list', 'Decision 1'),
        this.block('paragraph', ''),
        this.block('callout', 'Next meeting: TBD', { icon: '📅' }),
      ],
    };
  }

  private static projectTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Project planning with goals, timeline, risks, and milestones',
      blocks: [
        this.block('callout', 'Project Status: 🟢 On Track', { icon: '📊' }),
        this.block('paragraph', ''),
        this.block('heading_2', 'Overview'),
        this.block('paragraph', 'Brief description of the project and its objectives.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Goals & Success Criteria'),
        this.block('to_do', 'Goal 1'),
        this.block('to_do', 'Goal 2'),
        this.block('to_do', 'Goal 3'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Timeline'),
        this.block('bulleted_list', 'Phase 1: Discovery (Week 1-2)'),
        this.block('bulleted_list', 'Phase 2: Implementation (Week 3-6)'),
        this.block('bulleted_list', 'Phase 3: Testing & Launch (Week 7-8)'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Team & Roles'),
        this.block('bulleted_list', 'Lead: @name'),
        this.block('bulleted_list', 'Engineering: @name'),
        this.block('bulleted_list', 'Design: @name'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Risks & Mitigations'),
        this.block('bulleted_list', 'Risk 1 → Mitigation'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Resources & Links'),
        this.block('bulleted_list', 'Design doc: [link]'),
        this.block('bulleted_list', 'Repository: [link]'),
      ],
    };
  }

  private static documentationTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Technical documentation with structured sections',
      blocks: [
        this.block('callout', 'Last updated: ' + new Date().toLocaleDateString(), { icon: '📝' }),
        this.block('paragraph', ''),
        this.block('heading_2', 'Introduction'),
        this.block('paragraph', 'What this document covers and who it is for.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Prerequisites'),
        this.block('bulleted_list', 'Requirement 1'),
        this.block('bulleted_list', 'Requirement 2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Step-by-Step Guide'),
        this.block('heading_3', 'Step 1: Setup'),
        this.block('paragraph', 'Description of step 1.'),
        this.block('code', '# Example command\necho "hello"', { language: 'bash' }),
        this.block('paragraph', ''),
        this.block('heading_3', 'Step 2: Configuration'),
        this.block('paragraph', 'Description of step 2.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Troubleshooting'),
        this.block('toggle', 'Common issue 1'),
        this.block('toggle', 'Common issue 2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'References'),
        this.block('bulleted_list', 'Reference 1: [link]'),
      ],
    };
  }

  private static bugReportTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Bug report with reproduction steps and expected behavior',
      blocks: [
        this.block('callout', 'Priority: 🔴 High | Status: Open', { icon: '🐛' }),
        this.block('paragraph', ''),
        this.block('heading_2', 'Summary'),
        this.block('paragraph', 'Brief description of the bug.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Steps to Reproduce'),
        this.block('numbered_list', 'Step 1'),
        this.block('numbered_list', 'Step 2'),
        this.block('numbered_list', 'Step 3'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Expected Behavior'),
        this.block('paragraph', 'What should happen.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Actual Behavior'),
        this.block('paragraph', 'What actually happens.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Environment'),
        this.block('bulleted_list', 'OS:'),
        this.block('bulleted_list', 'Browser:'),
        this.block('bulleted_list', 'Version:'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Screenshots / Logs'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Root Cause Analysis'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Fix'),
        this.block('to_do', 'Fix implemented'),
        this.block('to_do', 'Tests added'),
        this.block('to_do', 'Verified in staging'),
      ],
    };
  }

  private static reviewTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Review template with structured feedback sections',
      blocks: [
        this.block('heading_2', 'Summary'),
        this.block('paragraph', 'Overall assessment.'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Strengths'),
        this.block('bulleted_list', 'Strength 1'),
        this.block('bulleted_list', 'Strength 2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Areas for Improvement'),
        this.block('bulleted_list', 'Area 1'),
        this.block('bulleted_list', 'Area 2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Action Items'),
        this.block('to_do', 'Action 1'),
        this.block('to_do', 'Action 2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Rating'),
        this.block('paragraph', '⭐⭐⭐⭐☆ (4/5)'),
      ],
    };
  }

  private static decisionTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Architecture Decision Record / RFC / Proposal',
      blocks: [
        this.block('callout', 'Status: Proposed | Decision: Pending', { icon: '🏛️' }),
        this.block('paragraph', ''),
        this.block('heading_2', 'Context'),
        this.block('paragraph', 'What is the problem or situation that requires a decision?'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Decision'),
        this.block('paragraph', 'What is the decision being proposed?'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Options Considered'),
        this.block('heading_3', 'Option A'),
        this.block('bulleted_list', 'Pro: ...'),
        this.block('bulleted_list', 'Con: ...'),
        this.block('heading_3', 'Option B'),
        this.block('bulleted_list', 'Pro: ...'),
        this.block('bulleted_list', 'Con: ...'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Consequences'),
        this.block('paragraph', 'What are the implications of this decision?'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Participants'),
        this.block('bulleted_list', 'Author: @name'),
        this.block('bulleted_list', 'Reviewers: @name'),
      ],
    };
  }

  private static journalTemplate(purpose: string): GeneratedTemplate {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      title: today,
      description: 'Daily journal entry',
      blocks: [
        this.block('callout', `📅 ${today}`, { icon: '📓' }),
        this.block('paragraph', ''),
        this.block('heading_2', 'How am I feeling?'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Top 3 Priorities'),
        this.block('to_do', 'Priority 1'),
        this.block('to_do', 'Priority 2'),
        this.block('to_do', 'Priority 3'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Notes'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Wins'),
        this.block('bulleted_list', ''),
        this.block('paragraph', ''),
        this.block('heading_2', 'Reflections'),
        this.block('paragraph', ''),
      ],
    };
  }

  private static databaseTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: 'Database-ready template with suggested schema',
      blocks: [
        this.block('callout', 'Create a database below or use the + button to add a full-page database.', { icon: '📊' }),
        this.block('paragraph', ''),
        this.block('heading_2', 'Description'),
        this.block('paragraph', 'What this database tracks and how to use it.'),
      ],
      suggestedProperties: {
        name: { type: 'title', name: 'Name' },
        status: { type: 'select', name: 'Status' },
        priority: { type: 'select', name: 'Priority' },
        assignee: { type: 'text', name: 'Assignee' },
        due_date: { type: 'date', name: 'Due Date' },
        notes: { type: 'text', name: 'Notes' },
      },
    };
  }

  private static genericTemplate(purpose: string): GeneratedTemplate {
    return {
      title: this.capitalize(purpose),
      description: `Template for: ${purpose}`,
      blocks: [
        this.block('heading_2', 'Overview'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Details'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Next Steps'),
        this.block('to_do', 'Step 1'),
        this.block('to_do', 'Step 2'),
        this.block('paragraph', ''),
        this.block('heading_2', 'Notes'),
        this.block('paragraph', ''),
      ],
    };
  }

  private static block(type: BlockType, text: string, properties: Record<string, any> = {}): Block {
    return {
      id: nanoid(),
      type,
      content: [{ text }],
      properties,
      parentId: null,
      children: [],
      createdTime: Date.now(),
      lastEditedTime: Date.now(),
      createdBy: 'ai-template',
      lastEditedBy: 'ai-template',
    };
  }

  private static capitalize(text: string): string {
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
}

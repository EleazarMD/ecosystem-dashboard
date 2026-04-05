/**
 * Email Tools Module
 * 
 * Shared utility functions for email and draft actions.
 * Reusable across EmailContextMenu, DraftContextMenu, and other components.
 * 
 * @module components/email/EmailTools
 */

export type ItemType = 'email' | 'draft';

export interface EmailToolsConfig {
  graphragUrl: string;
  onSuccess?: (message: string, description?: string) => void;
  onError?: (message: string) => void;
  onComplete?: () => void;
}

export interface EmailItem {
  id: string;
  from_email?: string;
  subject?: string;
  is_sent?: boolean;
}

export interface DraftItem {
  id: string;
  email_id?: string;
  to?: string;
  subject?: string;
  status?: string;
}

/**
 * Shared email/draft action tools
 */
export class EmailTools {
  private config: EmailToolsConfig;

  constructor(config: EmailToolsConfig) {
    this.config = config;
  }

  private success(message: string, description?: string) {
    this.config.onSuccess?.(message, description);
    this.config.onComplete?.();
  }

  private error(message: string) {
    this.config.onError?.(message);
  }

  // =========================================================================
  // EMAIL ACTIONS
  // =========================================================================

  /**
   * Archive an email (keep but hide from inbox)
   */
  async archiveEmail(emailId: string): Promise<boolean> {
    try {
      await fetch(`${this.config.graphragUrl}/emails/${encodeURIComponent(emailId)}/archive`, {
        method: 'POST',
      });
      this.success('Archived', 'Email kept but hidden from inbox');
      return true;
    } catch {
      this.error('Archive failed');
      return false;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string): Promise<boolean> {
    try {
      await fetch(`${this.config.graphragUrl}/emails/${encodeURIComponent(emailId)}/read`, {
        method: 'POST',
      });
      this.success('Marked as read');
      return true;
    } catch {
      this.error('Failed to mark as read');
      return false;
    }
  }

  /**
   * Remove email from index
   */
  async removeFromIndex(emailId: string, isSent: boolean = false): Promise<boolean> {
    try {
      await fetch(`${this.config.graphragUrl}/index/email/${encodeURIComponent(emailId)}?is_sent=${isSent}`, {
        method: 'DELETE',
      });
      this.success('Removed from index');
      return true;
    } catch {
      this.error('Failed to remove');
      return false;
    }
  }

  /**
   * Add sender to noise filter
   */
  async blockSender(senderEmail: string): Promise<boolean> {
    try {
      await fetch(`${this.config.graphragUrl}/filters/noise/sender?email=${encodeURIComponent(senderEmail)}`, {
        method: 'POST',
      });
      this.success('Sender blocked', `Future emails from ${senderEmail} will be filtered`);
      return true;
    } catch {
      this.error('Failed to block sender');
      return false;
    }
  }

  /**
   * Add domain to noise filter
   */
  async blockDomain(domain: string): Promise<boolean> {
    try {
      await fetch(`${this.config.graphragUrl}/filters/noise/domain?domain=${encodeURIComponent(domain)}`, {
        method: 'POST',
      });
      this.success('Domain blocked', `All emails from @${domain} will be filtered`);
      return true;
    } catch {
      this.error('Failed to block domain');
      return false;
    }
  }

  /**
   * Block domain and cleanup existing emails
   */
  async blockDomainAndCleanup(domain: string): Promise<{ success: boolean; removedCount?: number }> {
    try {
      await fetch(`${this.config.graphragUrl}/filters/noise/domain?domain=${encodeURIComponent(domain)}`, {
        method: 'POST',
      });
      const res = await fetch(`${this.config.graphragUrl}/index/cleanup/execute?dry_run=false`, {
        method: 'POST',
      });
      const data = await res.json();
      this.success('Domain blocked & cleaned', `Removed ${data.removed_count} emails from @${domain}`);
      return { success: true, removedCount: data.removed_count };
    } catch {
      this.error('Cleanup failed');
      return { success: false };
    }
  }

  // =========================================================================
  // DRAFT ACTIONS (v2 API)
  // =========================================================================

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/drafts/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId }),
      });
      if (response.ok) {
        this.success('Draft deleted');
        return true;
      }
      this.error('Failed to delete draft');
      return false;
    } catch {
      this.error('Failed to delete draft');
      return false;
    }
  }

  /**
   * Revise a draft with new content
   */
  async reviseDraft(draftId: string, newBody: string, notes?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/drafts/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, new_body: newBody, notes }),
      });
      if (response.ok) {
        this.success('Draft revised');
        return true;
      }
      this.error('Failed to revise draft');
      return false;
    } catch {
      this.error('Failed to revise draft');
      return false;
    }
  }

  /**
   * Regenerate a draft with a different tone
   */
  async regenerateDraft(draftId: string, tone: string = 'professional'): Promise<any> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/drafts/regenerate/${draftId}?tone=${tone}`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        this.success('Draft regenerated', `Tone: ${tone}`);
        return data;
      }
      this.error('Failed to regenerate draft');
      return null;
    } catch {
      this.error('Failed to regenerate draft');
      return null;
    }
  }

  /**
   * Approve a draft (alpha mode: won't actually send)
   */
  async approveDraft(draftId: string): Promise<{ success: boolean; sent: boolean; message?: string }> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/drafts/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId }),
      });
      const data = await response.json();
      if (data.success) {
        this.success(data.sent ? 'Email sent' : 'Draft approved', data.message);
      } else {
        this.error(data.error || 'Failed to approve');
      }
      return data;
    } catch {
      this.error('Failed to approve draft');
      return { success: false, sent: false };
    }
  }

  /**
   * Add feedback to a draft for learning
   */
  async addFeedback(draftId: string, rating: number, feedback?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/drafts/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft_id: draftId, rating, feedback }),
      });
      if (response.ok) {
        this.success('Feedback recorded', 'Used for learning');
        return true;
      }
      this.error('Failed to record feedback');
      return false;
    } catch {
      this.error('Failed to record feedback');
      return false;
    }
  }

  /**
   * Get all drafts
   */
  async listDrafts(status?: string): Promise<any[]> {
    try {
      const url = status 
        ? `${this.config.graphragUrl}/v2/drafts?status=${status}`
        : `${this.config.graphragUrl}/v2/drafts`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        return data.drafts || [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get a specific draft
   */
  async getDraft(draftId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/drafts/${draftId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get v2 status (includes alpha mode info)
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.config.graphragUrl}/v2/status`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Create EmailTools instance with toast notifications
 */
export function createEmailTools(
  graphragUrl: string,
  toast: (options: { title: string; description?: string; status: 'success' | 'error' | 'warning' | 'info'; duration: number }) => void,
  onComplete?: () => void
): EmailTools {
  return new EmailTools({
    graphragUrl,
    onSuccess: (message, description) => {
      toast({
        title: message,
        description,
        status: 'success',
        duration: 2500,
      });
    },
    onError: (message) => {
      toast({
        title: message,
        status: 'error',
        duration: 3000,
      });
    },
    onComplete,
  });
}

export default EmailTools;

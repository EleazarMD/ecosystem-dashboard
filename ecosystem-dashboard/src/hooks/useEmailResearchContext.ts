/**
 * useEmailResearchContext Hook
 * 
 * Fetches comprehensive email context from Hermes Core for use in the AI Research Studio.
 * This includes email content, sender info, thread history, and AI analysis.
 */

import { useState, useEffect, useCallback } from 'react';

export interface EmailContact {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content_type: string;
  size: number;
  is_inline: boolean;
}

export interface EmailData {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_addrs?: EmailContact[];
  cc_addrs?: EmailContact[];
  date: string;
  body?: string;
  body_html?: string;
  snippet?: string;
  category?: string;
  is_read?: boolean;
  is_starred?: boolean;
  attachments?: EmailAttachment[];
}

export interface SenderReputation {
  score: number;
  tier: 'trusted' | 'known' | 'neutral' | 'low' | 'unknown';
  emails_received: number;
  emails_sent: number;
  avg_response_hours?: number;
  organization?: string;
}

export interface ThreadEmail {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  date: string;
  snippet?: string;
}

export interface ThreadContext {
  thread_id?: string;
  email_count: number;
  participants: string[];
  first_date?: string;
  last_date?: string;
  emails?: ThreadEmail[];
}

export interface EmailIntelligence {
  category: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'high' | 'medium' | 'low';
  intent: string;
  topics: string[];
  requires_response: boolean;
  key_entities: Array<{ type: string; value: string }>;
  suggested_actions?: Array<{
    action: string;
    label: string;
    description: string;
  }>;
}

export interface EmailResearchContext {
  email: EmailData | null;
  intelligence: EmailIntelligence | null;
  senderReputation: SenderReputation | null;
  threadContext: ThreadContext | null;
  isLoading: boolean;
  error: string | null;
  // Computed helpers
  contextSummary: string;
  participants: EmailContact[];
  suggestedQueries: string[];
}

interface UseEmailResearchContextOptions {
  emailId: string | null;
  autoFetch?: boolean;
}

export function useEmailResearchContext({
  emailId,
  autoFetch = true,
}: UseEmailResearchContextOptions): EmailResearchContext & {
  refetch: () => Promise<void>;
} {
  const [email, setEmail] = useState<EmailData | null>(null);
  const [intelligence, setIntelligence] = useState<EmailIntelligence | null>(null);
  const [senderReputation, setSenderReputation] = useState<SenderReputation | null>(null);
  const [threadContext, setThreadContext] = useState<ThreadContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContext = useCallback(async () => {
    if (!emailId) {
      setError('No email ID provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [emailRes, intelligenceRes, reputationRes, threadRes] = await Promise.allSettled([
        // Get email data
        fetch(`/api/hermes-proxy?path=v1/emails/${encodeURIComponent(emailId)}`),
        // Get AI intelligence/analysis
        fetch(`/api/hermes-proxy?path=v1/intelligence/analyze/${encodeURIComponent(emailId)}`),
        // Get sender reputation (need sender email first, so we'll do this after)
        Promise.resolve(null), // Placeholder
        // Get thread context
        fetch(`/api/hermes-proxy?path=v1/threads/by-email/${encodeURIComponent(emailId)}`),
      ]);

      // Process email data
      let emailData: EmailData | null = null;
      if (emailRes.status === 'fulfilled' && emailRes.value.ok) {
        const rawResponse = await emailRes.value.json();
        // Hermes Core returns {email: {email: {...}, sender: {...}, recipients: [...]}}
        // Unwrap the nested structure into flat EmailData
        const innerEmail = rawResponse?.email?.email ?? rawResponse?.email ?? rawResponse;
        const senderInfo = rawResponse?.email?.sender;
        const recipientsList = rawResponse?.email?.recipients;
        emailData = {
          ...innerEmail,
          from_email: innerEmail?.from_email || senderInfo?.email || '',
          from_name: innerEmail?.from_name || senderInfo?.name || '',
          to_addrs: recipientsList?.map((r: any) => ({ email: r.email, name: r.name })) || innerEmail?.to_addrs || [],
        } as EmailData;
        // Parse attachments JSON string if needed
        if (typeof emailData.attachments === 'string') {
          try { emailData.attachments = JSON.parse(emailData.attachments as any); } catch { emailData.attachments = []; }
        }
        setEmail(emailData);

        // Now fetch sender reputation with the sender email
        if (emailData?.from_email) {
          try {
            const repRes = await fetch(
              `/api/hermes-proxy?path=v1/contacts/reputation/${encodeURIComponent(emailData.from_email)}`
            );
            if (repRes.ok) {
              const repData = await repRes.json();
              setSenderReputation(repData);
            }
          } catch (e) {
            console.log('Could not fetch sender reputation');
          }
        }
      } else {
        console.error('Failed to fetch email data');
      }

      // Process intelligence data
      if (intelligenceRes.status === 'fulfilled' && intelligenceRes.value.ok) {
        const intData = await intelligenceRes.value.json();
        if (intData.analysis) {
          setIntelligence({
            category: intData.category || 'general',
            summary: intData.analysis.summary || '',
            sentiment: intData.analysis.sentiment || 'neutral',
            urgency: intData.analysis.urgency || 'low',
            intent: intData.analysis.intent || 'informational',
            topics: intData.analysis.topics || [],
            requires_response: intData.analysis.requires_response || false,
            key_entities: intData.analysis.key_entities || [],
            suggested_actions: intData.suggested_actions || [],
          });
        }
      }

      // Process thread context
      if (threadRes.status === 'fulfilled' && threadRes.value.ok) {
        const threadData = await threadRes.value.json();
        setThreadContext(threadData);
      }

    } catch (e: any) {
      setError(e.message || 'Failed to fetch email context');
    } finally {
      setIsLoading(false);
    }
  }, [emailId]);

  // Auto-fetch on mount or when emailId changes
  useEffect(() => {
    if (autoFetch && emailId) {
      fetchContext();
    }
  }, [autoFetch, emailId, fetchContext]);

  // Compute context summary for LLM
  const contextSummary = (() => {
    if (!email) return '';

    const parts: string[] = [];

    // Basic email info
    parts.push(`Email from ${email.from_name || email.from_email} on ${new Date(email.date).toLocaleDateString()}`);
    parts.push(`Subject: "${email.subject}"`);

    // Recipients
    if (email.to_addrs && email.to_addrs.length > 0) {
      const toNames = email.to_addrs.map(a => a.name || a.email).join(', ');
      parts.push(`To: ${toNames}`);
    }
    if (email.cc_addrs && email.cc_addrs.length > 0) {
      const ccNames = email.cc_addrs.map(a => a.name || a.email).join(', ');
      parts.push(`CC: ${ccNames}`);
    }

    // Intelligence summary
    if (intelligence) {
      parts.push(`\nAI Analysis:`);
      parts.push(`- Category: ${intelligence.category}`);
      parts.push(`- Sentiment: ${intelligence.sentiment}`);
      parts.push(`- Urgency: ${intelligence.urgency}`);
      if (intelligence.summary) {
        parts.push(`- Summary: ${intelligence.summary}`);
      }
      if (intelligence.topics.length > 0) {
        parts.push(`- Topics: ${intelligence.topics.join(', ')}`);
      }
      if (intelligence.key_entities.length > 0) {
        const entities = intelligence.key_entities.map(e => `${e.type}: ${e.value}`).join(', ');
        parts.push(`- Key Entities: ${entities}`);
      }
    }

    // Sender reputation
    if (senderReputation) {
      parts.push(`\nSender History:`);
      parts.push(`- Trust Level: ${senderReputation.tier}`);
      parts.push(`- Emails Received: ${senderReputation.emails_received}`);
      parts.push(`- Emails Sent: ${senderReputation.emails_sent}`);
      if (senderReputation.organization) {
        parts.push(`- Organization: ${senderReputation.organization}`);
      }
    }

    // Thread context
    if (threadContext && threadContext.email_count > 1) {
      parts.push(`\nThread Context:`);
      parts.push(`- ${threadContext.email_count} emails in this thread`);
      parts.push(`- Participants: ${threadContext.participants.join(', ')}`);
    }

    // Email body snippet
    if (email.body || email.snippet) {
      const content = email.body || email.snippet || '';
      const truncated = content.length > 500 ? content.substring(0, 500) + '...' : content;
      parts.push(`\nEmail Content Preview:\n${truncated}`);
    }

    return parts.join('\n');
  })();

  // Compute all participants
  const participants = (() => {
    const all: EmailContact[] = [];
    if (email?.from_email) {
      all.push({ email: email.from_email, name: email.from_name });
    }
    if (email?.to_addrs) {
      all.push(...email.to_addrs);
    }
    if (email?.cc_addrs) {
      all.push(...email.cc_addrs);
    }
    return all;
  })();

  // Generate suggested research queries
  const suggestedQueries = (() => {
    const queries: string[] = [];

    if (email && email.from_email) {
      const senderName = email.from_name || email.from_email.split('@')[0];
      const senderDomain = email.from_email.split('@')[1] || 'unknown';

      queries.push(`Who is ${senderName} and what is their role at ${senderDomain}?`);
      
      if (intelligence?.topics && intelligence.topics.length > 0) {
        queries.push(`Tell me more about ${intelligence.topics[0]} mentioned in this email`);
      }

      if (intelligence?.requires_response) {
        queries.push('What would be an appropriate response to this email?');
      }

      if (intelligence?.key_entities && intelligence.key_entities.length > 0) {
        const entity = intelligence.key_entities[0];
        queries.push(`What is ${entity.value}?`);
      }

      queries.push('What action items should I take based on this email?');
      queries.push(`What is the history of my communication with ${senderName}?`);
    }

    return queries;
  })();

  return {
    email,
    intelligence,
    senderReputation,
    threadContext,
    isLoading,
    error,
    contextSummary,
    participants,
    suggestedQueries,
    refetch: fetchContext,
  };
}

export default useEmailResearchContext;

/**
 * Email Intelligence Panel - Proactive AI Assistant
 * 
 * A modern, proactive intelligence panel that automatically surfaces
 * insights, context, and suggested actions without requiring user clicks.
 * 
 * Design Principles:
 * - Proactive: Auto-loads intelligence when email is selected
 * - Contextual: Shows sender reputation, thread context, related emails
 * - Actionable: Surfaces tasks, deadlines, and suggested responses
 * - Visual: Uses cards, progress indicators, and color-coded urgency
 * 
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  IconButton,
  Tooltip,
  useToast,
  Spinner,
  Textarea,
  Collapse,
  useDisclosure,
  Icon,
  Progress,
  Flex,
  Avatar,
  CircularProgress,
  CircularProgressLabel,
  Skeleton,
  SkeletonText,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import {
  FiMail,
  FiClock,
  FiUser,
  FiZap,
  FiMessageSquare,
  FiFileText,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiCheckCircle,
  FiSend,
  FiList,
  FiCalendar,
  FiAlertTriangle,
  FiBookmark,
  FiRefreshCw,
  FiEdit3,
  FiTarget,
  FiTrendingUp,
  FiShield,
  FiActivity,
  FiUsers,
  FiInbox,
  FiAlertCircle,
  FiThumbsUp,
  FiThumbsDown,
  FiMinus,
  FiPlay,
  FiPause,
  FiVolume2,
  FiTag,
  FiRadio,
  FiXCircle,
  FiArchive,
  FiSlash,
  FiImage,
  FiEye,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useQwenTTS } from '@/hooks/useQwenTTS';

// ============================================================================
// TYPES
// ============================================================================

interface EmailAttachment {
  filename: string;
  content_type: string;
  size: number;
  content_id?: string;
  is_inline: boolean;
}

interface EmailData {
  id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  to_addrs?: Array<{ email: string; name?: string }>;
  cc_addrs?: Array<{ email: string; name?: string }>;
  date: string;
  body?: string;
  body_html?: string;
  snippet?: string;
  is_sent?: boolean;
  has_attachments?: boolean;
  attachments?: EmailAttachment[];
}

interface CustomData {
  email?: EmailData;
  type?: string;
  emailId?: string | null;  // Direct email ID for better change detection
  onOpenDraftStudio?: (email: any) => void;  // Callback to open Email Draft Studio modal
}

interface TaskItem {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
  completed: boolean;
}

interface SenderReputation {
  score: number;
  tier: 'trusted' | 'known' | 'neutral' | 'low' | 'unknown';
  emails_received: number;
  emails_sent: number;
  avg_response_hours?: number;
  organization?: string;
  factors?: Record<string, number>;
}

interface SuggestedAction {
  action: string;
  label: string;
  description: string;
  icon: string;
  endpoint: string;
  method: string;
  variant: 'primary' | 'secondary' | 'danger';
}

interface EmailIntelligence {
  category: string;
  summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'high' | 'medium' | 'low';
  intent: string;
  topics: string[];
  requires_response: boolean;
  suggested_response_time?: string;
  key_entities: Array<{ type: string; value: string }>;
  suggested_actions?: SuggestedAction[];
  graph_insights?: {
    sender_history: string;
    relationship: string;
    email_type: string;
  };
}

interface ThreadAttachment {
  filename: string;
  content_type: string;
  size: number;
  is_inline?: boolean;
  from_email_id: string;
  from_email_subject?: string;
  from_email_date?: string;
}

interface ThreadContext {
  thread_id?: string;
  email_count: number;
  participants: string[];
  first_date?: string;
  summary?: string;
  thread_attachments?: ThreadAttachment[];
}

interface ContactRelationship {
  relationship_strength: 'strong' | 'moderate' | 'weak' | 'new';
  first_contact?: string;
  last_contact?: string;
  common_topics: string[];
  avg_response_time_hours?: number;
  communication_direction: 'inbound' | 'outbound' | 'balanced';
}

interface RelatedEmail {
  id: string;
  subject: string;
  date: string;
  snippet?: string;
}

interface Notification {
  id: string;
  type: 'urgent' | 'follow_up' | 'deadline';
  message: string;
  email_id: string;
  created_at: string;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse sender name to extract proper greeting name.
 * Handles formats like "Septimus, Joshua M.D." -> "Dr. Septimus"
 */
const parseSenderName = (fullName?: string, emailAddr?: string): string => {
  if (!fullName) {
    if (emailAddr) {
      const localPart = emailAddr.split('@')[0];
      const parts = localPart.split(/[._]/);
      return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'there';
    }
    return 'there';
  }

  let name = fullName.trim();
  let title = '';

  // Check for doctor/PhD credentials
  const titlePatterns = [
    { pattern: /\bM\.?D\.?\b/i, title: 'Dr.' },
    { pattern: /\bPh\.?D\.?\b/i, title: 'Dr.' },
    { pattern: /\bD\.?O\.?\b/i, title: 'Dr.' },
    { pattern: /^Dr\.?\s+/i, title: 'Dr.' },
  ];

  for (const { pattern, title: detectedTitle } of titlePatterns) {
    if (pattern.test(name)) {
      title = detectedTitle;
      name = name.replace(pattern, '').trim();
      break;
    }
  }

  // Remove trailing credentials
  name = name.replace(/,?\s*\b(MBA|RN|BSN|MSN|NP|PA|CPA|JD|Esq\.?)\b.*$/i, '').trim();

  let firstName = '';
  let lastName = '';

  // Check for "Last, First" format
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      lastName = parts[0];
      firstName = parts[1].split(/\s+/)[0] || '';
    }
  } else {
    // "First Last" format
    const parts = name.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts[parts.length - 1] || '';
  }

  // Clean up
  firstName = firstName.replace(/[,.\s]+$/, '');

  // Return appropriate greeting
  if (title === 'Dr.' && lastName) {
    return `Dr. ${lastName}`;
  }
  return firstName || 'there';
};

// ============================================================================
// COMPONENT
// ============================================================================

interface EmailIntelligencePanelProps {
  email?: any;
  onOpenDraftStudio?: (email: any) => void;
}

export const EmailIntelligencePanel: React.FC<EmailIntelligencePanelProps> = ({ email: emailProp, onOpenDraftStudio: onOpenDraftStudioProp }) => {
  const { customData } = useRightPanel();
  const toast = useToast();
  
  // Theme tokens
  const bgPrimary = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.elevated');
  const bgElevated = useSemanticToken('surface.raised');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textMuted = useSemanticToken('text.tertiary');
  const border = useSemanticToken('border.default');
  const accent = useSemanticToken('interactive.primary');
  
  // Use prop email if provided, otherwise fall back to context
  const data = customData as CustomData | undefined;
  const email = emailProp || data?.email;
  
  // Use prop callback if provided, otherwise fall back to context callback
  const onOpenDraftStudio = onOpenDraftStudioProp || data?.onOpenDraftStudio;
  
  // Track current email ID to prevent stale data from race conditions
  const currentEmailIdRef = useRef<string | null>(null);
  
  // Proactive intelligence state
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [intelligence, setIntelligence] = useState<EmailIntelligence | null>(null);
  const [senderReputation, setSenderReputation] = useState<SenderReputation | null>(null);
  const [senderClassification, setSenderClassification] = useState<any>(null);
  const [threadContext, setThreadContext] = useState<ThreadContext | null>(null);
  const [actionItems, setActionItems] = useState<TaskItem[]>([]);
  const [contactRelationship, setContactRelationship] = useState<ContactRelationship | null>(null);
  const [relatedEmails, setRelatedEmails] = useState<RelatedEmail[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [replyContext, setReplyContext] = useState<string | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<{
    images: Array<{
      image_id: string;
      filename: string;
      content_type: string;
      description: string;
      image_content_type: string;
      extracted_text?: string;
      visual_entities?: string[];
    }>;
    image_context: string | null;
    count: number;
  } | null>(null);
  const [llmSecurityAnalysis, setLlmSecurityAnalysis] = useState<{
    risk_level: 'high' | 'medium' | 'low';
    is_phishing: boolean;
    confidence: number;
    brand_impersonation?: {
      detected: boolean;
      claimed_brand: string | null;
      actual_domain: string;
    };
    indicators: Array<{
      type: string;
      severity: 'critical' | 'warning' | 'info';
      description: string;
    }>;
    recommendations: string[];
    summary: string;
  } | null>(null);
  
  // ML-based priority score from predictive analytics
  const [priorityScore, setPriorityScore] = useState<{
    score: number;
    level: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
    explanation: string;
    signals: {
      sender: { score: number };
      content: { score: number };
      context: { score: number };
      behavioral: { score: number };
    };
  } | null>(null);
  
  // Interactive state
  const [generatedReply, setGeneratedReply] = useState<string>('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const { isOpen: isReplyOpen, onToggle: toggleReply, onClose: closeReply } = useDisclosure();
  const { isOpen: isActionsOpen, onToggle: toggleActions } = useDisclosure({ defaultIsOpen: true });
  
  // Daily briefing state
  const [briefing, setBriefing] = useState<{
    headline: string;
    executiveSummary: string;
    actionSummary: string;
    podcastScript: string;
    generatedAt: string;
    totalEmails: number;
    needsResponse: number;
    insights: string[];
  } | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  // Real audio briefing playback state
  const [briefingPlaying, setBriefingPlaying] = useState(false);
  const [briefingGenerating, setBriefingGenerating] = useState(false);
  const [briefingAudioUrl, setBriefingAudioUrl] = useState<string | null>(null);
  const [briefingProgress, setBriefingProgress] = useState(0);
  const [briefingDuration, setBriefingDuration] = useState(0);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null);
  const { getVoiceForService } = useQwenTTS();

  // ============================================================================
  // PROACTIVE DATA FETCHING
  // ============================================================================

  const fetchAllIntelligence = useCallback(async (emailId: string, senderEmail: string) => {
    // Store the email ID we're fetching for - used to prevent stale data
    const fetchingForEmailId = emailId;
    setLoadingState('loading');
    
    try {
      // Fetch ALL intelligence in parallel - leveraging full Hermes Core capabilities
      const [
        analysisRes, 
        reputationRes, 
        threadRes, 
        tasksRes,
        relationshipRes,
        relatedRes,
        notificationsRes,
        replyContextRes,
        securityRes,
        visionRes,
        priorityRes
      ] = await Promise.allSettled([
        // Core analysis
        fetch(`/api/hermes-proxy?path=v1/intelligence/analyze/${encodeURIComponent(emailId)}`),
        // Sender trust score
        fetch(`/api/hermes-proxy?path=v1/contacts/${encodeURIComponent(senderEmail)}/reputation`),
        // Thread context
        fetch(`/api/hermes-proxy?path=v1/threads/by-email/${encodeURIComponent(emailId)}`),
        // Action items extraction
        fetch(`/api/hermes-proxy?path=v1/intelligence/extract-actions/${encodeURIComponent(emailId)}`),
        // Contact relationship history
        fetch(`/api/hermes-proxy?path=v1/contacts/${encodeURIComponent(senderEmail)}/relationship`),
        // Related emails from this sender
        fetch(`/api/hermes-proxy?path=v1/contacts/${encodeURIComponent(senderEmail)}/emails?limit=5`),
        // Urgent notifications
        fetch(`/api/hermes-proxy?path=v1/intelligence/notifications`),
        // Reply context (similar sent emails for style matching)
        fetch(`/api/hermes-proxy?path=v1/intelligence/reply/context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email_id: emailId })
        }),
        // Security/phishing analysis (LLM-based)
        fetch(`/api/hermes-proxy?path=v1/intelligence/security/${encodeURIComponent(emailId)}`),
        // Vision / image analysis
        fetch(`/api/hermes-proxy?path=v1/vision/email/${encodeURIComponent(emailId)}`),
        // ML-based priority score
        fetch(`/api/hermes-proxy?path=v1/analytics/priority/${encodeURIComponent(emailId)}`)
      ]);

      // Vision image analysis
      if (visionRes.status === 'fulfilled' && visionRes.value.ok) {
        try {
          const visionData = await visionRes.value.json();
          if (visionData.count > 0) {
            setImageAnalysis(visionData);
          }
        } catch { /* ignore */ }
      }

      // ML-based priority score
      if (priorityRes.status === 'fulfilled' && priorityRes.value.ok) {
        try {
          const priorityData = await priorityRes.value.json();
          setPriorityScore({
            score: priorityData.score,
            level: priorityData.level,
            explanation: priorityData.explanation,
            signals: priorityData.signals,
          });
        } catch { /* ignore */ }
      }

      // Check if user has switched to a different email while we were fetching
      // If so, discard these results to prevent stale data
      if (currentEmailIdRef.current !== fetchingForEmailId) {
        console.log(`[EmailIntelligence] Discarding stale results for ${fetchingForEmailId}, current is ${currentEmailIdRef.current}`);
        return;
      }

      // Process graph analysis for sender classification and graph insights
      let graphInsights = null;
      if (analysisRes.status === 'fulfilled' && analysisRes.value.ok) {
        const data = await analysisRes.value.json();
        
        // Store sender classification from graph
        if (data.sender_classification) {
          setSenderClassification(data.sender_classification);
        }
        
        // Store graph insights for later use
        if (data.analysis?.graph_insights) {
          graphInsights = data.analysis.graph_insights;
        }
      }
      
      // Always use analyze-content with full email body for better analysis
      // The graph may have incomplete body text, so we send the full body from dashboard
      let analysisProcessed = false;
      if (email) {
        try {
          const contentRes = await fetch('/api/hermes-proxy?path=v1/intelligence/analyze-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: email.subject || '',
              body: email.body || email.body_html || email.snippet || '',
              from_email: senderEmail,
              from_name: email.from_name || '',
            }),
          });
          
          if (contentRes.ok) {
            const data = await contentRes.json();
            if (data.analysis) {
              setIntelligence({
                category: data.category || 'general',
                summary: data.analysis.summary || '',
                sentiment: data.analysis.sentiment || 'neutral',
                urgency: data.analysis.urgency || 'low',
                intent: data.analysis.intent || 'informational',
                topics: data.analysis.topics || [],
                requires_response: data.analysis.requires_response || false,
                suggested_response_time: data.analysis.suggested_response_time,
                key_entities: data.analysis.key_entities || [],
                suggested_actions: data.suggested_actions || [],
                graph_insights: graphInsights,
              });
              analysisProcessed = true;
            }
          }
        } catch (e) {
          console.log('Content analysis failed, using fallback');
        }
      }
      
      // Fallback: Generate basic summary from email content if analyze-content failed
      if (!analysisProcessed && email) {
        const snippet = email.body || email.snippet || '';
        const basicSummary = snippet.length > 150 
          ? snippet.substring(0, 150) + '...' 
          : snippet || `Email from ${email.from_name || senderEmail} about "${email.subject || 'No Subject'}"`;
        
        setIntelligence({
          category: 'general',
          summary: basicSummary,
          sentiment: 'neutral',
          urgency: 'low',
          intent: 'informational',
          topics: [],
          requires_response: false,
          suggested_response_time: undefined,
          key_entities: [],
          graph_insights: graphInsights,
        });
      }

      // Process sender reputation
      if (reputationRes.status === 'fulfilled' && reputationRes.value.ok) {
        const data = await reputationRes.value.json();
        setSenderReputation({
          score: data.score || 50,
          tier: data.tier || 'neutral',
          emails_received: data.emails_received || 0,
          emails_sent: data.emails_sent || 0,
          avg_response_hours: data.avg_response_hours,
          organization: data.organization,
          factors: data.factors,
        });
      }

      // Process thread context (including thread attachments)
      if (threadRes.status === 'fulfilled' && threadRes.value.ok) {
        const data = await threadRes.value.json();
        setThreadContext({
          thread_id: data.thread_id,
          email_count: data.count || 1,
          participants: data.participants || [],
          summary: data.summary,
          thread_attachments: data.thread_attachments || [],
        });
      }

      // Process action items
      if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
        const data = await tasksRes.value.json();
        if (data.tasks && data.tasks.length > 0) {
          setActionItems(data.tasks.map((t: any, i: number) => ({
            id: String(i),
            text: t.task || t.text || t,
            priority: t.priority || 'medium',
            due_date: t.due_date,
            completed: false,
          })));
        }
      }

      // Process contact relationship
      if (relationshipRes.status === 'fulfilled' && relationshipRes.value.ok) {
        const data = await relationshipRes.value.json();
        setContactRelationship({
          relationship_strength: data.relationship_strength || 'new',
          first_contact: data.first_contact,
          last_contact: data.last_contact,
          common_topics: data.common_topics || [],
          avg_response_time_hours: data.avg_response_time_hours,
          communication_direction: data.communication_direction || 'balanced',
        });
      }

      // Process related emails
      if (relatedRes.status === 'fulfilled' && relatedRes.value.ok) {
        const data = await relatedRes.value.json();
        if (data.emails && data.emails.length > 0) {
          setRelatedEmails(data.emails.slice(0, 5).map((e: any) => ({
            id: e.id,
            subject: e.subject,
            date: e.date,
            snippet: e.snippet || e.body_preview,
          })));
        }
      }

      // Process notifications for this email
      if (notificationsRes.status === 'fulfilled' && notificationsRes.value.ok) {
        const data = await notificationsRes.value.json();
        if (data.notifications) {
          const relevant = data.notifications.filter((n: any) => n.email_id === emailId);
          setNotifications(relevant);
        }
      }

      // Process reply context
      if (replyContextRes.status === 'fulfilled' && replyContextRes.value.ok) {
        const data = await replyContextRes.value.json();
        if (data.context || data.similar_replies) {
          setReplyContext(data.context || `Found ${data.similar_replies?.length || 0} similar sent emails for style matching`);
        }
      }

      // Process LLM security analysis
      if (securityRes.status === 'fulfilled' && securityRes.value.ok) {
        const data = await securityRes.value.json();
        if (data.analysis) {
          setLlmSecurityAnalysis(data.analysis);
        }
      }

      setLoadingState('success');
    } catch (error) {
      console.error('Failed to fetch intelligence:', error);
      setLoadingState('error');
    }
  }, []);

  // Auto-fetch when email changes
  // Component is re-mounted via key prop when email changes, so this runs on mount
  useEffect(() => {
    const emailId = email?.id;
    const fromEmail = email?.from_email;
    
    if (emailId && fromEmail) {
      // Skip if we're already viewing this email (prevents duplicate fetches)
      if (currentEmailIdRef.current === emailId) {
        return;
      }
      
      // Update the ref to track which email we're viewing
      currentEmailIdRef.current = emailId;
      
      // Reset all state and fetch new intelligence
      setIntelligence(null);
      setSenderReputation(null);
      setSenderClassification(null);
      setThreadContext(null);
      setActionItems([]);
      setContactRelationship(null);
      setRelatedEmails([]);
      setNotifications([]);
      setReplyContext(null);
      setLlmSecurityAnalysis(null);
      setImageAnalysis(null);
      setPriorityScore(null);
      setGeneratedReply('');
      closeReply();
      setLoadingState('loading');
      fetchAllIntelligence(emailId, fromEmail);
    } else {
      // Clear when no email is selected
      currentEmailIdRef.current = null;
      setIntelligence(null);
      setSenderReputation(null);
      setSenderClassification(null);
      setThreadContext(null);
      setActionItems([]);
      setContactRelationship(null);
      setRelatedEmails([]);
      setNotifications([]);
      setReplyContext(null);
      setLlmSecurityAnalysis(null);
      setPriorityScore(null);
      setGeneratedReply('');
      closeReply();
      setLoadingState('idle');
    }
  }, [email?.id, email?.from_email, fetchAllIntelligence, closeReply]);

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  // Fetch daily briefing on mount
  const fetchDailyBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/latest&account=all');
      if (response.ok) {
        const data = await response.json();
        const b = data.briefing || data;
        const metrics = b.metrics || data.metrics || {};
        setBriefing({
          headline: b.headline || data.headline || '',
          executiveSummary: b.executive_summary || '',
          actionSummary: b.action_summary || '',
          podcastScript: b.podcast_script || '',
          generatedAt: b.generated_at || data.generated_at || '',
          totalEmails: metrics.total_emails || 0,
          needsResponse: metrics.needs_response || 0,
          insights: b.insights || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch briefing:', error);
    } finally {
      setBriefingLoading(false);
    }
  }, []);

  // Fetch briefing on mount
  useEffect(() => {
    fetchDailyBriefing();
  }, [fetchDailyBriefing]);

  // Audio briefing helpers
  const formatBriefingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setupBriefingAudioListeners = useCallback((audio: HTMLAudioElement) => {
    audio.onloadedmetadata = () => setBriefingDuration(audio.duration);
    audio.ontimeupdate = () => {
      if (audio.duration > 0) setBriefingProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.onended = () => { setBriefingPlaying(false); setBriefingProgress(0); };
    audio.onerror = () => { setBriefingPlaying(false); toast({ title: 'Audio playback error', status: 'error', duration: 2000 }); };
  }, [toast]);

  const handleBriefingPlayPause = useCallback(async () => {
    if (briefingPlaying) {
      if (briefingAudioRef.current) {
        briefingAudioRef.current.pause();
        briefingAudioRef.current.currentTime = 0;
      }
      setBriefingPlaying(false);
      setBriefingProgress(0);
      return;
    }

    const textToSpeak = briefing?.podcastScript || briefing?.executiveSummary;
    if (!textToSpeak) {
      toast({ title: 'No briefing content available', status: 'info', duration: 2000 });
      return;
    }

    // If audio already loaded, just play
    if (briefingAudioUrl && briefingAudioRef.current) {
      briefingAudioRef.current.play();
      setBriefingPlaying(true);
      return;
    }

    setBriefingGenerating(true);
    try {
      // Check if audio exists on server
      const statusRes = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio/status&account=all');
      const audioStatus = await statusRes.json();

      if (audioStatus.has_audio) {
        const audioRes = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all', { method: 'POST' });
        if (audioRes.ok) {
          const blob = await audioRes.blob();
          const url = URL.createObjectURL(blob);
          setBriefingAudioUrl(url);
          const audio = new Audio(url);
          briefingAudioRef.current = audio;
          setupBriefingAudioListeners(audio);
          await audio.play();
          setBriefingPlaying(true);
          setBriefingGenerating(false);
          return;
        }
      }

      // Generate new audio
      toast({ title: 'Generating Audio', description: 'Using Qwen3 TTS...', status: 'info', duration: 3000 });
      const voiceId = getVoiceForService('daily-news');
      const response = await fetch(`/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all&voice_id=${voiceId}`, { method: 'POST' });

      if (!response.ok) {
        const directRes = await fetch('/api/ai-gateway/qwen-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToSpeak, mode: 'clone-from-library', voice_id: voiceId, language: 'Auto', temperature: 0.4, top_p: 0.85 }),
        });
        if (!directRes.ok) throw new Error('TTS generation failed');
        const blob = await directRes.blob();
        const url = URL.createObjectURL(blob);
        setBriefingAudioUrl(url);
        const audio = new Audio(url);
        briefingAudioRef.current = audio;
        setupBriefingAudioListeners(audio);
        await audio.play();
        setBriefingPlaying(true);
        setBriefingGenerating(false);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setBriefingAudioUrl(url);
      const audio = new Audio(url);
      briefingAudioRef.current = audio;
      setupBriefingAudioListeners(audio);
      await audio.play();
      setBriefingPlaying(true);
    } catch (error) {
      console.error('Audio generation failed:', error);
      toast({ title: 'Audio Generation Failed', status: 'error', duration: 3000 });
    } finally {
      setBriefingGenerating(false);
    }
  }, [briefing, briefingPlaying, briefingAudioUrl, getVoiceForService, setupBriefingAudioListeners, toast]);

  const handleRefreshBriefing = useCallback(async () => {
    setRefreshingBriefing(true);
    try {
      toast({ title: 'Generating Fresh Briefing', description: 'Analyzing emails...', status: 'info', duration: 5000 });
      await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/generate&account=all&period_hours=24&include_podcast=true', { method: 'POST' });
      await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all&force_regenerate=true', { method: 'POST' });
      await fetchDailyBriefing();
      if (briefingAudioUrl) URL.revokeObjectURL(briefingAudioUrl);
      setBriefingAudioUrl(null);
      setBriefingProgress(0);
      setBriefingPlaying(false);
      toast({ title: 'Briefing Ready', status: 'success', duration: 3000 });
    } catch (error) {
      toast({ title: 'Refresh Failed', status: 'error', duration: 3000 });
    } finally {
      setRefreshingBriefing(false);
    }
  }, [fetchDailyBriefing, toast, briefingAudioUrl]);

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (briefingAudioUrl) URL.revokeObjectURL(briefingAudioUrl);
    };
  }, [briefingAudioUrl]);

  const handleRefresh = async () => {
    if (!email?.id || !email?.from_email) return;
    setIsRefreshing(true);
    await fetchAllIntelligence(email.id, email.from_email);
    setIsRefreshing(false);
    toast({ title: 'Intelligence refreshed', status: 'success', duration: 2000 });
  };

  const handleGenerateReply = async () => {
    if (!email) return;
    
    // If onOpenDraftStudio callback is provided, use the full Email Draft Studio modal
    if (onOpenDraftStudio) {
      onOpenDraftStudio(email);
      return;
    }
    
    // Fallback: generate inline reply (legacy behavior)
    setIsGeneratingReply(true);
    
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/intelligence/generate-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: email.id,
          tone: 'professional',
          context: intelligence?.summary,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedReply(data.reply || data.draft || '');
      } else {
        // Fallback - parse sender name properly
        const greetingName = parseSenderName(email.from_name, email.from_email);
        setGeneratedReply(`Hi ${greetingName},\n\nThank you for your email regarding "${email.subject}".\n\nI will review this and get back to you shortly.\n\nBest regards`);
      }
      
      if (!isReplyOpen) toggleReply();
      toast({ title: 'Reply draft generated', status: 'success', duration: 2000 });
    } catch (error) {
      const greetingName = parseSenderName(email.from_name, email.from_email);
      setGeneratedReply(`Hi ${greetingName},\n\nThank you for your email.\n\nBest regards`);
      if (!isReplyOpen) toggleReply();
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, status: 'success', duration: 1500 });
  };

  const executeSuggestedAction = async (action: SuggestedAction) => {
    try {
      toast({ title: `Executing ${action.label}...`, status: 'info', duration: 2000 });
      
      const response = await fetch(
        `/api/hermes-proxy?path=${action.endpoint.replace('/v1/', 'v1/')}`,
        { method: action.method }
      );
      
      if (response.ok) {
        toast({
          title: 'Success',
          description: `${action.label} completed`,
          status: 'success',
          duration: 3000,
        });
        
        // Refresh intelligence data after action
        if (email) {
          fetchIntelligence(email);
        }
      } else {
        const error = await response.json();
        toast({
          title: 'Failed',
          description: error.detail || `Could not ${action.label.toLowerCase()}`,
          status: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Could not execute ${action.label.toLowerCase()}`,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const sendToWorkspace = async (filename: string, attachmentIndex: number, overrideEmailId?: string) => {
    const targetEmailId = overrideEmailId || email?.id;
    if (!targetEmailId) return;
    
    try {
      toast({ title: 'Extracting attachment from Mac...', status: 'info', duration: 3000 });
      
      const params = new URLSearchParams({
        email_id: targetEmailId,
        filename: filename,
        attachment_index: attachmentIndex.toString(),
      });
      
      const response = await fetch(
        `/api/hermes-proxy?path=v1/attachments/send-to-workspace&${params}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Sent to Workspace',
          description: (
            <Box>
              <Text>{filename} is ready for analysis ({formatFileSize(data.size)})</Text>
              <Button
                size="xs"
                colorScheme="blue"
                mt={2}
                onClick={() => window.open('/workspace', '_blank')}
              >
                Open Workspace →
              </Button>
            </Box>
          ),
          status: 'success',
          duration: 6000,
          isClosable: true,
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Failed to extract',
          description: error.detail || 'Could not retrieve attachment from Mac',
          status: 'error',
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not connect to Hermes Core',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const analyzeAttachment = async (filename: string, attachmentIndex: number, overrideEmailId?: string) => {
    const targetEmailId = overrideEmailId || email?.id;
    if (!targetEmailId) return;
    
    try {
      // First send to workspace
      toast({ title: 'Extracting and analyzing...', status: 'info', duration: 5000 });
      
      const sendParams = new URLSearchParams({
        email_id: targetEmailId,
        filename: filename,
        attachment_index: attachmentIndex.toString(),
      });
      
      const sendResponse = await fetch(
        `/api/hermes-proxy?path=v1/attachments/send-to-workspace&${sendParams}`,
        { method: 'POST' }
      );
      
      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        toast({
          title: 'Failed to extract',
          description: error.detail || 'Could not retrieve attachment',
          status: 'error',
          duration: 4000,
        });
        return;
      }
      
      const sendData = await sendResponse.json();
      const workspaceFilename = sendData.workspace_path?.split('/').pop() || filename;
      
      // Now analyze
      const analyzeParams = new URLSearchParams({
        filename: workspaceFilename,
        question: `Analyze this ${filename} file. Extract key insights, data points, charts, tables, or any actionable information.`,
      });
      
      const analyzeResponse = await fetch(
        `/api/hermes-proxy?path=v1/attachments/analyze&${analyzeParams}`,
        { method: 'POST' }
      );
      
      if (analyzeResponse.ok) {
        const analysisData = await analyzeResponse.json();
        // Show analysis in a toast or modal
        toast({
          title: 'Analysis Complete',
          description: analysisData.summary || 'Analysis ready',
          status: 'success',
          duration: 6000,
        });
        // Could also set state to show analysis in panel
      } else {
        toast({
          title: 'Analysis failed',
          description: 'Could not analyze file',
          status: 'warning',
          duration: 4000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Analysis failed',
        status: 'error',
        duration: 3000,
      });
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getSenderName = () => email?.from_name || email?.from_email?.split('@')[0] || 'Unknown';
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      default: return 'gray';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return FiThumbsUp;
      case 'negative': return FiThumbsDown;
      default: return FiMinus;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'green.500';
      case 'negative': return 'red.500';
      default: return 'gray.500';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'trusted': return 'green';
      case 'known': return 'blue';
      case 'neutral': return 'gray';
      case 'low': return 'orange';
      default: return 'gray';
    }
  };

  const formatResponseTime = (hours?: number) => {
    if (!hours) return null;
    if (hours < 1) return `${Math.round(hours * 60)}m avg`;
    if (hours < 24) return `${Math.round(hours)}h avg`;
    return `${Math.round(hours / 24)}d avg`;
  };

  // ============================================================================
  // SECURITY / PHISHING DETECTION
  // ============================================================================

  interface SecurityAnalysis {
    riskLevel: 'high' | 'medium' | 'low';
    warnings: string[];
    indicators: {
      type: string;
      severity: 'critical' | 'warning' | 'info';
      message: string;
    }[];
    domainInfo: {
      domain: string;
      isKnownBrand: boolean;
      isSuspicious: boolean;
      brandMismatch?: string;
    };
  }

  const analyzeEmailSecurity = (): SecurityAnalysis | null => {
    if (!email?.from_email) return null;

    const warnings: string[] = [];
    const indicators: SecurityAnalysis['indicators'] = [];
    const fromEmail = email.from_email.toLowerCase();
    const fromName = (email.from_name || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.body || email.snippet || '').toLowerCase();
    const domain = fromEmail.split('@')[1] || '';

    // Known brand domains mapping
    const brandDomains: Record<string, string[]> = {
      'robinhood': ['robinhood.com'],
      'paypal': ['paypal.com', 'paypal.co.uk'],
      'amazon': ['amazon.com', 'amazon.co.uk', 'amazon.de'],
      'apple': ['apple.com', 'icloud.com'],
      'google': ['google.com', 'gmail.com'],
      'microsoft': ['microsoft.com', 'outlook.com', 'hotmail.com'],
      'netflix': ['netflix.com'],
      'chase': ['chase.com'],
      'bank of america': ['bankofamerica.com', 'bofa.com'],
      'wells fargo': ['wellsfargo.com'],
      'venmo': ['venmo.com'],
      'coinbase': ['coinbase.com'],
      'binance': ['binance.com'],
      'facebook': ['facebook.com', 'fb.com', 'meta.com'],
      'instagram': ['instagram.com'],
      'twitter': ['twitter.com', 'x.com'],
      'linkedin': ['linkedin.com'],
      'dropbox': ['dropbox.com'],
      'spotify': ['spotify.com'],
      'uber': ['uber.com'],
      'lyft': ['lyft.com'],
    };

    // Check for brand impersonation
    let detectedBrand: string | null = null;
    let expectedDomains: string[] = [];
    
    for (const [brand, domains] of Object.entries(brandDomains)) {
      if (fromName.includes(brand) || subject.includes(brand)) {
        detectedBrand = brand;
        expectedDomains = domains;
        break;
      }
    }

    const domainInfo: SecurityAnalysis['domainInfo'] = {
      domain,
      isKnownBrand: false,
      isSuspicious: false,
    };

    // Brand impersonation check
    if (detectedBrand && expectedDomains.length > 0) {
      const isLegitDomain = expectedDomains.some(d => domain === d || domain.endsWith('.' + d));
      domainInfo.isKnownBrand = isLegitDomain;
      
      if (!isLegitDomain) {
        domainInfo.isSuspicious = true;
        domainInfo.brandMismatch = detectedBrand;
        indicators.push({
          type: 'brand_impersonation',
          severity: 'critical',
          message: `Claims to be ${detectedBrand.charAt(0).toUpperCase() + detectedBrand.slice(1)} but sent from ${domain}`,
        });
        warnings.push(`Sender claims to be ${detectedBrand} but email is from ${domain}`);
      }
    }

    // Suspicious domain patterns
    const suspiciousDomainPatterns = [
      /\d{3,}/, // Multiple numbers in domain
      /-{2,}/, // Multiple hyphens
      /\.(xyz|top|club|work|click|link|gq|ml|cf|tk|ga)$/i, // Suspicious TLDs
      /secure|verify|update|confirm|account|login|signin/i, // Phishing keywords in domain
    ];

    for (const pattern of suspiciousDomainPatterns) {
      if (pattern.test(domain)) {
        domainInfo.isSuspicious = true;
        indicators.push({
          type: 'suspicious_domain',
          severity: 'warning',
          message: `Domain "${domain}" has suspicious characteristics`,
        });
        break;
      }
    }

    // Urgency/fear tactics in subject or body
    const urgencyPhrases = [
      'verify your account', 'confirm your identity', 'unusual activity',
      'account suspended', 'action required', 'immediate action',
      'your account will be', 'unauthorized access', 'security alert',
      'verify immediately', 'click here to verify', 'update your information',
      'confirm your details', 'suspicious activity', 'account locked',
      'password expired', 'billing problem', 'payment failed',
    ];

    const foundUrgency = urgencyPhrases.filter(phrase => 
      subject.includes(phrase) || body.includes(phrase)
    );

    if (foundUrgency.length > 0) {
      indicators.push({
        type: 'urgency_tactics',
        severity: 'warning',
        message: `Uses urgency/fear language: "${foundUrgency[0]}"`,
      });
    }

    // Check for suspicious links in body
    const linkPatterns = [
      /click here/i,
      /verify now/i,
      /confirm now/i,
      /update now/i,
      /login here/i,
    ];

    if (linkPatterns.some(p => p.test(body))) {
      indicators.push({
        type: 'suspicious_links',
        severity: 'info',
        message: 'Contains action links - verify URLs before clicking',
      });
    }

    // New/unknown sender check
    if (senderReputation?.tier === 'unknown' || senderReputation?.emails_received === 0) {
      indicators.push({
        type: 'unknown_sender',
        severity: 'info',
        message: 'First-time sender - no previous communication history',
      });
    }

    // Calculate risk level
    const criticalCount = indicators.filter(i => i.severity === 'critical').length;
    const warningCount = indicators.filter(i => i.severity === 'warning').length;

    let riskLevel: 'high' | 'medium' | 'low' = 'low';
    if (criticalCount > 0 || warningCount >= 2) {
      riskLevel = 'high';
    } else if (warningCount > 0) {
      riskLevel = 'medium';
    }

    if (indicators.length === 0) return null;

    return { riskLevel, warnings, indicators, domainInfo };
  };

  const securityAnalysis = analyzeEmailSecurity();

  // ============================================================================
  // RENDER: EMPTY STATE
  // ============================================================================

  if (!email) {
    return (
      <Box h="100%" overflowY="auto" className="custom-scrollbar">
        <Box px={4} py={3}>
          <VStack spacing={3} align="stretch">

            {/* ── AUDIO BRIEFING PLAYER ── */}
            <Box
              p={4}
              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              borderRadius="12px"
              color="white"
            >
              <HStack spacing={3} mb={3}>
                <IconButton
                  aria-label={briefingPlaying ? 'Stop' : briefingGenerating ? 'Generating...' : 'Play'}
                  icon={briefingGenerating ?
                    <Spinner size="sm" color="white" /> :
                    briefingPlaying ?
                      <Icon as={FiPause} boxSize={5} /> :
                      <Icon as={FiPlay} boxSize={5} />
                  }
                  size="md"
                  borderRadius="full"
                  bg="whiteAlpha.200"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  onClick={handleBriefingPlayPause}
                  isDisabled={briefingGenerating}
                />
                <Box flex={1}>
                  <Text fontSize="13px" fontWeight="600">
                    Daily Audio Briefing
                  </Text>
                  <Text fontSize="11px" opacity={0.8}>
                    {briefingGenerating
                      ? 'Generating with Qwen3 TTS...'
                      : briefingPlaying
                        ? 'Playing...'
                        : briefingAudioUrl
                          ? `${formatBriefingTime(briefingDuration)} ready`
                          : 'Click to generate & play'}
                  </Text>
                </Box>
                <Tooltip label="Generate fresh briefing">
                  <IconButton
                    aria-label="Refresh briefing"
                    icon={<Icon as={FiRefreshCw} boxSize={4} />}
                    size="sm"
                    variant="ghost"
                    color="white"
                    _hover={{ bg: 'whiteAlpha.200' }}
                    onClick={handleRefreshBriefing}
                    isLoading={refreshingBriefing}
                  />
                </Tooltip>
              </HStack>

              <Progress
                value={briefingProgress}
                size="sm"
                colorScheme="whiteAlpha"
                bg="whiteAlpha.200"
                borderRadius="full"
                isIndeterminate={briefingGenerating}
              />

              <HStack justify="space-between" mt={1.5} fontSize="10px" opacity={0.7}>
                <Text>{formatBriefingTime((briefingProgress / 100) * briefingDuration)}</Text>
                <Text>{briefingDuration > 0 ? formatBriefingTime(briefingDuration) : '--:--'}</Text>
              </HStack>
            </Box>

            {/* ── BRIEFING SUMMARY ── */}
            {briefingLoading ? (
              <VStack spacing={2} align="stretch">
                <Skeleton height="40px" borderRadius="md" />
                <SkeletonText noOfLines={2} spacing={2} />
              </VStack>
            ) : briefing ? (
              <>
                <Box p={3} bg={bgSecondary} borderRadius="md" borderLeft="3px solid" borderLeftColor="purple.400">
                  <Text fontSize="12px" fontWeight="600" color={textPrimary} mb={1} noOfLines={2}>
                    {briefing.headline}
                  </Text>
                  <Text fontSize="11px" color={textSecondary} noOfLines={3}>
                    {briefing.executiveSummary}
                  </Text>
                  <HStack spacing={3} mt={2} fontSize="10px" color={textSecondary}>
                    <Text>{briefing.totalEmails} emails</Text>
                    {briefing.needsResponse > 0 && (
                      <Badge colorScheme="orange" fontSize="9px">{briefing.needsResponse} need response</Badge>
                    )}
                  </HStack>
                  {briefing.generatedAt && (
                    <Text fontSize="9px" color={textMuted} mt={1} opacity={0.7}>
                      {new Date(briefing.generatedAt).toLocaleString()}
                    </Text>
                  )}
                </Box>

                {/* Action Summary */}
                {briefing.actionSummary && (
                  <Box p={2} bg={bgSecondary} borderRadius="md">
                    <Text fontSize="11px" color={textSecondary}>
                      {briefing.actionSummary}
                    </Text>
                  </Box>
                )}

                {/* Insights */}
                {briefing.insights && briefing.insights.length > 0 && (
                  <VStack align="stretch" spacing={2}>
                    <Text fontSize="10px" fontWeight="600" color={textMuted} textTransform="uppercase">
                      Key Insights
                    </Text>
                    {briefing.insights.slice(0, 3).map((insight, i) => (
                      <HStack key={i} spacing={2} align="start">
                        <Text fontSize="11px" color={textSecondary} lineHeight="1.4">
                          {insight}
                        </Text>
                      </HStack>
                    ))}
                  </VStack>
                )}

                {/* View Full Dashboard Link */}
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="purple"
                  fontSize="11px"
                  onClick={() => window.location.href = '/email-intelligence'}
                  rightIcon={<Icon as={FiTrendingUp} boxSize={3} />}
                >
                  View Full Intelligence Dashboard
                </Button>
              </>
            ) : (
              <Box textAlign="center" py={4}>
                <Icon as={FiZap} boxSize={8} color={textMuted} mb={2} opacity={0.3} />
                <Text fontSize="12px" color={textMuted}>
                  No briefing available
                </Text>
              </Box>
            )}

            {/* Prompt to select email */}
            <Box textAlign="center" pt={2}>
              <Text fontSize="11px" color={textMuted}>
                Select an email to see AI-powered insights
              </Text>
            </Box>
          </VStack>
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // RENDER: LOADING STATE (only show if no existing content)
  // ============================================================================

  if (loadingState === 'loading' && !intelligence) {
    return (
      <Box p={4}>
        <HStack mb={4} justify="space-between">
          <Skeleton height="20px" width="120px" />
          <Skeleton height="24px" width="24px" borderRadius="full" />
        </HStack>
        <VStack spacing={4} align="stretch">
          <Skeleton height="80px" borderRadius="md" />
          <Skeleton height="60px" borderRadius="md" />
          <SkeletonText noOfLines={3} spacing={2} />
          <Skeleton height="100px" borderRadius="md" />
        </VStack>
      </Box>
    );
  }

  // ============================================================================
  // RENDER: MAIN PANEL
  // ============================================================================

  return (
    <Box h="100%" overflowY="auto" className="custom-scrollbar">
      {/* Header with Priority Score */}
      <Box 
        px={4} 
        py={3} 
        borderBottom="1px solid" 
        borderColor={border}
        bg={priorityScore?.level === 'critical' || priorityScore?.level === 'high' ? 'red.50' : bgPrimary}
        _dark={{ bg: priorityScore?.level === 'critical' || priorityScore?.level === 'high' ? 'red.900' : bgPrimary }}
      >
        <HStack justify="space-between" mb={2}>
          <HStack spacing={2}>
            {(priorityScore?.level === 'critical' || priorityScore?.level === 'high') && (
              <Icon as={FiAlertCircle} color="red.500" boxSize={4} />
            )}
            {priorityScore ? (
              <Tooltip label={priorityScore.explanation}>
                <Badge 
                  colorScheme={
                    priorityScore.level === 'critical' ? 'red' :
                    priorityScore.level === 'high' ? 'orange' :
                    priorityScore.level === 'medium' ? 'yellow' :
                    priorityScore.level === 'low' ? 'gray' : 'gray'
                  }
                  fontSize="10px"
                  textTransform="uppercase"
                >
                  {priorityScore.level} ({priorityScore.score})
                </Badge>
              </Tooltip>
            ) : (
              <Badge 
                colorScheme={getUrgencyColor(intelligence?.urgency || 'low')}
                fontSize="10px"
                textTransform="uppercase"
              >
                {intelligence?.urgency || 'Normal'} Priority
              </Badge>
            )}
            {intelligence?.requires_response && (
              <Badge colorScheme="blue" fontSize="10px">
                Response Needed
              </Badge>
            )}
          </HStack>
          <Tooltip label="Refresh intelligence">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="xs"
              variant="ghost"
              isLoading={isRefreshing}
              onClick={handleRefresh}
            />
          </Tooltip>
        </HStack>
        
        <Text fontSize="13px" fontWeight="600" color={textPrimary} noOfLines={2}>
          {email.subject || '(No Subject)'}
        </Text>
        <HStack spacing={2} fontSize="11px" color={textSecondary} mt={1}>
          <Text>{getSenderName()}</Text>
          <Text>•</Text>
          <Text>{new Date(email.date).toLocaleDateString()}</Text>
          {senderClassification && (
            <>
              <Text>•</Text>
              <Badge 
                size="sm" 
                variant="subtle" 
                colorScheme={senderClassification.display?.color || 'gray'}
                fontSize="10px"
              >
                {senderClassification.display?.icon} {senderClassification.display?.label || senderClassification.category}
              </Badge>
            </>
          )}
        </HStack>
        
        {/* Full Sender Email - Always show */}
        <Box mt={2} p={2} bg={bgSecondary} borderRadius="md">
          <HStack spacing={2} fontSize="11px">
            <Icon as={FiMail} boxSize={3} color={textMuted} />
            <Text color={textSecondary} fontFamily="mono" fontSize="10px">
              {email.from_email}
            </Text>
            <IconButton
              aria-label="Copy email"
              icon={<FiCopy />}
              size="xs"
              variant="ghost"
              onClick={() => copyToClipboard(email.from_email, 'Email address')}
            />
          </HStack>
          {email.from_email && (
            <HStack spacing={2} fontSize="10px" mt={1}>
              <Text color={textMuted}>Domain:</Text>
              <Text color={securityAnalysis?.domainInfo?.isSuspicious ? 'red.500' : textSecondary} fontFamily="mono">
                {email.from_email.split('@')[1]}
              </Text>
              {securityAnalysis?.domainInfo?.isKnownBrand && (
                <Badge colorScheme="green" fontSize="9px">Verified</Badge>
              )}
              {securityAnalysis?.domainInfo?.isSuspicious && (
                <Badge colorScheme="red" fontSize="9px">Suspicious</Badge>
              )}
            </HStack>
          )}
        </Box>
      </Box>

      {/* Security Warning Section - Uses LLM analysis if available, falls back to client-side */}
      {(() => {
        // Determine which analysis to use (LLM preferred)
        const effectiveRiskLevel = llmSecurityAnalysis?.risk_level || securityAnalysis?.riskLevel || 'low';
        const isPhishing = llmSecurityAnalysis?.is_phishing || false;
        const effectiveIndicators = llmSecurityAnalysis?.indicators || securityAnalysis?.indicators || [];
        const llmSummary = llmSecurityAnalysis?.summary;
        const recommendations = llmSecurityAnalysis?.recommendations || [];
        const confidence = llmSecurityAnalysis?.confidence;
        
        if (effectiveRiskLevel === 'low' && !isPhishing) return null;
        
        return (
          <Box 
            px={4} 
            py={3} 
            borderBottom="1px solid" 
            borderColor={border}
            bg={effectiveRiskLevel === 'high' || isPhishing ? 'red.50' : 'orange.50'}
            _dark={{ bg: effectiveRiskLevel === 'high' || isPhishing ? 'red.900' : 'orange.900' }}
          >
            <HStack spacing={2} mb={2}>
              <Icon 
                as={FiAlertTriangle} 
                color={effectiveRiskLevel === 'high' || isPhishing ? 'red.500' : 'orange.500'} 
                boxSize={5} 
              />
              <Text 
                fontSize="12px" 
                fontWeight="700" 
                color={effectiveRiskLevel === 'high' || isPhishing ? 'red.600' : 'orange.600'}
                _dark={{ color: effectiveRiskLevel === 'high' || isPhishing ? 'red.300' : 'orange.300' }}
              >
                {isPhishing ? '🚨 PHISHING DETECTED' : effectiveRiskLevel === 'high' ? '⚠️ HIGH RISK EMAIL' : '⚠️ Security Warning'}
              </Text>
              <HStack spacing={1} ml="auto">
                {llmSecurityAnalysis && (
                  <Badge colorScheme="purple" fontSize="9px" variant="outline">
                    AI Verified
                  </Badge>
                )}
                <Badge 
                  colorScheme={effectiveRiskLevel === 'high' || isPhishing ? 'red' : 'orange'} 
                  fontSize="10px"
                >
                  {effectiveRiskLevel.toUpperCase()} RISK
                </Badge>
              </HStack>
            </HStack>
            
            {/* LLM Summary */}
            {llmSummary && (
              <Box p={2} bg="whiteAlpha.800" _dark={{ bg: 'blackAlpha.400' }} borderRadius="md" mb={3}>
                <Text fontSize="11px" color={textPrimary} fontWeight="500">
                  {llmSummary}
                </Text>
                {confidence !== undefined && (
                  <Text fontSize="10px" color={textMuted} mt={1}>
                    Confidence: {Math.round(confidence * 100)}%
                  </Text>
                )}
              </Box>
            )}
            
            <VStack align="stretch" spacing={2}>
              {effectiveIndicators.map((indicator, i) => (
                <HStack 
                  key={i} 
                  spacing={2} 
                  p={2} 
                  bg={indicator.severity === 'critical' ? 'red.100' : indicator.severity === 'warning' ? 'orange.100' : 'gray.100'}
                  _dark={{ bg: indicator.severity === 'critical' ? 'red.800' : indicator.severity === 'warning' ? 'orange.800' : 'gray.700' }}
                  borderRadius="md"
                  align="start"
                >
                  <Icon 
                    as={indicator.severity === 'critical' ? FiAlertCircle : indicator.severity === 'warning' ? FiAlertTriangle : FiShield} 
                    color={indicator.severity === 'critical' ? 'red.500' : indicator.severity === 'warning' ? 'orange.500' : 'gray.500'}
                    boxSize={4}
                    mt={0.5}
                  />
                  <VStack align="start" spacing={0}>
                    <Text 
                      fontSize="11px" 
                      fontWeight="600"
                      color={indicator.severity === 'critical' ? 'red.700' : indicator.severity === 'warning' ? 'orange.700' : 'gray.600'}
                      _dark={{ color: indicator.severity === 'critical' ? 'red.200' : indicator.severity === 'warning' ? 'orange.200' : 'gray.300' }}
                    >
                      {indicator.type.replace(/_/g, ' ').toUpperCase()}
                    </Text>
                    <Text fontSize="11px" color={textSecondary}>
                      {indicator.description || indicator.message}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>
            
            {/* Recommendations from LLM */}
            {recommendations.length > 0 && (
              <Box mt={3} p={2} bg="blue.50" _dark={{ bg: 'blue.900' }} borderRadius="md">
                <Text fontSize="10px" fontWeight="600" color="blue.700" _dark={{ color: 'blue.200' }} mb={1}>
                  🛡️ Recommendations:
                </Text>
                <VStack align="start" spacing={1}>
                  {recommendations.slice(0, 3).map((rec, i) => (
                    <Text key={i} fontSize="10px" color={textSecondary}>
                      • {rec}
                    </Text>
                  ))}
                </VStack>
              </Box>
            )}
            
            <Box mt={3} p={2} bg="whiteAlpha.600" _dark={{ bg: 'blackAlpha.400' }} borderRadius="md">
              <Text fontSize="10px" color={textSecondary} fontWeight="500">
                💡 <strong>Tip:</strong> Do not click links or provide personal information. 
                If you have an account with this company, visit their website directly by typing the URL.
              </Text>
            </Box>
          </Box>
        );
      })()}

      {/* Attachments Section - shows current email attachments or thread attachments */}
      {(() => {
        const currentAttachments = Array.isArray(email?.attachments) ? email.attachments.filter(a => !a.is_inline) : [];
        const threadAtts = threadContext?.thread_attachments || [];
        const hasCurrentAttachments = currentAttachments.length > 0;
        const hasThreadAttachments = threadAtts.length > 0;
        
        if (!hasCurrentAttachments && !hasThreadAttachments) return null;
        
        return (
          <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
            {/* Current email attachments */}
            {hasCurrentAttachments && (
              <>
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={FiFileText} color="blue.500" boxSize={4} />
                    <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
                      Attachments ({currentAttachments.length})
                    </Text>
                  </HStack>
                  <Tooltip label="Open Data Science Workspace">
                    <IconButton
                      aria-label="Open workspace"
                      icon={<FiInbox />}
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={() => window.open('/workspace', '_blank')}
                    />
                  </Tooltip>
                </HStack>
                <VStack align="stretch" spacing={2} mb={hasThreadAttachments ? 3 : 0}>
                  {currentAttachments.map((att, i) => (
                    <HStack 
                      key={i} 
                      p={2} 
                      bg={bgSecondary} 
                      borderRadius="md" 
                      justify="space-between"
                      _hover={{ bg: bgElevated }}
                      cursor="pointer"
                    >
                      <HStack spacing={2}>
                        <Icon 
                          as={FiFileText} 
                          color={
                            att.content_type.includes('pdf') ? 'red.500' :
                            att.content_type.includes('spreadsheet') || att.content_type.includes('excel') ? 'green.500' :
                            att.content_type.includes('image') ? 'purple.500' :
                            att.content_type.includes('word') || att.content_type.includes('document') ? 'blue.500' :
                            'gray.500'
                          } 
                          boxSize={4} 
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="11px" fontWeight="500" color={textPrimary} noOfLines={1}>
                            {att.filename}
                          </Text>
                          <Text fontSize="10px" color={textMuted}>
                            {att.content_type.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(att.size)}
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack spacing={1}>
                        <Tooltip label="Extract to Workspace">
                          <IconButton
                            aria-label="Extract attachment"
                            icon={<FiInbox />}
                            size="xs"
                            variant="ghost"
                            colorScheme="gray"
                            onClick={() => sendToWorkspace(att.filename, i)}
                          />
                        </Tooltip>
                        <Tooltip label="Analyze with AI">
                          <IconButton
                            aria-label="Analyze attachment"
                            icon={<FiZap />}
                            size="xs"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={() => analyzeAttachment(att.filename, i)}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              </>
            )}
            
            {/* Thread attachments (from other emails in the thread) */}
            {hasThreadAttachments && (
              <>
                <HStack justify="space-between" mb={2}>
                  <HStack spacing={2}>
                    <Icon as={FiMail} color="orange.500" boxSize={4} />
                    <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
                      {hasCurrentAttachments ? 'Thread Attachments' : 'Attachments in Thread'} ({threadAtts.length})
                    </Text>
                  </HStack>
                </HStack>
                <VStack align="stretch" spacing={2}>
                  {threadAtts.map((att, i) => (
                    <HStack 
                      key={`thread-${i}`} 
                      p={2} 
                      bg={bgSecondary} 
                      borderRadius="md" 
                      justify="space-between"
                      _hover={{ bg: bgElevated }}
                      cursor="pointer"
                      borderLeft="2px solid"
                      borderLeftColor="orange.400"
                    >
                      <HStack spacing={2}>
                        <Icon 
                          as={FiFileText} 
                          color={
                            att.content_type.includes('pdf') ? 'red.500' :
                            att.content_type.includes('spreadsheet') || att.content_type.includes('excel') ? 'green.500' :
                            att.content_type.includes('image') ? 'purple.500' :
                            att.content_type.includes('word') || att.content_type.includes('document') ? 'blue.500' :
                            'gray.500'
                          } 
                          boxSize={4} 
                        />
                        <VStack align="start" spacing={0}>
                          <Text fontSize="11px" fontWeight="500" color={textPrimary} noOfLines={1}>
                            {att.filename}
                          </Text>
                          <Text fontSize="10px" color={textMuted}>
                            {att.content_type.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(att.size)}
                          </Text>
                          <Text fontSize="9px" color={textMuted} fontStyle="italic">
                            From earlier in thread
                          </Text>
                        </VStack>
                      </HStack>
                      <HStack spacing={1}>
                        <Tooltip label="Extract to Workspace">
                          <IconButton
                            aria-label="Extract attachment"
                            icon={<FiInbox />}
                            size="xs"
                            variant="ghost"
                            colorScheme="gray"
                            onClick={() => sendToWorkspace(att.filename, i, att.from_email_id)}
                          />
                        </Tooltip>
                        <Tooltip label="Analyze with AI">
                          <IconButton
                            aria-label="Analyze attachment"
                            icon={<FiZap />}
                            size="xs"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={() => analyzeAttachment(att.filename, i, att.from_email_id)}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                  ))}
                </VStack>
              </>
            )}
          </Box>
        );
      })()}

      {/* Visual Content Analysis (Qwen Vision) */}
      {imageAnalysis && imageAnalysis.count > 0 && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={2}>
            <Icon as={FiEye} color="teal.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Visual Content ({imageAnalysis.count})
            </Text>
            <Badge colorScheme="teal" fontSize="9px" variant="outline" ml="auto">
              Qwen Vision
            </Badge>
          </HStack>
          <VStack align="stretch" spacing={2}>
            {imageAnalysis.images.map((img, i) => (
              <Box
                key={img.image_id || i}
                p={2}
                bg={bgSecondary}
                borderRadius="md"
                borderLeft="3px solid"
                borderLeftColor="teal.400"
              >
                <HStack spacing={2} mb={1}>
                  <Icon
                    as={FiImage}
                    color="teal.500"
                    boxSize={3}
                  />
                  <Text fontSize="11px" fontWeight="500" color={textPrimary} noOfLines={1}>
                    {img.filename}
                  </Text>
                  <Badge
                    size="sm"
                    variant="subtle"
                    colorScheme={
                      img.image_content_type === 'logo' ? 'blue' :
                      img.image_content_type === 'chart' || img.image_content_type === 'diagram' ? 'green' :
                      img.image_content_type === 'photo' ? 'purple' :
                      img.image_content_type === 'flyer' || img.image_content_type === 'banner' ? 'orange' :
                      'gray'
                    }
                    fontSize="9px"
                  >
                    {img.image_content_type}
                  </Badge>
                </HStack>
                <Text fontSize="11px" color={textSecondary} lineHeight="1.5">
                  {img.description}
                </Text>
                {img.extracted_text && (
                  <Box mt={1} p={1.5} bg={bgElevated} borderRadius="sm">
                    <Text fontSize="10px" color={textMuted} fontFamily="mono">
                      OCR: {img.extracted_text}
                    </Text>
                  </Box>
                )}
                {img.visual_entities && img.visual_entities.length > 0 && (
                  <Wrap spacing={1} mt={1}>
                    {img.visual_entities.map((entity, j) => (
                      <WrapItem key={j}>
                        <Badge size="sm" variant="outline" colorScheme="teal" fontSize="9px">
                          {entity}
                        </Badge>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* AI Summary Card */}
      {intelligence?.summary && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Icon as={FiZap} color="purple.500" boxSize={4} />
              <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
                AI Summary
              </Text>
            </HStack>
            <HStack spacing={1}>
              <Tooltip label={`Sentiment: ${intelligence.sentiment}`}>
                <Box>
                  <Icon 
                    as={getSentimentIcon(intelligence.sentiment)} 
                    color={getSentimentColor(intelligence.sentiment)}
                    boxSize={4}
                  />
                </Box>
              </Tooltip>
              <IconButton
                aria-label="Copy summary"
                icon={<FiCopy />}
                size="xs"
                variant="ghost"
                onClick={() => copyToClipboard(intelligence.summary, 'Summary')}
              />
            </HStack>
          </HStack>
          <Text fontSize="12px" color={textSecondary} lineHeight="1.6">
            {intelligence.summary}
          </Text>
          
          {/* Topics */}
          {intelligence.topics.length > 0 && (
            <Wrap spacing={1} mt={2}>
              {intelligence.topics.slice(0, 5).map((topic, i) => (
                <WrapItem key={i}>
                  <Badge size="sm" variant="subtle" colorScheme="blue" fontSize="10px">
                    {topic}
                  </Badge>
                </WrapItem>
              ))}
            </Wrap>
          )}
          
          {/* Graph Insights */}
          {intelligence.graph_insights && (
            <VStack align="stretch" spacing={1} mt={3} pt={3} borderTop="1px solid" borderColor={border}>
              <Text fontSize="10px" fontWeight="600" color={textMuted} textTransform="uppercase">
                Intelligence
              </Text>
              <HStack spacing={2} fontSize="11px" color={textSecondary}>
                <Icon as={FiUsers} boxSize={3} />
                <Text>{intelligence.graph_insights.sender_history}</Text>
              </HStack>
              <HStack spacing={2} fontSize="11px" color={textSecondary}>
                <Icon as={FiTrendingUp} boxSize={3} />
                <Text>{intelligence.graph_insights.relationship}</Text>
              </HStack>
              <HStack spacing={2} fontSize="11px" color={textSecondary}>
                <Icon as={FiTag} boxSize={3} />
                <Text>Type: {intelligence.graph_insights.email_type}</Text>
              </HStack>
            </VStack>
          )}
        </Box>
      )}

      {/* Sender Information - Combined Trust & Relationship */}
      {(senderReputation || contactRelationship) && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={3}>
            <Icon as={FiShield} color={getTierColor(senderReputation?.tier || 'neutral') + '.500'} boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Sender Information
            </Text>
            {senderReputation && (
              <Badge colorScheme={getTierColor(senderReputation.tier)} fontSize="10px" ml="auto">
                {senderReputation.tier}
              </Badge>
            )}
          </HStack>
          
          {senderReputation && (
            <HStack spacing={4} align="center" mb={contactRelationship ? 3 : 0}>
              <CircularProgress 
                value={senderReputation.score} 
                color={getTierColor(senderReputation.tier) + '.500'}
                size="50px"
                thickness="8px"
              >
                <CircularProgressLabel fontSize="11px" fontWeight="600">
                  {Math.round(senderReputation.score)}
                </CircularProgressLabel>
              </CircularProgress>
              
              <VStack align="start" spacing={0} flex={1}>
                <HStack spacing={3} fontSize="11px" color={textSecondary}>
                  <HStack spacing={1}>
                    <Icon as={FiInbox} boxSize={3} />
                    <Text>{senderReputation.emails_received} received</Text>
                  </HStack>
                  <HStack spacing={1}>
                    <Icon as={FiSend} boxSize={3} />
                    <Text>{senderReputation.emails_sent} sent</Text>
                  </HStack>
                </HStack>
                {senderReputation.avg_response_hours && (
                  <HStack spacing={1} fontSize="11px" color={textMuted} mt={1}>
                    <Icon as={FiClock} boxSize={3} />
                    <Text>{formatResponseTime(senderReputation.avg_response_hours)} response</Text>
                  </HStack>
                )}
                {senderReputation.organization && (
                  <Text fontSize="10px" color={textMuted} mt={1}>
                    {senderReputation.organization}
                  </Text>
                )}
              </VStack>
            </HStack>
          )}
          
          {/* Relationship History - Inline */}
          {contactRelationship && (
            <VStack align="stretch" spacing={2} fontSize="11px" pt={senderReputation ? 3 : 0} borderTop={senderReputation ? "1px solid" : "none"} borderColor={border}>
              <HStack justify="space-between">
                <Text color={textMuted}>Relationship</Text>
                <Badge 
                  colorScheme={
                    contactRelationship.relationship_strength === 'strong' ? 'green' :
                    contactRelationship.relationship_strength === 'moderate' ? 'blue' :
                    contactRelationship.relationship_strength === 'weak' ? 'gray' : 'purple'
                  }
                  fontSize="10px"
                >
                  {contactRelationship.relationship_strength}
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text color={textMuted}>Communication</Text>
                <Text color={textSecondary} fontSize="10px">
                  {contactRelationship.communication_direction === 'inbound' ? '← Mostly receives' :
                   contactRelationship.communication_direction === 'outbound' ? '→ Mostly sends' : '↔ Balanced'}
                </Text>
              </HStack>
              {contactRelationship.avg_response_time_hours && (
                <HStack justify="space-between">
                  <Text color={textMuted}>Avg Response</Text>
                  <Text color={textSecondary} fontSize="10px">
                    {contactRelationship.avg_response_time_hours < 24 
                      ? `${Math.round(contactRelationship.avg_response_time_hours)}h`
                      : `${Math.round(contactRelationship.avg_response_time_hours / 24)}d`}
                  </Text>
                </HStack>
              )}
            </VStack>
          )}
        </Box>
      )}

      {/* Recipients (To/CC) */}
      {(email?.to_addrs && email.to_addrs.length > 0) || (email?.cc_addrs && email.cc_addrs.length > 0) ? (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={2}>
            <Icon as={FiUsers} color="purple.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Recipients
            </Text>
          </HStack>
          
          {/* To Recipients */}
          {email?.to_addrs && email.to_addrs.length > 0 && (
            <VStack align="stretch" spacing={1} mb={email?.cc_addrs && email.cc_addrs.length > 0 ? 2 : 0}>
              <Text fontSize="10px" fontWeight="600" color={textMuted}>
                To: ({email.to_addrs.length})
              </Text>
              <Wrap spacing={1}>
                {email.to_addrs.map((recipient, i) => (
                  <WrapItem key={i}>
                    <HStack 
                      spacing={1} 
                      px={2} 
                      py={1} 
                      bg={bgSecondary} 
                      borderRadius="md"
                      fontSize="10px"
                    >
                      <Avatar size="2xs" name={recipient.name || recipient.email} />
                      <Text color={textSecondary} noOfLines={1} maxW="150px">
                        {recipient.name || recipient.email.split('@')[0]}
                      </Text>
                    </HStack>
                  </WrapItem>
                ))}
              </Wrap>
            </VStack>
          )}
          
          {/* CC Recipients */}
          {email?.cc_addrs && email.cc_addrs.length > 0 && (
            <VStack align="stretch" spacing={1}>
              <Text fontSize="10px" fontWeight="600" color={textMuted}>
                CC: ({email.cc_addrs.length})
              </Text>
              <Wrap spacing={1}>
                {email.cc_addrs.map((recipient, i) => (
                  <WrapItem key={i}>
                    <HStack 
                      spacing={1} 
                      px={2} 
                      py={1} 
                      bg={bgSecondary} 
                      borderRadius="md"
                      fontSize="10px"
                    >
                      <Avatar size="2xs" name={recipient.name || recipient.email} />
                      <Text color={textSecondary} noOfLines={1} maxW="150px">
                        {recipient.name || recipient.email.split('@')[0]}
                      </Text>
                    </HStack>
                  </WrapItem>
                ))}
              </Wrap>
            </VStack>
          )}
        </Box>
      ) : null}

      {/* Thread Context */}
      {threadContext && threadContext.email_count > 1 && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={2}>
            <Icon as={FiMessageSquare} color="blue.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Thread Context
            </Text>
          </HStack>
          <HStack spacing={4} fontSize="11px" color={textSecondary}>
            <HStack spacing={1}>
              <Icon as={FiMail} boxSize={3} />
              <Text>{threadContext.email_count} emails</Text>
            </HStack>
            <HStack spacing={1}>
              <Icon as={FiUsers} boxSize={3} />
              <Text>{threadContext.participants.length} participants</Text>
            </HStack>
          </HStack>
          {threadContext.summary && (
            <Text fontSize="11px" color={textMuted} mt={2} noOfLines={2}>
              {threadContext.summary}
            </Text>
          )}
        </Box>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack 
            justify="space-between" 
            mb={2} 
            cursor="pointer" 
            onClick={toggleActions}
          >
            <HStack spacing={2}>
              <Icon as={FiTarget} color="green.500" boxSize={4} />
              <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
                Action Items ({actionItems.length})
              </Text>
            </HStack>
            <Icon as={isActionsOpen ? FiChevronUp : FiChevronDown} color={textMuted} boxSize={4} />
          </HStack>
          
          <Collapse in={isActionsOpen}>
            <VStack align="stretch" spacing={2}>
              {actionItems.map((item) => (
                <HStack 
                  key={item.id} 
                  p={2} 
                  bg={bgSecondary} 
                  borderRadius="md" 
                  spacing={2}
                  borderLeft="3px solid"
                  borderLeftColor={
                    item.priority === 'high' ? 'red.500' : 
                    item.priority === 'medium' ? 'orange.500' : 'gray.400'
                  }
                >
                  <Icon
                    as={item.completed ? FiCheckCircle : FiTarget}
                    color={item.completed ? 'green.500' : textMuted}
                    boxSize={4}
                  />
                  <Text fontSize="12px" color={textPrimary} flex={1}>
                    {item.text}
                  </Text>
                  {item.due_date && (
                    <Badge size="sm" colorScheme="purple" fontSize="9px">
                      {item.due_date}
                    </Badge>
                  )}
                </HStack>
              ))}
            </VStack>
          </Collapse>
        </Box>
      )}

      {/* Suggested Actions (from AI Intelligence) */}
      {intelligence?.suggested_actions && intelligence.suggested_actions.length > 0 && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={3}>
            <Icon as={FiZap} color="purple.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Suggested Actions
            </Text>
          </HStack>
          <VStack spacing={2} align="stretch">
            {intelligence.suggested_actions.map((action, index) => {
              const getActionIcon = (iconName: string) => {
                switch (iconName) {
                  case 'mail-x': return FiXCircle;
                  case 'archive': return FiArchive;
                  case 'slash': return FiSlash;
                  default: return FiZap;
                }
              };
              
              const getActionColorScheme = (variant: string) => {
                switch (variant) {
                  case 'danger': return 'red';
                  case 'primary': return 'blue';
                  case 'secondary': return 'gray';
                  default: return 'gray';
                }
              };
              
              return (
                <Tooltip key={index} label={action.description} placement="left">
                  <Button
                    size="sm"
                    variant={action.variant === 'primary' ? 'solid' : 'outline'}
                    colorScheme={getActionColorScheme(action.variant)}
                    leftIcon={<Icon as={getActionIcon(action.icon)} boxSize={4} />}
                    onClick={() => executeSuggestedAction(action)}
                    justifyContent="flex-start"
                    fontWeight="500"
                  >
                    {action.label}
                  </Button>
                </Tooltip>
              );
            })}
          </VStack>
        </Box>
      )}

      {/* Quick Actions */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
        <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase" mb={3}>
          Quick Actions
        </Text>
        <VStack spacing={2} align="stretch">
          <Button
            size="sm"
            colorScheme="blue"
            leftIcon={<Icon as={FiSend} boxSize={4} />}
            onClick={handleGenerateReply}
            isLoading={isGeneratingReply}
            loadingText="Generating..."
            justifyContent="flex-start"
            fontWeight="500"
          >
            Draft Reply
          </Button>
          
          <HStack spacing={2}>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiSearch} boxSize={4} />}
              flex={1}
              justifyContent="flex-start"
              fontWeight="500"
              onClick={() => window.open(`/ai-research?context=email&id=${email.id}`, '_blank')}
            >
              Research
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Icon as={FiBookmark} boxSize={4} />}
              flex={1}
              justifyContent="flex-start"
              fontWeight="500"
            >
              Save
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Generated Reply */}
      {generatedReply && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border} bg={bgSecondary}>
          <HStack justify="space-between" mb={2} cursor="pointer" onClick={toggleReply}>
            <HStack spacing={2}>
              <Icon as={FiEdit3} boxSize={4} color="blue.500" />
              <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
                Draft Reply
              </Text>
            </HStack>
            <Icon as={isReplyOpen ? FiChevronUp : FiChevronDown} color={textMuted} boxSize={4} />
          </HStack>
          
          <Collapse in={isReplyOpen}>
            <Textarea
              value={generatedReply}
              onChange={(e) => setGeneratedReply(e.target.value)}
              fontSize="12px"
              minH="120px"
              resize="vertical"
              mb={2}
              bg={bgElevated}
              border="1px solid"
              borderColor={border}
            />
            <HStack spacing={2}>
              <Button
                size="xs"
                colorScheme="blue"
                leftIcon={<Icon as={FiCopy} />}
                onClick={() => copyToClipboard(generatedReply, 'Reply')}
              >
                Copy
              </Button>
              <Button
                size="xs"
                variant="outline"
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={handleGenerateReply}
                isLoading={isGeneratingReply}
              >
                Regenerate
              </Button>
            </HStack>
          </Collapse>
        </Box>
      )}

      {/* Key Entities */}
      {intelligence?.key_entities && intelligence.key_entities.length > 0 && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase" mb={2}>
            Key Information
          </Text>
          <VStack align="stretch" spacing={1}>
            {intelligence.key_entities.slice(0, 5).map((entity, i) => (
              <HStack key={i} fontSize="11px" color={textSecondary}>
                <Badge size="sm" variant="outline" colorScheme="gray" minW="60px">
                  {entity.type}
                </Badge>
                <Text flex={1} noOfLines={1}>{entity.value}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}


      {/* Related Emails from Sender */}
      {relatedEmails.length > 0 && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={2}>
            <Icon as={FiInbox} color="orange.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Recent from Sender ({relatedEmails.length})
            </Text>
          </HStack>
          <VStack align="stretch" spacing={1}>
            {relatedEmails.slice(0, 3).map((relEmail) => (
              <Box 
                key={relEmail.id} 
                p={2} 
                bg={bgSecondary} 
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: bgElevated }}
                onClick={() => {
                  // Could navigate to this email
                  toast({ title: 'Navigate to email', description: relEmail.subject, status: 'info', duration: 2000 });
                }}
              >
                <Text fontSize="11px" color={textPrimary} noOfLines={1} fontWeight="500">
                  {relEmail.subject}
                </Text>
                <Text fontSize="10px" color={textMuted}>
                  {new Date(relEmail.date).toLocaleDateString()}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Reply Context - Style Matching */}
      {replyContext && (
        <Box px={4} py={3} borderBottom="1px solid" borderColor={border}>
          <HStack spacing={2} mb={2}>
            <Icon as={FiEdit3} color="purple.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color={textMuted} textTransform="uppercase">
              Reply Style Context
            </Text>
          </HStack>
          <Text fontSize="11px" color={textSecondary}>
            {replyContext}
          </Text>
        </Box>
      )}

      {/* Notifications/Alerts for this email */}
      {notifications.length > 0 && (
        <Box px={4} py={3} bg="orange.50" _dark={{ bg: 'orange.900' }}>
          <HStack spacing={2} mb={2}>
            <Icon as={FiAlertCircle} color="orange.500" boxSize={4} />
            <Text fontSize="11px" fontWeight="600" color="orange.700" _dark={{ color: 'orange.200' }} textTransform="uppercase">
              Alerts ({notifications.length})
            </Text>
          </HStack>
          <VStack align="stretch" spacing={1}>
            {notifications.map((notif) => (
              <HStack key={notif.id} fontSize="11px">
                <Badge 
                  size="sm" 
                  colorScheme={notif.type === 'urgent' ? 'red' : notif.type === 'deadline' ? 'orange' : 'blue'}
                >
                  {notif.type}
                </Badge>
                <Text color={textSecondary} flex={1} noOfLines={1}>
                  {notif.message}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

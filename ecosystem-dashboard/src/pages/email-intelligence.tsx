/**
 * Email Intelligence Dashboard
 * 
 * A comprehensive executive intelligence report featuring:
 * - Visual analytics and charts
 * - Audio briefing player
 * - Communication patterns and trends
 * - Sentiment analysis
 * - Contact network insights
 * - Daily operations summary
 * 
 * @module pages/email-intelligence
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Text,
  Button,
  Spinner,
  useToast,
  Badge,
  Avatar,
  Progress,
  IconButton,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Collapse,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from '@chakra-ui/react';
import {
  ArrowPathIcon,
  EnvelopeIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  UserGroupIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BoltIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
  InboxIcon,
  PaperAirplaneIcon,
  FolderIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
  ShieldExclamationIcon,
  NoSymbolIcon,
  TagIcon,
  GlobeAltIcon,
  UserMinusIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';
import { FlagIcon as FlagSolidIcon } from '@heroicons/react/24/solid';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useQwenTTS, SERVICE_VOICE_DEFAULTS } from '@/hooks/useQwenTTS';
import { ContextMenuEngine, useContextMenu } from '@/lib/context-menu';
import type { ContextMenuConfig } from '@/lib/context-menu/types';

// ============================================================================
// TYPES
// ============================================================================

interface FollowupItem {
  type: 'unanswered_important' | 'awaiting_reply' | 'vip_quiet';
  contact_name: string;
  contact_email: string;
  email_count?: number;
  subject?: string;
  email_id?: string;
  date?: string;
  reason: string;
  suggested_action: string;
  priority: 'high' | 'medium' | 'low';
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

interface DraftSuggestion {
  email_id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  received_date: string;
  draft: string;
  actions: string[];
}

interface ExtractedEvent {
  email_id: string;
  subject: string;
  sender: string;
  event_type: string;
  title: string;
  date?: string;
  time?: string;
  location?: string;
  participants?: string[];
  confidence: number;
}

interface PICContext {
  identity?: {
    name: string;
    role?: string;
    department?: string;
  };
  preferences?: Array<{
    key: string;
    value: string;
    category: string;
  }>;
  relationships?: Array<{
    email: string;
    name?: string;
    relationship_type?: string;
    context?: string;
  }>;
}

interface MiningRecommendation {
  id: string;
  type: 'block' | 'delete' | 'categorize' | 'unsubscribe';
  sender_email: string;
  sender_name?: string;
  domain?: string;
  reason: string;
  email_count: number;
  unread_count?: number;
  read_count?: number;
  unread_rate?: number;
  first_email_date?: string;
  last_email_date?: string;
  sample_subjects?: string[];
  categories?: string[];
  suggested_category?: string;
  confidence: number;
  emails?: Array<{
    id: string;
    subject: string;
    date: string;
    is_read: boolean;
  }>;
}

// Mining Intelligence types for analytical dashboard
interface VolumeTrendPoint {
  hour: string;
  count: number;
  iso: string;
}

interface SenderPattern {
  name: string;
  email: string;
  org: string;
  domain: string;
  count: number;
  unread: number;
  engagement_pct: number;
  primary_intent: string;
  primary_sentiment: string;
  relationship: 'strong' | 'regular' | 'occasional' | 'new';
  total_historical: number;
  first_seen?: string;
}

interface DomainIntel {
  domain: string;
  count: number;
  unique_senders: number;
  senders: string[];
  primary_intent: string;
  dominant_sentiment: string;
  unread: number;
  engagement_pct: number;
}

interface Anomaly {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

interface DayOfWeek {
  day: string;
  short: string;
  count: number;
}

interface HourOfDay {
  hour: number;
  label: string;
  count: number;
}

interface TopicWord {
  text: string;
  weight: number;
}

interface MiningObservation {
  type: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

interface HygieneDeleteCandidate {
  name: string;
  email: string;
  domain: string;
  count: number;
  engagement_pct: number;
  intent: string;
  reason: string;
  save_estimate: number;
}

interface HygieneUnsubCandidate {
  name: string;
  email: string;
  domain: string;
  count: number;
  total_historical: number;
  engagement_pct: number;
  intent: string;
  reason: string;
  also_delete: boolean;
}

interface HygieneBlockDomain {
  domain: string;
  count: number;
  unique_senders: number;
  engagement_pct: number;
  marketing_pct: number;
  reason: string;
}

interface EmailHygiene {
  delete_candidates: HygieneDeleteCandidate[];
  unsubscribe_candidates: HygieneUnsubCandidate[];
  block_domains: HygieneBlockDomain[];
}

interface MiningIntel {
  period_hours: number;
  summary: {
    total: number;
    prev_total: number;
    delta_pct: number;
    unread: number;
    needs_attention: number;
    by_account: Record<string, number>;
    by_intent: Record<string, number>;
    by_urgency: Record<string, number>;
    by_sentiment: Record<string, number>;
  };
  volume_trend: VolumeTrendPoint[];
  sender_patterns: SenderPattern[];
  domain_intel: DomainIntel[];
  connection_map: Array<{
    name: string;
    email: string;
    strength: string;
    volume: number;
    historical: number;
    sentiment: string;
    intent: string;
  }>;
  anomalies: Anomaly[];
  day_of_week: DayOfWeek[];
  hour_of_day: HourOfDay[];
  topic_words: TopicWord[];
  observations: MiningObservation[];
  hygiene: EmailHygiene;
}

interface BriefingData {
  headline: string;
  executiveSummary: string;
  actionSummary: string;
  podcastScript: string;
  podcastDuration: number;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  metrics: {
    totalEmails: number;
    needsResponse: number;
    highPriority: number;
    responseRate: number;
    newContacts: number;
    uniqueContacts: number;
    avgSentiment: number;
    sentimentLabel: string;
  };
  byCategory: Record<string, number>;
  bySentiment: Record<string, number>;
  insights: string[];
  actionItems: Array<{
    task: string;
    priority: string;
    emailId?: string;
    dueDate?: string;
  }>;
  topContacts: Array<{
    email: string;
    name: string;
    count: number;
    sentiment: string;
    note: string;
  }>;
  topicClusters: Array<{
    topic: string;
    count: number;
    priority: string;
    summary: string;
  }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function EmailIntelligencePage() {
  const toast = useToast();
  const router = useRouter();
  const { setContext, setCustomData } = useRightPanel();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Qwen3 TTS for audio briefing
  const { 
    speakWithProfile, 
    stop: stopTTS, 
    isSpeaking, 
    isLoading: ttsLoading,
    getVoiceForService 
  } = useQwenTTS();
  
  // State
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    favorites: true,
    smartMailboxes: false,
    insights: true,
    icloud: false,
    work: false,
  });
  
  // Actionable Intelligence Hub State
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [draftSuggestions, setDraftSuggestions] = useState<DraftSuggestion[]>([]);
  const [extractedEvents, setExtractedEvents] = useState<ExtractedEvent[]>([]);
  const [picContext, setPicContext] = useState<PICContext | null>(null);
  const [hubLoading, setHubLoading] = useState(false);
  const [sendingDraft, setSendingDraft] = useState<string | null>(null);
  const [creatingEvent, setCreatingEvent] = useState<string | null>(null);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const [miningRecommendations, setMiningRecommendations] = useState<MiningRecommendation[]>([]);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [expandedMiningCards, setExpandedMiningCards] = useState<Set<string>>(new Set());
  
  // Mining Intelligence (analytical dashboard)
  const [miningIntel, setMiningIntel] = useState<MiningIntel | null>(null);
  const [miningLoading, setMiningLoading] = useState(false);
  const [miningPeriod, setMiningPeriod] = useState(24);
  const [miningAccount, setMiningAccount] = useState<'all' | 'icloud' | 'work'>('all');

  // Hygiene action tracking (optimistic removal after action)
  const [hygieneActioned, setHygieneActioned] = useState<Set<string>>(new Set());

  const handleHygieneAction = useCallback(async (
    action: 'delete' | 'block_sender' | 'block_domain' | 'unsubscribe',
    email?: string,
    domain?: string,
  ) => {
    const key = `${action}:${email || domain}`;
    setHygieneActioned(prev => new Set(prev).add(key));
    try {
      const res = await fetch('/api/hermes-proxy?path=v1/filters/hygiene-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, email, domain, also_block: action === 'delete' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: action === 'unsubscribe' ? 'Unsubscribed' : action === 'block_domain' ? 'Domain Blocked' : action === 'block_sender' ? 'Sender Blocked' : 'Deleted',
          description: data.message || `${data.deleted_count || 0} emails removed`,
          status: 'success',
          duration: 3000,
        });
      } else {
        throw new Error(data.detail || 'Action failed');
      }
    } catch (err: any) {
      setHygieneActioned(prev => { const n = new Set(prev); n.delete(key); return n; });
      toast({ title: 'Action Failed', description: err.message, status: 'error', duration: 3000 });
    }
  }, [toast]);

  // Context menu for mining recommendations
  const { state: menuState, open: openMenu, close: closeMenu } = useContextMenu();

  // Theme tokens
  const bgPrimary = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.elevated');
  const bgElevated = useSemanticToken('surface.raised');
  const bgHover = useSemanticToken('surface.hover');
  const bgSelected = useSemanticToken('interactive.primary');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textOnSelected = useSemanticToken('text.inverse');
  const border = useSemanticToken('border.default');

  // Toggle sidebar section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Set panel context
  useEffect(() => {
    setContext('email-intelligence-dashboard');
  }, [setContext]);

  // Fetch briefing data
  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/latest&account=all');
      if (response.ok) {
        const data = await response.json();
        const b = data.briefing || data;
        const metrics = b.metrics || data.metrics || {};
        
        const briefingData: BriefingData = {
          headline: b.headline || 'Email Intelligence Report',
          executiveSummary: b.executive_summary || '',
          actionSummary: b.action_summary || 'No pending actions.',
          podcastScript: b.podcast_script || '',
          podcastDuration: b.podcast_duration_estimate || 60,
          generatedAt: b.generated_at || data.generated_at || new Date().toISOString(),
          periodStart: b.period_start || '',
          periodEnd: b.period_end || '',
          metrics: {
            totalEmails: metrics.total_emails || 0,
            needsResponse: metrics.needs_response || 0,
            highPriority: metrics.high_priority || 0,
            responseRate: metrics.response_rate || 0,
            newContacts: metrics.new_contacts || 0,
            uniqueContacts: metrics.unique_contacts || 0,
            avgSentiment: metrics.avg_sentiment || 0,
            sentimentLabel: metrics.sentiment_label || 'neutral',
          },
          byCategory: metrics.by_category || {},
          bySentiment: metrics.by_sentiment || {},
          insights: b.insights || [],
          actionItems: (b.action_items || []).map((item: any) => ({
            task: item.task || item.text || item,
            priority: item.priority || 'medium',
            emailId: item.email_id,
            dueDate: item.due_date,
          })),
          topContacts: (b.contact_highlights || []).slice(0, 6).map((c: any) => ({
            email: c.email,
            name: c.name || c.email.split('@')[0],
            count: c.email_count || 0,
            sentiment: c.sentiment || 'neutral',
            note: c.relationship_note || '',
          })),
          topicClusters: (b.topic_clusters || []).slice(0, 5).map((t: any) => ({
            topic: t.topic,
            count: t.email_count || 0,
            priority: t.priority || 'medium',
            summary: t.summary || '',
          })),
        };
        
        setBriefing(briefingData);
        setCustomData({ type: 'email-briefing', briefing: briefingData });
      }
    } catch (error) {
      console.error('Failed to fetch briefing:', error);
      toast({ title: 'Failed to load intelligence', status: 'error', duration: 3000 });
    } finally {
      setLoading(false);
    }
  }, [setCustomData, toast]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Fetch actionable intelligence hub data
  const fetchIntelligenceHub = useCallback(async () => {
    setHubLoading(true);
    try {
      // Fetch all hub data in parallel
      const [followupsRes, recommendationsRes, draftsRes, eventsRes, miningRes, picRes] = await Promise.all([
        fetch('/api/hermes-proxy?path=v1/intelligence/hub/followups&days=14'),
        fetch('/api/hermes-proxy?path=v1/intelligence/hub/recommendations'),
        fetch('/api/hermes-proxy?path=v1/intelligence/hub/draft-suggestions&limit=3'),
        fetch('/api/hermes-proxy?path=v1/intelligence/hub/extracted-events&period_hours=168'),
        fetch('/api/hermes-proxy?path=v1/intelligence/mining-recommendations'),
        fetch('/api/pic/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: 'email-intelligence-hub',
            include_identity: true,
            include_preferences: true,
            preference_categories: ['communication', 'productivity'],
          }),
        }).catch(() => null),
      ]);

      if (followupsRes.ok) {
        const data = await followupsRes.json();
        setFollowups(data.followups || []);
      }

      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json();
        setRecommendations(data.recommendations || []);
      }

      if (draftsRes.ok) {
        const data = await draftsRes.json();
        setDraftSuggestions(data.suggestions || []);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setExtractedEvents(data.events || []);
      }

      if (miningRes.ok) {
        const data = await miningRes.json();
        setMiningRecommendations(data.recommendations || []);
      }

      if (picRes && picRes.ok) {
        const data = await picRes.json();
        setPicContext(data);
      }
    } catch (error) {
      console.error('Failed to fetch intelligence hub:', error);
    } finally {
      setHubLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntelligenceHub();
  }, [fetchIntelligenceHub]);

  // Fetch mining intelligence (analytical data)
  const fetchMiningIntel = useCallback(async () => {
    setMiningLoading(true);
    try {
      const res = await fetch(
        `/api/hermes-proxy?path=v1/intelligence/email-mining-intel&period_hours=${miningPeriod}&account=${miningAccount}&limit=200`
      );
      if (res.ok) {
        const data: MiningIntel = await res.json();
        setMiningIntel(data);
      }
    } catch (error) {
      console.error('Failed to fetch mining intel:', error);
    } finally {
      setMiningLoading(false);
    }
  }, [miningPeriod, miningAccount]);

  useEffect(() => {
    fetchMiningIntel();
  }, [fetchMiningIntel]);

  // Navigate to email when clicking on a follow-up item
  const handleFollowupClick = useCallback((item: FollowupItem) => {
    if (item.email_id) {
      router.push(`/email?selected=${encodeURIComponent(item.email_id)}`);
    } else {
      router.push(`/email?search=${encodeURIComponent(item.contact_email)}`);
    }
  }, [router]);

  // Send a draft reply
  const handleSendDraft = useCallback(async (draft: DraftSuggestion) => {
    setSendingDraft(draft.email_id);
    try {
      // For now, open the email page with the draft pre-filled
      // In a full implementation, this would send via SMTP
      toast({
        title: 'Opening Email Composer',
        description: `Preparing reply to ${draft.sender_name}`,
        status: 'info',
        duration: 2000,
      });
      router.push(`/email?reply=${encodeURIComponent(draft.email_id)}&draft=${encodeURIComponent(draft.draft)}`);
    } catch (error) {
      toast({
        title: 'Failed to send',
        description: 'Could not prepare draft reply',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSendingDraft(null);
    }
  }, [router, toast]);

  // Edit a draft (navigate to email with draft)
  const handleEditDraft = useCallback((draft: DraftSuggestion) => {
    router.push(`/email?reply=${encodeURIComponent(draft.email_id)}&draft=${encodeURIComponent(draft.draft)}`);
  }, [router]);

  // Create calendar event from extracted event
  const handleCreateEvent = useCallback(async (event: ExtractedEvent) => {
    setCreatingEvent(event.email_id);
    try {
      // Parse date/time if available
      let startTime = new Date();
      let endTime = new Date();
      
      if (event.date) {
        try {
          startTime = new Date(event.date);
          if (event.time) {
            const [hours, minutes] = event.time.split(':').map(Number);
            startTime.setHours(hours || 9, minutes || 0, 0, 0);
          } else {
            startTime.setHours(9, 0, 0, 0);
          }
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default
        } catch {
          startTime = new Date();
          startTime.setHours(startTime.getHours() + 1, 0, 0, 0);
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
        }
      } else {
        startTime.setHours(startTime.getHours() + 1, 0, 0, 0);
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          description: `Extracted from email: ${event.subject}\nFrom: ${event.sender}`,
          location: event.location || '',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          attendees: event.participants || [],
        }),
      });

      if (response.ok) {
        toast({
          title: 'Event Created',
          description: `"${event.title}" added to calendar`,
          status: 'success',
          duration: 3000,
        });
        // Remove from extracted events list
        setExtractedEvents(prev => prev.filter(e => e.email_id !== event.email_id));
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
      toast({
        title: 'Failed to create event',
        description: 'Could not add event to calendar',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setCreatingEvent(null);
    }
  }, [toast]);

  // Execute mining action
  const executeMiningAction = useCallback(async (
    rec: MiningRecommendation, 
    actionType: 'block' | 'delete' | 'categorize' | 'unsubscribe' | 'block_domain',
    category?: string
  ) => {
    setProcessingAction(rec.id);
    try {
      let endpoint = '';
      let successMessage = '';
      const domain = rec.sender_email.split('@')[1] || '';
      
      switch (actionType) {
        case 'block':
          endpoint = `/api/hermes-proxy?path=v1/filters/block-sender&email=${encodeURIComponent(rec.sender_email)}`;
          successMessage = `Blocked ${rec.sender_name || rec.sender_email}`;
          break;
        case 'block_domain':
          endpoint = `/api/hermes-proxy?path=v1/filters/block-domain&domain=${encodeURIComponent(domain)}`;
          successMessage = `Blocked domain: ${domain}`;
          break;
        case 'delete':
          endpoint = `/api/hermes-proxy?path=v1/emails/bulk-delete&sender=${encodeURIComponent(rec.sender_email)}`;
          successMessage = `Deleted ${rec.email_count} emails from ${rec.sender_name || rec.sender_email}`;
          break;
        case 'categorize':
          endpoint = `/api/hermes-proxy?path=v1/filters/categorize-sender&email=${encodeURIComponent(rec.sender_email)}&category=${encodeURIComponent(category || 'promotional')}`;
          successMessage = `Categorized ${rec.sender_name || rec.sender_email} as ${category}`;
          break;
        case 'unsubscribe':
          endpoint = `/api/hermes-proxy?path=v1/emails/unsubscribe&sender=${encodeURIComponent(rec.sender_email)}`;
          successMessage = `Unsubscribed from ${rec.sender_name || rec.sender_email}`;
          break;
      }

      const response = await fetch(endpoint, { method: 'POST' });
      
      if (response.ok) {
        toast({
          title: 'Action Completed',
          description: successMessage,
          status: 'success',
          duration: 3000,
        });
        // Remove from recommendations list
        setMiningRecommendations(prev => prev.filter(r => r.id !== rec.id));
      } else {
        throw new Error('Action failed');
      }
    } catch (error) {
      toast({
        title: 'Action Failed',
        description: `Could not ${actionType} ${rec.sender_email}`,
        status: 'error',
        duration: 3000,
      });
    } finally {
      setProcessingAction(null);
    }
  }, [toast]);

  // Open context menu for mining recommendation
  const openMiningMenu = useCallback((e: React.MouseEvent, rec: MiningRecommendation) => {
    e.preventDefault();
    e.stopPropagation();
    
    const domain = rec.sender_email.split('@')[1] || '';
    
    const config: ContextMenuConfig = {
      header: {
        title: rec.sender_name || rec.sender_email,
        subtitle: `${rec.email_count} emails • ${rec.reason}`,
      },
      groups: [
        {
          id: 'block',
          items: [
            {
              id: 'block-sender',
              label: 'Block Sender',
              icon: UserMinusIcon,
              onClick: () => executeMiningAction(rec, 'block'),
            },
            {
              id: 'block-domain',
              label: `Block Domain (${domain})`,
              icon: GlobeAltIcon,
              onClick: () => executeMiningAction(rec, 'block_domain'),
            },
          ],
        },
        {
          id: 'organize',
          items: [
            {
              id: 'unsubscribe',
              label: 'Unsubscribe',
              icon: EnvelopeIcon,
              onClick: () => executeMiningAction(rec, 'unsubscribe'),
            },
            {
              id: 'categorize-promo',
              label: 'Categorize as Promotional',
              icon: TagIcon,
              onClick: () => executeMiningAction(rec, 'categorize', 'promotional'),
            },
            {
              id: 'categorize-newsletter',
              label: 'Categorize as Newsletter',
              icon: TagIcon,
              onClick: () => executeMiningAction(rec, 'categorize', 'newsletter'),
            },
          ],
        },
        {
          id: 'filter',
          items: [
            {
              id: 'create-filter',
              label: 'Create Mail Filter',
              icon: FolderIcon,
              onClick: async () => {
                try {
                  const response = await fetch(`/api/hermes-proxy?path=v1/filters/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: `Filter: ${rec.sender_name || rec.sender_email}`,
                      conditions: [{ field: 'from', operator: 'contains', value: rec.sender_email }],
                      actions: [{ type: 'move_to_folder', folder: 'Filtered' }],
                    }),
                  });
                  if (response.ok) {
                    toast({ title: 'Filter Created', description: `Emails from ${rec.sender_name || rec.sender_email} will be filtered`, status: 'success', duration: 3000 });
                  } else {
                    throw new Error('Failed to create filter');
                  }
                } catch {
                  toast({ title: 'Filter creation not available', description: 'Mail filter API not configured', status: 'warning', duration: 3000 });
                }
              },
            },
            {
              id: 'view-in-mailbox',
              label: 'View in Mailbox',
              icon: InboxIcon,
              onClick: () => {
                // Navigate to email page with sender filter
                router.push(`/email?from=${encodeURIComponent(rec.sender_email)}`);
              },
            },
          ],
        },
        {
          id: 'danger',
          items: [
            {
              id: 'delete-all',
              label: `Delete All (${rec.email_count} emails)`,
              icon: TrashIcon,
              variant: 'danger' as const,
              onClick: () => executeMiningAction(rec, 'delete'),
            },
          ],
        },
      ],
    };
    
    openMenu({ x: e.clientX, y: e.clientY }, config);
  }, [executeMiningAction, openMenu]);

  // Refresh briefing - generate fresh briefing with audio
  const handleRefreshBriefing = useCallback(async () => {
    setRefreshingBriefing(true);
    try {
      toast({
        title: 'Generating Fresh Briefing',
        description: 'Analyzing emails and generating audio...',
        status: 'info',
        duration: 5000,
      });

      // Generate fresh briefing with podcast script
      const briefingRes = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/generate&account=all&period_hours=24&include_podcast=true', {
        method: 'POST',
      });

      if (!briefingRes.ok) {
        throw new Error('Failed to generate briefing');
      }

      const briefingData = await briefingRes.json();

      // Generate audio for the briefing
      const audioRes = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all&force_regenerate=true', {
        method: 'POST',
      });

      // Refresh the displayed briefing
      await fetchBriefing();

      toast({
        title: 'Briefing Ready',
        description: audioRes.ok 
          ? 'Fresh briefing generated with audio' 
          : 'Fresh briefing generated (audio pending)',
        status: 'success',
        duration: 3000,
      });

      // Update audio URL if available
      if (audioRes.ok) {
        const briefingId = briefingData.briefing_id;
        setAudioUrl(`/api/hermes-proxy?path=v1/intelligence/briefing/audio/${briefingId}.wav`);
      }
    } catch (error) {
      console.error('Failed to refresh briefing:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Could not generate new briefing',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setRefreshingBriefing(false);
    }
  }, [fetchBriefing, toast]);

  // Audio playback handlers - using stored audio or Qwen3 TTS generation
  const handlePlayPause = async () => {
    // If currently playing, stop
    if (isPlaying || isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      stopTTS();
      setIsPlaying(false);
      setAudioProgress(0);
      return;
    }

    // Check if we have content to speak
    const textToSpeak = briefing?.podcastScript || briefing?.executiveSummary;
    if (!textToSpeak) {
      toast({ title: 'No audio briefing available', status: 'info', duration: 2000 });
      return;
    }

    // If we already have generated audio, play it
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // First, check if audio already exists on server
    setGeneratingAudio(true);
    
    try {
      // Check audio status from Hermes Core
      const statusResponse = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio/status&account=all');
      const audioStatus = await statusResponse.json();
      
      if (audioStatus.has_audio) {
        // Audio exists, fetch it from Hermes Core
        toast({ 
          title: 'Loading Audio Briefing', 
          description: 'Fetching stored audio...',
          status: 'info', 
          duration: 2000 
        });
        
        const audioResponse = await fetch('/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all', {
          method: 'POST',
        });
        
        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob();
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          
          const audio = new Audio(url);
          audioRef.current = audio;
          setupAudioListeners(audio);
          
          await audio.play();
          setIsPlaying(true);
          setGeneratingAudio(false);
          
          toast({ 
            title: 'Playing Audio Briefing', 
            description: 'From stored audio',
            status: 'success', 
            duration: 2000 
          });
          return;
        }
      }
      
      // No stored audio, generate new audio via Hermes Core (which stores it)
      toast({ 
        title: 'Generating Audio Briefing', 
        description: 'Using Qwen3 TTS to generate your daily briefing...',
        status: 'info', 
        duration: 3000 
      });

      const voiceId = getVoiceForService('daily-news');
      
      // Call Hermes Core to generate and store audio
      const response = await fetch(
        `/api/hermes-proxy?path=v1/intelligence/briefing/audio&account=all&voice_id=${voiceId}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        // Fallback: generate directly via Qwen3 TTS API
        const directResponse = await fetch('/api/ai-gateway/qwen-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            mode: 'clone-from-library',
            voice_id: voiceId,
            language: 'Auto',
            temperature: 0.4,
            top_p: 0.85,
          }),
        });

        if (!directResponse.ok) {
          throw new Error('TTS generation failed');
        }

        const audioBlob = await directResponse.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const audio = new Audio(url);
        audioRef.current = audio;
        setupAudioListeners(audio);

        await audio.play();
        setIsPlaying(true);
        setGeneratingAudio(false);
        
        toast({ 
          title: 'Playing Audio Briefing', 
          description: `Voice: ${voiceId.replace(/_/g, ' ')}`,
          status: 'success', 
          duration: 2000 
        });
        return;
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;
      setupAudioListeners(audio);

      await audio.play();
      setIsPlaying(true);
      setGeneratingAudio(false);
      
      toast({ 
        title: 'Playing Audio Briefing', 
        description: 'Audio generated and stored',
        status: 'success', 
        duration: 2000 
      });

    } catch (error) {
      console.error('TTS generation failed:', error);
      setGeneratingAudio(false);
      toast({ 
        title: 'Audio Generation Failed', 
        description: 'Could not generate audio briefing. Please try again.',
        status: 'error', 
        duration: 3000 
      });
    }
  };

  // Helper to set up audio event listeners
  const setupAudioListeners = (audio: HTMLAudioElement) => {
    audio.onloadedmetadata = () => {
      setAudioDuration(audio.duration);
    };
    
    audio.ontimeupdate = () => {
      if (audio.duration > 0) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    
    audio.onended = () => {
      setIsPlaying(false);
      setAudioProgress(0);
    };
    
    audio.onerror = () => {
      setIsPlaying(false);
      toast({ title: 'Audio playback error', status: 'error', duration: 2000 });
    };
  };

  // Clean up audio URL on unmount or when briefing changes
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Reset audio when briefing changes
  useEffect(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioProgress(0);
    setIsPlaying(false);
  }, [briefing?.generatedAt]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get sentiment color
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive': return 'green.500';
      case 'negative': return 'red.500';
      default: return 'gray.500';
    }
  };

  // Category colors
  const categoryColors: Record<string, string> = {
    general: '#6B7280',
    work: '#3B82F6',
    personal: '#10B981',
    newsletter: '#F59E0B',
    notification: '#EF4444',
    promotion: '#EC4899',
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <DashboardLayout>
        <Flex h="calc(100vh - 70px)" justify="center" align="center" bg={bgPrimary}>
          <VStack spacing={3}>
            <Spinner size="lg" color="purple.500" />
            <Text fontSize="13px" color={textSecondary}>Loading intelligence report...</Text>
          </VStack>
        </Flex>
      </DashboardLayout>
    );
  }

  const totalByCategory = Object.values(briefing?.byCategory || {}).reduce((a, b) => a + b, 0);

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 70px)" bg={bgPrimary} overflow="hidden">
        {/* Left Sidebar - Compact Apple Mail Style */}
        <Box
          w="180px"
          minW="180px"
          h="100%"
          bg={bgSecondary}
          borderRight="1px solid"
          borderColor={border}
          overflowY="auto"
          py={1}
          fontSize="12px"
        >
          {/* Intelligence Dashboard - Active/Current Page */}
          <Box px={2} py={2}>
            <HStack
              spacing={2}
              p={2}
              borderRadius="8px"
              cursor="pointer"
              bg="linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(59, 130, 246, 0.25))"
              border="1px solid"
              borderColor="rgba(139, 92, 246, 0.5)"
              boxShadow="0 0 8px rgba(139, 92, 246, 0.3)"
            >
              <SparklesIcon style={{ width: '16px', height: '16px', color: '#8B5CF6' }} />
              <Text fontSize="12px" fontWeight="600" color={textPrimary}>
                Intelligence Dashboard
              </Text>
            </HStack>
          </Box>

          {/* Favorites */}
          <SidebarSection
            title="Favorites"
            isExpanded={expandedSections.favorites}
            onToggle={() => toggleSection('favorites')}
            textSecondary={textSecondary}
          >
            <SidebarItem
              icon={<InboxIcon style={{ width: '14px', height: '14px' }} />}
              label="All Inboxes"
              isActive={false}
              onClick={() => router.push('/email')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#0A84FF"
            />
            <SidebarItem
              icon={<FlagSolidIcon style={{ width: '14px', height: '14px' }} />}
              label="Flagged"
              isActive={false}
              onClick={() => router.push('/email?mailbox=flagged')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF9500"
            />
            <SidebarItem
              icon={<PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />}
              label="All Sent"
              isActive={false}
              onClick={() => router.push('/email?mailbox=sent')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#34C759"
            />
          </SidebarSection>

          {/* iCloud Account */}
          <SidebarSection
            title="iCloud"
            isExpanded={expandedSections.icloud}
            onToggle={() => toggleSection('icloud')}
            textSecondary={textSecondary}
            indicator="#007AFF"
          >
            <SidebarItem
              icon={<InboxIcon style={{ width: '14px', height: '14px' }} />}
              label="Inbox"
              isActive={false}
              onClick={() => router.push('/email?account=icloud')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<FolderIcon style={{ width: '14px', height: '14px' }} />}
              label="Drafts"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />}
              label="Sent"
              isActive={false}
              onClick={() => router.push('/email?mailbox=sent&account=icloud')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<ArchiveBoxIcon style={{ width: '14px', height: '14px' }} />}
              label="Archive"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<TrashIcon style={{ width: '14px', height: '14px' }} />}
              label="Trash"
              isActive={false}
              onClick={() => router.push('/email?mailbox=trash&account=icloud')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
          </SidebarSection>

          {/* Work Account */}
          <SidebarSection
            title="Houston Methodist"
            isExpanded={expandedSections.work}
            onToggle={() => toggleSection('work')}
            textSecondary={textSecondary}
            indicator="#C41E3A"
          >
            <SidebarItem
              icon={<InboxIcon style={{ width: '14px', height: '14px' }} />}
              label="Inbox"
              isActive={false}
              onClick={() => router.push('/email?account=work')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<FolderIcon style={{ width: '14px', height: '14px' }} />}
              label="Drafts"
              isActive={false}
              onClick={() => {}}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<PaperAirplaneIcon style={{ width: '14px', height: '14px' }} />}
              label="Sent"
              isActive={false}
              onClick={() => router.push('/email?mailbox=sent&account=work')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
            <SidebarItem
              icon={<TrashIcon style={{ width: '14px', height: '14px' }} />}
              label="Trash"
              isActive={false}
              onClick={() => router.push('/email?mailbox=trash&account=work')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
            />
          </SidebarSection>

          {/* Smart Mailboxes */}
          <SidebarSection
            title="Smart Mailboxes"
            isExpanded={expandedSections.smartMailboxes}
            onToggle={() => toggleSection('smartMailboxes')}
            textSecondary={textSecondary}
          >
            <SidebarItem
              icon={<EnvelopeIcon style={{ width: '14px', height: '14px' }} />}
              label="Unread"
              isActive={false}
              onClick={() => router.push('/email?mailbox=unread')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#AF52DE"
            />
            <SidebarItem
              icon={<ClockIcon style={{ width: '16px', height: '16px' }} />}
              label="Today"
              isActive={false}
              onClick={() => router.push('/email?mailbox=today')}
              bgHover={bgHover}
              bgSelected={bgSelected}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textOnSelected={textOnSelected}
              iconColor="#FF3B30"
            />
          </SidebarSection>

        </Box>

        {/* Main Content Area */}
        <Box flex="1" h="100%" overflowY="auto">
          {/* Header */}
          <Box px={6} py={4} borderBottom="1px solid" borderColor={border} bg={bgSecondary}>
            <Flex justify="space-between" align="center">
              <HStack spacing={3}>
                <Box>
                  <HStack spacing={2}>
                    <SparklesIcon style={{ width: '20px', height: '20px', color: '#8B5CF6' }} />
                    <Text fontSize="18px" fontWeight="600" color={textPrimary}>
                      Email Intelligence Report
                    </Text>
                  </HStack>
                  <Text fontSize="12px" color={textSecondary}>
                    {briefing?.generatedAt 
                      ? new Date(briefing.generatedAt).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })
                      : 'Daily Operations Summary'}
                  </Text>
                </Box>
              </HStack>
              
              <Button
                size="sm"
                leftIcon={<ArrowPathIcon style={{ width: '14px', height: '14px' }} />}
                onClick={handleRefreshBriefing}
                variant="outline"
                isLoading={refreshingBriefing}
                loadingText="Generating..."
              >
              Refresh Briefing
            </Button>
          </Flex>
        </Box>

        <Box p={6}>
          {/* MINING CONTROLS BAR */}
          <HStack spacing={3} mb={5} justify="space-between">
            <HStack spacing={2}>
              <SparklesIcon style={{ width: '18px', height: '18px', color: '#8B5CF6' }} />
              <Text fontSize="14px" fontWeight="700" color={textPrimary}>
                Mining Intelligence
              </Text>
              {miningIntel && (
                <Badge colorScheme="purple" fontSize="10px" borderRadius="full">
                  {miningIntel.summary.total} emails analyzed
                </Badge>
              )}
            </HStack>
            <HStack spacing={2}>
              <Menu>
                <MenuButton as={Button} size="xs" variant="ghost" rightIcon={<ChevronDownIcon style={{ width: '12px', height: '12px' }} />}>
                  {miningPeriod === 168 ? '1 week' : miningPeriod === 72 ? '3 days' : miningPeriod === 48 ? '2 days' : `${miningPeriod}h`}
                </MenuButton>
                <MenuList minW="120px">
                  {[6, 12, 24, 48, 72, 168].map(h => (
                    <MenuItem key={h} fontSize="12px" onClick={() => setMiningPeriod(h)}>
                      {h === 24 ? '24h (1 day)' : h === 48 ? '2 days' : h === 72 ? '3 days' : h === 168 ? '1 week' : `${h}h`}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
              <Menu>
                <MenuButton as={Button} size="xs" variant="ghost" rightIcon={<ChevronDownIcon style={{ width: '12px', height: '12px' }} />}>
                  {miningAccount === 'all' ? 'All' : miningAccount === 'icloud' ? 'Personal' : 'Work'}
                </MenuButton>
                <MenuList minW="100px">
                  <MenuItem fontSize="12px" onClick={() => setMiningAccount('all')}>All Accounts</MenuItem>
                  <MenuItem fontSize="12px" onClick={() => setMiningAccount('icloud')}>Personal</MenuItem>
                  <MenuItem fontSize="12px" onClick={() => setMiningAccount('work')}>Work</MenuItem>
                </MenuList>
              </Menu>
              <IconButton
                aria-label="Refresh"
                icon={<ArrowPathIcon style={{ width: '14px', height: '14px' }} />}
                size="xs" variant="ghost"
                onClick={fetchMiningIntel}
                isLoading={miningLoading}
              />
            </HStack>
          </HStack>

          {miningLoading && !miningIntel ? (
            <Flex justify="center" py={16}>
              <VStack spacing={3}>
                <Spinner size="lg" color="purple.500" />
                <Text fontSize="13px" color={textSecondary}>Analyzing patterns...</Text>
              </VStack>
            </Flex>
          ) : (
          <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={5}>
            {/* LEFT COLUMN - Analytical Intelligence */}
            <GridItem>
              <VStack spacing={5} align="stretch">

                {/* EXECUTIVE SUMMARY */}
                <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                  <HStack spacing={2} mb={2}>
                    <FlagIcon style={{ width: '16px', height: '16px', color: '#8B5CF6' }} />
                    <Text fontSize="13px" fontWeight="600" color={textPrimary}>Executive Summary</Text>
                  </HStack>
                  <Text fontSize="15px" fontWeight="600" color={textPrimary} mb={2} lineHeight="1.3">
                    {briefing?.headline}
                  </Text>
                  <Text fontSize="12px" color={textSecondary} lineHeight="1.6" mb={3}>
                    {briefing?.executiveSummary}
                  </Text>
                  {briefing?.actionSummary && (
                    <Box p={2} bg={bgSecondary} borderRadius="6px" borderLeft="3px solid" borderLeftColor="purple.500">
                      <Text fontSize="11px" color={textPrimary}>{briefing.actionSummary}</Text>
                    </Box>
                  )}
                </Box>

                {/* KEY METRICS ROW */}
                {miningIntel && (
                  <Grid templateColumns="repeat(5, 1fr)" gap={3}>
                    <Box p={3} bg={bgElevated} borderRadius="10px" border="1px solid" borderColor={border} textAlign="center">
                      <Text fontSize="22px" fontWeight="700" color={textPrimary}>{miningIntel.summary.total}</Text>
                      <Text fontSize="9px" color={textSecondary} textTransform="uppercase" letterSpacing="0.5px">Total</Text>
                    </Box>
                    <Box p={3} bg={bgElevated} borderRadius="10px" border="1px solid" borderColor={border} textAlign="center">
                      <HStack justify="center" spacing={1}>
                        <Text fontSize="22px" fontWeight="700" color={miningIntel.summary.delta_pct > 0 ? 'red.400' : miningIntel.summary.delta_pct < 0 ? 'green.400' : textPrimary}>
                          {miningIntel.summary.delta_pct > 0 ? '+' : ''}{miningIntel.summary.delta_pct}%
                        </Text>
                      </HStack>
                      <Text fontSize="9px" color={textSecondary} textTransform="uppercase" letterSpacing="0.5px">Trend</Text>
                    </Box>
                    <Box p={3} bg={bgElevated} borderRadius="10px" border="1px solid" borderColor={border} textAlign="center">
                      <Text fontSize="22px" fontWeight="700" color="blue.400">{miningIntel.summary.unread}</Text>
                      <Text fontSize="9px" color={textSecondary} textTransform="uppercase" letterSpacing="0.5px">Unread</Text>
                    </Box>
                    <Box p={3} bg={bgElevated} borderRadius="10px" border="1px solid" borderColor={border} textAlign="center">
                      <Text fontSize="22px" fontWeight="700" color="orange.400">{miningIntel.summary.needs_attention}</Text>
                      <Text fontSize="9px" color={textSecondary} textTransform="uppercase" letterSpacing="0.5px">Attention</Text>
                    </Box>
                    <Box p={3} bg={bgElevated} borderRadius="10px" border="1px solid" borderColor={border} textAlign="center">
                      <Text fontSize="22px" fontWeight="700" color="green.400">
                        {miningIntel.summary.total > 0 ? Math.round(((miningIntel.summary.total - miningIntel.summary.unread) / miningIntel.summary.total) * 100) : 0}%
                      </Text>
                      <Text fontSize="9px" color={textSecondary} textTransform="uppercase" letterSpacing="0.5px">Read Rate</Text>
                    </Box>
                  </Grid>
                )}

                {/* VOLUME TREND - Bar Chart */}
                {miningIntel && miningIntel.volume_trend.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <ArrowTrendingUpIcon style={{ width: '16px', height: '16px', color: '#3B82F6' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Volume Trend</Text>
                      <Text fontSize="10px" color={textSecondary}>({miningIntel.volume_trend.length} hours)</Text>
                    </HStack>
                    <Box h="100px" position="relative">
                      <Flex h="100%" align="flex-end" gap="1px">
                        {(() => {
                          const maxCount = Math.max(...miningIntel.volume_trend.map(v => v.count), 1);
                          return miningIntel.volume_trend.map((point, i) => (
                            <Box
                              key={i}
                              flex={1}
                              minW="2px"
                              h={`${Math.max(2, (point.count / maxCount) * 100)}%`}
                              bg={point.count > maxCount * 0.7 ? 'red.400' : point.count > maxCount * 0.4 ? 'blue.400' : 'blue.200'}
                              borderRadius="2px 2px 0 0"
                              title={`${point.hour}: ${point.count} emails`}
                              _hover={{ opacity: 0.8 }}
                              transition="all 0.1s"
                            />
                          ));
                        })()}
                      </Flex>
                    </Box>
                    <HStack justify="space-between" mt={1}>
                      <Text fontSize="9px" color={textSecondary}>{miningIntel.volume_trend[0]?.hour}</Text>
                      <Text fontSize="9px" color={textSecondary}>{miningIntel.volume_trend[miningIntel.volume_trend.length - 1]?.hour}</Text>
                    </HStack>
                  </Box>
                )}

                {/* SENDER BEHAVIOR PATTERNS */}
                {miningIntel && miningIntel.sender_patterns.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <UserGroupIcon style={{ width: '16px', height: '16px', color: '#8B5CF6' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Sender Behavior Patterns</Text>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {miningIntel.sender_patterns.slice(0, 8).map((sender, i) => {
                        const relColor = sender.relationship === 'strong' ? 'green.400' : sender.relationship === 'regular' ? 'blue.400' : sender.relationship === 'occasional' ? 'orange.400' : 'gray.400';
                        const intentColorMap: Record<string, string> = {
                          marketing: 'pink', transactional: 'blue', request: 'orange',
                          meeting: 'purple', inform: 'gray', social: 'green',
                        };
                        return (
                          <HStack key={i} p={2} bg={bgSecondary} borderRadius="8px" spacing={3}
                            cursor="pointer" _hover={{ bg: bgHover }}
                            onClick={() => router.push(`/email?from=${encodeURIComponent(sender.email)}`)}
                          >
                            <Avatar size="xs" name={sender.name} bg={`hsl(${(sender.name.charCodeAt(0) * 10) % 360}, 60%, 50%)`} />
                            <VStack align="start" spacing={0} flex={1} minW={0}>
                              <HStack spacing={2} w="100%">
                                <Text fontSize="11px" fontWeight="600" color={textPrimary} noOfLines={1} flex={1}>
                                  {sender.name}
                                </Text>
                                <Badge fontSize="9px" colorScheme={intentColorMap[sender.primary_intent] || 'gray'} textTransform="capitalize">
                                  {sender.primary_intent}
                                </Badge>
                              </HStack>
                              <HStack spacing={2} mt={0.5}>
                                <Text fontSize="9px" color={textSecondary}>{sender.count} emails</Text>
                                <Box w="4px" h="4px" borderRadius="full" bg={relColor} />
                                <Text fontSize="9px" color={textSecondary} textTransform="capitalize">{sender.relationship}</Text>
                                {sender.org && <Text fontSize="9px" color={textSecondary} noOfLines={1}>{sender.org}</Text>}
                              </HStack>
                            </VStack>
                            <VStack spacing={0} align="center" minW="40px">
                              <Text fontSize="12px" fontWeight="600" color={sender.engagement_pct > 70 ? 'green.400' : sender.engagement_pct > 30 ? 'orange.400' : 'red.400'}>
                                {sender.engagement_pct}%
                              </Text>
                              <Text fontSize="8px" color={textSecondary}>read</Text>
                            </VStack>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {/* DOMAIN INTELLIGENCE */}
                {miningIntel && miningIntel.domain_intel.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <GlobeAltIcon style={{ width: '16px', height: '16px', color: '#10B981' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Domain Intelligence</Text>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {miningIntel.domain_intel.slice(0, 8).map((dom, i) => {
                        const pct = miningIntel.summary.total > 0 ? Math.round((dom.count / miningIntel.summary.total) * 100) : 0;
                        const intentColorMap: Record<string, string> = {
                          marketing: '#EC4899', transactional: '#3B82F6', request: '#F59E0B',
                          meeting: '#8B5CF6', inform: '#6B7280', social: '#10B981',
                        };
                        return (
                          <Box key={i} p={2} bg={bgSecondary} borderRadius="8px">
                            <HStack justify="space-between" mb={1}>
                              <HStack spacing={2}>
                                <Text fontSize="11px" fontWeight="600" color={textPrimary}>{dom.domain}</Text>
                                <Badge fontSize="8px" variant="outline" colorScheme="gray">{dom.unique_senders} senders</Badge>
                              </HStack>
                              <Text fontSize="10px" color={textSecondary}>{dom.count} ({pct}%)</Text>
                            </HStack>
                            <Progress
                              value={pct} size="xs" borderRadius="full" bg={border}
                              sx={{ '& > div': { background: intentColorMap[dom.primary_intent] || '#6B7280' } }}
                            />
                            <HStack mt={1} spacing={2}>
                              <Text fontSize="9px" color={textSecondary} textTransform="capitalize">{dom.primary_intent}</Text>
                              <Text fontSize="9px" color={dom.engagement_pct > 70 ? 'green.500' : dom.engagement_pct > 30 ? 'orange.500' : 'red.500'}>
                                {dom.engagement_pct}% read
                              </Text>
                            </HStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  </Box>
                )}

                {/* TEMPORAL PATTERNS - Day of Week + Hour of Day */}
                {miningIntel && (miningIntel.day_of_week.some(d => d.count > 0) || miningIntel.hour_of_day.some(h => h.count > 0)) && (
                  <Grid templateColumns="1fr 1fr" gap={4}>
                    {/* Day of Week */}
                    <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                      <HStack spacing={2} mb={3}>
                        <CalendarIcon style={{ width: '14px', height: '14px', color: '#F59E0B' }} />
                        <Text fontSize="12px" fontWeight="600" color={textPrimary}>Day of Week</Text>
                      </HStack>
                      <VStack spacing={1} align="stretch">
                        {(() => {
                          const maxDow = Math.max(...miningIntel.day_of_week.map(d => d.count), 1);
                          return miningIntel.day_of_week.map((d, i) => (
                            <HStack key={i} spacing={2}>
                              <Text fontSize="9px" color={textSecondary} w="28px" flexShrink={0}>{d.short}</Text>
                              <Box flex={1} h="10px" bg={border} borderRadius="full" overflow="hidden">
                                <Box h="100%" w={`${(d.count / maxDow) * 100}%`} bg="purple.400" borderRadius="full" />
                              </Box>
                              <Text fontSize="9px" color={textSecondary} w="16px" textAlign="right">{d.count}</Text>
                            </HStack>
                          ));
                        })()}
                      </VStack>
                    </Box>

                    {/* Hour of Day Heatmap */}
                    <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                      <HStack spacing={2} mb={3}>
                        <ClockIcon style={{ width: '14px', height: '14px', color: '#3B82F6' }} />
                        <Text fontSize="12px" fontWeight="600" color={textPrimary}>Hour of Day</Text>
                      </HStack>
                      <Grid templateColumns="repeat(6, 1fr)" gap={1}>
                        {(() => {
                          const maxHod = Math.max(...miningIntel.hour_of_day.map(h => h.count), 1);
                          return miningIntel.hour_of_day.map((h, i) => {
                            const intensity = h.count / maxHod;
                            const bg = intensity > 0.7 ? 'purple.500' : intensity > 0.4 ? 'purple.300' : intensity > 0.1 ? 'purple.100' : border;
                            return (
                              <Box
                                key={i}
                                h="20px"
                                bg={bg}
                                borderRadius="3px"
                                title={`${h.label}: ${h.count} emails`}
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                              >
                                <Text fontSize="7px" color={intensity > 0.4 ? 'white' : textSecondary} fontWeight="500">
                                  {h.hour}
                                </Text>
                              </Box>
                            );
                          });
                        })()}
                      </Grid>
                      <HStack justify="space-between" mt={1}>
                        <Text fontSize="8px" color={textSecondary}>12am</Text>
                        <Text fontSize="8px" color={textSecondary}>12pm</Text>
                        <Text fontSize="8px" color={textSecondary}>11pm</Text>
                      </HStack>
                    </Box>
                  </Grid>
                )}

                {/* ANOMALIES & PATTERN ALERTS */}
                {miningIntel && miningIntel.anomalies.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <ExclamationCircleIcon style={{ width: '16px', height: '16px', color: '#EF4444' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Anomalies & Alerts</Text>
                      <Badge colorScheme="red" fontSize="9px">{miningIntel.anomalies.length}</Badge>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {miningIntel.anomalies.map((anomaly, i) => (
                        <Box
                          key={i} p={3} bg={bgSecondary} borderRadius="8px"
                          borderLeft="3px solid"
                          borderLeftColor={anomaly.severity === 'high' ? 'red.400' : anomaly.severity === 'medium' ? 'orange.400' : 'gray.400'}
                        >
                          <Text fontSize="12px" fontWeight="600" color={textPrimary} mb={1}>{anomaly.title}</Text>
                          <Text fontSize="11px" color={textSecondary} lineHeight="1.5">{anomaly.detail}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* EMAIL HYGIENE — Delete / Unsubscribe / Block */}
                {miningIntel?.hygiene && (
                  (miningIntel.hygiene.delete_candidates.length > 0 ||
                   miningIntel.hygiene.unsubscribe_candidates.length > 0 ||
                   miningIntel.hygiene.block_domains.length > 0) && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={1}>
                      <ShieldExclamationIcon style={{ width: '16px', height: '16px', color: '#EF4444' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Email Hygiene</Text>
                      <Badge colorScheme="red" fontSize="9px">
                        {miningIntel.hygiene.delete_candidates.length +
                         miningIntel.hygiene.unsubscribe_candidates.length +
                         miningIntel.hygiene.block_domains.length}
                      </Badge>
                    </HStack>
                    <Text fontSize="10px" color={textSecondary} mb={4}>
                      Reduce noise and save compute by removing junk senders
                    </Text>

                    {/* DELETE CANDIDATES */}
                    {miningIntel.hygiene.delete_candidates.filter(c => !hygieneActioned.has(`delete:${c.email}`)).length > 0 && (
                      <Box mb={4}>
                        <HStack spacing={2} mb={2}>
                          <TrashIcon style={{ width: '13px', height: '13px', color: '#EF4444' }} />
                          <Text fontSize="12px" fontWeight="600" color="red.400">
                            Delete ({miningIntel.hygiene.delete_candidates.filter(c => !hygieneActioned.has(`delete:${c.email}`)).length})
                          </Text>
                        </HStack>
                        <VStack spacing={1} align="stretch">
                          {miningIntel.hygiene.delete_candidates
                            .filter(c => !hygieneActioned.has(`delete:${c.email}`))
                            .slice(0, 8).map((c, i) => (
                            <HStack
                              key={i} p={2} bg={bgSecondary} borderRadius="6px"
                              justify="space-between" spacing={2}
                            >
                              <VStack align="start" spacing={0} flex={1} minW={0}>
                                <Text fontSize="11px" fontWeight="500" color={textPrimary} isTruncated>{c.name}</Text>
                                <HStack spacing={1}>
                                  <Text fontSize="9px" color={textSecondary} isTruncated>{c.email}</Text>
                                  <Text fontSize="9px" color="red.400">{c.reason}</Text>
                                </HStack>
                              </VStack>
                              <HStack spacing={1} flexShrink={0}>
                                <Badge colorScheme="red" fontSize="8px" variant="subtle">{c.count}</Badge>
                                <Button
                                  size="xs" colorScheme="red" variant="ghost" fontSize="9px" h="22px" px={2}
                                  onClick={() => handleHygieneAction('delete', c.email)}
                                >
                                  Delete + Block
                                </Button>
                              </HStack>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    )}

                    {/* UNSUBSCRIBE CANDIDATES */}
                    {miningIntel.hygiene.unsubscribe_candidates.filter(c => !hygieneActioned.has(`unsubscribe:${c.email}`)).length > 0 && (
                      <Box mb={4}>
                        <HStack spacing={2} mb={2}>
                          <EnvelopeIcon style={{ width: '13px', height: '13px', color: '#8B5CF6' }} />
                          <Text fontSize="12px" fontWeight="600" color="purple.400">
                            Unsubscribe ({miningIntel.hygiene.unsubscribe_candidates.filter(c => !hygieneActioned.has(`unsubscribe:${c.email}`)).length})
                          </Text>
                        </HStack>
                        <VStack spacing={1} align="stretch">
                          {miningIntel.hygiene.unsubscribe_candidates
                            .filter(c => !hygieneActioned.has(`unsubscribe:${c.email}`))
                            .slice(0, 8).map((c, i) => (
                            <HStack
                              key={i} p={2} bg={bgSecondary} borderRadius="6px"
                              justify="space-between" spacing={2}
                            >
                              <VStack align="start" spacing={0} flex={1} minW={0}>
                                <Text fontSize="11px" fontWeight="500" color={textPrimary} isTruncated>{c.name}</Text>
                                <HStack spacing={1}>
                                  <Text fontSize="9px" color={textSecondary}>{c.total_historical} total</Text>
                                  <Text fontSize="9px" color="purple.400">{c.engagement_pct}% read</Text>
                                </HStack>
                              </VStack>
                              <HStack spacing={1} flexShrink={0}>
                                <Badge colorScheme="purple" fontSize="8px" variant="subtle">{c.intent}</Badge>
                                <Button
                                  size="xs" colorScheme="purple" variant="ghost" fontSize="9px" h="22px" px={2}
                                  onClick={() => handleHygieneAction('unsubscribe', c.email)}
                                >
                                  Unsubscribe
                                </Button>
                              </HStack>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    )}

                    {/* BLOCK DOMAINS */}
                    {miningIntel.hygiene.block_domains.filter(d => !hygieneActioned.has(`block_domain:${d.domain}`)).length > 0 && (
                      <Box>
                        <HStack spacing={2} mb={2}>
                          <ShieldExclamationIcon style={{ width: '13px', height: '13px', color: '#F59E0B' }} />
                          <Text fontSize="12px" fontWeight="600" color="orange.400">
                            Block Domains ({miningIntel.hygiene.block_domains.filter(d => !hygieneActioned.has(`block_domain:${d.domain}`)).length})
                          </Text>
                        </HStack>
                        <VStack spacing={1} align="stretch">
                          {miningIntel.hygiene.block_domains
                            .filter(d => !hygieneActioned.has(`block_domain:${d.domain}`))
                            .slice(0, 6).map((d, i) => (
                            <HStack
                              key={i} p={2} bg={bgSecondary} borderRadius="6px"
                              justify="space-between" spacing={2}
                            >
                              <VStack align="start" spacing={0} flex={1} minW={0}>
                                <Text fontSize="11px" fontWeight="600" color={textPrimary}>{d.domain}</Text>
                                <Text fontSize="9px" color={textSecondary}>
                                  {d.count} emails, {d.marketing_pct}% junk
                                </Text>
                              </VStack>
                              <HStack spacing={1} flexShrink={0}>
                                <Badge colorScheme="orange" fontSize="8px" variant="subtle">{d.count}</Badge>
                                <Button
                                  size="xs" colorScheme="orange" variant="ghost" fontSize="9px" h="22px" px={2}
                                  onClick={() => handleHygieneAction('block_domain', undefined, d.domain)}
                                >
                                  Block Domain
                                </Button>
                              </HStack>
                            </HStack>
                          ))}
                        </VStack>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </GridItem>

            {/* RIGHT COLUMN - Supporting Intelligence */}
            <GridItem>
              <VStack spacing={5} align="stretch">

                {/* INTENT DISTRIBUTION */}
                {miningIntel && Object.keys(miningIntel.summary.by_intent).length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <ChartBarIcon style={{ width: '16px', height: '16px', color: textSecondary }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Intent Distribution</Text>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {Object.entries(miningIntel.summary.by_intent)
                        .sort(([, a], [, b]) => b - a)
                        .map(([intent, count]) => {
                          const pct = miningIntel.summary.total > 0 ? Math.round((count / miningIntel.summary.total) * 100) : 0;
                          const intentColorMap: Record<string, string> = {
                            marketing: '#EC4899', transactional: '#3B82F6', request: '#F59E0B',
                            meeting: '#8B5CF6', inform: '#6B7280', social: '#10B981',
                          };
                          return (
                            <Box key={intent}>
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="11px" color={textPrimary} textTransform="capitalize">{intent}</Text>
                                <Text fontSize="10px" color={textSecondary}>{count} ({pct}%)</Text>
                              </HStack>
                              <Progress
                                value={pct} size="xs" borderRadius="full" bg={border}
                                sx={{ '& > div': { background: intentColorMap[intent] || '#6B7280' } }}
                              />
                            </Box>
                          );
                        })}
                    </VStack>
                  </Box>
                )}

                {/* SENTIMENT DISTRIBUTION */}
                {miningIntel && Object.keys(miningIntel.summary.by_sentiment).length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <SparklesIcon style={{ width: '16px', height: '16px', color: '#EC4899' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Sentiment</Text>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {Object.entries(miningIntel.summary.by_sentiment)
                        .sort(([, a], [, b]) => b - a)
                        .map(([sentiment, count]) => {
                          const pct = miningIntel.summary.total > 0 ? Math.round((count / miningIntel.summary.total) * 100) : 0;
                          const sentColorMap: Record<string, string> = {
                            positive: '#10B981', negative: '#EF4444', neutral: '#6B7280', mixed: '#F59E0B',
                          };
                          return (
                            <Box key={sentiment}>
                              <HStack justify="space-between" mb={1}>
                                <Text fontSize="11px" color={textPrimary} textTransform="capitalize">{sentiment}</Text>
                                <Text fontSize="10px" color={textSecondary}>{count} ({pct}%)</Text>
                              </HStack>
                              <Progress
                                value={pct} size="xs" borderRadius="full" bg={border}
                                sx={{ '& > div': { background: sentColorMap[sentiment] || '#6B7280' } }}
                              />
                            </Box>
                          );
                        })}
                    </VStack>
                  </Box>
                )}

                {/* TOPIC WORD CLOUD */}
                {miningIntel && miningIntel.topic_words.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <TagIcon style={{ width: '16px', height: '16px', color: '#EC4899' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Topic Cloud</Text>
                    </HStack>
                    <Flex flexWrap="wrap" gap={1} justify="center" py={2}>
                      {miningIntel.topic_words.slice(0, 40).map((word, i) => {
                        const maxWeight = miningIntel.topic_words[0]?.weight || 1;
                        const normalized = Math.max(0.3, word.weight / maxWeight);
                        const fontSize = 10 + normalized * 16;
                        const opacity = 0.5 + normalized * 0.5;
                        const colors = ['#8B5CF6', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
                        const color = colors[i % colors.length];
                        return (
                          <Text
                            key={word.text}
                            fontSize={`${fontSize}px`}
                            fontWeight={normalized > 0.6 ? '600' : '400'}
                            color={color}
                            opacity={opacity}
                            px={1}
                            cursor="default"
                            _hover={{ opacity: 1, transform: 'scale(1.1)' }}
                            transition="all 0.15s"
                            title={`${word.text}: ${word.weight}`}
                          >
                            {word.text}
                          </Text>
                        );
                      })}
                    </Flex>
                  </Box>
                )}

                {/* ANALYTICAL OBSERVATIONS */}
                {miningIntel && miningIntel.observations.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <LightBulbIcon style={{ width: '16px', height: '16px', color: '#F59E0B' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Observations</Text>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {miningIntel.observations.map((obs, i) => (
                        <HStack key={i} spacing={2} align="start">
                          <Box
                            w="6px" h="6px" borderRadius="full" mt="6px" flexShrink={0}
                            bg={obs.priority === 'high' ? 'red.400' : obs.priority === 'medium' ? 'orange.400' : 'gray.400'}
                          />
                          <Text fontSize="11px" color={textPrimary} lineHeight="1.5">{obs.text}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* ACCOUNT BREAKDOWN */}
                {miningIntel && Object.keys(miningIntel.summary.by_account).length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <EnvelopeIcon style={{ width: '16px', height: '16px', color: textSecondary }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Account Split</Text>
                    </HStack>
                    <HStack h="8px" borderRadius="full" overflow="hidden" bg={border} mb={2}>
                      {Object.entries(miningIntel.summary.by_account).map(([acct, count]) => (
                        <Box
                          key={acct}
                          h="100%"
                          w={`${(count / miningIntel.summary.total) * 100}%`}
                          bg={acct.toLowerCase().includes('work') ? 'red.400' : 'blue.400'}
                        />
                      ))}
                    </HStack>
                    <VStack spacing={1} align="stretch">
                      {Object.entries(miningIntel.summary.by_account).map(([acct, count]) => (
                        <HStack key={acct} justify="space-between">
                          <HStack spacing={2}>
                            <Box w="8px" h="8px" borderRadius="full" bg={acct.toLowerCase().includes('work') ? 'red.400' : 'blue.400'} />
                            <Text fontSize="11px" color={textPrimary}>{acct}</Text>
                          </HStack>
                          <Text fontSize="11px" color={textSecondary}>{count} ({miningIntel.summary.total > 0 ? Math.round((count / miningIntel.summary.total) * 100) : 0}%)</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* MINING RECOMMENDATIONS */}
                {miningRecommendations.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <ShieldExclamationIcon style={{ width: '16px', height: '16px', color: '#EF4444' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Cleanup Suggestions</Text>
                      <Badge colorScheme="red" fontSize="9px">{miningRecommendations.length}</Badge>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {miningRecommendations.slice(0, 5).map((rec) => (
                        <HStack
                          key={rec.id} p={2} bg={bgSecondary} borderRadius="6px"
                          cursor="pointer" _hover={{ bg: bgHover }}
                          onClick={(e) => openMiningMenu(e, rec)}
                          spacing={2}
                        >
                          <Box
                            w="6px" h="6px" borderRadius="full" flexShrink={0}
                            bg={rec.type === 'block' ? 'red.400' : rec.type === 'unsubscribe' ? 'purple.400' : 'orange.400'}
                          />
                          <VStack align="start" spacing={0} flex={1} minW={0}>
                            <Text fontSize="11px" fontWeight="500" color={textPrimary} noOfLines={1}>
                              {rec.sender_name || rec.sender_email}
                            </Text>
                            <Text fontSize="9px" color={textSecondary} noOfLines={1}>
                              {rec.email_count} emails • {rec.type}
                            </Text>
                          </VStack>
                          <IconButton
                            aria-label="Actions"
                            icon={<EllipsisHorizontalIcon style={{ width: '14px', height: '14px' }} />}
                            size="xs" variant="ghost"
                            onClick={(e) => { e.stopPropagation(); openMiningMenu(e, rec); }}
                            isLoading={processingAction === rec.id}
                          />
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}

                {/* KEY INSIGHTS */}
                {briefing?.insights && briefing.insights.length > 0 && (
                  <Box p={4} bg={bgElevated} borderRadius="12px" border="1px solid" borderColor={border}>
                    <HStack spacing={2} mb={3}>
                      <BoltIcon style={{ width: '16px', height: '16px', color: '#F59E0B' }} />
                      <Text fontSize="13px" fontWeight="600" color={textPrimary}>Key Insights</Text>
                    </HStack>
                    <VStack spacing={2} align="stretch">
                      {briefing.insights.map((insight, i) => (
                        <HStack key={i} spacing={2} align="start">
                          <Box w="5px" h="5px" borderRadius="full" bg="purple.500" mt="6px" flexShrink={0} />
                          <Text fontSize="11px" color={textPrimary} lineHeight="1.5">{insight}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            </GridItem>
          </Grid>
          )}
        </Box>
        </Box>
      </Flex>
      
      {/* Mining Recommendations Context Menu */}
      <ContextMenuEngine
        isOpen={menuState.isOpen}
        onClose={closeMenu}
        position={menuState.position}
        config={menuState.config}
      />
    </DashboardLayout>
  );
}

// ============================================================================
// SIDEBAR COMPONENTS
// ============================================================================

interface SidebarSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  textSecondary: string;
  indicator?: string;
  children: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  isExpanded,
  onToggle,
  textSecondary,
  indicator,
  children,
}) => {
  return (
    <Box mb={1}>
      <HStack
        px={2}
        py={1}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ opacity: 0.8 }}
      >
        <Box w="12px" h="12px" flexShrink={0}>
          {isExpanded ? (
            <ChevronDownIcon style={{ width: '12px', height: '12px', color: textSecondary }} />
          ) : (
            <ChevronRightIcon style={{ width: '12px', height: '12px', color: textSecondary }} />
          )}
        </Box>
        <Text
          fontSize="11px"
          fontWeight="600"
          color={textSecondary}
          textTransform="uppercase"
          letterSpacing="0.5px"
        >
          {title}
        </Text>
        {indicator && (
          <Box w="8px" h="8px" borderRadius="full" bg={indicator} ml="auto" />
        )}
      </HStack>
      <Collapse in={isExpanded} animateOpacity>
        <VStack align="stretch" spacing={0} pl={1}>
          {children}
        </VStack>
      </Collapse>
    </Box>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
  bgHover: string;
  bgSelected: string;
  textPrimary: string;
  textSecondary: string;
  textOnSelected: string;
  iconColor?: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon,
  label,
  count,
  isActive,
  onClick,
  bgHover,
  bgSelected,
  textPrimary,
  textSecondary,
  textOnSelected,
  iconColor,
}) => {
  return (
    <HStack
      px={2}
      py={1}
      cursor="pointer"
      bg={isActive ? bgSelected : 'transparent'}
      _hover={{ bg: isActive ? bgSelected : bgHover }}
      onClick={onClick}
      borderRadius="4px"
      spacing={1.5}
    >
      <Box color={isActive ? textOnSelected : (iconColor || textSecondary)} flexShrink={0}>
        {icon}
      </Box>
      <Text
        fontSize="12px"
        color={isActive ? textOnSelected : textPrimary}
        flex={1}
        noOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <Text
          fontSize="10px"
          color={isActive ? textOnSelected : textSecondary}
          fontWeight="500"
        >
          {count}
        </Text>
      )}
    </HStack>
  );
};

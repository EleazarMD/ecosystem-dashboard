/**
 * Email Draft Studio v2
 * 
 * Intelligent email composition environment with:
 * - Agent-assisted drafting with proactive suggestions
 * - Compose-from-scratch and reply modes
 * - Multi-model AI generation (Qwen3, Gemini, Claude)
 * - Real-time context awareness (sender profile, thread history, scenario detection)
 * - Workspace document integration
 * - Draft feedback loop for continuous improvement
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Input,
  Textarea,
  Button,
  FormControl,
  FormLabel,
  IconButton,
  Text,
  useToast,
  Divider,
  Box,
  Tooltip,
  Badge,
  useBreakpointValue,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Wrap,
  WrapItem,
  Collapse,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  Flex,
  Progress,
  Tag,
  TagLabel,
  TagCloseButton,
  Avatar,
  Alert,
  AlertIcon,
  AlertDescription,
  Skeleton,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
  PaperClipIcon,
  DocumentDuplicateIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  PlusIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  HeartIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  BoltIcon,
  CpuChipIcon,
  InboxArrowDownIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import type { EmailItem } from './EmailList';

// ─── Constants ──────────────────────────────────────────────────────────────

const TONE_PRESETS = [
  { id: 'professional', label: 'Professional', icon: BriefcaseIcon, color: 'blue', shortcut: 'P' },
  { id: 'friendly', label: 'Friendly', icon: HeartIcon, color: 'pink', shortcut: 'F' },
  { id: 'casual', label: 'Casual', icon: ChatBubbleLeftRightIcon, color: 'teal', shortcut: 'C' },
  { id: 'formal', label: 'Formal', icon: AcademicCapIcon, color: 'purple', shortcut: 'O' },
  { id: 'concise', label: 'Concise', icon: BoltIcon, color: 'orange', shortcut: 'B' },
] as const;

const QUICK_ACTIONS = [
  { id: 'accept', label: 'Accept', prompt: 'Express agreement and acceptance', icon: '✓', conflicts: ['decline'] },
  { id: 'decline', label: 'Decline', prompt: 'Politely decline with brief explanation', icon: '✗', conflicts: ['accept'] },
  { id: 'schedule', label: 'Schedule', prompt: 'Propose scheduling a meeting', icon: '📅', conflicts: [] },
  { id: 'clarify', label: 'Clarify', prompt: 'Request more details or clarification', icon: '?', conflicts: ['info'] },
  { id: 'delegate', label: 'Delegate', prompt: 'Refer to another person or team', icon: '→', conflicts: [] },
  { id: 'followup', label: 'Follow Up', prompt: 'Follow up on previous conversation', icon: '↻', conflicts: [] },
  { id: 'thank', label: 'Thank', prompt: 'Express gratitude and acknowledge receipt', icon: '🙏', conflicts: [] },
  { id: 'info', label: 'Inform', prompt: 'Provide requested information', icon: 'ℹ', conflicts: ['clarify'] },
] as const;

const LLM_MODELS = [
  { id: 'gemini-2-5-pro', label: 'Gemini 2.5 Pro', desc: 'Default · 1M context · Deep reasoning', provider: 'google', color: 'cyan', contextWindow: 1_048_576 },
  { id: 'minimax-m2.5', label: 'MiniMax M2.5', desc: '230B MoE · 10B active · Agentic specialist', provider: 'minimax', color: 'purple', contextWindow: 1_048_576 },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash', desc: '1M context · Fast PhD reasoning', provider: 'google', color: 'blue', contextWindow: 1_048_576 },
  { id: 'gemini-2-5-flash', label: 'Gemini 2.5 Flash', desc: '1M context · Best value', provider: 'google', color: 'blue', contextWindow: 1_048_576 },
  { id: 'qwen3-32b', label: 'Qwen3 32B', desc: 'Local · 32K context · Fast', provider: 'local', color: 'green', contextWindow: 32_768 },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', desc: '200K context · Nuanced writing', provider: 'anthropic', color: 'orange', contextWindow: 200_000 },
] as const;

const DEFAULT_MODEL = 'gemini-2-5-pro';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContextSource {
  id: string;
  type: 'email' | 'thread' | 'graph_node' | 'chroma_doc' | 'sender_profile' | 'calendar' | 'attachment';
  label: string;
  detail?: string;
  tokenEstimate?: number;
  source: 'neo4j' | 'chromadb' | 'hermes_api' | 'workspace';
}

interface RecipientIntelligence {
  email: string;
  name?: string;
  role?: string;
  organization?: string;
  department?: string;
  scope?: string;            // e.g. "Regional administrator - PCG Houston"
  boundaries?: string[];     // e.g. ["Does not control other department KPIs", "No authority over radiology scheduling"]
  relationship?: string;     // e.g. "Direct report / peer / external"
  communicationStyle?: string;
  emailCount?: number;
  lastInteraction?: string;
  topics?: string[];         // Common topics discussed
  notes?: string;            // Free-form user annotation
}

interface EmailTopic {
  id: string;
  label: string;
  category: 'action_item' | 'request' | 'information' | 'decision' | 'question' | 'fyi' | 'escalation';
  status: 'include' | 'exclude' | 'focus' | 'neutral';
  detail?: string;
  source: 'extracted' | 'manual';
}

interface DraftSuggestion {
  email_id: string;
  from_name?: string;
  from_email: string;
  subject: string;
  snippet?: string;
  urgency?: 'high' | 'medium' | 'low';
  reason?: string;
  waiting_hours?: number;
}

interface WorkspaceDocument {
  id: string;
  name: string;
  type: 'document' | 'research' | 'podcast' | 'attachment';
  summary?: string;
  path?: string;
}

interface EmailDraftStudioProps {
  isOpen: boolean;
  onClose: () => void;
  originalEmail: EmailItem | null;
  onSend?: (data: DraftData) => Promise<void>;
  /** Optional: pre-fill for compose-from-scratch mode */
  composeMode?: boolean;
  prefillTo?: string;
  prefillSubject?: string;
}

export interface DraftData {
  to: string;
  cc: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  attachments?: string[];
}

export const EmailDraftStudio: React.FC<EmailDraftStudioProps> = ({
  isOpen,
  onClose,
  originalEmail,
  onSend,
  composeMode = false,
  prefillTo,
  prefillSubject,
}) => {
  const toast = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // ─── Mode ───
  const isReply = !!originalEmail && !composeMode;

  // ─── Form state ───
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // ─── AI generation state ───
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [userInstructions, setUserInstructions] = useState('');

  // ─── Advanced options ───
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [focusTopic, setFocusTopic] = useState('');
  const [focusPoints, setFocusPoints] = useState<string[]>(['']);
  const [excludeTopics, setExcludeTopics] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  // ─── Workspace integration ───
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [workspaceDocuments, setWorkspaceDocuments] = useState<WorkspaceDocument[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);

  // ─── Context from backend ───
  const [senderContext, setSenderContext] = useState<any>(null);
  const [threadContext, setThreadContext] = useState<any>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // ─── Reply Intelligence ───
  const [replyIntelligence, setReplyIntelligence] = useState<any>(null);
  const [loadingReplyIntelligence, setLoadingReplyIntelligence] = useState(false);

  // ─── Proactive draft suggestions ───
  const [draftSuggestions, setDraftSuggestions] = useState<DraftSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0=compose, 1=suggestions, 2=context

  // ─── Context sources (transparency into what Hermes injected) ───
  const [contextSources, setContextSources] = useState<ContextSource[]>([]);
  const [loadingContextSources, setLoadingContextSources] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(false);

  // ─── Recipient Intelligence (contact role awareness) ───
  const [recipientIntel, setRecipientIntel] = useState<RecipientIntelligence | null>(null);
  const [loadingRecipientIntel, setLoadingRecipientIntel] = useState(false);

  // ─── Email Topics (extracted from original email for include/exclude) ───
  const [emailTopics, setEmailTopics] = useState<EmailTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // ─── Draft feedback ───
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [currentGenerationParams, setCurrentGenerationParams] = useState<any>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // ─── Sending state ───
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // ─── Theme tokens ───
  const bgColor = useSemanticToken('surface.base');
  const bgSecondary = useSemanticToken('surface.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const accentColor = useSemanticToken('accent.primary');

  const agentGradient = 'linear(to-r, purple.500, blue.500)';
  const agentBg = useColorModeValue('purple.50', 'rgba(128, 90, 213, 0.1)');
  const agentBorder = useColorModeValue('purple.200', 'purple.700');

  // ─── Responsive ───
  const modalSize = useBreakpointValue({ base: 'full', md: '6xl' });
  const isMobile = useBreakpointValue({ base: true, md: false });

  // ─── Word count ───
  const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);

  // ─── Initialize on open ───
  useEffect(() => {
    if (!isOpen) return;

    // Reset all state
    setBody('');
    setSelectedTone('professional');
    setSelectedActions(new Set());
    setSelectedModel(DEFAULT_MODEL);
    setContextSources([]);
    setShowContextPanel(false);
    setRecipientIntel(null);
    setEmailTopics([]);
    setUserInstructions('');
    setFocusTopic('');
    setFocusPoints(['']);
    setExcludeTopics('');
    setCustomInstructions('');
    setSelectedDocuments([]);
    setCurrentDraftId(null);
    setFeedbackGiven(false);
    setSenderContext(null);
    setThreadContext(null);
    setReplyIntelligence(null);

    if (isReply && originalEmail) {
      setTo(originalEmail.from_email || '');
      setSubject(
        originalEmail.subject?.startsWith('Re:')
          ? originalEmail.subject
          : `Re: ${originalEmail.subject || ''}`
      );
      setCc('');
      loadEmailContext();
      loadReplyIntelligence();
      loadRecipientIntelligence(originalEmail.from_email);
      loadEmailTopics(originalEmail);
    } else {
      setTo(prefillTo || '');
      setSubject(prefillSubject || '');
      setCc('');
    }

    // Always load proactive draft suggestions
    loadDraftSuggestions();
  }, [isOpen, originalEmail, composeMode]);

  // ─── Auto-fetch recipient intelligence when To field changes (debounced) ───
  const recipientTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isOpen || !to.trim() || to.trim() === recipientIntel?.email) return;
    if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current);
    recipientTimerRef.current = setTimeout(() => {
      if (to.includes('@')) loadRecipientIntelligence(to.trim());
    }, 800);
    return () => { if (recipientTimerRef.current) clearTimeout(recipientTimerRef.current); };
  }, [to, isOpen]);

  // ─── Load proactive draft suggestions ───
  const loadDraftSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/hermes-proxy?path=v1/intelligence/hub/draft-suggestions?limit=8');
      if (res.ok) {
        const data = await res.json();
        setDraftSuggestions(data.suggestions || data.items || data || []);
      }
    } catch (error) {
      console.error('Failed to load draft suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // ─── Load recipient intelligence (contact role, org, boundaries) ───
  const loadRecipientIntelligence = async (email: string) => {
    if (!email || !email.includes('@')) return;

    setLoadingRecipientIntel(true);
    try {
      // Primary: fetch from /intelligence endpoint (has all annotated fields)
      // Fallback: multi-endpoint approach for contacts without annotations
      const [intelRes, profileRes, patternRes] = await Promise.allSettled([
        fetch(`/api/hermes-proxy?path=v1/contacts/${encodeURIComponent(email)}/intelligence`),
        fetch(`/api/hermes-proxy?path=v1/reply/sender/${encodeURIComponent(email)}/profile`),
        fetch(`/api/hermes-proxy?path=v1/emails/patterns/sender/${encodeURIComponent(email)}`),
      ]);

      const intel: RecipientIntelligence = { email };

      // Primary intelligence endpoint (Neo4j graph annotations)
      if (intelRes.status === 'fulfilled' && intelRes.value.ok) {
        const data = await intelRes.value.json();
        if (data.has_intel || data.name || data.role) {
          intel.name = data.name;
          intel.role = data.role;
          intel.organization = data.organization;
          intel.department = data.department;
          intel.scope = data.scope;
          intel.boundaries = data.boundaries || [];
          intel.relationship = data.relationship;
          intel.notes = data.notes;
          intel.emailCount = data.email_count || data.emails_sent + data.emails_received;
        } else if (data.email_count) {
          intel.emailCount = data.email_count;
          intel.name = data.name;
        }
      }

      // Sender communication profile (supplements intelligence)
      if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
        const p = await profileRes.value.json();
        if (p.profile) {
          intel.communicationStyle = p.profile.communication_style;
          if (!intel.name && p.profile.sender_name) intel.name = p.profile.sender_name;
        }
      }

      // Email patterns (supplements intelligence)
      if (patternRes.status === 'fulfilled' && patternRes.value.ok) {
        const pat = await patternRes.value.json();
        if (pat.last_email_date) intel.lastInteraction = pat.last_email_date;
        if (pat.total_emails && !intel.emailCount) intel.emailCount = pat.total_emails;
        if (pat.common_topics?.length && !intel.topics?.length) intel.topics = pat.common_topics;
      }

      setRecipientIntel(intel);
    } catch (error) {
      console.error('Failed to load recipient intelligence:', error);
    } finally {
      setLoadingRecipientIntel(false);
    }
  };

  // ─── Save contact annotation from Draft Studio ───
  const saveContactAnnotation = async (fields: Partial<RecipientIntelligence>) => {
    if (!recipientIntel?.email) return;
    try {
      const res = await fetch(`/api/hermes-proxy?path=v1/contacts/${encodeURIComponent(recipientIntel.email)}/annotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, source: 'manual' }),
      });
      if (res.ok) {
        setRecipientIntel(prev => prev ? { ...prev, ...fields } : prev);
        toast({ title: 'Contact updated', description: `Saved to Neo4j graph`, status: 'success', duration: 2000 });
      }
    } catch (error) {
      console.error('Failed to save annotation:', error);
      toast({ title: 'Save failed', status: 'error', duration: 2000 });
    }
  };

  // ─── Load email topics (extract from original email for include/exclude) ───
  const loadEmailTopics = async (email: EmailItem) => {
    setLoadingTopics(true);
    try {
      // Try to extract topics from the email content via analyze endpoint
      const [analyzeRes, actionsRes] = await Promise.allSettled([
        fetch(`/api/hermes-proxy?path=v1/intelligence/analyze/${encodeURIComponent(email.id)}`),
        fetch(`/api/hermes-proxy?path=v1/intelligence/extract-actions/${encodeURIComponent(email.id)}`),
      ]);

      const topics: EmailTopic[] = [];
      let topicIdx = 0;

      // Extract topics from analysis
      if (analyzeRes.status === 'fulfilled' && analyzeRes.value.ok) {
        const analysis = await analyzeRes.value.json();

        // Topics from the email analysis
        if (analysis.topics?.length) {
          for (const t of analysis.topics) {
            const label = typeof t === 'string' ? t : (t.topic || t.label || t.name);
            if (label) {
              topics.push({
                id: `topic-${topicIdx++}`,
                label,
                category: 'information',
                status: 'neutral',
                detail: typeof t === 'object' ? t.detail : undefined,
                source: 'extracted',
              });
            }
          }
        }

        // Questions identified
        if (analysis.questions?.length) {
          for (const q of analysis.questions) {
            const label = typeof q === 'string' ? q : (q.question || q.text);
            if (label) {
              topics.push({
                id: `question-${topicIdx++}`,
                label: label.length > 60 ? label.slice(0, 57) + '...' : label,
                category: 'question',
                status: 'include',
                detail: label,
                source: 'extracted',
              });
            }
          }
        }

        // Requests identified
        if (analysis.requests?.length) {
          for (const r of analysis.requests) {
            const label = typeof r === 'string' ? r : (r.request || r.text);
            if (label) {
              topics.push({
                id: `request-${topicIdx++}`,
                label: label.length > 60 ? label.slice(0, 57) + '...' : label,
                category: 'request',
                status: 'include',
                detail: label,
                source: 'extracted',
              });
            }
          }
        }

        // Decisions needed
        if (analysis.decisions?.length) {
          for (const d of analysis.decisions) {
            const label = typeof d === 'string' ? d : (d.decision || d.text);
            if (label) {
              topics.push({
                id: `decision-${topicIdx++}`,
                label: label.length > 60 ? label.slice(0, 57) + '...' : label,
                category: 'decision',
                status: 'include',
                detail: label,
                source: 'extracted',
              });
            }
          }
        }

        // Urgency / escalation markers
        if (analysis.urgency === 'high' || analysis.priority === 'high') {
          topics.push({
            id: `escalation-${topicIdx++}`,
            label: 'Urgent / High Priority',
            category: 'escalation',
            status: 'focus',
            source: 'extracted',
          });
        }
      }

      // Extract action items
      if (actionsRes.status === 'fulfilled' && actionsRes.value.ok) {
        const actions = await actionsRes.value.json();
        if (actions.action_items?.length) {
          for (const ai of actions.action_items) {
            const label = ai.action || ai.description || ai.text;
            if (label) {
              topics.push({
                id: `action-${topicIdx++}`,
                label: label.length > 60 ? label.slice(0, 57) + '...' : label,
                category: 'action_item',
                status: 'include',
                detail: label,
                source: 'extracted',
              });
            }
          }
        }
      }

      // If no topics extracted, create fallback from subject
      if (topics.length === 0 && email.subject) {
        topics.push({
          id: 'subject-topic',
          label: email.subject.replace(/^(Re:|Fwd:)\s*/gi, '').trim(),
          category: 'information',
          status: 'include',
          source: 'extracted',
        });
      }

      setEmailTopics(topics);
    } catch (error) {
      console.error('Failed to load email topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  };

  // ─── Toggle topic status ───
  const cycleTopicStatus = (topicId: string) => {
    setEmailTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      const cycle: Record<EmailTopic['status'], EmailTopic['status']> = {
        neutral: 'include',
        include: 'focus',
        focus: 'exclude',
        exclude: 'neutral',
      };
      return { ...t, status: cycle[t.status] };
    }));
  };

  // ─── Load sender and thread context ───
  const loadEmailContext = async () => {
    if (!originalEmail) return;

    setLoadingContext(true);
    try {
      const [senderRes, threadRes] = await Promise.allSettled([
        fetch(`/api/hermes-proxy?path=v1/reply/sender/${encodeURIComponent(originalEmail.from_email)}/profile`),
        (originalEmail as any).thread_id
          ? fetch(`/api/hermes-proxy?path=v1/emails/thread/${encodeURIComponent((originalEmail as any).thread_id)}`)
          : Promise.resolve(null),
      ]);

      if (senderRes.status === 'fulfilled' && senderRes.value?.ok) {
        setSenderContext(await senderRes.value.json());
      }
      if (threadRes.status === 'fulfilled' && (threadRes.value as Response | null)?.ok) {
        setThreadContext(await (threadRes.value as Response).json());
      }
    } catch (error) {
      console.error('Failed to load context:', error);
    } finally {
      setLoadingContext(false);
    }
  };

  // ─── Load reply intelligence ───
  const loadReplyIntelligence = async () => {
    if (!originalEmail) return;

    setLoadingReplyIntelligence(true);
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/reply/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: originalEmail.id,
          include_research: true,
          include_templates: true,
          max_documents: 5,
          max_conversations: 3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplyIntelligence(data);

        if (data.sender_profile?.communication_style) {
          const styleToTone: Record<string, string> = {
            formal: 'formal',
            professional: 'professional',
            casual: 'casual',
          };
          const mappedTone = styleToTone[data.sender_profile.communication_style];
          if (mappedTone) setSelectedTone(mappedTone);
        }
      }
    } catch (error) {
      console.error('Failed to load reply intelligence:', error);
    } finally {
      setLoadingReplyIntelligence(false);
    }
  };

  // ─── Load workspace documents ───
  const loadWorkspaceDocuments = async () => {
    setLoadingWorkspace(true);
    try {
      const [docsRes, researchRes] = await Promise.allSettled([
        fetch('/api/workspace/documents?limit=20'),
        fetch('/api/ai-research/recent?limit=10'),
      ]);

      const documents: WorkspaceDocument[] = [];

      if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
        const docs = await docsRes.value.json();
        documents.push(
          ...(docs.documents || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            type: 'document' as const,
            summary: d.summary,
            path: d.path,
          }))
        );
      }

      if (researchRes.status === 'fulfilled' && researchRes.value.ok) {
        const research = await researchRes.value.json();
        documents.push(
          ...(research.items || []).map((r: any) => ({
            id: r.id,
            name: r.title || r.query,
            type: 'research' as const,
            summary: r.summary,
          }))
        );
      }

      setWorkspaceDocuments(documents);
    } catch (error) {
      console.error('Failed to load workspace:', error);
    } finally {
      setLoadingWorkspace(false);
    }
  };

  // ─── Compute context window budget for selected model ───
  const currentModelSpec = useMemo(() => LLM_MODELS.find(m => m.id === selectedModel), [selectedModel]);
  const contextBudgetTokens = currentModelSpec?.contextWindow ?? 32_768;
  const totalContextUsed = useMemo(() => contextSources.reduce((sum, s) => sum + (s.tokenEstimate || 0), 0), [contextSources]);

  // ─── Generate AI draft ───
  const generateDraft = async () => {
    if (isReply && !originalEmail) return;

    setIsGenerating(true);
    setGenerationProgress(5);
    setContextSources([]);
    setLoadingContextSources(true);

    try {
      const modelSpec = LLM_MODELS.find(m => m.id === selectedModel);
      const maxContextTokens = modelSpec?.contextWindow ?? 32_768;

      const requestBody: Record<string, any> = {
        tone: selectedTone,
        model: selectedModel,
        // Request Hermes to use the full context window: inject graph + vector context
        include_full_context: true,
        max_context_tokens: Math.min(maxContextTokens, 500_000), // Cap at 500K for safety
        include_graph_context: true,    // Traverse Neo4j relationship graph
        include_vector_context: true,   // Search ChromaDB for relevant emails/docs
        include_thread_history: true,   // Full thread history
        include_sender_profile: true,   // Sender communication style
        include_calendar_context: true, // Upcoming meetings with this contact
      };

      if (isReply && originalEmail) {
        requestBody.email_id = originalEmail.id;
      } else {
        requestBody.compose_mode = true;
        requestBody.to = to;
        requestBody.subject = subject;
        if (body.trim()) requestBody.partial_draft = body;
      }

      if (selectedActions.size > 0) {
        requestBody.action_prompts = QUICK_ACTIONS
          .filter(a => selectedActions.has(a.id))
          .map(a => a.prompt);
      }

      if (userInstructions.trim()) requestBody.user_instructions = userInstructions.trim();
      if (focusTopic.trim()) requestBody.focus_topic = focusTopic.trim();

      const validPoints = focusPoints.filter(p => p.trim());
      if (validPoints.length > 0) requestBody.focus_points = validPoints;
      if (excludeTopics.trim()) requestBody.exclude_topics = excludeTopics.split(',').map(t => t.trim());
      if (customInstructions.trim()) requestBody.additional_context = customInstructions.trim();

      if (selectedDocuments.length > 0) {
        requestBody.workspace_context = workspaceDocuments
          .filter(d => selectedDocuments.includes(d.id))
          .map(d => ({ name: d.name, type: d.type, summary: d.summary }));
      }

      // Inject recipient intelligence so the LLM knows the contact's role and boundaries
      if (recipientIntel) {
        requestBody.recipient_context = {
          email: recipientIntel.email,
          name: recipientIntel.name,
          role: recipientIntel.role,
          organization: recipientIntel.organization,
          department: recipientIntel.department,
          scope: recipientIntel.scope,
          boundaries: recipientIntel.boundaries,
          relationship: recipientIntel.relationship,
          communication_style: recipientIntel.communicationStyle,
          notes: recipientIntel.notes,
        };
      }

      // Inject topic selections: include, exclude, and focus topics
      const includedTopics = emailTopics.filter(t => t.status === 'include' || t.status === 'focus');
      const excludedTopics = emailTopics.filter(t => t.status === 'exclude');
      const focusedTopics = emailTopics.filter(t => t.status === 'focus');

      if (includedTopics.length > 0) {
        requestBody.include_topics = includedTopics.map(t => t.detail || t.label);
      }
      if (excludedTopics.length > 0) {
        requestBody.exclude_topics = [
          ...(requestBody.exclude_topics || []),
          ...excludedTopics.map(t => t.detail || t.label),
        ];
      }
      if (focusedTopics.length > 0) {
        requestBody.focus_topics = focusedTopics.map(t => t.detail || t.label);
      }

      setGenerationProgress(20);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s for large context

      const endpoint = isReply
        ? '/api/hermes-proxy?path=v1/intelligence/reply/generate'
        : '/api/hermes-proxy?path=v1/intelligence/compose/suggest';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setGenerationProgress(70);

      if (response.ok) {
        const data = await response.json();
        const generatedText = data.body || data.reply || data.draft || data.suggestion || '';
        setBody(generatedText);
        setGenerationProgress(90);

        // Build context sources from API response for transparency
        const sources: ContextSource[] = [];

        // Original email context
        if (isReply && originalEmail) {
          sources.push({
            id: `email-${originalEmail.id}`,
            type: 'email',
            label: `Original: ${originalEmail.subject}`,
            detail: `From ${originalEmail.from_name || originalEmail.from_email}`,
            tokenEstimate: Math.round(((originalEmail as any).body?.length || 500) / 4),
            source: 'hermes_api',
          });
        }

        // Thread history from API response
        if (data.context_sources?.thread_emails) {
          for (const te of data.context_sources.thread_emails) {
            sources.push({
              id: `thread-${te.id || te.email_id}`,
              type: 'thread',
              label: te.subject || 'Thread message',
              detail: `${te.from_name || te.from_email || 'Unknown'} · ${te.date || ''}`,
              tokenEstimate: te.token_count || Math.round((te.body_length || 300) / 4),
              source: 'hermes_api',
            });
          }
        }

        // Neo4j graph nodes
        if (data.context_sources?.graph_nodes) {
          for (const gn of data.context_sources.graph_nodes) {
            sources.push({
              id: `graph-${gn.id || gn.node_id}`,
              type: 'graph_node',
              label: gn.label || gn.name || 'Graph relationship',
              detail: gn.relationship || gn.type || 'Neo4j',
              tokenEstimate: gn.token_count || 200,
              source: 'neo4j',
            });
          }
        }

        // ChromaDB vector search results
        if (data.context_sources?.vector_results) {
          for (const vr of data.context_sources.vector_results) {
            sources.push({
              id: `chroma-${vr.id || vr.doc_id}`,
              type: 'chroma_doc',
              label: vr.subject || vr.title || 'Related email',
              detail: `Score: ${vr.score ? (vr.score * 100).toFixed(0) + '%' : 'N/A'} · ${vr.from_email || vr.source || ''}`,
              tokenEstimate: vr.token_count || Math.round((vr.content_length || 400) / 4),
              source: 'chromadb',
            });
          }
        }

        // Sender profile
        if (data.context_sources?.sender_profile || senderContext) {
          sources.push({
            id: 'sender-profile',
            type: 'sender_profile',
            label: `Sender profile: ${originalEmail?.from_name || originalEmail?.from_email || to}`,
            detail: senderContext?.communication_style || data.context_sources?.sender_profile?.style || 'Communication style data',
            tokenEstimate: 500,
            source: 'neo4j',
          });
        }

        // Calendar context
        if (data.context_sources?.calendar_events) {
          for (const ce of data.context_sources.calendar_events) {
            sources.push({
              id: `cal-${ce.id || ce.event_id}`,
              type: 'calendar',
              label: ce.title || 'Calendar event',
              detail: ce.date || ce.time || '',
              tokenEstimate: 200,
              source: 'hermes_api',
            });
          }
        }

        // Workspace documents injected
        if (selectedDocuments.length > 0) {
          for (const docId of selectedDocuments) {
            const doc = workspaceDocuments.find(d => d.id === docId);
            if (doc) {
              sources.push({
                id: `ws-${doc.id}`,
                type: 'attachment',
                label: doc.name,
                detail: `Workspace ${doc.type}`,
                tokenEstimate: 1000,
                source: 'workspace',
              });
            }
          }
        }

        // If API didn't return structured sources, create synthetic entries from reply intelligence
        if (sources.length <= 1 && replyIntelligence) {
          if (replyIntelligence.related_documents?.length > 0) {
            for (const rd of replyIntelligence.related_documents.slice(0, 5)) {
              sources.push({
                id: `ri-${rd.id || Math.random().toString(36).substr(2, 6)}`,
                type: 'chroma_doc',
                label: rd.title || 'Related document',
                detail: `${rd.source?.replace(/_/g, ' ') || 'Email history'}`,
                tokenEstimate: rd.token_count || 400,
                source: 'chromadb',
              });
            }
          }
          if (replyIntelligence.sender_profile) {
            sources.push({
              id: 'ri-sender',
              type: 'sender_profile',
              label: `Style: ${replyIntelligence.sender_profile.communication_style || 'professional'}`,
              detail: `Greeting: ${replyIntelligence.sender_profile.preferred_greeting || 'Hi'}`,
              tokenEstimate: 300,
              source: 'neo4j',
            });
          }
        }

        setContextSources(sources);
        setShowContextPanel(sources.length > 0);
        setGenerationProgress(100);

        const draftId = `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setCurrentDraftId(draftId);
        setCurrentGenerationParams({
          model: selectedModel,
          tone: selectedTone,
          quick_actions: Array.from(selectedActions),
          user_instructions: userInstructions.trim() || null,
          context_sources_count: sources.length,
          context_tokens_used: sources.reduce((sum, s) => sum + (s.tokenEstimate || 0), 0),
        });
        setFeedbackGiven(false);

        toast({
          title: 'Draft Generated',
          description: `${modelSpec?.label || selectedModel} · ${selectedTone} · ${sources.length} context sources`,
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error('Generation failed');
      }
    } catch (error: any) {
      console.error('Generation error:', error);

      if (isReply && originalEmail) {
        const greeting = originalEmail.from_name?.split(' ')[0] || 'there';
        setBody(
          `Hi ${greeting},\n\nThank you for your email regarding "${originalEmail.subject}".\n\n[Your response here]\n\nBest regards`
        );
      }

      toast({
        title: error.name === 'AbortError' ? 'Generation Timed Out' : 'Using Template',
        description: error.name === 'AbortError' ? 'Try a faster model' : 'AI generation unavailable',
        status: 'warning',
        duration: 3000,
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setLoadingContextSources(false);
    }
  };

  // ─── Submit draft feedback ───
  const submitDraftFeedback = async (rating: number) => {
    if (!currentDraftId || !currentGenerationParams) return;

    try {
      const response = await fetch('/api/hermes-proxy?path=v1/draft-feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: originalEmail?.id || 'compose',
          draft_id: currentDraftId,
          rating,
          generation_params: currentGenerationParams,
          generated_text: body,
        }),
      });

      if (response.ok) {
        setFeedbackGiven(true);
        toast({
          title: rating === 1 ? 'Thanks!' : 'Noted',
          description: 'Feedback helps improve future drafts',
          status: 'success',
          duration: 1500,
        });
      }
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  // ─── Rewrite with different tone ───
  const rewriteWithTone = async (newTone: string) => {
    if (!body.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/hermes-proxy?path=v1/intelligence/draft/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_text: body,
          tone: newTone,
          model: selectedModel,
          instructions: userInstructions || customInstructions || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setBody(data.rewritten_text || data.text || body);
        setSelectedTone(newTone);
        toast({ title: `Rewritten as ${newTone}`, status: 'success', duration: 1500 });
      }
    } catch (error) {
      console.error('Rewrite error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Handle send ───
  const handleSend = async () => {
    if (!to.trim()) {
      toast({ title: 'Missing recipient', status: 'warning', duration: 2000 });
      return;
    }

    setSending(true);
    try {
      if (onSend) {
        await onSend({ to, cc, subject, body, inReplyTo: originalEmail?.id });
      }
      toast({ title: 'Email Sent', status: 'success', duration: 2000 });
      onClose();
    } catch (error) {
      toast({ title: 'Send Failed', status: 'error', duration: 3000 });
    } finally {
      setSending(false);
    }
  };

  // ─── Copy to clipboard ───
  const copyToClipboard = async () => {
    const emailText = `To: ${to}\n${cc ? `Cc: ${cc}\n` : ''}Subject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(emailText);
    toast({ title: 'Copied', status: 'info', duration: 1500 });
  };

  // ─── Save draft to Mac Mail ───
  const handleSaveDraft = async () => {
    if (!to.trim() || !subject.trim()) {
      toast({ title: 'Enter recipient and subject first', status: 'warning', duration: 2000 });
      return;
    }

    setSavingDraft(true);
    try {
      await navigator.clipboard.writeText(
        `To: ${to}\n${cc ? `Cc: ${cc}\n` : ''}Subject: ${subject}\n\n${body}`
      );

      // Try Mac Mail agent
      try {
        const response = await fetch('/api/hermes-proxy?path=v1/emails/draft/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            subject,
            body,
            cc: cc || undefined,
            in_reply_to: originalEmail?.id,
          }),
        });

        const data = await response.json();
        toast({
          title: data.success ? 'Saved to Mac Mail' : 'Copied to clipboard',
          description: data.success ? 'Draft created in Mac Mail' : 'Paste into your email client',
          status: 'success',
          duration: 3000,
        });
      } catch {
        toast({ title: 'Copied to clipboard', description: 'Paste into your email client', status: 'success', duration: 3000 });
      }
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, status: 'error', duration: 3000 });
    } finally {
      setSavingDraft(false);
    }
  };

  // ─── Focus point helpers ───
  const addFocusPoint = () => setFocusPoints([...focusPoints, '']);
  const updateFocusPoint = (index: number, value: string) => {
    const updated = [...focusPoints];
    updated[index] = value;
    setFocusPoints(updated);
  };
  const removeFocusPoint = (index: number) => {
    if (focusPoints.length > 1) setFocusPoints(focusPoints.filter((_, i) => i !== index));
  };

  const toggleDocument = (docId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // ─── Apply a draft suggestion (switch to replying to that email) ───
  const applySuggestion = (suggestion: DraftSuggestion) => {
    setTo(suggestion.from_email);
    setSubject(
      suggestion.subject.startsWith('Re:') ? suggestion.subject : `Re: ${suggestion.subject}`
    );
    setActiveTab(0);
    toast({ title: `Replying to ${suggestion.from_name || suggestion.from_email}`, status: 'info', duration: 2000 });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={modalSize} scrollBehavior="inside" closeOnOverlayClick={false} closeOnEsc={false}>
      <ModalOverlay backdropFilter="blur(6px)" bg="blackAlpha.400" />
      <ModalContent
        bg={bgColor}
        maxW={{ base: '100%', md: '1200px' }}
        m={{ base: 0, md: 4 }}
        mt={{ base: 0, md: '8vh' }}
        borderRadius={{ base: 0, md: 'xl' }}
        h={{ base: '100vh', md: 'auto' }}
        maxH={{ base: '100vh', md: '82vh' }}
        overflow="hidden"
      >
        {/* ─── Header ─── */}
        <ModalHeader py={3} borderBottom="1px solid" borderColor={borderColor} px={5}>
          <HStack justify="space-between" w="full">
            <HStack spacing={3}>
              <Box p={1.5} borderRadius="lg" bgGradient={agentGradient}>
                <Icon as={SparklesIcon} boxSize={4} color="white" />
              </Box>
              <VStack align="start" spacing={0}>
                <Text fontSize="md" fontWeight="700" letterSpacing="-0.01em">
                  Draft Studio
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  {isReply ? `Replying to ${originalEmail?.from_name || originalEmail?.from_email || ''}` : 'New composition'}
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={2}>
              {loadingContext && <Spinner size="xs" color="purple.500" />}
              {/* Model selector - compact in header */}
              <Menu>
                <MenuButton
                  as={Button}
                  size="xs"
                  variant="ghost"
                  rightIcon={<Icon as={ChevronDownIcon} boxSize={3} />}
                >
                  <HStack spacing={1}>
                    <Icon as={CpuChipIcon} boxSize={3.5} color="purple.500" />
                    <Text fontSize="xs">{LLM_MODELS.find(m => m.id === selectedModel)?.label}</Text>
                  </HStack>
                </MenuButton>
                <MenuList zIndex={1500} minW="280px">
                  {LLM_MODELS.map(model => (
                    <MenuItem
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      bg={selectedModel === model.id ? `${model.color}.50` : undefined}
                    >
                      <HStack w="full" justify="space-between">
                        <VStack align="start" spacing={0}>
                          <Text fontSize="sm" fontWeight={selectedModel === model.id ? '600' : '400'}>
                            {model.label}
                          </Text>
                          <Text fontSize="xs" color={textSecondary}>{model.desc}</Text>
                        </VStack>
                        <Badge size="sm" colorScheme={model.color} variant="subtle">
                          {model.provider}
                        </Badge>
                      </HStack>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton top={3} />

        {/* ─── Body: Two-panel layout ─── */}
        <ModalBody p={0}>
          <Flex direction={{ base: 'column', md: 'row' }} h={{ base: 'auto', md: 'calc(88vh - 130px)' }}>

            {/* ═══════ LEFT PANEL: AI Controls + Suggestions ═══════ */}
            <Box
              w={{ base: 'full', md: '340px' }}
              minW={{ md: '340px' }}
              borderRight={{ base: 'none', md: '1px solid' }}
              borderColor={borderColor}
              overflowY="auto"
              bg={bgSecondary}
            >
              <Tabs index={activeTab} onChange={setActiveTab} size="sm" variant="enclosed-colored" colorScheme="purple">
                <TabList px={3} pt={3} borderBottom="none">
                  <Tab fontSize="xs" fontWeight="600" _selected={{ bg: bgColor, color: textPrimary, borderColor: borderColor, borderBottom: 'none' }}>
                    <HStack spacing={1.5}>
                      <Icon as={SparklesIcon} boxSize={3.5} />
                      <Text>AI Compose</Text>
                    </HStack>
                  </Tab>
                  <Tab fontSize="xs" fontWeight="600" _selected={{ bg: bgColor, color: textPrimary, borderColor: borderColor, borderBottom: 'none' }}>
                    <HStack spacing={1.5}>
                      <Icon as={LightBulbIcon} boxSize={3.5} />
                      <Text>Suggestions</Text>
                      {draftSuggestions.length > 0 && (
                        <Badge colorScheme="purple" variant="solid" fontSize="9px" px={1.5} borderRadius="full">
                          {draftSuggestions.length}
                        </Badge>
                      )}
                    </HStack>
                  </Tab>
                </TabList>

                <TabPanels>
                  {/* ── Tab 0: AI Compose Controls ── */}
                  <TabPanel px={4} py={3}>
                    <VStack align="stretch" spacing={4}>

                      {/* Tone chips */}
                      <Box>
                        <Text fontSize="10px" fontWeight="700" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                          Tone
                        </Text>
                        <Wrap spacing={1.5}>
                          {TONE_PRESETS.map(tone => (
                            <WrapItem key={tone.id}>
                              <Button
                                size="xs"
                                leftIcon={<Icon as={tone.icon} boxSize={3} />}
                                variant={selectedTone === tone.id ? 'solid' : 'outline'}
                                colorScheme={selectedTone === tone.id ? tone.color : 'gray'}
                                borderRadius="full"
                                onClick={() => {
                                  if (body.trim() && selectedTone !== tone.id) {
                                    rewriteWithTone(tone.id);
                                  } else {
                                    setSelectedTone(tone.id);
                                  }
                                }}
                              >
                                {tone.label}
                              </Button>
                            </WrapItem>
                          ))}
                        </Wrap>
                      </Box>

                      {/* Quick Actions */}
                      <Box>
                        <Text fontSize="10px" fontWeight="700" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                          Quick Actions
                          {selectedActions.size > 0 && (
                            <Badge ml={1.5} colorScheme="purple" variant="solid" fontSize="9px" borderRadius="full">
                              {selectedActions.size}
                            </Badge>
                          )}
                        </Text>
                        <Wrap spacing={1.5}>
                          {QUICK_ACTIONS.map(action => {
                            const isSelected = selectedActions.has(action.id);
                            const isDisabled = !isSelected && action.conflicts.some((c: string) => selectedActions.has(c));
                            return (
                              <WrapItem key={action.id}>
                                <Tooltip label={isDisabled ? 'Conflicts with selection' : action.prompt} hasArrow>
                                  <Button
                                    size="xs"
                                    variant={isSelected ? 'solid' : 'outline'}
                                    colorScheme={isSelected ? 'purple' : 'gray'}
                                    isDisabled={isDisabled}
                                    opacity={isDisabled ? 0.4 : 1}
                                    borderRadius="full"
                                    onClick={() => {
                                      setSelectedActions(prev => {
                                        const next = new Set(prev);
                                        if (next.has(action.id)) {
                                          next.delete(action.id);
                                        } else {
                                          next.add(action.id);
                                          action.conflicts.forEach((c: string) => next.delete(c));
                                        }
                                        return next;
                                      });
                                    }}
                                  >
                                    <HStack spacing={1}>
                                      <Text fontSize="xs">{action.icon}</Text>
                                      <Text>{action.label}</Text>
                                    </HStack>
                                  </Button>
                                </Tooltip>
                              </WrapItem>
                            );
                          })}
                        </Wrap>
                      </Box>

                      {/* Recipient Intelligence */}
                      {(loadingRecipientIntel || recipientIntel) && (
                        <Box p={3} bg={agentBg} borderRadius="lg" border="1px solid" borderColor={agentBorder}>
                          <HStack mb={2} justify="space-between">
                            <HStack spacing={1.5}>
                              <Icon as={UserCircleIcon} boxSize={3.5} color="purple.500" />
                              <Text fontSize="10px" fontWeight="700" color="purple.600" textTransform="uppercase" letterSpacing="0.05em">
                                Recipient
                              </Text>
                            </HStack>
                            {loadingRecipientIntel && <Spinner size="xs" color="purple.500" />}
                          </HStack>
                          {recipientIntel && (
                            <VStack align="stretch" spacing={1.5}>
                              {recipientIntel.name && (
                                <Text fontSize="xs" fontWeight="600" color={textPrimary}>
                                  {recipientIntel.name}
                                </Text>
                              )}
                              {recipientIntel.role && (
                                <HStack spacing={1}>
                                  <Badge colorScheme="blue" variant="subtle" fontSize="9px" borderRadius="full">Role</Badge>
                                  <Text fontSize="xs" color={textPrimary}>{recipientIntel.role}</Text>
                                </HStack>
                              )}
                              {recipientIntel.organization && (
                                <HStack spacing={1}>
                                  <Badge colorScheme="cyan" variant="subtle" fontSize="9px" borderRadius="full">Org</Badge>
                                  <Text fontSize="xs" color={textSecondary}>
                                    {recipientIntel.organization}{recipientIntel.department ? ` · ${recipientIntel.department}` : ''}
                                  </Text>
                                </HStack>
                              )}
                              {recipientIntel.scope && (
                                <HStack spacing={1}>
                                  <Badge colorScheme="green" variant="subtle" fontSize="9px" borderRadius="full">Scope</Badge>
                                  <Text fontSize="xs" color={textSecondary}>{recipientIntel.scope}</Text>
                                </HStack>
                              )}
                              {recipientIntel.boundaries && recipientIntel.boundaries.length > 0 && (
                                <Box>
                                  <Badge colorScheme="orange" variant="subtle" fontSize="9px" borderRadius="full" mb={1}>Boundaries</Badge>
                                  {recipientIntel.boundaries.map((b, i) => (
                                    <Text key={i} fontSize="xs" color="orange.600" pl={2}>
                                      • {b}
                                    </Text>
                                  ))}
                                </Box>
                              )}
                              {recipientIntel.relationship && (
                                <Text fontSize="xs" color={textSecondary}>
                                  Relationship: {recipientIntel.relationship}
                                </Text>
                              )}
                              {recipientIntel.emailCount && (
                                <Text fontSize="xs" color={textSecondary}>
                                  {recipientIntel.emailCount.toLocaleString()} emails exchanged
                                </Text>
                              )}
                              {recipientIntel.communicationStyle && (
                                <Badge colorScheme="gray" variant="subtle" fontSize="9px" w="fit-content" borderRadius="full">
                                  Style: {recipientIntel.communicationStyle}
                                </Badge>
                              )}
                              {recipientIntel.topics && recipientIntel.topics.length > 0 && (
                                <Wrap spacing={1}>
                                  {recipientIntel.topics.slice(0, 5).map((t, i) => (
                                    <WrapItem key={i}>
                                      <Badge size="sm" colorScheme="gray" variant="outline" fontSize="9px" borderRadius="full">{t}</Badge>
                                    </WrapItem>
                                  ))}
                                </Wrap>
                              )}
                            </VStack>
                          )}
                        </Box>
                      )}

                      {/* Email Topics — extracted from original email, click to cycle: neutral → include → focus → exclude */}
                      {(loadingTopics || emailTopics.length > 0) && (
                        <Box>
                          <HStack mb={2} justify="space-between">
                            <Text fontSize="10px" fontWeight="700" color={textSecondary} textTransform="uppercase" letterSpacing="0.05em">
                              Topics
                              {emailTopics.filter(t => t.status !== 'neutral').length > 0 && (
                                <Badge ml={1.5} colorScheme="purple" variant="solid" fontSize="9px" borderRadius="full">
                                  {emailTopics.filter(t => t.status !== 'neutral').length}
                                </Badge>
                              )}
                            </Text>
                            {loadingTopics && <Spinner size="xs" />}
                          </HStack>
                          <Text fontSize="9px" color={textSecondary} mb={2}>
                            Click to cycle: neutral → include → focus → exclude
                          </Text>
                          <Wrap spacing={1.5}>
                            {emailTopics.map(topic => {
                              const statusConfig: Record<EmailTopic['status'], { colorScheme: string; variant: string; icon: string }> = {
                                neutral: { colorScheme: 'gray', variant: 'outline', icon: '○' },
                                include: { colorScheme: 'green', variant: 'subtle', icon: '✓' },
                                focus: { colorScheme: 'purple', variant: 'solid', icon: '★' },
                                exclude: { colorScheme: 'red', variant: 'subtle', icon: '✗' },
                              };
                              const cfg = statusConfig[topic.status];
                              const catIcons: Record<string, string> = {
                                action_item: '⚡',
                                request: '📋',
                                information: 'ℹ️',
                                decision: '⚖️',
                                question: '❓',
                                fyi: '📌',
                                escalation: '🔺',
                              };

                              return (
                                <WrapItem key={topic.id}>
                                  <Tooltip
                                    label={`${topic.detail || topic.label}\n\nStatus: ${topic.status} · Category: ${topic.category}\nClick to change`}
                                    placement="top"
                                    hasArrow
                                  >
                                    <Tag
                                      size="sm"
                                      colorScheme={cfg.colorScheme}
                                      variant={cfg.variant}
                                      borderRadius="full"
                                      cursor="pointer"
                                      onClick={() => cycleTopicStatus(topic.id)}
                                      opacity={topic.status === 'exclude' ? 0.5 : 1}
                                      textDecoration={topic.status === 'exclude' ? 'line-through' : 'none'}
                                      _hover={{ opacity: 0.8 }}
                                      transition="all 0.15s"
                                    >
                                      <TagLabel fontSize="xs">
                                        {cfg.icon} {catIcons[topic.category] || ''} {topic.label}
                                      </TagLabel>
                                    </Tag>
                                  </Tooltip>
                                </WrapItem>
                              );
                            })}
                          </Wrap>
                        </Box>
                      )}

                      {/* Instructions */}
                      <Box>
                        <Text fontSize="10px" fontWeight="700" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="0.05em">
                          Instructions
                        </Text>
                        <Textarea
                          size="sm"
                          value={userInstructions}
                          onChange={(e) => setUserInstructions(e.target.value)}
                          placeholder="How should the AI shape this email?&#10;e.g. Focus on budget, be diplomatic about timeline"
                          minH="80px"
                          maxH="120px"
                          resize="vertical"
                          fontSize="xs"
                          borderRadius="lg"
                        />
                      </Box>

                      {/* Generate Button */}
                      <Button
                        bgGradient={agentGradient}
                        color="white"
                        _hover={{ opacity: 0.9 }}
                        leftIcon={<Icon as={SparklesIcon} boxSize={4} />}
                        onClick={generateDraft}
                        isLoading={isGenerating}
                        loadingText="Generating..."
                        size="md"
                        w="full"
                        borderRadius="lg"
                        fontWeight="600"
                      >
                        Generate Smart Draft
                      </Button>

                      {isGenerating && (
                        <Progress value={generationProgress} size="xs" colorScheme="purple" borderRadius="full" />
                      )}

                      <Divider />

                      {/* Advanced Options (collapsed) */}
                      <Box>
                        <Button
                          variant="ghost"
                          size="xs"
                          w="full"
                          justifyContent="space-between"
                          rightIcon={<Icon as={showAdvanced ? ChevronUpIcon : ChevronDownIcon} boxSize={3} />}
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          color={textSecondary}
                        >
                          <HStack spacing={1.5}>
                            <Icon as={AdjustmentsHorizontalIcon} boxSize={3.5} />
                            <Text fontSize="xs">Advanced Options</Text>
                          </HStack>
                        </Button>
                        <Collapse in={showAdvanced}>
                          <VStack align="stretch" spacing={3} mt={2}>
                            <Input size="xs" value={focusTopic} onChange={(e) => setFocusTopic(e.target.value)} placeholder="Focus topic" borderRadius="md" />
                            {focusPoints.map((point, i) => (
                              <HStack key={i}>
                                <Input size="xs" value={point} onChange={(e) => updateFocusPoint(i, e.target.value)} placeholder={`Key point ${i + 1}`} borderRadius="md" />
                                {focusPoints.length > 1 && (
                                  <IconButton aria-label="Remove" icon={<Icon as={XMarkIcon} boxSize={3} />} size="xs" variant="ghost" onClick={() => removeFocusPoint(i)} />
                                )}
                              </HStack>
                            ))}
                            <Button size="xs" variant="ghost" leftIcon={<Icon as={PlusIcon} boxSize={3} />} onClick={addFocusPoint}>Add Point</Button>
                            <Input size="xs" value={excludeTopics} onChange={(e) => setExcludeTopics(e.target.value)} placeholder="Exclude topics (comma separated)" borderRadius="md" />
                            <Textarea size="xs" value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Additional instructions..." rows={2} borderRadius="md" />
                          </VStack>
                        </Collapse>
                      </Box>

                      {/* Workspace Resources (collapsed) */}
                      <Box>
                        <Button
                          variant="ghost"
                          size="xs"
                          w="full"
                          justifyContent="space-between"
                          rightIcon={<Icon as={showWorkspace ? ChevronUpIcon : ChevronDownIcon} boxSize={3} />}
                          onClick={() => { setShowWorkspace(!showWorkspace); if (!showWorkspace && workspaceDocuments.length === 0) loadWorkspaceDocuments(); }}
                          color={textSecondary}
                        >
                          <HStack spacing={1.5}>
                            <Icon as={FolderIcon} boxSize={3.5} />
                            <Text fontSize="xs">Workspace Resources</Text>
                            {selectedDocuments.length > 0 && <Badge colorScheme="blue" fontSize="9px" borderRadius="full">{selectedDocuments.length}</Badge>}
                          </HStack>
                        </Button>
                        <Collapse in={showWorkspace}>
                          <VStack align="stretch" spacing={1.5} mt={2}>
                            {loadingWorkspace ? (
                              <Skeleton h="40px" borderRadius="md" />
                            ) : workspaceDocuments.length === 0 ? (
                              <Text fontSize="xs" color={textSecondary} textAlign="center" py={3}>No documents found</Text>
                            ) : (
                              workspaceDocuments.slice(0, 8).map(doc => (
                                <Box
                                  key={doc.id}
                                  p={2}
                                  borderRadius="md"
                                  border="1px solid"
                                  borderColor={selectedDocuments.includes(doc.id) ? 'purple.400' : borderColor}
                                  bg={selectedDocuments.includes(doc.id) ? agentBg : 'transparent'}
                                  cursor="pointer"
                                  onClick={() => toggleDocument(doc.id)}
                                  _hover={{ borderColor: 'purple.300' }}
                                  transition="all 0.15s"
                                >
                                  <HStack spacing={2}>
                                    <Icon as={doc.type === 'research' ? MagnifyingGlassIcon : DocumentTextIcon} boxSize={3.5} color={textSecondary} />
                                    <Text fontSize="xs" fontWeight="500" noOfLines={1} flex={1}>{doc.name}</Text>
                                    {selectedDocuments.includes(doc.id) && <Icon as={CheckCircleIcon} boxSize={3.5} color="purple.500" />}
                                  </HStack>
                                </Box>
                              ))
                            )}
                          </VStack>
                        </Collapse>
                      </Box>

                      {/* Reply Intelligence */}
                      {isReply && (loadingReplyIntelligence || replyIntelligence) && (
                        <Box p={3} bg={agentBg} borderRadius="lg" border="1px solid" borderColor={agentBorder}>
                          <HStack mb={2}>
                            <Icon as={LightBulbIcon} boxSize={3.5} color="purple.500" />
                            <Text fontSize="10px" fontWeight="700" color="purple.600" textTransform="uppercase" letterSpacing="0.05em">
                              Reply Intelligence
                            </Text>
                            {loadingReplyIntelligence && <Spinner size="xs" color="purple.500" />}
                          </HStack>
                          {replyIntelligence && (
                            <VStack align="stretch" spacing={2}>
                              {replyIntelligence.detected_scenario && (
                                <Badge colorScheme="purple" size="sm" w="fit-content" borderRadius="full">
                                  {replyIntelligence.detected_scenario.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {replyIntelligence.sender_profile && (
                                <Wrap spacing={1}>
                                  {replyIntelligence.sender_profile.preferred_greeting && <Badge size="sm" colorScheme="blue" variant="subtle">{replyIntelligence.sender_profile.preferred_greeting}</Badge>}
                                  {replyIntelligence.sender_profile.preferred_closing && <Badge size="sm" colorScheme="green" variant="subtle">{replyIntelligence.sender_profile.preferred_closing}</Badge>}
                                  {replyIntelligence.sender_profile.communication_style && <Badge size="sm" colorScheme="gray" variant="subtle">{replyIntelligence.sender_profile.communication_style}</Badge>}
                                </Wrap>
                              )}
                              {replyIntelligence.key_points_to_address?.slice(0, 3).map((point: string, i: number) => (
                                <Text key={i} fontSize="xs" color={textPrimary}>• {point}</Text>
                              ))}
                              {replyIntelligence.suggested_templates?.slice(0, 1).map((t: any, i: number) => (
                                <Box key={i} p={2} bg={bgColor} borderRadius="md" cursor="pointer" _hover={{ ring: 1, ringColor: 'purple.300' }} onClick={() => setBody(t.template_text)}>
                                  <Text fontSize="xs" noOfLines={2} color={textSecondary}>{t.template_text}</Text>
                                </Box>
                              ))}
                              {replyIntelligence.information_gaps?.length > 0 && (
                                <HStack spacing={1} p={1.5} bg="orange.50" borderRadius="md">
                                  <Icon as={ExclamationTriangleIcon} boxSize={3} color="orange.500" />
                                  <Text fontSize="xs" color="orange.700">{replyIntelligence.information_gaps[0]}</Text>
                                </HStack>
                              )}
                            </VStack>
                          )}
                        </Box>
                      )}

                      {/* Sender Context */}
                      {senderContext && (
                        <Box p={3} bg={bgColor} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                          <HStack mb={1.5}>
                            <Icon as={UserCircleIcon} boxSize={3.5} color={textSecondary} />
                            <Text fontSize="10px" fontWeight="700" color={textSecondary} textTransform="uppercase" letterSpacing="0.05em">
                              Sender
                            </Text>
                          </HStack>
                          <VStack align="stretch" spacing={1}>
                            {senderContext.preferred_greeting && <Text fontSize="xs" color={textSecondary}>Greeting: {senderContext.preferred_greeting}</Text>}
                            {senderContext.communication_style && <Text fontSize="xs" color={textSecondary}>Style: {senderContext.communication_style}</Text>}
                            {senderContext.email_count && <Text fontSize="xs" color={textSecondary}>{senderContext.email_count} emails exchanged</Text>}
                            {senderContext.avg_response_time_hours && <Text fontSize="xs" color={textSecondary}>Avg response: {Math.round(senderContext.avg_response_time_hours)}h</Text>}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  </TabPanel>

                  {/* ── Tab 1: Proactive Suggestions ── */}
                  <TabPanel px={4} py={3}>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text fontSize="10px" fontWeight="700" color={textSecondary} textTransform="uppercase" letterSpacing="0.05em">
                          Emails you should reply to
                        </Text>
                        <IconButton
                          aria-label="Refresh suggestions"
                          icon={<Icon as={ArrowPathIcon} boxSize={3.5} />}
                          size="xs"
                          variant="ghost"
                          onClick={loadDraftSuggestions}
                          isLoading={loadingSuggestions}
                        />
                      </HStack>

                      {loadingSuggestions ? (
                        <VStack spacing={2}>
                          {[1, 2, 3].map(i => <Skeleton key={i} h="60px" borderRadius="lg" />)}
                        </VStack>
                      ) : draftSuggestions.length === 0 ? (
                        <Box textAlign="center" py={8}>
                          <Icon as={CheckCircleIcon} boxSize={8} color="green.400" mb={2} />
                          <Text fontSize="sm" fontWeight="500" color={textPrimary}>All caught up!</Text>
                          <Text fontSize="xs" color={textSecondary}>No pending replies needed</Text>
                        </Box>
                      ) : (
                        draftSuggestions.map((suggestion, i) => (
                          <Box
                            key={suggestion.email_id || i}
                            p={3}
                            borderRadius="lg"
                            border="1px solid"
                            borderColor={borderColor}
                            bg={bgColor}
                            cursor="pointer"
                            _hover={{ borderColor: 'purple.300', shadow: 'sm' }}
                            transition="all 0.15s"
                            onClick={() => applySuggestion(suggestion)}
                          >
                            <HStack justify="space-between" mb={1}>
                              <HStack spacing={2}>
                                <Avatar size="xs" name={suggestion.from_name || suggestion.from_email} />
                                <Text fontSize="xs" fontWeight="600" noOfLines={1}>
                                  {suggestion.from_name || suggestion.from_email}
                                </Text>
                              </HStack>
                              {suggestion.urgency && (
                                <Badge
                                  size="sm"
                                  colorScheme={suggestion.urgency === 'high' ? 'red' : suggestion.urgency === 'medium' ? 'orange' : 'gray'}
                                  variant="subtle"
                                  borderRadius="full"
                                >
                                  {suggestion.urgency}
                                </Badge>
                              )}
                            </HStack>
                            <Text fontSize="xs" fontWeight="500" noOfLines={1} mb={0.5}>
                              {suggestion.subject}
                            </Text>
                            {suggestion.reason && (
                              <Text fontSize="xs" color="purple.600" fontStyle="italic">
                                {suggestion.reason}
                              </Text>
                            )}
                            {suggestion.waiting_hours && (
                              <HStack spacing={1} mt={1}>
                                <Icon as={ClockIcon} boxSize={3} color={textSecondary} />
                                <Text fontSize="xs" color={textSecondary}>
                                  Waiting {suggestion.waiting_hours < 24 ? `${Math.round(suggestion.waiting_hours)}h` : `${Math.round(suggestion.waiting_hours / 24)}d`}
                                </Text>
                              </HStack>
                            )}
                          </Box>
                        ))
                      )}
                    </VStack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>

            {/* ═══════ RIGHT PANEL: Email Composition ═══════ */}
            <Box flex={1} display="flex" flexDirection="column" overflow="hidden">
              <VStack align="stretch" spacing={0} flex={1} overflow="hidden">

                {/* To / Cc / Subject fields */}
                <Box px={5} pt={4} pb={2}>
                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={3}>
                      <FormControl flex={2}>
                        <HStack spacing={2}>
                          <Text fontSize="xs" color={textSecondary} fontWeight="600" minW="24px">To</Text>
                          <Input
                            size="sm"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            variant="flushed"
                            borderColor={borderColor}
                            fontSize="sm"
                          />
                        </HStack>
                      </FormControl>
                      <FormControl flex={1}>
                        <HStack spacing={2}>
                          <Text fontSize="xs" color={textSecondary} fontWeight="600" minW="20px">Cc</Text>
                          <Input
                            size="sm"
                            value={cc}
                            onChange={(e) => setCc(e.target.value)}
                            placeholder="cc@example.com"
                            variant="flushed"
                            borderColor={borderColor}
                            fontSize="sm"
                          />
                        </HStack>
                      </FormControl>
                    </HStack>

                    <HStack spacing={2}>
                      <Text fontSize="xs" color={textSecondary} fontWeight="600" minW="24px">Sub</Text>
                      <Input
                        size="sm"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        variant="flushed"
                        borderColor={borderColor}
                        fontSize="sm"
                        fontWeight="500"
                      />
                    </HStack>
                  </VStack>
                </Box>

                <Divider />

                {/* Email body editor */}
                <Box flex={1} px={5} py={3} overflow="auto">
                  <Box position="relative" h="full">
                    <Textarea
                      ref={bodyRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={isGenerating ? 'Generating draft...' : 'Start typing or click Generate Smart Draft...'}
                      h="full"
                      minH="280px"
                      fontSize="sm"
                      fontFamily="inherit"
                      lineHeight="1.7"
                      resize="none"
                      border="none"
                      _focus={{ border: 'none', boxShadow: 'none' }}
                      p={0}
                    />
                  </Box>
                </Box>

                {/* Context Sources Panel — transparency into Hermes agent context injection */}
                {(showContextPanel || loadingContextSources) && (
                  <Box borderTop="1px solid" borderColor={borderColor} maxH="200px" overflowY="auto">
                    <Box px={5} py={2}>
                      <HStack justify="space-between" mb={2}>
                        <HStack spacing={2}>
                          <Icon as={DocumentTextIcon} boxSize={3.5} color="purple.500" />
                          <Text fontSize="10px" fontWeight="700" color={textSecondary} textTransform="uppercase" letterSpacing="0.05em">
                            Context Sources
                          </Text>
                          {contextSources.length > 0 && (
                            <Badge colorScheme="purple" variant="subtle" fontSize="9px" borderRadius="full">
                              {contextSources.length} sources
                            </Badge>
                          )}
                        </HStack>
                        <HStack spacing={2}>
                          {totalContextUsed > 0 && (
                            <Tooltip label={`${totalContextUsed.toLocaleString()} / ${contextBudgetTokens.toLocaleString()} tokens used`}>
                              <HStack spacing={1.5}>
                                <Progress
                                  value={Math.min((totalContextUsed / contextBudgetTokens) * 100, 100)}
                                  size="xs"
                                  w="60px"
                                  colorScheme={totalContextUsed / contextBudgetTokens > 0.8 ? 'orange' : 'purple'}
                                  borderRadius="full"
                                />
                                <Text fontSize="9px" color={textSecondary} whiteSpace="nowrap">
                                  {(totalContextUsed / 1000).toFixed(1)}K tokens
                                </Text>
                              </HStack>
                            </Tooltip>
                          )}
                          <IconButton
                            aria-label="Toggle context panel"
                            icon={<Icon as={showContextPanel ? ChevronDownIcon : ChevronUpIcon} boxSize={3} />}
                            size="xs"
                            variant="ghost"
                            onClick={() => setShowContextPanel(!showContextPanel)}
                          />
                        </HStack>
                      </HStack>

                      {loadingContextSources && contextSources.length === 0 ? (
                        <VStack spacing={1.5}>
                          {[1, 2, 3].map(i => <Skeleton key={i} h="28px" borderRadius="md" />)}
                        </VStack>
                      ) : (
                        <Collapse in={showContextPanel}>
                          <VStack align="stretch" spacing={1}>
                            {contextSources.map(source => {
                              const typeColors: Record<string, string> = {
                                email: 'blue',
                                thread: 'cyan',
                                graph_node: 'purple',
                                chroma_doc: 'green',
                                sender_profile: 'pink',
                                calendar: 'orange',
                                attachment: 'gray',
                              };
                              const typeIcons: Record<string, any> = {
                                email: EnvelopeIcon,
                                thread: ChatBubbleLeftRightIcon,
                                graph_node: CpuChipIcon,
                                chroma_doc: MagnifyingGlassIcon,
                                sender_profile: UserCircleIcon,
                                calendar: ClockIcon,
                                attachment: PaperClipIcon,
                              };
                              const sourceLabels: Record<string, string> = {
                                neo4j: 'Graph',
                                chromadb: 'Vector',
                                hermes_api: 'Hermes',
                                workspace: 'Workspace',
                              };

                              return (
                                <HStack
                                  key={source.id}
                                  spacing={2}
                                  py={1}
                                  px={2}
                                  borderRadius="md"
                                  bg={bgSecondary}
                                  _hover={{ bg: agentBg }}
                                  transition="all 0.1s"
                                >
                                  <Icon as={typeIcons[source.type] || DocumentTextIcon} boxSize={3} color={`${typeColors[source.type] || 'gray'}.500`} />
                                  <Text fontSize="xs" fontWeight="500" noOfLines={1} flex={1} color={textPrimary}>
                                    {source.label}
                                  </Text>
                                  {source.detail && (
                                    <Text fontSize="xs" color={textSecondary} noOfLines={1} maxW="140px">
                                      {source.detail}
                                    </Text>
                                  )}
                                  <Badge fontSize="8px" colorScheme={typeColors[source.type] || 'gray'} variant="subtle" borderRadius="full">
                                    {sourceLabels[source.source] || source.source}
                                  </Badge>
                                  {source.tokenEstimate && (
                                    <Text fontSize="9px" color={textSecondary} whiteSpace="nowrap">
                                      ~{(source.tokenEstimate / 1000).toFixed(1)}K
                                    </Text>
                                  )}
                                </HStack>
                              );
                            })}
                          </VStack>
                        </Collapse>
                      )}
                    </Box>
                  </Box>
                )}

                {/* Draft feedback bar */}
                {currentDraftId && body.trim() && !isGenerating && (
                  <Box px={5} py={2} bg={agentBg} borderTop="1px solid" borderColor={agentBorder}>
                    <HStack justify="space-between">
                      <HStack spacing={2}>
                        <Icon as={SparklesIcon} boxSize={3.5} color="purple.500" />
                        <Text fontSize="xs" color="purple.700" fontWeight="500">
                          AI-generated · {LLM_MODELS.find(m => m.id === selectedModel)?.label} · {selectedTone}
                        </Text>
                      </HStack>
                      <HStack spacing={1}>
                        {!feedbackGiven ? (
                          <>
                            <Tooltip label="Good draft">
                              <IconButton
                                aria-label="Thumbs up"
                                icon={<Icon as={HandThumbUpIcon} boxSize={3.5} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="green"
                                onClick={() => submitDraftFeedback(1)}
                              />
                            </Tooltip>
                            <Tooltip label="Needs improvement">
                              <IconButton
                                aria-label="Thumbs down"
                                icon={<Icon as={HandThumbDownIcon} boxSize={3.5} />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => submitDraftFeedback(-1)}
                              />
                            </Tooltip>
                          </>
                        ) : (
                          <Badge colorScheme="green" fontSize="xs" variant="subtle">Feedback saved</Badge>
                        )}
                        <Tooltip label="Regenerate">
                          <IconButton
                            aria-label="Regenerate"
                            icon={<Icon as={ArrowPathIcon} boxSize={3.5} />}
                            size="xs"
                            variant="ghost"
                            onClick={generateDraft}
                            isLoading={isGenerating}
                          />
                        </Tooltip>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            aria-label="Change tone"
                            icon={<Icon as={AdjustmentsHorizontalIcon} boxSize={3.5} />}
                            size="xs"
                            variant="ghost"
                          />
                          <MenuList>
                            {TONE_PRESETS.map(t => (
                              <MenuItem key={t.id} icon={<Icon as={t.icon} boxSize={4} />} onClick={() => rewriteWithTone(t.id)} fontSize="sm">
                                Rewrite as {t.label}
                              </MenuItem>
                            ))}
                          </MenuList>
                        </Menu>
                      </HStack>
                    </HStack>
                  </Box>
                )}

                {/* Original email reference */}
                {isReply && originalEmail && (
                  <Box px={5} py={2} borderTop="1px solid" borderColor={borderColor}>
                    <HStack spacing={2}>
                      <Icon as={ArrowUturnLeftIcon} boxSize={3} color={textSecondary} />
                      <Text fontSize="xs" color={textSecondary} noOfLines={1} flex={1}>
                        <Text as="span" fontWeight="600">{originalEmail.from_name || originalEmail.from_email}</Text>
                        {' · '}
                        {originalEmail.subject}
                      </Text>
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Box>
          </Flex>
        </ModalBody>

        {/* ─── Footer ─── */}
        <ModalFooter py={2.5} px={5} borderTop="1px solid" borderColor={borderColor}>
          <HStack w="full" justify="space-between">
            <HStack spacing={1}>
              <Tooltip label="Attach file (coming soon)">
                <IconButton aria-label="Attach" icon={<Icon as={PaperClipIcon} boxSize={4} />} size="sm" variant="ghost" isDisabled />
              </Tooltip>
              <Tooltip label="Copy to clipboard">
                <IconButton aria-label="Copy" icon={<Icon as={DocumentDuplicateIcon} boxSize={4} />} size="sm" variant="ghost" onClick={copyToClipboard} />
              </Tooltip>
              {wordCount > 0 && (
                <Text fontSize="xs" color={textSecondary} ml={2}>
                  {wordCount} words
                </Text>
              )}
            </HStack>
            <HStack spacing={2}>
              <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Icon as={InboxArrowDownIcon} boxSize={4} />}
                onClick={handleSaveDraft}
                isLoading={savingDraft}
                loadingText="Saving..."
              >
                Save Draft
              </Button>
              <Button
                size="sm"
                colorScheme="blue"
                leftIcon={<Icon as={PaperAirplaneIcon} boxSize={4} />}
                onClick={handleSend}
                isLoading={sending}
                loadingText="Sending..."
                isDisabled={!to.trim() || !body.trim()}
              >
                Send
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EmailDraftStudio;

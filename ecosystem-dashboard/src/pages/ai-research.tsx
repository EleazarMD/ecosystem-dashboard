import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Avatar,
  Spinner,
  Divider,
  Badge,
  Button,
  useToast,
  IconButton,
  Tooltip,
  Flex,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Input,
  Collapse,
  Icon,
  Progress,
} from '@chakra-ui/react';
import { BookmarkIcon, SpeakerWaveIcon, LinkIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { FiChevronDown, FiChevronUp, FiCpu } from 'react-icons/fi';
import { ReadAloudButton } from '@/components/tts';
import MessageExportMenu from '@/components/research/MessageExportMenu';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AIInputInterface from '@/components/research/AIInputInterface';
import { ResearchSidebar } from '@/components/research/ResearchSidebar';
import { saveResearchToNotion } from '@/lib/notion/personal-library-service';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { SwarmEffect } from '@/components/ui/SwarmEffect';
import { useEmailResearchContext } from '@/hooks/useEmailResearchContext';
import { EmailContextPanel } from '@/components/research/EmailContextPanel';
import { EvidencePanel } from '@/components/research/EvidencePanel';
import { DeepResearchClarificationPanel } from '@/components/research/DeepResearchClarificationPanel';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { withFeatureGuard } from '@/lib/auth/withFeatureGuard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { addScheduledResearch, SCHEDULE_PRESETS } from '@/lib/research/scheduled-research';
import { addResearchMemory, buildMemoryContext } from '@/lib/research/research-memory';
import { scoreSources, type SourceScore } from '@/lib/research/source-quality';
import { trackCost } from '@/lib/research/cost-tracker';
import ResearchTopicAnalyzer, { type ReportAnalysis, type GatheredResearch } from '@/components/research/ResearchTopicAnalyzer';

interface Source {
  title: string;
  url: string;
  snippet?: string;
}

interface ResearchMeta {
  wordCount: number;
  charCount: number;
  tokenEstimate: number;
  memorySizeKB: number;
  model?: string;
  processingTimeMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  sourceCount?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cost?: number;
  sources?: Source[];
  meta?: ResearchMeta;
}

interface ClarificationQuestion {
  number: number;
  text: string;
}

/**
 * Process content to extract <think> tags and return separated thinking/main content
 */
function processThinkingTags(content: string): { thinking: string | null; mainContent: string } {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  const matches = content.match(thinkRegex);
  
  if (!matches || matches.length === 0) {
    return { thinking: null, mainContent: content };
  }
  
  // Extract all thinking content
  const thinkingParts: string[] = [];
  matches.forEach(match => {
    const innerContent = match.replace(/<\/?think>/gi, '').trim();
    if (innerContent) {
      thinkingParts.push(innerContent);
    }
  });
  
  // Remove thinking tags from main content
  const mainContent = content.replace(thinkRegex, '').trim();
  
  return {
    thinking: thinkingParts.length > 0 ? thinkingParts.join('\n\n') : null,
    mainContent,
  };
}

/**
 * Collapsible card component for AI thinking/reasoning content
 */
function ThinkingCard({ thinking }: { thinking: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <Box
      mb={4}
      borderRadius="md"
      border="1px solid"
      borderColor="purple.500"
      bg="whiteAlpha.50"
      overflow="hidden"
    >
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        w="full"
        justifyContent="space-between"
        px={3}
        py={2}
        borderRadius={0}
        _hover={{ bg: 'whiteAlpha.100' }}
        color="purple.300"
        fontWeight="500"
        fontSize="xs"
      >
        <HStack spacing={2}>
          <Icon as={FiCpu} boxSize={3.5} />
          <Text>AI Reasoning Process</Text>
          <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
            {thinking.split(/\s+/).length} words
          </Badge>
        </HStack>
        <Icon as={isOpen ? FiChevronUp : FiChevronDown} boxSize={4} />
      </Button>
      <Collapse in={isOpen} animateOpacity>
        <Box
          px={3}
          py={3}
          fontSize="xs"
          color="whiteAlpha.900"
          bg="gray.800"
          maxH="300px"
          overflowY="auto"
          whiteSpace="pre-wrap"
          fontFamily="mono"
          lineHeight="1.6"
        >
          {thinking}
        </Box>
      </Collapse>
    </Box>
  );
}

function buildResearchMeta(
  content: string,
  opts?: { model?: string; processingTimeMs?: number; inputTokens?: number; outputTokens?: number; sourceCount?: number }
): ResearchMeta {
  const charCount = content.length;
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const tokenEstimate = opts?.outputTokens || Math.ceil(charCount / 4);
  const memorySizeKB = parseFloat((new Blob([content]).size / 1024).toFixed(1));
  return {
    wordCount,
    charCount,
    tokenEstimate,
    memorySizeKB,
    model: opts?.model,
    processingTimeMs: opts?.processingTimeMs,
    inputTokens: opts?.inputTokens,
    outputTokens: opts?.outputTokens,
    sourceCount: opts?.sourceCount,
  };
}

function ResearchPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'deep' | 'conversational'>('conversational');
  const [savingToNotion, setSavingToNotion] = useState<number | null>(null);
  const [publishingToWorkspace, setPublishingToWorkspace] = useState<number | null>(null);
  const [showEmailContext, setShowEmailContext] = useState(true);
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [pendingQuery, setPendingQuery] = useState<{ query: string; model: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('perplexity');
  const [perplexitySearchModel, setPerplexitySearchModel] = useState<string>('sonar-pro');
  const [activeTab, setActiveTab] = useState<Record<number, 'assistant' | 'sources'>>({});
  // Source quality scores per message index (used by right panel)
  const [sourceScores, setSourceScores] = useState<Record<number, SourceScore[]>>({});
  // Goose agent mode — query the produced report content instead of web search
  const [useGoose, setUseGoose] = useState(false);
  // Main view tab: chat vs analyzer
  const [mainView, setMainView] = useState<'chat' | 'analyzer'>('chat');
  // Report analysis state
  const [reportAnalysis, setReportAnalysis] = useState<ReportAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isQueryingQwen3, setIsQueryingQwen3] = useState(false);
  // Processing pipeline status (shown in loading indicator)
  const [processingStatus, setProcessingStatus] = useState<{ step: string; detail?: string; progress?: number } | null>(null);
  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [attachmentContents, setAttachmentContents] = useState<Map<string, string>>(new Map());
  // Session hierarchy / lineage
  const [sessionLineage, setSessionLineage] = useState<Array<{ session_id: string; question: string; session_type?: string; depth?: number }>>([]);
  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareSessionId, setCompareSessionId] = useState<string | null>(null);
  const [compareReport, setCompareReport] = useState<{ question: string; content: string; model: string; sources?: Source[] } | null>(null);
  // Analyzer-as-hub: track pending research per topic
  const [pendingTopicResearch, setPendingTopicResearch] = useState<Record<string, string>>({});
  // Current session type — used to hide Analyzer for sub-queries
  const [currentSessionType, setCurrentSessionType] = useState<'original' | 'follow_up' | 'qwen3_query' | 'analysis'>('original');
  // Import research modal state
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const [importSessions, setImportSessions] = useState<Array<{ session_id: string; question: string; model: string; status: string; created_at: string; report?: string; current_sources?: string[]; actual_cost?: number; project_id?: string }>>([]);
  const [importSearch, setImportSearch] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerPollingRef = useRef<Record<string, NodeJS.Timeout>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingSessionRef = useRef(false);
  const toast = useToast();
  const { setCustomData } = useRightPanel();

  const PENDING_SESSION_KEY = 'deep-research-pending-session';

  // --- Async polling logic ---

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback((sid: string) => {
    stopPolling();
    console.log(`[Deep Research] Starting poll for session ${sid}`);

    const poll = async () => {
      try {
        const resp = await fetch(`/api/research-lab/session/status?sessionId=${encodeURIComponent(sid)}`);
        if (!resp.ok) return;
        const data = await resp.json();

        if (data.status === 'completed' && data.report) {
          stopPolling();
          localStorage.removeItem(PENDING_SESSION_KEY);

          // Replace the "processing" message with the actual report
          setMessages(prev => {
            const idx = prev.findIndex(
              m => m.role === 'assistant' && m.content.includes(sid)
            );
            const reportMsg = {
              role: 'assistant' as const,
              content: data.report,
              timestamp: new Date(),
              cost: data.cost,
              sources: data.sources || [],
              meta: buildResearchMeta(data.report, { model: data.model, inputTokens: data.inputTokens, outputTokens: data.outputTokens, sourceCount: (data.sources || []).length }),
            };
            // Auto-compute source quality scores
            if ((data.sources || []).length > 0) {
              const targetIdx = idx >= 0 ? idx : prev.length;
              const userQ = prev.find(m => m.role === 'user')?.content || '';
              const scored = scoreSources(data.sources, userQ);
              setSourceScores(p => ({ ...p, [targetIdx]: scored }));
            }
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = reportMsg;
              return updated;
            }
            return [...prev, reportMsg];
          });
          // Track cost
          if (data.cost) {
            const userQ = messages.find(m => m.role === 'user')?.content || '';
            trackCost({ sessionId: sid, model: data.model || 'unknown', cost: data.cost, inputTokens: data.inputTokens, outputTokens: data.outputTokens, query: userQ });
          }
          setIsLoading(false);
          setSessionId(sid);
          toast({ title: '🔬 Deep Research Complete', status: 'success', duration: 5000 });
        } else if (data.status === 'failed') {
          stopPolling();
          localStorage.removeItem(PENDING_SESSION_KEY);
          setMessages(prev => {
            const idx = prev.findIndex(
              m => m.role === 'assistant' && m.content.includes(sid)
            );
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = {
                role: 'assistant',
                content: `❌ Deep Research failed: ${data.errorMessage || 'Unknown error'}`,
                timestamp: new Date(),
              };
              return updated;
            }
            return [
              ...prev,
              { role: 'assistant', content: `❌ Deep Research failed: ${data.errorMessage || 'Unknown error'}`, timestamp: new Date() },
            ];
          });
          setIsLoading(false);
        }
        // else still processing — keep polling
      } catch (err) {
        console.warn('[Deep Research] Poll error (will retry):', err);
      }
    };

    // Poll immediately, then every 10 seconds
    poll();
    pollingRef.current = setInterval(poll, 10_000);
  }, [stopPolling, toast]);

  // On mount: check for a pending async session and resume polling
  useEffect(() => {
    const pending = localStorage.getItem(PENDING_SESSION_KEY);
    if (pending) {
      try {
        const { sessionId: sid, question } = JSON.parse(pending);
        console.log(`[Deep Research] Resuming poll for pending session ${sid}`);
        setSessionId(sid);
        setIsLoading(true);
        // Add a processing placeholder if messages are empty
        setMessages(prev => {
          if (prev.length === 0) {
            return [
              { role: 'user' as const, content: question, timestamp: new Date() },
              {
                role: 'assistant' as const,
                content: `🔬 Deep Research in progress (session: ${sid}).\n\nPolling for results...`,
                timestamp: new Date(),
              },
            ];
          }
          return prev;
        });
        startPolling(sid);
      } catch {
        localStorage.removeItem(PENDING_SESSION_KEY);
      }
    }
    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse URL params for context
  const contextType = router.query.context as string | undefined;
  const emailId = router.query.id as string | undefined;

  // Fetch email context if coming from email
  const emailContext = useEmailResearchContext({
    emailId: contextType === 'email' ? emailId || null : null,
    autoFetch: true,
  });

  // --- Email Research Project: auto-create a project per email ---
  const [emailProjectId, setEmailProjectId] = useState<string | null>(null);
  const [privacyTier, setPrivacyTier] = useState<'standard' | 'local' | 'strict'>('standard');
  const [atlasResults, setAtlasResults] = useState<any | null>(null);
  const [atlasLoading, setAtlasLoading] = useState(false);
  const [atlasSuggestions, setAtlasSuggestions] = useState<string[]>([]);
  const [evidencePanelOpen, setEvidencePanelOpen] = useState(true);
  const emailProjectCreatedRef = useRef(false);

  // Sync model state + report data to the right panel via RightPanelContext
  // Use reverse find for better compatibility
  const latestReport = [...messages].reverse().find(m => m.role === 'assistant' && m.content && m.content.length > 200);
  const latestQuery = messages.find(m => m.role === 'user')?.content || '';
  // Detect if a PDF is attached
  const hasPdfAttachment = pendingAttachments.some(f => f.name.toLowerCase().endsWith('.pdf'));
  
  useEffect(() => {
    setCustomData({
      deepResearchSettings: {
        model: selectedModel,
        onModelChange: (newModel: string) => setSelectedModel(newModel),
        hasPdfAttachment,
        pendingAttachments: pendingAttachments.map(f => ({ name: f.name, size: f.size, type: f.type })),
        privacyTier,
        onPrivacyTierChange: (tier: 'standard' | 'local' | 'strict') => setPrivacyTier(tier),
      },
      researchSources: latestReport?.sources || [],
      reportContent: latestReport?.content || '',
      researchQuery: latestQuery,
      atlasResults,
      atlasLoading,
      emailProjectId,
    });
  }, [selectedModel, setCustomData, latestReport, latestQuery, hasPdfAttachment, pendingAttachments, privacyTier, atlasResults, atlasLoading, emailProjectId]);

  // Auto-scroll to bottom when messages change or loading state changes
  // Skip auto-scroll when loading a session from sidebar (scroll to top instead)
  // NOTE: We use scrollTop instead of scrollIntoView because scrollIntoView
  // scrolls ALL ancestor scrollable containers (including DashboardLayout's
  // main content wrapper), which shifts the entire page upward.
  useEffect(() => {
    if (isLoadingSessionRef.current) {
      isLoadingSessionRef.current = false;
      return;
    }
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Auto-enable Goose for follow-up queries when a completed report exists
  const hasCompletedReport = !!latestReport;
  useEffect(() => {
    if (hasCompletedReport && !useGoose) {
      setUseGoose(true);
    }
  }, [hasCompletedReport]);

  // Auto-create a research project when navigating from an email
  useEffect(() => {
    if (contextType !== 'email' || !emailContext.email?.subject || emailProjectCreatedRef.current) return;
    emailProjectCreatedRef.current = true;

    const createProject = async () => {
      try {
        const projectName = `📧 ${emailContext.email!.subject.substring(0, 80)}`;
        const resp = await fetch('/api/research-lab/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: projectName,
            description: `Research from email by ${emailContext.email!.from_name || emailContext.email!.from_email} on ${new Date(emailContext.email!.date).toLocaleDateString()}`,
            color: 'blue',
            icon: 'mail',
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.project?.project_id) {
            setEmailProjectId(data.project.project_id);
            console.log('[Research] Auto-created email project:', data.project.project_id);
          }
        }
      } catch (err) {
        console.warn('[Research] Failed to auto-create email project:', err);
      }
    };
    createProject();
  }, [contextType, emailContext.email]);

  // --- Atlas Autonomous Workflow: auto-analyze email attachments ---
  useEffect(() => {
    if (contextType !== 'email' || !emailContext.email || atlasLoading || atlasResults) return;
    // Check if email has image attachments worth analyzing
    const imageAttachments = (emailContext.email.attachments || []).filter(
      (a: any) => a.content_type?.startsWith('image/') && !a.is_inline
    );
    const inlineImages = (emailContext.email.attachments || []).filter(
      (a: any) => a.is_inline && a.content_type?.startsWith('image/')
    );
    const allVisuals = [...imageAttachments, ...inlineImages];
    if (allVisuals.length === 0) return;

    setAtlasLoading(true);
    const analyzeEmail = async () => {
      try {
        const resp = await fetch(`/api/hermes-proxy?path=v1/analytics/visual/from-email/${encodeURIComponent(emailId!)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ privacy_tier: privacyTier }),
        });
        if (resp.ok) {
          const data = await resp.json();
          setAtlasResults(data);
          // Generate research path suggestions based on analytics
          const suggestions: string[] = [];
          if (data.extractions?.length > 0) {
            suggestions.push(`Deep dive into the ${data.extractions[0]?.title || 'data'} trends shown in the charts`);
          }
          if (data.analysis?.domain_insights?.length > 0) {
            suggestions.push(`Research benchmarks related to: ${data.analysis.domain_insights[0]}`);
          }
          if (emailContext.intelligence?.topics?.length) {
            suggestions.push(`Background research on ${emailContext.intelligence.topics[0]}`);
          }
          suggestions.push('Compare these metrics against industry standards');
          suggestions.push('Summarize key findings for a response email');
          setAtlasSuggestions(suggestions);

          // Persist Atlas analysis as a session in the project database
          try {
            const analysisReport = [
              `## Atlas Visual Analysis`,
              `**Images analyzed:** ${data.images_analyzed || 0}`,
              `**Model:** ${data.model || 'unknown'}`,
              `**Privacy tier:** ${privacyTier}`,
              data.summary ? `\n### Summary\n${data.summary}` : '',
              data.analysis?.summary ? `\n### Analysis\n${data.analysis.summary}` : '',
              data.extractions?.length > 0 ? `\n### Extractions\n${JSON.stringify(data.extractions, null, 2)}` : '',
              data.analysis?.trends?.length > 0 ? `\n### Trends\n${data.analysis.trends.map((t: string) => `- ${t}`).join('\n')}` : '',
              data.analysis?.domain_insights?.length > 0 ? `\n### Domain Insights\n${data.analysis.domain_insights.map((i: string) => `- ${i}`).join('\n')}` : '',
            ].filter(Boolean).join('\n');

            const sessionResp = await fetch('/api/research-lab/session/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question: `📊 Atlas Analysis: ${emailContext.email?.subject?.substring(0, 80) || 'Email attachments'}`,
                model: data.model || 'atlas/gemini-2.5-flash',
                mode: 'synchronous',
                sessionType: 'analysis',
                skipResearch: true,
                report: analysisReport,
                projectId: emailProjectId || undefined,
              }),
            });
            const sessionData = await sessionResp.json();
            if (sessionData.sessionId) {
              console.log('[Atlas] Analysis persisted to DB:', sessionData.sessionId);
            }
          } catch (persistErr) {
            console.warn('[Atlas] Failed to persist analysis to DB:', persistErr);
          }
        }
      } catch (err) {
        console.warn('[Atlas] Auto-analysis failed:', err);
      } finally {
        setAtlasLoading(false);
      }
    };
    analyzeEmail();
  }, [contextType, emailContext.email, emailId, privacyTier]); // eslint-disable-line react-hooks/exhaustive-deps

  const bgColor = useSemanticToken('surface.base');
  const messageBg = useSemanticToken('surface.elevated');
  const userMessageBg = useSemanticToken('interactive.primary');
  const userMessageText = useSemanticToken('text.inverse');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const swarmColor = useSemanticToken('interactive.primary');

  // --- Attachment handling ---
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file);
    });
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setPendingAttachments(prev => [...prev, file]);

    // Read text-based files immediately so content is ready at submit time
    const textTypes = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.log', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.c', '.cpp', '.rs', '.go', '.sh', '.sql'];
    const isText = textTypes.some(ext => file.name.toLowerCase().endsWith(ext)) || file.type.startsWith('text/');

    if (isText) {
      try {
        const content = await readFileAsText(file);
        setAttachmentContents(prev => {
          const next = new Map(prev);
          next.set(file.name, content);
          return next;
        });
      } catch (err) {
        console.warn(`[Attachments] Could not read ${file.name}:`, err);
        toast({ title: `Could not read ${file.name}`, status: 'warning', duration: 3000, position: 'bottom-right' });
      }
    } else if (file.type === 'application/pdf') {
      // For PDFs we can't easily extract text client-side; show a note
      toast({ title: `PDF attached: ${file.name}`, description: 'PDF text extraction is limited — for best results use .txt or .md files.', status: 'info', duration: 4000, position: 'bottom-right' });
    } else {
      toast({ title: `Attached: ${file.name}`, status: 'success', duration: 2000, position: 'bottom-right' });
    }
  }, [toast]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setPendingAttachments(prev => {
      const removed = prev[index];
      if (removed) {
        setAttachmentContents(prevContents => {
          const next = new Map(prevContents);
          next.delete(removed.name);
          return next;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const buildAttachmentContext = useCallback((): string => {
    if (attachmentContents.size === 0) return '';
    const parts: string[] = [];
    attachmentContents.forEach((content, name) => {
      // Cap each attachment at 15000 chars to stay within context limits
      const MAX_ATTACHMENT_CHARS = 15000;
      const truncated = content.length > MAX_ATTACHMENT_CHARS
        ? content.substring(0, MAX_ATTACHMENT_CHARS) + `\n\n[... ${name} truncated at ${MAX_ATTACHMENT_CHARS} characters ...]`
        : content;
      parts.push(`--- ATTACHED FILE: ${name} ---\n${truncated}\n--- END ${name} ---`);
    });
    return `The user has attached the following file(s) for reference. Use them to answer the question.\n\n${parts.join('\n\n')}\n\n`;
  }, [attachmentContents]);

  const handleClarificationSubmit = async (answers: Record<number, string>) => {
    if (!pendingQuery) return;

    setIsLoading(true);
    setClarificationQuestions([]);

    try {
      const response = await fetch('/api/research-lab/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pendingQuery.query,
          model: pendingQuery.model,
          mode: 'synchronous',
          clarificationAnswers: answers,
          outputFormats: {
            academicReport: true,
            executiveSummary: false,
            podcastScript: false,
            presentationSlides: false,
          },
          dataSources: {
            webResearch: true,
            knowledgeGraph: false,
            codeAnalysis: false,
            customMCP: false,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.report) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.report,
          timestamp: new Date(),
          cost: data.actualCost || data.estimatedCost,
          meta: buildResearchMeta(data.report, { model: data.model, inputTokens: data.inputTokens, outputTokens: data.outputTokens }),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to complete research');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPendingQuery(null);
    }
  };

  const handleClarificationSkip = async () => {
    if (!pendingQuery) return;

    setIsLoading(true);
    setClarificationQuestions([]);

    try {
      const response = await fetch('/api/research-lab/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pendingQuery.query,
          model: pendingQuery.model,
          mode: 'synchronous',
          skipClarification: true,
          outputFormats: {
            academicReport: true,
            executiveSummary: false,
            podcastScript: false,
            presentationSlides: false,
          },
          dataSources: {
            webResearch: true,
            knowledgeGraph: false,
            codeAnalysis: false,
            customMCP: false,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.report) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.report,
          timestamp: new Date(),
          cost: data.actualCost || data.estimatedCost,
          meta: buildResearchMeta(data.report, { model: data.model, inputTokens: data.inputTokens, outputTokens: data.outputTokens }),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to complete research');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setPendingQuery(null);
    }
  };

  const handleSubmit = async (query: string, mode: 'deep' | 'conversational', model: string, webSearch: boolean = false, parentSessionId?: string, sessionType?: 'original' | 'follow_up' | 'qwen3_query' | 'analysis') => {
    setCurrentMode(mode);

    // Resolve 'perplexity' to the actual Sonar API model (only for conversational; deep research uses sonar-deep-research)
    const apiModel = model === 'perplexity' && mode === 'conversational' ? perplexitySearchModel : model;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Inject attachment context + research memory context
    const attachmentContext = buildAttachmentContext();
    const memoryContext = buildMemoryContext(query);
    const enrichedQuery = attachmentContext + (memoryContext || '') + query;

    // Check for PDF attachments - route to PDF analysis endpoint
    const pdfAttachments = pendingAttachments.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    console.log('[handleSubmit] PDF detection:', { 
      totalAttachments: pendingAttachments.length, 
      pdfCount: pdfAttachments.length,
      attachmentNames: pendingAttachments.map(f => f.name),
      mode, 
      model 
    });
    
    // Clear attachments after submission
    if (pendingAttachments.length > 0) {
      setPendingAttachments([]);
      setAttachmentContents(new Map());
    }

    try {
      // --- PDF ANALYSIS: Route PDFs to dedicated analysis endpoint ---
      if (pdfAttachments.length > 0) {
        for (const pdfFile of pdfAttachments) {
          const fileSizeMB = (pdfFile.size / (1024 * 1024)).toFixed(1);
          setProcessingStatus({ step: 'Uploading PDF', detail: `${pdfFile.name} (${fileSizeMB} MB)`, progress: 10 });

          const formData = new FormData();
          formData.append('file', pdfFile);
          formData.append('workspace_id', 'research-studio');
          formData.append('prompt', query || 'Analyze this document comprehensively. Provide a summary, key findings, main topics, and any notable insights.');
          
          // Map UI model selection to PDF analysis model
          // 'auto' means let the service decide based on document characteristics
          const pdfModel = model === 'qwen-vlm' ? 'qwen-vlm' : 
                          model === 'qwen3' ? 'qwen3' : 
                          model === 'gemini-pdf' ? 'gemini' : 
                          model === 'auto' ? undefined : undefined;
          if (pdfModel) {
            formData.append('force_model', pdfModel);
          }
          // When pdfModel is undefined (auto), the service will auto-select based on:
          // - Large docs (>32K tokens) -> Gemini
          // - Docs with images -> Qwen VLM
          // - Text-only docs -> Qwen3

          setProcessingStatus({ step: 'Analyzing PDF via Gemini', detail: `Extracting text, images & structure from ${pdfFile.name}`, progress: 30 });

          const response = await fetch('/api/research-lab/pdf/analyze', {
            method: 'POST',
            body: formData,
          });

          // Defensive parsing - check response before parsing JSON
          if (!response.ok) {
            const errorText = await response.text();
            console.error('[PDF Analysis] Server error:', response.status, errorText.substring(0, 500));
            setProcessingStatus(null);
            throw new Error(`PDF analysis failed: ${response.status} ${response.statusText}`);
          }

          setProcessingStatus({ step: 'Processing response', detail: 'Parsing analysis results...', progress: 70 });

          const responseText = await response.text();
          if (!responseText || responseText.trim() === '') {
            console.error('[PDF Analysis] Empty response from server');
            setProcessingStatus(null);
            throw new Error('PDF analysis returned empty response');
          }

          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('[PDF Analysis] JSON parse error:', parseError, 'Response:', responseText.substring(0, 500));
            setProcessingStatus(null);
            throw new Error('Invalid JSON response from PDF analysis');
          }

          if (data.success) {
            console.log('[PDF Analysis] Response data:', { 
              analysis: data.analysis?.substring(0, 200), 
              analysisLength: data.analysis?.length,
              metadata: data.metadata 
            });

            setProcessingStatus({ step: 'Saving to database', detail: `Vectorizing ${data.metadata?.pageCount || '?'} pages for RAG search`, progress: 85 });

            const analysisContent = `## PDF Analysis: ${pdfFile.name}\n\n**Model:** ${data.metadata?.model || 'auto'}\n**Pages:** ${data.metadata?.pageCount || 'N/A'}\n**Processing Time:** ${data.metadata?.processingTimeMs || 0}ms\n\n---\n\n${data.analysis || 'No analysis content returned'}`;
            
            const assistantMessage: Message = {
              role: 'assistant',
              content: analysisContent,
              timestamp: new Date(),
              meta: buildResearchMeta(analysisContent, { model: data.metadata?.model || 'pdf-analysis' }),
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Create a session in the database so it appears in the sidebar
            try {
              setProcessingStatus({ step: 'Creating session', detail: 'Saving analysis to research history', progress: 95 });
              console.log('[PDF Analysis] Creating session for:', pdfFile.name);
              const sessionResponse = await fetch('/api/research-lab/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: `PDF Analysis: ${pdfFile.name}`,
                  model: data.metadata?.model || 'qwen3-32b',
                  mode: 'synchronous',
                  sessionType: 'analysis', // Valid values: original, follow_up, qwen3_query, analysis
                  skipResearch: true, // Don't run research, just create the session
                  report: analysisContent,
                }),
              });
              const sessionData = await sessionResponse.json();
              console.log('[PDF Analysis] Session creation response:', { status: sessionResponse.status, sessionData });
              if (sessionData.sessionId) {
                setSessionId(sessionData.sessionId);
                console.log('[PDF Analysis] Session created:', sessionData.sessionId);
              } else {
                console.warn('[PDF Analysis] No sessionId in response:', sessionData);
              }
            } catch (sessionErr) {
              console.error('[PDF Analysis] Failed to create session:', sessionErr);
            }
          } else {
            setProcessingStatus(null);
            throw new Error(data.error || data.message || 'PDF analysis failed');
          }
        }
        
        setProcessingStatus(null);
        setIsLoading(false);
        return;
      }

      // --- ATLAS ANALYST: Route follow-up queries through OpenClaw Analytics Agent ---
      // PDF sessions still use RAG; email/report queries go through Atlas for domain-aware analysis
      const isPdfSession = sessionId?.startsWith('pdf-');
      
      if ((useGoose || isPdfSession) && mode === 'conversational') {
        if (isPdfSession) {
          // PDF RAG: semantic vector search → retrieve relevant chunks → LLM synthesis
          setProcessingStatus({ step: 'Searching documents', detail: 'Running semantic vector search across PDF chunks...', progress: 20 });
          const conversationHistory = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-6)
            .map(m => ({ role: m.role, content: m.content.substring(0, 2000) }));

          const response = await fetch('/api/research-lab/pdf/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: enrichedQuery,
              workspace_id: 'research-studio',
              limit: 8,
              conversation_history: conversationHistory,
              synthesize: true,
            }),
          });

          const data = await response.json();

          if (response.ok && data.answer) {
            setProcessingStatus({ step: 'Synthesizing answer', detail: `Found ${data.total || 0} relevant chunks, generating response via Qwen3...`, progress: 80 });
            const content = data.answer;
            const chunkSources = (data.chunks || []).map((c: any) =>
              `${c.fileName} (p.${c.pageNumber}, relevance: ${(c.relevance * 100).toFixed(0)}%)`
            );
            const sourceSuffix = chunkSources.length > 0
              ? `\n\n---\n*Sources: ${chunkSources.join(' • ')}*`
              : '';

            const assistantMessage: Message = {
              role: 'assistant',
              content: content + sourceSuffix,
              timestamp: new Date(),
              meta: buildResearchMeta(content, { model: data.model || 'qwen3-32b', inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens }),
            };
            setMessages(prev => [...prev, assistantMessage]);
          } else {
            throw new Error(data.error || 'PDF RAG query failed');
          }
        } else {
          // Atlas Analyst: route through OpenClaw analytics agent with email + report context
          const isEmailResearch = contextType === 'email' && emailContext.email;
          const atlasModel = privacyTier === 'standard' ? 'google/gemini-2.5-flash' : 'openai/qwen3-32b';
          setProcessingStatus({ step: '📊 Atlas Analyst', detail: `Analyzing via ${atlasModel}...`, progress: 40 });

          // Build rich context: email + atlas analytics + prior report
          const latestAssistant = messages.findLast?.(m => m.role === 'assistant' && m.content.length > 200);
          const fullReport = latestAssistant?.content || '';
          const MAX_CONTEXT_CHARS = 12000;
          const reportContext = fullReport.length > MAX_CONTEXT_CHARS 
            ? fullReport.substring(0, MAX_CONTEXT_CHARS) + '\n\n[... report truncated ...]'
            : fullReport;

          // Atlas system prompt with email + analytics context
          const systemParts: string[] = [
            'You are Atlas, the AI Analytics agent for the AI Homelab. You specialize in analyzing data, charts, trends, and providing domain-contextualized insights.',
            'Answer questions precisely. Include data values, confidence scores, and trends when referencing extracted data.',
          ];

          if (isEmailResearch && emailContext.contextSummary) {
            systemParts.push(`\n## Email Context\n${emailContext.contextSummary}`);
          }

          if (atlasResults && !atlasResults.error) {
            const atlasJson = JSON.stringify(atlasResults, null, 2).substring(0, 6000);
            systemParts.push(`\n## Atlas Visual Analytics (extracted from email attachments)\n\`\`\`json\n${atlasJson}\n\`\`\``);
          }

          if (reportContext) {
            systemParts.push(`\n## Research Report\n${reportContext}`);
          }

          const chatMessages = [
            { role: 'system', content: systemParts.join('\n') },
            ...messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10).map(m => ({
              role: m.role,
              content: m.content.substring(0, 3000),
            })),
            { role: 'user', content: enrichedQuery },
          ];

          // Route through OpenClaw chat proxy with analytics agent ID
          const response = await fetch('/api/openclaw/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: enrichedQuery,
              sessionId: sessionId || undefined,
              agentId: 'openclaw-analytics',
              stream: false,
            }),
          });

          const data = await response.json();

          if (response.ok && (data.response || data.choices?.[0]?.message?.content)) {
            const content = data.response || data.choices[0].message.content;
            const assistantMessage: Message = {
              role: 'assistant',
              content,
              timestamp: new Date(),
              meta: buildResearchMeta(content, {
                model: `atlas/${atlasModel}`,
                inputTokens: data.usage?.prompt_tokens,
                outputTokens: data.usage?.completion_tokens,
              }),
            };
            setMessages(prev => [...prev, assistantMessage]);

            // Persist Atlas chat query as a session in the project database
            try {
              await fetch('/api/research-lab/session/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: query,
                  model: `atlas/${atlasModel}`,
                  mode: 'synchronous',
                  sessionType: 'follow_up',
                  skipResearch: true,
                  report: content,
                  parentSessionId: sessionId || undefined,
                  projectId: emailProjectId || undefined,
                }),
              });
            } catch (persistErr) {
              console.warn('[Atlas] Failed to persist chat query to DB:', persistErr);
            }
          } else {
            // Fallback: direct AI Gateway call if OpenClaw is unavailable
            console.warn('[Atlas] OpenClaw unavailable, falling back to AI Gateway direct');
            setProcessingStatus({ step: '📊 Atlas (direct)', detail: 'OpenClaw unavailable, routing direct...', progress: 60 });

            const fallbackResponse = await fetch('/api/ai-gateway/report-query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: chatMessages,
                max_tokens: 4096,
                temperature: 0.5,
              }),
            });

            const fallbackData = await fallbackResponse.json();
            if (fallbackResponse.ok && fallbackData.choices?.[0]?.message?.content) {
              const content = fallbackData.choices[0].message.content;
              const assistantMessage: Message = {
                role: 'assistant',
                content,
                timestamp: new Date(),
                meta: buildResearchMeta(content, { model: `atlas/${atlasModel}` }),
              };
              setMessages(prev => [...prev, assistantMessage]);

              // Persist fallback Atlas query to DB
              try {
                await fetch('/api/research-lab/session/create', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    question: query,
                    model: `atlas/${atlasModel}`,
                    mode: 'synchronous',
                    sessionType: 'follow_up',
                    skipResearch: true,
                    report: content,
                    parentSessionId: sessionId || undefined,
                    projectId: emailProjectId || undefined,
                  }),
                });
              } catch (persistErr) {
                console.warn('[Atlas] Failed to persist fallback query to DB:', persistErr);
              }
            } else {
              throw new Error(fallbackData.error || 'Atlas analysis failed');
            }
          }
        }

        setProcessingStatus(null);
        setIsLoading(false);
        return;
      }

      if (mode === 'conversational') {
        // Conversational research
        setProcessingStatus({ step: 'Web research', detail: `Searching via ${apiModel}...`, progress: 30 });
        const response = await fetch('/api/research-lab/conversational-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: enrichedQuery,
            sessionId: sessionId,
            parentSessionId: parentSessionId || sessionId || undefined,
            conversationHistory: messages,
            model: apiModel,
            webSearch: webSearch,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSessionId(data.sessionId);

          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            cost: data.estimatedCost,
            sources: data.sources || [],
            meta: buildResearchMeta(data.response, { model: apiModel, sourceCount: (data.sources || []).length }),
          };
          setMessages(prev => {
            const newIdx = prev.length;
            // Auto-compute source quality scores
            if ((data.sources || []).length > 0) {
              const scored = scoreSources(data.sources, query);
              setSourceScores(p => ({ ...p, [newIdx]: scored }));
            }
            return [...prev, assistantMessage];
          });

          // Track cost
          if (data.estimatedCost) {
            trackCost({ sessionId: data.sessionId, model: apiModel, cost: data.estimatedCost, query });
          }

          setProcessingStatus(null);
          setIsLoading(false);

          // Auto-save to research memory
          if (data.response.length > 200) {
            addResearchMemory({ query, report: data.response, model: apiModel, sourceCount: (data.sources || []).length, sessionId: data.sessionId });
          }
        } else {
          throw new Error(data.error || data.detail || 'Failed to get response');
        }
      } else {
        // Deep research — async mode so user can navigate away
        setProcessingStatus({ step: 'Starting deep research', detail: `Submitting to ${apiModel} for comprehensive analysis...`, progress: 15 });
        const response = await fetch('/api/research-lab/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: query,
            model: apiModel,
            mode: 'async',
            parentSessionId: parentSessionId,
            sessionType: sessionType || 'original',
            outputFormats: {
              academicReport: true,
              executiveSummary: false,
              podcastScript: false,
              presentationSlides: false,
            },
            dataSources: {
              webResearch: true,
              knowledgeGraph: false,
              codeAnalysis: false,
              customMCP: false,
            },
          }),
        });

        const data = await response.json();

        if (response.ok && data.needsClarification && data.questions) {
          // Got clarifying questions - show them to user
          setClarificationQuestions(data.questions);
          setPendingQuery({ query, model });
          setSessionId(data.sessionId);
          setProcessingStatus(null);
          setIsLoading(false);
          
          const clarificationMessage: Message = {
            role: 'assistant',
            content: '📋 I have some clarifying questions to help refine your research. Please answer them below.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, clarificationMessage]);
        } else if (response.ok && data.report) {
          // Server returned results immediately (fast models)
          setProcessingStatus(null);
          setIsLoading(false);
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.report,
            timestamp: new Date(),
            cost: data.actualCost || data.estimatedCost,
            sources: data.sources || [],
            meta: buildResearchMeta(data.report, { model: apiModel, inputTokens: data.inputTokens, outputTokens: data.outputTokens, sourceCount: (data.sources || []).length }),
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else if (response.ok && data.sessionId) {
          // Async job started — persist to localStorage and poll
          const sid = data.sessionId;
          setSessionId(sid);
          localStorage.setItem(
            PENDING_SESSION_KEY,
            JSON.stringify({ sessionId: sid, question: query })
          );

          const processingMessage: Message = {
            role: 'assistant',
            content: `🔬 Deep Research started (session: ${sid}).\n\nProcessing your query... This typically takes 5-15 minutes.\n\nYou can navigate away — I'll keep polling in the background.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, processingMessage]);

          // Start polling (polling will clear isLoading when done)
          startPolling(sid);
        } else {
          setIsLoading(false);
          throw new Error(data.error || 'Failed to start research');
        }
      }
    } catch (error: any) {
      setProcessingStatus(null);
      setIsLoading(false);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // --- Report Analysis Handlers ---
  const handleAnalyzeReport = useCallback(async (forceGemini: boolean = false) => {
    const report = latestReport?.content;
    const question = messages.find(m => m.role === 'user')?.content;
    console.log('[Analyzer] handleAnalyzeReport called', { 
      hasLatestReport: !!latestReport, 
      reportLength: report?.length,
      hasQuestion: !!question,
      messagesCount: messages.length,
      forceGemini,
    });
    if (!report) {
      console.warn('[Analyzer] No report found to analyze');
      return;
    }

    // Snapshot previous gathered_research so we can carry it forward after re-analysis
    const prevAnalysis = reportAnalysis;
    const prevGatheredMap = new Map<string, GatheredResearch[]>();
    if (prevAnalysis?.topics) {
      for (const t of prevAnalysis.topics) {
        if (t.gathered_research && t.gathered_research.length > 0) {
          prevGatheredMap.set(t.name.toLowerCase(), t.gathered_research);
        }
      }
    }

    // Build combined report: original + gathered research summaries
    const hasGathered = prevGatheredMap.size > 0;
    let combinedReport = report;
    if (hasGathered) {
      combinedReport += '\n\n---\n\n## ADDITIONAL RESEARCH GATHERED ON SPECIFIC TOPICS\n\n';
      for (const [topicName, gathered] of prevGatheredMap) {
        for (const gr of gathered) {
          combinedReport += `### Follow-up: ${gr.query}\n`;
          // Gemini can handle full reports; no need to truncate
          combinedReport += gr.report;
          combinedReport += '\n\n';
        }
      }
    }

    // Use Gemini if: forceGemini is true, OR there's gathered research (needs large context)
    const useGemini = forceGemini || hasGathered;

    setIsAnalyzing(true);
    try {
      // Use Gemini Flash for re-analysis with gathered research (needs large context)
      // Use Qwen3 for routine first-pass analysis (unless forceGemini)
      const res = await fetch('/api/ai-gateway/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: combinedReport, question, useGemini }),
      });
      const data = await res.json();
      console.log('[Analyzer] API response', { ok: res.ok, status: res.status, hasAnalysis: !!data.analysis, error: data.error });
      if (res.ok && data.analysis) {
        // Carry forward gathered_research from previous analysis onto matching topics
        if (prevGatheredMap.size > 0 && data.analysis.topics) {
          for (const newTopic of data.analysis.topics) {
            const lowerName = newTopic.name.toLowerCase();
            // Exact match first, then fuzzy
            const exact = prevGatheredMap.get(lowerName);
            if (exact) {
              newTopic.gathered_research = exact;
            } else {
              // Fuzzy: check if any prev topic name is contained in new or vice versa
              for (const [prevName, gathered] of prevGatheredMap) {
                if (lowerName.includes(prevName) || prevName.includes(lowerName)) {
                  newTopic.gathered_research = [...(newTopic.gathered_research || []), ...gathered];
                }
              }
            }
          }
        }

        console.log('[Analyzer] Setting analysis with', data.analysis.topics?.length, 'topics');
        setReportAnalysis(data.analysis);
        // Push analysis to right panel customData
        setCustomData((prev: any) => ({ ...prev, analysis: data.analysis }));
        // Save analysis to database if we have a session
        if (sessionId) {
          fetch(`/api/research-lab/session/${sessionId}/analysis`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ analysis: data.analysis }),
          }).catch(err => console.error('[ResearchPage] Failed to save analysis:', err));
        }
        toast({ title: 'Report analyzed', description: `${data.analysis.topics?.length || 0} topics, ${data.analysis.gaps?.length || 0} gaps`, status: 'success', duration: 3000, position: 'bottom-right' });
      } else {
        toast({ title: 'Analysis failed', description: data.error || 'Unknown error', status: 'error', duration: 5000, position: 'bottom-right' });
      }
    } catch (err: any) {
      toast({ title: 'Analysis failed', description: err.message, status: 'error', duration: 5000, position: 'bottom-right' });
    } finally {
      setIsAnalyzing(false);
    }
  }, [latestReport, messages, sessionId, setCustomData, toast, reportAnalysis]);

  // --- Analyzer-as-Hub: Gather research in background and feed back into analyzer ---
  const stopAnalyzerPoll = useCallback((sid: string) => {
    if (analyzerPollingRef.current[sid]) {
      clearInterval(analyzerPollingRef.current[sid]);
      delete analyzerPollingRef.current[sid];
    }
  }, []);

  const feedResearchIntoAnalysis = useCallback((
    report: string,
    query: string,
    sid: string,
    model: string,
    cost: number | undefined,
    sources: (Source | string)[],
    topicIds: string[],
    gapTopics: string[]
  ) => {
    // Normalize sources — status endpoint returns string[], direct returns Source[]
    const normalizedSources = (sources || []).map(s => {
      if (typeof s === 'string') return { title: s, url: s };
      return { title: s.title, url: s.url };
    });

    const gathered: GatheredResearch = {
      session_id: sid,
      query,
      report,
      model,
      cost,
      sources: normalizedSources,
      completed_at: new Date().toISOString(),
      target_topic_ids: topicIds,
      target_gap_topics: gapTopics,
    };

    setReportAnalysis(prev => {
      if (!prev) return prev;

      // Build set of topic IDs that should receive this gathered research
      const targetIds = new Set(topicIds);

      // For gap-based research, try to match gap topic names to existing topic names
      if (gapTopics.length > 0) {
        for (const gapName of gapTopics) {
          const lowerGap = gapName.toLowerCase();
          const match = prev.topics.find(t =>
            t.name.toLowerCase().includes(lowerGap) || lowerGap.includes(t.name.toLowerCase())
          );
          if (match) targetIds.add(match.id);
        }
      }

      let attached = false;
      const updated = { ...prev, topics: prev.topics.map(t => {
        if (targetIds.has(t.id)) {
          attached = true;
          return { ...t, gathered_research: [...(t.gathered_research || []), gathered] };
        }
        return t;
      })};

      // Fallback: attach to first topic if nothing matched
      if (!attached && updated.topics.length > 0) {
        const first = updated.topics[0];
        updated.topics[0] = { ...first, gathered_research: [...(first.gathered_research || []), gathered] };
      }

      // Persist updated analysis to DB
      if (sessionId) {
        fetch(`/api/research-lab/session/${sessionId}/analysis`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis: updated }),
        }).catch(err => console.error('[Analyzer] Failed to save gathered research:', err));
      }
      return updated;
    });

    // Clear pending tracking for these topics
    setPendingTopicResearch(prev => {
      const next = { ...prev };
      for (const id of topicIds) delete next[id];
      for (const t of gapTopics) delete next[`gap:${t}`];
      // Auto-trigger re-analysis if no more pending research remains
      const remainingPending = Object.keys(next).length;
      if (remainingPending === 0) {
        // Delay slightly so state updates propagate before re-analysis reads them
        setTimeout(() => {
          console.log('[Analyzer] Auto re-analyzing after all gathered research completed');
          handleAnalyzeReport();
        }, 1500);
      }
      return next;
    });
  }, [sessionId, handleAnalyzeReport]);

  // --- Import Existing Research ---
  const handleOpenImportResearch = useCallback(async () => {
    setImportLoading(true);
    setImportSearch('');
    onImportOpen();
    try {
      const res = await fetch('/api/research-lab/sessions?limit=100');
      const data = await res.json();
      if (data.sessions) {
        // Only show completed sessions, exclude current session
        const filtered = data.sessions.filter((s: any) =>
          s.status === 'completed' && s.session_id !== sessionId
        );
        setImportSessions(filtered);
      }
    } catch (err) {
      console.error('[Import Research] Failed to fetch sessions:', err);
    } finally {
      setImportLoading(false);
    }
  }, [sessionId, onImportOpen]);

  const handleImportSession = useCallback(async (importSessionId: string) => {
    try {
      // Fetch the full session to get its report
      const res = await fetch(`/api/research-lab/session/status?sessionId=${encodeURIComponent(importSessionId)}`);
      if (!res.ok) throw new Error('Failed to fetch session');
      const status = await res.json();

      if (!status.report) {
        toast({ title: 'No report found', description: 'This session has no report to import', status: 'warning', duration: 3000, position: 'bottom-right' });
        return;
      }

      // Get the currently selected topic IDs (if any selected in analyzer)
      // If none selected, it will attach to first topic via feedResearchIntoAnalysis fallback
      feedResearchIntoAnalysis(
        status.report,
        status.question || 'Imported research',
        importSessionId,
        status.model || 'unknown',
        status.cost,
        status.sources || [],
        [], // No specific topic IDs — user can re-analyze to re-categorize
        []
      );

      // Also assign the imported session to the current project if we have one
      if (sessionId) {
        try {
          const parentRes = await fetch(`/api/research-lab/session/status?sessionId=${encodeURIComponent(sessionId)}`);
          const parentData = await parentRes.json();
          if (parentData.project_id) {
            await fetch(`/api/research-lab/session/${importSessionId}/project`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId: parentData.project_id }),
            });
          }
        } catch { /* non-critical */ }
      }

      onImportClose();
      toast({ title: '📥 Research imported!', description: 'Check the Gathered tab. Click Re-analyze to update depth ratings.', status: 'success', duration: 4000, position: 'bottom-right' });
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.message, status: 'error', duration: 3000, position: 'bottom-right' });
    }
  }, [feedResearchIntoAnalysis, sessionId, onImportClose, toast]);

  const handleFollowUpDeepResearch = useCallback(async (
    query: string,
    includeContext: boolean,
    selectedTopicIds: string[],
    selectedGapTopics: string[],
    model?: string
  ) => {
    // Build context preamble separately so the DB stores the clean query as the title
    let contextPreamble: string | undefined;
    if (includeContext && latestReport) {
      const summary = latestReport.content.substring(0, 3000);
      contextPreamble = `CONTEXT FROM PRIOR RESEARCH (do NOT repeat this information, expand on the topics below instead):\n\n${summary}\n\n---\n\nNEW RESEARCH REQUEST:`;
    }

    // Use the model passed from the Analyzer's selector, fall back to the global selectedModel
    const apiModel = model || selectedModel;

    try {
      const response = await fetch('/api/research-lab/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          contextPreamble,
          model: apiModel,
          mode: 'async',
          parentSessionId: sessionId || undefined,
          sessionType: 'follow_up',
          outputFormats: { academicReport: true },
          dataSources: { webResearch: true },
        }),
      });

      const data = await response.json();

      if (response.ok && data.report) {
        // Fast model returned immediately
        feedResearchIntoAnalysis(
          data.report, query, data.sessionId || 'immediate', apiModel,
          data.actualCost || data.estimatedCost, data.sources || [],
          selectedTopicIds, selectedGapTopics
        );
        toast({ title: '\uD83D\uDD2C Research gathered!', description: 'Check the Gathered tab', status: 'success', duration: 3000, position: 'bottom-right' });
      } else if (response.ok && data.sessionId) {
        // Async — track pending and poll
        const sid = data.sessionId;
        const trackMap: Record<string, string> = {};
        for (const id of selectedTopicIds) trackMap[id] = sid;
        for (const t of selectedGapTopics) trackMap[`gap:${t}`] = sid;
        setPendingTopicResearch(prev => ({ ...prev, ...trackMap }));

        toast({ title: '\uD83D\uDD2C Gathering research...', description: 'Results will appear in the Gathered tab when complete', status: 'info', duration: 4000, position: 'bottom-right' });

        // Start polling for this child session
        const pollInterval = setInterval(async () => {
          try {
            const resp = await fetch(`/api/research-lab/session/status?sessionId=${encodeURIComponent(sid)}`);
            if (!resp.ok) return;
            const status = await resp.json();

            if (status.status === 'completed' && status.report) {
              stopAnalyzerPoll(sid);
              feedResearchIntoAnalysis(
                status.report, query, sid, status.model || apiModel,
                status.cost, status.sources || [],
                selectedTopicIds, selectedGapTopics
              );
              toast({ title: '\uD83D\uDD2C Research gathered!', description: 'Check the Gathered tab', status: 'success', duration: 4000, position: 'bottom-right' });
            } else if (status.status === 'failed') {
              stopAnalyzerPoll(sid);
              setPendingTopicResearch(prev => {
                const next = { ...prev };
                for (const id of selectedTopicIds) delete next[id];
                for (const t of selectedGapTopics) delete next[`gap:${t}`];
                return next;
              });
              toast({ title: 'Research failed', description: status.error_message || 'Unknown error', status: 'error', duration: 4000, position: 'bottom-right' });
            }
          } catch { /* polling error, continue */ }
        }, 10000);
        analyzerPollingRef.current[sid] = pollInterval;
      } else {
        throw new Error(data.error || 'Failed to start research');
      }
    } catch (err: any) {
      toast({ title: 'Failed to start research', description: err.message, status: 'error', duration: 3000, position: 'bottom-right' });
    }
  }, [latestReport, selectedModel, sessionId, feedResearchIntoAnalysis, stopAnalyzerPoll, toast]);

  const handleFollowUpQwen3 = useCallback(async (query: string, context: string) => {
    console.log('[handleFollowUpQwen3] Called with:', { 
      queryLength: query?.length, 
      contextLength: context?.length,
    });
    
    // Validate inputs
    if (!query || query.trim().length === 0) {
      console.warn('[handleFollowUpQwen3] Empty query, aborting');
      return;
    }
    
    console.log('[handleFollowUpQwen3] Switching to chat view and querying Qwen3...');
    setMainView('chat');
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => {
      console.log('[handleFollowUpQwen3] Adding message, prev count:', prev.length);
      return [...prev, userMessage];
    });
    setIsQueryingQwen3(true);

    try {
      // Query Qwen3 with only the selected topic context (not the full report)
      const chatMessages = [
        { role: 'system', content: `You are an AI research assistant. The user has selected specific topics from a research report analysis. Answer their questions based on this context. Be thorough and helpful.\n\n---\n${context}\n---` },
        { role: 'user', content: query },
      ];

      const response = await fetch('/api/ai-gateway/report-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          max_tokens: 4096,
          temperature: 0.7,
        }),
      });

      const data = await response.json();

      if (response.ok && data.choices?.[0]?.message?.content) {
        const content = data.choices[0].message.content;
        const assistantMessage: Message = {
          role: 'assistant',
          content,
          timestamp: new Date(),
          meta: buildResearchMeta(content, { model: 'qwen3-32b', inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens }),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Qwen3 query failed');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Failed to query Qwen3'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsQueryingQwen3(false);
    }
  }, []);

  // Reusable session loader — used by sidebar onSessionSelect and breadcrumb navigation
  const loadSession = useCallback(async (selectedId: string) => {
    try {
      const res = await fetch(`/api/research-lab/session/${selectedId}/result`);
      if (!res.ok) return;
      const data = await res.json();

      const newMessages: Message[] = [
        {
          role: 'user',
          content: data.question || 'Research query',
          timestamp: new Date(data.createdAt || Date.now()),
        },
      ];

      if (data.report) {
        const sources: Source[] = (data.sources || data.citations || []).map((s: any) =>
          typeof s === 'string' ? { title: s, url: s } : s
        );
        const processingTime = data.completedAt && data.createdAt ? data.completedAt - data.createdAt : undefined;
        newMessages.push({
          role: 'assistant',
          content: data.report,
          timestamp: new Date(data.completedAt || Date.now()),
          cost: data.cost,
          sources,
          meta: buildResearchMeta(data.report, { model: data.model, processingTimeMs: processingTime, inputTokens: data.inputTokens, outputTokens: data.outputTokens, sourceCount: sources.length }),
        });
      } else if (data.status === 'failed') {
        newMessages.push({
          role: 'assistant',
          content: `❌ Research failed: ${data.errorMessage || 'Unknown error'}`,
          timestamp: new Date(),
        });
      }

      // Fetch lineage for breadcrumb navigation
      try {
        const lineageRes = await fetch(`/api/research-lab/session/${selectedId}/lineage`);
        if (lineageRes.ok) {
          const lineageData = await lineageRes.json();
          setSessionLineage(lineageData.lineage || []);
        } else {
          setSessionLineage([]);
        }
      } catch (lineageErr) {
        console.warn('[ResearchPage] Failed to load lineage:', lineageErr);
        setSessionLineage([]);
      }

      isLoadingSessionRef.current = true;
      setMessages(newMessages);
      setSessionId(selectedId);
      setCurrentSessionType(data.sessionType || data.session_type || 'original');
      setClarificationQuestions([]);
      setPendingQuery(null);
      setCurrentMode('deep');
      setIsLoading(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      // Load saved analysis if available
      try {
        const analysisRes = await fetch(`/api/research-lab/session/${selectedId}/analysis`);
        if (analysisRes.ok) {
          const analysisData = await analysisRes.json();
          if (analysisData.analysis) {
            setReportAnalysis(analysisData.analysis);
          } else {
            setReportAnalysis(null);
          }
        }
      } catch (analysisErr) {
        console.error('[ResearchPage] Failed to load analysis:', analysisErr);
        setReportAnalysis(null);
      }
    } catch (err) {
      console.error('[ResearchPage] Failed to load session:', err);
    }
  }, []);

  const handleSaveToNotion = async (messageIndex: number) => {
    const message = messages[messageIndex];
    const userQuery = messageIndex > 0 ? messages[messageIndex - 1].content : 'Research query';

    setSavingToNotion(messageIndex);

    try {
      const result = await saveResearchToNotion({
        topic: userQuery.substring(0, 100), // Use first 100 chars as topic
        query: userQuery,
        findings: message.content,
        confidence: 'High',
        sources: [], // Could parse from content
        metadata: {
          mode: currentMode,
          sessionId: sessionId,
          timestamp: message.timestamp.toISOString(),
        },
      });

      if (result.success) {
        toast({
          title: '✅ Saved to Notion!',
          description: 'Research added to your personal library',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        });

        // Optional: Open Notion page
        if (result.notionUrl) {
          window.open(result.notionUrl, '_blank');
        }
      } else {
        throw new Error(result.error || 'Failed to save');
      }
    } catch (error: any) {
      toast({
        title: '❌ Failed to save',
        description: error.message || 'Could not save to Notion',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      });
    } finally {
      setSavingToNotion(null);
    }
  };

  return (
    <DashboardLayout>
      <Flex h="calc(100vh - 70px - 32px)" w="full" overflow="hidden" gap={4} minH={0}>
        {/* Left Sidebar */}
        <ResearchSidebar
          onNavigate={(view) => {
            if (view === 'new-research') {
              setMessages([]);
              setSessionId(null);
              setClarificationQuestions([]);
              setPendingQuery(null);
              setCurrentMode('conversational');
              setShowEmailContext(true);
              setSessionLineage([]);
            }
          }}
          onSessionSelect={loadSession}
          onRetry={(_, question) => {
            setMessages([]);
            setSessionId(null);
            setClarificationQuestions([]);
            setPendingQuery({ query: question, model: selectedModel });
          }}
          onCompare={async (selectedId) => {
            // If no current report loaded, just load this session normally
            const currentReport = messages.find(m => m.role === 'assistant' && m.content.length > 500);
            if (!currentReport) {
              toast({ title: 'Load a report first, then compare', status: 'info', duration: 2000, position: 'bottom-right' });
              return;
            }
            try {
              const res = await fetch(`/api/research-lab/session/${selectedId}/result`);
              if (!res.ok) return;
              const data = await res.json();
              if (!data.report) {
                toast({ title: 'No report to compare', status: 'warning', duration: 2000, position: 'bottom-right' });
                return;
              }
              const sources: Source[] = (data.sources || data.citations || []).map((s: any) =>
                typeof s === 'string' ? { title: s, url: s } : s
              );
              setCompareReport({ question: data.question, content: data.report, model: data.model, sources });
              setCompareSessionId(selectedId);
              setCompareMode(true);
              toast({ title: 'Compare mode active', description: 'Viewing side-by-side', status: 'success', duration: 1500, position: 'bottom-right' });
            } catch (err) {
              console.error('[ResearchPage] Failed to load compare session:', err);
            }
          }}
          onSchedule={(_sessionId, question, sessionModel) => {
            const options = SCHEDULE_PRESETS.map((p, i) => `${i + 1}. ${p.label}`).join('\n');
            const choice = prompt(`Schedule recurring research:\n"${question.substring(0, 60)}…"\n\nSelect interval:\n${options}\n\nEnter number:`);
            if (!choice) return;
            const idx = parseInt(choice) - 1;
            const preset = SCHEDULE_PRESETS[idx];
            if (!preset) {
              toast({ title: 'Invalid selection', status: 'warning', duration: 2000, position: 'bottom-right' });
              return;
            }
            addScheduledResearch({
              query: question,
              model: sessionModel,
              audienceLevel: 'general',
              cronLabel: preset.label,
              intervalMs: preset.intervalMs,
              enabled: true,
            });
            toast({ title: `⏰ Scheduled: ${preset.label}`, description: question.substring(0, 60), status: 'success', duration: 3000, position: 'bottom-right' });
          }}
        />

        {/* Main Content Area + Evidence Panel — horizontal flex */}
        <Box flex="1" minW="0" minH="0" h="100%" display="flex" flexDirection="row" overflow="hidden">
        {/* Chat Column */}
        <Box
          flex="1"
          minW="0"
          minH="0"
          h="100%"
          display="flex"
          flexDirection="column"
          overflow="hidden"
          position="relative"
        >
          {messages.length === 0 && (
            <Box position="absolute" inset={0} opacity={0.25} pointerEvents="none" zIndex={0}>
              <SwarmEffect count={12} color={swarmColor} />
            </Box>
          )}

          {/* Chat / Analyzer tab switcher - constant height, hidden when no messages */}
          <Box
            px={4}
            py={2}
            borderBottom="none"
            borderColor={borderColor}
            bg={messages.length > 0 ? bgColor : "transparent"}
            display="flex"
            alignItems="center"
            gap={1}
            zIndex={10}
            h="44px"
            flexShrink={0}
            visibility={messages.length > 0 ? 'visible' : 'hidden'}
            pointerEvents={messages.length > 0 ? 'auto' : 'none'}
          >
            <>
            <Button
              size="xs"
              variant={mainView === 'chat' ? 'solid' : 'ghost'}
              colorScheme={mainView === 'chat' ? 'purple' : 'gray'}
              borderRadius="full"
              onClick={() => setMainView('chat')}
              fontWeight="600"
              fontSize="xs"
            >
              Chat
            </Button>
            <Button
              size="xs"
              variant={mainView === 'analyzer' ? 'solid' : 'ghost'}
              colorScheme={mainView === 'analyzer' ? 'purple' : 'gray'}
              borderRadius="full"
              onClick={() => setMainView('analyzer')}
              fontWeight="600"
              fontSize="xs"
            >
              Analyzer
              {reportAnalysis && (
                <Badge ml={1.5} colorScheme="green" fontSize="2xs" borderRadius="full">
                  {reportAnalysis.topics.length}
                </Badge>
              )}
            </Button>
            </>
          </Box>

          {/* Chat / Analyzer views — scrollable container */}
          <Box 
            ref={scrollContainerRef} 
            overflowX="hidden"
            overflowY="auto" 
            flex="1"
            minH={0}
            minW={0}
            position="relative"
          >
            {/* Chat view */}
            {mainView === 'chat' && (
            <Container maxW="5xl" py={messages.length === 0 ? 8 : 4} position="relative">
              <VStack spacing={6} align="stretch">
                {/* Lineage breadcrumb — shown when viewing a child session */}
                {sessionLineage.length > 1 && (
                  <HStack
                    spacing={1}
                    fontSize="xs"
                    color={mutedColor}
                    flexWrap="wrap"
                    px={1}
                    py={1.5}
                    bg={messageBg}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                  >
                    {sessionLineage.map((ancestor, idx) => {
                      const isCurrent = ancestor.session_id === sessionId;
                      const label = ancestor.question?.substring(0, 50) + (ancestor.question?.length > 50 ? '...' : '');
                      const typeLabel = ancestor.session_type === 'follow_up' ? '↳' : ancestor.session_type === 'qwen3_query' ? '⚡' : ancestor.session_type === 'analysis' ? '📊' : '';
                      return (
                        <React.Fragment key={ancestor.session_id}>
                          {idx > 0 && <Text color={mutedColor} mx={0.5}>›</Text>}
                          {isCurrent ? (
                            <Badge colorScheme="purple" fontSize="2xs" borderRadius="md" px={1.5}>
                              {typeLabel} {label}
                            </Badge>
                          ) : (
                            <Text
                              as="button"
                              fontSize="xs"
                              color="purple.400"
                              cursor="pointer"
                              _hover={{ textDecoration: 'underline', color: 'purple.300' }}
                              onClick={() => loadSession(ancestor.session_id)}
                            >
                              {typeLabel} {label}
                            </Text>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </HStack>
                )}

                {/* Email Context Panel - shown when researching from an email */}
                {contextType === 'email' && showEmailContext && emailContext.email && (
                  <EmailContextPanel
                    context={emailContext}
                    onQuerySelect={(query) => {
                      // Inject email context into the query
                      const contextPrefix = emailContext.contextSummary
                        ? `Based on the following email context:\n\n${emailContext.contextSummary}\n\n`
                        : '';
                      handleSubmit(contextPrefix + query, 'conversational', 'claude-sonnet-4-5', false, sessionId || undefined, sessionId ? 'follow_up' : undefined);
                    }}
                    onClose={() => setShowEmailContext(false)}
                  />
                )}

                {/* Compare Mode — side-by-side split pane */}
                {compareMode && compareReport && (() => {
                  const currentReport = messages.find(m => m.role === 'assistant' && m.content.length > 500);
                  const currentQuestion = messages.find(m => m.role === 'user')?.content || '';
                  return (
                    <VStack spacing={3} align="stretch">
                      {/* Compare header bar */}
                      <HStack
                        justify="space-between"
                        p={3}
                        bg="purple.900"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="purple.600"
                      >
                        <HStack spacing={2}>
                          <Badge colorScheme="purple" fontSize="xs">Compare Mode</Badge>
                          <Text fontSize="xs" color="purple.200">
                            Viewing two research reports side-by-side
                          </Text>
                        </HStack>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorScheme="purple"
                          onClick={() => {
                            setCompareMode(false);
                            setCompareReport(null);
                            setCompareSessionId(null);
                          }}
                        >
                          Exit Compare
                        </Button>
                      </HStack>

                      {/* Split pane */}
                      <Flex gap={3} align="stretch" minH="60vh">
                        {/* Left — current report */}
                        <Box
                          flex={1}
                          bg={messageBg}
                          border="1px solid"
                          borderColor={borderColor}
                          borderRadius="lg"
                          p={4}
                          overflowY="auto"
                          maxH="70vh"
                        >
                          <VStack align="stretch" spacing={2}>
                            <HStack justify="space-between">
                              <Badge colorScheme="blue" fontSize="2xs">Current</Badge>
                              <Text fontSize="2xs" color={mutedColor}>{currentReport?.meta?.model || selectedModel}</Text>
                            </HStack>
                            <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={2}>
                              {currentQuestion.substring(0, 120)}
                            </Text>
                            <Box
                              fontSize="xs"
                              color={textColor}
                              lineHeight="1.6"
                              sx={{
                                'p': { mb: 2 },
                                'h1, h2, h3': { fontWeight: 'bold', mt: 3, mb: 1 },
                                'h2': { fontSize: 'sm' },
                                'ul, ol': { pl: 4, mb: 2 },
                                'li': { mb: 0.5 },
                                'a': { color: 'purple.400' },
                              }}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {currentReport?.content || ''}
                              </ReactMarkdown>
                            </Box>
                          </VStack>
                        </Box>

                        {/* Right — comparison report */}
                        <Box
                          flex={1}
                          bg={messageBg}
                          border="1px solid"
                          borderColor="purple.600"
                          borderRadius="lg"
                          p={4}
                          overflowY="auto"
                          maxH="70vh"
                        >
                          <VStack align="stretch" spacing={2}>
                            <HStack justify="space-between">
                              <Badge colorScheme="purple" fontSize="2xs">Comparison</Badge>
                              <Text fontSize="2xs" color={mutedColor}>{compareReport.model}</Text>
                            </HStack>
                            <Text fontSize="xs" fontWeight="600" color={textColor} noOfLines={2}>
                              {compareReport.question.substring(0, 120)}
                            </Text>
                            <Box
                              fontSize="xs"
                              color={textColor}
                              lineHeight="1.6"
                              sx={{
                                'p': { mb: 2 },
                                'h1, h2, h3': { fontWeight: 'bold', mt: 3, mb: 1 },
                                'h2': { fontSize: 'sm' },
                                'ul, ol': { pl: 4, mb: 2 },
                                'li': { mb: 0.5 },
                                'a': { color: 'purple.400' },
                              }}
                            >
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {compareReport.content}
                              </ReactMarkdown>
                            </Box>
                          </VStack>
                        </Box>
                      </Flex>
                    </VStack>
                  );
                })()}

                {/* Messages */}
                {!compareMode && messages.length === 0 ? (
                  <Box flex="1" minH="200px" display="flex" alignItems="center" justifyContent="center" flexDirection="column">
                    <VStack spacing={4} mb={8} maxW="2xl" w="full">
                      <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                        {contextType === 'email' && emailContext.email
                          ? `Research: ${emailContext.email.subject}`
                          : 'What would you like to research today?'}
                      </Text>
                      <Text color={mutedColor} maxW="md" textAlign="center">
                        {contextType === 'email' && emailContext.email
                          ? 'Ask questions about this email, the sender, topics, or related context.'
                          : 'Access deep research capabilities, run experiments, or query your knowledge base.'}
                      </Text>

                      {/* Agent + privacy tier indicator */}
                      {contextType === 'email' && (
                        <HStack spacing={2} flexWrap="wrap" justify="center">
                          {useGoose ? (
                            <>
                              <Badge colorScheme="blue" fontSize="xs" px={2} py={0.5}>
                                📊 Atlas Analyst
                              </Badge>
                              <Badge
                                colorScheme={privacyTier === 'strict' ? 'red' : privacyTier === 'local' ? 'green' : 'orange'}
                                fontSize="2xs"
                                variant="subtle"
                              >
                                {privacyTier === 'strict' ? '🔒 Local only — no logging' :
                                 privacyTier === 'local' ? '🏠 Local models (Qwen VLM)' :
                                 '☁️ via Gemini Flash → data sent to Google'}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Badge colorScheme="purple" fontSize="xs" px={2} py={0.5}>
                                🔍 Web Research
                              </Badge>
                              <Badge colorScheme="gray" fontSize="2xs" variant="subtle">
                                {selectedModel === 'perplexity' ? 'via Perplexity Sonar' :
                                 selectedModel.includes('gemini') ? '☁️ via Gemini' :
                                 selectedModel.includes('claude') || selectedModel.includes('sonnet') ? '☁️ via Anthropic' :
                                 selectedModel.includes('qwen') || selectedModel.includes('llama') ? '🏠 Local model' :
                                 selectedModel}
                              </Badge>
                            </>
                          )}
                        </HStack>
                      )}

                      {/* Atlas Analytics Results */}
                      {contextType === 'email' && atlasLoading && (
                        <Box w="full" p={4} bg={messageBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                          <HStack spacing={3}>
                            <Spinner size="sm" color="blue.400" />
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="600" color={textColor}>📊 Atlas is analyzing charts...</Text>
                              <Text fontSize="xs" color={mutedColor}>
                                Extracting data from {(emailContext.email?.attachments || []).filter((a: any) => a.content_type?.startsWith('image/')).length} image(s)
                                {privacyTier === 'standard' && <Badge ml={2} colorScheme="orange" fontSize="2xs" variant="subtle">via Gemini Flash</Badge>}
                                {privacyTier !== 'standard' && <Badge ml={2} colorScheme="green" fontSize="2xs" variant="subtle">via Local Qwen VLM</Badge>}
                              </Text>
                            </VStack>
                          </HStack>
                        </Box>
                      )}

                      {contextType === 'email' && atlasResults && !atlasResults.error && (
                        <Box w="full" p={4} bg={messageBg} borderRadius="lg" border="1px solid" borderColor="blue.500">
                          <VStack align="stretch" spacing={3}>
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontSize="sm" fontWeight="700" color={textColor}>📊 Atlas Analytics</Text>
                                <Badge colorScheme="green" fontSize="2xs">{atlasResults.images_analyzed} image(s)</Badge>
                              </HStack>
                              <Badge colorScheme={privacyTier === 'standard' ? 'orange' : 'green'} fontSize="2xs" variant="subtle">
                                {atlasResults.model || 'unknown model'}
                              </Badge>
                            </HStack>
                            {atlasResults.summary && (
                              <Text fontSize="xs" color={textColor}>{atlasResults.summary}</Text>
                            )}
                            {atlasResults.analysis?.summary && (
                              <Text fontSize="xs" color={textColor}>{atlasResults.analysis.summary}</Text>
                            )}
                            {atlasResults.extractions?.length > 0 && (
                              <VStack align="stretch" spacing={1}>
                                {atlasResults.extractions.slice(0, 3).map((ext: any, i: number) => (
                                  <HStack key={i} fontSize="xs" color={mutedColor} spacing={2}>
                                    <Badge colorScheme="purple" fontSize="2xs">{ext.chart_type || 'data'}</Badge>
                                    <Text noOfLines={1}>{ext.title || `Extraction ${i + 1}`}</Text>
                                    {ext.confidence && <Text color="green.400">({(ext.confidence * 100).toFixed(0)}%)</Text>}
                                  </HStack>
                                ))}
                              </VStack>
                            )}
                          </VStack>
                        </Box>
                      )}

                      {/* Attachment Gallery */}
                      {contextType === 'email' && emailContext.email?.attachments && emailContext.email.attachments.length > 0 && (
                        <Box w="full" p={3} bg={messageBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                          <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>📎 Attachments</Text>
                          <HStack spacing={2} flexWrap="wrap">
                            {emailContext.email.attachments.map((att: any, i: number) => (
                              <Badge
                                key={i}
                                colorScheme={att.content_type?.startsWith('image/') ? 'purple' : att.content_type?.includes('pdf') ? 'red' : 'gray'}
                                fontSize="2xs"
                                px={2}
                                py={0.5}
                              >
                                {att.filename?.substring(0, 25)}{att.filename?.length > 25 ? '...' : ''}
                              </Badge>
                            ))}
                          </HStack>
                        </Box>
                      )}

                      {/* Atlas Research Path Suggestions */}
                      {contextType === 'email' && atlasSuggestions.length > 0 && (
                        <Box w="full" p={3} bg={messageBg} borderRadius="lg" border="1px solid" borderColor={borderColor}>
                          <Text fontSize="xs" fontWeight="600" color={textColor} mb={2}>🔍 Suggested Research Paths</Text>
                          <VStack align="stretch" spacing={1.5}>
                            {atlasSuggestions.map((suggestion, i) => (
                              <Button
                                key={i}
                                size="xs"
                                variant="ghost"
                                justifyContent="flex-start"
                                fontWeight="400"
                                color={mutedColor}
                                _hover={{ color: textColor, bg: 'whiteAlpha.100' }}
                                onClick={() => {
                                  const contextPrefix = emailContext.contextSummary
                                    ? `Based on the following email context:\n\n${emailContext.contextSummary}\n\n`
                                    : '';
                                  handleSubmit(contextPrefix + suggestion, 'conversational', 'claude-sonnet-4-5', false, sessionId || undefined, sessionId ? 'follow_up' : undefined);
                                }}
                                whiteSpace="normal"
                                textAlign="left"
                                h="auto"
                                py={1}
                              >
                                <Text fontSize="xs">→ {suggestion}</Text>
                              </Button>
                            ))}
                          </VStack>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                ) : !compareMode ? (
                  <VStack spacing={4} align="stretch" pb={4}>
                    {messages.map((message, index) => (
                      <HStack
                        key={index}
                        align="start"
                        spacing={3}
                        bg={message.role === 'user' ? userMessageBg : messageBg}
                        backdropFilter="blur(12px)"
                        p={4}
                        borderRadius="lg"
                        boxShadow="md"
                        border="1px solid"
                        borderColor={borderColor}
                        alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'}
                        maxW="85%"
                        position="relative"
                        zIndex={2}
                      >
                        {message.role === 'assistant' && (
                          <Avatar
                            size="sm"
                            name="AI Research"
                            bg="purple.500"
                            color="white"
                          />
                        )}
                        <VStack align="start" spacing={2} flex={1} minW={0} overflow="hidden" w="full">
                          <HStack justify="space-between" w="full" flexWrap="wrap" gap={1}>
                            <HStack spacing={2}>
                              <Text
                                fontSize="sm"
                                fontWeight="semibold"
                                color={message.role === 'user' ? userMessageText : textColor}
                              >
                                {message.role === 'user' ? 'You' : 'AI Research Assistant'}
                              </Text>
                              {/* Agent + LLM provider label */}
                              {message.role === 'assistant' && message.meta?.model && (() => {
                                const m = (message.meta.model || '').toLowerCase();
                                const isAtlas = m.startsWith('atlas/');
                                const innerModel = isAtlas ? m.replace('atlas/', '') : m;
                                const isLocal = innerModel.includes('qwen') || innerModel.includes('llama') || innerModel.includes('mistral');
                                const provider = innerModel.includes('gemini') ? 'Google' : innerModel.includes('claude') || innerModel.includes('sonnet') || innerModel.includes('haiku') ? 'Anthropic' : innerModel.includes('gpt') ? 'OpenAI' : innerModel.includes('sonar') || innerModel.includes('perplexity') ? 'Perplexity' : isLocal ? 'Local' : null;

                                if (isAtlas) {
                                  return (
                                    <HStack spacing={1}>
                                      <Badge colorScheme="blue" fontSize="2xs" variant="subtle" borderRadius="full" px={1.5}>
                                        📊 Atlas
                                      </Badge>
                                      {provider && provider !== 'Local' && (
                                        <Badge colorScheme="orange" fontSize="2xs" variant="outline" borderRadius="full" px={1}>
                                          ☁️ {provider}
                                        </Badge>
                                      )}
                                      {isLocal && (
                                        <Badge colorScheme="green" fontSize="2xs" variant="outline" borderRadius="full" px={1}>
                                          🏠 Local
                                        </Badge>
                                      )}
                                    </HStack>
                                  );
                                }

                                if (!provider) return null;
                                return (
                                  <Badge
                                    colorScheme={isLocal ? 'green' : 'orange'}
                                    fontSize="2xs"
                                    variant="subtle"
                                    borderRadius="full"
                                    px={1.5}
                                  >
                                    {isLocal ? `🏠 ${provider}` : `☁️ ${provider}`}
                                  </Badge>
                                );
                              })()}
                              {/* Assistant / Sources toggle - inline in header */}
                              {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                                <HStack spacing={0} bg={messageBg} borderRadius="full" p={0.5}>
                                  <Button
                                    size="2xs"
                                    fontSize="2xs"
                                    h="20px"
                                    px={2}
                                    borderRadius="full"
                                    variant={(activeTab[index] || 'assistant') === 'assistant' ? 'solid' : 'ghost'}
                                    colorScheme={(activeTab[index] || 'assistant') === 'assistant' ? 'purple' : 'gray'}
                                    onClick={() => setActiveTab(prev => ({ ...prev, [index]: 'assistant' }))}
                                    fontWeight="600"
                                  >
                                    Assistant
                                  </Button>
                                  <Button
                                    size="2xs"
                                    fontSize="2xs"
                                    h="20px"
                                    px={2}
                                    borderRadius="full"
                                    variant={activeTab[index] === 'sources' ? 'solid' : 'ghost'}
                                    colorScheme={activeTab[index] === 'sources' ? 'purple' : 'gray'}
                                    onClick={() => setActiveTab(prev => ({ ...prev, [index]: 'sources' }))}
                                    fontWeight="600"
                                    leftIcon={<LinkIcon width={10} height={10} />}
                                  >
                                    Sources ({message.sources.length})
                                  </Button>
                                </HStack>
                              )}
                            </HStack>
                            <HStack spacing={2}>
                              {message.role === 'assistant' && !message.content.includes('Error') && (
                                <>
                                  <ReadAloudButton
                                    text={message.content}
                                    service="deep-research"
                                    size="xs"
                                    showVoiceMenu
                                    showDownload
                                  />
                                  <MessageExportMenu
                                    content={message.content}
                                    sources={message.sources}
                                    label={messages.find(m => m.role === 'user')?.content?.substring(0, 80) || 'Research'}
                                    sessionId={sessionId || undefined}
                                    size="xs"
                                  />
                                  <Tooltip label="Publish to Workspace" placement="top">
                                    <IconButton
                                      aria-label="Publish to Workspace"
                                      icon={<BookOpenIcon width={16} />}
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="blue"
                                      isLoading={publishingToWorkspace === index}
                                      onClick={async () => {
                                        if (!sessionId) return;
                                        setPublishingToWorkspace(index);
                                        try {
                                          const res = await fetch(`/api/research-lab/session/${sessionId}/publish`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({}),
                                          });
                                          const data = await res.json();
                                          if (res.ok && data.success) {
                                            toast({
                                              title: data.already_published ? 'Already published' : 'Published to Workspace',
                                              description: data.already_published
                                                ? 'Opening existing page…'
                                                : `Created "${data.title}" with ${data.block_count} blocks`,
                                              status: data.already_published ? 'info' : 'success',
                                              duration: 3000,
                                              position: 'bottom-right',
                                              isClosable: true,
                                            });
                                            window.open(`/workspace?page=${data.page_id}`, '_blank');
                                          } else {
                                            toast({ title: data.error || 'Publish failed', status: 'error', duration: 3000, position: 'bottom-right' });
                                          }
                                        } catch (err) {
                                          console.error('[Research] Publish to workspace failed:', err);
                                          toast({ title: 'Failed to publish', status: 'error', duration: 3000, position: 'bottom-right' });
                                        } finally {
                                          setPublishingToWorkspace(null);
                                        }
                                      }}
                                    />
                                  </Tooltip>
                                  <Tooltip label="Save to My Notion Library" placement="top">
                                    <IconButton
                                      aria-label="Save to Notion"
                                      icon={<BookmarkIcon width={16} />}
                                      size="xs"
                                      variant="ghost"
                                      colorScheme="purple"
                                      onClick={() => handleSaveToNotion(index)}
                                      isLoading={savingToNotion === index}
                                    />
                                  </Tooltip>
                                </>
                              )}
                              <Text fontSize="xs" color={message.role === 'user' ? 'whiteAlpha.800' : mutedColor}>
                                {message.timestamp.toLocaleTimeString()}
                              </Text>
                              {message.cost !== undefined && (
                                <Badge colorScheme="green" fontSize="xs">
                                  ${message.cost.toFixed(4)}
                                </Badge>
                              )}
                            </HStack>
                          </HStack>
                          {/* Research Output Metadata Strip */}
                          {message.role === 'assistant' && message.meta && (
                            <HStack
                              spacing={3}
                              flexWrap="wrap"
                              py={1.5}
                              px={2}
                              bg="whiteAlpha.50"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="whiteAlpha.100"
                              w="full"
                            >
                              {message.meta.model && (
                                <HStack spacing={1}>
                                  <Text fontSize="2xs" color={mutedColor} fontWeight="600">Model</Text>
                                  <Badge colorScheme="purple" fontSize="2xs" variant="subtle">{message.meta.model}</Badge>
                                </HStack>
                              )}
                              <HStack spacing={1}>
                                <Text fontSize="2xs" color={mutedColor} fontWeight="600">Words</Text>
                                <Text fontSize="2xs" color={textColor}>{message.meta.wordCount.toLocaleString()}</Text>
                              </HStack>
                              <HStack spacing={1}>
                                <Text fontSize="2xs" color={mutedColor} fontWeight="600">Chars</Text>
                                <Text fontSize="2xs" color={textColor}>{message.meta.charCount.toLocaleString()}</Text>
                              </HStack>
                              <HStack spacing={1}>
                                <Text fontSize="2xs" color={mutedColor} fontWeight="600">Tokens</Text>
                                <Text fontSize="2xs" color={textColor}>{message.meta.tokenEstimate.toLocaleString()}</Text>
                              </HStack>
                              <HStack spacing={1}>
                                <Text fontSize="2xs" color={mutedColor} fontWeight="600">Size</Text>
                                <Text fontSize="2xs" color={textColor}>{message.meta.memorySizeKB} KB</Text>
                              </HStack>
                              {message.meta.sourceCount !== undefined && message.meta.sourceCount > 0 && (
                                <HStack spacing={1}>
                                  <Text fontSize="2xs" color={mutedColor} fontWeight="600">Sources</Text>
                                  <Text fontSize="2xs" color={textColor}>{message.meta.sourceCount}</Text>
                                </HStack>
                              )}
                              {message.meta.processingTimeMs !== undefined && (
                                <HStack spacing={1}>
                                  <Text fontSize="2xs" color={mutedColor} fontWeight="600">Time</Text>
                                  <Text fontSize="2xs" color={textColor}>
                                    {message.meta.processingTimeMs >= 60000
                                      ? `${(message.meta.processingTimeMs / 60000).toFixed(1)}m`
                                      : `${(message.meta.processingTimeMs / 1000).toFixed(1)}s`}
                                  </Text>
                                </HStack>
                              )}
                              {message.meta.inputTokens != null && (
                                <HStack spacing={1}>
                                  <Text fontSize="2xs" color={mutedColor} fontWeight="600">In/Out</Text>
                                  <Text fontSize="2xs" color={textColor}>
                                    {message.meta.inputTokens.toLocaleString()} / {(message.meta.outputTokens || message.meta.tokenEstimate).toLocaleString()}
                                  </Text>
                                </HStack>
                              )}
                            </HStack>
                          )}
                          {message.role === 'user' ? (
                            <Text
                              fontSize="sm"
                              color={userMessageText}
                              whiteSpace="pre-wrap"
                              lineHeight="1.6"
                            >
                              {message.content}
                            </Text>
                          ) : activeTab[index] === 'sources' && message.sources && message.sources.length > 0 ? (
                            <VStack align="stretch" spacing={2} w="full">
                              <Text fontSize="xs" color={mutedColor}>
                                {message.sources.length} sources found
                              </Text>
                              {message.sources.map((source, sIdx) => (
                                <Link
                                  key={sIdx}
                                  href={source.url}
                                  isExternal
                                  _hover={{ textDecoration: 'none' }}
                                >
                                  <HStack
                                    p={2.5}
                                    borderRadius="md"
                                    border="1px solid"
                                    borderColor={borderColor}
                                    _hover={{ bg: messageBg, borderColor: 'purple.400' }}
                                    transition="all 0.15s"
                                    spacing={2.5}
                                  >
                                    <Badge colorScheme="purple" fontSize="2xs" minW="22px" textAlign="center">
                                      {sIdx + 1}
                                    </Badge>
                                    <VStack align="start" spacing={0} flex={1}>
                                      <Text fontSize="xs" fontWeight="600" color="purple.400" noOfLines={1}>
                                        {source.title}
                                      </Text>
                                      <Text fontSize="2xs" color={mutedColor} noOfLines={1}>
                                        {source.url}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </Link>
                              ))}
                            </VStack>
                          ) : (
                            <Box
                              fontSize="sm"
                              color={textColor}
                              lineHeight="1.7"
                              sx={{
                                'p': { mb: 3 },
                                'h1, h2, h3, h4': { fontWeight: 'bold', mt: 4, mb: 2 },
                                'h1': { fontSize: 'lg' },
                                'h2': { fontSize: 'md' },
                                'h3': { fontSize: 'sm', fontWeight: '600' },
                                'ul, ol': { pl: 5, mb: 3 },
                                'li': { mb: 1 },
                                'a': { color: 'purple.400', textDecoration: 'underline', _hover: { color: 'purple.300' } },
                                'strong': { fontWeight: '600' },
                                'hr': { my: 4, borderColor: 'gray.600' },
                                'code': { bg: 'whiteAlpha.100', px: 1, py: 0.5, borderRadius: 'sm', fontSize: 'xs' },
                                'pre': { bg: 'whiteAlpha.100', p: 3, borderRadius: 'md', overflowX: 'auto', mb: 3 },
                                'table': { width: '100%', mb: 3, borderCollapse: 'collapse' },
                                'th': { bg: 'whiteAlpha.100', px: 3, py: 1.5, fontSize: 'xs', fontWeight: '600', textAlign: 'left', borderBottom: '1px solid', borderColor: 'gray.600' },
                                'td': { px: 3, py: 1.5, fontSize: 'xs', borderBottom: '1px solid', borderColor: 'gray.700' },
                              }}
                            >
                              {(() => {
                                const { thinking, mainContent } = processThinkingTags(message.content);
                                return (
                                  <>
                                    {/* Collapsible Thinking Card */}
                                    {thinking && (
                                      <ThinkingCard thinking={thinking} />
                                    )}
                                    {/* Main Content */}
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        a: ({ href, children, ...props }) => (
                                          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                                            {children}
                                          </a>
                                        ),
                                      }}
                                    >
                                      {mainContent}
                                    </ReactMarkdown>
                                  </>
                                );
                              })()}
                            </Box>
                          )}
                          {/* Quick Export Bar — shown for completed reports */}
                          {message.role === 'assistant' && message.content.length > 500 && !message.content.includes('❌') && !message.content.includes('Deep Research in progress') && (
                            <HStack
                              spacing={2}
                              pt={2}
                              mt={1}
                              borderTop="1px solid"
                              borderColor="whiteAlpha.100"
                              flexWrap="wrap"
                            >
                              <Text fontSize="2xs" color={mutedColor} fontWeight="600" mr={1}>Quick Export:</Text>
                              <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="purple"
                                fontSize="2xs"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(message.content);
                                  toast({ title: 'Report copied', status: 'success', duration: 1500, position: 'bottom-right' });
                                }}
                              >
                                📋 Copy
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="purple"
                                fontSize="2xs"
                                onClick={() => {
                                  const userQ = messages.find(m => m.role === 'user')?.content?.substring(0, 80) || 'Research';
                                  const blob = new Blob([`# ${userQ}\n\n${message.content}`], { type: 'text/markdown;charset=utf-8' });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `${userQ.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 60)}.md`;
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  URL.revokeObjectURL(url);
                                  toast({ title: 'Markdown downloaded', status: 'success', duration: 1500, position: 'bottom-right' });
                                }}
                              >
                                📄 Download MD
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                colorScheme="purple"
                                fontSize="2xs"
                                onClick={() => handleSaveToNotion(index)}
                                isLoading={savingToNotion === index}
                              >
                                📚 Save to Notion
                              </Button>
                            </HStack>
                          )}
                        </VStack>
                        {message.role === 'user' && (
                          <Avatar
                            size="sm"
                            name="You"
                            bg="blue.500"
                            color="white"
                          />
                        )}
                      </HStack>
                    ))}

                    {/* Clarification Questions Panel */}
                    {clarificationQuestions.length > 0 && (
                      <DeepResearchClarificationPanel
                        questions={clarificationQuestions.map(q => ({ ...q, answer: '' }))}
                        onSubmit={handleClarificationSubmit}
                        onSkip={handleClarificationSkip}
                        isLoading={isLoading}
                      />
                    )}

                    {/* Loading indicator with pipeline status */}
                    {(isLoading || isQueryingQwen3) && (
                      <HStack align="start" spacing={3} bg={messageBg} backdropFilter="blur(12px)" border="1px solid" borderColor={borderColor} p={4} borderRadius="lg" boxShadow="md" alignSelf="flex-start" position="relative" zIndex={2} minW="320px" maxW="480px">
                        <Avatar size="sm" name="AI Research" bg="purple.500" color="white" />
                        <VStack align="start" spacing={2} flex={1}>
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            AI Research Assistant
                          </Text>
                          <HStack>
                            <Spinner size="sm" color="purple.500" />
                            <Text fontSize="sm" fontWeight="medium" color={textColor}>
                              {processingStatus?.step || (isQueryingQwen3 ? 'Querying Qwen3...' : currentMode === 'deep' ? 'Conducting deep research...' : useGoose ? '📊 Atlas Analyst...' : 'Thinking...')}
                            </Text>
                          </HStack>
                          {processingStatus?.detail && (
                            <Text fontSize="xs" color={mutedColor} noOfLines={2}>
                              {processingStatus.detail}
                            </Text>
                          )}
                          {processingStatus?.progress != null && (
                            <Progress
                              value={processingStatus.progress}
                              size="xs"
                              colorScheme="purple"
                              borderRadius="full"
                              w="100%"
                              hasStripe
                              isAnimated
                            />
                          )}
                        </VStack>
                      </HStack>
                    )}
                    <div ref={messagesEndRef} />
                  </VStack>
                ) : null}
              </VStack>
            </Container>
            )}

            {/* Analyzer view */}
            {mainView === 'analyzer' && currentSessionType !== 'original' && (
              // Sub-query sessions: show the report output instead of Analyzer
              <Container maxW="5xl" py={4}>
                <VStack spacing={4} align="stretch">
                  <HStack spacing={2} px={2}>
                    <Badge colorScheme="purple" fontSize="xs">
                      {currentSessionType === 'follow_up' ? 'Follow-up Research' : currentSessionType === 'qwen3_query' ? 'Quick Query' : 'Analysis'}
                    </Badge>
                    <Text fontSize="sm" color={mutedColor}>
                      Sub-queries are packaged with the parent research. To go deeper, use the parent session's Analyzer.
                    </Text>
                  </HStack>
                  {latestReport && (
                    <Box
                      bg={messageBg}
                      p={6}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={borderColor}
                      maxH="calc(100vh - 200px)"
                      overflowY="auto"
                    >
                      <Box className="prose prose-sm max-w-none" color={textColor}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {latestReport.content}
                        </ReactMarkdown>
                      </Box>
                    </Box>
                  )}
                </VStack>
              </Container>
            )}
            {mainView === 'analyzer' && currentSessionType === 'original' && (
              <Box px={4} py={4} display="flex" flexDirection="column" minH="100%">
                <ResearchTopicAnalyzer
                  analysis={reportAnalysis}
                  isAnalyzing={isAnalyzing}
                  onAnalyze={handleAnalyzeReport}
                  onFollowUpDeepResearch={handleFollowUpDeepResearch}
                  onFollowUpQwen3={handleFollowUpQwen3}
                  reportExists={!!latestReport}
                  pendingResearch={pendingTopicResearch}
                  onImportResearch={handleOpenImportResearch}
                  onPublishConsolidated={async () => {
                    if (!sessionId || !reportAnalysis) return;
                    try {
                      // Publish the parent session first
                      const res = await fetch(`/api/research-lab/session/${sessionId}/publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                      });
                      const data = await res.json();
                      if (res.ok && data.success) {
                        // Also publish each gathered child session
                        const childSessionIds = new Set<string>();
                        for (const topic of reportAnalysis.topics) {
                          for (const gr of (topic.gathered_research || [])) {
                            if (gr.session_id && gr.session_id !== 'immediate') {
                              childSessionIds.add(gr.session_id);
                            }
                          }
                        }
                        let publishedCount = 1;
                        for (const childSid of childSessionIds) {
                          try {
                            await fetch(`/api/research-lab/session/${childSid}/publish`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({}),
                            });
                            publishedCount++;
                          } catch { /* skip failed children */ }
                        }
                        toast({
                          title: 'Published to Workspace',
                          description: `${publishedCount} research documents published to Research Library`,
                          status: 'success',
                          duration: 4000,
                          position: 'bottom-right',
                          isClosable: true,
                        });
                        window.open(`/workspace?page=${data.page_id}`, '_blank');
                      } else {
                        toast({ title: data.error || 'Publish failed', status: 'error', duration: 3000, position: 'bottom-right' });
                      }
                    } catch (err: any) {
                      toast({ title: 'Failed to publish', description: err.message, status: 'error', duration: 3000, position: 'bottom-right' });
                    }
                  }}
                />
              </Box>
            )}
          </Box>

          {/* Bottom input bar — pinned to bottom of flex column */}
          <Box
            px={mainView === 'chat' ? 2 : 0}
            py={mainView === 'chat' ? 2 : 0}
            zIndex={10}
            bg={bgColor}
            borderTop="none"
            borderColor={borderColor}
            flexShrink={0}
          >
            {mainView === 'chat' && (
              <AIInputInterface 
                onSubmit={(query, mode, model, webSearch) => {
                  if (contextType === 'email' && emailContext.contextSummary) {
                    const contextPrefix = `Based on the following email context:\n\n${emailContext.contextSummary}\n\nUser question: `;
                    handleSubmit(contextPrefix + query, mode, model, webSearch, sessionId || undefined, sessionId ? 'follow_up' : undefined);
                  } else {
                    handleSubmit(query, mode, model, webSearch, sessionId || undefined, sessionId ? 'follow_up' : undefined);
                  }
                }}
                isLoading={isLoading}
                defaultModel={selectedModel}
                onModelChange={setSelectedModel}
                perplexitySearchModel={perplexitySearchModel}
                onPerplexitySearchModelChange={setPerplexitySearchModel}
                useGoose={useGoose}
                onUseGooseChange={setUseGoose}
                compact={messages.length > 0}
                onFileUpload={handleFileUpload}
                pendingAttachments={pendingAttachments}
                onRemoveAttachment={handleRemoveAttachment}
              />
            )}
          </Box>
        </Box>

        {/* Evidence Panel — artifact-style split pane for email image attachments */}
        {contextType === 'email' && emailId && emailContext.email?.attachments && (
          <EvidencePanel
            emailId={emailId}
            attachments={emailContext.email.attachments}
            isOpen={evidencePanelOpen}
            onToggle={() => setEvidencePanelOpen(!evidencePanelOpen)}
            atlasResults={atlasResults}
            privacyTier={privacyTier}
            onAnalyzeImage={async (image, visionModel) => {
              const isLocal = visionModel === 'local';
              const visionModelId = isLocal ? 'qwen-vlm' : 'gemini-2-5-flash';

              // Add user message immediately
              const userMsg: Message = {
                role: 'user',
                content: `Analyze the image "${image.filename}" — extract all data, trends, and observations.${isLocal ? ' (using local Qwen Vision)' : ' (using cloud Gemini Vision)'}`,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, userMsg]);
              setIsLoading(true);
              setProcessingStatus({ step: `👁️ ${isLocal ? 'Qwen Vision (local)' : 'Gemini Vision (cloud)'}`, detail: `Extracting data from ${image.filename}...`, progress: 20 });

              try {
                // ── Stage 1: Vision extraction ──
                // Route through vision proxy: local → RTX Qwen Vision, cloud → Gemini via AI Gateway
                const visionResp = await fetch('/api/ai-gateway/vision', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: isLocal ? 'qwen-vision' : 'gemini-2-5-flash',
                    messages: [
                      {
                        role: 'user',
                        content: [
                          { type: 'text', text: 'Extract ALL data from this image. If it is a table, reproduce it exactly in markdown. If it is a chart, list every data point, axis labels, legend items, and trends. Be exhaustive — include every value you can read.' },
                          { type: 'image_url', image_url: { url: `${window.location.origin}${image.url}` } },
                        ],
                      },
                    ],
                    max_tokens: 4096,
                    temperature: 0.2,
                  }),
                });

                const visionData = await visionResp.json();
                const extraction = visionData.choices?.[0]?.message?.content || visionData.response || '';

                if (!extraction) {
                  throw new Error(`${visionModelId} returned empty extraction`);
                }

                setProcessingStatus({ step: '📊 Atlas Analysis', detail: 'Analyzing extracted data...', progress: 60 });

                // ── Stage 2: Atlas analyzes the extraction ──
                const atlasModel = privacyTier === 'standard' ? 'gemini-2-5-flash' : 'qwen3-32b';
                const emailCtx = emailContext.contextSummary ? `\n## Email Context\n${emailContext.contextSummary}` : '';

                const atlasResp = await fetch('/api/ai-gateway/vision', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    model: atlasModel,
                    messages: [
                      {
                        role: 'system',
                        content: `You are Atlas, the AI Analytics agent. You analyze extracted data from images and provide domain-contextualized insights, trends, and recommendations.${emailCtx}`,
                      },
                      {
                        role: 'user',
                        content: `The following data was extracted from the image "${image.filename}" by ${visionModelId}:\n\n${extraction}\n\n---\n\nAnalyze this data thoroughly:\n1. Summarize the key findings\n2. Identify trends, patterns, and outliers\n3. Provide domain-specific insights\n4. Suggest follow-up research questions`,
                      },
                    ],
                    max_tokens: 4096,
                    temperature: 0.5,
                  }),
                });

                const atlasData = await atlasResp.json();
                const analysis = atlasData.choices?.[0]?.message?.content || atlasData.response || '';

                // Combine both stages into the response
                const combinedContent = [
                  `## 👁️ Vision Extraction (${isLocal ? 'Qwen Vision — local' : 'Gemini Vision — cloud'})`,
                  '',
                  extraction,
                  '',
                  '---',
                  '',
                  `## 📊 Atlas Analysis (${atlasModel})`,
                  '',
                  analysis || '_Atlas analysis unavailable_',
                ].join('\n');

                const assistantMsg: Message = {
                  role: 'assistant',
                  content: combinedContent,
                  timestamp: new Date(),
                  meta: buildResearchMeta(combinedContent, {
                    model: `${visionModelId} → atlas/${atlasModel}`,
                    inputTokens: (visionData.usage?.prompt_tokens || 0) + (atlasData.usage?.prompt_tokens || 0),
                    outputTokens: (visionData.usage?.completion_tokens || 0) + (atlasData.usage?.completion_tokens || 0),
                  }),
                };
                setMessages(prev => [...prev, assistantMsg]);

              } catch (err: any) {
                console.error('[Vision+Atlas] Pipeline error:', err);
                const errorMsg: Message = {
                  role: 'assistant',
                  content: `❌ Image analysis failed: ${err.message || 'Unknown error'}\n\nTry the other vision model, or check that the ${isLocal ? 'Qwen Vision service is running on port 8124' : 'Gemini API key is configured'}.`,
                  timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMsg]);
              } finally {
                setIsLoading(false);
                setProcessingStatus(null);
              }
            }}
          />
        )}

        </Box>
      </Flex>
      {/* Import Research Modal */}
      <Modal isOpen={isImportOpen} onClose={onImportClose} size="lg" isCentered scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg={bgColor} borderColor={borderColor} borderWidth="1px" maxH="70vh">
          <ModalHeader fontSize="md" pb={2}>Import Existing Research</ModalHeader>
          <ModalCloseButton size="sm" />
          <ModalBody pb={4}>
            <VStack spacing={3} align="stretch">
              <Input
                placeholder="Search by question..."
                size="sm"
                value={importSearch}
                onChange={(e) => setImportSearch(e.target.value)}
              />
              {importLoading ? (
                <HStack justify="center" py={6}><Spinner size="sm" /><Text fontSize="sm" color={mutedColor}>Loading sessions...</Text></HStack>
              ) : (
                <VStack spacing={1} align="stretch" maxH="400px" overflowY="auto">
                  {importSessions
                    .filter(s => !importSearch || s.question.toLowerCase().includes(importSearch.toLowerCase()))
                    .map(s => (
                      <HStack
                        key={s.session_id}
                        p={3}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={borderColor}
                        cursor="pointer"
                        _hover={{ borderColor: 'purple.400', bg: 'whiteAlpha.50' }}
                        onClick={() => handleImportSession(s.session_id)}
                        spacing={3}
                      >
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
                            {s.question.substring(0, 100)}{s.question.length > 100 ? '...' : ''}
                          </Text>
                          <HStack spacing={2} mt={1}>
                            <Badge fontSize="2xs" colorScheme="green">{s.model}</Badge>
                            <Text fontSize="2xs" color={mutedColor}>
                              {new Date(s.created_at).toLocaleDateString()}
                            </Text>
                            {s.actual_cost != null && (
                              <Text fontSize="2xs" color={mutedColor}>${Number(s.actual_cost).toFixed(4)}</Text>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>
                    ))
                  }
                  {importSessions.filter(s => !importSearch || s.question.toLowerCase().includes(importSearch.toLowerCase())).length === 0 && (
                    <Text fontSize="sm" color={mutedColor} textAlign="center" py={4}>
                      {importSearch ? 'No matching sessions found' : 'No completed sessions available'}
                    </Text>
                  )}
                </VStack>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
}

export default withFeatureGuard(ResearchPage, 'ai-research');

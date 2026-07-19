/**
 * Child Research Right Panel
 *
 * A research-companion panel that complements the main research studio.
 * No chat UI — instead provides:
 * - Notes: writable annotations for key findings (with proactive suggestions)
 * - Sources: collected sources from research sessions
 * - Ideas: research topic suggestions and follow-up questions
 * - Export: adaptive workflow rail for compiling research into documents
 *
 * Data persists to localStorage via ResearchStudioContext.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Divider,
  Textarea,
  IconButton,
  Collapse,
  Progress,
  useToast,
} from '@chakra-ui/react';
import {
  PlusIcon,
  TrashIcon,
  BookmarkIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  SparklesIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon,
  FolderPlusIcon,
} from '@heroicons/react/24/outline';
import { useChildTheme } from './ChildThemeProvider';
import { useResearchStudio, type ExportFormat, type ResearchSession } from './ResearchStudioContext';
import type { ProactiveSuggestion } from '@/lib/research/proactive-engine';
import { DocumentViewer } from './DocumentViewer';

interface ChildResearchPanelProps {
  activeTab: string;
}

const TOPIC_IDEAS = [
  { emoji: '🌍', label: 'Geography', prompt: 'Where is Puerto Rico and what is its climate like?' },
  { emoji: '🦁', label: 'Animals', prompt: 'What do lions eat in the wild?' },
  { emoji: '🚀', label: 'Space', prompt: 'How do rockets get to space?' },
  { emoji: '🏛️', label: 'History', prompt: 'Who built the pyramids and why?' },
  { emoji: '🌊', label: 'Ocean', prompt: 'What is the deepest part of the ocean?' },
  { emoji: '🔬', label: 'Science', prompt: 'Why is the sky blue?' },
  { emoji: '🦕', label: 'Dinosaurs', prompt: 'When did dinosaurs go extinct?' },
  { emoji: '🌱', label: 'Plants', prompt: 'How do plants make their own food?' },
];

export function ChildResearchPanel({ activeTab }: ChildResearchPanelProps) {
  const { colors } = useChildTheme();
  const toast = useToast();

  const researchStudio = useResearchStudio();
  const [newNoteText, setNewNoteText] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [exporting, setExporting] = useState(false);

  const notes = researchStudio?.notes || [];
  const sources = researchStudio?.sources || [];
  const followUpIdeas = researchStudio?.followUpIdeas || [];
  const proactiveSuggestions = researchStudio?.proactiveSuggestions || [];
  const exportReadiness = researchStudio?.exportReadiness;
  const exportState = researchStudio?.exportState || 'idle';
  const workflowStage = researchStudio?.workflowStage || 'exploring';

  const saveNote = useCallback(() => {
    const text = newNoteText.trim();
    if (!text) return;
    researchStudio?.addNote(text, 'manual');
    setNewNoteText('');
    setIsAddingNote(false);
    toast({ title: 'Note saved', status: 'success', duration: 1500 });
  }, [newNoteText, researchStudio, toast]);

  const deleteNote = useCallback((id: string) => {
    researchStudio?.removeNote(id);
  }, [researchStudio]);

  const deleteSource = useCallback((id: string) => {
    researchStudio?.removeSource(id);
  }, [researchStudio]);

  const handleIdeaClick = useCallback((prompt: string) => {
    window.dispatchEvent(new CustomEvent('child-research-idea', {
      detail: { prompt },
    }));
  }, []);

  const acceptProactiveNote = useCallback((suggestion: ProactiveSuggestion) => {
    if (suggestion.type === 'save-note' && suggestion.payload) {
      const noteData = suggestion.payload as { text: string };
      researchStudio?.addNote(noteData.text, 'proactive');
      researchStudio?.dismissSuggestion(suggestion.id);
      toast({ title: 'Note saved from suggestion', status: 'success', duration: 1500 });
    }
  }, [researchStudio, toast]);

  const dismissSuggestion = useCallback((id: string) => {
    researchStudio?.dismissSuggestion(id);
  }, [researchStudio]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!researchStudio) return;
    researchStudio.setExportFormat(format);
    researchStudio.setExportState('preparing');
    setExporting(true);

    try {
      const res = await fetch('/api/child/research/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          title: researchStudio.activeQuery || 'My Research',
          notes: researchStudio.notes,
          sources: researchStudio.sources,
        }),
      });

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      // API returns self-contained HTML for in-dashboard preview
      const data = await res.json();
      if (data.html) {
        researchStudio.setExportHtml(data.html);
        researchStudio.setExportTitle(data.title || researchStudio.activeQuery || 'My Research');
        researchStudio.setExportState('ready');
        // Open the in-dashboard document viewer
        researchStudio.setShowDocumentViewer(true);
        toast({ title: `${format.toUpperCase()} document ready!`, status: 'success', duration: 2000 });
      } else {
        throw new Error('No document content returned');
      }
    } catch (err) {
      researchStudio.setExportState('error');
      toast({ title: 'Export failed', description: (err as Error).message, status: 'error', duration: 3000 });
    } finally {
      setExporting(false);
    }
  }, [researchStudio, toast]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const toolBadgeColor = (tool: string): string => {
    const t = tool || '';
    if (t.includes('deep') || t.includes('perplexity')) return 'purple';
    if (t.includes('web') || t.includes('brave')) return 'orange';
    if (t.includes('wikipedia')) return 'blue';
    if (t.includes('knowledge')) return 'blue';
    return 'gray';
  };

  const toolLabel = (tool: string): string => {
    const t = tool || '';
    if (t.includes('deep') || t.includes('perplexity')) return 'Perplexity';
    if (t.includes('brave')) return 'Brave';
    if (t.includes('wikipedia')) return 'Wikipedia';
    if (t.includes('knowledge')) return 'Knowledge Graph';
    if (t.includes('web')) return 'Web Search';
    return t || 'Unknown';
  };

  // ─── Notes Tab ────────────────────────────────────────────────────────────
  if (activeTab === 'notes') {
    return (
      <VStack spacing={3} align="stretch" p={3}>
        <HStack spacing={2}>
          <ClipboardDocumentListIcon style={{ width: 18, height: 18 }} />
          <Text fontWeight="600" fontSize="sm" fontFamily="'Inter', sans-serif">
            Research Notes
          </Text>
          <Badge colorScheme="gray" fontSize="2xs" ml="auto">{notes.length}</Badge>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          Write down key facts and findings from your research.
        </Text>

        {/* Proactive Suggestions */}
        {proactiveSuggestions.filter(s => s.type === 'save-note').length > 0 && (
          <VStack spacing={2} align="stretch">
            <HStack spacing={1}>
              <SparklesIcon style={{ width: 14, height: 14 }} />
              <Text fontSize="2xs" fontWeight="600" color="purple.600" fontFamily="'Inter', sans-serif">
                Suggested notes from your research:
              </Text>
            </HStack>
            {proactiveSuggestions.filter(s => s.type === 'save-note').slice(0, 3).map((sugg) => (
              <Box
                key={sugg.id}
                p={2}
                bg="purple.50"
                borderRadius="md"
                border="1px solid"
                borderColor="purple.100"
                position="relative"
              >
                <Text fontSize="xs" color="purple.900" fontFamily="'Inter', sans-serif" pr={6}>
                  {sugg.description}
                </Text>
                <HStack spacing={1} mt={1.5}>
                  <Button
                    size="xs"
                    colorScheme="purple"
                    leftIcon={<PlusIcon style={{ width: 12, height: 12 }} />}
                    onClick={() => acceptProactiveNote(sugg)}
                    h="20px"
                    fontSize="2xs"
                  >
                    Save
                  </Button>
                  <IconButton
                    aria-label="Dismiss"
                    icon={<XMarkIcon style={{ width: 12, height: 12 }} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => dismissSuggestion(sugg.id)}
                    minW="20px"
                    h="20px"
                  />
                </HStack>
              </Box>
            ))}
          </VStack>
        )}

        <Collapse in={isAddingNote} animateOpacity>
          <VStack spacing={2} align="stretch">
            <Textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write your note here..."
              fontSize="sm"
              rows={3}
              borderRadius="md"
              bg="gray.50"
              border="1px solid"
              borderColor="gray.200"
              _focus={{ borderColor: colors?.primary || 'purple.400' }}
              autoFocus
            />
            <HStack justify="flex-end" spacing={2}>
              <Button size="xs" variant="ghost" onClick={() => { setIsAddingNote(false); setNewNoteText(''); }}>
                Cancel
              </Button>
              <Button size="xs" colorScheme="purple" onClick={saveNote} isDisabled={!newNoteText.trim()}>
                Save
              </Button>
            </HStack>
          </VStack>
        </Collapse>

        {!isAddingNote && (
          <Button
            size="sm"
            variant="outline"
            colorScheme="purple"
            leftIcon={<PlusIcon style={{ width: 16, height: 16 }} />}
            onClick={() => setIsAddingNote(true)}
            borderRadius="md"
          >
            Add Note
          </Button>
        )}

        <Divider />

        {notes.length === 0 ? (
          <VStack spacing={1} py={6}>
            <Text fontSize="xs" color="gray.400">No notes yet.</Text>
            <Text fontSize="xs" color="gray.400">Start researching and jot down what you learn!</Text>
          </VStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {notes.map((note) => (
              <Box
                key={note.id}
                p={3}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.100"
                position="relative"
                _hover={{ borderColor: 'gray.200' }}
              >
                <Text fontSize="sm" whiteSpace="pre-wrap" fontFamily="'Inter', sans-serif">
                  {note.text}
                </Text>
                <HStack justify="space-between" mt={2}>
                  <Text fontSize="2xs" color="gray.400">{formatDate(note.createdAt)}</Text>
                  <IconButton
                    aria-label="Delete note"
                    icon={<TrashIcon style={{ width: 14, height: 14 }} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => deleteNote(note.id)}
                    minW="24px"
                    h="24px"
                  />
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    );
  }

  // ─── Sources Tab ──────────────────────────────────────────────────────────
  if (activeTab === 'sources') {
    return (
      <VStack spacing={3} align="stretch" p={3}>
        <HStack spacing={2}>
          <BookmarkIcon style={{ width: 18, height: 18 }} />
          <Text fontWeight="600" fontSize="sm" fontFamily="'Inter', sans-serif">
            Collected Sources
          </Text>
          <Badge colorScheme="gray" fontSize="2xs" ml="auto">{sources.length}</Badge>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          Sources from your research. These are citable but not clickable for safety.
        </Text>

        <Divider />

        {sources.length === 0 ? (
          <VStack spacing={1} py={6}>
            <Text fontSize="xs" color="gray.400">No sources collected yet.</Text>
            <Text fontSize="xs" color="gray.400">Sources from your research will appear here.</Text>
          </VStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {sources.map((source) => (
              <Box
                key={source.id}
                p={3}
                bg="gray.50"
                borderRadius="md"
                border="1px solid"
                borderColor="gray.100"
                _hover={{ borderColor: 'gray.200' }}
              >
                <HStack spacing={2} mb={1}>
                  <Badge
                    colorScheme={toolBadgeColor(source.tool)}
                    fontSize="2xs"
                    variant="subtle"
                  >
                    {toolLabel(source.tool)}
                  </Badge>
                  {source.query && (
                    <Text fontSize="2xs" color="gray.400" noOfLines={1} flex={1}>
                      "{source.query}"
                    </Text>
                  )}
                  <IconButton
                    aria-label="Remove source"
                    icon={<TrashIcon style={{ width: 12, height: 12 }} />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => deleteSource(source.id)}
                    minW="20px"
                    h="20px"
                  />
                </HStack>
                <Text fontSize="xs" fontWeight="500" fontFamily="'Inter', sans-serif" noOfLines={2}>
                  {source.title}
                </Text>
                {source.url && (
                  <Text fontSize="2xs" color="gray.400" mt={1} noOfLines={1} fontFamily="monospace">
                    {source.url}
                  </Text>
                )}
                <Text fontSize="2xs" color="gray.400" mt={1}>
                  {formatDate(source.addedAt)}
                </Text>
              </Box>
            ))}
          </VStack>
        )}
      </VStack>
    );
  }

  // ─── Ideas Tab ────────────────────────────────────────────────────────────
  if (activeTab === 'ideas') {
    return (
      <VStack spacing={3} align="stretch" p={3}>
        <HStack spacing={2}>
          <LightBulbIcon style={{ width: 18, height: 18 }} />
          <Text fontWeight="600" fontSize="sm" fontFamily="'Inter', sans-serif">
            Research Ideas
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          Tap an idea to start researching it in the studio.
        </Text>

        <Divider />

        {followUpIdeas.length > 0 && (
          <VStack spacing={2} align="stretch">
            <Text fontSize="2xs" fontWeight="600" color="purple.600" fontFamily="'Inter', sans-serif">
              Follow-up questions from your research:
            </Text>
            {followUpIdeas.map((idea, i) => (
              <Button
                key={`followup-${i}`}
                size="sm"
                variant="ghost"
                colorScheme="purple"
                justifyContent="flex-start"
                leftIcon={<LightBulbIcon style={{ width: 14, height: 14 }} />}
                onClick={() => handleIdeaClick(idea)}
                borderRadius="md"
                fontWeight="400"
                fontSize="xs"
                h="auto"
                py={2}
                whiteSpace="normal"
                textAlign="left"
              >
                {idea}
              </Button>
            ))}
          </VStack>
        )}

        <Divider />

        <VStack spacing={2} align="stretch">
          {TOPIC_IDEAS.map((idea) => (
            <Button
              key={idea.label}
              size="sm"
              variant="outline"
              colorScheme="purple"
              justifyContent="flex-start"
              leftIcon={<Text fontSize="sm">{idea.emoji}</Text>}
              onClick={() => handleIdeaClick(idea.prompt)}
              borderRadius="md"
              fontWeight="500"
              fontSize="sm"
              h="auto"
              py={2}
              whiteSpace="normal"
              textAlign="left"
            >
              <VStack spacing={0} align="flex-start" flex={1}>
                <Text fontSize="sm" fontWeight="600">{idea.label}</Text>
                <Text fontSize="2xs" color="gray.500" noOfLines={2}>{idea.prompt}</Text>
              </VStack>
            </Button>
          ))}
        </VStack>

        <Divider />

        <Box p={3} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.100">
          <Text fontSize="xs" color="purple.700" fontFamily="'Inter', sans-serif">
            Tip: Use the Web Search or Deep Research tools in the input bar to find information about any topic that interests you.
          </Text>
        </Box>
      </VStack>
    );
  }

  // ─── Export Tab ───────────────────────────────────────────────────────────
  if (activeTab === 'export') {
    const readiness = exportReadiness;
    const isReady = readiness?.ready ?? false;
    const readinessScore = readiness?.score ?? 0;

    return (
      <VStack spacing={3} align="stretch" p={3}>
        <HStack spacing={2}>
          <ArrowDownTrayIcon style={{ width: 18, height: 18 }} />
          <Text fontWeight="600" fontSize="sm" fontFamily="'Inter', sans-serif">
            Export Research
          </Text>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          Compile your notes and sources into a document you can share.
        </Text>

        {/* Workflow Stage Indicator */}
        <HStack spacing={1} justify="center" mt={1}>
          {(['exploring', 'researching', 'compiling', 'exporting'] as const).map((stage, i) => (
            <React.Fragment key={stage}>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={(['exploring', 'researching', 'compiling', 'exporting'] as const).indexOf(workflowStage) >= i
                  ? (colors?.primary || 'purple.500')
                  : 'gray.200'}
              />
              {i < 3 && <Box w="12px" h="2px" bg="gray.200" />}
            </React.Fragment>
          ))}
        </HStack>
        <Text fontSize="2xs" color="gray.400" textAlign="center" fontFamily="'Inter', sans-serif">
          Stage: {workflowStage}
        </Text>

        <Divider />

        {/* Readiness Assessment */}
        <VStack spacing={2} align="stretch">
          <Text fontSize="2xs" fontWeight="600" color="gray.600" fontFamily="'Inter', sans-serif">
            Export Readiness
          </Text>
          <Progress
            value={readinessScore}
            colorScheme={isReady ? 'green' : 'purple'}
            size="sm"
            borderRadius="full"
          />
          <HStack justify="space-between">
            <Text fontSize="2xs" color={isReady ? 'green.600' : 'gray.500'}>
              {isReady ? 'Ready to export!' : `${readinessScore}% ready`}
            </Text>
            <Text fontSize="2xs" color="gray.400">
              {notes.length} notes · {sources.length} sources
            </Text>
          </HStack>
          {!isReady && readiness && readiness.missing.length > 0 && (
            <Text fontSize="2xs" color="gray.400">
              You need: {readiness.missing.join(', ')}
            </Text>
          )}
        </VStack>

        <Divider />

        {/* Export Buttons */}
        <VStack spacing={2} align="stretch">
          <Text fontSize="2xs" fontWeight="600" color="gray.600" fontFamily="'Inter', sans-serif">
            Choose a format:
          </Text>
          <Button
            size="sm"
            variant="outline"
            colorScheme="blue"
            leftIcon={<DocumentTextIcon style={{ width: 16, height: 16 }} />}
            onClick={() => handleExport('docx')}
            isDisabled={!isReady || exporting}
            isLoading={exporting && researchStudio?.exportFormat === 'docx'}
            borderRadius="md"
            justifyContent="flex-start"
          >
            Word Document (Preview)
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorScheme="orange"
            leftIcon={<PresentationChartBarIcon style={{ width: 16, height: 16 }} />}
            onClick={() => handleExport('pptx')}
            isDisabled={!isReady || exporting}
            isLoading={exporting && researchStudio?.exportFormat === 'pptx'}
            borderRadius="md"
            justifyContent="flex-start"
          >
            Presentation (Preview)
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorScheme="red"
            leftIcon={<ArrowDownTrayIcon style={{ width: 16, height: 16 }} />}
            onClick={() => handleExport('pdf')}
            isDisabled={!isReady || exporting}
            isLoading={exporting && researchStudio?.exportFormat === 'pdf'}
            borderRadius="md"
            justifyContent="flex-start"
          >
            PDF Document (Preview)
          </Button>
        </VStack>

        {exportState === 'error' && (
          <Text fontSize="2xs" color="red.500">
            Export failed. Please try again.
          </Text>
        )}

        {exportState === 'ready' && researchStudio?.exportHtml && (
          <Box p={2} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.100">
            <HStack spacing={1}>
              <CheckCircleIcon style={{ width: 14, height: 14 }} />
              <Text fontSize="2xs" color="green.700">
                Document ready! Click to preview again.
              </Text>
            </HStack>
            <Button
              size="xs"
              variant="link"
              colorScheme="green"
              onClick={() => researchStudio.setShowDocumentViewer(true)}
              mt={1}
            >
              Open document preview
            </Button>
          </Box>
        )}

        {/* In-Dashboard Document Viewer */}
        <DocumentViewer />

        <Divider />

        {/* Proactive export suggestion */}
        {proactiveSuggestions.filter(s => s.type === 'export-ready').length > 0 && (
          <Box p={2} bg="purple.50" borderRadius="md" border="1px solid" borderColor="purple.100">
            <HStack spacing={1}>
              <SparklesIcon style={{ width: 14, height: 14 }} />
              <Text fontSize="2xs" color="purple.700" fontFamily="'Inter', sans-serif">
                {proactiveSuggestions.find(s => s.type === 'export-ready')?.description}
              </Text>
            </HStack>
          </Box>
        )}

        {!isReady && notes.length === 0 && sources.length === 0 && (
          <VStack spacing={1} py={4}>
            <Text fontSize="xs" color="gray.400">Start researching to collect material.</Text>
            <Text fontSize="xs" color="gray.400">Your notes and sources will appear here for export.</Text>
          </VStack>
        )}
      </VStack>
    );
  }

  // ─── History Tab ──────────────────────────────────────────────────────────
  if (activeTab === 'history') {
    const sessions = researchStudio?.sessions ?? [];
    const activeSessionId = researchStudio?.activeSessionId ?? null;

    const handleLoad = (session: ResearchSession) => {
      researchStudio?.loadSession(session.id);
      toast({
        title: 'Session restored!',
        description: session.title,
        status: 'success',
        duration: 3000,
      });
    };

    const handleDelete = (session: ResearchSession) => {
      researchStudio?.deleteSession(session.id);
      toast({
        title: 'Session deleted',
        status: 'info',
        duration: 2000,
      });
    };

    const handleSave = () => {
      const hasContent = (researchStudio?.notes?.length ?? 0) > 0 || (researchStudio?.sources?.length ?? 0) > 0 || (researchStudio?.activeQuery?.length ?? 0) > 0;
      if (!hasContent) {
        toast({
          title: 'Nothing to save',
          description: 'Start researching first, then save your session.',
          status: 'info',
          duration: 3000,
        });
        return;
      }
      researchStudio?.saveCurrentSession();
      toast({
        title: 'Session saved!',
        description: 'You can restore it anytime from History.',
        status: 'success',
        duration: 3000,
      });
    };

    const handleNew = () => {
      researchStudio?.startNewSession();
      toast({
        title: 'New session started',
        description: 'Fresh research workspace ready.',
        status: 'info',
        duration: 2000,
      });
    };

    const formatDate = (ts: number) => {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now.getTime() - ts;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      return d.toLocaleDateString();
    };

    return (
      <VStack spacing={3} align="stretch" p={3}>
        <HStack spacing={2}>
          <Button
            size="xs"
            leftIcon={<FolderPlusIcon style={{ width: 14, height: 14 }} />}
            colorScheme={colors?.primary || 'purple'}
            variant="solid"
            onClick={handleSave}
            flex={1}
          >
            Save Current
          </Button>
          <Button
            size="xs"
            leftIcon={<ArrowPathIcon style={{ width: 14, height: 14 }} />}
            variant="outline"
            onClick={handleNew}
            flex={1}
          >
            New Session
          </Button>
        </HStack>

        <Divider />

        {sessions.length === 0 ? (
          <VStack spacing={1} py={6}>
            <ClockIcon style={{ width: 32, height: 32, color: '#cbd5e1' }} />
            <Text fontSize="xs" color="gray.400">No saved sessions yet.</Text>
            <Text fontSize="2xs" color="gray.400">
              Click "Save Current" to store your research progress.
            </Text>
          </VStack>
        ) : (
          <VStack spacing={2} align="stretch">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <Box
                  key={session.id}
                  p={2}
                  borderRadius="md"
                  border="1px solid"
                  borderColor={isActive ? `${colors?.primary || 'purple'}.200` : 'gray.100'}
                  bg={isActive ? `${colors?.primary || 'purple'}.50` : 'white'}
                  cursor="pointer"
                  onClick={() => handleLoad(session)}
                  _hover={{ borderColor: `${colors?.primary || 'purple'}.300`, bg: `${colors?.primary || 'purple'}.50` }}
                  transition="all 0.15s"
                >
                  <HStack justify="space-between" align="start">
                    <Box flex={1} minW={0}>
                      <Text
                        fontSize="xs"
                        fontWeight={isActive ? 700 : 600}
                        color={isActive ? `${colors?.primary || 'purple'}.700` : 'gray.700'}
                        noOfLines={2}
                        fontFamily="'Inter', sans-serif"
                      >
                        {session.title}
                      </Text>
                      <HStack spacing={2} mt={1}>
                        <Text fontSize="2xs" color="gray.400">
                          {formatDate(session.updatedAt)}
                        </Text>
                        {session.notes.length > 0 && (
                          <Badge size="sm" colorScheme="blue" variant="subtle" fontSize="2xs">
                            {session.notes.length} notes
                          </Badge>
                        )}
                        {session.sources.length > 0 && (
                          <Badge size="sm" colorScheme="green" variant="subtle" fontSize="2xs">
                            {session.sources.length} sources
                          </Badge>
                        )}
                      </HStack>
                    </Box>
                    <IconButton
                      aria-label="Delete session"
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      icon={<TrashIcon style={{ width: 12, height: 12 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(session);
                      }}
                    />
                  </HStack>
                </Box>
              );
            })}
          </VStack>
        )}
      </VStack>
    );
  }

  // Fallback
  return null;
}

export default ChildResearchPanel;

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Badge,
  Tooltip,
  Spinner,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Collapse,
  Divider,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { FiPlus, FiClock, FiCheck, FiX, FiMoreVertical, FiTrash2, FiRefreshCw, FiFolder, FiChevronDown, FiChevronRight, FiUpload, FiFile, FiPackage } from 'react-icons/fi';
import RetractablePanel from '../layout/RetractablePanel';
import ExportToPodcastModal from './ExportToPodcastModal';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ResearchSession {
  id: number;
  session_id: string;
  question: string;
  model: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at?: string;
  report?: string;
  error_message?: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: number;
  project_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  processed: boolean;
}

interface ResearchSessionsPanelProps {
  selectedSessionId?: string | null;
  onSelectSession: (session: ResearchSession) => void;
  onNewSession: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onWidthChange?: (width: number) => void;
  // RAG Projects
  selectedProjectId?: number | null;
  onSelectProject?: (projectId: number | null, projectName?: string) => void;
  onRefreshNeeded?: (refreshFn: () => Promise<void>) => void;
}

interface ErrorState {
  hasError: boolean;
  message: string;
}

export default function ResearchSessionsPanel({
  selectedSessionId,
  onSelectSession,
  onNewSession,
  isCollapsed = false,
  onToggleCollapse,
  onWidthChange,
  selectedProjectId,
  onSelectProject,
  onRefreshNeeded,
}: ResearchSessionsPanelProps) {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });
  const [panelWidth, setPanelWidth] = useState(450);
  const toast = useToast();

  // Track previous sessions for notification detection
  const prevSessionsRef = useRef<ResearchSession[]>([]);

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [projectDocuments, setProjectDocuments] = useState<Record<number, Document[]>>({});
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { isOpen: isNewProjectOpen, onOpen: onNewProjectOpen, onClose: onNewProjectClose } = useDisclosure();
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // Export to Podcast modal
  const { isOpen: isExportModalOpen, onOpen: onExportModalOpen, onClose: onExportModalClose } = useDisclosure();
  const [exportingSession, setExportingSession] = useState<ResearchSession | null>(null);

  // Track which session menu is open for z-index management
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null);

  const bgColor = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const selectedBg = useSemanticToken('surface.active');

  // Pre-compute all color values to avoid hooks order violations
  const statusBadgeBg = useSemanticToken('surface.raised');
  const statusBadgeColor = useSemanticToken('text.secondary');
  const failedBadgeBg = useSemanticToken('status.errorBg');
  const failedBadgeColor = useSemanticToken('status.errorText');
  const projectModeBtnBg = useSemanticToken('interactive.secondary');
  const projectModeBtnHoverBg = useSemanticToken('interactive.secondaryHover');
  const projectModeBtnColor = useSemanticToken('text.primary');
  const newSessionBtnBg = useSemanticToken('interactive.primary');
  const newSessionBtnColor = useSemanticToken('text.inverse');
  const newSessionBtnHoverBg = useSemanticToken('interactive.primaryHover');
  const retryBtnBg = useSemanticToken('interactive.secondary');
  const retryBtnColor = useSemanticToken('text.primary');
  const retryBtnHoverBg = useSemanticToken('interactive.secondaryHover');
  const sessionIconBg = useSemanticToken('surface.raised');
  const sessionIconColor = useSemanticToken('text.secondary');
  const sessionIconHoverBg = useSemanticToken('surface.hover');
  const selectedBorderColor = useSemanticToken('border.active');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch sessions on mount and refresh every 15 seconds for in-progress sessions
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions(true); // Silent refresh
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Expose refresh function to parent component
  useEffect(() => {
    if (onRefreshNeeded) {
      onRefreshNeeded(() => fetchSessions(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - don't depend on onRefreshNeeded to avoid infinite loop

  // Fetch projects on mount
  useEffect(() => {
    if (onSelectProject) {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - don't depend on onSelectProject to avoid infinite loop

  const fetchSessions = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError({ hasError: false, message: '' });
    } else {
      setIsRefreshing(true);
    }

    try {
      // Add cache-busting timestamp to force fresh data
      const response = await fetch(`/api/research-lab/sessions?_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // Sort sessions by created_at descending (newest first)
        const sortedSessions = (data.sessions || []).sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Check for newly completed sessions and show notifications
        if (silent && prevSessionsRef.current.length > 0) {
          sortedSessions.forEach(session => {
            const prevSession = prevSessionsRef.current.find(s => s.session_id === session.session_id);
            if (prevSession &&
              prevSession.status !== 'completed' &&
              session.status === 'completed') {
              // Show browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Research Complete! 🔬', {
                  body: `"${session.question.substring(0, 60)}${session.question.length > 60 ? '...' : ''}"`,
                  icon: '/favicon.ico',
                  tag: session.session_id,
                });
              }
              // Show toast notification
              toast({
                title: 'Research Complete! ✅',
                description: session.question.substring(0, 80) + (session.question.length > 80 ? '...' : ''),
                status: 'success',
                duration: 8000,
                isClosable: true,
              });
            }
          });
        }

        prevSessionsRef.current = sortedSessions;
        setSessions(sortedSessions);
        console.log('🔍 [ResearchSessionsPanel] Fetched sessions:', sortedSessions.length, 'sessions');
        console.log('🔍 [ResearchSessionsPanel] First 3 sessions:', sortedSessions.slice(0, 3).map(s => ({
          id: s.session_id,
          question: s.question.substring(0, 50),
          status: s.status,
          created_at: s.created_at
        })));
        setError({ hasError: false, message: '' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to fetch sessions:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        const errorMessage = errorData.message || 'Database connection issue';
        setError({ hasError: true, message: errorMessage });

        if (!silent) {
          toast({
            title: 'Failed to load sessions',
            description: errorMessage,
            status: 'warning',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('❌ Network error fetching research sessions:', error);
      const errorMessage = 'Network error - check your connection';
      setError({ hasError: true, message: errorMessage });

      if (!silent) {
        toast({
          title: 'Failed to load sessions',
          description: errorMessage,
          status: 'warning',
          duration: 5000,
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleExportToPodcast = (session: ResearchSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingSession(session);
    onExportModalOpen();
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this research session?')) return;

    try {
      const response = await fetch(`/api/research-lab/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        toast({
          title: 'Session deleted',
          status: 'success',
          duration: 2000,
        });
      } else {
        throw new Error('Failed to delete session');
      }
    } catch (error) {
      toast({
        title: 'Failed to delete session',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const getStatusBadge = (status: ResearchSession['status'], progress: number) => {
    switch (status) {
      case 'queued':
        return (
          <Badge
            fontSize="8px"
            textTransform="uppercase"
            bg={statusBadgeBg}
            color={statusBadgeColor}
            borderRadius="full"
          >
            Queued
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge
            fontSize="8px"
            textTransform="uppercase"
            bg={statusBadgeBg}
            color={statusBadgeColor}
            borderRadius="full"
          >
            {progress}%
          </Badge>
        );
      case 'completed':
        return (
          <Badge
            fontSize="8px"
            textTransform="uppercase"
            bg={statusBadgeBg}
            color={statusBadgeColor}
            borderRadius="full"
          >
            Complete
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            fontSize="8px"
            textTransform="uppercase"
            bg={failedBadgeBg}
            color={failedBadgeColor}
            borderRadius="full"
          >
            Failed
          </Badge>
        );
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleWidthChange = (newWidth: number) => {
    setPanelWidth(newWidth);
    onWidthChange?.(newWidth);
  };

  // Project management functions
  const loadProjects = async () => {
    try {
      const response = await fetch('/api/ai-research/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: 'Project name required',
        status: 'warning',
        duration: 2000,
      });
      return;
    }

    try {
      console.log('Creating project:', newProjectName);
      const response = await fetch('/api/ai-research/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDescription,
        }),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const newProject = await response.json();
        console.log('New project created:', newProject);
        setProjects(prev => [newProject, ...prev]);
        setNewProjectName('');
        setNewProjectDescription('');
        onNewProjectClose();
        toast({
          title: 'Project created',
          description: `"${newProject.name}" created successfully`,
          status: 'success',
          duration: 3000,
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create project:', errorData);
        toast({
          title: 'Failed to create project',
          description: errorData.message || 'Unknown error',
          status: 'error',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error creating project',
        description: error instanceof Error ? error.message : 'Network error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleProjectExpanded = async (projectId: number) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
      if (!projectDocuments[projectId]) {
        await loadProjectDocuments(projectId);
      }
    }
    setExpandedProjects(newExpanded);
  };

  const loadProjectDocuments = async (projectId: number) => {
    try {
      const response = await fetch(`/api/ai-research/upload-document?projectId=${projectId}`);
      if (response.ok) {
        const documents = await response.json();
        setProjectDocuments(prev => ({ ...prev, [projectId]: documents }));
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleFileUpload = async (projectId: number, file: File) => {
    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId.toString());

    try {
      const response = await fetch('/api/ai-research/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast({
          title: 'File uploaded',
          description: 'Processing with Gemini + embeddings...',
          status: 'success',
          duration: 3000,
        });
        await loadProjectDocuments(projectId);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast({
        title: 'Upload failed',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <RetractablePanel
      title="Research Sessions"
      icon={FiClock}
      iconColor={mutedColor}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      width={panelWidth}
      onWidthChange={handleWidthChange}
      side="left"
      headerActions={
        <>
          {isRefreshing && <Spinner size="xs" color={mutedColor} />}
          <Tooltip
            label="Refresh"
            bg={useSemanticToken('surface.popover')}
            color={useSemanticToken('text.primary')}
          >
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              onClick={() => fetchSessions()}
              variant="solid"
              size="sm"
              bg={useSemanticToken('surface.raised')}
              color={useSemanticToken('text.primary')}
              borderColor={useSemanticToken('border.subtle')}
              borderWidth="1px"
              _hover={{ bg: useSemanticToken('surface.hover') }}
              isLoading={isLoading}
            />
          </Tooltip>
        </>
      }
    >
      {/* RAG Projects Section */}
      {onSelectProject && (
        <>
          <Box borderBottom="1px solid" borderColor={borderColor}>
            <HStack
              p={3}
              cursor="pointer"
              onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              _hover={{ bg: hoverBg }}
            >
              <Icon as={isProjectsExpanded ? FiChevronDown : FiChevronRight} />
              <Icon as={FiFolder} color={mutedColor} />
              <Text fontWeight="600" fontSize="sm" flex={1}>Projects</Text>
              {selectedProjectId && (
                <Badge
                  fontSize="xs"
                  mr={1}
                  bg={statusBadgeBg}
                  color={statusBadgeColor}
                  borderRadius="full"
                >
                  Active
                </Badge>
              )}
              <IconButton
                aria-label="New project"
                icon={<FiPlus />}
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewProjectOpen();
                }}
              />
            </HStack>

            <Collapse in={isProjectsExpanded}>
              <VStack spacing={1} pb={2} px={2}>
                {/* Standalone Research Mode Button */}
                {selectedProjectId && (
                  <Button
                    size="sm"
                    bg={projectModeBtnBg}
                    color={projectModeBtnColor}
                    _hover={{
                      bg: projectModeBtnHoverBg,
                    }}
                    w="full"
                    onClick={() => onSelectProject(null)}
                    mb={2}
                  >
                    ↩️ Exit Project - Standalone Research
                  </Button>
                )}
                {projects.map(project => {
                  const isExpanded = expandedProjects.has(project.id);
                  const docs = projectDocuments[project.id] || [];
                  const isSelected = selectedProjectId === project.id;

                  return (
                    <Box key={project.id} w="full">
                      <HStack
                        p={2}
                        borderRadius="xl"
                        bg={isSelected ? selectedBg : bgColor}
                        backdropFilter="blur(10px)"
                        boxShadow={isSelected ? 'md' : 'sm'}
                        _hover={{ bg: isSelected ? selectedBg : hoverBg, boxShadow: 'md' }}
                        cursor="pointer"
                        onClick={() => onSelectProject(project.id, project.name)}
                      >
                        <IconButton
                          aria-label="Toggle"
                          icon={isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleProjectExpanded(project.id);
                          }}
                        />
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontSize="sm" fontWeight="500">{project.name}</Text>
                        </VStack>
                        <Badge
                          fontSize="xs"
                          bg={statusBadgeBg}
                          color={statusBadgeColor}
                          borderRadius="full"
                        >
                          {docs.length}
                        </Badge>
                      </HStack>

                      <Collapse in={isExpanded}>
                        <VStack align="stretch" spacing={1} pl={8} pr={2} pt={1}>
                          <Button
                            size="xs"
                            leftIcon={<FiUpload />}
                            variant="ghost"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = '.txt,.md,.pdf,image/*,video/*,audio/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleFileUpload(project.id, file);
                              };
                              input.click();
                            }}
                            isLoading={uploadingFile}
                          >
                            Upload File
                          </Button>
                          {docs.map(doc => (
                            <HStack key={doc.id} p={2} borderRadius="sm" bg={useSemanticToken('surface.base')} fontSize="xs">
                              <FiFile size={12} />
                              <Text noOfLines={1} flex={1}>{doc.filename}</Text>
                              {!doc.processed && <Spinner size="xs" color={mutedColor} />}
                            </HStack>
                          ))}
                        </VStack>
                      </Collapse>
                    </Box>
                  );
                })}
              </VStack>
            </Collapse>
          </Box>
          <Divider />
        </>
      )}

      {/* New Session Button */}
      <Box p={3} borderBottom="1px solid" borderColor={borderColor}>
        <Button
          leftIcon={<FiPlus />}
          onClick={onNewSession}
          bg={newSessionBtnBg}
          color={newSessionBtnColor}
          _hover={{
            bg: newSessionBtnHoverBg,
          }}
          w="full"
          size="sm"
        >
          New Research Session
        </Button>
      </Box>

      {/* Sessions List */}
      <VStack
        spacing={2}
        align="stretch"
        p={3}
      >
        {isLoading ? (
          <VStack py={8} spacing={3}>
            <Spinner size="lg" color={mutedColor} />
            <Text fontSize="sm" color={mutedColor}>Loading sessions...</Text>
          </VStack>
        ) : error.hasError ? (
          <VStack py={8} spacing={3} px={4}>
            <Text fontSize="lg">⚠️</Text>
            <Text fontSize="sm" fontWeight="600" color={textColor} textAlign="center">
              Database Not Connected
            </Text>
            <Text fontSize="xs" color={mutedColor} textAlign="center" maxW="250px">
              {error.message}
            </Text>
            <Button
              size="xs"
              bg={retryBtnBg}
              color={retryBtnColor}
              borderRadius="full"
              _hover={{
                bg: retryBtnHoverBg,
              }}
              onClick={() => fetchSessions()}
              mt={2}
            >
              Retry
            </Button>
            <Text fontSize="xs" color={mutedColor} textAlign="center" maxW="280px" mt={4}>
              You can still use the research interface. Sessions will be saved when the database reconnects.
            </Text>
          </VStack>
        ) : sessions.length === 0 ? (
          <VStack py={8} spacing={3}>
            {(() => { console.log('🔍 [ResearchSessionsPanel RENDER] Showing empty state, sessions.length:', sessions.length); return null; })()}
            <Text fontSize="lg">🔍</Text>
            <Text fontSize="sm" color={mutedColor} textAlign="center">
              No research sessions yet
            </Text>
            <Text fontSize="xs" color={mutedColor} textAlign="center" maxW="250px">
              Start a new deep research session to explore any topic
            </Text>
          </VStack>
        ) : (
          <>
            {(() => { console.log('🔍 [ResearchSessionsPanel RENDER] Rendering sessions, count:', sessions.length); return null; })()}
            {sessions.map((session) => {
              const isSelected = selectedSessionId === session.session_id;
              const statusIcon = session.status === 'completed' ? FiCheck : session.status === 'failed' ? FiX : FiClock;

              return (
                <Box
                  key={session.session_id}
                  p={3}
                  bg={isSelected ? selectedBg : bgColor}
                  backdropFilter="blur(10px)"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor={isSelected ? selectedBorderColor : borderColor}
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{ bg: isSelected ? selectedBg : hoverBg, transform: 'translateY(-1px)', boxShadow: 'md' }}
                  boxShadow={isSelected ? 'lg' : 'sm'}
                  onClick={() => onSelectSession(session)}
                  position="relative"
                  zIndex={openMenuSessionId === session.session_id ? 1400 : 1}
                >
                  <VStack align="stretch" spacing={2}>
                    {/* Header with status and time */}
                    <HStack justify="space-between">
                      <HStack spacing={2} flex="1" minW={0}>
                        <IconButton
                          aria-label="Open session"
                          icon={<Icon as={statusIcon} />}
                          size="xs"
                          bg={sessionIconBg}
                          color={sessionIconColor}
                          _hover={{
                            bg: sessionIconHoverBg,
                          }}
                          variant="ghost"
                          isDisabled={session.status === 'in_progress' || session.status === 'queued'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSession(session);
                          }}
                        />
                        <VStack align="start" spacing={0} flex="1" minW={0}>
                          <Text
                            fontSize="11px"
                            fontWeight="600"
                            color={textColor}
                            noOfLines={1}
                          >
                            {session.question.length > 50
                              ? session.question.substring(0, 50) + '...'
                              : session.question}
                          </Text>
                          <HStack spacing={2} fontSize="9px" color={mutedColor}>
                            <HStack spacing={1}>
                              <FiClock />
                              <Text>{formatTimeAgo(session.created_at)}</Text>
                            </HStack>
                            {session.status === 'in_progress' && (
                              <>
                                <Text>•</Text>
                                <Text>{session.progress}%</Text>
                              </>
                            )}
                          </HStack>
                        </VStack>
                      </HStack>

                      {getStatusBadge(session.status, session.progress)}
                    </HStack>

                    {/* Excerpt or error */}
                    {session.error_message ? (
                      <Text
                        fontSize="10px"
                        color="red.500"
                        noOfLines={1}
                        fontStyle="italic"
                      >
                        {session.error_message}
                      </Text>
                    ) : session.report && session.status === 'completed' ? (
                      <Text
                        fontSize="10px"
                        color={mutedColor}
                        noOfLines={2}
                        fontStyle="italic"
                      >
                        {session.report.substring(0, 100)}...
                      </Text>
                    ) : null}

                    {/* Model badge and menu */}
                    <HStack justify="space-between">
                      <Badge
                        fontSize="8px"
                        bg={statusBadgeBg}
                        color={statusBadgeColor}
                        borderRadius="full"
                      >
                        {session.model.includes('o3') ? '🧠 O3 Research' : '⚡ O4-Mini Research'}
                      </Badge>

                      <Menu
                        isLazy
                        onOpen={() => setOpenMenuSessionId(session.session_id)}
                        onClose={() => setOpenMenuSessionId(null)}
                      >
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList zIndex={1500} bg={bgColor} borderColor={borderColor}>
                          {session.status === 'completed' && session.report && (
                            <MenuItem
                              icon={<FiPackage />}
                              onClick={(e) => handleExportToPodcast(session, e)}
                              color="purple.500"
                            >
                              Export to Podcast Studio
                            </MenuItem>
                          )}
                          <MenuItem
                            icon={<FiTrash2 />}
                            onClick={(e) => handleDeleteSession(session.session_id, e)}
                            color="red.500"
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </VStack>
                </Box>
              );
            })}
          </>
        )}
      </VStack>

      {/* New Project Modal */}
      <Modal isOpen={isNewProjectOpen} onClose={onNewProjectClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Project</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="full">
                <Text fontSize="sm" fontWeight="500" mb={1}>Project Name</Text>
                <Input
                  placeholder="e.g., AI Ethics Research"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </Box>
              <Box w="full">
                <Text fontSize="sm" fontWeight="500" mb={1}>Description (Optional)</Text>
                <Textarea
                  placeholder="Brief description..."
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                />
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onNewProjectClose}>
              Cancel
            </Button>
            <Button
              bg={newSessionBtnBg}
              color={newSessionBtnColor}
              _hover={{
                bg: newSessionBtnHoverBg,
              }}
              onClick={handleCreateProject}
            >
              Create Project
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Export to Podcast Modal */}
      {exportingSession && (
        <ExportToPodcastModal
          isOpen={isExportModalOpen}
          onClose={onExportModalClose}
          sessionId={exportingSession.session_id}
          sessionTitle={exportingSession.question}
        />
      )}
    </RetractablePanel>
  );
}

/**
 * Research Sidebar Component
 * Deep Research Studio - Session Management and Navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    InputGroup,
    InputLeftElement,
    Icon,
    IconButton,
    Button,
    Badge,
    Collapse,
    useDisclosure,
    Tooltip,
    Divider,
    Spinner,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    useToast,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
} from '@chakra-ui/react';
import {
    FiSearch,
    FiPlus,
    FiSettings,
    FiChevronDown,
    FiChevronRight,
    FiGrid,
    FiCpu,
    FiBook,
    FiDatabase,
    FiCode,
    FiActivity,
    FiLayers,
    FiArchive,
    FiClock,
    FiCheckCircle,
    FiXCircle,
    FiLoader,
    FiFilter,
    FiFolder,
    FiFolderPlus,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ContextMenuEngine, useContextMenu, createToolMenuRegistry } from '@/lib/context-menu';
import { researchActions, researchActionGroups, type ResearchActionContext } from '@/lib/context-menu/research-actions';

// Create research-specific registry
const researchRegistry = createToolMenuRegistry<ResearchActionContext>();
researchActionGroups.forEach(g => researchRegistry.registerGroup(g.id, undefined, g.order));
researchRegistry.registerActions(researchActions);

interface ResearchSidebarProps {
    currentUserId?: string;
    onNavigate?: (view: string) => void;
    onSessionSelect?: (sessionId: string) => void;
    onRetry?: (sessionId: string, question: string) => void;
    onCompare?: (sessionId: string) => void;
    onSchedule?: (sessionId: string, question: string, model: string) => void;
}

interface ResearchProject {
    project_id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    status?: 'active' | 'archived' | 'completed';
    session_count?: number;
    created_at?: string;
    updated_at?: string;
}

interface ResearchSession {
    session_id: string;
    question: string;
    model: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    progress: number;
    created_at: string;
    completed_at?: string;
    error_message?: string;
    project_id?: string;
    parent_session_id?: string;
    session_type?: 'original' | 'follow_up' | 'qwen3_query' | 'analysis';
}

interface SidebarItem {
    id: string;
    title: string;
    icon: any;
    count?: number;
    isActive?: boolean;
}

export function ResearchSidebar({ currentUserId, onNavigate, onSessionSelect, onRetry, onCompare, onSchedule }: ResearchSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [projects, setProjects] = useState<ResearchProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Section expand/collapse state
    const [projectsExpanded, setProjectsExpanded] = useState(true);
    const [activeExpanded, setActiveExpanded] = useState(true);
    const [completedExpanded, setCompletedExpanded] = useState(true);
    const [failedExpanded, setFailedExpanded] = useState(false);

    // Context menu
    const { state: menuState, open: openMenu, close: closeMenu } = useContextMenu();
    const toast = useToast();

    // Project picker modal state
    const [projectPickerSessionId, setProjectPickerSessionId] = useState<string | null>(null);
    const { isOpen: isProjectPickerOpen, onOpen: onProjectPickerOpen, onClose: onProjectPickerClose } = useDisclosure();

    const bgBase = useSemanticToken('surface.base');
    const bgElevated = useSemanticToken('surface.elevated');
    const borderColor = useSemanticToken('border.default');
    const textSecondary = useSemanticToken('text.secondary');

    // Fetch research sessions and projects
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // Refresh every 15s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        await Promise.all([fetchSessions(), fetchProjects()]);
    };

    const fetchSessions = async () => {
        try {
            const response = await fetch('/api/research-lab/sessions');
            // Check if response is ok before parsing
            if (!response.ok) {
                console.error('[ResearchSidebar] Sessions API error:', response.status, response.statusText);
                return;
            }
            // Check content-type header
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('[ResearchSidebar] Non-JSON response:', contentType);
                return;
            }
            // Check if response has content
            const text = await response.text();
            if (!text || text.trim() === '') {
                console.warn('[ResearchSidebar] Empty response from sessions API');
                return;
            }
            try {
                const data = JSON.parse(text);
                if (data.sessions) {
                    setSessions(data.sessions);
                }
            } catch (parseError) {
                console.error('[ResearchSidebar] JSON parse error:', parseError, 'Response text (first 500 chars):', text.substring(0, 500));
            }
        } catch (error) {
            console.error('[ResearchSidebar] Failed to fetch sessions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await fetch('/api/research-lab/projects?withCounts=true');
            if (!response.ok) {
                console.error('[ResearchSidebar] Projects API error:', response.status, response.statusText);
                return;
            }
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                console.warn('[ResearchSidebar] Non-JSON projects response:', contentType);
                return;
            }
            const text = await response.text();
            if (!text || text.trim() === '') {
                console.warn('[ResearchSidebar] Empty response from projects API');
                return;
            }
            try {
                const data = JSON.parse(text);
                if (data.projects) {
                    setProjects(data.projects);
                }
            } catch (parseError) {
                console.error('[ResearchSidebar] Projects JSON parse error:', parseError, 'Response (first 500):', text.substring(0, 500));
            }
        } catch (error) {
            console.error('[ResearchSidebar] Failed to fetch projects:', error);
        }
    };

    // Filter sessions by status and project
    const filterByProject = (sessionList: ResearchSession[]) => {
        if (selectedProjectId) return sessionList.filter(s => s.project_id === selectedProjectId);
        // When no project filter: only show ungrouped sessions in flat lists
        return sessionList.filter(s => !s.project_id);
    };

    // Group sessions hierarchically: main sessions (no parent) with their children
    const getMainSessions = (sessionList: ResearchSession[]) => {
        return sessionList.filter(s => !s.parent_session_id);
    };

    // Search ALL sessions for children — a child may be in a different status group
    const getChildSessions = (parentId: string) => {
        return sessions.filter(s => s.parent_session_id === parentId);
    };

    // Get sessions belonging to a specific project (for project tree view)
    const getProjectSessions = (projectId: string) => {
        return sessions.filter(s => s.project_id === projectId);
    };
    const getProjectMainSessions = (projectId: string) => {
        return getMainSessions(getProjectSessions(projectId));
    };

    const activeSessions = filterByProject(sessions.filter(s => s.status === 'in_progress' || s.status === 'pending'));
    const completedSessions = filterByProject(sessions.filter(s => s.status === 'completed'));
    const failedSessions = filterByProject(sessions.filter(s => s.status === 'failed'));
    
    // Get main (parent) sessions only for display - children will be nested
    const mainActiveSessions = getMainSessions(activeSessions);
    const mainCompletedSessions = getMainSessions(completedSessions);
    const mainFailedSessions = getMainSessions(failedSessions);
    
    // Sessions without a project (ungrouped)
    const ungroupedSessions = sessions.filter(s => !s.project_id);

    // Filter by search query
    const filterBySearch = (sessionList: ResearchSession[]) => {
        if (!searchQuery) return sessionList;
        return sessionList.filter(s => 
            s.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.model.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    // Create new project
    const handleCreateProject = async () => {
        const name = prompt('Enter project name:');
        if (!name || !name.trim()) return;

        try {
            const response = await fetch('/api/research-lab/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data.project) {
                setProjects(prev => [data.project, ...prev]);
                toast({ title: 'Project created', status: 'success', duration: 2000, position: 'bottom-right' });
            }
        } catch (error) {
            console.error('[ResearchSidebar] Failed to create project:', error);
            toast({ title: 'Failed to create project', status: 'error', duration: 3000, position: 'bottom-right' });
        }
    };

    // Handle project selection
    const handleProjectClick = (projectId: string | null) => {
        setSelectedProjectId(projectId === selectedProjectId ? null : projectId);
    };

    const handleSessionClick = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        onSessionSelect?.(sessionId);
    };

    const handleSessionContextMenu = useCallback((e: React.MouseEvent, session: ResearchSession) => {
        e.preventDefault();
        e.stopPropagation();

        const context: ResearchActionContext = {
            session,
            toast: (options: any) => toast({ position: 'bottom-right', ...options }),
            onDelete: async (sessionId: string) => {
                try {
                    const res = await fetch(`/api/research-lab/session/${sessionId}/delete`, { method: 'DELETE' });
                    if (res.ok) {
                        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
                        if (selectedSessionId === sessionId) {
                            setSelectedSessionId(null);
                        }
                    }
                } catch (err) {
                    console.error('[ResearchSidebar] Delete failed:', err);
                }
            },
            onRetry: (sessionId: string, question: string) => {
                onRetry?.(sessionId, question);
            },
            onLoadSession: (sessionId: string) => {
                setSelectedSessionId(sessionId);
                onSessionSelect?.(sessionId);
            },
            onCompare: (sessionId: string) => {
                onCompare?.(sessionId);
            },
            onSchedule: (sessionId: string, question: string, model: string) => {
                onSchedule?.(sessionId, question, model);
            },
            onAssignToProject: (sessionId: string) => {
                setProjectPickerSessionId(sessionId);
                onProjectPickerOpen();
            },
            onPublishToWorkspace: async (sessionId: string) => {
                toast({ title: 'Publishing to Workspace…', status: 'info', duration: 2000, position: 'bottom-right' });
                try {
                    const res = await fetch(`/api/research-lab/session/${sessionId}/publish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                    });
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}`);
                    }
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
                    console.error('[ResearchSidebar] Publish to workspace failed:', err);
                    toast({ title: 'Failed to publish', status: 'error', duration: 3000, position: 'bottom-right' });
                }
            },
            projects: projects.map(p => ({ project_id: p.project_id, name: p.name })),
            onRefresh: fetchSessions,
        };

        const config = researchRegistry.buildConfig('research-lab', context, {
            title: session.question.substring(0, 50) + (session.question.length > 50 ? '...' : ''),
            subtitle: `${session.model} • ${session.status}`,
        });

        openMenu({ x: e.clientX, y: e.clientY }, config);
    }, [toast, selectedSessionId, onSessionSelect, onRetry, onCompare, onSchedule, openMenu]);

    return (
        <GlassPanel
            w="280px"
            h="full"
            display="flex"
            flexDirection="column"
            flexShrink={0}
        >
            {/* Header */}
            <HStack px={3} py={3} justify="space-between" borderBottom="1px" borderColor={borderColor}>
                <HStack spacing={2}>
                    <Box
                        w="24px"
                        h="24px"
                        bg="purple.500"
                        borderRadius="md"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <Icon as={FiActivity} color="whiteAlpha.900" boxSize={3.5} />
                    </Box>
                    <Text fontSize="sm" fontWeight="700">
                        AI Research Studio
                    </Text>
                </HStack>
                <IconButton
                    aria-label="Settings"
                    icon={<FiSettings />}
                    size="xs"
                    variant="ghost"
                />
            </HStack>

            {/* Search */}
            <Box px={3} py={2}>
                <InputGroup size="sm">
                    <InputLeftElement pointerEvents="none" h="28px">
                        <FiSearch color="gray" size={12} />
                    </InputLeftElement>
                    <Input
                        placeholder="Search research..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        bg={bgElevated}
                        borderRadius="md"
                        fontSize="xs"
                        h="28px"
                        _focus={{ borderColor: 'purple.500', boxShadow: 'none' }}
                    />
                </InputGroup>
            </Box>

            {/* Main Navigation Actions */}
            <VStack align="stretch" spacing={1} px={2} py={1}>
                <Button
                    size="sm"
                    leftIcon={<FiPlus />}
                    colorScheme="purple"
                    variant="solid"
                    justifyContent="flex-start"
                    fontSize="xs"
                    h="28px"
                    onClick={() => onNavigate?.('new-research')}
                >
                    New Research
                </Button>
            </VStack>

            {/* Status Filter */}
            <HStack px={3} py={1} spacing={2}>
                <Menu>
                    <MenuButton
                        as={Button}
                        size="xs"
                        variant="ghost"
                        leftIcon={<FiFilter />}
                        fontSize="xs"
                        fontWeight="500"
                    >
                        {statusFilter === 'all' ? 'All Status' : statusFilter}
                    </MenuButton>
                    <MenuList fontSize="xs">
                        <MenuItem onClick={() => setStatusFilter('all')}>All Status</MenuItem>
                        <MenuItem onClick={() => setStatusFilter('active')}>Active</MenuItem>
                        <MenuItem onClick={() => setStatusFilter('completed')}>Completed</MenuItem>
                        <MenuItem onClick={() => setStatusFilter('failed')}>Failed</MenuItem>
                    </MenuList>
                </Menu>
                <Text fontSize="2xs" color={textSecondary}>
                    {sessions.length} total
                </Text>
            </HStack>

            <Divider my={2} borderColor={borderColor} />

            {/* Scrollable Content */}
            <Box
                flex={1}
                overflowY="auto"
                px={2}
                css={{
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { background: 'rgba(0, 0, 0, 0.2)', borderRadius: '2px' },
                }}
            >
                {isLoading ? (
                    <VStack py={8} spacing={2}>
                        <Spinner size="sm" color="purple.500" />
                        <Text fontSize="xs" color={textSecondary}>Loading sessions...</Text>
                    </VStack>
                ) : sessions.length === 0 ? (
                    <VStack py={8} spacing={2}>
                        <Icon as={FiActivity} boxSize={8} color={textSecondary} />
                        <Text fontSize="xs" color={textSecondary} textAlign="center">
                            No research sessions yet.
                            <br />
                            Start a new research to begin.
                        </Text>
                    </VStack>
                ) : (
                    <>
                        {/* Projects Section — each project is expandable with nested sessions */}
                        {projects.length > 0 && (
                            <SidebarSection
                                title="Projects"
                                expanded={projectsExpanded}
                                onToggle={() => setProjectsExpanded(!projectsExpanded)}
                                count={projects.length}
                                action={
                                    <Tooltip label="New Project" placement="top">
                                        <IconButton
                                            aria-label="New Project"
                                            icon={<FiFolderPlus />}
                                            size="xs"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCreateProject();
                                            }}
                                        />
                                    </Tooltip>
                                }
                            >
                                {projects.map(project => (
                                    <ExpandableProjectItem
                                        key={project.project_id}
                                        project={project}
                                        sessions={filterBySearch(getProjectMainSessions(project.project_id))}
                                        allSessions={sessions}
                                        selectedSessionId={selectedSessionId}
                                        onSessionClick={handleSessionClick}
                                        onContextMenu={handleSessionContextMenu}
                                        getChildSessions={getChildSessions}
                                    />
                                ))}
                            </SidebarSection>
                        )}

                        {/* Create Project button if no projects exist */}
                        {projects.length === 0 && (
                            <Box px={2} py={2}>
                                <Button
                                    size="xs"
                                    variant="ghost"
                                    leftIcon={<FiFolderPlus />}
                                    onClick={handleCreateProject}
                                    fontSize="xs"
                                    color={textSecondary}
                                    w="full"
                                    justifyContent="flex-start"
                                >
                                    Create First Project
                                </Button>
                            </Box>
                        )}

                        {/* Active/In-Progress Sessions */}
                        {(statusFilter === 'all' || statusFilter === 'active') && activeSessions.length > 0 && (
                            <SidebarSection
                                title="Active Research"
                                expanded={activeExpanded}
                                onToggle={() => setActiveExpanded(!activeExpanded)}
                                count={activeSessions.length}
                            >
                                {filterBySearch(mainActiveSessions).map(session => (
                                    <HierarchicalSessionItem
                                        key={session.session_id}
                                        session={session}
                                        childSessions={getChildSessions(session.session_id)}
                                        isSelected={selectedSessionId === session.session_id}
                                        selectedSessionId={selectedSessionId}
                                        onClick={() => handleSessionClick(session.session_id)}
                                        onChildClick={handleSessionClick}
                                        onContextMenu={(e) => handleSessionContextMenu(e, session)}
                                    />
                                ))}
                            </SidebarSection>
                        )}

                        {/* Completed Sessions */}
                        {(statusFilter === 'all' || statusFilter === 'completed') && completedSessions.length > 0 && (
                            <SidebarSection
                                title="Completed"
                                expanded={completedExpanded}
                                onToggle={() => setCompletedExpanded(!completedExpanded)}
                                count={completedSessions.length}
                            >
                                {filterBySearch(mainCompletedSessions).map(session => (
                                    <HierarchicalSessionItem
                                        key={session.session_id}
                                        session={session}
                                        childSessions={getChildSessions(session.session_id)}
                                        isSelected={selectedSessionId === session.session_id}
                                        selectedSessionId={selectedSessionId}
                                        onClick={() => handleSessionClick(session.session_id)}
                                        onChildClick={handleSessionClick}
                                        onContextMenu={(e) => handleSessionContextMenu(e, session)}
                                    />
                                ))}
                            </SidebarSection>
                        )}

                        {/* Failed Sessions */}
                        {(statusFilter === 'all' || statusFilter === 'failed') && failedSessions.length > 0 && (
                            <SidebarSection
                                title="Failed"
                                expanded={failedExpanded}
                                onToggle={() => setFailedExpanded(!failedExpanded)}
                                count={failedSessions.length}
                            >
                                {filterBySearch(mainFailedSessions).map(session => (
                                    <HierarchicalSessionItem
                                        key={session.session_id}
                                        session={session}
                                        childSessions={getChildSessions(session.session_id)}
                                        isSelected={selectedSessionId === session.session_id}
                                        selectedSessionId={selectedSessionId}
                                        onClick={() => handleSessionClick(session.session_id)}
                                        onChildClick={handleSessionClick}
                                        onContextMenu={(e) => handleSessionContextMenu(e, session)}
                                    />
                                ))}
                            </SidebarSection>
                        )}
                    </>
                )}
            </Box>

            {/* Bottom Actions */}
            <VStack align="stretch" spacing={0} px={2} py={2} borderTop="1px" borderColor={borderColor}>
                <SidebarLink icon={FiArchive} label="Archived Research" onClick={() => onNavigate?.('archived')} />
                <SidebarLink icon={FiSettings} label="Research Settings" onClick={() => onNavigate?.('settings')} />
            </VStack>
            {/* Context Menu */}
            <ContextMenuEngine
                isOpen={menuState.isOpen}
                onClose={closeMenu}
                position={menuState.position}
                config={menuState.config}
            />

            {/* Project Picker Modal */}
            <Modal isOpen={isProjectPickerOpen} onClose={onProjectPickerClose} size="xs" isCentered>
                <ModalOverlay bg="blackAlpha.600" />
                <ModalContent bg={bgElevated} borderColor={borderColor} borderWidth="1px">
                    <ModalHeader fontSize="sm" pb={2}>Add to Project</ModalHeader>
                    <ModalCloseButton size="sm" />
                    <ModalBody pb={4}>
                        <VStack align="stretch" spacing={1}>
                            {projects.length === 0 ? (
                                <Text fontSize="xs" color={textSecondary} textAlign="center" py={2}>
                                    No projects yet. Create one first.
                                </Text>
                            ) : (
                                projects.map(project => {
                                    const targetSession = sessions.find(s => s.session_id === projectPickerSessionId);
                                    const isCurrentProject = targetSession?.project_id === project.project_id;
                                    return (
                                        <HStack
                                            key={project.project_id}
                                            px={3}
                                            py={2}
                                            borderRadius="md"
                                            cursor="pointer"
                                            bg={isCurrentProject ? 'purple.900' : 'transparent'}
                                            _hover={{ bg: isCurrentProject ? 'purple.800' : 'whiteAlpha.100' }}
                                            onClick={async () => {
                                                if (!projectPickerSessionId) return;
                                                try {
                                                    const res = await fetch(`/api/research-lab/session/${projectPickerSessionId}/project`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ projectId: isCurrentProject ? null : project.project_id }),
                                                    });
                                                    if (res.ok) {
                                                        setSessions(prev => prev.map(s =>
                                                            s.session_id === projectPickerSessionId
                                                                ? { ...s, project_id: isCurrentProject ? undefined : project.project_id }
                                                                : s
                                                        ));
                                                        toast({
                                                            title: isCurrentProject ? 'Removed from project' : `Added to ${project.name}`,
                                                            status: 'success',
                                                            duration: 2000,
                                                            position: 'bottom-right',
                                                        });
                                                        onProjectPickerClose();
                                                        fetchProjects(); // Refresh project counts
                                                    }
                                                } catch (err) {
                                                    console.error('[ResearchSidebar] Failed to assign project:', err);
                                                    toast({ title: 'Failed to assign project', status: 'error', duration: 3000, position: 'bottom-right' });
                                                }
                                            }}
                                            spacing={2}
                                        >
                                            <Icon as={FiFolder} boxSize={3.5} color={isCurrentProject ? 'purple.300' : textSecondary} />
                                            <Text fontSize="xs" flex={1} fontWeight={isCurrentProject ? '600' : '400'}>
                                                {project.name}
                                            </Text>
                                            {isCurrentProject && (
                                                <Badge colorScheme="purple" fontSize="2xs" borderRadius="full">Current</Badge>
                                            )}
                                        </HStack>
                                    );
                                })
                            )}
                            <Divider my={1} />
                            <HStack
                                px={3}
                                py={2}
                                borderRadius="md"
                                cursor="pointer"
                                _hover={{ bg: 'whiteAlpha.100' }}
                                onClick={async () => {
                                    onProjectPickerClose();
                                    await handleCreateProject();
                                    // Re-open picker after creating project
                                    if (projectPickerSessionId) {
                                        onProjectPickerOpen();
                                    }
                                }}
                                spacing={2}
                            >
                                <Icon as={FiFolderPlus} boxSize={3.5} color="green.400" />
                                <Text fontSize="xs" color="green.400" fontWeight="500">
                                    Create New Project
                                </Text>
                            </HStack>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </GlassPanel>
    );
}

// --- Helper Components ---

interface SidebarSectionProps {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    count?: number;
    action?: React.ReactNode;
}

function SidebarSection({ title, expanded, onToggle, children, count, action }: SidebarSectionProps) {
    const textSecondary = useSemanticToken('text.secondary');

    return (
        <Box mb={2}>
            <HStack
                px={2}
                py={1}
                cursor="pointer"
                onClick={onToggle}
                _hover={{ bg: useSemanticToken('surface.hover') }}
                borderRadius="md"
                minH="24px"
            >
                <Icon
                    as={expanded ? FiChevronDown : FiChevronRight}
                    boxSize={3}
                    color={textSecondary}
                />
                <Text
                    fontSize="xs"
                    fontWeight="600"
                    color={textSecondary}
                    textTransform="uppercase"
                    letterSpacing="wider"
                    flex={1}
                >
                    {title}
                </Text>
                {count !== undefined && (
                    <Badge
                        size="sm"
                        variant="subtle"
                        colorScheme="gray"
                        fontSize="2xs"
                        borderRadius="full"
                    >
                        {count}
                    </Badge>
                )}
                {action}
            </HStack>
            <Collapse in={expanded} animateOpacity>
                <VStack align="stretch" spacing={0.5} mt={1} pl={1}>
                    {children}
                </VStack>
            </Collapse>
        </Box>
    );
}

interface SidebarItemComponentProps {
    item: SidebarItem;
    onClick?: () => void;
}

function SidebarItemComponent({ item, onClick }: SidebarItemComponentProps) {
    const activeBg = useSemanticToken('surface.active');
    const hoverBg = useSemanticToken('surface.hover');
    const activeColor = useSemanticToken('text.inverse');
    const textColor = useSemanticToken('text.primary');
    const secondaryColor = useSemanticToken('text.secondary');

    return (
        <HStack
            px={2}
            py={1.5}
            borderRadius="md"
            cursor="pointer"
            bg={item.isActive ? activeBg : 'transparent'}
            color={item.isActive ? activeColor : textColor}
            _hover={{ bg: item.isActive ? activeBg : hoverBg }}
            onClick={onClick}
            spacing={3}
        >
            <Icon as={item.icon} boxSize={3.5} color={item.isActive ? activeColor : secondaryColor} />
            <Text fontSize="xs" fontWeight={item.isActive ? '600' : '400'} flex={1} noOfLines={1}>
                {item.title}
            </Text>
            {item.count !== undefined && (
                <Text fontSize="2xs" color={item.isActive ? activeColor : secondaryColor}>
                    {item.count}
                </Text>
            )}
        </HStack>
    );
}

interface ResearchSessionItemProps {
    session: ResearchSession;
    isSelected: boolean;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

function ResearchSessionItem({ session, isSelected, onClick, onContextMenu }: ResearchSessionItemProps) {
    const activeBg = useSemanticToken('surface.active');
    const hoverBg = useSemanticToken('surface.hover');
    const textColor = useSemanticToken('text.primary');
    const secondaryColor = useSemanticToken('text.secondary');
    const activeColor = useSemanticToken('text.inverse');

    const getStatusIcon = () => {
        switch (session.status) {
            case 'in_progress':
            case 'pending':
                return FiLoader;
            case 'completed':
                return FiCheckCircle;
            case 'failed':
                return FiXCircle;
            default:
                return FiClock;
        }
    };

    const getStatusColor = () => {
        switch (session.status) {
            case 'in_progress':
            case 'pending':
                return 'blue.400';
            case 'completed':
                return 'green.400';
            case 'failed':
                return 'red.400';
            default:
                return secondaryColor;
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <VStack
            align="stretch"
            spacing={1}
            px={2}
            py={2}
            borderRadius="md"
            cursor="pointer"
            bg={isSelected ? activeBg : 'transparent'}
            _hover={{ bg: isSelected ? activeBg : hoverBg }}
            onClick={onClick}
            onContextMenu={onContextMenu}
            borderWidth="1px"
            borderColor={isSelected ? 'purple.400' : 'transparent'}
        >
            <HStack spacing={2} align="start">
                <Icon 
                    as={getStatusIcon()} 
                    boxSize={3.5} 
                    color={getStatusColor()}
                    mt={0.5}
                />
                <VStack align="start" spacing={0.5} flex={1}>
                    <Text 
                        fontSize="xs" 
                        fontWeight={isSelected ? '600' : '400'} 
                        color={isSelected ? activeColor : textColor}
                        noOfLines={2}
                        lineHeight="1.3"
                    >
                        {session.question}
                    </Text>
                    <HStack spacing={2} fontSize="2xs" color={isSelected ? activeColor : secondaryColor}>
                        <Text>{session.model}</Text>
                        <Text>•</Text>
                        <Text>{formatDate(session.created_at)}</Text>
                    </HStack>
                    {session.status === 'in_progress' && session.progress > 0 && (
                        <Box w="full" h="2px" bg="whiteAlpha.200" borderRadius="full" mt={1}>
                            <Box 
                                h="full" 
                                bg="blue.400" 
                                borderRadius="full" 
                                w={`${session.progress}%`}
                                transition="width 0.3s"
                            />
                        </Box>
                    )}
                </VStack>
            </HStack>
        </VStack>
    );
}

interface SidebarLinkProps {
    icon: any;
    label: string;
    onClick?: () => void;
}

function SidebarLink({ icon, label, onClick }: SidebarLinkProps) {
    return (
        <HStack
            px={2}
            py={1.5}
            borderRadius="md"
            cursor="pointer"
            _hover={{ bg: useSemanticToken('surface.hover') }}
            onClick={onClick}
            spacing={3}
        >
            <Icon as={icon} boxSize={3.5} color={useSemanticToken('text.secondary')} />
            <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                {label}
            </Text>
        </HStack>
    );
}

interface ProjectItemProps {
    name: string;
    icon: any;
    count?: number;
    isSelected: boolean;
    onClick: () => void;
    color?: string;
}

function ProjectItem({ name, icon, count, isSelected, onClick, color = 'purple' }: ProjectItemProps) {
    const activeBg = useSemanticToken('surface.active');
    const hoverBg = useSemanticToken('surface.hover');
    const textColor = useSemanticToken('text.primary');
    const secondaryColor = useSemanticToken('text.secondary');
    const activeColor = useSemanticToken('text.inverse');

    const colorMap: Record<string, string> = {
        purple: 'purple.400',
        blue: 'blue.400',
        green: 'green.400',
        orange: 'orange.400',
        red: 'red.400',
        gray: 'gray.400',
        teal: 'teal.400',
        pink: 'pink.400',
    };

    const iconColor = isSelected ? activeColor : (colorMap[color] || 'purple.400');

    return (
        <HStack
            px={2}
            py={1.5}
            borderRadius="md"
            cursor="pointer"
            bg={isSelected ? activeBg : 'transparent'}
            _hover={{ bg: isSelected ? activeBg : hoverBg }}
            onClick={onClick}
            spacing={2}
        >
            <Icon as={icon} boxSize={3.5} color={iconColor} />
            <Text 
                fontSize="xs" 
                fontWeight={isSelected ? '600' : '400'} 
                color={isSelected ? activeColor : textColor}
                flex={1}
                noOfLines={1}
            >
                {name}
            </Text>
            {count !== undefined && (
                <Badge
                    size="sm"
                    variant="subtle"
                    colorScheme={isSelected ? 'purple' : 'gray'}
                    fontSize="2xs"
                    borderRadius="full"
                >
                    {count}
                </Badge>
            )}
        </HStack>
    );
}

interface ExpandableProjectItemProps {
    project: ResearchProject;
    sessions: ResearchSession[];
    allSessions: ResearchSession[];
    selectedSessionId: string | null;
    onSessionClick: (sessionId: string) => void;
    onContextMenu: (e: React.MouseEvent, session: ResearchSession) => void;
    getChildSessions: (parentId: string) => ResearchSession[];
}

function ExpandableProjectItem({
    project,
    sessions: projectMainSessions,
    allSessions,
    selectedSessionId,
    onSessionClick,
    onContextMenu,
    getChildSessions,
}: ExpandableProjectItemProps) {
    const [expanded, setExpanded] = useState(true);
    const hoverBg = useSemanticToken('surface.hover');
    const textColor = useSemanticToken('text.primary');
    const textSecondary = useSemanticToken('text.secondary');
    const totalCount = allSessions.filter(s => s.project_id === project.project_id).length;

    const colorMap: Record<string, string> = {
        purple: 'purple.400', blue: 'blue.400', green: 'green.400',
        orange: 'orange.400', red: 'red.400', teal: 'teal.400', pink: 'pink.400',
    };
    const iconColor = colorMap[project.color || 'purple'] || 'purple.400';

    return (
        <Box>
            <HStack
                px={2}
                py={1.5}
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: hoverBg }}
                onClick={() => setExpanded(!expanded)}
                spacing={1}
            >
                <Icon as={expanded ? FiChevronDown : FiChevronRight} boxSize={3} color={textSecondary} />
                <Icon as={FiFolder} boxSize={3.5} color={iconColor} />
                <Text fontSize="xs" fontWeight="600" color={textColor} flex={1} noOfLines={1}>
                    {project.name}
                </Text>
                <Badge size="sm" variant="subtle" colorScheme="gray" fontSize="2xs" borderRadius="full">
                    {totalCount}
                </Badge>
            </HStack>
            {expanded && projectMainSessions.length > 0 && (
                <VStack align="stretch" spacing={0} pl={3} ml={2} borderLeft="1px dashed" borderColor={textSecondary}>
                    {projectMainSessions.map(session => (
                        <HierarchicalSessionItem
                            key={session.session_id}
                            session={session}
                            childSessions={getChildSessions(session.session_id)}
                            isSelected={selectedSessionId === session.session_id}
                            selectedSessionId={selectedSessionId}
                            onClick={() => onSessionClick(session.session_id)}
                            onChildClick={onSessionClick}
                            onContextMenu={(e) => onContextMenu(e, session)}
                        />
                    ))}
                </VStack>
            )}
            {expanded && projectMainSessions.length === 0 && (
                <Text fontSize="2xs" color={textSecondary} pl={7} py={1}>No sessions yet</Text>
            )}
        </Box>
    );
}

interface HierarchicalSessionItemProps {
    session: ResearchSession;
    childSessions: ResearchSession[];
    isSelected: boolean;
    selectedSessionId: string | null;
    onClick: () => void;
    onChildClick: (sessionId: string) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

function HierarchicalSessionItem({ 
    session, 
    childSessions, 
    isSelected, 
    selectedSessionId,
    onClick, 
    onChildClick,
    onContextMenu 
}: HierarchicalSessionItemProps) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = childSessions.length > 0;
    const textSecondary = useSemanticToken('text.secondary');

    return (
        <Box>
            <HStack spacing={0} align="start">
                {/* Expand/collapse toggle for sessions with children */}
                {hasChildren ? (
                    <IconButton
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                        icon={<Icon as={expanded ? FiChevronDown : FiChevronRight} boxSize={3} />}
                        size="xs"
                        variant="ghost"
                        minW="20px"
                        h="20px"
                        mt={1}
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded(!expanded);
                        }}
                    />
                ) : (
                    <Box w="20px" />
                )}
                <Box flex={1}>
                    <ResearchSessionItem
                        session={session}
                        isSelected={isSelected}
                        onClick={onClick}
                        onContextMenu={onContextMenu}
                    />
                </Box>
            </HStack>
            
            {/* Child sessions (follow-ups) */}
            {hasChildren && expanded && (
                <VStack align="stretch" spacing={0} pl={5} ml={2} borderLeft="1px dashed" borderColor={textSecondary}>
                    {childSessions.map(child => (
                        <ChildSessionItem
                            key={child.session_id}
                            session={child}
                            isSelected={selectedSessionId === child.session_id}
                            onClick={() => onChildClick(child.session_id)}
                        />
                    ))}
                </VStack>
            )}
        </Box>
    );
}

interface ChildSessionItemProps {
    session: ResearchSession;
    isSelected: boolean;
    onClick: () => void;
}

function ChildSessionItem({ session, isSelected, onClick }: ChildSessionItemProps) {
    const activeBg = useSemanticToken('surface.active');
    const hoverBg = useSemanticToken('surface.hover');
    const textColor = useSemanticToken('text.primary');
    const secondaryColor = useSemanticToken('text.secondary');
    const activeColor = useSemanticToken('text.inverse');

    const getTypeLabel = () => {
        switch (session.session_type) {
            case 'follow_up':
                return '↳ Follow-up';
            case 'qwen3_query':
                return '↳ Qwen3 Query';
            case 'analysis':
                return '↳ Analysis';
            default:
                return '↳ Related';
        }
    };

    const getTypeColor = () => {
        switch (session.session_type) {
            case 'follow_up':
                return 'blue.400';
            case 'qwen3_query':
                return 'purple.400';
            case 'analysis':
                return 'green.400';
            default:
                return secondaryColor;
        }
    };

    return (
        <HStack
            px={2}
            py={1.5}
            borderRadius="md"
            cursor="pointer"
            bg={isSelected ? activeBg : 'transparent'}
            _hover={{ bg: isSelected ? activeBg : hoverBg }}
            onClick={onClick}
            spacing={2}
        >
            <VStack align="start" spacing={0} flex={1}>
                <Text 
                    fontSize="2xs" 
                    color={getTypeColor()}
                    fontWeight="500"
                >
                    {getTypeLabel()}
                </Text>
                <Text 
                    fontSize="xs" 
                    fontWeight={isSelected ? '600' : '400'} 
                    color={isSelected ? activeColor : textColor}
                    noOfLines={1}
                    lineHeight="1.2"
                >
                    {session.question}
                </Text>
            </VStack>
        </HStack>
    );
}

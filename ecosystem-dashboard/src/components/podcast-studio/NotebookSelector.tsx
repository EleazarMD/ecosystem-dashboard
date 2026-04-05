import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Grid,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Icon,
  Tooltip,
  useToast,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Divider,
  Portal,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiCopy,
  FiDownload,
  FiGrid,
  FiList,
  FiSearch,
  FiChevronDown,
  FiFolder,
  FiFileText,
  FiX,
} from 'react-icons/fi';

interface Notebook {
  id: string;
  title: string;
  emoji: string;
  description?: string;
  sourceCount: number;
  status: 'draft' | 'in_progress' | 'ready' | 'published';
  lastUpdated: Date;
  createdAt: Date;
  backgroundColor: string;
  series_id?: string;
  season_id?: string;
  episode_number?: number;
}

interface PodcastSeries {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  status: 'active' | 'paused' | 'completed';
  total_episodes: number;
  total_seasons: number;
  episodes?: Notebook[];
}

interface NotebookSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentNotebookId?: string;
  onSelectNotebook: (notebookId: string) => void;
  onCreateNotebook: (seriesId?: string) => void;
}

const PASTEL_COLORS = [
  '#E8F5E9', // Light green
  '#E3F2FD', // Light blue
  '#FFF3E0', // Light orange
  '#F3E5F5', // Light purple
  '#FCE4EC', // Light pink
  '#E0F2F1', // Light teal
  '#FFF9C4', // Light yellow
  '#FFEBEE', // Light red
];

const DEFAULT_EMOJIS = ['🎙️', '🎧', '📻', '🎵', '🎤', '🔊', '📢', '🎶'];

export default function NotebookSelector({
  isOpen,
  onClose,
  currentNotebookId,
  onSelectNotebook,
  onCreateNotebook,
}: NotebookSelectorProps) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [filteredNotebooks, setFilteredNotebooks] = useState<Notebook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'series' | 'standalone'>('all');
  const [series, setSeries] = useState<PodcastSeries[]>([]);
  const [activeTab, setActiveTab] = useState(0); // 0 = All Notebooks, 1 = Series
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [selectedNotebookForSeries, setSelectedNotebookForSeries] = useState<string | null>(null);
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toast = useToast();
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');

  // Load notebooks and series
  useEffect(() => {
    if (isOpen) {
      loadNotebooks();
      loadSeries();
    }
  }, [isOpen]);

  const loadSeries = async () => {
    try {
      console.log('📁 Loading series from API...');
      const response = await fetch('/api/podcast-studio/series');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded series:', data);
        setSeries(data);
      } else {
        console.warn('⚠️ Series API returned non-OK status:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to load series:', error);
    }
  };

  // Filter and sort
  useEffect(() => {
    let filtered = [...notebooks];

    // View filter (series/standalone)
    if (viewFilter === 'series') {
      filtered = filtered.filter(nb => nb.series_id);
    } else if (viewFilter === 'standalone') {
      filtered = filtered.filter(nb => !nb.series_id);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(nb =>
        nb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nb.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return b.lastUpdated.getTime() - a.lastUpdated.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredNotebooks(filtered);
  }, [notebooks, searchQuery, sortBy, viewFilter]);

  const loadNotebooks = async () => {
    setIsLoading(true);
    try {
      console.log('📚 Loading notebooks from API...');
      const response = await fetch('/api/podcast-studio/projects');

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const projects = await response.json();
      console.log('📊 Loaded projects:', projects);

      const notebooksData: Notebook[] = (Array.isArray(projects) ? projects : []).map((project: any, index: number) => {
        const sourceCount = project.researchMaterials?.length || project.metadata?.sourceCount || 0;

        return {
          id: project.id,
          title: project.name || project.title || 'Untitled Notebook',
          emoji: project.metadata?.emoji || DEFAULT_EMOJIS[index % DEFAULT_EMOJIS.length],
          description: `${sourceCount} sources`,
          sourceCount: sourceCount,
          status: project.status || 'draft',
          lastUpdated: new Date(project.updated_at || project.updatedAt || Date.now()),
          createdAt: new Date(project.created_at || project.createdAt || Date.now()),
          backgroundColor: project.metadata?.backgroundColor || PASTEL_COLORS[index % PASTEL_COLORS.length],
          series_id: project.series_id,
          season_id: project.season_id,
          episode_number: project.episode_number,
        };
      });

      console.log('✅ Mapped notebooks:', notebooksData);
      setNotebooks(notebooksData);
    } catch (error) {
      console.error('❌ Failed to load notebooks:', error);
      toast({
        title: 'Failed to load notebooks',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNotebook = (notebookId: string) => {
    onSelectNotebook(notebookId);
    onClose();
  };

  const handleCreateNew = () => {
    onCreateNotebook();
    onClose();
  };

  const handleStartRename = (notebook: Notebook) => {
    setRenamingNotebookId(notebook.id);
    setRenameValue(notebook.title);
  };

  const handleCancelRename = () => {
    setRenamingNotebookId(null);
    setRenameValue('');
  };

  const handleSaveRename = async (notebookId: string) => {
    if (!renameValue.trim()) {
      toast({
        title: 'Name cannot be empty',
        status: 'error',
        duration: 2000,
      });
      return;
    }

    try {
      const response = await fetch(`/api/podcast-studio/projects?id=${notebookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename notebook');
      }

      await loadNotebooks();
      setRenamingNotebookId(null);
      setRenameValue('');
      
      toast({
        title: 'Notebook renamed',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Failed to rename notebook',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDuplicate = async (notebook: Notebook) => {
    toast({
      title: 'Duplicating notebook...',
      status: 'info',
      duration: 2000,
    });
    // TODO: Implement duplication
  };

  const handleDelete = async (notebookId: string) => {
    if (confirm('Are you sure you want to delete this notebook?')) {
      try {
        const response = await fetch(`/api/podcast-studio/projects?id=${notebookId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete');
        }

        await loadNotebooks();
        toast({
          title: 'Notebook deleted',
          status: 'success',
          duration: 2000,
        });
      } catch (error) {
        console.error('Delete error:', error);
        toast({
          title: 'Failed to delete notebook',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) {
      toast({
        title: 'Series name required',
        status: 'error',
        duration: 2000,
      });
      return;
    }

    try {
      const response = await fetch('/api/podcast-studio/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSeriesName,
          description: newSeriesDescription,
          status: 'active',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create series');
      }

      setNewSeriesName('');
      setNewSeriesDescription('');
      setIsCreatingSeries(false);
      await loadSeries();

      toast({
        title: 'Series created',
        description: `"${newSeriesName}" is ready for episodes`,
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Failed to create series',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleAssignToSeries = async (notebookId: string, seriesId: string | null) => {
    try {
      console.log(`📌 Assigning notebook ${notebookId} to series ${seriesId}`);
      const response = await fetch(`/api/podcast-studio/projects?id=${notebookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          series_id: seriesId,
          episode_number: seriesId ? null : null, // Will be auto-assigned by backend
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Failed to assign to series:', errorData);
        throw new Error(errorData.message || 'Failed to assign to series');
      }

      const result = await response.json();
      console.log('✅ Successfully assigned to series:', result);

      await loadNotebooks();
      await loadSeries();

      toast({
        title: seriesId ? 'Added to series' : 'Removed from series',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      console.error('❌ Assignment error:', error);
      toast({
        title: 'Failed to update series assignment',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteBlankNotebooks = async () => {
    if (confirm('Delete all blank notebooks? This cannot be undone.')) {
      try {
        const response = await fetch('/api/podcast-studio/projects?deleteBlank=true', {
          method: 'DELETE',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to delete');
        }

        const result = await response.json();
        await loadNotebooks();

        toast({
          title: 'Blank notebooks deleted',
          description: `Removed ${result.count || 0} notebooks`,
          status: 'success',
          duration: 3000,
        });
      } catch (error) {
        console.error('Bulk delete error:', error);
        toast({
          title: 'Failed to delete blank notebooks',
          description: error instanceof Error ? error.message : 'Unknown error',
          status: 'error',
          duration: 3000,
        });
      }
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'ready': return 'blue';
      case 'in_progress': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(10px)" />
      <ModalContent
        maxW="1200px"
        h="80vh"
        bg={bgColor}
        borderRadius="2xl"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        <ModalHeader
          borderBottom="1px solid"
          borderColor={borderColor}
          pb={4}
          pr={16}
        >
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" pr={2}>
              <HStack spacing={3}>
                {/* Concentric circles icon for consistency */}
                <Box position="relative" w="32px" h="32px">
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    w="28px"
                    h="28px"
                    bg={useSemanticToken('surface.elevated')}
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Box
                      position="absolute"
                      w="18px"
                      h="18px"
                      borderRadius="full"
                      border="2px solid"
                      borderColor="white"
                      opacity={0.8}
                    />
                    <Box
                      position="absolute"
                      w="12px"
                      h="12px"
                      borderRadius="full"
                      border="2px solid"
                      borderColor="white"
                      opacity={0.6}
                    />
                    <Box
                      position="absolute"
                      w="6px"
                      h="6px"
                      borderRadius="full"
                      bg={useSemanticToken('surface.elevated')}
                    />
                  </Box>
                </Box>
                <Text fontSize="2xl" fontWeight="600">
                  My Notebooks
                </Text>
                <Badge colorScheme="purple" fontSize="sm" ml={2}>
                  {filteredNotebooks.length}
                </Badge>
              </HStack>
              <HStack spacing={2}>
                {/* Filter Dropdown */}
                <Menu>
                  <MenuButton
                    as={Button}
                    leftIcon={<FiSearch />}
                    rightIcon={<FiChevronDown />}
                    variant="outline"
                    size="sm"
                  >
                    {viewFilter === 'all' ? 'All' : viewFilter === 'series' ? 'Series' : 'Standalone'}
                  </MenuButton>
                  <Portal>
                    <MenuList zIndex={1500}>
                      <MenuItem onClick={() => setViewFilter('all')}>
                        📚 All Notebooks ({notebooks.length})
                      </MenuItem>
                      <MenuItem onClick={() => setViewFilter('series')}>
                        📁 In Series Only
                      </MenuItem>
                      <MenuItem onClick={() => setViewFilter('standalone')}>
                        📂 Standalone Only
                      </MenuItem>
                    </MenuList>
                  </Portal>
                </Menu>

                {/* Sort Dropdown */}
                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<FiChevronDown />}
                    variant="ghost"
                    size="sm"
                  >
                    {sortBy === 'recent' ? 'Recent' : sortBy === 'oldest' ? 'Oldest' : 'Name'}
                  </MenuButton>
                  <Portal>
                    <MenuList zIndex={1500}>
                      <MenuItem onClick={() => setSortBy('recent')}>Most recent</MenuItem>
                      <MenuItem onClick={() => setSortBy('oldest')}>Oldest first</MenuItem>
                      <MenuItem onClick={() => setSortBy('name')}>Name (A-Z)</MenuItem>
                    </MenuList>
                  </Portal>
                </Menu>

                <HStack spacing={0} borderRadius="md" border="1px solid" borderColor={borderColor}>
                  <IconButton
                    icon={<FiGrid />}
                    aria-label="Grid view"
                    size="sm"
                    variant={viewMode === 'grid' ? 'solid' : 'ghost'}
                    onClick={() => setViewMode('grid')}
                    borderRadius="md"
                  />
                  <IconButton
                    icon={<FiList />}
                    aria-label="List view"
                    size="sm"
                    variant={viewMode === 'list' ? 'solid' : 'ghost'}
                    onClick={() => setViewMode('list')}
                    borderRadius="md"
                  />
                </HStack>

                {/* Options Menu - Only show in list view */}
                {viewMode === 'list' && (
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<FiChevronDown />}
                      variant="outline"
                      size="sm"
                      colorScheme="red"
                    >
                      Actions
                    </MenuButton>
                    <Portal>
                      <MenuList zIndex={1500}>
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={handleDeleteBlankNotebooks}
                        >
                          Delete Blank Notebooks
                        </MenuItem>
                      </MenuList>
                    </Portal>
                  </Menu>
                )}
              </HStack>
            </HStack>

            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <FiSearch color="gray" />
              </InputLeftElement>
              <Input
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="full"
                pr="40px"
              />
              {searchQuery && (
                <InputRightElement>
                  <IconButton
                    icon={<FiX />}
                    aria-label="Clear search"
                    size="xs"
                    variant="ghost"
                    borderRadius="full"
                    onClick={() => setSearchQuery('')}
                  />
                </InputRightElement>
              )}
            </InputGroup>
          </VStack>
        </ModalHeader>

        <ModalCloseButton top={4} right={4} size="lg" zIndex={2} />

        <ModalBody p={0} overflowY="auto" flex="1">
          <Tabs index={activeTab} onChange={setActiveTab}>
            <TabList px={6} pt={4} borderBottom="2px solid" borderColor={borderColor}>
              <Tab fontWeight="600">
                📚 All Notebooks ({notebooks.length})
              </Tab>
              <Tab fontWeight="600">
                📁 Series ({series.length})
              </Tab>
            </TabList>

            <TabPanels>
              {/* All Notebooks Tab */}
              <TabPanel p={6} pb={8}>
                {isLoading ? (
                  <Text>Loading notebooks...</Text>
                ) : viewMode === 'grid' ? (
                  <Grid
                    templateColumns="repeat(auto-fill, minmax(200px, 1fr))"
                    gap={3}
                  >
                    {/* Create new card */}
                    <Box
                      as="button"
                      onClick={handleCreateNew}
                      h="180px"
                      border="2px dashed"
                      borderColor={borderColor}
                      borderRadius="lg"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexDirection="column"
                      gap={2}
                      transition="all 0.2s"
                      _hover={{
                        borderColor: 'blue.400',
                        bg: hoverBg,
                        transform: 'translateY(-2px)',
                      }}
                    >
                      <Icon as={FiPlus} boxSize={5} color={useSemanticToken('text.tertiary')} />
                      <Text color={useSemanticToken('text.secondary')} fontSize="2xs" fontWeight="500" textAlign="center" px={2}>
                        Create new
                      </Text>
                    </Box>

                    {/* Notebook cards */}
                    {filteredNotebooks.map((notebook) => (
                      <Box
                        key={notebook.id}
                        as="button"
                        onClick={() => handleSelectNotebook(notebook.id)}
                        h="180px"
                        bg={notebook.backgroundColor}
                        borderRadius="lg"
                        p={3}
                        textAlign="left"
                        position="relative"
                        border="2px solid"
                        borderColor={
                          currentNotebookId === notebook.id ? 'blue.500' : 'transparent'
                        }
                        transition="all 0.2s"
                        _hover={{
                          transform: 'translateY(-3px)',
                          boxShadow: 'md',
                        }}
                      >
                        <VStack align="stretch" h="full" justify="space-between">
                          <Box>
                            {/* Menu button in top-right corner */}
                            <Menu>
                              <MenuButton
                                as={IconButton}
                                icon={<FiMoreVertical />}
                                variant="ghost"
                                size="xs"
                                position="absolute"
                                top={2}
                                right={2}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Portal>
                                <MenuList zIndex={1500}>
                                  <MenuItem 
                                    icon={<FiEdit2 />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartRename(notebook);
                                    }}
                                  >
                                    Rename
                                  </MenuItem>
                                  {notebook.series_id ? (
                                    <MenuItem
                                      icon={<FiX />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAssignToSeries(notebook.id, null);
                                      }}
                                    >
                                      Remove from Series
                                    </MenuItem>
                                  ) : (
                                    <MenuItem
                                      icon={<FiFolder />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedNotebookForSeries(notebook.id);
                                        setActiveTab(1); // Switch to Series tab
                                      }}
                                    >
                                      Add to Series...
                                    </MenuItem>
                                  )}
                                  <MenuItem icon={<FiCopy />} onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(notebook);
                                  }}>
                                    Duplicate
                                  </MenuItem>
                                  <MenuItem icon={<FiDownload />}>Export</MenuItem>
                                  <MenuItem
                                    icon={<FiTrash2 />}
                                    color="red.500"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(notebook.id);
                                    }}
                                  >
                                    Delete
                                  </MenuItem>
                                </MenuList>
                              </Portal>
                            </Menu>

                            {/* Emoji and title centered */}
                            <VStack spacing={2} align="center" mb={2}>
                              <Text fontSize="3xl">{notebook.emoji}</Text>
                              {renamingNotebookId === notebook.id ? (
                                <VStack spacing={1} w="full" px={1}>
                                  <Input
                                    size="xs"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => {
                                      e.stopPropagation();
                                      if (e.key === 'Enter') {
                                        handleSaveRename(notebook.id);
                                      } else if (e.key === 'Escape') {
                                        handleCancelRename();
                                      }
                                    }}
                                    autoFocus
                                    textAlign="center"
                                    fontSize="xs"
                                  />
                                  <HStack spacing={1}>
                                    <Button
                                      size="xs"
                                      colorScheme="blue"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSaveRename(notebook.id);
                                      }}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancelRename();
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </HStack>
                                </VStack>
                              ) : (
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  noOfLines={2}
                                  color={useSemanticToken('text.primary')}
                                  textAlign="center"
                                  w="full"
                                  lineHeight="1.3"
                                  px={1}
                                >
                                  {notebook.title}
                                </Text>
                              )}
                              {currentNotebookId === notebook.id && (
                                <Badge colorScheme="blue" fontSize="2xs" px={1.5} py={0.5} borderRadius="full">
                                  Active
                                </Badge>
                              )}
                            </VStack>
                          </Box>

                          <VStack align="center" spacing={0.5}>
                            <Text fontSize="2xs" color={useSemanticToken('text.secondary')}>
                              {formatDate(notebook.lastUpdated)}
                            </Text>
                            <Text fontSize="2xs" color={useSemanticToken('text.secondary')}>
                              {notebook.sourceCount} {notebook.sourceCount === 1 ? 'src' : 'srcs'}
                            </Text>
                            <HStack spacing={1} flexWrap="wrap" justify="center" mt={1}>
                              <Badge
                                colorScheme={getStatusColor(notebook.status)}
                                fontSize="2xs"
                                borderRadius="full"
                                px={1.5}
                                py={0.5}
                              >
                                {notebook.status === 'in_progress' ? 'WIP' : notebook.status}
                              </Badge>
                              {notebook.series_id && (
                                <Badge
                                  colorScheme="purple"
                                  fontSize="2xs"
                                  borderRadius="full"
                                  px={1.5}
                                  py={0.5}
                                >
                                  {notebook.episode_number ? `Ep${notebook.episode_number}` : '📁'}
                                </Badge>
                              )}
                            </HStack>
                          </VStack>
                        </VStack>
                      </Box>
                    ))}
                  </Grid>
                ) : (
                  <VStack align="stretch" spacing={2}>
                    {filteredNotebooks.map((notebook) => (
                      <HStack
                        key={notebook.id}
                        as="button"
                        onClick={() => handleSelectNotebook(notebook.id)}
                        p={4}
                        borderRadius="lg"
                        border="1px solid"
                        borderColor={
                          currentNotebookId === notebook.id ? 'blue.500' : borderColor
                        }
                        _hover={{ bg: hoverBg }}
                        justify="space-between"
                      >
                        <HStack spacing={4}>
                          <Box
                            w="50px"
                            h="50px"
                            bg={notebook.backgroundColor}
                            borderRadius="lg"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="2xl"
                          >
                            {notebook.emoji}
                          </Box>
                          <VStack align="start" spacing={1} flex={1}>
                            {renamingNotebookId === notebook.id ? (
                              <HStack spacing={2} w="full">
                                <Input
                                  size="sm"
                                  value={renameValue}
                                  onChange={(e) => setRenameValue(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    e.stopPropagation();
                                    if (e.key === 'Enter') {
                                      handleSaveRename(notebook.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelRename();
                                    }
                                  }}
                                  autoFocus
                                  flex={1}
                                />
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveRename(notebook.id);
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelRename();
                                  }}
                                >
                                  Cancel
                                </Button>
                              </HStack>
                            ) : (
                              <Text fontWeight="600">{notebook.title}</Text>
                            )}
                            <HStack spacing={2} fontSize="xs" color={useSemanticToken('text.secondary')}>
                              <Text>{formatDate(notebook.lastUpdated)}</Text>
                              <Text>•</Text>
                              <Text>{notebook.sourceCount} sources</Text>
                              <Badge
                                colorScheme={getStatusColor(notebook.status)}
                                fontSize="xs"
                              >
                                {notebook.status}
                              </Badge>
                            </HStack>
                          </VStack>
                        </HStack>
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Portal>
                            <MenuList zIndex={1500}>
                              <MenuItem 
                                icon={<FiEdit2 />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartRename(notebook);
                                }}
                              >
                                Rename
                              </MenuItem>
                              <MenuItem 
                                icon={<FiCopy />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(notebook);
                                }}
                              >
                                Duplicate
                              </MenuItem>
                              <MenuItem icon={<FiDownload />}>Export</MenuItem>
                              <MenuItem 
                                icon={<FiTrash2 />} 
                                color="red.500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(notebook.id);
                                }}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Portal>
                        </Menu>
                      </HStack>
                    ))}
                  </VStack>
                )}

                {filteredNotebooks.length === 0 && !isLoading && (
                  <VStack py={12} spacing={4}>
                    <Text fontSize="4xl">📚</Text>
                    <Text fontSize="lg" color={useSemanticToken('text.secondary')}>
                      {searchQuery ? 'No notebooks found' : 'No notebooks yet'}
                    </Text>
                    <Button
                      leftIcon={<FiPlus />}
                      colorScheme="blue"
                      onClick={handleCreateNew}
                      size="lg"
                    >
                      Create your first notebook
                    </Button>
                  </VStack>
                )}
              </TabPanel>

              {/* Series Tab */}
              <TabPanel p={6} pb={8}>
                <VStack align="stretch" spacing={4}>
                  {/* Notebook Selection Banner */}
                  {selectedNotebookForSeries && (
                    <Box
                      p={3}
                      bg="blue.50"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="blue.200"
                    >
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={FiFolder} color="blue.500" />
                          <Text fontSize="sm" fontWeight="500">
                            Click a series below to add "{notebooks.find(n => n.id === selectedNotebookForSeries)?.title}"
                          </Text>
                        </HStack>
                        <IconButton
                          icon={<FiX />}
                          aria-label="Clear selection"
                          size="xs"
                          variant="ghost"
                          onClick={() => setSelectedNotebookForSeries(null)}
                        />
                      </HStack>
                    </Box>
                  )}

                  {/* Create Series Button/Form */}
                  {isCreatingSeries ? (
                    <Box
                      p={4}
                      border="2px solid"
                      borderColor="blue.400"
                      borderRadius="xl"
                      bg={useSemanticToken('surface.highlight')}
                    >
                      <VStack spacing={3} align="stretch">
                        <Text fontWeight="600">Create New Series</Text>
                        <Input
                          placeholder="Series name (e.g., Healthcare Forward)"
                          value={newSeriesName}
                          onChange={(e) => setNewSeriesName(e.target.value)}
                          autoFocus
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={newSeriesDescription}
                          onChange={(e) => setNewSeriesDescription(e.target.value)}
                        />
                        <HStack justify="flex-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setIsCreatingSeries(false);
                              setNewSeriesName('');
                              setNewSeriesDescription('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={handleCreateSeries}
                          >
                            Create Series
                          </Button>
                        </HStack>
                      </VStack>
                    </Box>
                  ) : (
                    <Button
                      leftIcon={<FiPlus />}
                      variant="outline"
                      onClick={() => setIsCreatingSeries(true)}
                    >
                      Create New Series
                    </Button>
                  )}

                  {/* Series List */}
                  {series.length === 0 && !isCreatingSeries ? (
                    <VStack py={12} spacing={4}>
                      <Text fontSize="4xl">📁</Text>
                      <Text fontSize="lg" color={useSemanticToken('text.secondary')}>
                        No series yet
                      </Text>
                      <Text fontSize="sm" color={useSemanticToken('text.secondary')} textAlign="center" maxW="md">
                        Create a series to organize related podcast episodes
                      </Text>
                    </VStack>
                  ) : (
                    <Accordion allowMultiple>
                      {series.map((s) => {
                        const seriesNotebooks = notebooks.filter(nb => nb.series_id === s.id);
                        return (
                          <AccordionItem
                            key={s.id}
                            border="1px solid"
                            borderColor={selectedNotebookForSeries ? 'blue.400' : borderColor}
                            borderRadius="lg"
                            mb={3}
                            bg={selectedNotebookForSeries ? 'blue.50' : 'transparent'}
                            cursor={selectedNotebookForSeries ? 'pointer' : 'default'}
                            _hover={selectedNotebookForSeries ? { bg: 'blue.100' } : {}}
                            onClick={() => {
                              if (selectedNotebookForSeries) {
                                handleAssignToSeries(selectedNotebookForSeries, s.id);
                                setSelectedNotebookForSeries(null);
                              }
                            }}
                          >
                            <AccordionButton p={4}>
                              <HStack flex="1" justify="space-between">
                                <HStack spacing={3}>
                                  <Icon as={FiFolder} boxSize={5} color={selectedNotebookForSeries ? 'blue.500' : undefined} />
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="600">{s.name}</Text>
                                    {s.description && (
                                      <Text fontSize="xs" color={useSemanticToken('text.secondary')}>{s.description}</Text>
                                    )}
                                  </VStack>
                                </HStack>
                                <HStack>
                                  <Badge colorScheme={selectedNotebookForSeries ? 'blue' : 'gray'}>
                                    {seriesNotebooks.length} episodes
                                  </Badge>
                                  {!selectedNotebookForSeries && <AccordionIcon />}
                                  {selectedNotebookForSeries && (
                                    <Text fontSize="xs" color="blue.600" fontWeight="600">
                                      Click to add →
                                    </Text>
                                  )}
                                </HStack>
                              </HStack>
                            </AccordionButton>
                            <AccordionPanel pb={4}>
                              <VStack align="stretch" spacing={2}>
                                {seriesNotebooks.length === 0 ? (
                                  <Text fontSize="sm" color={useSemanticToken('text.secondary')} py={2}>
                                    No episodes yet. Assign notebooks to this series from the notebook menu.
                                  </Text>
                                ) : (
                                  seriesNotebooks.map((notebook) => (
                                    <HStack
                                      key={notebook.id}
                                      p={3}
                                      borderRadius="md"
                                      bg={hoverBg}
                                      justify="space-between"
                                      cursor="pointer"
                                      onClick={() => handleSelectNotebook(notebook.id)}
                                      _hover={{ bg: useSemanticToken('surface.hover') }}
                                    >
                                      <HStack>
                                        <Text fontSize="lg">{notebook.emoji}</Text>
                                        <VStack align="start" spacing={0}>
                                          <Text fontSize="sm" fontWeight="500">{notebook.title}</Text>
                                          <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                            Episode {notebook.episode_number || '?'}
                                          </Text>
                                        </VStack>
                                      </HStack>
                                      <IconButton
                                        icon={<FiX />}
                                        aria-label="Remove from series"
                                        size="xs"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAssignToSeries(notebook.id, null);
                                        }}
                                      />
                                    </HStack>
                                  ))
                                )}
                              </VStack>
                            </AccordionPanel>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  )}
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

      </ModalContent>
    </Modal>
  );
}

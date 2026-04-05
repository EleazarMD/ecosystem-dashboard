/**
 * WorkspaceNav - Workspace Navigation Sidebar
 * Left navigation panel with pages, conversations, and workspace switching
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
  Input,
  InputGroup,
  InputLeftElement,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
} from '@chakra-ui/react';
import {
  FiFileText,
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiSearch,
  FiUsers,
  FiHome,
  FiTrash2,
  FiShare2,
  FiZap,
  FiFolder,
  FiMessageSquare,
} from 'react-icons/fi';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PageItem {
  id: string;
  title?: string;
  icon?: string | { type?: string; emoji?: string };
  updated_at?: string;
  properties?: {
    title?: Array<{
      text?: {
        content?: string;
      };
    }>;
    icon?: string | { type?: string; emoji?: string };
  };
}

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings?: any;
}

interface WorkspaceNavProps {
  myPages: PageItem[];
  currentWorkspace: Workspace | null;
  userId: string;
  onPageClick: (pageId: string) => void;
  onDeletePage?: (pageId: string) => void;
  onCreatePage?: () => void;
  onHomeClick?: () => void;
  onWorkspaceAIClick?: () => void;
  onFilesClick?: () => void;
  onNotesClick?: () => void;
  onWorkspaceChange?: (workspaceId: string) => void;
  onSettingsClick?: () => void;
  onInviteClick?: () => void;
  onReorderPages?: (fromIndex: number, toIndex: number) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

export function WorkspaceNav({
  myPages,
  currentWorkspace,
  userId,
  onPageClick,
  onDeletePage,
  onCreatePage,
  onHomeClick,
  onWorkspaceAIClick,
  onFilesClick,
  onNotesClick,
  onWorkspaceChange,
  onSettingsClick,
  onInviteClick,
  onReorderPages,
  onExpandedChange,
}: WorkspaceNavProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  // Notify parent when expansion state changes
  const handleExpand = () => {
    setIsExpanded(true);
    onExpandedChange?.(true);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    onExpandedChange?.(false);
  };
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const [myPagesExpanded, setMyPagesExpanded] = useState(true);
  const [aiConversationsExpanded, setAIConversationsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; title: string } | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { width: glassSidebarWidth } = useSidebar();

  // Semantic tokens for theme-aware styling - ALL must be called at top level
  const glassBackground = useSemanticToken('glass.background');
  const borderSubtle = useSemanticToken('border.subtle');
  const borderDefault = useSemanticToken('border.default');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const surfaceBase = useSemanticToken('surface.base');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const textTertiary = useSemanticToken('text.tertiary');
  const interactivePrimary = useSemanticToken('interactive.primary');

  // Load conversations on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/workspace-ai/conversations?limit=10');
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setConversationsLoading(false);
      }
    };

    loadConversations();
  }, []);

  // Helper to extract page title
  const getPageTitle = (page: PageItem) => {
    return page.properties?.title?.[0]?.text?.content ||
      page.title ||
      'Untitled';
  };

  // Helper to extract page icon (handles both string and object formats)
  const getPageIcon = (page: PageItem): string => {
    const icon = page.icon || page.properties?.icon;
    if (!icon) return '📄';
    if (typeof icon === 'string') return icon;
    if (typeof icon === 'object' && 'emoji' in icon && icon.emoji) return icon.emoji;
    return '📄';
  };

  const filteredPages = myPages.filter(page => {
    const title = getPageTitle(page);
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleDeleteClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this page?')) {
      onDeletePage?.(pageId);
    }
  };

  const handleConfirmDeleteConversation = async () => {
    if (!conversationToDelete) return;

    setDeleteDialogOpen(false);

    try {
      await fetch(`/api/workspace-ai/conversations/${conversationToDelete.id}`, {
        method: 'DELETE',
      });

      // Reload conversations
      const response = await fetch('/api/workspace-ai/conversations?limit=10');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setConversationToDelete(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex !== null && draggedIndex !== dropIndex && onReorderPages) {
      onReorderPages(draggedIndex, dropIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Box
      position="fixed"
      left={`${glassSidebarWidth}px`}
      top="60px"
      bottom={0}
      width={isExpanded ? '280px' : '48px'}
      bg={glassBackground}
      backdropFilter="blur(10px) saturate(130%)"
      borderRight="1px solid"
      borderColor={borderSubtle}
      borderTopRightRadius="20px"
      borderBottomRightRadius="20px"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      onMouseEnter={handleExpand}
      onMouseLeave={handleCollapse}
      zIndex={10}
      overflow="hidden"
      boxShadow="md"
      cursor={isExpanded ? 'default' : 'pointer'}
      sx={{
        WebkitBackdropFilter: 'blur(10px) saturate(130%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          borderTopRightRadius: '20px',
          borderBottomRightRadius: '20px',
          pointerEvents: 'none',
        },
      }}
    >
      <VStack align="stretch" spacing={0} h="100%">
        {/* Workspace Switcher - only show when expanded */}
        {isExpanded && (
          <WorkspaceSwitcher
            currentWorkspace={currentWorkspace}
            userId={userId}
            onWorkspaceChange={onWorkspaceChange}
            onSettingsClick={onSettingsClick}
            onInviteClick={onInviteClick}
          />
        )}

        {/* Header */}
        <Box px={2} py={2} borderBottom="1px solid" borderColor={borderDefault}>
          {isExpanded ? (
            <HStack spacing={1.5}>
              <Icon as={FiFileText} boxSize={4} color={textPrimary} />
              <Text fontSize="xs" fontWeight="700" color={textPrimary}>
                Pages
              </Text>
            </HStack>
          ) : (
            <Tooltip label="Hover to expand" placement="right">
              <Box textAlign="center">
                <Icon as={FiChevronRight} boxSize={4} color={textTertiary} />
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Search */}
        {isExpanded && (
          <Box px={2} pb={1.5}>
            <InputGroup size="sm">
              <InputLeftElement h="28px">
                <Icon as={FiSearch} color={textSecondary} boxSize={3.5} />
              </InputLeftElement>
              <Input
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                borderRadius="md"
                bg={surfaceElevated}
                border="1px solid"
                borderColor={borderDefault}
                fontSize="xs"
                fontWeight="500"
                h="28px"
                _placeholder={{ color: textTertiary, fontWeight: '400' }}
                _hover={{ borderColor: borderSubtle }}
                _focus={{ bg: surfaceBase, borderColor: interactivePrimary, boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.5)' }}
              />
            </InputGroup>
          </Box>
        )}

        {/* Navigation Items */}
        <Box px={1.5}>
          {/* Home Button */}
          <HStack
            px={2}
            py={0.5}
            borderRadius="md"
            cursor="pointer"
            bg="transparent"
            border="1px solid"
            borderColor="transparent"
            transition="all 0.2s ease"
            _hover={{
              bg: surfaceHover,
              borderColor: borderSubtle,
              transform: 'translateX(2px)',
            }}
            onClick={onHomeClick}
            minH="26px"
          >
            <Icon as={FiHome} boxSize={3.5} color={textPrimary} />
            {isExpanded && (
              <Text fontSize="xs" color={textPrimary} fontWeight="600" lineHeight="1.2">
                Home
              </Text>
            )}
          </HStack>

          {/* Workspace AI Button */}
          <HStack
            px={2}
            py={0.5}
            borderRadius="md"
            cursor="pointer"
            bg="transparent"
            border="1px solid"
            borderColor="transparent"
            transition="all 0.2s ease"
            _hover={{
              bg: 'rgba(59, 130, 246, 0.08)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              transform: 'translateX(2px)',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
            }}
            onClick={onWorkspaceAIClick}
            minH="26px"
          >
            <Icon as={FiZap} boxSize={3.5} color={interactivePrimary} />
            {isExpanded && (
              <Text fontSize="xs" color={textPrimary} fontWeight="600" lineHeight="1.2">
                Workspace AI
              </Text>
            )}
          </HStack>

          {/* Files Button */}
          <HStack
            px={2}
            py={0.5}
            borderRadius="md"
            cursor="pointer"
            bg="transparent"
            border="1px solid"
            borderColor="transparent"
            transition="all 0.2s ease"
            _hover={{
              bg: 'rgba(168, 85, 247, 0.08)',
              borderColor: 'rgba(168, 85, 247, 0.2)',
              transform: 'translateX(2px)',
              boxShadow: '0 2px 4px rgba(168, 85, 247, 0.1)',
            }}
            onClick={onFilesClick}
            minH="26px"
          >
            <Icon as={FiFolder} boxSize={3.5} color="purple.400" />
            {isExpanded && (
              <Text fontSize="xs" color={textPrimary} fontWeight="600" lineHeight="1.2">
                Files
              </Text>
            )}
          </HStack>

          {/* Notes Button */}
          <HStack
            px={2}
            py={0.5}
            borderRadius="md"
            cursor="pointer"
            bg="transparent"
            border="1px solid"
            borderColor="transparent"
            transition="all 0.2s ease"
            _hover={{
              bg: 'rgba(34, 197, 94, 0.08)',
              borderColor: 'rgba(34, 197, 94, 0.2)',
              transform: 'translateX(2px)',
              boxShadow: '0 2px 4px rgba(34, 197, 94, 0.1)',
            }}
            onClick={onNotesClick}
            minH="26px"
          >
            <Text fontSize="sm">📝</Text>
            {isExpanded && (
              <Text fontSize="xs" color={textPrimary} fontWeight="600" lineHeight="1.2">
                Notes
              </Text>
            )}
          </HStack>
        </Box>

        <Box h="1px" bg={surfaceElevated} my={0.5} />

        {/* Pages List */}
        <Box
          flex={1}
          overflowY="auto"
          px={1.5}
          css={{
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          {isExpanded ? (
            <VStack align="stretch" spacing={0}>
              {/* My Pages Section */}
              <HStack
                px={2}
                py={0.5}
                cursor="pointer"
                bg="transparent"
                border="1px solid"
                borderColor="transparent"
                transition="all 0.2s ease"
                _hover={{
                  bg: surfaceHover,
                  borderColor: borderSubtle,
                }}
                borderRadius="md"
                justify="space-between"
                minH="24px"
                mt={0.5}
              >
                <HStack
                  flex={1}
                  onClick={() => setMyPagesExpanded(!myPagesExpanded)}
                >
                  <Icon
                    as={myPagesExpanded ? FiChevronDown : FiChevronRight}
                    boxSize={2.5}
                    color={textSecondary}
                  />
                  <Text fontSize="2xs" fontWeight="700" color={textPrimary} textTransform="uppercase" lineHeight="1.2">
                    My Pages
                  </Text>
                </HStack>
                <Tooltip label="Add page" placement="right">
                  <IconButton
                    icon={<FiPlus />}
                    aria-label="Add page"
                    size="xs"
                    variant="ghost"
                    bg={surfaceHover}
                    color={textPrimary}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreatePage?.();
                    }}
                    _hover={{ bg: surfaceElevated, color: textPrimary }}
                  />
                </Tooltip>
              </HStack>

              <Collapse in={myPagesExpanded}>
                <VStack align="stretch" spacing={0} pl={1}>
                  {filteredPages.length === 0 ? (
                    <Text fontSize="2xs" color={textTertiary} px={2} py={0.5}>
                      No pages yet
                    </Text>
                  ) : (
                    filteredPages.map((page, index) => (
                      <HStack
                        key={page.id}
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        cursor={draggedIndex === index ? 'grabbing' : 'grab'}
                        bg={dragOverIndex === index && draggedIndex !== index ? surfaceElevated : 'transparent'}
                        border="1px solid"
                        borderColor={dragOverIndex === index && draggedIndex !== index ? interactivePrimary : 'transparent'}
                        transition="all 0.2s ease"
                        _hover={{
                          bg: surfaceHover,
                          borderColor: borderSubtle,
                          transform: 'translateX(2px)',
                        }}
                        onClick={() => onPageClick(page.id)}
                        minH="24px"
                        onMouseEnter={() => setHoveredPageId(page.id)}
                        onMouseLeave={() => setHoveredPageId(null)}
                        justify="space-between"
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        opacity={draggedIndex === index ? 0.5 : 1}
                        borderTop={dragOverIndex === index && draggedIndex !== index ? '2px solid' : 'none'}
                      >
                        <HStack spacing={1.5} flex={1} minW={0}>
                          <Text fontSize="xs">{getPageIcon(page)}</Text>
                          <Text fontSize="xs" color={textPrimary} fontWeight="500" noOfLines={1} lineHeight="1.2">
                            {getPageTitle(page)}
                          </Text>
                        </HStack>
                        {hoveredPageId === page.id && (
                          <HStack spacing={0}>
                            <Tooltip label="Share" placement="top">
                              <IconButton
                                aria-label="Share page"
                                icon={<FiShare2 />}
                                size="xs"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Open share modal
                                }}
                              />
                            </Tooltip>
                            <Tooltip label="Delete" placement="top">
                              <IconButton
                                aria-label="Delete page"
                                icon={<FiTrash2 />}
                                size="xs"
                                variant="ghost"
                                colorScheme="red"
                                onClick={(e) => handleDeleteClick(e, page.id)}
                              />
                            </Tooltip>
                          </HStack>
                        )}
                      </HStack>
                    ))
                  )}
                </VStack>
              </Collapse>

              {/* AI Conversations Section */}
              <HStack
                px={2}
                py={0.5}
                cursor="pointer"
                bg="transparent"
                border="1px solid"
                borderColor="transparent"
                transition="all 0.2s ease"
                _hover={{
                  bg: surfaceHover,
                  borderColor: borderSubtle,
                }}
                borderRadius="md"
                justify="space-between"
                mt={1}
                minH="24px"
              >
                <HStack
                  flex={1}
                  onClick={() => setAIConversationsExpanded(!aiConversationsExpanded)}
                >
                  <Icon
                    as={aiConversationsExpanded ? FiChevronDown : FiChevronRight}
                    boxSize={2.5}
                    color={textSecondary}
                  />
                  <Text fontSize="2xs" fontWeight="700" color={textPrimary} textTransform="uppercase" lineHeight="1.2">
                    AI Conversations
                  </Text>
                </HStack>
                <Tooltip label="New conversation" placement="right">
                  <IconButton
                    icon={<FiPlus />}
                    aria-label="New conversation"
                    size="xs"
                    variant="ghost"
                    color={interactivePrimary}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/workspace?view=ai', undefined, { shallow: true });
                    }}
                    _hover={{ bg: surfaceElevated, color: interactivePrimary }}
                  />
                </Tooltip>
              </HStack>

              <Collapse in={aiConversationsExpanded}>
                <VStack align="stretch" spacing={0} pl={1}>
                  {conversationsLoading ? (
                    <Text fontSize="2xs" color={textTertiary} px={2} py={0.5}>
                      Loading...
                    </Text>
                  ) : conversations.length === 0 ? (
                    <Text fontSize="2xs" color={textTertiary} px={2} py={0.5}>
                      No conversations yet
                    </Text>
                  ) : (
                    conversations.slice(0, 5).map((conv) => (
                      <HStack
                        key={conv.id}
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        cursor="pointer"
                        bg="transparent"
                        border="1px solid"
                        borderColor="transparent"
                        transition="all 0.2s ease"
                        _hover={{
                          bg: surfaceHover,
                          borderColor: borderSubtle,
                          transform: 'translateX(2px)',
                        }}
                        onClick={() => router.push(`/workspace?view=ai&conversation=${conv.id}`, undefined, { shallow: true })}
                        minH="24px"
                        onMouseEnter={() => setHoveredPageId(conv.id)}
                        onMouseLeave={() => setHoveredPageId(null)}
                      >
                        <Icon as={FiMessageSquare} boxSize={3.5} color={textSecondary} />
                        <Text fontSize="xs" color={textPrimary} fontWeight="500" noOfLines={1} flex={1} lineHeight="1.2">
                          {conv.title || 'Untitled Chat'}
                        </Text>
                        {hoveredPageId === conv.id && (
                          <Tooltip label="Delete" placement="top">
                            <IconButton
                              aria-label="Delete conversation"
                              icon={<FiTrash2 />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConversationToDelete({ id: conv.id, title: conv.title || 'Untitled Chat' });
                                setDeleteDialogOpen(true);
                              }}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    ))
                  )}
                  <HStack
                    px={2}
                    py={0.5}
                    borderRadius="md"
                    cursor="pointer"
                    bg="transparent"
                    border="1px solid"
                    borderColor="transparent"
                    transition="all 0.2s ease"
                    _hover={{
                      bg: 'rgba(59, 130, 246, 0.08)',
                      borderColor: 'rgba(59, 130, 246, 0.2)',
                      transform: 'translateX(2px)',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)',
                    }}
                    onClick={() => router.push('/workspace?view=ai', undefined, { shallow: true })}
                    minH="24px"
                  >
                    <Icon as={FiMessageSquare} boxSize={3.5} color={interactivePrimary} />
                    <Text fontSize="xs" color={interactivePrimary} fontWeight="600" lineHeight="1.2">
                      Start new conversation
                    </Text>
                  </HStack>
                </VStack>
              </Collapse>
            </VStack>
          ) : (
            // Collapsed view - category icons only
            <VStack align="center" spacing={1.5} px={1} pt={1}>
              {/* My Pages - with count badge */}
              <Tooltip label={`My Pages (${myPages.length})`} placement="right" hasArrow>
                <Box
                  position="relative"
                  p={1.5}
                  borderRadius="md"
                  cursor="pointer"
                  bg="transparent"
                  border="1px solid transparent"
                  _hover={{
                    bg: 'gray.100',
                    borderColor: 'gray.300',
                  }}
                  onClick={handleExpand}
                >
                  <Icon as={FiFileText} boxSize={4} color={textSecondary} />
                  {myPages.length > 0 && (
                    <Box
                      position="absolute"
                      top="-4px"
                      right="-4px"
                      bg="blue.500"
                      color="whiteAlpha.900"
                      fontSize="2xs"
                      fontWeight="700"
                      borderRadius="full"
                      minW="16px"
                      h="16px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      px={1}
                    >
                      {myPages.length}
                    </Box>
                  )}
                </Box>
              </Tooltip>

              {/* AI Conversations - with count badge */}
              <Tooltip label={`AI Conversations (${conversations.length})`} placement="right" hasArrow>
                <Box
                  position="relative"
                  p={1.5}
                  borderRadius="md"
                  cursor="pointer"
                  bg="transparent"
                  border="1px solid transparent"
                  _hover={{
                    bg: 'gray.100',
                    borderColor: 'gray.300',
                  }}
                  onClick={handleExpand}
                >
                  <Icon as={FiMessageSquare} boxSize={4} color="green.600" />
                  {conversations.length > 0 && (
                    <Box
                      position="absolute"
                      top="-4px"
                      right="-4px"
                      bg="green.500"
                      color="whiteAlpha.900"
                      fontSize="2xs"
                      fontWeight="700"
                      borderRadius="full"
                      minW="16px"
                      h="16px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      px={1}
                    >
                      {conversations.length}
                    </Box>
                  )}
                </Box>
              </Tooltip>
            </VStack>
          )}
        </Box>
      </VStack>

      {/* Delete Conversation Confirmation Dialog */}
      <AlertDialog
        isOpen={deleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => {
          setDeleteDialogOpen(false);
          setConversationToDelete(null);
        }}
        isCentered
        size="sm"
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Conversation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete <strong>"{conversationToDelete?.title}"</strong>?
              This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button
                ref={cancelRef}
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setConversationToDelete(null);
                }}
                size="sm"
              >
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleConfirmDeleteConversation}
                ml={3}
                size="sm"
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}

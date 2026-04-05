/**
 * Workspace Pages Panel
 * Left contextual panel for workspace pages
 * Uses the same RetractablePanel pattern as Podcast Studio, AI Research, and Knowledge Graph
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Collapse,
  Divider,
  Button,
  IconButton,
  useDisclosure,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiChevronRight,
  FiUsers,
  FiFileText,
  FiPlus,
  FiSearch,
  FiShare2,
  FiTrash2,
} from 'react-icons/fi';
import RetractablePanel from '../layout/RetractablePanel';
import { ShareModal } from './ShareModal';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Helper to safely extract icon string from various formats
const getIconString = (icon: any): string => {
  if (!icon) return '📄';
  if (typeof icon === 'string') return icon;
  if (typeof icon === 'object' && icon.emoji) return icon.emoji;
  return '📄';
};

interface WorkspacePagesPanelProps {
  workspaceId: string;
  currentUserId: string;
  onPageClick?: (pageId: string) => void;
  onDeletePage?: (pageId: string) => void;
  onCreatePage?: () => void;
  myPages?: PageItem[]; // Pass from parent
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
}

interface PageItem {
  id: string;
  title: string;
  icon: string;
  sharedCount?: number;
  permission_level?: string;
  created_at?: string;
  updated_at?: string;
}

export default function WorkspacePagesPanel({
  workspaceId,
  currentUserId,
  onPageClick,
  onDeletePage,
  onCreatePage,
  myPages = [],
  isCollapsed = false,
  onToggleCollapse,
  width = 400,
  onWidthChange,
}: WorkspacePagesPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [myPagesExpanded, setMyPagesExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [sharedPages, setSharedPages] = useState<PageItem[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);

  const { isOpen: isShareOpen, onOpen: onShareOpen, onClose: onShareClose } = useDisclosure();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('surface.highlight');

  // Load shared pages
  useEffect(() => {
    loadSharedPages();
  }, [workspaceId, currentUserId]);

  const loadSharedPages = async () => {
    try {
      const response = await fetch(
        `/api/workspace/permissions/shared-pages?user_id=${currentUserId}&workspace_id=${workspaceId}`,
        {
          headers: { 'x-user-id': currentUserId },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSharedPages(data.shared_pages || []);
      } else {
        // Don't use mock data - leave empty until real pages are shared
        console.log('No shared pages API available yet - will show empty state');
        setSharedPages([]);
      }
    } catch (error) {
      console.error('Failed to load shared pages:', error);
      // Don't use mock data on error
      setSharedPages([]);
    }
  };

  const handlePageClick = (pageId: string) => {
    setSelectedPageId(pageId);
    onPageClick?.(pageId);
  };

  const handleShareClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    setSelectedPageId(pageId);
    onShareOpen();
  };

  const getPermissionBadge = (level?: string) => {
    if (!level) return null;

    const colors: Record<string, string> = {
      full_access: 'purple',
      can_edit: 'blue',
      can_comment: 'green',
      can_view: 'gray',
    };

    const labels: Record<string, string> = {
      full_access: 'Full',
      can_edit: 'Edit',
      can_comment: 'Comment',
      can_view: 'View',
    };

    return (
      <Badge size="xs" colorScheme={colors[level]}>
        {labels[level]}
      </Badge>
    );
  };

  const filteredMyPages = myPages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedPages = sharedPages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, pageId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this page?')) {
      onDeletePage?.(pageId);
    }
  };

  return (
    <>
      <RetractablePanel
        title="Pages"
        icon={FiFileText}
        iconColor="blue.500"
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        width={width}
        onWidthChange={onWidthChange}
        side="left"
        minWidth={300}
        maxWidth={600}
        topOffset="150px"
        headerActions={
          <Button
            size="sm"
            leftIcon={<FiPlus />}
            variant="solid"
            bg={useSemanticToken('surface.raised')}
            color={useSemanticToken('text.primary')}
            borderColor={useSemanticToken('border.subtle')}
            borderWidth="1px"
            _hover={{ bg: useSemanticToken('surface.hover') }}
          >
            New Page
          </Button>
        }
      >
        <VStack align="stretch" spacing={3} p={3}>
          {/* Search */}
          <InputGroup size="sm">
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color={useSemanticToken('text.tertiary')} />
            </InputLeftElement>
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              bg={bgColor}
            />
          </InputGroup>

          <Divider />

          {/* My Pages Section */}
          {filteredMyPages.length > 0 && (
            <Box>
              <HStack
                px={2}
                py={2}
                cursor="pointer"
                onClick={() => setMyPagesExpanded(!myPagesExpanded)}
                _hover={{ bg: hoverBg }}
                borderRadius="md"
                transition="all 0.2s"
              >
                <Icon
                  as={myPagesExpanded ? FiChevronDown : FiChevronRight}
                  boxSize={4}
                  color={useSemanticToken('text.secondary')}
                />
                <Icon as={FiFileText} boxSize={4} color="purple.500" />
                <Text fontSize="sm" fontWeight="600" flex={1}>
                  My Pages
                </Text>
                <Badge colorScheme="purple" borderRadius="full" fontSize="xs">
                  {filteredMyPages.length}
                </Badge>
              </HStack>

              <Collapse in={myPagesExpanded} animateOpacity>
                <VStack align="stretch" spacing={1} mt={2}>
                  {filteredMyPages.map((page) => (
                    <HStack
                      key={page.id}
                      px={3}
                      py={2.5}
                      borderRadius="md"
                      cursor="pointer"
                      bg={selectedPageId === page.id ? selectedBg : 'transparent'}
                      _hover={{ bg: selectedPageId === page.id ? selectedBg : hoverBg }}
                      onClick={() => handlePageClick(page.id)}
                      onMouseEnter={() => setHoveredPageId(page.id)}
                      onMouseLeave={() => setHoveredPageId(null)}
                      transition="all 0.2s"
                      position="relative"
                    >
                      <Text fontSize="md">{getIconString(page.icon)}</Text>
                      <VStack align="start" spacing={0} flex={1} minW={0}>
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          noOfLines={1}
                          color={useSemanticToken('text.primary')}
                        >
                          {page.title}
                        </Text>
                      </VStack>

                      {/* Actions on hover */}
                      {hoveredPageId === page.id && (
                        <HStack spacing={1}>
                          <Tooltip label="Share" placement="top">
                            <IconButton
                              aria-label="Share page"
                              icon={<FiShare2 />}
                              size="xs"
                              variant="ghost"
                              onClick={(e) => handleShareClick(e, page.id)}
                            />
                          </Tooltip>
                          <Tooltip label="Delete" placement="top">
                            <IconButton
                              aria-label="Delete page"
                              icon={<Icon as={FiTrash2} />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={(e) => handleDeleteClick(e, page.id)}
                            />
                          </Tooltip>
                        </HStack>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}

          {/* Shared with me Section */}
          {filteredSharedPages.length > 0 && (
            <Box mt={4}>
              <HStack
                px={2}
                py={2}
                cursor="pointer"
                onClick={() => setSharedExpanded(!sharedExpanded)}
                _hover={{ bg: hoverBg }}
                borderRadius="md"
                transition="all 0.2s"
              >
                <Icon
                  as={sharedExpanded ? FiChevronDown : FiChevronRight}
                  boxSize={4}
                  color={useSemanticToken('text.secondary')}
                />
                <Icon as={FiUsers} boxSize={4} color="blue.500" />
                <Text fontSize="sm" fontWeight="600" flex={1}>
                  Shared with me
                </Text>
                <Badge colorScheme="blue" borderRadius="full" fontSize="xs">
                  {filteredSharedPages.length}
                </Badge>
              </HStack>

              <Collapse in={sharedExpanded} animateOpacity>
                <VStack align="stretch" spacing={1} mt={2}>
                  {filteredSharedPages.map((page) => (
                    <HStack
                      key={page.id}
                      px={3}
                      py={2.5}
                      borderRadius="md"
                      cursor="pointer"
                      bg={selectedPageId === page.id ? selectedBg : 'transparent'}
                      _hover={{ bg: selectedPageId === page.id ? selectedBg : hoverBg }}
                      onClick={() => handlePageClick(page.id)}
                      onMouseEnter={() => setHoveredPageId(page.id)}
                      onMouseLeave={() => setHoveredPageId(null)}
                      transition="all 0.2s"
                      position="relative"
                    >
                      <Text fontSize="md">{getIconString(page.icon)}</Text>
                      <VStack align="start" spacing={0} flex={1} minW={0}>
                        <Text
                          fontSize="sm"
                          fontWeight="500"
                          noOfLines={1}
                          color={useSemanticToken('text.primary')}
                        >
                          {page.title}
                        </Text>
                        <HStack spacing={2}>
                          {getPermissionBadge(page.permission_level)}
                          {page.sharedCount && (
                            <HStack spacing={1}>
                              <Icon as={FiUsers} boxSize={3} color={useSemanticToken('text.secondary')} />
                              <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                                {page.sharedCount}
                              </Text>
                            </HStack>
                          )}
                        </HStack>
                      </VStack>

                      {/* Share button on hover */}
                      {hoveredPageId === page.id && (
                        <Tooltip label="Share" placement="top">
                          <IconButton
                            aria-label="Share page"
                            icon={<FiShare2 />}
                            size="xs"
                            variant="ghost"
                            onClick={(e) => handleShareClick(e, page.id)}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  ))}
                </VStack>
              </Collapse>
            </Box>
          )}

          {/* Empty state */}
          {filteredMyPages.length === 0 && filteredSharedPages.length === 0 && (
            <Box textAlign="center" py={8}>
              <Icon as={FiFileText} boxSize={12} color={useSemanticToken('text.tertiary')} mb={3} />
              <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={4}>
                No pages yet
              </Text>
              <Text fontSize="xs" color={useSemanticToken('text.tertiary')}>
                Create your first page to get started
              </Text>
              {onCreatePage && (
                <Button size="sm" colorScheme="blue" mt={4} onClick={onCreatePage}>
                  Create Page
                </Button>
              )}
            </Box>
          )}
        </VStack>
      </RetractablePanel>

      {/* Share Modal */}
      {selectedPageId && (
        <ShareModal
          blockId={selectedPageId}
          isOpen={isShareOpen}
          onClose={onShareClose}
          currentUserId={currentUserId}
        />
      )}
    </>
  );
}

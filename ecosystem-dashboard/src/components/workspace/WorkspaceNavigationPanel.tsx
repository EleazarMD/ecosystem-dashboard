/**
 * WorkspaceNavigationPanel - Left panel for workspace navigation
 * Page tree, favorites, and workspace navigation
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Collapse,
  Tooltip,
} from '@chakra-ui/react';
import {
  SearchIcon,
  AddIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  StarIcon,
  CalendarIcon,
} from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PageTreeNode {
  id: string;
  title: string;
  type: 'page' | 'database';
  icon?: string;
  children?: PageTreeNode[];
  parent_id?: string;
}

interface WorkspaceNavigationPanelProps {
  workspaceId: string;
  currentPageId?: string;
}

export function WorkspaceNavigationPanel({
  workspaceId,
  currentPageId,
}: WorkspaceNavigationPanelProps) {
  const router = useRouter();
  const [pages, setPages] = useState<PageTreeNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const activeBg = useSemanticToken('surface.highlight');

  useEffect(() => {
    loadPages();
  }, [workspaceId]);

  const loadPages = async () => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        // TODO: Build tree structure from flat list
        setPages(data.pages || []);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    }
  };

  const toggleExpand = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const navigateToPage = (pageId: string, type: 'page' | 'database') => {
    if (type === 'database') {
      router.push(`/workspace/database/${pageId}`);
    } else {
      router.push(`/workspace/page/${pageId}`);
    }
  };

  const createNewPage = async () => {
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/blocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'page',
          properties: {
            title: [{ type: 'text', text: { content: 'Untitled' } }],
          },
          created_by: 'user',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        navigateToPage(data.block.id, 'page');
        loadPages();
      }
    } catch (error) {
      console.error('Error creating page:', error);
    }
  };

  const renderPageNode = (node: PageTreeNode, depth: number = 0) => {
    const isExpanded = expandedPages.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isActive = currentPageId === node.id;

    return (
      <Box key={node.id}>
        <HStack
          spacing={1}
          pl={depth * 4}
          pr={2}
          py={1.5}
          bg={isActive ? activeBg : undefined}
          _hover={{ bg: isActive ? activeBg : hoverBg }}
          cursor="pointer"
          borderRadius="md"
          onClick={() => navigateToPage(node.id, node.type)}
        >
          {/* Expand/collapse icon */}
          {hasChildren ? (
            <IconButton
              icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
              size="xs"
              variant="ghost"
              aria-label="Toggle"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            />
          ) : (
            <Box w="24px" />
          )}

          {/* Icon */}
          <Text fontSize="lg">
            {node.icon || (node.type === 'database' ? '📊' : '📄')}
          </Text>

          {/* Title */}
          <Text fontSize="sm" flex={1} noOfLines={1}>
            {node.title}
          </Text>

          {/* Actions (show on hover) */}
          <HStack spacing={0} opacity={0} _groupHover={{ opacity: 1 }}>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<AddIcon />}
                size="xs"
                variant="ghost"
                aria-label="Add"
                onClick={(e) => e.stopPropagation()}
              />
              <MenuList>
                <MenuItem>New page</MenuItem>
                <MenuItem>New database</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </HStack>

        {/* Children */}
        {hasChildren && (
          <Collapse in={isExpanded} animateOpacity>
            <VStack spacing={0} align="stretch">
              {node.children!.map((child) => renderPageNode(child, depth + 1))}
            </VStack>
          </Collapse>
        )}
      </Box>
    );
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <VStack
      spacing={0}
      align="stretch"
      h="100%"
      bg={bgColor}
      borderRightWidth="1px"
      borderColor={borderColor}
    >
      {/* Header */}
      <VStack spacing={3} p={4} borderBottomWidth="1px" borderColor={borderColor}>
        {/* Search */}
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color={useSemanticToken('text.tertiary')} />
          </InputLeftElement>
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </InputGroup>

        {/* Quick Actions */}
        <HStack spacing={2} width="full">
          <Button
            size="sm"
            leftIcon={<AddIcon />}
            colorScheme="blue"
            flex={1}
            onClick={createNewPage}
          >
            New page
          </Button>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={<AddIcon />}
              size="sm"
              variant="outline"
              aria-label="More"
            />
            <MenuList>
              <MenuItem>New database</MenuItem>
              <MenuItem>Import</MenuItem>
              <MenuItem>Templates</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </VStack>

      {/* Quick Links */}
      <VStack spacing={1} p={3} align="stretch">
        <Button
          size="sm"
          variant="ghost"
          justifyContent="flex-start"
          leftIcon={<StarIcon />}
        >
          Favorites
        </Button>
        <Button
          size="sm"
          variant="ghost"
          justifyContent="flex-start"
          leftIcon={<CalendarIcon />}
        >
          Recent
        </Button>
      </VStack>

      {/* Page Tree */}
      <VStack
        spacing={0}
        align="stretch"
        flex={1}
        overflowY="auto"
        px={3}
        pb={3}
      >
        <Text
          fontSize="xs"
          fontWeight="bold"
          color={useSemanticToken('text.secondary')}
          textTransform="uppercase"
          mb={2}
        >
          Pages
        </Text>

        {filteredPages.length === 0 ? (
          <Box p={8} textAlign="center">
            <Text fontSize="4xl" mb={2}>
              📄
            </Text>
            <Text fontSize="sm" color={useSemanticToken('text.secondary')} mb={3}>
              No pages yet
            </Text>
            <Button size="sm" colorScheme="blue" onClick={createNewPage}>
              Create first page
            </Button>
          </Box>
        ) : (
          filteredPages.map((page) => renderPageNode(page))
        )}
      </VStack>

      {/* Footer */}
      <HStack
        p={3}
        borderTopWidth="1px"
        borderColor={borderColor}
        spacing={2}
      >
        <Button size="sm" variant="ghost" flex={1}>
          Templates
        </Button>
        <Button size="sm" variant="ghost" flex={1}>
          Trash
        </Button>
      </HStack>
    </VStack>
  );
}

export default WorkspaceNavigationPanel;

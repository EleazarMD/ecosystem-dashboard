/**
 * Workspace Sidebar Component
 * Left navigation with private pages and "Shared with me" section
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  Divider,
  Collapse,
  useDisclosure,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiPlus,
  FiSettings,
  FiFileText,
  FiTrash,
  FiChevronDown,
  FiChevronRight,
  FiUsers,
  FiX,
  FiMoreVertical,
  FiArchive,
  FiHome,
  FiInbox,
} from 'react-icons/fi';
import { InviteMembersModal } from './InviteMembersModal';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface WorkspaceSidebarProps {
  workspaceId: string;
  currentUserId: string;
  onPageClick?: (pageId: string) => void;
}

interface PageItem {
  id: string;
  title: string;
  icon: string;
  sharedCount?: number;
}

interface SharedPageItem extends PageItem {
  sharedCount: number;
}

export function WorkspaceSidebar({ workspaceId, currentUserId, onPageClick }: WorkspaceSidebarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [privatePages, setPrivatePages] = useState<PageItem[]>([]);
  const [sharedPages, setSharedPages] = useState<SharedPageItem[]>([]);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [conversationCount, setConversationCount] = useState(0);
  
  const [showPrivate, setShowPrivate] = useState(true);
  const [showShared, setShowShared] = useState(true);
  const [showConversations, setShowConversations] = useState(true);
  const [showInviteCard, setShowInviteCard] = useState(true);
  
  // Section expand/collapse state
  const [privateExpanded, setPrivateExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [conversationsExpanded, setConversationsExpanded] = useState(true);
  
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();
  const toast = useToast();

  // Load pages and conversations on mount
  useEffect(() => {
    loadPrivatePages();
    loadSharedPages();
    loadConversations();
  }, [workspaceId, currentUserId]);

  // AUTO-REFRESH DISABLED - causing infinite reload
  // TODO: Implement with WebSocket or manual refresh button
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     loadPrivatePages();
  //     loadSharedPages();
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, []);

  const loadPrivatePages = async () => {
    try {
      const response = await fetch(
        `/api/workspace/pages?workspace_id=${workspaceId}&limit=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        const pages = (data.pages || []).map((page: any) => ({
          id: page.id,
          title: page.properties?.title || 'Untitled',
          icon: page.properties?.icon || '📄',
        }));
        
        // Only update if pages actually changed
        setPrivatePages(prevPages => {
          const prevIds = prevPages.map(p => p.id).sort().join(',');
          const newIds = pages.map((p: PageItem) => p.id).sort().join(',');
          
          if (prevIds === newIds) {
            console.log('[Sidebar] No new pages, skipping update');
            return prevPages;
          }
          
          console.log('[Sidebar] Pages updated:', pages.length);
          return pages;
        });
      }
    } catch (error) {
      console.error('Failed to load private pages:', error);
      // Fallback to mock data on error
      setPrivatePages([
        { id: '1', title: 'Getting Started', icon: '📄' },
        { id: '2', title: 'Personal Home', icon: '🏠' },
      ]);
    }
  };

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
      }
    } catch (error) {
      console.error('Failed to load shared pages:', error);
      // Mock data for demo
      setSharedPages([
        { id: 'shared-1', title: 'Team Project Plan', icon: '📄', sharedCount: 3 },
        { id: 'shared-2', title: 'Q4 Roadmap', icon: '📊', sharedCount: 5 },
        { id: 'shared-3', title: 'Meeting Notes', icon: '📝', sharedCount: 2 },
      ]);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/workspace-ai/conversations?limit=5');
      if (response.ok) {
        const data = await response.json();
        setRecentConversations(data.conversations || []);
        setConversationCount(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      // Set empty state on error
      setRecentConversations([]);
      setConversationCount(0);
    }
  };
  
  const handleDeleteConversation = async (convId: string, convTitle: string) => {
    try {
      const response = await fetch(`/api/workspace-ai/conversations/${convId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast({
          title: 'Conversation deleted',
          description: `"${convTitle}" has been deleted`,
          status: 'success',
          duration: 3000,
        });
        // Refresh conversations list
        loadConversations();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  const handleArchiveConversation = async (convId: string, convTitle: string) => {
    // TODO: Implement archive functionality in API
    toast({
      title: 'Archive (Coming Soon)',
      description: `Archive functionality will be available soon`,
      status: 'info',
      duration: 3000,
    });
  };

  const filteredPrivatePages = privatePages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSharedPages = sharedPages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box
      w="260px"
      h="100vh"
      bg={useSemanticToken('surface.base')}
      borderRight="1px"
      borderColor={useSemanticToken('border.default')}
      display="flex"
      flexDirection="column"
      position="fixed"
      left={0}
      top={0}
      zIndex={10}
    >
      {/* Workspace Header */}
      <HStack px={2} py={2} justify="space-between" borderBottom="1px" borderColor={useSemanticToken('border.default')}>
        <Text fontSize="xs" fontWeight="600" noOfLines={1}>
          AI Homelab
        </Text>
        <HStack spacing={0.5}>
          <IconButton
            aria-label="Settings"
            icon={<FiSettings />}
            size="xs"
            variant="ghost"
          />
          <IconButton
            aria-label="New page"
            icon={<FiPlus />}
            size="xs"
            variant="ghost"
          />
        </HStack>
      </HStack>

      {/* Search */}
      <Box px={2} py={1}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none" h="28px">
            <FiSearch color="gray" size={12} />
          </InputLeftElement>
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            bg={useSemanticToken('surface.elevated')}
            borderRadius="md"
            fontSize="xs"
            h="28px"
          />
        </InputGroup>
      </Box>

      {/* Main Navigation */}
      <VStack align="stretch" spacing={0} px={1.5}>
        <SidebarLink icon={FiHome} label="Home" />
        <SidebarLink icon={FiUsers} label="DashAI" />
        <SidebarLink icon={FiInbox} label="Inbox" badge={3} />
      </VStack>

      <Box h="1px" bg={useSemanticToken('surface.elevated')} my={0.5} />

      {/* Scrollable Content */}
      <Box 
        flex={1} 
        overflowY="auto" 
        px={1.5}
        pt={0.5}
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
        {/* Private Section */}
        <SidebarSection
          title="Private"
          expanded={privateExpanded}
          onToggle={() => setPrivateExpanded(!privateExpanded)}
        >
          {filteredPrivatePages.map(page => (
            <PageItem
              key={page.id}
              icon={page.icon}
              title={page.title}
              onClick={() => onPageClick?.(page.id)}
            />
          ))}
        </SidebarSection>

        {filteredSharedPages.length > 0 && (
          <>
            <Box h="1px" bg={useSemanticToken('surface.elevated')} my={0.5} />
            
            {/* Shared Section */}
            <SidebarSection
              title="Shared with me"
              expanded={sharedExpanded}
              onToggle={() => setSharedExpanded(!sharedExpanded)}
              count={filteredSharedPages.length}
            >
              {filteredSharedPages.map(page => (
                <PageItem
                  key={page.id}
                  icon={page.icon}
                  title={page.title}
                  sharedCount={page.sharedCount}
                  onClick={() => onPageClick?.(page.id)}
                />
              ))}
            </SidebarSection>
          </>
        )}

        {/* AI Conversations Section */}
        <Box h="1px" bg={useSemanticToken('surface.elevated')} my={0.5} />
        <SidebarSection
          title="AI Conversations"
          expanded={conversationsExpanded}
          onToggle={() => setConversationsExpanded(!conversationsExpanded)}
          count={conversationCount}
        >
          {/* New Conversation Button */}
          <Button
            size="xs"
            leftIcon={<FiPlus />}
            colorScheme="blue"
            variant="ghost"
            w="full"
            justifyContent="flex-start"
            mb={0}
            fontSize="xs"
            h="24px"
            onClick={() => router.push('/workspace?view=ai', undefined, { shallow: true })}
          >
            New Conversation
          </Button>

          {/* Recent Conversations */}
          {recentConversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversationId={conv.id}
              title={conv.title || 'Untitled Chat'}
              onClick={() => router.push(`/workspace?view=ai&conversation=${conv.id}`, undefined, { shallow: true })}
              onDelete={() => handleDeleteConversation(conv.id, conv.title || 'Untitled Chat')}
              onArchive={() => handleArchiveConversation(conv.id, conv.title || 'Untitled Chat')}
            />
          ))}

          {conversationCount > 5 && (
            <Button
              size="xs"
              variant="link"
              w="full"
              justifyContent="flex-start"
              onClick={() => router.push('/workspace?view=ai&showAll=true', undefined, { shallow: true })}
              mt={0}
              fontSize="xs"
              h="24px"
            >
              View all {conversationCount} conversations →
            </Button>
          )}

          {conversationCount === 0 && (
            <Text fontSize="2xs" color={useSemanticToken('text.secondary')} px={2} py={0.5}>
              No conversations yet
            </Text>
          )}
        </SidebarSection>
      </Box>

      {/* Bottom Actions */}
      <VStack align="stretch" spacing={0} px={1.5} pb={2} pt={0.5} borderTop="1px" borderColor={useSemanticToken('border.default')}>
        <SidebarLink icon={FiSettings} label="Settings" />
        <SidebarLink icon={FiFileText} label="Templates" />
        <SidebarLink icon={FiTrash} label="Trash" />
      </VStack>

      {/* Invite Members Card */}
      {showInviteCard && (
        <Box mx={2} mb={2} p={2} bg="blue.50" borderRadius="md" position="relative">
          <IconButton
            aria-label="Close"
            icon={<FiX />}
            size="xs"
            variant="ghost"
            position="absolute"
            top={1}
            right={1}
            onClick={() => setShowInviteCard(false)}
          />
          <HStack align="start" spacing={1.5}>
            <Icon as={FiUsers} boxSize={4} color="blue.600" mt={0.5} />
            <VStack align="start" spacing={0.5} flex={1}>
              <Text fontSize="xs" fontWeight="600" color="blue.900">
                Invite members
              </Text>
              <Text fontSize="2xs" color="blue.700">
                Collaborate with your team.
              </Text>
              <Button
                size="xs"
                colorScheme="blue"
                onClick={onInviteOpen}
                mt={0.5}
                fontSize="xs"
                h="20px"
              >
                Invite
              </Button>
            </VStack>
          </HStack>
        </Box>
      )}

      {/* Invite Modal */}
      <InviteMembersModal
        workspaceId={workspaceId}
        isOpen={isInviteOpen}
        onClose={onInviteClose}
        currentUserId={currentUserId}
      />
    </Box>
  );
}

// Helper Components

interface SidebarLinkProps {
  icon: any;
  label: string;
  badge?: number;
  onClick?: () => void;
}

function SidebarLink({ icon, label, badge, onClick }: SidebarLinkProps) {
  return (
    <HStack
      px={2}
      py={0.5}
      borderRadius="md"
      cursor="pointer"
      _hover={{ bg: 'gray.100' }}
      onClick={onClick}
      minH="26px"
    >
      <Icon as={icon} boxSize={3.5} />
      <Text fontSize="xs" flex={1} lineHeight="1.2">
        {label}
      </Text>
      {badge !== undefined && badge > 0 && (
        <Badge colorScheme="red" size="sm" borderRadius="full">
          {badge}
        </Badge>
      )}
    </HStack>
  );
}

interface SidebarSectionProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  count?: number;
}

function SidebarSection({ title, expanded, onToggle, children, count }: SidebarSectionProps) {
  return (
    <Box mt={0.5}>
      <HStack
        px={2}
        py={0.5}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ bg: 'gray.100' }}
        borderRadius="md"
        minH="24px"
      >
        <Icon as={expanded ? FiChevronDown : FiChevronRight} boxSize={2.5} />
        <Text fontSize="2xs" fontWeight="600" color={useSemanticToken('text.secondary')} textTransform="uppercase" flex={1} lineHeight="1.2">
          {title}
        </Text>
        {count !== undefined && count > 0 && (
          <Badge size="sm" colorScheme="gray" borderRadius="full" fontSize="2xs" px={1.5} py={0}>
            {count}
          </Badge>
        )}
      </HStack>
      <Collapse in={expanded} animateOpacity>
        <VStack align="stretch" spacing={0} mt={0}>
          {children}
        </VStack>
      </Collapse>
    </Box>
  );
}

interface PageItemProps {
  icon: string | { type?: string; emoji?: string };
  title: string;
  sharedCount?: number;
  onClick?: () => void;
}

function PageItem({ icon, title, sharedCount, onClick }: PageItemProps) {
  // Safely extract icon string
  const iconStr = typeof icon === 'object' && icon?.emoji ? icon.emoji : (typeof icon === 'string' ? icon : '📄');
  
  return (
    <HStack
      px={2}
      py={0.5}
      ml={3}
      borderRadius="md"
      cursor="pointer"
      _hover={{ bg: 'gray.100' }}
      onClick={onClick}
      minH="24px"
    >
      <Text fontSize="xs">{iconStr}</Text>
      <Text fontSize="xs" flex={1} noOfLines={1} lineHeight="1.2">
        {title}
      </Text>
      {sharedCount !== undefined && sharedCount > 0 && (
        <HStack spacing={1}>
          <Icon as={FiUsers} boxSize={2.5} color={useSemanticToken('text.secondary')} />
          <Text fontSize="2xs" color={useSemanticToken('text.secondary')}>
            {sharedCount}
          </Text>
        </HStack>
      )}
    </HStack>
  );
}

interface ConversationItemProps {
  conversationId: string;
  title: string;
  onClick: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

function ConversationItem({ conversationId, title, onClick, onDelete, onArchive }: ConversationItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  
  const handleConfirmDelete = () => {
    onClose();
    onDelete();
  };
  
  return (
    <>
      <HStack
        px={2}
        py={0.5}
        ml={3}
        borderRadius="md"
        cursor="pointer"
        _hover={{ bg: 'gray.100' }}
        position="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        minH="24px"
      >
        {/* Conversation Title (clickable) */}
        <HStack flex={1} onClick={onClick} spacing={1.5} minW={0}>
          <Text fontSize="xs">💬</Text>
          <Text fontSize="xs" flex={1} noOfLines={1} lineHeight="1.2">
            {title}
          </Text>
        </HStack>
        
        {/* Delete Button */}
        <Button
          size="xs"
          colorScheme="red"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          flexShrink={0}
        >
          🗑️
        </Button>
      </HStack>

      {/* Inline Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
        isCentered
        size="sm"
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Conversation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete <strong>"{title}"</strong>? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose} size="sm">
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmDelete} ml={3} size="sm">
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}

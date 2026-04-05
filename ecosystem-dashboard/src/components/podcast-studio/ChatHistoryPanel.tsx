import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  VStack,
  HStack,
  Box,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Badge,
  Collapse,
  Button,
  Tooltip,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { 
  FiSearch, 
  FiClock, 
  FiTrash2, 
  FiDownload, 
  FiChevronDown,
  FiChevronRight,
  FiMessageSquare,
  FiMoreVertical,
} from 'react-icons/fi';
import {
  getAllConversations,
  getProjectConversations,
  searchConversations,
  deleteConversation,
  exportConversationToMarkdown,
  clearAllHistory,
  getChatHistoryStats,
  type ChatConversation,
} from '@/lib/chat-history';

interface ChatHistoryPanelProps {
  projectId?: string;
  onLoadConversation?: (conversation: ChatConversation) => void;
}

export default function ChatHistoryPanel({ projectId, onLoadConversation }: ChatHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConvId, setDeleteConvId] = useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.hover');
  const cardBg = useSemanticToken('surface.base');

  // Load conversations
  useEffect(() => {
    loadConversations();
  }, [projectId, searchQuery]);

  const loadConversations = () => {
    if (searchQuery.trim()) {
      setConversations(searchConversations(searchQuery, projectId));
    } else if (projectId) {
      setConversations(getProjectConversations(projectId));
    } else {
      setConversations(getAllConversations());
    }
  };

  const toggleExpanded = (convId: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(convId)) {
        newSet.delete(convId);
      } else {
        newSet.add(convId);
      }
      return newSet;
    });
  };

  const handleDelete = (convId: string) => {
    setDeleteConvId(convId);
    onOpen();
  };

  const confirmDelete = () => {
    if (deleteConvId) {
      deleteConversation(deleteConvId);
      loadConversations();
      toast({
        title: 'Conversation deleted',
        status: 'success',
        duration: 2000,
      });
    }
    onClose();
    setDeleteConvId(null);
  };

  const handleExport = (conv: ChatConversation) => {
    const markdown = exportConversationToMarkdown(conv);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conv.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Conversation exported',
      status: 'success',
      duration: 2000,
    });
  };

  const handleClearAll = () => {
    if (confirm('Delete all chat history? This cannot be undone.')) {
      clearAllHistory();
      loadConversations();
      toast({
        title: 'All history cleared',
        status: 'info',
        duration: 2000,
      });
    }
  };

  const stats = getChatHistoryStats();
  const groupedByDate = groupConversationsByDate(conversations);

  return (
    <VStack spacing={0} align="stretch" h="full">
      {/* Header */}
      <HStack justify="space-between" px={4} py={3} borderBottomWidth="1px" borderColor={borderColor}>
        <HStack spacing={2}>
          <FiClock />
          <Text fontSize="14px" fontWeight="600" color={textColor}>
            Chat History
          </Text>
          <Badge colorScheme="blue" fontSize="10px">
            {stats.totalConversations}
          </Badge>
        </HStack>
        
        <Tooltip label="Clear all history">
          <IconButton
            aria-label="Clear history"
            icon={<FiTrash2 />}
            size="sm"
            variant="ghost"
            onClick={handleClearAll}
            isDisabled={conversations.length === 0}
          />
        </Tooltip>
      </HStack>

      {/* Search */}
      <Box px={4} py={3} borderBottomWidth="1px" borderColor={borderColor}>
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <FiSearch color={mutedColor} />
          </InputLeftElement>
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            borderRadius="lg"
          />
        </InputGroup>
      </Box>

      {/* Conversations List */}
      <VStack 
        spacing={0} 
        align="stretch" 
        flex="1" 
        overflowY="auto"
        px={2}
        py={2}
      >
        {conversations.length === 0 ? (
          <Box textAlign="center" py={8} px={4}>
            <FiMessageSquare size={32} color={mutedColor} style={{ margin: '0 auto' }} />
            <Text fontSize="sm" color={mutedColor} mt={3}>
              {searchQuery ? 'No conversations found' : 'No chat history yet'}
            </Text>
            <Text fontSize="xs" color={mutedColor} mt={1}>
              {searchQuery ? 'Try a different search term' : 'Start chatting to build your history'}
            </Text>
          </Box>
        ) : (
          Object.entries(groupedByDate).map(([date, convs]) => (
            <Box key={date} mb={3}>
              <Text fontSize="11px" fontWeight="600" color={mutedColor} px={2} mb={2}>
                {date}
              </Text>
              
              {convs.map((conv) => (
                <Box
                  key={conv.id}
                  mb={2}
                  bg={bgColor}
                  borderRadius="lg"
                  border="1px solid"
                  borderColor={borderColor}
                  overflow="hidden"
                  transition="all 0.2s"
                  _hover={{ boxShadow: 'sm', borderColor: 'blue.300' }}
                >
                  <HStack
                    px={3}
                    py={2}
                    cursor="pointer"
                    onClick={() => toggleExpanded(conv.id)}
                    _hover={{ bg: hoverBg }}
                  >
                    <IconButton
                      aria-label="Expand"
                      icon={expandedIds.has(conv.id) ? <FiChevronDown /> : <FiChevronRight />}
                      size="xs"
                      variant="ghost"
                    />
                    
                    <VStack align="start" spacing={0} flex="1" minW={0}>
                      <Text fontSize="13px" fontWeight="500" color={textColor} noOfLines={1}>
                        {conv.title}
                      </Text>
                      <HStack spacing={2} fontSize="10px" color={mutedColor}>
                        <Text>{conv.messageCount} messages</Text>
                        <Text>•</Text>
                        <Text>{new Date(conv.updatedAt).toLocaleTimeString()}</Text>
                      </HStack>
                    </VStack>

                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        size="xs"
                        variant="ghost"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <MenuList fontSize="sm">
                        <MenuItem
                          icon={<FiMessageSquare />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadConversation?.(conv);
                          }}
                        >
                          Load Conversation
                        </MenuItem>
                        <MenuItem
                          icon={<FiDownload />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(conv);
                          }}
                        >
                          Export as Markdown
                        </MenuItem>
                        <MenuItem
                          icon={<FiTrash2 />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conv.id);
                          }}
                          color="red.500"
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </HStack>

                  <Collapse in={expandedIds.has(conv.id)} animateOpacity>
                    <Box px={3} pb={3} pt={1} borderTopWidth="1px" borderColor={borderColor}>
                      <VStack spacing={2} align="stretch">
                        {conv.messages.slice(0, 3).map((msg, idx) => (
                          <Box
                            key={idx}
                            p={2}
                            bg={cardBg}
                            border="1px solid"
                            borderColor={msg.role === 'user' ? 'blue.500' : borderColor}
                            borderRadius="md"
                          >
                            <HStack spacing={2} mb={1}>
                              <Badge size="xs" colorScheme={msg.role === 'user' ? 'blue' : 'green'}>
                                {msg.role === 'user' ? 'You' : 'AI'}
                              </Badge>
                              <Text fontSize="9px" color={mutedColor}>
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </Text>
                            </HStack>
                            <Text fontSize="11px" color={textColor} noOfLines={2}>
                              {msg.content}
                            </Text>
                          </Box>
                        ))}
                        
                        {conv.messages.length > 3 && (
                          <Text fontSize="10px" color={mutedColor} textAlign="center">
                            +{conv.messages.length - 3} more messages
                          </Text>
                        )}
                      </VStack>
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </Box>
          ))
        )}
      </VStack>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Conversation
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure? This conversation will be permanently deleted.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </VStack>
  );
}

/**
 * Group conversations by relative date (Today, Yesterday, This Week, etc.)
 */
function groupConversationsByDate(conversations: ChatConversation[]): Record<string, ChatConversation[]> {
  const groups: Record<string, ChatConversation[]> = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'This Month': [],
    'Older': [],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  conversations.forEach(conv => {
    const convDate = new Date(conv.updatedAt);

    if (convDate >= todayStart) {
      groups['Today'].push(conv);
    } else if (convDate >= yesterdayStart) {
      groups['Yesterday'].push(conv);
    } else if (convDate >= weekStart) {
      groups['This Week'].push(conv);
    } else if (convDate >= monthStart) {
      groups['This Month'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}

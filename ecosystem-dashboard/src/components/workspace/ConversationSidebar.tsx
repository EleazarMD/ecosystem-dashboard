import React from 'react';
import {
  Box,
  VStack,
  Text,
  HStack,
  Icon,
  IconButton,
  Divider,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiMessageSquare, FiTrash2, FiMoreVertical, FiPlus, FiClock } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { format, isToday, isYesterday, subDays, isAfter } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  updatedAt: Date;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}: ConversationSidebarProps) {
  const bg = useSemanticToken('surface.default');
  const borderColor = useSemanticToken('border.subtle');
  const hoverBg = useSemanticToken('surface.hover');
  const activeBg = useSemanticToken('surface.highlight');
  const activeBorder = 'blue.500';
  const textColor = useSemanticToken('text.primary');
  const secondaryTextColor = useSemanticToken('text.secondary');

  // Group conversations by date
  const groupedConversations = React.useMemo(() => {
    const groups: Record<string, Conversation[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    conversations.forEach((conv) => {
      const date = new Date(conv.updatedAt);
      if (isToday(date)) {
        groups.Today.push(conv);
      } else if (isYesterday(date)) {
        groups.Yesterday.push(conv);
      } else if (isAfter(date, sevenDaysAgo)) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  }, [conversations]);

  return (
    <Box
      w="260px"
      h="full"
      borderRight="1px solid"
      borderColor={borderColor}
      bg={bg}
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
        <Button
          w="full"
          leftIcon={<FiPlus />}
          colorScheme="blue"
          variant="solid"
          size="sm"
          onClick={onNewConversation}
        >
          New Chat
        </Button>
      </Box>

      {/* Conversation List */}
      <VStack
        flex={1}
        overflowY="auto"
        spacing={6}
        p={4}
        align="stretch"
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'gray.300', borderRadius: '2px' },
        }}
      >
        {Object.entries(groupedConversations).map(([group, convs]) => {
          if (convs.length === 0) return null;

          return (
            <Box key={group}>
              <Text
                fontSize="xs"
                fontWeight="bold"
                color={secondaryTextColor}
                textTransform="uppercase"
                mb={2}
                px={2}
              >
                {group}
              </Text>
              <VStack spacing={1} align="stretch">
                {convs.map((conv) => {
                  const isActive = conv.id === currentConversationId;
                  return (
                    <Box
                      key={conv.id}
                      position="relative"
                      role="group"
                      borderRadius="md"
                      bg={isActive ? activeBg : 'transparent'}
                      _hover={{ bg: isActive ? activeBg : hoverBg }}
                      transition="background 0.2s"
                    >
                      <HStack
                        w="full"
                        px={3}
                        py={2}
                        cursor="pointer"
                        onClick={() => onSelectConversation(conv.id)}
                        spacing={3}
                      >
                        <Icon
                          as={FiMessageSquare}
                          color={isActive ? activeBorder : secondaryTextColor}
                          boxSize={4}
                        />
                        <Text
                          fontSize="sm"
                          color={isActive ? textColor : secondaryTextColor}
                          fontWeight={isActive ? '500' : 'normal'}
                          noOfLines={1}
                          flex={1}
                        >
                          {conv.title || 'Untitled Conversation'}
                        </Text>
                      </HStack>

                      {/* Context Menu */}
                      <Box
                        position="absolute"
                        right={1}
                        top="50%"
                        transform="translateY(-50%)"
                        opacity={0}
                        _groupHover={{ opacity: 1 }}
                        transition="opacity 0.2s"
                      >
                        <Menu placement="bottom-end">
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            size="xs"
                            variant="ghost"
                            aria-label="Options"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <MenuList minW="120px" fontSize="sm">
                            <MenuItem
                              icon={<FiTrash2 />}
                              color="red.500"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteConversation(conv.id);
                              }}
                            >
                              Delete
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Box>
                    </Box>
                  );
                })}
              </VStack>
            </Box>
          );
        })}
      </VStack>
    </Box>
  );
}

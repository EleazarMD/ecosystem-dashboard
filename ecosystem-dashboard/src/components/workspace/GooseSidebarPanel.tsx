/**
 * Goose Sidebar Panel - Wrapper for Page Agent in Sidebar Mode
 * Provides header/controls and delegates all agent logic to GooseAgentCore
 */

import React from 'react';
import {
  Box,
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { FiMaximize2, FiEdit3, FiChevronDown, FiX, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { GooseAgentCore, GooseAgentCoreRef } from './GooseAgentCore';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassButton, GlassIconButton } from '@/components/design-system/GlassComponents';
import { Text, Divider } from '@chakra-ui/react';

interface GooseSidebarPanelProps {
  onClose: () => void;
  onSwitchToFloating: () => void;
  pageId: string;
  pageTitle: string;
  blockModelRef?: any;
  mcpServers?: any;
  onPageUpdate?: () => void;
  onStreamingChunk?: (chunk: string) => void;
}

export const GooseSidebarPanel: React.FC<GooseSidebarPanelProps> = ({
  onClose,
  onSwitchToFloating,
  pageId,
  pageTitle,
  blockModelRef,
  mcpServers,
  onPageUpdate,
  onStreamingChunk,
}) => {
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const bgColor = useSemanticToken('surface.elevated');
  const agentCoreRef = React.useRef<GooseAgentCoreRef>(null);

  interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    category: 'today' | 'week' | 'month';
  }

  // Mock chat sessions for dropdown (mirrored from GooseFloatingPanel)
  const [chatSessions] = React.useState<ChatSession[]>([
    { id: '1', title: 'Page editing workflow', timestamp: Date.now(), category: 'today' },
    { id: '2', title: 'Content structure ideas', timestamp: Date.now() - 86400000, category: 'week' },
    { id: '3', title: 'Database schema design', timestamp: Date.now() - 172800000, category: 'week' },
    { id: '4', title: 'API integration help', timestamp: Date.now() - 2592000000, category: 'month' },
  ]);

  return (
    <Box h="100%" display="flex" flexDirection="column" bg={useSemanticToken('surface.elevated')}>
      {/* Header - Matches floating panel style */}
      <HStack
        p={3}
        borderBottom="1px"
        borderColor={borderColor}
        justify="space-between"
      >
        {/* Chat Sessions Dropdown */}
        <Menu>
          <MenuButton
            as={GlassButton}
            rightIcon={<FiChevronDown />}
            fontWeight="medium"
            fontSize="sm"
            px={3}
            h="32px"
            glassOptions={{ intensity: 0.1 }}
            bg="transparent"
            _hover={{ bg: 'rgba(0,0,0,0.05)' }}
            _active={{ bg: 'rgba(0,0,0,0.1)' }}
            color={useSemanticToken('text.secondary')}
          >
            New AI chat
          </MenuButton>
          <MenuList
            maxH="400px"
            overflowY="auto"
            zIndex={1001}
            bg={bgColor}
            borderColor={borderColor}
            boxShadow="lg"
            borderRadius="xl"
            p={2}
          >
            <MenuItem
              icon={<FiTrash2 />}
              onClick={() => {
                if (agentCoreRef.current) {
                  agentCoreRef.current.clearMessages();
                }
              }}
              color="red.500"
              fontSize="sm"
              borderRadius="md"
              _hover={{ bg: 'red.50' }}
              mb={1}
            >
              Clear conversation
            </MenuItem>
            <Divider my={1} borderColor={borderColor} opacity={0.5} />
            {/* Today */}
            <Box px={3} py={2}>
              <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} letterSpacing="wide" textTransform="uppercase">
                Today
              </Text>
            </Box>
            {chatSessions
              .filter(s => s.category === 'today')
              .map(s => (
                <MenuItem
                  key={s.id}
                  fontSize="sm"
                  borderRadius="md"
                  _hover={{ bg: hoverBg }}
                  mb={1}
                >
                  {s.title}
                </MenuItem>
              ))}

            {/* Previous 7 days */}
            <Box px={3} py={2} mt={2}>
              <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} letterSpacing="wide" textTransform="uppercase">
                Previous 7 days
              </Text>
            </Box>
            {chatSessions
              .filter(s => s.category === 'week')
              .map(s => (
                <MenuItem
                  key={s.id}
                  fontSize="sm"
                  borderRadius="md"
                  _hover={{ bg: hoverBg }}
                  mb={1}
                >
                  {s.title}
                </MenuItem>
              ))}

            {/* Previous 30 days */}
            <Box px={3} py={2} mt={2}>
              <Text fontSize="xs" fontWeight="bold" color={useSemanticToken('text.secondary')} letterSpacing="wide" textTransform="uppercase">
                Previous 30 days
              </Text>
            </Box>
            {chatSessions
              .filter(s => s.category === 'month')
              .map(s => (
                <MenuItem
                  key={s.id}
                  fontSize="sm"
                  borderRadius="md"
                  _hover={{ bg: hoverBg }}
                  mb={1}
                >
                  {s.title}
                </MenuItem>
              ))}
          </MenuList>
        </Menu>

        {/* Action Icons */}
        <HStack spacing={1}>
          {/* Switch to Floating */}
          <GlassIconButton
            icon={<FiMaximize2 />}
            aria-label="Switch to floating"
            size="sm"
            glassOptions={{ intensity: 0.2 }}
            onClick={onSwitchToFloating}
            title="Switch to floating window"
            color={useSemanticToken('text.secondary')}
          />

          {/* Close */}
          <GlassIconButton
            icon={<FiX />}
            aria-label="Close"
            size="sm"
            glassOptions={{ intensity: 0.2 }}
            onClick={onClose}
            color={useSemanticToken('text.secondary')}
          />
        </HStack>
      </HStack>

      {/* Content - Fully self-contained GooseAgentCore */}
      <Box flex="1" overflow="hidden">
        <GooseAgentCore
          ref={agentCoreRef}
          pageTitle={pageTitle}
          pageId={pageId}
          mode="sidebar"
          blockModelRef={blockModelRef}
          onPageUpdate={onPageUpdate}
          onStreamingChunk={onStreamingChunk}
          mcpServers={mcpServers}
        />
      </Box>
    </Box>
  );
};

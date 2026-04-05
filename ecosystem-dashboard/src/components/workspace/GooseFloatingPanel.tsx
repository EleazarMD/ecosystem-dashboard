/**
 * Goose Floating AI Panel - Notion Style
 * Compact floating panel in bottom-right corner
 * Provides header/controls and delegates all agent logic to GooseAgentCore
 */

import React, { useState } from 'react';
import {
  Box,
  HStack,
  Text,
  IconButton,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiX,
  FiMaximize2,
  FiEdit3,
  FiChevronDown,
  FiMessageSquare,
  FiTrash2,
  FiSidebar,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { GooseAgentCore, GooseAgentCoreRef } from './GooseAgentCore';
import { BlockModel } from '@/lib/editor/BlockModel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { GlassButton, GlassIconButton } from '@/components/design-system/GlassComponents';

interface GooseFloatingPanelProps {
  onClose: () => void;
  onSwitchToSidebar: () => void;
  pageId: string;
  pageTitle: string;
  blockModelRef?: React.RefObject<BlockModel | null>;
  onPageUpdate?: () => void; // Callback to refresh page after Goose makes changes
  onStreamingChunk?: (chunk: string) => void; // Callback for streaming text
  mcpServers?: {
    workspace: boolean;
    notion: boolean;
    github: boolean;
    filesystem: boolean;
    knowledgeGraph: boolean;
    perplexity: boolean;
    custom: string[];
  };
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'personalize',
    label: 'Personalize your Goose AI',
    icon: '/goose-icon.png',
    badge: 'New',
  },
  {
    id: 'translate',
    label: 'Translate this page',
    icon: 'A文',
  },
  {
    id: 'analyze',
    label: 'Analyze for insights',
    icon: '🔍',
    badge: 'New',
  },
  {
    id: 'task-tracker',
    label: 'Create a task tracker',
    icon: '✓',
    badge: 'New',
  },
];

interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  category: 'today' | 'week' | 'month';
}

export const GooseFloatingPanel: React.FC<GooseFloatingPanelProps> = ({
  onClose,
  onSwitchToSidebar,
  pageId,
  pageTitle,
  blockModelRef,
  onPageUpdate,
  onStreamingChunk,
  mcpServers,
}) => {
  const { isOpen: isRightPanelOpen, width: rightPanelWidth } = useRightPanel();
  const [isExpanded, setIsExpanded] = useState(false);
  const agentCoreRef = React.useRef<GooseAgentCoreRef>(null);

  // Mock chat sessions for dropdown
  const [chatSessions] = useState<ChatSession[]>([
    { id: '1', title: 'Page editing workflow', timestamp: Date.now(), category: 'today' },
    { id: '2', title: 'Content structure ideas', timestamp: Date.now() - 86400000, category: 'week' },
    { id: '3', title: 'Database schema design', timestamp: Date.now() - 172800000, category: 'week' },
    { id: '4', title: 'API integration help', timestamp: Date.now() - 2592000000, category: 'month' },
  ]);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const inputBorder = 'blue.400';
  const shadowColor = 'rgba(0,0,0,0.15)';
  const badgeBg = useSemanticToken('surface.base');
  const badgeColor = useSemanticToken('text.secondary');
  const placeholderColor = useSemanticToken('text.tertiary');
  const sendBtnBg = useSemanticToken('surface.base');
  const sendBtnHoverBg = useSemanticToken('border.default');


  return (
    <AnimatePresence>
      <motion.div
        key="goose-floating-panel"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          // Dynamically adjust position based on right panel width with 10px gap
          right: isRightPanelOpen ? `${rightPanelWidth + 10}px` : '55px',
          bottom: '20px', // Animate to bottom position
        }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          position: 'fixed',
          zIndex: 1000,
          width: isExpanded ? '495px' : '432px',
          height: 'calc(100vh - 140px)', // Fixed height to ensure scrolling works
          maxHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          bg={bgColor}
          borderRadius="16px"
          boxShadow={`0 8px 32px ${shadowColor}`}
          border="1px solid"
          borderColor={borderColor}
          overflow="hidden"
          display="flex"
          flexDirection="column"
          flex="1"
          h="100%"
        >
          {/* Header */}
          <HStack
            p={3}
            justify="space-between"
          >
            {/* Chat Sessions Dropdown */}
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
              {/* Toggle Sidebar */}
              <GlassIconButton
                icon={<FiSidebar />}
                aria-label="Switch to sidebar"
                size="sm"
                glassOptions={{ intensity: 0.2 }}
                onClick={onSwitchToSidebar}
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
          <GooseAgentCore
            ref={agentCoreRef}
            pageTitle={pageTitle}
            pageId={pageId}
            mode="floating"
            blockModelRef={blockModelRef}
            onPageUpdate={onPageUpdate}
            onStreamingChunk={onStreamingChunk}
            mcpServers={mcpServers}
          />
        </Box>
      </motion.div>

    </AnimatePresence>
  );
};

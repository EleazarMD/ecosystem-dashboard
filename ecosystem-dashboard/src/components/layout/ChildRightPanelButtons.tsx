/**
 * Child Right Panel Buttons
 * Context-aware shortcuts for opening right panel tabs in the children's portal
 * The top button opens the panel with default tab, other buttons open specific tabs
 */

import React from 'react';
import {
  Box,
  VStack,
  Tooltip,
  Text,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRouter } from 'next/router';
import { useRightPanel, type PanelContext } from '@/contexts/RightPanelContext';

interface ChildRightPanelButtonsProps {
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean, forceOnMobile?: boolean) => void;
  setActiveTab: (tab: string) => void;
}

interface PanelTabButton {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

// Context-specific panel tabs for each child page - must match PANEL_CONFIGS in RightPanelContext
const CHILD_CONTEXT_TABS: Record<string, PanelTabButton[]> = {
  'child-home': [
    { id: 'daily-guide', label: 'Today', emoji: '🌟', color: 'yellow.400' },
    { id: 'progress', label: 'Progress', emoji: '📊', color: 'blue.400' },
    { id: 'discover', label: 'Discover', emoji: '🔍', color: 'purple.400' },
  ],
  'child-chat': [
    { id: 'characters', label: 'Characters', emoji: '🎭', color: 'purple.400' },
    { id: 'learning', label: 'Learning', emoji: '📚', color: 'green.400' },
    { id: 'topics', label: 'Topics', emoji: '💬', color: 'blue.400' },
  ],
  'child-art': [
    { id: 'art-agent', label: 'Art Helper', emoji: '🎨', color: 'pink.400' },
    { id: 'image-settings', label: 'Style', emoji: '🖼️', color: 'purple.400' },
    { id: 'gallery', label: 'Gallery', emoji: '📸', color: 'blue.400' },
  ],
  'child-planner': [
    { id: 'study-buddy', label: 'Study Buddy', emoji: '📚', color: 'green.400' },
    { id: 'goals', label: 'Goals', emoji: '🎯', color: 'orange.400' },
    { id: 'settings', label: 'Settings', emoji: '⚙️', color: 'gray.400' },
  ],
  'child-workspace': [
    { id: 'builder', label: 'AI Builder', emoji: '🤖', color: 'purple.400' },
    { id: 'writing', label: 'Writing', emoji: '✍️', color: 'blue.400' },
    { id: 'actions', label: 'Actions', emoji: '⚡', color: 'yellow.400' },
    { id: 'documents', label: 'Docs', emoji: '📁', color: 'cyan.400' },
  ],
  'child-email': [
    { id: 'email-helper', label: 'Helper', emoji: '✉️', color: 'blue.400' },
    { id: 'templates', label: 'Templates', emoji: '📝', color: 'green.400' },
    { id: 'tips', label: 'Tips', emoji: '💡', color: 'yellow.400' },
  ],
  'child-books': [
    { id: 'reading-buddy', label: 'Reading Buddy', emoji: '📚', color: 'green.400' },
    { id: 'vocabulary', label: 'Words', emoji: '📝', color: 'blue.400' },
    { id: 'quiz', label: 'Quiz Me', emoji: '❓', color: 'purple.400' },
    { id: 'explore', label: 'Explore', emoji: '🔍', color: 'orange.400' },
  ],
};

// Map routes to context names - must match PANEL_CONFIGS keys
const ROUTE_TO_CONTEXT: Record<string, PanelContext> = {
  '/child/home': 'child-home',
  '/child/chat': 'child-chat',
  '/child/art-studio': 'child-art',
  '/child/planner': 'child-planner',
  '/child/workspace': 'child-workspace',
  '/child/email': 'child-email',
  '/child/book-explorer': 'child-books',
};

export const ChildRightPanelButtons: React.FC<ChildRightPanelButtonsProps> = ({
  isPanelOpen,
  setIsPanelOpen,
  setActiveTab,
}) => {
  const router = useRouter();
  const currentPath = router.pathname;
  const { activeTab, config } = useRightPanel();
  
  // Semantic tokens for theme-aware styling
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceElevated = useSemanticToken('surface.elevated');

  // Don't show buttons if panel is open
  if (isPanelOpen) return null;

  // Get current context and its tabs
  const currentContext = ROUTE_TO_CONTEXT[currentPath] || 'child-home';
  const contextTabs = CHILD_CONTEXT_TABS[currentContext] || CHILD_CONTEXT_TABS['child-home'];
  
  // Get the default/primary tab for this context (first one opens the panel)
  const primaryTab = contextTabs[0];
  const secondaryTabs = contextTabs.slice(1);

  const handleOpenPanel = (tabId?: string) => {
    setIsPanelOpen(true, true); // Force open on mobile too
    if (tabId) {
      setActiveTab(tabId);
    }
  };

  return (
    <Box
      position="fixed"
      right="0"
      top="70px"
      h="calc(100vh - 70px)"
      w="56px"
      bg={surfaceElevated}
      backdropFilter="blur(12px) saturate(150%)"
      borderLeft="1px solid"
      borderColor={borderSubtle}
      borderTopLeftRadius="28px"
      borderBottomLeftRadius="28px"
      boxShadow="lg"
      zIndex={1000}
      display="flex"
      flexDirection="column"
      alignItems="center"
      py={4}
      sx={{
        WebkitBackdropFilter: 'blur(12px) saturate(150%)',
      }}
    >
      <VStack spacing={1}>
        {/* Primary button - Opens panel with default tab */}
        <Tooltip 
          label={`${primaryTab.emoji} ${primaryTab.label}`} 
          placement="left" 
          hasArrow
          bg="gray.800"
          color="white"
          fontSize="sm"
          fontWeight="medium"
          borderRadius="lg"
          px={3}
          py={2}
        >
          <Box
            p={2}
            borderRadius="xl"
            cursor="pointer"
            position="relative"
            bg={primaryTab.color}
            border="2px solid"
            borderColor={primaryTab.color}
            _hover={{
              transform: 'translateX(-3px) scale(1.08)',
              boxShadow: 'lg',
            }}
            transition="all 0.2s ease-out"
            minH="48px"
            minW="48px"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            onClick={() => handleOpenPanel(primaryTab.id)}
          >
            <Text fontSize="xl" lineHeight={1}>
              {primaryTab.emoji}
            </Text>
          </Box>
        </Tooltip>
        
        {/* Divider */}
        <Box w="24px" h="2px" bg={borderSubtle} my={2} borderRadius="full" />
        
        {/* Secondary tab shortcuts */}
        {secondaryTabs.map((tab) => (
          <Tooltip 
            key={tab.id}
            label={`${tab.emoji} ${tab.label}`} 
            placement="left" 
            hasArrow
            bg="gray.800"
            color="white"
            fontSize="sm"
            fontWeight="medium"
            borderRadius="lg"
            px={3}
            py={2}
          >
            <Box
              p={2}
              borderRadius="xl"
              cursor="pointer"
              position="relative"
              bg="transparent"
              border="2px solid transparent"
              _hover={{
                bg: surfaceHover,
                transform: 'translateX(-3px) scale(1.05)',
                borderColor: tab.color,
              }}
              transition="all 0.2s ease-out"
              minH="44px"
              minW="44px"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              onClick={() => handleOpenPanel(tab.id)}
            >
              <Text fontSize="lg" lineHeight={1}>
                {tab.emoji}
              </Text>
            </Box>
          </Tooltip>
        ))}
      </VStack>
    </Box>
  );
};

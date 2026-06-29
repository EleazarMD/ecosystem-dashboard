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
  Icon,
} from '@chakra-ui/react';
import {
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  PencilSquareIcon,
  FolderIcon,
  DocumentTextIcon,
  MapIcon,
  MagnifyingGlassIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  CursorArrowRaysIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  StarIcon,
  UserIcon,
  PhotoIcon,
  LightBulbIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useChildTheme } from '@/components/child/ChildThemeProvider';

interface ChildRightPanelButtonsProps {
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean, forceOnMobile?: boolean) => void;
  setActiveTab: (tab: string) => void;
}

const iconMap: Record<string, any> = {
  FiBook: BookOpenIcon,
  FiBookOpen: BookOpenIcon,
  FiCompass: GlobeAltIcon,
  FiCpu: CpuChipIcon,
  FiEdit: PencilSquareIcon,
  FiFileText: DocumentTextIcon,
  FiFolder: FolderIcon,
  FiHelpCircle: QuestionMarkCircleIcon,
  FiImage: PhotoIcon,
  FiLightbulb: LightBulbIcon,
  FiMap: MapIcon,
  FiMessageCircle: ChatBubbleLeftRightIcon,
  FiSearch: MagnifyingGlassIcon,
  FiSettings: Cog6ToothIcon,
  FiStar: StarIcon,
  FiTarget: CursorArrowRaysIcon,
  FiTrendingUp: ArrowTrendingUpIcon,
  FiUser: UserIcon,
  FiZap: BoltIcon,
};

// Theme-aware tab accent colors — fallback to theme primary if no match
const tabAccent: Record<string, string> = {
  chat: 'primary',
  progress: 'primary',
  discover: 'accent',
  characters: 'accent',
  learning: 'primary',
  topics: 'accent',
  'image-settings': 'accent',
  gallery: 'primary',
  goals: 'accent',
  workspace: 'primary',
  settings: 'textMuted',
  builder: 'accent',
  writing: 'primary',
  actions: 'accent',
  documents: 'primary',
  templates: 'primary',
  tips: 'accent',
  vocabulary: 'primary',
  quiz: 'accent',
  explore: 'accent',
  'create-note': 'primary',
  'my-collection': 'accent',
  'word-games': 'accent',
  'writing-tips': 'primary',
  prompts: 'accent',
  path: 'primary',
  concepts: 'primary',
  'daily-guide': 'accent',
};

export const ChildRightPanelButtons: React.FC<ChildRightPanelButtonsProps> = ({
  isPanelOpen,
  setIsPanelOpen,
  setActiveTab,
}) => {
  const { config } = useRightPanel();
  const { colors, effectiveTheme } = useChildTheme();
  
  // Semantic tokens for theme-aware styling
  const borderSubtle = useSemanticToken('border.subtle');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const childSurface = effectiveTheme.surface;
  const railBg = childSurface?.panel ?? surfaceElevated;
  const railBorder = childSurface?.border ?? borderSubtle;
  const railCard = childSurface?.card ?? surfaceHover;
  const railText = childSurface?.title ?? colors.text;

  // Don't show buttons if panel is open
  if (isPanelOpen) return null;

  // Get the default/primary tab for this context (first one opens the panel)
  const contextTabs = config.tabs;
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
      top="72px"
      bottom="12px"
      h="auto"
      w="56px"
      bg={railBg}
      backdropFilter="none"
      borderLeft="1px solid"
      borderColor={railBorder}
      borderTopLeftRadius="20px"
      borderBottomLeftRadius="20px"
      boxShadow={`-8px 0 20px rgba(0,0,0,0.06)`}
      zIndex={1000}
      display="flex"
      flexDirection="column"
      alignItems="center"
      py={4}
    >
      <VStack spacing={1}>
        {/* Primary button - Opens panel with default tab */}
        <Tooltip 
          label={primaryTab.label} 
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
            bg={colors[tabAccent[primaryTab.id] as keyof typeof colors] ?? colors.primary}
            border="2px solid"
            borderColor={colors[tabAccent[primaryTab.id] as keyof typeof colors] ?? colors.primary}
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
            <Icon as={iconMap[primaryTab.icon ?? 'FiMessageCircle'] ?? ChatBubbleLeftRightIcon} boxSize={5} color="white" />
          </Box>
        </Tooltip>
        
        {/* Divider */}
        <Box w="24px" h="2px" bg={railBorder} my={2} borderRadius="full" />
        
        {/* Secondary tab shortcuts */}
        {secondaryTabs.map((tab) => (
          <Tooltip 
            key={tab.id}
            label={tab.label} 
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
                bg: railCard,
                transform: 'translateX(-3px) scale(1.05)',
                borderColor: colors[tabAccent[tab.id] as keyof typeof colors] ?? colors.primary,
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
              <Icon as={iconMap[tab.icon ?? 'FiMessageCircle'] ?? ChatBubbleLeftRightIcon} boxSize={4} color={railText} />
            </Box>
          </Tooltip>
        ))}
      </VStack>
    </Box>
  );
};

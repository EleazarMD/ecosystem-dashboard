/**
 * Right Panel Buttons
 * Collapsible button bar on the right edge for opening various panels.
 * Provides quick access to key pages — optimized for Tesla vehicle browsers.
 */

import React from 'react';
import {
  Box,
  VStack,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  BookOpenIcon,
  BoltIcon,
  CpuChipIcon as CPUChipIcon,
  Cog6ToothIcon,
  ChartPieIcon,
  BeakerIcon,
  MicrophoneIcon,
  Cog8ToothIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useTeslaDetection } from '@/hooks/useTeslaDetection';

interface RightPanelButtonsProps {
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}

interface SidebarButton {
  label: string;
  icon: React.ComponentType<any>;
  href?: string;
  action?: () => void;
  color?: string;
  dividerAfter?: boolean;
}

export const RightPanelButtons: React.FC<RightPanelButtonsProps> = ({
  isPanelOpen,
  setIsPanelOpen,
  setActiveTab,
}) => {
  const router = useRouter();
  const tesla = useTeslaDetection();
  
  // Semantic tokens for theme-aware styling
  const borderSubtle = useSemanticToken('border.subtle');
  const iconPrimary = useSemanticToken('icon.primary');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceElevated = useSemanticToken('surface.elevated');

  if (isPanelOpen) return null;

  const minTarget = tesla.isTesla ? '56px' : '44px';

  const buttonStyle = {
    p: tesla.isTesla ? 3.5 : 3,
    borderRadius: 'lg',
    cursor: 'pointer',
    position: 'relative' as const,
    bg: 'transparent',
    border: '1px solid transparent',
    _hover: {
      bg: surfaceHover,
      transform: 'translateX(-2px)',
      transition: 'all 0.2s ease-out',
    },
    minH: minTarget,
    minW: minTarget,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const iconSize = tesla.isTesla ? 6 : 5;

  const buttons: SidebarButton[] = [
    // Panel actions — AI Settings at top for quick access
    {
      label: 'AI Settings',
      icon: CPUChipIcon,
      action: () => {
        setIsPanelOpen(true);
        setActiveTab('ai-settings');
      },
      color: 'blue.400',
      dividerAfter: true,
    },
    // Primary productivity — Voice Agent for Tesla accessibility
    {
      label: 'Voice Agent',
      icon: MicrophoneIcon,
      href: '/openclaw',
      color: 'purple.400',
    },
    {
      label: 'Workspace AI Chat',
      icon: ChatBubbleLeftRightIcon,
      href: '/workspace-ai',
      color: 'blue.400',
      dividerAfter: true,
    },
    // Core productivity
    {
      label: 'Email',
      icon: EnvelopeIcon,
      href: '/email',
    },
    {
      label: 'Calendar',
      icon: CalendarIcon,
      href: '/calendar',
    },
    {
      label: 'AI Research',
      icon: BeakerIcon,
      href: '/ai-research',
      dividerAfter: true,
    },
    // System & Knowledge
    {
      label: 'Knowledge Graph',
      icon: BookOpenIcon,
      href: '/knowledge-graph',
    },
    {
      label: 'Monitoring',
      icon: ChartPieIcon,
      href: '/monitoring',
    },
    {
      label: 'Agentic Control',
      icon: Cog8ToothIcon,
      href: '/agentic-control',
      dividerAfter: true,
    },
    // System settings
    {
      label: 'Settings',
      icon: Cog6ToothIcon,
      href: '/settings',
    },
  ];

  return (
    <Box
      position="fixed"
      right="0"
      top="70px"
      h="calc(100vh - 70px)"
      w={tesla.isTesla ? '56px' : '48px'}
      bg={surfaceElevated}
      backdropFilter="blur(8px) saturate(120%)"
      borderLeft="1px solid"
      borderColor={borderSubtle}
      borderTopLeftRadius="24px"
      borderBottomLeftRadius="24px"
      boxShadow="md"
      zIndex={1000}
      display="flex"
      flexDirection="column"
      alignItems="center"
      py={3}
      overflowY="auto"
      overflowX="hidden"
      sx={{
        WebkitBackdropFilter: 'blur(8px) saturate(120%)',
        '&::-webkit-scrollbar': { width: '0px' },
      }}
    >
      <VStack spacing={tesla.isTesla ? 1.5 : 1}>
        {buttons.map((btn) => (
          <React.Fragment key={btn.label}>
            <Tooltip label={btn.label} placement="left" hasArrow openDelay={300}>
              {btn.action ? (
                <Box
                  {...buttonStyle}
                  onClick={() => {
                    console.log('[RightPanelButtons] Button clicked:', btn.label);
                    console.log('[RightPanelButtons] Executing action for:', btn.label);
                    btn.action();
                  }}
                >
                  <Icon
                    as={btn.icon}
                    boxSize={iconSize}
                    color={btn.color || iconPrimary}
                    flexShrink={0}
                  />
                </Box>
              ) : (
                <a href={btn.href} style={{ textDecoration: 'none', display: 'block' }}>
                  <Box {...buttonStyle}>
                    <Icon
                      as={btn.icon}
                      boxSize={iconSize}
                      color={btn.color || iconPrimary}
                      flexShrink={0}
                    />
                  </Box>
                </a>
              )}
            </Tooltip>
            {btn.dividerAfter && (
              <Box w="20px" h="1px" bg={borderSubtle} />
            )}
          </React.Fragment>
        ))}
      </VStack>
    </Box>
  );
};

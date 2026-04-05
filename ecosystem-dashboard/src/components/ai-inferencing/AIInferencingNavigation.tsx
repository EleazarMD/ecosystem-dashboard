/**
 * AI Inferencing Navigation Panel
 * Left panel navigation for AI Inferencing sections
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  VStack,
  Box,
  Text,
  HStack,
  Icon,
  Badge,
} from '@chakra-ui/react';
import {
  FiZap,
  FiActivity,
  FiDollarSign,
  FiKey,
  FiServer,
  FiLayers,
  FiList,
  FiCpu,
} from 'react-icons/fi';

interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface AIInferencingNavigationProps {
  selectedSection: string;
  onSectionChange: (sectionId: string) => void;
  providerCount?: number;
  llmProviderCount?: number;
  modelCount?: number;
  recommendationCount?: number;
  keyCount?: number;
  mcpCount?: number;
  gooseAnalyticsEnabled?: boolean;
}

export function AIInferencingNavigation({
  selectedSection,
  onSectionChange,
  providerCount = 0,
  llmProviderCount = 0,
  modelCount = 0,
  recommendationCount = 0,
  keyCount = 0,
  mcpCount = 0,
  gooseAnalyticsEnabled = true,
}: AIInferencingNavigationProps) {
  const bgHover = useSemanticToken('surface.hover');
  const bgSelected = useSemanticToken('interactive.surface'); // Or a specific selected state token
  const textSelected = useSemanticToken('interactive.primary');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const iconDefault = useSemanticToken('icon.secondary');

  const navigationItems: NavigationItem[] = [
    {
      id: 'provider-performance',
      label: 'Provider Performance',
      icon: FiZap,
      badge: providerCount > 0 ? String(providerCount) : undefined,
      badgeColor: 'blue',
    },
    {
      id: 'llm-providers',
      label: 'LLM Providers',
      icon: FiLayers,
      badge: llmProviderCount > 0 ? String(llmProviderCount) : 'NEW',
      badgeColor: 'cyan',
    },
    {
      id: 'model-usage',
      label: 'Model Usage',
      icon: FiActivity,
      badge: modelCount > 0 ? String(modelCount) : undefined,
      badgeColor: 'purple',
    },
    {
      id: 'activity-logs',
      label: 'Activity Logs',
      icon: FiList,
      badge: 'LIVE',
      badgeColor: 'green',
    },
    {
      id: 'cost-optimization',
      label: 'Cost Optimization',
      icon: FiDollarSign,
      badge: recommendationCount > 0 ? String(recommendationCount) : undefined,
      badgeColor: 'orange',
    },
    ...(gooseAnalyticsEnabled ? [{
      id: 'goose-analytics',
      label: 'Goose AI Analytics',
      icon: FiCpu,
      badge: 'NEW',
      badgeColor: 'teal',
    }] : []),
    {
      id: 'api-keys',
      label: 'API Keys',
      icon: FiKey,
      badge: keyCount > 0 ? String(keyCount) : undefined,
      badgeColor: 'green',
    },
    {
      id: 'mcp-providers',
      label: 'MCP Providers',
      icon: FiServer,
      badge: mcpCount > 0 ? String(mcpCount) : undefined,
      badgeColor: 'pink',
    },
  ];

  return (
    <VStack spacing={0} align="stretch" width="full">
      <Box px={4} py={3} borderBottomWidth="1px" borderColor={useSemanticToken('border.subtle')}>
        <Text fontSize="xs" fontWeight="bold" color={textSecondary} textTransform="uppercase">
          Sections
        </Text>
      </Box>

      {navigationItems.map((item) => {
        const isSelected = selectedSection === item.id;

        return (
          <Box
            key={item.id}
            px={4}
            py={3}
            cursor="pointer"
            bg={isSelected ? useSemanticToken('surface.active') : 'transparent'}
            borderLeftWidth={4}
            borderLeftColor={isSelected ? useSemanticToken('interactive.primary') : 'transparent'}
            _hover={{ bg: isSelected ? useSemanticToken('surface.active') : bgHover }}
            onClick={() => onSectionChange(item.id)}
            transition="all 0.2s"
          >
            <HStack spacing={3} justify="space-between">
              <HStack spacing={3}>
                <Icon
                  as={item.icon}
                  boxSize={5}
                  color={isSelected ? textSelected : iconDefault}
                />
                <Text
                  fontSize="sm"
                  fontWeight={isSelected ? 'semibold' : 'medium'}
                  color={isSelected ? textSelected : textPrimary}
                >
                  {item.label}
                </Text>
              </HStack>

              {item.badge && (
                <Badge
                  colorScheme={item.badgeColor}
                  borderRadius="full"
                  px={2}
                  fontSize="xs"
                >
                  {item.badge}
                </Badge>
              )}
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
}

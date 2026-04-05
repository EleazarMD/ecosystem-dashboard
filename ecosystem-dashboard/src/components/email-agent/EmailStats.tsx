/**
 * Email Agent Statistics Cards
 */

import React from 'react';
import {
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Icon,
  HStack,
  Box,
} from '@chakra-ui/react';
import {
  InboxIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  UserGroupIcon,
  SparklesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EmailStatsProps {
  stats: {
    inbox: number;
    sent: number;
    drafts: number;
    contacts: number;
    pendingDrafts: number;
    lastSync?: string;
  };
  loading?: boolean;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  helpText?: string;
  trend?: 'increase' | 'decrease';
  trendValue?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  helpText,
  trend,
  trendValue,
  color,
}) => {
  const textSecondary = useSemanticToken('text.secondary');
  const iconColor = color || useSemanticToken('interactive.primary');

  return (
    <GlassPanel p={4} hoverEffect>
      <Stat>
        <HStack spacing={3} mb={2}>
          <Box
            p={2}
            borderRadius="lg"
            bg={`${iconColor}20`}
          >
            <Icon as={icon} boxSize={5} color={iconColor} />
          </Box>
          <StatLabel color={textSecondary} fontSize="sm">
            {label}
          </StatLabel>
        </HStack>
        <StatNumber fontSize="2xl" fontWeight="bold">
          {value}
        </StatNumber>
        {(helpText || trend) && (
          <StatHelpText mb={0}>
            {trend && <StatArrow type={trend} />}
            {trendValue || helpText}
          </StatHelpText>
        )}
      </Stat>
    </GlassPanel>
  );
};

export const EmailStats: React.FC<EmailStatsProps> = ({ stats, loading }) => {
  const successColor = useSemanticToken('status.success');
  const warningColor = useSemanticToken('status.warning');
  const infoColor = useSemanticToken('text.info');

  if (loading) {
    return (
      <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
        {[...Array(6)].map((_, i) => (
          <GlassPanel key={i} p={4} h="120px" opacity={0.5} />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} spacing={4}>
      <StatCard
        label="Inbox"
        value={stats.inbox}
        icon={InboxIcon}
        helpText="Indexed emails"
      />
      <StatCard
        label="Sent"
        value={stats.sent}
        icon={PaperAirplaneIcon}
        helpText="For style learning"
        color={successColor}
      />
      <StatCard
        label="AI Drafts"
        value={stats.pendingDrafts}
        icon={SparklesIcon}
        helpText="Pending review"
        color={warningColor}
      />
      <StatCard
        label="Contacts"
        value={stats.contacts}
        icon={UserGroupIcon}
        helpText="In graph"
        color={infoColor}
      />
      <StatCard
        label="Total Indexed"
        value={stats.inbox + stats.sent}
        icon={DocumentTextIcon}
        helpText="Emails in RAG"
      />
      <StatCard
        label="Last Sync"
        value={stats.lastSync || 'Never'}
        icon={ClockIcon}
        helpText="Mac agent"
      />
    </SimpleGrid>
  );
};

export default EmailStats;

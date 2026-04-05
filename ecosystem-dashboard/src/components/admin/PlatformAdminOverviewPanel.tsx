/**
 * Platform Admin Overview Panel
 * Shows platform-wide statistics, recent activity, and tenant overview
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Divider,
  SimpleGrid,
  Spinner,
} from '@chakra-ui/react';
import { FiUsers, FiHome, FiActivity, FiServer } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  apiCallsLast30Days: number;
  tokensLast30Days: number;
}

interface RecentActivity {
  action: string;
  resourceType: string;
  timestamp: string;
  userName: string;
  tenantName: string;
}

export default function PlatformAdminOverviewPanel() {
  const [stats, setStats] = React.useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = React.useState<RecentActivity[]>([]);
  const [loading, setLoading] = React.useState(true);

  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const bgHover = useSemanticToken('surface.hover');

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/admin/overview');
      const data = await response.json();
      if (data.success) {
        setStats({
          totalTenants: data.overview?.tenants?.total || 0,
          activeTenants: data.overview?.tenants?.active || 0,
          totalUsers: data.overview?.users?.total || 0,
          activeUsers: data.overview?.users?.active || 0,
          apiCallsLast30Days: data.overview?.usage?.apiCallsLast30Days || 0,
          tokensLast30Days: data.overview?.usage?.tokensLast30Days || 0,
        });
        setRecentActivity(data.overview?.recentActivity || []);
      }
    } catch (error) {
      console.error('Failed to load platform overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center" h="200px">
        <Spinner size="lg" />
      </Box>
    );
  }

  return (
    <Box p={4} overflowY="auto" h="100%">
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="semibold">Platform Statistics</Text>

        <SimpleGrid columns={2} spacing={3}>
          <StatCard
            icon={FiHome}
            label="Tenants"
            value={stats?.totalTenants || 0}
            subtext={`${stats?.activeTenants || 0} active`}
            color="blue"
          />
          <StatCard
            icon={FiUsers}
            label="Users"
            value={stats?.totalUsers || 0}
            subtext={`${stats?.activeUsers || 0} active`}
            color="purple"
          />
          <StatCard
            icon={FiServer}
            label="API Calls"
            value={formatNumber(stats?.apiCallsLast30Days || 0)}
            subtext="Last 30 days"
            color="green"
          />
          <StatCard
            icon={FiActivity}
            label="Tokens"
            value={formatNumber(stats?.tokensLast30Days || 0)}
            subtext="Last 30 days"
            color="orange"
          />
        </SimpleGrid>

        <Divider />

        <Text fontSize="md" fontWeight="semibold">Recent Activity</Text>

        {recentActivity.length === 0 ? (
          <Text color={textSecondary} fontSize="sm">No recent activity</Text>
        ) : (
          <VStack align="stretch" spacing={2}>
            {recentActivity.slice(0, 10).map((activity, idx) => (
              <HStack
                key={idx}
                p={2}
                borderRadius="md"
                border="1px solid"
                borderColor={borderColor}
                _hover={{ bg: bgHover }}
                fontSize="sm"
              >
                <Badge colorScheme={getActionColor(activity.action)} fontSize="xs">
                  {activity.action}
                </Badge>
                <Text flex={1} noOfLines={1}>
                  {activity.userName || 'System'}
                  {activity.tenantName && ` • ${activity.tenantName}`}
                </Text>
                <Text fontSize="xs" color={textSecondary}>
                  {formatTimestamp(activity.timestamp)}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: any;
  label: string;
  value: number | string;
  subtext?: string;
  color: string;
}) {
  const borderColor = useSemanticToken('border.default');

  return (
    <Box p={3} borderRadius="md" border="1px solid" borderColor={borderColor}>
      <HStack justify="space-between" mb={1}>
        <Stat size="sm">
          <StatLabel fontSize="xs" color="gray.500">{label}</StatLabel>
          <StatNumber fontSize="xl">{value}</StatNumber>
          {subtext && <StatHelpText fontSize="xs" mb={0}>{subtext}</StatHelpText>}
        </Stat>
        <Box p={2} borderRadius="md" bg={`${color}.100`} color={`${color}.600`}>
          <Icon size={18} />
        </Box>
      </HStack>
    </Box>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getActionColor(action: string): string {
  if (action.includes('create')) return 'green';
  if (action.includes('delete') || action.includes('archive')) return 'red';
  if (action.includes('update')) return 'blue';
  return 'gray';
}

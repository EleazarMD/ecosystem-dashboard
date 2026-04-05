import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../api/auth/[...nextauth]';
import Head from 'next/head';
import { useState, useEffect } from 'react';
import { 
  Heading, 
  VStack,
  HStack,
  Badge,
  Text,
  useToast,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Button,
  Tabs,
  TabList,
  Tab,
  Box,
  Progress,
} from '@chakra-ui/react';
import { LockIcon, SearchIcon } from '@chakra-ui/icons';
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertTriangle,
  FiTrendingUp,
  FiFilter,
} from 'react-icons/fi';
import SecurityLayout from '@/components/layout/SecurityLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ApprovalsList } from '@/components/security/ApprovalsList';
import { useApprovalWebSocket } from '@/hooks/useApprovalWebSocket';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ApprovalStats {
  pending: number;
  approved: number;
  denied: number;
  expired: number;
  avgResponseTime: number;
  approvalRate: number;
  highRiskPending: number;
}

export default function ApprovalsPage() {
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/security/approvals/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        // Use mock data
        setStats({
          pending: 5,
          approved: 234,
          denied: 18,
          expired: 3,
          avgResponseTime: 45,
          approvalRate: 92.9,
          highRiskPending: 2,
        });
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real-time approval updates
  const { isConnected, lastEvent } = useApprovalWebSocket({
    onApprovalCreated: (event) => {
      toast({
        title: 'New Approval Request',
        description: `${event.data.toolName} requires approval (${event.data.riskLevel} risk)`,
        status: 'warning',
        duration: 10000,
        isClosable: true,
      });
      // Update stats
      if (stats) {
        setStats({ ...stats, pending: stats.pending + 1 });
      }
    },
    onApprovalApproved: (event) => {
      toast({
        title: 'Approval Granted',
        description: `${event.data.toolName} was approved`,
        status: 'success',
        duration: 5000,
      });
    },
    onApprovalDenied: (event) => {
      toast({
        title: 'Approval Denied',
        description: `${event.data.toolName} was denied`,
        status: 'info',
        duration: 5000,
      });
    },
  });

  const tabLabels = ['Pending', 'Approved', 'Denied', 'All'];

  return (
    <SecurityLayout>
      <Head>
        <title>Approval Requests | AI Homelab Security</title>
        <meta name="description" content="Manage tool execution approval requests" />
      </Head>
      
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <GlassPanel variant="light" p={6}>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" spacing={1}>
              <HStack>
                <LockIcon />
                <Heading size="lg">Approval Requests</Heading>
                {stats?.highRiskPending ? (
                  <Badge colorScheme="red" fontSize="sm">
                    {stats.highRiskPending} High Risk
                  </Badge>
                ) : null}
              </HStack>
              <Text color={textSecondary}>
                Human-in-the-loop approval queue for tool executions
              </Text>
            </VStack>
            <HStack>
              <Badge 
                colorScheme={isConnected ? 'green' : 'gray'} 
                fontSize="sm"
                px={3}
                py={1}
              >
                {isConnected ? '● Live' : 'Connecting...'}
              </Badge>
            </HStack>
          </HStack>
        </GlassPanel>

        {/* Stats Grid */}
        {stats && (
          <SimpleGrid columns={{ base: 2, md: 4, lg: 7 }} spacing={4}>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Pending</StatLabel>
                <StatNumber color="yellow.500">{stats.pending}</StatNumber>
                <StatHelpText>
                  <Icon as={FiClock} mr={1} />
                  Awaiting review
                </StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Approved</StatLabel>
                <StatNumber color="green.500">{stats.approved}</StatNumber>
                <StatHelpText>
                  <Icon as={FiCheckCircle} mr={1} />
                  This period
                </StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Denied</StatLabel>
                <StatNumber color="red.500">{stats.denied}</StatNumber>
                <StatHelpText>
                  <Icon as={FiXCircle} mr={1} />
                  Rejected
                </StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Expired</StatLabel>
                <StatNumber color="gray.500">{stats.expired}</StatNumber>
                <StatHelpText>
                  <Icon as={FiAlertTriangle} mr={1} />
                  Timed out
                </StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Avg Response</StatLabel>
                <StatNumber>{stats.avgResponseTime}s</StatNumber>
                <StatHelpText>Time to decision</StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <Stat size="sm">
                <StatLabel>Approval Rate</StatLabel>
                <StatNumber color="blue.500">{stats.approvalRate}%</StatNumber>
                <StatHelpText>
                  <Icon as={FiTrendingUp} mr={1} />
                  Overall
                </StatHelpText>
              </Stat>
            </GlassPanel>
            <GlassPanel variant="light" p={4}>
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" fontWeight="medium">Queue Health</Text>
                <Progress 
                  value={stats.pending > 10 ? 100 : (stats.pending / 10) * 100} 
                  colorScheme={stats.pending > 10 ? 'red' : stats.pending > 5 ? 'yellow' : 'green'}
                  size="sm"
                  borderRadius="full"
                />
                <Text fontSize="xs" color={textSecondary}>
                  {stats.pending > 10 ? 'High backlog' : stats.pending > 5 ? 'Moderate' : 'Healthy'}
                </Text>
              </VStack>
            </GlassPanel>
          </SimpleGrid>
        )}

        {/* Filters */}
        <GlassPanel variant="light" p={4}>
          <HStack spacing={4} wrap="wrap">
            <InputGroup maxW="250px">
              <InputLeftElement>
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by tool or agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <Select
              maxW="150px"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            <Select
              maxW="180px"
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
            >
              <option value="all">All Tools</option>
              <option value="file_write">File Write</option>
              <option value="shell_execute">Shell Execute</option>
              <option value="api_call">API Call</option>
              <option value="database_query">Database Query</option>
            </Select>
            {(riskFilter !== 'all' || toolFilter !== 'all' || searchQuery) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRiskFilter('all');
                  setToolFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </HStack>
        </GlassPanel>

        {/* Tabs */}
        <Tabs 
          variant="soft-rounded" 
          colorScheme="blue" 
          index={activeTab}
          onChange={setActiveTab}
        >
          <TabList>
            {tabLabels.map((label, i) => (
              <Tab key={label}>
                {label}
                {i === 0 && stats?.pending ? (
                  <Badge ml={2} colorScheme="red" borderRadius="full">
                    {stats.pending}
                  </Badge>
                ) : null}
              </Tab>
            ))}
          </TabList>
        </Tabs>

        {/* Approvals List */}
        <ApprovalsList autoRefresh={true} refreshInterval={5000} />
      </VStack>
    </SecurityLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin?callbackUrl=/security/approvals',
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
};

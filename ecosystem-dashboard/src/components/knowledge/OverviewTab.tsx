import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  SimpleGrid,
  Icon,
  Badge,
  Divider,
  List,
  ListItem,
  ListIcon,
} from '@chakra-ui/react';
import {
  FiFileText,
  FiDatabase,
  FiAlertCircle,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
} from 'react-icons/fi';

interface OverviewTabProps {
  pendingApprovals: number;
  systemStats: any;
  onNavigate: (tab: string) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  pendingApprovals,
  systemStats,
  onNavigate,
}) => {
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  return (
    <VStack spacing={6} align="stretch">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <Heading size="md">Quick Actions</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
            <Button
              leftIcon={<Icon as={FiSearch} />}
              colorScheme="blue"
              variant="outline"
              size="lg"
              onClick={() => onNavigate('search')}
            >
              Search Knowledge
            </Button>

            <Button
              leftIcon={<Icon as={FiFileText} />}
              colorScheme="green"
              variant="outline"
              size="lg"
              onClick={() => onNavigate('documents')}
            >
              View Documents
            </Button>

            <Button
              leftIcon={<Icon as={FiDatabase} />}
              colorScheme="purple"
              variant="outline"
              size="lg"
              onClick={() => onNavigate('memories')}
            >
              Browse Memories
            </Button>

            <Button
              leftIcon={<Icon as={FiAlertCircle} />}
              colorScheme={pendingApprovals > 0 ? 'orange' : 'gray'}
              variant={pendingApprovals > 0 ? 'solid' : 'outline'}
              size="lg"
              onClick={() => onNavigate('approvals')}
              rightIcon={
                pendingApprovals > 0 ? (
                  <Badge colorScheme="white" bg={useSemanticToken('surface.elevated')} color="orange.600">
                    {pendingApprovals}
                  </Badge>
                ) : undefined
              }
            >
              {pendingApprovals > 0 ? 'Review Approvals' : 'Approvals'}
            </Button>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* System Status */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <Heading size="md">Recent Activity</Heading>
          </CardHeader>
          <CardBody>
            <List spacing={3}>
              <ListItem>
                <HStack justify="space-between">
                  <HStack>
                    <ListIcon as={FiCheckCircle} color="green.500" />
                    <Text>Document validated</Text>
                  </HStack>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>2m ago</Text>
                </HStack>
              </ListItem>

              <ListItem>
                <HStack justify="space-between">
                  <HStack>
                    <ListIcon as={FiAlertCircle} color="orange.500" />
                    <Text>Approval requested</Text>
                  </HStack>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>5m ago</Text>
                </HStack>
              </ListItem>

              <ListItem>
                <HStack justify="space-between">
                  <HStack>
                    <ListIcon as={FiDatabase} color="purple.500" />
                    <Text>Memory synced</Text>
                  </HStack>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>12m ago</Text>
                </HStack>
              </ListItem>

              <ListItem>
                <HStack justify="space-between">
                  <HStack>
                    <ListIcon as={FiFileText} color="blue.500" />
                    <Text>Document ingested</Text>
                  </HStack>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>15m ago</Text>
                </HStack>
              </ListItem>
            </List>
          </CardBody>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <Heading size="md">System Health</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between">
                <Text>Knowledge Graph API</Text>
                <Badge colorScheme="green">Healthy</Badge>
              </HStack>

              <HStack justify="space-between">
                <Text>Memory Backend</Text>
                <Badge colorScheme="green">Healthy</Badge>
              </HStack>

              <HStack justify="space-between">
                <Text>Neo4j Database</Text>
                <Badge colorScheme="green">Connected</Badge>
              </HStack>

              <HStack justify="space-between">
                <Text>Knowledge Graph Agents</Text>
                <Badge colorScheme="green">
                  {systemStats?.agents?.healthy || 0}/7
                </Badge>
              </HStack>

              <Divider />

              <HStack justify="space-between">
                <Text fontWeight="bold">Overall Status</Text>
                <Badge colorScheme="green" fontSize="md">
                  Operational
                </Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Pending Approvals Alert */}
      {pendingApprovals > 0 && (
        <Card borderColor="orange.300" borderWidth={2}>
          <CardBody>
            <HStack justify="space-between">
              <HStack spacing={4}>
                <Icon as={FiAlertCircle} boxSize={6} color="orange.500" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold" fontSize="lg">
                    {pendingApprovals} {pendingApprovals === 1 ? 'Approval' : 'Approvals'} Pending
                  </Text>
                  <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                    Memory validation requires your review
                  </Text>
                </VStack>
              </HStack>

              <Button
                colorScheme="orange"
                rightIcon={<FiArrowRight />}
                onClick={() => onNavigate('approvals')}
              >
                Review Now
              </Button>
            </HStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
};

export default OverviewTab;

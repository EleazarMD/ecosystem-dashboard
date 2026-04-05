/**
 * Modern Glassmorphic Overview Tab
 * Redesigned with contemporary UI patterns and smooth glassmorphism effects
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Heading,
  SimpleGrid,
  Icon,
  Badge,
  List,
  ListItem,
  Flex,
  Card,
  CardBody,
} from '@chakra-ui/react';
import {
  FiFileText,
  FiDatabase,
  FiAlertCircle,
  FiSearch,
  FiCheckCircle,
  FiClock,
  FiArrowRight,
  FiActivity,
  FiZap,
  FiShield,
} from 'react-icons/fi';

interface OverviewTabProps {
  pendingApprovals: number;
  systemStats: any;
  onNavigate: (tab: string) => void;
}

const ModernOverviewTab: React.FC<OverviewTabProps> = ({
  pendingApprovals,
  systemStats,
  onNavigate,
}) => {
  // Modern glass effect backgrounds
  const glassBg = useSemanticToken('glass.background');
  const glassHoverBg = useSemanticToken('surface.hover');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');

  // Gradient for metric cards
  const gradients = {
    blue: 'linear(to-br, blue.400, blue.600)',
    green: 'linear(to-br, green.400, green.600)',
    purple: 'linear(to-br, purple.400, purple.600)',
    orange: 'linear(to-br, orange.400, orange.600)',
  };

  return (
    <VStack spacing={4} align="stretch" py={2}>

      {/* Quick Actions */}
      <Box>
        <Heading size="md" mb={3}>Quick Actions</Heading>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          <Button
            leftIcon={<Icon as={FiSearch} />}
            onClick={() => onNavigate('search')}
            variant="outline"
            size="md"
            justifyContent="flex-start"
          >
            Search Knowledge
          </Button>

          <Button
            leftIcon={<Icon as={FiFileText} />}
            onClick={() => onNavigate('documents')}
            variant="outline"
            size="md"
            justifyContent="flex-start"
          >
            View Documents
          </Button>

          <Button
            leftIcon={<Icon as={FiDatabase} />}
            onClick={() => onNavigate('memories')}
            variant="outline"
            size="md"
            justifyContent="flex-start"
          >
            Browse Memories
          </Button>

          <Button
            leftIcon={<Icon as={FiAlertCircle} />}
            onClick={() => onNavigate('approvals')}
            colorScheme={pendingApprovals > 0 ? 'orange' : 'gray'}
            variant={pendingApprovals > 0 ? 'solid' : 'outline'}
            size="md"
            justifyContent="flex-start"
            rightIcon={
              pendingApprovals > 0 ? (
                <Badge colorScheme="whiteAlpha" bg={useSemanticToken('surface.elevated')} color="orange.600">
                  {pendingApprovals}
                </Badge>
              ) : undefined
            }
          >
            {pendingApprovals > 0 ? 'Review Approvals' : 'Approvals'}
          </Button>
        </SimpleGrid>
      </Box>

      {/* Two Column Layout - Activity & Health */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {/* Recent Activity */}
        <Card variant="outline">
          <CardBody>
            <Heading size="sm" mb={3}>Recent Activity</Heading>

            <List spacing={4}>
              <ListItem>
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Flex
                      w={8}
                      h={8}
                      align="center"
                      justify="center"
                      borderRadius="lg"
                      bg="green.100"
                    >
                      <Icon as={FiCheckCircle} color="green.600" boxSize={4} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" fontSize="sm">
                        Document validated
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Processing completed
                      </Text>
                    </VStack>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                    2m ago
                  </Text>
                </HStack>
              </ListItem>

              <ListItem>
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Flex
                      w={8}
                      h={8}
                      align="center"
                      justify="center"
                      borderRadius="lg"
                      bg="orange.100"
                    >
                      <Icon as={FiAlertCircle} color="orange.600" boxSize={4} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" fontSize="sm">
                        Approval requested
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Memory validation pending
                      </Text>
                    </VStack>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                    5m ago
                  </Text>
                </HStack>
              </ListItem>

              <ListItem>
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Flex
                      w={8}
                      h={8}
                      align="center"
                      justify="center"
                      borderRadius="lg"
                      bg="purple.100"
                    >
                      <Icon as={FiDatabase} color="purple.600" boxSize={4} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" fontSize="sm">
                        Memory synced
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        IDE changes integrated
                      </Text>
                    </VStack>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                    12m ago
                  </Text>
                </HStack>
              </ListItem>

              <ListItem>
                <HStack justify="space-between" align="start">
                  <HStack spacing={3} flex={1}>
                    <Flex
                      w={8}
                      h={8}
                      align="center"
                      justify="center"
                      borderRadius="lg"
                      bg="blue.100"
                    >
                      <Icon as={FiFileText} color="blue.600" boxSize={4} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium" fontSize="sm">
                        Document ingested
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        Added to knowledge base
                      </Text>
                    </VStack>
                  </HStack>
                  <Text fontSize="xs" color={mutedColor} whiteSpace="nowrap">
                    15m ago
                  </Text>
                </HStack>
              </ListItem>
            </List>
          </CardBody>
        </Card>

        {/* System Health */}
        <Card variant="outline">
          <CardBody>
            <Heading size="sm" mb={3}>System Health</Heading>

            <VStack align="stretch" spacing={4}>
              <HStack justify="space-between" p={3} borderRadius="lg" bg={useSemanticToken('surface.success')}>
                <HStack spacing={3}>
                  <Flex
                    w={8}
                    h={8}
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="green.100"
                  >
                    <Icon as={FiZap} color="green.600" boxSize={4} />
                  </Flex>
                  <Text fontWeight="medium" fontSize="sm">
                    Knowledge Graph API
                  </Text>
                </HStack>
                <Badge colorScheme="green" borderRadius="full" px={3}>
                  HEALTHY
                </Badge>
              </HStack>

              <HStack justify="space-between" p={3} borderRadius="lg" bg={useSemanticToken('surface.success')}>
                <HStack spacing={3}>
                  <Flex
                    w={8}
                    h={8}
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="green.100"
                  >
                    <Icon as={FiDatabase} color="green.600" boxSize={4} />
                  </Flex>
                  <Text fontWeight="medium" fontSize="sm">
                    Memory Backend
                  </Text>
                </HStack>
                <Badge colorScheme="green" borderRadius="full" px={3}>
                  HEALTHY
                </Badge>
              </HStack>

              <HStack justify="space-between" p={3} borderRadius="lg" bg={useSemanticToken('surface.success')}>
                <HStack spacing={3}>
                  <Flex
                    w={8}
                    h={8}
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="green.100"
                  >
                    <Icon as={FiShield} color="green.600" boxSize={4} />
                  </Flex>
                  <Text fontWeight="medium" fontSize="sm">
                    Neo4j Database
                  </Text>
                </HStack>
                <Badge colorScheme="green" borderRadius="full" px={3}>
                  CONNECTED
                </Badge>
              </HStack>

              <HStack justify="space-between" p={3} borderRadius="lg" bg={useSemanticToken('surface.success')}>
                <HStack spacing={3}>
                  <Flex
                    w={8}
                    h={8}
                    align="center"
                    justify="center"
                    borderRadius="lg"
                    bg="green.100"
                  >
                    <Icon as={FiActivity} color="green.600" boxSize={4} />
                  </Flex>
                  <Text fontWeight="medium" fontSize="sm">
                    Knowledge Graph Agents
                  </Text>
                </HStack>
                <Badge colorScheme="green" borderRadius="full" px={3}>
                  {systemStats?.agents?.healthy || 0}/7
                </Badge>
              </HStack>

              <Box
                mt={2}
                p={4}
                borderRadius="xl"
                bgGradient="linear(to-r, green.400, green.600)"
                color="whiteAlpha.900"
              >
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" opacity={0.9}>
                      Overall Status
                    </Text>
                    <Text fontSize="xl" fontWeight="bold">
                      Operational
                    </Text>
                  </VStack>
                  <Icon as={FiCheckCircle} boxSize={8} />
                </HStack>
              </Box>
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

export default ModernOverviewTab;

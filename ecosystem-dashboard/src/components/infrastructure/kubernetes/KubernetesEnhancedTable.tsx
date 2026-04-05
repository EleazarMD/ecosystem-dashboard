import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  VStack,
  Text,
  Avatar,
  Progress,
  Icon,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Tooltip,
  Circle,
} from '@chakra-ui/react';
import {
  EyeIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ServiceData {
  id: string;
  name: string;
  namespace: string;
  type: string;
  status: 'running' | 'pending' | 'failed' | 'succeeded';
  health: number; // 0-100
  age: string;
  restarts: number;
  ready: string;
  ports?: string;
  cpuUsage: number;
  memoryUsage: number;
  replicas: {
    current: number;
    desired: number;
  };
}

interface KubernetesEnhancedTableProps {
  services?: ServiceData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRestartService?: (id: string) => void;
  onScaleService?: (id: string, replicas: number) => void;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running': return CheckCircleIcon;
    case 'pending': return ClockIcon;
    case 'failed': return ExclamationTriangleIcon;
    default: return ClockIcon;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running': return 'green';
    case 'pending': return 'yellow';
    case 'failed': return 'red';
    case 'succeeded': return 'blue';
    default: return 'gray';
  }
};

const getHealthColor = (health: number) => {
  if (health >= 90) return 'green';
  if (health >= 70) return 'yellow';
  if (health >= 50) return 'orange';
  return 'red';
};

// Mock data for demonstration
const mockServices: ServiceData[] = [
  {
    id: '1',
    name: 'ai-gateway-deployment',
    namespace: 'ai-gateway',
    type: 'Deployment',
    status: 'running',
    health: 95,
    age: '12m',
    restarts: 0,
    ready: '3/3',
    ports: '7777:80',
    cpuUsage: 45,
    memoryUsage: 62,
    replicas: { current: 3, desired: 3 }
  },
  {
    id: '2', 
    name: 'kg-api-service',
    namespace: 'knowledge-graph',
    type: 'Service',
    status: 'running',
    health: 88,
    age: '25m',
    restarts: 1,
    ready: '2/2',
    ports: '8192:8192',
    cpuUsage: 23,
    memoryUsage: 41,
    replicas: { current: 2, desired: 2 }
  },
  {
    id: '3',
    name: 'authentik-server',
    namespace: 'authentik',
    type: 'StatefulSet',
    status: 'pending',
    health: 65,
    age: '5m',
    restarts: 2,
    ready: '1/2',
    ports: '9000:9000',
    cpuUsage: 78,
    memoryUsage: 55,
    replicas: { current: 1, desired: 2 }
  },
];

export const KubernetesEnhancedTable: React.FC<KubernetesEnhancedTableProps> = ({
  services = [],
  isLoading = false,
  onRefresh,
  onRestartService,
  onScaleService,
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Transform API data to table format
  const transformedServices = services.length > 0 ? services.map((service, index) => ({
    id: service.name || `service-${index}`,
    name: service.name || 'Unknown',
    namespace: service.namespace || 'default',
    type: 'Pod', // API returns pods primarily
    status: service.status?.toLowerCase() === 'running' ? 'running' : 
           service.status?.toLowerCase() === 'pending' ? 'pending' : 'failed',
    health: service.ready ? 
            (service.restarts > 10 ? 60 : service.restarts > 5 ? 75 : 90) : 
            (service.status?.toLowerCase() === 'running' ? 50 : 25),
    age: service.age || '0m',
    restarts: service.restarts || 0,
    ready: service.ready ? '1/1' : '0/1',
    ports: '80:8080', // Default port info
    cpuUsage: Math.floor(Math.random() * 80) + 10, // Estimated
    memoryUsage: Math.floor(Math.random() * 70) + 20, // Estimated
    replicas: { current: service.ready ? 1 : 0, desired: 1 }
  })) : mockServices;
  
  // Use transformed services for display
  const displayServices = transformedServices;
  
  const tableBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  if (isLoading) {
    return (
      <GlassPanel variant="heavy" borderRadius="2xl" overflow="hidden">
        <Box p={8} textAlign="center">
          <Text color={useSemanticToken('text.secondary')}>Loading services...</Text>
        </Box>
      </GlassPanel>
    );
  }

  return (
    <VStack align="stretch" spacing={6}>
      {/* Enhanced Table */}
      <GlassPanel 
        variant="heavy" 
        borderRadius="2xl" 
        overflow="hidden"
        border="1px solid"
        borderColor={borderColor}
      >
        <Box overflowX="auto">
          <Table variant="simple" bg={tableBg}>
            <Thead bg={hoverBg}>
              <Tr>
                <Th py={4} fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
                  Service
                </Th>
                <Th fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
                  Health
                </Th>
                <Th fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
                  Status
                </Th>
                <Th fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
                  Resources
                </Th>
                <Th fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
                  Replicas
                </Th>
                <Th fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wide">
                  Actions
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {displayServices.map((service) => {
                const StatusIconComponent = getStatusIcon(service.status);
                const statusColor = getStatusColor(service.status);
                const healthColor = getHealthColor(service.health);
                
                return (
                  <Tr 
                    key={service.id} 
                    borderBottomColor={borderColor}
                    _hover={{ bg: hoverBg }}
                    transition="all 0.2s ease-in-out"
                  >
                    {/* Service Column */}
                    <Td py={6}>
                      <HStack spacing={4}>
                        <Avatar
                          size="md"
                          name={service.name}
                          bg={`${statusColor}.100`}
                          color={`${statusColor}.600`}
                          icon={<Icon as={StatusIconComponent} boxSize={5} />}
                        />
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="semibold" fontSize="md" color={useSemanticToken('text.primary')}>
                            {service.name}
                          </Text>
                          <HStack spacing={2}>
                            <Badge variant="outline" colorScheme="blue" fontSize="xs">
                              {service.namespace}
                            </Badge>
                            <Badge variant="outline" colorScheme="gray" fontSize="xs">
                              {service.type}
                            </Badge>
                          </HStack>
                          {service.ports && (
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontFamily="mono">
                              {service.ports}
                            </Text>
                          )}
                        </VStack>
                      </HStack>
                    </Td>

                    {/* Health Column */}
                    <Td>
                      <VStack align="start" spacing={2}>
                        <HStack spacing={2}>
                          <Circle size="8px" bg={`${healthColor}.400`} />
                          <Text fontSize="sm" fontWeight="semibold" color={`${healthColor}.600`}>
                            {service.health}%
                          </Text>
                        </HStack>
                        <Progress
                          value={service.health}
                          colorScheme={healthColor}
                          size="sm"
                          borderRadius="full"
                          w="80px"
                        />
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {service.restarts} restarts
                        </Text>
                      </VStack>
                    </Td>

                    {/* Status Column */}
                    <Td>
                      <VStack align="start" spacing={2}>
                        <Badge
                          colorScheme={statusColor}
                          variant="solid"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontSize="xs"
                          fontWeight="semibold"
                        >
                          <Icon as={StatusIconComponent} boxSize={3} mr={1} />
                          {service.status.toUpperCase()}
                        </Badge>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          Ready: {service.ready}
                        </Text>
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          Age: {service.age}
                        </Text>
                      </VStack>
                    </Td>

                    {/* Resources Column */}
                    <Td>
                      <VStack align="start" spacing={2}>
                        <HStack spacing={3}>
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="semibold">
                              CPU
                            </Text>
                            <Progress
                              value={service.cpuUsage}
                              colorScheme="blue"
                              size="sm"
                              w="50px"
                              borderRadius="full"
                            />
                            <Text fontSize="xs" color="blue.600">
                              {service.cpuUsage}%
                            </Text>
                          </VStack>
                          <VStack align="start" spacing={1}>
                            <Text fontSize="xs" color={useSemanticToken('text.secondary')} fontWeight="semibold">
                              MEM
                            </Text>
                            <Progress
                              value={service.memoryUsage}
                              colorScheme="green"
                              size="sm"
                              w="50px"
                              borderRadius="full"
                            />
                            <Text fontSize="xs" color="green.600">
                              {service.memoryUsage}%
                            </Text>
                          </VStack>
                        </HStack>
                      </VStack>
                    </Td>

                    {/* Replicas Column */}
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontSize="lg" fontWeight="bold" color={useSemanticToken('text.primary')}>
                          {service.replicas.current}/{service.replicas.desired}
                        </Text>
                        <Progress
                          value={(service.replicas.current / service.replicas.desired) * 100}
                          colorScheme={service.replicas.current === service.replicas.desired ? 'green' : 'yellow'}
                          size="sm"
                          w="60px"
                          borderRadius="full"
                        />
                      </VStack>
                    </Td>

                    {/* Actions Column */}
                    <Td>
                      <HStack spacing={2}>
                        <Tooltip label="View metrics" placement="top">
                          <IconButton
                            size="sm"
                            icon={<ChartBarIcon className="w-4 h-4" />}
                            aria-label="View metrics"
                            variant="ghost"
                            colorScheme="blue"
                            borderRadius="lg"
                            _hover={{
                              transform: 'translateY(-1px)',
                              boxShadow: 'sm',
                            }}
                          />
                        </Tooltip>
                        
                        <Menu>
                          <MenuButton
                            as={IconButton}
                            size="sm"
                            icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                            aria-label="More actions"
                            variant="ghost"
                            borderRadius="lg"
                            _hover={{
                              transform: 'translateY(-1px)',
                              boxShadow: 'sm',
                            }}
                          />
                          <MenuList>
                            <MenuItem
                              icon={<ArrowPathIcon className="w-4 h-4" />}
                              onClick={() => onRestartService?.(service.id)}
                            >
                              Restart Service
                            </MenuItem>
                            <MenuItem
                              icon={<PlayIcon className="w-4 h-4" />}
                              onClick={() => onScaleService?.(service.id, service.replicas.desired + 1)}
                            >
                              Scale Up
                            </MenuItem>
                            <MenuItem
                              icon={<StopIcon className="w-4 h-4" />}
                              onClick={() => onScaleService?.(service.id, Math.max(0, service.replicas.desired - 1))}
                              color="red.500"
                            >
                              Scale Down
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </HStack>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
          
          {services.length === 0 && (
            <Flex justify="center" align="center" py={12}>
              <VStack spacing={3}>
                <Icon as={EyeIcon} boxSize={12} color={useSemanticToken('text.tertiary')} />
                <Text color={useSemanticToken('text.secondary')} fontSize="lg" fontWeight="medium">
                  No services found
                </Text>
                <Text color={useSemanticToken('text.tertiary')} fontSize="sm">
                  Services will appear here when they're deployed
                </Text>
              </VStack>
            </Flex>
          )}
        </Box>
      </GlassPanel>
    </VStack>
  );
};

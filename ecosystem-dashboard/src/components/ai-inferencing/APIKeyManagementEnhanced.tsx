/**
 * API Key Management - Enhanced with Project/Service grouping
 * Hierarchical view: Projects → Services → API Keys
 */

import React, { useState } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Box,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Button,
  Badge,
  Progress,
  
  Icon,
  SimpleGrid,
  Divider,
  Collapse,
  IconButton,
  Flex,
} from '@chakra-ui/react';
import {
  FiKey,
  FiFolder,
  FiFolderOpen,
  FiChevronRight,
  FiChevronDown,
  FiBox,
  FiAlertCircle,
  FiPlus,
} from 'react-icons/fi';

interface APIKey {
  id: string;
  provider: string;
  name: string;
  key: string;
  status: 'active' | 'inactive' | 'expired';
  requestCount: number;
  requestLimit: number;
  costThisMonth: number;
  costLimit: number;
  lastUsed: string;
  rotationDue: number; // days
  projectId: string;
  projectName: string;
  serviceId: string;
  serviceName: string;
}

interface Project {
  id: string;
  name: string;
  services: Service[];
}

interface Service {
  id: string;
  name: string;
  keys: APIKey[];
}

interface Props {
  keys: APIKey[];
  onKeySelect?: (key: APIKey) => void;
}

export function APIKeyManagementEnhanced({ keys, onKeySelect }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surface');

  // Group keys by project and service
  const groupedData: Project[] = keys.reduce((acc: Project[], key) => {
    let project = acc.find(p => p.id === key.projectId);
    if (!project) {
      project = {
        id: key.projectId,
        name: key.projectName,
        services: []
      };
      acc.push(project);
    }

    let service = project.services.find(s => s.id === key.serviceId);
    if (!service) {
      service = {
        id: key.serviceId,
        name: key.serviceName,
        keys: []
      };
      project.services.push(service);
    }

    service.keys.push(key);
    return acc;
  }, []);

  // Calculate totals
  const totalKeys = keys.length;
  const totalRequests = keys.reduce((sum, k) => sum + k.requestCount, 0);
  const totalCost = keys.reduce((sum, k) => sum + k.costThisMonth, 0);
  const activeKeys = keys.filter(k => k.status === 'active').length;

  const toggleProject = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

  const toggleService = (serviceId: string) => {
    const newSet = new Set(expandedServices);
    if (newSet.has(serviceId)) {
      newSet.delete(serviceId);
    } else {
      newSet.add(serviceId);
    }
    setExpandedServices(newSet);
  };

  const handleKeyClick = (key: APIKey) => {
    setSelectedKey(key.id);
    onKeySelect?.(key);
  };

  return (
    <VStack spacing={6} align="stretch" width="full">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <VStack align="start" spacing={1}>
          <HStack spacing={3} color={mutedText} fontSize="sm">
            <Text fontWeight="500">{groupedData.length} projects</Text>
            <Text>·</Text>
            <Text fontWeight="500">{totalKeys} keys</Text>
            <Text>·</Text>
            <Text>{totalRequests.toLocaleString()} requests</Text>
            <Text>·</Text>
            <Text fontWeight="600" color={useSemanticToken('interactive.secondary')}>
              ${totalCost.toFixed(2)} spent
            </Text>
          </HStack>
          <HStack spacing={2} fontSize="xs">
            <Badge colorScheme="green">{activeKeys} active</Badge>
            <Badge colorScheme="yellow">
              {keys.filter(k => k.rotationDue <= 7).length} rotation due
            </Badge>
          </HStack>
        </VStack>

        <Button leftIcon={<FiPlus />} colorScheme="blue" size="sm">
          Add API Key
        </Button>
      </HStack>

      {/* Summary Cards */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                Total Requests
              </Text>
              <Text fontSize="2xl" fontWeight="700">
                {totalRequests.toLocaleString()}
              </Text>
              <HStack spacing={1} color="green.500" fontSize="xs">
                <Icon as={FiTrendingUp} />
                <Text>+15% vs last month</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                Monthly Cost
              </Text>
              <Text fontSize="2xl" fontWeight="700">
                ${totalCost.toFixed(2)}
              </Text>
              <HStack spacing={1} color="green.500" fontSize="xs">
                <Icon as={FiTrendingUp} />
                <Text>+21% vs last month</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        <Card borderWidth="1px" borderColor={borderColor}>
          <CardBody>
            <VStack align="start" spacing={1}>
              <Text fontSize="xs" color={mutedText} textTransform="uppercase">
                Avg Cost/Request
              </Text>
              <Text fontSize="2xl" fontWeight="700">
                ${totalRequests > 0 ? (totalCost / totalRequests).toFixed(4) : '0.0000'}
              </Text>
              <HStack spacing={1} color="red.500" fontSize="xs">
                <Icon as={FiTrendingUp} />
                <Text>+5% vs last month</Text>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* Hierarchical Project/Service/Key List */}
      <VStack spacing={2} align="stretch">
        {groupedData.map((project) => {
          const isProjectExpanded = expandedProjects.has(project.id);
          const projectKeyCount = project.services.reduce((sum, s) => sum + s.keys.length, 0);

          return (
            <Box key={project.id}>
              {/* Project Header */}
              <HStack
                p={3}
                cursor="pointer"
                onClick={() => toggleProject(project.id)}
                _hover={{ bg: hoverBg }}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Icon
                  as={isProjectExpanded ? FiChevronDown : FiChevronRight}
                  boxSize={4}
                  color={mutedText}
                />
                <Icon
                  as={isProjectExpanded ? FiFolderOpen : FiFolder}
                  boxSize={5}
                  color="blue.500"
                />
                <Text fontWeight="600" fontSize="md">
                  {project.name}
                </Text>
                <Badge ml={2} colorScheme="gray" fontSize="xs">
                  {project.services.length} services
                </Badge>
                <Badge colorScheme="purple" fontSize="xs">
                  {projectKeyCount} keys
                </Badge>
              </HStack>

              {/* Services under this Project */}
              <Collapse in={isProjectExpanded} animateOpacity>
                <VStack spacing={2} align="stretch" pl={8} pt={2}>
                  {project.services.map((service) => {
                    const isServiceExpanded = expandedServices.has(service.id);

                    return (
                      <Box key={service.id}>
                        {/* Service Header */}
                        <HStack
                          p={2}
                          cursor="pointer"
                          onClick={() => toggleService(service.id)}
                          _hover={{ bg: hoverBg }}
                          borderRadius="md"
                        >
                          <Icon
                            as={isServiceExpanded ? FiChevronDown : FiChevronRight}
                            boxSize={3}
                            color={mutedText}
                          />
                          <Icon as={FiBox} boxSize={4} color="green.500" />
                          <Text fontWeight="500" fontSize="sm">
                            {service.name}
                          </Text>
                          <Badge colorScheme="blue" fontSize="xs">
                            {service.keys.length} keys
                          </Badge>
                        </HStack>

                        {/* Keys under this Service */}
                        <Collapse in={isServiceExpanded} animateOpacity>
                          <VStack spacing={1} align="stretch" pl={8} pt={1}>
                            {service.keys.map((key) => {
                              const usagePercent = (key.requestCount / key.requestLimit) * 100;
                              const costPercent = (key.costThisMonth / key.costLimit) * 100;
                              const isVisible = showKeys.has(key.id);

                              return (
                                <Card key={key.id} borderWidth="1px" borderColor={borderColor}>
                                  <CardBody>
                                    <VStack align="stretch" spacing={4}>
                                      {/* Key Header */}
                                      <HStack justify="space-between">
                                        <HStack spacing={3}>
                                          <Icon as={FiKey} boxSize={5} color="blue.500" />
                                          <VStack align="start" spacing={0}>
                                            <HStack>
                                              <Text fontSize="md" fontWeight="600">
                                                {key.name}
                                              </Text>
                                              <Badge colorScheme={key.status === 'active' ? 'green' : 'gray'}>
                                                {key.status}
                                              </Badge>
                                            </HStack>
                                            <Text fontSize="xs" color={mutedText}>
                                              {key.provider}
                                            </Text>
                                          </VStack>
                                        </HStack>

                                        <HStack spacing={2}>
                                          <IconButton
                                            aria-label="Toggle visibility"
                                            icon={<Icon as={isVisible ? FiEyeOff : FiEye} />}
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleKeyVisibility(key.id)}
                                          />
                                          <Menu>
                                            <MenuButton
                                              as={IconButton}
                                              aria-label="Options"
                                              icon={<FiMoreVertical />}
                                              size="sm"
                                              variant="ghost"
                                            />
                                            <MenuList>
                                              <MenuItem icon={<FiRefreshCw />}>Rotate Key</MenuItem>
                                              <MenuItem icon={<FiTrash2 />} color="red.500">
                                                Delete Key
                                              </MenuItem>
                                            </MenuList>
                                          </Menu>
                                        </HStack>
                                      </HStack>

                                      {/* Key Value */}
                                      <Box
                                        p={2}
                                        bg={useSemanticToken('surface.elevated')}
                                        borderRadius="md"
                                        fontFamily="mono"
                                        fontSize="xs"
                                      >
                                        {maskKey(key.key, isVisible)}
                                      </Box>

                                      {/* Usage Metrics */}
                                      <SimpleGrid columns={2} spacing={4}>
                                        <Box>
                                          <HStack justify="space-between" mb={1}>
                                            <Text fontSize="xs" color={mutedText}>
                                              Usage
                                            </Text>
                                            <Text fontSize="xs" fontWeight="600">
                                              {key.requestCount.toLocaleString()} / {key.requestLimit.toLocaleString()}
                                            </Text>
                                          </HStack>
                                          <Progress
                                            value={usagePercent}
                                            size="sm"
                                            colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'}
                                            borderRadius="full"
                                          />
                                          <Text fontSize="xs" color={mutedText} mt={1}>
                                            {usagePercent.toFixed(0)}% of limit
                                          </Text>
                                        </Box>

                                        <Box>
                                          <HStack justify="space-between" mb={1}>
                                            <Text fontSize="xs" color={mutedText}>
                                              Cost
                                            </Text>
                                            <Text fontSize="xs" fontWeight="600">
                                              ${key.costThisMonth.toFixed(2)} / ${key.costLimit.toFixed(2)}
                                            </Text>
                                          </HStack>
                                          <Progress
                                            value={costPercent}
                                            size="sm"
                                            colorScheme={costPercent > 80 ? 'red' : costPercent > 50 ? 'yellow' : 'green'}
                                            borderRadius="full"
                                          />
                                          <Text fontSize="xs" color={mutedText} mt={1}>
                                            {costPercent.toFixed(0)}% of budget
                                          </Text>
                                        </Box>
                                      </SimpleGrid>

                                      {/* Usage Trend Chart */}
                                      <Box>
                                        <Text fontSize="xs" color={mutedText} mb={2}>
                                          Request Trend (Last 7 Days)
                                        </Text>
                                        <Box height="80px">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={key.usageHistory}>
                                              <defs>
                                                <linearGradient id={`gradient-${key.id}`} x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                </linearGradient>
                                              </defs>
                                              <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                                              <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10 }}
                                                stroke={mutedText}
                                              />
                                              <YAxis tick={{ fontSize: 10 }} stroke={mutedText} />
                                              <Tooltip
                                                contentStyle={{
                                                  backgroundColor: cardBg,
                                                  border: `1px solid ${borderColor}`,
                                                  borderRadius: '6px',
                                                  fontSize: '11px',
                                                }}
                                              />
                                              <Area
                                                type="monotone"
                                                dataKey="requests"
                                                stroke="#8884d8"
                                                fill={`url(#gradient-${key.id})`}
                                              />
                                            </AreaChart>
                                          </ResponsiveContainer>
                                        </Box>
                                      </Box>

                                      <Divider />

                                      {/* Footer Info */}
                                      <HStack justify="space-between" fontSize="xs" color={mutedText}>
                                        <HStack spacing={1}>
                                          <Icon as={FiClock} />
                                          <Text>Last used: {key.lastUsed}</Text>
                                        </HStack>
                                        <HStack spacing={1}>
                                          {key.rotationDue <= 7 && (
                                            <Badge colorScheme="yellow" fontSize="xs">
                                              Rotation due in {key.rotationDue} days
                                            </Badge>
                                          )}
                                          {getTrendIcon(key.trend) && (
                                            <HStack spacing={1} color={getTrendColor(key.trend)}>
                                              <Icon as={getTrendIcon(key.trend)} />
                                              <Text textTransform="capitalize">{key.trend}</Text>
                                            </HStack>
                                          )}
                                        </HStack>
                                      </HStack>
                                    </VStack>
                                  </CardBody>
                                </Card>
                              );
                            })}
                          </VStack>
                        </Collapse>
                      </Box>
                    );
                  })}
                </VStack>
              </Collapse>
            </Box>
          );
        })}
      </VStack>

      {/* Alerts */}
      {keys.some(k => (k.requestCount / k.requestLimit) > 0.8) && (
        <Card borderWidth="1px" borderColor={useSemanticToken('status.warning')} bg={useSemanticToken('status.warningSubtle')}>
          <CardBody>
            <HStack spacing={3} align="start">
              <Icon as={FiAlertCircle} boxSize={5} color={useSemanticToken('status.warning')} mt={0.5} />
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="600">
                  Rate Limit Warning
                </Text>
                <Text fontSize="xs" color={mutedText}>
                  {keys.filter(k => (k.requestCount / k.requestLimit) > 0.8).length} key(s) approaching rate limit (80%+ usage)
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
      )}
    </VStack>
  );
}

/**
 * API Key Management - Enhanced with Project/Service grouping
 * Hierarchical view: Projects → Services → API Keys
 * Click a key to view details in right panel
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
  Collapse,
} from '@chakra-ui/react';
import {
  FiKey,
  FiFolder,
  FiChevronRight,
  FiChevronDown,
  FiBox,
  FiAlertCircle,
  FiPlus,
  FiTrendingUp,
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
            <Text fontWeight="600" color="purple.500">
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
                  as={FiFolder}
                  boxSize={5}
                  color={isProjectExpanded ? "blue.600" : "blue.500"}
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
                              const isSelected = selectedKey === key.id;

                              return (
                                <HStack
                                  key={key.id}
                                  p={3}
                                  cursor="pointer"
                                  onClick={() => handleKeyClick(key)}
                                  _hover={{ bg: hoverBg }}
                                  bg={isSelected ? selectedBg : 'transparent'}
                                  borderRadius="md"
                                  borderWidth="1px"
                                  borderColor={isSelected ? 'blue.300' : borderColor}
                                  justify="space-between"
                                >
                                  {/* Key Info */}
                                  <HStack spacing={3} flex={1}>
                                    <Icon as={FiKey} boxSize={4} color="blue.500" />
                                    <VStack align="start" spacing={0}>
                                      <HStack>
                                        <Text fontSize="sm" fontWeight="600">
                                          {key.name}
                                        </Text>
                                        <Badge
                                          colorScheme={key.status === 'active' ? 'green' : 'gray'}
                                          fontSize="xs"
                                        >
                                          {key.status}
                                        </Badge>
                                      </HStack>
                                      <Text fontSize="xs" color={mutedText}>
                                        {key.provider}
                                      </Text>
                                    </VStack>
                                  </HStack>

                                  {/* Usage Indicators */}
                                  <HStack spacing={4} fontSize="xs">
                                    <VStack align="end" spacing={0}>
                                      <Text color={mutedText}>Usage</Text>
                                      <Text fontWeight="600">
                                        {usagePercent.toFixed(0)}%
                                      </Text>
                                    </VStack>
                                    <Box width="60px">
                                      <Progress
                                        value={usagePercent}
                                        size="sm"
                                        colorScheme={
                                          usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'
                                        }
                                        borderRadius="full"
                                      />
                                    </Box>
                                    <VStack align="end" spacing={0}>
                                      <Text color={mutedText}>Cost</Text>
                                      <Text fontWeight="600">
                                        ${key.costThisMonth.toFixed(2)}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                </HStack>
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
        <Card borderWidth="1px" borderColor="yellow.300" bg={useSemanticToken('surface.highlight')}>
          <CardBody>
            <HStack spacing={3} align="start">
              <Icon as={FiAlertCircle} boxSize={5} color="yellow.500" mt={0.5} />
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

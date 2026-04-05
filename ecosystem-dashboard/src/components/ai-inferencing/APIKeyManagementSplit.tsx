/**
 * API Key Management - Split Panel Layout
 * Left: Project/Service hierarchy
 * Center: API Keys table for selected service
 * Right: Key details (opens when key is clicked)
 */

import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Card,
  CardBody,
  Badge,
  Progress,
  
  Icon,
  IconButton,
  Flex,
  Button,
  SimpleGrid,
  Divider,
  useDisclosure,
} from '@chakra-ui/react';
import { HealthScoreBadge } from './validation';
import {
  FiKey,
  FiFolder,
  FiChevronRight,
  FiChevronDown,
  FiBox,
  FiAlertCircle,
  FiPlus,
  FiRefreshCw,
  FiSettings,
  FiTrendingUp,
  FiTrendingDown,
  FiEye,
  FiEyeOff,
  FiClock,
  FiActivity,
} from 'react-icons/fi';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AddProjectModal } from './AddProjectModal';
import { AddAPIKeyModal } from './AddAPIKeyModal';
import { EditProjectServiceModal } from './EditProjectServiceModal';
import { PencilIcon } from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';

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
  rotationDue: number;
  projectId: string;
  projectName: string;
  serviceId: string;
  serviceName: string;
  usageHistory?: Array<{ date: string; requests: number; cost: number }>;
  trend?: 'increasing' | 'stable' | 'decreasing';
  health_score?: number; // 0-100 validation health score
  last_validated?: string; // ISO timestamp of last validation
}

interface Project {
  id: string;
  name: string;
  services: Service[];
  keyCount: number;
}

interface Service {
  id: string;
  name: string;
  projectId: string;
  keys: APIKey[];
}

interface Props {
  keys: APIKey[];
  onKeySelect?: (key: APIKey) => void;
  onRefresh?: () => void;
}

export function APIKeyManagementSplit({ keys, onKeySelect, onRefresh }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { isOpen: isAddProjectOpen, onOpen: onOpenAddProject, onClose: onCloseAddProject } = useDisclosure();
  const { isOpen: isAddServiceOpen, onOpen: onOpenAddService, onClose: onCloseAddService } = useDisclosure();
  const { isOpen: isAddKeyOpen, onOpen: onOpenAddKey, onClose: onCloseAddKey } = useDisclosure();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingProject, setEditingProject] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [editingService, setEditingService] = useState<{ id: string; name: string; description?: string } | null>(null);

  // Colors
  const borderColor = useSemanticToken('border.default');
  const mutedText = useSemanticToken('text.secondary');
  const hoverBg = useSemanticToken('surface.hover');
  const selectedBg = useSemanticToken('interactive.surface');
  const panelBg = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const keyBg = useSemanticToken('surface.elevated');
  const metricBg = useSemanticToken('surface.hover');

  // Group keys by project and service
  const groupedData: Project[] = keys.reduce((acc: Project[], key) => {
    let project = acc.find((p) => p.id === key.projectId);
    if (!project) {
      project = {
        id: key.projectId,
        name: key.projectName,
        services: [],
        keyCount: 0,
      };
      acc.push(project);
    }

    let service = project.services.find((s) => s.id === key.serviceId);
    if (!service) {
      service = {
        id: key.serviceId,
        name: key.serviceName,
        projectId: key.projectId,
        keys: [],
      };
      project.services.push(service);
    }

    service.keys.push(key);
    project.keyCount++;
    return acc;
  }, []);

  // Get selected service's keys
  const selectedServiceKeys = selectedService
    ? groupedData
        .flatMap((p) => p.services)
        .find((s) => s.id === selectedService)?.keys || []
    : [];

  const toggleProject = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
    setSelectedProject(projectId);
    setSelectedService(null); // Clear service selection when toggling project
  };

  const handleServiceClick = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedKey(null); // Clear key selection
  };

  const handleKeyClick = (key: APIKey) => {
    setSelectedKey(key.id);
    onKeySelect?.(key);
  };

  const toggleKeyExpansion = (keyId: string) => {
    const newSet = new Set(expandedKeys);
    if (newSet.has(keyId)) {
      newSet.delete(keyId);
    } else {
      newSet.add(keyId);
    }
    setExpandedKeys(newSet);
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newSet = new Set(visibleKeys);
    if (newSet.has(keyId)) {
      newSet.delete(keyId);
    } else {
      newSet.add(keyId);
    }
    setVisibleKeys(newSet);
  };

  const maskKey = (key: string, visible: boolean) => {
    if (visible) return key;
    const start = key.substring(0, 10);
    const end = key.substring(key.length - 4);
    return `${start}${'•'.repeat(20)}${end}`;
  };

  const getTrendIcon = (trend?: string) => {
    if (trend === 'increasing') return FiTrendingUp;
    if (trend === 'decreasing') return FiTrendingDown;
    return null;
  };

  const getTrendColor = (trend?: string) => {
    if (trend === 'increasing') return 'green.500';
    if (trend === 'decreasing') return 'red.500';
    return 'gray.500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'green';
      case 'inactive':
        return 'gray';
      case 'expired':
        return 'red';
      default:
        return 'gray';
    }
  };

  const cardBg = useSemanticToken('surface.elevated');

  return (
    <HStack spacing={0} align="stretch" height="calc(100vh - 150px)" width="100%" overflow="hidden">
      {/* Left Panel - Project/Service Hierarchy */}
      <Box
        width="240px"
        flexShrink={0}
        borderRight="1px solid"
        borderColor={borderColor}
        bg={panelBg}
        overflowY="auto"
        height="full"
        position="relative"
        zIndex={1}
      >
        <VStack spacing={0} align="stretch">
          {/* Header */}
          <Box p={3} borderBottom="1px solid" borderColor={borderColor}>
            <VStack align="start" spacing={1}>
              <HStack justify="space-between" width="full">
                <Text fontSize="xs" fontWeight="600" color={textColor}>
                  Projects
                </Text>
                <IconButton 
                  aria-label="Add Project"
                  icon={<FiPlus />}
                  size="xs"
                  colorScheme="blue" 
                  variant="ghost"
                  onClick={onOpenAddProject}
                />
              </HStack>
              <Text fontSize="2xs" color={mutedText}>
                {groupedData.length} projects • {keys.length} keys
              </Text>
            </VStack>
          </Box>

          {/* Hierarchy */}
          <VStack spacing={0} align="stretch" py={2}>
            {groupedData.map((project) => (
              <Box key={project.id}>
                {/* Project Row */}
                <HStack
                  px={2}
                  py={1.5}
                  spacing={1.5}
                  cursor="pointer"
                  onClick={() => toggleProject(project.id)}
                  _hover={{ bg: hoverBg }}
                  transition="background 0.15s"
                  role="group"
                >
                  <Icon
                    as={expandedProjects.has(project.id) ? FiChevronDown : FiChevronRight}
                    boxSize={2.5}
                    color={mutedText}
                  />
                  <Icon
                    as={FiFolder}
                    boxSize={3.5}
                    color={expandedProjects.has(project.id) ? "blue.600" : "blue.500"}
                  />
                  <Text fontSize="xs" fontWeight="500" flex={1} color={textColor} noOfLines={1}>
                    {project.name}
                  </Text>
                  <IconButton
                    aria-label="Edit project"
                    icon={<PencilIcon className="w-3 h-3" />}
                    size="xs"
                    variant="ghost"
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject({ id: project.id, name: project.name });
                    }}
                  />
                  <Badge colorScheme="gray" fontSize="2xs">
                    {project.keyCount}
                  </Badge>
                </HStack>

                {/* Services */}
                {expandedProjects.has(project.id) &&
                  project.services.map((service) => (
                    <HStack
                      key={service.id}
                      pl={7}
                      pr={2}
                      py={1.5}
                      spacing={1.5}
                      bg={selectedService === service.id ? selectedBg : 'transparent'}
                      _hover={{ bg: selectedService === service.id ? selectedBg : hoverBg }}
                      borderLeft="2px solid"
                      borderColor={
                        selectedService === service.id ? 'blue.500' : 'transparent'
                      }
                      transition="all 0.15s"
                      role="group"
                    >
                      <Icon as={FiBox} boxSize={2.5} color={mutedText} />
                      <Text 
                        fontSize="xs" 
                        flex={1} 
                        color={textColor} 
                        noOfLines={1}
                        cursor="pointer"
                        onClick={() => handleServiceClick(service.id)}
                      >
                        {service.name}
                      </Text>
                      <IconButton
                        aria-label="Edit service"
                        icon={<PencilIcon className="w-3 h-3" />}
                        size="xs"
                        variant="ghost"
                        opacity={0}
                        _groupHover={{ opacity: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingService({ id: service.id, name: service.name });
                        }}
                      />
                      <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
                        {service.keys.length}
                      </Badge>
                    </HStack>
                  ))}
              </Box>
            ))}
          </VStack>
        </VStack>
      </Box>

      {/* Center Panel - Keys List */}
      <Box 
        flex={1} 
        bg={panelBg} 
        overflowY="auto" 
        overflowX="hidden"
        height="full" 
        minW={0}
        width="100%"
        maxW="100%"
        transition="all 0.2s ease"
      >
        {selectedService ? (
          <VStack spacing={0} align="stretch" height="full" width="100%" overflow="hidden">
            {/* Header */}
            <Box p={3} borderBottom="1px solid" borderColor={borderColor}>
              <HStack justify="space-between">
                <VStack align="start" spacing={0.5}>
                  <Text fontSize="sm" fontWeight="600" color={textColor}>
                    API Keys
                  </Text>
                  <Text fontSize="xs" color={mutedText}>
                    {selectedServiceKeys.length} keys in {
                      groupedData
                        .flatMap((p) => p.services)
                        .find((s) => s.id === selectedService)?.name
                    }
                  </Text>
                </VStack>
                <HStack spacing={2}>
                  <IconButton
                    aria-label="Refresh"
                    icon={<FiRefreshCw />}
                    size="sm"
                    variant="ghost"
                  />
                  <Button 
                    leftIcon={<FiPlus />} 
                    colorScheme="blue" 
                    size="sm"
                    onClick={() => {
                      const service = groupedData
                        .flatMap((p) => p.services)
                        .find((s) => s.id === selectedService);
                      
                      if (service?.id.includes('placeholder')) {
                        alert('This project has no services yet.\n\nPlease create a service first before adding API keys.');
                      } else {
                        onOpenAddKey();
                      }
                    }}
                  >
                    Add Key
                  </Button>
                </HStack>
              </HStack>
            </Box>

            {/* Keys List with Expandable Details */}
            <VStack spacing={2} px={3} py={3} align="stretch" width="100%" overflow="hidden">
              {selectedServiceKeys.map((key) => {
                const usagePercent = (key.requestCount / key.requestLimit) * 100;
                const costPercent = (key.costThisMonth / key.costLimit) * 100;
                const isExpanded = expandedKeys.has(key.id);
                const isVisible = visibleKeys.has(key.id);

                return (
                  <Card
                    key={key.id}
                    borderWidth="1px"
                    borderColor={selectedKey === key.id ? 'blue.500' : borderColor}
                    bg={selectedKey === key.id ? selectedBg : cardBg}
                    borderRadius="md"
                    overflow="hidden"
                    transition="all 0.2s"
                    width="100%"
                    minW={0}
                  >
                    {/* Compact Row View */}
                    <HStack
                      p={3}
                      spacing={3}
                      cursor="pointer"
                      onClick={() => {
                        handleKeyClick(key);
                        toggleKeyExpansion(key.id);
                      }}
                      _hover={{ bg: hoverBg }}
                      width="full"
                      maxW="100%"
                    >
                      {/* Expand Icon */}
                      <Icon
                        as={isExpanded ? FiChevronDown : FiChevronRight}
                        boxSize={4}
                        color={mutedText}
                        flexShrink={0}
                      />

                      {/* Key Icon & Name */}
                      <Icon as={FiKey} boxSize={4} color="blue.500" flexShrink={0} />
                      <VStack align="start" spacing={0} flex={1} minW={0} overflow="hidden">
                        <HStack spacing={2} maxW="100%">
                          <Text fontSize="sm" fontWeight="600" isTruncated>
                            {key.name}
                          </Text>
                          <Badge colorScheme={getStatusColor(key.status)} fontSize="2xs" flexShrink={0}>
                            {key.status}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" color={mutedText} isTruncated>
                          {key.provider}
                        </Text>
                      </VStack>

                      {/* Health Score Badge */}
                      {key.health_score !== undefined && (
                        <Box flexShrink={0} onClick={(e) => e.stopPropagation()}>
                          <HealthScoreBadge
                            score={key.health_score}
                            size="sm"
                            lastChecked={key.last_validated}
                          />
                        </Box>
                      )}

                      {/* Quick Metrics */}
                      <VStack align="end" spacing={0} flexShrink={0} display={{ base: 'none', md: 'flex' }} w="90px">
                        <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
                          {key.requestCount.toLocaleString()}
                        </Text>
                        <Progress
                          value={usagePercent}
                          size="xs"
                          width="100%"
                          colorScheme={usagePercent > 80 ? 'red' : usagePercent > 50 ? 'yellow' : 'green'}
                        />
                      </VStack>

                      <VStack align="end" spacing={0} flexShrink={0} display={{ base: 'none', lg: 'flex' }} w="80px">
                        <Text fontSize="sm" fontWeight="600" whiteSpace="nowrap">
                          ${key.costThisMonth.toFixed(2)}
                        </Text>
                        <Text fontSize="2xs" color={mutedText} whiteSpace="nowrap">
                          ${key.costLimit.toFixed(0)} limit
                        </Text>
                      </VStack>

                      {/* Actions */}
                      <HStack spacing={1} flexShrink={0} w="65px">
                        <IconButton
                          aria-label="Toggle visibility"
                          icon={<Icon as={isVisible ? FiEye : FiEyeOff} />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleKeyVisibility(key.id);
                          }}
                        />
                        <IconButton
                          aria-label="Settings"
                          icon={<FiSettings />}
                          size="xs"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleKeyClick(key);
                          }}
                        />
                      </HStack>
                    </HStack>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <Box borderTop="1px solid" borderColor={borderColor} p={4} bg={panelBg} width="full" maxW="100%">
                        <VStack spacing={4} align="stretch" width="full" maxW="100%">
                          {/* Key Value */}
                          <Box>
                            <Text fontSize="xs" color={mutedText} mb={2}>
                              API Key
                            </Text>
                            <HStack spacing={2}>
                              <Box
                                flex={1}
                                p={2}
                                bg={keyBg}
                                borderRadius="md"
                                fontFamily="mono"
                                fontSize="xs"
                              >
                                {maskKey(key.key, isVisible)}
                              </Box>
                              <IconButton
                                aria-label="Copy key"
                                icon={<Icon as={FiKey} />}
                                size="sm"
                                variant="ghost"
                              />
                            </HStack>
                          </Box>

                          {/* Usage & Cost Metrics */}
                          <SimpleGrid columns={2} spacing={6}>
                            <Box>
                              <HStack justify="space-between" mb={2}>
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
                              <HStack justify="space-between" mb={2}>
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

                          {/* Activity Chart */}
                          {key.usageHistory && key.usageHistory.length > 0 ? (
                            <Box width="full" maxW="100%">
                              <HStack justify="space-between" mb={2}>
                                <HStack spacing={2}>
                                  <Icon as={FiActivity} boxSize={3} color={mutedText} />
                                  <Text fontSize="xs" color={mutedText}>
                                    Request Trend (Last 7 Days)
                                  </Text>
                                </HStack>
                                {getTrendIcon(key.trend) && (
                                  <HStack spacing={1} color={getTrendColor(key.trend)} fontSize="xs">
                                    <Icon as={getTrendIcon(key.trend)} boxSize={3} />
                                    <Text textTransform="capitalize">{key.trend}</Text>
                                  </HStack>
                                )}
                              </HStack>
                              <Box height="180px" width="100%" maxW="100%">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={key.usageHistory}>
                                    <defs>
                                      <linearGradient id={`gradient-${key.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3182ce" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3182ce" stopOpacity={0} />
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
                                      stroke="#3182ce"
                                      fill={`url(#gradient-${key.id})`}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </Box>
                            </Box>
                          ) : (
                            <Box 
                              width="full" 
                              textAlign="center" 
                              py={6} 
                              borderRadius="md"
                              bg={metricBg}
                            >
                              <VStack spacing={2}>
                                <Icon as={FiActivity} boxSize={8} color={mutedText} />
                                <Text fontSize="sm" fontWeight="500" color={textColor}>
                                  No activity data yet
                                </Text>
                                <Text fontSize="xs" color={mutedText}>
                                  Chart will appear once this key is used
                                </Text>
                              </VStack>
                            </Box>
                          )}

                          <Divider />

                          {/* Footer Info */}
                          <HStack justify="space-between" fontSize="xs" color={mutedText}>
                            <HStack spacing={2}>
                              <Icon as={FiClock} boxSize={3} />
                              <Text>Last used: {key.lastUsed}</Text>
                            </HStack>
                            {key.rotationDue <= 7 && (
                              <Badge colorScheme="yellow" fontSize="xs">
                                Rotation due in {key.rotationDue} days
                              </Badge>
                            )}
                          </HStack>
                        </VStack>
                      </Box>
                    )}
                  </Card>
                );
              })}
            </VStack>
          </VStack>
        ) : (
          <Flex
            direction="column"
            align="center"
            justify="center"
            height="full"
            gap={4}
            px={8}
          >
            {selectedProject ? (
              // Project selected but no service
              <>
                <Icon as={FiBox} boxSize={12} color={mutedText} />
                <Text fontSize="lg" fontWeight="500" color={textColor}>
                  Service Level
                </Text>
                <Text fontSize="sm" color={mutedText} textAlign="center">
                  Add a service to this project, or add an API key (which will create a service)
                </Text>
                <HStack spacing={3}>
                  <Button
                    leftIcon={<FiPlus />}
                    colorScheme="blue"
                    variant="outline"
                    onClick={onOpenAddService}
                  >
                    Add Service
                  </Button>
                  <Button
                    leftIcon={<FiKey />}
                    colorScheme="blue"
                    onClick={onOpenAddKey}
                  >
                    Add API Key
                  </Button>
                </HStack>
              </>
            ) : (
              // No project selected
              <>
                <Icon as={FiKey} boxSize={12} color={mutedText} />
                <Text fontSize="lg" fontWeight="500" color={textColor}>
                  Select a Project or Service
                </Text>
                <Text fontSize="sm" color={mutedText} textAlign="center">
                  Choose a project to manage services, or select a service to view its API keys
                </Text>
              </>
            )}
          </Flex>
        )}
      </Box>

      {/* Add Project Modal */}
      <AddProjectModal
        isOpen={isAddProjectOpen}
        onClose={onCloseAddProject}
        onProjectCreated={(project) => {
          console.log('Project created:', project);
          onRefresh?.();
        }}
      />

      {/* Add Service Modal - Simple for now, just uses AddAPIKeyModal with create service option */}
      {/* TODO: Create dedicated AddServiceModal component */}

      {/* Add API Key Modal */}
      <AddAPIKeyModal
        isOpen={isAddKeyOpen || isAddServiceOpen}
        onClose={() => {
          onCloseAddKey();
          onCloseAddService();
        }}
        projectId={
          selectedService
            ? groupedData
                .flatMap((p) => p.services)
                .find((s) => s.id === selectedService)?.projectId || ''
            : selectedProject || ''
        }
        serviceId={selectedService || ''}
        onKeyAdded={() => {
          console.log('API Key added');
          onRefresh?.();
          setRefreshTrigger((prev) => prev + 1);
        }}
      />

      {/* Edit Project Modal */}
      <EditProjectServiceModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        type="project"
        id={editingProject?.id || ''}
        currentName={editingProject?.name || ''}
        currentDescription={editingProject?.description}
        onUpdated={() => {
          onRefresh?.();
          setEditingProject(null);
        }}
      />

      {/* Edit Service Modal */}
      <EditProjectServiceModal
        isOpen={!!editingService}
        onClose={() => setEditingService(null)}
        type="service"
        id={editingService?.id || ''}
        currentName={editingService?.name || ''}
        currentDescription={editingService?.description}
        onUpdated={() => {
          onRefresh?.();
          setEditingService(null);
        }}
      />
    </HStack>
  );
}

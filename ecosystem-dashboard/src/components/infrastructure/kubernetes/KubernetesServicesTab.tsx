import React, { useState, useEffect } from 'react';
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
  Input,
  Select,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
} from '@chakra-ui/react';
import {
  EyeIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ServiceData {
  name: string;
  namespace: string;
  type: string;
  status: string;
  age: string;
  restarts: number;
  ready: string;
  ports?: string;
}

interface KubernetesServicesTabProps {
  services?: ServiceData[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onRestartService?: (name: string, namespace: string) => void;
  onScaleService?: (name: string, namespace: string, replicas: number) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running': return 'green';
    case 'pending': return 'yellow';
    case 'failed': return 'red';
    case 'succeeded': return 'blue';
    default: return 'gray';
  }
};

export const KubernetesServicesTab: React.FC<KubernetesServicesTabProps> = ({
  services = [],
  isLoading = false,
  onRefresh,
  onRestartService,
  onScaleService,
}) => {
  const [filteredServices, setFilteredServices] = useState<ServiceData[]>(services);
  const [nameFilter, setNameFilter] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const toast = useToast();
  const tableBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  
  // Filter services based on current filters
  useEffect(() => {
    let filtered = services;
    
    if (nameFilter) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    
    if (namespaceFilter !== 'all') {
      filtered = filtered.filter(service => service.namespace === namespaceFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => 
        service.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    setFilteredServices(filtered);
  }, [services, nameFilter, namespaceFilter, statusFilter]);

  const handleRestartService = (name: string, namespace: string) => {
    onRestartService?.(name, namespace);
    toast({
      title: 'Service Restart',
      description: `Restarting ${name} in ${namespace} namespace`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleScaleService = (name: string, namespace: string, replicas: number) => {
    onScaleService?.(name, namespace, replicas);
    toast({
      title: 'Service Scaling',
      description: `Scaling ${name} to ${replicas} replicas`,
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // Get unique namespaces for filter
  const uniqueNamespaces = Array.from(new Set(services.map(s => s.namespace)));
  
  return (
    <VStack align="stretch" spacing={6}>
      {/* Filters and Controls */}
      <GlassPanel p={6} variant="light">
        <Flex direction={{ base: 'column', md: 'row' }} gap={4} align={{ base: 'stretch', md: 'center' }} justify="space-between">
          <HStack spacing={4} flex={1}>
            <Input
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              maxW="200px"
              size="sm"
            />
            <Select
              value={namespaceFilter}
              onChange={(e) => setNamespaceFilter(e.target.value)}
              maxW="150px"
              size="sm"
            >
              <option value="all">All Namespaces</option>
              {uniqueNamespaces.map(ns => (
                <option key={ns} value={ns}>{ns}</option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              maxW="130px"
              size="sm"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </Select>
          </HStack>
          
          <HStack spacing={3}>
            <Button
              size="sm"
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
              onClick={onRefresh}
              isLoading={isLoading}
              colorScheme="blue"
              variant="outline"
            >
              Refresh
            </Button>
          </HStack>
        </Flex>
      </GlassPanel>

      {/* Services Table */}
      <GlassPanel variant="light" overflow="hidden">
        <Box overflowX="auto">
          <Table variant="simple" bg={tableBg}>
            <Thead>
              <Tr borderBottomColor={borderColor}>
                <Th>Name</Th>
                <Th>Namespace</Th>
                <Th>Status</Th>
                <Th>Ready</Th>
                <Th>Restarts</Th>
                <Th>Age</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredServices.map((service, index) => (
                <Tr key={`${service.namespace}-${service.name}-${index}`} borderBottomColor={borderColor}>
                  <Td>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="medium" fontSize="sm">
                        {service.name}
                      </Text>
                      {service.ports && (
                        <Text fontSize="xs" color={useSemanticToken('text.secondary')}>
                          {service.ports}
                        </Text>
                      )}
                    </VStack>
                  </Td>
                  <Td>
                    <Badge variant="outline" colorScheme="blue" fontSize="xs">
                      {service.namespace}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(service.status)} variant="solid">
                      {service.status}
                    </Badge>
                  </Td>
                  <Td>
                    <Text fontSize="sm">{service.ready}</Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={service.restarts > 0 ? 'orange.500' : 'green.500'}>
                      {service.restarts}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={useSemanticToken('text.secondary')}>{service.age}</Text>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <IconButton
                        size="sm"
                        icon={<EyeIcon className="w-4 h-4" />}
                        aria-label="View details"
                        variant="ghost"
                        colorScheme="blue"
                      />
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          size="sm"
                          icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                          aria-label="More actions"
                          variant="ghost"
                        />
                        <MenuList>
                          <MenuItem
                            icon={<ArrowPathIcon className="w-4 h-4" />}
                            onClick={() => handleRestartService(service.name, service.namespace)}
                          >
                            Restart
                          </MenuItem>
                          <MenuItem
                            icon={<PlayIcon className="w-4 h-4" />}
                            onClick={() => handleScaleService(service.name, service.namespace, 2)}
                          >
                            Scale Up
                          </MenuItem>
                          <MenuItem
                            icon={<StopIcon className="w-4 h-4" />}
                            onClick={() => handleScaleService(service.name, service.namespace, 0)}
                            color="red.500"
                          >
                            Scale Down
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          
          {filteredServices.length === 0 && (
            <Box p={8} textAlign="center">
              <Text color={useSemanticToken('text.secondary')}>
                {isLoading ? 'Loading services...' : 'No services found matching your filters'}
              </Text>
            </Box>
          )}
        </Box>
      </GlassPanel>
    </VStack>
  );
};

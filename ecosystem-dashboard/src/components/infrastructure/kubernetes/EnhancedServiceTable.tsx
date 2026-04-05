import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Badge,
  Progress,
  HStack,
  VStack,
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Avatar,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Divider,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiChevronDown,
  FiMoreVertical,
  FiSearch,
  FiPlay,
  FiSquare,
  FiRefreshCw,
  FiEye,
} from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface EnhancedServiceTableProps {
  servicesData: any[];
  isLoading: boolean;
  onServiceAction: (service: any, action: string) => void;
  selectedNamespace: string;
  onNamespaceChange: (namespace: string) => void;
  namespaces: string[];
}

const EnhancedServiceTable: React.FC<EnhancedServiceTableProps> = ({
  servicesData,
  isLoading,
  onServiceAction,
  selectedNamespace,
  onNamespaceChange,
  namespaces,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  const getHealthPercentage = (service: any) => {
    if (!service.ready) return 25;
    if (service.restarts > 5) return 60;
    if (service.restarts > 2) return 80;
    return 95;
  };

  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('gateway')) return '🚪';
    if (name.includes('database') || name.includes('postgres') || name.includes('mysql')) return '🗄️';
    if (name.includes('redis')) return '⚡';
    if (name.includes('monitoring') || name.includes('grafana')) return '📊';
    if (name.includes('auth')) return '🔐';
    if (name.includes('api')) return '🔌';
    if (name.includes('web') || name.includes('frontend')) return '🌐';
    return '⚙️';
  };

  const filteredAndSortedServices = servicesData
    .filter(service =>
      (selectedNamespace === 'all' || service.namespace === selectedNamespace) &&
      (service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.namespace?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <GlassPanel variant="light">
        <Box p={6}>
          <VStack spacing={4}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Box key={i} w="full" h="60px" bg={useSemanticToken('surface.elevated')} borderRadius="lg" />
            ))}
          </VStack>
        </Box>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel variant="light">
      <Box p={6}>
        {/* Enhanced Header with Filters */}
        <VStack spacing={4} mb={6}>
          <Flex justify="space-between" align="center" w="full" wrap="wrap" gap={4}>
            <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
              Service Observatory
            </Text>
            <HStack spacing={3}>
              <Text fontSize="sm" color={textSecondary}>
                {filteredAndSortedServices.length} services
              </Text>
              <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                Live
              </Badge>
            </HStack>
          </Flex>

          {/* Filters Row */}
          <Flex gap={4} w="full" wrap="wrap">
            <InputGroup maxW="300px">
              <InputLeftElement>
                <FiSearch style={{ color: textSecondary }} />
              </InputLeftElement>
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg={useSemanticToken('surface.elevated')}
                border="1px solid"
                borderColor={borderColor}
                _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px blue.400' }}
              />
            </InputGroup>

            <Select
              maxW="200px"
              value={selectedNamespace}
              onChange={(e) => onNamespaceChange(e.target.value)}
              bg={useSemanticToken('surface.elevated')}
              border="1px solid"
              borderColor={borderColor}
            >
              {namespaces.map((ns) => (
                <option key={ns} value={ns}>
                  {ns === 'all' ? 'All Namespaces' : ns}
                </option>
              ))}
            </Select>

            <Select
              maxW="150px"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [column, order] = e.target.value.split('-');
                setSortBy(column);
                setSortOrder(order as 'asc' | 'desc');
              }}
              bg={useSemanticToken('surface.elevated')}
              border="1px solid"
              borderColor={borderColor}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="status-asc">Status A-Z</option>
              <option value="namespace-asc">Namespace A-Z</option>
              <option value="restarts-asc">Restarts Low-High</option>
              <option value="restarts-desc">Restarts High-Low</option>
            </Select>
          </Flex>
        </VStack>

        <Divider mb={6} />

        {/* Enhanced Table */}
        <TableContainer>
          <Table variant="simple" size="md">
            <Thead>
              <Tr>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('name')}
                  _hover={{ bg: hoverBg }}
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <HStack spacing={2}>
                    <Text>Service</Text>
                    {sortBy === 'name' && (
                      <FiChevronDown
                        style={{
                          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    )}
                  </HStack>
                </Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('status')}
                  _hover={{ bg: hoverBg }}
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <HStack spacing={2}>
                    <Text>Status</Text>
                    {sortBy === 'status' && (
                      <FiChevronDown
                        style={{
                          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    )}
                  </HStack>
                </Th>
                <Th>Health</Th>
                <Th>Resources</Th>
                <Th
                  cursor="pointer"
                  onClick={() => handleSort('restarts')}
                  _hover={{ bg: hoverBg }}
                  borderRadius="md"
                  transition="all 0.2s"
                >
                  <HStack spacing={2}>
                    <Text>Restarts</Text>
                    {sortBy === 'restarts' && (
                      <FiChevronDown
                        style={{
                          transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    )}
                  </HStack>
                </Th>
                <Th>Age</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredAndSortedServices.map((service, index) => (
                <Tr
                  key={`${service.name}-${service.namespace}`}
                  _hover={{ bg: hoverBg }}
                  transition="all 0.2s"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                  }}
                  className="slide-up-animation"
                >
                  {/* Service Column */}
                  <Td>
                    <HStack spacing={3}>
                      <Avatar
                        size="sm"
                        name={service.name}
                        bg="blue.500"
                        color="whiteAlpha.900"
                        fontSize="sm"
                        icon={<Text>{getServiceIcon(service.name)}</Text>}
                      />
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="semibold" color={textPrimary}>
                          {service.name}
                        </Text>
                        <Badge
                          size="sm"
                          colorScheme="gray"
                          variant="subtle"
                          borderRadius="full"
                        >
                          {service.namespace}
                        </Badge>
                      </VStack>
                    </HStack>
                  </Td>

                  {/* Status Column */}
                  <Td>
                    <Badge
                      colorScheme={getStatusColor(service.status)}
                      variant="solid"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="bold"
                    >
                      {service.status}
                    </Badge>
                  </Td>

                  {/* Health Column */}
                  <Td>
                    <VStack spacing={1} align="start">
                      <HStack spacing={2}>
                        <Text fontSize="sm" fontWeight="semibold">
                          {getHealthPercentage(service)}%
                        </Text>
                        <Box
                          w={2}
                          h={2}
                          borderRadius="full"
                          bg={getHealthPercentage(service) > 80 ? 'green.400' :
                            getHealthPercentage(service) > 60 ? 'yellow.400' : 'red.400'}
                        />
                      </HStack>
                      <Progress
                        value={getHealthPercentage(service)}
                        size="sm"
                        colorScheme={getHealthPercentage(service) > 80 ? 'green' :
                          getHealthPercentage(service) > 60 ? 'yellow' : 'red'}
                        borderRadius="full"
                        w="80px"
                      />
                    </VStack>
                  </Td>

                  {/* Resources Column */}
                  <Td>
                    <VStack spacing={1} align="start">
                      <HStack spacing={2}>
                        <Text fontSize="xs" color={textSecondary}>CPU:</Text>
                        <Text fontSize="xs" fontWeight="semibold">
                          {service.cpu || 0}%
                        </Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Text fontSize="xs" color={textSecondary}>Mem:</Text>
                        <Text fontSize="xs" fontWeight="semibold">
                          {service.memory || 0}%
                        </Text>
                      </HStack>
                    </VStack>
                  </Td>

                  {/* Restarts Column */}
                  <Td>
                    <Badge
                      colorScheme={service.restarts === 0 ? 'green' :
                        service.restarts < 3 ? 'yellow' : 'red'}
                      variant="subtle"
                      borderRadius="full"
                    >
                      {service.restarts || 0}
                    </Badge>
                  </Td>

                  {/* Age Column */}
                  <Td>
                    <Text fontSize="sm" color={textSecondary}>
                      {service.age || 'Unknown'}
                    </Text>
                  </Td>

                  {/* Actions Column */}
                  <Td>
                    <HStack spacing={1}>
                      <Tooltip label="View Details">
                        <IconButton
                          size="sm"
                          variant="ghost"
                          colorScheme="blue"
                          icon={<FiEye />}
                          onClick={() => onServiceAction(service, 'View')}
                          aria-label="View service details"
                        />
                      </Tooltip>

                      <Menu>
                        <MenuButton
                          as={IconButton}
                          size="sm"
                          variant="ghost"
                          colorScheme="gray"
                          icon={<FiMoreVertical />}
                          aria-label="Service actions"
                        />
                        <MenuList>
                          <MenuItem
                            icon={<FiRefreshCw />}
                            onClick={() => onServiceAction(service, 'Restart')}
                          >
                            Restart Service
                          </MenuItem>
                          <MenuItem
                            icon={<FiPlay />}
                            onClick={() => onServiceAction(service, 'Scale Up')}
                          >
                            Scale Up
                          </MenuItem>
                          <MenuItem
                            icon={<FiSquare />}
                            onClick={() => onServiceAction(service, 'Scale Down')}
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
        </TableContainer>

        {filteredAndSortedServices.length === 0 && (
          <Box textAlign="center" py={12}>
            <Text color={textSecondary} fontSize="lg">
              No services found matching your criteria
            </Text>
            <Text color={textSecondary} fontSize="sm" mt={2}>
              Try adjusting your search or namespace filter
            </Text>
          </Box>
        )}
      </Box>
    </GlassPanel>
  );
};

export default EnhancedServiceTable;

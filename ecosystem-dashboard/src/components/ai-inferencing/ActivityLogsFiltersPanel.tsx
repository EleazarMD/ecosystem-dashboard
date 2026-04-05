/**
 * Activity Logs Filters Panel
 * Right panel filters for Activity Logs page
 */

import React, { useState } from 'react';
import {
  VStack,
  Box,
  Text,
  Select,
  Button,
  Icon,
} from '@chakra-ui/react';
import { FiDownload } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Props {
  statusOptions: string[];
  providerOptions: string[];
  serviceOptions: string[];
  onExportCSV: () => void;
}

export function ActivityLogsFiltersPanel({
  statusOptions,
  providerOptions,
  serviceOptions,
  onExportCSV,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  
  const mutedText = useSemanticToken('text.secondary');

  return (
    <VStack spacing={4} align="stretch" p={4}>
      {/* Filters Header */}
      <Box>
        <Text fontSize="md" fontWeight="600" mb={1}>
          Filters
        </Text>
        <Text fontSize="xs" color={mutedText}>
          Narrow down activity logs
        </Text>
      </Box>

      {/* Status Filter */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Status
        </Text>
        <Select
          size="sm"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Box>

      {/* Provider Filter */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Provider
        </Text>
        <Select
          size="sm"
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
        >
          {providerOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Box>

      {/* Service Filter */}
      <Box>
        <Text fontSize="sm" fontWeight="600" mb={2}>
          Service
        </Text>
        <Select
          size="sm"
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
        >
          {serviceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </Box>

      {/* Export CSV */}
      <Box pt={2} borderTopWidth="1px">
        <Button
          size="sm"
          width="full"
          leftIcon={<Icon as={FiDownload} />}
          colorScheme="green"
          variant="outline"
          onClick={onExportCSV}
        >
          Export CSV
        </Button>
        <Text fontSize="xs" color={mutedText} mt={2}>
          Export filtered logs to CSV file
        </Text>
      </Box>
    </VStack>
  );
}

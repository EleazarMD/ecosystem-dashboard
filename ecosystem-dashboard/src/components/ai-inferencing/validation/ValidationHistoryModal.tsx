/**
 * Validation History Modal
 * Full-screen modal showing complete validation history with charts and filtering
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Button,
  Select,
} from '@chakra-ui/react';
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiAlertCircle,
  FiBarChart2,
  FiDownload,
} from 'react-icons/fi';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface ValidationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyId: string;
  keyName?: string;
  provider?: string;
}

interface HistoryItem {
  id: number;
  validated_at: string;
  valid: boolean;
  response_time_ms: number;
  error_type?: string;
  error_message?: string;
  validation_type: string;
  status_code?: number;
}

const AI_INFERENCING_URL = process.env.NEXT_PUBLIC_AI_INFERENCING_URL || 'http://localhost:9000';
const ADMIN_KEY = process.env.NEXT_PUBLIC_AI_INFERENCING_ADMIN_KEY || 'ai-inferencing-admin-key-2024';

export function ValidationHistoryModal({
  isOpen,
  onClose,
  keyId,
  keyName,
  provider,
}: ValidationHistoryModalProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const borderColor = useSemanticToken('border.default');
  const headerBg = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');
  const mutedText = useSemanticToken('text.secondary');

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, keyId, limit]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${AI_INFERENCING_URL}/api/v1/admin/keys/keys/${keyId}/validation-history?limit=${limit}`,
        {
          headers: { 'X-Admin-Key': ADMIN_KEY },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (item: HistoryItem) => {
    if (item.valid) return FiCheckCircle;
    if (item.error_type === 'timeout') return FiClock;
    if (item.error_type === 'quota') return FiAlertCircle;
    return FiXCircle;
  };

  const getColor = (item: HistoryItem) => {
    if (item.valid) return 'green';
    if (item.error_type === 'timeout') return 'orange';
    if (item.error_type === 'quota') return 'purple';
    if (item.error_type === 'auth') return 'red';
    return 'red';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // Calculate statistics
  const stats = {
    total: history.length,
    successful: history.filter((h) => h.valid).length,
    failed: history.filter((h) => !h.valid).length,
    avgResponseTime:
      history.length > 0
        ? Math.round(
            history.reduce((sum, h) => sum + h.response_time_ms, 0) / history.length
          )
        : 0,
  };

  const successRate = stats.total > 0 ? (stats.successful / stats.total) * 100 : 0;

  // Prepare chart data
  const chartData = [...history]
    .reverse()
    .map((item) => ({
      time: new Date(item.validated_at).toLocaleTimeString(),
      responseTime: item.response_time_ms,
      success: item.valid ? 1 : 0,
    }));

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Status', 'Response Time (ms)', 'Error Type', 'Error Message', 'Validation Type'],
      ...history.map((item) => [
        item.validated_at,
        item.valid ? 'Success' : 'Failed',
        item.response_time_ms,
        item.error_type || '',
        item.error_message || '',
        item.validation_type,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-history-${keyId}-${Date.now()}.csv`;
    a.click();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <VStack align="start" spacing={1}>
            <HStack>
              <FiBarChart2 />
              <Text>Validation History</Text>
            </HStack>
            {keyName && (
              <Text fontSize="sm" fontWeight="normal" color={useSemanticToken('text.secondary')}>
                {keyName} • {provider}
              </Text>
            )}
          </VStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <VStack spacing={5} align="stretch">
            {/* Statistics */}
            <HStack spacing={4}>
              <Box
                flex={1}
                p={4}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
              >
                <Text fontSize="xs" color={mutedText} mb={1}>
                  TOTAL CHECKS
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {stats.total}
                </Text>
              </Box>
              <Box
                flex={1}
                p={4}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
              >
                <Text fontSize="xs" color={mutedText} mb={1}>
                  SUCCESS RATE
                </Text>
                <HStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {successRate.toFixed(1)}%
                  </Text>
                  <Text fontSize="sm" color={mutedText}>
                    ({stats.successful}/{stats.total})
                  </Text>
                </HStack>
              </Box>
              <Box
                flex={1}
                p={4}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
              >
                <Text fontSize="xs" color={mutedText} mb={1}>
                  AVG RESPONSE
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {stats.avgResponseTime}ms
                </Text>
              </Box>
              <Box
                flex={1}
                p={4}
                bg={cardBg}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
              >
                <Text fontSize="xs" color={mutedText} mb={1}>
                  FAILURES
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="red.500">
                  {stats.failed}
                </Text>
              </Box>
            </HStack>

            {/* Controls */}
            <HStack justify="space-between">
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'solid' : 'ghost'}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'chart' ? 'solid' : 'ghost'}
                  onClick={() => setViewMode('chart')}
                >
                  Chart
                </Button>
              </HStack>
              <HStack spacing={2}>
                <Select size="sm" value={limit} onChange={(e) => setLimit(Number(e.target.value))} w="150px">
                  <option value={25}>Last 25</option>
                  <option value={50}>Last 50</option>
                  <option value={100}>Last 100</option>
                  <option value={500}>Last 500</option>
                </Select>
                <Button size="sm" leftIcon={<FiDownload />} onClick={handleExport}>
                  Export CSV
                </Button>
              </HStack>
            </HStack>

            {/* Content */}
            {loading ? (
              <Box py={8} textAlign="center">
                <Spinner />
                <Text mt={2} color={mutedText}>
                  Loading history...
                </Text>
              </Box>
            ) : viewMode === 'chart' ? (
              <Box h="400px" p={4} bg={cardBg} borderWidth="1px" borderColor={borderColor} borderRadius="md">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="responseTime"
                      stroke="#3182CE"
                      fill="#3182CE"
                      fillOpacity={0.3}
                      name="Response Time (ms)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                overflow="hidden"
                maxH="500px"
                overflowY="auto"
              >
                <Table size="sm">
                  <Thead bg={headerBg} position="sticky" top={0} zIndex={1}>
                    <Tr>
                      <Th>Status</Th>
                      <Th>Timestamp</Th>
                      <Th>Response Time</Th>
                      <Th>Type</Th>
                      <Th>Error</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {history.map((item) => {
                      const icon = getIcon(item);
                      const color = getColor(item);

                      return (
                        <Tr key={item.id}>
                          <Td>
                            <HStack spacing={2}>
                              <Icon as={icon} color={`${color}.500`} />
                              <Badge colorScheme={color} fontSize="2xs">
                                {item.valid ? 'Success' : 'Failed'}
                              </Badge>
                            </HStack>
                          </Td>
                          <Td fontSize="xs">{formatDateTime(item.validated_at)}</Td>
                          <Td>
                            <Badge variant="outline" fontSize="2xs">
                              {formatDuration(item.response_time_ms)}
                            </Badge>
                          </Td>
                          <Td>
                            <Badge fontSize="2xs" textTransform="capitalize">
                              {item.validation_type}
                            </Badge>
                          </Td>
                          <Td fontSize="xs" color={mutedText} maxW="300px" isTruncated>
                            {item.error_message || '-'}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default ValidationHistoryModal;

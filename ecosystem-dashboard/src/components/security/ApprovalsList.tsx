'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Badge,
  Button,
  useToast,
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { ApprovalCard, type ApprovalRequest } from './ApprovalCard';

interface ApprovalsListProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function ApprovalsList({ 
  autoRefresh = true, 
  refreshInterval = 5000 
}: ApprovalsListProps) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [total, setTotal] = useState(0);
  const toast = useToast();

  const fetchApprovals = useCallback(async () => {
    try {
      const status = filter === 'all' ? 'all' : 'pending';
      const response = await fetch(`/api/security/approvals?status=${status}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }
      
      const data = await response.json();
      setApprovals(data.approvals);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchApprovals();
    
    if (autoRefresh) {
      const interval = setInterval(fetchApprovals, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchApprovals, autoRefresh, refreshInterval]);

  const handleApprove = async (id: string) => {
    const response = await fetch(`/api/security/approvals/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to approve');
    }
    
    // Refresh list
    await fetchApprovals();
  };

  const handleDeny = async (id: string, reason?: string) => {
    const response = await fetch(`/api/security/approvals/${id}/deny`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to deny');
    }
    
    // Refresh list
    await fetchApprovals();
  };

  const pendingCount = approvals.filter(a => a.status === 'pending').length;

  return (
    <Box>
      <HStack justify="space-between" mb={4}>
        <HStack>
          <Heading size="md">Approval Requests</Heading>
          {pendingCount > 0 && (
            <Badge colorScheme="red" fontSize="md" borderRadius="full" px={2}>
              {pendingCount}
            </Badge>
          )}
        </HStack>
        
        <HStack>
          <Select
            size="sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'pending' | 'all')}
            w="150px"
          >
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </Select>
          
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<RepeatIcon />}
            onClick={fetchApprovals}
            isLoading={loading}
          >
            Refresh
          </Button>
        </HStack>
      </HStack>

      {error && (
        <Alert status="error" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {loading && approvals.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" />
          <Text mt={2} color="gray.500">Loading approvals...</Text>
        </Box>
      ) : approvals.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">
            {filter === 'pending' 
              ? 'No pending approval requests' 
              : 'No approval requests found'}
          </Text>
        </Box>
      ) : (
        <VStack spacing={4} align="stretch">
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onApprove={handleApprove}
              onDeny={handleDeny}
              isLoading={loading}
            />
          ))}
          
          {total > approvals.length && (
            <Text textAlign="center" color="gray.500" fontSize="sm">
              Showing {approvals.length} of {total} requests
            </Text>
          )}
        </VStack>
      )}
    </Box>
  );
}

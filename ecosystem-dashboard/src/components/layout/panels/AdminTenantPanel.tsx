/**
 * Admin Tenant Panel
 * Right panel content for viewing and managing tenants/workspaces
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Spinner,
  Icon,
  Divider,
  Avatar,
  AvatarGroup,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
} from '@chakra-ui/react';
import {
  FiGrid,
  FiUsers,
  FiSettings,
  FiExternalLink,
  FiCalendar,
  FiActivity,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import NextLink from 'next/link';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  memberCount: number;
  createdAt: string;
  members: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    role: string;
  }>;
}

export default function AdminTenantPanel() {
  const { customData, activeTab } = useRightPanel();
  
  const bgSubtle = useSemanticToken('surface.subtle');
  const textSecondary = useSemanticToken('text.secondary');
  
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const tenantId = customData?.selectedTenantId;

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    
    const fetchTenant = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/tenants/${tenantId}`);
        if (res.ok) {
          const data = await res.json();
          setTenant(data.tenant);
        }
      } catch (error) {
        console.error('Failed to fetch tenant:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTenant();
  }, [tenantId]);

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading tenant...</Text>
      </Box>
    );
  }

  if (!tenantId || !tenant) {
    return (
      <Box p={6} textAlign="center">
        <Icon as={FiGrid} boxSize={12} color="gray.400" mb={4} />
        <Text fontWeight="medium" mb={2}>No Tenant Selected</Text>
        <Text fontSize="sm" color={textSecondary}>
          Click on a tenant to view its details
        </Text>
      </Box>
    );
  }

  // Overview Tab
  if (activeTab === 'tenant-overview') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        {/* Header */}
        <VStack align="start" spacing={1}>
          <HStack>
            <Text fontWeight="bold" fontSize="lg">{tenant.name}</Text>
            <Badge colorScheme={tenant.status === 'active' ? 'green' : 'red'}>
              {tenant.status}
            </Badge>
          </HStack>
          <Text fontSize="sm" color={textSecondary}>/{tenant.slug}</Text>
          {tenant.description && (
            <Text fontSize="sm" color={textSecondary} mt={2}>
              {tenant.description}
            </Text>
          )}
        </VStack>

        <Divider />

        {/* Stats */}
        <SimpleGrid columns={2} spacing={3}>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Members</StatLabel>
            <StatNumber fontSize="xl">{tenant.memberCount}</StatNumber>
            <StatHelpText fontSize="xs">total</StatHelpText>
          </Stat>
          <Stat size="sm" p={3} bg={bgSubtle} borderRadius="md">
            <StatLabel fontSize="xs">Created</StatLabel>
            <StatNumber fontSize="md">
              {new Date(tenant.createdAt).toLocaleDateString()}
            </StatNumber>
            <StatHelpText fontSize="xs">
              <Icon as={FiCalendar} mr={1} />
              {new Date(tenant.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Member Preview */}
        {tenant.members && tenant.members.length > 0 && (
          <Box p={3} bg={bgSubtle} borderRadius="md">
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium">Members</Text>
              <Text fontSize="xs" color={textSecondary}>{tenant.memberCount} total</Text>
            </HStack>
            <AvatarGroup size="sm" max={5}>
              {tenant.members.slice(0, 5).map((member) => (
                <Avatar key={member.id} name={member.name} src={member.avatarUrl} />
              ))}
            </AvatarGroup>
          </Box>
        )}

        {/* Actions */}
        <Button
          as={NextLink}
          href={`/admin/tenants/${tenant.id}`}
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          View Full Details
        </Button>
      </VStack>
    );
  }

  // Members Tab
  if (activeTab === 'tenant-members') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <HStack justify="space-between">
          <Text fontWeight="bold" fontSize="md">Members</Text>
          <Badge>{tenant.memberCount}</Badge>
        </HStack>
        
        {tenant.members && tenant.members.length > 0 ? (
          <VStack spacing={2} align="stretch">
            {tenant.members.map((member) => (
              <HStack key={member.id} p={2} bg={bgSubtle} borderRadius="md" spacing={3}>
                <Avatar size="sm" name={member.name} src={member.avatarUrl} />
                <VStack align="start" spacing={0} flex={1}>
                  <Text fontSize="sm" fontWeight="medium">{member.name}</Text>
                  <Text fontSize="xs" color={textSecondary}>{member.email}</Text>
                </VStack>
                <Badge size="sm" colorScheme={member.role === 'owner' ? 'purple' : 'gray'}>
                  {member.role}
                </Badge>
              </HStack>
            ))}
          </VStack>
        ) : (
          <Box p={4} bg={bgSubtle} borderRadius="md" textAlign="center">
            <Icon as={FiUsers} boxSize={8} color="gray.400" mb={2} />
            <Text fontSize="sm" color={textSecondary}>No members found</Text>
          </Box>
        )}

        <Button
          as={NextLink}
          href={`/admin/tenants/${tenant.id}/members`}
          size="sm"
          rightIcon={<FiExternalLink />}
          variant="outline"
        >
          Manage Members
        </Button>
      </VStack>
    );
  }

  // Settings Tab
  if (activeTab === 'tenant-settings') {
    return (
      <VStack spacing={4} p={4} align="stretch">
        <Text fontWeight="bold" fontSize="md">Tenant Settings</Text>
        
        <Box p={4} bg={bgSubtle} borderRadius="md" textAlign="center">
          <Icon as={FiSettings} boxSize={8} color="gray.400" mb={2} />
          <Text fontSize="sm" color={textSecondary}>
            Settings panel coming soon
          </Text>
          <Button
            as={NextLink}
            href={`/admin/tenants/${tenant.id}/settings`}
            size="sm"
            mt={3}
            rightIcon={<FiExternalLink />}
          >
            Open Settings
          </Button>
        </Box>
      </VStack>
    );
  }

  return null;
}

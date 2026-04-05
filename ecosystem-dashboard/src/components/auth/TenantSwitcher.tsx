/**
 * Tenant Switcher Component
 * 
 * Allows users to switch between tenants they have access to.
 * Shows in the header/sidebar for multi-tenant users.
 */

import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Button,
  HStack,
  VStack,
  Text,
  Badge,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiChevronDown, FiCheck, FiUsers, FiShield } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';

interface TenantSwitcherProps {
  variant?: 'full' | 'compact';
}

export function TenantSwitcher({ variant = 'full' }: TenantSwitcherProps) {
  const { user, currentTenant, switchTenant, isPlatformAdmin } = useAuth();
  
  const menuBg = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  
  if (!user || user.tenants.length === 0) {
    return null;
  }
  
  // Single tenant - no switcher needed
  if (user.tenants.length === 1 && !isPlatformAdmin) {
    return (
      <HStack spacing={2} px={3} py={2}>
        <Icon as={FiUsers} color="gray.500" />
        <Text fontWeight="medium" fontSize="sm">
          {currentTenant?.tenantName || 'No Workspace'}
        </Text>
      </HStack>
    );
  }
  
  const getRoleBadge = (roleId: string) => {
    switch (roleId) {
      case 'tenant-admin':
        return <Badge colorScheme="purple" size="sm">Admin</Badge>;
      case 'tenant-member':
        return <Badge colorScheme="blue" size="sm">Member</Badge>;
      case 'tenant-viewer':
        return <Badge colorScheme="gray" size="sm">Viewer</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Menu>
      <MenuButton
        as={Button}
        variant="ghost"
        size="sm"
        rightIcon={<FiChevronDown />}
        px={3}
      >
        <HStack spacing={2}>
          <Icon as={FiUsers} />
          {variant === 'full' && (
            <Text fontWeight="medium" maxW="150px" isTruncated>
              {currentTenant?.tenantName || 'Select Workspace'}
            </Text>
          )}
        </HStack>
      </MenuButton>
      
      <MenuList bg={menuBg} shadow="lg" minW="250px">
        <VStack align="stretch" px={3} py={2} spacing={0}>
          <Text fontSize="xs" color="gray.500" fontWeight="semibold" textTransform="uppercase">
            Your Workspaces
          </Text>
        </VStack>
        
        {user.tenants.map((tenant) => (
          <MenuItem
            key={tenant.tenantId}
            onClick={() => switchTenant(tenant.tenantId)}
            _hover={{ bg: hoverBg }}
            icon={
              tenant.tenantId === currentTenant?.tenantId ? (
                <Icon as={FiCheck} color="green.500" />
              ) : undefined
            }
          >
            <HStack justify="space-between" w="100%">
              <VStack align="start" spacing={0}>
                <Text fontWeight={tenant.tenantId === currentTenant?.tenantId ? 'bold' : 'normal'}>
                  {tenant.tenantName}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {tenant.tenantSlug}
                </Text>
              </VStack>
              {getRoleBadge(tenant.roleId)}
            </HStack>
          </MenuItem>
        ))}
        
        {isPlatformAdmin && (
          <>
            <MenuDivider />
            <MenuItem
              icon={<Icon as={FiShield} color="orange.500" />}
              as="a"
              href="/infrastructure/admin"
            >
              <Text fontWeight="medium">Platform Admin</Text>
            </MenuItem>
          </>
        )}
      </MenuList>
    </Menu>
  );
}

export default TenantSwitcher;

/**
 * Admin Dashboard
 * 
 * Central hub for platform administration
 */

import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import { FiUsers, FiGrid, FiSettings, FiShield, FiHeart, FiBookOpen, FiMessageCircle, FiBarChart2 } from 'react-icons/fi';
import NextLink from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { withPlatformAdmin } from '@/lib/auth';

interface AdminCardProps {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}

function AdminCard({ title, description, icon, href, color }: AdminCardProps) {
  const borderColor = useSemanticToken('border.default');
  
  return (
    <Box
      as={NextLink}
      href={href}
      _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
      transition="all 0.2s"
    >
      <GlassPanel variant="light" p={6} h="full">
        <VStack align="start" spacing={4}>
          <Box p={3} borderRadius="lg" bg={`${color}.100`} color={`${color}.600`}>
            <Icon as={icon} boxSize={6} />
          </Box>
          <VStack align="start" spacing={1}>
            <Heading size="md">{title}</Heading>
            <Text color="gray.500" fontSize="sm">{description}</Text>
          </VStack>
        </VStack>
      </GlassPanel>
    </Box>
  );
}

function AdminDashboard() {
  const textSecondary = useSemanticToken('text.secondary');

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage platform users, roles, and permissions',
      icon: FiUsers,
      href: '/admin/users',
      color: 'blue',
    },
    {
      title: 'Family Management',
      description: 'Manage child accounts and parental controls',
      icon: FiHeart,
      href: '/admin/family',
      color: 'pink',
    },
    {
      title: 'Workspace Management',
      description: 'Create and manage workspaces and their members',
      icon: FiGrid,
      href: '/admin/tenants',
      color: 'purple',
    },
    {
      title: 'Platform Settings',
      description: 'Configure services, agents, LLMs, and features',
      icon: FiSettings,
      href: '/infrastructure/platform',
      color: 'green',
    },
    {
      title: 'Security & Audit',
      description: 'View audit logs and security settings',
      icon: FiShield,
      href: '/admin/security',
      color: 'orange',
    },
    {
      title: 'Goose Recipes',
      description: 'Manage child-safe AI characters and learning recipes',
      icon: FiBookOpen,
      href: '/admin/goose-recipes',
      color: 'teal',
    },
    {
      title: 'Hints Library',
      description: 'Contextual hints injected based on theme, age, and subject',
      icon: FiMessageCircle,
      href: '/admin/hints-library',
      color: 'cyan',
    },
    {
      title: 'Conversation Analytics',
      description: 'Real-time monitoring of production AI conversations',
      icon: FiBarChart2,
      href: '/admin/conversation-analytics',
      color: 'indigo',
    },
  ];

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={6}>
        <VStack spacing={8} align="stretch">
          {/* Header */}
          <Box>
            <Heading size="lg">Platform Administration</Heading>
            <Text color={textSecondary}>
              Manage users, workspaces, and platform settings
            </Text>
          </Box>

          {/* Admin Cards */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
            {adminCards.map((card) => (
              <AdminCard key={card.href} {...card} />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    </DashboardLayout>
  );
}

export default withPlatformAdmin(AdminDashboard);

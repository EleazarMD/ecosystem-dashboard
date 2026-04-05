/**
 * Approvals Page
 * 
 * Dashboard-styled page for reviewing and approving AI agent actions.
 * Uses semantic tokens and DashboardLayout for consistent theming.
 * Settings are in the right dynamic context panel.
 * Mobile-responsive with PWA support.
 */

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  IconButton,
  HStack,
  Text,
  Badge,
  Button,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FiShield, FiRefreshCw } from 'react-icons/fi';
import { ApprovalProvider, useApprovalSafe } from '@/contexts/ApprovalContext';
import { ApprovalQueue } from '@/components/approvals';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSemanticToken } from '@/hooks/useSemanticToken';

// Minimalist header for approvals
function ApprovalsHeader({ 
  pendingCount = 0,
  criticalCount = 0,
  onRefresh,
  isRefreshing,
}: { 
  pendingCount?: number;
  criticalCount?: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const textPrimary = useSemanticToken('text.primary');
  const borderSubtle = useSemanticToken('border.subtle');
  
  return (
    <Box
      borderBottom="1px solid"
      borderColor={borderSubtle}
      px={{ base: 3, md: 4 }}
      py={2}
    >
      <Flex justify="space-between" align="center">
        <HStack spacing={2}>
          <Icon as={FiShield} color={textPrimary} boxSize={4} />
          <Text fontSize="sm" fontWeight="600" color={textPrimary}>
            Approvals
          </Text>
          {pendingCount > 0 && (
            <Badge 
              colorScheme={criticalCount > 0 ? 'red' : 'blue'} 
              variant="solid"
              fontSize="10px"
              px={1.5}
              borderRadius="full"
            >
              {pendingCount}
            </Badge>
          )}
        </HStack>
        
        <IconButton
          aria-label="Refresh"
          icon={<FiRefreshCw size={14} />}
          variant="ghost"
          size="xs"
          onClick={onRefresh}
          isLoading={isRefreshing}
        />
      </Flex>
    </Box>
  );
}

// Main content wrapper with approval context access
function ApprovalsContent() {
  const approval = useApprovalSafe();
  const bgBase = useSemanticToken('surface.base');
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await approval?.fetchPendingApprovals?.();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <Box minH="100vh" bg={bgBase}>
      <ApprovalsHeader 
        pendingCount={approval?.pendingCount ?? 0}
        criticalCount={approval?.criticalCount ?? 0}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      
      {/* Main content - compact padding */}
      <Box p={{ base: 2, md: 3 }}>
        <ApprovalQueue />
      </Box>
    </Box>
  );
}

export default function ApprovalsPage() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <>
      <Head>
        <title>Approvals | AI Homelab Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Approvals" />
        <meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" href="/icons/approval-icon-180.png" />
      </Head>
      
      <DashboardLayout>
        <ApprovalProvider userId="eleazar">
          {mounted && <ApprovalsContent />}
        </ApprovalProvider>
      </DashboardLayout>
    </>
  );
}

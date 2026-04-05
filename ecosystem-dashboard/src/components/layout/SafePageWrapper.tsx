/**
 * Safe Page Wrapper Component
 * 
 * Wraps pages to allow switching between legacy and new layouts
 * with automatic error handling and rollback
 * 
 * Usage:
 *   <SafePageWrapper
 *     pageName="ai-research"
 *     legacyComponent={DashboardLayout}
 *     newComponent={StudioLayout}
 *   >
 *     <AIResearchContent />
 *   </SafePageWrapper>
 */

import React, { Component, ReactNode } from 'react';
import { Box, Text, Button, VStack } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { PageName } from '@/types/featureFlags';

interface SafePageWrapperProps {
  pageName: PageName;
  legacyComponent: React.ComponentType<{ children: ReactNode }>;
  newComponent: React.ComponentType<{ children: ReactNode }>;
  children: ReactNode;
  userId?: string | null;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

// Error boundary specifically for new layouts
class LayoutErrorBoundary extends Component<
  {
    children: ReactNode;
    onError: (error: Error) => void;
    fallback: ReactNode;
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SafePageWrapper] Layout error caught:', error, errorInfo);

    // Increment error count
    this.setState(prev => ({
      errorCount: prev.errorCount + 1,
    }));

    // Call parent error handler
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export function SafePageWrapper({
  pageName,
  legacyComponent: LegacyComponent,
  newComponent: NewComponent,
  children,
  userId,
}: SafePageWrapperProps) {
  const { flags, shouldUseNewLayout, updateFlag, emergencyDisableAll } = useFeatureFlags(userId);
  const [errorCount, setErrorCount] = React.useState(0);
  const [autoRollbackTriggered, setAutoRollbackTriggered] = React.useState(false);

  // Check if emergency disable is active
  const emergencyDisabled = flags.emergencyDisableAll;

  // Check if page should use new layout
  const useNew = shouldUseNewLayout(pageName) && !emergencyDisabled;

  // Handle layout error
  const handleLayoutError = React.useCallback(async (error: Error) => {
    const newCount = errorCount + 1;
    setErrorCount(newCount);

    console.error(`[SafePageWrapper] Error in new ${pageName} layout (count: ${newCount}):`, error);

    // Auto-rollback after 3 errors
    if (newCount >= 3 && !autoRollbackTriggered) {
      console.warn(`[SafePageWrapper] Auto-rollback triggered for ${pageName} (${newCount} errors)`);
      setAutoRollbackTriggered(true);

      // Disable the feature flag for this page
      await updateFlag(
        `pages.${pageName}.useNewLayout`,
        false,
        `Auto-rollback: ${newCount} errors detected`
      );

      // Show alert to user
      alert(
        `⚠️ New layout for ${pageName} encountered errors and has been disabled.\n` +
        `Reverted to legacy layout. Please report this issue.`
      );
    }

    // Critical pages (like ADK) get immediate rollback
    if (pageName === 'agentic-control' && !autoRollbackTriggered) {
      console.error(`[SafePageWrapper] CRITICAL: ADK UI error detected, immediate rollback`);
      setAutoRollbackTriggered(true);

      await updateFlag(
        `pages.${pageName}.useNewLayout`,
        false,
        `CRITICAL: ADK UI error - immediate rollback`
      );

      alert(
        `🚨 CRITICAL: ADK UI encountered an error and has been immediately disabled.\n` +
        `Reverted to legacy ADK UI. Please investigate immediately.`
      );
    }
  }, [errorCount, autoRollbackTriggered, pageName, updateFlag]);

  // Fallback component (legacy)
  const fallback = (
    <LegacyComponent>
      {children}
    </LegacyComponent>
  );

  // If emergency disabled or not using new layout, just render legacy
  if (emergencyDisabled || !useNew) {
    return fallback;
  }

  // Render new layout with error boundary
  return (
    <LayoutErrorBoundary
      onError={handleLayoutError}
      fallback={fallback}
    >
      <NewComponent>
        {children}
      </NewComponent>
    </LayoutErrorBoundary>
  );
}

// Development helper: Show which layout is active
export function LayoutDebugIndicator({ pageName, useNew }: { pageName: string; useNew: boolean }) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={2}
      left={2}
      bg={useNew ? 'blue.500' : 'gray.500'}
      color="whiteAlpha.900"
      px={2}
      py={1}
      borderRadius="md"
      fontSize="xs"
      zIndex={9999}
      opacity={0.7}
      _hover={{ opacity: 1 }}
    >
      {pageName}: {useNew ? '🆕 New Layout' : '📦 Legacy Layout'}
    </Box>
  );
}

// Emergency error fallback with manual recovery
export function EmergencyFallback({
  pageName,
  error,
  onReset,
}: {
  pageName: string;
  error: Error;
  onReset: () => void;
}) {
  const { emergencyDisableAll } = useFeatureFlags();

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="red.50"
      p={8}
    >
      <VStack spacing={4} maxW="600px">
        <Text fontSize="4xl">🚨</Text>
        <Text fontSize="2xl" fontWeight="bold" color="red.600">
          Layout Error Detected
        </Text>
        <Text color={useSemanticToken('text.primary')} textAlign="center">
          The new layout for <strong>{pageName}</strong> encountered a critical error.
        </Text>
        <Box
          bg={useSemanticToken('surface.elevated')}
          p={4}
          borderRadius="md"
          borderWidth="1px"
          borderColor="red.200"
          w="100%"
          fontFamily="monospace"
          fontSize="sm"
          color="red.700"
        >
          {error.message}
        </Box>
        <VStack spacing={2} w="100%">
          <Button
            colorScheme="red"
            onClick={async () => {
              await emergencyDisableAll();
              window.location.reload();
            }}
            w="100%"
          >
            🚨 Emergency: Disable All New Features
          </Button>
          <Button
            colorScheme="blue"
            variant="outline"
            onClick={onReset}
            w="100%"
          >
            Try Legacy Layout
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}

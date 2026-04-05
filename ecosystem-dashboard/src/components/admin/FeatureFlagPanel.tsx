/**
 * Feature Flag Admin Panel
 * 
 * Floating panel for admins to control feature flags in real-time
 * Accessible via keyboard shortcut: Ctrl+Shift+F (or Cmd+Shift+F on Mac)
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  Button,
  Collapse,
  IconButton,
  Divider,
  Badge,
  useDisclosure,
  Tooltip,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { FiSettings, FiX, FiAlertTriangle, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import type { PageName } from '@/types/featureFlags';
import { ThemeSelectorCompact } from '@/components/settings/ThemeSelector';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export function FeatureFlagPanel() {
  console.log('🔵 [FeatureFlagPanel] Component rendering - CODE VERSION 2');

  const { isOpen, onToggle } = useDisclosure();
  const [isMinimized, setIsMinimized] = useState(false);
  const {
    flags,
    loading,
    version,
    lastUpdated,
    isEnabled,
    shouldUseNewLayout,
    updateFlag,
    emergencyDisableAll,
    refresh,
  } = useFeatureFlags();

  console.log('🔵 [FeatureFlagPanel] useFeatureFlags returned:', { updateFlag: typeof updateFlag, flags });

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const footerBg = useSemanticToken('surface.base');

  // Keyboard shortcut (Ctrl+Shift+F or Cmd+Shift+F)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  // Handle global flag toggle
  const handleGlobalToggle = async (flagPath: string, currentValue: boolean) => {
    console.log('[FeatureFlagPanel] Toggling:', flagPath, 'from', currentValue, 'to', !currentValue);
    const success = await updateFlag(flagPath, !currentValue, `Manual toggle by admin`);
    console.log('[FeatureFlagPanel] Update result:', success);
    if (!success) {
      console.error('[FeatureFlagPanel] Update failed!');
      alert('Failed to update feature flag');
    } else {
      console.log('[FeatureFlagPanel] ✅ Update succeeded');
    }
  };

  // Handle page flag toggle
  const handlePageToggle = async (pageName: string, currentValue: boolean) => {
    const success = await updateFlag(
      `pages.${pageName}.useNewLayout`,
      !currentValue,
      `Manual toggle for ${pageName} by admin`
    );
    if (!success) {
      alert('Failed to update page flag');
    }
  };

  // Handle emergency disable
  const handleEmergencyDisable = async () => {
    const confirmed = confirm(
      '⚠️ EMERGENCY DISABLE\n\n' +
      'This will immediately disable ALL new features and revert to legacy layouts.\n\n' +
      'Are you sure you want to proceed?'
    );

    if (confirmed) {
      const success = await emergencyDisableAll();
      if (success) {
        // Reload page to ensure all components use legacy mode
        setTimeout(() => window.location.reload(), 1000);
      } else {
        alert('Failed to trigger emergency disable');
      }
    }
  };

  // Popular pages for quick access
  const popularPages: PageName[] = [
    'dashboard',
    'ai-research',
    'podcast-studio',
    'workspace',
    'agentic-control',
    'ai-inferencing',
  ];

  if (!isOpen) {
    // Minimized toggle button
    return (
      <Tooltip label="Feature Flags (Ctrl+Shift+F)" placement="left">
        <IconButton
          aria-label="Open feature flags"
          icon={<FiSettings />}
          position="fixed"
          bottom={4}
          right={4}
          colorScheme="blue"
          size="lg"
          onClick={onToggle}
          zIndex={9998}
          boxShadow="lg"
        />
      </Tooltip>
    );
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      width={isMinimized ? '300px' : '400px'}
      maxHeight="80vh"
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      boxShadow="2xl"
      zIndex={9999}
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <HStack
        p={3}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={flags.emergencyDisableAll ? 'red.500' : 'blue.500'}
        color="whiteAlpha.900"
        justifyContent="space-between"
      >
        <HStack>
          <FiSettings />
          <Text fontWeight="bold" fontSize="sm" color="whiteAlpha.900">
            Feature Flags
          </Text>
          <Badge colorScheme={flags.emergencyDisableAll ? 'red' : 'green'} variant="solid">
            v{version}
          </Badge>
        </HStack>
        <HStack spacing={1}>
          <Tooltip label="Refresh">
            <IconButton
              aria-label="Refresh"
              icon={<FiRefreshCw />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.900"
              onClick={refresh}
              isLoading={loading}
            />
          </Tooltip>
          <Tooltip label={isMinimized ? "Expand" : "Minimize"}>
            <IconButton
              aria-label="Minimize"
              icon={isMinimized ? <FiChevronUp /> : <FiChevronDown />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.900"
              onClick={() => setIsMinimized(!isMinimized)}
            />
          </Tooltip>
          <Tooltip label="Close (Ctrl+Shift+F)">
            <IconButton
              aria-label="Close"
              icon={<FiX />}
              size="xs"
              variant="ghost"
              color="whiteAlpha.900"
              onClick={onToggle}
            />
          </Tooltip>
        </HStack>
      </HStack>

      <Collapse in={!isMinimized} animateOpacity>
        <VStack
          align="stretch"
          spacing={3}
          p={3}
          maxHeight="calc(80vh - 120px)"
          overflowY="auto"
        >
          {/* Emergency Disable */}
          {!flags.emergencyDisableAll ? (
            <Button
              colorScheme="red"
              size="sm"
              leftIcon={<FiAlertTriangle />}
              onClick={handleEmergencyDisable}
            >
              🚨 Emergency Disable All
            </Button>
          ) : (
            <VStack spacing={2} align="stretch">
              <Box
                bg="red.100"
                color="red.800"
                p={3}
                borderRadius="md"
                fontSize="sm"
                fontWeight="bold"
              >
                ⚠️ EMERGENCY MODE ACTIVE
                <Text fontSize="xs" fontWeight="normal" mt={1}>
                  All new features are disabled.
                </Text>
              </Box>
              <Button
                colorScheme="green"
                size="sm"
                onClick={async () => {
                  await handleGlobalToggle('emergencyDisableAll', true);
                  window.location.reload();
                }}
              >
                ✅ Re-Enable Features
              </Button>
            </VStack>
          )}

          <Divider />

          {/* Global Flags */}
          <VStack align="stretch" spacing={2}>
            <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>
              Global Features
            </Text>

            <HStack justify="space-between">
              <Text fontSize="sm" color={useSemanticToken('text.primary')} fontWeight="medium">New Layouts</Text>
              <Switch
                isChecked={isEnabled('enableNewLayouts')}
                onChange={() => handleGlobalToggle('enableNewLayouts', flags.enableNewLayouts)}
                isDisabled={flags.emergencyDisableAll}
                colorScheme="blue"
              />
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="sm" color={useSemanticToken('text.primary')} fontWeight="medium">Glassmorphic Design</Text>
              <Switch
                isChecked={isEnabled('enableGlassmorphicDesign')}
                onChange={() => handleGlobalToggle('enableGlassmorphicDesign', flags.enableGlassmorphicDesign)}
                isDisabled={flags.emergencyDisableAll}
                colorScheme="blue"
              />
            </HStack>

            <HStack justify="space-between">
              <Text fontSize="sm" color={useSemanticToken('text.primary')} fontWeight="medium">Theme System</Text>
              <Switch
                isChecked={isEnabled('enableThemeSystem')}
                onChange={() => {
                  console.log('🟢 [Switch] Theme System clicked!');
                  handleGlobalToggle('enableThemeSystem', flags.enableThemeSystem);
                }}
                isDisabled={flags.emergencyDisableAll}
                colorScheme="blue"
              />
            </HStack>
          </VStack>

          <Divider />

          {/* Theme Preview */}
          {isEnabled('enableThemeSystem') && (
            <>
              <VStack align="stretch" spacing={2}>
                <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>
                  Theme Preview
                </Text>
                <ThemeSelectorCompact />
              </VStack>

              <Divider />
            </>
          )}

          {/* Popular Pages */}
          <VStack align="stretch" spacing={2}>
            <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>
              Popular Pages
            </Text>

            {popularPages.map(pageName => {
              const isActive = shouldUseNewLayout(pageName);
              const isADK = pageName === 'agentic-control';

              return (
                <HStack key={pageName} justify="space-between">
                  <HStack>
                    <Text fontSize="sm" color={useSemanticToken('text.primary')}>{pageName}</Text>
                    {isADK && (
                      <Badge colorScheme="red" fontSize="xs">
                        CRITICAL
                      </Badge>
                    )}
                  </HStack>
                  <Switch
                    isChecked={isActive}
                    onChange={() => handlePageToggle(pageName, isActive)}
                    isDisabled={flags.emergencyDisableAll}
                    colorScheme={isADK ? 'red' : 'blue'}
                    size="sm"
                  />
                </HStack>
              );
            })}
          </VStack>

          <Divider />

          {/* All Pages (Accordion) */}
          <Accordion allowToggle>
            <AccordionItem border="none">
              <AccordionButton px={0}>
                <Box flex="1" textAlign="left">
                  <Text fontSize="sm" fontWeight="bold" color={useSemanticToken('text.primary')}>
                    All Pages ({Object.keys(flags.pages).length})
                  </Text>
                </Box>
                <AccordionIcon />
              </AccordionButton>
              <AccordionPanel px={0} pt={2}>
                <VStack align="stretch" spacing={2}>
                  {Object.keys(flags.pages).sort().map(pageName => {
                    const isActive = shouldUseNewLayout(pageName as PageName);

                    return (
                      <HStack key={pageName} justify="space-between" fontSize="xs">
                        <Text color={useSemanticToken('text.primary')}>{pageName}</Text>
                        <Switch
                          isChecked={isActive}
                          onChange={() => handlePageToggle(pageName, isActive)}
                          isDisabled={flags.emergencyDisableAll}
                          colorScheme="blue"
                          size="sm"
                        />
                      </HStack>
                    );
                  })}
                </VStack>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </VStack>
      </Collapse>

      {/* Footer */}
      <Box
        p={2}
        borderTopWidth="1px"
        borderColor={borderColor}
        bg={footerBg}
      >
        <Text fontSize="xs" color={useSemanticToken('text.secondary')} textAlign="center">
          Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Never'}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Chakra UI Fallback Management Page
 * 
 * This page uses only Chakra UI components to avoid MUI compatibility issues
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Card,
  CardBody,
  Switch,
  FormControl,
  FormLabel,
  VStack,
  HStack,
  Alert,
  AlertIcon,
  Spinner
} from '@chakra-ui/react';
import { useFallbackManagement } from '../hooks/useFallbackManagement';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export default function ChakraFallbackPage() {
  const {
    globalSettings,
    appConfigs,
    loading,
    error,
    toggleGlobalFallbacks,
    toggleEnvironmentFallbacks,
    toggleAppFallbacks,
    refreshData
  } = useFallbackManagement();

  const bgColor = useSemanticToken('surface.base');
  const cardBg = useSemanticToken('surface.elevated');

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (loading) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Heading size="lg">Loading Fallback Management...</Heading>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack spacing={4}>
          <Alert status="error">
            <AlertIcon />
            Error: {error}
          </Alert>
          <Button onClick={refreshData} colorScheme="blue">
            Retry
          </Button>
        </VStack>
      </Container>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="container.lg" py={8}>
        <VStack spacing={6} align="stretch">
          <Heading size="xl">Fallback Management (Chakra UI)</Heading>
          
          <Alert status="success">
            <AlertIcon />
            ✅ Fallback Management API is working with Chakra UI!
          </Alert>

          {/* Global Settings */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="lg">Global Settings</Heading>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="global-fallback" mb="0">
                    Global Fallback Enabled
                  </FormLabel>
                  <Switch
                    id="global-fallback"
                    isChecked={globalSettings?.globallyEnabled || false}
                    onChange={(e) => toggleGlobalFallbacks(e.target.checked)}
                  />
                </FormControl>
                
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Environment: {globalSettings?.environment || 'Unknown'}
                </Text>
                
                <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                  Last Updated: {globalSettings?.lastUpdated || 'Never'}
                </Text>
              </VStack>
            </CardBody>
          </Card>

          {/* Environment Settings */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="lg">Environment Settings</Heading>
                
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="env-fallback" mb="0">
                    Environment Fallback Enabled
                  </FormLabel>
                  <Switch
                    id="env-fallback"
                    isChecked={globalSettings?.environmentEnabled || false}
                    onChange={(e) => toggleEnvironmentFallbacks(e.target.checked)}
                  />
                </FormControl>
              </VStack>
            </CardBody>
          </Card>

          {/* App Configurations */}
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <Heading size="lg">Application Configurations</Heading>
                
                {appConfigs && appConfigs.length > 0 ? (
                  <VStack spacing={3} align="stretch">
                    {appConfigs.map((app) => (
                      <Box key={app.appId} p={4} border="1px" borderColor={useSemanticToken('border.default')} borderRadius="md">
                        <HStack justify="space-between" align="center">
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">{app.appName}</Text>
                            <Text fontSize="sm" color={useSemanticToken('text.secondary')}>
                              ID: {app.appId}
                            </Text>
                          </VStack>
                          <Switch
                            isChecked={app.enabled || false}
                            onChange={(e) => toggleAppFallbacks(app.appId, e.target.checked)}
                          />
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Text color={useSemanticToken('text.secondary')}>No application configurations found.</Text>
                )}
              </VStack>
            </CardBody>
          </Card>

          {/* Actions */}
          <HStack spacing={4}>
            <Button onClick={refreshData} colorScheme="blue">
              Refresh Data
            </Button>
            <Button onClick={() => toggleGlobalFallbacks(false)} colorScheme="red">
              Emergency Disable All
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

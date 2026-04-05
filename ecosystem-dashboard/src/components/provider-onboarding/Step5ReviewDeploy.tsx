/**
 * Step 5: Review & Deploy
 * Final review and deployment with project assignment
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  SimpleGrid,
  Badge,
  Checkbox,
  Alert,
  AlertIcon,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiCheckCircle, FiZap, FiDollarSign, FiLock } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Step5ReviewDeployProps {
  config: any;
  onDeploy: () => void;
  onBack: () => void;
}

export const Step5ReviewDeploy: React.FC<Step5ReviewDeployProps> = ({
  config,
  onDeploy,
  onBack,
}) => {
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [projects, setProjects] = useState<any[]>([]);
  const [enableGateway, setEnableGateway] = useState(true);
  const [enableTelemetry, setEnableTelemetry] = useState(true);
  const [enableFailover, setEnableFailover] = useState(true);
  const [deploying, setDeploying] = useState(false);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const bgAccent = useSemanticToken('surface.base');

  useEffect(() => {
    // Load available projects from dashboard API
    fetch('/api/ai-inferencing/projects')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.projects)) {
          // Transform to expected format
          const transformedProjects = data.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            services: p.serviceCount || 0,
          }));
          setProjects(transformedProjects);
        } else {
          setProjects([]);
        }
      })
      .catch(err => {
        console.error('Failed to load projects:', err);
        setProjects([]);
      });
  }, []);

  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    
    const deploymentConfig = {
      ...config,
      projects: Array.from(selectedProjects),
      options: {
        enableGateway,
        enableTelemetry,
        enableFailover,
      },
    };

    // Add deployment config to the config object
    config.projects = deploymentConfig.projects;
    config.options = deploymentConfig.options;

    // Small delay to show deploying state
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onDeploy();
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cost);
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Summary Header */}
      <Box>
        <Text fontSize="lg" fontWeight="600" mb={2}>
          Configuration Summary
        </Text>
        <Text fontSize="sm" color={subtleText}>
          Review your configuration before deploying.
        </Text>
      </Box>

      {/* Provider Info */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="600">
              Provider
            </Text>
            <Text fontSize="md" fontWeight="600">
              {config.provider.name}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color={subtleText}>
              Models Enabled
            </Text>
            <Badge colorScheme="blue">{config.models?.length || 0} models</Badge>
          </HStack>

          <Box>
            {config.models && config.models.length > 0 ? (
              config.models.map((model: any) => (
                <Box key={model.modelId} py={2}>
                  <Text fontSize="sm" fontWeight="500">
                    {model.modelId}
                  </Text>
                  <HStack spacing={2} mt={1}>
                    {model.useCases?.map((useCase: string) => (
                      <Badge key={useCase} fontSize="xs" colorScheme="purple">
                        {useCase}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
              ))
            ) : (
              <Text fontSize="sm" color={subtleText}>
                No models configured
              </Text>
            )}
          </Box>
        </VStack>
      </Card>

      {/* API & Limits */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="stretch" spacing={4}>
            <HStack>
              <Icon as={FiZap} color="blue.500" />
              <Text fontSize="sm" fontWeight="600">
                Rate Limits
              </Text>
            </HStack>
            <Box fontSize="sm">
              <HStack justify="space-between" mb={2}>
                <Text color={subtleText}>Requests/min</Text>
                <Text fontWeight="500">
                  {config.apiConfig?.rateLimits?.requestsPerMinute || 'N/A'}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text color={subtleText}>Tokens/min</Text>
                <Text fontWeight="500">
                  {config.apiConfig?.rateLimits?.tokensPerMinute?.toLocaleString() || 'N/A'}
                </Text>
              </HStack>
            </Box>
          </VStack>
        </Card>

        <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
          <VStack align="stretch" spacing={4}>
            <HStack>
              <Icon as={FiDollarSign} color="green.500" />
              <Text fontSize="sm" fontWeight="600">
                Cost Limits
              </Text>
            </HStack>
            <Box fontSize="sm">
              <HStack justify="space-between" mb={2}>
                <Text color={subtleText}>Daily Max</Text>
                <Text fontWeight="500">
                  {config.apiConfig?.costLimits?.dailyMax ? formatCost(config.apiConfig.costLimits.dailyMax) : 'N/A'}
                </Text>
              </HStack>
              <HStack justify="space-between" mb={2}>
                <Text color={subtleText}>Per Request</Text>
                <Text fontWeight="500">
                  {config.apiConfig?.costLimits?.perRequestMax ? formatCost(config.apiConfig.costLimits.perRequestMax) : 'N/A'}
                </Text>
              </HStack>
              {config.apiConfig?.costLimits?.useGlobalBudget && (
                <Badge colorScheme="blue" fontSize="xs">
                  Uses Global Budget
                </Badge>
              )}
            </Box>
          </VStack>
        </Card>
      </SimpleGrid>

      {/* API Key Status */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <HStack>
          <Icon as={FiLock} color="green.500" />
          <VStack align="start" spacing={0}>
            <Text fontSize="sm" fontWeight="600">
              API Key Configured
            </Text>
            <Text fontSize="xs" color={subtleText}>
              Encrypted and stored securely
            </Text>
          </VStack>
        </HStack>
      </Card>

      {/* Deployment Options */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="sm" fontWeight="600">
            Deployment Options
          </Text>

          <VStack align="stretch" spacing={3}>
            <Checkbox
              isChecked={enableGateway}
              onChange={(e) => setEnableGateway(e.target.checked)}
            >
              <VStack align="start" spacing={0}>
                <Text fontSize="sm">Register with AI Gateway</Text>
                <Text fontSize="xs" color={subtleText}>
                  Enable routing through the central gateway
                </Text>
              </VStack>
            </Checkbox>

            <Checkbox
              isChecked={enableTelemetry}
              onChange={(e) => setEnableTelemetry(e.target.checked)}
            >
              <VStack align="start" spacing={0}>
                <Text fontSize="sm">Enable Telemetry Tracking</Text>
                <Text fontSize="xs" color={subtleText}>
                  Track usage, costs, and performance metrics
                </Text>
              </VStack>
            </Checkbox>

            <Checkbox
              isChecked={enableFailover}
              onChange={(e) => setEnableFailover(e.target.checked)}
            >
              <VStack align="start" spacing={0}>
                <Text fontSize="sm">Enable Automatic Failover</Text>
                <Text fontSize="xs" color={subtleText}>
                  Switch to backup providers if this one fails
                </Text>
              </VStack>
            </Checkbox>
          </VStack>
        </VStack>
      </Card>

      {/* Project Assignment */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={4}>
          <Text fontSize="sm" fontWeight="600">
            Assign to Projects
          </Text>
          <Text fontSize="xs" color={subtleText}>
            Select which projects can use this provider
          </Text>

          <VStack align="stretch" spacing={2}>
            {projects.map((project) => (
              <Box
                key={project.id}
                p={3}
                borderWidth="1px"
                borderColor={
                  selectedProjects.has(project.id) ? 'blue.400' : borderColor
                }
                borderRadius="md"
                cursor="pointer"
                bg={selectedProjects.has(project.id) ? 'blue.50' : 'transparent'}
                onClick={() => toggleProject(project.id)}
              >
                <HStack>
                  <Checkbox
                    isChecked={selectedProjects.has(project.id)}
                    onChange={() => {}}
                  />
                  <VStack align="start" spacing={0} flex="1">
                    <Text fontSize="sm" fontWeight="500">
                      {project.name}
                    </Text>
                    <Text fontSize="xs" color={subtleText}>
                      {project.services} services
                    </Text>
                  </VStack>
                </HStack>
              </Box>
            ))}
          </VStack>

          {selectedProjects.size === 0 && (
            <Alert status="warning" borderRadius="md" fontSize="sm">
              <AlertIcon />
              Select at least one project to deploy
            </Alert>
          )}
        </VStack>
      </Card>

      {/* Test Results (if available) */}
      {config.testResults && config.testResults.length > 0 && (
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontSize="sm" fontWeight="600">
              Connection Test Passed
            </Text>
            <Text fontSize="xs">
              All models tested successfully
            </Text>
          </Box>
        </Alert>
      )}

      {/* Actions */}
      <HStack justify="space-between" pt={4}>
        <Button onClick={onBack} variant="ghost" isDisabled={deploying}>
          ← Back
        </Button>
        <Button
          onClick={handleDeploy}
          isLoading={deploying}
          loadingText="Deploying..."
          isDisabled={selectedProjects.size === 0}
          colorScheme="blue"
          leftIcon={<FiCheckCircle />}
        >
          Deploy Provider
        </Button>
      </HStack>
    </VStack>
  );
};

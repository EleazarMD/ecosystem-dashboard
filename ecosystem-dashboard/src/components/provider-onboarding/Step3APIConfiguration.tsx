/**
 * Step 3: API Configuration
 * Set API key, rate limits, and cost management (per-provider + global budget)
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  Card,
  Box,
  InputGroup,
  InputRightElement,
  IconButton,
  Alert,
  AlertIcon,
  Divider,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Select,
  Badge,
  Textarea,
  Spinner,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff, FiExternalLink, FiPlus, FiFolder } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Step3APIConfigurationProps {
  provider: any;
  onNext: (data: any) => void;
  onBack: () => void;
  initialData?: any;
}

export const Step3APIConfiguration: React.FC<Step3APIConfigurationProps> = ({
  provider,
  onNext,
  onBack,
  initialData,
}) => {
  const [apiKey, setApiKey] = useState(initialData?.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyName, setApiKeyName] = useState(initialData?.apiKeyName || '');
  const [selectedProject, setSelectedProject] = useState(initialData?.projectId || '');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [requestsPerMinute, setRequestsPerMinute] = useState(
    initialData?.rateLimits?.requestsPerMinute || 60
  );
  const [tokensPerMinute, setTokensPerMinute] = useState(
    initialData?.rateLimits?.tokensPerMinute || 100000
  );
  const [dailyMaxCost, setDailyMaxCost] = useState(
    initialData?.costLimits?.dailyMax || 50
  );
  const [perRequestMaxCost, setPerRequestMaxCost] = useState(
    initialData?.costLimits?.perRequestMax || 5
  );
  const [useGlobalBudget, setUseGlobalBudget] = useState(false);
  const [providerTemplate, setProviderTemplate] = useState<any>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const bgAccent = useSemanticToken('surface.highlight');

  useEffect(() => {
    // Load provider template for default values
    fetch('/config/provider-templates.json')
      .then(res => res.json())
      .then(data => {
        const template = data.providers[provider.id];
        if (template) {
          setProviderTemplate(template);
          // Set defaults from template if not already set
          if (!initialData) {
            setRequestsPerMinute(template.defaultRateLimits?.requestsPerMinute || 60);
            setTokensPerMinute(template.defaultRateLimits?.tokensPerMinute || 100000);
          }
        }
      })
      .catch(err => console.error('Failed to load provider template:', err));

    // Load existing projects for assignment
    fetch('/api/ai-inferencing/projects')
      .then(async (res) => {
        // Check content type BEFORE attempting to parse
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('Projects API returned non-JSON response (probably HTML error page)');
          throw new Error('Non-JSON response from projects API');
        }
        
        if (!res.ok) {
          console.warn(`Projects API returned status ${res.status}`);
          throw new Error(`HTTP ${res.status}`);
        }
        
        return res.json();
      })
      .then(data => {
        if (data && data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          console.log(`Loaded ${data.projects.length} projects from API`);
          setProjects(data.projects);
        } else {
          console.log('No projects found in API response');
          setProjects([]);
        }
        setLoadingProjects(false);
      })
      .catch(err => {
        console.warn('Failed to load projects from AI Inferencing Service:', err.message);
        console.log('AI Inferencing Service may not be running at localhost:9000');
        // Gracefully handle - just show empty state
        setProjects([]);
        setLoadingProjects(false);
      });
  }, [provider.id, initialData]);

  const isValid = apiKey.trim().length > 0 && dailyMaxCost > 0 && 
    (selectedProject || (showNewProject && newProjectName.trim().length > 0));

  const handleNext = () => {
    const projectData = showNewProject ? {
      newProject: {
        name: newProjectName,
        description: newProjectDescription,
      }
    } : {
      projectId: selectedProject
    };

    onNext({
      apiConfig: {
        apiKey,
        apiKeyName: apiKeyName || `${provider.name} Key`,
        ...projectData,
        rateLimits: {
          requestsPerMinute,
          tokensPerMinute,
        },
        costLimits: {
          dailyMax: dailyMaxCost,
          perRequestMax: perRequestMaxCost,
          useGlobalBudget,
        },
      },
    });
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <Box>
        <Text fontSize="sm" color={subtleText}>
          Configure API authentication and cost management for {provider.name}.
        </Text>
      </Box>

      {/* API Key & Project Assignment */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={6}>
          <Text fontSize="sm" fontWeight="600">
            API Key Configuration
          </Text>

          <FormControl>
            <FormLabel fontSize="sm">API Key Name (Optional)</FormLabel>
            <Input
              placeholder={`${provider.name} Production Key`}
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              fontSize="sm"
            />
            <FormHelperText fontSize="xs">
              Give this key a memorable name for tracking
            </FormHelperText>
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              API Key
            </FormLabel>
            <InputGroup>
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fontFamily="mono"
                fontSize="sm"
              />
              <InputRightElement>
                <IconButton
                  aria-label={showApiKey ? 'Hide' : 'Show'}
                  icon={showApiKey ? <FiEyeOff /> : <FiEye />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowApiKey(!showApiKey)}
                />
              </InputRightElement>
            </InputGroup>
            <FormHelperText fontSize="xs">
              Your API key is encrypted and stored securely. Get your key from{' '}
              <Button
                as="a"
                href={providerTemplate?.documentation || `https://app.${provider.id}.com`}
                target="_blank"
                variant="link"
                fontSize="xs"
                rightIcon={<FiExternalLink />}
              >
                {provider.name} Dashboard
              </Button>
            </FormHelperText>
          </FormControl>

          {providerTemplate && (
            <Alert status="info" borderRadius="md" fontSize="sm">
              <AlertIcon />
              <Box>
                <Text fontWeight="600" mb={1}>
                  Authentication Type: {providerTemplate.authType || 'API Key'}
                </Text>
                <Text fontSize="xs">
                  This provider uses {providerTemplate.authType || 'API Key'} authentication.
                  {providerTemplate.authType === 'bearer' && ' Your key will be sent as a Bearer token.'}
                  {providerTemplate.authType === 'x-api-key' && ' Your key will be sent in the X-API-Key header.'}
                </Text>
              </Box>
            </Alert>
          )}

          <Divider />

          {/* Project Assignment */}
          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              <HStack>
                <FiFolder />
                <Text>Assign to Project</Text>
              </HStack>
            </FormLabel>
            
            {!showNewProject ? (
              <>
                {loadingProjects ? (
                  <HStack p={3} justify="center">
                    <Spinner size="sm" />
                    <Text fontSize="sm" color={subtleText}>Loading projects...</Text>
                  </HStack>
                ) : (
                  <Select
                    placeholder="Select a project..."
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    fontSize="sm"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} {project.description && `- ${project.description}`}
                      </option>
                    ))}
                  </Select>
                )}
                <FormHelperText fontSize="xs">
                  {projects.length === 0 && !loadingProjects ? (
                    <VStack align="start" spacing={1}>
                      <Text color="orange.500" fontWeight="500">No existing projects found</Text>
                      <Text color={useSemanticToken('text.secondary')} fontSize="2xs">
                        This could mean the AI Inferencing Service (port 9000) is not running, or you don't have any projects yet.
                      </Text>
                      <Button
                        variant="link"
                        fontSize="xs"
                        leftIcon={<FiPlus />}
                        onClick={() => setShowNewProject(true)}
                        colorScheme="blue"
                        mt={1}
                      >
                        Create your first project
                      </Button>
                    </VStack>
                  ) : (
                    <>
                      Choose which project will use this API key, or{' '}
                      <Button
                        variant="link"
                        fontSize="xs"
                        leftIcon={<FiPlus />}
                        onClick={() => setShowNewProject(true)}
                      >
                        create a new project
                      </Button>
                    </>
                  )}
                </FormHelperText>
              </>
            ) : (
              <VStack align="stretch" spacing={3}>
                <Input
                  placeholder="Project Name (e.g., Production App)"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  fontSize="sm"
                />
                <Textarea
                  placeholder="Project Description (optional)"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  fontSize="sm"
                  rows={2}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                >
                  Cancel - Use Existing Project
                </Button>
              </VStack>
            )}
          </FormControl>
        </VStack>
      </Card>

      {/* Rate Limits */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={6}>
          <Text fontSize="sm" fontWeight="600">
            Rate Limits
          </Text>

          <FormControl>
            <FormLabel fontSize="sm">Requests per Minute</FormLabel>
            <NumberInput
              value={requestsPerMinute}
              onChange={(_, value) => setRequestsPerMinute(value)}
              min={1}
              max={1000}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText fontSize="xs">
              Maximum API requests allowed per minute
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Tokens per Minute</FormLabel>
            <NumberInput
              value={tokensPerMinute}
              onChange={(_, value) => setTokensPerMinute(value)}
              min={1000}
              max={1000000}
              step={1000}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <FormHelperText fontSize="xs">
              Maximum tokens (input + output) per minute
            </FormHelperText>
          </FormControl>
        </VStack>
      </Card>

      {/* Cost Management */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={6}>
        <VStack align="stretch" spacing={6}>
          <Text fontSize="sm" fontWeight="600">
            Cost Management
          </Text>

          <FormControl isRequired>
            <FormLabel fontSize="sm">Daily Cost Limit (Per Provider)</FormLabel>
            <InputGroup>
              <Input
                type="number"
                value={dailyMaxCost}
                onChange={(e) => setDailyMaxCost(parseFloat(e.target.value))}
                min={0}
                step={1}
              />
            </InputGroup>
            <FormHelperText fontSize="xs">
              Maximum daily spend for this provider in USD. Service will pause when limit is reached.
            </FormHelperText>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Per-Request Cost Limit</FormLabel>
            <InputGroup>
              <Input
                type="number"
                value={perRequestMaxCost}
                onChange={(e) => setPerRequestMaxCost(parseFloat(e.target.value))}
                min={0}
                step={0.1}
              />
            </InputGroup>
            <FormHelperText fontSize="xs">
              Maximum cost per single request in USD. Requests exceeding this will be rejected.
            </FormHelperText>
          </FormControl>

          <Divider />

          <FormControl display="flex" alignItems="center">
            <VStack align="start" flex="1" spacing={1}>
              <FormLabel htmlFor="global-budget" mb={0} fontSize="sm" fontWeight="600">
                Contribute to Global Budget
              </FormLabel>
              <FormHelperText fontSize="xs" mt={0}>
                Include this provider in the global cross-provider budget limit
              </FormHelperText>
            </VStack>
            <Switch
              id="global-budget"
              isChecked={useGlobalBudget}
              onChange={(e) => setUseGlobalBudget(e.target.checked)}
            />
          </FormControl>

          {useGlobalBudget && (
            <Alert status="info" borderRadius="md" fontSize="xs">
              <AlertIcon />
              This provider will share the global budget with other enabled providers.
              Global budget can be configured in Settings → Cost Management.
            </Alert>
          )}
        </VStack>
      </Card>

      {/* Actions */}
      <HStack justify="space-between" pt={4}>
        <Button onClick={onBack} variant="ghost">
          ← Back
        </Button>
        <Button onClick={handleNext} isDisabled={!isValid}>
          Next: Test Connection →
        </Button>
      </HStack>
    </VStack>
  );
};

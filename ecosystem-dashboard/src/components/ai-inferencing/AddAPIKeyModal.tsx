/**
 * Add API Key Modal
 * Modal for adding API keys to services in AI Inferencing
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  useToast,
  Text,
  NumberInput,
  NumberInputField,
  Switch,
  HStack,
} from '@chakra-ui/react';

interface AddAPIKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;  // Optional - can select in modal
  serviceId?: string;  // Optional - can select in modal
  onKeyAdded?: () => void;
}

export function AddAPIKeyModal({ 
  isOpen, 
  onClose, 
  projectId: initialProjectId, 
  serviceId: initialServiceId,
  onKeyAdded 
}: AddAPIKeyModalProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || '');
  const [selectedServiceId, setSelectedServiceId] = useState(initialServiceId || '');
  const [newServiceName, setNewServiceName] = useState('');
  const [isCreatingService, setIsCreatingService] = useState(false);
  
  const [provider, setProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(50);
  const [costLimitDaily, setCostLimitDaily] = useState(10);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const toast = useToast();

  // Load projects and providers on mount
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      loadProviders();
    }
  }, [isOpen]);

  // Load services when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadServices(selectedProjectId);
    } else {
      setServices([]);
      setSelectedServiceId('');
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const response = await fetch('http://localhost:9000/api/v1/admin/keys/projects', {
        headers: { 'X-Admin-Key': 'ai-inferencing-admin-key-2024' },
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const response = await fetch('http://localhost:9000/api/v1/admin/providers', {
        headers: { 'X-Admin-Key': 'ai-inferencing-admin-key-2024' },
      });
      if (response.ok) {
        const data = await response.json();
        // Transform providers to dropdown format
        const providerOptions = (data.providers || [])
          .filter((p: any) => p.is_active)
          .map((p: any) => ({
            value: p.provider_id,
            label: p.display_name,
          }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label));
        setProviders(providerOptions);
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
      // Fallback to hardcoded list if API fails
      setProviders([
        { value: 'openai', label: 'OpenAI' },
        { value: 'anthropic', label: 'Anthropic (Claude)' },
        { value: 'google', label: 'Google Gemini' },
      ]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadServices = async (projectId: string) => {
    setLoadingServices(true);
    try {
      const response = await fetch(
        `http://localhost:9000/api/v1/admin/keys/projects/${projectId}/services`,
        { headers: { 'X-Admin-Key': 'ai-inferencing-admin-key-2024' } }
      );
      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleCreateService = async () => {
    if (!newServiceName.trim() || !selectedProjectId) return;
    
    setIsCreatingService(true);
    try {
      const serviceId = newServiceName.toLowerCase().replace(/\s+/g, '-');
      const response = await fetch(
        `http://localhost:9000/api/v1/admin/keys/projects/${selectedProjectId}/services`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': 'ai-inferencing-admin-key-2024',
          },
          body: JSON.stringify({
            serviceId: serviceId,
            name: newServiceName,
            description: `Service for ${newServiceName}`,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Service Created',
          description: `Created ${newServiceName}`,
          status: 'success',
          duration: 3000,
        });
        await loadServices(selectedProjectId);
        setSelectedServiceId(serviceId);
        setNewServiceName('');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Service creation failed:', errorData);
        throw new Error(errorData.message || errorData.error || 'Failed to create service');
      }
    } catch (error: any) {
      toast({
        title: 'Failed to create service',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsCreatingService(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedProjectId || !selectedServiceId) {
      toast({
        title: 'Missing Selection',
        description: 'Please select a project and service',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (!apiKey) {
      toast({
        title: 'Missing API Key',
        description: 'Please enter the API key',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsAdding(true);

    try {
      const response = await fetch(
        `http://localhost:9000/api/v1/admin/keys/services/${selectedServiceId}/keys`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': 'ai-inferencing-admin-key-2024',
          },
          body: JSON.stringify({
            provider,
            apiKey,
            displayName: displayName || undefined,
            isPrimary,
            rateLimitPerMinute,
            costLimitDaily,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add API key');
      }

      toast({
        title: 'API Key Added',
        description: `Successfully added ${provider} key`,
        status: 'success',
        duration: 3000,
      });

      onKeyAdded?.();
      
      // Reset form
      setProvider('openai');
      setApiKey('');
      setDisplayName('');
      setIsPrimary(true);
      setRateLimitPerMinute(50);
      setCostLimitDaily(10);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to add API key',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add API Key</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Project</FormLabel>
              <Select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                placeholder="Select project"
                isDisabled={loadingProjects}
              >
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.name || p.project_id}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Service</FormLabel>
              <VStack align="stretch" spacing={2}>
                <Select 
                  value={selectedServiceId} 
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  placeholder="Select service"
                  isDisabled={!selectedProjectId || loadingServices}
                >
                  {services.map((s) => (
                    <option key={s.service_id} value={s.service_id}>
                      {s.name || s.service_id}
                    </option>
                  ))}
                </Select>
                {selectedProjectId && (
                  <HStack>
                    <Input
                      size="sm"
                      placeholder="New service name"
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateService}
                      isLoading={isCreatingService}
                      isDisabled={!newServiceName.trim()}
                    >
                      Create
                    </Button>
                  </HStack>
                )}
              </VStack>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Provider</FormLabel>
              <Select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                isDisabled={loadingProviders}
              >
                {providers.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>API Key</FormLabel>
              <Input
                type="password"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fontFamily="mono"
              />
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                The key will be encrypted and stored securely
              </Text>
            </FormControl>

            <FormControl>
              <FormLabel>Display Name (Optional)</FormLabel>
              <Input
                placeholder="e.g., Production Key"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Rate Limit (requests/minute)</FormLabel>
              <NumberInput
                value={rateLimitPerMinute}
                onChange={(_, val) => setRateLimitPerMinute(val)}
                min={1}
                max={1000}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl>
              <FormLabel>Daily Cost Limit ($)</FormLabel>
              <NumberInput
                value={costLimitDaily}
                onChange={(_, val) => setCostLimitDaily(val)}
                min={0}
                precision={2}
              >
                <NumberInputField />
              </NumberInput>
            </FormControl>

            <FormControl>
              <HStack justify="space-between" width="full">
                <FormLabel mb={0}>Set as Primary Key</FormLabel>
                <Switch
                  isChecked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
              </HStack>
              <Text fontSize="xs" color={useSemanticToken('text.secondary')} mt={1}>
                Primary keys are used by default for this service
              </Text>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isAdding}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleAdd}
            isLoading={isAdding}
            loadingText="Adding..."
          >
            Add Key
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

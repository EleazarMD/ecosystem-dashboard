/**
 * Agent Config Panel — runtime configuration of the agent registry.
 * Shows which agents are bound to which tasks, allows swapping negotiable
 * bindings, updating model IDs, enabling/disabling providers, and
 * registering custom agents.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Badge, Button, IconButton, Spinner,
  Select, Input, FormControl, FormLabel, FormHelperText, Switch,
  Divider, useToast, Tooltip, SimpleGrid,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Alert, AlertIcon, Code,
} from '@chakra-ui/react';
import {
  FiRefreshCw, FiSettings, FiPlus, FiLock, FiUnlock, FiCheck,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Provider {
  agentId: string;
  label: string;
  gatewayModel: string;
  isChildSafe: boolean;
  specializations: string[];
  costTier: number;
  enabled: boolean;
}

interface Binding {
  taskType: string;
  agentId: string;
  negotiable: boolean;
  lockReason?: string;
  fallbackAgentId?: string;
}

interface RegistryConfig {
  providers: Provider[];
  bindings: Binding[];
  customAgents: Provider[];
  negotiableTasks: Binding[];
  lockedTasks: Binding[];
}

const AGENT_LABELS: Record<string, string> = {
  'claude-opus': 'Claude Opus',
  'gpt-5.5': 'GPT 5.5',
  'gemini-image-pro': 'Gemini Image Pro',
  'nano-banana': 'Nano Banana',
  'minimax-m3': 'MiniMax M3',
  'local-llm': 'Local LLM',
  'human': 'Human',
};

const COST_LABELS: Record<number, string> = {
  0: '—', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$', 5: '$$$$$',
};

export function AgentConfigPanel() {
  const [config, setConfig] = useState<RegistryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<string | null>(null);
  const [newModel, setNewModel] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const bgHover = useSemanticToken('surface.hover');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/learn/lessons/agents');
      const data = await res.json();
      setConfig(data);
    } catch {
      toast({ title: 'Failed to load agent config', status: 'error', duration: 2000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRebind = async (taskType: string, newAgentId: string) => {
    try {
      const res = await fetch('/api/learn/lessons/agents?action=rebind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType, agentId: newAgentId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: data.message, status: 'success', duration: 3000 });
        load();
      } else {
        toast({ title: data.error, status: 'error', duration: 3000 });
      }
    } catch {
      toast({ title: 'Failed to rebind', status: 'error', duration: 3000 });
    }
  };

  const handleToggleProvider = async (agentId: string, enable: boolean) => {
    const action = enable ? 'enable' : 'disable';
    try {
      const res = await fetch(`/api/learn/lessons/agents?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: data.message, status: 'success', duration: 2000 });
        load();
      }
    } catch {
      toast({ title: 'Failed', status: 'error', duration: 2000 });
    }
  };

  const handleUpdateModel = async (agentId: string) => {
    try {
      const res = await fetch('/api/learn/lessons/agents?action=update_model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, gatewayModel: newModel }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: data.message, status: 'success', duration: 2000 });
        setEditingModel(null);
        setNewModel('');
        load();
      }
    } catch {
      toast({ title: 'Failed', status: 'error', duration: 2000 });
    }
  };

  const handleRegisterAgent = async (formData: Record<string, any>) => {
    try {
      const res = await fetch('/api/learn/lessons/agents?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: data.message, status: 'success', duration: 3000 });
        onClose();
        load();
      }
    } catch {
      toast({ title: 'Failed to register agent', status: 'error', duration: 3000 });
    }
  };

  if (loading && !config) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" />
        <Text mt={4} color={textSecondary}>Loading agent config...</Text>
      </Box>
    );
  }

  if (!config) return null;

  // Get enabled providers that can be swapped in for a task type
  const getSwappableAgents = (binding: Binding): Provider[] => {
    return config.providers.filter(
      (p) => p.enabled && p.agentId !== 'human' && p.agentId !== binding.agentId
    );
  };

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="lg" fontWeight="semibold">Agent Configuration</Text>
        <HStack>
          <IconButton aria-label="Refresh" icon={<FiRefreshCw />} size="sm" variant="ghost" onClick={load} />
          <Button leftIcon={<FiPlus />} size="sm" colorScheme="blue" onClick={onOpen}>
            Register Agent
          </Button>
        </HStack>
      </HStack>

      {/* Providers */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>Model Providers</Text>
        <SimpleGrid columns={2} spacing={2}>
          {config.providers.filter((p) => p.agentId !== 'human').map((provider) => (
            <Box
              key={provider.agentId}
              p={3}
              borderRadius="md"
              border="1px solid"
              borderColor={borderColor}
              opacity={provider.enabled ? 1 : 0.5}
            >
              <HStack justify="space-between" mb={1}>
                <HStack>
                  <Text fontSize="sm" fontWeight="medium">{provider.label}</Text>
                  {provider.isChildSafe && (
                    <Badge colorScheme="green" fontSize="2xs">child-safe</Badge>
                  )}
                </HStack>
                <Switch
                  size="sm"
                  isChecked={provider.enabled}
                  onChange={(e) => handleToggleProvider(provider.agentId, e.target.checked)}
                />
              </HStack>
              {editingModel === provider.agentId ? (
                <HStack mt={1}>
                  <Input
                    size="xs"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="gateway model ID"
                  />
                  <IconButton
                    aria-label="Save" icon={<FiCheck />} size="xs" colorScheme="green"
                    onClick={() => handleUpdateModel(provider.agentId)}
                  />
                </HStack>
              ) : (
                <HStack justify="space-between" mt={1}>
                  <Tooltip label="Click to edit model ID">
                    <Code fontSize="xs" cursor="pointer" onClick={() => { setEditingModel(provider.agentId); setNewModel(provider.gatewayModel); }}>
                      {provider.gatewayModel}
                    </Code>
                  </Tooltip>
                  <Text fontSize="xs" color={textSecondary}>{COST_LABELS[provider.costTier]}</Text>
                </HStack>
              )}
              <Text fontSize="xs" color={textSecondary} mt={1} noOfLines={1}>
                {provider.specializations.join(', ')}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </Box>

      <Divider />

      {/* Task Bindings */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2}>Task Assignments</Text>
        <VStack spacing={2} align="stretch">
          {config.bindings.map((binding) => (
            <HStack
              key={binding.taskType}
              p={2}
              borderRadius="md"
              border="1px solid"
              borderColor={borderColor}
              _hover={{ bg: bgHover }}
              spacing={3}
            >
              {binding.negotiable ? (
                <Tooltip label="Swappable">
                  <Box><FiUnlock size={14} /></Box>
                </Tooltip>
              ) : (
                <Tooltip label={binding.lockReason || 'Locked'}>
                  <Box><FiLock size={14} color="orange" /></Box>
                </Tooltip>
              )}
              <Box flex={1}>
                <Text fontSize="sm" fontWeight="medium">
                  {binding.taskType.replace(/_/g, ' ')}
                </Text>
                {binding.lockReason && (
                  <Text fontSize="xs" color={textSecondary} noOfLines={1}>
                    {binding.lockReason}
                  </Text>
                )}
              </Box>
              {binding.negotiable ? (
                <Select
                  size="xs"
                  width="150px"
                  value={binding.agentId}
                  onChange={(e) => handleRebind(binding.taskType, e.target.value)}
                >
                  <option value={binding.agentId}>{AGENT_LABELS[binding.agentId] || binding.agentId}</option>
                  {getSwappableAgents(binding).map((p) => (
                    <option key={p.agentId} value={p.agentId}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge fontSize="xs" colorScheme="orange">
                  {AGENT_LABELS[binding.agentId] || binding.agentId}
                </Badge>
              )}
            </HStack>
          ))}
        </VStack>
      </Box>

      <RegisterAgentModal isOpen={isOpen} onClose={onClose} onRegister={handleRegisterAgent} />
    </VStack>
  );
}

// ─── Register Agent Modal ───────────────────────────────────────────────────

function RegisterAgentModal({
  isOpen, onClose, onRegister,
}: {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (formData: Record<string, any>) => void;
}) {
  const [form, setForm] = useState({
    agentId: '',
    label: '',
    gatewayModel: '',
    isChildSafe: false,
    specializations: '',
    costTier: 3,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Register Custom Agent</ModalHeader>
        <ModalBody>
          <VStack spacing={3} align="stretch">
            <FormControl isRequired>
              <FormLabel>Agent ID</FormLabel>
              <Input
                value={form.agentId}
                onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                placeholder="e.g., llama-4, qwen3-max"
              />
              <FormHelperText>Unique identifier for this agent</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Label</FormLabel>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Display name"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Gateway Model ID</FormLabel>
              <Input
                value={form.gatewayModel}
                onChange={(e) => setForm({ ...form, gatewayModel: e.target.value })}
                placeholder="e.g., llama-4-405b"
              />
              <FormHelperText>The model ID used by the AI Gateway</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>Specializations</FormLabel>
              <Input
                value={form.specializations}
                onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                placeholder="reasoning, math, structured_output"
              />
              <FormHelperText>Comma-separated capabilities</FormHelperText>
            </FormControl>

            <SimpleGrid columns={2} spacing={3}>
              <FormControl>
                <FormLabel>Cost Tier (1-5)</FormLabel>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.costTier}
                  onChange={(e) => setForm({ ...form, costTier: Number(e.target.value) })}
                />
              </FormControl>
              <FormControl display="flex" alignItems="flex-end" pb={2}>
                <Switch
                  isChecked={form.isChildSafe}
                  onChange={(e) => setForm({ ...form, isChildSafe: e.target.checked })}
                >
                  <Text ml={2} fontSize="sm">Child-safe</Text>
                </Switch>
              </FormControl>
            </SimpleGrid>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>Cancel</Button>
          <Button
            colorScheme="blue"
            onClick={() => onRegister({
              ...form,
              specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
            })}
            isDisabled={!form.agentId || !form.gatewayModel}
          >
            Register
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

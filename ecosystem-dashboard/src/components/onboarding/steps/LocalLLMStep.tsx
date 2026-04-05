/**
 * Step 4: Local LLM Configuration
 * 
 * Displays and validates local model endpoints: MiniMax, Qwen Vision LM, Qwen TTS.
 * Local-first approach — these are pre-configured and shared across tenants.
 */

import React, { useCallback } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Alert,
  AlertIcon,
  AlertDescription,
  SimpleGrid,
  Button,
  Spinner,
  Code,
  Tag,
  TagLabel,
  Divider,
} from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon, RepeatIcon } from '@chakra-ui/icons';

import { LocalLLMFormData, LocalLLMConfig } from '@/lib/platform/onboarding-types';

interface LocalLLMStepProps {
  data: LocalLLMFormData;
  onChange: (updates: Partial<LocalLLMFormData>) => void;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'green',
  loading: 'yellow',
  unavailable: 'red',
  checking: 'blue',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  loading: 'Loading...',
  unavailable: 'Unavailable',
  checking: 'Checking...',
};

const MODEL_TYPE_COLORS: Record<string, string> = {
  chat: 'blue',
  vision: 'purple',
  tts: 'orange',
  stt: 'teal',
  embedding: 'cyan',
};

export function LocalLLMStep({ data, onChange }: LocalLLMStepProps) {

  const checkModelHealth = useCallback(async (modelId: string) => {
    const updatedModels = data.models.map(m =>
      m.id === modelId ? { ...m, status: 'checking' as const } : m
    );
    onChange({ models: updatedModels });

    try {
      const model = data.models.find(m => m.id === modelId);
      if (!model) return;

      const res = await fetch(`/api/platform/llm/health-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: model.endpoint, port: model.port }),
      });
      const result = await res.json();

      const finalModels = data.models.map(m =>
        m.id === modelId ? { ...m, status: result.healthy ? 'available' as const : 'unavailable' as const } : m
      );
      onChange({
        models: finalModels,
        allModelsChecked: finalModels.every(m => m.status === 'available' || m.status === 'unavailable'),
      });
    } catch {
      const finalModels = data.models.map(m =>
        m.id === modelId ? { ...m, status: 'unavailable' as const } : m
      );
      onChange({
        models: finalModels,
        allModelsChecked: finalModels.every(m => m.status === 'available' || m.status === 'unavailable'),
      });
    }
  }, [data.models, onChange]);

  const checkAllModels = useCallback(async () => {
    for (const model of data.models) {
      await checkModelHealth(model.id);
    }
  }, [data.models, checkModelHealth]);

  const availableCount = data.models.filter(m => m.status === 'available').length;
  const totalCount = data.models.length;

  return (
    <VStack spacing={6} align="stretch">
      {/* Local-First Banner */}
      <Alert status="success" borderRadius="lg" bg="green.900" borderColor="green.700" borderWidth="1px">
        <AlertIcon color="green.300" />
        <Box>
          <AlertDescription color="green.200">
            <Text fontWeight="bold" mb={1}>🏠 Local Models First</Text>
            <Text fontSize="sm">
              Your AI Homelab prioritizes local inference for privacy, speed, and zero API costs.
              These models run on your RTX workstation and are shared across tenants with per-tenant access gating.
            </Text>
          </AlertDescription>
        </Box>
      </Alert>

      {/* Health Check All */}
      <HStack justify="space-between">
        <HStack>
          <Text fontWeight="semibold" color="white">Local Models</Text>
          <Badge colorScheme={availableCount === totalCount ? 'green' : 'yellow'}>
            {availableCount}/{totalCount} Available
          </Badge>
        </HStack>
        <Button
          size="sm"
          leftIcon={<RepeatIcon />}
          colorScheme="blue"
          variant="outline"
          onClick={checkAllModels}
        >
          Check All
        </Button>
      </HStack>

      {/* Model Cards */}
      <VStack spacing={4} align="stretch">
        {data.models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            onCheck={() => checkModelHealth(model.id)}
          />
        ))}
      </VStack>

      {/* Default Assignments */}
      <Box bg="gray.800" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.700">
        <Text fontWeight="semibold" color="white" mb={3}>Default Model Assignments</Text>
        <SimpleGrid columns={3} spacing={3}>
          <Box bg="gray.900" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" color="gray.400" mb={1}>Default Chat</Text>
            <Text fontSize="sm" color="blue.300" fontWeight="medium">
              {data.models.find(m => m.id === data.defaultChatModel)?.name || 'Not set'}
            </Text>
          </Box>
          <Box bg="gray.900" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" color="gray.400" mb={1}>Default Vision</Text>
            <Text fontSize="sm" color="purple.300" fontWeight="medium">
              {data.models.find(m => m.id === data.defaultVisionModel)?.name || 'Not set'}
            </Text>
          </Box>
          <Box bg="gray.900" p={3} borderRadius="md" borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" color="gray.400" mb={1}>Default TTS</Text>
            <Text fontSize="sm" color="orange.300" fontWeight="medium">
              {data.models.find(m => m.id === data.defaultTTSModel)?.name || 'Not set'}
            </Text>
          </Box>
        </SimpleGrid>
      </Box>

      <Text fontSize="xs" color="gray.500">
        Model endpoints are registered in the tenant's model registry (<Code fontSize="xs" bg="transparent" color="gray.500">provider_models</Code> table).
        The AI Gateway routes requests to the correct vLLM instance based on the model ID.
      </Text>
    </VStack>
  );
}

// ============================================================
// Model Card Sub-Component
// ============================================================

function ModelCard({ model, onCheck }: { model: LocalLLMConfig; onCheck: () => void }) {
  return (
    <Box
      bg="gray.800"
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={model.status === 'available' ? 'green.700' : 'gray.700'}
    >
      <HStack justify="space-between" mb={3}>
        <HStack spacing={3}>
          <Box>
            <HStack>
              <Text color="white" fontWeight="bold" fontSize="md">{model.name}</Text>
              {model.isDefault && <Badge colorScheme="blue" fontSize="xs">Default</Badge>}
            </HStack>
            <Text fontSize="sm" color="gray.400">{model.purpose}</Text>
          </Box>
        </HStack>
        <HStack>
          <Badge colorScheme={STATUS_COLORS[model.status]} variant="subtle">
            {model.status === 'checking' && <Spinner size="xs" mr={1} />}
            {STATUS_LABELS[model.status]}
          </Badge>
          <Button size="xs" variant="ghost" colorScheme="blue" onClick={onCheck}>
            Check
          </Button>
        </HStack>
      </HStack>

      <Text fontSize="sm" color="gray.400" mb={3}>{model.description}</Text>

      <HStack spacing={2} flexWrap="wrap">
        <Tag size="sm" colorScheme={MODEL_TYPE_COLORS[model.modelType]}>
          <TagLabel>{model.modelType.toUpperCase()}</TagLabel>
        </Tag>
        <Tag size="sm" variant="outline" colorScheme="gray">
          <TagLabel>
            <Code fontSize="xs" bg="transparent" color="gray.400">localhost:{model.port}{model.endpoint}</Code>
          </TagLabel>
        </Tag>
        {model.contextWindow && (
          <Tag size="sm" variant="outline" colorScheme="gray">
            <TagLabel>{(model.contextWindow / 1024).toFixed(0)}K context</TagLabel>
          </Tag>
        )}
      </HStack>
    </Box>
  );
}

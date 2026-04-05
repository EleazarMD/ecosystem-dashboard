/**
 * Step 2: Configure Models
 * Select models and assign use cases (manual selection)
 */

import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  Checkbox,
  Badge,
  SimpleGrid,
  Collapse,
  Icon,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp, FiDollarSign } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Model {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  suggestedUseCases: string[];
  costPer1kTokens: {
    input: number;
    output: number;
  };
  recommended: boolean;
}

interface UseCase {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface Step2ConfigureModelsProps {
  provider: any;
  onNext: (data: any) => void;
  onBack: () => void;
  initialData?: any;
}

export const Step2ConfigureModels: React.FC<Step2ConfigureModelsProps> = ({
  provider,
  onNext,
  onBack,
  initialData,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [modelUseCases, setModelUseCases] = useState<Record<string, string[]>>({});
  const [expandedModels, setExpandedModels] = useState<Set<string>>(new Set());
  const [useCases, setUseCases] = useState<UseCase[]>([]);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const bgAccent = useSemanticToken('surface.base');

  useEffect(() => {
    // Load provider models and use cases
    fetch('/config/provider-templates.json')
      .then(res => res.json())
      .then(data => {
        const providerData = data.providers[provider.id];
        if (providerData) {
          const modelList = Object.values(providerData.models) as Model[];
          setModels(modelList);

          // Auto-select recommended models
          const recommended = modelList
            .filter(m => m.recommended)
            .map(m => m.id);
          setSelectedModels(new Set(recommended));

          // Auto-expand first model
          if (modelList.length > 0) {
            setExpandedModels(new Set([modelList[0].id]));
          }
        }

        // Load use case templates
        setUseCases(data.useCaseTemplates || getDefaultUseCases());
      })
      .catch(err => {
        console.error('Failed to load models:', err);
      });
  }, [provider.id]);

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId);
      // Clear use cases for unselected model
      const newUseCases = { ...modelUseCases };
      delete newUseCases[modelId];
      setModelUseCases(newUseCases);
    } else {
      newSelected.add(modelId);
    }
    setSelectedModels(newSelected);
  };

  const toggleUseCase = (modelId: string, useCaseId: string) => {
    const current = modelUseCases[modelId] || [];
    const newUseCases = current.includes(useCaseId)
      ? current.filter(id => id !== useCaseId)
      : [...current, useCaseId];

    setModelUseCases({
      ...modelUseCases,
      [modelId]: newUseCases,
    });
  };

  const toggleExpanded = (modelId: string) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedModels(newExpanded);
  };

  const handleNext = () => {
    const modelConfigs = Array.from(selectedModels).map((modelId, index) => ({
      modelId,
      enabled: true,
      useCases: modelUseCases[modelId] || [],
      priority: index,
    }));

    onNext({ models: modelConfigs });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <Box>
        <Text fontSize="sm" color={subtleText}>
          Select models to enable and assign use cases manually.
        </Text>
      </Box>

      {/* Model List */}
      <VStack spacing={4} align="stretch">
        {models.map((model) => {
          const isSelected = selectedModels.has(model.id);
          const isExpanded = expandedModels.has(model.id);
          const assignedUseCases = modelUseCases[model.id] || [];

          return (
            <Card
              key={model.id}
              bg={cardBg}
              shadow="none"
              border="1px"
              borderColor={isSelected ? 'blue.400' : borderColor}
              p={6}
            >
              <VStack align="stretch" spacing={4}>
                {/* Model Header */}
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Checkbox
                      isChecked={isSelected}
                      onChange={() => toggleModel(model.id)}
                      size="lg"
                    />
                    <VStack align="start" spacing={0}>
                      <HStack>
                        <Text fontSize="md" fontWeight="600">
                          {model.name}
                        </Text>
                        {model.recommended && (
                          <Badge colorScheme="green" fontSize="xs">
                            Recommended
                          </Badge>
                        )}
                      </HStack>
                      <Text fontSize="sm" color={subtleText}>
                        {model.description}
                      </Text>
                    </VStack>
                  </HStack>

                  {isSelected && (
                    <Button
                      size="sm"
                      variant="ghost"
                      rightIcon={<Icon as={isExpanded ? FiChevronUp : FiChevronDown} />}
                      onClick={() => toggleExpanded(model.id)}
                    >
                      {isExpanded ? 'Hide' : 'Configure'}
                    </Button>
                  )}
                </HStack>

                {/* Cost Info */}
                <HStack spacing={6} fontSize="xs" color={subtleText}>
                  <HStack>
                    <Icon as={FiDollarSign} />
                    <Text>
                      Input: {formatCost(model.costPer1kTokens.input)}/1K tokens
                    </Text>
                  </HStack>
                  <HStack>
                    <Icon as={FiDollarSign} />
                    <Text>
                      Output: {formatCost(model.costPer1kTokens.output)}/1K tokens
                    </Text>
                  </HStack>
                </HStack>

                {/* Use Case Selection (Expanded) */}
                <Collapse in={isExpanded && isSelected}>
                  <Box bg={bgAccent} p={4} borderRadius="md" mt={2}>
                    <VStack align="stretch" spacing={4}>
                      <Text fontSize="sm" fontWeight="600">
                        Assign Use Cases (Manual Selection)
                      </Text>

                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                        {useCases.map((useCase) => {
                          const isAssigned = assignedUseCases.includes(useCase.id);
                          const isSuggested = model.suggestedUseCases.includes(useCase.name);

                          return (
                            <HStack
                              key={useCase.id}
                              p={3}
                              borderWidth="1px"
                              borderColor={isAssigned ? 'blue.400' : borderColor}
                              borderRadius="md"
                              cursor="pointer"
                              bg={isAssigned ? 'blue.50' : 'transparent'}
                              onClick={() => toggleUseCase(model.id, useCase.id)}
                              _hover={{ borderColor: 'blue.400' }}
                            >
                              <Checkbox
                                isChecked={isAssigned}
                                onChange={() => {}}
                              />
                              <VStack align="start" spacing={0} flex="1">
                                <HStack>
                                  <Text fontSize="sm" fontWeight="500">
                                    {useCase.name}
                                  </Text>
                                  {isSuggested && (
                                    <Badge colorScheme="blue" fontSize="xs">
                                      Suggested
                                    </Badge>
                                  )}
                                </HStack>
                                <Text fontSize="xs" color={subtleText}>
                                  {useCase.description}
                                </Text>
                              </VStack>
                            </HStack>
                          );
                        })}
                      </SimpleGrid>
                    </VStack>
                  </Box>
                </Collapse>
              </VStack>
            </Card>
          );
        })}
      </VStack>

      {/* Actions */}
      <HStack justify="space-between" pt={4}>
        <Button onClick={onBack} variant="ghost">
          ← Back
        </Button>
        <Button
          onClick={handleNext}
          isDisabled={selectedModels.size === 0}
        >
          Next: API Configuration →
        </Button>
      </HStack>
    </VStack>
  );
};

function getDefaultUseCases(): UseCase[] {
  return [
    {
      id: 'deep-research',
      name: 'Deep Research',
      description: 'In-depth analysis with citations',
      icon: 'search',
    },
    {
      id: 'quick-research',
      name: 'Quick Research',
      description: 'Fast lookups',
      icon: 'zap',
    },
    {
      id: 'code-generation',
      name: 'Code Generation',
      description: 'Writing and debugging code',
      icon: 'code',
    },
    {
      id: 'content-creation',
      name: 'Content Creation',
      description: 'Writing articles and blogs',
      icon: 'edit',
    },
    {
      id: 'general-chat',
      name: 'General Chat',
      description: 'Everyday queries',
      icon: 'message',
    },
    {
      id: 'data-analysis',
      name: 'Data Analysis',
      description: 'Analyzing data',
      icon: 'chart',
    },
  ];
}

/**
 * Step 1: Select Provider
 * Choose from pre-configured provider templates
 */

import React, { useState, useEffect } from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  VStack,
  HStack,
  Text,
  Button,
  Card,
  SimpleGrid,
  Box,
  Badge,
  Icon,
} from '@chakra-ui/react';
import {
  FiSearch,
  FiZap,
  FiCode,
  FiLayers,
  FiTrendingUp,
  FiImage,
} from 'react-icons/fi';

interface ProviderTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  baseUrl: string;
  authType: string;
  logo: string;
  models: Record<string, any>;
}

interface Step1SelectProviderProps {
  onNext: (data: any) => void;
  initialData?: any;
}

export const Step1SelectProvider: React.FC<Step1SelectProviderProps> = ({
  onNext,
  initialData,
}) => {
  const [providers, setProviders] = useState<ProviderTemplate[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    initialData?.id || null
  );

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const hoverBorder = 'blue.500';

  useEffect(() => {
    // Load provider templates
    fetch('/config/provider-templates.json')
      .then(res => res.json())
      .then(data => {
        const providerList = Object.values(data.providers) as ProviderTemplate[];
        setProviders(providerList);
      })
      .catch(err => {
        console.error('Failed to load provider templates:', err);
        // Fallback to mock data
        setProviders(getMockProviders());
      });
  }, []);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'research':
        return FiSearch;
      case 'speed':
        return FiZap;
      case 'general':
        return FiLayers;
      case 'opensource':
        return FiCode;
      case 'audio':
        return FiZap; // Using Zap for audio (fast processing)
      case 'images':
        return FiImage;
      default:
        return FiTrendingUp;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'research':
        return 'blue';
      case 'speed':
        return 'purple';
      case 'general':
        return 'green';
      case 'opensource':
        return 'orange';
      case 'audio':
        return 'cyan';
      case 'images':
        return 'pink';
      default:
        return 'gray';
    }
  };

  const handleSelect = (providerId: string) => {
    setSelectedProvider(providerId);
  };

  const handleNext = () => {
    if (!selectedProvider) return;

    const provider = providers.find(p => p.id === selectedProvider);
    if (provider) {
      onNext({
        provider: {
          id: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          authType: provider.authType,
        },
      });
    }
  };

  return (
    <VStack spacing={8} align="stretch">
      {/* Header */}
      <Box>
        <Text fontSize="sm" color={subtleText} mb={6}>
          Select a provider to get started. These are pre-configured with optimal settings.
        </Text>
      </Box>

      {/* Provider Cards */}
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        {providers.map((provider) => {
          const isSelected = selectedProvider === provider.id;
          const categoryIcon = getCategoryIcon(provider.category);
          const categoryColor = getCategoryColor(provider.category);

          return (
            <Card
              key={provider.id}
              bg={cardBg}
              shadow="none"
              border="2px"
              borderColor={isSelected ? hoverBorder : borderColor}
              p={6}
              cursor="pointer"
              onClick={() => handleSelect(provider.id)}
              _hover={{
                borderColor: hoverBorder,
              }}
            >
              <VStack align="stretch" spacing={4}>
                {/* Provider Header */}
                <HStack justify="space-between">
                  <HStack spacing={3}>
                    <Icon
                      as={categoryIcon}
                      boxSize={5}
                      color={`${categoryColor}.500`}
                    />
                    <VStack align="start" spacing={0}>
                      <Text fontSize="md" fontWeight="600">
                        {provider.name}
                      </Text>
                      <Badge
                        colorScheme={categoryColor}
                        fontSize="xs"
                        textTransform="capitalize"
                      >
                        {provider.category}
                      </Badge>
                    </VStack>
                  </HStack>
                  {isSelected && (
                    <Box
                      w="20px"
                      h="20px"
                      borderRadius="full"
                      bg={useSemanticToken('interactive.primary')}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Text color={useSemanticToken('text.inverse')} fontSize="xs" fontWeight="bold">
                        ✓
                      </Text>
                    </Box>
                  )}
                </HStack>

                {/* Description */}
                <Text fontSize="sm" color={subtleText}>
                  {provider.description}
                </Text>

                {/* Model Count */}
                <Text fontSize="xs" color={subtleText}>
                  {Object.keys(provider.models).length} models available
                </Text>
              </VStack>
            </Card>
          );
        })}
      </SimpleGrid>

      {/* Actions */}
      <HStack justify="flex-end" pt={4}>
        <Button
          onClick={handleNext}
          isDisabled={!selectedProvider}
          size="md"
        >
          Next: Configure Models →
        </Button>
      </HStack>
    </VStack>
  );
};

// Mock data fallback
function getMockProviders(): ProviderTemplate[] {
  return [
    {
      id: 'tavily',
      name: 'Tavily Search',
      description: 'Real-time web search API optimized for AI agents and RAG',
      category: 'research',
      baseUrl: 'https://api.tavily.com',
      authType: 'bearer',
      logo: '/providers/tavily.svg',
      models: {
        'tavily-search': {},
        'tavily-extract': {},
      },
    },
    {
      id: 'perplexity',
      name: 'Perplexity AI',
      description: 'Real-time web-search powered AI for research',
      category: 'research',
      baseUrl: 'https://api.perplexity.ai',
      authType: 'bearer',
      logo: '/providers/perplexity.svg',
      models: {
        'pplx-7b-online': {},
        'pplx-70b-online': {},
      },
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude models for reasoning and analysis',
      category: 'general',
      baseUrl: 'https://api.anthropic.com',
      authType: 'x-api-key',
      logo: '/providers/anthropic.svg',
      models: {
        'claude-3-opus-20240229': {},
        'claude-3-sonnet-20240229': {},
      },
    },
    {
      id: 'groq',
      name: 'Groq',
      description: 'Ultra-fast inference with LPU technology',
      category: 'speed',
      baseUrl: 'https://api.groq.com/openai/v1',
      authType: 'bearer',
      logo: '/providers/groq.svg',
      models: {
        'llama-3.1-70b-versatile': {},
        'mixtral-8x7b-32768': {},
      },
    },
    {
      id: 'together',
      name: 'Together AI',
      description: 'Access to open-source models',
      category: 'opensource',
      baseUrl: 'https://api.together.xyz/v1',
      authType: 'bearer',
      logo: '/providers/together.svg',
      models: {
        'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo': {},
      },
    },
  ];
}

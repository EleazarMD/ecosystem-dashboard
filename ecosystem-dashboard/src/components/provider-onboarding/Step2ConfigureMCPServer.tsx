/**
 * Step 2: Configure MCP Server
 * Configure MCP server tools and settings
 */

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Button,
  Card,
  Box,
  Badge,
  SimpleGrid,
  Icon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Code,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react';
import { FiTool, FiServer, FiDollarSign, FiZap } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MCPTool {
  name: string;
  description: string;
  costPerInvocation?: number;
}

interface MCPServerConfig {
  serverType: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  tools: MCPTool[];
  costPerCall: number;
  creditsPerMonth: number;
  envVars?: Record<string, string>;
}

interface Step2ConfigureMCPServerProps {
  provider: any;
  onNext: (data: any) => void;
  onBack: () => void;
  initialData?: any;
}

export const Step2ConfigureMCPServer: React.FC<Step2ConfigureMCPServerProps> = ({
  provider,
  onNext,
  onBack,
  initialData,
}) => {
  const [mcpConfig, setMcpConfig] = useState<MCPServerConfig | null>(null);

  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const subtleText = useSemanticToken('text.secondary');
  const bgAccent = useSemanticToken('surface.highlight');

  React.useEffect(() => {
    // Load MCP server configuration from API
    if (provider?.id) {
      fetch(`/api/ai-config/providers?providerId=${provider.id}`)
        .then(async (res) => {
          // Check if response is JSON
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('API returned non-JSON response');
          }
          return res.json();
        })
        .then(data => {
          if (data.success && data.provider?.mcpServer) {
            setMcpConfig(data.provider.mcpServer);
          } else {
            // Fallback: Load hardcoded config for Tavily
            if (provider.id === 'tavily') {
              setMcpConfig({
                serverType: 'stdio',
                command: 'npx',
                args: ['-y', '@tavily/mcp-server'],
                url: 'https://api.tavily.com',
                tools: [
                  {
                    name: 'tavily_search',
                    description: 'Real-time web search optimized for AI agents and RAG workflows',
                    costPerInvocation: 0.001
                  },
                  {
                    name: 'tavily_extract',
                    description: 'Extract and structure content from web pages',
                    costPerInvocation: 0.001
                  },
                  {
                    name: 'tavily_answer',
                    description: 'Get direct answers to questions with source citations',
                    costPerInvocation: 0.001
                  }
                ],
                costPerCall: 0.001,
                creditsPerMonth: 1000,
                envVars: {
                  TAVILY_API_KEY: 'Required - Get from https://app.tavily.com'
                }
              });
            }
          }
        })
        .catch(err => {
          console.error('Failed to load MCP config:', err);
          // Fallback for Tavily
          if (provider.id === 'tavily') {
            setMcpConfig({
              serverType: 'stdio',
              command: 'npx',
              args: ['-y', '@tavily/mcp-server'],
              url: 'https://api.tavily.com',
              tools: [
                {
                  name: 'tavily_search',
                  description: 'Real-time web search optimized for AI agents and RAG workflows',
                  costPerInvocation: 0.001
                },
                {
                  name: 'tavily_extract',
                  description: 'Extract and structure content from web pages',
                  costPerInvocation: 0.001
                },
                {
                  name: 'tavily_answer',
                  description: 'Get direct answers to questions with source citations',
                  costPerInvocation: 0.001
                }
              ],
              costPerCall: 0.001,
              creditsPerMonth: 1000,
              envVars: {
                TAVILY_API_KEY: 'Required - Get from https://app.tavily.com'
              }
            });
          }
        });
    }
  }, [provider?.id]);

  const handleNext = () => {
    onNext({
      mcpServer: mcpConfig,
    });
  };

  if (!mcpConfig) {
    return (
      <VStack spacing={4} align="stretch">
        <Text>Loading MCP server configuration...</Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Server Info Header */}
      <Box>
        <Text fontSize="sm" color={subtleText} mb={4}>
          MCP Server provides tools for AI agents to interact with external services
        </Text>
      </Box>

      {/* Server Type Card */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={5}>
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FiServer} color="blue.500" boxSize={5} />
            <Text fontSize="md" fontWeight="600">Server Configuration</Text>
          </HStack>

          <SimpleGrid columns={2} spacing={4}>
            <Box>
              <Text fontSize="xs" color={subtleText} mb={1}>Server Type</Text>
              <Badge colorScheme="purple" fontSize="sm">{mcpConfig.serverType.toUpperCase()}</Badge>
            </Box>
            {mcpConfig.command && (
              <Box>
                <Text fontSize="xs" color={subtleText} mb={1}>Command</Text>
                <Code fontSize="xs">{mcpConfig.command} {mcpConfig.args?.join(' ')}</Code>
              </Box>
            )}
            {mcpConfig.url && (
              <Box>
                <Text fontSize="xs" color={subtleText} mb={1}>Endpoint</Text>
                <Code fontSize="xs">{mcpConfig.url}</Code>
              </Box>
            )}
          </SimpleGrid>
        </VStack>
      </Card>

      {/* Cost Information */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={5}>
        <VStack align="stretch" spacing={4}>
          <HStack>
            <Icon as={FiDollarSign} color="green.500" boxSize={5} />
            <Text fontSize="md" fontWeight="600">Cost & Credits</Text>
          </HStack>

          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel fontSize="xs">Cost per Call</StatLabel>
              <StatNumber fontSize="lg">${mcpConfig.costPerCall.toFixed(4)}</StatNumber>
              <StatHelpText fontSize="xs">Per API invocation</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel fontSize="xs">Free Tier</StatLabel>
              <StatNumber fontSize="lg">{mcpConfig.creditsPerMonth.toLocaleString()}</StatNumber>
              <StatHelpText fontSize="xs">Credits per month</StatHelpText>
            </Stat>
          </SimpleGrid>
        </VStack>
      </Card>

      {/* Available Tools */}
      <Card bg={cardBg} shadow="none" border="1px" borderColor={borderColor} p={5}>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between">
            <HStack>
              <Icon as={FiTool} color="orange.500" boxSize={5} />
              <Text fontSize="md" fontWeight="600">Available Tools</Text>
            </HStack>
            <Badge colorScheme="blue">{mcpConfig.tools.length} tools</Badge>
          </HStack>

          <VStack spacing={3} align="stretch">
            {mcpConfig.tools.map((tool, index) => (
              <Box
                key={index}
                p={3}
                bg={bgAccent}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <HStack justify="space-between" mb={2}>
                  <HStack>
                    <Icon as={FiZap} color="blue.500" boxSize={4} />
                    <Code fontSize="sm">{tool.name}</Code>
                  </HStack>
                  {tool.costPerInvocation !== undefined && (
                    <Badge colorScheme="green" fontSize="xs">
                      ${tool.costPerInvocation.toFixed(4)}/call
                    </Badge>
                  )}
                </HStack>
                <Text fontSize="xs" color={subtleText}>
                  {tool.description}
                </Text>
              </Box>
            ))}
          </VStack>
        </VStack>
      </Card>

      {/* Environment Variables */}
      {mcpConfig.envVars && Object.keys(mcpConfig.envVars).length > 0 && (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box flex="1">
            <AlertDescription fontSize="sm">
              <Text fontWeight="600" mb={2}>Required Environment Variables:</Text>
              <VStack align="stretch" spacing={1}>
                {Object.entries(mcpConfig.envVars).map(([key, value]) => (
                  <HStack key={key} spacing={2}>
                    <Code fontSize="xs">{key}</Code>
                    <Text fontSize="xs" color={subtleText}>- {value}</Text>
                  </HStack>
                ))}
              </VStack>
            </AlertDescription>
          </Box>
        </Alert>
      )}

      {/* Cost Estimate */}
      <Card bg={bgAccent} shadow="none" border="1px" borderColor="blue.200" p={4}>
        <VStack align="stretch" spacing={2}>
          <Text fontSize="sm" fontWeight="600" color="blue.600">
            💡 Cost Estimate
          </Text>
          <Text fontSize="xs" color={subtleText}>
            With {mcpConfig.creditsPerMonth.toLocaleString()} free credits per month, you can make approximately{' '}
            <Text as="span" fontWeight="600">{mcpConfig.creditsPerMonth.toLocaleString()}</Text> API calls per month at no cost.
          </Text>
          {mcpConfig.costPerCall > 0 && (
            <Text fontSize="xs" color={subtleText}>
              After that, each additional call costs ${mcpConfig.costPerCall.toFixed(4)}.
            </Text>
          )}
        </VStack>
      </Card>

      {/* Actions */}
      <HStack justify="space-between" pt={4}>
        <Button onClick={onBack} variant="ghost">
          Back
        </Button>
        <Button onClick={handleNext} colorScheme="blue">
          Next: API Configuration →
        </Button>
      </HStack>
    </VStack>
  );
};

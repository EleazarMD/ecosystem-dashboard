/**
 * Modern Tools Configuration Tab
 * 
 * MCP extensions and tool management
 */

import React from 'react';
import {
  VStack,
  HStack,
  Text,
  Switch,
  Box,
  Badge,
  Icon,
  Card,
  CardBody,
  SimpleGrid,
} from '@chakra-ui/react';
import { FiTool, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ToolsConfigTabProps {
  agentId: string;
  config: any;
  onChange: (updates: any) => void;
}

const availableTools = [
  { id: 'developer', name: 'Developer', category: 'Development', description: 'Code editing and analysis tools' },
  { id: 'memory', name: 'Memory', category: 'Productivity', description: 'Context persistence and recall' },
  { id: 'computercontroller', name: 'Computer Controller', category: 'System', description: 'Filesystem and system operations' },
  { id: 'perplexity', name: 'Perplexity', category: 'Productivity', description: 'Web search and research tools' },
  { id: 'workspace', name: 'Workspace MCP', category: 'Productivity', description: 'Notion-like workspace operations' },
  { id: 'screen', name: 'Screen Tools', category: 'System', description: 'Screen capture and visual analysis' },
  { id: 'notion', name: 'Notion', category: 'Productivity', description: 'Notion integration' },
];

export default function ToolsConfigTab({ agentId, config, onChange }: ToolsConfigTabProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  const enabledTools = config.enabledTools || [];

  const toggleTool = (toolId: string) => {
    const newTools = enabledTools.includes(toolId)
      ? enabledTools.filter((t: string) => t !== toolId)
      : [...enabledTools, toolId];
    onChange({ enabledTools: newTools });
  };

  const categories = Array.from(new Set(availableTools.map(t => t.category)));

  return (
    <VStack spacing={6} align="stretch">
      
      <HStack justify="space-between">
        <Text fontSize="sm" fontWeight="600" color={textColor}>
          MCP Tools & Extensions
        </Text>
        <Badge colorScheme="green" fontSize="xs">
          {enabledTools.length} Enabled
        </Badge>
      </HStack>

      {categories.map(category => (
        <Box key={category}>
          <Text fontSize="xs" fontWeight="600" color={mutedColor} mb={3} textTransform="uppercase">
            {category}
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {availableTools
              .filter(tool => tool.category === category)
              .map(tool => {
                const isEnabled = enabledTools.includes(tool.id);
                return (
                  <Card
                    key={tool.id}
                    variant="outline"
                    bg={isEnabled ? 'green.50' : cardBg}
                    borderColor={isEnabled ? 'green.500' : borderColor}
                    borderWidth="2px"
                  >
                    <CardBody p={4}>
                      <HStack justify="space-between" align="start">
                        <VStack align="start" spacing={1} flex={1}>
                          <HStack>
                            <Text fontSize="sm" fontWeight="600" color={textColor}>
                              {tool.name}
                            </Text>
                            {isEnabled && (
                              <Icon as={FiCheck} boxSize={3} color="green.600" />
                            )}
                          </HStack>
                          <Text fontSize="xs" color={mutedColor}>
                            {tool.description}
                          </Text>
                        </VStack>
                        <Switch
                          isChecked={isEnabled}
                          onChange={() => toggleTool(tool.id)}
                          colorScheme="green"
                        />
                      </HStack>
                    </CardBody>
                  </Card>
                );
              })}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  );
}

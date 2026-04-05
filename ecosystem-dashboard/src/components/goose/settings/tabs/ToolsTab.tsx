/**
 * Tools Tab Component
 * 
 * Manage MCP tools/extensions for the agent
 */

import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Text, Switch, FormControl,
  Badge, Icon, Spinner, Button,
  Alert, AlertIcon, AlertDescription, Divider,
  Accordion, AccordionItem, AccordionButton, AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { FiTool, FiCheck, FiX, FiSettings, FiPlus } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface ToolsTabProps {
  agentId: string;
  value: {
    enabledTools: string[];
    toolConfigs: Record<string, any>;
  };
  onChange: (value: any) => void;
}

interface AvailableTool {
  id: string;
  name: string;
  description: string;
  category: string;
  type?: string; // 'mcp' or 'claude_code'
  icon?: string;
  enabled?: boolean;
  mcpServer?: string;
  configSchema?: any;
  defaultConfig?: any;
  isEnabled?: boolean;
  requiresSetup?: boolean;
  children?: AvailableTool[]; // For grouped tools like Claude
}

export default function ToolsTab({ agentId, value, onChange }: ToolsTabProps) {
  const [tools, setTools] = useState<AvailableTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const mutedColor = useSemanticToken('text.secondary');
  const accentColor = 'blue.500';
  const cardBg = useSemanticToken('surface.base');
  const enabledBlueBg = 'blue.50';
  const enabledBlueBorder = 'blue.300';
  const enabledGreenBg = 'green.50';
  const enabledGreenBorder = 'green.200';

  // Load available tools
  useEffect(() => {
    loadTools();
  }, [agentId]); // Reload when agent changes

  const loadTools = async () => {
    try {
      setLoading(true);
      // Use new endpoint with agentId
      const response = await fetch(`/api/agents/${agentId}/tools/available`);
      
      if (!response.ok) {
        throw new Error('Failed to load tools');
      }
      
      const data = await response.json();
      setTools(data.tools || []);
      setError(null);
    } catch (err) {
      console.error('Error loading tools:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const isToolEnabled = (toolId: string): boolean => {
    return value.enabledTools.includes(toolId);
  };

  const toggleTool = (toolId: string) => {
    const enabled = isToolEnabled(toolId);
    const newEnabledTools = enabled
      ? value.enabledTools.filter(id => id !== toolId)
      : [...value.enabledTools, toolId];
    
    onChange({
      ...value,
      enabledTools: newEnabledTools,
    });
  };

  const getCategoryColor = (category: string): string => {
    switch (category.toUpperCase()) {
      case 'DEVELOPMENT':
        return 'blue';
      case 'SYSTEM':
        return 'purple';
      case 'PRODUCTIVITY':
        return 'green';
      case 'AI_ASSISTANCE':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Box p={6} textAlign="center">
        <Spinner size="lg" color={accentColor} />
        <Text mt={4} color={mutedColor}>Loading available tools...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  const groupedTools = tools.reduce((acc, tool) => {
    const category = tool.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, AvailableTool[]>);

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Header */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack>
            <Icon as={FiTool} boxSize={5} color={accentColor} />
            <Text fontSize="lg" fontWeight="semibold">
              MCP Tools & Extensions
            </Text>
          </HStack>
          <Badge colorScheme="blue">
            {value.enabledTools.length} enabled
          </Badge>
        </HStack>
        <Text fontSize="sm" color={mutedColor}>
          Enable tools to extend agent capabilities
        </Text>
      </Box>

      <Divider />

      {/* Tools by Category */}
      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <Box key={category}>
          <Text
            fontSize="sm"
            fontWeight="semibold"
            textTransform="capitalize"
            color={mutedColor}
            mb={3}
          >
            {category}
          </Text>
          
          <VStack spacing={3} align="stretch">
            {categoryTools.map(tool => {
              const enabled = isToolEnabled(tool.id);
              
              // Special rendering for Claude Code tools (grouped with children)
              if (tool.type === 'claude_code' && tool.children) {
                return (
                  <Box
                    key={tool.id}
                    p={4}
                    bg={enabled ? enabledBlueBg : cardBg}
                    borderRadius="md"
                    borderWidth="2px"
                    borderColor={enabled ? enabledBlueBorder : borderColor}
                    transition="all 0.2s"
                  >
                    <HStack justify="space-between" align="start">
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          {tool.icon && <Text fontSize="xl">{tool.icon}</Text>}
                          <Text fontWeight="semibold">{tool.name}</Text>
                          <Badge colorScheme="purple" fontSize="xs">
                            AI Assistant
                          </Badge>
                        </HStack>
                        
                        <Text fontSize="sm" color={mutedColor}>
                          {tool.description}
                        </Text>
                      </VStack>
                      
                      <FormControl display="flex" alignItems="center" width="auto">
                        <Switch
                          isChecked={enabled}
                          onChange={() => toggleTool(tool.id)}
                          colorScheme="blue"
                          size="lg"
                        />
                      </FormControl>
                    </HStack>
                    
                    {/* Individual Claude Tools */}
                    {enabled && tool.children && (
                      <Box mt={4} pt={4} borderTopWidth="1px" borderColor={borderColor}>
                        <Accordion allowToggle>
                          <AccordionItem border="none">
                            <AccordionButton px={0}>
                              <HStack flex={1}>
                                <Icon as={FiSettings} boxSize={4} />
                                <Text fontSize="sm" fontWeight="medium">
                                  Configure Individual Tools
                                </Text>
                              </HStack>
                              <AccordionIcon />
                            </AccordionButton>
                            <AccordionPanel px={0} py={3}>
                              <VStack spacing={2} align="stretch">
                                {tool.children.map(child => (
                                  <HStack key={child.id} justify="space-between" p={2} bg={cardBg} borderRadius="md">
                                    <VStack align="start" spacing={0} flex={1}>
                                      <Text fontSize="sm" fontWeight="medium">{child.name}</Text>
                                      <Text fontSize="xs" color={mutedColor}>{child.description}</Text>
                                    </VStack>
                                    <Switch
                                      size="sm"
                                      isChecked={child.enabled}
                                      colorScheme="blue"
                                    />
                                  </HStack>
                                ))}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  leftIcon={<Icon as={FiSettings} />}
                                  mt={2}
                                >
                                  Advanced Settings
                                </Button>
                              </VStack>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>
                      </Box>
                    )}
                  </Box>
                );
              }
              
              // Regular MCP tool rendering
              return (
                <Box
                  key={tool.id}
                  p={4}
                  bg={enabled ? enabledGreenBg : cardBg}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={enabled ? enabledGreenBorder : borderColor}
                  transition="all 0.2s"
                >
                  <HStack justify="space-between" align="start">
                    <VStack align="start" spacing={1} flex={1}>
                      <HStack>
                        {tool.icon && <Text fontSize="lg">{tool.icon}</Text>}
                        <Text fontWeight="semibold">{tool.name}</Text>
                        <Badge
                          colorScheme={getCategoryColor(tool.category)}
                          fontSize="xs"
                        >
                          {tool.category}
                        </Badge>
                        {tool.requiresSetup && (
                          <Badge colorScheme="orange" fontSize="xs">
                            Setup Required
                          </Badge>
                        )}
                      </HStack>
                      
                      <Text fontSize="sm" color={mutedColor}>
                        {tool.description}
                      </Text>
                      
                      {tool.mcpServer && (
                        <Text fontSize="xs" color={mutedColor}>
                          MCP Server: <code>{tool.mcpServer}</code>
                        </Text>
                      )}
                    </VStack>
                    
                    <FormControl display="flex" alignItems="center" width="auto">
                      <Switch
                        isChecked={enabled}
                        onChange={() => toggleTool(tool.id)}
                        colorScheme="blue"
                        size="lg"
                        isDisabled={tool.isEnabled === false}
                      />
                    </FormControl>
                  </HStack>
                  
                  {/* Tool Configuration (if enabled) */}
                  {enabled && tool.configSchema && (
                    <Box mt={3} pt={3} borderTopWidth="1px" borderColor={borderColor}>
                      <Accordion allowToggle size="sm">
                        <AccordionItem border="none">
                          <AccordionButton px={0}>
                            <HStack flex={1}>
                              <Icon as={FiSettings} boxSize={4} />
                              <Text fontSize="sm">Configuration</Text>
                            </HStack>
                            <AccordionIcon />
                          </AccordionButton>
                          <AccordionPanel px={0} py={2}>
                            <Text fontSize="xs" color={mutedColor}>
                              Tool-specific configuration options will appear here.
                            </Text>
                            {/* TODO: Render dynamic form based on configSchema */}
                          </AccordionPanel>
                        </AccordionItem>
                      </Accordion>
                    </Box>
                  )}
                </Box>
              );
            })}
          </VStack>
        </Box>
      ))}

      {/* Add Custom Extension */}
      <Box
        p={4}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={borderColor}
        borderRadius="md"
        textAlign="center"
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: accentColor,
          bg: cardBg,
        }}
      >
        <VStack spacing={2}>
          <Icon as={FiPlus} boxSize={6} color={mutedColor} />
          <Text fontSize="sm" color={mutedColor}>
            Add Custom Extension
          </Text>
          <Text fontSize="xs" color={mutedColor}>
            Coming soon: Install custom MCP servers
          </Text>
        </VStack>
      </Box>

      {/* Info Box */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box fontSize="sm">
          <Text fontWeight="semibold" mb={1}>About MCP Tools</Text>
          <Text fontSize="xs" color={mutedColor}>
            MCP (Model Context Protocol) tools extend agent capabilities with specialized 
            functions like code editing, filesystem operations, and memory management. 
            Each tool runs in its own MCP server for security and isolation.
          </Text>
        </Box>
      </Alert>
    </VStack>
  );
}

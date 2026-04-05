/**
 * Goose Tool Settings - Reusable component for tool-specific configuration
 * 
 * Manages individual tool settings like:
 * - Tool timeouts
 * - Environment variables
 * - Command line arguments
 * - Tool-specific configurations
 * 
 * Can be used across all agent contexts with different tool sets
 */

import React from 'react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import {
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Input,
  Button,
  IconButton,
  Icon,
  Badge,
  Tooltip,
  Box,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Code,
} from '@chakra-ui/react';
import {
  FiTool, 
  FiClock, 
  FiSettings,
  FiPlus,
  FiTrash2,
  FiInfo
} from 'react-icons/fi';

export interface ToolConfiguration {
  name: string;
  displayName: string;
  enabled: boolean;
  timeout?: number;
  env?: Record<string, string>;
  args?: string[];
  type: 'builtin' | 'stdio' | 'platform';
  description?: string;
}

export interface GooseToolSettingsProps {
  tools: ToolConfiguration[];
  onToolUpdate: (toolName: string, updates: Partial<ToolConfiguration>) => void;
  showAdvancedSettings?: boolean;
  collapsible?: boolean;
}

export const GooseToolSettings: React.FC<GooseToolSettingsProps> = ({
  tools,
  onToolUpdate,
  showAdvancedSettings = false,
  collapsible = true,
}) => {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.default');
  const hoverBg = useSemanticToken('surface.hover');
  const cardBg = useSemanticToken('surface.elevated');

  const addEnvVar = (toolName: string) => {
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const newEnv = { ...tool.env, '': '' };
      onToolUpdate(toolName, { env: newEnv });
    }
  };

  const updateEnvVar = (toolName: string, oldKey: string, newKey: string, value: string) => {
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const newEnv = { ...tool.env };
      if (oldKey !== newKey && oldKey in newEnv) {
        delete newEnv[oldKey];
      }
      newEnv[newKey] = value;
      onToolUpdate(toolName, { env: newEnv });
    }
  };

  const removeEnvVar = (toolName: string, key: string) => {
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const newEnv = { ...tool.env };
      delete newEnv[key];
      onToolUpdate(toolName, { env: newEnv });
    }
  };

  const addArg = (toolName: string) => {
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const newArgs = [...(tool.args || []), ''];
      onToolUpdate(toolName, { args: newArgs });
    }
  };

  const updateArg = (toolName: string, index: number, value: string) => {
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const newArgs = [...(tool.args || [])];
      newArgs[index] = value;
      onToolUpdate(toolName, { args: newArgs });
    }
  };

  const removeArg = (toolName: string, index: number) => {
    const tool = tools.find(t => t.name === toolName);
    if (tool) {
      const newArgs = [...(tool.args || [])];
      newArgs.splice(index, 1);
      onToolUpdate(toolName, { args: newArgs });
    }
  };

  const getToolTypeColor = (type: string) => {
    switch (type) {
      case 'builtin': return 'green';
      case 'stdio': return 'blue';
      case 'platform': return 'purple';
      default: return 'gray';
    }
  };

  if (collapsible) {
    return (
      <Accordion allowMultiple>
        {tools.filter(tool => tool.enabled).map((tool) => (
          <AccordionItem key={tool.name} border="1px" borderColor={borderColor} borderRadius="md" mb={2}>
            <AccordionButton bg={cardBg} _hover={{ bg: hoverBg }}>
              <Box flex="1" textAlign="left">
                <HStack>
                  <Icon as={FiTool} boxSize={4} color={`${getToolTypeColor(tool.type)}.500`} />
                  <Text fontSize="sm" fontWeight="600" color={textColor}>
                    {tool.displayName}
                  </Text>
                  <Badge size="sm" colorScheme={getToolTypeColor(tool.type)} variant="subtle">
                    {tool.type}
                  </Badge>
                  {tool.timeout && tool.timeout !== 300 && (
                    <Badge size="sm" colorScheme="orange" variant="subtle">
                      {tool.timeout}s
                    </Badge>
                  )}
                </HStack>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4} bg={cardBg}>
              <ToolConfigurationPanel 
                tool={tool} 
                onUpdate={(updates) => onToolUpdate(tool.name, updates)}
                showAdvancedSettings={showAdvancedSettings}
                addEnvVar={() => addEnvVar(tool.name)}
                updateEnvVar={(oldKey, newKey, value) => updateEnvVar(tool.name, oldKey, newKey, value)}
                removeEnvVar={(key) => removeEnvVar(tool.name, key)}
                addArg={() => addArg(tool.name)}
                updateArg={(index, value) => updateArg(tool.name, index, value)}
                removeArg={(index) => removeArg(tool.name, index)}
                textColor={textColor}
                mutedColor={mutedColor}
              />
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {tools.filter(tool => tool.enabled).map((tool) => (
        <Box key={tool.name} p={4} border="1px" borderColor={borderColor} borderRadius="md" bg={cardBg}>
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <HStack>
                <Icon as={FiTool} boxSize={4} color={`${getToolTypeColor(tool.type)}.500`} />
                <Text fontSize="sm" fontWeight="600" color={textColor}>
                  {tool.displayName}
                </Text>
                <Badge size="sm" colorScheme={getToolTypeColor(tool.type)} variant="subtle">
                  {tool.type}
                </Badge>
              </HStack>
              {tool.description && (
                <Tooltip label={tool.description}>
                  <Icon as={FiInfo} boxSize={3} color={mutedColor} />
                </Tooltip>
              )}
            </HStack>
            
            <ToolConfigurationPanel 
              tool={tool} 
              onUpdate={(updates) => onToolUpdate(tool.name, updates)}
              showAdvancedSettings={showAdvancedSettings}
              addEnvVar={() => addEnvVar(tool.name)}
              updateEnvVar={(oldKey, newKey, value) => updateEnvVar(tool.name, oldKey, newKey, value)}
              removeEnvVar={(key) => removeEnvVar(tool.name, key)}
              addArg={() => addArg(tool.name)}
              updateArg={(index, value) => updateArg(tool.name, index, value)}
              removeArg={(index) => removeArg(tool.name, index)}
              textColor={textColor}
              mutedColor={mutedColor}
            />
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};

interface ToolConfigurationPanelProps {
  tool: ToolConfiguration;
  onUpdate: (updates: Partial<ToolConfiguration>) => void;
  showAdvancedSettings: boolean;
  addEnvVar: () => void;
  updateEnvVar: (oldKey: string, newKey: string, value: string) => void;
  removeEnvVar: (key: string) => void;
  addArg: () => void;
  updateArg: (index: number, value: string) => void;
  removeArg: (index: number) => void;
  textColor: string;
  mutedColor: string;
}

const ToolConfigurationPanel: React.FC<ToolConfigurationPanelProps> = ({
  tool,
  onUpdate,
  showAdvancedSettings,
  addEnvVar,
  updateEnvVar,
  removeEnvVar,
  addArg,
  updateArg,
  removeArg,
  textColor,
  mutedColor,
}) => {
  return (
    <VStack spacing={3} align="stretch">
      
      {/* Timeout Setting */}
      <FormControl>
        <FormLabel fontSize="xs" color={mutedColor} mb={1}>
          <HStack>
            <Icon as={FiClock} boxSize={3} />
            <Text>Timeout (seconds)</Text>
          </HStack>
        </FormLabel>
        <NumberInput 
          value={tool.timeout || 300} 
          onChange={(_, val) => onUpdate({ timeout: val || 300 })}
          min={10} 
          max={3600}
          size="sm"
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      {showAdvancedSettings && tool.type === 'stdio' && (
        <>
          {/* Environment Variables */}
          <FormControl>
            <HStack justify="space-between" mb={2}>
              <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                Environment Variables
              </FormLabel>
              <Button size="xs" leftIcon={<FiPlus />} onClick={addEnvVar}>
                Add
              </Button>
            </HStack>
            <VStack spacing={2} align="stretch">
              {Object.entries(tool.env || {}).map(([key, value]) => (
                <HStack key={key} spacing={2}>
                  <Input
                    placeholder="KEY"
                    value={key}
                    onChange={(e) => updateEnvVar(key, e.target.value, value)}
                    size="sm"
                    flex={1}
                  />
                  <Text fontSize="xs" color={mutedColor}>=</Text>
                  <Input
                    placeholder="value"
                    value={value}
                    onChange={(e) => updateEnvVar(key, key, e.target.value)}
                    size="sm"
                    flex={2}
                  />
                  <IconButton
                    aria-label="Remove"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => removeEnvVar(key)}
                  />
                </HStack>
              ))}
              {(!tool.env || Object.keys(tool.env).length === 0) && (
                <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                  No environment variables configured
                </Text>
              )}
            </VStack>
          </FormControl>

          {/* Command Arguments */}
          <FormControl>
            <HStack justify="space-between" mb={2}>
              <FormLabel fontSize="xs" color={mutedColor} mb={0}>
                Command Arguments
              </FormLabel>
              <Button size="xs" leftIcon={<FiPlus />} onClick={addArg}>
                Add
              </Button>
            </HStack>
            <VStack spacing={2} align="stretch">
              {(tool.args || []).map((arg, index) => (
                <HStack key={index} spacing={2}>
                  <Code fontSize="xs" color={mutedColor}>
                    [{index}]
                  </Code>
                  <Input
                    placeholder="argument"
                    value={arg}
                    onChange={(e) => updateArg(index, e.target.value)}
                    size="sm"
                    flex={1}
                  />
                  <IconButton
                    aria-label="Remove"
                    icon={<FiTrash2 />}
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => removeArg(index)}
                  />
                </HStack>
              ))}
              {(!tool.args || tool.args.length === 0) && (
                <Text fontSize="xs" color={mutedColor} fontStyle="italic">
                  No command arguments configured
                </Text>
              )}
            </VStack>
          </FormControl>
        </>
      )}

    </VStack>
  );
};

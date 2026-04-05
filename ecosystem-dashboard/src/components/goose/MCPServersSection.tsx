/**
 * MCP Servers Section - Reusable component for managing MCP extensions
 * Used in both Workspace AI Settings and Page Agent Settings
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Switch,
  FormLabel,
  Badge,
  Icon,
  Collapse,
  Spinner,
} from '@chakra-ui/react';
import { FiServer, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

export interface MCPServersConfig {
  workspace: boolean;
  filesystem: boolean;
  knowledgeGraph: boolean;
  notion: boolean;
  github: boolean;
  custom?: string[];
}

interface MCPServersSectionProps {
  mcpServers: MCPServersConfig;
  onMCPServersChange: (servers: MCPServersConfig) => void;
  agentId?: string;  // For required MCPs per agent
  compact?: boolean;  // Compact mode for smaller panels
  initialExpanded?: boolean;
  isLoading?: boolean;  // Show loading spinner
  hideHeader?: boolean;  // Hide the header when nested in another card
}

export const MCPServersSection: React.FC<MCPServersSectionProps> = ({
  mcpServers,
  onMCPServersChange,
  agentId = 'workspace-ai',
  compact = false,
  initialExpanded = false,
  isLoading = false,
  hideHeader = false,
}) => {
  const [mcpExpanded, setMcpExpanded] = useState(initialExpanded);
  
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  // Define required MCPs per agent (cannot be toggled off)
  const requiredMCPs: Record<string, string[]> = {
    'page-agent': ['workspace'],
    'workspace-ai': ['workspace'],
  };

  const isRequired = (mcpId: string) => {
    return requiredMCPs[agentId]?.includes(mcpId) || false;
  };

  const mcpDefinitions = [
    {
      id: 'workspace',
      label: 'Workspace MCP',
      badge: 'LOCAL',
      badgeColor: 'green',
      description: 'Edit pages, blocks, and tables',
      key: 'workspace' as keyof MCPServersConfig,
    },
    {
      id: 'filesystem',
      label: 'Filesystem MCP',
      badge: 'LOCAL',
      badgeColor: 'orange',
      description: 'Read and write files, directory operations',
      key: 'filesystem' as keyof MCPServersConfig,
    },
    {
      id: 'knowledgeGraph',
      label: 'Knowledge Graph MCP',
      badge: 'LOCAL',
      badgeColor: 'purple',
      description: 'Query entities and relationships',
      key: 'knowledgeGraph' as keyof MCPServersConfig,
    },
    {
      id: 'notion',
      label: 'Notion MCP',
      badge: 'EXTERNAL',
      badgeColor: 'gray',
      description: 'Sync with Notion workspace',
      key: 'notion' as keyof MCPServersConfig,
    },
    {
      id: 'github',
      label: 'GitHub MCP',
      badge: 'EXTERNAL',
      badgeColor: 'gray',
      description: 'Repository operations and PRs',
      key: 'github' as keyof MCPServersConfig,
    },
  ];

  const handleToggle = (key: keyof MCPServersConfig, value: boolean) => {
    // Prevent disabling required MCPs
    if (isRequired(key as string) && !value) {
      return;
    }
    
    onMCPServersChange({
      ...mcpServers,
      [key]: value,
    });
  };

  return (
    <Box>
      {/* Collapsible Header - Hidden when nested */}
      {!hideHeader && (
        <HStack
          justify="space-between"
          mb={2}
          cursor="pointer"
          onClick={() => setMcpExpanded(!mcpExpanded)}
          _hover={{ opacity: 0.8 }}
          transition="opacity 0.2s"
        >
          <FormLabel fontSize="sm" fontWeight="600" color={textColor} mb={0} cursor="pointer">
            <HStack>
              <Icon as={FiServer} boxSize={3} color="blue.500" />
              <Text>MCP Servers</Text>
              {isLoading ? (
                <Spinner size="xs" color="blue.500" />
              ) : (
                <Badge colorScheme="blue" fontSize="xs">
                  Context Protocol
                </Badge>
              )}
            </HStack>
          </FormLabel>
          <Icon
            as={mcpExpanded ? FiChevronDown : FiChevronRight}
            boxSize={4}
            color={mutedColor}
            transition="transform 0.2s"
          />
        </HStack>
      )}

      {/* Collapsible Content */}
      <Collapse in={hideHeader ? true : mcpExpanded} animateOpacity>
        <VStack spacing={compact ? 1.5 : 2} align="stretch" mt={hideHeader ? 0.5 : 2}>
          {mcpDefinitions.map((mcp) => {
            const required = isRequired(mcp.id);
            const value = mcpServers[mcp.key];
            const isChecked = typeof value === 'boolean' ? value : false;
            
            return (
              <HStack key={mcp.id} justify="space-between">
                <HStack spacing={2}>
                  <VStack align="start" spacing={0}>
                    <HStack>
                      <Text 
                        fontSize="sm" 
                        color={required ? 'blue.500' : textColor}
                        fontWeight={required ? '600' : 'normal'}
                      >
                        {mcp.label}
                      </Text>
                      <Badge colorScheme={mcp.badgeColor} fontSize="xs">
                        {mcp.badge}
                      </Badge>
                      {required && (
                        <Badge colorScheme="blue" fontSize="xs" variant="subtle">
                          Required
                        </Badge>
                      )}
                    </HStack>
                    {!compact && (
                      <Text fontSize="xs" color={mutedColor}>
                        {mcp.description}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <Switch
                  size="sm"
                  colorScheme="blue"
                  isChecked={isChecked}
                  isDisabled={required}
                  onChange={(e) => handleToggle(mcp.key, e.target.checked)}
                  title={required ? 'Required for this agent' : undefined}
                />
              </HStack>
            );
          })}
        </VStack>
        <Text fontSize="xs" color={mutedColor} mt={2}>
          Local: Free | External: API costs tracked
        </Text>
      </Collapse>
    </Box>
  );
};

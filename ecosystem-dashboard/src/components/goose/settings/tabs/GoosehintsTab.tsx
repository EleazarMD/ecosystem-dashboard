/**
 * Goosehints Tab Component
 * 
 * Edit .goosehints file content for agent behavior
 * Loads the actual file from the agent's working directory
 */

import React, { useState, useEffect } from 'react';
import {
  VStack, FormControl, FormLabel, Textarea, Text, Box,
  Icon, HStack, Alert, AlertIcon, Button,
  Badge, Spinner, useToast,
} from '@chakra-ui/react';
import { FiFileText, FiInfo, FiRefreshCw, FiSave, FiFolder } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface GoosehintsTabProps {
  value: string;
  onChange: (value: string) => void;
  agentId?: string; // Add agentId prop
}

export default function GoosehintsTab({ value, onChange, agentId = 'page-agent' }: GoosehintsTabProps) {
  const [fileContent, setFileContent] = useState(value);
  const [filePath, setFilePath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const toast = useToast();
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const codeBg = useSemanticToken('surface.base');
  const borderColor = useSemanticToken('border.default');
  const tipsBg = 'blue.50';
  
  // Load actual .goosehints file from agent's directory
  const loadFromFile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/goose/goosehints/${agentId}`);
      const data = await response.json();
      
      if (data.success) {
        setFileContent(data.content);
        setFilePath(data.path);
        onChange(data.content); // Update parent state
        setHasChanges(false);
        toast({
          title: 'Loaded from file',
          description: data.path,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to load .goosehints:', error);
      toast({
        title: 'Failed to load file',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Save to file
  const saveToFile = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/goose/goosehints/${agentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setHasChanges(false);
        toast({
          title: 'Saved to file',
          description: data.path,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Failed to save .goosehints:', error);
      toast({
        title: 'Failed to save file',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Load on mount
  useEffect(() => {
    loadFromFile();
  }, [agentId]);
  
  // Handle content change
  const handleChange = (newContent: string) => {
    setFileContent(newContent);
    onChange(newContent);
    setHasChanges(true);
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Header with Actions */}
      <HStack justify="space-between">
        <HStack>
          <Icon as={FiFileText} color="green.500" boxSize={5} />
          <Text fontSize="lg" fontWeight="semibold">
            .goosehints File Content
          </Text>
          {hasChanges && <Badge colorScheme="orange">Unsaved</Badge>}
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            leftIcon={<FiRefreshCw />}
            onClick={loadFromFile}
            isLoading={loading}
            variant="outline"
          >
            Reload
          </Button>
          <Button
            size="sm"
            leftIcon={<FiSave />}
            onClick={saveToFile}
            isLoading={saving}
            colorScheme="green"
            isDisabled={!hasChanges}
          >
            Save to File
          </Button>
        </HStack>
      </HStack>

      {/* File Path Display */}
      {filePath && (
        <Alert status="info" borderRadius="md" variant="left-accent">
          <Icon as={FiFolder} mr={2} />
          <Box fontSize="xs">
            <Text fontWeight="semibold">Editing:</Text>
            <Text color={mutedColor} fontFamily="mono">{filePath}</Text>
          </Box>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Box fontSize="sm">
          <Text fontWeight="semibold" mb={1}>About .goosehints</Text>
          <Text fontSize="xs" color={mutedColor}>
            This file is loaded by Goose ACP from the agent's working directory. 
            Changes take effect on the next Goose session restart.
          </Text>
        </Box>
      </Alert>

      {/* Editor */}
      <FormControl>
        <FormLabel display="flex" alignItems="center" gap={2}>
          <Text>Content</Text>
          <Text fontSize="xs" color={mutedColor} fontWeight="normal">
            (Markdown format)
          </Text>
        </FormLabel>
        <Textarea
          value={fileContent}
          onChange={(e) => handleChange(e.target.value)}
          rows={20}
          fontFamily="mono"
          fontSize="sm"
          bg={codeBg}
          borderColor={borderColor}
          placeholder="# Agent Name

You are an AI assistant...

## Core Identity
- Name: ...
- Role: ...

## Standards
@AIHDS_SERVICE_DISCOVERY_STANDARD.md"
        />
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Changes take effect immediately after saving
        </Text>
      </FormControl>

      {/* Tips Box */}
      <Box
        p={4}
        bg={tipsBg}
        borderRadius="md"
        borderWidth="1px"
        borderColor="blue.200"
      >
        <HStack mb={3}>
          <Icon as={FiInfo} color="blue.500" />
          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
            💡 .goosehints Tips
          </Text>
        </HStack>
        <VStack align="start" spacing={2} fontSize="xs" color={mutedColor}>
          <Text>
            <strong>@filename.md</strong> - Auto-include files from workspace
          </Text>
          <Text>
            <strong>Define personality</strong> - Describe how the agent should behave
          </Text>
          <Text>
            <strong>Set standards</strong> - Reference coding standards, documentation
          </Text>
          <Text>
            <strong>Add context</strong> - Include project-specific information
          </Text>
          <Text>
            <strong>Use Markdown</strong> - Format with headers, lists, code blocks
          </Text>
        </VStack>
      </Box>

      {/* Example Template */}
      <Box
        p={4}
        bg={codeBg}
        borderRadius="md"
        borderWidth="1px"
        borderColor={borderColor}
      >
        <Text fontSize="sm" fontWeight="semibold" mb={2}>
          📄 Example Template
        </Text>
        <Box
          as="pre"
          fontSize="xs"
          fontFamily="mono"
          color={mutedColor}
          whiteSpace="pre-wrap"
          overflowX="auto"
        >
{`# Agent Name

You are "Agent Name," a specialized AI assistant.

## Core Identity
- Name: Agent Name
- Role: Your primary function
- Personality: Professional, helpful

## Expertise
- Domain 1
- Domain 2
- Domain 3

## Standards
@AIHDS_SERVICE_DISCOVERY_STANDARD.md
@PROJECT_CONVENTIONS.md

## Behavior Guidelines
1. Always verify before making changes
2. Explain your reasoning
3. Ask clarifying questions`}
        </Box>
      </Box>

      {/* Character Count */}
      <HStack justify="space-between" fontSize="xs" color={mutedColor}>
        <Text>Character count: {fileContent.length}</Text>
        <Text>Lines: {fileContent.split('\n').length}</Text>
      </HStack>
    </VStack>
  );
}

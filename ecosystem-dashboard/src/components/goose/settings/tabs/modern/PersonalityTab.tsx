/**
 * Modern Personality Tab
 * 
 * Unified personality configuration:
 * - Quick presets (Role, Tone, Verbosity)
 * - Goosehints editor (full control)
 */

import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  Select,
  FormControl,
  FormLabel,
  Textarea,
  Box,
  Badge,
  Icon,
  Divider,
  Card,
  CardBody,
  Button,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { FiUser, FiFileText, FiInfo } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface PersonalityTabProps {
  config: any;
  onChange: (updates: any) => void;
}

export default function PersonalityTab({ config, onChange }: PersonalityTabProps) {
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const cardBg = 'blue.50';
  const borderColor = useSemanticToken('border.default');

  const roles = [
    'Workspace Manager',
    'Code Reviewer',
    'Documentation Writer',
    'Debug Assistant',
    'System Administrator',
  ];

  const tones = [
    'Professional',
    'Friendly',
    'Technical',
    'Concise',
    'Detailed',
  ];

  return (
    <VStack spacing={6} align="stretch">
      
      {/* Info Card */}
      <Card bg={cardBg} variant="filled">
        <CardBody>
          <HStack spacing={2}>
            <Icon as={FiInfo} boxSize={4} color="blue.600" />
            <Text fontSize="sm" color={textColor} fontWeight="500">
              Define your agent's personality and behavior. Quick presets update the goosehints automatically.
            </Text>
          </HStack>
        </CardBody>
      </Card>

      {/* Quick Presets */}
      <Box>
        <Text fontSize="sm" fontWeight="600" color={textColor} mb={3}>
          Quick Presets
        </Text>
        <VStack spacing={3} align="stretch">
          <FormControl>
            <FormLabel fontSize="xs" color={mutedColor}>
              Role
            </FormLabel>
            <Select
              value={config.identity?.role || ''}
              onChange={(e) => onChange({
                identity: { ...config.identity, role: e.target.value }
              })}
              size="sm"
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel fontSize="xs" color={mutedColor}>
              Tone
            </FormLabel>
            <Select
              value={config.style?.tone || ''}
              onChange={(e) => onChange({
                style: { ...config.style, tone: e.target.value }
              })}
              size="sm"
            >
              {tones.map(tone => (
                <option key={tone} value={tone}>{tone}</option>
              ))}
            </Select>
          </FormControl>
        </VStack>
      </Box>

      <Divider />

      {/* Goosehints Editor */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <HStack spacing={2}>
            <Icon as={FiFileText} boxSize={4} color="green.500" />
            <Text fontSize="sm" fontWeight="600" color={textColor}>
              .goosehints File Content
            </Text>
          </HStack>
          <Badge colorScheme="green" fontSize="xs">
            Markdown Format
          </Badge>
        </HStack>
        
        <Textarea
          value={config.goosehints || ''}
          onChange={(e) => onChange({ goosehints: e.target.value })}
          placeholder="# Agent Personality&#10;&#10;Define your agent's behavior, expertise, and communication style..."
          minH="400px"
          fontFamily="mono"
          fontSize="sm"
          resize="vertical"
        />
        
        <Text fontSize="xs" color={mutedColor} mt={2}>
          💡 Tip: Use markdown formatting. Changes take effect on next Goose session restart.
        </Text>
      </Box>
    </VStack>
  );
}

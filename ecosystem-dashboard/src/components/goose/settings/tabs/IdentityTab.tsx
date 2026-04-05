/**
 * Identity Tab Component
 * 
 * Configure agent identity (name, role, personality, expertise)
 */

import React, { useState } from 'react';
import {
  VStack, HStack, FormControl, FormLabel, Input, Textarea,
  Text, Icon, IconButton, Wrap, WrapItem, Tag, TagLabel,
  TagCloseButton,
} from '@chakra-ui/react';
import { FiUser, FiCheck } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface IdentityTabProps {
  value: {
    name: string;
    role: string;
    personality: string;
    expertiseDomains: string[];
  };
  onChange: (value: any) => void;
}

export default function IdentityTab({ value, onChange }: IdentityTabProps) {
  const [newExpertise, setNewExpertise] = useState('');

  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const addExpertise = () => {
    if (newExpertise.trim()) {
      onChange({
        ...value,
        expertiseDomains: [...value.expertiseDomains, newExpertise.trim()],
      });
      setNewExpertise('');
    }
  };

  const removeExpertise = (domain: string) => {
    onChange({
      ...value,
      expertiseDomains: value.expertiseDomains.filter(d => d !== domain),
    });
  };

  return (
    <VStack spacing={6} align="stretch" p={6}>
      {/* Agent Name */}
      <FormControl>
        <FormLabel display="flex" alignItems="center" gap={2}>
          <Icon as={FiUser} color="purple.500" />
          <Text>Agent Name</Text>
        </FormLabel>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Homelab Assistant"
          size="lg"
        />
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Name shown to users
        </Text>
      </FormControl>

      {/* Role / Function */}
      <FormControl>
        <FormLabel>Role / Function</FormLabel>
        <Input
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
          placeholder="AI Homelab Workspace & Infrastructure Manager"
          size="lg"
        />
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Primary function or responsibility
        </Text>
      </FormControl>

      {/* Personality */}
      <FormControl>
        <FormLabel>Personality</FormLabel>
        <Textarea
          value={value.personality}
          onChange={(e) => onChange({ ...value, personality: e.target.value })}
          placeholder="Professional, proactive, infrastructure-aware"
          rows={3}
        />
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Describe the agent's personality traits
        </Text>
      </FormControl>

      {/* Expertise Domains */}
      <FormControl>
        <FormLabel>Expertise Domains</FormLabel>
        <Wrap spacing={2} mb={2}>
          {value.expertiseDomains.map((domain, idx) => (
            <WrapItem key={idx}>
              <Tag size="md" colorScheme="blue" borderRadius="full">
                <TagLabel>{domain}</TagLabel>
                <TagCloseButton onClick={() => removeExpertise(domain)} />
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
        <HStack>
          <Input
            value={newExpertise}
            onChange={(e) => setNewExpertise(e.target.value)}
            placeholder="Add expertise domain"
            onKeyPress={(e) => e.key === 'Enter' && addExpertise()}
          />
          <IconButton
            aria-label="Add expertise"
            icon={<FiCheck />}
            colorScheme="blue"
            onClick={addExpertise}
            isDisabled={!newExpertise.trim()}
          />
        </HStack>
        <Text fontSize="xs" color={mutedColor} mt={1}>
          Areas of knowledge and specialization
        </Text>
      </FormControl>
    </VStack>
  );
}

/**
 * PersonaManager - AI Persona Selection and Configuration
 * Allows users to view and select different AI personas for text and voice modes
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, VStack, HStack, Text, Spinner, Badge,
  useToast, Button, Grid, GridItem,
  useColorModeValue, Progress, Tooltip,
  Icon, Divider, Flex, Avatar,
} from '@chakra-ui/react';
import { FiCheck, FiMic, FiMessageSquare, FiUser, FiSettings } from 'react-icons/fi';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const GOOSEMIND_API = 'https://rtx-workstation.tailb64e64.ts.net:8031';

interface PersonaMemoryConfig {
  recallStyle: string;
  maxContextMessages: number;
  continuityPhrase?: string;
}

interface Persona {
  persona_id: string;
  name: string;
  description?: string;
  avatar_emoji: string;
  personality_traits: Record<string, number>;
  voice_config: Record<string, any>;
  memory_config: PersonaMemoryConfig;
  hint_files: string[];
  optimized_for: string;
}

interface UserPreferences {
  user_id: string;
  active_persona_id: string;
  voice_persona_id: string;
  verbosity?: number;
  formality?: number;
  interests?: string[];
}

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  isVoiceMode: boolean;
  onSelect: () => void;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isSelected, isVoiceMode, onSelect }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const selectedBorderColor = useColorModeValue('blue.500', 'blue.400');
  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');

  const warmth = persona.personality_traits?.warmth ?? 0.5;
  const empathy = persona.personality_traits?.empathy ?? 0.5;
  const directness = persona.personality_traits?.directness ?? 0.5;

  return (
    <Box
      as="button"
      onClick={onSelect}
      w="100%"
      p={4}
      bg={cardBg}
      borderRadius="xl"
      border="2px solid"
      borderColor={isSelected ? selectedBorderColor : borderColor}
      transition="all 0.2s"
      _hover={{
        transform: 'translateY(-2px)',
        shadow: 'lg',
        borderColor: selectedBorderColor,
      }}
      position="relative"
    >
      {isSelected && (
        <Badge
          position="absolute"
          top={2}
          right={2}
          colorScheme="blue"
          variant="solid"
          borderRadius="full"
          px={2}
        >
          <HStack spacing={1}>
            <Icon as={FiCheck} boxSize={3} />
            <Text fontSize="xs">Active</Text>
          </HStack>
        </Badge>
      )}

      <VStack align="start" spacing={3}>
        <HStack spacing={3}>
          <Text fontSize="3xl">{persona.avatar_emoji}</Text>
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" color={textPrimary}>{persona.name}</Text>
            <HStack spacing={1}>
              <Badge
                size="sm"
                colorScheme={persona.optimized_for === 'voice' ? 'purple' : persona.optimized_for === 'text' ? 'green' : 'blue'}
                variant="subtle"
              >
                {persona.optimized_for === 'voice' ? (
                  <HStack spacing={1}><Icon as={FiMic} boxSize={3} /><Text>Voice</Text></HStack>
                ) : persona.optimized_for === 'text' ? (
                  <HStack spacing={1}><Icon as={FiMessageSquare} boxSize={3} /><Text>Text</Text></HStack>
                ) : (
                  <Text>Both</Text>
                )}
              </Badge>
              <Badge size="sm" variant="outline" colorScheme="gray">
                {persona.memory_config?.recallStyle || 'default'}
              </Badge>
            </HStack>
          </VStack>
        </HStack>

        {persona.description && (
          <Text fontSize="sm" color={textSecondary} textAlign="left">
            {persona.description}
          </Text>
        )}

        <VStack w="100%" spacing={2} pt={2}>
          <HStack w="100%" justify="space-between">
            <Text fontSize="xs" color={textSecondary}>Warmth</Text>
            <Progress value={warmth * 100} size="sm" colorScheme="orange" w="60%" borderRadius="full" />
          </HStack>
          <HStack w="100%" justify="space-between">
            <Text fontSize="xs" color={textSecondary}>Empathy</Text>
            <Progress value={empathy * 100} size="sm" colorScheme="pink" w="60%" borderRadius="full" />
          </HStack>
          <HStack w="100%" justify="space-between">
            <Text fontSize="xs" color={textSecondary}>Directness</Text>
            <Progress value={directness * 100} size="sm" colorScheme="blue" w="60%" borderRadius="full" />
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
};

export const PersonaManager: React.FC = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
  const toast = useToast();

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const tabBg = useColorModeValue('gray.100', 'gray.700');
  const activeTabBg = useColorModeValue('white', 'gray.600');

  const userId = 'eleazar'; // Homelab user - matches iOS app and dashboard

  const fetchPersonas = useCallback(async () => {
    try {
      const [personasRes, prefsRes] = await Promise.all([
        fetch(`${GOOSEMIND_API}/api/personas`),
        fetch(`${GOOSEMIND_API}/api/personas/user/${userId}/preferences`),
      ]);

      if (personasRes.ok) {
        const data = await personasRes.json();
        setPersonas(data.personas || []);
      }

      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setPreferences(prefsData);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
      toast({
        title: 'Connection Error',
        description: 'Could not connect to GooseMind service',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  const handleSelectPersona = async (persona: Persona) => {
    const isVoice = activeTab === 'voice';
    setSelecting(true);

    try {
      const response = await fetch(`${GOOSEMIND_API}/api/personas/user/${userId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona_id: persona.persona_id,
          is_voice: isVoice,
        }),
      });

      if (response.ok) {
        setPreferences(prev => prev ? {
          ...prev,
          [isVoice ? 'voice_persona_id' : 'active_persona_id']: persona.persona_id,
        } : null);

        toast({
          title: 'Persona Updated',
          description: `${persona.name} is now your ${isVoice ? 'voice' : 'text'} assistant`,
          status: 'success',
          duration: 2000,
        });
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Could not update persona selection',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSelecting(false);
    }
  };

  const filteredPersonas = personas.filter(p => {
    if (activeTab === 'voice') {
      return p.optimized_for === 'voice' || p.optimized_for === 'both';
    }
    return p.optimized_for === 'text' || p.optimized_for === 'both';
  });

  const currentPersonaId = activeTab === 'voice' 
    ? preferences?.voice_persona_id 
    : preferences?.active_persona_id;

  if (loading) {
    return (
      <Box p={8} textAlign="center">
        <Spinner size="lg" color="blue.500" />
        <Text mt={4} color={textSecondary}>Loading personas...</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <HStack justify="space-between">
        <VStack align="start" spacing={0}>
          <Text fontSize="xl" fontWeight="bold" color={textPrimary}>
            AI Personas
          </Text>
          <Text fontSize="sm" color={textSecondary}>
            Choose your assistant personality for text and voice interactions
          </Text>
        </VStack>
        <Icon as={FiSettings} boxSize={5} color={textSecondary} />
      </HStack>

      {/* Tab Selector */}
      <HStack
        bg={tabBg}
        p={1}
        borderRadius="lg"
        spacing={0}
      >
        <Button
          flex={1}
          size="sm"
          variant="ghost"
          bg={activeTab === 'text' ? activeTabBg : 'transparent'}
          borderRadius="md"
          leftIcon={<FiMessageSquare />}
          onClick={() => setActiveTab('text')}
          fontWeight={activeTab === 'text' ? 'bold' : 'normal'}
        >
          Text Assistant
        </Button>
        <Button
          flex={1}
          size="sm"
          variant="ghost"
          bg={activeTab === 'voice' ? activeTabBg : 'transparent'}
          borderRadius="md"
          leftIcon={<FiMic />}
          onClick={() => setActiveTab('voice')}
          fontWeight={activeTab === 'voice' ? 'bold' : 'normal'}
        >
          Voice Assistant
        </Button>
      </HStack>

      {/* Persona Grid */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
        {filteredPersonas.map(persona => (
          <GridItem key={persona.persona_id}>
            <PersonaCard
              persona={persona}
              isSelected={persona.persona_id === currentPersonaId}
              isVoiceMode={activeTab === 'voice'}
              onSelect={() => handleSelectPersona(persona)}
            />
          </GridItem>
        ))}
      </Grid>

      {filteredPersonas.length === 0 && (
        <Box p={8} textAlign="center">
          <Text color={textSecondary}>
            No personas available for {activeTab} mode
          </Text>
        </Box>
      )}

      {selecting && (
        <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="blackAlpha.300" zIndex={1000}>
          <Flex h="100%" align="center" justify="center">
            <Spinner size="xl" color="blue.500" />
          </Flex>
        </Box>
      )}
    </VStack>
  );
};

export default PersonaManager;

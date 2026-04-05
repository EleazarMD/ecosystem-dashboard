/**
 * Personal AI Settings - Persona and Memory Configuration
 * Manage AI personas for text and voice interactions
 */

import React, { useState } from 'react';
import {
  Box, Container, VStack, Heading, Text, Divider,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  useColorModeValue, Button, HStack,
} from '@chakra-ui/react';
import { FiUser, FiCpu, FiMic, FiPhone } from 'react-icons/fi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PersonaManager } from '@/components/goose-mind/PersonaManager';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { PipecatVoicePanel } from '@/components/voice/PipecatVoicePanel';

const PersonalAISettingsPage = () => {
  const textSecondary = useSemanticToken('text.secondary');
  const tabBg = useColorModeValue('gray.50', 'gray.800');
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  return (
    <DashboardLayout>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="stretch">
          <Box>
            <Heading size="lg" mb={2}>Personal AI Settings</Heading>
            <Text color={textSecondary}>
              Configure your AI assistant personalities, memory preferences, and interaction styles.
            </Text>
          </Box>

          <Divider />

          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList bg={tabBg} p={2} borderRadius="xl">
              <Tab><FiUser style={{ marginRight: 8 }} /> Personas</Tab>
              <Tab><FiCpu style={{ marginRight: 8 }} /> Memory</Tab>
              <Tab><FiMic style={{ marginRight: 8 }} /> Voice</Tab>
            </TabList>

            <TabPanels mt={6}>
              <TabPanel p={0}>
                <GlassPanel variant="light" p={6}>
                  <PersonaManager />
                </GlassPanel>
              </TabPanel>

              <TabPanel p={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={4} align="start">
                    <Heading size="md">Memory Settings</Heading>
                    <Text color={textSecondary}>
                      Configure how your AI assistant remembers conversations and learns about you.
                    </Text>
                    <Box p={4} bg={tabBg} borderRadius="lg" w="100%">
                      <Text fontSize="sm" color={textSecondary}>
                        Memory configuration coming soon. Your assistant currently uses:
                      </Text>
                      <VStack align="start" mt={3} spacing={2}>
                        <Text>• Conversation history (last 25 messages)</Text>
                        <Text>• Topic memory with 30-day expiration</Text>
                        <Text>• User knowledge extraction</Text>
                        <Text>• Session summaries for long conversations</Text>
                      </VStack>
                    </Box>
                  </VStack>
                </GlassPanel>
              </TabPanel>

              <TabPanel p={0}>
                <GlassPanel variant="light" p={6}>
                  <VStack spacing={4} align="start" w="100%">
                    <HStack justify="space-between" w="100%">
                      <Box>
                        <Heading size="md">Voice Settings</Heading>
                        <Text color={textSecondary}>
                          Configure voice interaction preferences for your AI assistant.
                        </Text>
                      </Box>
                      <Button
                        leftIcon={<FiPhone />}
                        colorScheme={showVoicePanel ? 'red' : 'green'}
                        onClick={() => setShowVoicePanel(!showVoicePanel)}
                      >
                        {showVoicePanel ? 'Close Voice Panel' : 'Open Voice Panel'}
                      </Button>
                    </HStack>

                    {showVoicePanel ? (
                      <Box w="100%" h="600px" borderRadius="lg" overflow="hidden">
                        <PipecatVoicePanel />
                      </Box>
                    ) : (
                      <Box p={4} bg={tabBg} borderRadius="lg" w="100%">
                        <Text fontSize="sm" color={textSecondary}>
                          Current voice configuration:
                        </Text>
                        <VStack align="start" mt={3} spacing={2}>
                          <Text>• STT Engine: Whisper (faster-whisper-medium)</Text>
                          <Text>• TTS Engine: Qwen3-TTS (Voice Cloning)</Text>
                          <Text>• Default Voice: american_female_warm</Text>
                          <Text>• LLM: MiniMax M2.5 via AI Gateway</Text>
                          <Text>• Transport: Pipecat WebRTC</Text>
                        </VStack>
                      </Box>
                    )}
                  </VStack>
                </GlassPanel>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </VStack>
      </Container>
    </DashboardLayout>
  );
};

export default PersonalAISettingsPage;

/**
 * OpenClaw Skills Panel
 * 
 * Native skills management for OpenClaw Gateway.
 * Implements skills.status, skills.install, skills.update via WebSocket RPC.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  IconButton,
  Switch,
  Input,
  Button,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { FiRefreshCw, FiDownload, FiKey } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Skill {
  name: string;
  enabled: boolean;
  path: string;
  description?: string;
  apiKeyRequired?: boolean;
  hasApiKey?: boolean;
}

interface OpenClawSkillsPanelProps {
  connected: boolean;
  skills: Skill[];
  onRefresh: (agentId?: string) => Promise<Skill[]>;
  onInstall: (url: string) => Promise<void>;
  onUpdate: (name: string, updates: Record<string, unknown>) => Promise<void>;
}

export function OpenClawSkillsPanel({
  connected,
  skills,
  onRefresh,
  onInstall,
  onUpdate,
}: OpenClawSkillsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [installUrl, setInstallUrl] = useState('');
  const [installing, setInstalling] = useState(false);

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const bgElevated = useSemanticToken('surface.elevated');
  const borderSubtle = useSemanticToken('border.subtle');

  useEffect(() => {
    if (connected) {
      handleRefresh();
    }
  }, [connected]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error('Failed to refresh skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!installUrl.trim()) return;
    setInstalling(true);
    try {
      await onInstall(installUrl.trim());
      setInstallUrl('');
      await onRefresh();
    } catch (err) {
      console.error('Failed to install skill:', err);
    } finally {
      setInstalling(false);
    }
  };

  const handleToggleEnabled = async (skill: Skill) => {
    try {
      await onUpdate(skill.name, { enabled: !skill.enabled });
      await onRefresh();
    } catch (err) {
      console.error('Failed to toggle skill:', err);
    }
  };

  return (
    <Box
      bg={bgElevated}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderSubtle}
      overflow="hidden"
    >
      <HStack p={3} borderBottom="1px solid" borderColor={borderSubtle} justify="space-between">
        <HStack>
          <Text fontWeight="600" color={textPrimary} fontSize="sm">
            Skills
          </Text>
          <Badge colorScheme="green" fontSize="xs">
            {skills.filter((s) => s.enabled).length} active
          </Badge>
        </HStack>
        <IconButton
          aria-label="Refresh"
          icon={loading ? <Spinner size="sm" /> : <FiRefreshCw />}
          size="xs"
          variant="ghost"
          onClick={handleRefresh}
          isDisabled={!connected || loading}
        />
      </HStack>

      <Box p={3}>
        <HStack mb={3}>
          <Input
            placeholder="Skill URL (GitHub or ClawHub)"
            value={installUrl}
            onChange={(e) => setInstallUrl(e.target.value)}
            size="sm"
            isDisabled={!connected}
          />
          <Button
            leftIcon={installing ? <Spinner size="sm" /> : <FiDownload />}
            size="sm"
            colorScheme="blue"
            onClick={handleInstall}
            isDisabled={!connected || !installUrl.trim() || installing}
          >
            Install
          </Button>
        </HStack>

        <Box maxH="250px" overflowY="auto">
          {skills.length === 0 ? (
            <Text color={textSecondary} fontSize="sm" textAlign="center" py={4}>
              No skills installed
            </Text>
          ) : (
            <Accordion allowMultiple>
              {skills.map((skill) => (
                <AccordionItem key={skill.name} border="none">
                  <AccordionButton px={0} py={2}>
                    <HStack flex={1} justify="space-between">
                      <HStack>
                        <Text fontSize="sm" fontWeight="500" color={textPrimary}>
                          {skill.name}
                        </Text>
                        {skill.apiKeyRequired && (
                          <Badge
                            colorScheme={skill.hasApiKey ? 'green' : 'yellow'}
                            fontSize="xs"
                          >
                            <FiKey style={{ display: 'inline', marginRight: 2 }} />
                            {skill.hasApiKey ? 'Key Set' : 'Key Required'}
                          </Badge>
                        )}
                      </HStack>
                      <Switch
                        size="sm"
                        isChecked={skill.enabled}
                        onChange={() => handleToggleEnabled(skill)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </HStack>
                    <AccordionIcon />
                  </AccordionButton>
                  <AccordionPanel pb={2} px={0}>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="xs" color={textSecondary}>
                        {skill.description || 'No description'}
                      </Text>
                      <Text fontSize="xs" color={textSecondary} fontFamily="mono">
                        {skill.path}
                      </Text>
                    </VStack>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default OpenClawSkillsPanel;

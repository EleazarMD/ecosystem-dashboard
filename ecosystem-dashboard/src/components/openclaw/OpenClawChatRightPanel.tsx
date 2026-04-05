/**
 * OpenClaw Chat Right Panel
 * Self-contained agent selector, session browser, and context tools.
 * Owns its own gateway connection — can be rendered standalone by the panel registry.
 */
import React, { useCallback, useEffect, useState, memo } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Spinner,
  Divider,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Avatar,
  Tooltip,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Alert,
  AlertIcon,
  Code,
  useToast,
} from '@chakra-ui/react';
import {
  FiRefreshCw,
  FiSearch,
  FiPlus,
  FiTrash2,
  FiMessageCircle,
  FiActivity,
  FiZap,
  FiUser,
  FiCpu,
} from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useOpenClawGateway } from '@/hooks/useOpenClawGateway';
import type { GatewayAgentRow, GatewaySessionRow } from '@/hooks/useOpenClawGateway';

interface OpenClawChatRightPanelProps {
  // All props are optional — the panel is self-contained via useOpenClawGateway
  // but accepts overrides for integration with the parent page
  onSelectAgent?: (agentId: string) => void;
  onSelectSession?: (sessionKey: string) => void;
  onNewSession?: () => void;
  onSelectModel?: (modelId: string) => void;
}

interface ModelOption {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai-oss' | 'openai';
  description?: string;
}

function formatSessionAge(updatedAt: number | null): string {
  if (!updatedAt) return 'No activity';
  const diffMs = Date.now() - updatedAt;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function agentDisplayName(agent: GatewayAgentRow): string {
  return agent.identity?.name ?? agent.name ?? agent.id;
}

function agentEmoji(agent: GatewayAgentRow): string {
  return agent.identity?.emoji ?? '🤖';
}

// Model option interface matches API response
interface GatewayModel {
  id: string;
  name: string;
  provider: string;
  status: string;
  type: string;
  description: string;
  isActive: boolean;
}

const OpenClawChatRightPanelInner: React.FC<OpenClawChatRightPanelProps> = ({
  onSelectAgent: onSelectAgentProp,
  onSelectSession: onSelectSessionProp,
  onNewSession: onNewSessionProp,
  onSelectModel: onSelectModelProp,
}) => {
  const toast = useToast();
  const [sessionSearch, setSessionSearch] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>('minimax-m2.5');
  const [availableModels, setAvailableModels] = useState<GatewayModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const {
    state: { connected, connecting, gatewayVersion, agents, selectedAgentId, sessions },
    connect,
    disconnect,
    loadAgents,
    loadSessions,
    deleteSession,
    setSelectedAgent,
  } = useOpenClawGateway();

  // Debug logging removed to prevent console spam on re-renders

  const textPrimary = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const surfaceBase = useSemanticToken('surface.base');
  const surfaceElevated = useSemanticToken('surface.elevated');
  const surfaceHover = useSemanticToken('surface.hover');
  const surfaceActive = useSemanticToken('surface.active');
  const borderSubtle = useSemanticToken('border.subtle');
  const interactivePrimary = useSemanticToken('interactive.primary');

  const handleLoadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      await loadSessions();
    } finally {
      setLoadingSessions(false);
    }
  }, [loadSessions]);

  // Auto-connect and load data on mount — single effect, no dependency on connected state flip
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await connect();
      if (cancelled) return;
      await Promise.all([
        loadAgents(),
        handleLoadSessions().catch(() => {}),
        loadModels()
      ]);
    };
    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgent(agentId);
    onSelectAgentProp?.(agentId);
    toast({ title: `Agent: ${agentId}`, status: 'info', duration: 1500, position: 'bottom-right' });
  }, [setSelectedAgent, onSelectAgentProp, toast]);

  const handleSelectSession = useCallback(async (sessionKey: string) => {
    setCurrentSessionId(sessionKey);
    onSelectSessionProp?.(sessionKey);
  }, [onSelectSessionProp]);

  const handleNewSession = useCallback(() => {
    setCurrentSessionId(null);
    onNewSessionProp?.();
  }, [onNewSessionProp]);

  const handleDeleteSession = useCallback(async (key: string) => {
    await deleteSession(key);
    toast({ title: 'Session deleted', status: 'success', duration: 1500, position: 'bottom-right' });
  }, [deleteSession, toast]);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const res = await fetch('/api/gateway/models');
      if (res.ok) {
        const data = await res.json();
        const models: GatewayModel[] = data.models || [];
        setAvailableModels(models);
        // Auto-select minimax-m2.5 if available, otherwise keep current selection
        const minimax = models.find(m => m.id === 'minimax-m2.5');
        if (minimax) {
          setSelectedModelId('minimax-m2.5');
          onSelectModelProp?.('minimax-m2.5');
        }
      }
    } catch (err) {
      console.error('[OpenClawChatRightPanel] Failed to load models:', err);
    } finally {
      setLoadingModels(false);
    }
  }, [onSelectModelProp]);

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    onSelectModelProp?.(modelId);
    const model = availableModels.find(m => m.id === modelId);
    toast({ 
      title: `Model: ${model?.name || modelId}`, 
      description: model?.description,
      status: 'info', 
      duration: 2000, 
      position: 'bottom-right' 
    });
  }, [onSelectModelProp, toast, availableModels]);

  const filteredSessions = sessions.filter((s) => {
    const q = sessionSearch.toLowerCase();
    if (!q) return true;
    return (
      (s.displayName ?? s.label ?? s.key ?? '').toLowerCase().includes(q) ||
      (s.surface ?? '').toLowerCase().includes(q) ||
      (s.agentId ?? '').toLowerCase().includes(q)
    );
  });

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <Box h="full" display="flex" flexDirection="column" overflow="hidden">
      {/* Connection Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderSubtle} flexShrink={0}>
        <HStack justify="space-between" mb={2}>
          <HStack spacing={2}>
            <Box
              w={2} h={2} borderRadius="full"
              bg={connected ? 'green.400' : connecting ? 'yellow.400' : 'red.400'}
            />
            <Text fontSize="sm" fontWeight="600" color={textPrimary}>
              OpenClaw Gateway
            </Text>
          </HStack>
          <HStack spacing={1}>
            {connected ? (
              <Tooltip label="Disconnect">
                <IconButton
                  aria-label="Disconnect"
                  icon={<FiZap />}
                  size="xs"
                  colorScheme="red"
                  variant="ghost"
                  onClick={disconnect}
                />
              </Tooltip>
            ) : (
              <Button
                size="xs"
                colorScheme="blue"
                leftIcon={connecting ? <Spinner size="xs" /> : <FiZap />}
                onClick={connect}
                isDisabled={connecting}
              >
                {connecting ? 'Connecting…' : 'Connect'}
              </Button>
            )}
          </HStack>
        </HStack>

        {connected && gatewayVersion && (
          <Text fontSize="xs" color={textSecondary}>
            v{gatewayVersion} · {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </Text>
        )}

        {!connected && !connecting && (
          <Alert status="warning" size="sm" borderRadius="md" py={1} px={2} mt={1}>
            <AlertIcon boxSize={3} />
            <Text fontSize="xs">Gateway offline — connect to chat</Text>
          </Alert>
        )}
      </Box>

      {/* Main Tabs */}
      <Tabs variant="line" size="sm" flex={1} display="flex" flexDirection="column" overflow="hidden">
        <TabList px={2} pt={1} flexShrink={0} borderBottom="1px solid" borderColor={borderSubtle}>
          <Tab fontSize="xs" py={2}>
            <HStack spacing={1}>
              <FiUser size={12} />
              <Text>Agents</Text>
            </HStack>
          </Tab>
          <Tab fontSize="xs" py={2}>
            <HStack spacing={1}>
              <FiCpu size={12} />
              <Text>Models</Text>
            </HStack>
          </Tab>
          <Tab fontSize="xs" py={2}>
            <HStack spacing={1}>
              <FiMessageCircle size={12} />
              <Text>Sessions</Text>
            </HStack>
          </Tab>
          <Tab fontSize="xs" py={2}>
            <HStack spacing={1}>
              <FiActivity size={12} />
              <Text>Context</Text>
            </HStack>
          </Tab>
        </TabList>

        <TabPanels flex={1} overflow="hidden">
          {/* ─── Agents Tab ─── */}
          <TabPanel p={0} h="full" overflow="auto">
            <Box p={3}>
              <HStack justify="space-between" mb={3}>
                <Text fontSize="xs" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wider">
                  Select Agent
                </Text>
                <Tooltip label="Refresh agents">
                  <IconButton
                    aria-label="Refresh agents"
                    icon={<FiRefreshCw size={12} />}
                    size="xs"
                    variant="ghost"
                    onClick={loadAgents}
                    isDisabled={!connected}
                  />
                </Tooltip>
              </HStack>

              {!connected ? (
                <Text fontSize="xs" color={textSecondary} textAlign="center" py={4}>
                  Connect to the gateway to see agents
                </Text>
              ) : agents.length === 0 ? (
                <VStack py={4} spacing={2}>
                  <Spinner size="sm" />
                  <Text fontSize="xs" color={textSecondary}>Loading agents…</Text>
                </VStack>
              ) : (
                <VStack spacing={1} align="stretch">
                  {agents.map((agent) => {
                    const isSelected = agent.id === selectedAgentId;
                    return (
                      <Box
                        key={agent.id}
                        p={3}
                        borderRadius="lg"
                        bg={isSelected ? surfaceActive : surfaceElevated}
                        border="1px solid"
                        borderColor={isSelected ? interactivePrimary : borderSubtle}
                        cursor="pointer"
                        _hover={{ bg: isSelected ? surfaceActive : surfaceHover }}
                        onClick={() => handleSelectAgent(agent.id)}
                        transition="all 0.15s"
                      >
                        <HStack spacing={3}>
                          <Avatar
                            size="sm"
                            name={agentDisplayName(agent)}
                            src={agent.identity?.avatarUrl}
                            bg={isSelected ? 'blue.500' : 'gray.500'}
                            color="white"
                            icon={<Text fontSize="lg">{agentEmoji(agent)}</Text>}
                          />
                          <VStack align="start" spacing={0} flex={1} overflow="hidden">
                            <Text
                              fontSize="sm"
                              fontWeight={isSelected ? '600' : '500'}
                              color={textPrimary}
                              isTruncated
                            >
                              {agentDisplayName(agent)}
                            </Text>
                            <Text fontSize="xs" color={textSecondary} fontFamily="mono" isTruncated>
                              {agent.id}
                            </Text>
                          </VStack>
                          {isSelected && (
                            <Badge colorScheme="blue" fontSize="2xs" variant="solid">
                              Active
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              )}

              {/* Selected agent info */}
              {selectedAgent && (
                <Box mt={4} p={3} bg={surfaceBase} borderRadius="lg" border="1px solid" borderColor={borderSubtle}>
                  <Text fontSize="xs" fontWeight="600" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="wider">
                    Active Agent
                  </Text>
                  <HStack>
                    <Text fontSize="2xl">{agentEmoji(selectedAgent)}</Text>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="sm" fontWeight="600" color={textPrimary}>
                        {agentDisplayName(selectedAgent)}
                      </Text>
                      {selectedAgent.identity?.theme && (
                        <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
                          {selectedAgent.identity.theme}
                        </Badge>
                      )}
                    </VStack>
                  </HStack>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* ─── Models Tab ─── */}
          <TabPanel p={0} h="full" overflow="auto">
            <Box p={3}>
              <HStack justify="space-between" mb={3}>
                <Text fontSize="xs" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wider">
                  Select Model
                </Text>
                <Tooltip label="Refresh models">
                  <IconButton
                    aria-label="Refresh models"
                    icon={<FiRefreshCw size={12} />}
                    size="xs"
                    variant="ghost"
                    onClick={loadModels}
                    isLoading={loadingModels}
                  />
                </Tooltip>
              </HStack>

              {loadingModels ? (
                <VStack py={4} spacing={2}>
                  <Spinner size="sm" />
                  <Text fontSize="xs" color={textSecondary}>Loading models…</Text>
                </VStack>
              ) : availableModels.length === 0 ? (
                <Text fontSize="xs" color={textSecondary} textAlign="center" py={4}>
                  No models available
                </Text>
              ) : (
                <VStack spacing={1} align="stretch">
                  {availableModels.map((model) => {
                    const isSelected = model.id === selectedModelId;
                    const providerColor = 
                      model.provider === 'anthropic' ? 'purple' :
                      model.provider === 'openai' ? 'green' :
                      model.provider === 'meta' ? 'blue' :
                      'gray';
                    
                    return (
                      <Box
                        key={model.id}
                        p={3}
                        borderRadius="lg"
                        bg={isSelected ? surfaceActive : surfaceBase}
                        border="1px solid"
                        borderColor={isSelected ? interactivePrimary : borderSubtle}
                        cursor="pointer"
                        transition="all 0.15s"
                        _hover={{ bg: surfaceHover, borderColor: interactivePrimary }}
                        onClick={() => handleSelectModel(model.id)}
                      >
                        <HStack justify="space-between" align="start">
                          <VStack align="start" spacing={1} flex={1}>
                            <HStack spacing={2}>
                              <Text fontSize="sm" fontWeight="600" color={textPrimary} isTruncated>
                                {model.name}
                              </Text>
                              <Badge colorScheme={providerColor} fontSize="2xs" variant="subtle">
                                {model.provider}
                              </Badge>
                              {model.isActive && (
                                <Badge colorScheme="green" fontSize="2xs" variant="solid">
                                  Active
                                </Badge>
                              )}
                            </HStack>
                            {model.description && (
                              <Text fontSize="xs" color={textSecondary} isTruncated>
                                {model.description}
                              </Text>
                            )}
                          </VStack>
                          {isSelected && (
                            <Badge colorScheme="blue" fontSize="2xs" variant="solid">
                              Selected
                            </Badge>
                          )}
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              )}

              {/* Selected model info */}
              {selectedModelId && availableModels.find(m => m.id === selectedModelId) && (
                <Box mt={4} p={3} bg={surfaceBase} borderRadius="lg" border="1px solid" borderColor={borderSubtle}>
                  <Text fontSize="xs" fontWeight="600" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="wider">
                    Active Model
                  </Text>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" fontWeight="600" color={textPrimary}>
                      {availableModels.find(m => m.id === selectedModelId)?.name}
                    </Text>
                    <HStack spacing={2}>
                      <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
                        {availableModels.find(m => m.id === selectedModelId)?.provider}
                      </Badge>
                      <Text fontSize="xs" color={textSecondary} fontFamily="mono">
                        {selectedModelId}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* ─── Sessions Tab ─── */}
          <TabPanel p={0} h="full" display="flex" flexDirection="column" overflow="hidden">
            <Box px={3} pt={3} pb={2} flexShrink={0}>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="600" color={textSecondary} textTransform="uppercase" letterSpacing="wider">
                  Chat Sessions
                </Text>
                <HStack spacing={1}>
                  <Tooltip label="Refresh sessions">
                    <IconButton
                      aria-label="Refresh sessions"
                      icon={loadingSessions ? <Spinner size="xs" /> : <FiRefreshCw size={12} />}
                      size="xs"
                      variant="ghost"
                      onClick={handleLoadSessions}
                      isDisabled={!connected || loadingSessions}
                    />
                  </Tooltip>
                  <Tooltip label="New session">
                    <IconButton
                      aria-label="New session"
                      icon={<FiPlus size={12} />}
                      size="xs"
                      variant="ghost"
                      colorScheme="blue"
                      onClick={handleNewSession}
                    />
                  </Tooltip>
                </HStack>
              </HStack>

              <InputGroup size="xs">
                <InputLeftElement pointerEvents="none">
                  <FiSearch size={11} color="gray" />
                </InputLeftElement>
                <Input
                  placeholder="Search sessions…"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  borderRadius="lg"
                  fontSize="xs"
                />
              </InputGroup>

              {currentSessionId && (
                <Badge colorScheme="green" fontSize="2xs" mt={2} px={2} py={0.5} borderRadius="full">
                  Active: {currentSessionId.slice(0, 20)}{currentSessionId.length > 20 ? '…' : ''}
                </Badge>
              )}
            </Box>

            <Box flex={1} overflowY="auto" px={3} pb={3}>
              {!connected ? (
                <Text fontSize="xs" color={textSecondary} textAlign="center" py={4}>
                  Connect to see sessions
                </Text>
              ) : filteredSessions.length === 0 ? (
                <Text fontSize="xs" color={textSecondary} textAlign="center" py={4}>
                  {sessions.length === 0 ? 'No sessions yet' : 'No matches'}
                </Text>
              ) : (
                <VStack spacing={1} align="stretch">
                  {filteredSessions.map((session) => {
                    const isActive = session.key === currentSessionId ||
                      session.sessionId === currentSessionId;
                    return (
                      <Box
                        key={session.key}
                        p={2.5}
                        borderRadius="lg"
                        bg={isActive ? surfaceActive : surfaceElevated}
                        border="1px solid"
                        borderColor={isActive ? interactivePrimary : 'transparent'}
                        cursor="pointer"
                        _hover={{ bg: isActive ? surfaceActive : surfaceHover, borderColor: isActive ? interactivePrimary : borderSubtle }}
                        onClick={() => handleSelectSession(session.key)}
                        role="group"
                        transition="all 0.15s"
                      >
                        <HStack justify="space-between">
                          <VStack align="start" spacing={0} flex={1} overflow="hidden">
                            <Text fontSize="xs" fontWeight="500" color={textPrimary} isTruncated maxW="160px">
                              {session.displayName ?? session.label ?? session.key}
                            </Text>
                            <HStack spacing={1} flexWrap="wrap">
                              {session.surface && (
                                <Badge colorScheme="gray" fontSize="2xs" variant="subtle">
                                  {session.surface}
                                </Badge>
                              )}
                              {session.agentId && session.agentId !== selectedAgentId && (
                                <Badge colorScheme="purple" fontSize="2xs" variant="subtle">
                                  {session.agentId}
                                </Badge>
                              )}
                              <Text fontSize="2xs" color={textSecondary}>
                                {formatSessionAge(session.updatedAt)}
                              </Text>
                            </HStack>
                          </VStack>
                          <IconButton
                            aria-label="Delete session"
                            icon={<FiTrash2 size={10} />}
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            opacity={0}
                            _groupHover={{ opacity: 1 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.key);
                            }}
                          />
                        </HStack>
                      </Box>
                    );
                  })}
                </VStack>
              )}
            </Box>
          </TabPanel>

          {/* ─── Context Tab ─── */}
          <TabPanel p={3} h="full" overflowY="auto">
            <VStack spacing={4} align="stretch">
              {/* Gateway Stats */}
              <Box>
                <Text fontSize="xs" fontWeight="600" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="wider">
                  Gateway
                </Text>
                <SimpleGrid columns={2} spacing={2}>
                  <Box p={2} bg={surfaceElevated} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
                    <Text fontSize="2xs" color={textSecondary}>Agents</Text>
                    <Text fontSize="lg" fontWeight="700" color={textPrimary}>{agents.length}</Text>
                  </Box>
                  <Box p={2} bg={surfaceElevated} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
                    <Text fontSize="2xs" color={textSecondary}>Sessions</Text>
                    <Text fontSize="lg" fontWeight="700" color={textPrimary}>{sessions.length}</Text>
                  </Box>
                </SimpleGrid>
              </Box>

              <Divider borderColor={borderSubtle} />

              {/* Session ID */}
              <Box>
                <Text fontSize="xs" fontWeight="600" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="wider">
                  Session
                </Text>
                {currentSessionId ? (
                  <Box p={2} bg={surfaceBase} borderRadius="md" border="1px solid" borderColor={borderSubtle}>
                    <Text fontSize="2xs" color={textSecondary} mb={1}>Session ID</Text>
                    <Code fontSize="2xs" wordBreak="break-all" display="block" bg="transparent" color={textPrimary}>
                      {currentSessionId}
                    </Code>
                  </Box>
                ) : (
                  <Text fontSize="xs" color={textSecondary}>No active session — send a message to start one</Text>
                )}
              </Box>

              <Divider borderColor={borderSubtle} />

              {/* Recent sessions preview */}
              {sessions.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="600" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="wider">
                    Recent Activity
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    {sessions.slice(0, 3).map((s) => (
                      <HStack key={s.key} spacing={2} p={1.5} bg={surfaceElevated} borderRadius="md">
                        <FiMessageCircle size={10} />
                        <VStack align="start" spacing={0} flex={1} overflow="hidden">
                          <Text fontSize="2xs" color={textPrimary} isTruncated>
                            {s.displayName ?? s.key.slice(0, 24)}
                          </Text>
                          <Text fontSize="2xs" color={textSecondary}>{formatSessionAge(s.updatedAt)}</Text>
                        </VStack>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Gateway connection info */}
              <Divider borderColor={borderSubtle} />
              <Box>
                <Text fontSize="xs" fontWeight="600" color={textSecondary} mb={2} textTransform="uppercase" letterSpacing="wider">
                  Gateway Info
                </Text>
                <VStack align="stretch" spacing={1}>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color={textSecondary}>Status</Text>
                    <Badge colorScheme={connected ? 'green' : 'red'} fontSize="2xs">
                      {connected ? 'Connected' : 'Offline'}
                    </Badge>
                  </HStack>
                  {gatewayVersion && (
                    <HStack justify="space-between">
                      <Text fontSize="xs" color={textSecondary}>Version</Text>
                      <Code fontSize="2xs">{gatewayVersion}</Code>
                    </HStack>
                  )}
                  <HStack justify="space-between">
                    <Text fontSize="xs" color={textSecondary}>Agents</Text>
                    <Text fontSize="xs" color={textPrimary}>{agents.length}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="xs" color={textSecondary}>Sessions</Text>
                    <Text fontSize="xs" color={textPrimary}>{sessions.length}</Text>
                  </HStack>
                </VStack>
              </Box>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

// Memoize to prevent re-renders from parent context changes (SystemStatus, ServiceStatus polling)
export const OpenClawChatRightPanel = memo(OpenClawChatRightPanelInner);
export default OpenClawChatRightPanel;

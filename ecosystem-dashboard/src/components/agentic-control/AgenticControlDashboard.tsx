import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import {
  Box,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Grid,
  GridItem,
  Spinner,
  useToast,
} from '@chakra-ui/react';

// Import modular components
import { AgentList } from './AgentList';
import { ChatArea } from './ChatArea';
import { SessionViewer } from './SessionViewer';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import { MCPServerStatus } from './MCPServerStatus';

// Import custom hooks
import { useAgentState } from './hooks/useAgentState';
import { useAgentMessaging } from './hooks/useAgentMessaging';
import { useRightPanel } from '@/contexts/RightPanelContext';

// Import voice interface
import { useVoiceInterface } from '../../hooks/useVoiceInterface';

const AgenticControlDashboard: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);

  // Color mode values (moved to top level)
  const dashboardBg = useSemanticToken('surface.base');
  const panelBg = useSemanticToken('surface.elevated');

  // Use the global right panel context
  const { setCustomData, setIsOpen: setRightPanelOpen } = useRightPanel();

  const {
    agents,
    selectedAgent,
    messages,
    events,
    currentMessage,
    isLoading,
    isTyping,
    error,
    setMessages,
    setEvents,
    setCurrentMessage,
    setIsTyping,
    loadAgents,
    handleAgentSelection,
    addEvent,
  } = useAgentState();

  const { handleSendMessage, handleKeyPress, clearConversation } = useAgentMessaging({
    selectedAgent,
    currentMessage,
    messages,
    setMessages,
    setCurrentMessage,
    setIsTyping,
    addEvent,
  });

  // Voice interface integration
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInterface();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Color mode values (moved to top level)
  const borderColor = useSemanticToken('border.default');

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load agents on component mount
  useEffect(() => {
    loadAgents();
    // Open right panel and set context for agentic control
    setRightPanelOpen(true);
  }, []);

  // Push events and agent data to right panel
  useEffect(() => {
    setCustomData({
      events,
      selectedAgent,
      onClearEvents: () => setEvents([]),
      onShowSettings: () => setShowSettings(true),
    });
  }, [events, selectedAgent, setCustomData, setEvents]);

  // Handle voice transcript
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setCurrentMessage(transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript, setCurrentMessage]);

  // Filter messages by selected agent (show user messages and messages from the selected agent)
  const filteredMessages = messages.filter(msg =>
    msg.type === 'user' || (selectedAgent && msg.agentId === selectedAgent.id)
  );

  // Filter events by selected agent
  const filteredEvents = events.filter(event =>
    !selectedAgent || event.agent_id === selectedAgent.id
  );

  const handleClearConversation = () => {
    if (selectedAgent) {
      setMessages([]);
      setEvents([]);
      toast({
        title: 'Conversation cleared',
        description: `Cleared chat history with ${selectedAgent.name}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  if (isLoading) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="600px">
        <VStack spacing={4}>
          <Spinner size="xl" color={useSemanticToken('interactive.primary')} />
          <Text fontSize="lg">Discovering ADK agents...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="600px">
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Connection Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      className="agentic-control-dashboard"
      h="calc(100vh - 60px)"
      overflow="hidden"
      overscrollBehaviorY="none"
    >
      <Grid
        templateAreas={`"agents chat"`}
        gridTemplateColumns={'350px 1fr'}
        h="100%"
        gap={1}
        bg={dashboardBg}
        overflow="hidden"
        overscrollBehaviorY="contain"
      >
        <GridItem
          area={'agents'}
          bg={panelBg}
          display="flex"
          flexDirection="column"
          minH={0}
          overflow="hidden"
        >
          <AgentList
            agents={agents}
            selectedAgent={selectedAgent}
            onAgentSelect={handleAgentSelection}
            isLoading={isLoading}
            onShowSettings={() => setShowSettings(true)}
            onRefresh={loadAgents}
          />
        </GridItem>

        <GridItem
          area={'chat'}
          bg={panelBg}
          display="flex"
          flexDirection="column"
          minH={0}
          overflow="hidden"
        >
          <Tabs size="sm" colorScheme="blue" h="full" display="flex" flexDirection="column">
            <TabList px={4} pt={2}>
              <Tab>Chat</Tab>
              <Tab>Sessions</Tab>
              <Tab>Tools</Tab>
              <Tab>MCP Servers</Tab>
            </TabList>

            <TabPanels flex={1} minH={0} overflow="hidden">
              <TabPanel h="full" p={0}>
                <ChatArea
                  selectedAgent={selectedAgent}
                  messages={messages}
                  currentMessage={currentMessage}
                  isTyping={isTyping}
                  onSendMessage={handleSendMessage}
                  onCurrentMessageChange={setCurrentMessage}
                  isLoading={isLoading}
                  showSettings={showSettings}
                  onCloseSettings={() => setShowSettings(false)}
                  onClearConversation={handleClearConversation}
                />
              </TabPanel>

              <TabPanel h="full" p={0}>
                <SessionViewer agentId={selectedAgent?.id} />
              </TabPanel>

              <TabPanel h="full" p={0}>
                <ToolExecutionPanel agentId={selectedAgent?.id} autoRefresh={true} />
              </TabPanel>

              <TabPanel h="full" p={0}>
                <MCPServerStatus
                  agentId={selectedAgent?.id}
                  servers={selectedAgent?.tools?.mcp_servers}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </GridItem>
      </Grid>
    </Box>
  );
};

export default AgenticControlDashboard;

import React, { useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Grid,
  GridItem,
  useToast,
} from '@chakra-ui/react';

// Import modular components
import { AgentList } from './AgentList';
import { ChatArea } from './ChatArea';
import { EventsSidebar } from './EventsSidebar';

// Import custom hooks
import { useAgentState } from './hooks/useAgentState';
import { useAgentMessaging } from './hooks/useAgentMessaging';

// Import voice interface
import { useVoiceInterface } from '../../hooks/useVoiceInterface';
import { useSemanticToken } from '@/hooks/useSemanticToken';

const AgenticControlDashboard: React.FC = () => {
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

  // Color mode values
  const bg = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const sidebarBg = useSemanticToken('surface.base');

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
  }, []);

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
          <Spinner size="xl" color="blue.500" />
          <Text fontSize="lg">Discovering ADK agents...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Error loading agents!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <Grid templateColumns="300px 1fr 300px" h="calc(100vh - 120px)" gap={0}>
      {/* Left Sidebar - Agent List */}
      <GridItem bg={sidebarBg} borderRight="1px" borderColor={borderColor} p={4}>
        <AgentList
          agents={agents}
          selectedAgent={selectedAgent}
          onAgentSelect={handleAgentSelection}
          onRefresh={loadAgents}
        />
      </GridItem>

      {/* Main Chat Area */}
      <GridItem bg={bg} display="flex" flexDirection="column">
        <ChatArea
          selectedAgent={selectedAgent}
          messages={filteredMessages}
          currentMessage={currentMessage}
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
          agents={agents}
          onMessageChange={setCurrentMessage}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
        />
      </GridItem>

      {/* Right Sidebar - Events & Actions */}
      <GridItem bg={sidebarBg} borderLeft="1px" borderColor={borderColor} p={4}>
        <EventsSidebar
          events={filteredEvents}
          onClearEvents={() => setEvents([])}
        />
      </GridItem>
    </Grid>
  );
};

export default AgenticControlDashboard;

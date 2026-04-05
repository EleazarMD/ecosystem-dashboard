import React from 'react';
import { Grid, GridItem, useDisclosure } from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { useAdaptiveGlass } from '@/hooks/useAdaptiveGlass';
import { useAgentManagement } from '../../hooks/useAgentManagement';
import { useAgentMessaging } from '../../hooks/useAgentMessaging';
import { AgentSidebar } from './AgentSidebar';
import { ChatInterface } from './ChatInterface';
import { EventPanel } from './EventPanel';

const AgenticControlDashboard: React.FC = () => {
  const {
    agents,
    selectedAgent,
    isLoading,
    error,
    loadAgents,
    handleAgentSelection,
    getStatusColor,
  } = useAgentManagement();

  const {
    currentMessages,
    currentEvents,
    currentMessage,
    setCurrentMessage,
    isTyping,
    messagesEndRef,
    handleSendMessage,
    handleKeyPress,
    clearConversation,
  } = useAgentMessaging(selectedAgent);

  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const borderColor = useSemanticToken('border.default');

  return (
    <Grid templateColumns="300px 1fr 350px" h="calc(100vh - 80px)" gap={0}>
      {/* Left Sidebar - Agent Selection */}
      <GridItem borderRight="1px" borderColor={borderColor}>
        <AgentSidebar
          agents={agents}
          selectedAgent={selectedAgent}
          isLoading={isLoading}
          error={error}
          onAgentSelect={handleAgentSelection}
          onRefresh={loadAgents}
          getStatusColor={getStatusColor}
        />
      </GridItem>

      {/* Center Panel - Chat Interface */}
      <GridItem>
        <ChatInterface
          selectedAgent={selectedAgent}
          messages={currentMessages}
          currentMessage={currentMessage}
          isTyping={isTyping}
          messagesEndRef={messagesEndRef}
          onMessageChange={setCurrentMessage}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
          onClearConversation={clearConversation}
          getStatusColor={getStatusColor}
        />
      </GridItem>

      {/* Right Sidebar - Events & Actions */}
      <GridItem borderLeft="1px" borderColor={borderColor}>
        <EventPanel
          events={currentEvents}
          selectedAgentName={selectedAgent?.name}
        />
      </GridItem>
    </Grid>
  );
};

export default AgenticControlDashboard;

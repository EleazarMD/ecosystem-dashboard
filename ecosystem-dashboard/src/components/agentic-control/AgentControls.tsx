import React from 'react';
import {
  HStack,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { FiMic, FiMicOff, FiSettings, FiTrash2 } from 'react-icons/fi';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface AgentControlsProps {
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  onOpenSettings: () => void;
  onClearConversation: () => void;
  isRecording?: boolean;
  hasSelectedAgent?: boolean;
}

export const AgentControls: React.FC<AgentControlsProps> = ({
  isVoiceEnabled,
  onToggleVoice,
  onOpenSettings,
  onClearConversation,
  isRecording = false,
  hasSelectedAgent = false,
}) => {
  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');

  return (
    <HStack
      spacing={2}
      p={2}
      bg={bgColor}
      borderRadius="lg"
      border="1px solid"
      borderColor={borderColor}
      shadow="sm"
    >
      {/* Voice Control */}
      <Tooltip
        label={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
        placement="top"
      >
        <IconButton
          aria-label={isVoiceEnabled ? 'Disable Voice' : 'Enable Voice'}
          icon={isVoiceEnabled ? <FiMicOff /> : <FiMic />}
          size="sm"
          variant={isVoiceEnabled ? 'solid' : 'ghost'}
          colorScheme={isVoiceEnabled ? 'blue' : 'gray'}
          onClick={onToggleVoice}
          isLoading={isRecording}
        />
      </Tooltip>

      {/* Settings */}
      <Tooltip 
        label={hasSelectedAgent ? "Agent Settings" : "Select an agent to access settings"} 
        placement="top"
      >
        <IconButton
          aria-label="Agent Settings"
          icon={<FiSettings />}
          size="sm"
          variant="ghost"
          colorScheme="gray"
          onClick={onOpenSettings}
          isDisabled={!hasSelectedAgent}
        />
      </Tooltip>

      {/* Clear Conversation */}
      <Tooltip 
        label={hasSelectedAgent ? "Clear Conversation" : "Select an agent to clear conversation"} 
        placement="top"
      >
        <IconButton
          aria-label="Clear Conversation"
          icon={<FiTrash2 />}
          size="sm"
          variant="ghost"
          colorScheme="red"
          onClick={onClearConversation}
          isDisabled={!hasSelectedAgent}
        />
      </Tooltip>
    </HStack>
  );
};

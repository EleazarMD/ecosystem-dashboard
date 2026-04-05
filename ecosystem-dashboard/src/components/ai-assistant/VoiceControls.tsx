/**
 * Voice Controls Component
 * Handles voice input controls and status display
 */

import React from 'react';
import {
  HStack,
  IconButton,
  Tooltip,
  Box,
  Text,
} from '@chakra-ui/react';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import { 
  MicrophoneIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon 
} from '@heroicons/react/24/outline';
import { MicrophoneIcon as MicrophoneSolid } from '@heroicons/react/24/solid';

interface VoiceControlsProps {
  isVoiceListening: boolean;
  isVoiceConnected: boolean;
  isMicrophoneMuted: boolean;
  isAudioMuted: boolean;
  voiceEnabled: boolean;
  onToggleListening: () => void;
  onToggleMicrophoneMute: () => void;
  onToggleAudioMute: () => void;
  onToggleVoiceEnabled: () => void;
  ttsIsStreaming?: boolean;
  captionsVisible?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isVoiceListening,
  isVoiceConnected,
  isMicrophoneMuted,
  isAudioMuted,
  voiceEnabled,
  onToggleListening,
  onToggleMicrophoneMute,
  onToggleAudioMute,
  onToggleVoiceEnabled,
  ttsIsStreaming = false,
  captionsVisible = false,
}) => {
  const borderColor = useSemanticToken('border.default');
  const statusTextColor = useSemanticToken('text.secondary');

  return (
    <Box>
      {/* Voice control buttons */}
      <HStack spacing={2} mb={3}>
        <Tooltip 
          label={isVoiceListening ? "Stop listening" : "Start voice input"} 
          hasArrow
        >
          <IconButton
            icon={
              isVoiceListening ? 
              <MicrophoneSolid className="h-5 w-5 text-red-500" /> : 
              <MicrophoneIcon className="h-5 w-5" />
            }
            onClick={onToggleListening}
            isDisabled={!voiceEnabled || !isVoiceConnected}
            colorScheme={isVoiceListening ? "red" : "gray"}
            variant="outline"
            size="sm"
            aria-label="Toggle voice input"
          />
        </Tooltip>

        <Tooltip 
          label={isMicrophoneMuted ? "Unmute microphone" : "Mute microphone"} 
          hasArrow
        >
          <IconButton
            icon={
              isMicrophoneMuted ? 
              <Box className="relative">
                <MicrophoneIcon className="h-5 w-5" />
                <Box className="absolute inset-0 flex items-center justify-center">
                  <Box className="w-6 h-[1px] bg-red-500 rotate-45" />
                </Box>
              </Box> : 
              <MicrophoneIcon className="h-5 w-5" />
            }
            onClick={onToggleMicrophoneMute}
            isDisabled={!voiceEnabled || !isVoiceConnected}
            colorScheme={isMicrophoneMuted ? "red" : "gray"}
            variant="ghost"
            size="sm"
            aria-label="Toggle microphone mute"
          />
        </Tooltip>

        <Tooltip 
          label={isAudioMuted ? "Unmute audio" : "Mute audio"} 
          hasArrow
        >
          <IconButton
            icon={
              isAudioMuted ? 
              <SpeakerXMarkIcon className="h-5 w-5" /> : 
              <SpeakerWaveIcon className="h-5 w-5" />
            }
            onClick={onToggleAudioMute}
            colorScheme={isAudioMuted ? "red" : "gray"}
            variant="ghost"
            size="sm"
            aria-label="Toggle audio mute"
          />
        </Tooltip>

        <Tooltip 
          label={voiceEnabled ? "Disable voice mode" : "Enable voice mode"} 
          hasArrow
        >
          <IconButton
            icon={
              <Box 
                className={`w-5 h-5 rounded-full border-2 ${
                  voiceEnabled ? 'bg-green-500 border-green-500' : 'border-gray-400'
                }`}
              />
            }
            onClick={onToggleVoiceEnabled}
            variant="ghost"
            size="sm"
            aria-label="Toggle voice mode"
          />
        </Tooltip>
      </HStack>

      {/* Voice status indicator */}
      <HStack spacing={2} px={1} opacity={0.8}>
        <Box 
          w="6px" 
          h="6px" 
          borderRadius="full" 
          bg={
            ttsIsStreaming || captionsVisible ? 'purple.400' : 
            (isVoiceListening ? 'green.400' : 'gray.400')
          } 
        />
        <Text fontSize="xs" color={statusTextColor}>
          {isMicrophoneMuted ? 'Mic muted' : 
           (ttsIsStreaming || captionsVisible ? 'Speaking…' : 
            (isVoiceListening ? 'Listening…' : 'Ready'))}
        </Text>
      </HStack>
    </Box>
  );
};

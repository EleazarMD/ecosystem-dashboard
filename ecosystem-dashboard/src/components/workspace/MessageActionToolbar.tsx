/**
 * Message Action Toolbar
 * 
 * ChatGPT/Perplexity-style action buttons for messages:
 * - Copy
 * - Share
 * - Branch in new chat
 * - Read aloud (Qwen3 TTS with voice selection, Gemini fallback)
 */

import React, { useState } from 'react';
import {
  HStack,
  IconButton,
  Tooltip,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
} from '@chakra-ui/react';
import {
  FiCopy,
  FiShare2,
  FiGitBranch,
  FiHeadphones,
  FiStopCircle,
  FiDownload,
} from 'react-icons/fi';
import { useTTS } from '@/hooks/useTTS';
import { useQwenTTS, SERVICE_VOICE_DEFAULTS } from '@/hooks/useQwenTTS';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface MessageActionToolbarProps {
  messageContent: string;
  messageId?: string;
  conversationContext?: string; // Full conversation for contextual TTS
  onBranch?: () => void;
  onShare?: () => void;
}

export const MessageActionToolbar: React.FC<MessageActionToolbarProps> = ({
  messageContent,
  messageId,
  conversationContext,
  onBranch,
  onShare,
}) => {
  const { speak, stop, isSpeaking } = useTTS();
  const { speakWithProfile, stop: stopQwen, isSpeaking: isQwenSpeaking, isLoading: isQwenLoading, downloadAudio } = useQwenTTS();
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);
  const [ttsProvider, setTtsProvider] = useState<'qwen' | 'gemini'>('qwen');

  const iconColor = useSemanticToken('text.secondary');
  const iconHoverColor = useSemanticToken('text.primary');
  const activeColor = 'purple.500';
  const hoverBg = useSemanticToken('surface.hover');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      // Visual feedback from button interaction is sufficient
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI Message',
          text: messageContent,
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy link
      handleCopy();
    }
  };

  const handleReadAloud = async (voiceId?: string) => {
    if (isSpeakingThis || isQwenSpeaking) {
      stop();
      stopQwen();
      setIsSpeakingThis(false);
      return;
    }

    const textToSpeak = conversationContext || messageContent;
    const selectedVoice = voiceId || SERVICE_VOICE_DEFAULTS['workspace'];

    setIsSpeakingThis(true);
    try {
      // Use Qwen3 TTS with voice cloning
      await speakWithProfile(textToSpeak, selectedVoice);
      setIsSpeakingThis(false);
    } catch (error) {
      console.error('Qwen TTS error, falling back to Gemini:', error);
      
      // Fallback to Gemini TTS
      try {
        const response = await fetch('/api/ai-gateway/tts', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-API-Key': 'dev-key-workspace-ai',
          },
          body: JSON.stringify({
            text: textToSpeak,
            provider: 'gemini',
            voice: 'Puck',
            model: 'google-gemini-2.5-flash-preview-tts',
            speed: 1.0,
            pitch: 0,
          }),
        });
        
        if (!response.ok) throw new Error('Gemini TTS failed');
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setIsSpeakingThis(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audio.play();
      } catch (geminiError) {
        console.error('All TTS failed:', geminiError);
        setIsSpeakingThis(false);
      }
    }
  };

  const handleDownload = async (voiceId?: string) => {
    const textToSpeak = conversationContext || messageContent;
    const selectedVoice = voiceId || SERVICE_VOICE_DEFAULTS['workspace'];
    await downloadAudio(textToSpeak, selectedVoice, `message_${Date.now()}.wav`);
  };

  return (
    <HStack spacing={1} opacity={0.7} _hover={{ opacity: 1 }} transition="opacity 0.2s">
      {/* Copy */}
      <Tooltip label="Copy">
        <IconButton
          aria-label="Copy"
          icon={<FiCopy />}
          size="xs"
          variant="ghost"
          color={iconColor}
          _hover={{ color: iconHoverColor, bg: hoverBg }}
          onClick={handleCopy}
        />
      </Tooltip>

      {/* Share */}
      <Tooltip label="Share">
        <IconButton
          aria-label="Share"
          icon={<FiShare2 />}
          size="xs"
          variant="ghost"
          color={iconColor}
          _hover={{ color: iconHoverColor, bg: hoverBg }}
          onClick={handleShare}
        />
      </Tooltip>

      {/* Branch in new chat */}
      {onBranch && (
        <Tooltip label="Branch in new chat">
          <IconButton
            aria-label="Branch"
            icon={<FiGitBranch />}
            size="xs"
            variant="ghost"
            color={iconColor}
            _hover={{ color: iconHoverColor, bg: hoverBg }}
            onClick={onBranch}
          />
        </Tooltip>
      )}

      {/* Read aloud with voice menu */}
      <Menu>
        <Tooltip label={isSpeakingThis || isQwenSpeaking ? 'Stop reading' : 'Read aloud (Qwen3 TTS)'}>
          <MenuButton
            as={IconButton}
            aria-label="Read aloud"
            icon={isSpeakingThis || isQwenSpeaking ? (isQwenLoading ? <Spinner size="xs" /> : <FiStopCircle />) : <FiHeadphones />}
            size="xs"
            variant="ghost"
            color={isSpeakingThis || isQwenSpeaking ? activeColor : iconColor}
            _hover={{ color: iconHoverColor, bg: hoverBg }}
            onClick={(e) => {
              if (isSpeakingThis || isQwenSpeaking) {
                e.preventDefault();
                handleReadAloud();
              }
            }}
          />
        </Tooltip>
        <MenuList fontSize="sm">
          <MenuGroup title="🟣 Qwen3 Voices">
            <MenuItem onClick={() => handleReadAloud('american_female_confident')}>
              American Female (Confident)
            </MenuItem>
            <MenuItem onClick={() => handleReadAloud('american_male_narrator')}>
              American Male (Narrator)
            </MenuItem>
            <MenuItem onClick={() => handleReadAloud('british_female_refined')}>
              British Female (Refined)
            </MenuItem>
            <MenuItem onClick={() => handleReadAloud('american_female_warm')}>
              American Female (Warm)
            </MenuItem>
          </MenuGroup>
          <MenuDivider />
          <MenuItem icon={<FiDownload />} onClick={() => handleDownload()}>
            Download Audio
          </MenuItem>
        </MenuList>
      </Menu>
    </HStack>
  );
};

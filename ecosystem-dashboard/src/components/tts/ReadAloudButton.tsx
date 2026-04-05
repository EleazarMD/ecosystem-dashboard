/**
 * Read Aloud Button - Add TTS capability to any content
 * 
 * A simple button that reads the provided text using Qwen3 TTS
 */

import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  HStack,
  Spinner,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { 
  SpeakerWaveIcon, 
  StopIcon, 
  ChevronDownIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { useQwenTTS } from '@/hooks/useQwenTTS';

// Strip markdown, links, sources, and all non-text items for clean TTS input
function stripMarkdown(text: string): string {
  return text
    // Remove entire "Sources" / "References" sections at the end
    .replace(/\n#{1,3}\s*(Sources|References|Bibliography|Citations|Links|Further Reading)[\s\S]*$/im, '')
    // Remove code blocks (fenced)
    .replace(/```[\s\S]*?```/g, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove markdown links [text](url) — keep link text only
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bare URLs (http/https/www)
    .replace(/https?:\/\/[^\s)>\]]+/g, '')
    .replace(/www\.[^\s)>\]]+/g, '')
    // Remove citation/reference markers like [1], [2][3], [1, 2, 3], (1), etc.
    .replace(/\[\d+(?:[,\s]*\d+)*\]/g, '')
    .replace(/\(\d+(?:[,\s]*\d+)*\)/g, '')
    // Remove footnote definitions like [^1]: ...
    .replace(/^\[\^\d+\]:.*$/gm, '')
    // Remove inline footnotes [^1]
    .replace(/\[\^\d+\]/g, '')
    // Remove email addresses
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '')
    // Remove file paths
    .replace(/(?:\/[\w.-]+){2,}/g, '')
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove headers (keep the text)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove inline code (keep the text)
    .replace(/`([^`]+)`/g, '$1')
    // Remove table formatting
    .replace(/\|/g, ' ')
    .replace(/^[-:| ]+$/gm, '')
    // Remove blockquotes marker
    .replace(/^>\s?/gm, '')
    // Remove list markers but keep text
    .replace(/^[\s]*[-*+]\s/gm, '')
    .replace(/^[\s]*\d+\.\s/gm, '')
    // Remove lines that are just URLs or source labels like "Source: ..."
    .replace(/^[\s]*(Source|Ref|Link|URL|See also|Related):?\s.*$/gim, '')
    // Collapse multiple spaces and newlines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/  +/g, ' ')
    // Remove lines that are mostly non-word characters (leftover formatting)
    .replace(/^[^\w]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Max characters for TTS (avoid timeouts on very long responses)
const MAX_TTS_CHARS = 4000;

interface ReadAloudButtonProps {
  text: string;
  service?: string; // Context for voice selection (podcast, news, research, etc.)
  voiceId?: string; // Override voice selection
  showVoiceMenu?: boolean; // Show dropdown to change voice
  showDownload?: boolean; // Show download option
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
  colorScheme?: string;
  label?: string; // Custom button label
}

export const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({
  text,
  service = 'workspace',
  voiceId,
  showVoiceMenu = false,
  showDownload = false,
  size = 'sm',
  variant = 'outline',
  colorScheme = 'purple',
  label,
}) => {
  const {
    speakWithProfile,
    stop,
    isSpeaking,
    isLoading,
    currentVoice,
    getVoiceForService,
    downloadAudio,
  } = useQwenTTS();

  const [selectedVoice, setSelectedVoice] = useState(voiceId || getVoiceForService(service));
  const toast = useToast();

  const handleSpeak = async () => {
    console.log('[ReadAloud] handleSpeak called, isSpeaking:', isSpeaking, 'isLoading:', isLoading, 'voice:', selectedVoice);
    if (isSpeaking) {
      stop();
      return;
    }

    if (!text || text.trim().length === 0) {
      toast({ title: 'No text to read', status: 'warning', duration: 2000 });
      return;
    }

    try {
      let cleanText = stripMarkdown(text);
      console.log('[ReadAloud] Clean text length:', cleanText.length, 'first 100 chars:', cleanText.substring(0, 100));
      if (cleanText.length > MAX_TTS_CHARS) {
        cleanText = cleanText.substring(0, MAX_TTS_CHARS) + '... Content truncated for audio.';
      }
      await speakWithProfile(cleanText, selectedVoice);
    } catch (e) {
      console.error('TTS failed:', e);
      toast({ title: 'TTS generation failed', description: 'Check if Qwen TTS service is running', status: 'error', duration: 3000 });
    }
  };

  const handleDownload = async () => {
    if (!text || text.trim().length === 0) {
      toast({ title: 'No text to download', status: 'warning', duration: 2000 });
      return;
    }

    try {
      let cleanText = stripMarkdown(text);
      if (cleanText.length > MAX_TTS_CHARS) {
        cleanText = cleanText.substring(0, MAX_TTS_CHARS) + '... Content truncated for audio.';
      }
      await downloadAudio(cleanText, selectedVoice, `${service}_audio_${Date.now()}.wav`);
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  const isActive = isSpeaking && currentVoice === selectedVoice;

  // Simple button without menu
  if (!showVoiceMenu && !showDownload) {
    return (
      <Tooltip label={isActive ? 'Stop reading' : 'Read aloud'}>
        <IconButton
          aria-label={isActive ? 'Stop' : 'Read aloud'}
          icon={
            isLoading ? (
              <Spinner size="sm" />
            ) : isActive ? (
              <StopIcon className="w-4 h-4" />
            ) : (
              <SpeakerWaveIcon className="w-4 h-4" />
            )
          }
          size={size}
          variant={variant}
          colorScheme={isActive ? 'red' : colorScheme}
          onClick={handleSpeak}
          isDisabled={isLoading}
        />
      </Tooltip>
    );
  }

  // Button with options dropdown — main click triggers playback directly
  return (
    <HStack spacing={0}>
      <Tooltip label={isActive ? 'Stop reading' : 'Read aloud with Qwen TTS'}>
        <IconButton
          aria-label={isActive ? 'Stop' : 'Read aloud'}
          icon={
            isLoading ? (
              <Spinner size="xs" />
            ) : isActive ? (
              <StopIcon className="w-4 h-4" />
            ) : (
              <SpeakerWaveIcon className="w-4 h-4" />
            )
          }
          size={size}
          variant={variant}
          colorScheme={isActive ? 'red' : colorScheme}
          onClick={handleSpeak}
          isDisabled={isLoading}
          borderRightRadius={0}
        />
      </Tooltip>
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Voice options"
          icon={<ChevronDownIcon className="w-3 h-3" />}
          size={size}
          variant={variant}
          colorScheme={colorScheme}
          borderLeftRadius={0}
          borderLeft="1px solid"
          borderLeftColor="whiteAlpha.300"
          minW="20px"
          px={1}
        />
        <MenuList>
          {showDownload && (
            <MenuItem
              icon={<ArrowDownTrayIcon className="w-4 h-4" />}
              onClick={handleDownload}
              fontSize="sm"
            >
              Download Audio
            </MenuItem>
          )}
          
          {showVoiceMenu && (
            <>
              {showDownload && <MenuDivider />}
              <MenuGroup title="Voice">
                {[
                  { id: 'american_female_sophisticated', label: 'Female — Sophisticated' },
                  { id: 'american_female_warm', label: 'Female — Warm' },
                  { id: 'american_female_confident', label: 'Female — Confident' },
                  { id: 'american_male_narrator', label: 'Male — Narrator' },
                  { id: 'american_male_anchor', label: 'Male — News Anchor' },
                  { id: 'american_male_refined', label: 'Male — Refined' },
                  { id: 'british_female_warm', label: 'British Female — Warm' },
                  { id: 'british_female_refined', label: 'British Female — Refined' },
                  { id: 'mexican_female_warm', label: 'Mexican Female — Warm' },
                  { id: 'mexican_male_warm', label: 'Mexican Male — Warm' },
                ].map((voice) => (
                  <MenuItem
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    fontWeight={selectedVoice === voice.id ? 'bold' : 'normal'}
                    bg={selectedVoice === voice.id ? 'purple.50' : undefined}
                    fontSize="sm"
                  >
                    {selectedVoice === voice.id ? '✓ ' : '  '}{voice.label}
                  </MenuItem>
                ))}
              </MenuGroup>
            </>
          )}
        </MenuList>
      </Menu>
    </HStack>
  );
};

export default ReadAloudButton;

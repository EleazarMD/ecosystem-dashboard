import React, { useRef, useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Tooltip,
  Badge,
  Spinner,
  Divider,
  Code,
  UnorderedList,
  OrderedList,
  ListItem,
  Heading,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
  PopoverBody,
  useToast,
} from '@chakra-ui/react';
import {
  FiBookmark,
  FiVolume2,
  FiLink,
  FiCopy,
  FiStopCircle,
} from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTTS } from '../../hooks/useTTS';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  model?: string;
  cost?: number;
}

interface Citation {
  number: number;
  fullText: string;
}

interface ChatMessagesLayoutProps {
  messages: Message[];
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  onPinMessage?: (message: Message, index: number) => void;
  onSourceLink?: (message: Message) => void;
  showActions?: boolean;
  containerBg?: string;
  containerStyles?: any;
  ttsVoice?: string;
  ttsSpeed?: number;
  ttsPitch?: number;
  minCharsForPregeneration?: number; // Auto-generate audio for responses longer than this
}

/**
 * Shared chat messages layout component
 * Used by both AI Research and Podcast Studio
 * 
 * Features:
 * - Markdown rendering with custom components
 * - Citation processing and footnotes
 * - Read-aloud functionality with TTS
 * - Message actions (pin, speak, link, copy)
 * - Model badge and timestamp
 * - Loading indicator
 * - Auto-scroll to bottom
 */
export default function ChatMessagesLayout({
  messages,
  isLoading = false,
  emptyStateTitle = 'Start a conversation',
  emptyStateDescription = 'Ask a question to get started',
  onPinMessage,
  onSourceLink,
  showActions = true,
  containerBg,
  containerStyles = {},
  ttsVoice = 'Puck',
  ttsSpeed = 1.0,
  ttsPitch = 1.0,
  minCharsForPregeneration = 200,
}: ChatMessagesLayoutProps) {
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const { speak, stop, isSpeaking, isCached, pregenerate } = useTTS();

  const bgColor = useSemanticToken('surface.elevated');
  const borderColor = useSemanticToken('border.default');
  const codeBg = useSemanticToken('surface.base');
  const popoverBg = useSemanticToken('surface.elevated');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');
  const assistantBg = useSemanticToken('surface.elevated');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-pregenerate TTS audio for long assistant responses
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Only pregenerate for assistant messages
    if (lastMessage.role !== 'assistant') return;

    const charCount = lastMessage.content.length;
    const shouldPregenerate = minCharsForPregeneration > 0 && charCount >= minCharsForPregeneration;

    // Create unique message ID to prevent duplicate pregeneration
    const messageId = `${lastMessage.content.substring(0, 100)}_${charCount}`;

    if (shouldPregenerate) {
      pregenerate(lastMessage.content, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch })
        .catch((error) => {
          console.warn('⚠️ TTS pregeneration failed (will generate on-demand):', error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, minCharsForPregeneration, ttsVoice, ttsSpeed, ttsPitch]);

  // Process citations in assistant messages
  const processCitations = (text: string): { content: string; citations: Citation[] } => {
    const citations: Citation[] = [];
    let citationNumber = 1;

    const citationPatterns = [
      /\(Source\s+\d+,\s*"[^"]+"\)/gi,
      /\([^)]*@[A-Z0-9]+[^)]*\)/g,
      /\(Source\s+\d+\)/gi,
    ];

    let processedContent = text;

    citationPatterns.forEach(pattern => {
      processedContent = processedContent.replace(pattern, (match) => {
        const existingCitation = citations.find(c => c.fullText === match.slice(1, -1));
        if (existingCitation) {
          return `[${existingCitation.number}]`;
        }

        citations.push({
          number: citationNumber,
          fullText: match.slice(1, -1),
        });
        return `[${citationNumber++}]`;
      });
    });

    return { content: processedContent, citations };
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: 'Copied!',
      description: 'Message copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  const handleSpeakMessage = async (message: Message, index: number) => {
    if (speakingMessageIndex === index) {
      stop();
      setSpeakingMessageIndex(null);
    } else {
      setSpeakingMessageIndex(index);
      try {
        await speak(message.content, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch });
      } catch (error) {
        toast({
          title: 'Unable to play audio',
          description: 'TTS service unavailable',
          status: 'error',
          duration: 3000,
        });
      } finally {
        setSpeakingMessageIndex(null);
      }
    }
  };

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <VStack spacing={4} align="center">
        <Text fontSize="4xl" fontWeight="semibold" color={textColor} textAlign="center">
          {emptyStateTitle}
        </Text>
        <Text fontSize="md" color={mutedColor} textAlign="center" maxW="600px">
          {emptyStateDescription}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack spacing={4} align="stretch" {...containerStyles}>
      {messages.map((msg, idx) => {
        const { content: processedContent, citations } = msg.role === 'assistant'
          ? processCitations(msg.content)
          : { content: msg.content, citations: [] };

        return (
          <Box
            key={idx}
            w="full"
            position="relative"
            onMouseEnter={() => setHoveredMessageIndex(idx)}
            onMouseLeave={() => setHoveredMessageIndex(null)}
          >
            {/* Message Bubble */}
            <Box
              bg={msg.role === 'user' ? 'blue.500' : assistantBg}
              color={msg.role === 'user' ? 'white' : textColor}
              p={4}
              borderRadius="lg"
              boxShadow={msg.role === 'user' ? 'md' : 'sm'}
              border={msg.role === 'user' ? 'none' : '1px solid'}
              borderColor={borderColor}
              maxW={msg.role === 'user' ? '70%' : 'full'}
              ml={msg.role === 'user' ? 'auto' : 0}
              transition="all 0.2s ease"
              _hover={{ boxShadow: msg.role === 'user' ? 'lg' : 'md' }}
            >
              {msg.role === 'user' ? (
                <Text fontSize="sm" whiteSpace="pre-wrap" lineHeight="1.6">
                  {msg.content}
                </Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {/* Markdown Content */}
                  <Box
                    fontSize="sm"
                    lineHeight="1.7"
                    className="markdown-content"
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <Text mb={2} whiteSpace="pre-wrap">{children}</Text>,
                        strong: ({ children }) => <Text as="strong" fontWeight="bold">{children}</Text>,
                        em: ({ children }) => <Text as="em" fontStyle="italic">{children}</Text>,
                        h1: ({ children }) => <Heading size="md" mb={2} mt={3}>{children}</Heading>,
                        h2: ({ children }) => <Heading size="sm" mb={2} mt={3}>{children}</Heading>,
                        h3: ({ children }) => <Heading size="xs" mb={2} mt={2}>{children}</Heading>,
                        ul: ({ children }) => <UnorderedList mb={2} ml={4} spacing={1}>{children}</UnorderedList>,
                        ol: ({ children }) => <OrderedList mb={2} ml={4} spacing={1}>{children}</OrderedList>,
                        li: ({ children }) => <ListItem>{children}</ListItem>,
                        code: ({ children, inline }: any) =>
                          inline ? (
                            <Code px={1} py={0.5} fontSize="0.9em" bg={codeBg}>{children}</Code>
                          ) : (
                            <Code display="block" p={2} my={2} borderRadius="md" fontSize="0.9em" overflowX="auto" whiteSpace="pre">{children}</Code>
                          ),
                        blockquote: ({ children }) => (
                          <Box
                            borderLeftWidth="3px"
                            borderLeftColor="blue.500"
                            pl={4}
                            py={2}
                            my={2}
                            fontStyle="italic"
                          >
                            {children}
                          </Box>
                        ),
                        br: () => <Box as="br" />,
                      }}
                    >
                      {processedContent}
                    </ReactMarkdown>
                  </Box>

                  {/* Citations Footnotes */}
                  {citations.length > 0 && (
                    <Box
                      mt={3}
                      pt={2}
                      borderTop="1px solid"
                      borderColor={useSemanticToken('border.default')}
                    >
                      <Text fontSize="10px" fontWeight="600" color={mutedColor} mb={1}>
                        References:
                      </Text>
                      {citations.map((citation) => (
                        <Popover key={citation.number} trigger="hover" placement="top">
                          <PopoverTrigger>
                            <Text
                              as="span"
                              fontSize="10px"
                              color="blue.500"
                              cursor="pointer"
                              _hover={{ textDecoration: 'underline' }}
                              display="inline-block"
                              mr={1}
                            >
                              [{citation.number}]
                            </Text>
                          </PopoverTrigger>
                          <PopoverContent
                            maxW="400px"
                            bg={popoverBg}
                          >
                            <PopoverArrow />
                            <PopoverBody>
                              <Text fontSize="xs" fontFamily="mono">
                                {citation.fullText}
                              </Text>
                            </PopoverBody>
                          </PopoverContent>
                        </Popover>
                      ))}
                    </Box>
                  )}
                </VStack>
              )}
            </Box>

            {/* Message Actions */}
            {msg.role === 'assistant' && showActions && (
              <VStack align="stretch" mt={3} spacing={2}>
                <Divider />
                <HStack justify="space-between">
                  <HStack spacing={1}>
                    {onPinMessage && (
                      <Tooltip label="Pin to Notes">
                        <IconButton
                          aria-label="Pin to notes"
                          icon={<FiBookmark />}
                          size="xs"
                          variant="ghost"
                          onClick={() => onPinMessage(msg, idx)}
                        />
                      </Tooltip>
                    )}

                    {/* Read Aloud Button with TTS */}
                    <Tooltip
                      label={
                        speakingMessageIndex === idx
                          ? 'Stop Reading'
                          : isCached(msg.content, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch })
                            ? '🔊 Ready - Click to Play (Instant)'
                            : 'Read Aloud (TTS - will generate)'
                      }
                    >
                      <Box position="relative" display="inline-block">
                        <IconButton
                          aria-label="Read aloud"
                          icon={
                            speakingMessageIndex === idx ? (
                              isSpeaking ? <Spinner size="xs" /> : <FiStopCircle />
                            ) : (
                              <FiVolume2 />
                            )
                          }
                          size="xs"
                          variant="ghost"
                          colorScheme={speakingMessageIndex === idx ? 'green' : 'gray'}
                          onClick={() => handleSpeakMessage(msg, idx)}
                        />
                        {/* Green check badge when audio is ready */}
                        {!isSpeaking && isCached(msg.content, { voice: ttsVoice, speed: ttsSpeed, pitch: ttsPitch }) && (
                          <Badge
                            position="absolute"
                            top="-4px"
                            right="-4px"
                            bg="green.500"
                            color="whiteAlpha.900"
                            borderRadius="full"
                            boxSize="12px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            fontSize="8px"
                            fontWeight="bold"
                            border="2px solid white"
                          >
                            ✓
                          </Badge>
                        )}
                      </Box>
                    </Tooltip>

                    {onSourceLink && (
                      <Tooltip label="Connect with Sources">
                        <IconButton
                          aria-label="Connect with sources"
                          icon={<FiLink />}
                          size="xs"
                          variant="ghost"
                          onClick={() => onSourceLink(msg)}
                        />
                      </Tooltip>
                    )}

                    <Tooltip label="Copy to Clipboard">
                      <IconButton
                        aria-label="Copy to clipboard"
                        icon={<FiCopy />}
                        size="xs"
                        variant="ghost"
                        onClick={() => handleCopyMessage(msg.content)}
                      />
                    </Tooltip>
                  </HStack>

                  {/* Model Badge and Timestamp */}
                  <HStack spacing={2}>
                    {msg.model && (
                      <Badge colorScheme="purple" fontSize="9px" px={2} py={0.5}>
                        {msg.model}
                      </Badge>
                    )}
                    <Text fontSize="10px" color={mutedColor}>
                      {msg.timestamp.toLocaleTimeString()}
                    </Text>
                  </HStack>
                </HStack>
              </VStack>
            )}
          </Box>
        );
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <Box
          alignSelf="flex-start"
          maxW="75%"
        >
          <Box
            bg={bgColor}
            p={3}
            borderRadius="xl"
            boxShadow="md"
            border="1px solid"
            borderColor={borderColor}
          >
            <HStack spacing={2}>
              <Spinner size="sm" color="blue.500" />
              <Text fontSize="sm" color={textColor}>
                Thinking...
              </Text>
            </HStack>
          </Box>
        </Box>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </VStack>
  );
}

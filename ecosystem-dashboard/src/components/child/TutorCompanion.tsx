/**
 * Tutor Companion — always-present agent UI for child activities.
 *
 * Contract: docs/KIDS_PLATFORM_CONTRACTS.md §4
 *
 * Features:
 * - SSE streaming from agent-turn API (hop-level + final message)
 * - Tool-hop visualization (inline trace instead of generic spinner)
 * - Rich message types (hint_card, example_card, celebration, passage)
 * - Activity-specific quick actions + greeting from the Activity Registry
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  IconButton,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { FiSend, FiMic, FiSquare, FiVolume2, FiVolumeX } from 'react-icons/fi';
import {
  TOOL_HOP_LABELS,
  getToolLabel,
} from '@/domains/learning/shared/tool-hop-labels';
import { useChildTheme } from './ChildThemeProvider';
import {
  CompanionMessage,
  CompanionIntent,
  AgentTransport,
  PersonaRef,
} from '@/domains/learning/shared/agent-transport';
import { ContextEnvelope } from '@/domains/learning/shared/context-hub';
import { ToolRoster } from '@/domains/learning/shared/tool-roster';
import {
  ConceptCheckCard,
  HintCard,
  ExampleCard,
  CelebrationCard,
  PassageCard,
} from './learning-kit';
import { useVoiceIO } from '@/hooks/useVoiceIO';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TutorCompanionProps {
  activityId: string;
  transport: AgentTransport;
  contextEnvelope: ContextEnvelope;
  persona?: PersonaRef;
  roster?: ToolRoster;
  onOutcome?: (outcome: { activityId: string; skillCode?: string; correct: boolean }) => void;
  title?: string;
  compact?: boolean;
  /** Activity-specific quick actions from the registry. */
  quickActions?: Array<{
    label: string;
    intent: CompanionIntent;
    emoji: string;
    prompt?: string;
  }>;
  /** Activity-specific greeting from the registry. */
  greeting?: string;
}

interface HopTrace {
  toolId: string;
  label: string;
  emoji: string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── SSE parser ──────────────────────────────────────────────────────────────

interface SSEEvent {
  type: 'hop' | 'chunk' | 'done' | 'error';
  toolId?: string;
  label?: string;
  emoji?: string;
  text?: string;
  data?: any;
  error?: string;
}

async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncIterable<SSEEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      try {
        const json = JSON.parse(trimmed.slice(6)) as SSEEvent;
        yield json;
      } catch {
        // skip malformed
      }
    }
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TutorCompanion({
  activityId,
  transport,
  contextEnvelope,
  persona,
  roster,
  onOutcome,
  title,
  compact = true,
  quickActions,
  greeting,
}: TutorCompanionProps) {
  const { colors, effectiveTheme } = useChildTheme();
  const [messages, setMessages] = useState<CompanionMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hopTrace, setHopTrace] = useState<HopTrace[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextEnvelopeRef = useRef(contextEnvelope);
  const transportRef = useRef(transport);

  // Voice I/O — Qwen TTS for read-aloud, Parakeet STT for voice input
  const voice = useVoiceIO({
    onTranscript: (text) => setInput(text),
    autoSpeak,
  });

  contextEnvelopeRef.current = contextEnvelope;
  transportRef.current = transport;

  // Greeting on mount — use activity greeting or persona default.
  useEffect(() => {
    const greetingText = greeting
      ? greeting
      : persona
        ? `Hi! I'm ${persona.name} ${persona.avatar ?? ''}. I'll meet you right where you are — what should we figure out together?`
        : undefined;

    if (greetingText) {
      setMessages([
        {
          id: generateId(),
          role: 'assistant',
          content: greetingText,
          timestamp: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona?.id, greeting]);

  // Auto-scroll.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, hopTrace, streamingText]);

  const sendMessage = useCallback(
    async (text: string, intent: CompanionIntent = 'talk') => {
      if (!text.trim() || isLoading) return;

      const userMsg: CompanionMessage = {
        id: generateId(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
        intent,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);
      setHopTrace([]);
      setStreamingText('');

      const focus = contextEnvelopeRef.current.focus;
      const bodyPayload = {
        message: text.trim(),
        activityId,
        intent,
        contextState: {
          kind: focus.kind,
          title: focus.title,
          summary: focus.summary,
          entities: focus.entities,
          payload: focus.payload,
        },
      };

      try {
        // Try SSE streaming first.
        const resp = await fetch('/api/child/companion/agent-turn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!resp.ok) throw new Error(`agent-turn API returned ${resp.status}`);
        if (!resp.body) throw new Error('No response body');

        const reader = resp.body.getReader();
        let accumulatedText = '';
        let finalData: any = null;

        for await (const event of parseSSEStream(reader)) {
          if (event.type === 'hop' && event.toolId) {
            setHopTrace((prev) => [
              ...prev,
              {
                toolId: event.toolId!,
                label: event.label ?? getToolLabel(event.toolId!).label,
                emoji: event.emoji ?? getToolLabel(event.toolId!).emoji,
              },
            ]);
          } else if (event.type === 'chunk' && event.text) {
            accumulatedText += event.text;
            setStreamingText(accumulatedText);
          } else if (event.type === 'done' && event.data) {
            finalData = event.data;
          } else if (event.type === 'error') {
            throw new Error(event.error ?? 'Stream error');
          }
        }

        if (finalData) {
          const assistantMsg: CompanionMessage = {
            id: generateId(),
            role: 'assistant',
            content: finalData.response || accumulatedText || '...',
            timestamp: Date.now(),
            intent,
            conceptCheck: finalData.conceptCheck,
            hintCard: finalData.hintCard,
            exampleCard: finalData.exampleCard,
            celebration: finalData.celebration,
            passage: finalData.passage,
            metadata: {
              source: finalData.source,
              toolsUsed: finalData.toolsUsed || [],
              hops: finalData.hops || 0,
              budgetExhausted: finalData.budgetExhausted || false,
            },
          };
          setMessages((prev) => [...prev, assistantMsg]);

          // Auto-speak assistant response if enabled
          if (autoSpeak && !voice.isMuted) {
            voice.speak(assistantMsg.content);
          }
        } else if (accumulatedText) {
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant',
              content: accumulatedText,
              timestamp: Date.now(),
              intent,
            },
          ]);
        }
      } catch {
        // Fallback to non-streaming fetch.
        try {
          const resp2 = await fetch('/api/child/companion/agent-turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });

          if (!resp2.ok) throw new Error(`API returned ${resp2.status}`);
          const data = await resp2.json();

          const fallbackMsg: CompanionMessage = {
            id: generateId(),
            role: 'assistant',
            content: data.response || '...',
            timestamp: Date.now(),
            intent,
            conceptCheck: data.conceptCheck,
            hintCard: data.hintCard,
            exampleCard: data.exampleCard,
            celebration: data.celebration,
            passage: data.passage,
            metadata: {
              source: data.source,
              toolsUsed: data.toolsUsed || [],
              hops: data.hops || 0,
              budgetExhausted: data.budgetExhausted || false,
            },
          };
          setMessages((prev) => [...prev, fallbackMsg]);

          // Auto-speak fallback response if enabled
          if (autoSpeak && !voice.isMuted) {
            voice.speak(fallbackMsg.content);
          }
        } catch (err) {
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: 'assistant',
              content: 'I had trouble connecting just now. Please try again! 🔄',
              timestamp: Date.now(),
              intent,
            },
          ]);
        }
      } finally {
        setIsLoading(false);
        setHopTrace([]);
        setStreamingText('');
      }
    },
    [isLoading, messages, persona, roster, activityId, greeting],
  );

  // Resolve quick actions: use activity-specific or fall back to defaults.
  const resolvedQuickActions = quickActions ?? [
    { label: 'Explain', intent: 'explain-this' as CompanionIntent, emoji: '💡' },
    { label: 'Hint', intent: 'hint' as CompanionIntent, emoji: '🤔' },
    { label: 'Check', intent: 'check-answer' as CompanionIntent, emoji: '✅' },
  ];

  const surface = effectiveTheme.surface;
  const panelBg = surface?.panel ?? colors.glassBackground;
  const cardBg = surface?.card ?? colors.backgroundSecondary;
  const borderColor = surface?.border ?? colors.border;
  const titleColor = surface?.title ?? colors.text;
  const bodyColor = surface?.body ?? colors.textSecondary;

  return (
    <VStack
      spacing={0}
      align="stretch"
      h={compact ? '100%' : '500px'}
      bg={compact ? 'transparent' : panelBg}
      borderRadius={compact ? '0' : '12px'}
      border={compact ? 'none' : `1px solid ${borderColor}`}
      overflow="hidden"
      w="full"
    >
      {/* Header */}
      {!compact && (
        <Flex
          align="center"
          px={3}
          py={2}
          bg={surface?.card ?? 'rgba(255,255,255,0.05)'}
          borderBottom={`1px solid ${borderColor}`}
          shrink={0}
        >
          <Text fontSize="sm" fontWeight="bold" color={titleColor}>
            {persona?.avatar ?? '🧑‍🏫'} {title ?? persona?.name ?? 'Tutor'}
          </Text>
          {roster && roster.tools.length > 0 && (
            <Badge ml={2} fontSize="2xs" colorScheme="blue" variant="subtle">
              {roster.tools.length} tools
            </Badge>
          )}
        </Flex>
      )}

      {/* Messages */}
      <Box
        ref={scrollRef}
        flex={1}
        overflowY="auto"
        px={compact ? 3 : 4}
        py={3}
        css={{ scrollbarWidth: 'thin' }}
      >
        <VStack spacing={3} align="stretch">
          {messages.map((msg) => (
            <React.Fragment key={msg.id}>
              <Box
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="85%"
                bg={msg.role === 'user' ? colors.primary : cardBg}
                color={msg.role === 'user' ? colors.textInverse : bodyColor}
                px={3.5}
                py={2.5}
                borderRadius={msg.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px'}
                fontSize="sm"
                lineHeight="1.5"
                boxShadow="sm"
                transition="all 0.2s ease"
              >
                {msg.content}
                {/* Read-aloud button for assistant messages */}
                {msg.role === 'assistant' && (
                  <Box
                    as="button"
                    display="inline-flex"
                    alignItems="center"
                    mt={1}
                    fontSize="2xs"
                    color={colors.textMuted}
                    bg="transparent"
                    border="none"
                    cursor="pointer"
                    _hover={{ color: colors.primary }}
                    onClick={() => {
                      if (voice.state === 'speaking') {
                        voice.stopSpeaking();
                      } else {
                        voice.speak(msg.content);
                      }
                    }}
                  >
                    {voice.state === 'speaking' ? <FiVolumeX size={12} /> : <FiVolume2 size={12} />}
                    <Box as="span" ml={1}>{voice.state === 'speaking' ? 'Stop' : 'Listen'}</Box>
                  </Box>
                )}
                {msg.role === 'assistant' && msg.metadata?.toolsUsed && msg.metadata.toolsUsed.length > 0 && (
                  <HStack spacing={1} mt={2} flexWrap="wrap">
                    {msg.metadata.toolsUsed.map((toolId, i) => (
                      <Badge
                        key={`${toolId}-${i}`}
                        fontSize="2xs"
                        colorScheme="blue"
                        variant="subtle"
                        borderRadius="full"
                        px={2}
                      >
                        {TOOL_HOP_LABELS[toolId]?.emoji ?? '🔧'} {TOOL_HOP_LABELS[toolId]?.label ?? toolId}
                      </Badge>
                    ))}
                  </HStack>
                )}
              </Box>

              {/* Rich message cards */}
              {msg.role === 'assistant' && msg.conceptCheck && (
                <Box alignSelf="stretch" mt={1}>
                  <ConceptCheckCard
                    question={msg.conceptCheck.question}
                    choices={msg.conceptCheck.choices}
                    explanation={msg.conceptCheck.explanation}
                    hint={msg.conceptCheck.hint}
                    onOutcome={({ correct }) =>
                      onOutcome?.({
                        activityId,
                        skillCode: msg.conceptCheck?.skillCode,
                        correct,
                      })
                    }
                  />
                </Box>
              )}
              {msg.role === 'assistant' && msg.hintCard && (
                <Box alignSelf="stretch" mt={1}>
                  <HintCard payload={msg.hintCard} />
                </Box>
              )}
              {msg.role === 'assistant' && msg.exampleCard && (
                <Box alignSelf="stretch" mt={1}>
                  <ExampleCard payload={msg.exampleCard} />
                </Box>
              )}
              {msg.role === 'assistant' && msg.celebration && (
                <Box alignSelf="stretch" mt={1}>
                  <CelebrationCard payload={msg.celebration} />
                </Box>
              )}
              {msg.role === 'assistant' && msg.passage && (
                <Box alignSelf="stretch" mt={1}>
                  <PassageCard payload={msg.passage} />
                </Box>
              )}
            </React.Fragment>
          ))}

          {/* Tool-hop visualization + streaming text */}
          {isLoading && (
            <Box alignSelf="flex-start" maxW="85%" w="full">
              {/* Inline hop trace */}
              {hopTrace.length > 0 && (
                <VStack spacing={1.5} align="stretch" mb={2}>
                  {hopTrace.map((hop, i) => (
                    <HStack
                      key={`${hop.toolId}-${i}`}
                      spacing={2}
                      px={3}
                      py={1.5}
                      bg={cardBg}
                      borderRadius="12px"
                      animation="hopSlideIn 0.3s ease-out"
                      css={{
                        '@keyframes hopSlideIn': {
                          '0%': { transform: 'translateX(-8px)', opacity: '0' },
                          '100%': { transform: 'translateX(0)', opacity: '1' },
                        },
                      }}
                    >
                      <Text fontSize="sm">{hop.emoji}</Text>
                      <Text fontSize="xs" color={bodyColor} fontWeight="500">
                        {hop.label}
                      </Text>
                      <Text fontSize="2xs" color={colors.textMuted} ml="auto">
                        ✓
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}

              {/* Streaming text or pulsing indicator */}
              {streamingText ? (
                <Box
                  bg={cardBg}
                  color={bodyColor}
                  px={3.5}
                  py={2.5}
                  borderRadius="18px 18px 18px 6px"
                  fontSize="sm"
                  lineHeight="1.5"
                  boxShadow="sm"
                >
                  {streamingText}
                  <Text as="span" animation="cursorBlink 1s infinite" color={colors.primary}>
                    ▋
                  </Text>
                  <Text
                    as="span"
                    css={{
                      '@keyframes cursorBlink': {
                        '0%, 50%': { opacity: '1' },
                        '51%, 100%': { opacity: '0' },
                      },
                    }}
                  />
                </Box>
              ) : hopTrace.length === 0 ? (
                <HStack
                  spacing={2}
                  px={3}
                  py={2}
                  bg={cardBg}
                  borderRadius="18px 18px 18px 6px"
                  boxShadow="sm"
                >
                  <Box
                    w="6px"
                    h="6px"
                    borderRadius="full"
                    bg={colors.primary}
                    animation="pulse 1.2s infinite"
                    css={{
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
                        '50%': { opacity: '1', transform: 'scale(1.2)' },
                      },
                    }}
                  />
                  <Text fontSize="xs" color={bodyColor}>Thinking...</Text>
                </HStack>
              ) : null}
            </Box>
          )}
        </VStack>
      </Box>

      {/* Quick actions */}
      <HStack
        spacing={1.5}
        px={3}
        py={2}
        borderTop={compact ? 'none' : `1px solid ${borderColor}`}
        flexShrink={0}
        overflowX="auto"
        css={{ scrollbarWidth: 'none' }}
      >
        {resolvedQuickActions.map((action, i) => (
          <Box
            key={`${action.intent}-${i}`}
            as="button"
            px={2.5}
            py={1.5}
            borderRadius="full"
            fontSize="xs"
            fontWeight="600"
            color={bodyColor}
            bg={compact ? 'transparent' : 'rgba(255,255,255,0.05)'}
            border="1px solid"
            borderColor={borderColor}
            _hover={{
              bg: cardBg,
              borderColor: colors.primary,
              color: titleColor,
              transform: 'translateY(-1px)',
            }}
            _active={{ transform: 'translateY(0)' }}
            transition="all 0.15s ease"
            cursor={isLoading ? 'not-allowed' : 'pointer'}
            opacity={isLoading ? 0.5 : 1}
            flexShrink={0}
            onClick={() => {
              if (isLoading) return;
              const contextText = contextEnvelope.focus.summary ?? '';
              const promptText = action.prompt
                ? `${action.prompt}${contextText ? ` (Context: ${contextText})` : ''}`
                : `${action.emoji} ${action.label} — ${contextText}`;
              sendMessage(promptText, action.intent);
            }}
          >
            {action.emoji} {action.label}
          </Box>
        ))}
      </HStack>

      {/* Input — unified, taller control box with embedded controls */}
      <Box
        px={3}
        py={2.5}
        pb={compact ? 3 : 2.5}
        borderTop="none"
        flexShrink={0}
        w="full"
      >
        <Box
          position="relative"
          w="full"
          minH="72px"
          bg={cardBg}
          border="1.5px solid"
          borderColor={borderColor}
          borderRadius="20px"
          transition="all 0.2s ease"
          _focusWithin={{
            borderColor: colors.primary,
            boxShadow: `0 0 0 3px ${colors.primary}22`,
          }}
        >
          {/* Main textarea */}
          <Box
            as="textarea"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input, 'talk');
              }
            }}
            placeholder={voice.state === 'recording' ? 'Listening...' : voice.state === 'transcribing' ? 'Transcribing...' : 'Ask me anything...'}
            w="full"
            minH="72px"
            maxH="140px"
            p={3}
            pr="110px"
            pb="44px"
            fontSize="sm"
            lineHeight="1.5"
            color={bodyColor}
            bg="transparent"
            border="none"
            resize="none"
            outline="none"
            borderRadius="20px"
            _placeholder={{ color: surface?.muted ?? colors.textMuted }}
            css={{
              scrollbarWidth: 'thin',
            }}
            disabled={isLoading}
          />

          {/* Embedded control toolbar */}
          <HStack
            position="absolute"
            bottom={2}
            right={2}
            left={2}
            spacing={1}
            justify="space-between"
            align="center"
            pointerEvents="none"
          >
            {/* Left: mic + auto-speak */}
            <HStack spacing={1} pointerEvents="auto">
              <IconButton
                aria-label={voice.state === 'recording' ? 'Stop recording' : 'Start voice input'}
                icon={
                  voice.state === 'recording' ? (
                    <Box
                      w="10px"
                      h="10px"
                      borderRadius="2px"
                      bg="red.500"
                      animation="micPulse 1s infinite"
                      css={{
                        '@keyframes micPulse': {
                          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
                        },
                      }}
                    />
                  ) : voice.state === 'transcribing' ? (
                    <Box w="10px" h="10px" borderRadius="full" border="2px solid" borderColor={colors.primary} />
                  ) : (
                    <FiMic />
                  )
                }
                size="sm"
                borderRadius="full"
                colorScheme={voice.state === 'recording' ? 'red' : voice.state === 'transcribing' ? 'blue' : undefined}
                variant={voice.state === 'recording' || voice.state === 'transcribing' ? 'solid' : 'ghost'}
                color={voice.state === 'recording' || voice.state === 'transcribing' ? undefined : bodyColor}
                bg={voice.state === 'recording' || voice.state === 'transcribing' ? undefined : 'transparent'}
                _hover={{ bg: 'rgba(0,0,0,0.04)' }}
                isDisabled={voice.state === 'speaking' || isLoading}
                onClick={() => {
                  if (voice.state === 'recording') {
                    voice.stopListening();
                  } else if (voice.state === 'idle') {
                    voice.startListening();
                  }
                }}
              />
              <IconButton
                aria-label={autoSpeak ? 'Disable auto-read' : 'Enable auto-read'}
                icon={autoSpeak ? <FiVolume2 /> : <FiVolumeX />}
                size="sm"
                borderRadius="full"
                variant={autoSpeak ? 'solid' : 'ghost'}
                color={autoSpeak ? undefined : bodyColor}
                bg={autoSpeak ? colors.primary : 'transparent'}
                colorScheme={autoSpeak ? undefined : undefined}
                _hover={{ bg: autoSpeak ? undefined : 'rgba(0,0,0,0.04)' }}
                onClick={() => {
                  if (autoSpeak) {
                    voice.stopSpeaking();
                  }
                  setAutoSpeak(!autoSpeak);
                }}
              />
            </HStack>

            {/* Right: send button */}
            <Box pointerEvents="auto">
              <IconButton
                aria-label="Send"
                icon={<FiSend />}
                size="sm"
                borderRadius="full"
                bg={colors.primary}
                color={colors.textInverse}
                _hover={{ bg: colors.primary, opacity: 0.9 }}
                _active={{ transform: 'scale(0.96)' }}
                isLoading={isLoading}
                isDisabled={!input.trim() || isLoading}
                onClick={() => sendMessage(input, 'talk')}
              />
            </Box>
          </HStack>
        </Box>
      </Box>
    </VStack>
  );
}

export default TutorCompanion;

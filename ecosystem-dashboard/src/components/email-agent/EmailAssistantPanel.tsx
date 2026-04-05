/**
 * Email Assistant Panel
 * AI chat interface contextually focused on email content
 * Integrates with the dashboard's dynamic right panel system
 * Styled to match GooseMind chat interface
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Input,
  Badge,
  Spinner,
  Tooltip,
  useColorModeValue,
  Icon,
  Link,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy, FiTrash2, FiSend, FiMail } from 'react-icons/fi';
import {
  SparklesIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useSemanticToken } from '@/hooks/useSemanticToken';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NextLink from 'next/link';

const MotionBox = motion(Box);

// Use Next.js rewrite proxy for mobile compatibility
const GRAPHRAG_URL = '/api/graphrag';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: {
    emailId?: string;
    subject?: string;
  };
}

interface EmailContext {
  id?: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  body?: string;
  thread_id?: string;
}

interface EmailAssistantPanelProps {
  customData?: {
    emailContext?: EmailContext;
    pageContext?: string;
  };
}

const QUICK_ACTIONS = [
  { label: 'Summarize', prompt: 'Summarize this email thread concisely' },
  { label: 'Key Points', prompt: 'What are the key points and action items?' },
  { label: 'Draft Reply', prompt: 'Help me draft a professional reply' },
  { label: 'Sentiment', prompt: 'What is the tone and sentiment of this email?' },
];

export default function EmailAssistantPanel({ customData }: EmailAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const textColor = useSemanticToken('text.primary');
  const textSecondary = useSemanticToken('text.secondary');
  const borderColor = useSemanticToken('border.subtle');
  const bgSubtle = useSemanticToken('surface.subtle');

  // GooseMind-style colors
  const userMsgBg = useColorModeValue('linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
  const assistantMsgBg = useColorModeValue('white', 'gray.700');
  const accentColor = useColorModeValue('purple.500', 'purple.400');

  const emailContext = customData?.emailContext;

  // Copy message to clipboard
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Parse time patterns and convert to calendar links
  const parseTimeLinks = (content: string): string => {
    // Match time patterns like "11:40 AM - 12:40 PM" or "11:40 AM"
    const timeRangePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
    const singleTimePattern = /(?<!\d:\d{2}\s*(?:AM|PM)\s*-\s*)(\d{1,2}:\d{2}\s*(?:AM|PM))(?!\s*-\s*\d)/gi;
    
    // Replace time ranges with markdown links
    let parsed = content.replace(timeRangePattern, (match) => {
      const encodedTime = encodeURIComponent(match);
      return `[${match}](/calendar?time=${encodedTime})`;
    });
    
    return parsed;
  };

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: emailContext
          ? `I'm ready to help with "${emailContext.subject || 'this email'}". I can:\n\n• Summarize the thread\n• Extract key points and action items\n• Help draft a reply\n• Analyze sentiment and tone\n\nWhat would you like to know?`
          : "Hello! I'm your Email AI assistant. Select an email to get contextual help, or ask me general questions about your inbox.",
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [emailContext]);

  // Update welcome message when email context changes
  useEffect(() => {
    if (emailContext && messages.length > 0) {
      const updatedWelcome: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Now viewing: "${emailContext.subject || 'Email'}"\nFrom: ${emailContext.from_name || emailContext.from_email || 'Unknown'}\n\nHow can I help with this email?`,
        timestamp: new Date(),
      };
      setMessages([updatedWelcome]);
    }
  }, [emailContext?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      context: emailContext ? { emailId: emailContext.id, subject: emailContext.subject } : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Build context for the AI
      const contextInfo = emailContext
        ? `\n\nEmail Context:\nSubject: ${emailContext.subject}\nFrom: ${emailContext.from_name || emailContext.from_email}\nBody Preview: ${(emailContext.body || '').slice(0, 500)}...`
        : '';

      const response = await fetch(`${GRAPHRAG_URL}/email/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          email_context: emailContext,
          conversation_history: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      let assistantContent = '';

      if (response.ok) {
        const data = await response.json();
        assistantContent = data.response || data.message || 'I apologize, but I could not generate a response.';
      } else {
        // Fallback to local response
        assistantContent = getLocalResponse(text, emailContext);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getLocalResponse(text, emailContext),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const getLocalResponse = (input: string, context?: EmailContext): string => {
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('summarize') || lowerInput.includes('summary')) {
      if (context) {
        return `Based on the email "${context.subject}" from ${context.from_name || context.from_email}:\n\nThis email appears to be about ${context.subject?.toLowerCase().replace(/^(re:|fwd:)\s*/gi, '')}. To get a detailed AI summary, use the "AI Summary" button in the email preview.`;
      }
      return 'Please select an email first, then I can help summarize it for you.';
    }

    if (lowerInput.includes('reply') || lowerInput.includes('draft')) {
      if (context) {
        return `I can help you draft a reply to "${context.subject}". What tone would you like? (Professional, Friendly, Brief, Detailed)\n\nAlternatively, use the "AI Draft" feature in the email preview for an automatic draft.`;
      }
      return 'Select an email first, and I can help you draft a reply.';
    }

    if (lowerInput.includes('action') || lowerInput.includes('todo')) {
      if (context) {
        return `Looking at "${context.subject}", I would need to analyze the full content to extract action items. Use the AI Summary feature for a complete analysis including action items.`;
      }
      return 'Select an email to extract action items from it.';
    }

    if (lowerInput.includes('sentiment') || lowerInput.includes('tone')) {
      if (context) {
        return `To analyze the sentiment of "${context.subject}", I would examine the language, urgency markers, and overall tone. The AI Summary feature provides sentiment analysis automatically.`;
      }
      return 'Select an email to analyze its sentiment and tone.';
    }

    // Default response
    if (context) {
      return `I'm here to help with "${context.subject}". You can ask me to:\n• Summarize the email\n• Help draft a reply\n• Extract action items\n• Analyze the tone\n\nWhat would you like to know?`;
    }

    return "I'm your Email AI assistant. Select an email from your inbox, and I can help you understand it, draft replies, or extract key information.";
  };

  const handleClearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: emailContext
        ? `Chat cleared. Still viewing: "${emailContext.subject}"\n\nHow can I help?`
        : 'Chat cleared. Select an email to get started.',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Box h="full" display="flex" flexDirection="column">
      {/* Compact Header */}
      <Box px={3} py={2} borderBottom="1px solid" borderColor={borderColor}>
        <HStack justify="space-between">
          <HStack spacing={2}>
            <SparklesIcon className="w-4 h-4" style={{ color: 'var(--chakra-colors-purple-500)' }} />
            <Text fontWeight="600" color={textColor} fontSize="xs">Email AI</Text>
            {emailContext && (
              <Badge colorScheme="green" fontSize="2xs" variant="subtle">
                {emailContext.subject?.slice(0, 20) || 'Email'}...
              </Badge>
            )}
          </HStack>
          <Tooltip label="Clear chat">
            <IconButton
              aria-label="Clear chat"
              icon={<Icon as={FiTrash2} boxSize={3} />}
              size="xs"
              variant="ghost"
              onClick={handleClearChat}
            />
          </Tooltip>
        </HStack>
      </Box>

      {/* Messages - Larger chat area */}
      <Box flex={1} overflowY="auto" p={4} minH="300px">
        <VStack align="stretch" spacing={5}>
          <AnimatePresence>
            {messages.map((msg) => (
              <MotionBox
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
                maxW="95%"
                w="full"
              >
                {/* Main Message Bubble */}
                <Box
                  position="relative"
                  p={4}
                  bg={msg.role === 'user' ? userMsgBg : assistantMsgBg}
                  color={msg.role === 'user' ? 'white' : textColor}
                  borderRadius="xl"
                  borderTopRightRadius={msg.role === 'user' ? 'sm' : 'xl'}
                  borderTopLeftRadius={msg.role === 'assistant' ? 'sm' : 'xl'}
                  boxShadow="sm"
                  _hover={{ '& .message-actions': { opacity: 1 } }}
                  sx={{
                    '& p': { mb: 2, _last: { mb: 0 } },
                    '& ul, & ol': { pl: 4, mb: 2 },
                    '& li': { mb: 1 },
                    '& strong': { fontWeight: 'bold' },
                    '& a': { 
                      color: msg.role === 'user' ? 'white' : 'purple.500',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      _hover: { opacity: 0.8 }
                    },
                  }}
                >
                  <Box fontSize="sm" lineHeight="1.7">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <Text mb={2}>{children}</Text>,
                        strong: ({ children }) => <Text as="strong" fontWeight="bold">{children}</Text>,
                        ul: ({ children }) => <Box as="ul" pl={4} mb={2}>{children}</Box>,
                        ol: ({ children }) => <Box as="ol" pl={4} mb={2}>{children}</Box>,
                        li: ({ children }) => <Box as="li" mb={1}>{children}</Box>,
                        a: ({ href, children }) => {
                          // Check if it's a time link pattern (e.g., "11:40 AM - 12:40 PM")
                          const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
                          const childText = String(children);
                          if (timePattern.test(childText) || href?.includes('/calendar')) {
                            return (
                              <Link
                                as={NextLink}
                                href={href || '/calendar'}
                                color={msg.role === 'user' ? 'white' : 'purple.500'}
                                textDecoration="underline"
                                fontWeight="medium"
                              >
                                {children}
                              </Link>
                            );
                          }
                          return (
                            <Link href={href} isExternal color={msg.role === 'user' ? 'white' : 'purple.500'}>
                              {children}
                            </Link>
                          );
                        },
                      }}
                    >
                      {parseTimeLinks(msg.content)}
                    </ReactMarkdown>
                  </Box>
                  
                  {/* Message Actions */}
                  {msg.content && (
                    <HStack
                      className="message-actions"
                      position="absolute"
                      bottom={-6}
                      right={msg.role === 'user' ? 'auto' : 0}
                      left={msg.role === 'user' ? 0 : 'auto'}
                      opacity={0}
                      transition="opacity 0.2s"
                      spacing={1}
                    >
                      <IconButton
                        aria-label="Copy"
                        icon={<Icon as={FiCopy} boxSize={3} />}
                        size="xs"
                        variant="ghost"
                        onClick={() => copyMessage(msg.content)}
                      />
                    </HStack>
                  )}
                </Box>
              </MotionBox>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isProcessing && (
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              alignSelf="flex-start"
              maxW="95%"
            >
              <Box
                p={4}
                bg={assistantMsgBg}
                borderRadius="xl"
                borderTopLeftRadius="sm"
                boxShadow="sm"
              >
                <HStack spacing={2}>
                  <Spinner size="xs" color={accentColor} />
                  <Text fontSize="sm" color={textSecondary}>Thinking...</Text>
                </HStack>
              </Box>
            </MotionBox>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Compact Input with inline quick actions */}
      <Box px={3} py={2} borderTop="1px solid" borderColor={borderColor}>
        {/* Quick Actions - Compact */}
        {emailContext && (
          <HStack spacing={1} mb={2} flexWrap="wrap">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                size="xs"
                variant="ghost"
                colorScheme="purple"
                fontSize="2xs"
                h={5}
                px={2}
                onClick={() => handleSendMessage(action.prompt)}
                isDisabled={isProcessing}
              >
                {action.label}
              </Button>
            ))}
          </HStack>
        )}
        <HStack spacing={2}>
          <Input
            size="sm"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            isDisabled={isProcessing}
            borderRadius="full"
            bg={bgSubtle}
            border="none"
            _focus={{ boxShadow: 'outline' }}
          />
          <IconButton
            aria-label="Send"
            icon={<Icon as={FiSend} boxSize={4} />}
            size="sm"
            colorScheme="purple"
            borderRadius="full"
            onClick={() => handleSendMessage()}
            isLoading={isProcessing}
            isDisabled={!input.trim()}
          />
        </HStack>
      </Box>
    </Box>
  );
}

export { EmailAssistantPanel };

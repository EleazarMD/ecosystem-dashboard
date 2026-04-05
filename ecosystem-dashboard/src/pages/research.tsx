import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Avatar,
  Spinner,
  Divider,
  Badge,
} from '@chakra-ui/react';
import DashboardLayout from '../components/layout/DashboardLayout';
import AIInputInterface from '../components/research/AIInputInterface';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cost?: number;
}

export default function ResearchPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<'deep' | 'conversational'>('conversational');

  const bgColor = useSemanticToken('surface.base');
  const messageBg = useSemanticToken('surface.elevated');
  const userMessageBg = useSemanticToken('interactive.surfaceActive');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.secondary');

  const handleSubmit = async (query: string, mode: 'deep' | 'conversational', model: string) => {
    setCurrentMode(mode);
    
    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (mode === 'conversational') {
        // Conversational research
        const response = await fetch('/api/research-lab/conversational-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            sessionId: sessionId,
            conversationHistory: messages,
            model: model,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSessionId(data.sessionId);
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            cost: data.estimatedCost,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      } else {
        // Deep research
        const response = await fetch('/api/research-lab/session/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: query,
            model: model,
            mode: 'synchronous',
            outputFormats: {
              academicReport: true,
              executiveSummary: false,
              podcastScript: false,
              presentationSlides: false,
            },
            dataSources: {
              webResearch: true,
              knowledgeGraph: false,
              codeAnalysis: false,
              customMCP: false,
            },
          }),
        });

        const data = await response.json();

        if (response.ok && data.report) {
          // Synchronous mode - got results immediately
          const assistantMessage: Message = {
            role: 'assistant',
            content: data.report,
            timestamp: new Date(),
            cost: data.actualCost || data.estimatedCost,
          };
          setMessages(prev => [...prev, assistantMessage]);
        } else if (response.ok && data.sessionId) {
          // Started successfully, show processing message
          const processingMessage: Message = {
            role: 'assistant',
            content: `🔬 Deep Research started (session: ${data.sessionId}).\n\nProcessing your query... This typically takes 5-15 minutes.\n\nI'll update this message when complete.`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, processingMessage]);
          
          // TODO: Poll for completion or use webhooks
        } else {
          throw new Error(data.error || 'Failed to start research');
        }
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Error: ${error.message || 'Something went wrong. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Box bg={bgColor} minH="calc(100vh - 64px)" py={8}>
        <Container maxW="5xl">
          <VStack spacing={6} align="stretch">
            {/* Messages */}
            {messages.length === 0 ? (
              <Box h="50vh" display="flex" alignItems="center" justifyContent="center">
                <AIInputInterface onSubmit={handleSubmit} isLoading={isLoading} />
              </Box>
            ) : (
              <>
                <VStack spacing={4} align="stretch">
                  {messages.map((message, index) => (
                    <HStack
                      key={index}
                      align="start"
                      spacing={3}
                      bg={message.role === 'user' ? userMessageBg : messageBg}
                      p={4}
                      borderRadius="lg"
                      boxShadow="sm"
                    >
                      <Avatar
                        size="sm"
                        name={message.role === 'user' ? 'You' : 'AI Research'}
                        bg={message.role === 'user' ? 'blue.500' : 'purple.500'}
                        color="white"
                      />
                      <VStack align="start" spacing={2} flex={1}>
                        <HStack justify="space-between" w="full">
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            {message.role === 'user' ? 'You' : 'AI Research Assistant'}
                          </Text>
                          <HStack spacing={2}>
                            <Text fontSize="xs" color={mutedColor}>
                              {message.timestamp.toLocaleTimeString()}
                            </Text>
                            {message.cost !== undefined && (
                              <Badge colorScheme="green" fontSize="xs">
                                ${message.cost.toFixed(4)}
                              </Badge>
                            )}
                          </HStack>
                        </HStack>
                        <Text
                          fontSize="sm"
                          color={textColor}
                          whiteSpace="pre-wrap"
                          lineHeight="1.6"
                        >
                          {message.content}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                  
                  {/* Loading indicator */}
                  {isLoading && (
                    <HStack align="start" spacing={3} bg={messageBg} p={4} borderRadius="lg" boxShadow="sm">
                      <Avatar size="sm" name="AI Research" bg="purple.500" color="white" />
                      <VStack align="start" spacing={2}>
                        <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                          AI Research Assistant
                        </Text>
                        <HStack>
                          <Spinner size="sm" color="purple.500" />
                          <Text fontSize="sm" color={mutedColor}>
                            {currentMode === 'deep' ? 'Conducting deep research...' : 'Thinking...'}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                  )}
                </VStack>

                <Divider />

                {/* Input at bottom */}
                <Box position="sticky" bottom={4} bg={bgColor} pt={4}>
                  <AIInputInterface onSubmit={handleSubmit} isLoading={isLoading} />
                </Box>
              </>
            )}
          </VStack>
        </Container>
      </Box>
    </DashboardLayout>
  );
}

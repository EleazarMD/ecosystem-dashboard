/**
 * Graph AI Assistant Panel
 * AI Assistant configured to explore graph documents via Goose agent
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  IconButton,
  Spinner,
  Badge,
  Divider,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import {
  FiSend,
  FiTrash2,
  FiBook,
  FiSearch,
  FiMessageSquare,
  FiCpu,
  FiRefreshCw,
} from 'react-icons/fi';
import { useRightPanel } from '@/contexts/RightPanelContext';
import { useSemanticToken } from '@/hooks/useSemanticToken';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const GRAPH_SYSTEM_PROMPT = `You are a Knowledge Graph Explorer AI Assistant. You help users understand and explore documents that have been ingested into the knowledge graph.

Your capabilities:
- Explain concepts, topics, and techniques found in the graph
- Answer questions about document content
- Suggest related concepts to explore
- Help users understand relationships between nodes
- Provide study guidance and learning paths

When the user asks about a specific node or concept, provide:
1. A clear explanation
2. Related concepts in the graph
3. Practical examples if applicable
4. Suggestions for deeper exploration

Be concise but thorough. Use the context from the selected node and connected nodes when available.`;

export default function GraphAIAssistantPanel() {
  const { customData } = useRightPanel();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Theme colors
  const bgColor = useSemanticToken('surface.base');
  const textColor = useSemanticToken('text.primary');
  const mutedColor = useSemanticToken('text.tertiary');
  const borderColor = useSemanticToken('border.default');
  const cardBg = useSemanticToken('surface.elevated');

  // Get selected node context
  const selectedNode = customData?.selectedNode;
  const connectedNodes = customData?.connectedNodes || [];
  const graphStats = customData?.graphStats;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add context message when node is selected
  useEffect(() => {
    if (selectedNode && messages.length === 0) {
      const contextMessage: Message = {
        id: `ctx-${Date.now()}`,
        role: 'system',
        content: `📍 Context: You selected "${selectedNode.name}" (${selectedNode.type}). ${connectedNodes.length} connected nodes available.`,
        timestamp: new Date(),
      };
      setMessages([contextMessage]);
    }
  }, [selectedNode?.id]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context for the AI
      let contextInfo = '';
      if (selectedNode) {
        contextInfo = `\n\nCurrent context:
- Selected node: "${selectedNode.name}" (type: ${selectedNode.type})
- Description: ${selectedNode.description || 'No description'}
- Connected nodes: ${connectedNodes.slice(0, 5).map((n: any) => n.name).join(', ')}${connectedNodes.length > 5 ? ` (+${connectedNodes.length - 5} more)` : ''}`;
      }
      if (graphStats) {
        contextInfo += `\n- Graph stats: ${graphStats.total_nodes} nodes, ${graphStats.total_links} links`;
      }

      // Call Goose API or AI Gateway
      const response = await fetch('/api/ai-gateway/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen3-14b',
          messages: [
            { role: 'system', content: GRAPH_SYSTEM_PROMPT + contextInfo },
            ...messages.filter(m => m.role !== 'system').map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: input.trim() },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      let assistantContent = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      // Remove thinking tags if present
      assistantContent = assistantContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

      const assistantMessage: Message = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '❌ Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const suggestedQuestions = selectedNode ? [
    `Explain "${selectedNode.name}" in simple terms`,
    `What concepts are related to ${selectedNode.name}?`,
    `How can I apply ${selectedNode.name} in practice?`,
  ] : [
    'What topics are covered in this document?',
    'Summarize the main concepts in the graph',
    'What should I learn first?',
  ];

  return (
    <Box h="100%" display="flex" flexDirection="column" bg={bgColor}>
      {/* Header */}
      <HStack p={3} borderBottom="1px solid" borderColor={borderColor} spacing={2}>
        <Icon as={FiCpu} color="blue.400" />
        <Text fontWeight="600" color={textColor} fontSize="sm" flex={1}>
          Graph Explorer AI
        </Text>
        {selectedNode && (
          <Badge colorScheme="blue" fontSize="xs">
            {selectedNode.name}
          </Badge>
        )}
        <Tooltip label="Clear chat">
          <IconButton
            aria-label="Clear chat"
            icon={<FiTrash2 size={14} />}
            size="xs"
            variant="ghost"
            onClick={clearChat}
          />
        </Tooltip>
      </HStack>

      {/* Messages */}
      <VStack
        flex={1}
        overflowY="auto"
        p={3}
        spacing={3}
        align="stretch"
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: '2px' },
        }}
      >
        {messages.length === 0 ? (
          <VStack spacing={4} py={6}>
            <Icon as={FiMessageSquare} boxSize={8} color={mutedColor} />
            <Text fontSize="sm" color={mutedColor} textAlign="center">
              Ask questions about the knowledge graph
            </Text>
            <VStack spacing={2} w="100%">
              <Text fontSize="xs" color={mutedColor}>Try asking:</Text>
              {suggestedQuestions.map((q, idx) => (
                <Button
                  key={idx}
                  size="xs"
                  variant="outline"
                  colorScheme="blue"
                  onClick={() => setInput(q)}
                  w="100%"
                  justifyContent="flex-start"
                  fontWeight="normal"
                  fontSize="xs"
                  h="auto"
                  py={2}
                  whiteSpace="normal"
                  textAlign="left"
                >
                  {q}
                </Button>
              ))}
            </VStack>
          </VStack>
        ) : (
          messages.map((msg) => (
            <Box
              key={msg.id}
              alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              maxW="90%"
            >
              {msg.role === 'system' ? (
                <HStack
                  bg="blue.900"
                  px={3}
                  py={2}
                  borderRadius="md"
                  spacing={2}
                >
                  <Icon as={FiBook} color="blue.300" boxSize={3} />
                  <Text fontSize="xs" color="blue.200">
                    {msg.content}
                  </Text>
                </HStack>
              ) : (
                <Box
                  bg={msg.role === 'user' ? 'gray.600' : cardBg}
                  px={3}
                  py={2}
                  borderRadius="lg"
                  borderBottomRightRadius={msg.role === 'user' ? 'sm' : 'lg'}
                  borderBottomLeftRadius={msg.role === 'assistant' ? 'sm' : 'lg'}
                >
                  <Text
                    fontSize="sm"
                    color={msg.role === 'user' ? 'white' : textColor}
                    whiteSpace="pre-wrap"
                  >
                    {msg.content}
                  </Text>
                </Box>
              )}
            </Box>
          ))
        )}
        {isLoading && (
          <HStack alignSelf="flex-start" spacing={2} p={2}>
            <Spinner size="sm" color="blue.400" />
            <Text fontSize="xs" color={mutedColor}>Thinking...</Text>
          </HStack>
        )}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Input */}
      <HStack p={3} borderTop="1px solid" borderColor={borderColor} spacing={2}>
        <Input
          placeholder="Ask about the graph..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          size="sm"
          bg={cardBg}
          border="none"
          _focus={{ boxShadow: 'none', border: '1px solid', borderColor: 'blue.400' }}
        />
        <IconButton
          aria-label="Send"
          icon={<FiSend size={16} />}
          onClick={sendMessage}
          isLoading={isLoading}
          size="sm"
          colorScheme="blue"
        />
      </HStack>
    </Box>
  );
}
